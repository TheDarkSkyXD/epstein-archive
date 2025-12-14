import React, { useState } from 'react';
import Icon from './Icon';

interface BatchToolbarProps {
  selectedCount: number;
  onRotate: (direction: 'left' | 'right') => void;
  onAssignTags: (tags: number[]) => void;
  onAssignRating: (rating: number) => void;
  onEditMetadata: (field: string, value: string) => void;
  onCancel: () => void;
}

export const BatchToolbar: React.FC<BatchToolbarProps> = ({ 
  selectedCount, 
  onRotate,
  onAssignTags,
  onAssignRating,
  onEditMetadata,
  onCancel
}) => {
  const [showRotateMenu, setShowRotateMenu] = useState(false);
  const [showTagsMenu, setShowTagsMenu] = useState(false);
  const [showRatingMenu, setShowRatingMenu] = useState(false);
  const [showMetadataMenu, setShowMetadataMenu] = useState(false);
  
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl shadow-2xl">
      <div className="flex items-center gap-1 p-2">
        {/* Selected count */}
        <div className="px-3 py-2 bg-slate-700 rounded-lg text-sm font-medium text-cyan-400">
          {selectedCount} selected
        </div>
        
        {/* Divider */}
        <div className="w-px h-6 bg-slate-700"></div>
        
        {/* Rotate actions */}
        <div className="relative">
          <button 
            onClick={() => setShowRotateMenu(!showRotateMenu)}
            className="flex items-center gap-2 px-3 py-2 hover:bg-slate-700 rounded-lg text-sm transition-colors"
          >
            <Icon name="RotateCw" size="sm" />
            <span>Rotate</span>
          </button>
          
          {showRotateMenu && (
            <div className="absolute bottom-full left-0 mb-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50">
              <button 
                onClick={() => {
                  onRotate('left');
                  setShowRotateMenu(false);
                }}
                className="flex items-center gap-2 w-full px-4 py-2 hover:bg-slate-700 rounded-lg text-sm text-left"
              >
                <Icon name="RotateCcw" size="sm" />
                Rotate Left
              </button>
              <button 
                onClick={() => {
                  onRotate('right');
                  setShowRotateMenu(false);
                }}
                className="flex items-center gap-2 w-full px-4 py-2 hover:bg-slate-700 rounded-lg text-sm text-left"
              >
                <Icon name="RotateCw" size="sm" />
                Rotate Right
              </button>
            </div>
          )}
        </div>
        
        {/* Tags action */}
        <div className="relative">
          <button 
            onClick={() => setShowTagsMenu(!showTagsMenu)}
            className="flex items-center gap-2 px-3 py-2 hover:bg-slate-700 rounded-lg text-sm transition-colors"
          >
            <Icon name="Tag" size="sm" />
            <span>Tags</span>
          </button>
          
          {showTagsMenu && (
            <div className="absolute bottom-full left-0 mb-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 w-64">
              <div className="p-3 border-b border-slate-700">
                <h3 className="text-sm font-medium text-white mb-2">Assign Tags</h3>
                <p className="text-xs text-slate-400">Select tags to apply to {selectedCount} images</p>
              </div>
              <div className="p-2 max-h-40 overflow-y-auto">
                {/* Placeholder for tags - would be populated from API */}
                <div className="text-center py-4 text-sm text-slate-500">
                  Tag selection interface would appear here
                </div>
              </div>
              <div className="p-2 border-t border-slate-700 flex justify-end gap-2">
                <button 
                  onClick={() => setShowTagsMenu(false)}
                  className="px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 rounded-lg"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    onAssignTags([]);
                    setShowTagsMenu(false);
                  }}
                  className="px-3 py-1.5 text-sm bg-cyan-600 hover:bg-cyan-500 rounded-lg"
                >
                  Apply
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Rating action */}
        <div className="relative">
          <button 
            onClick={() => setShowRatingMenu(!showRatingMenu)}
            className="flex items-center gap-2 px-3 py-2 hover:bg-slate-700 rounded-lg text-sm transition-colors"
          >
            <Icon name="Star" size="sm" />
            <span>Rating</span>
          </button>
          
          {showRatingMenu && (
            <div className="absolute bottom-full left-0 mb-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 w-48">
              <div className="p-3">
                <h3 className="text-sm font-medium text-white mb-2">Assign Rating</h3>
                <div className="flex justify-center gap-1 mb-3">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button 
                      key={star}
                      onClick={() => {
                        onAssignRating(star);
                        setShowRatingMenu(false);
                      }}
                      className="text-amber-400 hover:text-amber-300"
                    >
                      <Icon name="Star" size="sm" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Metadata action */}
        <div className="relative">
          <button 
            onClick={() => setShowMetadataMenu(!showMetadataMenu)}
            className="flex items-center gap-2 px-3 py-2 hover:bg-slate-700 rounded-lg text-sm transition-colors"
          >
            <Icon name="Edit3" size="sm" />
            <span>Edit</span>
          </button>
          
          {showMetadataMenu && (
            <div className="absolute bottom-full left-0 mb-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 w-80">
              <div className="p-3 border-b border-slate-700">
                <h3 className="text-sm font-medium text-white mb-2">Edit Metadata</h3>
                <p className="text-xs text-slate-400">Apply changes to {selectedCount} images</p>
              </div>
              <div className="p-3 space-y-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Title</label>
                  <input 
                    type="text" 
                    placeholder="Enter new title"
                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Description</label>
                  <textarea 
                    placeholder="Enter new description"
                    rows={3}
                    className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  ></textarea>
                </div>
              </div>
              <div className="p-2 border-t border-slate-700 flex justify-end gap-2">
                <button 
                  onClick={() => setShowMetadataMenu(false)}
                  className="px-3 py-1.5 text-sm bg-slate-700 hover:bg-slate-600 rounded-lg"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    onEditMetadata('', '');
                    setShowMetadataMenu(false);
                  }}
                  className="px-3 py-1.5 text-sm bg-cyan-600 hover:bg-cyan-500 rounded-lg"
                >
                  Apply to All
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Divider */}
        <div className="w-px h-6 bg-slate-700"></div>
        
        {/* Cancel button */}
        <button 
          onClick={onCancel}
          className="flex items-center gap-2 px-3 py-2 hover:bg-slate-700 rounded-lg text-sm transition-colors text-rose-400"
        >
          <Icon name="X" size="sm" />
          <span>Cancel</span>
        </button>
      </div>
    </div>
  );
};

export default BatchToolbar;