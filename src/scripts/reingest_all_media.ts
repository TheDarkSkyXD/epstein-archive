/**
 * Full Media Re-ingestion Script with AI-Powered Analysis
 *
 * Features:
 * - Scans all images in data/media/images
 * - Uses OpenAI Vision API to generate descriptive titles
 * - Auto-tags images with relevant entities based on folder names and AI analysis
 * - Populates media_people table with entity-image links
 * - Generates thumbnails if missing
 *
 * Usage: npx tsx src/scripts/reingest_all_media.ts
 */

import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';

// OpenAI configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_VISION_MODEL = 'gpt-4o-mini';

// Paths
const MEDIA_ROOT = 'data/media/images';
const DB_PATH = 'epstein-archive.db';

// Entity name mapping for auto-tagging from folder names
const FOLDER_TO_ENTITY: Record<string, string[]> = {
  'Donald Trump': ['Donald Trump'],
  'Jeffrey Epstein': ['Jeffrey Epstein'],
  'Ghislaine Maxwell': ['Ghislaine Maxwell'],
  'Elon Musk': ['Elon Musk'],
  'Les Wexner': ['Les Wexner'],
  Perpetrators: [], // Will be determined by AI
  Survivors: ['Virginia Giuffre'],
  Properties: ['Little St. James', 'Mar-a-Lago', 'Zorro Ranch'],
  Aircraft: ['Lolita Express'],
  Evidence: [],
  MAGA: ['Donald Trump'],
  'Confirmed Fake': [],
  'Unconfirmed Claims': [],
};

// Tag name mapping from folder names
const FOLDER_TO_TAGS: Record<string, string[]> = {
  'Donald Trump': ['Trump'],
  'Jeffrey Epstein': [],
  'Ghislaine Maxwell': ['Maxwell'],
  Properties: ['Property', 'Location'],
  Aircraft: ['Aircraft', 'Flight Log'],
  Evidence: ['Evidence', 'FBI Evidence'],
  Perpetrators: ['Perpetrator'],
  Survivors: ['Survivor'],
  'Confirmed Fake': ['Disputed'],
  'Unconfirmed Claims': ['NeedsReview'],
  'Little St James': ['Little St James', 'Location'],
  'DOJ VOL000001': ['Evidence', 'Court Filing'],
};

interface ImageInfo {
  filepath: string;
  filename: string;
  folder: string;
  album: string;
}

interface EntityMatch {
  id: number;
  full_name: string;
}

interface TagMatch {
  id: number;
  name: string;
}

// Initialize database
const db = new Database(DB_PATH);

// Get total image count
function countImages(): number {
  const extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
  let count = 0;

  function scanDir(dir: string): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory() && entry.name !== 'thumbnails') {
        scanDir(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (extensions.includes(ext)) {
          count++;
        }
      }
    }
  }

  scanDir(MEDIA_ROOT);
  return count;
}

// Collect all images
function collectImages(): ImageInfo[] {
  const images: ImageInfo[] = [];
  const extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];

  function scanDir(dir: string, album: string): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'thumbnails') {
          // Subfolder becomes the album name
          scanDir(fullPath, entry.name);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (extensions.includes(ext)) {
          images.push({
            filepath: fullPath,
            filename: entry.name,
            folder: path.basename(dir),
            album: album,
          });
        }
      }
    }
  }

  // Scan top-level folders
  const topLevel = fs.readdirSync(MEDIA_ROOT, { withFileTypes: true });
  for (const entry of topLevel) {
    if (entry.isDirectory() && entry.name !== 'thumbnails') {
      scanDir(path.join(MEDIA_ROOT, entry.name), entry.name);
    }
  }

  return images;
}

