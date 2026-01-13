import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface SensitiveWarningBannerProps {
  /** Type of media for contextual warning message */
  mediaType: 'audio' | 'video' | 'photo';
}

/**
 * Shared sensitive content warning banner displayed when viewing
 * albums containing potentially disturbing material.
 */
export function SensitiveWarningBanner({
  mediaType,
}: SensitiveWarningBannerProps): React.ReactElement {
  const mediaTypeLabel =
    mediaType === 'audio' ? 'audio' : mediaType === 'video' ? 'video' : 'image';
  const discretionLabel =
    mediaType === 'audio' ? 'Listener' : mediaType === 'video' ? 'Viewer' : 'Viewer';

  return (
    <div className="bg-red-900/80 border-b border-red-700 px-4 py-3 flex items-start gap-3">
      <AlertTriangle className="text-red-400 shrink-0 mt-0.5" size={20} />
      <div>
        <h4 className="text-red-200 font-bold text-sm uppercase tracking-wider">
          Sensitive & Disturbing Content
        </h4>
        <p className="text-red-300/90 text-sm mt-1">
          This album contains {mediaTypeLabel} testimony from victims and survivors. Content may be
          graphic, traumatic, and disturbing. {discretionLabel} discretion is strongly advised.
        </p>
      </div>
    </div>
  );
}

export default SensitiveWarningBanner;
