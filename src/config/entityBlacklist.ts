/**
 * Entity Blacklist Configuration
 * Used to filter out junk entities during ingestion/intelligence processing.
 */

export const ENTITY_BLACKLIST: string[] = [];

// Matches things that look like junk (e.g. single letters, numbers, common words)
export const ENTITY_BLACKLIST_REGEX = /^(?:[A-Z]|[0-9]+|Mr|Ms|Mrs|Dr|The|A|An)$/;

export const ENTITY_PARTIAL_BLOCKLIST: string[] = [
  'Received Received',
  'Sent from my',
  'Original Message',
];
