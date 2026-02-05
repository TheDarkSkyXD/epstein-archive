import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FixedSizeGrid as Grid,
  FixedSizeList as List,
  GridChildComponentProps,
  ListChildComponentProps,
  areEqual,
} from 'react-window';
import AutoSizer from '../common/AutoSizer';
import { Document, BrowseFilters, DocumentCollection } from '../../types/documents';
import { DocumentProcessor } from '../../services/documentProcessor';
import {
  Search,
  Filter,
  FileText,
  Users,
  Tag,
  ChevronDown,
  ChevronRight,
  Network,
  Download,
  Eye,
} from 'lucide-react';
import { useNavigation } from '../../services/ContentNavigationService.tsx';
import { apiClient } from '../../services/apiClient';
import { DocumentAnnotationSystem } from './DocumentAnnotationSystem';
import { Breadcrumb } from '../layout/Breadcrumb';
import { SourceBadge } from '../common/SourceBadge';
import DocumentSkeleton from './DocumentSkeleton';
import { AddToInvestigationButton } from '../common/AddToInvestigationButton';
// TODO: Apply OCR prettification - see UNUSED_VARIABLES_RECOMMENDATIONS.md
// import { prettifyOCRText } from '../../utils/prettifyOCR';
import { DocumentContentRenderer } from './DocumentContentRenderer';
import { useHighlightNavigation } from '../../hooks/useHighlightNavigation';
import { HighlightNavigationControls } from './HighlightNavigationControls';

// --- Virtualized Renderers for DocumentBrowser ---

interface DocItemData {
  documents: Document[];
  onDocumentSelect: (doc: Document) => void;
  formatFileSize: (bytes: number) => string;
  formatDate: (dateString?: string) => string;
  searchTerm?: string;
  columnCount?: number;
}

// Helper to highlight search terms
const highlightSearchTerm = (text: string, term?: string): React.ReactNode => {
  if (!term || !text || typeof text !== 'string') return text;
  try {
    const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const terms = term.split(/\s+/).filter((t) => t.length > 2);
    if (terms.length === 0) return text;
    const pattern = `(${terms.map(escapeRegExp).join('|')})`;
    const regex = new RegExp(pattern, 'gi');
    const highlighted = text.replace(
      regex,
      '<mark class="bg-yellow-500 text-black px-1 rounded">$1</mark>',
    );
    if (highlighted === text) return text;
    return <span dangerouslySetInnerHTML={{ __html: highlighted }} />;
  } catch {
    return text;
  }
};

// Memoized Grid Cell for document grid view
const DocumentGridCell = React.memo(
  ({ columnIndex, rowIndex, style, data }: GridChildComponentProps<DocItemData>) => {
    const {
      documents,
      onDocumentSelect,
      formatFileSize,
      formatDate,
      searchTerm,
      columnCount = 1,
    } = data;
    const index = rowIndex * columnCount + columnIndex;

    if (index >= documents.length) return null;

    const doc = documents[index];
    const displayTitle =
      doc.title && doc.title !== doc.filename
        ? doc.title
        : (doc.filename || '').replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
    const summary = (doc.content || '').substring(0, 200).trim();

    return (
      <div style={{ ...style, padding: '8px' }}>
        <div
          className="h-full bg-gray-900 border border-gray-700 rounded-lg p-4 hover:border-gray-500 transition-colors cursor-pointer flex flex-col"
          onClick={() => onDocumentSelect(doc)}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-gray-400 uppercase">{doc.fileType}</span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="text-xs text-gray-400">{formatFileSize(doc.fileSize)}</span>
              <span className="text-lg">{doc.redFlagPeppers}</span>
            </div>
          </div>

          <h3 className="font-semibold text-white mb-1 line-clamp-2 text-sm">
            {searchTerm ? highlightSearchTerm(displayTitle, searchTerm) : displayTitle}
          </h3>

          {summary && (
            <p className="text-xs text-gray-300 mb-2 line-clamp-2 flex-grow">
              {searchTerm ? highlightSearchTerm(summary + '...', searchTerm) : summary + '...'}
            </p>
          )}

          <div className="flex items-center justify-between text-xs text-gray-400 mt-auto">
            <span>{formatDate(doc.dateCreated)}</span>
            <span>{doc.entities?.length || 0} entities</span>
          </div>
        </div>
      </div>
    );
  },
  areEqual,
);

