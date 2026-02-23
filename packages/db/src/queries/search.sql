/* @name searchEntities */
SELECT
  e.id,
  e.full_name          AS "fullName",
  e.primary_role       AS "primaryRole",
  e.aliases,
  e.red_flag_rating    AS "redFlagRating",
  ts_rank_cd(e.fts_vector, websearch_to_tsquery('english', :searchTerm!), 32) AS rank
FROM entities e
WHERE e.fts_vector @@ websearch_to_tsquery('english', :searchTerm!)
  AND COALESCE(e.junk_tier, 'clean') = 'clean'
  AND COALESCE(e.quarantine_status, 0) = 0
ORDER BY rank DESC
LIMIT :limit!;

/* @name searchEntitiesPrefix */
SELECT
  e.id,
  e.full_name          AS "fullName",
  e.primary_role       AS "primaryRole",
  e.aliases,
  e.red_flag_rating    AS "redFlagRating",
  ts_rank_cd(e.fts_vector, to_tsquery('english', :searchTerm!), 32) AS rank
FROM entities e
WHERE e.fts_vector @@ to_tsquery('english', :searchTerm!)
  AND COALESCE(e.junk_tier, 'clean') = 'clean'
  AND COALESCE(e.quarantine_status, 0) = 0
ORDER BY rank DESC
LIMIT :limit!;

/* @name searchDocuments */
SELECT
  d.id,
  d.file_name           AS "fileName",
  d.file_path           AS "filePath",
  d.evidence_type       AS "evidenceType",
  d.red_flag_rating     AS "redFlagRating",
  ts_headline('english',
    coalesce(d.title, '') || ' ' || left(coalesce(d.content_refined, ''), 500),
    websearch_to_tsquery('english', :searchTerm!),
    'MaxWords=25,MinWords=8,ShortWord=3,HighlightAll=FALSE,MaxFragments=2'
  ) AS snippet,
  ts_rank_cd(d.fts_vector, websearch_to_tsquery('english', :searchTerm!), 32) AS rank
FROM documents d
WHERE d.fts_vector @@ websearch_to_tsquery('english', :searchTerm!)
  AND (:evidenceType::text IS NULL OR d.evidence_type = :evidenceType::text)
  AND (:minRedFlag::int IS NULL OR d.red_flag_rating >= :minRedFlag::int)
  AND (:maxRedFlag::int IS NULL OR d.red_flag_rating <= :maxRedFlag::int)
ORDER BY rank DESC
LIMIT :limit!;

/* @name searchDocumentsPrefix */
SELECT
  d.id,
  d.file_name           AS "fileName",
  d.file_path           AS "filePath",
  d.evidence_type       AS "evidenceType",
  d.red_flag_rating     AS "redFlagRating",
  ts_headline('english',
    coalesce(d.title, '') || ' ' || left(coalesce(d.content_refined, ''), 500),
    to_tsquery('english', :searchTerm!),
    'MaxWords=25,MinWords=8,ShortWord=3,HighlightAll=FALSE,MaxFragments=2'
  ) AS snippet,
  ts_rank_cd(d.fts_vector, to_tsquery('english', :searchTerm!), 32) AS rank
FROM documents d
WHERE d.fts_vector @@ to_tsquery('english', :searchTerm!)
  AND (:evidenceType::text IS NULL OR d.evidence_type = :evidenceType::text)
  AND (:minRedFlag::int IS NULL OR d.red_flag_rating >= :minRedFlag::int)
  AND (:maxRedFlag::int IS NULL OR d.red_flag_rating <= :maxRedFlag::int)
ORDER BY rank DESC
LIMIT :limit!;

/* @name searchSentences */
SELECT
  s.id,
  s.document_id,
  s.page_id,
  s.sentence_text,
  s.signal_score,
  d.file_name,
  COALESCE(p.page_number, 1) AS page_number,
  ts_headline('english', s.sentence_text, websearch_to_tsquery('english', :searchTerm!),
    'MaxWords=15,MinWords=5') AS snippet
FROM document_sentences s
JOIN documents d ON d.id = s.document_id
LEFT JOIN document_pages p ON p.id = s.page_id
WHERE to_tsvector('english', s.sentence_text) @@ websearch_to_tsquery('english', :searchTerm!)
ORDER BY ts_rank_cd(to_tsvector('english', s.sentence_text), websearch_to_tsquery('english', :searchTerm!), 32) DESC
LIMIT :limit!;
