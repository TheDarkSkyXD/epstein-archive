import React from 'react';
import { User, ExternalLink, Calendar, TrendingUp, FileText, Award, Briefcase } from 'lucide-react';
import { Person } from '../types';
import { getLikelihoodColor, formatNumber } from '../utils/search';

interface PersonCardProps {
  person: Person;
  onClick: () => void;
}

const PersonCard: React.FC<PersonCardProps> = ({ person, onClick }) => {
  // Calculate mention intensity for visual indicator
  const maxMentions = 10686; // Trump's mentions as max
  const mentionIntensity = (person.mentions / maxMentions) * 100;
  
  // Get role icon
  const getRoleIcon = (role: string) => {
    if (role.toLowerCase().includes('president')) return <Award className="h-4 w-4" />;
    if (role.toLowerCase().includes('business') || role.toLowerCase().includes('financier')) return <Briefcase className="h-4 w-4" />;
    if (role.toLowerCase().includes('socialite')) return <User className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  // Get status color
  const getStatusColor = (status: string) => {
    if (status.includes('CONVICTED')) return 'text-red-400';
    if (status.includes('DECEASED')) return 'text-gray-400';
    if (status.includes('ACTIVE')) return 'text-green-400';
    return 'text-yellow-400';
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
            <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">
              {person.name}
            </h3>
            <div className="flex items-center space-x-2 mt-1">
              <div className="text-slate-400 text-sm">
                {getRoleIcon(person.evidence_types?.[0] || 'Unknown')}
              </div>
              <p className="text-sm text-slate-400">{person.evidence_types?.[0] || 'Unknown'}</p>
            </div>
          </div>
        </div>
        <div className="text-right">
          <span className={`px-3 py-1 text-xs font-bold rounded-full border-2 ${getLikelihoodColor(person.likelihood_score)}`}>
            {person.likelihood_score}
          </span>
          <div className="mt-2 flex items-center text-xs text-slate-400">
            <TrendingUp className="h-3 w-3 mr-1" />
            {formatNumber(person.mentions)}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Status */}
        <div className="bg-slate-800/50 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-sm font-medium">Current Status</span>
            <span className={`text-sm font-bold ${getStatusColor(person.likelihood_score)}`}>
              {person.likelihood_score}
            </span>
          </div>
        </div>

        {/* Secondary Roles */}
        {person.evidence_types && person.evidence_types.length > 1 && (
          <div className="bg-slate-800/30 rounded-lg p-3">
            <div className="flex items-start space-x-2">
              <FileText className="h-4 w-4 text-slate-400 mt-0.5" />
              <div>
                <span className="text-slate-400 text-sm font-medium">Additional Roles</span>
                <p className="text-slate-300 text-xs mt-1">{person.evidence_types.slice(1).join(', ')}</p>
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
                {person.spice_description ? person.spice_description.substring(0, 140) + (person.spice_description.length > 140 ? '...' : '') : 'No key evidence available'}
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
              <span className="text-xs text-slate-400">Risk Level</span>
            </div>
            <span className="text-xs text-slate-500">{person.files} sources</span>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="mt-6 flex items-center justify-between">
        <div className="flex items-center space-x-2 text-xs text-slate-400">
          <Calendar className="h-3 w-3" />
          <span>{person.files} documents</span>
        </div>
        <div className="flex items-center text-blue-400 text-sm font-medium group-hover:text-blue-300 transition-colors">
          <span>View Full Evidence</span>
          <ExternalLink className="h-4 w-4 ml-1 transform group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </div>
  );
};

export default PersonCard;