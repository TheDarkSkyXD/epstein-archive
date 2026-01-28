import React, { useState, useEffect } from 'react';
import Icon from './Icon';
// @ts-ignore
import { useAuth } from '../contexts/AuthContext';

interface MobileMenuProps {
  open: boolean;
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  onNavigate: (path: string) => void;
  onClose: () => void;
}

// TODO: Implement search in mobile menu - see UNUSED_VARIABLES_RECOMMENDATIONS.md
export const MobileMenu: React.FC<MobileMenuProps> = ({
  open,
  searchTerm,
  onSearchTermChange,
  onNavigate,
  onClose,
}) => {
  const [attract, setAttract] = useState<boolean>(false);
  const { isAdmin } = useAuth();

  useEffect(() => {
    const shown =
      typeof window !== 'undefined' && localStorage.getItem('investigate_attract_shown') === 'true';
    if (!shown) setAttract(true);
    const timer = setTimeout(() => setAttract(false), 8000);
    return () => clearTimeout(timer);
  }, []);

  // Handle navigation without closing on content click
  const handleNavigation = (path: string) => {
    onNavigate(path);
    onClose();
  };

  return (
    <div
      className={`mobile-nav fixed inset-0 z-[60] transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
    >
      {/* Backdrop overlay - closes menu when clicked */}
      <div
        aria-label="Close menu overlay"
        className="absolute inset-0 top-[60px] bg-black/70"
        onClick={onClose}
      />

      {/* Menu panel - on top of backdrop */}
      <div
        className={`absolute left-0 top-[60px] h-[calc(100%-60px)] w-4/5 max-w-sm bg-slate-900 border-r border-slate-700 shadow-xl transform transition-transform duration-300 ease-out z-10 ${open ? 'translate-x-0' : '-translate-x-full'}`}
        onClick={(e) => e.stopPropagation()} // Prevent clicks inside menu from closing it
        onTouchStart={(e) => {
          const touch = e.touches[0];
          const startX = touch.clientX;
          const handleTouchMove = (moveEvent: TouchEvent) => {
            const currentX = moveEvent.touches[0].clientX;
            const diff = startX - currentX;
            if (diff > 50) {
              // Swiped left
              onClose();
              window.removeEventListener('touchmove', handleTouchMove);
            }
          };
          window.addEventListener('touchmove', handleTouchMove, { once: true });
        }}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-900/95 header-text-shadow">
          <h3 className="text-white font-semibold">Menu</h3>
          <button
            aria-label="Close menu"
            onClick={onClose}
            className="p-3 rounded-lg hover:bg-slate-800 active:bg-slate-700 transition-colors"
          >
            <Icon name="X" size="sm" className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Mobile Search Input */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/50">
          <div className="relative">
            <input
              type="text"
              placeholder="Search subjects, docs..."
              className="w-full bg-slate-950/50 text-white placeholder-slate-500 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 outline-none transition-all"
              value={searchTerm}
              onChange={(e) => onSearchTermChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleNavigation('/search');
                }
              }}
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <Icon name="Search" size="xs" className="text-slate-500" />
            </div>
          </div>
        </div>

        <div className="p-2 space-y-1 overflow-y-auto max-h-[calc(100vh-160px)] custom-scrollbar">
          <button
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-white hover:bg-slate-800 active:bg-slate-700 transition-colors"
            onClick={() => handleNavigation('/people')}
          >
            <Icon name="Users" size="sm" className="w-5 h-5 text-blue-400" />
            <span>Subjects</span>
          </button>
          <button
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-white hover:bg-slate-800 active:bg-slate-700 transition-colors"
            onClick={() => handleNavigation('/search')}
          >
            <Icon name="Search" size="sm" className="w-5 h-5 text-cyan-400" />
            <span>Advanced Search</span>
          </button>
          <button
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-white hover:bg-slate-800 active:bg-slate-700 transition-colors"
            onClick={() => handleNavigation('/documents')}
          >
            <Icon name="FileText" size="sm" className="w-5 h-5 text-emerald-400" />
            <span>Documents</span>
          </button>
          <button
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-white hover:bg-slate-800 active:bg-slate-700 transition-colors"
            onClick={() => handleNavigation('/emails')}
          >
            <Icon name="Mail" size="sm" className="w-5 h-5 text-amber-400" />
            <span>Emails</span>
          </button>
          <button
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-white hover:bg-slate-800 active:bg-slate-700 transition-colors"
            onClick={() => handleNavigation('/media')}
          >
            <Icon name="Newspaper" size="sm" className="w-5 h-5 text-purple-400" />
            <span>Media</span>
          </button>

          <div className="my-2 border-t border-slate-800/80 mx-3"></div>
          <p className="px-3 py-1.5 text-xs font-medium text-slate-500 uppercase tracking-wider">
            Analysis
          </p>

          <button
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-white hover:bg-slate-800 active:bg-slate-700 transition-all ${attract ? 'ring-1 ring-pink-500/50 shadow-[0_0_15px_-3px_rgba(236,72,153,0.3)]' : ''}`}
            onClick={() => {
              try {
                localStorage.setItem('investigate_attract_shown', 'true');
              } catch {
                // Ignore localStorage errors
              }
              setAttract(false);
              handleNavigation('/investigations');
            }}
          >
            <Icon name="Target" size="sm" className="w-5 h-5 text-pink-500" />
            <span>Investigations</span>
          </button>
          <button
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-white hover:bg-slate-800 active:bg-slate-700 transition-colors"
            onClick={() => handleNavigation('/blackbook')}
          >
            <Icon name="Book" size="sm" className="w-5 h-5 text-slate-300" />
            <span>Black Book</span>
          </button>
          <button
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-white hover:bg-slate-800 active:bg-slate-700 transition-colors"
            onClick={() => handleNavigation('/timeline')}
          >
            <Icon name="Clock" size="sm" className="w-5 h-5 text-orange-400" />
            <span>Timeline</span>
          </button>
          <button
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-white hover:bg-slate-800 active:bg-slate-700 transition-colors"
            onClick={() => handleNavigation('/flights')}
          >
            <Icon name="Navigation" size="sm" className="w-5 h-5 text-sky-400" />
            <span>Flight Logs</span>
          </button>
          <button
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-white hover:bg-slate-800 active:bg-slate-700 transition-colors"
            onClick={() => handleNavigation('/properties')}
          >
            <Icon name="Home" size="sm" className="w-5 h-5 text-indigo-400" />
            <span>Properties</span>
          </button>
          <button
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-white hover:bg-slate-800 active:bg-slate-700 transition-colors"
            onClick={() => handleNavigation('/analytics')}
          >
            <Icon name="BarChart3" size="sm" className="w-5 h-5 text-teal-400" />
            <span>Analytics</span>
          </button>

          <div className="my-2 border-t border-slate-800/80 mx-3"></div>

          <button
            className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-white hover:bg-slate-800 active:bg-slate-700 transition-colors"
            onClick={() => handleNavigation('/about')}
          >
            <Icon name="Shield" size="sm" className="w-5 h-5 text-slate-400" />
            <span>About</span>
          </button>

          {isAdmin && (
            <button
              className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-white hover:bg-slate-800 active:bg-slate-700 transition-colors"
              onClick={() => handleNavigation('/admin')}
            >
              <Icon name="Settings" size="sm" className="w-5 h-5 text-slate-500" />
              <span>Admin</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MobileMenu;
