
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const TARGET_DIR = 'data/media/images/DOJ VOL000001';
const THRESHOLD = 10; // Pixel value < 10 is considered "black"
const MIN_AREA = 1000; // Minimum pixel area to consider a redaction box

async function detectRedactions(filePath: string) {
    const filename = path.basename(filePath);
    
    // 1. Load image and convert to raw pixel data (grayscale)
    const { data, info } = await sharp(filePath)
        .grayscale()
        .raw()
        .toBuffer({ resolveWithObject: true });

    const width = info.width;
    const height = info.height;
    
    // Simple connected component analysis (or just scan for black runs)
    // For a robust "box" detector without OpenCV, we can iterate:
    
    let blackPixels = 0;
    
    // Basic histogram check first: if < 0.1% pixels are black, maybe skip complex analysis
    for (let i = 0; i < data.length; i++) {
        if (data[i] < THRESHOLD) blackPixels++;
    }
    
    const blackRatio = blackPixels / (width * height);
    
    if (blackRatio > 0.005) { // If > 0.5% of image is black
        console.log(`[?] ${filename} has ${blackPixels} black pixels (${(blackRatio*100).toFixed(2)}%) - Possible redactions?`);
        return true;
    }
    
    return false;
}

async function run() {
    const files = fs.readdirSync(TARGET_DIR).filter(f => f.endsWith('.JPG') || f.endsWith('.png'));
    let detected = 0;
    
    console.log(`Scanning ${files.length} images...`);
    
    for (const file of files.slice(0, 20)) { // Test on first 20
        const isRedacted = await detectRedactions(path.join(TARGET_DIR, file));
        if (isRedacted) detected++;
    }
    
    console.log(`Found ${detected} potentially redacted images.`);
}

run();
