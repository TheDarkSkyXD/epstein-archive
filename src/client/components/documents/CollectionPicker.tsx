import { useState, useEffect } from 'react';
import { FolderPlus, Check, ChevronDown, Plus } from 'lucide-react';
import { apiClient } from '../../services/apiClient';

interface Collection {
  id: string;
  name: string;
  description: string;
}

interface CollectionPickerProps {
  documentId: string;
  onAdded?: (collectionName: string) => void;
  className?: string;
}

export const CollectionPicker: React.FC<CollectionPickerProps> = ({
  documentId,
  onAdded,
  className = '',
}) => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchCollections = async () => {
      try {
        const data = await apiClient.getCollections();
        setCollections(data);
      } catch (error) {
        console.error('Error fetching collections:', error);
      }
    };
    fetchCollections();
  }, []);

  const handleAddToCollection = async (collectionId: string, collectionName: string) => {
    try {
      setAddingTo(collectionId);
      await apiClient.addToCollection(documentId, collectionId);
      setSuccess(collectionName);
      if (onAdded) onAdded(collectionName);
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      console.error('Error adding to collection:', error);
    } finally {
      setAddingTo(null);
      setIsOpen(false);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 rounded-lg border border-white/10 text-xs font-bold text-slate-300 transition-all group"
      >
        <FolderPlus className="w-3.5 h-3.5 text-cyan-400" />
        <span>Add to Collection</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-64 bg-slate-900 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="p-3 border-b border-white/5 bg-slate-950/50">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
              Select Destination
            </h4>
          </div>
          <div className="max-h-64 overflow-y-auto custom-scrollbar">
            {collections.map((c) => (
              <button
                key={c.id}
                onClick={() => handleAddToCollection(c.id, c.name)}
                disabled={addingTo === c.id}
                className="w-full text-left p-3 hover:bg-white/5 transition-colors group flex flex-col gap-1 border-b border-white/5 last:border-0"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 group-hover:text-cyan-400 transition-colors">
                    {c.name}
                  </span>
                  {addingTo === c.id ? (
                    <div className="w-3 h-3 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
                  ) : (
                    <Plus className="w-3 h-3 text-slate-600 group-hover:text-cyan-500" />
                  )}
                </div>
                {c.description && (
                  <span className="text-[9px] text-slate-500 leading-tight">{c.description}</span>
                )}
              </button>
            ))}
          </div>
          <div className="p-2.5 bg-slate-950/30">
            <button
              className="w-full py-1.5 px-3 rounded-lg border border-dashed border-white/20 text-[10px] font-bold text-slate-500 hover:text-slate-300 hover:border-white/40 transition-all flex items-center justify-center gap-2"
              onClick={() => {
                /* TODO: Create new collection */
              }}
            >
              <Plus className="w-3 h-3" />
              CREATE NEW COLLECTION
            </button>
          </div>
        </div>
      )}

      {success && (
        <div className="absolute top-0 right-full mr-3 whitespace-nowrap px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs font-bold text-emerald-400 animate-in fade-in slide-in-from-right-2">
          <Check className="w-3.5 h-3.5 inline mr-1.5" />
          Added to {success}
        </div>
      )}
    </div>
  );
};
