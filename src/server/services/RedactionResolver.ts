export interface RedactionCandidate {
  original: string;
  guess?: string;
  confidence: 'high' | 'medium' | 'low';
  reason?: string;
  category: 'name' | 'email' | 'location' | 'date' | 'other';
}

export class RedactionResolver {
  // Regex for common redaction patterns like [Name], [Date], [REDACTED], etc.
  private static REDACTION_REGEX = /\[(.*?)\]/g;

  // Known entities mapping for context-aware guessing
  // SAFETY CONSTRAINT: Map to Roles/Types only, NEVER attributes/identities.
  private static KNOWN_ENTITIES: Record<string, string> = {
    lawyer: 'Counsel',
    mechanic: 'Service Provider',
    pilot: 'Flight Staff',
    assistant: 'Staff',
    'prime minister': 'Government Official',
    judge: 'Judicial Officer',
    doctor: 'Medical Professional',
  };

  /**
   * analyzes text for redactions and attempts to resolve them based on context
   */
  public static resolve(
    text: string,
    context: { sender?: string; receiver?: string; subject?: string; date?: string } = {},
  ): { resolvedText: string; candidates: RedactionCandidate[] } {
    const candidates: RedactionCandidate[] = [];

    const resolvedText = text.replace(this.REDACTION_REGEX, (match, content) => {
      const lowerContent = content.toLowerCase().trim();

      // Default candidate
      const candidate: RedactionCandidate = {
        original: match,
        confidence: 'low',
        category: 'other',
      };

      // 1. Check for explicit known roles/aliases
      if (this.KNOWN_ENTITIES[lowerContent]) {
        candidate.guess = this.KNOWN_ENTITIES[lowerContent];
        candidate.confidence = 'medium'; // Medium because it's a static map
        candidate.reason = `Matched known alias: ${lowerContent}`;
        candidate.category = 'name';
      }

      // 2. Contextual Guessing based on "Lawyer"
      else if (lowerContent.includes('lawyer') || lowerContent.includes('counsel')) {
        candidate.guess = 'Counsel';
        candidate.confidence = 'medium';
        candidate.reason = 'Context implies legal counsel';
        candidate.category = 'other'; // Changed from 'name'
      }

      // 3. Sender/Receiver context
      else if (lowerContent === 'sender' && context.sender) {
        candidate.guess = context.sender;
        candidate.confidence = 'high';
        candidate.reason = 'inferred from email metadata (sender)';
        candidate.category = 'name';
      } else if (lowerContent === 'recipient' && context.receiver) {
        candidate.guess = context.receiver;
        candidate.confidence = 'high';
        candidate.reason = 'inferred from email metadata (receiver)';
        candidate.category = 'name';
      }

      candidates.push(candidate);

      // We Return the original match with a tooltip-like annotation if we have a guess
      // Or just return the original if no guess.
      // For now, we'll append the guess in parenthesis if it exists to make it visible in the UI text
      if (candidate.guess) {
        return `${match} <span class="redaction-guess" title="Inferred: ${candidate.guess}">(${candidate.guess}?)</span>`;
      }

      return match;
    });

    return { resolvedText, candidates };
  }
}
