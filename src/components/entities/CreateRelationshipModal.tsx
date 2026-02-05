import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Network, Save, Search } from 'lucide-react';
import { apiClient } from '../../services/apiClient';
import FormField from '../common/FormField';
import { useModalFocusTrap } from '../../hooks/useModalFocusTrap';
import { useToasts } from '../common/ToastProvider';
import { Person } from '../../types';

interface CreateRelationshipModalProps {
  onClose: () => void;
  onSuccess: () => void;
  initialSourceId?: string;
  initialTargetId?: string;
}

export const CreateRelationshipModal: React.FC<CreateRelationshipModalProps> = ({
  onClose,
  onSuccess,
  initialSourceId,
  initialTargetId,
}) => {
  const { modalRef } = useModalFocusTrap(true);
  const { addToast } = useToasts();
  const [loading, setLoading] = useState(false);

  // Entity Search State
  const [sourceSearch, setSourceSearch] = useState('');
  const [targetSearch, setTargetSearch] = useState('');
  const [sourceResults, setSourceResults] = useState<Person[]>([]);
  const [targetResults, setTargetResults] = useState<Person[]>([]);
  const [selectedSource, setSelectedSource] = useState<Person | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<Person | null>(null);

  const [formData, setFormData] = useState({
    relationship_type: 'associated',
    strength: 5,
    confidence: 0.8,
    description: '',
  });

  // Load initial entities if IDs provided
  useEffect(() => {
    const loadInitial = async () => {
      if (initialSourceId) {
        try {
          const entity = await apiClient.getEntity(initialSourceId);
          setSelectedSource(entity);
        } catch (e) {
          console.error(e);
        }
      }
      if (initialTargetId) {
        try {
          const entity = await apiClient.getEntity(initialTargetId);
          setSelectedTarget(entity);
        } catch (e) {
          console.error(e);
        }
      }
    };
    loadInitial();
  }, [initialSourceId, initialTargetId]);

  // Search Handlers
  const handleSearch = async (term: string, type: 'source' | 'target') => {
    if (type === 'source') setSourceSearch(term);
    else setTargetSearch(term);

    if (term.length < 2) {
      if (type === 'source') setSourceResults([]);
      else setTargetResults([]);
      return;
    }

    try {
      const results = await apiClient.searchEntities(term);
      if (type === 'source') setSourceResults(results);
      else setTargetResults(results);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSource || !selectedTarget) {
      addToast({ text: 'Please select both entities', type: 'error' });
      return;
    }

    setLoading(true);
    try {
      await apiClient.createRelationship({
        source_id: selectedSource.id,
        target_id: selectedTarget.id,
        type: formData.relationship_type,
        strength: formData.strength,
        confidence: formData.confidence,
        metadata: {
          description: formData.description,
        },
      });
      addToast({ text: 'Relationship created successfully', type: 'success' });
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating relationship:', error);
      addToast({
        text: error instanceof Error ? error.message : 'Failed to create relationship',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={modalRef}
        className="bg-slate-800 rounded-xl w-full max-w-2xl border border-slate-700 shadow-2xl flex flex-col max-h-[90vh]"
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 rounded-lg">
              <Network className="w-6 h-6 text-purple-400" />
            </div>
            <h2 className="text-xl font-bold text-white">Create Connection</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white text-xl transition-colors"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Source Entity Selection */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Source Entity *
              </label>
              {selectedSource ? (
                <div className="flex items-center justify-between p-3 bg-slate-700 rounded-lg border border-slate-600">
                  <span className="text-white font-medium">{selectedSource.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSource(null);
                      setSourceSearch('');
                    }}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      value={sourceSearch}
                      onChange={(e) => handleSearch(e.target.value, 'source')}
                      className="w-full bg-slate-900 border border-slate-600 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-blue-500"
                      placeholder="Search entity..."
                    />
                  </div>
                  {sourceResults.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-xl max-h-60 overflow-y-auto ring-1 ring-slate-700">
                      {sourceResults.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setSelectedSource(p);
                            setSourceResults([]);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-slate-700 text-sm text-slate-200 transition-colors border-b border-slate-700/50 last:border-0"
                        >
                          <div className="font-medium text-white">{p.name}</div>
                          {p.primaryRole && (
                            <div className="text-xs text-slate-400">{p.primaryRole}</div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Target Entity Selection */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Target Entity *
              </label>
              {selectedTarget ? (
                <div className="flex items-center justify-between p-3 bg-slate-700 rounded-lg border border-slate-600">
                  <span className="text-white font-medium">{selectedTarget.name}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedTarget(null);
                      setTargetSearch('');
                    }}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      value={targetSearch}
                      onChange={(e) => handleSearch(e.target.value, 'target')}
                      className="w-full bg-slate-900 border border-slate-600 rounded-lg pl-10 pr-4 py-2 text-white focus:outline-none focus:border-blue-500"
                      placeholder="Search entity..."
                    />
                  </div>
                  {targetResults.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-xl max-h-60 overflow-y-auto ring-1 ring-slate-700">
                      {targetResults.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setSelectedTarget(p);
                            setTargetResults([]);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-slate-700 text-sm text-slate-200 transition-colors border-b border-slate-700/50 last:border-0"
                        >
                          <div className="font-medium text-white">{p.name}</div>
                          {p.primaryRole && (
                            <div className="text-xs text-slate-400">{p.primaryRole}</div>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <FormField label="Relationship Type" id="relationship_type" required>
            <select
              id="relationship_type"
              value={formData.relationship_type}
              onChange={(e) => setFormData({ ...formData, relationship_type: e.target.value })}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
            >
              <option value="associated">Associated</option>
              <option value="financial">Financial</option>
              <option value="legal">Legal</option>
              <option value="social">Social</option>
              <option value="co-conspirator">Co-conspirator</option>
              <option value="victim">Victim</option>
              <option value="employee">Employee</option>
            </select>
          </FormField>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label={`Strength (${formData.strength}/10)`} id="strength">
              <input
                type="range"
                min="1"
                max="10"
                value={formData.strength}
                onChange={(e) => setFormData({ ...formData, strength: parseInt(e.target.value) })}
                className="w-full"
              />
            </FormField>

            <FormField
              label={`Confidence (${Math.round(formData.confidence * 100)}%)`}
              id="confidence"
            >
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={formData.confidence}
                onChange={(e) =>
                  setFormData({ ...formData, confidence: parseFloat(e.target.value) })
                }
                className="w-full"
              />
            </FormField>
          </div>

          <FormField label="Description / Context" id="description">
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
              rows={3}
              placeholder="Describe the nature of this connection..."
            />
          </FormField>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedSource || !selectedTarget}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                'Creating...'
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Create Connection
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
};
