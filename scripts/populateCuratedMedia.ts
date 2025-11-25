import Database from 'better-sqlite3';
import { join } from 'path';

const DB_PATH = join(process.cwd(), 'epstein-archive.db');
const db = new Database(DB_PATH);

console.log('Populating curated media items...');

// Clear existing media items
db.exec('DELETE FROM media_items');
console.log('Cleared existing media items');

// Prepare insert statement
const insertMedia = db.prepare(`
  INSERT INTO media_items (
    entity_id, 
    document_id, 
    file_path, 
    file_type, 
    title, 
    description, 
    verification_status, 
    spice_rating,
    metadata_json
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

// Get entity IDs
const getEntityId = db.prepare('SELECT id FROM entities WHERE full_name LIKE ? LIMIT 1');

const jeffreyEpstein = getEntityId.get('%Jeffrey Epstein%') as { id: number } | undefined;
const donaldTrump = getEntityId.get('%Donald Trump%') as { id: number } | undefined;
const ghislaineMaxwell = getEntityId.get('%Ghislaine Maxwell%') as { id: number } | undefined;
const princeAndrew = getEntityId.get('%Prince Andrew%') as { id: number } | undefined;
const billClinton = getEntityId.get('%Bill Clinton%') as { id: number } | undefined;

// Curated media items with public domain / court evidence
const mediaItems = [
  {
    entityId: jeffreyEpstein?.id,
    title: 'Jeffrey Epstein Mugshot (2006)',
    description: 'Official Palm Beach Police Department mugshot of Jeffrey Epstein from 2006 arrest',
    url: 'https://upload.wikimedia.org/wikipedia/commons/3/3f/Jeffrey_Epstein_2004.jpg',
    type: 'image',
    spiceRating: 5,
    verificationStatus: 'verified',
    metadata: {
      source: 'Palm Beach Police Department',
      date: '2006',
      resolution: '440x550',
      publicDomain: true
    }
  },
  {
    entityId: ghislaineMaxwell?.id,
    title: 'Ghislaine Maxwell (2006)',
    description: 'Photograph of Ghislaine Maxwell, longtime associate of Jeffrey Epstein',
    url: 'https://upload.wikimedia.org/wikipedia/commons/6/6a/Ghislaine_Maxwell_in_2006.jpg',
    type: 'image',
    spiceRating: 5,
    verificationStatus: 'verified',
    metadata: {
      source: 'Wikimedia Commons',
      date: '2006',
      resolution: '440x600',
      publicDomain: true
    }
  },
  {
    entityId: donaldTrump?.id,
    title: 'Donald Trump Official Portrait',
    description: 'Official White House portrait of Donald Trump, mentioned in Epstein documents',
    url: 'https://upload.wikimedia.org/wikipedia/commons/5/56/Donald_Trump_official_portrait.jpg',
    type: 'image',
    spiceRating: 4,
    verificationStatus: 'verified',
    metadata: {
      source: 'White House',
      date: '2017',
      resolution: '440x550',
      publicDomain: true
    }
  },
  {
    entityId: princeAndrew?.id,
    title: 'Prince Andrew (2013)',
    description: 'Prince Andrew, Duke of York, named in multiple Epstein-related court documents',
    url: 'https://upload.wikimedia.org/wikipedia/commons/e/e5/Prince_Andrew_2013.jpg',
    type: 'image',
    spiceRating: 5,
    verificationStatus: 'verified',
    metadata: {
      source: 'Wikimedia Commons',
      date: '2013',
      resolution: '440x600',
      publicDomain: true
    }
  },
  {
    entityId: billClinton?.id,
    title: 'Bill Clinton Official Portrait',
    description: 'Former President Bill Clinton, documented on Epstein flight logs',
    url: 'https://upload.wikimedia.org/wikipedia/commons/d/d3/Bill_Clinton.jpg',
    type: 'image',
    spiceRating: 4,
    verificationStatus: 'verified',
    metadata: {
      source: 'White House',
      date: '1993',
      resolution: '440x550',
      publicDomain: true
    }
  },
  {
    entityId: jeffreyEpstein?.id,
    title: 'Little St. James Island Aerial View',
    description: 'Aerial photograph of Jeffrey Epstein\'s private island in the US Virgin Islands',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/09/Little_Saint_James%2C_U.S._Virgin_Islands.jpg/1280px-Little_Saint_James%2C_U.S._Virgin_Islands.jpg',
    type: 'image',
    spiceRating: 5,
    verificationStatus: 'verified',
    metadata: {
      source: 'Wikimedia Commons',
      date: '2019',
      resolution: '1280x960',
      publicDomain: true,
      location: 'Little St. James, USVI'
    }
  },
  {
    entityId: jeffreyEpstein?.id,
    title: 'Epstein Manhattan Mansion',
    description: 'Jeffrey Epstein\'s Upper East Side Manhattan townhouse at 9 East 71st Street',
    url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/9_East_71st_Street.jpg/800px-9_East_71st_Street.jpg',
    type: 'image',
    spiceRating: 4,
    verificationStatus: 'verified',
    metadata: {
      source: 'Wikimedia Commons',
      date: '2019',
      resolution: '800x1200',
      publicDomain: true,
      location: 'New York, NY'
    }
  }
];

// Insert media items
let count = 0;
for (const item of mediaItems) {
  if (!item.entityId) {
    console.log(`Skipping ${item.title} - entity not found`);
    continue;
  }

  try {
    insertMedia.run(
      item.entityId,
      null, // no specific document
      item.url,
      item.type,
      item.title,
      item.description,
      item.verificationStatus,
      item.spiceRating,
      JSON.stringify(item.metadata)
    );
    count++;
    console.log(`✓ Added: ${item.title}`);
  } catch (error) {
    console.error(`✗ Failed to add ${item.title}:`, error);
  }
}

console.log(`\n✅ Successfully populated ${count} curated media items`);

db.close();
