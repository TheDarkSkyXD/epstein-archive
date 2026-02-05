import React from 'react';
import Icon from '../common/Icon';
import type { MediaAlbum } from '../../hooks/useMediaBrowser';

interface MobileAlbumDropdownProps {
  albums: MediaAlbum[];
  selectedAlbum: number | null;
  onSelectAlbum: (albumId: number | null) => void;
  isOpen: boolean;
  onToggle: () => void;
  totalItemCount: number;
  /** Label for "All" option (e.g., "All Audio", "All Videos", "All Photos") */
  allLabel: string;
  /** Current album name to display in the dropdown button */
  currentAlbumName?: string;
}

/**
 * Mobile-friendly album dropdown component used across Audio, Video, and Photo browsers.
 * Only visible on mobile screens (hidden on md: and larger).
 */
export function MobileAlbumDropdown({
  albums,
  selectedAlbum,
  onSelectAlbum,
  isOpen,
  onToggle,
  totalItemCount,
  allLabel,
  currentAlbumName,
}: MobileAlbumDropdownProps): React.ReactElement {
  const handleSelect = (albumId: number | null): void => {
    onSelectAlbum(albumId);
    onToggle();
  };

  const displayName = currentAlbumName || allLabel;

  return (
    <div className="md:hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm h-8"
      >
        <span className="flex items-center gap-2">
          <Icon name="Folder" size="sm" />
          {displayName}
        </span>
        <Icon name={isOpen ? 'ChevronUp' : 'ChevronDown'} size="sm" />
      </button>
      {isOpen && (
        <div className="absolute left-3 right-3 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-30 max-h-60 overflow-y-auto">
          <button
            className={`w-full px-4 py-3 text-left text-sm flex items-center justify-between ${
              selectedAlbum === null
                ? 'bg-cyan-900/20 text-cyan-400'
                : 'text-slate-300 hover:bg-slate-700'
            }`}
            onClick={() => handleSelect(null)}
          >
            <span>{allLabel}</span>
            <span className="text-xs opacity-70">{totalItemCount}</span>
          </button>
          {albums.map((album) => (
            <button
              key={album.id}
              className={`w-full px-4 py-3 text-left text-sm flex items-center justify-between border-t border-slate-700/50 ${
                selectedAlbum === album.id
                  ? 'bg-cyan-900/20 text-cyan-400'
                  : 'text-slate-300 hover:bg-slate-700'
              }`}
              onClick={() => handleSelect(album.id)}
            >
              <span className="truncate">{album.name}</span>
              <span className="text-xs opacity-70">{album.itemCount || 0}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default MobileAlbumDropdown;
