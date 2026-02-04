export interface RedactionInference {
  inferredClass:
    | 'person'
    | 'lawyer'
    | 'org'
    | 'location'
    | 'contact'
    | 'date'
    | 'id_number'
    | 'misc'
    | null;
  inferredRole: string | null;
  confidence: number;
  evidence: string[];
}

export class RedactionClassifier {
  /**
   * Analyze context around a redaction to infer its type.
   * @param preContext Text immediately preceding the redaction (e.g. 50-100 chars)
   * @param postContext Text immediately following the redaction
   */
  static classify(preContext: string, postContext: string): RedactionInference {
    const evidence: string[] = [];
    let inferredClass: RedactionInference['inferredClass'] = null;
    let inferredRole: string | null = null;
    let confidence = 0.0;

    const pre = preContext.trimEnd();
    const post = postContext.trimStart();

    // --- 1. PERSON / LAWYER Indicators (High Confidence) ---

    // Honorifics
    if (/(Mr\.|Ms\.|Mrs\.|Dr\.|Prof\.|Hon\.|Judge)\s*$/i.test(pre)) {
      inferredClass = 'person';
      confidence = 0.8;
      evidence.push('Honorific');

      if (/(Hon\.|Judge)\s*$/i.test(pre)) {
        inferredRole = 'judge';
        confidence = 0.9;
        evidence.push('Judicial Honorific');
      }
    }

    // Lawyer suffixes (in post context)
    // e.g. " [REDACTED], Esq." or " [REDACTED] (Counsel)"
    if (/^(,\s*Esq\.?|,\s*Counsel|,\s*Attorney)/i.test(post)) {
      inferredClass = 'lawyer';
      inferredRole = 'counsel';
      confidence = 0.9;
      evidence.push('Lawyer Suffix');
    }

    // Role markers in pre-context
    if (/(attorney|counsel|lawyer|solicitor)\s+(for|representing)\s+$/i.test(pre)) {
      // "attorney for [REDACTED]" -> Person or Org
      inferredClass = 'person'; // default, could be org
      inferredRole = 'client';
      confidence = 0.6;
      evidence.push('Client of Lawyer');
    }

    // --- 2. ORG Indicators ---

    // "on behalf of [REDACTED]"
    if (/on behalf of\s+$/i.test(pre)) {
      inferredClass = 'org'; // likely, or person
      confidence = 0.5;
      evidence.push('on behalf of');
    }

    // Post context: Inc, LLC
    if (/^(,\s*Inc\.?|,\s*LLC|,\s*Ltd\.?|,\s*PC)/i.test(post)) {
      inferredClass = 'org';
      confidence = 0.9;
      evidence.push('Corporate Suffix');
    }

    // --- 3. CONTACT Indicators ---

    // Email
    if (/@$/i.test(pre) || /^@/i.test(post)) {
      inferredClass = 'contact';
      confidence = 0.9;
      evidence.push('Email Pattern boundary');
    }
    if (/(email|e-mail):\s*$/i.test(pre)) {
      inferredClass = 'contact';
      confidence = 0.8;
      evidence.push('Email Label');
    }

    // Phone
    if (/(phone|tel|fax|mobile|cell):\s*$/i.test(pre)) {
      inferredClass = 'contact';
      confidence = 0.8;
      evidence.push('Phone Label');
    }

    // --- 4. DATE Indicators ---
    if (/(date|dated|on)\s*:?\s*$/i.test(pre)) {
      // Weak check, "on" is common.
      if (/(date|dated):\s*$/i.test(pre)) {
        inferredClass = 'date';
        confidence = 0.8;
        evidence.push('Date Label');
      }
    }

    // --- 5. REFINEMENT & FALLBACK ---

    // If we have a generic person confidence but strong lawyer signals elsewhere?
    // (This is simple window analysis, more complex would need full doc)

    return {
      inferredClass: inferredClass || 'misc',
      inferredRole,
      confidence,
      evidence,
    };
  }

  /**
   * Analyze email headers for structured inference.
   * "From: [REDACTED]"
   */
  static classifyHeader(field: 'from' | 'to' | 'cc' | 'subject'): RedactionInference {
    if (field === 'from') {
      return {
        inferredClass: 'person', // Most likely
        inferredRole: 'sender',
        confidence: 0.85,
        evidence: ['Email Header: From'],
      };
    }
    if (field === 'to' || field === 'cc') {
      return {
        inferredClass: 'person',
        inferredRole: 'recipient',
        confidence: 0.7, // Could be org
        evidence: [`Email Header: ${field}`],
      };
    }
    if (field === 'subject') {
      return {
        inferredClass: 'misc',
        inferredRole: 'topic',
        confidence: 0.6,
        evidence: ['Email Header: Subject'],
      };
    }
    return { inferredClass: null, inferredRole: null, confidence: 0, evidence: [] };
  }

  /**
   * Maps a raw confidence score (0-1) to a safety tier.
   */
  static getConfidenceTier(score: number): 'low' | 'medium' | 'high' {
    if (score >= 0.8) return 'high';
    if (score >= 0.5) return 'medium';
    return 'low';
  }
}
