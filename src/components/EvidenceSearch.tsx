import React, { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { optimizedDataService } from '../services/OptimizedDataService';
import { Person } from '../types';
import { useNavigation } from '../services/ContentNavigationService.tsx';
import { RedFlagIndex } from './RedFlagIndex';
import { useUndo } from './UndoManager';
import FormField from './FormField';
import Tooltip from './Tooltip';
import HelpText from './HelpText';
import Icon from './Icon';
import ProgressBar from './ProgressBar';
import { AddToInvestigationButton } from './AddToInvestigationButton';

interface SearchResult {
  person: Person;
  matchingContexts: Array<{
    file: string;
    context: string;
    date: string;
  }>;
  matchingPassages: Array<{
    keyword: string;
    passage: string;
    filename: string;
  }>;
  score: number;
}

interface EvidenceSearchProps {
  onPersonClick?: (person: Person, searchTerm: string) => void;
}

export const EvidenceSearch: React.FC<EvidenceSearchProps> = ({ onPersonClick }) => {
  const location = useLocation();
  const [selectedRiskLevel, setSelectedRiskLevel] = useState<string>('ALL');
  const [selectedEvidenceType, setSelectedEvidenceType] = useState<string>('ALL');
  const [showRedFlagOnly, setShowRedFlagOnly] = useState(false);
  const [minRedFlagRating, setMinRedFlagRating] = useState<number>(0);
  const [maxRedFlagRating, setMaxRedFlagRating] = useState<number>(5);
  const [sortBy, setSortBy] = useState<'relevance' | 'mentions' | 'redflag_asc' | 'redflag_desc' | 'name'>('relevance');
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState<string>('Initializing search...');
  const [loadingProgressValue, setLoadingProgressValue] = useState<number>(0);
  
  // Use undo functionality
  const { addUndoAction } = useUndo();
  
  // Use navigation context for shared state
  const navigation = useNavigation();
  const { searchTerm, setSearchTerm } = navigation;
  
  // Extract query parameter from URL
  const urlParams = new URLSearchParams(location.search);
  const queryParam = urlParams.get('q') || '';
  const [searchQuery, setSearchQuery] = useState(queryParam || searchTerm || '');
  
  // Sync search term with navigation context
  useEffect(() => {
    setSearchQuery(queryParam || searchTerm || '');
  }, [searchTerm, queryParam]);
  
  // Update navigation context when search query changes
  useEffect(() => {
    setSearchTerm(searchQuery);
  }, [searchQuery, setSearchTerm]);

  useEffect(() => {
    loadPeopleData();
  }, []);

  // Reload data when filters change
  useEffect(() => {
    loadPeopleData();
    
    // Announce filter change for screen readers
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = 'Search results updated';
    document.body.appendChild(announcement);
    setTimeout(() => document.body.removeChild(announcement), 1000);
  }, [searchQuery, selectedRiskLevel, selectedEvidenceType, minRedFlagRating, maxRedFlagRating, sortBy]);


  const loadPeopleData = async () => {
    try {
      setLoading(true);
      setLoadingProgress('Connecting to database...');
      setLoadingProgressValue(10);
      const dataService = optimizedDataService;
      await dataService.initialize();
      
      setLoadingProgress('Preparing search filters...');
      setLoadingProgressValue(30);
      
      // Build filters object
      const filters: any = {
        searchTerm: searchQuery || undefined,
        minRedFlagIndex: minRedFlagRating,
        maxRedFlagIndex: maxRedFlagRating
      };
      
      // Add likelihood filter if not ALL
      if (selectedRiskLevel !== 'ALL') {
        filters.likelihoodScore = [selectedRiskLevel];
      }
      
      // Add evidence type filter if not ALL
      if (selectedEvidenceType !== 'ALL') {
        filters.evidenceTypes = [selectedEvidenceType];
      }
      
      // Add sort
      if (sortBy === 'redflag_desc') {
        filters.sortBy = 'spice';
        filters.sortOrder = 'desc';
      } else if (sortBy === 'redflag_asc') {
        filters.sortBy = 'spice';
        filters.sortOrder = 'asc';
      } else if (sortBy === 'mentions') {
        filters.sortBy = 'mentions';
        filters.sortOrder = 'desc';
      } else if (sortBy === 'name') {
        filters.sortBy = 'name';
        filters.sortOrder = 'asc';
      }
      
      setLoadingProgress('Searching database...');
      setLoadingProgressValue(70);
      
      const result = await dataService.getPaginatedData(filters, 1);
      
      setLoadingProgress('Formatting results...');
      setLoadingProgressValue(90);
      
      setPeople(result.data);
      
      setLoadingProgress('Complete');
      setLoadingProgressValue(100);
    } catch (error) {
      console.error('Error loading people data for search:', error);
      setLoadingProgress('Error occurred');
    } finally {
      setLoading(false);
    }
  };

  const allEvidenceTypes = useMemo(() => {
    const types = new Set<string>();
    people.forEach(person => {
      person.evidence_types.forEach(type => types.add(type));
    });
    return Array.from(types).sort();
  }, [people]);

  const handlePersonClick = (person: Person) => {
    if (onPersonClick) {
      onPersonClick(person, searchQuery);
    } else {
      console.log('No onPersonClick handler provided, person clicked:', person.name);
    }
  };

  // Enhanced filter setters with undo functionality
  const setSelectedRiskLevelWithUndo = (value: string) => {
    const previousValue = selectedRiskLevel;
    setSelectedRiskLevel(value);
    
    // Add undo action
    addUndoAction({
      description: 'Risk level filter change',
      undo: () => setSelectedRiskLevel(previousValue)
    });
  };

  const setSelectedEvidenceTypeWithUndo = (value: string) => {
    const previousValue = selectedEvidenceType;
    setSelectedEvidenceType(value);
    
    // Add undo action
    addUndoAction({
      description: 'Evidence type filter change',
      undo: () => setSelectedEvidenceType(previousValue)
    });
  };

  const setShowRedFlagOnlyWithUndo = (value: boolean) => {
    const previousValue = showRedFlagOnly;
    setShowRedFlagOnly(value);
    
    // Add undo action
    addUndoAction({
      description: 'Red flag only filter change',
      undo: () => setShowRedFlagOnly(previousValue)
    });
  };

  const setMinRedFlagRatingWithUndo = (value: number) => {
    const previousValue = minRedFlagRating;
    setMinRedFlagRating(value);
    
    // Add undo action
    addUndoAction({
      description: 'Minimum red flag rating change',
      undo: () => setMinRedFlagRating(previousValue)
    });
  };

  const setMaxRedFlagRatingWithUndo = (value: number) => {
    const previousValue = maxRedFlagRating;
    setMaxRedFlagRating(value);
    
    // Add undo action
    addUndoAction({
      description: 'Maximum red flag rating change',
      undo: () => setMaxRedFlagRating(previousValue)
    });
  };

  const setSortByWithUndo = (value: any) => {
    const previousValue = sortBy;
    setSortBy(value);
    
    // Add undo action
    addUndoAction({
      description: 'Sort order change',
      undo: () => setSortBy(previousValue)
    });
  };

  const [docSnippetsState, setDocSnippets] = useState<Array<{ id: number; title: string; redFlagRating: number; snippet?: string }>>([])

  useEffect(() => {
    const run = async () => {
      const q = (searchQuery || '').trim()
      if (!q) { setDocSnippets([]); return }
      try {
        const r = await fetch(`/api/search?q=${encodeURIComponent(q)}&limit=8&snippets=true`)
        const json = await r.json()
        const docs = Array.isArray(json.documents) ? json.documents.map((d: any) => ({ id: d.id, title: d.title, redFlagRating: d.redFlagRating || 0, snippet: d.snippet || d.contentPreview })) : []
        setDocSnippets(docs)
      } catch { setDocSnippets([]) }
    }
    run()
  }, [searchQuery])

  // Memoize document snippets to avoid recomputing on every render
  const docSnippets = useMemo(() => {
    return docSnippetsState;
  }, [docSnippetsState]);

  // Memoize search results to avoid recomputing on every render
  const searchResults = useMemo(() => {
    if (loading) {
      return [];
    }

    // Since filtering is now done server-side, we just need to format the results
    return people.map(person => ({
      person,
      matchingContexts: person.contexts.slice(0, 3),
      matchingPassages: person.spicy_passages?.slice(0, 3) || [],
      score: person.red_flag_score || person.mentions
    }));
  }, [people, loading]);

  // Memoize filter options to avoid recomputing
  const filterOptions = useMemo(() => ({
    riskLevels: [
      { value: 'ALL', label: 'All Levels' },
      { value: 'HIGH', label: 'High Risk' },
      { value: 'MEDIUM', label: 'Medium Risk' },
      { value: 'LOW', label: 'Low Risk' }
    ],
    redFlagRatings: [
      { value: 0, label: '⚪ 0 - No Red Flags' },
      { value: 1, label: '🟡 1 - Minor Concerns' },
      { value: 2, label: '🟠 2 - Moderate Red Flags' },
      { value: 3, label: '🔴 3 - Significant Red Flags' },
      { value: 4, label: '🟣 4 - High Red Flags' },
      { value: 5, label: '⚫ 5 - Critical Red Flags' }
    ],
    sortByOptions: [
      { value: 'relevance', label: 'Relevance' },
      { value: 'mentions', label: 'Document mentions' },
      { value: 'redflag_desc', label: 'Red Flag Index (high → low)' },
      { value: 'redflag_asc', label: 'Red Flag Index (low → high)' },
      { value: 'name', label: 'Name' }
    ]
  }), []);

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-6 rounded-xl border border-gray-700">
        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
          <Icon name="Search" size="lg" />
          Evidence Search
        </h2>
        
        {/* Microcopy for Evidence Search */}
        <div className="text-sm text-gray-400 mb-4 flex items-start gap-2">
          <Icon name="Info" size="sm" className="mt-0.5 flex-shrink-0" />
          <span>Search across all documents, entities, and evidence to find connections and patterns</span>
        </div>
        
        {/* Loading State */}
        {loading && (
          <div className="mb-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
            <div className="text-center">
              <div className="text-blue-400 text-sm mb-3" role="status">
                {loadingProgress}
              </div>
              <ProgressBar 
                value={loadingProgressValue}
                max={100}
                showPercentage={true}
                color="primary"
                size="md"
                label="Search progress"
              />
              <div className="text-xs text-slate-500 mt-2">
                Searching subjects and documents...
              </div>
            </div>
          </div>
        )}
        
        {/* Search Input */}
        <FormField label={
          <div className="flex items-center gap-2">
            Search
            <Tooltip content="Search by names, contexts, or evidence">
              <Icon name="Info" size="sm" color="gray" className="cursor-help" />
            </Tooltip>
          </div>
        } id="search-query">
          <div className="relative">
            <input
              type="text"
              id="search-query"
              placeholder="Search names, contexts, or evidence..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={loading}
              className="w-full pl-10 pr-4 h-10 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 form-input"
              aria-label="Search for evidence by names, contexts, or keywords"
            />
            <Icon name="Search" size="sm" className="absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none" color="gray" aria-hidden="true" />
          </div>
        </FormField>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <FormField label={
            <div className="flex items-center gap-2">
              Risk Level
              <Tooltip content="Filter results by subject risk assessment. Risk levels are determined by algorithmic analysis of evidence connections and document mentions.">
                <Icon name="Info" size="sm" color="gray" className="cursor-help" />
              </Tooltip>
            </div>
          } id="risk-level">
            <div className="relative">
              <select
                id="risk-level"
                value={selectedRiskLevel}
                onChange={(e) => setSelectedRiskLevelWithUndo(e.target.value)}
                disabled={loading}
                aria-describedby="risk-level-description"
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 h-10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 form-select"
              >
                {filterOptions.riskLevels.map(level => (
                  <option key={level.value} value={level.value}>{level.label}</option>
                ))}
              </select>
            </div>
            <p id="risk-level-description" className="sr-only">Filter search results by risk level</p>
          </FormField>

          <FormField label={
            <div className="flex items-center gap-2">
              Evidence Type
              <Tooltip content="Evidence types categorize the nature of documents and references associated with subjects.">
                <Icon name="Info" size="sm" color="gray" className="cursor-help" />
              </Tooltip>
            </div>
          } id="evidence-type">
            <select
              id="evidence-type"
              value={selectedEvidenceType}
              onChange={(e) => setSelectedEvidenceTypeWithUndo(e.target.value)}
              disabled={loading}
              aria-describedby="evidence-type-description"
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 h-10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 form-select"
            >
              <option value="ALL">All Types</option>
              {allEvidenceTypes.map(type => (
                <option key={type} value={type}>{type.replace('_', ' ').toUpperCase()}</option>
              ))}
            </select>
            <p id="evidence-type-description" className="sr-only">Filter search results by evidence type</p>
          </FormField>

          <FormField label={
            <div className="flex items-center gap-2">
              Min Red Flag Rating
              <Tooltip content="Set minimum red flag severity threshold. Red Flag Index measures the strength of evidence connections and potential significance of a subject.">
                <Icon name="Info" size="sm" color="gray" className="cursor-help" />
              </Tooltip>
            </div>
          } id="min-rating">
            <div className="relative">
              <select
                id="min-rating"
                value={minRedFlagRating}
                onChange={(e) => setMinRedFlagRatingWithUndo(Number(e.target.value))}
                disabled={loading}
                aria-describedby="min-rating-description"
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 h-10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 form-select"
              >
                {filterOptions.redFlagRatings.map(rating => (
                  <option key={rating.value} value={rating.value}>{rating.label}</option>
                ))}
              </select>
            </div>
            <p id="min-rating-description" className="sr-only">Filter search results by minimum red flag rating</p>
          </FormField>

          <FormField label={
            <div className="flex items-center gap-2">
              Max Red Flag Rating
              <Tooltip content="Set maximum red flag severity threshold. Red Flag Index measures the strength of evidence connections and potential significance of a subject.">
                <Icon name="Info" size="sm" color="gray" className="cursor-help" />
              </Tooltip>
            </div>
          } id="max-rating">
            <div className="relative">
              <select
                id="max-rating"
                value={maxRedFlagRating}
                onChange={(e) => setMaxRedFlagRatingWithUndo(Number(e.target.value))}
                disabled={loading}
                aria-describedby="max-rating-description"
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 h-10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 form-select"
              >
                {filterOptions.redFlagRatings.map(rating => (
                  <option key={rating.value} value={rating.value}>{rating.label}</option>
                ))}
              </select>
            </div>
            <p id="max-rating-description" className="sr-only">Filter search results by maximum red flag rating</p>
          </FormField>

          <FormField label={
            <div className="flex items-center gap-2">
              Sort By
              <Tooltip content="Order results by selected criteria. Sorting affects how results are ordered, with relevance using algorithmic matching.">
                <Icon name="Info" size="sm" color="gray" className="cursor-help" />
              </Tooltip>
            </div>
          } id="sort-by">
            <div className="relative">
              <select
                id="sort-by"
                value={sortBy}
                onChange={(e) => setSortByWithUndo(e.target.value as any)}
                disabled={loading}
                aria-describedby="sort-by-description"
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 h-10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 form-select"
              >
                {filterOptions.sortByOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
            <p id="sort-by-description" className="sr-only">Sort search results by selected criteria</p>
          </FormField>

          <FormField label={
            <div className="flex items-center gap-2">
              Red Flag Only
              <Tooltip content="Show only results with red flags. Filter to show only subjects with flagged evidence.">
                <Icon name="Info" size="sm" color="gray" className="cursor-help" />
              </Tooltip>
            </div>
          } id="red-flag-only">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="red-flag-only"
                checked={showRedFlagOnly}
                onChange={(e) => setShowRedFlagOnlyWithUndo(e.target.checked)}
                disabled={loading}
                className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500 disabled:opacity-50 form-checkbox"
                aria-label="Show only subjects with red flags"
              />
              <Icon name="Flag" size="sm" color="danger" aria-hidden="true" />
            </div>
          </FormField>
        </div>

        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-400">
            {searchResults.length} results found
          </div>
          <div className="text-xs text-gray-500">
            Red Flag Range: {minRedFlagRating} - {maxRedFlagRating}
          </div>
        </div>
      </div>

      {/* Search Results */}
      <div className="space-y-4">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-gray-800/50 border border-gray-700 rounded-xl p-5 relative overflow-hidden" aria-label="Loading search result">
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="bg-gray-700 rounded-lg w-10 h-10 animate-pulse"></div>
                    <div>
                      <div className="h-4 w-32 bg-gray-700 rounded mb-2 animate-pulse"></div>
                      <div className="h-3 w-24 bg-gray-700 rounded animate-pulse"></div>
                    </div>
                  </div>
                  <div className="h-6 w-16 bg-gray-700 rounded-full animate-pulse"></div>
                </div>
                <div className="space-y-2 mb-4">
                  <div className="h-3 w-full bg-gray-700 rounded animate-pulse"></div>
                  <div className="h-3 w-5/6 bg-gray-700 rounded animate-pulse"></div>
                  <div className="h-3 w-4/6 bg-gray-700 rounded animate-pulse"></div>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-gray-700/50">
                  <div className="flex items-center space-x-2">
                    <div className="h-3 w-16 bg-gray-700 rounded animate-pulse"></div>
                    <div className="h-3 w-12 bg-gray-700 rounded animate-pulse"></div>
                  </div>
                  <div className="h-3 w-20 bg-gray-700 rounded animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {searchResults.length === 0 && searchQuery.trim() && (
              <div className="text-center py-12">
                <Icon name="Search" size="xl" color="gray" className="mx-auto mb-4" />
                <p className="text-gray-400 text-lg">No results found for "{searchQuery}"</p>
                <p className="text-gray-500 text-sm mt-2">Try adjusting your search terms or filters</p>
              </div>
            )}

            {searchResults.length === 0 && !searchQuery.trim() && selectedRiskLevel === 'ALL' && selectedEvidenceType === 'ALL' && !showRedFlagOnly && (
              <div className="text-center py-12">
                <Icon name="Search" size="xl" color="gray" className="mx-auto mb-4" />
                <p className="text-gray-400 text-lg">Start searching to find evidence</p>
                <p className="text-gray-500 text-sm mt-2">Search for names, keywords, or apply filters</p>
              </div>
            )}

            {searchResults.map((result, index) => (
              <div key={index} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                {/* Person Header */}
                <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-4 border-b border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Icon name="User" size="sm" color="primary" />
                      <button
                        onClick={() => handlePersonClick(result.person)}
                        className="text-lg font-bold text-white hover:text-blue-400 transition-colors duration-200 text-left"
                        title="Click to view full profile"
                      >
                        {result.person.name}
                      </button>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                        result.person.likelihood_score === 'HIGH' ? 'bg-red-900 text-red-200' :
                        result.person.likelihood_score === 'MEDIUM' ? 'bg-yellow-900 text-yellow-200' :
                        'bg-green-900 text-green-200'
                      }`}>
                        {result.person.likelihood_score} RISK
                      </span>
                      {result.person.red_flag_rating !== undefined && (
                        <RedFlagIndex value={result.person.red_flag_rating} size="sm" variant="combined" showTextLabel={true} />
                      )}
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <div className="text-sm text-gray-400">{result.person.mentions} mentions</div>
                      <div className="text-xs text-gray-500">{result.person.files} files</div>
                      <div className="text-xs text-orange-400">{result.person.red_flag_score} red flag points</div>
                      <div className="mt-1">
                        <AddToInvestigationButton 
                          item={{
                            id: result.person.id || '',
                            title: result.person.name,
                            description: result.person.role || 'Person of interest',
                            type: 'entity',
                            sourceId: result.person.id || ''
                          }}
                          variant="quick"
                          className="hover:bg-slate-700"
                        />
                      </div>
                    </div>
                  </div>
                </div>

            {/* Evidence Types */}
            <div className="p-4 border-b border-gray-700">
              <div className="flex flex-wrap gap-2">
                {result.person.evidence_types.map((type, i) => (
                  <span key={i} className="px-2 py-1 bg-blue-900 text-blue-200 rounded text-xs">
                    {type.replace('_', ' ').toUpperCase()}
                  </span>
                ))}
              </div>
            </div>

            {/* Matching Contexts */}
            {result.matchingContexts.length > 0 && (
              <div className="p-4 border-b border-gray-700">
                <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2" aria-level={3}>
                  <Icon name="FileText" size="sm" />
                  Contexts ({result.matchingContexts.length})
                </h4>
                {/* Microcopy for Contexts */}
                <div className="text-xs text-gray-400 mb-3 flex items-start gap-1">
                  <Icon name="Info" size="xs" className="mt-0.5 flex-shrink-0" />
                  <span>Relevant excerpts from documents mentioning this subject</span>
                </div>
                <div className="space-y-3">
                  {result.matchingContexts.map((context, i) => (
                    <div key={i} className="bg-gray-900 p-3 rounded-lg">
                      <div className="text-sm text-gray-300 mb-2">{context.context}</div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Icon name="FileText" size="xs" />
                        <span>{context.file}</span>
                        {context.date !== 'Unknown' && (
                          <>
                            <span>•</span>
                            <Icon name="Calendar" size="xs" />
                            <span>{context.date}</span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          {/* Matching Red Flag Passages */}
            {result.matchingPassages.length > 0 && (
              <div className="p-4 bg-red-900 bg-opacity-20">
                <h4 className="text-sm font-medium text-red-300 mb-3 flex items-center gap-2" aria-level={3}>
                  <Icon name="AlertTriangle" size="sm" color="danger" />
                  Key Passages ({result.matchingPassages.length})
                </h4>
                {/* Microcopy for Key Passages */}
                <div className="text-xs text-red-200 mb-3 flex items-start gap-1">
                  <Icon name="Info" size="xs" className="mt-0.5 flex-shrink-0" />
                  <span>Excerpts containing flagged keywords or significant mentions</span>
                </div>
                <div className="space-y-3">
                  {result.matchingPassages.map((passage, i) => (
                    <div key={i} className="bg-red-900 bg-opacity-30 p-3 rounded-lg border border-red-700">
                      <div className="text-sm text-red-200 mb-2">{passage.passage}</div>
                      <div className="flex items-center gap-2 text-xs text-red-400">
                        <span className="px-2 py-1 bg-red-800 rounded">{passage.keyword.toUpperCase()}</span>
                        <span>•</span>
                        <span>{passage.filename}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
          )}

            {/* Matching Documents */}
            {docSnippets.length > 0 && (
              <div className="p-4 border-t border-gray-700">
                <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2" aria-level={3}>
                  <Icon name="FileText" size="sm" />
                  Matched Documents ({docSnippets.length})
                </h4>
                {/* Microcopy for Matched Documents */}
                <div className="text-xs text-gray-400 mb-3 flex items-start gap-1">
                  <Icon name="Info" size="xs" className="mt-0.5 flex-shrink-0" />
                  <span>Documents that match your search query with highlighted excerpts</span>
                </div>
                <div className="space-y-3">
                  {docSnippets.map(d => (
                    <div key={d.id} className="bg-gray-900 p-3 rounded-lg">
                      <div className="text-sm text-gray-200 mb-1">{d.title}</div>
                      {d.snippet && (
                        <div className="text-xs text-gray-400" dangerouslySetInnerHTML={{ __html: d.snippet }} />
                      )}
                      <div className="text-xs text-gray-500 mt-1">Risk: {d.redFlagRating}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
        </>
        )}
      </div>
    </div>
  );
};