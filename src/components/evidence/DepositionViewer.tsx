/**
 * Deposition Viewer Component
 *
 * Displays court depositions with legal formatting
 */

import React, { useState } from 'react';
import { Scale, User, Calendar, Search } from 'lucide-react';

interface DepositionViewerProps {
  evidence: {
    extractedText: string;
    metadata: {
      deponent?: string;
      caseIdentifier?: string;
      depositionDate?: string;
      attorneys?: string[];
    };
  };
}

export function DepositionViewer({ evidence }: DepositionViewerProps) {
  const { metadata, extractedText } = evidence;
  const [searchTerm, setSearchTerm] = useState('');

  const lines = extractedText.split('\n');

  const highlightText = (text: string, search: string) => {
    if (!search.trim()) return text;
    const parts = text.split(new RegExp(`(${search})`, 'gi'));
    return parts.map((part, index) =>
      part.toLowerCase() === search.toLowerCase() ? (
        <mark key={index} className="bg-yellow-200">
          {part}
        </mark>
      ) : (
        part
      ),
    );
  };

  return (
    <div className="p-6">
      {/* Deposition Header */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200 rounded-lg p-6 mb-6">
        <div className="flex items-start space-x-4">
          <Scale className="h-8 w-8 text-gray-600 mt-1" />
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              Deposition of {metadata.deponent || 'Unknown'}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {metadata.caseIdentifier && (
                <div>
                  <div className="text-sm text-gray-600">Case</div>
                  <div className="text-gray-900 font-medium">{metadata.caseIdentifier}</div>
                </div>
              )}

              {metadata.depositionDate && (
                <div>
                  <div className="text-sm text-gray-600">Date</div>
                  <div className="text-gray-900 font-medium">{metadata.depositionDate}</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search deposition..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Deposition Text */}
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="p-6">
          {lines.map((line, index) => (
            <div key={index} className="flex text-sm leading-relaxed mb-2">
              <div className="w-12 text-right text-gray-400 mr-4 flex-shrink-0">{index + 1}</div>
              <div className="flex-1 text-gray-800 font-mono">
                {searchTerm ? highlightText(line, searchTerm) : line}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
