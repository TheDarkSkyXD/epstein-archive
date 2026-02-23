-- Backfill missing file_type in media_items based on file extensions
BEGIN;

-- Update JPEG images
UPDATE media_items 
SET file_type = 'image/jpeg' 
WHERE file_type IS NULL 
AND (file_path ILIKE '%.jpg' OR file_path ILIKE '%.jpeg');

-- Update PNG images
UPDATE media_items 
SET file_type = 'image/png' 
WHERE file_type IS NULL 
AND file_path ILIKE '%.png';

-- Update GIF images
UPDATE media_items 
SET file_type = 'image/gif' 
WHERE file_type IS NULL 
AND file_path ILIKE '%.gif';

-- Update MP3 audio
UPDATE media_items 
SET file_type = 'audio/mpeg' 
WHERE file_type IS NULL 
AND file_path ILIKE '%.mp3';

-- Update M4A audio
UPDATE media_items 
SET file_type = 'audio/mp4' 
WHERE file_type IS NULL 
AND file_path ILIKE '%.m4a';

-- Update Video
UPDATE media_items 
SET file_type = 'video/mp4' 
WHERE file_type IS NULL 
AND (file_path ILIKE '%.mp4' OR file_path ILIKE '%.mov');

-- Update WEBP images
UPDATE media_items 
SET file_type = 'image/webp' 
WHERE file_type IS NULL 
AND file_path ILIKE '%.webp';

-- Update PDF documents
UPDATE media_items 
SET file_type = 'application/pdf' 
WHERE file_type IS NULL 
AND file_path ILIKE '%.pdf';

-- Update Text documents
UPDATE media_items 
SET file_type = 'text/plain' 
WHERE file_type IS NULL 
AND file_path ILIKE '%.txt';

COMMIT;
