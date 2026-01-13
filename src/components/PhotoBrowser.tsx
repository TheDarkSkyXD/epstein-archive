import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  FixedSizeGrid as Grid,
  FixedSizeList as List,
  GridChildComponentProps,
  ListChildComponentProps,
  areEqual,
} from 'react-window';
import AutoSizer from './AutoSizer';
import { MediaImage, Album } from '../types/media.types';
import Icon from './Icon';
import MediaViewerModal from './MediaViewerModal';
import BatchToolbar from './BatchToolbar';
import LazyImage from './LazyImage';
import { SensitiveContent } from './SensitiveContent';

interface PhotoBrowserProps {
  onImageClick?: (image: MediaImage) => void;
}

type ViewMode = 'grid' | 'list';
type SortField = 'date_added' | 'date_taken' | 'filename' | 'file_size' | 'title';
type SortOrder = 'asc' | 'desc';

// --- Virtualized Renderers ---

interface ItemData {
  images: MediaImage[];
  selectedImages: Set<number>;
  isBatchMode: boolean;
  onImageClick: (image: MediaImage, index: number, event: React.MouseEvent) => void;
  onToggleSelection: (imageId: number, index: number, event: React.MouseEvent) => void;
  columnCount?: number;
  formatDate: (d: string | undefined | null) => string;
  formatFileSize: (b: number | string | undefined) => string;
}

