
const axios = require('axios');
const cheerio = require('cheerio');
const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '../epstein-archive.db');
const db = new Database(DB_PATH);

console.log('🚀 Starting Article Scraper...');

const SUBSTACK_URLS = [
  'https://generik.substack.com/p/every-accusation-is-an-admission',
  'https://generik.substack.com/p/the-man-from-orgy',
  'https://generik.substack.com/p/buried-secrets-why-the-epstein-files',
  'https://generik.substack.com/p/epsteins-billions-where-did-they',
  'https://generik.substack.com/p/mellon-collie-and-the-infinite-money',
  'https://generik.substack.com/p/the-model-citizen',
  'https://generik.substack.com/p/spies-and-sex-unpacking-the-epsteinmossad',
  'https://generik.substack.com/p/epsteins-ghost-and-trumps-diminishing',
  'https://generik.substack.com/p/epstein-survivors-confront-a-system'
];

const MIAMI_HERALD_TOPIC = 'https://www.miamiherald.com/topics/jeffrey-epstein';

const insertArticle = db.prepare(`
  INSERT INTO articles (title, url, author, publication, published_date, content, summary, spice_rating)
  VALUES (@title, @url, @author, @publication, @date, @content, @summary, @spice)
`);

const checkArticle = db.prepare('SELECT 1 FROM articles WHERE url = ?');

async function scrapeSubstack(url) {
  try {
    console.log(`   - Scraping ${url}...`);
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);

    const title = $('h1.post-title').text().trim();
    const subtitle = $('h3.subtitle').text().trim();
    const author = 'Greg Olear'; // Known author for this substack
    const dateStr = $('div.post-date').text().trim(); // Need to parse if possible, or leave as string
    const content = $('div.body.markup').html(); // Get HTML content
    
    // Simple summary from subtitle or first paragraph
    const summary = subtitle || $('div.body.markup p').first().text().trim();

    if (title && content) {
      const exists = checkArticle.get(url);
      if (!exists) {
        insertArticle.run({
          title,
          url,
          author,
          publication: 'Prevail (Substack)',
          date: new Date().toISOString().split('T')[0], // Fallback to today if parsing fails
          content,
          summary,
          spice: 4 // High relevance
        });
        console.log(`     ✅ Saved: ${title}`);
      } else {
        console.log(`     ⚠️ Already exists: ${title}`);
      }
    }
  } catch (error) {
    console.error(`     ❌ Error scraping ${url}:`, error.message);
  }
}

async function run() {
  console.log('📚 Scraping Substack Articles...');
  for (const url of SUBSTACK_URLS) {
    await scrapeSubstack(url);
    // Be nice to the server
    await new Promise(r => setTimeout(r, 2000));
  }
  
  console.log('✅ Scraping Complete!');
}

run();
