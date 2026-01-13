import Database from 'better-sqlite3';
import fetch from 'node-fetch'; // Need node-fetch or use native fetch if Node 18+

// Use native fetch if available (Node 18+), else polyfill?
// tsx should handle native fetch.

const DB_PATH = process.env.DB_PATH || 'epstein-archive.db';
const OLLAMA_URL = 'http://localhost:11434/api/generate';
const OLLAMA_MODEL = 'deepseek-r1:1.5b'; // Switched to available model

const db = new Database(DB_PATH);

interface Chapter {
  title: string;
  startTime: number;
}

interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
}

async function generateChapters() {
  console.log('📖 Starting Chapter Generation...');

  // Check Ollama
  try {
    const res = await fetch(OLLAMA_URL.replace('/api/generate', '/api/tags'));
    if (!res.ok) throw new Error('Ollama not reachable');
    console.log('✅ Ollama detected.');
  } catch (e) {
    console.error('❌ Ollama is not running or not accessible at ' + OLLAMA_URL);
    console.error('Run "ollama serve" and "ollama pull llama3" to enable intelligent chapters.');
    process.exit(1);
  }

  const items = db
    .prepare(
      "SELECT id, title, metadata_json FROM media_items WHERE metadata_json LIKE '%transcript%'",
    )
    .all() as any[];

  console.log(`Found ${items.length} items with transcripts.`);

  for (const item of items) {
    let metadata: any = {};
    try {
      metadata = JSON.parse(item.metadata_json);
    } catch (e) {
      continue;
    }

    if (!metadata.transcript || metadata.transcript.length === 0) {
      console.log(`Skipping ${item.title} (Empty transcript)`);
      continue;
    }

    if (metadata.chapters && metadata.chapters.length > 0) {
      console.log(`Skipping ${item.title} (Already has chapters)`);
      // continue; // Uncomment to skip existing
    }

    console.log(`🧠 Generating chapters for: ${item.title}`);

    // Prepare prompt
    // Condense transcript to text with timestamps approx every minute or just plain text?
    // To get start times, I need to provide timestamps in context.
    // Format: "[00:00] Hello..."

    let promptText = '';
    for (const seg of metadata.transcript) {
      promptText += `[${Math.floor(seg.start)}] ${seg.text}\n`;
    }

    // Truncate if too long (rough heuristic)
    if (promptText.length > 15000) {
      console.warn('Transcript too long, truncating for LLM...');
      promptText = promptText.substring(0, 15000) + '...';
    }

    const prompt = `
        Analyze the following transcript and identify 3 to 8 logical chapter breaks.
        Return ONLY a JSON array of objects. Each object must have:
        - "title": A short descriptive title string
        - "startTime": The start time in seconds (integer) as identified from the [timestamp] at the start of lines.

        Transcript:
        ${promptText}

        JSON Output:
        `;

    try {
      const response = await fetch(OLLAMA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: OLLAMA_MODEL,
          prompt: prompt,
          stream: false,
          format: 'json', // Force JSON mode if supported by model
        }),
      });

      const json = (await response.json()) as any;
      const responseText = json.response;

      // Parse JSON from response
      let parsed: any;
      try {
        // Try to find JSON array or object in text
        // Look for ```json ... ``` or [ ... ] or { ... }
        const match =
          responseText.match(/```json\s*([\s\S]*?)```/) ||
          responseText.match(/(\[[\s\S]*\])/) ||
          responseText.match(/(\{[\s\S]*\})/);
        if (match) {
          parsed = JSON.parse(match[1] || match[0]); // match[1] for code block, match[0] for others
        } else {
          parsed = JSON.parse(responseText);
        }
      } catch (e) {
        console.error(
          'Failed to parse LLM JSON. Raw output preview:',
          responseText.substring(0, 200),
        );
        continue;
      }

      let chapters: Chapter[] = [];
      if (Array.isArray(parsed)) {
        chapters = parsed;
      } else if (parsed && Array.isArray(parsed.chapters)) {
        chapters = parsed.chapters;
      } else if (
        parsed &&
        typeof parsed.title === 'string' &&
        (typeof parsed.startTime === 'number' || typeof parsed.startTime === 'string')
      ) {
        // Single chapter object returned
        chapters = [parsed];
      } else {
        console.warn('Parsed JSON is not an array and has no chapters property.', parsed);
      }

      // Validate chapters and fix types
      chapters = chapters
        .map((c) => ({
          title: String(c.title).replace(/['"]/g, '').trim(),
          startTime: typeof c.startTime === 'string' ? parseInt(c.startTime as any) : c.startTime,
        }))
        .filter((c) => !isNaN(c.startTime) && c.title.length > 0);

      if (chapters.length > 0) {
        metadata.chapters = chapters;
        db.prepare('UPDATE media_items SET metadata_json = ? WHERE id = ?').run(
          JSON.stringify(metadata),
          item.id,
        );
        console.log(`✅ Saved ${chapters.length} chapters for ${item.title}`);
      } else {
        console.warn('LLM returned no valid chapters.');
      }
    } catch (error) {
      console.error('Error calling Ollama:', error);
    }
  }
}

generateChapters();
