import { randomUUID } from 'crypto';

/**
 * Generate a standard UUID for evidentiary traceability.
 */
export function makeId(): string {
  return randomUUID();
}
