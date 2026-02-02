import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronUp, ChevronDown, Network } from 'lucide-react';
import { Person } from '../types';
import { apiClient } from '../services/apiClient';
// TODO: Add article feed integration - see UNUSED_VARIABLES_RECOMMENDATIONS.md
// import { ArticleFeed } from './ArticleFeed';
import { RedFlagIndex } from './RedFlagIndex';
import { Breadcrumb } from './Breadcrumb';
import { SourceBadge } from './SourceBadge';
// TODO: Add form fields for evidence editing
// import FormField from './FormField';
import Tooltip from './Tooltip';
import Icon from './Icon';
import { useModalFocusTrap } from '../hooks/useModalFocusTrap';
import { CreateRelationshipModal } from './CreateRelationshipModal';
import { EntityEvidencePanel } from './EntityEvidencePanel';

interface EvidenceModalProps {
  person: Person;
  onClose: () => void;
  searchTerm?: string; // Optional search term to highlight
  onDocumentClick?: (document: any, searchTerm?: string) => void; // Callback when document is clicked
}

export const EvidenceModal: React.FC<EvidenceModalProps> = React.memo(
  ({ person, onClose, searchTerm, onDocumentClick }) => {
    const [expandedSections, setExpandedSections] = useState<Set<string>>(
      new Set(['stats', 'evidence']),
    );
    const [documents, setDocuments] = useState<any[]>([]);
    const [loadingDocuments, setLoadingDocuments] = useState(false);
    const [selectedEvidenceType, setSelectedEvidenceType] = useState<string | null>(null);
    const [filterQuery, setFilterQuery] = useState('');
    const [showRelationshipModal, setShowRelationshipModal] = useState(false);
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

    const toggleSection = useCallback(
      (section: string) => {
        setExpandedSections((prev) => {
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
      },
      [expandedSections],
    );

    const isSectionExpanded = useCallback(
      (section: string) => expandedSections.has(section),
      [expandedSections],
    );

    // Fetch documents when modal opens
    useEffect(() => {
      const fetchDocuments = async () => {
        if (!person.id) return;

        setLoadingDocuments(true);
        try {
          const personDocuments = await apiClient.getEntityDocuments(person.id);
          // Sort by Red Flag Index (descending)
          const sortedDocuments = personDocuments
            .map((doc: any) => ({
              ...doc,
              redFlagRating: Number(doc.redFlagRating || doc.red_flag_rating || 0),
              mentions: Number(doc.mentions || doc.mentionCount || 0),
              title: doc.title || doc.fileName || doc.filename || 'Untitled',
            }))
            .sort((a: any, b: any) => {
              // Sort by Red Flag Index (desc)
              const rfiDiff = b.redFlagRating - a.redFlagRating;
              if (rfiDiff !== 0) return rfiDiff;
              // Then by Mentions (desc)
              return b.mentions - a.mentions;
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
    const evidenceTypes = useMemo(
      () =>
        person?.evidence_types
          ?.map((type) => type?.replace('_', ' ')?.toUpperCase())
          ?.filter(Boolean) || [],
      [person?.evidence_types],
    );

    const visibleContexts = useMemo(
      () =>
        isSectionExpanded('contexts')
          ? person?.contexts || []
          : person?.contexts?.slice(0, 3) || [],
      [person?.contexts, isSectionExpanded],
    );

    const visiblePassages = useMemo(
      () =>
        isSectionExpanded('passages')
          ? person?.spicy_passages || []
          : person?.spicy_passages?.slice(0, 2) || [],
      [person?.spicy_passages, isSectionExpanded],
    );

    // Filter and sort documents: RFI desc → mentions desc
    const filteredDocuments = useMemo(() => {
      let docs = [...documents];

      // Filter by selected evidence type
      if (selectedEvidenceType) {
        const filterType = selectedEvidenceType.toLowerCase().replace(' ', '_');
        docs = docs.filter(
          (doc) =>
            doc.evidenceType?.toLowerCase() === filterType ||
            doc.evidence_type?.toLowerCase() === filterType,
        );
      }

      // Filter by search query
      if (filterQuery) {
        const query = filterQuery.toLowerCase();
        docs = docs.filter(
          (doc) =>
            (doc.title || doc.fileName || doc.filename || '').toLowerCase().includes(query) ||
            (doc.summary || doc.contextText || doc.aiSummary || doc.content || '')
              .toLowerCase()
              .includes(query),
        );
      }

      // Safety strict sort
      return docs.sort((a, b) => {
        if (b.redFlagRating !== a.redFlagRating) return b.redFlagRating - a.redFlagRating;
        return b.mentions - a.mentions;
      });
    }, [documents, selectedEvidenceType, filterQuery]);

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
    return createPortal(
      <div
        ref={modalRef}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-0 md:p-4 overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby="modal-description"
      >
        <div
          className="bg-slate-800 rounded-none md:rounded-xl w-full h-full md:h-auto md:max-h-[90vh] md:max-w-4xl overflow-y-auto border-0 md:border border-slate-700 flex flex-col max-w-full"
          style={{ maxWidth: 'calc(100vw - 2rem)' }}
        >
          {/* Header - Mobile optimized sticky header */}
          <div className="sticky top-0 bg-slate-800 border-b border-slate-700 px-4 py-3 md:p-6 flex flex-col gap-3 z-10">
            {/* Top row: Close button and breadcrumb */}
            <div className="flex items-center justify-between">
              <Breadcrumb
                items={[
                  { label: 'Subjects', onClick: () => {} },
                  { label: person.name || 'Unknown Person' },
                ]}
              />
              <button
                onClick={onClose}
                className="p-2 rounded-full hover:bg-slate-700 text-slate-400 hover:text-white transition-colors touch-feedback"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            {/* Person info row */}
            <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
              {person.photos && person.photos.length > 0 && person.photos[0].id ? (
                <div className="w-10 h-10 rounded-lg overflow-hidden border border-slate-600 shrink-0 mr-1">
                  <img
                    src={`/api/media/images/${person.photos[0].id}/thumbnail`}
                    alt={person.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <Icon name="User" size="md" color="info" className="shrink-0" />
              )}
              <h1
                id="modal-title"
                className="text-base sm:text-lg md:text-2xl font-bold text-white truncate flex-1 min-w-0"
              >
                {searchTerm
                  ? renderHighlightedText(person.name || 'Unknown', searchTerm)
                  : person.name || 'Unknown'}
              </h1>
              <button
                onClick={() => setShowRelationshipModal(true)}
                className="hidden sm:flex items-center gap-2 px-3 h-8 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-purple-500/20"
                title="Add Connection"
              >
                <Network className="w-4 h-4" />
                <span className="hidden md:inline">Connect</span>
              </button>
              <span
                className={`inline-flex items-center px-3 h-8 rounded-full text-xs font-bold border shadow-[0_0_10px_rgba(0,0,0,0.3)] backdrop-blur-sm ${
                  person.likelihood_score === 'HIGH'
                    ? 'bg-gradient-to-r from-red-950/80 to-red-900/60 border-red-500/50 text-red-200 shadow-red-900/20'
                    : person.likelihood_score === 'MEDIUM'
                      ? 'bg-gradient-to-r from-amber-950/80 to-amber-900/60 border-amber-500/50 text-amber-200 shadow-amber-900/20'
                      : 'bg-gradient-to-r from-emerald-950/80 to-emerald-900/60 border-emerald-500/50 text-emerald-200 shadow-emerald-900/20'
                }`}
                aria-label={`Risk level: ${person.likelihood_score || 'UNKNOWN'}`}
              >
                {person.likelihood_score || 'UNKNOWN'} RISK
              </span>
            </div>
          </div>

          {/* Content */}
          <div id="modal-description" className="p-4 sm:p-6 space-y-5 sm:space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="bg-slate-700 rounded-lg p-4 pr-10 sm:pr-4 text-center relative">
                <div className="absolute top-2 right-2">
                  <Tooltip
                    content="Total number of times this subject is mentioned across all documents in the archive"
                    position="bottom-end"
                  >
                    <Icon name="Info" size="sm" color="gray" className="cursor-help" />
                  </Tooltip>
                </div>
                <div className="text-lg sm:text-2xl font-bold text-white">
                  {(person?.mentions || 0).toLocaleString()}
                </div>
                <div
                  className="text-slate-400 text-xs sm:text-sm"
                  aria-label="Total mentions across all documents"
                >
                  Total Mentions
                </div>
              </div>
              <div className="bg-slate-700 rounded-lg p-4 pr-10 sm:pr-4 text-center relative">
                <div className="absolute top-2 right-2">
                  <Tooltip
                    content="Number of documents that reference or mention this subject"
                    position="bottom-end"
                  >
                    <Icon name="Info" size="sm" color="gray" className="cursor-help" />
                  </Tooltip>
                </div>
                <div className="text-lg sm:text-2xl font-bold text-white">{person?.files || 0}</div>
                <div
                  className="text-slate-400 text-xs sm:text-sm"
                  aria-label="Number of documents referencing this person"
                >
                  Files
                </div>
              </div>
              <div className="bg-slate-700 rounded-lg p-4 pr-10 sm:pr-4 text-center relative">
                <div className="absolute top-2 right-2">
                  <Tooltip
                    content="Different categories of evidence associated with this subject"
                    position="bottom-end"
                  >
                    <Icon name="Info" size="sm" color="gray" className="cursor-help" />
                  </Tooltip>
                </div>
                <div className="text-lg sm:text-2xl font-bold text-white">
                  {(person?.evidence_types || []).length}
                </div>
                <div
                  className="text-slate-400 text-xs sm:text-sm"
                  aria-label="Number of different evidence types"
                >
                  Evidence Types
                </div>
              </div>
            </div>

            {/* Black Book Information */}
            {person?.blackBookEntry && (
              <div className="bg-gradient-to-r from-purple-900/30 to-indigo-900/30 border border-purple-700/50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Icon name="Book" size="sm" color="primary" />
                  <h2
                    className="text-lg font-semibold text-purple-300 flex items-center gap-2"
                    aria-level={2}
                  >
                    Black Book Entry
                    <Tooltip content="This person appears in Jeffrey Epstein's personal contact book">
                      <Icon name="Info" size="sm" color="gray" />
                    </Tooltip>
                  </h2>
                </div>
                <div className="space-y-3">
                  {person.blackBookEntry.phoneNumbers &&
                    person.blackBookEntry.phoneNumbers.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-slate-300 mb-1">Phone Numbers</h3>
                        <div className="flex flex-wrap gap-2">
                          {person.blackBookEntry.phoneNumbers.map(
                            (phone: string, index: number) => (
                              <span
                                key={index}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-purple-800/50 text-purple-200 rounded text-sm"
                              >
                                <Icon name="Phone" size="xs" />
                                {phone}
                              </span>
                            ),
                          )}
                        </div>
                      </div>
                    )}
                  {person.blackBookEntry.emailAddresses &&
                    person.blackBookEntry.emailAddresses.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-slate-300 mb-1">Email Addresses</h3>
                        <div className="flex flex-wrap gap-2">
                          {person.blackBookEntry.emailAddresses.map(
                            (email: string, index: number) => (
                              <span
                                key={index}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-purple-800/50 text-purple-200 rounded text-sm"
                              >
                                <Icon name="Mail" size="xs" />
                                {email}
                              </span>
                            ),
                          )}
                        </div>
                      </div>
                    )}
                  {person.blackBookEntry.addresses &&
                    person.blackBookEntry.addresses.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-slate-300 mb-1">Addresses</h3>
                        <div className="space-y-1">
                          {person.blackBookEntry.addresses.map((address: string, index: number) => (
                            <div
                              key={index}
                              className="flex items-start gap-2 text-sm text-slate-300"
                            >
                              <Icon name="MapPin" size="xs" className="mt-0.5 flex-shrink-0" />
                              <span>{address}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  {person.blackBookEntry.notes && (
                    <div>
                      <h3 className="text-sm font-medium text-slate-300 mb-1">Notes</h3>
                      <p className="text-sm text-slate-300 bg-slate-800/50 p-2 rounded">
                        {person.blackBookEntry.notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

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
                  className={`mobile-chip mobile-chip-interactive touch-feedback shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all shadow-sm backdrop-blur-sm border ${
                    selectedEvidenceType === null
                      ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white border-blue-400 shadow-blue-500/30'
                      : 'bg-gradient-to-r from-slate-800 to-slate-900 text-slate-300 border-slate-700 hover:border-slate-500 hover:text-white'
                  }`}
                >
                  ALL
                </button>
                {evidenceTypes.map((type, i) => (
                  <button
                    key={i}
                    onClick={() =>
                      setSelectedEvidenceType(type === selectedEvidenceType ? null : type)
                    }
                    className={`mobile-chip mobile-chip-interactive touch-feedback shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all shadow-sm backdrop-blur-sm border ${
                      selectedEvidenceType === type
                        ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white border-blue-400 shadow-blue-500/30'
                        : 'bg-gradient-to-r from-blue-900/40 to-blue-900/20 text-blue-200 border-blue-500/30 hover:bg-blue-900/60 hover:border-blue-400/50'
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
                      <>
                        <ChevronUp className="w-4 h-4" /> Show Less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4" /> Show More
                      </>
                    )}
                  </button>
                </div>
                <div className="space-y-3">
                  {visibleContexts.map((context, i) => (
                    <div key={i} className="bg-slate-700 rounded-lg p-4">
                      <p className="text-slate-300 mb-2">
                        {searchTerm
                          ? renderHighlightedText(context?.context || '', searchTerm)
                          : context?.context || 'No context available'}
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
                    Documents ({filteredDocuments.length}
                    {selectedEvidenceType ? ` of ${documents.length}` : ''})
                    <Tooltip content="Documents that reference or mention this subject">
                      <Icon name="Info" size="sm" color="gray" />
                    </Tooltip>
                  </h2>
                  <button
                    onClick={() => toggleSection('documents')}
                    className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors"
                  >
                    {isSectionExpanded('documents') ? (
                      <>
                        <ChevronUp className="w-4 h-4" /> Show Less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4" /> Show More
                      </>
                    )}
                  </button>
                </div>

                {/* Document Filter Input */}
                {isSectionExpanded('documents') && (
                  <div className="mb-4">
                    <div className="relative">
                      <Icon
                        name="Search"
                        size="sm"
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                      />
                      <input
                        type="text"
                        placeholder="Filter documents..."
                        value={filterQuery}
                        onChange={(e) => setFilterQuery(e.target.value)}
                        className="w-full bg-slate-900/50 border border-slate-600 rounded-lg py-2 pl-14 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                      />
                      {filterQuery && (
                        <button
                          onClick={() => setFilterQuery('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  {(isSectionExpanded('documents')
                    ? filteredDocuments
                    : filteredDocuments.slice(0, 3)
                  ).map((doc, i) => (
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
                        <h3 className="text-white font-medium">
                          {doc.title || doc.fileName || doc.filename || 'Untitled Document'}
                        </h3>
                        <RedFlagIndex
                          value={doc.redFlagRating || 0}
                          size="sm"
                          variant="combined"
                          showTextLabel={true}
                        />
                      </div>
                      <div className="flex items-center space-x-2 mb-3">
                        {/* Source badge for document */}
                        <SourceBadge source={doc.source || 'Seventh Production'} />
                      </div>
                      <p className="text-slate-300 text-sm mb-3 line-clamp-3">
                        {searchTerm &&
                        (doc.summary || doc.contextText || doc.aiSummary || doc.content)
                          ? renderHighlightedText(
                              (
                                doc.summary ||
                                doc.contextText ||
                                doc.aiSummary ||
                                doc.content ||
                                ''
                              ).substring(0, 200) + '...',
                              searchTerm,
                            )
                          : (
                              doc.summary ||
                              doc.contextText ||
                              doc.aiSummary ||
                              doc.content ||
                              'No description available'
                            ).substring(0, 200) + '...'}
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
                  <h2
                    className="text-lg font-semibold text-red-300 flex items-center gap-2"
                    aria-level={2}
                  >
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
                      <>
                        <ChevronUp className="w-4 h-4" /> Show Less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4" /> Show More
                      </>
                    )}
                  </button>
                </div>
                <div className="space-y-3">
                  {visiblePassages.map((passage, i) => (
                    <div
                      key={i}
                      className="bg-red-900 bg-opacity-30 rounded-lg p-4 border border-red-700"
                    >
                      <p className="text-red-200 mb-2">
                        {searchTerm
                          ? renderHighlightedText(passage?.passage || '', searchTerm)
                          : passage?.passage || 'No passage available'}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-red-400">
                        <span className="px-2 py-1 bg-red-800 rounded">
                          {searchTerm
                            ? renderHighlightedText(passage?.keyword || '', searchTerm)
                            : passage?.keyword?.toUpperCase() || 'UNKNOWN'}
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

            {/* Relationship & Communications Intelligence */}
            {person?.id && (
              <div className="mt-8">
                <h2 className="text-lg font-semibold text-slate-100 mb-3 flex items-center gap-2">
                  <Icon name="Network" size="sm" />
                  Relationship & Communications Intelligence
                </h2>
                <p className="text-xs text-slate-400 mb-3 max-w-2xl">
                  Aggregated evidence, relationship graph signals, and email communications for this
                  entity across the archive.
                </p>
                <div className="bg-slate-900/60 border border-slate-700 rounded-xl p-3 md:p-4">
                  <EntityEvidencePanel
                    entityId={String(person.id)}
                    entityName={person.name || 'Unknown'}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        {showRelationshipModal && (
          <CreateRelationshipModal
            onClose={() => setShowRelationshipModal(false)}
            onSuccess={() => {
              // Optional: refresh data or show success message
            }}
            initialSourceId={person.id}
          />
        )}
      </div>,
      document.body,
    );
  },
);

EvidenceModal.displayName = 'EvidenceModal';
