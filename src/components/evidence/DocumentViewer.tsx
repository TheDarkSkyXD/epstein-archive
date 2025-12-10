/**
 * Document Viewer Component (Default)
 * 
 * Displays text-based evidence with formatting preserved
 */

import React, { useState } from 'react';
import { Search, Copy, Check, Eye, FileText } from 'lucide-react';
import { prettifyOCRText } from '../../utils/prettifyOCR';

interface DocumentViewerProps {
  evidence: {
    title: string;
    extractedText: string;
    metadata: any;
  };
}

export function DocumentViewer({ evidence }: DocumentViewerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  const highlightText = (text: string, search: string) => {
    if (!search.trim()) return text;
    
    const parts = text.split(new RegExp(`(${search})`, 'gi'));
    return parts.map((part, index) => 
      part.toLowerCase() === search.toLowerCase() ? 
        <mark key={index} className="bg-yellow-200">{part}</mark> : 
        part
    );
  };

  const copyText = () => {
    navigator.clipboard.writeText(evidence.extractedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6">
      {/* Toolbar */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search in document..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Pretty/Raw Toggle */}
          <button
            onClick={() => setShowRaw(!showRaw)}
            className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
              showRaw 
                ? 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200' 
                : 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 shadow-sm'
            }`}
            title={showRaw ? 'Showing raw OCR text' : 'Showing cleaned text'}
          >
            {showRaw ? <FileText className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showRaw ? 'Raw' : 'Pretty'}
          </button>

          <button
            onClick={copyText}
            className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 mr-2 text-green-600" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copy Text
              </>
            )}
          </button>
        </div>
      </div>

      {/* Document Content */}
      <div className="prose max-w-none">
        <div className="whitespace-pre-wrap text-gray-800 font-mono text-sm leading-relaxed bg-gray-50 p-6 rounded-lg">
          {(() => {
            const displayText = showRaw ? evidence.extractedText : prettifyOCRText(evidence.extractedText);
            return searchTerm ? highlightText(displayText, searchTerm) : displayText;
          })()}
        </div>
      </div>
    </div>
  );
}
