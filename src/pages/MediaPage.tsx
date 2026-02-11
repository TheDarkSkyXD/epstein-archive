import React from 'react';
import { MediaAndArticlesTab } from '../components/media/MediaAndArticlesTab';
import ScopedErrorBoundary from '../components/common/ScopedErrorBoundary';

export const MediaPage: React.FC = () => {
  return (
    <ScopedErrorBoundary>
      <MediaAndArticlesTab />
    </ScopedErrorBoundary>
  );
};