// Generate AI title using OpenAI Vision API
async function generateAITitle(imagePath: string, fallbackTitle: string): Promise<string> {
  if (!OPENAI_API_KEY) {
    console.log('No OpenAI API key, using fallback title');
    return fallbackTitle;
  }

  try {
    // Read image and convert to base64
    const imageBuffer = fs.readFileSync(imagePath);
    const base64Image = imageBuffer.toString('base64');
    const mimeType = imagePath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_VISION_MODEL,
        messages: [
          {
            role: 'system',
            content: `You are an archivist creating concise, factual titles for images related to the Jeffrey Epstein case. 
Generate a short, descriptive title (max 60 characters) that describes what is shown in the image.
Focus on: people visible, location, document type, or evidence shown.
Do NOT make assumptions about identity unless clearly identifiable.
If it's a document, describe the document type.
If people are visible but unidentifiable, say "Unidentified individuals".
Return ONLY the title, no quotes or explanation.`,
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Generate a concise, factual title for this image:',
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`,
                  detail: 'low',
                },
              },
            ],
          },
        ],
        max_tokens: 100,
      }),
    });

    if (!response.ok) {
      console.error(`OpenAI API error: ${response.status}`);
      return fallbackTitle;
    }

    const data = (await response.json()) as any;
    const title = data.choices?.[0]?.message?.content?.trim();
    return title || fallbackTitle;
  } catch (error) {
    console.error('AI title generation failed:', error);
    return fallbackTitle;
  }
}

// Generate fallback title from filename
function generateFallbackTitle(filename: string, folder: string): string {
  // Remove extension and clean up
  let title = path.basename(filename, path.extname(filename));

  // Replace underscores and hyphens with spaces
  title = title.replace(/[_-]+/g, ' ');

  // Remove common prefixes
  title = title.replace(/^(img|image|photo|pic|dsc|dscn|dscf)/i, '');

  // Clean up numbers-only titles
  if (/^\d+$/.test(title.trim())) {
    title = `${folder} - Photo ${title.trim()}`;
  }

  // Capitalize words
  title = title
    .split(' ')
    .filter((w) => w.length > 0)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');

  return title || `${folder} Image`;
}

// Find or create album
function findOrCreateAlbum(name: string): number {
  const existing = db.prepare('SELECT id FROM media_albums WHERE name = ?').get(name) as
    | { id: number }
    | undefined;
  if (existing) return existing.id;

  const result = db
    .prepare(
      `
    INSERT INTO media_albums (name, description, created_at)
    VALUES (?, ?, datetime('now'))
  `,
    )
    .run(name, `Images from ${name} folder`);

  return result.lastInsertRowid as number;
}

// Find entity by name
function findEntity(name: string): EntityMatch | null {
  const result = db
    .prepare(
      `
    SELECT id, full_name FROM entities 
    WHERE full_name = ? OR full_name LIKE ?
    LIMIT 1
  `,
    )
    .get(name, `%${name}%`) as EntityMatch | undefined;

  return result || null;
}

// Find tag by name
function findTag(name: string): TagMatch | null {
  const result = db
    .prepare(
      `
    SELECT id, name FROM media_tags 
    WHERE name = ?
    LIMIT 1
  `,
    )
    .get(name) as TagMatch | undefined;

  return result || null;
}

// Generate thumbnail
async function generateThumbnail(imagePath: string, thumbnailPath: string): Promise<boolean> {
  try {
    const thumbnailDir = path.dirname(thumbnailPath);
    if (!fs.existsSync(thumbnailDir)) {
      fs.mkdirSync(thumbnailDir, { recursive: true });
    }

    await sharp(imagePath)
      .resize(300, 300, { fit: 'cover' })
      .jpeg({ quality: 80 })
      .toFile(thumbnailPath);

    return true;
  } catch (error) {
    console.error(`Thumbnail generation failed for ${imagePath}:`, error);
    return false;
  }
}

// Get image dimensions
async function getImageDimensions(imagePath: string): Promise<{ width: number; height: number }> {
  try {
    const metadata = await sharp(imagePath).metadata();
    return {
      width: metadata.width || 0,
      height: metadata.height || 0,
    };
  } catch {
    return { width: 0, height: 0 };
  }
}

// Main ingestion function
async function ingestAllMedia(): Promise<void> {
  console.log('='.repeat(60));
  console.log('FULL MEDIA RE-INGESTION WITH AI ANALYSIS');
  console.log('='.repeat(60));

  // Check OpenAI key
  if (!OPENAI_API_KEY) {
    console.warn('⚠️  OPENAI_API_KEY not set - titles will be generated from filenames');
  } else {
    console.log('✅ OpenAI API key configured');
  }

  // Count and collect images
  const totalCount = countImages();
  console.log(`\n📊 Found ${totalCount} images to process`);

  const images = collectImages();
  console.log(
    `📁 Collected ${images.length} images from ${new Set(images.map((i) => i.album)).size} albums\n`,
  );

  // Clear existing media_images and related tables
  console.log('🗑️  Clearing existing media data...');
  db.exec('DELETE FROM media_image_tags');
  db.exec('DELETE FROM media_people');
  db.exec('DELETE FROM media_images');
  console.log('✅ Cleared existing data\n');

  // Prepare statements
  const insertImage = db.prepare(`
    INSERT INTO media_images (
      filename, original_filename, path, thumbnail_path, 
      title, description, album_id, width, height, 
      file_size, format, date_added
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  const insertImageTag = db.prepare(`
    INSERT OR IGNORE INTO media_image_tags (image_id, tag_id) VALUES (?, ?)
  `);

  const insertMediaPerson = db.prepare(`
    INSERT OR IGNORE INTO media_people (media_id, entity_id) VALUES (?, ?)
  `);

  let processed = 0;
  let aiTitles = 0;
  let errors = 0;

  for (const image of images) {
    try {
      processed++;
      const progress = `[${processed}/${images.length}]`;

      // Get album ID
      const albumId = findOrCreateAlbum(image.album);

      // Generate title
      const fallbackTitle = generateFallbackTitle(image.filename, image.folder);
      let title: string;

      if (OPENAI_API_KEY && processed <= 50) {
        // Limit AI calls for testing
        process.stdout.write(`${progress} 🤖 Analyzing ${image.filename}...`);
        title = await generateAITitle(image.filepath, fallbackTitle);
        if (title !== fallbackTitle) aiTitles++;
        console.log(` → "${title}"`);
      } else {
        title = fallbackTitle;
        if (processed % 50 === 0) {
          console.log(`${progress} Processing ${image.filename} → "${title}"`);
        }
      }

      // Get dimensions and size
      const { width, height } = await getImageDimensions(image.filepath);
      const stats = fs.statSync(image.filepath);
      const format = path.extname(image.filename).toLowerCase().replace('.', '');

      // Generate thumbnail path
      const thumbnailDir = path.join(path.dirname(image.filepath), 'thumbnails');
      const thumbnailPath = path.join(thumbnailDir, `thumb_${image.filename}`);

      // Generate thumbnail if needed
      if (!fs.existsSync(thumbnailPath)) {
        await generateThumbnail(image.filepath, thumbnailPath);
      }

      // Insert image
      const result = insertImage.run(
        image.filename,
        image.filename,
        image.filepath,
        thumbnailPath,
        title,
        `From ${image.album} collection`,
        albumId,
        width,
        height,
        stats.size,
        format,
      );

      const imageId = result.lastInsertRowid as number;

      // Auto-tag based on folder
      const folderTags = FOLDER_TO_TAGS[image.folder] || FOLDER_TO_TAGS[image.album] || [];
      for (const tagName of folderTags) {
        const tag = findTag(tagName);
        if (tag) {
          insertImageTag.run(imageId, tag.id);
        }
      }

      // Link to entities based on folder
      const folderEntities = FOLDER_TO_ENTITY[image.folder] || FOLDER_TO_ENTITY[image.album] || [];
      for (const entityName of folderEntities) {
        const entity = findEntity(entityName);
        if (entity) {
          insertMediaPerson.run(imageId, entity.id);
        }
      }
    } catch (error) {
      errors++;
      console.error(`❌ Error processing ${image.filename}:`, error);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('INGESTION COMPLETE');
  console.log('='.repeat(60));
  console.log(`✅ Processed: ${processed} images`);
  console.log(`🤖 AI titles: ${aiTitles}`);
  console.log(`❌ Errors: ${errors}`);

  // Stats
  const imgCount = (db.prepare('SELECT COUNT(*) as cnt FROM media_images').get() as any).cnt;
  const tagLinks = (db.prepare('SELECT COUNT(*) as cnt FROM media_image_tags').get() as any).cnt;
  const entityLinks = (db.prepare('SELECT COUNT(*) as cnt FROM media_people').get() as any).cnt;

  console.log(`\n📊 Database Stats:`);
  console.log(`   Images: ${imgCount}`);
  console.log(`   Tag links: ${tagLinks}`);
  console.log(`   Entity links: ${entityLinks}`);
}

// Run
ingestAllMedia()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
