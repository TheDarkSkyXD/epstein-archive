import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useModalFocusTrap } from '../hooks/useModalFocusTrap';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({ isOpen, onClose }) => {
  const { modalRef } = useModalFocusTrap(isOpen);
  
  if (!isOpen) return null;

  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const cmdSymbol = isMac ? '⌘' : 'Ctrl';
  const cmdKey = isMac ? 'Cmd' : 'Ctrl';

  const shortcuts = [
    {
      category: 'Navigation',
      items: [
        { keys: [cmdSymbol, 'K'], description: 'Focus search bar' },
        { keys: [cmdSymbol, '1'], description: 'Go to Subjects' },
        { keys: [cmdSymbol, '2'], description: 'Go to Search' },
        { keys: [cmdSymbol, '3'], description: 'Go to Documents' },
        { keys: [cmdSymbol, '4'], description: 'Go to Media' },
        { keys: [cmdSymbol, '5'], description: 'Go to Timeline' },
        { keys: [cmdSymbol, '6'], description: 'Go to Investigations' },
        { keys: [cmdSymbol, '7'], description: 'Go to Analytics' },
        { keys: [cmdSymbol, '8'], description: 'Go to Black Book' },
        { keys: [cmdSymbol, '9'], description: 'Go to About' },
      ]
    },
    {
      category: 'Actions',
      items: [
        { keys: ['Escape'], description: 'Close modals' },
        { keys: [cmdSymbol, 'Shift', 'R'], description: 'Refresh application' },
      ]
    },
    {
      category: 'Document Viewer',
      items: [
        { keys: ['←', '→'], description: 'Navigate between pages' },
        { keys: ['+', '='], description: 'Zoom in' },
        { keys: ['-'], description: 'Zoom out' },
        { keys: ['R'], description: 'Rotate document' },
      ]
    },
    {
      category: 'Investigations',
      items: [
        { keys: [cmdSymbol, 'S'], description: 'Save investigation' },
        { keys: [cmdSymbol, 'N'], description: 'New investigation' },
      ]
    }
  ];

  return createPortal(
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div 
        ref={modalRef}
        className="bg-slate-900 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col border border-slate-700"
        role="dialog"
        aria-labelledby="keyboard-shortcuts-title"
        aria-modal="true"
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800">
          <h2 id="keyboard-shortcuts-title" className="text-lg font-semibold text-white">
            Keyboard Shortcuts
          </h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-8">
            {shortcuts.map((section, sectionIndex) => (
              <div key={sectionIndex}>
                <h3 className="text-md font-semibold text-cyan-400 mb-4 border-b border-slate-700 pb-2">
                  {section.category}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {section.items.map((item, itemIndex) => (
                    <div 
                      key={itemIndex} 
                      className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg border border-slate-700"
                    >
                      <span className="text-slate-300 text-sm">{item.description}</span>
                      <div className="flex gap-1">
                        {item.keys.map((key, keyIndex) => (
                          <kbd 
                            key={keyIndex}
                            className="px-2 py-1 text-xs font-mono bg-slate-700 text-slate-200 rounded border border-slate-600 min-w-[24px] text-center"
                          >
                            {key}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-8 pt-6 border-t border-slate-700">
            <p className="text-slate-400 text-sm">
              <strong>Note:</strong> Shortcuts use <kbd className="px-1 py-0.5 text-xs font-mono bg-slate-700 text-slate-200 rounded border border-slate-600">{cmdKey}</kbd> key on your system.
            </p>
          </div>
        </div>
        
        <div className="p-4 border-t border-slate-700 bg-slate-800">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default KeyboardShortcutsModal;