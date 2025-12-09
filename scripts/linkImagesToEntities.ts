import { DatabaseService } from '../src/services/DatabaseService';
import Database from 'better-sqlite3';

const dbService = DatabaseService.getInstance();
const db = dbService.getDatabase();

async function linkImagesToEntities() {
  console.log('Starting image linking...');

  // 1. Load entities
  const entities = db.prepare('SELECT id, full_name FROM entities').all() as any[];
  const entityMap = new Map<string, number>();
  entities.forEach(e => {
    if (e.full_name) entityMap.set(e.full_name.toLowerCase(), e.id);
  });
  console.log(`Loaded ${entities.length} entities.`);

  // 2. Load images
  const images = db.prepare('SELECT * FROM media_images').all() as any[];
  console.log(`Processing ${images.length} images...`);

  const insertMediaItem = db.prepare(`
    INSERT INTO media_items (
      entity_id, file_path, file_type, title, description, 
      verification_status, spice_rating, metadata_json
    ) VALUES (
      @entity_id, @file_path, @file_type, @title, @description, 
      @verification_status, @spice_rating, @metadata_json
    )
  `);

  const checkExists = db.prepare('SELECT id FROM media_items WHERE entity_id = ? AND file_path = ?');

  let linkedCount = 0;

  for (const img of images) {
    const textToScan = `${img.title || ''} ${img.description || ''} ${img.filename || ''} ${img.original_filename || ''}`.toLowerCase();
    
    // Find matching entities
    const matchedEntityIds = new Set<number>();

    // Check for explicit key figures first
    if (textToScan.includes('epstein')) matchedEntityIds.add(entityMap.get('jeffrey epstein')!);
    if (textToScan.includes('maxwell')) matchedEntityIds.add(entityMap.get('ghislaine maxwell')!);
    if (textToScan.includes('trump')) matchedEntityIds.add(entityMap.get('donald trump')!);
    if (textToScan.includes('clinton')) matchedEntityIds.add(entityMap.get('bill clinton')!);
    if (textToScan.includes('prince') || textToScan.includes('andrew')) matchedEntityIds.add(entityMap.get('prince andrew')!);

    // Check all entities (slow but thorough, maybe limit to top entities?)
    // For now, let's stick to the key figures and any name found in the title/filename
    // Extract capitalized words from title/filename
    const potentialNames = (img.title + ' ' + img.filename).match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\b/g) || [];
    potentialNames.forEach((name: string) => {
      const lower = name.toLowerCase();
      if (entityMap.has(lower)) {
        matchedEntityIds.add(entityMap.get(lower)!);
      }
    });

    for (const entityId of matchedEntityIds) {
      if (!entityId) continue;

      const existing = checkExists.get(entityId, img.path);
      if (!existing) {
        try {
          console.log(`Attempting to link image ${img.id} to entity ${entityId} (${img.path})`);
          const result = insertMediaItem.run({
            entity_id: entityId,
            file_path: img.path,
            file_type: 'image',
            title: img.title || img.filename,
            description: img.description || 'Imported from Photo Library',
            verification_status: 'verified',
            spice_rating: 3,
            metadata_json: JSON.stringify({
              source_table: 'media_images',
              original_id: img.id,
              width: img.width,
              height: img.height
            })
          });
          console.log(`Insert result: changes=${result.changes}, lastInsertRowid=${result.lastInsertRowid}`);
          if (result.changes > 0) linkedCount++;
        } catch (e) {
          console.error(`Failed to link image ${img.id} to entity ${entityId}:`, e);
        }
      } else {
        console.log(`Link already exists for image ${img.id} and entity ${entityId}`);
      }
    }
  }

  console.log(`Linking complete. Created ${linkedCount} new links in media_items.`);
}

linkImagesToEntities().catch(console.error);
