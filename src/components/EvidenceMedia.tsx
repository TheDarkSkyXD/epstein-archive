import React, { useState, useEffect } from 'react';
import { MediaImage, Album } from '../types/media.types';
import { PDFViewer } from './evidence/PDFViewer';
import { AddToInvestigationButton } from './AddToInvestigationButton';
import Icon from './Icon';
import { Camera, MapPin, FileImage, Info, Settings, Clock, Folder, Download, Filter, User } from 'lucide-react';
import JSZip from 'jszip';
import './PhotoBrowser.css';

// Helper to generate human-readable title from filename
const generateDisplayTitle = (filename: string, title?: string, description?: string): string => {
  // If we have a real description-based title, use it
  if (title && title !== filename && !title.match(/^(DJI|IMG|DSC|DCIM|P\d+|_MG_|IMG_)/i)) {
    return title;
  }
  
  // Parse filename for context
  const baseName = filename.replace(/\.[^/.]+$/, ''); // Remove extension
  
  // Pattern detection
  if (baseName.match(/^DJI[_-]?\d+/i)) return `Drone Capture ${baseName.replace(/^DJI[_-]?/i, '#')}`;
  if (baseName.match(/^IMG[_-]?\d+/i)) return `Photo ${baseName.replace(/^IMG[_-]?/i, '#')}`;
  if (baseName.match(/^DSC[_-]?\d+/i)) return `Digital Photo ${baseName.replace(/^DSC[_-]?/i, '#')}`;
  if (baseName.match(/^P\d+/i)) return `Photo ${baseName}`;
  if (baseName.match(/^_MG_\d+/i)) return `Camera Photo ${baseName.replace(/^_MG_/i, '#')}`;
  if (baseName.match(/^DCIM/i)) return `Camera Image ${baseName.replace(/^DCIM[_-]?/i, '')}`;
  if (baseName.match(/screenshot/i)) return `Screenshot`;
  if (baseName.match(/scan/i)) return `Scanned Document`;
  
  // If description available, use truncated version
  if (description && description.length > 3) {
    return description.length > 50 ? description.substring(0, 47) + '...' : description;
  }
  
  // Fallback: clean up the filename
  return baseName.replace(/[_-]/g, ' ').replace(/\s+/g, ' ').trim();
};

// Extended interface to support evidence fields
interface EnhancedMediaImage extends MediaImage {
  verificationStatus?: 'verified' | 'unverified' | 'disputed';
  spiceRating?: number;
  relatedEntities?: string[];
  source?: string;
}

const EVIDENCE_ALBUM_ID = -1;

