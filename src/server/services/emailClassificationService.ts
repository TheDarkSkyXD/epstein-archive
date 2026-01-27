/**
 * Email Classification Service
 * Implements Gmail-style intelligent email filtering
 *
 * Categories:
 * - primary: Personal emails from real people, especially known entities
 * - updates: Notifications, confirmations, receipts
 * - promotions: Marketing emails, newsletters, sales
 * - social: Social network notifications
 * - forums: Mailing lists, group discussions
 */

import { getDb } from '../db/connection.js';

// Known real people senders (VIPs in the Epstein case)
const KNOWN_ENTITY_SENDERS: Record<string, string> = {
  'ehbarak1@gmail.com': 'Ehud Barak',
  'jeevacation@gmail.com': 'Jeffrey Epstein',
  // Add more known senders as discovered
};

// Newsletter/Marketing domain patterns
const NEWSLETTER_DOMAINS = [
  'response.cnbc.com',
  'houzz.com',
  'washingtonpost.com',
  'e.newyorktimesinfo.com',
  'fab.com',
  'conciergeauctions.com',
  'mymms.com',
  'firmoo.com',
  'treatsmagazine.com',
  'spotify.com',
  'spotifymail.com',
  'coursera.org',
  'goodreads.com',
  'mail.23andme.com',
  'ditto.com',
  'sailthru.com',
  'hubspot.com',
  'constantcontact.com',
  'mailchimp.com',
  'sendgrid.net',
  'amazonses.com',
  'bounce.cnbc.com',
  'section8-information.org',
];

// Transaction/Update senders
const TRANSACTION_PATTERNS = [
  'amazon.com',
  'shipment-tracking@',
  'ship-confirm@',
  'digital-no-reply@',
  'noreply@',
  'no-reply@',
  'donotreply@',
  'order@',
  'orders@',
  'confirmation@',
  'receipts@',
  'billing@',
  'invoice@',
  'support@',
  'alerts@',
  'notifications@',
  'updates@',
];

// Social notification patterns
const SOCIAL_PATTERNS = [
  'facebook.com',
  'twitter.com',
  'linkedin.com',
  'instagram.com',
  'pinterest.com',
  'facebookmail.com',
  'twittermail.com',
];

// Subject patterns indicating newsletters
const NEWSLETTER_SUBJECT_PATTERNS = [
  /sale/i,
  /% off/i,
  /discount/i,
  /newsletter/i,
  /digest/i,
  /weekly/i,
  /daily news/i,
  /morning squawk/i,
  /headlines/i,
  /your copy of/i,
  /new issue/i,
  /special offer/i,
  /limited time/i,
  /exclusive/i,
  /don't miss/i,
  /last chance/i,
  /ending soon/i,
  /free shipping/i,
  /clearance/i,
];

// Body patterns indicating newsletters
const NEWSLETTER_BODY_PATTERNS = [
  /unsubscribe/i,
  /view in browser/i,
  /email preferences/i,
  /manage subscriptions/i,
  /opt.out/i,
  /privacy policy/i,
  /terms of service/i,
  /you are receiving this/i,
  /this email was sent to/i,
  /add us to your address book/i,
];

export type EmailCategory = 'primary' | 'updates' | 'promotions' | 'social' | 'forums';

export interface ClassifiedEmail {
  id: number;
  category: EmailCategory;
  isFromKnownEntity: boolean;
  knownEntityName?: string;
  confidence: number;
}

export interface EmailClassificationResult {
  category: EmailCategory;
  confidence: number;
  isFromKnownEntity: boolean;
  knownEntityName?: string;
  reasons: string[];
}

/**
 * Classify an email based on sender, subject, and content
 */
