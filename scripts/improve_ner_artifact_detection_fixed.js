import Database from 'better-sqlite3';
import { join } from 'path';

// Connect to the database
const dbPath = join(process.cwd(), 'epstein-archive.db');
const db = new Database(dbPath);

// List of common adverbs and prepositions that often create NER artifacts
const commonAdverbsAndPrepositions = [
  'but', 'and', 'or', 'yet', 'so', 'for', 'nor', 'after', 'before', 'while', 'since', 
  'until', 'when', 'where', 'because', 'although', 'though', 'if', 'unless', 'as', 
  'than', 'whether', 'whereas', 'once', 'whenever', 'wherever', 'whereby', 'how', 
  'why', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 
  'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must',
  'can', 'shall', 'ought', 'need', 'dare', 'used', 'get', 'go', 'come', 'see', 
  'take', 'make', 'know', 'think', 'say', 'tell', 'ask', 'give', 'find', 'feel',
  'seem', 'appear', 'become', 'turn', 'grow', 'keep', 'hold', 'leave', 'let', 
  'put', 'send', 'set', 'show', 'start', 'stop', 'try', 'use', 'want', 'wish',
  'work', 'play', 'run', 'walk', 'sit', 'stand', 'lie', 'sleep', 'wake', 'eat',
  'drink', 'buy', 'sell', 'pay', 'cost', 'spend', 'save', 'lend', 'borrow', 
  'owe', 'own', 'belong', 'contain', 'include', 'consist', 'comprise', 'compose',
  'form', 'build', 'construct', 'create', 'produce', 'manufacture', 
  'generate', 'develop', 'design', 'plan', 'organize', 'manage', 'control', 
  'direct', 'lead', 'guide', 'follow', 'obey', 'resist', 'refuse', 'reject',
  'deny', 'ignore', 'overlook', 'miss', 'lose', 'win', 'gain', 'obtain', 
  'acquire', 'achieve', 'accomplish', 'complete', 'finish', 'end', 'begin', 
  'commence', 'continue', 'proceed', 'cease', 'discontinue', 'halt',
  'pause', 'wait', 'delay', 'postpone', 'cancel', 'abandon', 'quit', 'leave',
  'depart', 'arrive', 'reach', 'approach', 'near', 'pass', 'cross', 
  'return', 'fall', 'rise', 'climb', 'descend', 'ascend',
  'drop', 'throw', 'catch', 'pick', 'carry', 'bring', 'move', 'shift',
  'change', 'alter', 'modify', 'adjust', 'adapt', 'convert', 'transform', 
  'translate', 'interpret', 'explain', 'describe', 'define', 'identify', 
  'recognize', 'distinguish', 'differentiate', 'compare', 'contrast', 'match',
  'suit', 'fit', 'correspond', 'relate', 'connect', 'link', 'attach', 'bind',
  'tie', 'join', 'unite', 'combine', 'merge', 'mix', 'blend', 'stir', 'shake',
  'agitate', 'disturb', 'interrupt'
];

// Function to identify and flag potential NER artifacts
function identifyNerArtifacts() {
  console.log('Identifying potential NER artifacts...');
  
  // Get all entities from the database
  const entities = db.prepare('SELECT id, full_name FROM entities').all();
  
  let artifactCount = 0;
  
  for (const entity of entities) {
    const nameParts = entity.full_name.split(' ');
    
    // Check if any part of the name is a common adverb or preposition
    for (const part of nameParts) {
      const lowerPart = part.toLowerCase();
      if (commonAdverbsAndPrepositions.includes(lowerPart)) {
        console.log(`Potential NER artifact found: "${entity.full_name}" (contains "${lowerPart}")`);
        artifactCount++;
        
        // Update the entity with a flag for review
        db.prepare('UPDATE entities SET needs_review = 1 WHERE id = ?').run(entity.id);
      }
    }
  }
  
  console.log(`Found ${artifactCount} potential NER artifacts.`);
}

// Function to improve red flag detection
function improveRedFlagDetection() {
  console.log('Improving red flag detection...');
  
  // Get all entities that don't have red flag ratings
  const entities = db.prepare('SELECT id, full_name, spice_rating FROM entities WHERE red_flag_rating IS NULL').all();
  
  for (const entity of entities) {
    // Use existing spice rating as a base for red flag rating
    const redFlagRating = entity.spice_rating || 0;
    
    // Update the entity with red flag fields
    db.prepare(`
      UPDATE entities 
      SET red_flag_rating = ?, red_flag_score = ?, red_flag_description = ?
      WHERE id = ?
    `).run(
      redFlagRating,
      redFlagRating * 20, // Simple score calculation
      getRedFlagDescription(redFlagRating),
      entity.id
    );
    
    console.log(`Updated red flag fields for: ${entity.full_name}`);
  }
}

// Helper function to get red flag description based on rating
function getRedFlagDescription(rating) {
  switch (rating) {
    case 0: return 'No Red Flags';
    case 1: return 'Minor Concerns';
    case 2: return 'Moderate Red Flags';
    case 3: return 'Significant Red Flags';
    case 4: return 'High Red Flags';
    case 5: return 'Critical Red Flags';
    default: return 'Unknown Risk Level';
  }
}

// Run the functions
identifyNerArtifacts();
improveRedFlagDetection();

console.log('NER artifact detection improvement complete');