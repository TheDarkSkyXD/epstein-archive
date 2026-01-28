import Database from 'better-sqlite3';
import { JSDOM } from 'jsdom';
import path from 'path';

// DB setup
const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'epstein-archive.db');
const db = new Database(DB_PATH);

// Constants
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function vacuumArticleImages() {
  console.log(`Starting vacuum process on DB: ${DB_PATH}`);

  // 1. Select articles with missing images
  const articles = db
    .prepare(
      "SELECT id, title, link FROM articles WHERE (image_url IS NULL OR image_url = '') AND link IS NOT NULL",
    )
    .all() as { id: number; title: string; link: string }[];

  console.log(`Found ${articles.length} articles with missing hero images.`);

  let updatedCount = 0;
  let errorCount = 0;
  let skippedCount = 0;

  for (const article of articles) {
    if (!article.link.startsWith('http')) {
      console.log(`Skipping invalid link for "${article.title}": ${article.link}`);
      skippedCount++;
      continue;
    }

    console.log(`Vacuuming: ${article.title} (${article.link})`);

    try {
      // 2. Fetch the URL
      const response = await fetch(article.link, {
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(10000), // 10s timeout
      });

      if (!response.ok) {
        console.warn(`Failed to fetch ${article.link}: ${response.status}`);
        errorCount++;
        continue;
      }

      const html = await response.text();

      // 3. Parse OG image
      const dom = new JSDOM(html);
      const doc = dom.window.document;

      let imageUrl =
        doc.querySelector('meta[property="og:image"]')?.getAttribute('content') ||
        doc.querySelector('meta[name="twitter:image"]')?.getAttribute('content') ||
        doc.querySelector('link[rel="image_src"]')?.getAttribute('href');

      if (imageUrl) {
        // Handle relative URLs
        if (imageUrl.startsWith('/')) {
          const urlObj = new URL(article.link);
          imageUrl = `${urlObj.protocol}//${urlObj.host}${imageUrl}`;
        }

        console.log(`  -> Found image: ${imageUrl}`);

        // 4. Update DB
        db.prepare('UPDATE articles SET image_url = ? WHERE id = ?').run(imageUrl, article.id);
        updatedCount++;
      } else {
        console.log('  -> No image found.');
        skippedCount++;
      }

      // Be nice to servers
      await new Promise((r) => setTimeout(r, 1000));
    } catch (error: any) {
      console.error(`  -> Error: ${error.message}`);
      errorCount++;
    }
  }

  console.log('------------------------------------------------');
  console.log(`Finished vacuuming.`);
  console.log(`Updated: ${updatedCount}`);
  console.log(`Errors: ${errorCount}`);
  console.log(`Skipped/No image: ${skippedCount}`);
}

vacuumArticleImages().catch(console.error);
