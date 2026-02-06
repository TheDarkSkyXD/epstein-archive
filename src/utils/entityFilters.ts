import { Person } from '../types';

/**
 * Patterns that indicate junk entities (OCR artifacts, legal boilerplate, non-person titles)
 */
const JUNK_PATTERNS = [
  // Legal & System Boilerplate
  /All Rights Reserved/i,
  /Copyright/i,
  /Privacy Policy/i,
  /Terms of Service/i,
  /Service Description/i,
  /Contact Us/i,
  /Unsubscribe/i,
  /Feedback/i,
  /Font[-\s]family/i,
  /Arial|Helvetica|Verdana/i,
  /Printed/i,
  /Multiple/i,
  /Closed/i,
  /sensit/i,
  /Interest/i,
  /Interest\s/i,
  /Additions/i,
  /Subtractions/i,
  /Checking/i,
  /Interest/i,
  /Advantage/i,

  // OCR Artifacts / Generic Placeholders
  /^[A-Z]\sName$/i, // "P Name"
  /^[A-Z][a-z]+\sPersonal$/i, // "Search Personal"
  /Personal\s+Name$/i, // "Search Personal Name"
  /Description\s+Water$/i,
  /^[a-z]/, // Starts with lowercase
  /\d/, // Contains digits

  // Generic Roles/Titles without names
  /^Judge\s+$/i,
  /^Attorney\s+$/i,
  /^President\s+$/i,
  /^Senator\s+$/i,

  // Organization-like patterns (if found in person list)
  /\sGroup$/i,
  /\sInc$/i,
  /\sLLC$/i,
  /\sCorp$/i,
  /\sLtd$/i,
  /Management\sGroup$/i,

  // Locations / Places
  /Towers$/i,
  /Estate$/i,
  /Street$/i,
  /Beach$/i,
  /Cliffs$/i,
  /Island$/i,
  /Mexico$/i,
  /New\s+York/i,
  /Palm\s+Beach/i,
  /Little\s+James/i,
  /Englewood/i,

  // Specific mangled strings from user screenshot
  /Suark\s+Ferrasl/i,
  /Stnect\s+Naw/i,
  /Srarch\s+Pereseel/i,
  /Sent\s+Prasel/i,
  /Searet\s+Persesel/i,
  /Seard\s+Pyrene/i,
  /Search\s+Persoznel/i,
];

/**
 * Heuristic to detect OCR mangled names or junk strings
 */
const hasOcrArtifacts = (name: string): boolean => {
  // Too many consecutive consonants often indicates mangled OCR
  if (/[bcdfghjklmnpqrstvwxyz]{5,}/i.test(name)) return true;

  // Missing vowels in a relatively long string
  if (name.length > 6 && !/[aeiouy]/i.test(name)) return true;

  // Very high ratio of capital letters in the middle of words
  const midCaps = name.slice(1).match(/[A-Z]/g);
  if (midCaps && midCaps.length > name.length / 3) return true;

  return false;
};

/**
 * Returns true if the entity name is likely junk/not a real person
 */
export const isJunkEntity = (name: string): boolean => {
  if (!name) return true;
  const trimmed = name.trim();
  if (trimmed.length <= 2) return true;

  // Basic patterns
  if (JUNK_PATTERNS.some((pattern) => pattern.test(trimmed))) return true;

  // OCR heuristics
  if (hasOcrArtifacts(trimmed)) return true;

  return false;
};

/**
 * Strictly filters a list of entities to only those that are likely real people
 */
export const filterPeopleOnly = (people: Person[]): Person[] => {
  return people.filter((p) => {
    if (!p.name) return false;

    // Check type explicitly if available
    const type = p.entity_type || (p as any).type;
    if (type && !['person', 'Person', 'Individual', 'Unknown'].includes(type)) {
      return false;
    }

    // Apply junk filters
    if (isJunkEntity(p.name)) return false;

    return true;
  });
};
