import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { X, ChevronUp, ChevronDown } from 'lucide-react';
import { Person } from '../types';
import { apiClient } from '../services/apiClient';
import { ArticleFeed } from './ArticleFeed';
import { RedFlagIndex } from './RedFlagIndex';
import { Breadcrumb } from './Breadcrumb';
import { SourceBadge } from './SourceBadge';
import FormField from './FormField';
import Tooltip from './Tooltip';
import Icon from './Icon';
import { useModalFocusTrap } from '../hooks/useModalFocusTrap';

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
  const [selectedEvidenceType, setSelectedEvidenceType] = useState<string | null>(null);
  const { modalRef } = useModalFocusTrap(true);

  // Handle keyboard events for modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Announce modal opening for screen readers
  useEffect(() => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = `Opened details for ${person.name}`;
    document.body.appendChild(announcement);
    return () => {
      document.body.removeChild(announcement);
    };
  }, [person.name]);

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
    
    // Announce section toggle for screen readers
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    const isExpanded = !expandedSections.has(section);
    announcement.textContent = `${section} section ${isExpanded ? 'expanded' : 'collapsed'}`;
    document.body.appendChild(announcement);
    setTimeout(() => document.body.removeChild(announcement), 1000);
  }, [expandedSections]);

  const isSectionExpanded = useCallback((section: string) => expandedSections.has(section), [expandedSections]);

  // Fetch documents when modal opens
  useEffect(() => {
    const fetchDocuments = async () => {
      if (!person.id) return;
      
      setLoadingDocuments(true);
      try {
        const personDocuments = await apiClient.getEntityDocuments(person.id);
        // Sort by Red Flag Index (descending)
        const sortedDocuments = personDocuments.sort((a, b) => {
          const aRating = a.redFlagRating || 0;
          const bRating = b.redFlagRating || 0;
          return bRating - aRating;
        });
        setDocuments(sortedDocuments);
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

  // Filter and sort documents: RFI desc → mentions desc
  const filteredDocuments = useMemo(() => {
    let docs = [...documents];
    
    // Filter by selected evidence type
    if (selectedEvidenceType) {
      const filterType = selectedEvidenceType.toLowerCase().replace(' ', '_');
      docs = docs.filter(doc => 
        doc.evidenceType?.toLowerCase() === filterType ||
        doc.evidence_type?.toLowerCase() === filterType
      );
    }
    
    // Sort by Red Flag Index (desc) → mentions (desc)
    docs.sort((a, b) => {
      const aRFI = a.redFlagRating || a.red_flag_rating || 0;
      const bRFI = b.redFlagRating || b.red_flag_rating || 0;
      if (bRFI !== aRFI) return bRFI - aRFI;
      
      const aMentions = a.mentions || a.mentionCount || 0;
      const bMentions = b.mentions || b.mentionCount || 0;
      return bMentions - aMentions;
    });
    
    return docs;
  }, [documents, selectedEvidenceType]);

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
    <div 
      ref={modalRef}
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-0 md:p-4 overflow-hidden" 
      role="dialog" 
      aria-modal="true" 
      aria-labelledby="modal-title"
      aria-describedby="modal-description"
    >
      <div className="bg-slate-800 rounded-none md:rounded-xl w-full h-full md:h-auto md:max-h-[90vh] md:max-w-4xl overflow-y-auto border-0 md:border border-slate-700 flex flex-col max-w-full" style={{ maxWidth: 'calc(100vw - 2rem)' }}>
        {/* Header - Mobile optimized sticky header */}
        <div className="sticky top-0 bg-slate-800 border-b border-slate-700 px-4 py-3 md:p-6 flex flex-col gap-3 z-10">
          {/* Top row: Close button and breadcrumb */}
          <div className="flex items-center justify-between">
            <Breadcrumb 
              items={[
                { label: 'Subjects', onClick: () => {} },
                { label: person.name || 'Unknown Person' }
              ]} 
            />
            <button
              onClick={onClose}
              className="p-3 -mr-1 hover:bg-slate-700 rounded-lg transition-colors touch-feedback"
              aria-label="Close modal"
            >
              <X className="w-5 h-5 text-slate-400" aria-hidden="true" />
            </button>
          </div>
          
          {/* Person info row */}
          <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
            <Icon name="User" size="md" color="info" className="shrink-0" />
            <h1 
              id="modal-title"
              className="text-base sm:text-lg md:text-2xl font-bold text-white truncate flex-1 min-w-0"
            >
              {searchTerm ? renderHighlightedText(person.name || 'Unknown', searchTerm) : (person.name || 'Unknown')}
            </h1>
            <span 
              className={`mobile-chip mobile-chip-sm shrink-0 ${
                person.likelihood_score === 'HIGH' ? 'bg-red-900 text-red-200' :
                person.likelihood_score === 'MEDIUM' ? 'bg-yellow-900 text-yellow-200' :
                'bg-green-900 text-green-200'
              }`}
              aria-label={`Risk level: ${(person.likelihood_score || 'UNKNOWN')}`}
            >
              {(person.likelihood_score || 'UNKNOWN')} RISK
            </span>
          </div>
        </div>

        {/* Content */}
        <div 
          id="modal-description"
          className="p-4 sm:p-6 space-y-5 sm:space-y-6"
        >
          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-slate-700 rounded-lg p-4 pr-10 sm:pr-4 text-center relative">
              <div className="absolute top-2 right-2">
                <Tooltip content="Total number of times this subject is mentioned across all documents in the archive">
                  <Icon name="Info" size="sm" color="gray" className="cursor-help" />
                </Tooltip>
              </div>
              <div className="text-lg sm:text-2xl font-bold text-white">{(person?.mentions || 0).toLocaleString()}</div>
              <div className="text-slate-400 text-xs sm:text-sm" aria-label="Total mentions across all documents">Total Mentions</div>
            </div>
            <div className="bg-slate-700 rounded-lg p-4 pr-10 sm:pr-4 text-center relative">
              <div className="absolute top-2 right-2">
                <Tooltip content="Number of documents that reference or mention this subject">
                  <Icon name="Info" size="sm" color="gray" className="cursor-help" />
                </Tooltip>
              </div>
              <div className="text-lg sm:text-2xl font-bold text-white">{person?.files || 0}</div>
              <div className="text-slate-400 text-xs sm:text-sm" aria-label="Number of documents referencing this person">Files</div>
            </div>
            <div className="bg-slate-700 rounded-lg p-4 pr-10 sm:pr-4 text-center relative">
              <div className="absolute top-2 right-2">
                <Tooltip content="Different categories of evidence associated with this subject" position="left">
                  <Icon name="Info" size="sm" color="gray" className="cursor-help" />
                </Tooltip>
              </div>
              <div className="text-lg sm:text-2xl font-bold text-white">{(person?.evidence_types || []).length}</div>
              <div className="text-slate-400 text-xs sm:text-sm" aria-label="Number of different evidence types">Evidence Types</div>
            </div>
          </div>

          {/* Evidence Types - Horizontal scroll on mobile */}
          <div>
            <h2 
              className="text-base sm:text-lg font-semibold text-white mb-3 flex items-center gap-2"
              aria-level={2}
            >
              <Icon name="FileText" size="sm" />
              Evidence Types
              <Tooltip content="Filter documents by evidence category">
                <Icon name="Info" size="sm" color="gray" />
              </Tooltip>
            </h2>
            <div className="mobile-scroll-x -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex sm:flex-wrap gap-2">
              <button
                onClick={() => setSelectedEvidenceType(null)}
                className={`mobile-chip mobile-chip-interactive touch-feedback shrink-0 ${
                  selectedEvidenceType === null
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                }`}
              >
                ALL
              </button>
              {evidenceTypes.map((type, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedEvidenceType(type === selectedEvidenceType ? null : type)}
                  className={`mobile-chip mobile-chip-interactive touch-feedback shrink-0 ${
                    selectedEvidenceType === type
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-900 text-blue-200 hover:bg-blue-800'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Contexts */}
          {person?.contexts?.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 
                  className="text-lg font-semibold text-white flex items-center gap-2"
                  aria-level={2}
                >
                  <Icon name="FileText" size="sm" />
                  Contexts ({person.contexts.length})
                  <Tooltip content="Relevant excerpts from documents mentioning this subject">
                    <Icon name="Info" size="sm" color="gray" />
                  </Tooltip>
                </h2>
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
                        <Icon name="FileText" size="xs" />
                        {context?.file || 'Unknown file'}
                      </span>
                      {context?.date && context.date !== 'Unknown' && (
                        <span className="flex items-center gap-1">
                          <Icon name="Calendar" size="xs" />
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
                <h2 
                  className="text-lg font-semibold text-white flex items-center gap-2"
                  aria-level={2}
                >
                  <Icon name="FileText" size="sm" />
                  Documents ({filteredDocuments.length}{selectedEvidenceType ? ` of ${documents.length}` : ''})
                  <Tooltip content="Documents that reference or mention this subject">
                    <Icon name="Info" size="sm" color="gray" />
                  </Tooltip>
                </h2>
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
                {(isSectionExpanded('documents') ? filteredDocuments : filteredDocuments.slice(0, 3)).map((doc, i) => (
                  <div 
                    key={i} 
                    className="bg-slate-700 rounded-lg p-4 cursor-pointer hover:bg-slate-600 transition-colors border border-slate-600 hover:border-blue-500"
                    onClick={() => {
                      // Ensure document has proper structure with id field
                      const documentToOpen = { ...doc, id: doc.id || doc.documentId };
                      onDocumentClick?.(documentToOpen, searchTerm || person.name);
                    }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-white font-medium">{doc.title || doc.fileName || doc.filename || 'Untitled Document'}</h3>
                      <RedFlagIndex value={doc.redFlagRating || 0} size="sm" variant="combined" showTextLabel={true} />
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
                        <Icon name="FileText" size="xs" />
                        {doc.fileName || doc.filename || 'Unknown file'}
                      </span>
                      {(doc.date || doc.dateCreated) && (
                        <span className="flex items-center gap-1">
                          <Icon name="Calendar" size="xs" />
                          {doc.date || doc.dateCreated}
                        </span>
                      )}
                      <span className="text-xs text-slate-500">
                        {doc.mentions || doc.mentionCount || 0} mentions
                      </span>
                    </div>
                  </div>
                ))}
                {filteredDocuments.length > 3 && !isSectionExpanded('documents') && (
                  <button
                    onClick={() => toggleSection('documents')}
                    className="w-full py-2 text-slate-400 hover:text-white transition-colors text-sm"
                  >
                    Show {filteredDocuments.length - 3} more documents...
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Spicy Passages */}
          {person?.spicy_passages?.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-red-300 flex items-center gap-2" aria-level={2}>
                  <Icon name="AlertTriangle" size="sm" color="danger" />
                  Key Passages ({person.spicy_passages.length})
                  <Tooltip content="Excerpts containing flagged keywords or significant mentions">
                    <Icon name="Info" size="sm" color="gray" />
                  </Tooltip>
                </h2>
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
                        <Icon name="FileText" size="xs" />
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