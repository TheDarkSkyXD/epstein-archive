import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FileText, Tag, Download, Eye } from 'lucide-react';
import { prettifyOCRText } from '../utils/prettifyOCR';
import { apiClient } from '../services/apiClient';
import { DocumentMetadataPanel } from './DocumentMetadataPanel';
import { MediaViewer } from './MediaViewer';
import { DocumentContentRenderer } from './DocumentContentRenderer';
import { useModalFocusTrap } from '../hooks/useModalFocusTrap';
import { EvidenceModal } from './EvidenceModal';

interface Props {
  id: string;
  searchTerm?: string;
  onClose: () => void;
  initialDoc?: any;
}

const highlight = (text: string, term?: string) => {
  if (!term || !text) return text;
  try {
    const esc = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rx = new RegExp(`(${esc})`, 'gi');
    return text.replace(rx, '<mark class="bg-yellow-500 text-black px-1 rounded">$1</mark>');
  } catch {
    return text;
  }
};

export const DocumentModal: React.FC<Props> = ({ id, searchTerm, onClose, initialDoc }) => {
  const [doc, setDoc] = useState<any | null>(initialDoc || null);
  const [activeTab, setActiveTab] = useState<'content' | 'original' | 'metadata'>('content');
  const [showMediaViewer, setShowMediaViewer] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const [selectedEntity, setSelectedEntity] = useState<any | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const { modalRef } = useModalFocusTrap(true);

  useEffect(() => {
    let mounted = true;
    apiClient
      .getDocument(id)
      .then((d) => {
        if (mounted) setDoc(d);
      })
      .catch(() => {
        /* leave initialDoc if present */
      });
    return () => {
      mounted = false;
    };
  }, [id]);

  // Announce modal opening for screen readers
  useEffect(() => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = `Opened document ${doc?.title || doc?.fileName || 'untitled'}`;
    document.body.appendChild(announcement);
    return () => {
      document.body.removeChild(announcement);
    };
  }, [doc?.title, doc?.fileName]);

  // Handle entity click events
  useEffect(() => {
    const handleEntityClick = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail && customEvent.detail.id) {
        // Fetch entity data and open modal
        apiClient
          .getEntity(customEvent.detail.id)
          .then((entity) => {
            setSelectedEntity(entity);
          })
          .catch((error) => {
            console.error('Error fetching entity:', error);
          });
      }
    };

    window.addEventListener('entityClick', handleEntityClick);

    return () => {
      window.removeEventListener('entityClick', handleEntityClick);
    };
  }, []);

  useEffect(() => {
    if (searchTerm && activeTab === 'content' && contentRef.current) {
      const t = setTimeout(() => {
        const m = contentRef.current?.querySelector('mark');
        if (m) m.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
      return () => clearTimeout(t);
    }
  }, [searchTerm, activeTab, doc?.content]);

  if (!doc)
    return createPortal(
      <div className="fixed inset-0 bg-black/75 z-[1050] flex items-center justify-center p-4">
        <div className="bg-slate-900 rounded-lg p-6 border border-slate-700 pointer-events-auto">
          <div className="text-white font-semibold mb-2">Unable to load document</div>
          <div className="text-slate-400 mb-4">
            Please try again or open in the Document Browser.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
          >
            Close
          </button>
        </div>
      </div>,
      document.body,
    );

  const downloadText = () => {
    const a = document.createElement('a');
    const file = new Blob([doc.content || ''], { type: 'text/plain' });
    a.href = URL.createObjectURL(file);
    a.download = `${doc.fileName || 'document'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const portal = createPortal(
    <div
      ref={modalRef}
      className="fixed inset-0 bg-black/75 z-[10000] flex items-center justify-center p-0 md:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="document-modal-title"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 rounded-none md:rounded-lg w-full h-full md:max-w-6xl md:max-h-[95vh] overflow-hidden flex flex-col border-0 md:border border-slate-700 pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-400" />
            <h2 id="document-modal-title" className="text-lg font-semibold text-white">
              {doc.title || doc.fileName}
            </h2>
            <span className="text-lg">{'🚩'.repeat(doc.redFlagRating || 0)}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('metadata')}
              className="p-2 text-slate-300 hover:text-white"
              title="Metadata"
            >
              <Tag className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowRaw(!showRaw)}
              className={`p-2 hover:text-white ${showRaw ? 'text-slate-500' : 'text-cyan-400'}`}
              title={showRaw ? 'Showing raw OCR text' : 'Showing cleaned text'}
            >
              {showRaw ? <FileText className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <button
              onClick={downloadText}
              className="p-2 text-slate-300 hover:text-white"
              title="Download Text"
            >
              <Download className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="p-2 text-slate-300 hover:text-white">
              ✕
            </button>
          </div>
        </div>
        <div className="flex border-b border-slate-700 bg-slate-800 overflow-x-auto">
          <button
            onClick={() => setActiveTab('content')}
            className={`px-4 py-3 text-sm ${activeTab === 'content' ? 'text-cyan-400 border-b-2 border-cyan-400 bg-slate-700' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
          >
            Text Content
          </button>
          <button
            onClick={() => setActiveTab('original')}
            className={`px-4 py-3 text-sm ${activeTab === 'original' ? 'text-cyan-400 border-b-2 border-cyan-400 bg-slate-700' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
          >
            View Original
          </button>
          <button
            onClick={() => setActiveTab('metadata')}
            className={`px-4 py-3 text-sm ${activeTab === 'metadata' ? 'text-cyan-400 border-b-2 border-cyan-400 bg-slate-700' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
          >
            Metadata
          </button>
        </div>
        <div
          className={`flex-1 overflow-y-auto ${activeTab === 'original' ? 'p-0 overflow-hidden bg-black/20' : 'p-6'}`}
          ref={contentRef}
        >
          {activeTab === 'content' && (
            <>
              {doc.content && doc.content.length > 0 ? (
                <DocumentContentRenderer document={doc} searchTerm={searchTerm} showRaw={showRaw} />
              ) : (
                <div className="text-slate-300">
                  <div className="mb-2">Full text not available. Showing preview:</div>
                  <DocumentContentRenderer
                    document={{ ...doc, content: doc.contentPreview }}
                    searchTerm={searchTerm}
                    showRaw={showRaw}
                  />
                </div>
              )}
            </>
          )}
          {activeTab === 'original' && (
            <div className="h-full flex flex-col">
              {doc.originalFileUrl ? (
                <>
                  <div className="flex-1 relative overflow-hidden">
                    <MediaViewer
                      filePath={doc.originalFileUrl}
                      fileName={doc.fileName || 'document'}
                      fileType={doc.fileType || 'pdf'}
                      onClose={() => {}} // No-op since we handled it inline
                      inline={true}
                    />
                  </div>
                  <div className="p-4 bg-slate-900 border-t border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-3 z-30">
                    <span className="text-slate-400 text-sm text-center sm:text-left">
                      Note: The original document may contain additional information not present in
                      the text version.
                    </span>
                    <a
                      href={doc.originalFileUrl}
                      download
                      className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors shrink-0"
                    >
                      <Download className="w-4 h-4" />
                      Download Original
                    </a>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-slate-400">
                  No original file is available for this document.
                </div>
              )}
            </div>
          )}

          {activeTab === 'metadata' && <DocumentMetadataPanel document={doc} />}
        </div>
      </div>
    </div>,
    document.body,
  );

  // Render EvidenceModal when an entity is selected
  return selectedEntity ? (
    <EvidenceModal
      person={selectedEntity}
      onClose={() => setSelectedEntity(null)}
      searchTerm={searchTerm}
    />
  ) : (
    portal
  );
};

export default DocumentModal;
