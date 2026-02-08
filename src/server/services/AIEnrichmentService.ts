/**
 * AI Enrichment Service (v3.0)
 *
 * Provides an "Intelligence Stage" to replace deterministic regex logic
 * with context-aware LLM agents.
 *
 * Supports two inference backends:
 *   - Ollama (single-machine, default)
 *   - Exo (distributed cluster via macOS 26.2 Thunderbolt 5 RDMA)
 */

declare const process: any;

export interface EnrichmentOutput {
  refinedText: string;
  inferences: {
    type: string;
    description: string;
    confidence: number;
  }[];
  isSensitive: boolean;
}

export class AIEnrichmentService {
  // Ollama (single-machine) configuration
  private static OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://localhost:11434';
  private static OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2:1b';

  // Exo (distributed cluster) configuration
  // Exo auto-discovers devices and exposes a unified API endpoint
  private static EXO_HOST = process.env.EXO_HOST || 'http://localhost:52415';
  private static EXO_MODEL = process.env.EXO_MODEL || 'mlx-community/Llama-3.2-3B-Instruct-8bit';

  /**
   * Get the appropriate API endpoint based on provider
   */
  private static getApiEndpoint(): string {
    const provider = process.env.AI_PROVIDER || 'local_ollama';
    if (provider === 'exo_cluster') {
      return `${this.EXO_HOST}/v1/chat/completions`;
    }
    return `${this.OLLAMA_HOST}/api/generate`;
  }

  /**
   * Get the model name for the current provider
   */
  private static getModel(
    task: 'repair' | 'classify' | 'resolve' | 'summarize' = 'repair',
  ): string {
    const provider = process.env.AI_PROVIDER || 'local_ollama';
    if (provider === 'exo_cluster') {
      // Exo uses OpenAI-compatible model names - use the configured EXO_MODEL
      return this.EXO_MODEL;
    }
    // Ollama model selection by task
    switch (task) {
      case 'classify':
        return process.env.OLLAMA_CLASSIFY_MODEL || 'llama3.2:3b';
      case 'resolve':
      case 'summarize':
        return process.env.OLLAMA_RESOLVE_MODEL || 'mistral:7b';
      default:
        return this.OLLAMA_MODEL;
    }
  }

