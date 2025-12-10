
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
  const allReleaseNotes = [
    {
      version: 'v4.6.0',
      date: 'December 10, 2025',
      title: 'Mobile Perfection & Analytics Power',
      notes: [
        'Interactive Mobile Stats: Stats cards are now clickable navigation buttons',
        'Smart Tooltips: Fixed mobile overflow with intelligent "bottom-end" positioning',
        'Media Metadata: Fixed "NaN MB" / "Unknown" dates in photo browser',
        'Performance: Optimized thumbnail loading and image display',
        'Analytics: Verified data flow and increased network visualization limit to 100 nodes',
        'UI Polish: Removed redundant mobile search and fixed header alignment'
      ]
    },
    {
      version: 'v4.5.0',
      date: 'December 9, 2025',
      title: 'Smart OCR Paragraph Reconstruction',
      notes: [
        'Implemented heuristic algorithm to reconstruct logical paragraphs from broken OCR lines',
        'Fixed "wall of text" readability issues by correctly handling newlines',
        'Preserved list items, headers, and bullet points during text cleanup',
        'Enhanced readability of historical documents with proper spacing'
      ]
    },
    {
      version: 'v4.4.0',
      date: 'December 9, 2025',
      title: 'Unified Document Rendering & OCR Prettifier',
      notes: [
        'Unified Document Content Renderer: Consistent specialized views for Emails, Spreadsheets, and Images across Browser and Modal',
        'OCR Text Prettifier: Toggle between raw and cleaned text for better readability',
        'Enhanced Email and Financial document support in full-screen modal',
        'Improved image viewer with OCR text extraction details'
      ]
    },
    {
      version: 'v4.2.0',
      date: 'December 9, 2025',
      title: 'Mobile UX Overhaul & Data Validation',
      notes: [
        'Complete mobile-first redesign: 530+ lines of responsive CSS utilities',
        'EvidenceModal: restructured header, single-column stats on mobile, horizontal scrollable chips with 44px touch targets',
        'DocumentBrowser: stacking search/filter on mobile, horizontally scrollable category chips',
        'Data integrity validated: 4,711 documents, 12,447 entities, 44,722 relationships',
        'Code cleanup: removed duplicate console.logs and debug statements'
      ]
    },
    {
      version: 'v4.1.0',
      date: 'December 8, 2025',
      title: 'Risk Filtering & UX Polish',
      notes: [
        'Fixed risk filter chips: HIGH (RFI 4-5), MEDIUM (RFI 2-3), LOW (RFI 0-1) now correctly filter subjects',
        'Removed cluttered toast notifications for cleaner loading experience',
        'End-to-end data verification with proper filter passthrough from frontend to API',
        'Improved entity statistics with accurate risk distribution counts'
      ]
    },
    {
      version: 'v4.0.0',
      date: 'December 7, 2025',
      title: 'Document Classification & Email Thread Splitting',
      notes: [
        'Intelligent document classification: 3,513 emails, 1,100 documents, 53 photos, 25 legal, 12 depositions',
        'Email thread splitting: 1,791 individual emails extracted from multi-email files',
        'Email viewer with parsed headers (From, To, Cc, Date, Subject) displayed in document viewer',
        'Evidence type indicators in document browser (📧 Email, ⚖️ Legal, 📜 Deposition)',
        'Thread navigation support for related email conversations'
      ]
    },
    {
      version: 'v3.9.1',
      date: 'December 7, 2025',
      title: 'Platform Stabilization & Media Fixes',
      notes: [
        'Restored missing Media Gallery tables and functionality',
        'Fixed persistent server errors on Documents and Statistics endpoints',
        'Verified end-to-end data integrity for production deployment',
        'Optimized database schema for improved query performance'
      ]
    },
    {
      version: 'v3.9.0',
      date: 'December 6, 2025',
      title: 'Global Platform Upgrade & Database Re-architecture',
      notes: [
        'Complete database schema overhaul to strict relational model',
        'Full CSV data ingestion pipeline validated and deployed',
        'Enhanced entity risk scoring (Red Flag 🚩) implementation',
        'Backend service alignment with new optimized schema'
      ]
    },
    {
      version: 'v3.8.0',
      date: 'December 6, 2025',
      title: 'Investigation Integration & UI Refinements',
      notes: [
        'Add evidence to investigations directly from entities, documents, or search results throughout the app',
        'Action buttons (New, Shortcuts, Sources) moved next to search field with smooth hover-expand animations',
        'Timeline now supports ascending/descending sort toggle for flexible event ordering',
        'Sources button navigates to About page with detailed source information on hover',
        'Cleaner UI with subtle styling for original filenames and improved component reliability'
      ]
    },
    {
      version: 'v3.7.0',
      date: 'December 6, 2025',
      title: 'Dataset Separation, Mobile UX polish, Release-ready build',
      notes: [
        'Filesystem ingest + classification + enrichment for clean evidence types',
        'Structured fields for emails/legal; metadata headers and contacts extraction',
        'Mobile: subtle loading pill and compact "Red Flags" sort label',
        'Header actions aligned to search with pill expansion and hover popups',
        'Scoped error boundaries and toasts for resilient panels and feedback'
      ]
    },
    {
      version: 'v3.5.0',
      date: 'December 5, 2025',
      title: 'Legacy Feature Set',
      notes: [
        'Core search and entity browsing functionality',
        'Initial implementation of network graph visualization',
        'Basic document viewer integration'
      ]
    },
    ...releaseNotes
  ];

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
          ) : allReleaseNotes.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-[var(--text-secondary)] text-center">
                <p>No release notes available</p>
              </div>
            </div>
          ) : (
            <div className="space-y-[var(--space-6)]">
              {allReleaseNotes.map((release, index) => (
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
