import React from 'react';
import { Image, FileText, Link } from 'lucide-react';
import { RedFlagIndex } from './RedFlagIndex';
import { BaseCard } from './BaseCard';

interface MediaItem {
  id: string;
  title: string;
  thumbnail?: string;
  fileType: string;
  fileSize: string;
  linkedEntities: number;
  linkedDocument?: string;
}

interface MediaCardProps {
  media: MediaItem;
  onClick: () => void;
}

export const MediaCard: React.FC<MediaCardProps> = ({ media, onClick }) => {
  return (
    <BaseCard onClick={onClick} className="group">
      <div className="flex items-start justify-between mb-[var(--space-3)]">
        <div className="flex items-center space-x-[var(--space-3)]">
          <div className="bg-[var(--bg-subtle)] rounded-[var(--radius-md)] p-[var(--space-3)] group-hover:bg-[var(--accent-soft-primary)] transition-all duration-300">
            {media.thumbnail ? (
              <img 
                src={media.thumbnail} 
                alt={media.title} 
                className="h-12 w-12 object-cover rounded-[var(--radius-sm)]"
              />
            ) : (
              <Image className="h-6 w-6 text-[var(--text-tertiary)] group-hover:text-[var(--accent-primary)]" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[var(--font-size-h4)] font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors truncate">
              {media.title}
            </h3>
            <div className="flex items-center space-x-[var(--space-2)] mt-[var(--space-1)]">
              <span className="px-[var(--space-2)] py-[var(--space-1)] bg-[var(--bg-subtle)] text-[var(--text-secondary)] rounded-full text-[var(--font-size-small)]">
                {media.fileType}
              </span>
              <span className="text-[var(--font-size-small)] text-[var(--text-tertiary)]">
                {media.fileSize}
              </span>
            </div>
          </div>
        </div>
        <RedFlagIndex value={media.linkedEntities} size="sm" />
      </div>

      <div className="space-y-[var(--space-3)]">
        {/* Linked entities count */}
        <div className="flex items-center text-[var(--font-size-caption)] text-[var(--text-tertiary)]">
          <Link className="h-4 w-4 mr-1" />
          <span>{media.linkedEntities} linked entities</span>
        </div>

        {/* Linked document */}
        {media.linkedDocument && (
          <div className="flex items-start text-[var(--font-size-caption)] text-[var(--text-secondary)]">
            <FileText className="h-4 w-4 mr-1 mt-0.5 flex-shrink-0" />
            <span className="truncate">{media.linkedDocument}</span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-[var(--space-4)] mt-[var(--space-3)] border-t border-[var(--border-subtle)]">
        <button className="text-[var(--font-size-small)] text-[var(--text-tertiary)] hover:text-[var(--accent-primary)] transition-colors">
          View in Timeline
        </button>
        <button className="text-[var(--font-size-small)] text-[var(--accent-primary)] font-medium hover:text-[var(--accent-secondary)] transition-colors">
          Open Media
        </button>
      </div>
    </BaseCard>
  );
};