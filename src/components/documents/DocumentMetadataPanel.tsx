import React from 'react';
import { Database, Tag, Shield, AlertTriangle, Globe, File } from 'lucide-react';
import { format } from 'date-fns';

interface DocumentMetadataPanelProps {
  document: any;
  analysis?: any;
  className?: string;
  entities?: any[]; // Array of { name, role, id }
}

export const DocumentMetadataPanel: React.FC<DocumentMetadataPanelProps> = ({
  document,
  className = '',
  entities = [],
}) => {
  if (!document) return null;

  const metadata = document.metadata || {};
  const technical = metadata.technical || {};
  const structural = metadata.structure || {};
  const linguistics = metadata.linguistics || {};
  const network = metadata.network || {};

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown';
    try {
      return format(new Date(dateString), 'PP pp');
    } catch (_e) {
      return dateString;
    }
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* AI Analysis - Show if AI enrichment metadata exists */}
      {metadata.ai_summary && (
        <section className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 rounded-lg p-4 border border-purple-500/30">
          <h3 className="text-sm font-semibold text-purple-300 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="text-lg">🤖</span>
            AI Analysis
          </h3>
          <div className="space-y-3">
            <div>
              <span className="text-slate-500 block text-xs mb-1">AI Summary</span>
              <p className="text-slate-200 text-sm leading-relaxed">{metadata.ai_summary}</p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              {metadata.ai_provider && (
                <div>
                  <span className="text-slate-500 block mb-1">AI Provider</span>
                  <span className="text-purple-300 font-medium uppercase">
                    {metadata.ai_provider}
                  </span>
                </div>
              )}
              {metadata.ai_enriched_at && (
                <div>
                  <span className="text-slate-500 block mb-1">Enriched At</span>
                  <span className="text-slate-300">{formatDate(metadata.ai_enriched_at)}</span>
                </div>
              )}
            </div>
            {metadata.ai_error && (
              <div className="mt-2 p-2 bg-red-900/20 border border-red-500/30 rounded text-xs text-red-300">
                <strong>Error:</strong> {metadata.ai_error}
              </div>
            )}
          </div>
        </section>
      )}

      {/* File Information */}
      <section className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <File className="w-4 h-4" />
          File Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-slate-500 block text-xs mb-1">Filename</span>
            <span className="text-slate-200 font-medium break-all">
              {document.fileName || document.file_name}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-xs mb-1">Type</span>
            <span className="text-slate-200 font-medium uppercase">
              {document.fileType || document.file_type || 'Unknown'}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-xs mb-1">Size</span>
            <span className="text-slate-200 font-medium">
              {formatSize(document.fileSize || document.file_size)}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-xs mb-1">Hash (SHA-256)</span>
            <span className="text-slate-200 font-mono text-xs break-all">
              {document.contentHash || document.content_hash || 'N/A'}
            </span>
          </div>
        </div>
      </section>

      {/* Technical Metadata */}
      <section className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Database className="w-4 h-4" />
          Technical Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-slate-500 block text-xs mb-1">Created</span>
            <span className="text-slate-200">
              {formatDate(document.dateCreated || document.date_created || technical.createDate)}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-xs mb-1">Modified</span>
            <span className="text-slate-200">
              {formatDate(document.dateModified || document.date_modified || technical.modifyDate)}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-xs mb-1">Producer</span>
            <span className="text-slate-200">{technical.producer || 'Unknown'}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-xs mb-1">Creator Tool</span>
            <span className="text-slate-200">{technical.creator || 'Unknown'}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-xs mb-1">PDF Version</span>
            <span className="text-slate-200">{structural.pdfVersion || 'N/A'}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-xs mb-1">Page Count</span>
            <span className="text-slate-200">
              {structural.pageCount || document.pageCount || 'Unknown'}
            </span>
          </div>
        </div>
      </section>

      {/* Analysis & Forensics */}
      <section className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Shield className="w-4 h-4" />
          Analysis & Risk
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-slate-900/50 p-3 rounded border border-slate-700/50">
            <span className="text-slate-500 block text-xs mb-1">Red Flag Rating</span>
            <div className="flex items-center gap-1">
              <span className="text-lg font-bold text-white">
                {document.redFlagRating || document.red_flag_rating || 0}
              </span>
              <span className="text-xs text-slate-500">/ 5</span>
            </div>
            <div className="flex mt-1">
              {[...Array(5)].map((_, i) => (
                <span
                  key={i}
                  className={`text-xs ${i < (document.redFlagRating || 0) ? 'text-red-500' : 'text-slate-700'}`}
                >
                  🚩
                </span>
              ))}
            </div>
          </div>

          <div className="bg-slate-900/50 p-3 rounded border border-slate-700/50">
            <span className="text-slate-500 block text-xs mb-1">Readability (Grade)</span>
            <span className="text-lg font-bold text-white">
              {linguistics.readingLevel?.toFixed(1) || 'N/A'}
            </span>
          </div>

          <div className="bg-slate-900/50 p-3 rounded border border-slate-700/50">
            <span className="text-slate-500 block text-xs mb-1">Sentiment</span>
            <span
              className={`text-lg font-bold capitalize ${
                linguistics.sentiment === 'negative'
                  ? 'text-red-400'
                  : linguistics.sentiment === 'positive'
                    ? 'text-green-400'
                    : 'text-slate-300'
              }`}
            >
              {linguistics.sentiment || 'Neutral'}
            </span>
          </div>
        </div>

        {/* Additional Flags */}
        <div className="mt-4 flex flex-wrap gap-2">
          {structural.hasJavascript && (
            <span className="px-2 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded text-xs flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> JavaScript Detected
            </span>
          )}
          {network.riskScore > 50 && (
            <span className="px-2 py-1 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded text-xs flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> High Network Risk
            </span>
          )}
        </div>
      </section>

      {/* Source & Tags */}
      <section className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Tag className="w-4 h-4" />
          Classification
        </h3>
        <div className="space-y-4">
          <div>
            <span className="text-slate-500 block text-xs mb-1">Source Collection</span>
            <div className="flex items-center gap-2 text-slate-200 text-sm">
              <Globe className="w-3 h-3 text-slate-500" />
              {metadata.source_collection || 'Unclassified'}
            </div>
          </div>

          {metadata.source_original_url && (
            <div>
              <span className="text-slate-500 block text-xs mb-1">Original Source</span>
              <a
                href={metadata.source_original_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 text-xs truncate block"
              >
                {metadata.source_original_url}
              </a>
            </div>
          )}

          {(metadata.tags?.length > 0 || document.tags?.length > 0) && (
            <div>
              <span className="text-slate-500 block text-xs mb-2">Tags</span>
              <div className="flex flex-wrap gap-2">
                {[...(metadata.tags || []), ...(document.tags || [])].map(
                  (tag: string, i: number) => (
                    <span
                      key={i}
                      className="px-2 py-1 bg-slate-700 text-slate-300 rounded text-xs border border-slate-600"
                    >
                      {tag}
                    </span>
                  ),
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Mentioned Entities */}
      {entities && entities.length > 0 && (
        <section className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="text-lg">👥</span>
            Mentioned People
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {entities.map((entity, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2 bg-slate-900/50 rounded border border-slate-800 hover:border-cyan-500/30 transition-colors group cursor-pointer"
                onClick={() => {
                  // Dispatch event to open entity modal
                  window.dispatchEvent(
                    new CustomEvent('entityClick', {
                      detail: { id: entity.id, name: entity.name },
                    }),
                  );
                }}
              >
                <div className="min-w-0">
                  <div className="text-sm text-slate-200 font-medium truncate group-hover:text-cyan-400">
                    {entity.name}
                  </div>
                  {entity.role && (
                    <div className="text-xs text-slate-500 truncate">{entity.role}</div>
                  )}
                </div>
                {entity.mentions && (
                  <span className="text-xs text-slate-600 bg-slate-800 px-1.5 py-0.5 rounded">
                    {entity.mentions}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
