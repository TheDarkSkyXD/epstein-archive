
import fs from 'fs';
import path from 'path';

// Read CSV
const csvPath = path.resolve('missing_images.csv');
const sqlPath = path.resolve('update_article_images.sql');

if (!fs.existsSync(csvPath)) {
  console.error('missing_images.csv not found');
  process.exit(1);
}

const csvContent = fs.readFileSync(csvPath, 'utf-8');
const lines = csvContent.split('\n').filter(l => l.trim().length > 0);

console.log(`Found ${lines.length} articles to process.`);

const updates: string[] = [];

async function fetchOgImage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout
    
    // Add User-Agent locally to avoid 403s
    const res = await fetch(url, { 
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    clearTimeout(timeout);
    
    if (!res.ok) {
        console.warn(`Failed to fetch ${url}: ${res.status}`);
        return null;
    }
    
    const html = await res.text();
    // Regex for og:image
    const match = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
    if (match && match[1]) {
      return match[1];
    }
    // Fallback: twitter:image
    const twMatch = html.match(/<meta\s+name=["']twitter:image["']\s+content=["']([^"']+)["']/i);
    if (twMatch && twMatch[1]) {
        return twMatch[1];
    }

    return null;
  } catch (e: any) {
    console.warn(`Error processing ${url}: ${e.message}`);
    return null;
  }
}

async function processArticles() {
  console.log('BEGIN TRANSACTION;');
  
  // Skip header if present (sqlite3 -csv doesn't output header by default usually or we can check)
  // Our command was SELECT id, link ... so lines are "id,link"
  
  for (const line of lines) {
    // Basic CSV parse (assuming no commas in URL or simplistic quotes)
    // Actually sqlite3 -csv quotes fields if they contain comma.
    // We can use a regex to split.
    const parts = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
    // Actually simpler: sqlite3 output is id,link. ID is int. Link is url.
    // Just split by first comma.
    const firstComma = line.indexOf(',');
    if (firstComma === -1) continue;
    
    const id = line.substring(0, firstComma).trim();
    let link = line.substring(firstComma + 1).trim();
    
    // Remove quotes if present
    if (link.startsWith('"') && link.endsWith('"')) {
        link = link.substring(1, link.length - 1);
    }
    // Fix double quotes escaping
    link = link.replace(/""/g, '"');

    if (!link.startsWith('http')) continue;

    console.warn(`Fetching metadata for ID ${id}: ${link}`);
    const img = await fetchOgImage(link);
    
    if (img) {
      console.warn(`  Found image: ${img}`);
      const safeImg = img.replace(/'/g, "''");
      updates.push(`UPDATE articles SET image_url = '${safeImg}' WHERE id = ${id};`);
    } else {
      console.warn(`  No image found.`);
    }
    
    // throttle
    await new Promise(r => setTimeout(r, 500));
  }
  
  fs.writeFileSync(sqlPath, 'BEGIN TRANSACTION;\n' + updates.join('\n') + '\nCOMMIT;\n');
  console.log(`Generated ${updates.length} updates in ${sqlPath}`);
}

processArticles();
