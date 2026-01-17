import React, { Suspense, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Newspaper, Image, Music, Film } from 'lucide-react';
import ScopedErrorBoundary from './ScopedErrorBoundary';

// Lazy load the tabs to prevent crashes
const ArticlesTab = React.lazy(() => import('./ArticlesTab'));
const MediaTab = React.lazy(() => import('./MediaTab'));
const AudioTab = React.lazy(() => import('./AudioTab'));
const VideoTab = React.lazy(() => import('./VideoTab'));

export const MediaAndArticlesTab: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Determine active sub-tab from URL path
  const getActiveSubTab = (): 'articles' | 'photos' | 'audio' | 'video' => {
    if (location.pathname === '/media/articles') return 'articles';
    if (location.pathname === '/media/photos') return 'photos';
    if (location.pathname === '/media/audio') return 'audio';
    if (location.pathname === '/media/video') return 'video';
    return 'photos'; // default
  };

  const activeSubTab = getActiveSubTab();

  // Redirect /media to /media/photos by default
  useEffect(() => {
    if (location.pathname === '/media') {
      const params = new URLSearchParams(location.search);
      const hasAudioHints = params.has('albumId') || params.has('id');
      navigate(hasAudioHints ? '/media/audio' : '/media/photos', { replace: true });
    }
  }, [location.pathname, navigate]);

  const navigateToTab = (tab: string) => {
    navigate(`/media/${tab}`);
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 overflow-hidden">
      {/* Sub-tab Navigation */}
      <div className="flex-none flex gap-2 border-b border-slate-800 bg-slate-900 px-4 pt-2 z-20 overflow-x-auto scrollbar-thin scrollbar-thumb-slate-700/60 scrollbar-track-transparent -mx-4 sm:mx-0">
        <button
          onClick={() => navigateToTab('articles')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-all ${
            activeSubTab === 'articles'
              ? 'border-blue-500 text-blue-500 bg-blue-500/5'
              : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
          }`}
        >
          <Newspaper className="h-4 w-4" />
          <span className="font-medium text-sm">Articles</span>
        </button>
        <button
          onClick={() => navigateToTab('photos')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-all ${
            activeSubTab === 'photos'
              ? 'border-blue-500 text-blue-500 bg-blue-500/5'
              : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
          }`}
        >
          <Image className="h-4 w-4" />
          <span className="font-medium text-sm">Images</span>
        </button>
        <button
          onClick={() => navigateToTab('audio')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-all ${
            activeSubTab === 'audio'
              ? 'border-blue-500 text-blue-500 bg-blue-500/5'
              : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
          }`}
        >
          <Music className="h-4 w-4" />
          <span className="font-medium text-sm">Audio</span>
        </button>
        <button
          onClick={() => navigateToTab('video')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-all ${
            activeSubTab === 'video'
              ? 'border-blue-500 text-blue-500 bg-blue-500/5'
              : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
          }`}
        >
          <Film className="h-4 w-4" />
          <span className="font-medium text-sm">Video</span>
        </button>
      </div>

      {/* Content Area with isolation */}
      <div className="flex-grow relative min-h-0 bg-slate-950">
        <ScopedErrorBoundary>
          <Suspense
            fallback={
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950">
                <div className="flex flex-col items-center gap-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  <p className="text-slate-500 text-xs font-mono tracking-widest uppercase">
                    Decryption in progress...
                  </p>
                </div>
              </div>
            }
          >
            {activeSubTab === 'articles' && (
              <ScopedErrorBoundary>
                <ArticlesTab />
              </ScopedErrorBoundary>
            )}
            {activeSubTab === 'photos' && (
              <ScopedErrorBoundary>
                <MediaTab />
              </ScopedErrorBoundary>
            )}
            {activeSubTab === 'audio' && (
              <ScopedErrorBoundary>
                <AudioTab />
              </ScopedErrorBoundary>
            )}
            {activeSubTab === 'video' && (
              <ScopedErrorBoundary>
                <VideoTab />
              </ScopedErrorBoundary>
            )}
          </Suspense>
        </ScopedErrorBoundary>
      </div>
    </div>
  );
};

export default MediaAndArticlesTab;
