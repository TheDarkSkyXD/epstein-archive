import React, { useState, useEffect } from 'react';
import { MediaImage, Album } from '../types/media.types';
import './PhotoBrowser.css';

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
  const [selectedImage, setSelectedImage] = useState<MediaImage | null>(null);

  useEffect(() => {
    loadAlbums();
    loadImages();
  }, []);

  useEffect(() => {
    loadImages();
  }, [selectedAlbum, sortField, sortOrder, searchQuery]);

  const loadAlbums = async () => {
    try {
      const response = await fetch('/api/media/albums');
      const data = await response.json();
      setAlbums(data);
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
        width: img.width,
        height: img.height,
        fileSize: img.file_size || img.fileSize,
        format: img.format,
        dateTaken: img.date_taken || img.dateTaken,
        dateAdded: img.date_added || img.dateAdded,
        dateModified: img.date_modified || img.dateModified,
        tags: img.tags || []
      })) : [];
      setImages(normalized);
    } catch (error) {
      console.error('Failed to load images:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageClick = (image: MediaImage) => {
    setSelectedImage(image);
    if (onImageClick) {
      onImageClick(image);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className="photo-browser">
      {/* Header with controls */}
      <div className="photo-header">
        <div className="photo-search">
          <input
            type="text"
            placeholder="Search images..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="photo-controls">
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value as SortField)}
            className="sort-select"
          >
            <option value="date_added">Date Added</option>
            <option value="date_taken">Date Taken</option>
            <option value="filename">Name</option>
            <option value="file_size">Size</option>
            <option value="title">Title</option>
          </select>

          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="sort-order-btn"
            title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>

          <div className="view-mode-toggle">
            <button
              className={viewMode === 'grid' ? 'active' : ''}
              onClick={() => setViewMode('grid')}
              title="Grid View"
            >
              ⊞
            </button>
            <button
              className={viewMode === 'list' ? 'active' : ''}
              onClick={() => setViewMode('list')}
              title="List View"
            >
              ☰
            </button>
          </div>
        </div>
      </div>

      {/* Albums sidebar */}
      <div className="photo-content">
        <aside className="albums-sidebar">
          <h3>Albums</h3>
          <div className="album-list">
            <button
              className={selectedAlbum === null ? 'album-item active' : 'album-item'}
              onClick={() => setSelectedAlbum(null)}
            >
              <span className="album-name">All Photos</span>
              <span className="album-count">{images.length}</span>
            </button>
            {albums.map((album) => (
              <button
                key={album.id}
                className={selectedAlbum === album.id ? 'album-item active' : 'album-item'}
                onClick={() => setSelectedAlbum(album.id)}
              >
                <span className="album-name">{album.name}</span>
                <span className="album-count">{album.imageCount || 0}</span>
              </button>
            ))}
          </div>
        </aside>

        {/* Images display */}
        <main className="images-container">
          {loading ? (
            <div className="loading">Loading images...</div>
          ) : images.length === 0 ? (
            <div className="empty-state">
              <p>No images found</p>
            </div>
          ) : (
            <div className={`images-${viewMode}`}>
              {images.map((image) => (
                <div
                  key={image.id}
                  className="image-card"
                  onClick={() => handleImageClick(image)}
                >
                  <div className="image-thumbnail">
                    <img
                      src={`/api/media/images/${image.id}/file`}
                      alt={image.title || image.filename}
                      loading="lazy"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/data/media/images/placeholder.png'; }}
                    />
                  </div>
                  <div className="image-info">
                    <h4 className="image-title">{image.title || image.filename}</h4>
                    {viewMode === 'list' && (
                      <>
                        <p className="image-description">{image.description}</p>
                        <div className="image-meta">
                          <span>{formatFileSize(image.fileSize)}</span>
                          {image.width && image.height && (
                            <span>{image.width}×{image.height}</span>
                          )}
                          <span>{formatDate(image.dateAdded)}</span>
                        </div>
                        {image.tags && image.tags.length > 0 && (
                          <div className="image-tags">
                            {image.tags.map((tag, idx) => (
                              <span key={idx} className="tag">{tag}</span>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Image viewer modal */}
      {selectedImage && (
        <div className="image-viewer-modal" onClick={() => setSelectedImage(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={() => setSelectedImage(null)}>×</button>
            <div className="viewer-image">
              <img src={`/api/media/images/${selectedImage.id}/file`} alt={selectedImage.title || selectedImage.filename} />
            </div>
            <div className="viewer-sidebar">
              <h2>{selectedImage.title || selectedImage.filename}</h2>
              {selectedImage.description && <p>{selectedImage.description}</p>}
              
              <div className="metadata-section">
                <h3>Details</h3>
                <dl>
                  <dt>Filename:</dt>
                  <dd>{selectedImage.filename}</dd>
                  
                  <dt>Size:</dt>
                  <dd>{formatFileSize(selectedImage.fileSize)}</dd>
                  
                  {selectedImage.width && selectedImage.height && (
                    <>
                      <dt>Dimensions:</dt>
                      <dd>{selectedImage.width}×{selectedImage.height}</dd>
                    </>
                  )}
                  
                  <dt>Format:</dt>
                  <dd>{selectedImage.format}</dd>
                  
                  <dt>Date Added:</dt>
                  <dd>{formatDate(selectedImage.dateAdded)}</dd>
                  
                  {selectedImage.dateTaken && (
                    <>
                      <dt>Date Taken:</dt>
                      <dd>{formatDate(selectedImage.dateTaken)}</dd>
                    </>
                  )}
                  
                  {selectedImage.albumName && (
                    <>
                      <dt>Album:</dt>
                      <dd>{selectedImage.albumName}</dd>
                    </>
                  )}
                </dl>
              </div>

              {selectedImage.tags && selectedImage.tags.length > 0 && (
                <div className="metadata-section">
                  <h3>Tags</h3>
                  <div className="tags-list">
                    {selectedImage.tags.map((tag, idx) => (
                      <span key={idx} className="tag">{tag}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoBrowser;
