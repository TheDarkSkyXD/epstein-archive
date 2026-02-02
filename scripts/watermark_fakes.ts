import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { globSync } from 'glob';

const TARGET_DIR = 'data/media/images/Confirmed Fake';
const BACKUP_DIR = path.join(TARGET_DIR, '_backup');

async function main() {
  console.log('🔒 Starting watermark process for Confirmed Fake images...');

  if (!fs.existsSync(TARGET_DIR)) {
    console.error(`❌ Directory not found: ${TARGET_DIR}`);
    process.exit(1);
  }

  // Create backup directory
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    console.log(`📂 Created backup directory: ${BACKUP_DIR}`);
  }

  // Find images
  const images = globSync(path.join(TARGET_DIR, '*.{jpg,jpeg,png,webp}'));
  console.log(`🔍 Found ${images.length} images to process.`);

  let processed = 0;
  let errors = 0;

  for (const imagePath of images) {
    const filename = path.basename(imagePath);
    const backupPath = path.join(BACKUP_DIR, filename);

    // Skip if already in backup (implies we might have processed it, or it's a re-run)
    // Actually, checking if backup exists is good safety. If it exists, we assume the current file *might* already be processed.
    // But the user asked to re-process missed ones.
    // So, if backup exists, restore from backup first? Or just rely on visual check?
    // Let's copy to backup if not exists.
    if (!fs.existsSync(backupPath)) {
      fs.copyFileSync(imagePath, backupPath);
      console.log(`   Detailed backup for: ${filename}`);
    } else {
      // If backup exists, use the backup as the source to avoid double-watermarking over time
      // This is safer.
      // console.log(`   Using backup source for clean watermark: ${filename}`);
    }

    try {
      // Use the backup (clean) as source if available, otherwise the current file
      const sourcePath = fs.existsSync(backupPath) ? backupPath : imagePath;

      const metadata = await sharp(sourcePath).metadata();
      const width = metadata.width || 1000;
      const height = metadata.height || 1000;

      // Calculate font size relative to image width
      const fontSize = Math.floor(width * 0.15); // 15% of width

      // Create SVG overlay
      const svgImage = `
        <svg width="${width}" height="${height}">
          <style>
            .title { fill: rgba(255, 0, 0, 0.5); font-size: ${fontSize}px; font-weight: bold; font-family: sans-serif; }
          </style>
          <text x="50%" y="50%" text-anchor="middle" dy=".3em" class="title" transform="rotate(-45, ${width / 2}, ${height / 2})">FAKE</text>
        </svg>
      `;

      // Composite
      await sharp(sourcePath)
        .composite([{ input: Buffer.from(svgImage), top: 0, left: 0 }])
        .toFile(imagePath); // Overwrite original in place

      console.log(`✅ Watermarked: ${filename}`);
      processed++;
    } catch (error) {
      console.error(`❌ Error processing ${filename}:`, error);
      errors++;
    }
  }

  console.log('\n================================');
  console.log(`🎉 Complete!`);
  console.log(`Processed: ${processed}`);
  console.log(`Errors:    ${errors}`);
  console.log(`Backups saved in: ${BACKUP_DIR}`);
}

main().catch(console.error);
