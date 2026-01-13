import React, { useState, useEffect } from 'react';
import { AudioPlayer, TranscriptSegment, Chapter } from './AudioPlayer';
import { Play, Music, Clock, User, Calendar } from 'lucide-react';
import { SensitiveContent } from './SensitiveContent';

interface AudioItem {
  id: number;
  title: string;
  description?: string;
  filePath: string;
  fileType: string;
  isSensitive: boolean;
  metadata: {
    duration?: number;
    transcript?: TranscriptSegment[];
    chapters?: Chapter[];
    [key: string]: any;
  };
  createdAt: string;
  entityName?: string;
  entityId?: number;
}

export const AudioBrowser: React.FC = () => {
  const [items, setItems] = useState<AudioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<AudioItem | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchAudio = async (pageNum: number) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/media/audio?page=${pageNum}&limit=24`);
      if (!res.ok) throw new Error('Failed to load audio files');

      const data = await res.json();
      const newItems = data.mediaItems || [];

      if (pageNum === 1) {
        setItems(newItems);
      } else {
        setItems((prev) => [...prev, ...newItems]);
      }

      setHasMore(newItems.length === 24);
    } catch (err) {
      console.error(err);
      setError('Failed to load audio content');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAudio(1);
  }, []);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchAudio(nextPage);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="h-full flex flex-col bg-slate-950 p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-light text-white mb-2">Audio Recordings</h2>
          <p className="text-slate-400 text-sm">Forensic audio evidence and transcripts</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-500/50 text-red-200 p-4 rounded-lg mb-6">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {items.map((item) => (
          <div
            key={item.id}
            className="bg-slate-900/50 border border-slate-800 rounded-lg overflow-hidden hover:border-cyan-500/30 transition-all group cursor-pointer"
            onClick={() => setSelectedItem(item)}
          >
            <SensitiveContent isSensitive={item.isSensitive} className="relative">
              <div className="aspect-video bg-slate-900 relative flex items-center justify-center group-hover:bg-slate-800 transition-colors">
                <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700 group-hover:scale-110 transition-transform shadow-lg">
                  <Music size={32} className="text-cyan-500" />
                </div>
                <div className="absolute bottom-3 right-3 bg-black/80 text-xs px-2 py-1 rounded text-slate-300 font-mono flex items-center gap-1">
                  <Clock size={10} />
                  {item.metadata.duration
                    ? `${Math.floor(item.metadata.duration / 60)}:${(item.metadata.duration % 60).toString().padStart(2, '0')}`
                    : '--:--'}
                </div>
              </div>
            </SensitiveContent>

            <div className="p-4">
              <h3 className="text-slate-200 font-medium truncate mb-1 text-lg group-hover:text-cyan-400 transition-colors">
                {item.title || 'Untitled Recording'}
              </h3>
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
        ))}
      </div>

      {items.length === 0 && !loading && (
        <div className="flex-1 flex items-center justify-center text-slate-500">
          No audio recordings found.
        </div>
      )}

      {hasMore && !loading && (
        <div className="text-center mt-8">
          <button
            onClick={handleLoadMore}
            className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full text-sm font-medium transition-colors"
          >
            Load More
          </button>
        </div>
      )}

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
            />
          </div>
        </div>
      )}
    </div>
  );
};
