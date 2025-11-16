import React from 'react';
import { X, FileText, Calendar, User, AlertTriangle } from 'lucide-react';
import { Person } from '../data/peopleData';

interface EvidenceModalProps {
  person: Person;
  onClose: () => void;
}

export const EvidenceModal: React.FC<EvidenceModalProps> = ({ person, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl max-w-4xl max-h-[90vh] overflow-y-auto border border-slate-700">
        {/* Header */}
        <div className="sticky top-0 bg-slate-800 border-b border-slate-700 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <User className="w-6 h-6 text-cyan-400" />
            <h2 className="text-2xl font-bold text-white">{person.name}</h2>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              person.likelihood_score === 'HIGH' ? 'bg-red-900 text-red-200' :
              person.likelihood_score === 'MEDIUM' ? 'bg-yellow-900 text-yellow-200' :
              'bg-green-900 text-green-200'
            }`}>
              {person.likelihood_score} RISK
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-700 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-white">{person.mentions.toLocaleString()}</div>
              <div className="text-slate-400 text-sm">Total Mentions</div>
            </div>
            <div className="bg-slate-700 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-white">{person.files}</div>
              <div className="text-slate-400 text-sm">Files</div>
            </div>
            <div className="bg-slate-700 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-white">{person.evidence_types.length}</div>
              <div className="text-slate-400 text-sm">Evidence Types</div>
            </div>
          </div>

          {/* Evidence Types */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Evidence Types
            </h3>
            <div className="flex flex-wrap gap-2">
              {person.evidence_types.map((type, i) => (
                <span key={i} className="px-3 py-1 bg-blue-900 text-blue-200 rounded-full text-sm">
                  {type.replace('_', ' ').toUpperCase()}
                </span>
              ))}
            </div>
          </div>

          {/* Contexts */}
          {person.contexts.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Contexts ({person.contexts.length})
              </h3>
              <div className="space-y-3">
                {person.contexts.map((context, i) => (
                  <div key={i} className="bg-slate-700 rounded-lg p-4">
                    <p className="text-slate-300 mb-2">{context.context}</p>
                    <div className="flex items-center gap-4 text-xs text-slate-400">
                      <span className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {context.file}
                      </span>
                      {context.date !== 'Unknown' && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {context.date}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Spicy Passages */}
          {person.spicy_passages.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-red-300 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Key Passages ({person.spicy_passages.length})
              </h3>
              <div className="space-y-3">
                {person.spicy_passages.map((passage, i) => (
                  <div key={i} className="bg-red-900 bg-opacity-30 rounded-lg p-4 border border-red-700">
                    <p className="text-red-200 mb-2">{passage.passage}</p>
                    <div className="flex items-center gap-4 text-xs text-red-400">
                      <span className="px-2 py-1 bg-red-800 rounded">{passage.keyword.toUpperCase()}</span>
                      <span className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {passage.filename}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};