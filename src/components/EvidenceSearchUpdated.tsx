import React, { useState, useMemo, useEffect } from 'react';
import { Search, FileText, Calendar, User, AlertTriangle, Flag } from 'lucide-react';
import { optimizedDataService } from '../services/OptimizedDataService';
import { Person } from '../types';
import { useNavigation } from '../services/ContentNavigationService.tsx';

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
  const [selectedRiskLevel, setSelectedRiskLevel] = useState<string>('ALL');
  const [selectedEvidenceType, setSelectedEvidenceType] = useState<string>('ALL');
  const [showRedFlagOnly, setShowRedFlagOnly] = useState(false);
  const [minRedFlagRating, setMinRedFlagRating] = useState<number>(0);
  const [maxRedFlagRating, setMaxRedFlagRating] = useState<number>(5);
  const [sortBy, setSortBy] = useState<'relevance' | 'mentions' | 'redflag' | 'name'>('relevance');
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Use navigation context for shared state
  const navigation = useNavigation();
  const { searchTerm, setSearchTerm } = navigation;
  const [searchQuery, setSearchQuery] = useState(searchTerm || '');
  
  // Sync search term with navigation context
  useEffect(() => {
    setSearchQuery(searchTerm || '');
  }, [searchTerm]);
  
  // Update navigation context when search query changes
  useEffect(() => {
    setSearchTerm(searchQuery);
  }, [searchQuery, setSearchTerm]);

  useEffect(() => {
    loadPeopleData();
  }, []);

  const loadPeopleData = async () => {
    try {
      setLoading(true);
      const dataService = optimizedDataService;
      await dataService.initialize();
      const result = await dataService.getPaginatedData({ searchTerm: undefined, likelihoodScore: undefined, minMentions: undefined, maxMentions: undefined, evidenceTypes: undefined, sortBy: undefined, sortOrder: undefined }, 1); // Load first page of people for search
      setPeople(result.data);
    } catch (error) {
      console.error('Error loading people data for search:', error);
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

  const searchResults = useMemo(() => {
    if (loading || people.length === 0) {
      return [];
    }

    if (!searchQuery.trim() && selectedRiskLevel === 'ALL' && selectedEvidenceType === 'ALL' && !showRedFlagOnly && minRedFlagRating === 0 && maxRedFlagRating === 5) {
      return [];
    }

    const results: SearchResult[] = [];
    const query = searchQuery.toLowerCase();

    people.forEach(person => {
      // Filter by risk level
      if (selectedRiskLevel !== 'ALL' && person.likelihood_score !== selectedRiskLevel) {
        return;
      }

      // Filter by evidence type
      if (selectedEvidenceType !== 'ALL' && !person.evidence_types.includes(selectedEvidenceType)) {
        return;
      }

      // Filter by red flag content
      if (showRedFlagOnly && person.spicy_passages.length === 0) {
        return;
      }

      // Filter by red flag rating range
      if (person.spice_rating < minRedFlagRating || person.spice_rating > maxRedFlagRating) {
        return;
      }

      let score = 0;
      const matchingContexts: SearchResult['matchingContexts'] = [];
      const matchingPassages: SearchResult['matchingPassages'] = [];

      // Search in person name
      if (person.name.toLowerCase().includes(query)) {
        score += 10;
      }

      // Search in contexts
      person.contexts.forEach(context => {
        if (context.context.toLowerCase().includes(query)) {
          matchingContexts.push(context);
          score += 5;
        }
      });

      // Search in red flag passages
      person.spicy_passages.forEach(passage => {
        if (passage.passage.toLowerCase().includes(query) || passage.keyword.toLowerCase().includes(query)) {
          matchingPassages.push(passage);
          score += 8;
        }
      });

      // If no search query, include all filtered results
      if (!query.trim()) {
        score = 1;
        matchingContexts.push(...person.contexts.slice(0, 2));
        matchingPassages.push(...person.spicy_passages.slice(0, 2));
      }

      if (score > 0) {
        results.push({
          person,
          matchingContexts,
          matchingPassages,
          score
        });
      }
    });

    // Sort results based on selected criteria
    return results.sort((a, b) => {
      switch (sortBy) {
        case 'mentions':
          return b.person.mentions - a.person.mentions;
        case 'redflag':
          return b.person.spice_score - a.person.spice_score;
        case 'name':
          return a.person.name.localeCompare(b.person.name);
        case 'relevance':
        default:
          return b.score - a.score;
      }
    });
  }, [searchQuery, selectedRiskLevel, selectedEvidenceType, showRedFlagOnly, minRedFlagRating, maxRedFlagRating, sortBy, people, loading]);

  // Get red flag level description
  const getRedFlagLevelDescription = (rating: number): string => {
    switch (rating) {
      case 0: return 'No Red Flags';
      case 1: return 'Minor Concerns';
      case 2: return 'Moderate Red Flags';
      case 3: return 'Significant Red Flags';
      case 4: return 'High Red Flags';
      case 5: return 'Critical Red Flags';
      default: return 'Unknown';
    }
  };

  // Get red flag icon
  const getRedFlagIcon = (rating: number): string => {
    switch (rating) {
      case 0: return '⚪';
      case 1: return '🟡';
      case 2: return '🟠';
      case 3: return '🔴';
      case 4: return '🟣';
      case 5: return '⚫';
      default: return '⚪';
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-6 rounded-xl border border-gray-700">
        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
          <Search className="w-6 h-6" />
          Evidence Search
        </h2>
        
        {/* Loading State */}
        {loading && (
          <div className="mb-4 flex items-center space-x-2 text-gray-400">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
            <span>Loading evidence data...</span>
          </div>
        )}
        
        {/* Search Input */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search names, contexts, or evidence..."
            aria-label="Search names, contexts, or evidence"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={loading}
            className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
          />
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Risk Level</label>
            <select
              value={selectedRiskLevel}
              onChange={(e) => setSelectedRiskLevel(e.target.value)}
              disabled={loading}
              aria-label="Filter by risk level"
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <option value="ALL">All Levels</option>
              <option value="HIGH">High Risk</option>
              <option value="MEDIUM">Medium Risk</option>
              <option value="LOW">Low Risk</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Evidence Type</label>
            <select
              value={selectedEvidenceType}
              onChange={(e) => setSelectedEvidenceType(e.target.value)}
              disabled={loading}
              aria-label="Filter by evidence type"
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <option value="ALL">All Types</option>
              {allEvidenceTypes.map(type => (
                <option key={type} value={type}>{type.replace('_', ' ').toUpperCase()}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Min Red Flag Rating</label>
            <select
              value={minRedFlagRating}
              onChange={(e) => setMinRedFlagRating(Number(e.target.value))}
              disabled={loading}
              aria-label="Filter by minimum red flag rating"
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <option value={0}>⚪ 0 - No Red Flags</option>
              <option value={1}>🟡 1 - Minor Concerns</option>
              <option value={2}>🟠 2 - Moderate Red Flags</option>
              <option value={3}>🔴 3 - Significant Red Flags</option>
              <option value={4}>🟣 4 - High Red Flags</option>
              <option value={5}>⚫ 5 - Critical Red Flags</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Max Red Flag Rating</label>
            <select
              value={maxRedFlagRating}
              onChange={(e) => setMaxRedFlagRating(Number(e.target.value))}
              disabled={loading}
              aria-label="Filter by maximum red flag rating"
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <option value={0}>⚪ 0 - No Red Flags</option>
              <option value={1}>🟡 1 - Minor Concerns</option>
              <option value={2}>🟠 2 - Moderate Red Flags</option>
              <option value={3}>🔴 3 - Significant Red Flags</option>
              <option value={4}>🟣 4 - High Red Flags</option>
              <option value={5}>⚫ 5 - Critical Red Flags</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              disabled={loading}
              aria-label="Sort results by"
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <option value="relevance">Relevance</option>
              <option value="mentions">Mentions</option>
              <option value="redflag">Red Flag Index</option>
              <option value="name">Name</option>
            </select>
          </div>

          <div className="flex items-end">
            <label className="flex items-center space-x-2 text-white">
              <input
                type="checkbox"
                checked={showRedFlagOnly}
                onChange={(e) => setShowRedFlagOnly(e.target.checked)}
                disabled={loading}
                className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500 disabled:opacity-50"
              />
              <span className="text-sm">Red Flags Only</span>
              <Flag className="w-4 h-4 text-red-500" />
            </label>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-400">
            {searchResults.length} results found
          </div>
          <div className="text-xs text-gray-500">
            Red Flag Range: {minRedFlagRating} - {maxRedFlagRating} {getRedFlagLevelDescription(maxRedFlagRating)}
          </div>
        </div>
      </div>

      {/* Search Results */}
      <div className="space-y-4">
        {searchResults.length === 0 && searchQuery.trim() && (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">No results found for "{searchQuery}"</p>
            <p className="text-gray-500 text-sm mt-2">Try adjusting your search terms or filters</p>
          </div>
        )}

        {searchResults.length === 0 && !searchQuery.trim() && selectedRiskLevel === 'ALL' && selectedEvidenceType === 'ALL' && !showRedFlagOnly && (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-gray-500 mx-auto mb-4" />
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
                  <User className="w-5 h-5 text-blue-400" />
                  <button
                    onClick={() => handlePersonClick(result.person)}
                    className="text-lg font-bold text-white hover:text-blue-400 transition-colors duration-200 text-left"
                    title="Click to view full profile"
                  >
                    {result.person.name}
                  </button>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    result.person.likelihood_score === 'HIGH' ? 'bg-red-900 text-red-200' :
                    result.person.likelihood_score === 'MEDIUM' ? 'bg-yellow-900 text-yellow-200' :
                    'bg-green-900 text-green-200'
                  }`}>
                    {result.person.likelihood_score} RISK
                  </span>
                  <span className="text-lg" title={`${getRedFlagIcon(result.person.spice_rating)} - ${getRedFlagLevelDescription(result.person.spice_rating)}`}>
                    {getRedFlagIcon(result.person.spice_rating)}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-400">{result.person.mentions} mentions</div>
                  <div className="text-xs text-gray-500">{result.person.files} files</div>
                  <div className="text-xs text-red-400">{result.person.spice_score} red flag points</div>
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
                <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Contexts ({result.matchingContexts.length})
                </h4>
                <div className="space-y-3">
                  {result.matchingContexts.map((context, i) => (
                    <div key={i} className="bg-gray-900 p-3 rounded-lg">
                      <div className="text-sm text-gray-300 mb-2">{context.context}</div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <FileText className="w-3 h-3" />
                        <span>{context.file}</span>
                        {context.date !== 'Unknown' && (
                          <>
                            <span>•</span>
                            <Calendar className="w-3 h-3" />
                            <span>{context.date}</span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Red Flag Passages */}
            {result.matchingPassages.length > 0 && (
              <div className="p-4">
                <h4 className="text-sm font-medium text-red-300 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Red Flag Passages ({result.matchingPassages.length})
                </h4>
                <div className="space-y-3">
                  {result.matchingPassages.map((passage, i) => (
                    <div key={i} className="bg-red-900 bg-opacity-20 p-3 rounded-lg border border-red-800">
                      <div className="text-sm text-red-200 mb-2">{passage.passage}</div>
                      <div className="flex items-center gap-2 text-xs text-red-400">
                        <span className="px-2 py-1 bg-red-800 rounded">{passage.keyword}</span>
                        <span>•</span>
                        <span>{passage.filename}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};