export const EvidenceMedia: React.FC = () => {
  // State
  const [albums, setAlbums] = useState<Album[]>([]);
  const [images, setImages] = useState<EnhancedMediaImage[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortField, setSortField] = useState<'date_added' | 'date_taken' | 'filename' | 'file_size' | 'title'>('date_added');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedImage, setSelectedImage] = useState<EnhancedMediaImage | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false); // Mobile sidebar state
  
  // New State for Enhancements
  const [isSlideshowOpen, setIsSlideshowOpen] = useState(false);
  const [slideshowIndex, setSlideshowIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  
  // Advanced Filters State
  const [cameraFilter, setCameraFilter] = useState<string>('All');
  const [showGpsOnly, setShowGpsOnly] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Future features list (Cleaned up)
  const futureFeatures = [
    { name: 'Duplicate Detection', icon: 'Copy', description: 'Find similar images' },
    // { name: 'Face Detection', icon: 'User', description: 'Implemented via Subject Tagging' }, // Done
    // { name: 'EXIF Extraction', icon: 'Camera', description: 'Implemented' } // Done
  ];

  // Load persisted state from localStorage on mount
  useEffect(() => {
    try {
      const savedViewMode = localStorage.getItem('evidenceMedia.viewMode');
      const savedSortField = localStorage.getItem('evidenceMedia.sortField');
      const savedSortOrder = localStorage.getItem('evidenceMedia.sortOrder');
      const savedSearchQuery = localStorage.getItem('evidenceMedia.searchQuery');
      const savedSelectedAlbum = localStorage.getItem('evidenceMedia.selectedAlbum');
      const savedShowSidebar = localStorage.getItem('evidenceMedia.showSidebar');
      const savedSelectionMode = localStorage.getItem('evidenceMedia.selectionMode');
      const savedSelectedIds = localStorage.getItem('evidenceMedia.selectedIds');
      
      if (savedViewMode) setViewMode(savedViewMode as 'grid' | 'list');
      if (savedSortField) setSortField(savedSortField as 'date_added' | 'date_taken' | 'filename' | 'file_size' | 'title');
      if (savedSortOrder) setSortOrder(savedSortOrder as 'asc' | 'desc');
      if (savedSearchQuery) setSearchQuery(savedSearchQuery);
      if (savedSelectedAlbum) {
        const parsed = parseInt(savedSelectedAlbum, 10);
        setSelectedAlbum(isNaN(parsed) ? null : parsed);
      }
      if (savedShowSidebar) setShowSidebar(savedShowSidebar === 'true');
      if (savedSelectionMode) setSelectionMode(savedSelectionMode === 'true');
      if (savedSelectedIds) {
        try {
          const ids = JSON.parse(savedSelectedIds);
          if (Array.isArray(ids)) {
            setSelectedIds(new Set(ids));
          }
        } catch (e) {
          console.warn('Failed to parse saved selected IDs:', e);
        }
      }
    } catch (error) {
      console.warn('Failed to load persisted media state:', error);
    }
  }, []);

  // Persist state to localStorage when it changes
  useEffect(() => {
    try {
      localStorage.setItem('evidenceMedia.viewMode', viewMode);
    } catch (error) {
      console.warn('Failed to persist viewMode:', error);
    }
  }, [viewMode]);

  useEffect(() => {
    try {
      localStorage.setItem('evidenceMedia.sortField', sortField);
    } catch (error) {
      console.warn('Failed to persist sortField:', error);
    }
  }, [sortField]);

  useEffect(() => {
    try {
      localStorage.setItem('evidenceMedia.sortOrder', sortOrder);
    } catch (error) {
      console.warn('Failed to persist sortOrder:', error);
    }
  }, [sortOrder]);

  useEffect(() => {
    try {
      localStorage.setItem('evidenceMedia.searchQuery', searchQuery);
    } catch (error) {
      console.warn('Failed to persist searchQuery:', error);
    }
  }, [searchQuery]);

  // Persist selected album
  useEffect(() => {
    try {
      if (selectedAlbum !== null) {
        localStorage.setItem('evidenceMedia.selectedAlbum', selectedAlbum.toString());
      } else {
        localStorage.removeItem('evidenceMedia.selectedAlbum');
      }
    } catch (error) {
      console.warn('Failed to persist selectedAlbum:', error);
    }
  }, [selectedAlbum]);

  // Persist selected image
  useEffect(() => {
    try {
      if (selectedImage) {
        localStorage.setItem('evidenceMedia.selectedImageId', selectedImage.id.toString());
      } else {
        localStorage.removeItem('evidenceMedia.selectedImageId');
      }
    } catch (error) {
      console.warn('Failed to persist selectedImage:', error);
    }
  }, [selectedImage]);

  // Persist sidebar state
  useEffect(() => {
    try {
      localStorage.setItem('evidenceMedia.showSidebar', showSidebar.toString());
    } catch (error) {
      console.warn('Failed to persist showSidebar:', error);
    }
  }, [showSidebar]);

  // Persist selection mode and selected IDs
  useEffect(() => {
    try {
      localStorage.setItem('evidenceMedia.selectionMode', selectionMode.toString());
      localStorage.setItem('evidenceMedia.selectedIds', JSON.stringify(Array.from(selectedIds)));
    } catch (error) {
      console.warn('Failed to persist selection state:', error);
    }
  }, [selectionMode, selectedIds]);

  // Fetch albums
  useEffect(() => {
    const loadAlbums = async () => {
      try {
        const response = await fetch('/api/media/albums');
        const data = await response.json();
        setAlbums(data);
      } catch (error) {
        console.error('Failed to load albums:', error);
      }
    };
    loadAlbums();
  }, []);

  // Fetch images based on selection
  useEffect(() => {
    const loadImages = async () => {
      setLoading(true);
      try {
        let data: EnhancedMediaImage[] = [];

        if (selectedAlbum === EVIDENCE_ALBUM_ID) {
          // Fetch Evidence Media
          const response = await fetch('/api/evidence/media');
          const evidenceData = await response.json();
          
          data = evidenceData.map((item: any) => ({
            id: item.id,
            filename: item.title || 'Untitled', // Map title to filename for display
            originalFilename: item.title,
            path: item.filePath,
            title: item.title,
            description: item.description,
            fileSize: item.metadata?.fileSize || 0,
            format: item.fileType || 'unknown',
            dateAdded: item.createdAt,
            dateModified: item.createdAt,
            verificationStatus: item.verificationStatus,
            spiceRating: item.spiceRating,
            relatedEntities: item.relatedEntities,
            width: item.metadata?.width,
            height: item.metadata?.height
          }));
        } else {
          // Fetch Photo Library
          const params = new URLSearchParams();
          if (selectedAlbum) params.append('albumId', selectedAlbum.toString());
          if (sortField) params.append('sortField', sortField);
          if (sortOrder) params.append('sortOrder', sortOrder);
          if (searchQuery) params.append('search', searchQuery);

          const response = await fetch(`/api/media/images?${params}`);
          data = await response.json();
        }

        setImages(data);

        // Restore selected image if it exists in the new dataset
        try {
          const savedSelectedImageId = localStorage.getItem('evidenceMedia.selectedImageId');
          if (savedSelectedImageId) {
            const imageId = parseInt(savedSelectedImageId, 10);
            const image = data.find(img => img.id === imageId);
            if (image) {
              setSelectedImage(image);
            }
          }
        } catch (error) {
          console.warn('Failed to restore selected image:', error);
        }
      } catch (error) {
        console.error('Failed to load images:', error);
      } finally {
        setLoading(false);
      }
    };

    loadImages();
  }, [selectedAlbum, sortField, sortOrder, searchQuery]);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString();
  };

  const getVerificationBadge = (status?: string) => {
    if (!status) return null;
    const badges: Record<string, { color: string, text: string, icon: string }> = {
      verified: { color: 'bg-green-500', text: 'Verified', icon: 'Check' },
      unverified: { color: 'bg-yellow-500', text: 'Unverified', icon: 'HelpCircle' },
      disputed: { color: 'bg-red-500', text: 'Disputed', icon: 'AlertCircle' }
    };
    const badge = badges[status] || badges.unverified;
    return (
      <span className={`${badge.color} text-white text-xs px-2 py-1 rounded-full flex items-center space-x-1`}>
        <Icon name={badge.icon as 'Check' | 'HelpCircle' | 'AlertCircle'} size="xs" />
        <span>{badge.text}</span>
      </span>
    );
  };

  const getSpiceStars = (rating?: number) => {
    if (rating === undefined) return null;
    return (
      <div className="flex items-center space-x-1">
        {[...Array(5)].map((_, i) => (
          <Icon
            key={i}
            name="Star"
            size="xs"
            className={` ${i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-600'}`}
          />
        ))}
      </div>
    );
  };

  // Clear all persisted media state
  const clearMediaState = () => {
    try {
      Object.keys(localStorage)
        .filter(key => key.startsWith('evidenceMedia.'))
        .forEach(key => localStorage.removeItem(key));
      
      // Reset state to defaults
      setViewMode('grid');
      setSortField('date_added');
      setSortOrder('desc');
      setSearchQuery('');
      setSelectedAlbum(null);
      setSelectedImage(null);
      setShowSidebar(false);
      setSelectionMode(false);
      setSelectedIds(new Set());
    } catch (error) {
      console.warn('Failed to clear media state:', error);
    }
  };

  // Filtered images with Advanced Filters
  const filteredImages = React.useMemo(() => {
    let result = images;
    
    // Album filter
    if (selectedAlbum !== null && selectedAlbum !== EVIDENCE_ALBUM_ID) {
      result = result.filter(img => img.albumId === selectedAlbum);
    }
    
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(img => 
        img.title?.toLowerCase().includes(query) || 
        img.originalFilename?.toLowerCase().includes(query) ||
        img.tags?.some(tag => tag.toLowerCase().includes(query)) ||
        img.relatedEntities?.some(entity => entity.toLowerCase().includes(query)) ||
        img.cameraModel?.toLowerCase().includes(query)
      );
    }
    
    // Advanced Filters: Camera
    if (cameraFilter !== 'All') {
      result = result.filter(img => (img.cameraModel || 'Unknown') === cameraFilter);
    }
    
    // Advanced Filters: GPS
    if (showGpsOnly) {
      result = result.filter(img => img.latitude !== undefined && img.longitude !== undefined);
    }
    
    return result;
  }, [images, selectedAlbum, searchQuery, cameraFilter, showGpsOnly]);

  // Derived state: Available unique cameras
  const availableCameras = React.useMemo(() => {
    const cameras = new Set<string>();
    const baseImages = selectedAlbum !== null 
      ? images.filter(img => img.albumId === selectedAlbum) 
      : images;
      
    baseImages.forEach(img => {
      if (img.cameraModel) cameras.add(img.cameraModel);
    });
    return Array.from(cameras).sort();
  }, [images, selectedAlbum]);

  // Handle Export to ZIP
  const handleExportZip = async () => {
    setIsExporting(true);
    try {
      const zip = new JSZip();
      let count = 0;
      const folder = zip.folder("evidence-export");
      
      for (const img of filteredImages) {
        try {
          // Use the file serving endpoint
          const response = await fetch(`/api/media/images/${img.id}/file`);
          if (response.ok) {
            const blob = await response.blob();
            folder?.file(img.filename, blob);
            count++;
          }
        } catch (e) {
          console.error(`Failed to fetch image ${img.id}`, e);
        }
      }
      
      if (count > 0) {
        const content = await zip.generateAsync({ type: "blob" });
        const exportName = selectedAlbum 
          ? albums.find(a => a.id === selectedAlbum)?.name || 'export'
          : 'evidence-export';
        
        const url = window.URL.createObjectURL(content);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${exportName}-${new Date().toISOString().split('T')[0]}.zip`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. See console for details.');
    } finally {
      setIsExporting(false);
    }
  };

  // Handlers
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    let files: FileList | null = null;
    if ('dataTransfer' in e) {
      files = e.dataTransfer.files;
    } else if ('target' in e) {
      files = (e.target as HTMLInputElement).files;
    }

    if (!files || files.length === 0) return;

    setLoading(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append('file', files[i]);
        if (selectedAlbum && selectedAlbum !== EVIDENCE_ALBUM_ID) {
          formData.append('albumId', selectedAlbum.toString());
        }

        await fetch('/api/media/upload', {
          method: 'POST',
          body: formData
        });
      }
      // Refresh
      const event = new Event('refresh-media'); // Trigger refresh if needed or just re-fetch
      // For now just re-trigger effect by toggling sort or something, or better:
      setSearchQuery(prev => prev + ' '); // Hack to trigger refresh
      setTimeout(() => setSearchQuery(prev => prev.trim()), 100);
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBatchDelete = async () => {
    if (!window.confirm(`Delete ${selectedIds.size} images?`)) return;
    
    try {
      await fetch('/api/media/batch/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) })
      });
      setSelectedIds(new Set());
      setSelectionMode(false);
      // Refresh
      setSearchQuery(prev => prev + ' ');
      setTimeout(() => setSearchQuery(prev => prev.trim()), 100);
    } catch (error) {
      console.error('Batch delete failed:', error);
    }
  };

  const toggleSelection = (id: number) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const openSlideshow = (index: number) => {
    setSlideshowIndex(index);
    setIsSlideshowOpen(true);
  };

  const nextSlide = () => {
    setSlideshowIndex((prev) => (prev + 1) % images.length);
  };

  const prevSlide = () => {
    setSlideshowIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  // Keyboard navigation for slideshow
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isSlideshowOpen) return;
      if (e.key === 'ArrowRight') nextSlide();
      if (e.key === 'ArrowLeft') prevSlide();
      if (e.key === 'Escape') setIsSlideshowOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSlideshowOpen]);

  const handleExport = () => {
    if (selectedAlbum && selectedAlbum !== EVIDENCE_ALBUM_ID) {
      window.open(`/api/media/export/album/${selectedAlbum}`, '_blank');
    }
  };

  return (
    <div className="photo-browser h-[calc(100dvh-120px)] flex flex-col relative">
      {/* Header */}
      <div className="photo-header bg-slate-800/50 p-4 border-b border-slate-700 flex flex-wrap gap-4 items-center justify-between z-20">
        <div className="flex items-center gap-4 flex-1">
          {/* Mobile Sidebar Toggle */}
          <button 
            className="md:hidden p-2 text-slate-400 hover:text-white"
            onClick={() => setShowSidebar(!showSidebar)}
          >
            {showSidebar ? <Icon name="X" size="md" /> : <Icon name="Menu" size="md" />}
          </button>

          <div className="relative flex-1 max-w-md">
            <Icon name="Search" size="sm" className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search evidence..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Clear State Button */}
          <button 
            className="p-2 text-slate-400 hover:text-white"
            onClick={clearMediaState}
            title="Reset view settings"
          >
            <Icon name="RefreshCw" size="sm" />
          </button>
        </div>

        {/* Batch Actions */}
        {selectionMode && selectedIds.size > 0 && (
          <div className="flex items-center gap-2 bg-blue-900/50 px-3 py-1 rounded-lg border border-blue-700">
            <span className="text-xs text-blue-200">{selectedIds.size} selected</span>
            <button onClick={handleBatchDelete} className="p-1 hover:text-red-400 text-slate-300" title="Delete Selected">
              <Icon name="Trash2" size="sm" />
            </button>
            <button onClick={() => setSelectedIds(new Set())} className="p-1 hover:text-white text-slate-300" title="Clear Selection">
              <Icon name="X" size="sm" />
            </button>
          </div>
        )}

        <div className="flex items-center gap-3 overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
          {/* Upload & Select Tools */}
          <div className="flex items-center gap-1 bg-slate-900 rounded-lg border border-slate-700 p-1">
             <label className="p-1.5 text-slate-400 hover:text-white cursor-pointer" title="Upload Images">
               <Icon name="UploadCloud" size="sm" />
               <input type="file" multiple accept="image/*" className="hidden" onChange={handleUpload} />
             </label>
             <button
               className={`p-1.5 rounded ${selectionMode ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
               onClick={() => setSelectionMode(!selectionMode)}
               title="Select Mode"
             >
               <Icon name="CheckSquare" size="sm" />
             </button>
             {selectedAlbum && selectedAlbum !== EVIDENCE_ALBUM_ID && (
               <button
                 className="p-1.5 text-slate-400 hover:text-white"
                 onClick={handleExport}
                 title="Export Album"
               >
                 <Icon name="Download" size="sm" />
               </button>
             )}
          </div>
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value as any)}
            className="bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
          >
            <option value="date_added">Date Added</option>
            <option value="date_taken">Date Taken</option>
            <option value="filename">Name</option>
            <option value="file_size">Size</option>
            <option value="title">Title</option>
          </select>

          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="p-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-400 hover:text-white flex-shrink-0"
            title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>

          <div className="flex items-center gap-1 bg-slate-800 rounded p-1 mb-6">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-slate-700 text-blue-400' : 'text-slate-400 hover:text-slate-200'}`}
              title="Grid View"
            >
              <Icon name="Grid" size="xs" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-slate-700 text-blue-400' : 'text-slate-400 hover:text-slate-200'}`}
              title="List View"
            >
              <Icon name="List" size="xs" />
            </button>
            <div className="ml-auto text-xs text-slate-500 px-2">
              {filteredImages.length} items
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar - Responsive */}
        <aside className={`
          absolute md:relative z-10 h-full w-64 bg-slate-900/95 md:bg-slate-800/30 border-r border-slate-700 
          transition-transform duration-300 ease-in-out
          ${showSidebar ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          overflow-y-auto p-4 flex flex-col gap-6 backdrop-blur-md md:backdrop-blur-none
        `}>
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Libraries</h3>
            <div className="space-y-1">
              <button
                className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between group ${
                  selectedAlbum === EVIDENCE_ALBUM_ID ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'
                }`}
                onClick={() => {
                  setSelectedAlbum(EVIDENCE_ALBUM_ID);
                  setShowSidebar(false); // Close sidebar on mobile selection
                }}
              >
                <div className="flex items-center gap-2">
                  <Icon name="Shield" size="sm" />
                  <span>Evidence</span>
                </div>
              </button>
              <button
                className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between group ${
                  selectedAlbum === null ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'
                }`}
                onClick={() => {
                  setSelectedAlbum(null);
                  setShowSidebar(false);
                }}
              >
                <div className="flex items-center gap-2">
                  <Icon name="Image" size="sm" />
                  <span>All Photos</span>
                </div>
                <span className="text-xs bg-slate-900 px-2 py-0.5 rounded-full opacity-60">
                  {selectedAlbum === null ? images.length : ''}
                </span>
              </button>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Albums</h3>
            <div className="space-y-1">
              {albums.map((album) => (
                <button
                  key={album.id}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between group ${
                    selectedAlbum === album.id ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'
                  }`}
                  onClick={() => {
                    setSelectedAlbum(album.id);
                    setShowSidebar(false);
                  }}
                  title={album.name}
                >
                  <span className="truncate">
                    {album.name.includes('USVI') ? 'USVI' : album.name}
                  </span>
                  <span className="text-xs bg-slate-900 px-2 py-0.5 rounded-full opacity-60">
                    {album.imageCount || 0}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
             <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Filters & Actions</h3>
             <div className="space-y-4">
               {/* Camera Filter */}
               <div>
                  <label className="text-[10px] text-slate-400 mb-1 block">Camera Model</label>
                  <select 
                    value={cameraFilter}
                    onChange={(e) => setCameraFilter(e.target.value)}
                    className="w-full bg-slate-800 text-xs border border-slate-700 rounded px-2 py-1 text-slate-300 focus:outline-none focus:border-blue-500"
                  >
                    <option value="All">All Cameras</option>
                    {availableCameras.map(cam => (
                      <option key={cam} value={cam}>{cam}</option>
                    ))}
                  </select>
               </div>
               
               {/* GPS Filter */}
               <label className="flex items-center gap-2 cursor-pointer group">
                  <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${showGpsOnly ? 'bg-blue-600 border-blue-600' : 'border-slate-600 bg-slate-800'}`}>
                    {showGpsOnly && <Icon name="Check" size="xs" className="text-white" />}
                  </div>
                  <input type="checkbox" className="hidden" checked={showGpsOnly} onChange={e => setShowGpsOnly(e.target.checked)} />
                  <span className="text-xs text-slate-300 group-hover:text-white">Has GPS Location</span>
               </label>
               
               {/* Export Button */}
               <button
                  onClick={handleExportZip}
                  disabled={isExporting || filteredImages.length === 0}
                  className={`w-full flex items-center justify-center gap-2 py-2 px-3 rounded text-xs font-medium transition-colors ${
                    isExporting 
                      ? 'bg-slate-700 text-slate-400 cursor-not-allowed' 
                      : 'bg-blue-600 hover:bg-blue-500 text-white'
                  }`}
               >
                  {isExporting ? (
                    <>
                      <div className="animate-spin h-3 w-3 border-b-2 border-white rounded-full"></div>
                      <span>Zipping...</span>
                    </>
                  ) : (
                    <>
                      <Icon name="Download" size="xs" />
                      <span>Download {filteredImages.length} Images</span>
                    </>
                  )}
               </button>
             </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Future Features</h3>
            <div className="space-y-2">
              {futureFeatures.map((feature, idx) => (
                <div key={idx} className="flex items-start gap-3 p-2 rounded-lg bg-slate-800/50 border border-slate-700/50 opacity-75 hover:opacity-100 transition-opacity cursor-help" title="Coming Soon">
                  <feature.icon className="h-4 w-4 text-blue-400 mt-0.5" />
                  <div>
                    <div className="text-xs font-medium text-slate-300">{feature.name}</div>
                    <div className="text-[10px] text-slate-500">{feature.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
        
        {/* Overlay for mobile sidebar */}
        {showSidebar && (
          <div 
            className="absolute inset-0 bg-black/50 z-0 md:hidden backdrop-blur-sm"
            onClick={() => setShowSidebar(false)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-900/50">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : filteredImages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
              <Icon name="Image" className="h-16 w-16 mb-4 opacity-20" />
              <p>No images found {searchQuery && 'matching search'}</p>
            </div>
          ) : (
            <div className={viewMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4' : 'space-y-2'}>
              {filteredImages.map((image) => (
                <div
                  key={image.id}
                  className={`group bg-slate-800 border border-slate-700 rounded-lg overflow-hidden hover:border-blue-500 transition-all cursor-pointer relative ${
                    viewMode === 'list' ? 'flex items-center gap-4 p-2' : ''
                  } ${selectionMode && selectedIds.has(image.id) ? 'ring-2 ring-blue-500' : ''}`}
                  onClick={() => {
                    if (selectionMode) {
                      toggleSelection(image.id);
                    } else {
                      openSlideshow(images.indexOf(image));
                    }
                  }}
                >
                  {selectionMode && (
                    <div className="absolute top-2 left-2 z-10">
                      <div className={`w-5 h-5 rounded border ${selectedIds.has(image.id) ? 'bg-blue-500 border-blue-500' : 'bg-black/50 border-white/50'}`}>
                        {selectedIds.has(image.id) && <Icon name="CheckSquare" size="sm" className="w-4 h-4 text-white m-0.5" />}
                      </div>
                    </div>
                  )}
                  <div className={`relative bg-slate-900 ${viewMode === 'grid' ? 'aspect-square' : 'h-16 w-16 flex-shrink-0'}`}>
                    {image.format?.toLowerCase() === 'application/pdf' || image.path?.toLowerCase().endsWith('.pdf') ? (
                      <div className="w-full h-full flex items-center justify-center bg-blue-900/50">
                        <Icon name="FileText" className="h-1/2 w-1/2 text-blue-300" />
                      </div>
                    ) : (
                      <img
                        src={selectedAlbum === EVIDENCE_ALBUM_ID ? `/api/evidence/media/${image.id}/file` : `/api/media/images/${image.id}/file`}
                        alt={image.title || image.filename}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    )}
                    {image.verificationStatus && (
                      <div className="absolute top-1 right-1">
                        {image.verificationStatus === 'verified' && <div className="w-2 h-2 bg-green-500 rounded-full shadow-lg ring-1 ring-black/50" />}
                      </div>
                    )}
                  </div>

                  <div className={`p-3 ${viewMode === 'list' ? 'flex-1 flex items-center justify-between' : ''}`}>
                    <div className="min-w-0">
                      <h4 className="text-sm font-medium text-white truncate mb-1" title={image.filename}>
                        {generateDisplayTitle(image.filename, image.title, image.description)}
                      </h4>
                      {viewMode === 'list' && (
                        <p className="text-xs text-slate-400 truncate max-w-md">{image.description}</p>
                      )}
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>{formatFileSize(image.fileSize)}</span>
                        {image.spiceRating !== undefined && (
                          <div className="flex items-center gap-1 pl-2 border-l border-slate-700">
                            {getSpiceStars(image.spiceRating)}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {viewMode === 'list' && (
                      <div className="flex items-center gap-4 text-xs text-slate-400">
                         <span>{formatDate(image.dateAdded)}</span>
                         {image.tags && (
                           <div className="flex gap-1">
                             {image.tags.slice(0, 3).map((tag, i) => (
                               <span key={i} className="bg-slate-700 px-1.5 py-0.5 rounded">{tag}</span>
                             ))}
                           </div>
                         )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

      </div>

      {/* Drag Drop Overlay */}
      {isDragging && (
        <div 
          className="absolute inset-0 bg-blue-500/20 backdrop-blur-sm z-50 flex items-center justify-center border-4 border-blue-500 border-dashed m-4 rounded-xl"
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleUpload}
          onDragOver={(e) => e.preventDefault()}
        >
          <div className="text-white text-xl font-bold flex flex-col items-center">
            <Icon name="UploadCloud" className="h-16 w-16 mb-4" />
            Drop images to upload
          </div>
        </div>
      )}

      {/* Slideshow Modal */}
      {isSlideshowOpen && (
        <div className="fixed inset-0 bg-black z-[60] flex items-center justify-center">
          <button 
            className="absolute top-4 right-4 text-white/70 hover:text-white z-50 p-2"
            onClick={() => setIsSlideshowOpen(false)}
          >
            <Icon name="X" size="lg" />
          </button>
          
          <button 
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white p-4"
            onClick={(e) => { e.stopPropagation(); prevSlide(); }}
          >
            <Icon name="ChevronLeft" size="lg" />
          </button>

          <button 
            className="absolute right-4 top-1/2 -translate-y-1/2 text-white/50 hover:text-white p-4"
            onClick={(e) => { e.stopPropagation(); nextSlide(); }}
          >
            <Icon name="ChevronRight" size="lg" />
          </button>

          <div className="w-full h-full flex items-center justify-center p-4" onClick={() => setIsSlideshowOpen(false)}>
            {images[slideshowIndex]?.format?.toLowerCase() === 'application/pdf' || images[slideshowIndex]?.path?.toLowerCase().endsWith('.pdf') ? (
              <div className="text-white p-4">
                <Icon name="FileText" className="h-16 w-16 mx-auto mb-4" />
                <p className="text-center">PDF Document: {images[slideshowIndex]?.title || images[slideshowIndex]?.filename}</p>
                <p className="text-center text-sm text-gray-300 mt-2">Click "View Details" to open PDF viewer</p>
              </div>
            ) : (
              <img
                src={selectedAlbum === EVIDENCE_ALBUM_ID ? `/api/evidence/media/${images[slideshowIndex]?.id}/file` : `/api/media/images/${images[slideshowIndex]?.id}/file`}
                alt={images[slideshowIndex]?.title}
                className="max-w-full max-h-full object-contain"
                onClick={(e) => e.stopPropagation()}
              />
            )}
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent text-white">
            <div className="max-w-4xl mx-auto text-center">
              <h3 className="text-lg font-medium">{images[slideshowIndex]?.title || images[slideshowIndex]?.filename}</h3>
              <p className="text-sm text-gray-300">{slideshowIndex + 1} / {images.length}</p>
              <button 
                className="mt-2 text-xs text-blue-400 hover:text-blue-300"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsSlideshowOpen(false);
                  setSelectedImage(images[slideshowIndex]); // Open details modal
                }}
              >
                View Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedImage(null)}
        >
          <div
            className="bg-slate-800 rounded-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col md:flex-row"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Content Area */}
            <div className="flex-1 bg-black flex items-center justify-center p-4 min-h-[400px]">
              {selectedImage.format?.toLowerCase() === 'application/pdf' || selectedImage.path?.toLowerCase().endsWith('.pdf') ? (
                <div className="w-full h-full">
                  <PDFViewer 
                    filePath={selectedImage.path}
                    title={selectedImage.title || selectedImage.filename}
                  />
                </div>
              ) : (
                <img
                  src={selectedAlbum === EVIDENCE_ALBUM_ID ? `/api/evidence/media/${selectedImage.id}/file` : `/api/media/images/${selectedImage.id}/file`}
                  alt={selectedImage.title || selectedImage.filename}
                  className="max-w-full max-h-full object-contain"
                />
              )}
            </div>

            {/* Sidebar Info - Professional Metadata Panel */}
            <div className="w-full md:w-96 bg-slate-800 border-l border-slate-700 overflow-y-auto">
              {/* Header with generated title */}
              <div className="p-4 border-b border-slate-700 bg-slate-900/50">
                <div className="flex justify-between items-start">
                  <div className="flex-1 min-w-0 mr-3">
                    <h2 className="text-lg font-bold text-white leading-tight mb-1">
                      {generateDisplayTitle(selectedImage.filename, selectedImage.title, selectedImage.description)}
                    </h2>
                    <p className="text-xs text-slate-500 truncate" title={selectedImage.filename}>
                      {selectedImage.filename}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <AddToInvestigationButton 
                      item={{
                        id: selectedImage.id.toString(),
                        title: generateDisplayTitle(selectedImage.filename, selectedImage.title, selectedImage.description),
                        description: selectedImage.description || 'Media evidence',
                        type: 'evidence',
                        sourceId: selectedImage.id.toString()
                      }}
                      investigations={[]}
                      onAddToInvestigation={(invId, item, relevance) => {
                        console.log('Add to investigation', invId, item, relevance);
                        const event = new CustomEvent('add-to-investigation', { 
                          detail: { investigationId: invId, item, relevance } 
                        });
                        window.dispatchEvent(event);
                      }}
                      variant="icon"
                      className="hover:bg-slate-700"
                    />
                    <button
                      onClick={() => setSelectedImage(null)}
                      className="text-slate-400 hover:text-white p-1"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-4 space-y-4">
                {/* Description */}
                {selectedImage.description && (
                  <div className="p-3 bg-slate-700/30 rounded-lg">
                    <p className="text-sm text-slate-300">{selectedImage.description}</p>
                  </div>
                )}

                {/* Analysis Status */}
                {(selectedImage.verificationStatus || selectedImage.spiceRating !== undefined) && (
                  <div className="p-3 bg-slate-700/30 rounded-lg space-y-2">
                    {selectedImage.verificationStatus && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-400">Verification</span>
                        {getVerificationBadge(selectedImage.verificationStatus)}
                      </div>
                    )}
                    {selectedImage.spiceRating !== undefined && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-400">Red Flag Index</span>
                        {getSpiceStars(selectedImage.spiceRating)}
                      </div>
                    )}
                  </div>
                )}

                {/* File Details Section */}
                <div>
                  <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <FileImage className="w-4 h-4 text-blue-400" />
                    File Details
                  </h3>
                  <div className="space-y-2 text-sm bg-slate-700/20 rounded-lg p-3">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Original Name</span>
                      <span className="text-slate-200 font-mono text-xs truncate max-w-[180px]" title={selectedImage.filename}>
                        {selectedImage.filename}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">File Size</span>
                      <span className="text-slate-200">{formatFileSize(selectedImage.fileSize)}</span>
                    </div>
                    {selectedImage.width && selectedImage.height && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Dimensions</span>
                        <span className="text-slate-200">{selectedImage.width} × {selectedImage.height}px</span>
                      </div>
                    )}
                    {selectedImage.format && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Format</span>
                        <span className="text-slate-200 uppercase">{selectedImage.format}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-400">Date Added</span>
                      <span className="text-slate-200">{formatDate(selectedImage.dateAdded)}</span>
                    </div>
                    {selectedImage.dateTaken && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Date Taken</span>
                        <span className="text-slate-200">{formatDate(selectedImage.dateTaken)}</span>
                      </div>
                    )}
                    {selectedImage.albumName && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Album</span>
                        <span className="text-slate-200">{selectedImage.albumName}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* EXIF / Camera Data Section */}
                {(selectedImage.cameraMake || selectedImage.cameraModel || selectedImage.lens || 
                  selectedImage.focalLength || selectedImage.aperture || selectedImage.shutterSpeed || 
                  selectedImage.iso) && (
                  <div>
                    <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                      <Camera className="w-4 h-4 text-purple-400" />
                      Camera & EXIF Data
                    </h3>
                    <div className="space-y-2 text-sm bg-slate-700/20 rounded-lg p-3">
                      {selectedImage.cameraMake && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Camera Make</span>
                          <span className="text-slate-200">{selectedImage.cameraMake}</span>
                        </div>
                      )}
                      {selectedImage.cameraModel && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Camera Model</span>
                          <span className="text-slate-200">{selectedImage.cameraModel}</span>
                        </div>
                      )}
                      {selectedImage.lens && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Lens</span>
                          <span className="text-slate-200">{selectedImage.lens}</span>
                        </div>
                      )}
                      {selectedImage.focalLength && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Focal Length</span>
                          <span className="text-slate-200">{selectedImage.focalLength}</span>
                        </div>
                      )}
                      {selectedImage.aperture && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Aperture</span>
                          <span className="text-slate-200">ƒ/{selectedImage.aperture}</span>
                        </div>
                      )}
                      {selectedImage.shutterSpeed && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Shutter Speed</span>
                          <span className="text-slate-200">{selectedImage.shutterSpeed}</span>
                        </div>
                      )}
                      {selectedImage.iso && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">ISO</span>
                          <span className="text-slate-200">{selectedImage.iso}</span>
                        </div>
                      )}
                      {selectedImage.colorProfile && (
                        <div className="flex justify-between">
                          <span className="text-slate-400">Color Profile</span>
                          <span className="text-slate-200">{selectedImage.colorProfile}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* GPS Location Section */}
                {selectedImage.latitude && selectedImage.longitude && (
                  <div>
                    <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-green-400" />
                      Location
                    </h3>
                    <div className="space-y-2 text-sm bg-slate-700/20 rounded-lg p-3">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Coordinates</span>
                        <span className="text-slate-200 font-mono text-xs">
                          {selectedImage.latitude.toFixed(6)}, {selectedImage.longitude.toFixed(6)}
                        </span>
                      </div>
                      <a 
                        href={`https://www.google.com/maps?q=${selectedImage.latitude},${selectedImage.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 mt-2 px-3 py-2 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-lg text-xs transition-colors"
                      >
                        <MapPin className="w-3 h-3" />
                        View on Map
                      </a>
                    </div>
                  </div>
                )}

                {/* Related Entities */}
                {selectedImage.relatedEntities && selectedImage.relatedEntities.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                      <Icon name="Users" size="sm" className="text-cyan-400" />
                      Related Entities
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedImage.relatedEntities.map((entity, i) => (
                        <span key={i} className="px-2 py-1 bg-cyan-900/30 text-cyan-300 rounded text-xs border border-cyan-800/50">
                          {entity}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tags */}
                {selectedImage.tags && selectedImage.tags.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                      <Icon name="Tag" size="sm" className="text-amber-400" />
                      Tags
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedImage.tags.map((tag, i) => (
                        <span key={i} className="px-2 py-1 bg-amber-900/30 text-amber-300 rounded text-xs border border-amber-800/50">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EvidenceMedia;