import React from 'react';
import { DocumentBrowser } from '../components/documents/DocumentBrowser';

interface DocumentsPageProps {
  processor: any;
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
  selectedDocumentId: string;
  onDocumentClose: () => void;
}

export const DocumentsPage: React.FC<DocumentsPageProps> = ({
  processor,
  searchTerm,
  onSearchTermChange,
  selectedDocumentId,
  onDocumentClose,
}) => {
  if (!processor) {
    return (
      <div className="space-y-6">
        <div className="rounded-lg border border-slate-700 bg-slate-900/50 p-6 text-sm text-slate-300">
          Document workspace is unavailable right now. Please refresh the page or try again shortly.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <DocumentBrowser
        processor={processor}
        searchTerm={searchTerm}
        onSearchTermChange={onSearchTermChange}
        selectedDocumentId={selectedDocumentId}
        onDocumentClose={onDocumentClose}
      />
    </div>
  );
};
