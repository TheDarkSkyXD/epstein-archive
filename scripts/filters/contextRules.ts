
export interface ContextRule {
  ambiguousNames: string[];
  candidates: {
    name: string; // The canonical name to map to (e.g. "William Kyle Riley")
    type: 'Person' | 'Organization' | 'Location';
    keywords: string[]; // Context keywords (e.g. "pilot", "plane")
    negativeKeywords?: string[]; // Keywords that rule OUT this candidate
    minScore?: number; // Minimum match score required
  }[];
  defaultCandidate?: string; // Fallback if no specific context found
}

export const CONTEXT_RULES: ContextRule[] = [
  {
    // The "Riley" Rule: Disambiguating the Pilot from the Private Investigator
    ambiguousNames: [
      'bill riley',
      'will riley',
      'william riley',
      'william k riley',
      'w riley',
      'mr riley',
    ],
    candidates: [
      {
        name: 'William Kyle Riley',
        type: 'Person',
        keywords: [
          'pilot',
          'aviation',
          'plane',
          'flight',
          'cockpit',
          'airport',
          'flying',
          'captain',
          'sascha',
          'barros',
          'kiraly', // Original surname of his adopted son
          'adopted',
          'son',
          'chief pilot',
          'larry', // Larry Viso, often mentioned with pilots
          'david', // David Rodgers, often mentioned with pilots
          'n908je',
          'n212je',
          'gulfstream',
          'boeing',
        ],
      },
      {
        name: 'William H. Riley',
        type: 'Person',
        keywords: [
          'investigator',
          'private investigator',
          'pi',
          'detective',
          'security',
          'counsel',
          'attorney',
          'lawyer',
          'sheriff',
          'police',
          'interview',
          'subpoena',
          'legal',
          'advice',
          'meeting',
          'hotel', // Met the butler in a hotel
          'notes', // Took notes
        ],
      },
    ],
    // If we see "William Riley" with NO context, it's safer to leave as is or flag,
    // but historically the Pilot is more frequent in flight logs.
    // However, for safety, let's NOT set a default and let it fall back to the name as-is
    // if context is completely missing, OR pick the one with more generic mentions if needed.
    // For now, no default.
  },
];

export function resolveAmbiguity(
  name: string,
  context: string
): { resolvedName: string; entityType: string; confidence: number } | null {
  const lowerName = name.toLowerCase().trim();
  const lowerContext = context.toLowerCase();

  for (const rule of CONTEXT_RULES) {
    if (rule.ambiguousNames.includes(lowerName)) {
      // Check candidates
      let bestCandidate = null;
      let maxScore = 0;

      for (const candidate of rule.candidates) {
        let score = 0;
        
        // Positive keywords
        for (const kw of candidate.keywords) {
          if (lowerContext.includes(kw.toLowerCase())) {
            score++;
          }
        }

        // Negative keywords
        if (candidate.negativeKeywords) {
          for (const kw of candidate.negativeKeywords) {
            if (lowerContext.includes(kw.toLowerCase())) {
              score = -100; // Nuclear option
            }
          }
        }

        if (score > maxScore) {
          maxScore = score;
          bestCandidate = candidate;
        }
      }

      if (bestCandidate && maxScore > 0) {
         return {
             resolvedName: bestCandidate.name,
             entityType: bestCandidate.type,
             confidence: Math.min(0.8 + (maxScore * 0.05), 1.0) // Base 0.8, boosts up
         };
      }
      
      if (rule.defaultCandidate) {
          const cand = rule.candidates.find(c => c.name === rule.defaultCandidate);
          if (cand) {
               return {
                   resolvedName: cand.name,
                   entityType: cand.type,
                   confidence: 0.5 // Low confidence default
               };
          }
      }
    }
  }

  return null;
}
