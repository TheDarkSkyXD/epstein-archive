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
  return (
    <div className="space-y-6">
      {processor && (
        <DocumentBrowser
          processor={processor}
          searchTerm={searchTerm}
          onSearchTermChange={onSearchTermChange}
          selectedDocumentId={selectedDocumentId}
          onDocumentClose={onDocumentClose}
        />
      )}
    </div>
  );
};
