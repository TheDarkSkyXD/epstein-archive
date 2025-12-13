import fs from 'fs';
import path from 'path';
import { databaseService } from '../services/DatabaseService';

const ARTICLES_PATH = path.join(process.cwd(), 'src/data/articles.json');

async function ingestArticles() {
  try {
    console.log('Ingesting articles from:', ARTICLES_PATH);
    
    if (!fs.existsSync(ARTICLES_PATH)) {
      console.error('Articles file not found!');
      process.exit(1);
    }

    const articlesData = fs.readFileSync(ARTICLES_PATH, 'utf-8');
    const articles = JSON.parse(articlesData);

    console.log(`Found ${articles.length} articles.`);

    // Ensure database is initialized (accessing the instance does this)
    const db = databaseService.getDatabase();
    
    // Explicitly ensure table exists just in case
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

    let count = 0;
    for (const article of articles) {
      try {
        databaseService.insertArticle({
          title: article.title,
          link: article.url,
          description: article.summary,
          content: article.summary, // Use summary as content for now if full content missing
          pubDate: article.published_date,
          author: article.author,
          source: article.publication,
          imageUrl: article.imageUrl,
          guid: article.url, // Use URL as GUID
          redFlagRating: article.redFlagRating
        });
        count++;
      } catch (e) {
        console.error(`Failed to insert article ${article.title}:`, e);
      }
    }

    console.log(`Successfully ingested ${count} articles.`);
    
  } catch (error) {
    console.error('Error ingesting articles:', error);
    process.exit(1);
  }
}

ingestArticles();
