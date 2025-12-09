import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import * as cheerio from 'cheerio';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_PATH = path.join(__dirname, '../epstein-archive.db');
const db = new Database(DB_PATH);

console.log('🔍 Starting Articles Metadata Import...\n');

interface ArticleMetadata {
  title?: string;
  description?: string;
  heroImage?: string;
  author?: string;
}

async function fetchArticleMetadata(url: string): Promise<ArticleMetadata> {
  try {
    console.log(`  Fetching: ${url}`);
    
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    
    // Try Open Graph tags first
    const ogTitle = $('meta[property="og:title"]').attr('content');
    const ogDescription = $('meta[property="og:description"]').attr('content');
    const ogImage = $('meta[property="og:image"]').attr('content');
    
    // Try Twitter Card tags as fallback
    const twitterTitle = $('meta[name="twitter:title"]').attr('content');
    const twitterDescription = $('meta[name="twitter:description"]').attr('content');
    const twitterImage = $('meta[name="twitter:image"]').attr('content');
    
    // Try standard meta tags
    const metaDescription = $('meta[name="description"]').attr('content');
    const metaAuthor = $('meta[name="author"]').attr('content');
    
    // Try article tags
    const articleAuthor = $('meta[name="article:author"]').attr('content') || 
                         $('meta[property="article:author"]').attr('content');
    
    const metadata: ArticleMetadata = {
      title: ogTitle || twitterTitle || $('title').text(),
      description: ogDescription || twitterDescription || metaDescription,
      heroImage: ogImage || twitterImage,
      author: articleAuthor || metaAuthor
    };
    
    console.log(`  ✓ Title: ${metadata.title?.substring(0, 60)}...`);
    console.log(`  ✓ Image: ${metadata.heroImage ? 'Found' : 'Not found'}`);
    
    return metadata;
  } catch (error) {
    console.error(`  ✗ Error fetching ${url}:`, error instanceof Error ? error.message : 'Unknown error');
    return {};
  }
}

async function updateArticleMetadata() {
  // Get all articles
  const articles = db.prepare('SELECT id, title, url, author FROM articles').all() as Array<{
    id: number;
    title: string;
    url: string;
    author: string | null;
  }>;
  
  console.log(`Found ${articles.length} articles to process\n`);
  
  const updateStmt = db.prepare(`
    UPDATE articles 
    SET title = COALESCE(?, title),
        description = ?,
        hero_image = ?,
        author = COALESCE(?, author)
    WHERE id = ?
  `);
  
  let successCount = 0;
  let failCount = 0;
  
  for (const article of articles) {
    console.log(`\n[${article.id}/${articles.length}] Processing: ${article.title}`);
    
    const metadata = await fetchArticleMetadata(article.url);
    
    if (metadata.title || metadata.description || metadata.heroImage) {
      updateStmt.run(
        metadata.title,
        metadata.description,
        metadata.heroImage,
        metadata.author,
        article.id
      );
      successCount++;
      console.log(`  ✓ Updated`);
    } else {
      failCount++;
      console.log(`  ✗ No metadata found`);
    }
    
    // Be nice to servers - wait 1 second between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`\n✅ Articles Metadata Import Complete!`);
  console.log(`   Success: ${successCount}`);
  console.log(`   Failed: ${failCount}`);
}

// Run the import
updateArticleMetadata()
  .then(() => {
    db.close();
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    db.close();
    process.exit(1);
  });
