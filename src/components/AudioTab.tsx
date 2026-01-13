import React, { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { AudioBrowser } from './AudioBrowser';

const AudioTab: React.FC = () => {
  const location = useLocation();
  
  const initialAlbumId = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const id = params.get('albumId');
    return id ? parseInt(id, 10) : undefined;
  }, [location.search]);

  return (
    <div className="h-full">
      <AudioBrowser initialAlbumId={initialAlbumId} />
    </div>
  );
};

export default AudioTab;
