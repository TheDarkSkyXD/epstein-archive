// TODO: Add media filtering state - see UNUSED_VARIABLES_RECOMMENDATIONS.md
import React, { useState as _useState } from 'react';
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
