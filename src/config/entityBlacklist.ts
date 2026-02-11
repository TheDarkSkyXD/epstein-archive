/**
 * Entity Blacklist Configuration
 * Used to filter out junk entities during ingestion/intelligence processing.
 */

export const ENTITY_BLACKLIST: string[] = [];

// Matches things that look like junk (e.g. single letters, numbers, common words)
export const ENTITY_BLACKLIST_REGEX = /^(?:[A-Z]|[0-9]+|Mr|Ms|Mrs|Dr|The|A|An)$/;

export const ENTITY_BLACKLIST_PATTERNS: string[] = [
  'House',
  'Office',
  'Street',
  'Road',
  'Avenue',
  'Park',
  'Beach',
  'Islands',
  'Times',
  'Post',
  'News',
  'Press',
  'Journal',
  'Magazine',
  'Inc',
  'LLC',
  'Corp',
  'Ltd',
  'Group',
  'Trust',
  'Foundation',
  'University',
  'College',
  'School',
  'Academy',
  'Judge',
  'Court',
  'Attorney',
  'Justice',
  'Department',
  'Bureau',
  'Agency',
  'Police',
  'Sheriff',
  'FBI',
  'CIA',
  'Secret Service',
  'Tower',
  'Desktop',
  'Printed',
  'Mexico',
  'Prior',
  'Dated',
  'Page',
  'Exhibit',
  'Government',
  'District',
  'County',
  'State',
  'City',
  'New Mexico',
  'Virgin Islands',
  'Florida',
  'York',
  'London',
  'Palm Beach',
];

export const ENTITY_PARTIAL_BLOCKLIST: string[] = [
  'Received Received',
  'Sent from my',
  'Original Message',
  'They Like',
  'Estate Thomas',
  'Other Structures',
  'Closed Containess',
];
