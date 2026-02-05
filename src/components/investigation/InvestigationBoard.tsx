import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Target, FileText, BookOpen, GripVertical, Plus } from 'lucide-react';
import { EvidenceItem, Hypothesis } from '../../types/investigation';

import { DocumentModal } from '../documents/DocumentModal';
import { BoardOnboarding } from './BoardOnboarding';

interface InvestigationBoardProps {
  investigationId: string;
}

export const InvestigationBoard: React.FC<InvestigationBoardProps> = ({ investigationId }) => {
  const [hypotheses, setHypotheses] = useState<Hypothesis[]>([]);
  const [evidence, setEvidence] = useState<EvidenceItem[]>([]);
  const [notebook, setNotebook] = useState<any[]>([]); // Placeholder for notebook items
  const [draggedEvidence, setDraggedEvidence] = useState<EvidenceItem | null>(null);
  const [loading, setLoading] = useState(true);

  // Viewer State
  const [viewingEvidence, setViewingEvidence] = useState<EvidenceItem | null>(null);

  // Hypothesis Creation State
  const [showHypothesisModal, setShowHypothesisModal] = useState(false);
  const [newHypothesisTitle, setNewHypothesisTitle] = useState('');
  const [newHypothesisDesc, setNewHypothesisDesc] = useState('');

  // Onboarding State
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem('board_onboarding_seen');
    if (!seen) {
      setShowOnboarding(true);
    }
  }, []);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    localStorage.setItem('board_onboarding_seen', 'true');
  };

  // Fetch Data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [hypRes, evRes, nbRes] = await Promise.all([
          fetch(`/api/investigations/${investigationId}/hypotheses`),
          fetch(`/api/investigation/${investigationId}/evidence-summary`), // Note inconsistent api path in original files
          fetch(`/api/investigations/${investigationId}/notebook`),
        ]);

        if (hypRes.ok) setHypotheses(await hypRes.json());
        if (evRes.ok) {
          const evData = await evRes.json();
          setEvidence(evData.evidence || []);
        }
        if (nbRes.ok) {
          // adaptation for notebook structure
          const nbData = await nbRes.json();
          setNotebook(nbData.order || []);
        }
      } catch (error) {
        console.error('Failed to load investigation board data', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [investigationId]);

  // Drag and Drop Handlers
  const handleCreateHypothesis = async () => {
    if (!newHypothesisTitle.trim()) return;

    try {
      const res = await fetch(`/api/investigations/${investigationId}/hypotheses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newHypothesisTitle,
          description: newHypothesisDesc,
          status: 'draft',
        }),
      });

      if (res.ok) {
        const newHyp = await res.json();
        setHypotheses([...hypotheses, newHyp]);
        setShowHypothesisModal(false);
        setNewHypothesisTitle('');
        setNewHypothesisDesc('');
      }
    } catch (err) {
      console.error('Failed to create hypothesis', err);
    }
  };

  const handleDragStart = (e: React.DragEvent, item: EvidenceItem) => {
    setDraggedEvidence(item);
    e.dataTransfer.setData('application/json', JSON.stringify(item));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // Necessary to allow dropping
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDropOnHypothesis = async (e: React.DragEvent, hypothesisId: string) => {
    e.preventDefault();
    if (!draggedEvidence) return;

    // Logic to link evidence to hypothesis
    try {
      console.log(`Linking evidence ${draggedEvidence.id} to hypothesis ${hypothesisId}`);
      const res = await fetch(
        `/api/investigations/${investigationId}/hypotheses/${hypothesisId}/evidence`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ evidenceId: draggedEvidence.id, relevance: 'supporting' }),
        },
      );

      if (res.ok) {
        // Optimistic update
        setHypotheses((prev) =>
          prev.map((h) => {
            if (h.id === hypothesisId) {
              return {
                ...h,
                evidenceLinks: [
                  ...((h as any).evidenceLinks || []),
                  {
                    id: `temp-${Date.now()}`,
                    evidenceId: draggedEvidence.id,
                    evidence_title: draggedEvidence.title,
                    relevance: 'supporting',
                  },
                ],
              };
            }
            return h;
          }),
        );
      }
    } catch (err) {
      console.error('Failed to link evidence', err);
    }
    setDraggedEvidence(null);
  };

  const handleDropOnNotebook = async (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedEvidence) return;

    // Logic to add evidence to notebook
    try {
      console.log(`Adding evidence ${draggedEvidence.id} to notebook`);
      const newOrder = [...notebook, draggedEvidence.id];

      const res = await fetch(`/api/investigations/${investigationId}/notebook`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: newOrder }),
      });

      if (res.ok) {
        setNotebook(newOrder);
      }
    } catch (err) {
      console.error('Failed to update notebook', err);
    }
    setDraggedEvidence(null);
  };

  if (loading)
    return <div className="p-10 text-center text-slate-400">Loading Investigation Board...</div>;

  return (
    <div className="flex h-full bg-slate-950 overflow-hidden">
      {/* Header Actions */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={() => window.open(`/api/investigations/${investigationId}/briefing`, '_blank')}
          className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg shadow-lg transition-colors"
        >
          <FileText className="w-4 h-4" />
          Export Briefing
        </button>
      </div>

      {/* Column 1: Hypotheses */}
      <div className="w-1/3 border-r border-slate-800 flex flex-col min-w-[300px]">
        <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-400" />
            <h3 className="font-semibold text-white">Hypotheses</h3>
          </div>
          <button
            onClick={() => setShowHypothesisModal(true)}
            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* New Hypothesis Input Area */}
        {showHypothesisModal && (
          <div className="p-4 bg-slate-800/50 border-b border-slate-700 animate-in slide-in-from-top-2">
            <input
              type="text"
              placeholder="Theory title..."
              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white mb-2 focus:ring-2 focus:ring-purple-500 outline-none"
              value={newHypothesisTitle}
              onChange={(e) => setNewHypothesisTitle(e.target.value)}
              autoFocus
            />
            <textarea
              placeholder="Description..."
              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white mb-2 focus:ring-2 focus:ring-purple-500 outline-none resize-none"
              rows={2}
              value={newHypothesisDesc}
              onChange={(e) => setNewHypothesisDesc(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowHypothesisModal(false)}
                className="text-xs text-slate-400 hover:text-white px-2 py-1"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateHypothesis}
                disabled={!newHypothesisTitle.trim()}
                className="bg-purple-600 hover:bg-purple-500 text-white text-xs px-3 py-1 rounded disabled:opacity-50"
              >
                Add Theory
              </button>
            </div>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900/20">
          {hypotheses.map((h) => (
            <div
              key={h.id}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDropOnHypothesis(e, h.id)}
              className="p-4 rounded-lg bg-slate-800 border border-slate-700 hover:border-purple-500/50 transition-colors group"
            >
              <h4 className="font-medium text-white mb-2">{h.title}</h4>
              <p className="text-sm text-slate-400 line-clamp-2">{h.description}</p>
              <div className="mt-3 text-xs text-slate-500 space-y-2">
                <div className="flex items-center justify-between">
                  <span>{(h as any).evidenceLinks?.length || 0} Evidence</span>
                  <span
                    className={`px-2 py-0.5 rounded-full ${h.status === 'confirmed' ? 'bg-green-900/50 text-green-400' : 'bg-slate-700'}`}
                  >
                    {h.status}
                  </span>
                </div>

                {/* Linked Evidence List */}
                {(h as any).evidenceLinks?.length > 0 && (
                  <div className="space-y-1 pt-2 border-t border-slate-700/50">
                    {(h as any).evidenceLinks.map((link: any) => (
                      <div key={link.id} className="flex items-center gap-1.5 text-slate-400">
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${link.relevance === 'contradicting' ? 'bg-red-500' : 'bg-green-500'}`}
                        />
                        <span className="truncate">
                          {link.evidence_title || 'Untitled Evidence'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {hypotheses.length === 0 && (
            <div className="text-center p-8 text-slate-500 border-2 border-dashed border-slate-800 rounded-lg flex flex-col items-center gap-2">
              <Target className="w-8 h-8 text-slate-600 mb-2" />
              <p className="font-medium text-slate-400">No hypotheses yet</p>
              <p className="text-sm">Click the + button above to define a theory to test.</p>
            </div>
          )}
        </div>
      </div>

      {/* Column 2: Evidence Pool */}
      <div className="w-1/3 border-r border-slate-800 flex flex-col min-w-[300px] bg-slate-950">
        <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            <h3 className="font-semibold text-white">Evidence Pool</h3>
          </div>
          <div className="text-xs text-slate-400">Drag items to Hypotheses or Notebook</div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {evidence.map((e) => (
            <div
              key={e.id}
              draggable
              onDragStart={(ev) => handleDragStart(ev, e)}
              onClick={() => setViewingEvidence(e)}
              className="p-3 rounded bg-slate-900 border border-slate-800 hover:border-blue-500/50 cursor-grab active:cursor-grabbing flex items-start gap-3 group hover:bg-slate-800/50 transition-colors"
            >
              <GripVertical className="w-4 h-4 text-slate-600 mt-1" />
              <div>
                <h4 className="text-sm font-medium text-slate-200 group-hover:text-blue-300 transition-colors">
                  {e.title}
                </h4>
                <p className="text-xs text-slate-500 line-clamp-1 mt-1">{e.description}</p>
                <span className="inline-block mt-2 px-1.5 py-0.5 bg-slate-800 rounded text-[10px] text-slate-400 uppercase tracking-wider">
                  {e.type || (e as any).evidence_type}
                </span>
              </div>
            </div>
          ))}
          {evidence.length === 0 && (
            <div className="text-center p-8 text-slate-500 flex flex-col items-center gap-2">
              <FileText className="w-8 h-8 text-slate-600 mb-2" />
              <p className="font-medium text-slate-400">Evidence Pool is empty</p>
              <p className="text-sm max-w-[200px]">
                Browse documents or entities and click "Add to Investigation" to collect them here.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Column 3: Case Narrative (Notebook) */}
      <div className="w-1/3 flex flex-col min-w-[300px]">
        <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-400" />
            <h3 className="font-semibold text-white">Case Narrative</h3>
          </div>
        </div>
        <div
          className="flex-1 overflow-y-auto p-4 bg-slate-900/20"
          onDragOver={handleDragOver}
          onDrop={handleDropOnNotebook}
        >
          <div className="min-h-[200px] p-4 border-2 border-dashed border-slate-800/50 rounded-lg flex flex-col items-center justify-center text-slate-500 hover:bg-slate-800/30 transition-colors">
            {notebook.length === 0 && (
              <span className="mb-2">Drag evidence here to build your case</span>
            )}

            {/* Notebook Items */}
            <div className="w-full space-y-2 mt-4">
              {notebook.map((itemId, idx) => {
                const ev = evidence.find((e) => e.id === itemId);
                return (
                  <div
                    key={`${itemId}-${idx}`}
                    className="p-3 bg-slate-800 rounded border border-slate-700 flex flex-col gap-2"
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-slate-500 font-mono text-xs mt-0.5">{idx + 1}.</span>
                      {ev ? (
                        <div>
                          <h4 className="text-sm font-medium text-slate-200">{ev.title}</h4>
                          <p className="text-xs text-slate-400 line-clamp-2">{ev.description}</p>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-500">Loading item {itemId}...</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Evidence Viewer Modal */}
      {viewingEvidence && (
        <DocumentModal id={viewingEvidence.id} onClose={() => setViewingEvidence(null)} />
      )}

      {/* Onboarding Guide */}
      <AnimatePresence>
        {showOnboarding && (
          <BoardOnboarding
            onComplete={handleOnboardingComplete}
            onSkip={handleOnboardingComplete}
          />
        )}
      </AnimatePresence>
    </div>
  );
};