export function classifyEmail(
  sender: string,
  subject: string,
  content: string | null,
): EmailClassificationResult {
  const reasons: string[] = [];
  let category: EmailCategory = 'primary';
  let confidence = 0.5;
  let isFromKnownEntity = false;
  let knownEntityName: string | undefined;

  const senderLower = (sender || '').toLowerCase();
  const subjectLower = (subject || '').toLowerCase();
  const contentLower = (content || '').toLowerCase();

  // Extract email address from sender
  const emailMatch = senderLower.match(/<([^>]+)>/) || [null, senderLower];
  const senderEmail = emailMatch[1] || senderLower;
  const senderDomain = senderEmail.split('@')[1] || '';

  // 1. Check if from known entity (highest priority)
  if (KNOWN_ENTITY_SENDERS[senderEmail]) {
    isFromKnownEntity = true;
    knownEntityName = KNOWN_ENTITY_SENDERS[senderEmail];
    category = 'primary';
    confidence = 0.99;
    reasons.push(`Known entity: ${knownEntityName}`);
    return { category, confidence, isFromKnownEntity, knownEntityName, reasons };
  }

  // 2. Check for newsletter domains
  const isNewsletterDomain = NEWSLETTER_DOMAINS.some(
    (domain) => senderDomain.includes(domain) || senderEmail.includes(domain),
  );
  if (isNewsletterDomain) {
    category = 'promotions';
    confidence = 0.9;
    reasons.push('Newsletter domain detected');
  }

  // 3. Check for transaction patterns
  const isTransaction = TRANSACTION_PATTERNS.some(
    (pattern) => senderEmail.includes(pattern) || senderDomain.includes(pattern),
  );
  if (isTransaction) {
    category = 'updates';
    confidence = 0.85;
    reasons.push('Transaction/notification sender');
  }

  // 4. Check for social patterns
  const isSocial = SOCIAL_PATTERNS.some(
    (pattern) => senderEmail.includes(pattern) || senderDomain.includes(pattern),
  );
  if (isSocial) {
    category = 'social';
    confidence = 0.9;
    reasons.push('Social network notification');
  }

  // 5. Check subject patterns for newsletters
  const subjectIsNewsletter = NEWSLETTER_SUBJECT_PATTERNS.some((pattern) =>
    pattern.test(subjectLower),
  );
  if (subjectIsNewsletter) {
    if (category === 'primary') {
      category = 'promotions';
      confidence = 0.75;
    }
    reasons.push('Newsletter subject pattern');
  }

  // 6. Check body patterns for newsletters
  const bodyIsNewsletter = NEWSLETTER_BODY_PATTERNS.some((pattern) => pattern.test(contentLower));
  if (bodyIsNewsletter) {
    if (category === 'primary') {
      category = 'promotions';
      confidence = 0.8;
    } else if (category === 'promotions') {
      confidence = Math.min(0.95, confidence + 0.1);
    }
    reasons.push('Newsletter body pattern');
  }

  // 7. Check for personal email indicators
  const hasPersonalGreeting = /^(hi|hello|dear|hey)\s+[a-z]/i.test(contentLower.slice(0, 100));
  const hasPersonalSign = /(regards|best|thanks|cheers|sincerely),?\s*\n/i.test(contentLower);
  const isShortEmail = (content || '').length < 2000;
  const noHtml = !/<html|<div|<table|<style/i.test(content || '');

  if (hasPersonalGreeting && hasPersonalSign && isShortEmail && noHtml) {
    if (category !== 'primary') {
      // Override to primary if it looks personal
      category = 'primary';
      confidence = 0.7;
      reasons.push('Personal email indicators');
    }
  }

  // 8. Gmail-style "from a person" heuristic
  // If sender looks like a real name (not a company), boost primary
  const senderName = sender.replace(/<.*>/, '').trim();
  const looksLikePersonName = /^[A-Z][a-z]+(\s+[A-Z][a-z]+)?$/.test(senderName);
  if (looksLikePersonName && category === 'primary') {
    confidence = Math.min(0.85, confidence + 0.2);
    reasons.push('Sender looks like personal name');
  }

  return { category, confidence, isFromKnownEntity, knownEntityName, reasons };
}

export interface LinkedEntity {
  id: number;
  name: string;
  type: string;
  confidence: number;
}

/**
 * Get known entities mentioned in email content
 */
export async function getEntitiesInEmail(content: string): Promise<LinkedEntity[]> {
  const db = getDb();

  // Get top entities with high mentions
  const entities = db
    .prepare(
      `
    SELECT id, full_name as name, mentions, entity_type as type
    FROM entities
    WHERE mentions > 10
    AND entity_type = 'Person'
    AND length(full_name) > 3
    ORDER BY mentions DESC
    LIMIT 500
  `,
    )
    .all() as Array<{ id: number; name: string; mentions: number; type: string }>;

  const contentLower = content.toLowerCase();
  const found: LinkedEntity[] = [];

  for (const entity of entities) {
    const nameLower = entity.name.toLowerCase();
    // Check for full name match or last name match
    if (contentLower.includes(nameLower)) {
      found.push({
        id: entity.id,
        name: entity.name,
        type: entity.type || 'Person',
        confidence: 0.9, // High confidence for full name match
      });
    } else {
      // Check last name only for multi-word names
      const parts = nameLower.split(' ');
      if (parts.length > 1) {
        const lastName = parts[parts.length - 1];
        if (lastName.length > 3 && contentLower.includes(lastName)) {
          found.push({
            id: entity.id,
            name: entity.name,
            type: entity.type || 'Person',
            confidence: 0.7, // Lower confidence for last name only match
          });
        }
      }
    }
  }

  // Sort by confidence then limit to top 10
  return found.sort((a, b) => b.confidence - a.confidence).slice(0, 10);
}

