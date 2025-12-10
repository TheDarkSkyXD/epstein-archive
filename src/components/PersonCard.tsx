import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Person } from '../types';
import { formatNumber } from '../utils/search';
import { AddToInvestigationButton } from './AddToInvestigationButton';
import Icon from './Icon';
import { getEntityTypeIcon } from '../utils/entityTypeIcons';

interface PersonCardProps {
  person: Person;
  onClick: () => void;
  onDocumentClick?: (document: any, searchTerm?: string) => void;
  searchTerm?: string;
}

const PersonCard: React.FC<PersonCardProps> = ({ person, onClick, onDocumentClick, searchTerm }) => {
  const navigate = useNavigate();
  const rating = Number((person as any).red_flag_rating ?? (person as any).redFlagRating ?? (person as any).spiceRating ?? 0);
  
  // Get entity type icon
  const getEntityIcon = () => {
    const entityType = (person as any).entity_type || (person as any).entityType;
    return getEntityTypeIcon(entityType, 'md');
  };

  // Get risk color based on rating
  const getRiskColor = (r: number) => {
    if (r >= 5) return 'text-purple-400 bg-purple-500/20 border-purple-500/40';
    if (r >= 4) return 'text-red-400 bg-red-500/20 border-red-500/40';
    if (r >= 3) return 'text-orange-400 bg-orange-500/20 border-orange-500/40';
    if (r >= 2) return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/40';
    return 'text-slate-400 bg-slate-500/20 border-slate-500/40';
  };

  // Highlight search term in text
  const highlightText = (text: string, term?: string) => {
    if (!term || !text) return text;
    try {
      const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escapedTerm})`, 'gi');
      const parts = text.split(regex);
      return parts.map((part, i) => 
        regex.test(part) ? <mark key={i} className="bg-yellow-500/30 text-yellow-200 px-0.5 rounded">{part}</mark> : part
      );
    } catch {
      return text;
    }
  };

  const files = person.files ?? (person.fileReferences?.length ?? 0);
  const title = person.title || person.role || (person as any).primaryRole || (person.evidence_types?.[0]?.toString().replace('_', ' ').toUpperCase()) || 'Unknown';

  return (
    <div 
      onClick={onClick}
      className="group bg-slate-800/60 hover:bg-slate-800/90 border border-slate-700/50 hover:border-slate-600 rounded-xl p-4 cursor-pointer transition-all duration-200 active:scale-[0.99]"
      tabIndex={0}
      role="button"
      aria-label={`View details for ${person.name}`}
    >
      {/* Top row: Icon, Name, Risk badge */}
      <div className="flex items-start gap-3 mb-3">
        {/* Entity icon */}
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-slate-700/50 flex items-center justify-center text-slate-400 group-hover:text-white group-hover:bg-slate-600/50 transition-colors">
          {getEntityIcon()}
        </div>
        
        {/* Name and title */}
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-white truncate group-hover:text-cyan-300 transition-colors">
            {searchTerm ? highlightText(person.name, searchTerm) : person.name}
          </h3>
          <p className="text-xs text-slate-400 truncate mt-0.5">
            {searchTerm ? highlightText(title, searchTerm) : title}
          </p>
        </div>
        
        {/* Risk badge - compact with flag icons */}
        <div className={`flex-shrink-0 flex items-center gap-1 px-2 py-1 rounded-full border text-xs font-medium ${getRiskColor(rating)}`}>
          {Array.from({ length: Math.min(5, rating) }).map((_, i) => (
            <Icon name="Flag" size="xs" color="inherit" />
          ))}
        </div>
      </div>
      
      {/* Stats row - horizontal, compact */}
      <div className="flex items-center gap-4 text-xs text-slate-400 mb-3">
        <div className="flex items-center gap-1.5">
          <Icon name="TrendingUp" size="sm" />
          <span>{formatNumber(person.mentions)} mentions</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Icon name="Folder" size="sm" />
          <span>{files} docs</span>
        </div>
      </div>
      
      {/* Description - truncated to 2 lines */}
      {person.red_flag_description && (
// Code to remove the prefix if present
        <p className="text-xs text-slate-300 leading-relaxed line-clamp-2 mb-3">
          {searchTerm ? highlightText(person.red_flag_description.replace(/^Red Flag Index \d+[\s:-]*/i, ''), searchTerm) : person.red_flag_description.replace(/^Red Flag Index \d+[\s:-]*/i, '')}
        </p>
      )}
      
      {/* Evidence types - horizontal chips, no wrap */}
      {person.evidence_types && person.evidence_types.length > 1 && (
        <div className="flex items-center gap-1.5 mb-3 overflow-hidden">
          {person.evidence_types.slice(0, 3).map((type, i) => (
            <span key={i} className="flex-shrink-0 px-2 py-0.5 bg-blue-900/40 text-blue-300 rounded text-[10px] uppercase tracking-wide">
              {type.toString().replace('_', ' ')}
            </span>
          ))}
          {person.evidence_types.length > 3 && (
            <span className="text-[10px] text-slate-500">+{person.evidence_types.length - 3}</span>
          )}
        </div>
      )}
      
      {/* Footer - action buttons */}      <div className="flex items-center justify-between pt-2 border-t border-slate-700/30">
        <div className="flex items-center gap-1">
          <button 
            onClick={(e) => { 
                e.stopPropagation(); 
                navigate(`/documents?search=${encodeURIComponent(person.name)}`);
            }}
            className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-blue-400 px-1.5 py-1 rounded hover:bg-slate-700/50 transition-colors"
            title="Related Documents"
          >
            <Icon name="FileText" size="xs" />
            <span>Docs</span>
          </button>
          <button 
            onClick={(e) => { 
                e.stopPropagation(); 
                navigate(`/investigations?tab=analytics&focus=${person.id}`);
            }}
            className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-purple-400 px-1.5 py-1 rounded hover:bg-slate-700/50 transition-colors"
            title="Network"
          >
            <Icon name="Network" size="xs" />
            <span>Network</span>
          </button>
          <AddToInvestigationButton 
            item={{
              id: person.id || '',
              title: person.name,
              description: person.role || 'Person of interest',
              type: 'entity',
              sourceId: person.id || ''
            }}
            variant="quick"
          />
        </div>
        <div className="flex items-center gap-1 text-xs text-blue-400 group-hover:text-blue-300 transition-colors">
          <span>Profile</span>
          <Icon name="ExternalLink" size="xs" className="transform group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </div>
  );
};

export default PersonCard;