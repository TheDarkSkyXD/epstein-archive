import React, { Suspense, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Newspaper, Image, Music, Film } from 'lucide-react';

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
      navigate('/media/photos', { replace: true });
    }
  }, [location.pathname, navigate]);

  const navigateToTab = (tab: string) => {
    navigate(`/media/${tab}`);
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Sub-tab Navigation */}
      <div className="flex-none flex gap-2 border-b border-slate-700 overflow-x-auto bg-slate-950/50 backdrop-blur-sm sticky top-0 z-20">
        <button
          onClick={() => navigateToTab('articles')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
            activeSubTab === 'articles'
              ? 'border-blue-500 text-blue-500'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Newspaper className="h-5 w-5" />
          <span className="font-medium">Articles</span>
        </button>
        <button
          onClick={() => navigateToTab('photos')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
            activeSubTab === 'photos'
              ? 'border-blue-500 text-blue-500'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Image className="h-5 w-5" />
          <span className="font-medium">Images</span>
        </button>
        <button
          onClick={() => navigateToTab('audio')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
            activeSubTab === 'audio'
              ? 'border-blue-500 text-blue-500'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Music className="h-5 w-5" />
          <span className="font-medium">Audio</span>
        </button>
        <button
          onClick={() => navigateToTab('video')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
            activeSubTab === 'video'
              ? 'border-blue-500 text-blue-500'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Film className="h-5 w-5" />
          <span className="font-medium">Video</span>
        </button>
      </div>

      {/* Content with Suspense boundary - Use flex-grow to fill remaining space */}
      <div className="flex-grow relative min-h-0 overflow-y-auto">
        <Suspense
          fallback={
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          }
        >
          <div className="min-h-full flex flex-col">
             {activeSubTab === 'articles' && <ArticlesTab />}
             {activeSubTab === 'photos' && <MediaTab />}
             {activeSubTab === 'audio' && <AudioTab />}
             {activeSubTab === 'video' && <VideoTab />}
          </div>
        </Suspense>
      </div>
    </div>
  );
};

export default MediaAndArticlesTab;
