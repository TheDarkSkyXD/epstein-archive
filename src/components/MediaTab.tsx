import React from 'react';
import PhotoBrowser from './PhotoBrowser';

interface MediaTabProps {
  // Props can be added as needed
}

export const MediaTab: React.FC<MediaTabProps> = () => {
  return (
    <div className="h-full">
      <PhotoBrowser />
    </div>
  );
};

export default MediaTab;
