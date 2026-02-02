import React from 'react';
import Icon from './Icon';
import { Person } from '../types';
import { RedFlagIndex } from './RedFlagIndex';
import { BaseCard } from './BaseCard';
import { getEntityTypeIcon } from '../utils/entityTypeIcons';
import { ArrowRight } from 'lucide-react';

interface PersonCardProps {
  person: Person;
  onClick: () => void;
  onDocumentClick?: (document: any, searchTerm?: string) => void;
  searchTerm?: string;
}

// TODO: Implement document navigation - see UNUSED_VARIABLES_RECOMMENDATIONS.md
export const PersonCardRefined: React.FC<PersonCardProps> = ({
  person,
  onClick,
  onDocumentClick: _onDocumentClick,
  searchTerm,
}) => {
  // Get entity type icon
  const getEntityIcon = () => {
    const entityType = (person as any).entity_type || (person as any).entityType;
    return getEntityTypeIcon(entityType, 'md', person.title);
  };

  // Get role icon
  const getRoleIcon = (role: string) => {
    const roleLower = role.toLowerCase();
    if (roleLower.includes('president')) return <Icon name="User" size="sm" />;
    if (roleLower.includes('senator')) return <Icon name="User" size="sm" />;
    if (roleLower.includes('governor')) return <Icon name="User" size="sm" />;
    if (
      roleLower.includes('business') ||
      roleLower.includes('financier') ||
      roleLower.includes('ceo') ||
      roleLower.includes('executive')
    )
      return <Icon name="User" size="sm" />;
    if (
      roleLower.includes('professor') ||
      roleLower.includes('lawyer') ||
      roleLower.includes('attorney')
    )
      return <Icon name="FileText" size="sm" />;
    if (roleLower.includes('socialite')) return <Icon name="User" size="sm" />;
    return <Icon name="User" size="sm" />;
  };

  // Function to highlight search terms in text
  const highlightText = (text: string, term?: string) => {
    if (!term || !text || typeof text !== 'string') return text;

    try {
      // Escape special regex chars
      const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      // Split term into words and filter out short words to avoid noise
      const terms = term
        .split(/\s+/)
        .filter((t) => t.length > 2)
        .map(escapeRegExp);

      if (terms.length === 0) {
        // If no valid terms after filtering, try the full term if it's short but not empty
        if (term.trim().length > 0) {
          const regex = new RegExp(`(${escapeRegExp(term)})`, 'gi');
          return text.replace(
            regex,
            '<mark class="bg-yellow-500/30 text-white px-1 rounded">$1</mark>',
          );
        }
        return text;
      }

      // Create pattern to match any of the terms
      const pattern = `(${terms.join('|')})`;
      const regex = new RegExp(pattern, 'gi');

      return text.replace(
        regex,
        '<mark class="bg-yellow-500/30 text-white px-1 rounded">$1</mark>',
      );
    } catch (e) {
      console.warn('Error highlighting text:', e);
      return text;
    }
  };

  // Function to safely render highlighted text
  const renderHighlightedText = (text: string, term?: string) => {
    if (!term || !text || typeof text !== 'string') return text;

    try {
      const highlighted = highlightText(text, term);
      if (highlighted === text) return text;

      return <span dangerouslySetInnerHTML={{ __html: highlighted }} />;
    } catch (e) {
      console.warn('Error rendering highlighted text:', e);
      return text;
    }
  };

  return (
    <BaseCard
      onClick={onClick}
      className="group hover:ring-1 hover:ring-blue-500/50 transition-all duration-300"
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
        {/* Left: Icon & Name */}
        <div className="flex items-start space-x-3">
          <div className="bg-slate-800 rounded-lg p-3 group-hover:bg-blue-500/10 group-hover:text-blue-400 transition-all duration-300 shrink-0 border border-slate-700">
            {getEntityIcon()}
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors truncate pr-2">
              {searchTerm ? renderHighlightedText(person.name, searchTerm) : person.name}
            </h3>
            {person.title && (
              <div className="flex items-center space-x-2 mt-1">
                <div className="text-slate-500 shrink-0">{getRoleIcon(person.title)}</div>
                <p className="text-sm text-slate-400 truncate">
                  {searchTerm ? renderHighlightedText(person.title, searchTerm) : person.title}
                </p>
              </div>
            )}
            {/* Black Book Indicator */}
            {person?.blackBookEntry && (
              <div
                className="flex items-center gap-1 mt-1 text-purple-400 text-xs"
                title="This person appears in the Black Book"
              >
                <Icon name="Book" size="xs" />
                <span>Black Book Entry</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Stats (Stacked on mobile, aligned right on desktop) */}
        <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 sm:gap-1 pl-[3.5rem] sm:pl-0 mt-3 sm:mt-0 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <RedFlagIndex
              value={person.red_flag_rating !== undefined ? person.red_flag_rating : 0}
              size="sm"
              showLabel
              variant="combined"
              showTextLabel={true}
            />
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500 sm:mt-1">
            <div className="flex items-center">
              <Icon name="TrendingUp" size="xs" className="h-3 w-3 mr-1" />
              <span>{person.mentions} mentions</span>
            </div>
          </div>
        </div>
      </div>

      {/* Evidence types badges */}
      {person.evidence_types && person.evidence_types.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3 pl-[3.5rem]">
          {person.evidence_types.slice(0, 3).map((type, index) => (
            <span
              key={index}
              className="px-2 py-0.5 bg-slate-800 border border-slate-700 text-slate-300 rounded-full text-[10px] font-medium uppercase tracking-wide"
            >
              {type.replace('_', ' ')}
            </span>
          ))}
          {person.evidence_types.length > 3 && (
            <span className="px-2 py-0.5 bg-slate-800/50 text-slate-500 rounded-full text-[10px] font-medium">
              +{person.evidence_types.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Bio Section */}
      {person.bio && (
        <div className="bg-slate-800/30 rounded-lg p-3 mb-3 ml-[3.5rem] border border-slate-700/30">
          <p className="text-sm text-slate-300 leading-relaxed line-clamp-4 break-words font-medium">
            {searchTerm ? renderHighlightedText(person.bio, searchTerm) : person.bio}
          </p>
          {(person.birthDate || person.deathDate) && (
            <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
              {person.birthDate && <span>Born: {person.birthDate}</span>}
              {person.deathDate && <span>Died: {person.deathDate}</span>}
            </div>
          )}
        </div>
      )}

      {/* Key Evidence Preview */}
      {person.red_flag_description && (
        <div className="bg-slate-800/30 rounded-lg p-3 mb-4 ml-[3.5rem] border border-slate-700/30">
          <p className="text-sm text-slate-400 leading-relaxed line-clamp-3 break-words italic">
            {searchTerm
              ? renderHighlightedText(person.red_flag_description, searchTerm)
              : person.red_flag_description}
          </p>
        </div>
      )}

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-800 pl-[3.5rem]">
        <div className="flex items-center space-x-2 text-xs text-slate-500 font-medium">
          <Icon name="FileText" size="sm" className="h-3.5 w-3.5" />
          <span>
            {person.files !== undefined
              ? person.files
              : person.fileReferences
                ? person.fileReferences.length
                : 0}{' '}
            documents
          </span>
        </div>
        <div className="flex items-center gap-1 text-blue-400 text-xs font-medium hover:text-blue-300 transition-colors bg-blue-500/10 hover:bg-blue-500/20 px-3 py-1.5 rounded-full border border-blue-500/20">
          View Details
          <ArrowRight className="w-3 h-3" />
        </div>
      </div>
    </BaseCard>
  );
};
