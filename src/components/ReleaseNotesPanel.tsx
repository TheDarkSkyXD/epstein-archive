import React from 'react';
import { Calendar, BookOpen } from 'lucide-react';

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
  error = null,
}) => {
  // Use the passed releaseNotes prop directly as the single source of truth
  const allReleaseNotes = releaseNotes;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-end z-50 p-0 md:p-4">
      <div className="bg-slate-900 rounded-none md:rounded-2xl w-full max-w-md h-full md:h-auto md:max-h-[90vh] border-l md:border border-slate-700 flex flex-col shadow-2xl animate-in slide-in-from-right duration-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-900 sticky top-0 z-10 md:rounded-t-2xl">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-cyan-400" />
            What's New
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white text-xl transition-colors"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-900">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-slate-400 animate-pulse">Loading release notes...</div>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full p-4">
              <div className="text-red-400 text-center bg-red-900/20 p-4 rounded-lg border border-red-900/50">
                <p className="font-medium mb-2">Could not load release notes</p>
                <p className="text-sm opacity-80">{error}</p>
              </div>
            </div>
          ) : allReleaseNotes.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-slate-500 text-center italic">
                <p>No release notes available</p>
              </div>
            </div>
          ) : (
            <div className="space-y-8 pb-8">
              {allReleaseNotes.map((release, index) => (
                <div
                  key={index}
                  className="relative pl-4 border-l-2 border-slate-800 last:border-l-0"
                >
                  {/* Timeline Dot */}
                  <div
                    className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 ${index === 0 ? 'bg-cyan-500 border-cyan-900 shadow-[0_0_10px_rgba(6,182,212,0.5)]' : 'bg-slate-800 border-slate-600'}`}
                  ></div>

                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-sm font-mono font-bold ${index === 0 ? 'text-cyan-400' : 'text-slate-400'}`}
                      >
                        {release.version}
                      </span>
                      <span className="text-xs text-slate-500 flex items-center gap-1 bg-slate-800/50 px-2 py-0.5 rounded-full border border-slate-700/50">
                        <Calendar className="h-3 w-3" />
                        {release.date}
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-white leading-tight">
                      {release.title}
                    </h3>
                  </div>

                  <div className="space-y-3 bg-slate-800/30 rounded-lg p-4 border border-slate-700/50">
                    {release.notes.map((note, noteIndex) => {
                      // Check if this is a markdown header (### text)
                      if (note.startsWith('### ')) {
                        const headerText = note.substring(4).trim();
                        return (
                          <h4
                            key={noteIndex}
                            className="text-base font-semibold text-cyan-300 mt-4 first:mt-0 mb-2"
                          >
                            {headerText}
                          </h4>
                        );
                      }

                      // Regular bullet point
                      return (
                        <div key={noteIndex} className="flex items-start gap-3">
                          <span className="text-cyan-500/70 mt-1.5 text-[10px]">●</span>
                          <div className="text-sm text-slate-300 leading-relaxed">
                            {note.split(/(\*\*.*?\*\*)/).map((part, i) =>
                              part.startsWith('**') && part.endsWith('**') ? (
                                <strong key={i} className="font-semibold text-cyan-100">
                                  {part.slice(2, -2)}
                                </strong>
                              ) : (
                                <span key={i}>{part}</span>
                              ),
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900 text-center sticky bottom-0 z-10">
          <p className="text-xs text-slate-500">Epstein Archive Investigation Tool</p>
        </div>
      </div>
    </div>
  );
};
