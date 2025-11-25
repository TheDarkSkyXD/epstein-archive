import React from 'react';
import { User, ExternalLink, Calendar, TrendingUp, FileText, Award, Briefcase } from 'lucide-react';
import { Person } from '../types';
import { getLikelihoodColor, formatNumber } from '../utils/search';
import { RedFlagIndex } from './RedFlagIndex';

interface PersonCardProps {
  person: Person;
  onClick: () => void;
  onDocumentClick?: (document: any, searchTerm?: string) => void;
  searchTerm?: string;
}

const PersonCard: React.FC<PersonCardProps> = ({ person, onClick, onDocumentClick, searchTerm }) => {
  // Calculate mention intensity for visual indicator
  const maxMentions = 10686; // Trump's mentions as max
  const mentionIntensity = (person.mentions / maxMentions) * 100;
  
  // Get role icon
  const getRoleIcon = (role: string) => {
    const roleLower = role.toLowerCase();
    if (roleLower.includes('president')) return <Award className="h-4 w-4" />;
    if (roleLower.includes('senator')) return <Award className="h-4 w-4" />;
    if (roleLower.includes('governor')) return <Award className="h-4 w-4" />;
    if (roleLower.includes('business') || roleLower.includes('financier') || roleLower.includes('ceo') || roleLower.includes('executive')) return <Briefcase className="h-4 w-4" />;
    if (roleLower.includes('professor') || roleLower.includes('lawyer') || roleLower.includes('attorney')) return <FileText className="h-4 w-4" />;
    if (roleLower.includes('socialite')) return <User className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  // Get status color
  const getStatusColor = (status: string) => {
    if (status.includes('CONVICTED')) return 'text-red-400';
    if (status.includes('DECEASED')) return 'text-gray-400';
    if (status.includes('ACTIVE')) return 'text-green-400';
    return 'text-yellow-400';
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
           return text.replace(regex, '<mark class="bg-yellow-500 text-black px-1 rounded">$1</mark>');
        }
        return text;
      }
      
      // Create pattern to match any of the terms
      const pattern = `(${terms.join('|')})`;
      const regex = new RegExp(pattern, 'gi');
      
      return text.replace(regex, '<mark class="bg-yellow-500 text-black px-1 rounded">$1</mark>');
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
    <div 
      onClick={onClick}
      className="interactive-card bg-gradient-to-br from-slate-800/70 to-slate-900/50 backdrop-blur-sm border border-slate-600 rounded-2xl p-6 hover:from-slate-800/80 hover:to-slate-900/60 hover:border-slate-500 cursor-pointer group animate-fade-in"
    >
      {/* Mention intensity bar */}
      <div className="mb-4 h-1 bg-slate-700 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
          style={{ width: `${mentionIntensity}%` }}
        ></div>
      </div>

      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl p-3 group-hover:from-slate-600 group-hover:to-slate-700 transition-all duration-300">
            <User className="h-6 w-6 text-slate-300 group-hover:text-white" />
          </div>
          <div>
          <div className="relative group/name">
            <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">
              {searchTerm ? renderHighlightedText(person.name, searchTerm) : person.name}
            </h3>
            {/* Name variant tooltip */}
            {person.title_variants && person.title_variants.length > 0 && (
              <div className="absolute left-0 top-full mt-2 w-64 bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-xl opacity-0 invisible group-hover/name:opacity-100 group-hover/name:visible transition-all duration-200 z-10">
                <div className="text-xs font-semibold text-white mb-1">Name Variants:</div>
                <div className="text-xs text-slate-300">
                  {person.title_variants.join(', ')}
                </div>
              </div>
            )}
          </div>
            {person.title && (
              <div className="flex items-center space-x-2 mt-1">
                <div className="text-slate-400 text-sm">
                  {getRoleIcon(person.title)}
                </div>
                <p className="text-sm text-slate-400">
                  {searchTerm ? renderHighlightedText(person.title, searchTerm) : person.title}
                </p>
              </div>
            )}
            {!person.title && (
              <div className="flex items-center space-x-2 mt-1">
                <div className="text-slate-400 text-sm">
                  {getRoleIcon(person.evidence_types?.[0] || 'Unknown')}
                </div>
                <p className="text-sm text-slate-400">
                  {searchTerm ? renderHighlightedText(person.evidence_types?.[0] || 'Unknown', searchTerm) : (person.evidence_types?.[0] || 'Unknown')}
                </p>
              </div>
            )}
            {person.role && (
              <p className="text-xs text-slate-500 mt-1 max-w-xs line-clamp-2">
                {searchTerm ? renderHighlightedText(person.role, searchTerm) : person.role}
              </p>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="mt-2 flex flex-col items-end gap-1">
            <div title="Red Flag Index - Risk level based on evidence and mentions">
              <RedFlagIndex value={person.red_flag_index !== undefined ? person.red_flag_index : (person.spice_rating || 0)} size="sm" showLabel />
            </div>
            <div className="flex items-center text-xs text-slate-400">
              <TrendingUp className="h-3 w-3 mr-1" />
              <span title="Total mentions across all documents">{formatNumber(person.mentions)} mentions</span>
            </div>
            <div className="text-xs text-slate-500" title="Number of documents referencing this person">
              {(person.files !== undefined ? person.files : (person.fileReferences ? person.fileReferences.length : 0))} documents
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Secondary Roles */}
        {person.evidence_types && person.evidence_types.length > 1 && (
          <div className="bg-slate-800/30 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <FileText className="h-4 w-4 text-slate-400 mt-0.5" />
              <div>
                <span className="text-slate-400 text-sm font-medium" title="Other roles or positions associated with this person">Additional Roles</span>
                <p className="text-slate-300 text-xs mt-1">
                  {searchTerm ? renderHighlightedText(person.evidence_types.slice(1).join(', '), searchTerm) : person.evidence_types.slice(1).join(', ')}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Key Evidence Preview */}
        <div className="bg-gradient-to-r from-slate-800/40 to-slate-700/30 rounded-lg p-4 border border-slate-600/50">
          <div className="flex items-start space-x-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-blue-400 mt-2"></div>
            <div className="flex-1">
              <p className="text-xs text-slate-300 leading-relaxed">
                {person.spice_description ? 
                  renderHighlightedText(person.spice_description.substring(0, 140) + (person.spice_description.length > 140 ? '...' : ''), searchTerm) : 
                  'No key evidence available'}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center space-x-2">
              <div className="flex space-x-1">
                {Array.from({ length: Math.min(3, Math.ceil(person.likelihood_score === 'HIGH' ? 3 : person.likelihood_score === 'MEDIUM' ? 2 : 1)) }).map((_, i) => (
                  <div key={i} className="w-1 h-4 bg-gradient-to-b from-red-500 to-red-600 rounded"></div>
                ))}
              </div>
              <span className="text-xs text-slate-400" title="Estimated risk level based on evidence strength">Risk Level</span>
            </div>
            <span className="text-xs text-slate-500">{(person.files !== undefined ? person.files : 0)} sources</span>
          </div>
        </div>
      </div>

      {/* Key Documents & Context */}
      {person.fileReferences && person.fileReferences.length > 0 && (
        <div className="space-y-3 mt-4">
          <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider" title="Most relevant documents referencing this person">Key Documents</h4>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
            {person.fileReferences.slice(0, 5).map((doc, idx) => (
              <div 
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  // Use searchTerm if it's truthy (not empty/whitespace), otherwise use person.name
                  const termToUse = (searchTerm && searchTerm.trim()) || person.name;
                  onDocumentClick && onDocumentClick(doc, termToUse);
                }}
                className="bg-slate-800/40 hover:bg-slate-700/60 p-3 rounded-lg border border-slate-700/50 hover:border-blue-500/30 transition-all cursor-pointer group/doc"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-3 w-3 text-blue-400 mt-0.5" />
                    <span className="text-xs font-medium text-slate-300 group-hover/doc:text-blue-300 truncate max-w-[180px]" title="Document filename">
                      {doc.filename}
                    </span>
                  </div>
                  <RedFlagIndex value={doc.spiceRating || 0} size="sm" />
                </div>
                
                
                {(doc.contextText || doc.contentPreview) && (
                  <p className="text-[10px] text-slate-400 mt-1.5 line-clamp-2 leading-relaxed pl-5 border-l-2 border-slate-700 group-hover/doc:border-blue-500/50 transition-colors">
                    {searchTerm ? 
                      renderHighlightedText((doc.contextText || doc.contentPreview || '').substring(0, 150), searchTerm) : 
                      (doc.contextText || doc.contentPreview || '').substring(0, 150)}
                    ...
                  </p>
                )}
              </div>
            ))}
          </div>
          {person.fileReferences.length > 5 && (
            <div className="text-center pt-1">
              <span className="text-[10px] text-slate-500">
                + {person.fileReferences.length - 5} more documents
              </span>
            </div>
          )}
        </div>
      )}

      {/* Action Button */}
      <div className="mt-6 flex items-center justify-between pt-4 border-t border-slate-700/50">
        <div className="flex items-center space-x-2 text-xs text-slate-400">
          <Calendar className="h-3 w-3" />
          <span>{(person.files !== undefined ? person.files : (person.fileReferences ? person.fileReferences.length : 0))} documents</span>
        </div>
        <div className="flex items-center text-blue-400 text-sm font-medium group-hover:text-blue-300 transition-colors">
          <span title="Click to see detailed information about this person">View Full Profile</span>
          <ExternalLink className="h-4 w-4 ml-1 transform group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </div>
  );
};

export default PersonCard;