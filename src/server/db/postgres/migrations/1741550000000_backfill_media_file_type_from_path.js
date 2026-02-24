/* eslint-disable no-undef */

export async function up(pgm) {
  pgm.sql(`
    UPDATE media_items
    SET file_type = CASE
      WHEN lower(reverse(split_part(reverse(file_path), '.', 1))) IN ('jpg','jpeg','png','gif','webp','bmp','tif','tiff','heic','avif') THEN
        'image/' || CASE lower(reverse(split_part(reverse(file_path), '.', 1)))
          WHEN 'jpg' THEN 'jpeg'
          ELSE lower(reverse(split_part(reverse(file_path), '.', 1)))
        END
      WHEN lower(reverse(split_part(reverse(file_path), '.', 1))) IN ('mp4','mov','m4v','webm','avi','mkv') THEN
        'video/' || CASE lower(reverse(split_part(reverse(file_path), '.', 1)))
          WHEN 'mov' THEN 'quicktime'
          WHEN 'mkv' THEN 'x-matroska'
          ELSE lower(reverse(split_part(reverse(file_path), '.', 1)))
        END
      WHEN lower(reverse(split_part(reverse(file_path), '.', 1))) IN ('mp3','m4a','wav','ogg','flac','aac') THEN
        'audio/' || CASE lower(reverse(split_part(reverse(file_path), '.', 1)))
          WHEN 'm4a' THEN 'mp4'
          ELSE lower(reverse(split_part(reverse(file_path), '.', 1)))
        END
      ELSE file_type
    END
    WHERE (file_type IS NULL OR btrim(file_type) = '')
      AND file_path IS NOT NULL
      AND btrim(file_path) <> '';
  `);
}

export async function down(_pgm) {
  // Irreversible data backfill. Intentionally no-op.
}
