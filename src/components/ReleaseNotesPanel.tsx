import React, { useState, useEffect } from 'react';
import { X, Calendar, BookOpen } from 'lucide-react';

interface ReleaseNote {
  version: string;
  date: string;
  title: string;
  notes: string[];
}

interface ReleaseNotesPanelProps {
  isOpen: boolean;
  onClose: () => void;
  releaseNotes: ReleaseNote[];
  isLoading?: boolean;
  error?: string | null;
}

export const ReleaseNotesPanel: React.FC<ReleaseNotesPanelProps> = ({ 
  isOpen, 
  onClose,
  releaseNotes,
  isLoading = false,
  error = null
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-end z-50 p-4">
      <div className="bg-[var(--bg-elevated)] rounded-[var(--radius-lg)] w-full max-w-md h-full md:h-auto md:max-h-[90vh] border border-[var(--border-strong)] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-[var(--space-4)] border-b border-[var(--border-subtle)]">
          <h2 className="text-[var(--font-size-h3)] font-bold text-[var(--text-primary)] flex items-center">
            <BookOpen className="h-5 w-5 mr-[var(--space-2)] text-[var(--accent-primary)]" />
            What's New
          </h2>
          <button
            onClick={onClose}
            className="p-[var(--space-2)] hover:bg-[var(--bg-subtle)] rounded-[var(--radius-md)] transition-colors"
          >
            <X className="h-5 w-5 text-[var(--text-tertiary)]" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-[var(--space-4)]">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-[var(--text-secondary)]">Loading release notes...</div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-[var(--accent-danger)] text-center">
                <p className="font-medium mb-[var(--space-2)]">Could not load release notes</p>
                <p className="text-[var(--font-size-caption)]">{error}</p>
              </div>
            </div>
          ) : releaseNotes.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-[var(--text-secondary)] text-center">
                <p>No release notes available</p>
              </div>
            </div>
          ) : (
            <div className="space-y-[var(--space-6)]">
              {releaseNotes.map((release, index) => (
                <div key={index} className="pb-[var(--space-6)] border-b border-[var(--border-subtle)] last:border-b-0 last:pb-0">
                  <div className="flex items-start justify-between mb-[var(--space-3)]">
                    <div>
                      <h3 className="text-[var(--font-size-h4)] font-semibold text-[var(--text-primary)]">
                        {release.title}
                      </h3>
                      <div className="flex items-center text-[var(--font-size-caption)] text-[var(--text-tertiary)] mt-[var(--space-1)]">
                        <span className="font-mono">{release.version}</span>
                        <span className="mx-[var(--space-2)]">•</span>
                        <span className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {release.date}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <ul className="space-y-[var(--space-2)]">
                    {release.notes.map((note, noteIndex) => (
                      <li key={noteIndex} className="flex items-start">
                        <span className="text-[var(--accent-primary)] mr-[var(--space-2)] mt-1">•</span>
                        <span className="text-[var(--font-size-body)] text-[var(--text-secondary)]">
                          {note}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-[var(--space-4)] border-t border-[var(--border-subtle)] text-center">
          <p className="text-[var(--font-size-caption)] text-[var(--text-tertiary)]">
            Epstein Archive Investigation Tool
          </p>
        </div>
      </div>
    </div>
  );
};