// Memoized List Row for document list view
const DocumentListRow = React.memo(
  ({ index, style, data }: ListChildComponentProps<DocItemData>) => {
    const { documents, onDocumentSelect, formatFileSize, formatDate, searchTerm } = data;
    const doc = documents[index];

    return (
      <div style={style}>
        <div
          className="mx-2 bg-gray-900 border border-gray-700 rounded-lg p-4 hover:border-gray-500 transition-colors cursor-pointer"
          onClick={() => onDocumentSelect(doc)}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-2">
                <FileText className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-gray-400 uppercase">{doc.fileType}</span>
                <span className="text-lg">{doc.redFlagPeppers}</span>
              </div>
              <h3 className="font-semibold text-white mb-2 truncate">
                {searchTerm ? highlightSearchTerm(doc.title || '', searchTerm) : doc.title}
              </h3>
              <p className="text-sm text-gray-300 mb-3 line-clamp-2">
                {searchTerm
                  ? highlightSearchTerm((doc.content || '').substring(0, 200) + '...', searchTerm)
                  : (doc.content || '').substring(0, 200) + '...'}
              </p>
              <div className="flex items-center space-x-4 text-xs text-gray-400">
                <span>{formatFileSize(doc.fileSize)}</span>
                <span>{formatDate(doc.dateCreated)}</span>
                <span>{doc.entities?.length || 0} entities</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  },
  areEqual,
);

interface DocumentBrowserProps {
  processor: DocumentProcessor;
  searchTerm?: string;
  onSearchTermChange?: (term: string) => void;
  selectedDocumentId?: string;
  onDocumentClose?: () => void;
}

export const DocumentBrowser: React.FC<DocumentBrowserProps> = ({
  processor,
  searchTerm: externalSearchTerm,
  onSearchTermChange,
  selectedDocumentId,
  onDocumentClose,
}) => {
  // Use navigation context for shared state
  const navigation = useNavigation();
  const { searchTerm: contextSearchTerm, setSearchTerm: setContextSearchTerm } = navigation;

  // Initialize search from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const searchParam = params.get('search');
    if (searchParam && searchParam !== contextSearchTerm) {
      if (onSearchTermChange) {
        onSearchTermChange(searchParam);
      } else {
        setContextSearchTerm(searchParam);
      }
    }
  }, [contextSearchTerm, onSearchTermChange, setContextSearchTerm]);

  // Use either external searchTerm or context searchTerm
  const effectiveSearchTerm =
    externalSearchTerm !== undefined ? externalSearchTerm : contextSearchTerm;

  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [relatedDocuments, setRelatedDocuments] = useState<Document[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'relevance' | 'date' | 'red_flag' | 'fileType' | 'size'>(
    'red_flag',
  );
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  // TODO: Implement document collections - see UNUSED_VARIABLES_RECOMMENDATIONS.md
  const [collection, _setCollection] = useState<DocumentCollection | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  // const [useVirtualScrolling, setUseVirtualScrolling] = useState(false);
  // const [displayLimit, setDisplayLimit] = useState(100); // Start with 100 documents
  const [currentPage, setCurrentPage] = useState(1);
  const [showMetadata, setShowMetadata] = useState(false);
  const [hideLowCredibility, setHideLowCredibility] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [totalDocuments, setTotalDocuments] = useState(0);

  const [filters, setFilters] = useState<BrowseFilters>({
    fileType: [],
    dateRange: {},
    entities: [],
    categories: [],
    redFlagLevel: { min: 0, max: 5 },
    confidentiality: [],
    source: [],
  });

  // Ref for highlight navigation
  const documentContainerRef = useRef<HTMLDivElement>(null);

  // Use highlight navigation hook
  const { currentHighlightIndex, totalHighlights, nextHighlight, prevHighlight, hasHighlights } =
    useHighlightNavigation(effectiveSearchTerm, documentContainerRef);

  // Function to highlight search terms in text
  const highlightText = (text: string, term?: string) => {
    if (!term || !text || typeof text !== 'string') return text;

    try {
      // Escape special regex characters
      const escapeRegExp = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      // Split term into words and filter out short words to avoid noise
      const terms = term.split(/\s+/).filter((t) => t.length > 2);

      if (terms.length === 0) {
        // If no valid terms after filtering, try the full term if it's short but not empty
        if (term.trim().length > 0) {
          const regex = new RegExp(`(${escapeRegExp(term)})`, 'gi');
          return text.replace(
            regex,
            '<mark class="bg-yellow-500 text-black px-1 rounded">$1</mark>',
          );
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
        day: 'numeric',
      }).format(date);
    } catch (_e) {
      return dateString;
    }
  };

  // Enable virtual scrolling for large datasets
  useEffect(() => {
    // setUseVirtualScrolling(filteredDocuments.length > 100);
  }, [filteredDocuments.length]);

  const [hasMore, setHasMore] = useState(true);
  const [isFetching, setIsFetching] = useState(false);

  // Fetch documents from API with pagination
  useEffect(() => {
    const fetchDocuments = async () => {
      // Prevent duplicate fetches or fetching when no more data
      if (isFetching || (currentPage > 1 && !hasMore)) return;

      try {
        setIsFetching(true);
        console.log(`DocumentBrowser: Fetching page ${currentPage}...`);

        // Build API query params
        const params = new URLSearchParams();
        params.append('page', currentPage.toString());
        params.append('limit', itemsPerPage.toString());

        if (effectiveSearchTerm && effectiveSearchTerm.trim()) {
          params.append('search', effectiveSearchTerm);
        }

        if (sortBy) {
          params.append('sortBy', sortBy);
        }

        // Add evidence type filter from categories
        if (filters.categories && filters.categories.length > 0) {
          params.append('evidenceType', filters.categories[0]);
        }

        const response = await fetch(`/api/documents?${params.toString()}`);
        const result = await response.json();

        // Map API response to Document type
        const newDocs: Document[] = (result.data || []).map((doc: any) => ({
          id: doc.id?.toString() || doc.fileName,
          title: doc.title || doc.fileName,
          filename: doc.fileName,
          fileType: doc.fileType || 'unknown',
          fileSize: doc.fileSize || 0,
          dateCreated: doc.dateCreated,
          dateModified: doc.dateModified,
          content: doc.content || doc.contentPreview || '',
          metadata: {
            source: 'Epstein Files',
            confidentiality: 'Public',
            categories: [],
            ...doc.metadata,
            emailHeaders: doc.metadata?.emailHeaders,
          },
          entities: [],
          passages: [],
          redFlagScore: doc.redFlagRating || 0,
          redFlagRating: doc.redFlagRating || 1,
          redFlagPeppers: '🚩'.repeat(doc.redFlagRating || 1),
          redFlagDescription: `Red Flag Index ${doc.redFlagRating || 1}`,
          evidenceType: doc.evidenceType || doc.evidence_type || 'document',
          parentDocumentId: doc.parentDocumentId || doc.parent_document_id,
          threadId: doc.threadId || doc.thread_id,
          threadPosition: doc.threadPosition || doc.thread_position,
        }));

        if (currentPage === 1) {
          setDocuments(newDocs);
        } else {
          setDocuments((prev) => [...prev, ...newDocs]);
        }

        // Update total count and hasMore
        if (result.total !== undefined) {
          setTotalDocuments(result.total);
          // If we received fewer items than requested, we've reached the end
          setHasMore(newDocs.length === itemsPerPage);
        }
      } catch (error) {
        console.error('DocumentBrowser: Error fetching documents:', error);
        if (currentPage === 1) {
          setDocuments([]);
          setFilteredDocuments([]);
        }
      } finally {
        setIsFetching(false);
      }
    };

    fetchDocuments();
  }, [
    currentPage,
    itemsPerPage,
    effectiveSearchTerm,
    sortBy,
    filters.categories,
    filters.source,
    filters.fileType,
    filters.redFlagLevel,
    hasMore,
    isFetching,
  ]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
    setHasMore(true);
    setDocuments([]);
    // We don't need to trigger fetch explicitly here because changing dependencies of the effect above will triggers it.
    // However, we need to ensure the effect recognizes it's a reset.
    // The effect depends on 'currentPage'. If we set it to 1, it runs.
  }, [
    itemsPerPage,
    effectiveSearchTerm,
    sortBy,
    filters.categories,
    filters.source,
    filters.fileType,
    filters.redFlagLevel,
  ]);

  // Apply client-side filters (credibility only - other filters handled by API)
  useEffect(() => {
    let results = documents;

    // Apply credibility filter
    if (hideLowCredibility) {
      results = results.filter((d) => (d.metadata?.credibility_score ?? 1) >= 0.6);
    }

    setFilteredDocuments(results);
  }, [documents, hideLowCredibility]);

  const handleDocumentSelect = useCallback(
    async (document: Document) => {
      // Set initial document data immediately
      setSelectedDocument(document);

      try {
        // Fetch full content from API
        const fullDoc = await apiClient.getDocument(document.id);
        if (fullDoc) {
          setSelectedDocument((prev) =>
            prev?.id === document.id ? { ...prev, ...fullDoc } : prev,
          );
        }
      } catch (error) {
        console.error('Error fetching full document content:', error);
      }

      const related = processor.findRelatedDocuments(document.id, 5);
      setRelatedDocuments(related);
    },
    [processor],
  );

  // Auto-select document when selectedDocumentId changes
  useEffect(() => {
    if (selectedDocumentId) {
      // If already selected, don't do anything
      if (selectedDocument?.id === selectedDocumentId) return;

      console.log('DocumentBrowser: selectedDocumentId changed to', selectedDocumentId);

      if (documents.length > 0) {
        const doc = documents.find((d) => d.id === selectedDocumentId);
        if (doc) {
          console.log('DocumentBrowser: Found document in current list, selecting');
          handleDocumentSelect(doc);
          return;
        }
      }

      // If we get here, document was not found in the list or list is empty
      console.log('DocumentBrowser: Document NOT found in current list, fetching...');

      apiClient
        .getDocument(selectedDocumentId)
        .then((docData) => {
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
                ...docData.metadata,
              },
              entities: [],
              passages: [],
              redFlagScore: docData.redFlagRating || 0,
              redFlagRating: docData.redFlagRating || 1,
              redFlagPeppers: '🚩'.repeat(docData.redFlagRating || 1),
              redFlagDescription: `Red Flag Index ${docData.redFlagRating || 1}`,
            };

            handleDocumentSelect(newDoc);
          }
        })
        .catch((err) => console.error('Error fetching selected document:', err));
    }
  }, [selectedDocumentId, documents, selectedDocument, handleDocumentSelect]);

  // eslint-disable-next-line react-hooks/exhaustive-deps -- collection is stable for this memo
  const fileTypeOptions = useMemo(() => {
    if (!collection) return [];
    return Array.from(collection.fileTypes.entries()).map(([type, count]) => ({
      value: type,
      label: `${type} (${count})`,
    }));
  }, [collection]);

  const sourceOptions = useMemo(() => {
    if (!collection) return [];
    const sources = [...new Set(documents.map((doc) => doc.metadata?.source || 'Unknown'))];
    return sources.map((source) => ({
      value: source,
      label: source,
    }));
  }, [collection, documents]);

  const handleFilterChange = (key: keyof BrowseFilters, value: any) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleFileTypeToggle = (fileType: string) => {
    const current = filters.fileType || [];
    const updated = current.includes(fileType)
      ? current.filter((t) => t !== fileType)
      : [...current, fileType];
    handleFilterChange('fileType', updated);
  };

  const handleRedFlagLevelChange = (min: number, max: number) => {
    handleFilterChange('redFlagLevel', { min, max });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

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

  const DocumentViewer: React.FC<{ document: Document; searchTerm?: string }> = ({
    document,
    searchTerm,
  }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const [snippetText, setSnippetText] = useState<string>('');
    const [addingSnippet, setAddingSnippet] = useState<boolean>(false);
    const [investigationChoice, setInvestigationChoice] = useState<number | null>(null);
    const [investigationsList, setInvestigationsList] = useState<any[]>([]);

    // Determine active tab from URL
    type DocumentTab =
      | 'content'
      | 'original'
      | 'entities'
      | 'related'
      | 'annotations'
      | 'redactions';

    const getActiveTab = (): DocumentTab => {
      const params = new URLSearchParams(location.search);
      const tab = params.get('docTab') as DocumentTab | null;
      if (
        tab &&
        ['content', 'original', 'entities', 'related', 'annotations', 'redactions'].includes(tab)
      ) {
        return tab;
      }
      return 'content'; // default
    };

    const activeTab = getActiveTab();

    // Navigate to a tab
    const navigateToTab = (tab: string) => {
      const params = new URLSearchParams(location.search);
      params.set('docTab', tab);
      navigate(`${location.pathname}?${params.toString()}`);
    };

    const [pages, setPages] = useState<string[]>([]);
    const [loadingPages, setLoadingPages] = useState(false);
    const [showRaw, setShowRaw] = useState(false);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [viewMode, setViewMode] = useState<'carousel' | 'list'>('carousel');
    const contentRef = React.useRef<HTMLDivElement>(null);

    // Failed redactions state
    const [redactionData, setRedactionData] = useState<{
      hasFailedRedactions: boolean;
      count: number;
      redactions: Array<{ page: number; text: string; bbox: number[] }>;
    } | null>(null);
    const [loadingRedactions, setLoadingRedactions] = useState(false);
    const [revealedRedactions, setRevealedRedactions] = useState<Set<number>>(new Set());

    // Reset pages when document changes
    useEffect(() => {
      setPages([]);
      setCurrentImageIndex(0);
    }, [document.id]);

    // Fetch pages when tab is switched to original or document changes
    useEffect(() => {
      if (activeTab === 'original') {
        const fetchPages = async () => {
          setLoadingPages(true);
          try {
            const result = await apiClient.getDocumentPages(document.id);
            setPages(result.pages);
            // Default to carousel if many pages, list if few
            setViewMode(result.pages.length > 5 ? 'carousel' : 'list');
          } catch (error) {
            console.error('Error fetching pages:', error);
          } finally {
            setLoadingPages(false);
          }
        };
        fetchPages();
      }
    }, [activeTab, document.id]);

    // Fetch redaction data when document changes or redactions tab is opened
    useEffect(() => {
      const fetchRedactions = async () => {
        setLoadingRedactions(true);
        try {
          const response = await fetch(`/api/documents/${document.id}/redactions`);
          if (response.ok) {
            const data = await response.json();
            setRedactionData(data);
            setRevealedRedactions(new Set()); // Reset revealed state
          }
        } catch (error) {
          console.error('Error fetching redaction data:', error);
        } finally {
          setLoadingRedactions(false);
        }
      };

      fetchRedactions();
    }, [document.id]);

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

    useEffect(() => {
      const handler = () => {
        if (!contentRef.current) return;
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed) {
          setSnippetText('');
          return;
        }
        const text = sel.toString();
        setSnippetText(text.length > 0 ? text : '');
      };
      window.document.addEventListener('mouseup', handler);
      return () => window.document.removeEventListener('mouseup', handler);
      // We intentionally only depend on setSnippetText, which is stable from React state
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [setSnippetText]);

    const addSnippet = async () => {
      if (!snippetText || !snippetText.trim()) return;
      try {
        setAddingSnippet(true);
        let invId = investigationChoice;
        if (!invId) {
          const resp = await fetch(
            `/api/investigations/by-title?title=${encodeURIComponent('Sascha Barros Testimony')}`,
          );
          if (resp.ok) {
            const inv = await resp.json();
            invId = inv.id;
          }
        }
        if (!invId) return;
        const res = await fetch('/api/investigation/add-snippet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            investigationId: invId,
            documentId: document.id,
            snippetText,
            notes: '',
            relevance: 'high',
          }),
        });
        if (res.ok) {
          setSnippetText('');
        }
      } finally {
        setAddingSnippet(false);
      }
    };

    const handleDownload = () => {
      // Construct download URL for the text file
      // We can use the file path from the document object if available, or construct it
      // For now, let's try to download the text content as a file
      const element = window.document.createElement('a');
      const file = new Blob([document.content], { type: 'text/plain' });
      element.href = URL.createObjectURL(file);
      element.download = `${document.filename || 'document'}.txt`;
      window.document.body.appendChild(element); // Required for this to work in FireFox
      element.click();
      window.document.body.removeChild(element);
    };

    return createPortal(
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[100] p-0 md:p-4">
        <div className="bg-gray-900 rounded-none md:rounded-lg w-full h-full md:w-auto md:h-auto md:max-w-6xl md:max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border-0 md:border border-gray-700">
          <div className="flex flex-col p-4 border-b border-gray-700 bg-gray-800">
            {/* Breadcrumb */}
            <div className="mb-2">
              <Breadcrumb
                items={[
                  {
                    label: 'Documents',
                    onClick: () => {
                      setSelectedDocument(null);
                      if (onDocumentClose) onDocumentClose();
                    },
                  },
                  { label: document.title || 'Unknown Document' },
                ]}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <FileText className="w-5 h-5 text-blue-400 shrink-0" />
                <h2 className="text-lg font-semibold text-white truncate">
                  {searchTerm ? renderHighlightedText(document.title, searchTerm) : document.title}
                </h2>
                <span className="text-lg shrink-0">{document.redFlagPeppers}</span>
              </div>
              <div className="flex items-center space-x-2 shrink-0">
                {/* Pretty/Raw Toggle */}
                <button
                  onClick={() => setShowRaw(!showRaw)}
                  className={`p-2 hover:text-white ${showRaw ? 'text-gray-500' : 'text-blue-400'}`}
                  title={showRaw ? 'Showing raw OCR text' : 'Showing cleaned text'}
                >
                  {showRaw ? <FileText className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
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
                <AddToInvestigationButton
                  item={{
                    id: document.id,
                    title: document.title || document.filename,
                    description: document.content?.substring(0, 100) || 'Document evidence',
                    type: 'document',
                    sourceId: document.id,
                  }}
                  investigations={[]} // This needs to be populated from context or props
                  onAddToInvestigation={(invId, item, relevance) => {
                    console.log('Add to investigation', invId, item, relevance);
                    const event = new CustomEvent('add-to-investigation', {
                      detail: { investigationId: invId, item, relevance },
                    });
                    window.dispatchEvent(event);
                  }}
                  variant="icon"
                  className="hover:bg-slate-700"
                />
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
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-gray-700 bg-gray-800 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => navigateToTab('content')}
              className={`px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'content'
                  ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-700'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              Text Content
            </button>
            <button
              onClick={() => navigateToTab('original')}
              className={`px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'original'
                  ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-700'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              View Original ({pages.length > 0 ? pages.length : '...'})
            </button>
            <button
              onClick={() => navigateToTab('entities')}
              className={`px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'entities'
                  ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-700'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              Entities ({document.entities?.length || 0})
            </button>
            <button
              onClick={() => navigateToTab('related')}
              className={`px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'related'
                  ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-700'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              Related ({relatedDocuments.length})
            </button>
            <button
              onClick={() => navigateToTab('annotations')}
              className={`px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === 'annotations'
                  ? 'text-blue-400 border-b-2 border-blue-400 bg-gray-700'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              Annotations
            </button>
            {/* Hidden Redactions Tab - only show prominently if redactions found */}
            <button
              onClick={() => navigateToTab('redactions')}
              className={`px-4 py-3 text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'redactions'
                  ? 'text-red-400 border-b-2 border-red-400 bg-red-900/30'
                  : redactionData?.hasFailedRedactions
                    ? 'text-red-400 hover:text-red-300 hover:bg-red-900/20 animate-pulse'
                    : 'text-gray-500 hover:text-gray-400 hover:bg-gray-700'
              }`}
            >
              {redactionData?.hasFailedRedactions && <span className="text-lg">🔓</span>}
              {loadingRedactions
                ? '...'
                : redactionData?.hasFailedRedactions
                  ? `Hidden Text (${redactionData.count})`
                  : 'Hidden Text'}
            </button>
          </div>

          <div className="flex-1 overflow-hidden flex">
            <div className="flex-1 overflow-y-auto p-6 bg-gray-900" ref={contentRef}>
              {activeTab === 'content' && (
                <DocumentContentRenderer
                  document={document}
                  searchTerm={searchTerm}
                  showRaw={showRaw}
                />
              )}
              {activeTab === 'content' && snippetText && (
                <div className="fixed bottom-6 right-6 z-40 bg-gray-800 border border-gray-700 rounded-lg p-3 shadow-xl">
                  <div className="text-xs text-gray-300 max-w-xs line-clamp-3 mb-2">
                    {snippetText}
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={investigationChoice ?? ''}
                      onChange={(e) => setInvestigationChoice(parseInt(e.target.value) || null)}
                      onFocus={async () => {
                        if (investigationsList.length > 0) return;
                        const r = await fetch('/api/investigations?page=1&limit=50');
                        if (r.ok) {
                          const data = await r.json();
                          const list = Array.isArray(data?.data)
                            ? data.data
                            : Array.isArray(data)
                              ? data
                              : [];
                          setInvestigationsList(list);
                        }
                      }}
                      className="text-xs bg-gray-700 text-white border border-gray-600 rounded px-2 py-1"
                    >
                      <option value="">Sascha Barros Testimony</option>
                      {investigationsList.map((inv: any) => (
                        <option key={inv.id} value={inv.id}>
                          {inv.title}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={addSnippet}
                      disabled={addingSnippet}
                      className="px-3 py-1.5 text-xs rounded bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50"
                    >
                      Add Snippet
                    </button>
                    <button
                      onClick={() => setSnippetText('')}
                      className="px-2 py-1.5 text-xs rounded bg-gray-700 text-gray-300"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'original' && (
                <div className="flex flex-col items-center space-y-4 min-h-full w-full">
                  {loadingPages ? (
                    <div className="flex items-center justify-center h-64">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
                    </div>
                  ) : pages.length > 0 ? (
                    <>
                      {/* View Mode Toggle */}
                      <div className="flex justify-end w-full max-w-4xl px-4 sticky top-0 z-10 py-2 bg-gray-900/95 backdrop-blur">
                        <div className="bg-gray-800 rounded-lg p-1 flex space-x-1">
                          <button
                            onClick={() => setViewMode('carousel')}
                            className={`px-3 py-1 text-xs rounded transition-colors ${viewMode === 'carousel' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                          >
                            Carousel
                          </button>
                          <button
                            onClick={() => setViewMode('list')}
                            className={`px-3 py-1 text-xs rounded transition-colors ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'}`}
                          >
                            List
                          </button>
                        </div>
                      </div>

                      {viewMode === 'carousel' ? (
                        <div className="flex flex-col items-center w-full">
                          <div className="relative w-full max-w-4xl aspect-[3/4] md:aspect-auto md:h-[75vh] bg-black rounded-lg flex items-center justify-center overflow-hidden border border-gray-700">
                            <img
                              src={
                                pages[currentImageIndex].startsWith('/')
                                  ? pages[currentImageIndex]
                                  : `/${pages[currentImageIndex]}`
                              }
                              alt={`Page ${currentImageIndex + 1}`}
                              className="max-w-full max-h-full object-contain"
                            />

                            {/* Controls */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setCurrentImageIndex((prev) => Math.max(0, prev - 1));
                              }}
                              disabled={currentImageIndex === 0}
                              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 text-white rounded-full hover:bg-black/80 disabled:opacity-30 transition-all backdrop-blur-sm"
                            >
                              <ChevronDown className="w-6 h-6 rotate-90" />
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setCurrentImageIndex((prev) =>
                                  Math.min(pages.length - 1, prev + 1),
                                );
                              }}
                              disabled={currentImageIndex === pages.length - 1}
                              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-black/50 text-white rounded-full hover:bg-black/80 disabled:opacity-30 transition-all backdrop-blur-sm"
                            >
                              <ChevronDown className="w-6 h-6 -rotate-90" />
                            </button>

                            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 px-4 py-1.5 rounded-full text-sm text-white backdrop-blur-sm">
                              Page {currentImageIndex + 1} of {pages.length}
                            </div>
                          </div>

                          {/* Thumbnail Strip */}
                          <div className="mt-4 w-full max-w-4xl overflow-x-auto flex space-x-2 p-2 scrollbar-hide">
                            {pages.map((page, idx) => (
                              <button
                                key={idx}
                                onClick={() => setCurrentImageIndex(idx)}
                                className={`flex-shrink-0 w-16 h-20 rounded overflow-hidden border-2 transition-all ${idx === currentImageIndex ? 'border-blue-500 opacity-100 ring-2 ring-blue-500/30' : 'border-transparent opacity-40 hover:opacity-80'}`}
                              >
                                <img
                                  src={page.startsWith('/') ? page : `/${page}`}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        // List View
                        pages.map((pageUrl, index) => (
                          <div
                            key={index}
                            className="w-full max-w-3xl bg-white p-1 rounded shadow-lg"
                          >
                            <img
                              src={pageUrl.startsWith('/') ? pageUrl : `/${pageUrl}`}
                              alt={`Page ${index + 1}`}
                              className="w-full h-auto"
                              loading="lazy"
                            />
                            <div className="text-center text-gray-500 text-xs py-1">
                              Page {index + 1}
                            </div>
                          </div>
                        ))
                      )}
                    </>
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
                  <h3 className="text-lg font-semibold text-white mb-4">
                    Entities Found in Document
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {(document.entities || []).map((entity, index) => (
                      <div
                        key={index}
                        className="bg-gray-800 rounded-lg p-4 border border-gray-700"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-white">
                            {searchTerm
                              ? renderHighlightedText(entity.name, searchTerm)
                              : entity.name}
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
                              {searchTerm
                                ? renderHighlightedText(
                                    `"${entity.contexts[0].context}"`,
                                    searchTerm,
                                  )
                                : `"${entity.contexts[0].context}"`}
                            </div>
                            {/* Source badge for entity context */}
                            <div className="mt-2">
                              <SourceBadge
                                source={entity.contexts[0]?.source || 'Seventh Production'}
                              />
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
                              {searchTerm
                                ? renderHighlightedText(relatedDoc.title, searchTerm)
                                : relatedDoc.title}
                              {relatedDoc.title !== relatedDoc.filename && (
                                <span className="text-xs text-gray-400 ml-2 font-normal">
                                  ({relatedDoc.filename})
                                </span>
                              )}
                            </h4>
                            <span className="text-lg">{relatedDoc.redFlagPeppers}</span>
                          </div>
                          <div className="text-sm text-gray-300 mb-2 line-clamp-2">
                            {searchTerm
                              ? renderHighlightedText(
                                  relatedDoc.content.substring(0, 150) + '...',
                                  searchTerm,
                                )
                              : relatedDoc.content.substring(0, 150) + '...'}
                          </div>
                          <div className="flex items-center justify-between text-xs text-gray-400">
                            <span>{relatedDoc.fileType}</span>
                            <span>{formatFileSize(relatedDoc.fileSize)}</span>
                          </div>
                          {/* Source badge for related document */}
                          <div className="mt-2">
                            <SourceBadge
                              source={relatedDoc.metadata?.source || 'Seventh Production'}
                            />
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

              {activeTab === 'redactions' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-2xl font-bold text-red-400 flex items-center gap-3">
                      <span className="text-3xl">🔓</span>
                      Failed Redactions Detected
                    </h3>
                    <div className="text-sm text-gray-400">
                      Text hidden under black boxes but still extractable
                    </div>
                  </div>

                  {loadingRedactions ? (
                    <div className="flex items-center justify-center h-64">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-400"></div>
                    </div>
                  ) : redactionData?.hasFailedRedactions && redactionData.redactions.length > 0 ? (
                    <div className="space-y-4">
                      {/* Warning banner */}
                      <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-4 text-red-200">
                        <div className="flex items-start gap-3">
                          <span className="text-2xl">⚠️</span>
                          <div>
                            <h4 className="font-semibold">Improperly Redacted Document</h4>
                            <p className="text-sm text-red-300/80 mt-1">
                              This document appears to have {redactionData.count} redaction(s) that
                              were improperly applied. The text was covered with black boxes but not
                              actually removed from the PDF.
                              <strong className="text-red-200">
                                {' '}
                                Click each card below to reveal the hidden text.
                              </strong>
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Reveal all button */}
                      <div className="flex justify-end">
                        <button
                          onClick={() => {
                            const allIndices = new Set(redactionData.redactions.map((_, i) => i));
                            setRevealedRedactions(allIndices);
                          }}
                          className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                        >
                          <span>👁️</span> Reveal All Hidden Text
                        </button>
                      </div>

                      {/* Redaction cards */}
                      <div className="grid gap-4">
                        {redactionData.redactions.map((redaction, index) => (
                          <div
                            key={index}
                            onClick={() => {
                              const newRevealed = new Set(revealedRedactions);
                              newRevealed.add(index);
                              setRevealedRedactions(newRevealed);
                            }}
                            className={`relative overflow-hidden rounded-lg border transition-all duration-500 cursor-pointer ${
                              revealedRedactions.has(index)
                                ? 'bg-gray-800 border-red-600'
                                : 'bg-black border-gray-700 hover:border-red-500'
                            }`}
                          >
                            {/* Page indicator */}
                            <div className="absolute top-2 right-2 px-2 py-1 bg-gray-700 rounded text-xs text-gray-300">
                              Page {redaction.page}
                            </div>

                            {!revealedRedactions.has(index) ? (
                              /* Hidden state - scratch card effect */
                              <div className="p-6 min-h-[120px] flex flex-col items-center justify-center text-center">
                                <div className="relative">
                                  <div
                                    className="absolute inset-0 bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 animate-pulse rounded"
                                    style={{ filter: 'blur(8px)' }}
                                  />
                                  <div className="relative z-10 text-6xl mb-3 opacity-80">🔒</div>
                                </div>
                                <p className="text-gray-400 text-sm mb-2">
                                  Hidden text detected under redaction
                                </p>
                                <p className="text-red-400 text-xs font-medium animate-pulse">
                                  Click to reveal what they tried to hide
                                </p>
                              </div>
                            ) : (
                              /* Revealed state */
                              <div className="p-6">
                                <div className="flex items-start gap-3">
                                  <span className="text-2xl">📝</span>
                                  <div className="flex-1">
                                    <div className="text-xs text-red-400 uppercase tracking-wide mb-2 font-semibold">
                                      Hidden Text Revealed
                                    </div>
                                    <blockquote className="text-white text-lg font-mono bg-red-900/20 p-4 rounded border-l-4 border-red-500 leading-relaxed">
                                      "{redaction.text}"
                                    </blockquote>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                      <div className="text-6xl mb-4 opacity-50">✓</div>
                      <h4 className="text-xl font-medium text-gray-300 mb-2">
                        No Failed Redactions Found
                      </h4>
                      <p className="text-center max-w-md">
                        This document doesn't appear to have any improperly redacted text.
                        Redactions were either applied correctly or this document wasn't redacted.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Metadata Sidebar - Collapsible on Mobile */}
            <div
              className={`
            ${showMetadata ? 'block' : 'hidden'} 
            md:block 
            w-full md:w-80 
            border-t md:border-t-0 md:border-l border-gray-700 
            p-4 
            overflow-y-auto 
            bg-gray-800 md:bg-transparent
            absolute md:static bottom-0 left-0 right-0 top-1/2 md:top-auto z-20
          `}
            >
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
                        {searchTerm
                          ? renderHighlightedText(document.filename, searchTerm)
                          : document.filename}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Size:</span>
                      <span className="text-gray-300">{formatFileSize(document.fileSize)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Source:</span>
                      <span className="text-gray-300">
                        <SourceBadge
                          source={
                            document.metadata.source_collection ||
                            document.metadata.source ||
                            'Unknown'
                          }
                        />
                      </span>
                    </div>
                    {document.metadata?.source_original_url && (
                      <div className="flex justify-between">
                        <span className="text-gray-400">Source URL:</span>
                        <a
                          href={document.metadata.source_original_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-400 hover:text-blue-300 truncate max-w-[12rem]"
                        >
                          {document.metadata.source_original_url}
                        </a>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-400">Confidentiality:</span>
                      <span className="text-gray-300">{document.metadata.confidentiality}</span>
                    </div>
                  </div>
                  <div className="mt-3">
                    <h4 className="text-sm font-semibold text-white mb-1">Credibility</h4>
                    <div className="text-sm text-gray-300">
                      {typeof document.metadata?.credibility_score === 'number'
                        ? `${Math.round((document.metadata.credibility_score as number) * 100) / 100}`
                        : 'Unknown'}
                    </div>
                  </div>
                  {Array.isArray(document.metadata?.sensitivity_flags) &&
                    (document.metadata!.sensitivity_flags as any[]).length > 0 && (
                      <div className="mt-3">
                        <h4 className="text-sm font-semibold text-white mb-1">Sensitivity</h4>
                        <div className="flex flex-wrap gap-1">
                          {(document.metadata!.sensitivity_flags as any[]).map(
                            (flag: string, idx: number) => (
                              <span
                                key={idx}
                                className="px-2 py-1 bg-yellow-900 text-yellow-200 text-xs rounded"
                              >
                                {flag}
                              </span>
                            ),
                          )}
                        </div>
                      </div>
                    )}
                </div>

                {document.metadata?.categories?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-white mb-2 flex items-center">
                      <Tag className="w-4 h-4 mr-2" />
                      Categories
                    </h3>
                    <div className="flex flex-wrap gap-1">
                      {document.metadata.categories.map((cat, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-blue-900 text-blue-200 text-xs rounded"
                        >
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
                      Entities ({document.entities?.length})
                    </h3>
                    <div className="space-y-2">
                      {document.entities?.slice(0, 10).map((entity, index) => (
                        <div key={index} className="text-sm">
                          <div className="flex justify-between items-center">
                            <span className="text-gray-300">
                              {searchTerm
                                ? renderHighlightedText(entity.name, searchTerm)
                                : entity.name}
                            </span>
                            <span className="text-xs text-gray-500">{entity.mentions}x</span>
                          </div>
                          <div className="text-xs text-gray-500 capitalize">{entity.type}</div>
                        </div>
                      ))}
                      {(document.entities?.length || 0) > 10 && (
                        <div className="text-xs text-gray-400">
                          +{(document.entities?.length || 0) - 10} more entities
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
                          className={i < document.redFlagRating ? 'text-red-500' : 'text-slate-600'}
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
      </div>,
      window.document.body,
    );
  };

  return (
    <div className="min-h-screen text-white overflow-x-hidden">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">Document Browser</h1>
          <p className="text-gray-400">Browse and search through the Epstein files collection</p>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          {/* Search bar and filter button - stack on mobile */}
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
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
                className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 min-h-[44px]"
              />
            </div>
            {hasHighlights && (
              <HighlightNavigationControls
                currentHighlightIndex={currentHighlightIndex}
                totalHighlights={totalHighlights}
                onNext={nextHighlight}
                onPrev={prevHighlight}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 shrink-0"
              />
            )}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 min-h-[44px] shrink-0"
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
              {showFilters ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Category Type Filter Buttons - Horizontal scroll on mobile */}
          <div className="flex flex-wrap gap-2 items-center">
            {[
              { type: 'all', label: 'All Documents', icon: '📁' },
              { type: 'legal', label: 'Legal', icon: '⚖️' },
              { type: 'email', label: 'Email', icon: '📧' },
              { type: 'deposition', label: 'Deposition', icon: '📜' },
              { type: 'article', label: 'Article', icon: '📰' },
              { type: 'photo', label: 'Photo', icon: '📷' },
              { type: 'financial', label: 'Financial', icon: '💰' },
              { type: 'document', label: 'Document', icon: '📄' },
            ].map(({ type, label, icon }) => (
              <button
                key={type}
                onClick={() => {
                  if (type === 'all') {
                    handleFilterChange('categories', []);
                  } else {
                    handleFilterChange('categories', [type]);
                  }
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all shadow-sm backdrop-blur-sm shrink-0 ${
                  (type === 'all' && (!filters.categories || filters.categories.length === 0)) ||
                  filters.categories?.includes(type)
                    ? 'bg-blue-600 text-white border border-blue-500 shadow-blue-500/20'
                    : 'bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <span>{icon}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* Significance and Sort Chips */}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {/* High Significance Filter */}
            <button
              onClick={() => {
                const isActive = filters.redFlagLevel?.min === 4 && filters.redFlagLevel?.max === 5;
                handleRedFlagLevelChange(isActive ? 0 : 4, 5);
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all shadow-sm backdrop-blur-sm shrink-0 ${
                filters.redFlagLevel?.min === 4
                  ? 'bg-red-900/80 text-white border border-red-500 shadow-red-500/20'
                  : 'bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full ${filters.redFlagLevel?.min === 4 ? 'bg-red-400' : 'bg-red-600'}`}
              ></div>
              <span>High Significance</span>
            </button>

            {/* Medium Significance Filter */}
            <button
              onClick={() => {
                const isActive = filters.redFlagLevel?.min === 2 && filters.redFlagLevel?.max === 3;
                // If active, reset to default (0-5). If not, set to Medium (2-3)
                handleRedFlagLevelChange(isActive ? 0 : 2, isActive ? 5 : 3);
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all shadow-sm backdrop-blur-sm shrink-0 ${
                filters.redFlagLevel?.min === 2 && filters.redFlagLevel?.max === 3
                  ? 'bg-amber-900/80 text-white border border-amber-500 shadow-amber-500/20'
                  : 'bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700 hover:text-white'
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full ${filters.redFlagLevel?.min === 2 && filters.redFlagLevel?.max === 3 ? 'bg-amber-400' : 'bg-amber-600'}`}
              ></div>
              <span>Medium</span>
            </button>

            {/* Sort Chip - Pushed to Right */}
            <div className="ml-auto">
              <button
                onClick={() => {
                  // Cycle sort: Date Desc -> Date Asc -> Red Flag Desc
                  if (sortBy === 'date' && sortOrder === 'desc') {
                    setSortBy('date');
                    setSortOrder('asc');
                  } else if (sortBy === 'date' && sortOrder === 'asc') {
                    setSortBy('red_flag');
                    setSortOrder('desc');
                  } else {
                    setSortBy('date');
                    setSortOrder('desc');
                  }
                }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium bg-slate-800 border border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors shadow-sm"
              >
                {sortOrder === 'desc' ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3 -rotate-90" />
                )}
                <span>
                  {sortBy === 'date' && sortOrder === 'desc'
                    ? 'Newest First'
                    : sortBy === 'date' && sortOrder === 'asc'
                      ? 'Oldest First'
                      : sortBy === 'red_flag'
                        ? 'Highest Risk'
                        : 'Sort'}
                </span>
              </button>
            </div>
          </div>

          {/* Desktop inline filters (hidden on mobile) */}
          {showFilters && (
            <div className="hidden md:block bg-gray-900 border border-gray-700 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* File Type Filter */}
                <div>
                  <label className="block text-sm font-medium mb-2">File Type</label>
                  <div className="space-y-1">
                    {fileTypeOptions.map((option) => (
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
                    onChange={(e) =>
                      handleFilterChange(
                        'source',
                        Array.from(e.target.selectedOptions, (option) => option.value),
                      )
                    }
                    className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm h-24"
                  >
                    {sourceOptions.map((option) => (
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
                        value={filters.redFlagLevel?.min || 0}
                        onChange={(e) =>
                          handleRedFlagLevelChange(
                            parseInt(e.target.value),
                            filters.redFlagLevel?.max || 5,
                          )
                        }
                        className="flex-1"
                      />
                      <span className="text-xs text-gray-400">🚩🚩🚩🚩🚩</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-400">
                        Min: {filters.redFlagLevel?.min || 0}
                      </span>
                      <span className="text-xs text-gray-400">
                        Max: {filters.redFlagLevel?.max || 5}
                      </span>
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
                    <option value="red_flag">Red Flag Index</option>
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
                {/* Credibility Filter */}
                <div>
                  <label className="block text-sm font-medium mb-2">Reliability</label>
                  <label
                    className="flex items-center text-sm"
                    title="Hide documents flagged as low credibility based on source and provenance"
                  >
                    <input
                      type="checkbox"
                      checked={hideLowCredibility}
                      onChange={(e) => setHideLowCredibility(e.target.checked)}
                      className="mr-2"
                    />
                    Hide low credibility material
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Mobile Filter Bottom Sheet */}
          <AnimatePresence>
            {showFilters && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/60 z-40 md:hidden"
                  onClick={() => setShowFilters(false)}
                />
                <motion.div
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  className="fixed bottom-0 left-0 right-0 bg-slate-900 rounded-t-3xl z-50 md:hidden max-h-[80vh] overflow-hidden"
                >
                  <div className="flex justify-center py-3">
                    <div className="w-10 h-1 bg-slate-700 rounded-full" />
                  </div>
                  <div className="px-4 pb-2 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-white">Filters</h2>
                    <button
                      onClick={() => setShowFilters(false)}
                      className="p-2 text-slate-400 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="overflow-y-auto pb-8 px-4 space-y-6 max-h-[calc(80vh-80px)]">
                    {/* Sort Options */}
                    <div>
                      <label className="block text-sm font-medium mb-2 text-slate-300">
                        Sort By
                      </label>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-3 text-sm text-white"
                      >
                        <option value="relevance">Relevance</option>
                        <option value="date">Date</option>
                        <option value="red_flag">Red Flag Index</option>
                        <option value="fileType">File Type</option>
                        <option value="size">File Size</option>
                      </select>
                    </div>

                    {/* Sort Order */}
                    <div>
                      <label className="block text-sm font-medium mb-2 text-slate-300">Order</label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSortOrder('desc')}
                          className={`flex-1 py-3 rounded-lg text-sm font-medium transition-colors ${
                            sortOrder === 'desc'
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-800 text-slate-300 border border-slate-700'
                          }`}
                        >
                          Descending
                        </button>
                        <button
                          onClick={() => setSortOrder('asc')}
                          className={`flex-1 py-3 rounded-lg text-sm font-medium transition-colors ${
                            sortOrder === 'asc'
                              ? 'bg-blue-600 text-white'
                              : 'bg-slate-800 text-slate-300 border border-slate-700'
                          }`}
                        >
                          Ascending
                        </button>
                      </div>
                    </div>

                    {/* Red Flag Index */}
                    <div>
                      <label className="block text-sm font-medium mb-2 text-slate-300">
                        Red Flag Index
                      </label>
                      <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-2xl">🚩</span>
                          <span className="text-slate-300 text-sm">
                            {filters.redFlagLevel?.min || 0} - {filters.redFlagLevel?.max || 5}
                          </span>
                          <span className="text-2xl">🚩🚩🚩🚩🚩</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="5"
                          value={filters.redFlagLevel?.min || 0}
                          onChange={(e) =>
                            handleRedFlagLevelChange(
                              parseInt(e.target.value),
                              filters.redFlagLevel?.max || 5,
                            )
                          }
                          className="w-full"
                        />
                      </div>
                    </div>

                    {/* Credibility Filter */}
                    <div>
                      <label className="flex items-center gap-3 p-4 bg-slate-800 rounded-lg border border-slate-700">
                        <input
                          type="checkbox"
                          checked={hideLowCredibility}
                          onChange={(e) => setHideLowCredibility(e.target.checked)}
                          className="w-5 h-5 rounded"
                        />
                        <span className="text-sm text-slate-300">
                          Hide low credibility material
                        </span>
                      </label>
                    </div>

                    {/* Apply Button */}
                    <button
                      onClick={() => setShowFilters(false)}
                      className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors"
                    >
                      Apply Filters
                    </button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        {/* Results Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center space-x-4 flex-wrap gap-2">
            <div className="text-gray-400">
              Showing {filteredDocuments.length} of {totalDocuments.toLocaleString()} documents
            </div>
            {/* Page Size Selector */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-500">Per page:</label>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1); // Reset to first page
                }}
                className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
            </div>
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

        {/* Document Grid/List - Virtualized */}
        {documents.length === 0 && filteredDocuments.length === 0 ? (
          <DocumentSkeleton count={12} />
        ) : filteredDocuments.length > 0 && viewMode === 'grid' ? (
          // Virtualized grid view
          <div
            ref={documentContainerRef}
            style={{ height: 'calc(100vh - 400px)', minHeight: '500px' }}
          >
            <AutoSizer>
              {({ height, width }) => {
                const columnCount = width >= 1024 ? 3 : width >= 768 ? 2 : 1;
                const columnWidth = Math.floor(width / columnCount);
                const rowHeight = 280;
                const rowCount = Math.ceil(filteredDocuments.length / columnCount);

                const itemData: DocItemData = {
                  documents: filteredDocuments,
                  onDocumentSelect: handleDocumentSelect,
                  formatFileSize,
                  formatDate,
                  searchTerm: effectiveSearchTerm,
                  columnCount,
                };

                return (
                  <Grid
                    columnCount={columnCount}
                    columnWidth={columnWidth}
                    height={height}
                    rowCount={rowCount}
                    rowHeight={rowHeight}
                    width={width}
                    itemData={itemData}
                    onItemsRendered={({ visibleRowStopIndex }) => {
                      if (!isFetching && hasMore && visibleRowStopIndex >= rowCount - 3) {
                        setCurrentPage((prev) => prev + 1);
                      }
                    }}
                  >
                    {DocumentGridCell}
                  </Grid>
                );
              }}
            </AutoSizer>
          </div>
        ) : filteredDocuments.length > 0 ? (
          // Virtualized list view
          <div
            ref={documentContainerRef}
            style={{ height: 'calc(100vh - 400px)', minHeight: '500px' }}
          >
            <AutoSizer>
              {({ height, width }) => {
                const itemData: DocItemData = {
                  documents: filteredDocuments,
                  onDocumentSelect: handleDocumentSelect,
                  formatFileSize,
                  formatDate,
                  searchTerm: effectiveSearchTerm,
                };

                return (
                  <List
                    height={height}
                    itemCount={filteredDocuments.length}
                    itemSize={160} // Height of list item
                    width={width}
                    itemData={itemData}
                    onItemsRendered={({ visibleStopIndex }) => {
                      if (
                        !isFetching &&
                        hasMore &&
                        visibleStopIndex >= filteredDocuments.length - 5
                      ) {
                        setCurrentPage((prev) => prev + 1);
                      }
                    }}
                  >
                    {DocumentListRow}
                  </List>
                );
              }}
            </AutoSizer>
          </div>
        ) : null}

        {filteredDocuments.length === 0 && (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-400 mb-2">No documents found</h3>
            <p className="text-gray-500">
              {effectiveSearchTerm
                ? `No documents match your search for "${effectiveSearchTerm}"`
                : 'Try adjusting your filters or search query'}
            </p>
          </div>
        )}

        {/* Pagination Controls */}
        {filteredDocuments.length > 0 && (
          <div className="flex items-center justify-center space-x-4 mt-8">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
            >
              Previous
            </button>

            <div className="text-sm text-gray-400 text-center">
              <div>
                Page {currentPage} of {Math.ceil(totalDocuments / itemsPerPage) || 1}
              </div>
              <div className="text-xs mt-1">
                Showing {(currentPage - 1) * itemsPerPage + 1}-
                {Math.min(currentPage * itemsPerPage, totalDocuments)} of{' '}
                {totalDocuments.toLocaleString()} documents
              </div>
            </div>

            <button
              onClick={() => setCurrentPage((prev) => prev + 1)}
              disabled={currentPage >= Math.ceil(totalDocuments / itemsPerPage)}
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
