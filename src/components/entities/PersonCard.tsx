import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Person } from '../../types';
import { formatNumber } from '../../utils/search';
import { AddToInvestigationButton } from '../common/AddToInvestigationButton';
import Icon from '../common/Icon';
import { getEntityTypeIcon } from '../../utils/entityTypeIcons';

interface PersonCardProps {
  person: Person;
  onClick: () => void;
  onDocumentClick?: (document: any, searchTerm?: string) => void;
  searchTerm?: string;
}

// TODO: Implement document navigation - see UNUSED_VARIABLES_RECOMMENDATIONS.md
const PersonCard: React.FC<PersonCardProps> = ({
  person,
  onClick,
  onDocumentClick: _onDocumentClick,
  searchTerm,
}) => {
  const navigate = useNavigate();
  const rating = Number(
    (person as any).red_flag_rating ??
      (person as any).redFlagRating ??
      (person as any).spiceRating ??
      0,
  );
  const photos = React.useMemo(() => {
    if (person.photos && Array.isArray(person.photos)) {
      return person.photos.slice(0, 5);
    }
    return [];
  }, [person.photos]);

  // Get entity type icon
  const getEntityIcon = () => {
    const entityType = (person as any).entity_type || (person as any).entityType;
    // Pass title or role for icon determination
    const role = person.title || person.role || (person as any).primaryRole;
    return getEntityTypeIcon(entityType, 'md', role);
  };

  // Get risk color based on rating
  const getRiskColor = (r: number) => {
    if (r >= 5)
      return 'text-purple-100 bg-gradient-to-r from-purple-900/90 to-purple-800/80 border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.3)]';
    if (r >= 4)
      return 'text-red-100 bg-gradient-to-r from-red-900/90 to-red-800/80 border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.3)]';
    if (r >= 3)
      return 'text-orange-100 bg-gradient-to-r from-orange-900/90 to-orange-800/80 border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.3)]';
    if (r >= 2)
      return 'text-yellow-100 bg-gradient-to-r from-yellow-900/90 to-yellow-800/80 border-yellow-500/50 shadow-[0_0_15px_rgba(234,179,8,0.3)]';
    return 'text-slate-300 bg-slate-800/80 border-slate-600/50';
  };

  // Highlight search term in text
  const highlightText = (text: string, term?: string) => {
    if (!term || !text) return text;
    try {
      const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(${escapedTerm})`, 'gi');
      const parts = text.split(regex);
      return parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-yellow-500/30 text-yellow-200 px-0.5 rounded font-medium">
            {part}
          </mark>
        ) : (
          part
        ),
      );
    } catch {
      return text;
    }
  };

  const files = person.files ?? person.fileReferences?.length ?? 0;
  const title =
    person.title ||
    person.role ||
    (person as any).primaryRole ||
    person.evidence_types?.[0]?.toString().replace('_', ' ').toUpperCase() ||
    'Unknown';

  // Helper to get first available photo for avatar
  const avatarPhoto = person.photos && person.photos.length > 0 ? person.photos[0] : null;

  return (
    <div
      onClick={onClick}
      className="group relative bg-slate-900/80 backdrop-blur-sm hover:bg-slate-800/90 border border-slate-700/50 hover:border-cyan-500/30 rounded-xl p-5 cursor-pointer transition-all duration-300 active:scale-[0.99] shadow-lg hover:shadow-cyan-900/10"
      tabIndex={0}
      role="button"
      aria-label={`View details for ${person.name}`}
    >
      {/* Top row: Avatar, Info, Risk badge */}
      <div className="flex items-start gap-4 mb-4">
        {/* Entity Avatar - Photo or Icon */}
        <div className="flex-shrink-0 relative">
          {avatarPhoto ? (
            <div className="w-14 h-14 rounded-lg overflow-hidden border border-slate-600/50 group-hover:border-cyan-500/50 transition-colors shadow-sm">
              <img
                src={`/api/media/images/${avatarPhoto.id}/thumbnail`}
                alt={person.name}
                className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                loading="lazy"
                onError={(e) => {
                  // Fallback if image fails
                  (e.target as HTMLElement).style.display = 'none';
                  const parent = (e.target as HTMLElement).parentElement;
                  if (parent) {
                    parent.innerHTML = ''; // clear
                    // We can't easily re-render React component here, so we hide it or show simple fallback
                    parent.className =
                      'w-14 h-14 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500 border border-slate-700';
                  }
                }}
              />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 flex items-center justify-center text-slate-400 group-hover:text-cyan-400 group-hover:border-cyan-500/30 transition-all shadow-inner">
              {getEntityIcon()}
            </div>
          )}

          {/* Status Dot (Optional, if person has status) */}
          {person.status && (
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-slate-900 flex items-center justify-center">
              <div
                className={`w-2.5 h-2.5 rounded-full ${person.status.toLowerCase().includes('deceased') ? 'bg-slate-500' : 'bg-green-500'}`}
                title={person.status}
              />
            </div>
          )}
        </div>

        {/* Name and title */}
        <div className="flex-1 min-w-0 pt-0.5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-lg font-bold text-slate-100 truncate group-hover:text-cyan-300 transition-colors tracking-tight">
              {searchTerm ? highlightText(person.name, searchTerm) : person.name}
            </h3>

            {/* Risk badge - compact right aligned */}
            <div
              className={`flex-shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold tracking-wider ${getRiskColor(rating)}`}
            >
              <div className="flex -space-x-1">
                {Array.from({ length: Math.min(5, rating) }).map((_, i) => (
                  <Icon key={i} name="Flag" size="xs" color="inherit" className="w-3 h-3" />
                ))}
              </div>
              <span className="ml-1">{rating > 0 ? `LVL ${rating}` : 'UNRATED'}</span>
            </div>
          </div>

          <p className="text-xs text-slate-400 truncate mt-1 flex items-center gap-1.5">
            <span className="font-medium text-slate-500 uppercase tracking-wider text-[10px]">
              {(person as any).entity_type || (person as any).entityType || 'Entity'}
            </span>
            <span className="w-1 h-1 rounded-full bg-slate-600"></span>
            <span className="text-slate-300">
              {searchTerm ? highlightText(title, searchTerm) : title}
            </span>
          </p>
        </div>
      </div>

      {/* Stats row - Grid layout for better scanability */}
      <div className="grid grid-cols-3 gap-2 mb-4 bg-slate-950/30 rounded-lg p-2 border border-slate-800/50">
        <div className="flex flex-col items-center justify-center p-1">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
            Mentions
          </span>
          <div className="flex items-center gap-1 text-slate-200 font-bold">
            <Icon name="TrendingUp" size="xs" className="text-cyan-500" />
            {formatNumber(person.mentions)}
          </div>
        </div>
        <div className="flex flex-col items-center justify-center p-1 border-l border-slate-800/50">
          <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
            Docs
          </span>
          <div className="flex items-center gap-1 text-slate-200 font-bold">
            <Icon name="Folder" size="xs" className="text-blue-500" />
            {files}
          </div>
        </div>
        <div className="flex flex-col items-center justify-center p-1 border-l border-slate-800/50">
          {person?.blackBookEntry ? (
            <>
              <span className="text-[10px] text-purple-400/80 uppercase tracking-wider font-semibold">
                Source
              </span>
              <div
                className="flex items-center gap-1 text-purple-300 font-bold"
                title="In Black Book"
              >
                <Icon name="Book" size="xs" />
                <span>BB</span>
              </div>
            </>
          ) : (
            <>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">
                Rating
              </span>
              <div className="flex items-center gap-1 text-slate-200 font-bold">
                <span className={rating >= 4 ? 'text-red-400' : 'text-slate-300'}>{rating}/5</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Red Flag / Bio Section */}
      <div className="mb-4 min-h-[3rem]">
        {/* Prioritize Red Flag Description if high risk, else Bio */}
        {rating >= 3 && person.red_flag_description ? (
          <div className="bg-red-950/20 border-l-2 border-red-500/50 pl-3 py-1">
            <p className="text-xs text-red-100/90 leading-relaxed line-clamp-3 italic">
              "
              {searchTerm
                ? highlightText(
                    person.red_flag_description.replace(/^Red Flag Index \d+[\s:-]*/i, ''),
                    searchTerm,
                  )
                : person.red_flag_description.replace(/^Red Flag Index \d+[\s:-]*/i, '')}
              "
            </p>
          </div>
        ) : person.bio ? (
          <p className="text-xs text-slate-300 leading-relaxed line-clamp-3 font-normal">
            {searchTerm ? highlightText(person.bio, searchTerm) : person.bio}
          </p>
        ) : (
          <p className="text-xs text-slate-500 italic">No description available.</p>
        )}
      </div>

      {/* Evidence Badges */}
      {person.evidence_types && person.evidence_types.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {person.evidence_types.slice(0, 4).map((type, i) => (
            <span
              key={i}
              className="px-2 py-0.5 bg-slate-800 border border-slate-700 text-slate-300 rounded text-[10px] uppercase tracking-wide font-medium"
            >
              {type.toString().replace('_', ' ')}
            </span>
          ))}
          {person.evidence_types.length > 4 && (
            <span className="px-1.5 py-0.5 text-[10px] text-slate-500 font-medium">
              +{person.evidence_types.length - 4}
            </span>
          )}
        </div>
      )}

      {/* Photos Carousel - Only show if we have MORE than the 1 used for avatar (or if user wants all accessible) 
          Actually user wants to explore evidence, so showing the carousel is good even if the first one is used as avatar.
      */}
      {photos.length > 0 && (
        <div className="mt-auto pt-3 border-t border-slate-700/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Icon name="Image" size="xs" /> Associated Media
            </span>
            <span className="text-[10px] text-slate-600">{photos.length} items</span>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none mask-fade-right">
            {photos.slice(0, 5).map((photo) => (
              <div
                key={photo.id}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/media?photoId=${photo.id}`);
                }}
                className="relative flex-shrink-0 w-16 h-12 rounded-md overflow-hidden border border-slate-700 hover:border-cyan-400 cursor-pointer group/photo transition-all"
                title={photo.title || 'View photo'}
              >
                <img
                  src={`/api/media/images/${photo.id}/thumbnail`}
                  alt={photo.title}
                  className="w-full h-full object-cover opacity-80 group-hover/photo:opacity-100 transition-opacity"
                  loading="lazy"
                />
              </div>
            ))}
            {photos.length > 5 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/media?personId=${person.id}`);
                }}
                className="flex-shrink-0 w-8 h-12 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 flex items-center justify-center transition-colors"
              >
                <Icon name="ArrowRight" size="xs" className="text-slate-400" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Footer Actions */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/investigations?tab=analytics&focus=${person.id}`);
            }}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-purple-900/30 text-slate-400 hover:text-purple-400 transition-colors border border-transparent hover:border-purple-500/30"
            title="View Network Graph"
          >
            <Icon name="Network" size="sm" />
          </button>
          <AddToInvestigationButton
            item={{
              id: person.id || '',
              title: person.name,
              description: person.role || 'Entity',
              type: 'entity',
              sourceId: person.id || '',
            }}
            variant="icon"
          />
        </div>
        <span className="text-xs font-medium text-cyan-500 group-hover:underline decoration-cyan-500/30 underline-offset-4 flex items-center gap-1">
          View Profile <Icon name="ArrowRight" size="xs" />
        </span>
      </div>
    </div>
  );
};

export default PersonCard;
