import React, { useState, useEffect } from 'react';
import {
  X,
  MessageSquare,
  Tag,
  Highlighter,
  FolderOpen,
  Plus,
  Save,
  Trash2,
  Edit3,
  Clock,
  CheckCircle,
  AlertTriangle,
  Flag,
} from 'lucide-react';

export interface EvidenceAnnotation {
  id: string;
  evidenceId: number;
  type: 'highlight' | 'note' | 'tag' | 'classification';
  content: string;
  color?: string;
  startOffset?: number;
  endOffset?: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  metadata?: Record<string, any>;
}

interface EvidenceAnnotationPanelProps {
  evidenceId: number;
  evidenceTitle: string;
  evidenceDescription?: string;
  investigationId: string;
  onClose: () => void;
  onAnnotationsChange?: (annotations: EvidenceAnnotation[]) => void;
}

const HIGHLIGHT_COLORS = [
  { name: 'Yellow', value: '#fef08a', class: 'bg-yellow-200' },
  { name: 'Green', value: '#bbf7d0', class: 'bg-green-200' },
  { name: 'Blue', value: '#bfdbfe', class: 'bg-blue-200' },
  { name: 'Pink', value: '#fbcfe8', class: 'bg-pink-200' },
  { name: 'Orange', value: '#fed7aa', class: 'bg-orange-200' },
];

const CLASSIFICATION_OPTIONS = [
  { label: 'Direct Evidence', value: 'direct', icon: CheckCircle, color: 'text-green-400' },
  {
    label: 'Circumstantial',
    value: 'circumstantial',
    icon: AlertTriangle,
    color: 'text-yellow-400',
  },
  { label: 'Corroborating', value: 'corroborating', icon: Flag, color: 'text-blue-400' },
  { label: 'Contradicting', value: 'contradicting', icon: X, color: 'text-red-400' },
  { label: 'Needs Review', value: 'needs_review', icon: Clock, color: 'text-orange-400' },
];

const COMMON_TAGS = [
  'financial',
  'communication',
  'travel',
  'relationship',
  'timeline',
  'witness',
  'physical',
  'digital',
  'key-evidence',
  'follow-up',
];

