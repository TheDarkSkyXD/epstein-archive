
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-cpu';
import * as mobilenet from '@tensorflow-models/mobilenet';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import { createCanvas, loadImage, Image } from 'canvas';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = path.resolve(__dirname, '..');
const DB_PATH = path.join(PROJECT_ROOT, 'epstein-archive-production.db'); // Using production DB file in root

// Initialize DB
// Initialize DB
const db = new Database(DB_PATH);

const BLACKLIST_SCENES = [
  'Shoe shop, shoe-shop, shoe store',
  'Tobacco shop, tobacconist shop, tobacconist',
  'Confectionery, confectionery shop, candy store',
  'Person',
  'Groom, bridegroom',
  'Hoopskirt, crinoline',
  'Vestment',
  'Dungeness crab, Cancer magister',
  'Apiary, bee house',
  'Plunger, plumber\'s helper',
  'Pickelhaube',
  'Web site, website, internet site, site'
];

async function main() {
  console.log('🚀 Starting AI Media Analysis...');
  
  try {
    console.log('📦 Loading TensorFlow models (this may take a moment)...');
    await tf.setBackend('cpu');
    await tf.ready();
    
    // Load models
    const [modelMobile, modelCoco] = await Promise.all([
      mobilenet.load(),
      cocoSsd.load()
    ]);
    console.log('✅ Models loaded: MobileNet v1, COCO-SSD');

    // Fetch images without descriptions
    // OR we can fetch ALL and append AI data? 
    // User wants "info section... blurb".
    // Let's target images where description doesn't already have AI info.
    const images = db.prepare(`
      SELECT id, path, title, description 
      FROM media_images 
      WHERE description IS NULL OR description NOT LIKE '%AI Analysis:%'
    `).all() as any[];

    console.log(`🔍 Found ${images.length} images eligible for analysis.`);

    let processed = 0;
    for (const img of images) {
      let fsPath = img.path;
      if (img.path.startsWith('/data/')) {
          fsPath = path.join(PROJECT_ROOT, img.path.substring(1));
      } else if (!path.isAbsolute(img.path)) {
           fsPath = path.join(PROJECT_ROOT, img.path);
      }

      if (!fs.existsSync(fsPath)) {
            console.warn(`⚠️ File not found: ${fsPath} (DB: ${img.path})`);
            continue;
      }

      try {
        // Load image with canvas
        const image = await loadImage(fsPath);
        const canvas = createCanvas(image.width, image.height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0);
        
        // Convert to tensor
        // Pass canvas (node-canvas) to fromPixels
        const tensor = tf.browser.fromPixels(canvas as unknown as HTMLCanvasElement);

        // Run analysis
        const predictions = await modelMobile.classify(tensor as any);
        const objects = await modelCoco.detect(tensor as any);

        // Process results
        // Process results
        let scene: string | undefined | null = predictions[0]?.className;
        
        // Filter Blacklisted Scenes
        if (scene && BLACKLIST_SCENES.some(bad => scene.toLowerCase().includes(bad.split(',')[0].toLowerCase()))) {
             // If matches (loose check or exact?), let's do exact check on the full string usually returned by ImageNet
             // ImageNet classes are comma separated synonyms. 
             // "Shoe shop, shoe-shop, shoe store"
             if (BLACKLIST_SCENES.includes(scene)) {
                 scene = null;
             }
        }
        const detObjects = [...new Set(objects.filter(o => o.score > 0.5).map(o => o.class))];

        // Construct Blurb
        let aiBlurb = '';
        if (scene) {
             aiBlurb += `AI Analysis: Scene appears to be ${scene}.`;
        }
        if (detObjects.length > 0) {
          aiBlurb += ` Detected objects: ${detObjects.join(', ')}.`;
        }
        
        if (!aiBlurb) {
            processed++;
            // process.stdout.write(`\r⏩ Skipped (empty) ${img.title.substring(0, 30)}...`);
            continue; 
        }

        // Update Description
        const cleanOriginal = img.description ? img.description.trim() : '';
        let newDesc = cleanOriginal ? `${cleanOriginal} ${aiBlurb}` : aiBlurb;
        
        // Update DB
        db.prepare('UPDATE media_images SET description = ? WHERE id = ?').run(newDesc, img.id);
        
        // Also add tags
        const newTags = detObjects.map(t => t.toLowerCase());
        if (scene && typeof scene === 'string') newTags.push(scene.split(',')[0].trim().toLowerCase()); // Only push scene if valid
        
        // Insert tags logic (simplified)
        const insertTag = db.prepare('INSERT OR IGNORE INTO media_tags (name) VALUES (?)');
        const linkTag = db.prepare('INSERT OR IGNORE INTO media_image_tags (image_id, tag_id) VALUES (?, (SELECT id FROM media_tags WHERE name = ?))');
        
        for (const tag of newTags) {
            insertTag.run(tag);
            linkTag.run(img.id, tag);
        }

        tensor.dispose();
        processed++;
        process.stdout.write(`\r✅ Processed ${processed}/${images.length}: ${img.title.substring(0, 30)}...`);

      } catch (err) {
        console.error(`\n❌ Error processing ${img.id} (${img.title}):`, err);
        // Continue
      }
    }
    console.log('\n✨ Analysis Complete.');

  } catch (error) {
    console.error('Fatal error:', error);
  }
}

main();
