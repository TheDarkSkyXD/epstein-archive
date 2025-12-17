#!/usr/bin/env tsx
/**
 * Add Missing Key Entities
 * 
 * Adds key entities that are likely to be in the documents but missing from the database
 */

import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'epstein-archive.db');

// List of key entities to add
const KEY_ENTITIES = [
  { name: 'Donald Trump', role: 'Politician', red_flag_rating: 2 },
  { name: 'Bill Clinton', role: 'Politician', red_flag_rating: 2 },
  { name: 'Hillary Clinton', role: 'Politician', red_flag_rating: 2 },
  { name: 'Prince Andrew', role: 'Royalty', red_flag_rating: 3 },
  { name: 'Alan Dershowitz', role: 'Lawyer', red_flag_rating: 2 },
  { name: 'Bill Gates', role: 'Businessman', red_flag_rating: 1 },
  { name: 'Jeff Bezos', role: 'Businessman', red_flag_rating: 1 },
  { name: 'Elon Musk', role: 'Businessman', red_flag_rating: 1 },
  { name: 'Mark Zuckerberg', role: 'Businessman', red_flag_rating: 1 },
  { name: 'Tim Cook', role: 'Businessman', red_flag_rating: 1 },
  { name: 'Steve Jobs', role: 'Businessman', red_flag_rating: 1 },
  { name: 'Steve Bannon', role: 'Politician', red_flag_rating: 3 },
  { name: 'Les Wexner', role: 'Businessman', red_flag_rating: 3 },
  { name: 'Glenn Dubin', role: 'Businessman', red_flag_rating: 3 },
  { name: 'Leon Black', role: 'Businessman', red_flag_rating: 2 },
  { name: 'Michael Wolff', role: 'Journalist', red_flag_rating: 1 },
  { name: 'Reid Hoffman', role: 'Entrepreneur', red_flag_rating: 1 },
  { name: 'Peter Thiel', role: 'Entrepreneur', red_flag_rating: 2 }
];

function addMissingEntities() {
  console.log('Starting to add missing key entities...');
  
  const db = new Database(DB_PATH);
  
  try {
    // Check what entities already exist
    const existingEntities = db.prepare('SELECT name FROM entities').all() as { name: string }[];
    const existingNames = new Set(existingEntities.map(e => e.name.toLowerCase()));
    
    let addedCount = 0;
    
    for (const entity of KEY_ENTITIES) {
      // Skip if already exists (case insensitive)
      if (existingNames.has(entity.name.toLowerCase())) {
        console.log(`✅ Entity "${entity.name}" already exists.`);
        continue;
      }
      
      // Check if entity exists in documents
      const docMatch = db.prepare('SELECT id FROM documents WHERE content LIKE ? LIMIT 1').get(`%${entity.name}%`);
      
      if (docMatch) {
        console.log(`➕ Adding entity "${entity.name}"...`);
        
        // Count total mentions
        const mentionCountResult = db.prepare('SELECT COUNT(*) as count FROM documents WHERE content LIKE ?').get(`%${entity.name}%`) as any;
        const mentionCount = mentionCountResult ? mentionCountResult.count : 0;
        
        // Insert entity
        const result = db.prepare(`
          INSERT INTO entities (name, type, role, mentions, red_flag_rating, created_at)
          VALUES (?, 'Person', ?, ?, ?, datetime('now'))
        `).run(entity.name, entity.role, mentionCount, entity.red_flag_rating);
        
        console.log(`  ✨ Created entity "${entity.name}" (ID: ${result.lastInsertRowid}) with ${mentionCount} mentions.`);
        addedCount++;
      } else {
        console.log(`  ❌ "${entity.name}" not found in any documents.`);
      }
    }
    
    console.log('-----------------------------------');
    console.log(`Completed! Added ${addedCount} new entities.`);
    
  } catch (error) {
    console.error('Error adding missing entities:', error);
  } finally {
    db.close();
  }
}

addMissingEntities();