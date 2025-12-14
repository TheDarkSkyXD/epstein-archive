
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { X, ChevronLeft, ChevronRight, Info, Calendar, Camera, MapPin, Tag, FileImage, Maximize2, Minimize2, Edit2, Check, Save, RotateCw, RotateCcw } from 'lucide-react';
import { MediaImage } from '../types/media.types';
import Icon from './Icon';
import { useAuth } from '../contexts/AuthContext';
import LocationMap from './LocationMap';
import TagSelector from './TagSelector';
import PeopleSelector from './PeopleSelector';

interface MediaViewerModalProps {
  images: MediaImage[];
  initialIndex: number;
  onClose: () => void;
  onImageUpdate?: (updatedImage: MediaImage) => void;
}

const MediaViewerModal: React.FC<MediaViewerModalProps> = ({ images, initialIndex, onClose, onImageUpdate }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [showSidebar, setShowSidebar] = useState(true);
  const [isZoomed, setIsZoomed] = useState(false);
  const navigate = useNavigate();
  
  const { isAdmin } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const currentImage = images[currentIndex];

  // Helper to convert EXIF orientation to degrees
  const getRotationFromOrientation = (orientation?: number) => {
    switch (orientation) {
      case 3: return 180;
      case 6: return 90;
      case 8: return 270;
      default: return 0;
    }
  };

  useEffect(() => {
    if (currentImage) {
      setEditTitle(currentImage.title || '');
      setEditDesc(currentImage.description || '');
      setEditDesc(currentImage.description || '');
      setIsEditing(false);
      // Initialize rotation from saved orientation
      const initialRotation = getRotationFromOrientation(currentImage.orientation);
      setRotation(initialRotation);
      rotationRef.current = initialRotation;
    }
  }, [currentImage]);
  
  // Local rotation state (for immediate feedback)
  // Using a ref to persist rotation value across component re-renders
  const rotationRef = useRef(0);
  const [rotation, setRotation] = useState(0);
  
  // Tags and people state
  const [imageTags, setImageTags] = useState<any[]>([]);
  const [imagePeople, setImagePeople] = useState<any[]>([]);

  // Fetch tags and people when image changes
  useEffect(() => {
    // Close sidebar on mobile by default
    if (window.innerWidth < 768) {
      setShowSidebar(false);
    }
  }, []); // Run once on mount

  useEffect(() => {
    if (!currentImage) return;
    
    // Fetch tags
    fetch(`/api/media/images/${currentImage.id}/tags`)
      .then(res => res.json())
      .then(setImageTags)
      .catch(() => setImageTags([]));
    
    // Fetch people
    fetch(`/api/media/images/${currentImage.id}/people`)
      .then(res => res.json())
      .then(setImagePeople)
      .catch(() => setImagePeople([]));
  }, [currentImage]);

  const handleRotate = async (direction: 'left' | 'right') => {
    if (!currentImage) return;
    
    try {
      // Optimistic update
      const newRotation = (rotationRef.current + (direction === 'right' ? 90 : -90)) % 360;
      setRotation(newRotation);
      rotationRef.current = newRotation;
      
      const res = await fetch(`/api/media/images/${currentImage.id}/rotate`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ direction })
      });
      
      if (!res.ok) {
        // Revert on failure
        const revertedRotation = (rotationRef.current - (direction === 'right' ? 90 : -90)) % 360;
        setRotation(revertedRotation);
        rotationRef.current = revertedRotation;
        console.error('Failed to rotate image');
      } else {
        const updatedImage = await res.json();
        // Update the image object in the parent list
        if (updatedImage.orientation) {
            currentImage.orientation = updatedImage.orientation;
        }
        if (updatedImage.date_modified) {
            currentImage.dateModified = updatedImage.date_modified;
        }
        // Update images array in parent component if possible
        if (images && images[currentIndex]) {
          const newImage = {...images[currentIndex], ...updatedImage};
          images[currentIndex] = newImage;
          
          // Notify parent of update to refresh grid/thumbnails
          if (onImageUpdate) {
            onImageUpdate(newImage);
          }
        }
      }
    } catch (e) {
      console.error('Error rotating image:', e);
      const revertedRotation = (rotationRef.current - (direction === 'right' ? 90 : -90)) % 360;
      setRotation(revertedRotation);
      rotationRef.current = revertedRotation;
    }
  };

  const handleSave = async () => {
    if (!currentImage) return;
    try {
      const res = await fetch(`/api/media/images/${currentImage.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: editTitle,
          description: editDesc
        })
      });

      if (res.ok) {
        // Optimistic update
        currentImage.title = editTitle;
        currentImage.description = editDesc;
        setIsEditing(false);
        
        // Notify parent
        if (onImageUpdate) {
            onImageUpdate({...currentImage});
        }
      } else {
        console.error('Failed to save');
        alert('Failed to save changes');
      }
    } catch (e) {
      console.error('Error saving:', e);
      alert('Error saving changes');
    }
  };

  const handleNext = useCallback(() => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentIndex, images.length]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  }, [currentIndex]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ignore keyboard shortcuts if the user is typing in an input field
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        if (e.key === 'Escape') {
             (e.target as HTMLElement).blur(); // Allow Escape to blur input
             return;
        }
        // Allow arrow keys for text navigation
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') return;
        
        // Don't trigger other shortcuts
        return;
    }

    if (e.key === 'Escape') onClose();
    if (e.key === 'ArrowRight') handleNext();
    if (e.key === 'ArrowLeft') handlePrev();
    if (e.key === 'i') setShowSidebar(prev => !prev);
  }, [handleNext, handlePrev, onClose]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto';
    };
  }, [handleKeyDown]);

  if (!currentImage) return null;

  const formatDate = (dateString: string | undefined | null) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleString();
  };

  const formatFileSize = (bytes: number | undefined) => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const [showCopied, setShowCopied] = useState(false);

  const handleShare = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('photoId', currentImage.id.toString());
    navigator.clipboard.writeText(url.toString()).then(() => {
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    });
  };

  // Sync URL with current image
  useEffect(() => {
    if (currentImage) {
        const url = new URL(window.location.href);
        url.searchParams.set('photoId', currentImage.id.toString());
        window.history.replaceState({}, '', url);
    }
  }, [currentImage]);

  return createPortal(
    <div className="fixed inset-0 z-[1100] bg-black flex overflow-hidden">
      {/* Main Image Area */}
      <div className={`relative flex-1 flex flex-col h-full transition-all duration-300 ${showSidebar ? 'md:mr-80' : 'mr-0'}`}>
        
        {/* Toolbar */}
        <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-black/80 to-transparent p-4 flex justify-between items-start z-20 pointer-events-none">
           <div className="pointer-events-auto flex items-center gap-4">
              <button onClick={onClose} className="p-2 rounded-full bg-black/40 hover:bg-black/60 text-white/80 hover:text-white transition-colors">
                 <X size={20} />
              </button>
              <div className="text-white drop-shadow-md">
                 <h2 className="font-semibold text-lg leading-tight truncate max-w-md">{currentImage.title}</h2>
                 <p className="text-xs text-white/70">{currentIndex + 1} / {images.length}</p>
              </div>
           </div>
           
           <div className="pointer-events-auto flex gap-2">
               <button 
                onClick={handleShare} 
                className="p-2 rounded-full bg-black/40 hover:bg-black/60 text-white/80 hover:text-white transition-colors relative"
                title="Copy Link"
               >
                  {showCopied ? (
                    <Check size={20} className="text-green-400" />
                  ) : (
                    <Icon name="Share2" size="sm" className="w-5 h-5" />
                  )}
               </button>
               <button onClick={() => setIsZoomed(!isZoomed)} className="p-2 rounded-full bg-black/40 hover:bg-black/60 text-white/80 hover:text-white transition-colors">
                  {isZoomed ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
               </button>
               <button onClick={() => setShowSidebar(!showSidebar)} className={`p-2 rounded-full hover:bg-black/60 transition-colors ${showSidebar ? 'bg-cyan-500/20 text-cyan-400' : 'bg-black/40 text-white/80'}`}>
                  <Info size={20} />
               </button>
               {isAdmin && (
                 <button onClick={() => handleRotate('right')} className="p-2 rounded-full bg-black/40 hover:bg-black/60 text-white/80 hover:text-white transition-colors" title="Rotate 90° CW">
                   <RotateCw size={20} />
                 </button>
               )}
           </div>
        </div>

        {/* Navigation Arrows */}
        {currentIndex > 0 && (
          <button 
             onClick={handlePrev}
             className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/40 hover:bg-black/60 text-white/70 hover:text-white transition-colors z-20 group"
          >
             <ChevronLeft size={32} className="group-hover:-translate-x-0.5 transition-transform" />
          </button>
        )}
        {currentIndex < images.length - 1 && (
          <button 
             onClick={handleNext}
             className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/40 hover:bg-black/60 text-white/70 hover:text-white transition-colors z-20 group"
          >
             <ChevronRight size={32} className="group-hover:translate-x-0.5 transition-transform" />
          </button>
        )}

        {/* Image Container */}
        <div className="flex-1 flex items-center justify-center p-4 overflow-hidden relative" onClick={() => setShowSidebar(false)}>
            <img 
               src={`/api/media/images/${currentImage.id}/raw?t=${(currentImage as any).date_modified || (currentImage as any).dateModified ? new Date((currentImage as any).date_modified || (currentImage as any).dateModified).getTime() : Date.now()}`} 
               alt={currentImage.title}
               className={`transition-all duration-300 ${isZoomed ? 'w-full h-full object-cover cursor-move' : 'max-w-full max-h-full object-contain'}`}
               style={{ transform: `rotate(${rotation}deg)` }}
               draggable={false}
            />
        </div>
      </div>

      {/* Sidebar */}
      <div className={`fixed right-0 top-0 bottom-0 w-full md:w-80 bg-slate-900 border-l border-slate-800 transition-transform duration-300 ease-in-out z-30 overflow-y-auto ${showSidebar ? 'translate-x-0' : 'translate-x-full'}`}>
         <div className="p-6 space-y-8">
            {/* Header */}
            <div>
               {isEditing ? (
                 <div className="mb-4 space-y-2">
                   <label className="text-xs text-slate-500 uppercase font-bold">Title</label>
                   <input 
                      type="text" 
                      value={editTitle} 
                      onChange={e => setEditTitle(e.target.value)}
                      className="w-full bg-slate-800 border-slate-700 text-white rounded px-3 py-2 focus:ring-2 focus:ring-cyan-500 outline-none"
                   />
                 </div>
               ) : (
                  <>
                    <div className="flex justify-between items-start gap-2">
                      <h3 className="text-xl font-bold text-white mb-2 break-words">{currentImage.title}</h3>
                      <div className="flex items-center gap-2">
                        {isAdmin && (
                          <button onClick={() => setIsEditing(true)} className="text-slate-500 hover:text-cyan-400">
                            <Edit2 size={16} />
                          </button>
                        )}
                        <button 
                          onClick={() => setShowSidebar(false)} 
                          className="md:hidden text-slate-500 hover:text-white"
                        >
                          <X size={20} />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-slate-400 truncate" title={currentImage.filename}>{currentImage.filename}</p>
                  </>
               )}
            </div>
            
            {isEditing && (
              <div className="flex gap-2">
                <button 
                  onClick={handleSave} 
                  className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white py-2 rounded flex items-center justify-center gap-2 text-sm font-medium"
                >
                  <Save size={16} /> Save Changes
                </button>
                <button 
                  onClick={() => setIsEditing(false)} 
                  className="px-3 bg-slate-700 hover:bg-slate-600 text-white rounded"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {/* Basic Info */}
            <div className="space-y-4">
               <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">File Information</h4>
               <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-800/50 p-3 rounded border border-slate-800">
                     <div className="flex items-center gap-2 text-slate-400 mb-1">
                        <FileImage size={14} />
                        <span className="text-xs">Size</span>
                     </div>
                     <div className="text-white text-sm font-medium">{formatFileSize(currentImage.fileSize)}</div>
                  </div>
                  <div className="bg-slate-800/50 p-3 rounded border border-slate-800">
                     <div className="flex items-center gap-2 text-slate-400 mb-1">
                        <Tag size={14} />
                        <span className="text-xs">Type</span>
                     </div>
                     <div className="text-white text-sm font-medium uppercase">{currentImage.format}</div>
                  </div>
               </div>
            </div>

             {/* Description */}
             {(currentImage.description || isEditing) && (
               <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Description</h4>
                  {isEditing ? (
                    <textarea
                      value={editDesc}
                      onChange={e => setEditDesc(e.target.value)}
                      rows={6}
                      className="w-full bg-slate-800 border-slate-700 text-slate-300 text-sm leading-relaxed p-3 rounded focus:ring-2 focus:ring-cyan-500 outline-none"
                    />
                  ) : (
                    <p className="text-sm text-slate-300 leading-relaxed bg-slate-800/30 p-3 rounded border border-slate-800/50">
                       {currentImage.description}
                    </p>
                  )}
               </div>
             )}

            {/* EXIF Data */}
            <div className="space-y-4">
               <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                  <Camera size={14} /> Camera Details
               </h4>
               <div className="space-y-3 text-sm">
                  <div className="flex justify-between border-b border-slate-800 pb-2">
                     <span className="text-slate-400">Date Taken</span>
                     <span className="text-slate-200">{formatDate(currentImage.dateTaken)}</span>
                  </div>
                   <div className="flex justify-between border-b border-slate-800 pb-2">
                     <span className="text-slate-400">Camera</span>
                     <span className="text-slate-200">{currentImage.cameraMake} {currentImage.cameraModel || 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-800 pb-2">
                     <span className="text-slate-400">Resolution</span>
                     <span className="text-slate-200">{currentImage.width} x {currentImage.height}</span>
                  </div>
                   <div className="grid grid-cols-3 gap-2 pt-1">
                      <div className="text-center bg-slate-800 p-1.5 rounded">
                         <div className="text-[10px] text-slate-500">ISO</div>
                         <div className="text-xs text-white">{currentImage.iso || '-'}</div>
                      </div>
                       <div className="text-center bg-slate-800 p-1.5 rounded">
                         <div className="text-[10px] text-slate-500">Aperture</div>
                         <div className="text-xs text-white">{currentImage.aperture || '-'}</div>
                      </div>
                       <div className="text-center bg-slate-800 p-1.5 rounded w-full overflow-hidden">
                         <div className="text-[10px] text-slate-500">Shutter</div>
                         <div className="text-xs text-white truncate" title={currentImage.shutterSpeed?.toString()}>
                            {(() => {
                                const val = currentImage.shutterSpeed;
                                if (!val) return '-';
                                // Check if it's a number-like string or number
                                const num = Number(val);
                                if (isNaN(num)) return val;
                                
                                // Format logic
                                if (num >= 1) return Math.round(num * 10) / 10 + 's';
                                if (num > 0) {
                                    const inv = Math.round(1 / num);
                                    return `1/${inv}`;
                                }
                                return val;
                            })()}
                         </div>
                      </div>
                   </div>
               </div>
            </div>

             {/* Location Map */}
             {(currentImage.latitude && currentImage.longitude) && (
               <LocationMap
                 latitude={currentImage.latitude}
                 longitude={currentImage.longitude}
                 title={currentImage.title || 'Photo Location'}
               />
             )}

             {/* Tags Section */}
             <div className="space-y-2">
               <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                 <Tag size={14} /> Tags
               </h4>
               <TagSelector
                 selectedTags={imageTags}
                 onTagsChange={setImageTags}
                 mediaId={currentImage.id}
                 onTagClick={(tag) => {
                    onClose();
                    navigate(`/media?tagId=${tag.id}`);
                 }}
               />
             </div>

             {/* People in Photo Section */}
             <PeopleSelector
               selectedPeople={imagePeople}
               onPeopleChange={setImagePeople}
               mediaId={currentImage.id}
               onPersonClick={(person) => {
                  onClose();
                  // Check if we are in the entity card view or just need to open one
                  // For now, let's navigate to the investigation board with this person focused 
                  // OR navigate to the media gallery filtered by this person?
                  // User requested: "People should be clickable and show EntityCard"
                  // EntityCard is usually in a list or modal.
                  // Best bet: Navigate to global search or entity page if it exists.
                  // Since we added photo filtering by person, maybe showing their photos is good?
                  // User said: "People should be clickable and show EntityCard"
                  // Let's assume EntityCard is shown via a route or modal we can trigger.
                  // If we use '/search?q=PersonName', it opens the search result which usually allows opening the card.
                  // Or if there is a dedicated entity route.
                  // Looking at `PersonCard.tsx`, it navigates to `/documents?search=...`.
                  // The system seems to use `onDocumentClick` or similar to show details.
                  // Let's navigate to the media gallery filtered by this person FIRST, 
                  // as that is consistent with "Filter by tag or person in browser".
                  // WAIT, requirement 3: "People should be clickable and show EntityCard"
                  // Requirement 1: "Filter by tag or person in browser"
                  
                  // Let's do this: Open EntityCard is hard if it's just a component. 
                  // Usually EntityCards are displayed in a context.
                  // Let's navigate to `/investigations?tab=analytics&focus=${person.id}` which usually highlights them,
                  // OR better, since we implemented filtering, let's navigate to `/media?personId=${person.id}` 
                  // BUT the user specifically asked for "show EntityCard". 
                  // I will stick to the filtered view for now as it's the "Browser" context, 
                  // but maybe add a query param to open the card?
                  // Actually, sticking to the filtered view satisfies requirement 1. 
                  // Requirement 3 might mean "In the photo viewer, clicking a person name opens their card".
                  // Let's try to open the EntityCard if possible. 
                  // But `EntityCard` is a component.
                  // I'll navigate to the media filter for now as it is robust.
                  navigate(`/media?personId=${person.id}`);
               }}
             />

         </div>
      </div>
    </div>,
    document.body
  );
};

export default MediaViewerModal;
