import { useState, useEffect } from 'react';
import { Search, Users, BarChart3, Eye, Globe, FileText, Newspaper, Clock } from 'lucide-react';
import { Person } from './data/peopleData';
import { EvidenceModal } from './components/EvidenceModal';
import { DataVisualization } from './components/DataVisualization';
import { EvidenceSearch } from './components/EvidenceSearch';
import { DocumentBrowser } from './components/DocumentBrowser';
import { ArticleFeed } from './components/ArticleFeed';
import { Timeline } from './components/Timeline';
import { DocumentProcessor } from './services/documentProcessor';
import { sampleDocuments } from './data/sampleDocuments';
import { DataLoaderService } from './services/dataLoader';

function App() {
  const [people, setPeople] = useState<Person[]>([]);
  const [filteredPeople, setFilteredPeople] = useState<Person[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [activeTab, setActiveTab] = useState<'people' | 'analytics' | 'search' | 'documents' | 'articles' | 'timeline'>('people');
  const [sortBy, setSortBy] = useState<'name' | 'mentions' | 'spice' | 'risk'>('spice');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [documentProcessor, setDocumentProcessor] = useState<DocumentProcessor | null>(null);
  const [documentsLoaded, setDocumentsLoaded] = useState(false);
  const [dataStats, setDataStats] = useState({
    totalPeople: 0,
    totalMentions: 0,
    totalFiles: 0,
    highRisk: 0,
    mediumRisk: 0,
    lowRisk: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load real people data from processed files
    const loadRealData = async () => {
      try {
        setLoading(true);
        const dataLoader = DataLoaderService.getInstance();
        const realPeople = await dataLoader.loadPeopleData();
        
        if (realPeople.length > 0) {
          setPeople(realPeople);
          setFilteredPeople(realPeople);
          
          // Calculate stats
          const stats = dataLoader.getStats(realPeople);
          setDataStats({
            totalPeople: stats.totalPeople,
            totalMentions: stats.totalMentions,
            totalFiles: stats.totalFiles,
            highRisk: stats.highRisk,
            mediumRisk: stats.mediumRisk,
            lowRisk: stats.lowRisk
          });
        }
      } catch (error) {
        console.error('Error loading real data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadRealData();
  }, []);

  useEffect(() => {
    // Initialize document processor with sample documents
    const initializeDocuments = async () => {
      const processor = new DocumentProcessor();
      await processor.processDocumentBatch(
        sampleDocuments.map(doc => ({
          path: doc.filename,
          content: doc.content
        }))
      );
      setDocumentProcessor(processor);
      setDocumentsLoaded(true);
    };

    initializeDocuments();
  }, []);

  useEffect(() => {
    // Filter and sort people based on search term and sort criteria
    let filtered = people;

    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      filtered = people.filter(person =>
        person.name.toLowerCase().includes(query) ||
        person.evidence_types.some(type => type.toLowerCase().includes(query)) ||
        person.contexts.some(ctx => ctx.context.toLowerCase().includes(query))
      );
    }

    // Sort the filtered results
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'mentions':
          comparison = a.mentions - b.mentions;
          break;
        case 'spice':
          comparison = a.spice_score - b.spice_score;
          break;
        case 'risk':
          const riskOrder = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
          comparison = riskOrder[a.likelihood_score] - riskOrder[b.likelihood_score];
          break;
        default:
          comparison = 0;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    setFilteredPeople(sorted);
  }, [searchTerm, people, sortBy, sortOrder]);

  const handlePersonClick = (person: Person) => {
    setSelectedPerson(person);
  };

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
              key={i}
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
      <header className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Eye className="h-8 w-8 text-cyan-400 animate-pulse" />
                <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
                  THE EPSTEIN FILES
                </h1>
              </div>
              <div className="hidden md:flex items-center space-x-2 text-cyan-300 text-xs font-mono">
                <span>{dataStats.totalPeople} SUBJECTS</span>
                <span>•</span>
                <span>{dataStats.totalMentions.toLocaleString()} MENTIONS</span>
                <span>•</span>
                <span>{dataStats.totalFiles} FILES</span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search subjects, evidence types..."
                  className="pl-10 pr-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent w-64"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Loading State */}
        {loading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-slate-800 p-8 rounded-xl text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
              <p className="text-white text-lg">Loading real Epstein files data...</p>
              <p className="text-slate-400 text-sm mt-2">Processing 178,791 individuals and 2,332 documents</p>
            </div>
          </div>
        )}

        {/* Navigation Tabs - X-Files Style */}
        <div className="flex space-x-1 mb-8 bg-slate-800/50 backdrop-blur-sm p-1 rounded-xl border border-slate-700 overflow-x-auto">
          <button
            onClick={() => setActiveTab('people')}
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
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-300 whitespace-nowrap ${
              activeTab === 'analytics'
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            <span>Analytics</span>
          </button>
          <button
            onClick={() => setActiveTab('search')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-300 whitespace-nowrap ${
              activeTab === 'search'
                ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Globe className="h-4 w-4" />
            <span>Evidence Search</span>
          </button>
          <button
            onClick={() => setActiveTab('documents')}
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
            onClick={() => setActiveTab('timeline')}
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
            onClick={() => setActiveTab('articles')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-300 whitespace-nowrap ${
              activeTab === 'articles'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Newspaper className="h-4 w-4" />
            <span>Articles</span>
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'people' && (
          <div className="space-y-6">
            {/* Stats Overview - Using Real Data */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-gradient-to-br from-red-900 to-red-700 p-6 rounded-xl">
                <div className="text-3xl font-bold text-white">
                  {dataStats.highRisk}
                </div>
                <div className="text-red-200">High Risk Subjects</div>
              </div>
              <div className="bg-gradient-to-br from-yellow-900 to-yellow-700 p-6 rounded-xl">
                <div className="text-3xl font-bold text-white">
                  {dataStats.mediumRisk}
                </div>
                <div className="text-yellow-200">Medium Risk Subjects</div>
              </div>
              <div className="bg-gradient-to-br from-green-900 to-green-700 p-6 rounded-xl">
                <div className="text-3xl font-bold text-white">
                  {dataStats.lowRisk}
                </div>
                <div className="text-green-200">Low Risk Subjects</div>
              </div>
              <div className="bg-gradient-to-br from-blue-900 to-blue-700 p-6 rounded-xl">
                <div className="text-3xl font-bold text-white">
                  {dataStats.totalMentions.toLocaleString()}
                </div>
                <div className="text-blue-200">Total Mentions</div>
              </div>
            </div>

            {/* Results and Sorting */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2">Investigation Subjects</h2>
                <p className="text-slate-400">
                  Found {filteredPeople.length} subjects matching your criteria
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-slate-400">Sort by:</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="spice">🌶️ Spice Level</option>
                    <option value="mentions">📊 Mentions</option>
                    <option value="risk">⚠️ Risk Level</option>
                    <option value="name">👤 Name</option>
                  </select>
                </div>
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="p-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                  title={`Sort ${sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>
            </div>

            {/* People Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPeople.map((person) => (
                <div
                  key={person.name}
                  onClick={() => handlePersonClick(person)}
                  className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 hover:bg-slate-800/70 transition-all duration-300 cursor-pointer hover:scale-105 hover:shadow-xl"
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-white">{person.name}</h3>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg" title={`${person.spice_peppers} - ${person.spice_description}`}>
                        {person.spice_peppers}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        person.likelihood_score === 'HIGH' ? 'bg-red-900 text-red-200' :
                        person.likelihood_score === 'MEDIUM' ? 'bg-yellow-900 text-yellow-200' :
                        'bg-green-900 text-green-200'
                      }`}>
                        {person.likelihood_score}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Mentions:</span>
                      <span className="text-white font-medium">{person.mentions.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Files:</span>
                      <span className="text-white font-medium">{person.files}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Spice Score:</span>
                      <span className="text-orange-400 font-medium">{person.spice_score}</span>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-1">
                    {person.evidence_types.slice(0, 3).map((type, i) => (
                      <span key={i} className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs">
                        {type}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {filteredPeople.length === 0 && (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-300 mb-2">No results found</h3>
                <p className="text-slate-400">Try adjusting your search terms</p>
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
            <DataVisualization people={people} />
          </div>
        )}

        {activeTab === 'search' && (
          <div className="space-y-8">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-white mb-2">Evidence Search</h2>
              <p className="text-slate-400">
                Search across all evidence files with advanced filtering and full-text indexing
              </p>
            </div>
            <EvidenceSearch />
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="space-y-8">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-white mb-2">Document Browser</h2>
              <p className="text-slate-400">
                Browse and search through the complete Epstein files collection with advanced filtering
              </p>
              {!documentsLoaded && (
                <div className="mt-4 flex items-center space-x-2 text-yellow-400">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-400"></div>
                  <span>Loading documents...</span>
                </div>
              )}
            </div>
            {documentProcessor && <DocumentBrowser processor={documentProcessor} />}
          </div>
        )}

        {activeTab === 'timeline' && (
          <div className="space-y-8">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-white mb-2">Timeline of Events</h2>
              <p className="text-slate-400">
                Chronological timeline of significant events extracted from the Epstein files
              </p>
            </div>
            <Timeline />
          </div>
        )}

        {activeTab === 'articles' && (
          <div className="space-y-8">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-white mb-2">Latest Articles</h2>
              <p className="text-slate-400">
                Recent articles and analysis from the investigation
              </p>
            </div>
            <ArticleFeed 
              feedUrl="https://generik.substack.com/feed" 
              tagFilter="epstein" 
              maxArticles={9}
            />
          </div>
        )}
      </div>

      {/* Evidence Modal */}
      {selectedPerson && (
        <EvidenceModal
          person={selectedPerson}
          onClose={() => setSelectedPerson(null)}
        />
      )}
    </div>
  );
}

export default App;