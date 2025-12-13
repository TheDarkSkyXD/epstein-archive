import React, { useState, useEffect } from 'react';
import { MediaImage, Album } from '../types/media.types';
import Icon from './Icon';
import MediaViewerModal from './MediaViewerModal';

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
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortField, setSortField] = useState<SortField>('date_added');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewerStartIndex, setViewerStartIndex] = useState<number | null>(null);
  const [showAlbumDropdown, setShowAlbumDropdown] = useState(false); // Mobile album dropdown

  // Initialize from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const albumId = params.get('albumId');
    if (albumId) {
        setSelectedAlbum(parseInt(albumId));
    }
  }, []);

  useEffect(() => {
    loadAlbums();
    loadImages();
  }, []);

  // Sync Album ID to URL
  useEffect(() => {
    const url = new URL(window.location.href);
    if (selectedAlbum) {
      url.searchParams.set('albumId', selectedAlbum.toString());
    } else {
      url.searchParams.delete('albumId');
    }
    // Don't overwrite photoId if it exists during initial load
    window.history.replaceState({}, '', url);
    loadImages();
  }, [selectedAlbum]);

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

  const handleImageClick = (image: MediaImage, index: number) => {
    // If external handler provided, use it (legacy), otherwise open viewer
    if (onImageClick) {
      onImageClick(image);
    } else {
      setViewerStartIndex(index);
      // URL update handled by MediaViewerModal or here? 
      // MediaViewerModal handles param set.
    }
  };
  
  const [showCopied, setShowCopied] = useState(false);
  const handleShare = () => {
      navigator.clipboard.writeText(window.location.href).then(() => {
          setShowCopied(true);
          setTimeout(() => setShowCopied(false), 2000);
      });
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

            <div className="flex-1 p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
                {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2 md:gap-4 pb-20">
                    {images.map((img, index) => (
                    <button
                        key={img.id}
                        className="group relative aspect-[4/3] md:aspect-[3/2] bg-black border border-slate-800 rounded-lg overflow-hidden hover:border-cyan-500/50 transition-all shadow-lg hover:shadow-cyan-900/20"
                        onClick={() => handleImageClick(img, index)}
                    >
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
                        className="flex items-center gap-4 p-2 hover:bg-slate-900 border-b border-slate-800/50 w-full text-left group transition-colors"
                         onClick={() => handleImageClick(img, index)}
                    >
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
