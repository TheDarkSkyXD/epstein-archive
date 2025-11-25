import React from 'react';
import { FileText, Calendar, Hash } from 'lucide-react';
import { RedFlagIndex } from './RedFlagIndex';
import { BaseCard } from './BaseCard';

interface Document {
  id: string;
  title: string;
  filename: string;
  source: 'Seventh Production' | 'Black Book' | 'Public Record';
  spiceRating?: number;
  mentions?: number;
  date?: string;
  fileSize?: string;
  fileType?: string;
}

interface DocumentCardProps {
  document: Document;
  onClick: () => void;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({ document, onClick }) => {
  // Get source badge color
  const getSourceColor = (source: string) => {
    switch (source) {
      case 'Black Book':
        return 'bg-[var(--accent-soft-danger)] text-[var(--accent-danger)]';
      case 'Seventh Production':
        return 'bg-[var(--accent-soft-primary)] text-[var(--accent-primary)]';
      case 'Public Record':
        return 'bg-[var(--accent-soft-secondary)] text-[var(--accent-secondary)]';
      default:
        return 'bg-[var(--bg-subtle)] text-[var(--text-secondary)]';
    }
  };

  return (
    <BaseCard onClick={onClick} className="group">
      <div className="flex items-start justify-between mb-[var(--space-3)]">
        <div className="flex items-center space-x-[var(--space-3)]">
          <div className="bg-[var(--bg-subtle)] rounded-[var(--radius-md)] p-[var(--space-3)] group-hover:bg-[var(--accent-soft-primary)] transition-all duration-300">
            <FileText className="h-6 w-6 text-[var(--text-tertiary)] group-hover:text-[var(--accent-primary)]" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[var(--font-size-h4)] font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors truncate">
              {document.title || document.filename}
            </h3>
            <div className="flex items-center space-x-[var(--space-2)] mt-[var(--space-1)]">
              <span className={`px-[var(--space-2)] py-[var(--space-1)] rounded-full text-[var(--font-size-small)] ${getSourceColor(document.source)}`}>
                {document.source}
              </span>
            </div>
          </div>
        </div>
        <RedFlagIndex value={document.spiceRating || 0} size="sm" />
      </div>

      <div className="space-y-[var(--space-3)]">
        {/* Document metadata */}
        <div className="flex flex-wrap gap-[var(--space-4)] text-[var(--font-size-caption)] text-[var(--text-secondary)]">
          {document.fileType && (
            <div className="flex items-center">
              <Hash className="h-4 w-4 mr-1" />
              <span>{document.fileType}</span>
            </div>
          )}
          {document.fileSize && (
            <div className="flex items-center">
              <span>{document.fileSize}</span>
            </div>
          )}
          {document.date && (
            <div className="flex items-center">
              <Calendar className="h-4 w-4 mr-1" />
              <span>{document.date}</span>
            </div>
          )}
        </div>

        {/* Mentions count */}
        {document.mentions !== undefined && (
          <div className="flex items-center text-[var(--font-size-caption)] text-[var(--text-tertiary)]">
            <Hash className="h-4 w-4 mr-1" />
            <span>{document.mentions} mentions</span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-[var(--space-4)] mt-[var(--space-3)] border-t border-[var(--border-subtle)]">
        <button className="text-[var(--font-size-small)] text-[var(--text-tertiary)] hover:text-[var(--accent-primary)] transition-colors">
          View in Investigation
        </button>
        <button className="text-[var(--font-size-small)] text-[var(--accent-primary)] font-medium hover:text-[var(--accent-secondary)] transition-colors">
          Open Document
        </button>
      </div>
    </BaseCard>
  );
};