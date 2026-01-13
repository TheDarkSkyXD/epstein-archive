import React from 'react';
import { Card } from './Card';
import { AddToInvestigationButton } from './AddToInvestigationButton';
// TODO: Icon usage for document metadata - see UNUSED_VARIABLES_RECOMMENDATIONS.md
// import Icon from './Icon';

interface Document {
  id: string;
  title: string;
  filename: string;
  source: 'Seventh Production' | 'Black Book' | 'Public Record';
  redFlagRating?: number;
  mentions?: number;
  date?: string;
  fileSize?: string;
  fileType?: string;
}

interface DocumentCardProps {
  document: Document;
  onClick: () => void;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({ document, onClick }) => {
  const metadata = [];
  if (document.fileType) {
    metadata.push({ label: 'Type', value: document.fileType, icon: 'Hash' });
  }
  if (document.fileSize) {
    metadata.push({ label: 'Size', value: document.fileSize });
  }
  if (document.date) {
    metadata.push({ label: 'Date', value: document.date, icon: 'Calendar' });
  }
  if (document.mentions !== undefined) {
    metadata.push({ label: 'Mentions', value: `${document.mentions}`, icon: 'Hash' });
  }

  const actionButtons = [
    {
      label: 'View in Investigation',
      onClick: () => console.log('View in investigation clicked for:', document.title),
      variant: 'secondary' as const,
    },
    {
      label: 'Related Entities',
      onClick: () => console.log('View related entities clicked for:', document.title),
      variant: 'secondary' as const,
    },
  ];

  return (
    <Card
      onClick={onClick}
      title={document.title || document.filename}
      subtitle={document.source}
      icon="FileText"
      iconColor="primary"
      redFlagRating={document.redFlagRating || 0}
      metadata={metadata}
      actionButtons={actionButtons}
      className="group"
    >
      <div className="flex justify-end">
        <AddToInvestigationButton
          item={{
            id: document.id,
            title: document.title || document.filename,
            description: `Document from ${document.source}`,
            type: 'document',
            sourceId: document.id,
          }}
          variant="quick"
          className="text-xs px-2 py-1"
        />
      </div>
    </Card>
  );
};
