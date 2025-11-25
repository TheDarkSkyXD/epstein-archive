import React, { useState } from 'react';
import { Download, FileJson, FileArchive } from 'lucide-react';

interface EvidencePacketExporterProps {
  investigationId: string;
  investigationTitle: string;
  onExport: (format: 'json' | 'zip') => void;
}

export const EvidencePacketExporter: React.FC<EvidencePacketExporterProps> = ({ 
  investigationId, 
  investigationTitle,
  onExport 
}) => {
  const [selectedFormat, setSelectedFormat] = useState<'json' | 'zip'>('zip');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      onExport(selectedFormat);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-[var(--space-4)]">
      <h3 className="text-[var(--font-size-h4)] font-semibold text-[var(--text-primary)] mb-[var(--space-3)]">
        Export Evidence Packet
      </h3>
      
      <p className="text-[var(--font-size-caption)] text-[var(--text-secondary)] mb-[var(--space-4)]">
        Export this investigation as a comprehensive evidence packet containing entities, documents, 
        metadata, and Red Flag Index scores.
      </p>
      
      <div className="space-y-[var(--space-4)]">
        <div>
          <label className="block text-[var(--font-size-caption)] font-medium text-[var(--text-primary)] mb-[var(--space-2)]">
            Export Format
          </label>
          <div className="flex space-x-[var(--space-3)]">
            <button
              onClick={() => setSelectedFormat('json')}
              className={`
                flex-1 flex items-center justify-center p-[var(--space-3)] rounded-[var(--radius-md)] border transition-colors
                ${selectedFormat === 'json' 
                  ? 'border-[var(--accent-primary)] bg-[var(--accent-soft-primary)]' 
                  : 'border-[var(--border-subtle)] hover:border-[var(--text-tertiary)]'}
              `}
            >
              <FileJson className="h-5 w-5 mr-[var(--space-2)]" />
              <span>JSON</span>
            </button>
            
            <button
              onClick={() => setSelectedFormat('zip')}
              className={`
                flex-1 flex items-center justify-center p-[var(--space-3)] rounded-[var(--radius-md)] border transition-colors
                ${selectedFormat === 'zip' 
                  ? 'border-[var(--accent-primary)] bg-[var(--accent-soft-primary)]' 
                  : 'border-[var(--border-subtle)] hover:border-[var(--text-tertiary)]'}
              `}
            >
              <FileArchive className="h-5 w-5 mr-[var(--space-2)]" />
              <span>ZIP</span>
            </button>
          </div>
        </div>
        
        <div className="pt-[var(--space-4)] border-t border-[var(--border-subtle)]">
          <button
            onClick={handleExport}
            disabled={isExporting}
            className={`
              w-full flex items-center justify-center px-[var(--space-4)] py-[var(--space-3)] 
              bg-[var(--accent-primary)] text-white rounded-[var(--radius-md)] 
              hover:bg-[var(--accent-secondary)] transition-colors font-medium
              ${isExporting ? 'opacity-70 cursor-not-allowed' : ''}
            `}
          >
            <Download className="h-5 w-5 mr-[var(--space-2)]" />
            {isExporting ? 'Exporting...' : `Export as ${selectedFormat.toUpperCase()}`}
          </button>
        </div>
      </div>
    </div>
  );
};