const GridCell = React.memo(
  ({ columnIndex, rowIndex, style, data }: GridChildComponentProps<ItemData>) => {
    const {
      images,
      selectedImages,
      isBatchMode,
      onImageClick,
      onToggleSelection,
      columnCount = 1,
      formatDate,
      formatFileSize,
    } = data;
    const index = rowIndex * columnCount + columnIndex;

    // Handle empty cells in the last row
    if (index >= images.length) return null;

    const img = images[index];
    const isSelected = selectedImages.has(img.id);

    return (
      <div style={{ ...style, padding: '4px' }}>
        <button
          className={`w-full h-full group relative bg-black border rounded-lg overflow-hidden transition-all shadow-lg hover:shadow-cyan-900/20 ${isSelected ? 'border-cyan-500 ring-2 ring-cyan-500/30' : 'border-slate-800 hover:border-cyan-500/50'}`}
          onClick={(e) => onImageClick(img, index, e)}
          onKeyDown={(e) => {
            if (isBatchMode && e.key === 'Enter') {
              onToggleSelection(img.id, index, e as any);
            }
          }}
          tabIndex={isBatchMode ? 0 : -1}
        >
          {/* Selection indicator */}
          {isBatchMode && (
            <div className="absolute top-2 left-2 w-6 h-6 flex items-center justify-center rounded-full bg-cyan-500 text-white text-xs font-bold z-10">
              {isSelected ? '✓' : index + 1}
            </div>
          )}
          <SensitiveContent isSensitive={img.isSensitive} className="w-full h-full relative">
            <LazyImage
              src={`/api/media/images/${img.id}/thumbnail?v=${new Date(img.dateModified || img.dateAdded || 0).getTime()}`}
              alt={img.title}
              className="w-full h-full object-contain bg-slate-900/50"
            />
          </SensitiveContent>
          {/* Title overlay */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-3 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
            <div className="text-xs text-white font-medium truncate" title={img.title}>
              {img.title}
            </div>
            <div className="text-[10px] text-slate-400 flex justify-between mt-1">
              <span>{formatDate(img.dateTaken)}</span>
              <span>{formatFileSize(img.fileSize)}</span>
            </div>
          </div>
        </button>
      </div>
    );
  },
  areEqual,
);

const ListRow = React.memo(({ index, style, data }: ListChildComponentProps<ItemData>) => {
  const {
    images,
    selectedImages,
    isBatchMode,
    onImageClick,
    onToggleSelection,
    formatDate,
    formatFileSize,
  } = data;
  const img = images[index];
  const isSelected = selectedImages.has(img.id);

  return (
    <div style={style}>
      <button
        className={`flex items-center gap-4 p-2 border-b border-slate-800/50 w-full text-left group transition-colors h-full ${isSelected ? 'bg-cyan-900/20 border-cyan-500/30' : 'hover:bg-slate-900'}`}
        onClick={(e) => onImageClick(img, index, e)}
        onKeyDown={(e) => {
          if (isBatchMode && e.key === 'Enter') {
            onToggleSelection(img.id, index, e as any);
          }
        }}
        tabIndex={isBatchMode ? 0 : -1}
      >
        {/* Selection indicator */}
        {isBatchMode && (
          <div className="w-6 h-6 flex items-center justify-center rounded-full bg-cyan-500 text-white text-xs font-bold mr-2">
            {isSelected ? '✓' : index + 1}
          </div>
        )}
        <div className="w-12 h-12 bg-black border border-slate-800 rounded flex items-center justify-center shrink-0">
          <SensitiveContent isSensitive={img.isSensitive} className="w-full h-full">
            <LazyImage
              src={`/api/media/images/${img.id}/thumbnail?v=${new Date(img.dateModified || img.dateAdded || 0).getTime()}`}
              alt={img.title}
              className="w-full h-full object-contain"
            />
          </SensitiveContent>
        </div>
        <div className="flex-1 min-w-0">
          <div
            className="text-sm text-slate-300 font-medium truncate group-hover:text-cyan-400 transition-colors"
            title={img.title}
          >
            {img.title}
          </div>
          <div className="text-xs text-slate-500 truncate">
            {img.title !== img.filename ? img.filename : ''}
          </div>
        </div>

        <div className="w-32 text-xs text-slate-500 text-right shrink-0">
          {formatDate(img.dateTaken || img.dateAdded)}
        </div>
        <div className="w-20 text-xs text-slate-500 text-right shrink-0 font-mono">
          {formatFileSize(img.fileSize)}
        </div>
      </button>
    </div>
  );
}, areEqual);

export const PhotoBrowser: React.FC<PhotoBrowserProps> = React.memo(({ onImageClick }) => {
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
  const [hasPeopleOnly, setHasPeopleOnly] = useState(false); // Filter: Has people
  const [availableTags, setAvailableTags] = useState<any[]>([]);
  const [availablePeople, setAvailablePeople] = useState<any[]>([]);

  // Batch selection state
  const [selectedImages, setSelectedImages] = useState<Set<number>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [isBatchMode, setIsBatchMode] = useState(false);

  // Undo stack for batch operations
  const [undoStack, setUndoStack] = useState<
    Array<{ action: string; imageIds: number[]; prevState: MediaImage[] }>
  >([]);

  // Track if URL params have been initialized
  const [initialized, setInitialized] = useState(false);

  // Initialize from URL - runs first
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const albumId = params.get('albumId');
    const tagId = params.get('tagId');
    const personId = params.get('personId');
    const hasPeople = params.get('hasPeople');

    if (albumId) setSelectedAlbum(parseInt(albumId));
    if (tagId) setSelectedTag(parseInt(tagId));
    if (personId) setSelectedPerson(parseInt(personId));
    if (hasPeople === 'true') setHasPeopleOnly(true);

    // Mark as initialized after URL params are processed
    setInitialized(true);
  }, []);

  // Load available tags and people
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const [tagsRes, peopleRes] = await Promise.all([
          fetch('/api/media/tags'),
          fetch('/api/entities/all'),
        ]);

        if (tagsRes.ok) {
          const tags = await tagsRes.json();
          setAvailableTags(tags);
        }

        if (peopleRes.ok) {
          const people = await peopleRes.json();
          setAvailablePeople(people);
        }
      } catch (error) {
        console.error('Failed to load filters:', error);
      }
    };
    loadFilters();
  }, []);

  useEffect(() => {
    loadAlbums();
  }, []);

  // Sync URL with filters and load images - only after initialized
  useEffect(() => {
    if (!initialized) return; // Don't run until URL params are parsed

    const url = new URL(window.location.href);

    if (selectedAlbum) url.searchParams.set('albumId', selectedAlbum.toString());
    else url.searchParams.delete('albumId');

    if (selectedTag) url.searchParams.set('tagId', selectedTag.toString());
    else url.searchParams.delete('tagId');

    if (selectedPerson) url.searchParams.set('personId', selectedPerson.toString());
    else url.searchParams.delete('personId');

    if (hasPeopleOnly) url.searchParams.set('hasPeople', 'true');
    else url.searchParams.delete('hasPeople');

    window.history.replaceState({}, '', url);
    loadImages();
  }, [initialized, selectedAlbum, selectedTag, selectedPerson, hasPeopleOnly]);

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
    if (!initialized) return; // Don't run until URL params are parsed
    loadImages();
  }, [initialized, sortField, sortOrder, searchQuery]);

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
      if (hasPeopleOnly) params.append('hasPeople', 'true');
      if (sortField) params.append('sortField', sortField);
      if (sortOrder) params.append('sortOrder', sortOrder);
      if (searchQuery) params.append('search', searchQuery);

      // Request slim response for faster grid view loading
      params.append('slim', 'true');

      params.append('_t', Date.now().toString()); // Cache busting
      const response = await fetch(`/api/media/images?${params}`);
      const data = await response.json();
      const normalized: MediaImage[] = Array.isArray(data)
        ? data.map((img: any) => ({
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
            isSensitive: Boolean(img.isSensitive),
            latitude: img.latitude,
            longitude: img.longitude,
          }))
        : [];
      setImages(normalized);

      // Check for photoId deep link
      const urlParams = new URLSearchParams(window.location.search);
      const photoId = urlParams.get('photoId');
      if (photoId) {
        const index = normalized.findIndex((img) => img.id.toString() === photoId);
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
    let newSelectedImages = new Set(selectedImages);

    if (event.shiftKey && lastSelectedIndex !== null) {
      // Shift+click: Select range (add to existing selection)
      const start = Math.min(lastSelectedIndex, index);
      const end = Math.max(lastSelectedIndex, index);
      for (let i = start; i <= end; i++) {
        newSelectedImages.add(images[i].id);
      }
    } else if (event.ctrlKey || event.metaKey) {
      // Ctrl/Cmd+click: Toggle selection (add/remove from existing)
      if (newSelectedImages.has(imageId)) {
        newSelectedImages.delete(imageId);
      } else {
        newSelectedImages.add(imageId);
      }
      setLastSelectedIndex(index);
    } else {
      // Regular click: If in batch mode, deselect all and select only this one
      if (isBatchMode) {
        newSelectedImages = new Set([imageId]);
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
    const allImageIds = new Set(images.map((img) => img.id));
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

  // Handle grid container click (for click-outside-to-deselect)
  const handleGridClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only clear selection if in batch mode and clicked directly on the grid container (not an image)
    if (isBatchMode && e.target === e.currentTarget) {
      clearSelection();
    }
  };

  // Undo the last batch operation
  const handleUndo = () => {
    if (undoStack.length === 0) return;

    const lastAction = undoStack[undoStack.length - 1];

    // Restore previous state
    const updatedImages = [...images];
    for (const prevImg of lastAction.prevState) {
      const index = updatedImages.findIndex((img) => img.id === prevImg.id);
      if (index !== -1) {
        updatedImages[index] = prevImg;
      }
    }
    setImages(updatedImages);

    // Remove from undo stack
    setUndoStack((prev) => prev.slice(0, -1));

    console.log(`Undid ${lastAction.action} on ${lastAction.imageIds.length} images`);
  };

  const handleBatchRotate = async (direction: 'left' | 'right') => {
    if (selectedImages.size === 0) return;

    // Save state for undo
    const affectedImageIds = Array.from(selectedImages);
    const prevState = images.filter((img) => selectedImages.has(img.id)).map((img) => ({ ...img }));

    try {
      const response = await fetch('/api/media/images/batch/rotate', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageIds: affectedImageIds,
          direction,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to batch rotate images');
      }

      const { results } = await response.json();

      // Push to undo stack
      setUndoStack((prev) => [
        ...prev.slice(-9),
        { action: `rotate-${direction}`, imageIds: affectedImageIds, prevState },
      ]);

      // Update images with rotated versions
      const updatedImages = [...images];
      for (const result of results) {
        if (result.success) {
          const index = updatedImages.findIndex((img) => img.id === result.id);
          if (index !== -1) {
            // Normalize backend response to match frontend model
            const raw = result.image;
            const normalizedUpdate = {
              ...raw,
              dateModified: raw.date_modified || raw.dateModified,
              width: raw.width,
              height: raw.height,
              orientation: raw.orientation,
            };
            updatedImages[index] = { ...updatedImages[index], ...normalizedUpdate };
          }
        }
      }
      setImages(updatedImages);

      // Show success message
      console.log(`Successfully rotated ${results.filter((r: any) => r.success).length} images`);
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
          rating,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to batch rate images');
      }

      const { results } = await response.json();

      // Update images with new ratings
      const updatedImages = [...images];
      for (const result of results) {
        if (result.success) {
          const index = updatedImages.findIndex((img) => img.id === result.id);
          if (index !== -1) {
            updatedImages[index] = { ...updatedImages[index], rating };
          }
        }
      }
      setImages(updatedImages);

      // Show success message
      console.log(`Successfully tagged ${results.filter((r: any) => r.success).length} images`);
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
          action,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to batch ${action} tags`);
      }

      const { results } = await response.json();

      // For simplicity, we're not updating the UI with tag changes
      // In a real implementation, we might want to refetch tags for affected images

      // Show success message
      console.log(
        `Successfully ${action}ed tags to ${results.filter((r: any) => r.success).length} images`,
      );
    } catch (error) {
      console.error(`Error batch ${action}ing tags:`, error);
      alert(`Failed to ${action} tags`);
    }
  };

  const handleBatchPeople = async (entityIds: number[], action: 'add' | 'remove') => {
    if (selectedImages.size === 0) return;

    try {
      const response = await fetch('/api/media/images/batch/people', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageIds: Array.from(selectedImages),
          entityIds,
          action,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to batch ${action} people`);
      }

      const { results } = await response.json();

      // For simplicity, we're not updating the UI with people changes
      // In a real implementation, we might want to refetch people for affected images

      // Show success message
      console.log(
        `Successfully tagged people for ${results.filter((r: any) => r.success).length} images`,
      );
    } catch (error) {
      console.error(`Error batch ${action}ing people:`, error);
      alert(`Failed to ${action} people`);
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
          updates,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to batch update metadata');
      }

      const { results } = await response.json();

      // Update images with new metadata
      const updatedImages = [...images];
      for (const result of results) {
        if (result.success) {
          const index = updatedImages.findIndex((img) => img.id === result.id);
          if (index !== -1) {
            updatedImages[index] = { ...updatedImages[index], ...updates };
          }
        }
      }
      setImages(updatedImages);

      // Show success message
      console.log(
        `Successfully updated metadata for ${results.filter((r: any) => r.success).length} images`,
      );
    } catch (error) {
      console.error('Error batch updating metadata:', error);
      alert('Failed to update metadata');
    }
  };

  const formatFileSize = (bytes: number | string | undefined): string => {
    const numBytes = Number(bytes);
    if (bytes === undefined || bytes === null || bytes === '' || !Number.isFinite(numBytes))
      return 'Unknown';
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
        day: 'numeric',
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
            className="w-full flex items-center justify-between px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm h-8"
          >
            <span className="flex items-center gap-2">
              <Icon name="Folder" size="sm" />
              {selectedAlbum ? albums.find((a) => a.id === selectedAlbum)?.name : 'All Photos'}
            </span>
            <Icon name={showAlbumDropdown ? 'ChevronUp' : 'ChevronDown'} size="sm" />
          </button>
          {showAlbumDropdown && (
            <div className="absolute left-3 right-3 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-30 max-h-60 overflow-y-auto">
              <button
                className={`w-full px-4 py-3 text-left text-sm flex items-center justify-between ${selectedAlbum === null ? 'bg-cyan-900/20 text-cyan-400' : 'text-slate-300 hover:bg-slate-700'}`}
                onClick={() => {
                  setSelectedAlbum(null);
                  setShowAlbumDropdown(false);
                }}
              >
                <span>All Photos</span>
                <span className="text-xs opacity-70">{images.length}</span>
              </button>
              {albums.map((album) => (
                <button
                  key={album.id}
                  className={`w-full px-4 py-3 text-left text-sm flex items-center justify-between border-t border-slate-700/50 ${selectedAlbum === album.id ? 'bg-cyan-900/20 text-cyan-400' : 'text-slate-300 hover:bg-slate-700'}`}
                  onClick={() => {
                    setSelectedAlbum(album.id);
                    setShowAlbumDropdown(false);
                  }}
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
            <Icon
              name="Search"
              size="sm"
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
            />
            <input
              type="text"
              placeholder="Search images..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg text-slate-200 pl-9 pr-3 py-2 md:py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500 placeholder-slate-500 transition-all h-8"
            />
          </div>
          {/* Mobile share button */}
          <button
            onClick={handleShare}
            className="md:hidden flex items-center justify-center w-10 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:text-white h-8"
          >
            {showCopied ? (
              <Icon name="Check" size="sm" className="text-green-500" />
            ) : (
              <Icon name="Share2" size="sm" />
            )}
          </button>
        </div>

        {/* Desktop Sort and View Controls - Hidden on mobile */}
        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded text-xs transition-colors h-8"
          >
            {showCopied ? (
              <Icon name="Check" size="sm" className="text-green-500" />
            ) : (
              <Icon name="Share2" size="sm" />
            )}
            Share
          </button>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <select
              value={selectedTag || ''}
              onChange={(e) => setSelectedTag(e.target.value ? parseInt(e.target.value) : null)}
              className="bg-slate-800 border border-slate-700 rounded text-slate-300 text-xs px-2 py-1 focus:outline-none focus:border-cyan-500 h-8 max-w-[100px]"
            >
              <option value="">All Tags</option>
              {availableTags.map((tag) => (
                <option key={tag.id} value={tag.id}>
                  {tag.name}
                </option>
              ))}
            </select>

            <select
              value={selectedPerson || ''}
              onChange={(e) => setSelectedPerson(e.target.value ? parseInt(e.target.value) : null)}
              className="bg-slate-800 border border-slate-700 rounded text-slate-300 text-xs px-2 py-1 focus:outline-none focus:border-cyan-500 h-8 max-w-[100px]"
            >
              <option value="">All People</option>
              {availablePeople.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <button
              onClick={() => setHasPeopleOnly(!hasPeopleOnly)}
              className={`flex items-center gap-2 px-3 py-1.5 border rounded text-xs transition-colors h-8 ${hasPeopleOnly ? 'bg-cyan-900/50 border-cyan-500 text-cyan-400' : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'}`}
              title="Show only images with people"
            >
              <Icon name="Users" size="sm" />
            </button>
          </div>

          <div className="w-px h-6 bg-slate-700 mx-1"></div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Sort by:</span>
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as SortField)}
              className="bg-slate-800 border border-slate-700 rounded text-slate-300 text-xs px-2 py-1 focus:outline-none focus:border-cyan-500 h-8"
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

          <div className="flex bg-slate-800 p-0.5 rounded border border-slate-700 h-8">
            <button
              className={`w-8 h-full flex items-center justify-center rounded ${viewMode === 'grid' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'}`}
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >
              <Icon name="Grid" size="sm" />
            </button>
            <button
              className={`w-8 h-full flex items-center justify-center rounded ${viewMode === 'list' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'}`}
              onClick={() => setViewMode('list')}
              title="List View"
            >
              <Icon name="List" size="sm" />
            </button>
          </div>

          {/* Batch Mode Toggle */}
          <button
            onClick={isBatchMode ? exitBatchMode : enterBatchMode}
            className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-medium transition-colors ${isBatchMode ? 'bg-cyan-600 hover:bg-cyan-500 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700'} h-8`}
          >
            <Icon name="CheckSquare" size="sm" />
            {isBatchMode ? 'Exit Batch Mode' : 'Batch Edit'}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Albums sidebar - Hidden on mobile */}
        <aside className="hidden md:flex w-60 bg-slate-900 border-r border-slate-800 flex-col shrink-0">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-4 py-3">
            Albums
          </h3>
          <div className="flex-1 overflow-y-auto">
            <button
              className={`w-full px-4 py-2 text-left text-sm flex items-center justify-between transition-colors ${selectedAlbum === null ? 'bg-cyan-900/20 text-cyan-400 border-l-2 border-cyan-400' : 'text-slate-400 hover:bg-slate-800 hover:text-white border-l-2 border-transparent'}`}
              onClick={() => setSelectedAlbum(null)}
            >
              <span className="truncate">All Photos</span>
              <span className="text-xs opacity-70 bg-slate-800 px-1.5 py-0.5 rounded-full">
                {images.length}
              </span>
            </button>
            {albums.map((album) => (
              <button
                key={album.id}
                className={`w-full px-4 py-2 text-left text-sm flex items-center justify-between transition-colors ${selectedAlbum === album.id ? 'bg-cyan-900/20 text-cyan-400 border-l-2 border-cyan-400' : 'text-slate-400 hover:bg-slate-800 hover:text-white border-l-2 border-transparent'}`}
                onClick={() => setSelectedAlbum(album.id)}
                title={album.name}
              >
                <span className="truncate">{album.name}</span>
                <span className="text-xs opacity-70 bg-slate-800 px-1.5 py-0.5 rounded-full">
                  {album.imageCount || 0}
                </span>
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

          {/* Warning Banner for Fake/Unconfirmed Albums */}
          {selectedAlbum &&
            albums.find((a) => a.id === selectedAlbum)?.name.match(/Fake|Unconfirmed/i) && (
              <div className="bg-red-900/80 border-b border-red-700 px-4 py-3 flex items-start gap-3">
                <Icon name="AlertTriangle" className="text-red-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-red-200 font-bold text-sm uppercase tracking-wider">
                    {albums.find((a) => a.id === selectedAlbum)?.name.includes('Fake')
                      ? 'Confirmed Fake Media'
                      : 'Unconfirmed / Unverified Content'}
                  </h4>
                  <p className="text-red-300/90 text-sm mt-1">
                    {albums.find((a) => a.id === selectedAlbum)?.name.includes('Fake')
                      ? 'These images have been confirmed as AI-generated or photoshopped. They are distributed to spread misinformation and discredit survivors. Viewing them may be harmful.'
                      : 'These images currently lack provenance or verification. Treat with extreme caution as they may be manipulated or out of context.'}
                  </p>
                </div>
              </div>
            )}

          {/* Active Filters */}
          {(selectedTag || selectedPerson) && (
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-900 border-b border-slate-800">
              <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                Filtered by:
              </span>

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
                onClick={() => {
                  setSelectedTag(null);
                  setSelectedPerson(null);
                }}
                className="text-xs text-slate-500 hover:text-slate-400 ml-auto"
              >
                Clear all
              </button>
            </div>
          )}

          <div className="flex-1 overflow-hidden relative bg-slate-950" onClick={handleGridClick}>
            {!loading && images.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <Icon name="Image" size="lg" className="mb-2 opacity-50" />
                <p>No images found</p>
              </div>
            ) : (
              <AutoSizer>
                {({ width, height }) => {
                  if (viewMode === 'grid') {
                    const minColumnWidth = 200;
                    const gap = 16; // gap-4
                    const availableWidth = width - 32; // p-4 equivalent padding
                    const columnCount = Math.max(
                      1,
                      Math.floor((availableWidth + gap) / (minColumnWidth + gap)),
                    );
                    const columnWidth = (availableWidth - gap * (columnCount - 1)) / columnCount;
                    const rowCount = Math.ceil(images.length / columnCount);
                    // Aspect ratio 3:2 roughly plus padding
                    const rowHeight = columnWidth / 1.5 + 8;

                    const itemData = {
                      images,
                      selectedImages,
                      isBatchMode,
                      onImageClick: handleImageClick,
                      onToggleSelection: toggleImageSelection,
                      columnCount,
                      formatDate,
                      formatFileSize,
                    };

                    return (
                      <Grid
                        columnCount={columnCount}
                        columnWidth={columnWidth + gap}
                        height={height}
                        rowCount={rowCount}
                        rowHeight={rowHeight + gap}
                        width={width}
                        itemData={itemData}
                        className="scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent p-4"
                        style={{ overflowX: 'hidden' }}
                      >
                        {GridCell}
                      </Grid>
                    );
                  } else {
                    // List View
                    const itemData = {
                      images,
                      selectedImages,
                      isBatchMode,
                      onImageClick: handleImageClick,
                      onToggleSelection: toggleImageSelection,
                      formatDate,
                      formatFileSize,
                    };

                    return (
                      <List
                        height={height}
                        itemCount={images.length}
                        itemSize={72} // Height of list item
                        width={width}
                        itemData={itemData}
                        className="scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent p-4"
                      >
                        {ListRow}
                      </List>
                    );
                  }
                }}
              </AutoSizer>
            )}

            {/* Batch Toolbar - Rendered via Portal for true viewport positioning */}
            {isBatchMode &&
              createPortal(
                <div className="fixed bottom-8 left-0 right-0 flex justify-center z-[1000] pointer-events-none">
                  <div className="mx-4 max-w-[calc(100vw-2rem)] md:max-w-fit pointer-events-auto">
                    <BatchToolbar
                      selectedCount={selectedImages.size}
                      onRotate={handleBatchRotate}
                      onAssignTags={(tags) => {
                        // For now, we'll just add tags
                        handleBatchTag(tags, 'add');
                      }}
                      onAssignPeople={(people) => {
                        // For now, we'll just add people
                        handleBatchPeople(people, 'add');
                      }}
                      onAssignRating={handleBatchRate}
                      onEditMetadata={(field, value) => {
                        // Create updates object based on field
                        const updates: any = {};
                        if (field === 'title') {
                          updates.title = value;
                        } else if (field === 'description') {
                          updates.description = value;
                        }
                        handleBatchMetadata(updates);
                      }}
                      onCancel={exitBatchMode}
                      onDeselect={clearSelection}
                      onUndo={handleUndo}
                      canUndo={undoStack.length > 0}
                    />
                  </div>
                </div>,
                document.body,
              )}
          </div>
        </div>
      </div>

      {/* Footer Status Bar */}
      <div className="h-6 bg-slate-900 border-t border-slate-800 flex items-center justify-between px-3 text-[10px] text-slate-500 select-none shrink-0">
        <div>{images.length} items</div>
        <div>{selectedAlbum ? albums.find((a) => a.id === selectedAlbum)?.name : 'All Photos'}</div>
      </div>

      {/* Full Screen Viewer */}
      {viewerStartIndex !== null && (
        <MediaViewerModal
          images={images}
          initialIndex={viewerStartIndex}
          onClose={handleCloseViewer}
          onImageUpdate={(updatedImage) => {
            const newImages = [...images];
            const index = newImages.findIndex((img) => img.id === updatedImage.id);
            if (index !== -1) {
              newImages[index] = updatedImage;
              setImages(newImages);
            }
          }}
        />
      )}
    </div>
  );
});

export default PhotoBrowser;
