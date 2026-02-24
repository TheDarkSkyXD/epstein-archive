exports.noTransaction = true;

exports.up = (pgm) => {
  pgm.sql(`
    SET client_min_messages = warning;

    UPDATE documents
    SET
      file_type = CASE
        WHEN (file_type IS NULL OR BTRIM(file_type) = '') THEN CASE
          WHEN LOWER(COALESCE(file_name, '')) ~ '\\.(jpg|jpeg)$' OR LOWER(COALESCE(file_path, '')) ~ '\\.(jpg|jpeg)$' THEN 'image/jpeg'
          WHEN LOWER(COALESCE(file_name, '')) ~ '\\.(png)$' OR LOWER(COALESCE(file_path, '')) ~ '\\.(png)$' THEN 'image/png'
          WHEN LOWER(COALESCE(file_name, '')) ~ '\\.(gif)$' OR LOWER(COALESCE(file_path, '')) ~ '\\.(gif)$' THEN 'image/gif'
          WHEN LOWER(COALESCE(file_name, '')) ~ '\\.(webp)$' OR LOWER(COALESCE(file_path, '')) ~ '\\.(webp)$' THEN 'image/webp'
          WHEN LOWER(COALESCE(file_name, '')) ~ '\\.(tif|tiff)$' OR LOWER(COALESCE(file_path, '')) ~ '\\.(tif|tiff)$' THEN 'image/tiff'
          WHEN LOWER(COALESCE(file_name, '')) ~ '\\.(bmp)$' OR LOWER(COALESCE(file_path, '')) ~ '\\.(bmp)$' THEN 'image/bmp'
          WHEN LOWER(COALESCE(file_name, '')) ~ '\\.(svg)$' OR LOWER(COALESCE(file_path, '')) ~ '\\.(svg)$' THEN 'image/svg+xml'
          WHEN LOWER(COALESCE(file_name, '')) ~ '\\.(mp4|m4v)$' OR LOWER(COALESCE(file_path, '')) ~ '\\.(mp4|m4v)$' THEN 'video/mp4'
          WHEN LOWER(COALESCE(file_name, '')) ~ '\\.(mov)$' OR LOWER(COALESCE(file_path, '')) ~ '\\.(mov)$' THEN 'video/quicktime'
          WHEN LOWER(COALESCE(file_name, '')) ~ '\\.(avi)$' OR LOWER(COALESCE(file_path, '')) ~ '\\.(avi)$' THEN 'video/x-msvideo'
          WHEN LOWER(COALESCE(file_name, '')) ~ '\\.(webm)$' OR LOWER(COALESCE(file_path, '')) ~ '\\.(webm)$' THEN 'video/webm'
          WHEN LOWER(COALESCE(file_name, '')) ~ '\\.(mp3)$' OR LOWER(COALESCE(file_path, '')) ~ '\\.(mp3)$' THEN 'audio/mpeg'
          WHEN LOWER(COALESCE(file_name, '')) ~ '\\.(m4a)$' OR LOWER(COALESCE(file_path, '')) ~ '\\.(m4a)$' THEN 'audio/mp4'
          WHEN LOWER(COALESCE(file_name, '')) ~ '\\.(wav)$' OR LOWER(COALESCE(file_path, '')) ~ '\\.(wav)$' THEN 'audio/wav'
          WHEN LOWER(COALESCE(file_name, '')) ~ '\\.(ogg)$' OR LOWER(COALESCE(file_path, '')) ~ '\\.(ogg)$' THEN 'audio/ogg'
          WHEN LOWER(COALESCE(file_name, '')) ~ '\\.(pdf)$' OR LOWER(COALESCE(file_path, '')) ~ '\\.(pdf)$' THEN 'application/pdf'
          WHEN LOWER(COALESCE(file_name, '')) ~ '\\.(txt)$' OR LOWER(COALESCE(file_path, '')) ~ '\\.(txt)$' THEN 'text/plain'
          WHEN LOWER(COALESCE(file_name, '')) ~ '\\.(html|htm)$' OR LOWER(COALESCE(file_path, '')) ~ '\\.(html|htm)$' THEN 'text/html'
          WHEN LOWER(COALESCE(file_name, '')) ~ '\\.(csv)$' OR LOWER(COALESCE(file_path, '')) ~ '\\.(csv)$' THEN 'text/csv'
          WHEN LOWER(COALESCE(file_name, '')) ~ '\\.(json)$' OR LOWER(COALESCE(file_path, '')) ~ '\\.(json)$' THEN 'application/json'
          WHEN LOWER(COALESCE(file_name, '')) ~ '\\.(doc)$' OR LOWER(COALESCE(file_path, '')) ~ '\\.(doc)$' THEN 'application/msword'
          WHEN LOWER(COALESCE(file_name, '')) ~ '\\.(docx)$' OR LOWER(COALESCE(file_path, '')) ~ '\\.(docx)$' THEN 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          WHEN LOWER(COALESCE(file_name, '')) ~ '\\.(xls)$' OR LOWER(COALESCE(file_path, '')) ~ '\\.(xls)$' THEN 'application/vnd.ms-excel'
          WHEN LOWER(COALESCE(file_name, '')) ~ '\\.(xlsx)$' OR LOWER(COALESCE(file_path, '')) ~ '\\.(xlsx)$' THEN 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          WHEN LOWER(COALESCE(file_name, '')) ~ '\\.(eml)$' OR LOWER(COALESCE(file_path, '')) ~ '\\.(eml)$' THEN 'message/rfc822'
          WHEN LOWER(COALESCE(file_name, '')) ~ '\\.(msg)$' OR LOWER(COALESCE(file_path, '')) ~ '\\.(msg)$' THEN 'application/vnd.ms-outlook'
          ELSE 'application/octet-stream'
        END
        ELSE file_type
      END,
      evidence_type = CASE
        WHEN (evidence_type IS NULL OR BTRIM(evidence_type) = '') THEN CASE
          WHEN LOWER(COALESCE(file_type, '')) LIKE 'image/%'
            OR LOWER(COALESCE(file_type, '')) LIKE 'video/%'
            OR LOWER(COALESCE(file_type, '')) LIKE 'audio/%'
            OR LOWER(COALESCE(file_name, '')) ~ '\\.(jpg|jpeg|png|gif|webp|tif|tiff|bmp|svg|mp4|m4v|mov|avi|webm|mp3|m4a|wav|ogg)$'
            OR LOWER(COALESCE(file_path, '')) ~ '\\.(jpg|jpeg|png|gif|webp|tif|tiff|bmp|svg|mp4|m4v|mov|avi|webm|mp3|m4a|wav|ogg)$'
            THEN 'media'
          WHEN LOWER(COALESCE(file_name, '')) ~ '\\.(eml|msg)$'
            OR LOWER(COALESCE(file_path, '')) LIKE '%/email%'
            OR LOWER(COALESCE(file_path, '')) LIKE '%/emails%'
            THEN 'email'
          WHEN LOWER(COALESCE(file_path, '')) LIKE '%black%book%' THEN 'black_book'
          WHEN LOWER(COALESCE(file_path, '')) LIKE '%flight%' THEN 'flight'
          ELSE 'document'
        END
        ELSE evidence_type
      END
    WHERE (file_type IS NULL OR BTRIM(file_type) = '')
       OR (evidence_type IS NULL OR BTRIM(evidence_type) = '');
  `);
};

exports.down = () => {
  // Irreversible data backfill
};