export const EvidenceAnnotationPanel: React.FC<EvidenceAnnotationPanelProps> = ({
  evidenceId,
  evidenceTitle,
  evidenceDescription,
  investigationId,
  onClose,
  onAnnotationsChange,
}) => {
  const [annotations, setAnnotations] = useState<EvidenceAnnotation[]>([]);
  const [activeTab, setActiveTab] = useState<'notes' | 'highlights' | 'tags' | 'classification'>(
    'notes',
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [newNote, setNewNote] = useState('');
  const [newHighlight, setNewHighlight] = useState({ text: '', color: HIGHLIGHT_COLORS[0].value });
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');
  const [classification, setClassification] = useState<string>('');
  const [classificationNotes, setClassificationNotes] = useState('');

  // Edit states
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [editNoteContent, setEditNoteContent] = useState('');

  useEffect(() => {
    loadAnnotations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evidenceId, investigationId]);

  const loadAnnotations = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/investigation/${investigationId}/evidence/${evidenceId}/annotations`,
      );
      if (response.ok) {
        const data = await response.json();
        setAnnotations(data.annotations || []);

        // Load existing tags and classification
        const existingTags = (data.annotations || [])
          .filter((a: EvidenceAnnotation) => a.type === 'tag')
          .map((a: EvidenceAnnotation) => a.content);
        setSelectedTags(existingTags);

        const existingClassification = (data.annotations || []).find(
          (a: EvidenceAnnotation) => a.type === 'classification',
        );
        if (existingClassification) {
          setClassification(existingClassification.content);
          setClassificationNotes(existingClassification.metadata?.notes || '');
        }
      }
    } catch (error) {
      console.error('Error loading annotations:', error);
      // Initialize with empty annotations from localStorage as fallback
      const stored = localStorage.getItem(`annotations_${investigationId}_${evidenceId}`);
      if (stored) {
        try {
          setAnnotations(JSON.parse(stored));
        } catch (_e) {
          setAnnotations([]);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const saveAnnotation = async (
    annotation: Omit<EvidenceAnnotation, 'id' | 'createdAt' | 'updatedAt'>,
  ) => {
    setSaving(true);
    const now = new Date().toISOString();
    const newAnnotation: EvidenceAnnotation = {
      ...annotation,
      id: `ann_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: now,
      updatedAt: now,
    };

    try {
      const response = await fetch(
        `/api/investigation/${investigationId}/evidence/${evidenceId}/annotations`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newAnnotation),
        },
      );

      if (response.ok) {
        const savedAnnotation = await response.json();
        const updated = [...annotations, savedAnnotation];
        setAnnotations(updated);
        onAnnotationsChange?.(updated);
      } else {
        // Fallback to local storage
        const updated = [...annotations, newAnnotation];
        setAnnotations(updated);
        localStorage.setItem(
          `annotations_${investigationId}_${evidenceId}`,
          JSON.stringify(updated),
        );
        onAnnotationsChange?.(updated);
      }
    } catch (error) {
      console.error('Error saving annotation:', error);
      // Fallback to local storage
      const updated = [...annotations, newAnnotation];
      setAnnotations(updated);
      localStorage.setItem(`annotations_${investigationId}_${evidenceId}`, JSON.stringify(updated));
      onAnnotationsChange?.(updated);
    } finally {
      setSaving(false);
    }
  };

  const updateAnnotation = async (id: string, updates: Partial<EvidenceAnnotation>) => {
    setSaving(true);
    const updatedAnnotations = annotations.map((a) =>
      a.id === id ? { ...a, ...updates, updatedAt: new Date().toISOString() } : a,
    );

    try {
      await fetch(
        `/api/investigation/${investigationId}/evidence/${evidenceId}/annotations/${id}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        },
      );
    } catch (_error) {
      // Continue with local update
    }

    setAnnotations(updatedAnnotations);
    localStorage.setItem(
      `annotations_${investigationId}_${evidenceId}`,
      JSON.stringify(updatedAnnotations),
    );
    onAnnotationsChange?.(updatedAnnotations);
    setSaving(false);
  };

  const deleteAnnotation = async (id: string) => {
    setSaving(true);
    try {
      await fetch(
        `/api/investigation/${investigationId}/evidence/${evidenceId}/annotations/${id}`,
        { method: 'DELETE' },
      );
    } catch (_error) {
      // Continue with local deletion
    }

    const updated = annotations.filter((a) => a.id !== id);
    setAnnotations(updated);
    localStorage.setItem(`annotations_${investigationId}_${evidenceId}`, JSON.stringify(updated));
    onAnnotationsChange?.(updated);
    setSaving(false);
  };

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    saveAnnotation({
      evidenceId,
      type: 'note',
      content: newNote.trim(),
    });
    setNewNote('');
  };

  const handleAddHighlight = () => {
    if (!newHighlight.text.trim()) return;
    saveAnnotation({
      evidenceId,
      type: 'highlight',
      content: newHighlight.text.trim(),
      color: newHighlight.color,
    });
    setNewHighlight({ text: '', color: HIGHLIGHT_COLORS[0].value });
  };

  const handleToggleTag = (tag: string) => {
    const existingTagAnnotation = annotations.find((a) => a.type === 'tag' && a.content === tag);

    if (existingTagAnnotation) {
      deleteAnnotation(existingTagAnnotation.id);
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      saveAnnotation({
        evidenceId,
        type: 'tag',
        content: tag,
      });
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleAddCustomTag = () => {
    if (!customTag.trim()) return;
    const normalizedTag = customTag.trim().toLowerCase().replace(/\s+/g, '-');
    if (!selectedTags.includes(normalizedTag)) {
      handleToggleTag(normalizedTag);
    }
    setCustomTag('');
  };

  const handleSetClassification = (value: string) => {
    const existingClassification = annotations.find((a) => a.type === 'classification');

    if (existingClassification) {
      updateAnnotation(existingClassification.id, {
        content: value,
        metadata: { notes: classificationNotes },
      });
    } else {
      saveAnnotation({
        evidenceId,
        type: 'classification',
        content: value,
        metadata: { notes: classificationNotes },
      });
    }
    setClassification(value);
  };

  const handleUpdateNoteEdit = () => {
    if (!editingNote || !editNoteContent.trim()) return;
    updateAnnotation(editingNote, { content: editNoteContent.trim() });
    setEditingNote(null);
    setEditNoteContent('');
  };

  const noteAnnotations = annotations.filter((a) => a.type === 'note');
  const highlightAnnotations = annotations.filter((a) => a.type === 'highlight');
  const classificationAnnotation = annotations.find((a) => a.type === 'classification');

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
        <div className="bg-slate-800 rounded-xl p-8 max-w-md">
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-8 w-48 bg-slate-700 rounded mb-4"></div>
            <div className="h-4 w-32 bg-slate-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col border border-slate-700">
        {/* Header */}
        <div className="border-b border-slate-700 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-semibold text-white truncate">{evidenceTitle}</h2>
              <p className="text-sm text-slate-400 mt-1">Annotate and classify this evidence</p>
              {evidenceDescription && (
                <p className="text-sm text-slate-500 mt-2 line-clamp-2">{evidenceDescription}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors shrink-0"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-6">
            {[
              { id: 'notes', label: 'Notes', icon: MessageSquare, count: noteAnnotations.length },
              {
                id: 'highlights',
                label: 'Highlights',
                icon: Highlighter,
                count: highlightAnnotations.length,
              },
              { id: 'tags', label: 'Tags', icon: Tag, count: selectedTags.length },
              {
                id: 'classification',
                label: 'Classification',
                icon: FolderOpen,
                count: classificationAnnotation ? 1 : 0,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {tab.count > 0 && (
                  <span
                    className={`px-1.5 py-0.5 text-xs rounded-full ${
                      activeTab === tab.id ? 'bg-blue-500' : 'bg-slate-600'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Notes Tab */}
          {activeTab === 'notes' && (
            <div className="space-y-4">
              {/* Add Note Form */}
              <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                <label className="block text-sm font-medium text-slate-300 mb-2">Add a Note</label>
                <textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Write your observations, analysis, or comments..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={3}
                />
                <div className="flex justify-end mt-3">
                  <button
                    onClick={handleAddNote}
                    disabled={!newNote.trim() || saving}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Note
                  </button>
                </div>
              </div>

              {/* Notes List */}
              <div className="space-y-3">
                {noteAnnotations.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">
                    No notes yet. Add your first note above.
                  </p>
                ) : (
                  noteAnnotations.map((note) => (
                    <div
                      key={note.id}
                      className="bg-slate-900 rounded-lg p-4 border border-slate-700"
                    >
                      {editingNote === note.id ? (
                        <div>
                          <textarea
                            value={editNoteContent}
                            onChange={(e) => setEditNoteContent(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 resize-none"
                            rows={3}
                          />
                          <div className="flex justify-end gap-2 mt-2">
                            <button
                              onClick={() => setEditingNote(null)}
                              className="px-3 py-1.5 text-sm text-slate-400 hover:text-white transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleUpdateNoteEdit}
                              className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                            >
                              <Save className="w-3 h-3" />
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-slate-200 whitespace-pre-wrap">{note.content}</p>
                          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-700">
                            <span className="text-xs text-slate-500">
                              <Clock className="w-3 h-3 inline mr-1" />
                              {new Date(note.createdAt).toLocaleString()}
                            </span>
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setEditingNote(note.id);
                                  setEditNoteContent(note.content);
                                }}
                                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
                                title="Edit"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => deleteAnnotation(note.id)}
                                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Highlights Tab */}
          {activeTab === 'highlights' && (
            <div className="space-y-4">
              {/* Add Highlight Form */}
              <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Add a Highlight
                </label>
                <textarea
                  value={newHighlight.text}
                  onChange={(e) => setNewHighlight({ ...newHighlight, text: e.target.value })}
                  placeholder="Paste or type the text you want to highlight..."
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={2}
                />
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-400">Color:</span>
                    {HIGHLIGHT_COLORS.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => setNewHighlight({ ...newHighlight, color: color.value })}
                        className={`w-6 h-6 rounded ${color.class} ${
                          newHighlight.color === color.value
                            ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900'
                            : ''
                        }`}
                        title={color.name}
                      />
                    ))}
                  </div>
                  <button
                    onClick={handleAddHighlight}
                    disabled={!newHighlight.text.trim() || saving}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Highlighter className="w-4 h-4" />
                    Add Highlight
                  </button>
                </div>
              </div>

              {/* Highlights List */}
              <div className="space-y-3">
                {highlightAnnotations.length === 0 ? (
                  <p className="text-slate-500 text-center py-8">
                    No highlights yet. Add key passages above.
                  </p>
                ) : (
                  highlightAnnotations.map((highlight) => (
                    <div
                      key={highlight.id}
                      className="bg-slate-900 rounded-lg p-4 border border-slate-700"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="w-4 h-4 rounded shrink-0 mt-0.5"
                          style={{ backgroundColor: highlight.color }}
                        />
                        <div className="flex-1">
                          <p
                            className="text-slate-200 px-2 py-1 rounded"
                            style={{ backgroundColor: highlight.color + '40' }}
                          >
                            {highlight.content}
                          </p>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-slate-500">
                              {new Date(highlight.createdAt).toLocaleString()}
                            </span>
                            <button
                              onClick={() => deleteAnnotation(highlight.id)}
                              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Tags Tab */}
          {activeTab === 'tags' && (
            <div className="space-y-6">
              {/* Common Tags */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">Common Tags</label>
                <div className="flex flex-wrap gap-2">
                  {COMMON_TAGS.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => handleToggleTag(tag)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        selectedTags.includes(tag)
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {selectedTags.includes(tag) && <span className="mr-1">✓</span>}
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Tag */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Add Custom Tag
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customTag}
                    onChange={(e) => setCustomTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddCustomTag()}
                    placeholder="Enter custom tag..."
                    className="flex-1 px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleAddCustomTag}
                    disabled={!customTag.trim() || saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Selected Tags */}
              {selectedTags.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-3">
                    Applied Tags ({selectedTags.length})
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {selectedTags.map((tag) => (
                      <span
                        key={tag}
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-900/50 text-blue-300 rounded-full text-sm border border-blue-700"
                      >
                        <Tag className="w-3 h-3" />
                        {tag}
                        <button
                          onClick={() => handleToggleTag(tag)}
                          className="ml-1 hover:text-white"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Classification Tab */}
          {activeTab === 'classification' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-3">
                  Evidence Classification
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {CLASSIFICATION_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleSetClassification(option.value)}
                      className={`flex items-center gap-3 p-4 rounded-lg border transition-colors ${
                        classification === option.value
                          ? 'bg-slate-700 border-blue-500'
                          : 'bg-slate-900 border-slate-700 hover:bg-slate-800'
                      }`}
                    >
                      <option.icon className={`w-5 h-5 ${option.color}`} />
                      <span className="text-white font-medium">{option.label}</span>
                      {classification === option.value && (
                        <CheckCircle className="w-5 h-5 text-blue-400 ml-auto" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Classification Notes */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Classification Notes
                </label>
                <textarea
                  value={classificationNotes}
                  onChange={(e) => setClassificationNotes(e.target.value)}
                  placeholder="Explain why you classified this evidence this way..."
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={4}
                />
                {classification && (
                  <div className="flex justify-end mt-3">
                    <button
                      onClick={() => {
                        const existing = annotations.find((a) => a.type === 'classification');
                        if (existing) {
                          updateAnnotation(existing.id, {
                            content: classification,
                            metadata: { notes: classificationNotes },
                          });
                        }
                      }}
                      disabled={saving}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      <Save className="w-4 h-4" />
                      Save Notes
                    </button>
                  </div>
                )}
              </div>

              {/* Current Classification Display */}
              {classificationAnnotation && (
                <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                  <div className="flex items-center gap-2 mb-2">
                    <FolderOpen className="w-4 h-4 text-blue-400" />
                    <span className="text-sm font-medium text-slate-300">
                      Current Classification
                    </span>
                  </div>
                  <p className="text-white font-medium">
                    {
                      CLASSIFICATION_OPTIONS.find(
                        (o) => o.value === classificationAnnotation.content,
                      )?.label
                    }
                  </p>
                  {classificationAnnotation.metadata?.notes && (
                    <p className="text-slate-400 text-sm mt-2">
                      {classificationAnnotation.metadata.notes}
                    </p>
                  )}
                  <p className="text-xs text-slate-500 mt-2">
                    Last updated: {new Date(classificationAnnotation.updatedAt).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-700 p-4 flex items-center justify-between">
          <div className="text-sm text-slate-400">
            {annotations.length} annotation{annotations.length !== 1 ? 's' : ''} on this evidence
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
