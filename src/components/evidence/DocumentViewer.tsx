/**
 * Document Viewer Component (Default)
 *
 * Displays text-based evidence with formatting preserved
 */

import React, { useState } from 'react';
import { Search, Copy, Check, Eye, Download, FileText } from 'lucide-react';
import { prettifyOCRText } from '../../utils/prettifyOCR';
import { RedactionPlaceholder } from './RedactionPlaceholder';
import { WikiLink } from '../common/WikiLink';
import { apiClient } from '../../services/apiClient';

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
    allEntities?: Array<{ id: string; name: string }>;
  };
}

export function DocumentViewer({ evidence }: DocumentViewerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [copied, setCopied] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const [hideBoilerplate, setHideBoilerplate] = useState(false);
  const [entities, setEntities] = useState<Array<{ id: string; name: string }>>(
    evidence.allEntities || [],
  );

  // Fetch all entities for linking if not provided
  React.useEffect(() => {
    if (entities.length === 0) {
      apiClient.getAllEntities().then((data) => {
        setEntities(data.map((e: any) => ({ id: String(e.id), name: e.full_name || e.name })));
      });
    }
  }, [entities.length]);

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
    navigator.clipboard
      .writeText(evidence.contentRefined || evidence.extractedText || '')
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {
        setCopied(false);
      });
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
        {searchTerm ? (
          highlightText(displayText as string, searchTerm)
        ) : (
          <WikiLink text={displayText as string} entities={entities} />
        )}
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6 surface-glass">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div className="flex-1 min-w-[200px] max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search in document..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="control w-full pl-10 pr-4 py-2"
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
              className="control px-4 text-sm font-medium text-slate-100 hover:bg-slate-700/80 flex items-center"
              title="Download original document"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Original
            </a>
          )}

          {evidence.metadata?.unredacted_version_id && (
            <a
              href={`/document/${evidence.metadata.unredacted_version_id}`}
              className="control px-4 text-sm font-medium text-white bg-cyan-700 border-cyan-500 hover:bg-cyan-600 flex items-center"
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
              className={`control px-3 text-sm font-medium flex items-center gap-2 transition-colors ${
                hideBoilerplate
                  ? 'bg-amber-700/35 text-amber-100 border-amber-500/40'
                  : 'text-slate-200 hover:bg-slate-700/80'
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
            className={`control px-3 text-sm font-medium flex items-center gap-2 transition-colors ${
              showRaw
                ? 'text-slate-200 hover:bg-slate-700/80'
                : 'bg-cyan-700 text-white border-cyan-500 hover:bg-cyan-600'
            }`}
            title={showRaw ? 'Showing raw OCR text' : 'Showing cleaned text'}
          >
            {showRaw ? <FileText className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showRaw ? 'Raw' : 'Pretty'}
          </button>

          <button
            onClick={copyText}
            className="control px-4 text-sm font-medium text-slate-100 hover:bg-slate-700/80 flex items-center"
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
