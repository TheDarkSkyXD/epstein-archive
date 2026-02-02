/**
 * Evidence Extractor Utility
 * Extracts and scores meaningful context windows around entity mentions.
 */

export interface EvidenceSnippet {
    context: string;
    score: number;
    wordCount: number;
    hasHighRiskTerms: boolean;
}

const HIGH_RISK_TERMS = [
    "payment", "transfer", "flight", "pilot", "island", "massage", "minor",
    "agreement", "confidential", "financial", "wire", "trust", "account"
];

/**
 * Extracts a context window around a specific character range in text.
 */
export function extractEvidence(
    text: string,
    startChar: number,
    endChar: number,
    windowSize: number = 300
): EvidenceSnippet {
    const start = Math.max(0, startChar - windowSize / 2);
    const end = Math.min(text.length, endChar + windowSize / 2);

    let context = text.substring(start, end);

    // Clean up context (normalize whitespace)
    context = context.replace(/\s+/g, ' ').trim();

    const wordCount = context.split(/\s+/).length;

    // Basic scoring: higher score for more context and presence of high-risk terms
    let score = Math.min(1.0, wordCount / 50); // Max score for 50 words

    const lowerContext = context.toLowerCase();
    const hasHighRiskTerms = HIGH_RISK_TERMS.some(term => lowerContext.includes(term));

    if (hasHighRiskTerms) {
        score += 0.2;
    }

    return {
        context,
        score: Math.min(1.0, score),
        wordCount,
        hasHighRiskTerms
    };
}

/**
 * Scores a mention based on its categorical context.
 */
export function scoreCategoryMatch(context: string, category: string): number {
    const lowerContext = context.toLowerCase();
    const lowerCategory = category.toLowerCase();

    if (lowerContext.includes(lowerCategory)) return 1.0;

    // Semantic matches (simplified)
    const semanticGroups: Record<string, string[]> = {
        'financial': ['bank', 'wire', 'transfer', 'dollar', '$', 'account', 'invoice'],
        'travel': ['flight', 'pilot', 'plane', 'airport', 'arrival', 'departure', 'jet'],
        'victim': ['massage', 'minor', 'girl', 'young', 'woman'],
        'legal': ['lawsuit', 'court', 'deposition', 'affidavit', 'witness']
    };

    const matches = semanticGroups[lowerCategory]?.filter(term => lowerContext.includes(term)) || [];
    return matches.length > 0 ? 0.8 : 0.5;
}
