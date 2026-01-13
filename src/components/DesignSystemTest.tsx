import React from 'react';
import { PersonCardRefined } from './PersonCardRefined';
import { DocumentCard } from './DocumentCard';
import { MediaCard } from './MediaCard';
import { SourceBadge } from './SourceBadge';
import { RedFlagIndex } from './RedFlagIndex';
import { Layout, Section } from './Layout';

// Mock data for testing
const mockPerson = {
  id: '1',
  name: 'John Doe',
  title: 'Former Executive',
  mentions: 42,
  files: 5,
  contexts: [],
  evidence_types: ['Email', 'Deposition', 'Flight Record'],
  spicy_passages: [],
  likelihood_score: 'HIGH' as const,
  spice_score: 8,
  spice_rating: 4,
  spice_peppers: '****',
  spice_description:
    'Multiple high-risk associations with key individuals and suspicious financial transactions.',
  red_flag_rating: 4,
  fileReferences: [],
};

const mockDocument = {
  id: '1',
  title: 'Financial Audit Report',
  filename: 'audit_2023.pdf',
  source: 'Seventh Production' as const,
  spiceRating: 3,
  mentions: 12,
  date: '2023-05-15',
  fileSize: '2.4 MB',
  fileType: 'PDF',
};

const mockMedia = {
  id: '1',
  title: 'Surveillance Photo',
  fileType: 'JPEG',
  fileSize: '1.2 MB',
  linkedEntities: 3,
  linkedDocument: 'Security Report #42',
};

export const DesignSystemTest: React.FC = () => {
  return (
    <Layout maxWidth="xl">
      <Section title="Design System Components Test">
        <div className="space-y-[var(--space-6)]">
          <div>
            <h3 className="text-[var(--font-size-h3)] font-semibold text-[var(--text-primary)] mb-[var(--space-3)]">
              Person Card
            </h3>
            <PersonCardRefined person={mockPerson} onClick={() => console.log('Person clicked')} />
          </div>

          <div>
            <h3 className="text-[var(--font-size-h3)] font-semibold text-[var(--text-primary)] mb-[var(--space-3)]">
              Document Card
            </h3>
            <DocumentCard document={mockDocument} onClick={() => console.log('Document clicked')} />
          </div>

          <div>
            <h3 className="text-[var(--font-size-h3)] font-semibold text-[var(--text-primary)] mb-[var(--space-3)]">
              Media Card
            </h3>
            <MediaCard media={mockMedia} onClick={() => console.log('Media clicked')} />
          </div>

          <div>
            <h3 className="text-[var(--font-size-h3)] font-semibold text-[var(--text-primary)] mb-[var(--space-3)]">
              Source Badges
            </h3>
            <div className="flex flex-wrap gap-[var(--space-2)]">
              <SourceBadge source="Seventh Production" />
              <SourceBadge source="Black Book" />
              <SourceBadge source="Public Record" />
            </div>
          </div>

          <div>
            <h3 className="text-[var(--font-size-h3)] font-semibold text-[var(--text-primary)] mb-[var(--space-3)]">
              Red Flag Index
            </h3>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <h4 className="text-sm font-medium text-slate-300 mb-2">Emoji Variant (Default)</h4>
                <div className="space-y-2">
                  <RedFlagIndex value={1} size="sm" showLabel />
                  <RedFlagIndex value={2} size="sm" showLabel />
                  <RedFlagIndex value={3} size="md" showLabel />
                  <RedFlagIndex value={4} size="md" showLabel />
                  <RedFlagIndex value={5} size="lg" showLabel />
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-slate-300 mb-2">Text Variant</h4>
                <div className="space-y-2">
                  <RedFlagIndex value={1} size="sm" showLabel variant="text" />
                  <RedFlagIndex value={2} size="sm" showLabel variant="text" />
                  <RedFlagIndex value={3} size="md" showLabel variant="text" />
                  <RedFlagIndex value={4} size="md" showLabel variant="text" />
                  <RedFlagIndex value={5} size="lg" showLabel variant="text" />
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-slate-300 mb-2">Icon Variant</h4>
                <div className="space-y-2">
                  <RedFlagIndex value={1} size="sm" showLabel variant="icon" />
                  <RedFlagIndex value={2} size="sm" showLabel variant="icon" />
                  <RedFlagIndex value={3} size="md" showLabel variant="icon" />
                  <RedFlagIndex value={4} size="md" showLabel variant="icon" />
                  <RedFlagIndex value={5} size="lg" showLabel variant="icon" />
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-slate-300 mb-2">
                  Combined Variant (Accessible)
                </h4>
                <div className="space-y-2">
                  <RedFlagIndex
                    value={1}
                    size="sm"
                    showLabel
                    variant="combined"
                    showTextLabel={true}
                  />
                  <RedFlagIndex
                    value={2}
                    size="sm"
                    showLabel
                    variant="combined"
                    showTextLabel={true}
                  />
                  <RedFlagIndex
                    value={3}
                    size="md"
                    showLabel
                    variant="combined"
                    showTextLabel={true}
                  />
                  <RedFlagIndex
                    value={4}
                    size="md"
                    showLabel
                    variant="combined"
                    showTextLabel={true}
                  />
                  <RedFlagIndex
                    value={5}
                    size="lg"
                    showLabel
                    variant="combined"
                    showTextLabel={true}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </Section>
    </Layout>
  );
};
