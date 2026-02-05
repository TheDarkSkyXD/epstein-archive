import React, { useState } from 'react';
import { X, ZoomIn, Play, Image as ImageIcon } from 'lucide-react';
import Icon from '../common/Icon';

interface MediaItem {
  id: string;
  filePath: string;
  title?: string;
  type?: 'image' | 'video' | 'audio';
  redFlagRating?: number;
}

interface EntityMediaGalleryProps {
  media: MediaItem[];
  entityName: string;
}

export const EntityMediaGallery: React.FC<EntityMediaGalleryProps> = ({ media, entityName }) => {
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);

  if (!media || media.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-500 bg-slate-900/30 rounded-xl border border-slate-800 border-dashed">
        <Icon name="Image" size="xl" className="mb-3 opacity-50" />
        <p className="text-sm">No media assets found for {entityName}</p>
      </div>
    );
  }

  const getMediaUrl = (item: MediaItem) => {
    // Assuming API structure based on previous files
    return `/api/media/images/${item.id}/thumbnail`;
  };

  const getFullSizeUrl = (item: MediaItem) => {
    return `/api/media/images/${item.id}`; // Adjust if there's a specific 'full' route, usually just serving the file
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {media.map((item) => (
          <div
            key={item.id}
            onClick={() => setSelectedMedia(item)}
            className="group relative aspect-square bg-slate-800 rounded-lg overflow-hidden border border-slate-700 hover:border-cyan-500/50 cursor-pointer transition-all hover:shadow-lg hover:shadow-cyan-500/10"
          >
            <img
              src={getMediaUrl(item)}
              alt={item.title || entityName}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              loading="lazy"
            />
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
              <ZoomIn className="text-white w-6 h-6 drop-shadow-md transform scale-75 group-hover:scale-100 transition-transform" />
            </div>

            {/* Type Indicator if needed (e.g. video) */}
            {item.type === 'video' && (
              <div className="absolute top-2 right-2 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center backdrop-blur-sm">
                <Play className="w-3 h-3 text-white ml-0.5" />
              </div>
            )}

            {/* Caption gradient */}
            {item.title && (
              <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent pt-6 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                <p className="text-xs text-white truncate font-medium">{item.title}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox Modal */}
      {selectedMedia && (
        <div
          className="fixed inset-0 z-[10000] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedMedia(null)}
        >
          <div className="relative max-w-5xl w-full max-h-[90vh] flex flex-col items-center">
            {/* Close Button */}
            <button
              onClick={() => setSelectedMedia(null)}
              className="absolute -top-12 right-0 p-2 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Main Image */}
            <div
              className="relative rounded-lg overflow-hidden shadow-2xl border border-slate-700/50 bg-slate-900"
              onClick={(e) => e.stopPropagation()} // Prevent closing when clicking image
            >
              <img
                src={getFullSizeUrl(selectedMedia)}
                alt={selectedMedia.title || entityName}
                className="max-h-[80vh] w-auto object-contain"
              />
            </div>

            {/* Caption */}
            <div className="mt-4 text-center" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-medium text-white">
                {selectedMedia.title || entityName}
              </h3>
              {selectedMedia.redFlagRating && selectedMedia.redFlagRating > 0 && (
                <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded border border-red-500/30 bg-red-950/30 text-red-200 text-xs shadow-[0_0_10px_rgba(239,68,68,0.2)]">
                  <span>Red Flag Rating: {selectedMedia.redFlagRating}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
