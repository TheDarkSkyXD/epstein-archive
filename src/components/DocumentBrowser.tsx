import React, { useState, useEffect, useMemo } from 'react';
import { Document, BrowseFilters, DocumentCollection } from '../types/documents';
import { DocumentProcessor } from '../services/documentProcessor';
import { Search, Filter, Calendar, FileText, Users, Tag, ChevronDown, ChevronRight, Network, Download } from 'lucide-react';
import { useNavigation } from '../services/ContentNavigationService.tsx';
import { apiClient } from '../services/apiClient';
import { DocumentAnnotationSystem } from './DocumentAnnotationSystem';
import { Breadcrumb } from './Breadcrumb';
import { SourceBadge } from './SourceBadge';

interface DocumentBrowserProps {
  processor: DocumentProcessor;
  searchTerm?: string;
  onSearchTermChange?: (term: string) => void;
  selectedDocumentId?: string;
  onDocumentClose?: () => void;
}

export const DocumentBrowser: React.FC<DocumentBrowserProps> = ({ processor, searchTerm: externalSearchTerm, onSearchTermChange, selectedDocumentId, onDocumentClose }) => {
  console.log('DocumentBrowser: Component mounted with processor:', !!processor);
  

  console.log('DocumentBrowser: Component mounted with processor:', !!processor);
  
  // Use navigation context for shared state
  const navigation = useNavigation();
  const { searchTerm: contextSearchTerm, setSearchTerm: setContextSearchTerm } = navigation;
  
  // Use either external searchTerm or context searchTerm
  const effectiveSearchTerm = externalSearchTerm !== undefined ? externalSearchTerm : contextSearchTerm;
  
  console.log('DocumentBrowser searchTerm props:', { 
    externalSearchTerm, 
    contextSearchTerm, 
    effectiveSearchTerm 
  });
  
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [relatedDocuments, setRelatedDocuments] = useState<Document[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'relevance' | 'date' | 'spice' | 'fileType' | 'size'>('relevance');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [collection, setCollection] = useState<DocumentCollection | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  // const [useVirtualScrolling, setUseVirtualScrolling] = useState(false);
  // const [displayLimit, setDisplayLimit] = useState(100); // Start with 100 documents
  const [currentPage, setCurrentPage] = useState(1);
  const [showMetadata, setShowMetadata] = useState(false);
  const itemsPerPage = 100;
  
  const [filters, setFilters] = useState<BrowseFilters>({
    fileType: [],
    dateRange: {},
    entities: [],
    categories: [],
    spiceLevel: { min: 1, max: 5 },
    confidentiality: [],
    source: []
  });

  // Function to highlight search terms in text
  const highlightText = (text: string, term?: string) => {
    if (!term || !text || typeof text !== 'string') return text;
    
    try {
      // Escape special regex characters
      const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // Split term into words and filter out short words to avoid noise
      const terms = term.split(/\s+/).filter(t => t.length > 2);
      
      if (terms.length === 0) {
        // If no valid terms after filtering, try the full term if it's short but not empty
        if (term.trim().length > 0) {
           const regex = new RegExp(`(${escapeRegExp(term)})`, 'gi');
           return text.replace(regex, '<mark class="bg-yellow-500 text-black px-1 rounded">$1</mark>');
        }
        return text;
      }
      
      // Create pattern to match any of the terms
      const pattern = `(${terms.map(escapeRegExp).join('|')})`;
      const regex = new RegExp(pattern, 'gi');
      
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
  
  // Helper to format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown Date';
    try {
      const date = new Date(dateString);
      // Check if valid date
      if (isNaN(date.getTime())) return dateString;
      
      // Format: Jan 1, 2000
      return new Intl.DateTimeFormat('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      }).format(date);
    } catch (e) {
      return dateString;
    }
  };


  
  // Enable virtual scrolling for large datasets
  useEffect(() => {
    // setUseVirtualScrolling(filteredDocuments.length > 100);
  }, [filteredDocuments.length]);

  useEffect(() => {
    try {
      console.log('DocumentBrowser: Loading document collection...');
      const docCollection = processor.getDocumentCollection();
      console.log('DocumentBrowser: Collection loaded:', {
        totalDocuments: docCollection?.documents?.length || 0,
        fileTypes: Array.from(docCollection?.fileTypes?.keys() || []),
        hasCollection: !!docCollection,
        documents: docCollection?.documents?.slice(0, 5).map(d => ({id: d.id, title: d.title, filename: d.filename})) || []
      });
      
      setCollection(docCollection);
      const docs = docCollection?.documents || [];
      console.log('DocumentBrowser: Setting documents state with', docs.length, 'documents');
      setDocuments(docs);
      setFilteredDocuments(docs);
    } catch (error) {
      console.error('DocumentBrowser: Error loading document collection:', error);
      setDocuments([]);
      setFilteredDocuments([]);
    }
  }, [processor]);

  useEffect(() => {
    let results = documents;

    // Apply search
    if (effectiveSearchTerm && effectiveSearchTerm.trim()) {
      results = processor.searchDocuments(effectiveSearchTerm, filters);
    } else {
      results = processor.browseDocuments(filters, sortBy, sortOrder);
    }

    // Apply pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    setFilteredDocuments(results.slice(startIndex, endIndex));
  }, [documents, effectiveSearchTerm, filters, sortBy, sortOrder, processor, currentPage]);

  // Auto-select document when selectedDocumentId changes
  useEffect(() => {
    if (selectedDocumentId) {
      // If already selected, don't do anything
      if (selectedDocument?.id === selectedDocumentId) return;

      console.log('DocumentBrowser: selectedDocumentId changed to', selectedDocumentId);
      
      if (documents.length > 0) {
        const document = documents.find(doc => doc.id === selectedDocumentId);
        if (document) {
          console.log('DocumentBrowser: Found document in current list, selecting');
          handleDocumentSelect(document);
          return;
        }
      }

      // If we get here, document was not found in the list or list is empty
      console.log('DocumentBrowser: Document NOT found in current list, fetching...');
      
      apiClient.getDocument(selectedDocumentId)
        .then(docData => {
          if (docData) {
            console.log('DocumentBrowser: Fetched document successfully');
            // Map to Document type
            const newDoc: Document = {
              id: docData.id,
              title: docData.fileName,
              filename: docData.fileName,
              fileType: docData.fileType || 'unknown',
              fileSize: docData.fileSize || 0,
              dateCreated: docData.dateCreated,
              dateModified: docData.dateModified,
              content: docData.content || '',
              metadata: {
                source: 'Epstein Files',
                confidentiality: 'Public',
                categories: [],
                ...docData.metadata
              },
              entities: [], 
              passages: [],
              spiceScore: docData.spiceScore || 0,
              spiceRating: docData.spiceRating || 1,
              spicePeppers: '🚩'.repeat(docData.spiceRating || 1),
              spiceDescription: `Red Flag Index ${docData.spiceRating || 1}`
            };
            
            handleDocumentSelect(newDoc);
          }
        })
        .catch(err => console.error('Error fetching selected document:', err));
    }
  }, [selectedDocumentId, documents, selectedDocument]);

  const fileTypeOptions = useMemo(() => {
    if (!collection) return [];
    return Array.from(collection.fileTypes.entries()).map(([type, count]) => ({
      value: type,
      label: `${type} (${count})`
    }));
  }, [collection]);

  const sourceOptions = useMemo(() => {
    if (!collection) return [];
    const sources = [...new Set(documents.map(doc => doc.metadata.source))];
    return sources.map(source => ({
      value: source,
      label: source
    }));
  }, [documents]);

  const handleFilterChange = (key: keyof BrowseFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleFileTypeToggle = (fileType: string) => {
    const current = filters.fileType || [];
    const updated = current.includes(fileType)
      ? current.filter(t => t !== fileType)
      : [...current, fileType];
    handleFilterChange('fileType', updated);
  };

  const handleSpiceLevelChange = (min: number, max: number) => {
    handleFilterChange('spiceLevel', { min, max });
  };

  const handleDocumentSelect = async (document: Document) => {
    // Set initial document data immediately
    setSelectedDocument(document);
    
    try {
      // Fetch full content from API
      const fullDoc = await apiClient.getDocument(document.id);
      if (fullDoc) {
        setSelectedDocument(prev => prev?.id === document.id ? { ...prev, ...fullDoc } : prev);
      }
    } catch (error) {
      console.error('Error fetching full document content:', error);
    }

    const related = processor.findRelatedDocuments(document.id, 5);
    setRelatedDocuments(related);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };


  const DocumentCard: React.FC<{ document: Document }> = ({ document }) => (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 hover:border-gray-500 transition-colors cursor-pointer"
         onClick={() => handleDocumentSelect(document)}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-2">
          <FileText className="w-4 h-4 text-blue-400" />
          <span className="text-xs text-gray-400 uppercase">{document.fileType}</span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="text-xs text-gray-400">{formatFileSize(document.fileSize)}</span>
          <span className="text-lg">{document.spicePeppers}</span>
        </div>
      </div>
      
      <h3 className="font-semibold text-white mb-2 line-clamp-2">
        {effectiveSearchTerm ? renderHighlightedText(document.title, effectiveSearchTerm) : document.title}
      </h3>
      <p className="text-sm text-gray-300 mb-3 line-clamp-3">
        {effectiveSearchTerm ? renderHighlightedText(document.content.substring(0, 200) + '...', effectiveSearchTerm) : document.content.substring(0, 200) + '...'}
      </p>
      
      <div className="flex items-center justify-between text-xs text-gray-400">
        <div className="flex items-center space-x-2">
          <Calendar className="w-3 h-3" />
          <span>{formatDate(document.dateCreated)}</span>
        </div>
        <div className="flex items-center space-x-2">
          <Users className="w-3 h-3" />
          <span>{document.entities.length} entities</span>
        </div>
      </div>
      
      {/* Source badge for document card */}
      <div className="mt-2">
        <SourceBadge source={document.metadata.source || 'Seventh Production'} />
      </div>
      
      {document.entities.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {document.entities.slice(0, 3).map((entity, index) => (
            <span key={index} className="px-2 py-1 bg-gray-800 text-xs text-gray-300 rounded">
              {effectiveSearchTerm ? renderHighlightedText(entity.name, effectiveSearchTerm) : entity.name}
            </span>
          ))}
          {document.entities.length > 3 && (
            <span className="px-2 py-1 bg-gray-800 text-xs text-gray-400 rounded">
              +{document.entities.length - 3} more
            </span>
          )}
        </div>
      )}
    </div>
  );
  
  // Virtualized document card for better performance with large lists
  // const VirtualizedDocumentCard = ({ index, style }: { index: number; style: React.CSSProperties }) => {
  //   const document = filteredDocuments[index];
  //   if (!document) return null;
  //   
  //   return (
  //     <div style={style} className="p-1">
  //       <DocumentCard document={document} />
  //     </div>
  //   );
  // };


  const DocumentViewer: React.FC<{ document: Document; searchTerm?: string }> = ({ document, searchTerm }) => {
    const [activeTab, setActiveTab] = useState<'content' | 'original' | 'entities' | 'related' | 'annotations'>('content');
    const [pages, setPages] = useState<string[]>([]);
    const [loadingPages, setLoadingPages] = useState(false);
    const [showAnnotations, setShowAnnotations] = useState(false);
    const contentRef = React.useRef<HTMLDivElement>(null);

    // Reset pages when document changes
    useEffect(() => {
      setPages([]);
    }, [document.id]);

    // Fetch pages when tab is switched to original or document changes
    useEffect(() => {
      if (activeTab === 'original') {
        const fetchPages = async () => {
          setLoadingPages(true);
          try {
            const result = await apiClient.getDocumentPages(document.id);
            setPages(result.pages);
          } catch (error) {
            console.error('Error fetching pages:', error);
          } finally {
            setLoadingPages(false);
          }
        };
        fetchPages();
      }
    }, [activeTab, document.id]);

    // Scroll to first highlight when content or search term changes
    useEffect(() => {
      if (searchTerm && activeTab === 'content' && contentRef.current) {
        // Small timeout to allow rendering to complete
        const timer = setTimeout(() => {
          const firstMark = contentRef.current?.querySelector('mark');
          if (firstMark) {
            firstMark.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, 100);
        return () => clearTimeout(timer);
      }
    }, [document.id, searchTerm, activeTab]);

    const handleDownload = () => {
      // Construct download URL for the text file
      // We can use the file path from the document object if available, or construct it
      // For now, let's try to download the text content as a file
      const element = window.document.createElement("a");
      const file = new Blob([document.content], {type: 'text/plain'});
      element.href = URL.createObjectURL(file);
      element.download = `${document.filename || 'document'}.txt`;
      window.document.body.appendChild(element); // Required for this to work in FireFox
      element.click();
      window.document.body.removeChild(element);
    };

    return (
      <div className="fixed inset-x-0 top-16 bottom-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-0 md:p-4">
      <div className="bg-gray-900 rounded-none md:rounded-lg w-full h-full md:max-w-6xl md:max-h-[95vh] overflow-hidden flex flex-col shadow-2xl border-0 md:border border-gray-700">
        
        <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-800">
          {/* Breadcrumb */}
          <div className="w-full mb-2">
            <Breadcrumb 
              items={[
                { label: 'Documents', onClick: () => {} },
                { label: document.title || 'Unknown Document' }
              ]} 
            />
          </div>
          
          <div className="flex items-center space-x-3">
            <FileText className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-white">
              {searchTerm ? renderHighlightedText(document.title, searchTerm) : document.title}
            </h2>
            <span className="text-lg">{document.spicePeppers}</span>
          </div>
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => setShowMetadata(!showMetadata)}
              className="md:hidden p-2 text-gray-400 hover:text-white"
              title="Toggle Metadata"
            >
              <Tag className="w-4 h-4" />
            </button>
            <button 
              onClick={handleDownload}
              className="p-2 text-gray-400 hover:text-white"
              title="Download Text"
            >
              <Download className="w-4 h-4" />
            </button>
            <button 
              onClick={() => {
                setSelectedDocument(null);
                if (onDocumentClose) onDocumentClose();
              }}
              className="p-2 text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex border-b border-gray-700 bg-gray-800 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setActiveTab('content')}
            className={`px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'content' ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-700' : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            Text Content
          </button>
          <button
            onClick={() => setActiveTab('original')}
            className={`px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'original' ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-700' : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            View Original ({pages.length > 0 ? pages.length : '...'})
          </button>
          <button
            onClick={() => setActiveTab('entities')}
            className={`px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'entities' ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-700' : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            Entities ({document.entities.length})
          </button>
          <button
            onClick={() => setActiveTab('related')}
            className={`px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'related' ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-700' : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            Related ({relatedDocuments.length})
          </button>
          <button
            onClick={() => setActiveTab('annotations')}
            className={`px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'annotations' ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-700' : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            Annotations
          </button>
        </div>
        
        <div className="flex-1 overflow-hidden flex">
          <div className="flex-1 overflow-y-auto p-6 bg-gray-900" ref={contentRef}>
            {activeTab === 'content' && (
              <div className="prose prose-invert max-w-none">
                <div className="mb-4 flex items-center justify-between">
                  <div className="text-sm text-gray-400">Select text to add annotations and evidence</div>
                  <button
                    onClick={() => setShowAnnotations(!showAnnotations)}
                    className={`px-3 py-1 text-xs rounded ${
                      showAnnotations ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {showAnnotations ? 'Hide Annotations' : 'Show Annotations'}
                  </button>
                </div>
                {showAnnotations ? (
                  <DocumentAnnotationSystem
                    documentId={document.id}
                    content={document.content}
                    searchTerm={searchTerm}
                    renderHighlightedText={renderHighlightedText}
                  />
                ) : (
                  <pre className="whitespace-pre-wrap text-sm text-gray-300 font-mono leading-relaxed">
                    {searchTerm ? renderHighlightedText(document.content, searchTerm) : document.content}
                  </pre>
                )}
              </div>
            )}

            {activeTab === 'original' && (
              <div className="flex flex-col items-center space-y-4 min-h-full">
                {loadingPages ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
                  </div>
                ) : pages.length > 0 ? (
                  pages.map((pageUrl, index) => (
                    <div key={index} className="w-full max-w-3xl bg-white p-1 rounded shadow-lg">
                      <img 
                        src={`http://localhost:3012${pageUrl}`} 
                        alt={`Page ${index + 1}`}
                        className="w-full h-auto"
                        loading="lazy"
                      />
                      <div className="text-center text-gray-500 text-xs py-1">Page {index + 1}</div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                    <FileText className="w-16 h-16 mb-4 opacity-50" />
                    <p>No original images found for this document.</p>
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'entities' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white mb-4">Entities Found in Document</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {document.entities.map((entity, index) => (
                    <div key={index} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-white">
                          {searchTerm ? renderHighlightedText(entity.name, searchTerm) : entity.name}
                        </h4>
                        <span className="text-xs text-gray-400 capitalize bg-gray-700 px-2 py-1 rounded">
                          {entity.type}
                        </span>
                      </div>
                      <div className="text-sm text-gray-300 mb-2">
                        Mentioned {entity.mentions} times
                      </div>
                      <div className="text-xs text-gray-400 capitalize">
                        Significance: {entity.significance}
                      </div>
                      {entity.contexts.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-700">
                          <div className="text-xs text-gray-400 mb-2">Context:</div>
                          <div className="text-xs text-gray-300 italic">
                            {searchTerm ? renderHighlightedText(`"${entity.contexts[0].context}"`, searchTerm) : `"${entity.contexts[0].context}"`}
                          </div>
                          {/* Source badge for entity context */}
                          <div className="mt-2">
                            <SourceBadge source={entity.contexts[0]?.source || 'Seventh Production'} />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {activeTab === 'related' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white mb-4">Related Documents</h3>
                {relatedDocuments.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4">
                    {relatedDocuments.map((relatedDoc) => (
                      <div 
                        key={relatedDoc.id}
                        className="bg-gray-800 rounded-lg p-4 cursor-pointer hover:bg-gray-700 transition-colors border border-gray-700"
                        onClick={() => handleDocumentSelect(relatedDoc)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-white line-clamp-1">
                            {searchTerm ? renderHighlightedText(relatedDoc.title, searchTerm) : relatedDoc.title}
                            {relatedDoc.title !== relatedDoc.filename && (
                              <span className="text-xs text-gray-400 ml-2 font-normal">
                                ({relatedDoc.filename})
                              </span>
                            )}
                          </h4>
                          <span className="text-lg">{relatedDoc.spicePeppers}</span>
                        </div>
                        <div className="text-sm text-gray-300 mb-2 line-clamp-2">
                          {searchTerm ? renderHighlightedText(relatedDoc.content.substring(0, 150) + '...', searchTerm) : relatedDoc.content.substring(0, 150) + '...'}
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-400">
                          <span>{relatedDoc.fileType}</span>
                          <span>{formatFileSize(relatedDoc.fileSize)}</span>
                        </div>
                        {/* Source badge for related document */}
                        <div className="mt-2">
                          <SourceBadge source={relatedDoc.metadata.source || 'Seventh Production'} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <Network className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No related documents found</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'annotations' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Document Annotations</h3>
                  <div className="text-sm text-gray-400">Evidence collection and analysis</div>
                </div>
                <DocumentAnnotationSystem
                  documentId={document.id}
                  content={document.content}
                  searchTerm={searchTerm}
                  renderHighlightedText={renderHighlightedText}
                  mode="full"
                />
              </div>
            )}
          </div>
          
          {/* Metadata Sidebar - Collapsible on Mobile */}
          <div className={`
            ${showMetadata ? 'block' : 'hidden'} 
            md:block 
            w-full md:w-80 
            border-t md:border-t-0 md:border-l border-gray-700 
            p-4 
            overflow-y-auto 
            bg-gray-800 md:bg-transparent
            absolute md:static bottom-0 left-0 right-0 top-1/2 md:top-auto z-20
          `}>
            <div className="flex justify-between items-center md:hidden mb-4">
              <h3 className="font-semibold text-white">Document Metadata</h3>
              <button 
                onClick={() => setShowMetadata(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-white mb-2 flex items-center">
                  <FileText className="w-4 h-4 mr-2" />
                  Document Info
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Filename:</span>
                    <span className="text-gray-300">
                      {searchTerm ? renderHighlightedText(document.filename, searchTerm) : document.filename}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Size:</span>
                    <span className="text-gray-300">{formatFileSize(document.fileSize)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Source:</span>
                    <span className="text-gray-300">
                      <SourceBadge source={document.metadata.source || 'Seventh Production'} />
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Confidentiality:</span>
                    <span className="text-gray-300">{document.metadata.confidentiality}</span>
                  </div>
                </div>
              </div>

              {document.metadata?.categories?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-white mb-2 flex items-center">
                    <Tag className="w-4 h-4 mr-2" />
                    Categories
                  </h3>
                  <div className="flex flex-wrap gap-1">
                    {document.metadata.categories.map((cat, index) => (
                      <span key={index} className="px-2 py-1 bg-blue-900 text-blue-200 text-xs rounded">
                        {searchTerm ? renderHighlightedText(cat, searchTerm) : cat}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {document.entities?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-white mb-2 flex items-center">
                    <Users className="w-4 h-4 mr-2" />
                    Entities ({document.entities.length})
                  </h3>
                  <div className="space-y-2">
                    {document.entities.slice(0, 10).map((entity, index) => (
                      <div key={index} className="text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-300">
                            {searchTerm ? renderHighlightedText(entity.name, searchTerm) : entity.name}
                          </span>
                          <span className="text-xs text-gray-500">{entity.mentions}x</span>
                        </div>
                        <div className="text-xs text-gray-500 capitalize">{entity.type}</div>
                      </div>
                    ))}
                    {document.entities.length > 10 && (
                      <div className="text-xs text-gray-400">
                        +{document.entities.length - 10} more entities
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-sm font-semibold text-white mb-2">Red Flag Index</h3>
                  <div className="flex items-center space-x-2">
                    <span className="text-slate-400">Red Flag Index:</span>
                    <div className="flex space-x-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span
                          key={i}
                          className={i < document.spiceRating ? 'text-red-500' : 'text-slate-600'}
                        >
                          🚩
                        </span>
                      ))}
                    </div>
                  </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">Document Browser</h1>
          <p className="text-gray-400">Browse and search through the Epstein files collection</p>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search documents, entities, or content..."
                value={effectiveSearchTerm || ''}
                onChange={(e) => {
                  const newValue = e.target.value;
                  // Update both external handler and context
                  if (onSearchTermChange) {
                    onSearchTermChange(newValue);
                  } else {
                    setContextSearchTerm(newValue);
                  }
                }}
                className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700"
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
              {showFilters ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          </div>

          {showFilters && (
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* File Type Filter */}
                <div>
                  <label className="block text-sm font-medium mb-2">File Type</label>
                  <div className="space-y-1">
                    {fileTypeOptions.map(option => (
                      <label key={option.value} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={filters.fileType?.includes(option.value) || false}
                          onChange={() => handleFileTypeToggle(option.value)}
                          className="mr-2"
                        />
                        <span className="text-sm">{option.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Source Filter */}
                <div>
                  <label className="block text-sm font-medium mb-2">Source</label>
                  <select
                    multiple
                    value={filters.source || []}
                    onChange={(e) => handleFilterChange('source', Array.from(e.target.selectedOptions, option => option.value))}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm h-24"
                  >
                    {sourceOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Spice Level Filter */}
                <div>
                  <label className="block text-sm font-medium mb-2">Red Flag Index</label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-400">🚩</span>
                      <input
                        type="range"
                        min="1"
                        max="5"
                        value={filters.spiceLevel?.min || 1}
                        onChange={(e) => handleSpiceLevelChange(parseInt(e.target.value), filters.spiceLevel?.max || 5)}
                        className="flex-1"
                      />
                      <span className="text-xs text-gray-400">🚩🚩🚩🚩🚩</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-400">Min: {filters.spiceLevel?.min || 1}</span>
                      <span className="text-xs text-gray-400">Max: {filters.spiceLevel?.max || 5}</span>
                    </div>
                  </div>
                </div>

                {/* Sort Options */}
                <div>
                  <label className="block text-sm font-medium mb-2">Sort By</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm mb-2"
                  >
                    <option value="relevance">Relevance</option>
                    <option value="date">Date</option>
                    <option value="spice">Red Flag Index</option>
                    <option value="fileType">File Type</option>
                    <option value="size">File Size</option>
                  </select>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as any)}
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm"
                  >
                    <option value="desc">Descending</option>
                    <option value="asc">Ascending</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <div className="text-gray-400">
              Showing {filteredDocuments.length} of {documents.length} documents
            </div>
            {/* {displayLimit < documents.length && (
              <div className="text-sm text-blue-400">
                Display limit: {displayLimit}
              </div>
            )} */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
              >
                <FileText className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
              >
                <Search className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            {effectiveSearchTerm && `Searching for: "${effectiveSearchTerm}"`}
          </div>
        </div>

        {/* Document Grid/List */}
        {viewMode === 'grid' ? (
          // Regular grid view
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDocuments.map(document => (
              <DocumentCard key={document.id} document={document} />
            ))}
          </div>
        ) : (
            // Regular list view
            <div className="space-y-4">
              {filteredDocuments.map(document => (
                <div key={document.id} className="bg-gray-900 border border-gray-700 rounded-lg p-4 hover:border-gray-500 transition-colors cursor-pointer"
                     onClick={() => handleDocumentSelect(document)}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <FileText className="w-4 h-4 text-blue-400" />
                        <span className="text-xs text-gray-400 uppercase">{document.fileType}</span>
                        <span className="text-lg">{document.spicePeppers}</span>
                      </div>
                      <h3 className="font-semibold text-white mb-2">
                        {effectiveSearchTerm ? renderHighlightedText(document.title, effectiveSearchTerm) : document.title}
                      </h3>
                      <p className="text-sm text-gray-300 mb-3 line-clamp-2">
                        {effectiveSearchTerm ? renderHighlightedText(document.content.substring(0, 300) + '...', effectiveSearchTerm) : document.content.substring(0, 300) + '...'}
                      </p>
                      <div className="flex items-center space-x-4 text-xs text-gray-400">
                        <span>{formatFileSize(document.fileSize)}</span>
                        <span>{formatDate(document.dateCreated)}</span>
                        <span>{document.entities.length} entities</span>
                      </div>
                      {/* Source badge for list view */}
                      <div className="mt-2">
                        <SourceBadge source={document.metadata.source || 'Seventh Production'} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
        )}

        {filteredDocuments.length === 0 && (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-400 mb-2">No documents found</h3>
            <p className="text-gray-500">
              {effectiveSearchTerm 
                ? `No documents match your search for "${effectiveSearchTerm}"`
                : 'Try adjusting your filters or search query'
              }
            </p>
          </div>
        )}

        {/* Pagination Controls */}
        {documents.length > itemsPerPage && (
          <div className="flex items-center justify-center space-x-4 mt-8">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
            >
              Previous
            </button>
            
            <div className="text-sm text-gray-400">
              Page {currentPage} of {Math.ceil(documents.length / itemsPerPage)}
              <br />
              Showing {Math.min(itemsPerPage, documents.length - (currentPage - 1) * itemsPerPage)} of {documents.length} documents
            </div>
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(Math.ceil(documents.length / itemsPerPage), prev + 1))}
              disabled={currentPage === Math.ceil(documents.length / itemsPerPage)}
              className="px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
            >
              Next
            </button>
          </div>
        )}

        {/* Document Viewer Modal */}
        {selectedDocument && (
          <>
            {console.log('Rendering DocumentViewer with searchTerm:', effectiveSearchTerm)}
            <DocumentViewer document={selectedDocument} searchTerm={effectiveSearchTerm} />
          </>
        )}
      </div>
    </div>
  );
};