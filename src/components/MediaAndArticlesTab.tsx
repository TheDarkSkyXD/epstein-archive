import React, { useState, Suspense } from 'react';
import { Newspaper, Image, Music, Film } from 'lucide-react';

// Lazy load the tabs to prevent crashes
const ArticlesTab = React.lazy(() => import('./ArticlesTab'));
const MediaTab = React.lazy(() => import('./MediaTab'));
const AudioTab = React.lazy(() => import('./AudioTab'));
const VideoTab = React.lazy(() => import('./VideoTab'));

export const MediaAndArticlesTab: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'articles' | 'media' | 'audio' | 'video'>(
    'media',
  );

  return (
    <div className="space-y-6">
      {/* Sub-tab Navigation */}
      <div className="flex gap-2 border-b border-slate-700 overflow-x-auto">
        <button
          onClick={() => setActiveSubTab('articles')}
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
          onClick={() => setActiveSubTab('media')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
            activeSubTab === 'media'
              ? 'border-blue-500 text-blue-500'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Image className="h-5 w-5" />
          <span className="font-medium">Media</span>
        </button>
        <button
          onClick={() => setActiveSubTab('audio')}
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
          onClick={() => setActiveSubTab('video')}
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

      {/* Content with Suspense boundary */}
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        }
      >
        {activeSubTab === 'articles' && <ArticlesTab />}
        {activeSubTab === 'media' && <MediaTab />}
        {activeSubTab === 'audio' && <AudioTab />}
        {activeSubTab === 'video' && <VideoTab />}
      </Suspense>
    </div>
  );
};

export default MediaAndArticlesTab;
