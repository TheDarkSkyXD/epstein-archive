import React from 'react';
import { FileText, Users, TrendingUp, Lightbulb } from 'lucide-react';

interface ExampleInvestigationCardProps {
  onLoadExample: () => void;
}

export const ExampleInvestigationCard: React.FC<ExampleInvestigationCardProps> = ({ onLoadExample }) => {
  return (
    <div className="bg-[var(--bg-elevated)] border border-dashed border-[var(--border-subtle)] rounded-[var(--radius-lg)] p-[var(--space-6)] text-center">
      <div className="flex justify-center mb-[var(--space-4)]">
        <div className="bg-[var(--accent-soft-primary)] p-[var(--space-4)] rounded-full">
          <Lightbulb className="h-8 w-8 text-[var(--accent-primary)]" />
        </div>
      </div>
      
      <h3 className="text-[var(--font-size-h3)] font-semibold text-[var(--text-primary)] mb-[var(--space-3)]">
        Example: Flight logs and deposition cross-check
      </h3>
      
      <p className="text-[var(--font-size-body)] text-[var(--text-secondary)] mb-[var(--space-6)] max-w-2xl mx-auto">
        Demonstrates how Red Flag Index + evidence types can be used to build a case trail. 
        This example investigation shows how to trace connections between entities through documents and media.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-[var(--space-4)] mb-[var(--space-6)]">
        <div className="bg-[var(--bg-subtle)] rounded-[var(--radius-md)] p-[var(--space-4)]">
          <Users className="h-6 w-6 text-[var(--accent-primary)] mx-auto mb-[var(--space-2)]" />
          <h4 className="font-medium text-[var(--text-primary)] mb-[var(--space-1)]">Entities</h4>
          <p className="text-[var(--font-size-caption)] text-[var(--text-secondary)]">5 sample entities with high Red Flag Index</p>
        </div>
        
        <div className="bg-[var(--bg-subtle)] rounded-[var(--radius-md)] p-[var(--space-4)]">
          <FileText className="h-6 w-6 text-[var(--accent-primary)] mx-auto mb-[var(--space-2)]" />
          <h4 className="font-medium text-[var(--text-primary)] mb-[var(--space-1)]">Documents</h4>
          <p className="text-[var(--font-size-caption)] text-[var(--text-secondary)]">12 key documents with annotations</p>
        </div>
        
        <div className="bg-[var(--bg-subtle)] rounded-[var(--radius-md)] p-[var(--space-4)]">
          <TrendingUp className="h-6 w-6 text-[var(--accent-primary)] mx-auto mb-[var(--space-2)]" />
          <h4 className="font-medium text-[var(--text-primary)] mb-[var(--space-1)]">Timeline</h4>
          <p className="text-[var(--font-size-caption)] text-[var(--text-secondary)]">8 timeline events showing progression</p>
        </div>
      </div>
      
      <button
        onClick={onLoadExample}
        className="px-[var(--space-6)] py-[var(--space-3)] bg-[var(--accent-primary)] text-white rounded-[var(--radius-md)] hover:bg-[var(--accent-secondary)] transition-colors font-medium"
      >
        Load Example Investigation
      </button>
      
      <p className="text-[var(--font-size-caption)] text-[var(--text-tertiary)] mt-[var(--space-4)]">
        This is a read-only demonstration. Your real investigations will appear here.
      </p>
    </div>
  );
};