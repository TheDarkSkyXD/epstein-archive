import { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { Search, User, Users, FileText, TrendingUp, BarChart3, Newspaper, Calendar, Database as DatabaseIcon, Globe, Clock, ChevronLeft, ChevronRight, Book, CheckCircle2, Target, Shield, Image } from 'lucide-react';
import { Person } from './types';
import { Document } from './types/documents';
import { OptimizedDataService, SearchFilters } from './services/OptimizedDataService';
import { useNavigation } from './services/ContentNavigationService.tsx';
import PersonCard from './components/PersonCard';
import MediaAndArticlesTab from './components/MediaAndArticlesTab';
import PersonCardSkeleton from './components/PersonCardSkeleton';
import StatsSkeleton from './components/StatsSkeleton';
import { StatsDisplay } from './components/StatsDisplay';
import { apiClient } from './services/apiClient';
import { DocumentProcessor } from './services/documentProcessor';
import { generateSampleDocuments } from './data/sampleDocuments';
import { useCountUp } from './hooks/useCountUp';

// Lazy load heavy components
const EvidenceModal = lazy(() => import('./components/EvidenceModal').then(module => ({ default: module.EvidenceModal })));
const DataVisualization = lazy(() => import('./components/DataVisualization').then(module => ({ default: module.DataVisualization })));
const BlackBookViewer = lazy(() => import('./components/BlackBookViewer').then(module => ({ default: module.BlackBookViewer })));
const EvidenceSearch = lazy(() => import('./components/EvidenceSearch').then(module => ({ default: module.EvidenceSearch })));
const DocumentBrowser = lazy(() => import('./components/DocumentBrowser').then(module => ({ default: module.DocumentBrowser })));
const Timeline = lazy(() => import('./components/Timeline').then(module => ({ default: module.Timeline })));
const DocumentUploader = lazy(() => import('./components/DocumentUploader').then(module => ({ default: module.DocumentUploader })));
const InvestigationWorkspace = lazy(() => import('./components/InvestigationWorkspace').then(module => ({ default: module.InvestigationWorkspace })));
const ReleaseNotesPanel = lazy(() => import('./components/ReleaseNotesPanel').then(module => ({ default: module.ReleaseNotesPanel })));


function App() {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Determine active tab from URL
  const getTabFromPath = (pathname: string): Tab => {
    if (pathname === '/' || pathname === '/people') return 'people';
    if (pathname.startsWith('/search')) return 'search';
    if (pathname.startsWith('/documents')) return 'documents';
    if (pathname.startsWith('/media')) return 'media';
    if (pathname.startsWith('/timeline')) return 'timeline';
    if (pathname.startsWith('/investigations')) return 'investigations';
    if (pathname.startsWith('/analytics')) return 'analytics';
    if (pathname.startsWith('/blackbook')) return 'blackbook';
    return 'people'; // default
  };
  
  type Tab = 'people' | 'search' | 'documents' | 'media' | 'timeline' | 'investigations' | 'analytics' | 'blackbook';
  const activeTab = getTabFromPath(location.pathname);
  
  const [people, setPeople] = useState<Person[]>(() => {
    // Try to load first page from cache for instant render
    try {
      const cached = localStorage.getItem('epstein_archive_people_page1');
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      console.error('Error loading cached people:', e);
    }
    return [];
  });
  const [filteredPeople, setFilteredPeople] = useState<Person[]>(people);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [searchTermForModal, setSearchTermForModal] = useState<string>('');
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>('');
  const [selectedDocumentSearchTerm, setSelectedDocumentSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<'name' | 'mentions' | 'spice' | 'risk'>('spice');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [documentProcessor, setDocumentProcessor] = useState<DocumentProcessor | null>(null);
  const [documentsLoaded, setDocumentsLoaded] = useState(false);
  
  // Use navigation context for shared state
  const navigation = useNavigation();
  const { searchTerm, setSearchTerm } = navigation;

  // Clear selected document when switching tabs
  useEffect(() => {
    if (activeTab !== 'documents') {
      setSelectedDocumentId('');
    }
  }, [activeTab]);
  
  // Update navigation context when search term changes
  useEffect(() => {
    // This will automatically sync with the navigation context
  }, [searchTerm]);
  const [dataStats, setDataStats] = useState(() => {
    // Try to load from local storage for immediate display
    try {
      const cached = localStorage.getItem('epstein_archive_stats');
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      console.error('Error loading cached stats:', e);
    }
    return {
      totalPeople: 0,
      totalMentions: 0,
      totalFiles: 0,
      highRisk: 0,
      mediumRisk: 0,
      lowRisk: 0
    };
  });

  // Animate header stats
  const headerTotalPeople = useCountUp(dataStats.totalPeople, 1000);
  const headerTotalMentions = useCountUp(dataStats.totalMentions, 1200);
  const headerTotalFiles = useCountUp(dataStats.totalFiles, 1100);

  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState<string>('Initializing...');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalPeople, setTotalPeople] = useState(0);
  const [dataService, setDataService] = useState<OptimizedDataService | null>(null);
    const [showReleaseNotes, setShowReleaseNotes] = useState(false);

  useEffect(() => {
    // Initialize optimized data service
    const initializeDataService = async () => {
      try {
        setLoading(true);
        setLoadingProgress('Connecting to database...');
        const service = OptimizedDataService.getInstance();
        await service.initialize();
        setDataService(service);
        setLoadingProgress('Loading subjects...');
        
        // Load first page of data
        console.log('About to load first page...');
        const result = await service.getPaginatedData({}, 1);
        console.log('Initial data load:', {
          dataLength: result.data.length,
          total: result.total,
          page: result.page,
          totalPages: result.totalPages,
          pageSize: result.pageSize,
          firstPerson: result.data[0]
        });
        setLoadingProgress(`Loaded ${result.data.length} subjects...`);
        setPeople(result.data);
        setFilteredPeople(result.data);
        setCurrentPage(result.page);
        setTotalPages(result.totalPages);
        setTotalPeople(result.total);
        
        // Cache first page for next load
        try {
          localStorage.setItem('epstein_archive_people_page1', JSON.stringify(result.data));
        } catch (e) {
          console.error('Error caching people data:', e);
        }
        
        // Enable virtual scrolling for large datasets (disabled for pagination)
        // setUseVirtualScroll(result.total > 100);
        
        // We don't update stats here anymore to avoid double-updates/jumps
        // fetchGlobalStats will handle the authoritative stats
      } catch (error) {
        console.error('Error initializing data service:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeDataService();
    
    // Fetch global stats
    const fetchGlobalStats = async () => {
      try {
        setLoadingProgress('Loading statistics...');
        const service = OptimizedDataService.getInstance();
        await service.initialize();
        const stats = await service.getStatistics();
        console.log('Global stats loaded:', stats);
        setLoadingProgress('Finalizing...');
        
        const highRisk = stats.likelihoodDistribution.find((d: any) => d.level === 'HIGH')?.count || 0;
        const mediumRisk = stats.likelihoodDistribution.find((d: any) => d.level === 'MEDIUM')?.count || 0;
        const lowRisk = stats.likelihoodDistribution.find((d: any) => d.level === 'LOW')?.count || 0;
        
        const newStats = {
          totalPeople: stats.totalEntities,
          totalMentions: stats.totalMentions,
          totalFiles: stats.totalDocuments,
          highRisk,
          mediumRisk,
          lowRisk
        };

        // Only update if changed to prevent animation restart
        setDataStats((prev: typeof newStats) => {
          if (JSON.stringify(prev) !== JSON.stringify(newStats)) {
            localStorage.setItem('epstein_archive_stats', JSON.stringify(newStats));
            return newStats;
          }
          return prev;
        });
      } catch (error) {
        console.error('Error fetching global stats:', error);
      }
    };
    
    fetchGlobalStats();
  }, []);

  useEffect(() => {
    // Initialize document processor with REAL database documents
    const loadRealDocuments = async () => {
      try {
        console.log('Loading documents from API...');
        // Fetch all documents for client-side processing
        // In a production app with millions of docs, we'd move search to server-side
        // But for 2,300 docs, client-side is fast and responsive
        const response = await apiClient.getDocuments({}, 1, 3000);
        
        console.log('API response:', response);
        
        if (!response || !response.data) {
          throw new Error('Invalid API response structure');
        }
        
        if (response.data.length === 0) {
          throw new Error('No documents found in API response');
        }

        console.log(`Loaded ${response.data.length} documents from API (total: ${response.total})`);

        const documents: Document[] = response.data.map((doc: any) => ({
          id: doc.id,
          title: doc.fileName,
          filename: doc.fileName,
          fileType: doc.fileType || 'unknown',
          fileSize: doc.fileSize || 0,
          dateCreated: doc.dateCreated,
          dateModified: doc.dateModified,
          content: doc.content || '',
          metadata: {
            source: 'Epstein Files',
            confidentiality: 'Public',
            categories: [],
            ...doc.metadata
          },
          entities: [], // Entities are loaded separately or on demand
          spiceRating: doc.spiceRating || 1,
          spicePeppers: '🌶️'.repeat(doc.spiceRating || 1),
          spiceDescription: `Red Flag Index ${doc.spiceRating || 1}`
        }));

        const processor = new DocumentProcessor();
        await processor.loadDocuments(documents);
        setDocumentProcessor(processor);
        
      } catch (error) {
        console.error('Error loading documents:', error);
        console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
        console.log('Falling back to sample documents due to error');
        const processor = new DocumentProcessor();
        const sampleDocs = generateSampleDocuments();
        await processor.loadDocuments(sampleDocs);
        setDocumentProcessor(processor);
      } finally {
        setDocumentsLoaded(true);
      }
    };
    
    loadRealDocuments();
  }, []);

  const handleSearchAndFilter = useCallback(async () => {
    if (!dataService) return;

    try {
      const filters: SearchFilters = {
        searchTerm: searchTerm.trim() || undefined,
        sortBy,
        sortOrder
      };

      const result = await dataService.getPaginatedData(filters, currentPage);
      setPeople(result.data);
      setFilteredPeople(result.data);
      setCurrentPage(result.page);
      setTotalPages(result.totalPages);
      setTotalPeople(result.total);
      
      // Enable virtual scrolling for large filtered datasets (disabled for pagination)
      // setUseVirtualScroll(result.total > 100);
      
      // Only update totalPeople count from search results, keep other global stats
      // unless we implement a specific filtered-stats endpoint
      if (filters.searchTerm) {
         // If searching, we might want to update stats to reflect search results
         // But for now, let's keep global stats in the header to avoid "0 files" issues
         // or just update the total count
      }
    } catch (error) {
      console.error('Error searching and filtering:', error);
    }
  }, [dataService, searchTerm, sortBy, sortOrder, currentPage]);

  useEffect(() => {
    handleSearchAndFilter();
  }, [handleSearchAndFilter]);

  const handlePageChange = async (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const fetchAnalyticsData = useCallback(async () => {
    if (!dataService) return;

    try {
      setAnalyticsLoading(true);
      setAnalyticsError(null);
      console.log('Fetching analytics data...');
      // Get statistics from the data service
      const stats = await dataService.getStatistics();
      console.log('Analytics stats:', stats);
      
      // Set the analytics data directly - the stats already match what DataVisualization expects
      setAnalyticsData(stats);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      setAnalyticsError(error instanceof Error ? error.message : 'Failed to load analytics data');
    } finally {
      setAnalyticsLoading(false);
    }
  }, [dataService]);

  // Effect for fetching analytics data when tab changes
  useEffect(() => {
    if (activeTab === 'analytics') {
      fetchAnalyticsData();
    }
  }, [activeTab, fetchAnalyticsData]);

  const handlePersonClick = useCallback((person: Person, searchTerm?: string) => {
    console.log('Person clicked:', person.name, 'Search term:', searchTerm);
    setSelectedPerson(person);
    setSearchTermForModal(searchTerm || '');
  }, []);

  const handleDocumentClick = useCallback((document: any, searchTerm?: string) => {
    console.log('=== handleDocumentClick START ===');
    console.log('Document clicked:', document);
    console.log('document.id:', document?.id);
    console.log('Search term:', searchTerm);
    
    // Close the person modal
    setSelectedPerson(null);
    
    // Switch to documents tab
    navigate('/documents');
    
    // Set the search term for highlighting in the document browser
    console.log('Setting selectedDocumentSearchTerm to:', searchTerm);
    if (searchTerm) {
      setSelectedDocumentSearchTerm(searchTerm);
      console.log('selectedDocumentSearchTerm set successfully');
    } else {
      console.log('No searchTerm provided, clearing selectedDocumentSearchTerm');
      setSelectedDocumentSearchTerm('');
    }
    
    // Set the selected document ID to auto-open it in the document browser
    if (document && document.id) {
      console.log('Setting selectedDocumentId to:', document.id);
      setSelectedDocumentId(document.id);
      console.log('selectedDocumentId set successfully');
    } else {
      console.log('WARNING: document or document.id is missing!', { document, id: document?.id });
    }
    console.log('=== handleDocumentClick END ===');
  }, []);

  const handleDocumentsUploaded = useCallback((count: number) => {
    console.log(`Uploaded and processed ${count} documents`);
    // Refresh the document processor if needed
    if (documentProcessor) {
      // The DocumentBrowser will automatically update when the processor changes
      console.log('Document processor updated with new documents');
    }
  }, [documentProcessor]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-900 to-black relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-cyan-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse animation-delay-4000"></div>

        {/* Grid pattern overlay */}
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>

        {/* Floating particles */}
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <div
              key={`particle-${i}-${Date.now()}`}
              className="absolute w-1 h-1 bg-cyan-400 rounded-full opacity-30 animate-ping"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${2 + Math.random() * 3}s`
              }}
            />
          ))}
        </div>
      </div>

      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-40 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between py-3 md:h-16 space-y-3 md:space-y-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="bg-gradient-to-br from-cyan-500 to-blue-600 p-2 rounded-lg shadow-lg shadow-cyan-500/20">
                  <DatabaseIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-lg md:text-2xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent whitespace-nowrap">
                    THE EPSTEIN FILES
                  </h1>
                  <div className="hidden md:flex items-center space-x-2 text-cyan-300 text-xs font-mono">
                    <span>{headerTotalPeople.toLocaleString()} SUBJECTS</span>
                    <span>•</span>
                    <span>{headerTotalMentions.toLocaleString()} MENTIONS</span>
                    <span>•</span>
                    <span>{headerTotalFiles.toLocaleString()} FILES</span>
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => setShowReleaseNotes(true)}
                className="hidden md:flex items-center space-x-2 text-sm text-slate-400 bg-slate-800/50 px-3 py-1.5 rounded-full border border-slate-700/50 ml-4 hover:text-cyan-300 transition-colors"
                title="What's New"
              >
                <Book className="h-4 w-4 text-cyan-400" />
                <span>What's New</span>
              </button>
              
              <div 
                className="hidden md:flex items-center space-x-2 text-sm text-slate-400 bg-slate-800/50 px-3 py-1.5 rounded-full border border-slate-700/50 ml-4 relative group cursor-help"
                title="Click for source details"
              >
                <Shield className="h-4 w-4 text-emerald-400" />
                <span>Verified Source</span>
                
                {/* Tooltip */}
                <div className="absolute hidden group-hover:block z-50 left-0 top-full mt-2 w-80 bg-slate-900 border border-slate-700 rounded-lg p-4 shadow-xl">
                  <div className="text-sm font-semibold text-white mb-2">Verified Sources</div>
                  <div className="text-xs text-slate-300 space-y-2">
                    <div>
                      <div className="font-medium text-emerald-400 mb-1">Source Types:</div>
                      <ul className="list-disc list-inside space-y-1 text-slate-400">
                        <li>Court Documents & Legal Filings</li>
                        <li>Flight Logs & Travel Records</li>
                        <li>Email Correspondence</li>
                        <li>Deposition Transcripts</li>
                        <li>Financial Records</li>
                        <li>Photographic Evidence</li>
                      </ul>
                    </div>
                    <div className="pt-2 border-t border-slate-700">
                      <div className="font-medium text-cyan-400">Total Documents: {headerTotalFiles.toLocaleString()}</div>
                      <div className="text-slate-500 mt-1">All sources verified through public court records and official filings</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="w-full md:w-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search names, contexts..."
                  aria-label="Search names, contexts, or evidence"
                  className="w-full md:w-64 pl-10 pr-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8 relative z-10">
        {/* Loading State */}
        {/* Loading State removed - using skeletons instead */}

        {/* Navigation Tabs - X-Files Style */}
        <div className="flex space-x-2 mb-6 bg-slate-800/50 backdrop-blur-sm p-1.5 rounded-xl border border-slate-700 overflow-x-auto scrollbar-hide -mx-4 px-4 md:mx-0 md:px-1.5">
          <button
            onClick={() => navigate('/people')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-300 whitespace-nowrap ${
              activeTab === 'people'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>Subjects</span>
          </button>
          <button
            onClick={() => navigate('/search')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-300 whitespace-nowrap ${
              activeTab === 'search'
                ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Search className="h-4 w-4" />
            <span>Search</span>
          </button>
          <button
            onClick={() => navigate('/documents')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-300 whitespace-nowrap ${
              activeTab === 'documents'
                ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>Documents</span>
          </button>
          <button
            onClick={() => navigate('/investigations')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-300 whitespace-nowrap ${
              activeTab === 'investigations'
                ? 'bg-gradient-to-r from-red-600 to-pink-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Target className="h-4 w-4" />
            <span>Investigations</span>
          </button>
          <button
            onClick={() => navigate('/blackbook')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-300 whitespace-nowrap ${
              activeTab === 'blackbook'
                ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Book className="h-4 w-4" />
            <span>Black Book</span>
          </button>
          <button
            onClick={() => navigate('/timeline')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-300 whitespace-nowrap ${
              activeTab === 'timeline'
                ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Clock className="h-4 w-4" />
            <span>Timeline</span>
          </button>
            <button
              onClick={() => navigate('/media')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === 'media'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Newspaper className="w-4 h-4" />
              <span>Media & Articles</span>
            </button>
          <button
            onClick={() => navigate('/analytics')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-300 whitespace-nowrap ${
              activeTab === 'analytics'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            <span>Analytics</span>
          </button>
        </div>

        {/* Tab Content */}
        <Suspense fallback={
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
          </div>
        }>
          {activeTab === 'people' && (
            <div className="space-y-6">
              {/* Stats Overview - Using Real Data */}
              {loading && !dataStats.totalPeople ? (
                <div className="space-y-4">
                  <div className="text-center text-cyan-400 text-sm animate-pulse">
                    {loadingProgress}
                  </div>
                  <StatsSkeleton />
                </div>
              ) : (
                <StatsDisplay stats={dataStats} />
              )}

              {/* Results and Sorting */}
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">Investigation Subjects</h2>
                  <p className="text-slate-400">
                    Found {totalPeople.toLocaleString()} subjects matching your criteria
                    {totalPeople > 50 && ` (showing page ${currentPage} of ${totalPages})`}
                    <br />
                    <span className="text-xs text-slate-500">
                      Currently showing {filteredPeople.length} items on this page
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center space-x-2">
                    <label className="text-sm text-slate-400 whitespace-nowrap">Sort by:</label>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      aria-label="Sort people by"
                      className="bg-slate-800 border border-slate-600 rounded-lg px-3 h-10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    >
                      <option value="spice">🚩 Red Flag Index</option>
                      <option value="mentions">📊 Mentions</option>
                      <option value="risk">⚠️ Risk Level</option>
                      <option value="name">👤 Name</option>
                    </select>
                  </div>
                  <button
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="h-10 px-3 bg-slate-800 border border-slate-600 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                    title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
                  >
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </button>
                </div>
              </div>

              {/* People Grid - Always use grid layout for paginated data */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                  // Show 12 skeletons while loading to match 3-column grid
                  [...Array(12)].map((_, index) => (
                    <PersonCardSkeleton key={`skeleton-${index}`} />
                  ))
                ) : (
                  filteredPeople.map((person, index) => (
                    <PersonCard 
                      key={`${person.name}-${index}`} 
                      person={person} 
                      onClick={() => handlePersonClick(person, searchTerm)}
                      searchTerm={searchTerm}
                      onDocumentClick={handleDocumentClick}
                    />
                  ))
                )}
              </div>

              {!loading && filteredPeople.length === 0 && (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-300 mb-2">No results found</h3>
                  <p className="text-slate-400">Try adjusting your search terms</p>
                </div>
              )}

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center space-x-4 mt-8">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="flex items-center space-x-2 px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span>Previous</span>
                  </button>
                  
                  <div className="flex items-center space-x-2">
                    <span className="text-slate-400">Page</span>
                    <span className="text-white font-medium">{currentPage}</span>
                    <span className="text-slate-400">of</span>
                    <span className="text-white font-medium">{totalPages}</span>
                  </div>
                  
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="flex items-center space-x-2 px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700 transition-colors"
                  >
                    <span>Next</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-8">
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">Data Analytics</h2>
                <p className="text-slate-400">
                  Comprehensive statistical analysis of the Epstein Investigation dataset
                </p>
              </div>
              <DataVisualization 
                people={filteredPeople} 
                analyticsData={analyticsData}
                loading={analyticsLoading}
                error={analyticsError}
                onRetry={fetchAnalyticsData}
                onPersonSelect={(person) => {
                  setSelectedPerson(person);
                  setSearchTermForModal('');
                }}
              />
            </div>
          )}

          {activeTab === 'search' && (
            <EvidenceSearch onPersonClick={handlePersonClick} />
          )}

          {activeTab === 'documents' && documentProcessor && (
            <DocumentBrowser 
              processor={documentProcessor} 
              searchTerm={selectedDocumentSearchTerm}
              onSearchTermChange={setSelectedDocumentSearchTerm}
              selectedDocumentId={selectedDocumentId}
              onDocumentClose={() => {
                setSelectedDocumentId('');
                setSelectedDocumentSearchTerm('');
              }}
            />
          )}

          {activeTab === 'timeline' && (
            <Timeline />
          )}

          {activeTab === 'media' && (
            <MediaAndArticlesTab />
          )}

          {activeTab === 'investigations' && (
            <InvestigationWorkspace 
              currentUser={{
                id: '1',
                name: 'Investigator',
                email: 'investigator@example.com',
                role: 'lead',
                permissions: ['read', 'write', 'admin'],
                joinedAt: new Date(),
                expertise: ['investigative journalism', 'data analysis']
              }}
            />
          )}

          {activeTab === 'blackbook' && (
            <div className="mt-6">
              <Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div></div>}>
                <BlackBookViewer />
              </Suspense>
            </div>
          )}
        </Suspense>
      </div>

      {/* Evidence Modal */}
      <Suspense fallback={
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
        </div>
      }>
        {selectedPerson && (
          <EvidenceModal
            person={selectedPerson}
            onClose={() => setSelectedPerson(null)}
            searchTerm={searchTermForModal}
            onDocumentClick={handleDocumentClick}
          />
        )}
      </Suspense>
      
      {/* Release Notes Panel */}
      <Suspense fallback={null}>
        <ReleaseNotesPanel 
          isOpen={showReleaseNotes}
          onClose={() => setShowReleaseNotes(false)}
          releaseNotes={[
            {
              version: 'v2.1.0',
              date: '2024-01-15',
              title: 'Investigation Onboarding Features',
              notes: [
                'Added guided onboarding tour for new investigation users',
                'Implemented example investigation template for empty states',
                'Enhanced traceability with breadcrumbs and source badges',
                'Added data integrity dashboard panel',
                'Integrated evidence packet export functionality',
                'Added in-app release notes panel'
              ]
            },
            {
              version: 'v2.0.0',
              date: '2024-01-10',
              title: 'Major Platform Update',
              notes: [
                'Complete UI redesign with dark theme',
                'Enhanced search capabilities',
                'Improved document browser with filtering',
                'Added timeline visualization',
                'Implemented network analysis tools',
                'Added forensic analysis workspace'
              ]
            }
          ]}
        />
      </Suspense>
      
      {/* Footer with support links */}
      <footer className="mt-12 py-6 border-t border-slate-800 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-slate-400 text-sm">
              The Epstein Archive Investigation Tool - Supporting transparency and accountability
            </p>
            <div className="flex items-center space-x-6">
              <a 
                href="https://coff.ee/generik" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-cyan-400 text-sm flex items-center transition-colors"
              >
                Support on coff.ee
              </a>
              <a 
                href="https://generik.substack.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-cyan-400 text-sm flex items-center transition-colors"
              >
                The End Times Substack
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;