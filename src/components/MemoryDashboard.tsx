import React, { useState, useEffect } from 'react';
import { useMemory } from '../contexts/MemoryContext';
import type { MemoryEntry, MemorySearchFilters } from '../types/memory';

const MemoryDashboard: React.FC = () => {
  const { 
    state, 
    loadMemoryEntries, 
    createMemoryEntry, 
    updateMemoryEntry, 
    deleteMemoryEntry,
    selectMemoryEntry,
    searchMemoryEntries
  } = useMemory();
  
  const [selectedMemory, setSelectedMemory] = useState<MemoryEntry | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [searchFilters, setSearchFilters] = useState<MemorySearchFilters>({});
  const [newMemoryContent, setNewMemoryContent] = useState('');
  const [newMemoryType, setNewMemoryType] = useState<'declarative' | 'episodic' | 'working' | 'procedural'>('declarative');
  const [newMemoryTags, setNewMemoryTags] = useState('');

  useEffect(() => {
    loadMemoryEntries();
  }, [loadMemoryEntries]);

  const handleCreateMemory = async () => {
    if (!newMemoryContent.trim()) return;
    
    const tags = newMemoryTags.split(',').map(tag => tag.trim()).filter(tag => tag);
    
    await createMemoryEntry({
      memoryType: newMemoryType,
      content: newMemoryContent,
      contextTags: tags,
      importanceScore: 0.5
    });
    
    setNewMemoryContent('');
    setNewMemoryTags('');
    setIsCreating(false);
  };

  const handleSearch = async () => {
    if (searchFilters.searchQuery) {
      await searchMemoryEntries(searchFilters.searchQuery);
    } else {
      await loadMemoryEntries(searchFilters);
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this memory entry?')) {
      await deleteMemoryEntry(id);
      if (selectedMemory?.id === id) {
        setSelectedMemory(null);
        selectMemoryEntry(null);
      }
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Memory Dashboard</h1>
      
      {/* Search and Filter Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Memory Type</label>
            <select
              value={searchFilters.memoryType || ''}
              onChange={(e) => setSearchFilters({
                ...searchFilters,
                memoryType: e.target.value as any || undefined
              })}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="">All Types</option>
              <option value="declarative">Declarative</option>
              <option value="episodic">Episodic</option>
              <option value="working">Working</option>
              <option value="procedural">Procedural</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={searchFilters.status || ''}
              onChange={(e) => setSearchFilters({
                ...searchFilters,
                status: e.target.value as any || undefined
              })}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
              <option value="deprecated">Deprecated</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              value={searchFilters.searchQuery || ''}
              onChange={(e) => setSearchFilters({
                ...searchFilters,
                searchQuery: e.target.value || undefined
              })}
              placeholder="Search memory content..."
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
          </div>
          
          <div className="flex items-end">
            <button
              onClick={handleSearch}
              className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              Search
            </button>
          </div>
        </div>
      </div>
      
      {/* Create New Memory Section */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Create New Memory</h2>
          <button
            onClick={() => setIsCreating(!isCreating)}
            className="bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            {isCreating ? 'Cancel' : 'Create New'}
          </button>
        </div>
        
        {isCreating && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Memory Type</label>
              <select
                value={newMemoryType}
                onChange={(e) => setNewMemoryType(e.target.value as any)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="declarative">Declarative</option>
                <option value="episodic">Episodic</option>
                <option value="working">Working</option>
                <option value="procedural">Procedural</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
              <textarea
                value={newMemoryContent}
                onChange={(e) => setNewMemoryContent(e.target.value)}
                rows={4}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="Enter memory content..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Context Tags (comma-separated)</label>
              <input
                type="text"
                value={newMemoryTags}
                onChange={(e) => setNewMemoryTags(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="tag1, tag2, tag3"
              />
            </div>
            
            <button
              onClick={handleCreateMemory}
              disabled={!newMemoryContent.trim()}
              className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Create Memory
            </button>
          </div>
        )}
      </div>
      
      {/* Memory List */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Memory Entries ({state.totalEntries})
          </h2>
        </div>
        
        {state.loading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          </div>
        ) : state.error ? (
          <div className="p-6 text-center text-red-600">
            Error: {state.error}
          </div>
        ) : state.memoryEntries.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No memory entries found
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {state.memoryEntries.map((memory) => (
              <div 
                key={memory.id} 
                className={`p-6 hover:bg-gray-50 cursor-pointer ${
                  selectedMemory?.id === memory.id ? 'bg-indigo-50' : ''
                }`}
                onClick={() => {
                  setSelectedMemory(memory);
                  selectMemoryEntry(memory);
                }}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        memory.memoryType === 'declarative' ? 'bg-blue-100 text-blue-800' :
                        memory.memoryType === 'episodic' ? 'bg-green-100 text-green-800' :
                        memory.memoryType === 'working' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {memory.memoryType}
                      </span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        memory.status === 'active' ? 'bg-green-100 text-green-800' :
                        memory.status === 'archived' ? 'bg-gray-100 text-gray-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {memory.status}
                      </span>
                    </div>
                    
                    <h3 className="mt-2 text-sm font-medium text-gray-900 truncate">
                      {memory.content.substring(0, 100)}{memory.content.length > 100 ? '...' : ''}
                    </h3>
                    
                    <div className="mt-2 flex flex-wrap gap-1">
                      {memory.contextTags?.slice(0, 5).map((tag, index) => (
                        <span 
                          key={index} 
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800"
                        >
                          {tag}
                        </span>
                      ))}
                      {memory.contextTags && memory.contextTags.length > 5 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          +{memory.contextTags.length - 5} more
                        </span>
                      )}
                    </div>
                    
                    <div className="mt-2 text-xs text-gray-500">
                      Quality: {(memory.qualityScore * 100).toFixed(0)}% | 
                      Importance: {(memory.importanceScore * 100).toFixed(0)}% | 
                      Created: {new Date(memory.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  
                  <div className="flex space-x-2 ml-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(memory.id);
                      }}
                      className="text-red-600 hover:text-red-900"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Pagination */}
        {state.totalPages > 1 && (
          <div className="bg-white px-6 py-3 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing <span className="font-medium">{(state.currentPage - 1) * 20 + 1}</span> to{' '}
              <span className="font-medium">
                {Math.min(state.currentPage * 20, state.totalEntries)}
              </span>{' '}
              of <span className="font-medium">{state.totalEntries}</span> results
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => loadMemoryEntries(searchFilters, Math.max(1, state.currentPage - 1), 20)}
                disabled={state.currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <button
                onClick={() => loadMemoryEntries(searchFilters, Math.min(state.totalPages, state.currentPage + 1), 20)}
                disabled={state.currentPage === state.totalPages}
                className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Selected Memory Details */}
      {selectedMemory && (
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Memory Details</h2>
            <button
              onClick={() => {
                setSelectedMemory(null);
                selectMemoryEntry(null);
              }}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">ID</label>
              <p className="mt-1 text-sm text-gray-900">{selectedMemory.id}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">UUID</label>
              <p className="mt-1 text-sm text-gray-900 break-all">{selectedMemory.uuid}</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Memory Type</label>
                <p className="mt-1 text-sm text-gray-900">{selectedMemory.memoryType}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <p className="mt-1 text-sm text-gray-900">{selectedMemory.status}</p>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Content</label>
              <div className="mt-1 text-sm text-gray-900 bg-gray-50 p-4 rounded-md max-h-60 overflow-y-auto">
                {selectedMemory.content}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Quality Score</label>
                <p className="mt-1 text-sm text-gray-900">{(selectedMemory.qualityScore * 100).toFixed(0)}%</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Importance Score</label>
                <p className="mt-1 text-sm text-gray-900">{(selectedMemory.importanceScore * 100).toFixed(0)}%</p>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Context Tags</label>
              <div className="mt-1 flex flex-wrap gap-2">
                {selectedMemory.contextTags?.map((tag, index) => (
                  <span 
                    key={index} 
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800"
                  >
                    {tag}
                  </span>
                )) || 'No tags'}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Created At</label>
                <p className="mt-1 text-sm text-gray-900">
                  {new Date(selectedMemory.createdAt).toLocaleString()}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Updated At</label>
                <p className="mt-1 text-sm text-gray-900">
                  {new Date(selectedMemory.updatedAt).toLocaleString()}
                </p>
              </div>
            </div>
            
            {selectedMemory.provenance && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Provenance</label>
                <pre className="mt-1 text-xs bg-gray-100 p-3 rounded-md overflow-x-auto">
                  {JSON.stringify(selectedMemory.provenance, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MemoryDashboard;