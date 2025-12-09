import React, { useEffect, useState, useRef } from 'react'
import { FileText, Tag, Download } from 'lucide-react'
import { apiClient } from '../services/apiClient'
import { DocumentMetadataPanel } from './DocumentMetadataPanel'
import { MediaViewer } from './MediaViewer'
import { useModalFocusTrap } from '../hooks/useModalFocusTrap'

interface Props {
  id: string
  searchTerm?: string
  onClose: () => void
  initialDoc?: any
}

const highlight = (text: string, term?: string) => {
  if (!term || !text) return text
  try {
    const esc = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const rx = new RegExp(`(${esc})`, 'gi')
    return text.replace(rx, '<mark class="bg-yellow-500 text-black px-1 rounded">$1</mark>')
  } catch { return text }
}

export const DocumentModal: React.FC<Props> = ({ id, searchTerm, onClose, initialDoc }) => {
  const [doc, setDoc] = useState<any | null>(initialDoc || null)
  const [activeTab, setActiveTab] = useState<'content' | 'original' | 'metadata'>('content')
  const [showMediaViewer, setShowMediaViewer] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const { modalRef } = useModalFocusTrap(true)
  
  useEffect(() => {
    let mounted = true
    apiClient.getDocument(id)
      .then(d => { if (mounted) setDoc(d) })
      .catch(() => { /* leave initialDoc if present */ })
    return () => { mounted = false }
  }, [id])

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

  useEffect(() => {
    if (searchTerm && activeTab === 'content' && contentRef.current) {
      const t = setTimeout(() => { const m = contentRef.current?.querySelector('mark'); if (m) m.scrollIntoView({ behavior: 'smooth', block: 'center' }) }, 150)
      return () => clearTimeout(t)
    }
  }, [searchTerm, activeTab, doc?.content])

  if (!doc) return (
    <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-lg p-6 border border-slate-700">
        <div className="text-white font-semibold mb-2">Unable to load document</div>
        <div className="text-slate-400 mb-4">Please try again or open in the Document Browser.</div>
        <button onClick={onClose} className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white">Close</button>
      </div>
    </div>
  )

  const downloadText = () => {
    const a = document.createElement('a')
    const file = new Blob([doc.content || ''], { type: 'text/plain' })
    a.href = URL.createObjectURL(file)
    a.download = `${doc.fileName || 'document'}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <div ref={modalRef} className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-0 md:p-4" role="dialog" aria-modal="true" aria-labelledby="document-modal-title">
      <div className="bg-slate-900 rounded-none md:rounded-lg w-full h-full md:max-w-6xl md:max-h-[95vh] overflow-hidden flex flex-col border-0 md:border border-slate-700">
        <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-400" />
            <h2 id="document-modal-title" className="text-lg font-semibold text-white">{doc.title || doc.fileName}</h2>
            <span className="text-lg">{'🚩'.repeat(doc.redFlagRating || 0)}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setActiveTab('metadata')} className="p-2 text-slate-300 hover:text-white" title="Metadata">
              <Tag className="w-4 h-4" />
            </button>
            <button onClick={downloadText} className="p-2 text-slate-300 hover:text-white" title="Download Text">
              <Download className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="p-2 text-slate-300 hover:text-white">✕</button>
          </div>
        </div>
        <div className="flex border-b border-slate-700 bg-slate-800 overflow-x-auto">
          <button onClick={() => setActiveTab('content')} className={`px-4 py-3 text-sm ${activeTab==='content'?'text-cyan-400 border-b-2 border-cyan-400 bg-slate-700':'text-slate-400 hover:text-white hover:bg-slate-700'}`}>Text Content</button>
          <button onClick={() => setActiveTab('original')} className={`px-4 py-3 text-sm ${activeTab==='original'?'text-cyan-400 border-b-2 border-cyan-400 bg-slate-700':'text-slate-400 hover:text-white hover:bg-slate-700'}`}>View Original</button>
          <button onClick={() => setActiveTab('metadata')} className={`px-4 py-3 text-sm ${activeTab==='metadata'?'text-cyan-400 border-b-2 border-cyan-400 bg-slate-700':'text-slate-400 hover:text-white hover:bg-slate-700'}`}>Metadata</button>
        </div>
        <div className="flex-1 overflow-y-auto p-6" ref={contentRef}>
          {activeTab === 'content' && (
            <>
              {doc.content && doc.content.length > 0 ? (
                <pre className="whitespace-pre-wrap text-sm text-slate-300 font-mono leading-relaxed" dangerouslySetInnerHTML={{ __html: searchTerm ? highlight(doc.content, searchTerm) : doc.content }} />
              ) : (
                <div className="text-slate-300">
                  <div className="mb-2">Full text not available. Showing preview:</div>
                  <pre className="whitespace-pre-wrap text-sm text-slate-300 font-mono leading-relaxed" dangerouslySetInnerHTML={{ __html: searchTerm ? highlight(doc.contentPreview || '', searchTerm) : (doc.contentPreview || '') }} />
                </div>
              )}
            </>
          )}
          {activeTab === 'original' && (
            <div className="space-y-4">
              {doc.source_original_url ? (
                <>
                  <div className="text-slate-300">
                    This document has an original file available. You can view or download it using the options below:
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button 
                      onClick={() => setShowMediaViewer(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                      View Original Document
                    </button>
                    <a 
                      href={doc.source_original_url} 
                      download
                      className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm7.293-9.707a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 9.414V17a1 1 0 11-2 0V9.414L7.707 11.707a1 1 0 01-1.414-1.414l3-3z" clipRule="evenodd" />
                      </svg>
                      Download Original
                    </a>
                  </div>
                  <div className="text-sm text-slate-400 mt-2">
                    Note: The original document may contain additional information not present in the text version.
                  </div>
                </>
              ) : (
                <div className="text-slate-400">
                  No original file is available for this document.
                </div>
              )}
            </div>
          )}

          {showMediaViewer && doc.source_original_url && (
            <MediaViewer
              filePath={doc.source_original_url}
              fileName={doc.fileName || 'document'}
              fileType={doc.fileType || 'pdf'}
              onClose={() => setShowMediaViewer(false)}
            />
          )}
          
          {activeTab === 'metadata' && (
            <DocumentMetadataPanel document={doc} />
          )}
        </div>
      </div>
    </div>
  )
}

export default DocumentModal