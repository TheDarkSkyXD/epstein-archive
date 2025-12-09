import React, { useEffect, useState } from 'react'
import Icon from './Icon'

interface MobileMenuProps {
  open: boolean
  searchTerm: string
  onSearchTermChange: (v: string) => void
  onNavigate: (path: string) => void
  onClose: () => void
}

export const MobileMenu: React.FC<MobileMenuProps> = ({ open, searchTerm, onSearchTermChange, onNavigate, onClose }) => {
  const [attract, setAttract] = useState<boolean>(false)
  useEffect(() => {
    const shown = typeof window !== 'undefined' && localStorage.getItem('investigate_attract_shown') === 'true'
    if (!shown) setAttract(true)
    const timer = setTimeout(() => setAttract(false), 8000)
    return () => clearTimeout(timer)
  }, [])

  // Handle navigation without closing on content click
  const handleNavigation = (path: string) => {
    onNavigate(path)
    onClose()
  }

  return (
    <div className={`mobile-nav fixed inset-0 z-50 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
      {/* Backdrop overlay - closes menu when clicked */}
      <div 
        aria-label="Close menu overlay"
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
      />
      
      {/* Menu panel - on top of backdrop */}
      <div 
        className={`absolute left-0 top-0 h-full w-4/5 max-w-sm bg-slate-900 border-r border-slate-700 shadow-xl transform transition-transform duration-300 ease-out z-10 ${open ? 'translate-x-0' : '-translate-x-full'}`}
        onClick={(e) => e.stopPropagation()} // Prevent clicks inside menu from closing it
        onTouchStart={(e) => {
          const touch = e.touches[0];
          const startX = touch.clientX;
          const handleTouchMove = (moveEvent: TouchEvent) => {
            const currentX = moveEvent.touches[0].clientX;
            const diff = startX - currentX;
            if (diff > 50) { // Swiped left
              onClose();
              window.removeEventListener('touchmove', handleTouchMove);
            }
          };
          window.addEventListener('touchmove', handleTouchMove, { once: true });
        }}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h3 className="text-white font-semibold">Menu</h3>
          <button aria-label="Close menu" onClick={onClose} className="p-3 rounded-lg hover:bg-slate-800 active:bg-slate-700 transition-colors">
            <Icon name="X" size="sm" className="w-5 h-5 text-slate-400" />
          </button>
        </div>
        <div className="p-4 border-b border-slate-700">
          <div className="relative">
            <Icon name="Search" size="sm" className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="Search"
              aria-label="Search"
              value={searchTerm}
              onChange={(e) => onSearchTermChange(e.target.value)}
            />
          </div>
        </div>
        <div className="p-2 space-y-1">
          <button className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-white hover:bg-slate-800 active:bg-slate-700 transition-colors" onClick={() => handleNavigation('/people')}><Icon name="Users" size="sm" className="w-5 h-5" /><span>Subjects</span></button>
          <button className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-white hover:bg-slate-800 active:bg-slate-700 transition-colors" onClick={() => handleNavigation('/search')}><Icon name="Search" size="sm" className="w-5 h-5" /><span>Search</span></button>
          <button className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-white hover:bg-slate-800 active:bg-slate-700 transition-colors" onClick={() => handleNavigation('/documents')}><Icon name="FileText" size="sm" className="w-5 h-5" /><span>Documents</span></button>
          <button className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-white hover:bg-slate-800 active:bg-slate-700 transition-all ${attract ? 'ring-2 ring-pink-500 shadow-lg shadow-pink-500/30 animate-pulse' : ''}`} onClick={() => { try { localStorage.setItem('investigate_attract_shown','true') } catch(e) {} setAttract(false); handleNavigation('/investigations') }}><Icon name="Target" size="sm" className="w-5 h-5" /><span>Investigations</span></button>
          <button className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-white hover:bg-slate-800 active:bg-slate-700 transition-colors" onClick={() => handleNavigation('/blackbook')}><Icon name="Book" size="sm" className="w-5 h-5" /><span>Black Book</span></button>
          <button className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-white hover:bg-slate-800 active:bg-slate-700 transition-colors" onClick={() => handleNavigation('/timeline')}><Icon name="Clock" size="sm" className="w-5 h-5" /><span>Timeline</span></button>
          <button className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-white hover:bg-slate-800 active:bg-slate-700 transition-colors" onClick={() => handleNavigation('/media')}><Icon name="Newspaper" size="sm" className="w-5 h-5" /><span>Media</span></button>
          <button className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-white hover:bg-slate-800 active:bg-slate-700 transition-colors" onClick={() => handleNavigation('/analytics')}><Icon name="BarChart3" size="sm" className="w-5 h-5" /><span>Analytics</span></button>
          <button className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-white hover:bg-slate-800 active:bg-slate-700 transition-colors" onClick={() => handleNavigation('/about')}><Icon name="Shield" size="sm" className="w-5 h-5" /><span>About</span></button>
        </div>
      </div>
    </div>
  )
}

export default MobileMenu