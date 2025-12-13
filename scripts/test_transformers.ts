
import { pipeline } from '@xenova/transformers';
import path from 'path';
import fs from 'fs';

// Force CPU backend if needed, though transformers.js runs on CPU by default in Node (via ONNX Runtime)
// We might need 'onnxruntime-node'.

async function main() {
  const imagePath = process.argv[2];
  if (!imagePath) {
    console.error('Usage: npx tsx scripts/test_transformers.ts <path-to-image>');
    process.exit(1);
  }

  if (!fs.existsSync(imagePath)) {
      console.error(`File not found: ${imagePath}`);
      process.exit(1);
  }

  console.log('🚀 Loading model (Xenova/vit-gpt2-image-captioning)...');
  // This will download the model to ./node_modules/@xenova/transformers/.cache by default
  // or ~/.cache/xenova/transformers
  const captioner = await pipeline('image-to-text', 'Xenova/vit-gpt2-image-captioning');

  console.log(`🔍 Analyzing ${path.basename(imagePath)}...`);
  const output = await captioner(imagePath);
  
  console.log('✨ Result:', output);
}

main().catch(err => console.error(err));
