import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { FixedSizeList as List } from 'react-window';
import { VideoPlayer } from './VideoPlayer';
import { Play, Film, Calendar, CheckSquare, Square, AlertTriangle, User } from 'lucide-react';
import { SensitiveContent } from './SensitiveContent';
import BatchToolbar from './BatchToolbar';
import Icon from './Icon';

interface VideoItem {
  id: number;
  title: string;
  description?: string;
  filePath: string;
  fileType: string;
  isSensitive: boolean;
  albumId?: number;
  albumName?: string;
  metadata: {
    duration?: number;
    thumbnailPath?: string;
    transcript?: any[];
    chapters?: any[];
    [key: string]: any;
  };
  createdAt: string;
  entityName?: string;
  entityId?: number;
  tags?: Array<{ id: number; name: string }>;
  people?: Array<{ id: number; name: string }>;
}

interface Album {
  id: number;
  name: string;
  description?: string;
  itemCount: number;
  sensitiveCount?: number;
}

export const VideoBrowser: React.FC = () => {
  const [items, setItems] = useState<VideoItem[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<VideoItem | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showAlbumDropdown, setShowAlbumDropdown] = useState(false);
  const [libraryTotalCount, setLibraryTotalCount] = useState(0);
  const prefetchRef = useRef<number | null>(null);

  // Batch Mode State
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());

  // Load albums on mount
  useEffect(() => {
    loadAlbums();
  }, []);

  useEffect(() => {
    const id = setTimeout(() => {
      if (!loading && hasMore) {
        const next = page + 1;
        if (prefetchRef.current !== next) {
          prefetchRef.current = next;
          fetchVideos(next);
        }
      }
    }, 2000);
    return () => clearTimeout(id);
  }, [page, loading, hasMore]);
  useEffect(() => {
    const loadTotals = async () => {
      try {
        const res = await fetch('/api/media/video?page=1&limit=1');
        if (res.ok) {
          const json = await res.json();
          if (typeof json?.total === 'number') setLibraryTotalCount(json.total);
        }
      } catch {
        void 0;
      }
    };
    loadTotals();
  }, []);
  // Load items when album selection changes
  useEffect(() => {
    fetchVideos(1);
  }, [selectedAlbum]);

  const loadAlbums = async () => {
    try {
      const res = await fetch('/api/media/video/albums');
      if (!res.ok) throw new Error('Failed to load albums');
      const data = await res.json();
      setAlbums(data);
    } catch (err) {
      console.error('Failed to load albums:', err);
    }
  };

  // Batch Handlers
  const toggleSelection = (id: number) => {
    const newSet = new Set(selectedItems);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedItems(newSet);
  };

  const handleBatchTag = async (tagIds: number[], action: 'add' | 'remove') => {
    try {
      await fetch('/api/media/items/batch/tags', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds: Array.from(selectedItems), tagIds, action }),
      });
      fetchVideos(1);
      setSelectedItems(new Set());
      setIsBatchMode(false);
    } catch (e) {
      console.error(e);
    }
  };

  const handleBatchPeople = async (personIds: number[]) => {
    try {
      await fetch('/api/media/items/batch/people', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds: Array.from(selectedItems), personIds, action: 'add' }),
      });
      fetchVideos(1);
      setSelectedItems(new Set());
      setIsBatchMode(false);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchVideos = async (pageNum: number) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: '24',
      });
      if (selectedAlbum) params.append('albumId', selectedAlbum.toString());
      // Always sort by title as requested
      params.append('sortBy', 'title');

      const res = await fetch(`/api/media/video?${params}`);
      if (!res.ok) throw new Error('Failed to load video files');

      const data = await res.json();
      const newItems = data.mediaItems || [];

      if (pageNum === 1) {
        setItems(newItems);
      } else {
        setItems((prev) => [...prev, ...newItems]);
      }

      setHasMore(newItems.length === 24);
      setPage(pageNum);
    } catch (err) {
      console.error(err);
      setError('Failed to load video content');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    fetchVideos(nextPage);
  };

  const formatDate = useCallback((dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, []);

  // Virtualization setup
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // Measure container width for responsive grid calculation
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      setContainerWidth(entries[0].contentRect.width);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Calculate columns based on container width (matching Tailwind breakpoints)
  const columns = useMemo(() => {
    if (containerWidth >= 1280) return 4; // xl
    if (containerWidth >= 1024) return 3; // lg
    if (containerWidth >= 768) return 2; // md
    return 1; // sm
  }, [containerWidth]);

  const rowCount = Math.ceil(items.length / columns);
  const isItemLoaded = (index: number) => index < rowCount;
  const loadMoreItems = useCallback(
    (_startIndex: number, _stopIndex: number) => {
      if (!loading && hasMore) {
        return handleLoadMore();
      }
      return Promise.resolve();
    },
    [loading, hasMore],
  );

  const currentAlbum = albums.find((a) => a.id === selectedAlbum);
  const showSensitiveWarning =
    currentAlbum &&
    (currentAlbum.name.match(/Sensitive|Disturbing|Testimony|Victim|Survivor/i) ||
      (currentAlbum.sensitiveCount && currentAlbum.sensitiveCount > 0));

  // Row renderer for virtualized list
  const Row = useCallback(
    ({ index, style }: { index: number; style: React.CSSProperties }) => {
      const startIdx = index * columns;
      const rowItems = items.slice(startIdx, startIdx + columns);

      // Manual padding offset: Shift top down by 24px (py-6 top)
      const adjustedStyle = {
        ...style,
        top: (typeof style.top === 'number' ? style.top : parseFloat(style.top as string)) + 24,
      };

      return (
        <div style={adjustedStyle} className="px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-6">
            {rowItems.map((item) => {
              const isSelected = selectedItems.has(item.id);
              return (
                <div
                  key={item.id}
                  className={`bg-slate-900/50 border rounded-lg overflow-hidden transition-all group cursor-pointer ${isSelected ? 'border-cyan-500 ring-1 ring-cyan-500' : 'border-slate-800 hover:border-cyan-500/30'}`}
                  onClick={() => {
                    if (isBatchMode) {
                      toggleSelection(item.id);
                    } else {
                      setSelectedItem(item);
                    }
                  }}
                >
                  <SensitiveContent
                    isSensitive={item.isSensitive}
                    className="relative aspect-video bg-black"
                  >
                    {isBatchMode && (
                      <div className="absolute top-2 left-2 z-20">
                        {isSelected ? (
                          <CheckSquare className="text-cyan-500 fill-cyan-950" />
                        ) : (
                          <Square className="text-white/70" />
                        )}
                      </div>
                    )}
                    {item.metadata.thumbnailPath ? (
                      <img
                        src={`/api/media/video/${item.id}/thumbnail`}
                        alt={item.title}
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-900">
                        <Film size={48} className="text-slate-700" />
                      </div>
                    )}

                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 rounded-full bg-black/50 border border-white/20 flex items-center justify-center backdrop-blur-sm group-hover:scale-110 transition-transform">
                        <Play size={20} className="text-white fill-white ml-1" />
                      </div>
                    </div>

                    <div className="absolute bottom-3 right-3 bg-black/80 text-xs px-2 py-1 rounded text-slate-300 font-mono flex items-center gap-1">
                      {item.metadata.duration
                        ? `${Math.floor(item.metadata.duration / 60)}:${(item.metadata.duration % 60).toString().padStart(2, '0').split('.')[0]}`
                        : '--:--'}
                    </div>
                  </SensitiveContent>

                  <div className="p-4">
                    <h3 className="text-slate-200 font-medium truncate mb-1 text-lg group-hover:text-cyan-400 transition-colors">
                      {item.title || 'Untitled Video'}
                    </h3>

                    <div className="flex flex-wrap gap-1 mb-2">
                      {item.tags &&
                        item.tags.map((t: any) => (
                          <span
                            key={t.id}
                            className="text-[10px] bg-slate-800 text-cyan-400 px-1.5 py-0.5 rounded-full"
                          >
                            {t.name}
                          </span>
                        ))}
                      {item.people &&
                        item.people.map((p: any) => (
                          <span
                            key={p.id}
                            className="text-[10px] bg-slate-800 text-amber-400 px-1.5 py-0.5 rounded-full"
                          >
                            {p.name}
                          </span>
                        ))}
                    </div>

                    {item.entityName && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-3">
                        <User size={12} />
                        <span>{item.entityName}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-xs text-slate-500 border-t border-slate-800/50 pt-3 mt-1">
                      <Calendar size={12} />
                      <span>{formatDate(item.createdAt)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    },
    [items, columns, selectedItems, isBatchMode, formatDate],
  );

  // Update URL when item or album is selected
  useEffect(() => {
    const url = new URL(window.location.href);

    // For video items, we might not be tracking id in URL as strictly or we need to check how VideoBrowser handles item selection via URL.
    // Assuming we want to track albumId primarily here based on user request "route when I select album".

    if (selectedAlbum) {
      url.searchParams.set('albumId', selectedAlbum.toString());
    } else {
      url.searchParams.delete('albumId');
    }

    // Preserve other params if needed, or push state.
    window.history.pushState({}, '', url.toString());
  }, [selectedAlbum]); // Intentionally not tracking selectedItem here unless requested, as Video modal usually manages its own state or overlay.

  return (
    <div className="flex flex-col h-full bg-slate-950 border border-slate-800 shadow-2xl overflow-hidden rounded-lg">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between px-3 py-2 md:px-6 md:h-14 shrink-0 z-10 gap-2">
        {/* Mobile Album Dropdown */}
        <div className="md:hidden">
          <button
            onClick={() => setShowAlbumDropdown(!showAlbumDropdown)}
            className="w-full flex items-center justify-between px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm h-8"
          >
            <span className="flex items-center gap-2">
              <Icon name="Folder" size="sm" />
              {selectedAlbum ? currentAlbum?.name : 'All Videos'}
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
                <span>All Videos</span>
                <span className="text-xs opacity-70">{libraryTotalCount}</span>
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
                  <span className="text-xs opacity-70">{album.itemCount || 0}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-light text-white">Video Recordings</h2>
            <p className="text-slate-400 text-xs hidden md:block">Forensic video evidence</p>
          </div>
          <button
            onClick={() => setIsBatchMode(!isBatchMode)}
            className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${isBatchMode ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'}`}
          >
            {isBatchMode ? 'Exit Batch' : 'Batch Edit'}
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
              <span className="truncate">All Videos</span>
              <span className="text-xs opacity-70 bg-slate-800 px-1.5 py-0.5 rounded-full">
                {libraryTotalCount}
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
                  {album.itemCount || 0}
                </span>
              </button>
            ))}
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 bg-slate-950 flex flex-col overflow-hidden">
          {loading && page === 1 ? (
            <div className="absolute inset-0 flex items-center justify-center z-20 bg-slate-950/50 backdrop-blur-sm">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500"></div>
            </div>
          ) : null}

          {/* Sensitive Content Warning Banner */}
          {showSensitiveWarning && (
            <div className="bg-red-900/80 border-b border-red-700 px-4 py-3 flex items-start gap-3">
              <AlertTriangle className="text-red-400 shrink-0 mt-0.5" size={20} />
              <div>
                <h4 className="text-red-200 font-bold text-sm uppercase tracking-wider">
                  Sensitive & Disturbing Content
                </h4>
                <p className="text-red-300/90 text-sm mt-1">
                  This album contains video testimony from victims and survivors. Content may be
                  graphic, traumatic, and disturbing. Viewer discretion is strongly advised.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-900/20 border border-red-500/50 text-red-200 p-4 mx-6 mt-6 rounded-lg">
              {error}
            </div>
          )}

          <div ref={containerRef} className="flex-1 overflow-hidden">
            {items.length === 0 && !loading ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <Icon name="Film" size="lg" className="mb-2 opacity-50" />
                <p>No video recordings found</p>
              </div>
            ) : containerWidth > 0 ? (
              <div className="h-full flex flex-col">
                <List
                  height={containerRef.current?.clientHeight || 600}
                  itemCount={rowCount}
                  itemSize={420}
                  width="100%"
                  overscanCount={2}
                  className="scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent"
                  innerElementType={React.forwardRef<HTMLDivElement, any>(
                    ({ style, ...rest }, ref) => (
                      <div
                        ref={ref}
                        style={{
                          ...style,
                          height: `${parseFloat(style.height) + 48}px`, // +24px top, +24px bottom
                        }}
                        {...rest}
                      />
                    ),
                  )}
                  onScroll={({ scrollOffset, scrollUpdateWasRequested }) => {
                    if (scrollUpdateWasRequested) return;
                    const containerHeight = containerRef.current?.clientHeight || 600;
                    const totalHeight = rowCount * 420;
                    if (
                      scrollOffset + containerHeight >= totalHeight - 200 &&
                      !loading &&
                      hasMore
                    ) {
                      loadMoreItems(0, 0);
                    }
                  }}
                >
                  {Row}
                </List>
                {loading && (
                  <div className="py-4 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-cyan-500"></div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Footer Status Bar */}
      <div className="h-6 bg-slate-900 border-t border-slate-800 flex items-center justify-between px-3 text-[10px] text-slate-500 select-none shrink-0">
        <div>{items.length} items</div>
        <div>{selectedAlbum ? currentAlbum?.name : 'All Videos'}</div>
      </div>

      {/* Batch Toolbar */}
      {isBatchMode && selectedItems.size > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-4xl px-4">
          <BatchToolbar
            selectedCount={selectedItems.size}
            onRotate={() => {}}
            onAssignTags={(tags) => handleBatchTag(tags, 'add')}
            onAssignPeople={handleBatchPeople}
            onAssignRating={() => {}}
            onEditMetadata={() => {}}
            onCancel={() => setSelectedItems(new Set())}
            onDeselect={() => setSelectedItems(new Set())}
          />
        </div>
      )}

      {/* Video Player Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 md:p-8">
          <div className="w-full max-w-6xl h-[85vh]">
            <VideoPlayer
              src={`/api/media/video/${selectedItem.id}/stream`}
              title={selectedItem.title}
              transcript={selectedItem.metadata.transcript}
              chapters={selectedItem.metadata.chapters}
              onClose={() => setSelectedItem(null)}
              autoPlay
              isSensitive={selectedItem.isSensitive}
              warningText={selectedItem.description}
              documentId={selectedItem.metadata.documentId || (selectedItem as any).documentId}
            />
          </div>
        </div>
      )}
    </div>
  );
};