  /**
   * Unified LLM call that works with both Ollama and Exo
   */
  private static async callLLM(
    prompt: string,
    options: { maxTokens?: number; temperature?: number } = {},
  ): Promise<string> {
    const provider = process.env.AI_PROVIDER || 'local_ollama';
    const { maxTokens = 100, temperature = 0.1 } = options;

    try {
      if (provider === 'exo_cluster') {
        // OpenAI-compatible API (Exo)
        const response = await fetch(`${this.EXO_HOST}/v1/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: this.getModel(),
            messages: [{ role: 'user', content: prompt }],
            max_tokens: maxTokens,
            temperature,
          }),
        });
        if (!response.ok) return '';
        const data = (await response.json()) as any;
        return data.choices?.[0]?.message?.content?.trim() || '';
      } else {
        // Ollama native API
        const response = await fetch(`${this.OLLAMA_HOST}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: this.getModel(),
            prompt,
            stream: false,
            options: { temperature, num_predict: maxTokens },
          }),
        });
        if (!response.ok) return '';
        const data = (await response.json()) as any;
        return data.response?.trim() || '';
      }
    } catch (e) {
      return '';
    }
  }

  /**
   * REPAIR: Contextual MIME Wildcard Reconstruction
   * Replaces deterministic repair (regex/dictionary) with semantic inference.
   */
  /**
   * REPAIR: Contextual MIME Wildcard Reconstruction
   */
  static async repairMimeWildcards(text: string, context: string): Promise<string> {
    const isAiEnabled = process.env.ENABLE_AI_ENRICHMENT === 'true';
    if (!isAiEnabled || !text.includes('=')) return text;

    const lines = text.split('\n');
    const repairedLines: string[] = new Array(lines.length);
    const batchTasks: { lines: string[]; indices: number[] }[] = [];
    let currentBatch: string[] = [];
    let currentIndices: number[] = [];

    // Identify corrupted lines and group into batches
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes('=') && line.length > 3 && line.length < 2000) {
        currentBatch.push(line);
        currentIndices.push(i);
      } else {
        repairedLines[i] = line;
      }

      if (currentBatch.length >= 10) {
        batchTasks.push({ lines: currentBatch, indices: currentIndices });
        currentBatch = [];
        currentIndices = [];
      }
    }
    if (currentBatch.length > 0) {
      batchTasks.push({ lines: currentBatch, indices: currentIndices });
    }

    // Process batches in parallel chunks of 8 (better cluster utilization)
    for (let i = 0; i < batchTasks.length; i += 8) {
      const chunk = batchTasks.slice(i, i + 8);
      const results = await Promise.all(
        chunk.map((task) => this.callRepairBatch(task.lines, context)),
      );

      // Map results back to original indices
      chunk.forEach((task, chunkIdx) => {
        task.indices.forEach((originalIndex, lineIdx) => {
          repairedLines[originalIndex] = results[chunkIdx][lineIdx];
        });
      });
    }

    return repairedLines.join('\n');
  }

  private static async callRepairBatch(lines: string[], context: string): Promise<string[]> {
    try {
      const target = lines.join('\n[LINE_BREAK]\n');
      const prompt = `Task: Repair the corrupted lines in the [TARGET] block where '=' is a missing character.
Context: "${context}"
Target:
${target}

Output the repaired lines, preserving the [LINE_BREAK] markers between them. Output ONLY the repaired text.`;

      const result = await this.callLLM(prompt, {
        maxTokens: Math.floor(target.length * 1.5),
        temperature: 0.1,
      });

      if (!result) return lines;

      const results = result.split('[LINE_BREAK]').map((l: string) => l.trim());

      // If the LLM failed to return the same number of lines, fallback to individual repair
      if (results.length !== lines.length) {
        const fallback = [];
        for (const line of lines) {
          fallback.push(await this.callRepairSingle(line, context));
        }
        return fallback;
      }

      return results;
    } catch (error) {
      return lines;
    }
  }

  private static async callRepairSingle(text: string, context: string): Promise<string> {
    try {
      const prompt = `Task: Repair the corrupted text in the [TARGET] segment where '=' is a missing character.
Context: "${context}"
Target: "${text}"
Output ONLY the repaired text. No quotes.`;

      const result = await this.callLLM(prompt, { maxTokens: 100, temperature: 0.1 });
      if (!result) return text;

      // Basic sanity check to prevent LLM bloat
      if (result.length < text.length * 1.5) {
        return result;
      }
      return text;
    } catch (error) {
      return text;
    }
  }

  /**
   * CLASSIFY: Semantic Redaction Inference
   * Uses narrative context to categorize redactions.
   * Model: llama3.2:3b (better reasoning for classification)
   */
  /**
   * CLASSIFY: Semantic Redaction Inference
   */
  static async classifyRedaction(
    preContext: string,
    postContext: string,
  ): Promise<EnrichmentOutput['inferences']> {
    const isAiEnabled = process.env.ENABLE_AI_ENRICHMENT === 'true';
    if (!isAiEnabled) return [];

    try {
      const prompt = `### INSTRUCTION
Infer the type of the [REDACTED] entity based on the surrounding context.

[BEFORE]: "${preContext.slice(-200)}"
[REDACTED]
[AFTER]: "${postContext.slice(0, 200)}"

### OUTPUT RULES
- Output ONLY a one-word category followed by a colon and confidence score
- Categories: PERSON, ORGANIZATION, LOCATION, DATE, FINANCIAL, LEGAL, OTHER
- Confidence must be between 0.0 and 1.0
- Example output: PERSON: 0.92

### OUTPUT`;

      const result = await this.callLLM(prompt, { maxTokens: 20, temperature: 0.1 });
      if (!result) return [];

      // Parse the structured output: "PERSON: 0.92"
      const match = result.match(
        /^(PERSON|ORGANIZATION|LOCATION|DATE|FINANCIAL|LEGAL|OTHER):\s*([\d.]+)/i,
      );
      if (match) {
        const category = match[1].toUpperCase();
        const confidence = Math.min(1.0, Math.max(0.0, parseFloat(match[2])));
        return [
          {
            type: category,
            description: `Inferred ${category.toLowerCase()} from surrounding context`,
            confidence,
          },
        ];
      }

      return [];
    } catch (e) {
      return [];
    }
  }

  /**
   * RESOLVE: Semantic Entity Disambiguation
   */
  static async resolveIdentity(
    mention: string,
    documentContext: string,
    knownEntities: { id: number; name: string }[] = [],
  ): Promise<{ entityId: number | null; confidence: number; canonicalName: string | null }> {
    const isAiEnabled = process.env.ENABLE_AI_ENRICHMENT === 'true';
    if (!isAiEnabled || knownEntities.length === 0) {
      return { entityId: null, confidence: 0, canonicalName: null };
    }

    try {
      const entityList = knownEntities
        .slice(0, 50)
        .map((e) => e.name)
        .join(', ');
      const prompt = `### INSTRUCTION
You are an entity disambiguation expert. Given a mention and document context, identify which known entity it refers to.

### MENTION
"${mention}"

### DOCUMENT CONTEXT
"${documentContext.slice(0, 500)}"

### KNOWN ENTITIES
${entityList}

### OUTPUT RULES
- If the mention matches a known entity, output: MATCH: [exact entity name]: [confidence 0.0-1.0]
- If no match is found, output: NO_MATCH
- Example: MATCH: Jeffrey Epstein: 0.95

### OUTPUT`;

      const result = await this.callLLM(prompt, { maxTokens: 50, temperature: 0.1 });
      if (!result) return { entityId: null, confidence: 0, canonicalName: null };

      // Parse: "MATCH: Jeffrey Epstein: 0.95"
      const match = result.match(/^MATCH:\s*(.+?):\s*([\d.]+)/i);
      if (match) {
        const matchedName = match[1].trim();
        const confidence = Math.min(1.0, Math.max(0.0, parseFloat(match[2])));
        const entity = knownEntities.find(
          (e) => e.name.toLowerCase() === matchedName.toLowerCase(),
        );
        if (entity) {
          return { entityId: entity.id, confidence, canonicalName: entity.name };
        }
      }

      return { entityId: null, confidence: 0, canonicalName: null };
    } catch (e) {
      return { entityId: null, confidence: 0, canonicalName: null };
    }
  }

  /**
   * EXTRACT: Relationship Mining
   */
  static async extractRelationships(
    paragraph: string,
    entityNames: string[],
  ): Promise<{ source: string; target: string; relationship: string; confidence: number }[]> {
    const isAiEnabled = process.env.ENABLE_AI_ENRICHMENT === 'true';
    if (!isAiEnabled || entityNames.length < 2) return [];

    try {
      const prompt = `### INSTRUCTION
Extract relationships between the named entities in this paragraph.

### PARAGRAPH
"${paragraph.slice(0, 1000)}"

### ENTITIES TO FIND
${entityNames.join(', ')}

### OUTPUT RULES
- Output one relationship per line in format: [ENTITY_A] -[RELATIONSHIP]-> [ENTITY_B]: [confidence]
- Relationship types: ASSOCIATE, EMPLOYER, EMPLOYEE, ATTORNEY, CLIENT, FRIEND, RELATIVE, WITNESS, VICTIM, OTHER
- Only output relationships you are confident about (>0.6)
- If no relationships found, output: NONE

### OUTPUT`;

      const result = await this.callLLM(prompt, { maxTokens: 200, temperature: 0.1 });
      if (!result || result === 'NONE') return [];

      // Parse: "[Entity A] -[RELATIONSHIP]-> [Entity B]: 0.85"
      const relationships: {
        source: string;
        target: string;
        relationship: string;
        confidence: number;
      }[] = [];
      const lines = result.split('\n');

      for (const line of lines) {
        const match = line.match(/^\[?(.+?)\]?\s*-\[?(\w+)\]?->\s*\[?(.+?)\]?:\s*([\d.]+)/);
        if (match) {
          relationships.push({
            source: match[1].trim(),
            target: match[3].trim(),
            relationship: match[2].toUpperCase(),
            confidence: Math.min(1.0, Math.max(0.0, parseFloat(match[4]))),
          });
        }
      }

      return relationships;
    } catch (e) {
      return [];
    }
  }

  /**
   * SUMMARIZE: Forensic Document Summary
   */
  static async summarizeDocument(
    content: string,
    metadata: { fileName?: string; subject?: string },
  ): Promise<string | null> {
    const isAiEnabled = process.env.ENABLE_AI_ENRICHMENT === 'true';
    if (!isAiEnabled || !content || content.length < 100) return null;

    try {
      const prompt = `### INSTRUCTION
Summarize this document in 2-3 sentences, focusing on forensic significance (names, dates, financial details, locations, or legal implications).

### DOCUMENT
Title: ${metadata.subject || metadata.fileName || 'Unknown'}
Content: "${content.slice(0, 2000)}"

### OUTPUT RULES
- Be concise (2-3 sentences max)
- Focus on WHO, WHAT, WHEN, WHERE
- Highlight any red flags or unusual details

### SUMMARY`;

      const result = await this.callLLM(prompt, { maxTokens: 150, temperature: 0.3 });

      // Basic sanity check
      if (result && result.length > 20 && result.length < 1000) {
        return result;
      }

      return null;
    } catch (e) {
      return null;
    }
  }
}
