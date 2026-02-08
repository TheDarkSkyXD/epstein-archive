/**
 * Document Viewer Component (Default)
 *
 * Displays text-based evidence with formatting preserved
 */

import React, { useState } from 'react';
import { Search, Copy, Check, Eye, Download, FileText } from 'lucide-react';
import { prettifyOCRText } from '../../utils/prettifyOCR';
import { RedactionPlaceholder } from './RedactionPlaceholder';

interface DocumentViewerProps {
  evidence: {
    title: string;
    extractedText: string;
    contentRefined?: string;
    metadata: any;
    original_file_path?: string;
    redaction_spans?: Array<{
      span_start: number;
      span_end: number;
      inferred_class: string;
      inferred_role?: string;
      confidence: number;
      redaction_kind: 'pdf_overlay' | 'removed_text' | 'image_box' | 'unknown';
    }>;
  };
}

export function DocumentViewer({ evidence }: DocumentViewerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const [hideBoilerplate, setHideBoilerplate] = useState(false);

  // Extend props type safely
  const docEvidence = evidence as any;
  const hasSentences = docEvidence.sentences && docEvidence.sentences.length > 0;

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

  const copyText = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderWithRedactions = (highlightedText: React.ReactNode) => {
    if (!evidence.redaction_spans || evidence.redaction_spans.length === 0 || showRaw) {
      return highlightedText;
    }

    // Simplest approach: Text -> Replace Spans with Placeholders -> Return Array
    const text = evidence.extractedText;
    if (typeof highlightedText !== 'string' && searchTerm) {
      // If searching, we skip redaction rendering for simplicity or need complex overlap logic
      return highlightedText;
    }

    // We are working with the full text string
    const spans = [...evidence.redaction_spans].sort((a, b) => a.span_start - b.span_start);
    const result: React.ReactNode[] = [];
    let lastIndex = 0;

    spans.forEach((span, idx) => {
      if (span.span_start < lastIndex) return; // Skip overlaps

      // Text before
      const before = text.substring(lastIndex, span.span_start);
      if (before) result.push(prettifyOCRText(before));

      // Redaction Component
      result.push(
        <RedactionPlaceholder
          key={`redaction-${idx}`}
          type={span.inferred_class}
          role={span.inferred_role}
          confidence={span.confidence}
          kind={span.redaction_kind}
        />,
      );

      lastIndex = span.span_end;
    });

    // Remaining text
    if (lastIndex < text.length) {
      result.push(prettifyOCRText(text.substring(lastIndex)));
    }

    return result;
  };

  const renderContent = () => {
    // 1. If we have structured sentences, use them for advanced visualization
    if (hasSentences && !showRaw) {
      return (
        <div className="space-y-1">
          {docEvidence.sentences.map((sent: any) => {
            if (hideBoilerplate && sent.is_boilerplate) return null;

            return (
              <span
                key={sent.id}
                className={`transition-colors ${
                  sent.is_boilerplate ? 'text-gray-400 text-xs' : ''
                } ${sent.signal_score > 0.8 ? 'bg-purple-50' : ''}`}
                title={`Signal: ${(sent.signal_score * 100).toFixed(0)}% ${
                  sent.is_boilerplate ? '(Boilerplate)' : ''
                }`}
              >
                {searchTerm
                  ? highlightText(sent.sentence_text, searchTerm)
                  : sent.sentence_text}{' '}
              </span>
            );
          })}
        </div>
      );
    }

    // 2. Fallback to standard text rendering
    const rawText = evidence.extractedText;
    const cleanText = evidence.contentRefined || prettifyOCRText(rawText);

    const displayText = showRaw ? rawText : renderWithRedactions(cleanText);

    // If it's an array (from renderWithRedactions), we return it directly (search disabled for now on redacted view)
    if (Array.isArray(displayText)) return <div>{displayText}</div>;

    return (
      <div className={showRaw ? 'font-mono' : 'font-sans'}>
        {searchTerm ? highlightText(displayText as string, searchTerm) : displayText}
      </div>
    );
  };

  return (
    <div className="p-6">
      {/* Toolbar */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div className="flex-1 min-w-[200px] max-w-md">
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
          {(evidence.original_file_path || evidence.metadata?.source_original_url) && (
            <a
              href={evidence.original_file_path || evidence.metadata.source_original_url}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              title="Download original document"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Original
            </a>
          )}

          {evidence.metadata?.unredacted_version_id && (
            <a
              href={`/document/${evidence.metadata.unredacted_version_id}`}
              className="flex items-center px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-purple-600 rounded-lg hover:bg-purple-700 shadow-sm"
              title="View the unredacted version of this document"
            >
              <Eye className="h-4 w-4 mr-2" />
              View Unredacted
            </a>
          )}

          {/* Boilerplate Toggle */}
          {hasSentences && !showRaw && (
            <button
              onClick={() => setHideBoilerplate(!hideBoilerplate)}
              className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                hideBoilerplate
                  ? 'bg-orange-100 text-orange-800 border-orange-200'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
              title="Hide legal boilerplate and noise"
            >
              <span
                className={`w-2 h-2 rounded-full ${hideBoilerplate ? 'bg-orange-500' : 'bg-gray-300'}`}
              />
              {hideBoilerplate ? 'Hidden' : 'Show Noise'}
            </button>
          )}

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
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
