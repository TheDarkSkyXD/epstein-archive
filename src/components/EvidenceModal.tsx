import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Network, Layout, FileText, Image, Activity } from 'lucide-react';
import { Person } from '../types';
import { apiClient } from '../services/apiClient';
import { RedFlagIndex } from './RedFlagIndex';
import { Breadcrumb } from './Breadcrumb';
import { SourceBadge } from './SourceBadge';
import Tooltip from './Tooltip';
import Icon from './Icon';
import { useModalFocusTrap } from '../hooks/useModalFocusTrap';
import { CreateRelationshipModal } from './CreateRelationshipModal';
import { EntityEvidencePanel } from './EntityEvidencePanel';
import { EntityMediaGallery } from './EntityMediaGallery';

interface EvidenceModalProps {
  person: Person;
  onClose: () => void;
  searchTerm?: string;
  onDocumentClick?: (document: any, searchTerm?: string) => void;
}

type Tab = 'overview' | 'evidence' | 'media' | 'network';

export const EvidenceModal: React.FC<EvidenceModalProps> = React.memo(
  ({ person, onClose, searchTerm, onDocumentClick }) => {
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [documents, setDocuments] = useState<any[]>([]);
    const [loadingDocuments, setLoadingDocuments] = useState(false);
    const [filterQuery, setFilterQuery] = useState('');
    const [showRelationshipModal, setShowRelationshipModal] = useState(false);
    const { modalRef } = useModalFocusTrap(true);

    // Keyboard handling
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    // Fetch documents
    useEffect(() => {
      const fetchDocuments = async () => {
        if (!person.id) return;
        setLoadingDocuments(true);
        try {
          const personDocuments = await apiClient.getEntityDocuments(person.id);
          const sortedDocuments = personDocuments
            .map((doc: any) => ({
              ...doc,
              redFlagRating: Number(doc.redFlagRating || doc.red_flag_rating || 0),
              mentions: Number(doc.mentions || doc.mentionCount || 0),
              title: doc.title || doc.fileName || doc.filename || 'Untitled',
            }))
            .sort((a: any, b: any) => {
              const rfiDiff = b.redFlagRating - a.redFlagRating;
              if (rfiDiff !== 0) return rfiDiff;
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
    }, [person.id]);

    // Derived State
    const filteredDocuments = useMemo(() => {
      let docs = documents;
      if (filterQuery) {
        const query = filterQuery.toLowerCase();
        docs = docs.filter(
          (doc) =>
            (doc.title || '').toLowerCase().includes(query) ||
            (doc.content || '').toLowerCase().includes(query),
        );
      }
      return docs;
    }, [documents, filterQuery]);

    const highlightText = (text: string, term?: string) => {
      if (!term || !text) return text;
      try {
        const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(
          regex,
          '<mark class="bg-yellow-500/40 text-white px-0.5 rounded">$1</mark>',
        );
      } catch {
        return text;
      }
    };

    const renderHighlightedText = (text: string, term?: string) => {
      const highlighted = highlightText(text, term);
      return <span dangerouslySetInnerHTML={{ __html: highlighted }} />;
    };

    if (!person) return null;

    // Helper for risk badge
    const getRiskBadge = () => {
      const score = person.likelihood_score || 'UNKNOWN';
      const color =
        score === 'HIGH'
          ? 'red'
          : score === 'MEDIUM'
            ? 'amber'
            : score === 'LOW'
              ? 'emerald'
              : 'slate';

      const theme = {
        red: 'bg-red-950/50 text-red-200 border-red-500/50 shadow-red-900/20',
        amber: 'bg-amber-950/50 text-amber-200 border-amber-500/50 shadow-amber-900/20',
        emerald: 'bg-emerald-950/50 text-emerald-200 border-emerald-500/50 shadow-emerald-900/20',
        slate: 'bg-slate-800 text-slate-300 border-slate-600',
      }[color];

      return (
        <span
          className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider border backdrop-blur-md shadow-lg ${theme}`}
        >
          {score} RISK
        </span>
      );
    };

    return createPortal(
      <div
        ref={modalRef}
        className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[100] p-0 md:p-6 overflow-hidden animate-in fade-in duration-200"
        role="dialog"
        aria-modal="true"
      >
        <div className="bg-slate-900/90 w-full h-full md:rounded-2xl md:border border-slate-700 shadow-2xl flex flex-col max-w-6xl overflow-hidden relative">
          {/* HERO HEADER */}
          <div className="relative shrink-0 border-b border-slate-700/50 bg-slate-900">
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-800/50 opacity-50 pointer-events-none" />

            <div className="relative p-6 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
              <div className="flex items-center gap-5 flex-1 min-w-0">
                {/* Large Avatar */}
                <div className="shrink-0 relative">
                  {person.photos && person.photos.length > 0 ? (
                    <div className="w-20 h-20 rounded-xl overflow-hidden border-2 border-slate-600 shadow-xl ring-4 ring-slate-800/50">
                      <img
                        src={`/api/media/images/${person.photos[0].id}/thumbnail`}
                        alt={person.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-slate-800 border-2 border-slate-700 flex items-center justify-center shadow-inner">
                      <Icon name="User" size="xl" className="text-slate-500" />
                    </div>
                  )}
                  {/* Status Dot */}
                  <div
                    className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-900 flex items-center justify-center border border-slate-700`}
                  >
                    <div
                      className={`w-3 h-3 rounded-full ${person.status?.toLowerCase().includes('deceased') ? 'bg-slate-500' : 'bg-green-500'} shadow-[0_0_8px_currentColor]`}
                    />
                  </div>
                </div>

                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-3">
                    <h1 className="text-2xl md:text-3xl font-bold text-white truncate tracking-tight">
                      {searchTerm ? renderHighlightedText(person.name, searchTerm) : person.name}
                    </h1>
                    {getRiskBadge()}
                  </div>
                  <p className="text-slate-400 font-medium flex items-center gap-2 text-sm uppercase tracking-wide">
                    {person.role || 'Entity'}
                    <span className="w-1 h-1 rounded-full bg-slate-600" />
                    <span className="text-slate-500">{person.title || 'No Title'}</span>
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 self-end md:self-auto">
                <button
                  onClick={() => setShowRelationshipModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600/90 hover:bg-purple-600 text-white rounded-lg text-sm font-medium transition-all shadow-lg hover:shadow-purple-500/20 active:scale-95"
                >
                  <Network className="w-4 h-4" />
                  <span>Connect</span>
                </button>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors border border-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* TABS */}
            <div className="flex items-center px-6 gap-6 overflow-x-auto scrollbar-none border-t border-slate-800/50">
              {[
                { id: 'overview', label: 'Overview', icon: Layout },
                { id: 'evidence', label: `Documents (${documents.length})`, icon: FileText },
                { id: 'media', label: `Media (${person.photos?.length || 0})`, icon: Image },
                { id: 'network', label: 'Network Graph', icon: Activity },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as Tab)}
                  className={`flex items-center gap-2 py-4 text-sm font-medium border-b-2 transition-all select-none whitespace-nowrap
                           ${
                             activeTab === tab.id
                               ? 'border-cyan-500 text-cyan-400'
                               : 'border-transparent text-slate-500 hover:text-slate-300 hover:border-slate-700'
                           }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* CONTENT AREA */}
          <div className="flex-1 overflow-y-auto bg-slate-950 p-6">
            {/* OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div className="space-y-6 max-w-5xl mx-auto">
                {/* Key Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 flex flex-col items-center justify-center text-center">
                    <span className="text-3xl font-bold text-white mb-1">
                      {person.mentions?.toLocaleString() || 0}
                    </span>
                    <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                      Mentions
                    </span>
                  </div>
                  <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 flex flex-col items-center justify-center text-center">
                    <span className="text-3xl font-bold text-blue-400 mb-1">
                      {person.files || 0}
                    </span>
                    <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                      Documents
                    </span>
                  </div>
                  <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 flex flex-col items-center justify-center text-center">
                    <span className="text-3xl font-bold text-purple-400 mb-1">
                      {person.photos?.length || 0}
                    </span>
                    <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                      Photos
                    </span>
                  </div>
                  <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 flex flex-col items-center justify-center text-center">
                    <RedFlagIndex value={person.red_flag_rating || 0} size="lg" />
                    <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold mt-2">
                      Risk Rating
                    </span>
                  </div>
                </div>

                {/* Bio / Description */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    {person.red_flag_description && (
                      <div className="bg-red-950/10 border border-red-900/30 rounded-xl p-5 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-1 h-full bg-red-500/50" />
                        <h3 className="text-red-400 font-semibold mb-2 flex items-center gap-2">
                          <Icon name="AlertTriangle" size="sm" />
                          Red Flag Summary
                        </h3>
                        <p className="text-red-200/80 leading-relaxed text-sm">
                          {person.red_flag_description.replace(/^Red Flag Index \d+[\s:-]*/i, '')}
                        </p>
                      </div>
                    )}

                    {/* Black Book Entry */}
                    {person.blackBookEntry && (
                      <div className="bg-purple-950/10 border border-purple-900/30 rounded-xl p-5">
                        <h3 className="text-purple-400 font-semibold mb-3 flex items-center gap-2">
                          <Icon name="Book" size="sm" />
                          Black Book Entry
                        </h3>
                        <div className="space-y-3">
                          {person.blackBookEntry.phoneNumbers?.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {person.blackBookEntry.phoneNumbers.map(
                                (phone: string, i: number) => (
                                  <span
                                    key={i}
                                    className="px-2 py-1 bg-purple-900/40 text-purple-200 text-xs rounded border border-purple-800/50 flex items-center gap-1"
                                  >
                                    <Icon name="Phone" size="xs" /> {phone}
                                  </span>
                                ),
                              )}
                            </div>
                          )}
                          <p className="text-slate-400 text-sm italic border-l-2 border-purple-800/50 pl-3">
                            {person.blackBookEntry.notes || 'No notes in entry.'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Recent Evidence Snippets */}
                  <div className="space-y-4">
                    <h3 className="text-slate-300 font-semibold flex items-center gap-2">
                      <Icon name="FileText" size="sm" /> Top Key Passages
                    </h3>
                    {person.spicy_passages && person.spicy_passages.length > 0 ? (
                      <div className="space-y-3">
                        {person.spicy_passages.slice(0, 3).map((passage, i) => (
                          <div
                            key={i}
                            className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-sm"
                          >
                            <p className="text-slate-300 mb-2 line-clamp-3">
                              "...{passage.passage}..."
                            </p>
                            <div className="flex justify-between items-center text-xs text-slate-500">
                              <span className="text-red-400 font-mono">{passage.keyword}</span>
                              <span>{passage.filename}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-slate-500 italic text-sm">
                        No specific key passages extracted yet.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* EVIDENCE TAB */}
            {activeTab === 'evidence' && (
              <div className="space-y-4 max-w-5xl mx-auto">
                <div className="flex gap-4 mb-4">
                  <div className="relative flex-1">
                    <Icon
                      name="Search"
                      size="sm"
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"
                    />
                    <input
                      type="text"
                      placeholder="Search within documents..."
                      value={filterQuery}
                      onChange={(e) => setFilterQuery(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  {loadingDocuments ? (
                    <div className="text-center py-10 text-slate-500">Loading documents...</div>
                  ) : filteredDocuments.length > 0 ? (
                    filteredDocuments.map((doc, i) => (
                      <div
                        key={i}
                        onClick={() => {
                          const documentToOpen = { ...doc, id: doc.id || doc.documentId };
                          onDocumentClick?.(documentToOpen, searchTerm || person.name);
                        }}
                        className="bg-slate-900/50 border border-slate-800 hover:border-cyan-500/30 rounded-lg p-4 cursor-pointer transition-all hover:bg-slate-800 group"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="text-blue-400 group-hover:text-blue-300 font-medium truncate pr-4">
                            {doc.title}
                          </h4>
                          <RedFlagIndex value={doc.redFlagRating} size="sm" />
                        </div>
                        <p className="text-slate-400 text-sm line-clamp-2 mb-3">
                          {searchTerm
                            ? renderHighlightedText(doc.content?.substring(0, 300), searchTerm)
                            : doc.content?.substring(0, 300)}
                          ...
                        </p>
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Icon name="Calendar" size="xs" /> {doc.date || 'Unknown Date'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Icon name="TrendingUp" size="xs" /> {doc.mentions} mentions
                          </span>
                          <SourceBadge source={doc.source} />
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10 text-slate-500 italic">
                      No documents found matching your search.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* MEDIA TAB */}
            {activeTab === 'media' && (
              <div className="max-w-6xl mx-auto">
                <EntityMediaGallery media={person.photos || []} entityName={person.name} />
              </div>
            )}

            {/* NETWORK TAB */}
            {activeTab === 'network' && (
              <div className="h-full min-h-[500px] bg-slate-900 rounded-xl overflow-hidden border border-slate-800">
                <EntityEvidencePanel entityId={String(person.id)} entityName={person.name} />
              </div>
            )}
          </div>
        </div>

        {showRelationshipModal && (
          <CreateRelationshipModal
            onClose={() => setShowRelationshipModal(false)}
            onSuccess={() => {}}
            initialSourceId={person.id}
          />
        )}
      </div>,
      document.body,
    );
  },
);

EvidenceModal.displayName = 'EvidenceModal';
