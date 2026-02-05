import React from 'react';
import PhotoBrowser from './PhotoBrowser';

type MediaTabProps = Record<string, never>;

export const MediaTab: React.FC<MediaTabProps> = () => {
  return (
    <div className="h-full">
      <PhotoBrowser />
    </div>
  );
};

export default MediaTab;
