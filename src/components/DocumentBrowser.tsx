import React, { useState, useEffect, useMemo } from 'react';
import { Document, BrowseFilters, DocumentCollection } from '../types/documents';
import { DocumentProcessor } from '../services/documentProcessor';
import { Search, Filter, Calendar, FileText, Users, Tag, ChevronDown, ChevronRight, Network, Download } from 'lucide-react';

interface DocumentBrowserProps {
  processor: DocumentProcessor;
}

export const DocumentBrowser: React.FC<DocumentBrowserProps> = ({ processor }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [relatedDocuments, setRelatedDocuments] = useState<Document[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'relevance' | 'date' | 'spice' | 'fileType' | 'size'>('relevance');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [collection, setCollection] = useState<DocumentCollection | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  const [filters, setFilters] = useState<BrowseFilters>({
    fileType: [],
    dateRange: {},
    entities: [],
    categories: [],
    spiceLevel: { min: 1, max: 5 },
    confidentiality: [],
    source: []
  });

  useEffect(() => {
    const docCollection = processor.getDocumentCollection();
    setCollection(docCollection);
    setDocuments(docCollection.documents);
    setFilteredDocuments(docCollection.documents);
  }, [processor]);

  useEffect(() => {
    let results = documents;

    // Apply search
    if (searchQuery.trim()) {
      results = processor.searchDocuments(searchQuery, filters);
    } else {
      results = processor.browseDocuments(filters, sortBy, sortOrder);
    }

    setFilteredDocuments(results);
  }, [documents, searchQuery, filters, sortBy, sortOrder, processor]);

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

  const handleDocumentSelect = (document: Document) => {
    setSelectedDocument(document);
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

  const formatDate = (dateString?: string): string => {
    if (!dateString) return 'Unknown';
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
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
      
      <h3 className="font-semibold text-white mb-2 line-clamp-2">{document.title}</h3>
      <p className="text-sm text-gray-300 mb-3 line-clamp-3">
        {document.content.substring(0, 200)}...
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
      
      {document.entities.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {document.entities.slice(0, 3).map((entity, index) => (
            <span key={index} className="px-2 py-1 bg-gray-800 text-xs text-gray-300 rounded">
              {entity.name}
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

  const DocumentViewer: React.FC<{ document: Document }> = ({ document }) => {
    const [activeTab, setActiveTab] = useState<'content' | 'entities' | 'related'>('content');

    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg max-w-4xl max-h-full overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <FileText className="w-5 h-5 text-blue-400" />
            <h2 className="text-lg font-semibold text-white">{document.title}</h2>
            <span className="text-lg">{document.spicePeppers}</span>
          </div>
          <div className="flex items-center space-x-2">
            <button className="p-2 text-gray-400 hover:text-white">
              <Download className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setSelectedDocument(null)}
              className="p-2 text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => setActiveTab('content')}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === 'content' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'
            }`}
          >
            Content
          </button>
          <button
            onClick={() => setActiveTab('entities')}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === 'entities' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'
            }`}
          >
            Entities ({document.entities.length})
          </button>
          <button
            onClick={() => setActiveTab('related')}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === 'related' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'
            }`}
          >
            Related Documents ({relatedDocuments.length})
          </button>
        </div>
        
        <div className="flex-1 overflow-hidden flex">
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'content' && (
              <div className="prose prose-invert max-w-none">
                <pre className="whitespace-pre-wrap text-sm text-gray-300 font-mono leading-relaxed">
                  {document.content}
                </pre>
              </div>
            )}
            
            {activeTab === 'entities' && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white mb-4">Entities Found in Document</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {document.entities.map((entity, index) => (
                    <div key={index} className="bg-gray-800 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-white">{entity.name}</h4>
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
                            "{entity.contexts[0].context}"
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
                        className="bg-gray-800 rounded-lg p-4 cursor-pointer hover:bg-gray-700 transition-colors"
                        onClick={() => handleDocumentSelect(relatedDoc)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-white line-clamp-1">{relatedDoc.title}</h4>
                          <span className="text-lg">{relatedDoc.spicePeppers}</span>
                        </div>
                        <div className="text-sm text-gray-300 mb-2 line-clamp-2">
                          {relatedDoc.content.substring(0, 150)}...
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-400">
                          <span>{relatedDoc.fileType}</span>
                          <span>{formatFileSize(relatedDoc.fileSize)}</span>
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
          </div>
          
          <div className="w-80 border-l border-gray-700 p-4 overflow-y-auto">
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-white mb-2 flex items-center">
                  <FileText className="w-4 h-4 mr-2" />
                  Document Info
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Filename:</span>
                    <span className="text-gray-300">{document.filename}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Size:</span>
                    <span className="text-gray-300">{formatFileSize(document.fileSize)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Source:</span>
                    <span className="text-gray-300">{document.metadata.source}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Confidentiality:</span>
                    <span className="text-gray-300">{document.metadata.confidentiality}</span>
                  </div>
                </div>
              </div>

              {document.metadata.categories.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-white mb-2 flex items-center">
                    <Tag className="w-4 h-4 mr-2" />
                    Categories
                  </h3>
                  <div className="flex flex-wrap gap-1">
                    {document.metadata.categories.map((cat, index) => (
                      <span key={index} className="px-2 py-1 bg-blue-900 text-blue-200 text-xs rounded">
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {document.entities.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-white mb-2 flex items-center">
                    <Users className="w-4 h-4 mr-2" />
                    Entities ({document.entities.length})
                  </h3>
                  <div className="space-y-2">
                    {document.entities.slice(0, 10).map((entity, index) => (
                      <div key={index} className="text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-300">{entity.name}</span>
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
                <h3 className="text-sm font-semibold text-white mb-2">Spice Rating</h3>
                <div className="flex items-center space-x-2">
                  <span className="text-2xl">{document.spicePeppers}</span>
                  <div>
                    <div className="text-sm text-gray-300">Level {document.spiceRating}/5</div>
                    <div className="text-xs text-gray-500">{document.spiceDescription}</div>
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
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
                  <label className="block text-sm font-medium mb-2">Spice Level</label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-400">🌶️</span>
                      <input
                        type="range"
                        min="1"
                        max="5"
                        value={filters.spiceLevel?.min || 1}
                        onChange={(e) => handleSpiceLevelChange(parseInt(e.target.value), filters.spiceLevel?.max || 5)}
                        className="flex-1"
                      />
                      <span className="text-xs text-gray-400">🌶️🌶️🌶️🌶️🌶️</span>
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
                    <option value="spice">Spice Level</option>
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
            {searchQuery && `Searching for: "${searchQuery}"`}
          </div>
        </div>

        {/* Document Grid/List */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDocuments.map(document => (
              <DocumentCard key={document.id} document={document} />
            ))}
          </div>
        ) : (
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
                    <h3 className="font-semibold text-white mb-2">{document.title}</h3>
                    <p className="text-sm text-gray-300 mb-3 line-clamp-2">
                      {document.content.substring(0, 300)}...
                    </p>
                    <div className="flex items-center space-x-4 text-xs text-gray-400">
                      <span>{formatFileSize(document.fileSize)}</span>
                      <span>{formatDate(document.dateCreated)}</span>
                      <span>{document.entities.length} entities</span>
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
              {searchQuery 
                ? `No documents match your search for "${searchQuery}"`
                : 'Try adjusting your filters or search query'
              }
            </p>
          </div>
        )}

        {/* Document Viewer Modal */}
        {selectedDocument && <DocumentViewer document={selectedDocument} />}
      </div>
    </div>
  );
};