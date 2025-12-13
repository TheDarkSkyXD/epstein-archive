
import { DatabaseService } from '../src/services/DatabaseService';
import path from 'path';

// URLs
const FEEDS = [
  { 
    url: 'https://generik.substack.com/feed', 
    source: 'Substack',
    author: 'Generik'
  },
  { 
    url: 'https://news.google.com/rss/search?q=Jeffrey+Epstein+Miami+Herald&hl=en-US&gl=US&ceid=US:en', 
    source: 'Miami Herald (via Google News)',
    author: 'Miami Herald'
  }
];

const dbService = DatabaseService.getInstance();
const db = dbService.getDatabase();

async function ingestArticles() {
  console.log('Starting article ingestion...');
  
  // Force strict schema refresh for development/ingestion
  try {
    db.exec('DROP TABLE IF EXISTS articles');
    // Re-initialize to create table with new schema
    // @ts-ignore - Accessing private method via workaround or just rely on DatabaseService constructor if I could, but simply running a CREATE here is easier?
    // Actually DatabaseService will create it if not exists, but we need to trigger that or just run the CREATE SQL here.
    // Easier: Just run the CREATE SQL here matching DatabaseService.
     db.exec(`
        CREATE TABLE IF NOT EXISTS articles (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          link TEXT NOT NULL UNIQUE,
          description TEXT,
          content TEXT,
          pub_date TEXT,
          author TEXT,
          source TEXT,
          image_url TEXT,
          guid TEXT UNIQUE,
          red_flag_rating INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);
  } catch (e) {
    console.error('Error refreshing schema:', e);
  }

  for (const feed of FEEDS) {
    console.log(`Fetching from ${feed.source}...`);
    try {
      const response = await fetch(feed.url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const xml = await response.text();
      
      const articles = parseRSS(xml, feed.source, feed.author);
      console.log(`Found ${articles.length} articles from ${feed.source}. Inserting...`);

      for (const article of articles) {
        dbService.insertArticle(article);
      }
    } catch (error) {
      console.error(`Failed to ingest from ${feed.source}:`, error);
    }
  }

  console.log('Ingestion complete.');
}

function parseRSS(xml: string, source: string, defaultAuthor: string) {
  const items: any[] = [];
  
  // Simple regex-based parsing (robust enough for standard RSS)
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g; // Atom support

  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    items.push(parseItem(match[1], source, defaultAuthor));
  }
  
  // If no items, try Atom entries
  if (items.length === 0) {
     while ((match = entryRegex.exec(xml)) !== null) {
       items.push(parseItem(match[1], source, defaultAuthor));
     }
  }

  return items;
}

function parseItem(content: string, source: string, defaultAuthor: string) {
  const getTag = (tag: string) => {
    const regex = new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?<\\/${tag}>`, 'i');
    const match = regex.exec(content);
    return match ? match[1].trim() : null;
  };

  const title = getTag('title') || 'Untitled';
  const link = getTag('link') || getTag('guid') || ''; // Basic fallback
  const description = getTag('description') || getTag('content:encoded') || getTag('summary') || '';
  const pubDate = getTag('pubDate') || getTag('published') || new Date().toISOString();
  const author = getTag('dc:creator') || getTag('author') || defaultAuthor;
  const guid = getTag('guid') || link;
  
  // Extract simple image from content if possible
  const imgMatch = /<img[^>]+src="([^">]+)"/.exec(description);
  const imageUrl = imgMatch ? imgMatch[1] : null;

  return {
    title: decodeHTMLEntities(title),
    link,
    description: decodeHTMLEntities(description).replace(/<[^>]*>/g, '').substring(0, 500), // Strip HTML, truncate
    content: description,
    pubDate,
    author,
    source,
    imageUrl,
    guid,
    redFlagRating: 0
  };
}

function decodeHTMLEntities(text: string) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1'); 
}

ingestArticles();
