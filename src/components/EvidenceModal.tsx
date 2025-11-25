import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { X, FileText, Calendar, User, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { Person } from '../types';
import { apiClient } from '../services/apiClient';
import { ArticleFeed } from './ArticleFeed';
import { RedFlagIndex } from './RedFlagIndex';
import { Breadcrumb } from './Breadcrumb';
import { SourceBadge } from './SourceBadge';

interface EvidenceModalProps {
  person: Person;
  onClose: () => void;
  searchTerm?: string; // Optional search term to highlight
  onDocumentClick?: (document: any, searchTerm?: string) => void; // Callback when document is clicked
}

export const EvidenceModal: React.FC<EvidenceModalProps> = React.memo(({ person, onClose, searchTerm, onDocumentClick }) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['stats', 'evidence']));
  const [documents, setDocuments] = useState<any[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);

  const toggleSection = useCallback((section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  }, []);

  const isSectionExpanded = useCallback((section: string) => expandedSections.has(section), [expandedSections]);

  // Fetch documents when modal opens
  useEffect(() => {
    const fetchDocuments = async () => {
      if (!person.id) return;
      
      setLoadingDocuments(true);
      try {
        const personDocuments = await apiClient.getEntityDocuments(person.id);
        setDocuments(personDocuments);
      } catch (error) {
        console.error('Error fetching documents:', error);
      } finally {
        setLoadingDocuments(false);
      }
    };

    fetchDocuments();
  }, [person?.id]);

  // Memoize expensive computations with safety checks
  const evidenceTypes = useMemo(() => 
    person?.evidence_types?.map(type => type?.replace('_', ' ')?.toUpperCase())?.filter(Boolean) || [], 
    [person?.evidence_types]
  );

  const visibleContexts = useMemo(() => 
    isSectionExpanded('contexts') ? 
      (person?.contexts || []) : 
      (person?.contexts?.slice(0, 3) || []),
    [person?.contexts, isSectionExpanded]
  );

  const visiblePassages = useMemo(() => 
    isSectionExpanded('passages') ? 
      (person?.spicy_passages || []) : 
      (person?.spicy_passages?.slice(0, 2) || []),
    [person?.spicy_passages, isSectionExpanded]
  );

  // Function to highlight search terms in text
  const highlightText = (text: string, term?: string) => {
    if (!term || !text || typeof text !== 'string') return text;
    
    try {
      const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
      return text.replace(regex, '<mark class="bg-yellow-500 text-black px-1 rounded">$1</mark>');
    } catch (e) {
      console.warn('Error highlighting text:', e);
      return text;
    }
  };

  // Function to safely render highlighted text
  const renderHighlightedText = (text: string, term?: string) => {
    if (!term || !text || typeof text !== 'string') return text;
    
    try {
      const highlighted = highlightText(text, term);
      if (highlighted === text) return text;
      
      return <span dangerouslySetInnerHTML={{ __html: highlighted }} />;
    } catch (e) {
      console.warn('Error rendering highlighted text:', e);
      return text;
    }
  };

  // Safety checks for person data
  if (!person) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
        <div className="bg-slate-800 rounded-xl p-6 max-w-md">
          <h2 className="text-xl font-bold text-white mb-4">Error</h2>
          <p className="text-slate-300">No person data available.</p>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Close
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-0 md:p-4">
      <div className="bg-slate-800 rounded-none md:rounded-xl w-full h-full md:h-auto md:max-h-[90vh] md:max-w-4xl overflow-y-auto border-0 md:border border-slate-700 flex flex-col">
        {/* Header */}
        <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-4 md:p-6 flex items-center justify-between gap-3">
          {/* Breadcrumb */}
          <div className="w-full mb-4">
            <Breadcrumb 
              items={[
                { label: 'Subjects', onClick: () => {} },
                { label: person.name || 'Unknown Person' }
              ]} 
            />
          </div>
          
          <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
            <User className="w-5 h-5 md:w-6 md:h-6 text-cyan-400 shrink-0" />
            <h2 className="text-lg md:text-2xl font-bold text-white truncate">
              {searchTerm ? renderHighlightedText(person.name || 'Unknown', searchTerm) : (person.name || 'Unknown')}
            </h2>
            <span className={`px-2 md:px-3 py-1 rounded-full text-xs md:text-sm font-medium whitespace-nowrap shrink-0 ${
              person.likelihood_score === 'HIGH' ? 'bg-red-900 text-red-200' :
              person.likelihood_score === 'MEDIUM' ? 'bg-yellow-900 text-yellow-200' :
              'bg-green-900 text-green-200'
            }`}>
              {(person.likelihood_score || 'UNKNOWN')} RISK
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors shrink-0"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-700 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-white">{(person?.mentions || 0).toLocaleString()}</div>
              <div className="text-slate-400 text-sm">Total Mentions</div>
            </div>
            <div className="bg-slate-700 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-white">{person?.files || 0}</div>
              <div className="text-slate-400 text-sm">Files</div>
            </div>
            <div className="bg-slate-700 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-white">{(person?.evidence_types || []).length}</div>
              <div className="text-slate-400 text-sm">Evidence Types</div>
            </div>
          </div>

          {/* Evidence Types */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Evidence Types
            </h3>
            <div className="flex flex-wrap gap-2">
              {evidenceTypes.map((type, i) => (
                <span key={i} className="px-3 py-1 bg-blue-900 text-blue-200 rounded-full text-sm">
                  {type}
                </span>
              ))}
            </div>
          </div>

          {/* Contexts */}
          {person?.contexts?.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Contexts ({person.contexts.length})
                </h3>
                <button
                  onClick={() => toggleSection('contexts')}
                  className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
                >
                  {isSectionExpanded('contexts') ? (
                    <><ChevronUp className="w-4 h-4" /> Show Less</>
                  ) : (
                    <><ChevronDown className="w-4 h-4" /> Show More</>
                  )}
                </button>
              </div>
              <div className="space-y-3">
                {visibleContexts.map((context, i) => (
                  <div key={i} className="bg-slate-700 rounded-lg p-4">
                    <p className="text-slate-300 mb-2">
                      {searchTerm ? renderHighlightedText(context?.context || '', searchTerm) : (context?.context || 'No context available')}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {context?.file || 'Unknown file'}
                      </span>
                      {context?.date && context.date !== 'Unknown' && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {context.date}
                        </span>
                      )}
                      {/* Source badge for context */}
                      <SourceBadge source={context?.source || 'Seventh Production'} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Documents */}
          {loadingDocuments && (
            <div className="flex items-center justify-center py-4">
              <div className="text-slate-400">Loading documents...</div>
            </div>
          )}
          
          {!loadingDocuments && documents.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Documents ({documents.length})
                </h3>
                <button
                  onClick={() => toggleSection('documents')}
                  className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
                >
                  {isSectionExpanded('documents') ? (
                    <><ChevronUp className="w-4 h-4" /> Show Less</>
                  ) : (
                    <><ChevronDown className="w-4 h-4" /> Show More</>
                  )}
                </button>
              </div>
              <div className="space-y-3">
                {(isSectionExpanded('documents') ? documents : documents.slice(0, 3)).map((doc, i) => (
                  <div 
                    key={i} 
                    className="bg-slate-700 rounded-lg p-4 cursor-pointer hover:bg-slate-600 transition-colors border border-slate-600 hover:border-blue-500"
                    onClick={() => onDocumentClick?.(doc, searchTerm)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-white font-medium">{doc.title || doc.fileName || doc.filename || 'Untitled Document'}</h4>
                      <RedFlagIndex value={doc.spiceRating || doc.spice_rating || 0} size="sm" />
                    </div>
                    <div className="flex items-center space-x-2 mb-3">
                      {/* Source badge for document */}
                      <SourceBadge source={doc.source || 'Seventh Production'} />
                    </div>
                    <p className="text-slate-300 text-sm mb-3 line-clamp-3">
                      {searchTerm && (doc.summary || doc.contextText || doc.aiSummary || doc.content) ? 
                        renderHighlightedText((doc.summary || doc.contextText || doc.aiSummary || doc.content || '').substring(0, 200) + '...', searchTerm) : 
                        (doc.summary || doc.contextText || doc.aiSummary || doc.content || 'No description available').substring(0, 200) + '...'
                      }
                    </p>
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {doc.fileName || doc.filename || 'Unknown file'}
                      </span>
                      {(doc.date || doc.dateCreated) && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {doc.date || doc.dateCreated}
                        </span>
                      )}
                      <span className="text-xs text-slate-500">
                        {doc.mentions || doc.mentionCount || 0} mentions
                      </span>
                    </div>
                  </div>
                ))}
                {documents.length > 3 && !isSectionExpanded('documents') && (
                  <button
                    onClick={() => toggleSection('documents')}
                    className="w-full py-2 text-slate-400 hover:text-white transition-colors text-sm"
                  >
                    Show {documents.length - 3} more documents...
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Spicy Passages */}
          {person?.spicy_passages?.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-red-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Key Passages ({person.spicy_passages.length})
                </h3>
                <button
                  onClick={() => toggleSection('passages')}
                  className="flex items-center gap-1 text-slate-400 hover:text-red-300 transition-colors"
                >
                  {isSectionExpanded('passages') ? (
                    <><ChevronUp className="w-4 h-4" /> Show Less</>
                  ) : (
                    <><ChevronDown className="w-4 h-4" /> Show More</>
                  )}
                </button>
              </div>
              <div className="space-y-3">
                {visiblePassages.map((passage, i) => (
                  <div key={i} className="bg-red-900 bg-opacity-30 rounded-lg p-4 border border-red-700">
                    <p className="text-red-200 mb-2">
                      {searchTerm ? renderHighlightedText(passage?.passage || '', searchTerm) : (passage?.passage || 'No passage available')}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-red-400">
                      <span className="px-2 py-1 bg-red-800 rounded">
                        {searchTerm ? renderHighlightedText(passage?.keyword || '', searchTerm) : (passage?.keyword?.toUpperCase() || 'UNKNOWN')}
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {passage?.filename || 'Unknown file'}
                      </span>
                      {/* Source badge for passage */}
                      <SourceBadge source={passage?.source || 'Seventh Production'} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

EvidenceModal.displayName = 'EvidenceModal';