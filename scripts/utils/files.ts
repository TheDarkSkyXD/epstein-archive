import fs from 'fs';
import path from 'path';

/**
 * Common media file extensions by type
 */
export const FILE_EXTENSIONS = {
  audio: ['.mp3', '.m4a', '.wav', '.ogg', '.flac', '.aac'],
  video: ['.mp4', '.mov', '.mkv', '.webm', '.avi'],
  image: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff'],
  document: ['.pdf', '.doc', '.docx', '.txt'],
};

/**
 * Recursively find files with specified extensions in a directory
 */
export function findFiles(dir: string, extensions: string[]): string[] {
  const results: string[] = [];

  if (!fs.existsSync(dir)) {
    return results;
  }

  const normalizedExtensions = extensions.map((ext) => ext.toLowerCase());

  function walk(currentDir: string): void {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (normalizedExtensions.includes(ext)) {
          results.push(fullPath);
        }
      }
    }
  }

  walk(dir);
  return results;
}

/**
 * Find audio files in a directory
 */
export function findAudioFiles(dir: string): string[] {
  return findFiles(dir, FILE_EXTENSIONS.audio);
}

/**
 * Find video files in a directory
 */
export function findVideoFiles(dir: string): string[] {
  return findFiles(dir, FILE_EXTENSIONS.video);
}

/**
 * Find image files in a directory
 */
export function findImageFiles(dir: string): string[] {
  return findFiles(dir, FILE_EXTENSIONS.image);
}

/**
 * Ensure a directory exists, creating it if necessary
 */
export function ensureDir(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Get file size in bytes
 */
export function getFileSize(filePath: string): number {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch {
    return 0;
  }
}

/**
 * Generate a title from a filename by removing extension and replacing separators
 */
export function titleFromFilename(filename: string): string {
  const nameWithoutExt = path.basename(filename, path.extname(filename));
  return nameWithoutExt.replace(/[_-]/g, ' ').replace(/\s+/g, ' ').trim();
}
