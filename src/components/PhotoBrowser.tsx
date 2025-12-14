import React, { useState, useEffect, useCallback } from 'react';
import { MediaImage, Album } from '../types/media.types';
import Icon from './Icon';
import MediaViewerModal from './MediaViewerModal';
import BatchToolbar from './BatchToolbar';

interface PhotoBrowserProps {
  onImageClick?: (image: MediaImage) => void;
}

type ViewMode = 'grid' | 'list';
type SortField = 'date_added' | 'date_taken' | 'filename' | 'file_size' | 'title';
type SortOrder = 'asc' | 'desc';

export const PhotoBrowser: React.FC<PhotoBrowserProps> = ({ onImageClick }) => {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [images, setImages] = useState<MediaImage[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<number | null>(null);
  const [selectedTag, setSelectedTag] = useState<number | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortField, setSortField] = useState<SortField>('date_added');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewerStartIndex, setViewerStartIndex] = useState<number | null>(null);
  const [showAlbumDropdown, setShowAlbumDropdown] = useState(false); // Mobile album dropdown
  
  // Batch selection state
  const [selectedImages, setSelectedImages] = useState<Set<number>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [isBatchMode, setIsBatchMode] = useState(false);

  // Initialize from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const albumId = params.get('albumId');
    const tagId = params.get('tagId');
    const personId = params.get('personId');
    
    if (albumId) setSelectedAlbum(parseInt(albumId));
    if (tagId) setSelectedTag(parseInt(tagId));
    if (personId) setSelectedPerson(parseInt(personId));
  }, []);

  useEffect(() => {
    loadAlbums();
    loadImages();
  }, []);

  // Sync URL with filters
  useEffect(() => {
    const url = new URL(window.location.href);
    
    if (selectedAlbum) url.searchParams.set('albumId', selectedAlbum.toString());
    else url.searchParams.delete('albumId');
    
    if (selectedTag) url.searchParams.set('tagId', selectedTag.toString());
    else url.searchParams.delete('tagId');
    
    if (selectedPerson) url.searchParams.set('personId', selectedPerson.toString());
    else url.searchParams.delete('personId');

    window.history.replaceState({}, '', url);
    loadImages();
  }, [selectedAlbum, selectedTag, selectedPerson]);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      // Batch mode shortcuts
      if (isBatchMode) {
        if (e.key === 'Escape') {
          exitBatchMode();
        } else if (e.key === 'a' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          selectAllImages();
        } else if (e.key === 'i') {
          clearSelection();
        }
      } else {
        // Enter batch mode with Ctrl/Cmd+B
        if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
          e.preventDefault();
          enterBatchMode();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isBatchMode]);

  useEffect(() => {
    loadImages();
  }, [sortField, sortOrder, searchQuery]);

  const loadAlbums = async () => {
    try {
      const response = await fetch('/api/media/albums');
      const data = await response.json();
      if (Array.isArray(data)) {
        setAlbums(data);
      } else {
        console.error('Expected array for albums, got:', data);
        setAlbums([]);
      }
    } catch (error) {
      console.error('Failed to load albums:', error);
    }
  };

  const loadImages = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedAlbum) params.append('albumId', selectedAlbum.toString());
      if (selectedTag) params.append('tagId', selectedTag.toString());
      if (selectedPerson) params.append('personId', selectedPerson.toString());
      if (sortField) params.append('sortField', sortField);
      if (sortOrder) params.append('sortOrder', sortOrder);
      if (searchQuery) params.append('search', searchQuery);

      params.append('_t', Date.now().toString()); // Cache busting
      const response = await fetch(`/api/media/images?${params}`);
      const data = await response.json();
      const normalized: MediaImage[] = Array.isArray(data) ? data.map((img: any) => ({
        id: img.id,
        filename: img.filename || img.fileName,
        originalFilename: img.original_filename || img.originalFilename,
        path: img.path || img.filePath,
        thumbnailPath: img.thumbnail_path || img.thumbnailPath || img.path || img.filePath,
        title: img.title || img.filename,
        description: img.description || '',
        albumId: img.album_id || img.albumId,
        albumName: img.albumName,
        width: img.width || 0,
        height: img.height || 0,
        fileSize: img.file_size || img.fileSize || 0,
        format: img.format || 'unknown',
        dateTaken: img.date_taken || img.dateTaken,
        dateAdded: img.date_added || img.dateAdded,
        dateModified: img.date_modified || img.dateModified,
        tags: img.tags || [],
        cameraMake: img.camera_make || img.cameraMake,
        cameraModel: img.camera_model || img.cameraModel,
        lens: img.lens,
        focalLength: img.focal_length || img.focalLength,
        aperture: img.aperture,
        shutterSpeed: img.shutter_speed || img.shutterSpeed,
        iso: img.iso,
        latitude: img.latitude,
        longitude: img.longitude
      })) : [];
      setImages(normalized);

      // Check for photoId deep link
      const urlParams = new URLSearchParams(window.location.search);
      const photoId = urlParams.get('photoId');
      if (photoId) {
         const index = normalized.findIndex(img => img.id.toString() === photoId);
         if (index !== -1) {
             setViewerStartIndex(index);
         }
      }

    } catch (error) {
      console.error('Failed to load images:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleImageSelection = (imageId: number, index: number, event: React.MouseEvent) => {
    const newSelectedImages = new Set(selectedImages);
    
    if (event.shiftKey && lastSelectedIndex !== null) {
      // Shift+click: Select range
      const start = Math.min(lastSelectedIndex, index);
      const end = Math.max(lastSelectedIndex, index);
      for (let i = start; i <= end; i++) {
        newSelectedImages.add(images[i].id);
      }
    } else if (event.ctrlKey || event.metaKey) {
      // Ctrl/Cmd+click: Toggle selection
      if (newSelectedImages.has(imageId)) {
        newSelectedImages.delete(imageId);
      } else {
        newSelectedImages.add(imageId);
      }
      setLastSelectedIndex(index);
    } else {
      // Regular click: If in batch mode, toggle selection, otherwise open viewer
      if (isBatchMode) {
        if (newSelectedImages.has(imageId)) {
          newSelectedImages.delete(imageId);
        } else {
          newSelectedImages.add(imageId);
        }
        setLastSelectedIndex(index);
      } else {
        // If external handler provided, use it (legacy), otherwise open viewer
        if (onImageClick) {
          onImageClick(images[index]);
        } else {
          setViewerStartIndex(index);
          // URL update handled by MediaViewerModal or here? 
          // MediaViewerModal handles param set.
        }
      }
    }
    
    setSelectedImages(newSelectedImages);
  };
  
  const handleImageClick = (image: MediaImage, index: number, event: React.MouseEvent) => {
    // If in batch mode, handle selection
    if (isBatchMode) {
      toggleImageSelection(image.id, index, event);
    } else {
      // If external handler provided, use it (legacy), otherwise open viewer
      if (onImageClick) {
        onImageClick(image);
      } else {
        setViewerStartIndex(index);
        // URL update handled by MediaViewerModal or here? 
        // MediaViewerModal handles param set.
      }
    }
  };
  
  const enterBatchMode = () => {
    setIsBatchMode(true);
  };
  
  const exitBatchMode = () => {
    setIsBatchMode(false);
    setSelectedImages(new Set());
    setLastSelectedIndex(null);
  };
  
  const selectAllImages = () => {
    const allImageIds = new Set(images.map(img => img.id));
    setSelectedImages(allImageIds);
  };
  
  const clearSelection = () => {
    setSelectedImages(new Set());
    setLastSelectedIndex(null);
  };
  
  const [showCopied, setShowCopied] = useState(false);
  const handleShare = () => {
      navigator.clipboard.writeText(window.location.href).then(() => {
          setShowCopied(true);
          setTimeout(() => setShowCopied(false), 2000);
      });
  };
  
  const handleBatchRotate = async (direction: 'left' | 'right') => {
    if (selectedImages.size === 0) return;
    
    try {
      const response = await fetch('/api/media/images/batch/rotate', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          imageIds: Array.from(selectedImages),
          direction 
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to batch rotate images');
      }
      
      const { results } = await response.json();
      
      // Update images with rotated versions
      const updatedImages = [...images];
      for (const result of results) {
        if (result.success) {
          const index = updatedImages.findIndex(img => img.id === result.id);
          if (index !== -1) {
            updatedImages[index] = { ...updatedImages[index], ...result.image };
          }
        }
      }
      setImages(updatedImages);
      
      // Show success message
      console.log(`Successfully rotated ${results.filter(r => r.success).length} images`);
    } catch (error) {
      console.error('Error batch rotating images:', error);
      alert('Failed to rotate images');
    }
  };
  
  const handleBatchRate = async (rating: number) => {
    if (selectedImages.size === 0) return;
    
    try {
      const response = await fetch('/api/media/images/batch/rate', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          imageIds: Array.from(selectedImages),
          rating 
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to batch rate images');
      }
      
      const { results } = await response.json();
      
      // Update images with new ratings
      const updatedImages = [...images];
      for (const result of results) {
        if (result.success) {
          const index = updatedImages.findIndex(img => img.id === result.id);
          if (index !== -1) {
            updatedImages[index] = { ...updatedImages[index], rating };
          }
        }
      }
      setImages(updatedImages);
      
      // Show success message
      console.log(`Successfully rated ${results.filter(r => r.success).length} images`);
    } catch (error) {
      console.error('Error batch rating images:', error);
      alert('Failed to rate images');
    }
  };
  
  const handleBatchTag = async (tagIds: number[], action: 'add' | 'remove') => {
    if (selectedImages.size === 0) return;
    
    try {
      const response = await fetch('/api/media/images/batch/tags', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          imageIds: Array.from(selectedImages),
          tagIds,
          action
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to batch ${action} tags`);
      }
      
      const { results } = await response.json();
      
      // For simplicity, we're not updating the UI with tag changes
      // In a real implementation, we might want to refetch tags for affected images
      
      // Show success message
      console.log(`Successfully ${action}ed tags to ${results.filter(r => r.success).length} images`);
    } catch (error) {
      console.error(`Error batch ${action}ing tags:`, error);
      alert(`Failed to ${action} tags`);
    }
  };
  
  const handleBatchMetadata = async (updates: { title?: string; description?: string }) => {
    if (selectedImages.size === 0) return;
    
    try {
      const response = await fetch('/api/media/images/batch/metadata', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          imageIds: Array.from(selectedImages),
          updates
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to batch update metadata');
      }
      
      const { results } = await response.json();
      
      // Update images with new metadata
      const updatedImages = [...images];
      for (const result of results) {
        if (result.success) {
          const index = updatedImages.findIndex(img => img.id === result.id);
          if (index !== -1) {
            updatedImages[index] = { ...updatedImages[index], ...updates };
          }
        }
      }
      setImages(updatedImages);
      
      // Show success message
      console.log(`Successfully updated metadata for ${results.filter(r => r.success).length} images`);
    } catch (error) {
      console.error('Error batch updating metadata:', error);
      alert('Failed to update metadata');
    }
  };

  const formatFileSize = (bytes: number | string | undefined): string => {
    const numBytes = Number(bytes);
    if (bytes === undefined || bytes === null || bytes === '' || !Number.isFinite(numBytes)) return 'Unknown';
    if (numBytes === 0) return '0 B';
    if (numBytes < 1024) return `${numBytes} B`;
    if (numBytes < 1024 * 1024) return `${(numBytes / 1024).toFixed(1)} KB`;
    return `${(numBytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string | undefined | null): string => {
    if (!dateString) return 'Unknown';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Unknown';
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch (e) {
      return 'Unknown';
    }
  };
  
  const handleCloseViewer = () => {
      setViewerStartIndex(null);
      const url = new URL(window.location.href);
      url.searchParams.delete('photoId');
      window.history.replaceState({}, '', url);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 border border-slate-800 shadow-2xl overflow-hidden rounded-lg">
      {/* Header with controls */}
      <div className="bg-slate-900 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between px-3 py-2 md:px-4 md:h-14 shrink-0 z-10 gap-2">
        {/* Mobile Album Dropdown */}
        <div className="md:hidden">
          <button
            onClick={() => setShowAlbumDropdown(!showAlbumDropdown)}
            className="w-full flex items-center justify-between px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm"
          >
            <span className="flex items-center gap-2">
              <Icon name="Folder" size="sm" />
              {selectedAlbum ? albums.find(a => a.id === selectedAlbum)?.name : 'All Photos'}
            </span>
            <Icon name={showAlbumDropdown ? 'ChevronUp' : 'ChevronDown'} size="sm" />
          </button>
          {showAlbumDropdown && (
            <div className="absolute left-3 right-3 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-30 max-h-60 overflow-y-auto">
              <button
                className={`w-full px-4 py-3 text-left text-sm flex items-center justify-between ${selectedAlbum === null ? 'bg-cyan-900/20 text-cyan-400' : 'text-slate-300 hover:bg-slate-700'}`}
                onClick={() => { setSelectedAlbum(null); setShowAlbumDropdown(false); }}
              >
                <span>All Photos</span>
                <span className="text-xs opacity-70">{images.length}</span>
              </button>
              {albums.map((album) => (
                <button
                  key={album.id}
                  className={`w-full px-4 py-3 text-left text-sm flex items-center justify-between border-t border-slate-700/50 ${selectedAlbum === album.id ? 'bg-cyan-900/20 text-cyan-400' : 'text-slate-300 hover:bg-slate-700'}`}
                  onClick={() => { setSelectedAlbum(album.id); setShowAlbumDropdown(false); }}
                >
                  <span className="truncate">{album.name}</span>
                  <span className="text-xs opacity-70">{album.imageCount || 0}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* Search - Smaller on mobile */}
        <div className="w-full md:w-64 flex gap-2">
          <div className="relative flex-1">
             <Icon name="Search" size="sm" className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
             <input
              type="text"
              placeholder="Search images..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg text-slate-200 pl-9 pr-3 py-2 md:py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 placeholder-slate-500 transition-all"
            />
          </div>
           {/* Mobile share button */}
           <button 
              onClick={handleShare}
              className="md:hidden flex items-center justify-center w-10 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-white"
           >
              {showCopied ? <Icon name="Check" size="sm" className="text-green-500"/> : <Icon name="Share2" size="sm" />}
           </button>
        </div>

        {/* Desktop Sort and View Controls - Hidden on mobile */}
        <div className="hidden md:flex items-center gap-3">
          <button 
             onClick={handleShare}
             className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded text-xs transition-colors"
          >
             {showCopied ? <Icon name="Check" size="sm" className="text-green-500" /> : <Icon name="Share2" size="sm" />}
             Share
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Sort by:</span>
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as SortField)}
              className="bg-slate-800 border border-slate-700 rounded text-slate-300 text-xs px-2 py-1 focus:outline-none focus:border-cyan-500"
            >
              <option value="date_added">Date Added</option>
              <option value="date_taken">Date Taken</option>
              <option value="filename">Name</option>
              <option value="file_size">Size</option>
              <option value="title">Title</option>
            </select>
          </div>

          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="w-8 h-8 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 rounded transition-colors"
            title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
          >
            <Icon name={sortOrder === 'asc' ? 'ArrowUp' : 'ArrowDown'} size="sm" />
          </button>

          <div className="flex bg-slate-800 p-0.5 rounded border border-slate-700">
            <button
              className={`w-8 h-7 flex items-center justify-center rounded ${viewMode === 'grid' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'}`}
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >
              <Icon name="Grid" size="sm" />
            </button>
            <button
               className={`w-8 h-7 flex items-center justify-center rounded ${viewMode === 'list' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'}`}
              onClick={() => setViewMode('list')}
              title="List View"
            >
              <Icon name="List" size="sm" />
            </button>
          </div>
          
          {/* Batch Mode Toggle */}
          <button
            onClick={isBatchMode ? exitBatchMode : enterBatchMode}
            className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-colors ${isBatchMode ? 'bg-cyan-600 hover:bg-cyan-500 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700'}`}
          >
            <Icon name="CheckSquare" size="sm" />
            {isBatchMode ? 'Exit Batch Mode' : 'Batch Edit'}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Albums sidebar - Hidden on mobile */}
        <aside className="hidden md:flex w-60 bg-slate-900 border-r border-slate-800 flex-col shrink-0">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">Albums</h3>
          <div className="flex-1 overflow-y-auto">
            <button
              className={`w-full px-4 py-2 text-left text-sm flex items-center justify-between transition-colors ${selectedAlbum === null ? 'bg-cyan-900/20 text-cyan-400 border-l-2 border-cyan-400' : 'text-slate-400 hover:bg-slate-800 hover:text-white border-l-2 border-transparent'}`}
              onClick={() => setSelectedAlbum(null)}
            >
              <span className="truncate">All Photos</span>
              <span className="text-xs opacity-70 bg-slate-800 px-1.5 py-0.5 rounded-full">{images.length}</span>
            </button>
            {albums.map((album) => (
              <button
                key={album.id}
                className={`w-full px-4 py-2 text-left text-sm flex items-center justify-between transition-colors ${selectedAlbum === album.id ? 'bg-cyan-900/20 text-cyan-400 border-l-2 border-cyan-400' : 'text-slate-400 hover:bg-slate-800 hover:text-white border-l-2 border-transparent'}`}
                onClick={() => setSelectedAlbum(album.id)}
                title={album.name}
              >
                <span className="truncate">{album.name}</span>
                <span className="text-xs opacity-70 bg-slate-800 px-1.5 py-0.5 rounded-full">{album.imageCount || 0}</span>
              </button>
            ))}
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 bg-slate-950 flex flex-col overflow-hidden relative">
            {loading ? (
                <div className="absolute inset-0 flex items-center justify-center z-20 bg-slate-950/50 backdrop-blur-sm">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500"></div>
                </div>
            ) : null}

            {/* Active Filters */}
            {(selectedTag || selectedPerson) && (
              <div className="flex items-center gap-2 px-4 py-2 bg-slate-900 border-b border-slate-800">
                <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Filtered by:</span>
                
                {selectedTag && (
                  <button 
                    onClick={() => setSelectedTag(null)}
                    className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full text-xs transition-colors group"
                  >
                    <span>Tag: {selectedTag}</span>
                    <Icon name="X" size="xs" className="text-slate-500 group-hover:text-white" />
                  </button>
                )}
                
                {selectedPerson && (
                  <button 
                    onClick={() => setSelectedPerson(null)}
                    className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full text-xs transition-colors group"
                  >
                    <span>Person: {selectedPerson}</span>
                    <Icon name="X" size="xs" className="text-slate-500 group-hover:text-white" />
                  </button>
                )}
                
                <button 
                  onClick={() => { setSelectedTag(null); setSelectedPerson(null); }}
                  className="text-xs text-slate-500 hover:text-slate-400 ml-auto"
                >
                  Clear all
                </button>
              </div>
            )}

            <div className="flex-1 p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2 md:gap-4 pb-20">
                    {images.map((img, index) => (
                    <button
                        key={img.id}
                        className={`group relative aspect-[4/3] md:aspect-[3/2] bg-black border rounded-lg overflow-hidden transition-all shadow-lg hover:shadow-cyan-900/20 ${selectedImages.has(img.id) ? 'border-cyan-500 ring-2 ring-cyan-500/30' : 'border-slate-800 hover:border-cyan-500/50'}`}
                        onClick={(e) => handleImageClick(img, index, e)}
                        onKeyDown={(e) => {
                          if (isBatchMode && e.key === 'Enter') {
                            toggleImageSelection(img.id, index, e as any);
                          }
                        }}
                        tabIndex={isBatchMode ? 0 : -1}
                    >
                        {/* Selection indicator */}
                        {isBatchMode && (
                          <div className="absolute top-2 left-2 w-6 h-6 flex items-center justify-center rounded-full bg-cyan-500 text-white text-xs font-bold z-10">
                            {selectedImages.has(img.id) ? '✓' : index + 1}
                          </div>
                        )}
                        <img 
                        src={`/api/media/images/${img.id}/thumbnail?v=${new Date(img.dateModified || img.dateAdded || 0).getTime()}`} 
                        alt={img.title}
                        loading="lazy"
                        className="w-full h-full object-contain bg-slate-900/50"
                        />
                        {/* Title overlay - Always visible on mobile, hover on desktop */}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-3 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
                            <div className="text-xs text-white font-medium truncate" title={img.title}>{img.title}</div>
                            <div className="text-[10px] text-slate-400 flex justify-between mt-1">
                                <span>{formatDate(img.dateTaken)}</span>
                                <span>{formatFileSize(img.fileSize)}</span>
                            </div>
                        </div>
                    </button>
                    ))}
                </div>
                ) : (
                <div className="flex flex-col gap-1 pb-20">
                    {images.map((img, index) => (
                    <button 
                        key={img.id} 
                        className={`flex items-center gap-4 p-2 border-b border-slate-800/50 w-full text-left group transition-colors ${selectedImages.has(img.id) ? 'bg-cyan-900/20 border-cyan-500/30' : 'hover:bg-slate-900'}`}
                         onClick={(e) => handleImageClick(img, index, e)}
                        onKeyDown={(e) => {
                          if (isBatchMode && e.key === 'Enter') {
                            toggleImageSelection(img.id, index, e as any);
                          }
                        }}
                        tabIndex={isBatchMode ? 0 : -1}
                    >
                        {/* Selection indicator for list view */}
                        {isBatchMode && (
                          <div className="w-6 h-6 flex items-center justify-center rounded-full bg-cyan-500 text-white text-xs font-bold mr-2">
                            {selectedImages.has(img.id) ? '✓' : index + 1}
                          </div>
                        )}
                        <div className="w-12 h-12 bg-black border border-slate-800 rounded flex items-center justify-center shrink-0">
                             <img 
                                src={`/api/media/images/${img.id}/thumbnail?v=${new Date(img.dateModified || img.dateAdded || 0).getTime()}`} 
                                alt={img.title} 
                                className="max-w-full max-h-full object-contain"
                            />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-sm text-slate-300 font-medium truncate group-hover:text-cyan-400 transition-colors" title={img.title}>{img.title}</div>
                             <div className="text-xs text-slate-500 truncate">{img.title !== img.filename ? img.filename : ''}</div>
                        </div>
                        
                         <div className="w-32 text-xs text-slate-500 text-right shrink-0">
                             {formatDate(img.dateTaken || img.dateAdded)}
                        </div>
                         <div className="w-20 text-xs text-slate-500 text-right shrink-0 font-mono">
                             {formatFileSize(img.fileSize)}
                        </div>
                    </button>
                    ))}
                </div>
                )}
                
                {!loading && images.length === 0 && (
                     <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                        <Icon name="Image" size="lg" className="mb-2 opacity-50" />
                        <p>No images found</p>
                    </div>
                )}
                            
                {/* Batch Toolbar */}
                {isBatchMode && (
                  <div className="sticky bottom-0 left-0 right-0 flex justify-center p-4 bg-gradient-to-t from-slate-950 to-transparent pointer-events-none">
                    <div className="pointer-events-auto">
                      <BatchToolbar 
                        selectedCount={selectedImages.size}
                        onRotate={handleBatchRotate}
                        onAssignTags={(tags) => {
                          // For now, we'll just add tags
                          handleBatchTag(tags, 'add');
                        }}
                        onAssignRating={handleBatchRate}
                        onEditMetadata={(field, value) => {
                          // Create updates object based on field
                          const updates = {};
                          if (field === 'title') {
                            updates.title = value;
                          } else if (field === 'description') {
                            updates.description = value;
                          }
                          handleBatchMetadata(updates);
                        }}
                        onCancel={exitBatchMode}
                      />
                    </div>
                  </div>
                )}
            </div>
        </div>
      </div>
      
      {/* Footer Status Bar */}
      <div className="h-6 bg-slate-900 border-t border-slate-800 flex items-center justify-between px-3 text-[10px] text-slate-500 select-none shrink-0">
          <div>{images.length} items</div>
          <div>{selectedAlbum ? albums.find(a => a.id === selectedAlbum)?.name : 'All Photos'}</div>
      </div>

      {/* Full Screen Viewer */}
      {viewerStartIndex !== null && (
        <MediaViewerModal
          images={images}
          initialIndex={viewerStartIndex}
          onClose={handleCloseViewer}
        />
      )}
    </div>
  );
};


export default PhotoBrowser;
