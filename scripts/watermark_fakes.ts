import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { globSync } from 'glob';
import crypto from 'crypto';
import { AssetService } from '../src/services/assetService.js';
import { getDb } from '../src/server/db/connection.js';

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

  const derivativeDir = 'data/derivatives/watermarked';
  if (!fs.existsSync(derivativeDir)) {
    fs.mkdirSync(derivativeDir, { recursive: true });
  }

  for (const imagePath of images) {
    const filename = path.basename(imagePath);
    const derivativePath = path.join(derivativeDir, filename);

    try {
      // 1. Calculate Original SHA-256
      const originalBuffer = fs.readFileSync(imagePath);
      const originalSha256 = crypto.createHash('sha256').update(originalBuffer).digest('hex');
      const stats = fs.statSync(imagePath);

      // 2. Register Original Asset
      const originalAssetId = await AssetService.registerAsset({
        storagePath: imagePath,
        sha256: originalSha256,
        mimeType: 'image/' + path.extname(imagePath).toLowerCase().replace('.', ''),
        fileSize: stats.size,
        sourceCollection: 'Confirmed Fake',
        isOriginal: true,
      });

      // 3. Create Watermarked Derivative
      const metadata = await sharp(imagePath).metadata();
      const width = metadata.width || 1000;
      const height = metadata.height || 1000;
      const fontSize = Math.floor(width * 0.15);

      const svgImage = `
        <svg width="${width}" height="${height}">
          <style>
            .title { fill: rgba(255, 0, 0, 0.5); font-size: ${fontSize}px; font-weight: bold; font-family: sans-serif; }
          </style>
          <text x="50%" y="50%" text-anchor="middle" dy=".3em" class="title" transform="rotate(-45, ${width / 2}, ${height / 2})">FAKE</text>
        </svg>
      `;

      await sharp(imagePath)
        .composite([{ input: Buffer.from(svgImage), top: 0, left: 0 }])
        .toFile(derivativePath);

      // 4. Register Derivative Asset
      const derivativeBuffer = fs.readFileSync(derivativePath);
      const derivativeSha256 = crypto.createHash('sha256').update(derivativeBuffer).digest('hex');
      const derivativeSize = fs.statSync(derivativePath).size;

      const derivativeAssetId = await AssetService.registerAsset({
        storagePath: derivativePath,
        sha256: derivativeSha256,
        mimeType: 'image/' + path.extname(derivativePath).toLowerCase().replace('.', ''),
        fileSize: derivativeSize,
        isOriginal: false,
        originalAssetId,
        derivativeKind: 'watermarked',
        derivativeParamsJson: JSON.stringify({
          text: 'FAKE',
          placement: 'center',
          rotation: -45,
          opacity: 0.5,
          applied_at: new Date().toISOString(),
        }),
      });

      console.log(`✅ Processed: ${filename} -> Derivative ${derivativeAssetId}`);
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
