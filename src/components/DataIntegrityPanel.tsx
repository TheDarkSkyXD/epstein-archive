import React from 'react';
import { CheckCircle, AlertTriangle, Clock, Database } from 'lucide-react';

interface DataIntegrityStats {
  entitiesWithDocuments: number;
  totalEntities: number;
  documentsWithMetadata: number;
  totalDocuments: number;
  lastRefresh: string;
}

interface DataIntegrityPanelProps {
  stats: DataIntegrityStats;
}

export const DataIntegrityPanel: React.FC<DataIntegrityPanelProps> = ({ stats }) => {
  const entityLinkPercentage = stats.totalEntities > 0 
    ? Math.round((stats.entitiesWithDocuments / stats.totalEntities) * 100) 
    : 0;
    
  const documentMetadataPercentage = stats.totalDocuments > 0 
    ? Math.round((stats.documentsWithMetadata / stats.totalDocuments) * 100) 
    : 0;

  return (
    <div className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-[var(--space-4)]">
      <div className="flex items-center justify-between mb-[var(--space-4)]">
        <h3 className="text-[var(--font-size-h4)] font-semibold text-[var(--text-primary)] flex items-center">
          <Database className="h-5 w-5 mr-[var(--space-2)] text-[var(--accent-primary)]" />
          Data Integrity
        </h3>
        <span className="text-[var(--font-size-caption)] text-[var(--text-tertiary)] flex items-center">
          <Clock className="h-4 w-4 mr-1" />
          {stats.lastRefresh}
        </span>
      </div>
      
      <div className="space-y-[var(--space-4)]">
        <div>
          <div className="flex justify-between text-[var(--font-size-caption)] mb-[var(--space-2)]">
            <span className="text-[var(--text-secondary)]">Entities with document links</span>
            <span className="text-[var(--text-primary)] font-medium">{entityLinkPercentage}%</span>
          </div>
          <div className="w-full bg-[var(--bg-subtle)] rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${
                entityLinkPercentage >= 95 ? 'bg-[var(--accent-success)]' : 
                entityLinkPercentage >= 80 ? 'bg-[var(--accent-warning)]' : 'bg-[var(--accent-danger)]'
              }`}
              style={{ width: `${entityLinkPercentage}%` }}
            ></div>
          </div>
          <div className="text-[var(--font-size-small)] text-[var(--text-tertiary)] mt-[var(--space-1)]">
            {stats.entitiesWithDocuments} of {stats.totalEntities} entities linked
          </div>
        </div>
        
        <div>
          <div className="flex justify-between text-[var(--font-size-caption)] mb-[var(--space-2)]">
            <span className="text-[var(--text-secondary)]">Documents with complete metadata</span>
            <span className="text-[var(--text-primary)] font-medium">{documentMetadataPercentage}%</span>
          </div>
          <div className="w-full bg-[var(--bg-subtle)] rounded-full h-2">
            <div 
              className={`h-2 rounded-full ${
                documentMetadataPercentage >= 95 ? 'bg-[var(--accent-success)]' : 
                documentMetadataPercentage >= 80 ? 'bg-[var(--accent-warning)]' : 'bg-[var(--accent-danger)]'
              }`}
              style={{ width: `${documentMetadataPercentage}%` }}
            ></div>
          </div>
          <div className="text-[var(--font-size-small)] text-[var(--text-tertiary)] mt-[var(--space-1)]">
            {stats.documentsWithMetadata} of {stats.totalDocuments} documents complete
          </div>
        </div>
      </div>
      
      <div className="mt-[var(--space-4)] pt-[var(--space-4)] border-t border-[var(--border-subtle)]">
        <button className="text-[var(--font-size-caption)] text-[var(--accent-primary)] hover:text-[var(--accent-secondary)] transition-colors flex items-center">
          Methodology & Sources
          <AlertTriangle className="h-4 w-4 ml-1" />
        </button>
      </div>
    </div>
  );
};