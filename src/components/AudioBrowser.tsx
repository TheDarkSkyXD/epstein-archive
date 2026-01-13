import React, { useState, useEffect } from 'react';
import { AudioPlayer, TranscriptSegment, Chapter } from './AudioPlayer';
import { Music, Clock, Calendar, CheckSquare, Square, AlertTriangle } from 'lucide-react';
import { SensitiveContent } from './SensitiveContent';
import BatchToolbar from './BatchToolbar';
import Icon from './Icon';

interface AudioItem {
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
    transcript?: TranscriptSegment[];
    chapters?: Chapter[];
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

export const AudioBrowser: React.FC = () => {
  const [items, setItems] = useState<AudioItem[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<AudioItem | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showAlbumDropdown, setShowAlbumDropdown] = useState(false);

  // Batch Mode State
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());

  // Load albums on mount
  useEffect(() => {
    loadAlbums();
  }, []);

  // Load items when album selection changes
  useEffect(() => {
    fetchAudio(1);
  }, [selectedAlbum]);

  const loadAlbums = async () => {
    try {
      const res = await fetch('/api/media/audio/albums');
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
      // Refresh data to show new tags
      fetchAudio(1);
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
      fetchAudio(1);
      setSelectedItems(new Set());
      setIsBatchMode(false);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAudio = async (pageNum: number) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: '24',
      });
      if (selectedAlbum) params.append('albumId', selectedAlbum.toString());

      const res = await fetch(`/api/media/audio?${params}`);
      if (!res.ok) throw new Error('Failed to load audio files');

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
      setError('Failed to load audio content');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    const nextPage = page + 1;
    fetchAudio(nextPage);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const currentAlbum = albums.find((a) => a.id === selectedAlbum);
  const showSensitiveWarning =
    currentAlbum &&
    (currentAlbum.name.match(/Sensitive|Disturbing|Testimony|Victim|Survivor/i) ||
      (currentAlbum.sensitiveCount && currentAlbum.sensitiveCount > 0));

  return (
    <div className="flex flex-col h-full bg-slate-950 border border-slate-800 shadow-2xl overflow-hidden rounded-lg">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between px-3 py-2 md:px-4 md:h-14 shrink-0 z-10 gap-2">
        {/* Mobile Album Dropdown */}
        <div className="md:hidden">
          <button
            onClick={() => setShowAlbumDropdown(!showAlbumDropdown)}
            className="w-full flex items-center justify-between px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm h-8"
          >
            <span className="flex items-center gap-2">
              <Icon name="Folder" size="sm" />
              {selectedAlbum ? currentAlbum?.name : 'All Audio'}
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
                <span>All Audio</span>
                <span className="text-xs opacity-70">{items.length}</span>
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
            <h2 className="text-lg font-light text-white">Audio Recordings</h2>
            <p className="text-slate-400 text-xs hidden md:block">
              Forensic audio evidence and transcripts
            </p>
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
              <span className="truncate">All Audio</span>
              <span className="text-xs opacity-70 bg-slate-800 px-1.5 py-0.5 rounded-full">
                {items.length}
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
                  This album contains audio testimony from victims and survivors. Content may be
                  graphic, traumatic, and disturbing. Listener discretion is strongly advised.
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-900/20 border border-red-500/50 text-red-200 p-4 mx-6 mt-6 rounded-lg">
              {error}
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-6">
            {items.length === 0 && !loading ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-500">
                <Icon name="Music" size="lg" className="mb-2 opacity-50" />
                <p>No audio recordings found</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {items.map((item) => {
                  const isSelected = selectedItems.has(item.id);
                  return (
                    <div
                      key={item.id}
                      className={`bg-slate-900/50 border rounded-lg overflow-hidden transition-all group cursor-pointer flex flex-col ${isSelected ? 'border-cyan-500 ring-1 ring-cyan-500' : 'border-slate-800 hover:border-cyan-500/30'}`}
                      onClick={(e) => {
                        if (isBatchMode) {
                          toggleSelection(item.id);
                        } else {
                          setSelectedItem(item);
                        }
                      }}
                    >
                      <SensitiveContent
                        isSensitive={item.isSensitive}
                        className="relative shrink-0"
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
                        <div className="aspect-video bg-slate-900 relative flex items-center justify-center group-hover:bg-slate-800 transition-colors">
                          <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 group-hover:scale-110 transition-transform shadow-lg">
                            <Music size={32} className="text-cyan-500" />
                          </div>
                          {item.metadata.duration && (
                            <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/80 text-white text-xs rounded-full font-mono flex items-center gap-1">
                              <Clock size={10} />
                              {Math.floor(item.metadata.duration / 60)}:
                              {(item.metadata.duration % 60).toString().padStart(2, '0')}
                            </div>
                          )}
                        </div>
                      </SensitiveContent>

                      <div className="p-4 flex-1 flex flex-col">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h3
                            className="font-medium text-slate-200 group-hover:text-cyan-400 transition-colors line-clamp-2"
                            title={item.title}
                          >
                            {item.title}
                          </h3>
                        </div>

                        {/* Tags/People Display */}
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

                        <div className="mt-auto space-y-2">
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Calendar size={12} />
                            <span>{formatDate(item.createdAt)}</span>
                          </div>
                          {item.description && (
                            <p className="text-xs text-slate-400 line-clamp-2">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {hasMore && !loading && items.length > 0 && (
              <div className="text-center mt-8">
                <button
                  onClick={handleLoadMore}
                  className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full text-sm font-medium transition-colors"
                >
                  Load More
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer Status Bar */}
      <div className="h-6 bg-slate-900 border-t border-slate-800 flex items-center justify-between px-3 text-[10px] text-slate-500 select-none shrink-0">
        <div>{items.length} items</div>
        <div>{selectedAlbum ? currentAlbum?.name : 'All Audio'}</div>
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

      {/* Audio Player Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 md:p-8">
          <div className="w-full max-w-5xl h-[80vh]">
            <AudioPlayer
              src={`/api/media/audio/${selectedItem.id}/stream`}
              title={selectedItem.title}
              transcript={selectedItem.metadata.transcript}
              chapters={selectedItem.metadata.chapters}
              onClose={() => setSelectedItem(null)}
              autoPlay
              isSensitive={selectedItem.isSensitive}
              warningText={selectedItem.description}
            />
          </div>
        </div>
      )}
    </div>
  );
};
