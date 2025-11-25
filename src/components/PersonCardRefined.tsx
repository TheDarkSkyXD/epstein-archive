import React from 'react';
import { User, FileText, TrendingUp } from 'lucide-react';
import { Person } from '../types';
import { RedFlagIndex } from './RedFlagIndex';
import { BaseCard } from './BaseCard';

interface PersonCardProps {
  person: Person;
  onClick: () => void;
  onDocumentClick?: (document: any, searchTerm?: string) => void;
  searchTerm?: string;
}

export const PersonCardRefined: React.FC<PersonCardProps> = ({ 
  person, 
  onClick, 
  onDocumentClick, 
  searchTerm 
}) => {
  // Get role icon
  const getRoleIcon = (role: string) => {
    const roleLower = role.toLowerCase();
    if (roleLower.includes('president')) return <User className="h-4 w-4" />;
    if (roleLower.includes('senator')) return <User className="h-4 w-4" />;
    if (roleLower.includes('governor')) return <User className="h-4 w-4" />;
    if (roleLower.includes('business') || roleLower.includes('financier') || roleLower.includes('ceo') || roleLower.includes('executive')) return <User className="h-4 w-4" />;
    if (roleLower.includes('professor') || roleLower.includes('lawyer') || roleLower.includes('attorney')) return <FileText className="h-4 w-4" />;
    if (roleLower.includes('socialite')) return <User className="h-4 w-4" />;
    return <User className="h-4 w-4" />;
  };

  // Function to highlight search terms in text
  const highlightText = (text: string, term?: string) => {
    if (!term || !text || typeof text !== 'string') return text;
    
    try {
      // Escape special regex chars
      const escapeRegExp = (string: string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // Split term into words and filter out short words to avoid noise
      const terms = term.split(/\s+/).filter(t => t.length > 2).map(escapeRegExp);
      
      if (terms.length === 0) {
        // If no valid terms after filtering, try the full term if it's short but not empty
        if (term.trim().length > 0) {
           const regex = new RegExp(`(${escapeRegExp(term)})`, 'gi');
           return text.replace(regex, '<mark class="bg-[var(--accent-warning)] text-black px-1 rounded">$1</mark>');
        }
        return text;
      }
      
      // Create pattern to match any of the terms
      const pattern = `(${terms.join('|')})`;
      const regex = new RegExp(pattern, 'gi');
      
      return text.replace(regex, '<mark class="bg-[var(--accent-warning)] text-black px-1 rounded">$1</mark>');
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
    <BaseCard onClick={onClick} className="group">
      <div className="flex items-start justify-between mb-[var(--space-3)]">
        <div className="flex items-center space-x-[var(--space-3)]">
          <div className="bg-[var(--bg-subtle)] rounded-[var(--radius-md)] p-[var(--space-3)] group-hover:bg-[var(--accent-soft-primary)] transition-all duration-300">
            <User className="h-6 w-6 text-[var(--text-tertiary)] group-hover:text-[var(--accent-primary)]" />
          </div>
          <div>
            <h3 className="text-[var(--font-size-h3)] font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">
              {searchTerm ? renderHighlightedText(person.name, searchTerm) : person.name}
            </h3>
            {person.title && (
              <div className="flex items-center space-x-[var(--space-2)] mt-[var(--space-1)]">
                <div className="text-[var(--text-tertiary)]">
                  {getRoleIcon(person.title)}
                </div>
                <p className="text-[var(--font-size-caption)] text-[var(--text-secondary)]">
                  {searchTerm ? renderHighlightedText(person.title, searchTerm) : person.title}
                </p>
              </div>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="flex flex-col items-end gap-[var(--space-1)]">
            <RedFlagIndex value={person.red_flag_index !== undefined ? person.red_flag_index : (person.spice_rating || 0)} size="sm" showLabel />
            <div className="flex items-center text-[var(--font-size-small)] text-[var(--text-tertiary)]">
              <TrendingUp className="h-3 w-3 mr-1" />
              <span>{person.mentions} mentions</span>
            </div>
            <div className="text-[var(--font-size-small)] text-[var(--text-disabled)]">
              {(person.files !== undefined ? person.files : (person.fileReferences ? person.fileReferences.length : 0))} documents
            </div>
          </div>
        </div>
      </div>

      {/* Evidence types badges */}
      {person.evidence_types && person.evidence_types.length > 0 && (
        <div className="flex flex-wrap gap-[var(--space-2)] mb-[var(--space-3)]">
          {person.evidence_types.slice(0, 3).map((type, index) => (
            <span 
              key={index} 
              className="px-[var(--space-2)] py-[var(--space-1)] bg-[var(--accent-soft-primary)] text-[var(--accent-primary)] rounded-full text-[var(--font-size-small)]"
            >
              {type.replace('_', ' ').toUpperCase()}
            </span>
          ))}
          {person.evidence_types.length > 3 && (
            <span className="px-[var(--space-2)] py-[var(--space-1)] bg-[var(--bg-subtle)] text-[var(--text-secondary)] rounded-full text-[var(--font-size-small)]">
              +{person.evidence_types.length - 3} more
            </span>
          )}
        </div>
      )}

      {/* Key Evidence Preview */}
      {person.spice_description && (
        <div className="bg-[var(--bg-subtle)] rounded-[var(--radius-md)] p-[var(--space-3)] mb-[var(--space-3)]">
          <p className="text-[var(--font-size-caption)] text-[var(--text-secondary)] leading-relaxed">
            {searchTerm ? 
              renderHighlightedText(person.spice_description.substring(0, 140) + (person.spice_description.length > 140 ? '...' : ''), searchTerm) : 
              person.spice_description.substring(0, 140) + (person.spice_description.length > 140 ? '...' : '')}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-[var(--space-4)] border-t border-[var(--border-subtle)]">
        <div className="flex items-center space-x-[var(--space-2)] text-[var(--font-size-small)] text-[var(--text-tertiary)]">
          <FileText className="h-4 w-4" />
          <span>{(person.files !== undefined ? person.files : (person.fileReferences ? person.fileReferences.length : 0))} documents</span>
        </div>
        <button className="text-[var(--accent-primary)] text-[var(--font-size-caption)] font-medium hover:text-[var(--accent-secondary)] transition-colors">
          View Details
        </button>
      </div>
    </BaseCard>
  );
};