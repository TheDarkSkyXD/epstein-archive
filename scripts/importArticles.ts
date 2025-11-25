import Database from 'better-sqlite3';
import { join } from 'path';

const DB_PATH = join(process.cwd(), 'epstein-archive.db');
const db = new Database(DB_PATH);

console.log('Setting up articles table and importing content...');

// Create articles table
db.exec(`
  CREATE TABLE IF NOT EXISTS articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    url TEXT UNIQUE NOT NULL,
    author TEXT,
    publication TEXT NOT NULL,
    published_date TEXT,
    content TEXT,
    summary TEXT,
    tags TEXT,
    spice_rating INTEGER DEFAULT 3,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_articles_publication ON articles(publication);
  CREATE INDEX IF NOT EXISTS idx_articles_date ON articles(published_date DESC);
`);

console.log('✓ Articles table created');

// Prepare insert statement
const insertArticle = db.prepare(`
  INSERT OR REPLACE INTO articles (
    title, url, author, publication, published_date, content, summary, tags, spice_rating
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

// Curated articles with summaries (since we can't scrape in real-time)
const articles = [
  // Miami Herald
  {
    title: 'How a future Trump Cabinet member gave Epstein the deal of a lifetime',
    url: 'https://www.miamiherald.com/news/local/article220097825.html',
    author: 'Julie K. Brown',
    publication: 'Miami Herald',
    publishedDate: '2018-11-28',
    summary: 'Investigation into how Alexander Acosta, as U.S. Attorney, negotiated a secret plea deal for Jeffrey Epstein in 2008 that allowed him to avoid federal prosecution.',
    tags: 'Alexander Acosta,Plea Deal,2008,Federal Prosecution',
    spiceRating: 5
  },
  {
    title: 'Cops worked to put serial sex abuser in prison. Prosecutors worked to cut him a break',
    url: 'https://www.miamiherald.com/news/local/article214210674.html',
    author: 'Julie K. Brown',
    publication: 'Miami Herald',
    publishedDate: '2018-11-28',
    summary: 'Detailed account of how Palm Beach police built a strong case against Epstein for sexually abusing dozens of underage girls, only to see prosecutors negotiate a lenient plea deal.',
    tags: 'Palm Beach Police,Victims,Plea Deal,Investigation',
    spiceRating: 5
  },
  {
    title: 'Perversion of justice: How a future Trump Cabinet member gave Epstein the deal of a lifetime',
    url: 'https://www.miamiherald.com/topics/jeffrey-epstein',
    author: 'Julie K. Brown',
    publication: 'Miami Herald',
    publishedDate: '2018-11-28',
    summary: 'Comprehensive investigation series exposing Jeffrey Epstein\'s crimes and the controversial non-prosecution agreement.',
    tags: 'Investigation Series,Victims,Justice System',
    spiceRating: 5
  },
  
  // Substack Articles
  {
    title: 'Every Accusation is an Admission',
    url: 'https://generik.substack.com/p/every-accusation-is-an-admission',
    author: 'Greg Olear',
    publication: 'Prevail (Substack)',
    publishedDate: '2024',
    summary: 'Analysis of how Trump\'s accusations against others often reflect his own behavior, with focus on Epstein connections and trafficking allegations.',
    tags: 'Trump,Projection,Analysis',
    spiceRating: 4
  },
  {
    title: 'The Man from Orgy Island',
    url: 'https://generik.substack.com/p/the-man-from-orgy',
    author: 'Greg Olear',
    publication: 'Prevail (Substack)',
    publishedDate: '2024',
    summary: 'Deep dive into Jeffrey Epstein\'s Little St. James island operations and the network of powerful individuals connected to it.',
    tags: 'Little St. James,Network,Investigation',
    spiceRating: 5
  },
  {
    title: 'Buried Secrets: Why the Epstein Files Matter',
    url: 'https://generik.substack.com/p/buried-secrets-why-the-epstein-files',
    author: 'Greg Olear',
    publication: 'Prevail (Substack)',
    publishedDate: '2024',
    summary: 'Examination of why the full Epstein files remain sealed and what their release could reveal about powerful figures.',
    tags: 'Sealed Documents,Transparency,Cover-up',
    spiceRating: 5
  },
  {
    title: 'Epstein\'s Billions: Where Did They Come From?',
    url: 'https://generik.substack.com/p/epsteins-billions-where-did-they',
    author: 'Greg Olear',
    publication: 'Prevail (Substack)',
    publishedDate: '2024',
    summary: 'Investigation into the mysterious sources of Jeffrey Epstein\'s wealth and his financial connections to powerful individuals.',
    tags: 'Finance,Money Laundering,Wealth',
    spiceRating: 4
  },
  {
    title: 'Mellon Collie and the Infinite Money',
    url: 'https://generik.substack.com/p/mellon-collie-and-the-infinite-money',
    author: 'Greg Olear',
    publication: 'Prevail (Substack)',
    publishedDate: '2024',
    summary: 'Analysis of Epstein\'s financial network and connections to banking families and offshore accounts.',
    tags: 'Banking,Offshore Accounts,Financial Network',
    spiceRating: 4
  },
  {
    title: 'The Model Citizen',
    url: 'https://generik.substack.com/p/the-model-citizen',
    author: 'Greg Olear',
    publication: 'Prevail (Substack)',
    publishedDate: '2024',
    summary: 'Profile of Epstein\'s recruitment methods and the modeling agencies used to traffic young women.',
    tags: 'Modeling Agencies,Recruitment,Trafficking',
    spiceRating: 5
  },
  {
    title: 'Spies and Sex: Unpacking the Epstein-Mossad Connection',
    url: 'https://generik.substack.com/p/spies-and-sex-unpacking-the-epsteinmossad',
    author: 'Greg Olear',
    publication: 'Prevail (Substack)',
    publishedDate: '2024',
    summary: 'Investigation into allegations of Epstein\'s connections to intelligence agencies and blackmail operations.',
    tags: 'Intelligence,Mossad,Blackmail,Espionage',
    spiceRating: 5
  },
  {
    title: 'Epstein\'s Ghost and Trump\'s Diminishing Returns',
    url: 'https://generik.substack.com/p/epsteins-ghost-and-trumps-diminishing',
    author: 'Greg Olear',
    publication: 'Prevail (Substack)',
    publishedDate: '2024',
    summary: 'Analysis of the ongoing impact of Epstein revelations on Trump and other powerful figures.',
    tags: 'Trump,Political Impact,Scandal',
    spiceRating: 4
  },
  {
    title: 'Epstein Survivors Confront a System That Failed Them',
    url: 'https://generik.substack.com/p/epstein-survivors-confront-a-system',
    author: 'Greg Olear',
    publication: 'Prevail (Substack)',
    publishedDate: '2024',
    summary: 'Survivors\' perspectives on the justice system\'s failures and their ongoing fight for accountability.',
    tags: 'Survivors,Justice System,Accountability,Victims',
    spiceRating: 5
  }
];

// Insert articles
let count = 0;
for (const article of articles) {
  try {
    insertArticle.run(
      article.title,
      article.url,
      article.author,
      article.publication,
      article.publishedDate,
      '', // Full content would be scraped in production
      article.summary,
      article.tags,
      article.spiceRating
    );
    count++;
    console.log(`✓ Added: ${article.title}`);
  } catch (error) {
    console.error(`✗ Failed to add ${article.title}:`, error);
  }
}

console.log(`\n✅ Successfully imported ${count} articles`);
console.log(`\nArticles by publication:`);
console.log(`  Miami Herald: ${articles.filter(a => a.publication === 'Miami Herald').length}`);
console.log(`  Prevail (Substack): ${articles.filter(a => a.publication === 'Prevail (Substack)').length}`);

db.close();
