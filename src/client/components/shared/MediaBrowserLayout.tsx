import React from 'react';
import Icon from '../common/Icon';

interface MediaBrowserLayoutProps {
  /** Page title (e.g., "Audio Recordings", "Video Recordings") */
  title: string;
  /** Page subtitle */
  subtitle: string;
  /** Whether batch mode is currently enabled */
  isBatchMode: boolean;
  /** Callback to toggle batch mode */
  onToggleBatchMode: () => void;
  /** Album dropdown component (rendered in header on mobile) */
  mobileAlbumDropdown: React.ReactNode;
  /** Album sidebar component (rendered on desktop) */
  albumSidebar: React.ReactNode;
  /** Warning banner to display (e.g., sensitive content warning) */
  warningBanner?: React.ReactNode;
  /** Error message to display */
  error?: string | null;
  /** Main content area */
  children: React.ReactNode;
  /** Footer content showing item count and current album */
  footerLeft: React.ReactNode;
  /** Footer content showing current view context */
  footerRight: React.ReactNode;
  /** Batch toolbar component (fixed position at bottom) */
  batchToolbar?: React.ReactNode;
  /** Whether content is loading (for initial load state) */
  loading?: boolean;
  /** Whether this is the initial page load */
  isInitialLoad?: boolean;
}

/**
 * Shared layout component for media browsers (Audio, Video, Photo).
 * Provides consistent structure with header, sidebar, content area, and footer.
 */
export function MediaBrowserLayout({
  title,
  subtitle,
  isBatchMode,
  onToggleBatchMode,
  mobileAlbumDropdown,
  albumSidebar,
  warningBanner,
  error,
  children,
  footerLeft,
  footerRight,
  batchToolbar,
  loading = false,
  isInitialLoad = false,
}: MediaBrowserLayoutProps): React.ReactElement {
  return (
    <div className="flex flex-col h-full bg-slate-950 border border-slate-800 shadow-2xl overflow-hidden rounded-lg">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between px-3 py-2 md:px-4 md:h-14 shrink-0 z-10 gap-2">
        {/* Mobile Album Dropdown */}
        {mobileAlbumDropdown}

        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-light text-white">{title}</h2>
            <p className="text-slate-400 text-xs hidden md:block">{subtitle}</p>
          </div>
          <button
            onClick={onToggleBatchMode}
            className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
              isBatchMode
                ? 'bg-cyan-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
            }`}
          >
            {isBatchMode ? 'Exit Batch' : 'Batch Edit'}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Albums sidebar - Hidden on mobile */}
        {albumSidebar}

        {/* Main Content */}
        <div className="flex-1 bg-slate-950 flex flex-col overflow-hidden">
          {/* Loading overlay for initial load */}
          {loading && isInitialLoad && (
            <div className="absolute inset-0 flex items-center justify-center z-20 bg-slate-950/50 backdrop-blur-sm">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-500" />
            </div>
          )}

          {/* Warning Banner */}
          {warningBanner}

          {/* Error Display */}
          {error && (
            <div className="bg-red-900/20 border border-red-500/50 text-red-200 p-4 mx-6 mt-6 rounded-lg">
              {error}
            </div>
          )}

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-6">{children}</div>
        </div>
      </div>

      {/* Footer Status Bar */}
      <div className="h-6 bg-slate-900 border-t border-slate-800 flex items-center justify-between px-3 text-[10px] text-slate-500 select-none shrink-0">
        <div>{footerLeft}</div>
        <div>{footerRight}</div>
      </div>

      {/* Batch Toolbar */}
      {batchToolbar}
    </div>
  );
}

/**
 * Empty state component for when no media items are found
 */
export function MediaEmptyState({
  icon,
  message,
}: {
  icon: string;
  message: string;
}): React.ReactElement {
  return (
    <div className="flex flex-col items-center justify-center h-full text-slate-500">
      <Icon name={icon as any} size="lg" className="mb-2 opacity-50" />
      <p>{message}</p>
    </div>
  );
}

/**
 * Load more button component
 */
export function LoadMoreButton({ onClick }: { onClick: () => void }): React.ReactElement {
  return (
    <div className="text-center mt-8">
      <button
        onClick={onClick}
        className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full text-sm font-medium transition-colors"
      >
        Load More
      </button>
    </div>
  );
}

export default MediaBrowserLayout;
