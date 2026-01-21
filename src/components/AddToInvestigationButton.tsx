import React, { useState, useEffect } from 'react';
import { Investigation } from '../types/investigation';
import Icon from './Icon';
import { useInvestigations } from '../contexts/InvestigationsContext';

interface AddToInvestigationItem {
  id: string;
  title: string;
  description: string;
  type: 'document' | 'entity' | 'evidence';
  sourceId: string;
  metadata?: any;
}

interface AddToInvestigationButtonProps {
  item: AddToInvestigationItem;
  investigations?: Investigation[];
  onAddToInvestigation?: (
    investigationId: string,
    item: AddToInvestigationItem,
    relevance: 'high' | 'medium' | 'low',
  ) => void;
  variant?: 'button' | 'icon' | 'dropdown' | 'quick';
  className?: string;
  defaultInvestigationId?: string;
}

export const AddToInvestigationButton: React.FC<AddToInvestigationButtonProps> = ({
  item,
  investigations: propInvestigations,
  onAddToInvestigation,
  variant = 'button',
  className = '',
  defaultInvestigationId,
}) => {
  const {
    investigations: contextInvestigations,
    addToInvestigation,
    createInvestigation,
    selectedInvestigation,
  } = useInvestigations();
  const [showModal, setShowModal] = useState(false);
  const [selectedInvestigationId, setSelectedInvestigationId] = useState<string>('');
  const [relevance, setRelevance] = useState<'high' | 'medium' | 'low'>('medium');

  // Create New Mode State
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const [isLoading, setIsLoading] = useState(false);

  // Use investigations from context if not provided via props
  const investigations = propInvestigations || contextInvestigations;

  // Set default investigation
  useEffect(() => {
    if (defaultInvestigationId) {
      setSelectedInvestigationId(defaultInvestigationId);
    } else if (selectedInvestigation) {
      setSelectedInvestigationId(selectedInvestigation.id);
    } else if (investigations.length > 0) {
      setSelectedInvestigationId(investigations[0].id);
    }
  }, [defaultInvestigationId, selectedInvestigation, investigations]);

  const handleAddToInvestigation = async () => {
    if (!selectedInvestigationId && !isCreatingNew) return;
    if (isCreatingNew && !newTitle.trim()) return;

    setIsLoading(true);

    try {
      let targetInvestigationId = selectedInvestigationId;

      // Create new investigation if needed
      if (isCreatingNew && createInvestigation) {
        const newInv = await createInvestigation({
          title: newTitle,
          description: newDescription,
          hypothesis: '', // Optional initial hypothesis
          status: 'active',
          leadInvestigator: '1',
          priority: 'medium',
        });
        if (newInv) {
          targetInvestigationId = newInv.id;
        } else {
          throw new Error('Failed to create new investigation');
        }
      }

      // Use context method if available, otherwise use prop method
      if (addToInvestigation) {
        await addToInvestigation(targetInvestigationId, item, relevance);
      } else if (onAddToInvestigation) {
        onAddToInvestigation(targetInvestigationId, item, relevance);
      }

      setShowModal(false);
      // Reset state
      setIsCreatingNew(false);
      setNewTitle('');
      setNewDescription('');
    } catch (error) {
      console.error('Error adding to investigation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAdd = async () => {
    if (!selectedInvestigationId) {
      // Show modal to select investigation if none selected
      setShowModal(true);
      return;
    }

    setIsLoading(true);

    try {
      // Use context method if available, otherwise use prop method
      if (addToInvestigation) {
        await addToInvestigation(selectedInvestigationId, item, 'medium');
      } else if (onAddToInvestigation) {
        onAddToInvestigation(selectedInvestigationId, item, 'medium');
      }

      // Show success feedback
      const button = document.createElement('div');
      button.className =
        'fixed bottom-4 right-4 px-4 py-2 bg-green-600 text-white rounded-lg shadow-lg z-50 animate-fade-in';
      button.textContent = 'Added to investigation!';
      document.body.appendChild(button);

      // Remove after animation
      setTimeout(() => {
        button.classList.remove('animate-fade-in');
        button.classList.add('animate-fade-out');
        setTimeout(() => {
          document.body.removeChild(button);
        }, 300);
      }, 2000);
    } catch (error) {
      console.error('Error adding to investigation:', error);
      // Show error feedback
      const button = document.createElement('div');
      button.className =
        'fixed bottom-4 right-4 px-4 py-2 bg-red-600 text-white rounded-lg shadow-lg z-50 animate-fade-in';
      button.textContent = 'Failed to add to investigation';
      document.body.appendChild(button);

      // Remove after animation
      setTimeout(() => {
        button.classList.remove('animate-fade-in');
        button.classList.add('animate-fade-out');
        setTimeout(() => {
          document.body.removeChild(button);
        }, 300);
      }, 2000);
    } finally {
      setIsLoading(false);
    }
  };

  const getItemIcon = () => {
    switch (item.type) {
      case 'document':
        return 'FileText';
      case 'entity':
        return 'User';
      case 'evidence':
        return 'Target';
      default:
        return 'Plus';
    }
  };

  const getRelevanceColor = (rel: 'high' | 'medium' | 'low') => {
    switch (rel) {
      case 'high':
        return 'bg-red-600 hover:bg-red-700';
      case 'medium':
        return 'bg-yellow-600 hover:bg-yellow-700';
      case 'low':
        return 'bg-green-600 hover:bg-green-700';
    }
  };

  const ItemIcon = getItemIcon();

  if (investigations.length === 0) {
    return null;
  }

  return (
    <>
      {variant === 'button' && (
        <button
          onClick={() => setShowModal(true)}
          className={`flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm ${className}`}
          title="Add to Investigation"
        >
          <Icon name="Plus" size="sm" />
          Add to Investigation
        </button>
      )}

      {variant === 'icon' && (
        <button
          onClick={() => setShowModal(true)}
          className={`p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-900/30 rounded-lg transition-colors ${className}`}
          title="Add to Investigation"
        >
          <Icon name="Plus" size="sm" />
        </button>
      )}

      {variant === 'dropdown' && (
        <div className="relative group">
          <button
            onClick={() => setShowModal(true)}
            className={`flex items-center gap-2 px-3 py-2 text-blue-400 hover:text-blue-300 hover:bg-blue-900/30 rounded-lg transition-colors text-sm ${className}`}
          >
            <Icon name="Plus" size="sm" />
            <span>Add to Investigation</span>
          </button>
        </div>
      )}

      {variant === 'quick' && (
        <button
          onClick={handleQuickAdd}
          disabled={isLoading}
          className={`flex items-center justify-center p-1.5 bg-blue-600/80 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50 ${className}`}
          title="Add to Investigation"
        >
          {isLoading ? (
            <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <Icon name="Plus" size="xs" />
          )}
        </button>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl shadow-xl w-full max-w-md">
            <div className="border-b border-slate-700 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Icon name={ItemIcon} size="sm" color="info" />
                  <h3 className="text-xl font-bold text-white">Add to Investigation</h3>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-slate-400 hover:text-slate-200"
                >
                  <Icon name="X" size="md" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Item Preview */}
              <div className="bg-slate-700/50 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Icon name={ItemIcon} size="xs" color="gray" />
                  <h4 className="font-semibold text-white">{item.title}</h4>
                </div>
                <p className="text-sm text-slate-400 line-clamp-2">{item.description}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs px-2 py-1 bg-slate-600 rounded text-slate-300">
                    {item.type}
                  </span>
                </div>
              </div>

              {/* Investigation Selection or Creation */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-slate-300">
                    {isCreatingNew ? 'New Investigation Details' : 'Select Investigation'}
                  </label>
                  <button
                    onClick={() => setIsCreatingNew(!isCreatingNew)}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    {isCreatingNew ? 'Select existing...' : '+ Create new'}
                  </button>
                </div>

                {isCreatingNew ? (
                  <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                    <input
                      type="text"
                      placeholder="Investigation Title"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="w-full px-4 h-10 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-500"
                      autoFocus
                    />
                    <textarea
                      placeholder="Description (optional)"
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      className="w-full px-4 py-2 h-20 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-500 resize-none text-sm"
                    />
                  </div>
                ) : (
                  <select
                    value={selectedInvestigationId}
                    onChange={(e) => setSelectedInvestigationId(e.target.value)}
                    className="w-full px-4 h-10 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Choose an investigation...</option>
                    {investigations.map((inv) => (
                      <option key={inv.id} value={inv.id}>
                        {inv.title}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Relevance Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Evidence Relevance
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['high', 'medium', 'low'] as const).map((rel) => (
                    <button
                      key={rel}
                      onClick={() => setRelevance(rel)}
                      className={`px-3 h-10 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                        relevance === rel
                          ? getRelevanceColor(rel)
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {rel.charAt(0).toUpperCase() + rel.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t border-slate-700 p-6 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 h-10 flex items-center justify-center text-slate-300 hover:text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddToInvestigation}
                disabled={
                  (!selectedInvestigationId && !isCreatingNew) ||
                  (isCreatingNew && !newTitle.trim()) ||
                  isLoading
                }
                className="px-4 h-10 flex items-center justify-center bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
              >
                {isLoading && (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                )}
                {isLoading ? 'Adding...' : isCreatingNew ? 'Create & Add' : 'Add to Investigation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