/**
 * Build SQL WHERE clause for email category filtering
 */
export function buildCategoryWhereClause(category: string): { clause: string; isComplex: boolean } {
  switch (category) {
    case 'primary':
      // Emails from known entities or that look personal
      return {
        clause: `
          AND (
            -- Known entity senders
            json_extract(metadata_json, '$.from') IN (${Object.keys(KNOWN_ENTITY_SENDERS)
              .map((e) => `'${e}'`)
              .join(',')})
            OR json_extract(metadata_json, '$.from') LIKE '%ehbarak1@gmail.com%'
            OR json_extract(metadata_json, '$.from') LIKE '%jeevacation@gmail.com%'
            -- Exclude obvious newsletters
            AND json_extract(metadata_json, '$.from') NOT LIKE '%@houzz.com%'
            AND json_extract(metadata_json, '$.from') NOT LIKE '%@response.cnbc.com%'
            AND json_extract(metadata_json, '$.from') NOT LIKE '%@washingtonpost.com%'
            AND json_extract(metadata_json, '$.from') NOT LIKE '%@amazon.com%'
            AND json_extract(metadata_json, '$.from') NOT LIKE '%noreply@%'
            AND json_extract(metadata_json, '$.from') NOT LIKE '%no-reply@%'
            AND json_extract(metadata_json, '$.from') NOT LIKE '%donotreply@%'
            AND content NOT LIKE '%unsubscribe%'
          )
        `,
        isComplex: true,
      };

    case 'updates':
      // Transaction emails, confirmations, notifications
      return {
        clause: `
          AND (
            json_extract(metadata_json, '$.from') LIKE '%amazon.com%'
            OR json_extract(metadata_json, '$.from') LIKE '%shipment%'
            OR json_extract(metadata_json, '$.from') LIKE '%order%'
            OR json_extract(metadata_json, '$.from') LIKE '%noreply@%'
            OR json_extract(metadata_json, '$.from') LIKE '%no-reply@%'
            OR json_extract(metadata_json, '$.from') LIKE '%confirmation@%'
            OR json_extract(metadata_json, '$.from') LIKE '%alerts@%'
            OR file_name LIKE '%verification%'
            OR file_name LIKE '%order%'
            OR file_name LIKE '%shipping%'
          )
        `,
        isComplex: true,
      };

    case 'promotions':
      // Marketing, newsletters, sales
      return {
        clause: `
          AND (
            json_extract(metadata_json, '$.from') LIKE '%@houzz.com%'
            OR json_extract(metadata_json, '$.from') LIKE '%@response.cnbc.com%'
            OR json_extract(metadata_json, '$.from') LIKE '%fab.com%'
            OR json_extract(metadata_json, '$.from') LIKE '%conciergeauctions%'
            OR json_extract(metadata_json, '$.from') LIKE '%washingtonpost.com%'
            OR json_extract(metadata_json, '$.from') LIKE '%newyorktimes%'
            OR json_extract(metadata_json, '$.from') LIKE '%dailynews%'
            OR json_extract(metadata_json, '$.from') LIKE '%newsletter%'
            OR json_extract(metadata_json, '$.from') LIKE '%mymms%'
            OR json_extract(metadata_json, '$.from') LIKE '%firmoo%'
            OR json_extract(metadata_json, '$.from') LIKE '%spotify%'
            OR json_extract(metadata_json, '$.from') LIKE '%coursera%'
            OR json_extract(metadata_json, '$.from') LIKE '%goodreads%'
            OR json_extract(metadata_json, '$.from') LIKE '%23andme%'
            OR json_extract(metadata_json, '$.from') LIKE '%ditto.com%'
            OR content LIKE '%unsubscribe%'
          )
        `,
        isComplex: true,
      };

    case 'social':
      return {
        clause: `
          AND (
            json_extract(metadata_json, '$.from') LIKE '%facebook%'
            OR json_extract(metadata_json, '$.from') LIKE '%twitter%'
            OR json_extract(metadata_json, '$.from') LIKE '%linkedin%'
            OR json_extract(metadata_json, '$.from') LIKE '%instagram%'
          )
        `,
        isComplex: true,
      };

    default:
      return { clause: '', isComplex: false };
  }
}

/**
 * Add known entity email addresses to the lookup
 */
export function addKnownEntitySender(email: string, name: string): void {
  KNOWN_ENTITY_SENDERS[email.toLowerCase()] = name;
}

/**
 * Get all known entity senders
 */
export function getKnownEntitySenders(): Record<string, string> {
  return { ...KNOWN_ENTITY_SENDERS };
}
