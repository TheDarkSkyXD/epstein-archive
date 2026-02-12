CREATE TABLE evidence_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type_name TEXT UNIQUE NOT NULL,
  description TEXT
);
CREATE TABLE sqlite_sequence(name,seq);
CREATE TABLE entity_evidence_types (
  entity_id INTEGER,
  evidence_type_id INTEGER,
  PRIMARY KEY (entity_id, evidence_type_id),
  FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE,
  FOREIGN KEY (evidence_type_id) REFERENCES evidence_types(id) ON DELETE CASCADE
);
CREATE TABLE documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL UNIQUE,
  file_type TEXT,
  file_size INTEGER,
  date_created TEXT,
  date_modified TEXT,
  content_preview TEXT,
  evidence_type TEXT,
  mentions_count INTEGER DEFAULT 0,
  content TEXT,
  metadata_json TEXT,
  word_count INTEGER,
  spice_rating INTEGER,
  content_hash TEXT,
  original_file_id INTEGER,
  original_file_path TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
, source_collection TEXT, red_flag_rating INTEGER, type TEXT, redaction_count INTEGER DEFAULT 0, has_redactions BOOLEAN DEFAULT 0, page_count INTEGER DEFAULT 0, is_sensitive BOOLEAN DEFAULT 0, analyzed_at DATETIME, unredaction_attempted INTEGER DEFAULT 0, unredaction_succeeded INTEGER DEFAULT 0, redaction_coverage_before REAL, redaction_coverage_after REAL, unredacted_text_gain REAL, title TEXT, unredaction_baseline_vocab TEXT, unredacted_span_json TEXT);
CREATE TABLE entity_mentions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_id INTEGER NOT NULL,
  document_id INTEGER NOT NULL,
  mention_context TEXT NOT NULL,
  mention_type TEXT DEFAULT 'mention',
  page_number INTEGER,
  position_in_text INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  context_type TEXT DEFAULT 'mention',
  context_text TEXT DEFAULT '',
  keyword TEXT,
  position_start INTEGER,
  position_end INTEGER,
  significance_score INTEGER DEFAULT 1, confidence_score REAL DEFAULT 1.0 CHECK(confidence_score >= 0.0 AND confidence_score <= 1.0), link_method TEXT DEFAULT 'manual' CHECK(link_method IN ('manual', 'exact_match', 'fuzzy_match', 'alias_match', 'ai_detected')), verified INTEGER DEFAULT 0, verified_by INTEGER, verified_at DATETIME, rejection_reason TEXT,
  FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);
CREATE TABLE timeline_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entity_id INTEGER NOT NULL,
  event_date TEXT,
  event_description TEXT,
  event_type TEXT,
  document_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL
);
CREATE TABLE investigations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',
  owner_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
, collaborator_ids TEXT DEFAULT '[]', scope TEXT);
CREATE TABLE media_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          entity_id INTEGER,
          document_id INTEGER,
          file_path TEXT NOT NULL,
          file_type TEXT,
          title TEXT,
          description TEXT,
          verification_status TEXT DEFAULT 'unverified',
          red_flag_rating INTEGER DEFAULT 1,
          metadata_json TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP, is_sensitive BOOLEAN DEFAULT 0, album_id INTEGER REFERENCES media_albums(id) ON DELETE SET NULL,
          FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE,
          FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE SET NULL
        );
CREATE TABLE investigation_timeline_events (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          investigation_id INTEGER NOT NULL,
          title TEXT,
          description TEXT,
          type TEXT,
          start_date TEXT,
          end_date TEXT,
          entities_json TEXT,
          documents_json TEXT,
          confidence INTEGER,
          importance TEXT,
          tags_json TEXT,
          location_json TEXT,
          sources_json TEXT,
          created_by TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (investigation_id) REFERENCES investigations(id) ON DELETE CASCADE
        );
CREATE TABLE document_forensic_metrics (
          document_id INTEGER PRIMARY KEY,
          metrics_json TEXT,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
        );
CREATE TABLE users (
          id TEXT PRIMARY KEY,
          username TEXT NOT NULL UNIQUE,
          email TEXT,
          role TEXT DEFAULT 'investigator',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_active DATETIME
        , password_hash TEXT);
CREATE TABLE financial_transactions (
           id INTEGER PRIMARY KEY AUTOINCREMENT,
           investigation_id INTEGER,
           from_entity TEXT,
           to_entity TEXT,
           amount REAL,
           currency TEXT DEFAULT 'USD',
           transaction_date TEXT,
           transaction_type TEXT,
           method TEXT,
           risk_level TEXT,
           description TEXT,
           suspicious_indicators TEXT, -- JSON array
           source_document_ids TEXT, -- JSON array
           created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
           FOREIGN KEY (investigation_id) REFERENCES investigations(id) ON DELETE SET NULL
         );
CREATE TABLE articles (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          link TEXT NOT NULL UNIQUE,
          description TEXT,
          content TEXT,
          pub_date TEXT,
          author TEXT,
          source TEXT,
          image_url TEXT,
          guid TEXT UNIQUE,
          red_flag_rating INTEGER DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        , tags TEXT, reading_time TEXT);
CREATE TABLE evidence (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          evidence_type TEXT NOT NULL CHECK(evidence_type IN (
            'court_deposition',
            'court_filing',
            'contact_directory',
            'correspondence',
            'financial_record',
            'investigative_report',
            'testimony',
            'timeline_data',
            'media_scan',
            'evidence_list'
          )),
          source_path TEXT NOT NULL UNIQUE,
          cleaned_path TEXT,
          original_filename TEXT NOT NULL,
          mime_type TEXT,
          title TEXT,
          description TEXT,
          extracted_text TEXT,
          created_at DATETIME,
          modified_at DATETIME,
          ingested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          red_flag_rating INTEGER CHECK(red_flag_rating >= 0 AND red_flag_rating <= 5),
          evidence_tags TEXT, -- JSON array
          metadata_json TEXT, -- Type-specific metadata
          word_count INTEGER,
          file_size INTEGER,
          content_hash TEXT UNIQUE
        , is_sensitive BOOLEAN DEFAULT 0);
CREATE TABLE evidence_entity (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          evidence_id INTEGER NOT NULL,
          entity_id INTEGER NOT NULL,
          role TEXT, -- sender, recipient, mentioned, subject, passenger, deponent, etc.
          confidence REAL CHECK(confidence >= 0.0 AND confidence <= 1.0),
          context_snippet TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (evidence_id) REFERENCES evidence(id) ON DELETE CASCADE,
          FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE,
          UNIQUE(evidence_id, entity_id, role) -- Prevent duplicate links with same role
        );
CREATE TABLE investigation_evidence (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          investigation_id INTEGER NOT NULL,
          evidence_id INTEGER NOT NULL,
          notes TEXT,
          relevance TEXT CHECK(relevance IN ('high', 'medium', 'low')),
          added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          added_by TEXT,
          FOREIGN KEY (evidence_id) REFERENCES evidence(id) ON DELETE CASCADE,
          UNIQUE(investigation_id, evidence_id)
        );
CREATE TABLE IF NOT EXISTS 'evidence_fts_data'(id INTEGER PRIMARY KEY, block BLOB);
CREATE TABLE IF NOT EXISTS 'evidence_fts_idx'(segid, term, pgno, PRIMARY KEY(segid, term)) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS 'evidence_fts_docsize'(id INTEGER PRIMARY KEY, sz BLOB);
CREATE TABLE IF NOT EXISTS 'evidence_fts_config'(k PRIMARY KEY, v) WITHOUT ROWID;
CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  details_json TEXT,
  ip_address TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE schema_migrations (id INTEGER PRIMARY KEY, name TEXT NOT NULL, run_on DATETIME DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS 'documents_fts_data'(id INTEGER PRIMARY KEY, block BLOB);
CREATE TABLE IF NOT EXISTS 'documents_fts_idx'(segid, term, pgno, PRIMARY KEY(segid, term)) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS 'documents_fts_docsize'(id INTEGER PRIMARY KEY, sz BLOB);
CREATE TABLE IF NOT EXISTS 'documents_fts_config'(k PRIMARY KEY, v) WITHOUT ROWID;
CREATE TABLE entity_relationships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_entity_id INTEGER NOT NULL,
    target_entity_id INTEGER NOT NULL,
    relationship_type TEXT,
    strength INTEGER DEFAULT 0,
    confidence REAL DEFAULT 1.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(source_entity_id, target_entity_id, relationship_type)
  );
CREATE TABLE media_albums (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  cover_image_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  date_modified DATETIME DEFAULT CURRENT_TIMESTAMP
, is_sensitive BOOLEAN DEFAULT 0);
CREATE TABLE media_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL,
  original_filename TEXT,
  path TEXT NOT NULL,
  thumbnail_path TEXT,
  title TEXT,
  description TEXT,
  album_id INTEGER,
  width INTEGER,
  height INTEGER,
  file_size INTEGER,
  format TEXT,
  date_taken DATETIME,
  date_added DATETIME DEFAULT CURRENT_TIMESTAMP,
  camera_make TEXT,
  camera_model TEXT,
  lens TEXT,
  focal_length REAL,
  aperture REAL,
  shutter_speed TEXT,
  iso INTEGER,
  latitude REAL,
  longitude REAL,
  color_profile TEXT,
  orientation INTEGER, tags TEXT, is_sensitive BOOLEAN DEFAULT 0,
  FOREIGN KEY (album_id) REFERENCES media_albums(id) ON DELETE SET NULL
);
CREATE TABLE tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  color TEXT DEFAULT '#6366f1'
);
CREATE TABLE image_tags (
  image_id INTEGER,
  tag_id INTEGER,
  PRIMARY KEY (image_id, tag_id),
  FOREIGN KEY (image_id) REFERENCES media_images(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);
CREATE TABLE media_people (
  media_id INTEGER,
  entity_id INTEGER,
  PRIMARY KEY (media_id, entity_id),
  FOREIGN KEY (media_id) REFERENCES media_images(id) ON DELETE CASCADE,
  FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS 'media_images_fts_data'(id INTEGER PRIMARY KEY, block BLOB);
CREATE TABLE IF NOT EXISTS 'media_images_fts_idx'(segid, term, pgno, PRIMARY KEY(segid, term)) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS 'media_images_fts_docsize'(id INTEGER PRIMARY KEY, sz BLOB);
CREATE TABLE IF NOT EXISTS 'media_images_fts_config'(k PRIMARY KEY, v) WITHOUT ROWID;
CREATE TABLE black_book_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  person_id INTEGER,
  entry_text TEXT,
  phone_numbers TEXT,
  addresses TEXT,
  email_addresses TEXT,
  notes TEXT,
  page_number INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (person_id) REFERENCES entities(id) ON DELETE CASCADE
);
CREATE TABLE global_timeline_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  date DATE NOT NULL,
  description TEXT,
  type TEXT CHECK(type IN ('email', 'flight', 'legal', 'financial', 'testimony', 'incident', 'other')) DEFAULT 'other',
  significance TEXT CHECK(significance IN ('high', 'medium', 'low')) DEFAULT 'medium',
  entities TEXT, -- JSON array of strings
  related_document_id INTEGER REFERENCES documents(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
, source TEXT);
CREATE TABLE document_redactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL,
  page_number INTEGER NOT NULL,
  x0 REAL NOT NULL,
  y0 REAL NOT NULL,
  x1 REAL NOT NULL,
  y1 REAL NOT NULL,
  width REAL,
  height REAL,
  area REAL,
  redaction_type TEXT NOT NULL CHECK(redaction_type IN ('visual_redaction', 'text_gap')),
  confidence TEXT NOT NULL CHECK(confidence IN ('high', 'medium', 'low')),
  detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
);
CREATE TABLE media_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  category TEXT,
  color TEXT DEFAULT '#6366f1'
);
CREATE TABLE media_image_tags (
  image_id INTEGER,
  tag_id INTEGER,
  PRIMARY KEY (image_id, tag_id),
  FOREIGN KEY (image_id) REFERENCES media_images(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES media_tags(id) ON DELETE CASCADE
);
CREATE TABLE chain_of_custody (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          evidence_id INTEGER NOT NULL,
          date DATETIME NOT NULL,
          actor TEXT,
          action TEXT,
          notes TEXT,
          signature TEXT,
          FOREIGN KEY (evidence_id) REFERENCES evidence(id) ON DELETE CASCADE
        );
CREATE TABLE investigation_hypotheses (id INTEGER PRIMARY KEY AUTOINCREMENT, investigation_id INTEGER, title TEXT, description TEXT, status TEXT, confidence INTEGER, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (investigation_id) REFERENCES investigations(id) ON DELETE CASCADE);
CREATE TABLE entities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  full_name TEXT NOT NULL,
  primary_role TEXT,
  secondary_roles TEXT,
  likelihood_level TEXT,
  mentions INTEGER DEFAULT 0,
  current_status TEXT,
  connections_summary TEXT,
  spice_rating INTEGER,
  spice_score INTEGER DEFAULT 0,
  title TEXT,
  role TEXT,
  date_taken DATETIME,
  date_added DATETIME DEFAULT CURRENT_TIMESTAMP,
  date_modified DATETIME,
  title_variants TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  risk_factor INTEGER DEFAULT 0,
  entity_type TEXT DEFAULT 'Person',
  red_flag_rating INTEGER,
  red_flag_score INTEGER DEFAULT 0,
  aliases TEXT DEFAULT NULL
, type TEXT DEFAULT 'Person', entity_category TEXT, risk_level TEXT CHECK(risk_level IN ('high', 'medium', 'low', NULL)), red_flag_description TEXT, death_date TEXT, notes TEXT, codename TEXT, bio TEXT, birth_date TEXT);
CREATE TABLE IF NOT EXISTS 'entities_fts_data'(id INTEGER PRIMARY KEY, block BLOB);
CREATE TABLE IF NOT EXISTS 'entities_fts_idx'(segid, term, pgno, PRIMARY KEY(segid, term)) WITHOUT ROWID;
CREATE TABLE IF NOT EXISTS 'entities_fts_docsize'(id INTEGER PRIMARY KEY, sz BLOB);
CREATE TABLE IF NOT EXISTS 'entities_fts_config'(k PRIMARY KEY, v) WITHOUT ROWID;
CREATE TABLE media_item_people (
  media_item_id INTEGER,
  entity_id INTEGER,
  PRIMARY KEY (media_item_id, entity_id),
  FOREIGN KEY (media_item_id) REFERENCES media_items(id) ON DELETE CASCADE,
  FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE
);
CREATE TABLE media_item_tags (
  media_item_id INTEGER,
  tag_id INTEGER,
  PRIMARY KEY (media_item_id, tag_id),
  FOREIGN KEY (media_item_id) REFERENCES media_items(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES media_tags(id) ON DELETE CASCADE
);
CREATE TABLE media_album_items (
  album_id INTEGER,
  media_item_id INTEGER,
  "order" INTEGER DEFAULT 0,
  added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (album_id, media_item_id),
  FOREIGN KEY (album_id) REFERENCES media_albums(id) ON DELETE CASCADE,
  FOREIGN KEY (media_item_id) REFERENCES media_items(id) ON DELETE CASCADE
);
CREATE TABLE document_collections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    investigation_id INTEGER,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_archived INTEGER DEFAULT 0,
    metadata_json TEXT,
    FOREIGN KEY (investigation_id) REFERENCES investigations(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);
CREATE TABLE collection_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    collection_id INTEGER NOT NULL,
    document_id INTEGER NOT NULL,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    added_by INTEGER,
    notes TEXT,
    sort_order INTEGER DEFAULT 0,
    FOREIGN KEY (collection_id) REFERENCES document_collections(id) ON DELETE CASCADE,
    FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
    FOREIGN KEY (added_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE(collection_id, document_id)
);
CREATE TABLE cleanup_audit (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name TEXT NOT NULL,
    record_id INTEGER NOT NULL,
    operation TEXT CHECK(operation IN ('DELETE', 'UPDATE', 'MERGE')) NOT NULL,
    before_data TEXT NOT NULL, 
    after_data TEXT, 
    deleted_by INTEGER,
    deleted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    reason TEXT,
    is_rolled_back INTEGER DEFAULT 0,
    rolled_back_at DATETIME,
    rolled_back_by INTEGER,
    metadata_json TEXT,
    FOREIGN KEY (deleted_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (rolled_back_by) REFERENCES users(id) ON DELETE SET NULL
);
CREATE TABLE entity_link_candidates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL,
  mention_text TEXT NOT NULL,
  mention_context TEXT,
  start_offset INTEGER,
  end_offset INTEGER,
  candidate_entity_id INTEGER NOT NULL,
  confidence_score REAL NOT NULL CHECK(confidence_score >= 0.0 AND confidence_score <= 1.0),
  match_method TEXT CHECK(match_method IN ('exact', 'fuzzy', 'alias', 'ai', 'pattern')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  processed INTEGER DEFAULT 0,
  accepted INTEGER DEFAULT 0,
  rejected INTEGER DEFAULT 0,
  reviewed_by INTEGER,
  reviewed_at DATETIME,
  notes TEXT,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  FOREIGN KEY (candidate_entity_id) REFERENCES entities(id) ON DELETE CASCADE,
  FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
);
CREATE TABLE entity_link_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  config_key TEXT UNIQUE NOT NULL,
  config_value TEXT NOT NULL,
  description TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_by INTEGER,
  FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
);
CREATE TABLE investigation_notebook (
          investigation_id INTEGER PRIMARY KEY,
          order_json TEXT,
          annotations_json TEXT,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (investigation_id) REFERENCES investigations(id) ON DELETE CASCADE
        );
CREATE TABLE flights (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    departure_airport TEXT NOT NULL,
    departure_city TEXT,
    departure_country TEXT,
    arrival_airport TEXT NOT NULL,
    arrival_city TEXT,
    arrival_country TEXT,
    aircraft_tail TEXT DEFAULT 'N908JE',
    aircraft_type TEXT DEFAULT 'Boeing 727',
    pilot TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
CREATE TABLE flight_passengers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    flight_id INTEGER NOT NULL,
    passenger_name TEXT NOT NULL,
    role TEXT DEFAULT 'passenger',
    entity_id INTEGER,
    FOREIGN KEY (flight_id) REFERENCES flights(id) ON DELETE CASCADE,
    FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE SET NULL
  );
CREATE TABLE palm_beach_properties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pcn TEXT UNIQUE,
    owner_name_1 TEXT,
    owner_name_2 TEXT,
    street_name TEXT,
    site_address TEXT,
    total_tax_value REAL,
    acres REAL,
    property_use TEXT,
    year_built INTEGER,
    bedrooms INTEGER,
    full_bathrooms INTEGER,
    half_bathrooms INTEGER,
    stories REAL,
    building_value REAL,
    building_area INTEGER,
    living_area INTEGER,
    is_epstein_property INTEGER DEFAULT 0,
    is_known_associate INTEGER DEFAULT 0,
    linked_entity_id INTEGER,
    source_file TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (linked_entity_id) REFERENCES entities(id) ON DELETE SET NULL
  );
CREATE TABLE hypotheses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    investigation_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'draft', 
    confidence INTEGER DEFAULT 50,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(investigation_id) REFERENCES investigations(id) ON DELETE CASCADE
);
CREATE TABLE hypothesis_evidence (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hypothesis_id INTEGER NOT NULL,
    evidence_id INTEGER NOT NULL,
    relevance TEXT DEFAULT 'supporting', 
    weight INTEGER DEFAULT 5,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(hypothesis_id) REFERENCES hypotheses(id) ON DELETE CASCADE,
    FOREIGN KEY(evidence_id) REFERENCES evidence(id) ON DELETE CASCADE
);
CREATE TABLE investigation_activity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    investigation_id INTEGER NOT NULL,
    user_id TEXT,
    user_name TEXT,
    action_type TEXT NOT NULL,
    target_type TEXT,
    target_id TEXT,
    target_title TEXT,
    metadata_json TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (investigation_id) REFERENCES investigations(id) ON DELETE CASCADE
);
CREATE TABLE sqlite_stat1(tbl,idx,stat);
CREATE INDEX idx_media_items_entity ON media_items(entity_id);
CREATE INDEX idx_media_items_red_flag ON media_items(red_flag_rating DESC);
CREATE INDEX idx_evidence_type ON evidence(evidence_type);
CREATE INDEX idx_evidence_created_at ON evidence(created_at);
CREATE INDEX idx_evidence_red_flag ON evidence(red_flag_rating);
CREATE INDEX idx_evidence_entity_evidence ON evidence_entity(evidence_id);
CREATE INDEX idx_evidence_entity_entity ON evidence_entity(entity_id);
CREATE INDEX idx_evidence_entity_role ON evidence_entity(role);
CREATE INDEX idx_investigation_evidence_investigation ON investigation_evidence(investigation_id);
CREATE INDEX idx_investigation_evidence_evidence ON investigation_evidence(evidence_id);
CREATE INDEX idx_forensic_doc ON document_forensic_metrics(document_id);
CREATE INDEX idx_mentions_entity ON entity_mentions(entity_id);
CREATE INDEX idx_mentions_document ON entity_mentions(document_id);
CREATE INDEX idx_documents_type_rating ON documents(evidence_type, red_flag_rating DESC);
CREATE INDEX idx_documents_file_type ON documents(file_type);
CREATE INDEX idx_relationships_source_type ON entity_relationships(source_entity_id, relationship_type);
CREATE INDEX idx_relationships_target_type ON entity_relationships(target_entity_id, relationship_type);
CREATE INDEX idx_investigations_status ON investigations(status, created_at DESC);
CREATE INDEX idx_investigation_evidence ON investigation_evidence(investigation_id);
CREATE INDEX idx_audit_log_timestamp ON audit_log(timestamp DESC);
CREATE INDEX idx_redactions_document ON document_redactions(document_id);
CREATE INDEX idx_redactions_page ON document_redactions(document_id, page_number);
CREATE INDEX idx_redactions_type ON document_redactions(redaction_type);
CREATE INDEX idx_entities_type_rating ON entities(entity_type, red_flag_rating DESC);
CREATE INDEX idx_entities_full_name ON entities(full_name);
CREATE INDEX idx_media_items_album ON media_items(album_id);
CREATE INDEX idx_media_item_people_item ON media_item_people(media_item_id);
CREATE INDEX idx_media_item_people_entity ON media_item_people(entity_id);
CREATE INDEX idx_media_item_tags_item ON media_item_tags(media_item_id);
CREATE INDEX idx_media_item_tags_tag ON media_item_tags(tag_id);
CREATE INDEX idx_document_collections_investigation ON document_collections(investigation_id);
CREATE INDEX idx_collection_documents_collection ON collection_documents(collection_id);
CREATE INDEX idx_collection_documents_document ON collection_documents(document_id);
CREATE INDEX idx_collection_documents_sort ON collection_documents(collection_id, sort_order);
CREATE INDEX idx_cleanup_audit_table ON cleanup_audit(table_name);
CREATE INDEX idx_cleanup_audit_record ON cleanup_audit(table_name, record_id);
CREATE INDEX idx_cleanup_audit_deleted_at ON cleanup_audit(deleted_at DESC);
CREATE INDEX idx_cleanup_audit_deleted_by ON cleanup_audit(deleted_by);
CREATE INDEX idx_cleanup_audit_rollback ON cleanup_audit(is_rolled_back);
CREATE INDEX idx_entity_mentions_verified_by
  ON entity_mentions(verified_by);
CREATE INDEX idx_entity_mentions_confidence
  ON entity_mentions(confidence_score);
CREATE INDEX idx_entity_mentions_verified
  ON entity_mentions(verified);
CREATE INDEX idx_entity_mentions_auto_unverified
  ON entity_mentions(link_method, verified, confidence_score);
CREATE INDEX idx_link_candidates_document
  ON entity_link_candidates(document_id);
CREATE INDEX idx_link_candidates_entity
  ON entity_link_candidates(candidate_entity_id);
CREATE INDEX idx_link_candidates_processed
  ON entity_link_candidates(processed, confidence_score DESC);
CREATE INDEX idx_link_candidates_pending
  ON entity_link_candidates(processed, accepted, rejected);
CREATE INDEX idx_entities_rating_mentions_name
ON entities(red_flag_rating DESC, mentions DESC, full_name ASC);
CREATE INDEX idx_entity_mentions_entity_id
ON entity_mentions(entity_id);
CREATE INDEX idx_entity_mentions_document_id
ON entity_mentions(document_id);
CREATE INDEX idx_entity_mentions_entity_doc ON entity_mentions(entity_id, document_id);
CREATE INDEX idx_documents_evidence_type ON documents(evidence_type);
CREATE INDEX idx_flights_date ON flights(date);
CREATE INDEX idx_flight_passengers_flight ON flight_passengers(flight_id);
CREATE INDEX idx_flight_passengers_name ON flight_passengers(passenger_name);
CREATE INDEX idx_properties_owner ON palm_beach_properties(owner_name_1);
CREATE INDEX idx_properties_pcn ON palm_beach_properties(pcn);
CREATE INDEX idx_properties_value ON palm_beach_properties(total_tax_value);
CREATE INDEX idx_entities_type ON entities(type);
CREATE INDEX idx_entities_category ON entities(entity_category);
CREATE INDEX idx_entities_risk_level ON entities(risk_level);
CREATE INDEX idx_documents_title ON documents(title);
CREATE INDEX idx_investigation_activity_inv ON investigation_activity(investigation_id);
CREATE INDEX idx_investigation_activity_date ON investigation_activity(created_at DESC);
CREATE INDEX idx_entities_death_date ON entities(death_date);
CREATE INDEX idx_entities_mentions_ranking ON entities(mentions DESC, red_flag_rating DESC);
CREATE INDEX idx_entities_primary_role ON entities(primary_role);
CREATE VIRTUAL TABLE evidence_fts USING fts5(
          title,
          description,
          extracted_text,
          evidence_type,
          evidence_tags,
          content='evidence',
          content_rowid='id'
        )
/* evidence_fts(title,description,extracted_text,evidence_type,evidence_tags) */;
CREATE VIRTUAL TABLE documents_fts USING fts5(
  file_name,
  content_preview,
  evidence_type,
  content,
  content='documents',
  content_rowid='id'
)
/* documents_fts(file_name,content_preview,evidence_type,content) */;
CREATE VIRTUAL TABLE media_images_fts USING fts5(
  title,
  description,
  tags,
  content='media_images',
  content_rowid='id'
)
/* media_images_fts(title,description,tags) */;
CREATE VIEW evidence_summary AS
      SELECT 
        e.id,
        e.evidence_type,
        e.title,
        e.original_filename,
        e.created_at,
        e.red_flag_rating,
        e.word_count,
        e.file_size,
        COUNT(DISTINCT ee.entity_id) as entity_count,
        GROUP_CONCAT(DISTINCT ent.full_name) as entity_names
      FROM evidence e
      LEFT JOIN evidence_entity ee ON e.id = ee.evidence_id
      LEFT JOIN entities ent ON ee.entity_id = ent.id
      GROUP BY e.id
/* evidence_summary(id,evidence_type,title,original_filename,created_at,red_flag_rating,word_count,file_size,entity_count,entity_names) */;
CREATE VIEW document_redaction_stats AS
SELECT 
  d.id,
  d.filename,
  d.file_path,
  d.redaction_count,
  d.has_redactions,
  COUNT(dr.id) as actual_redaction_count,
  SUM(CASE WHEN dr.redaction_type = 'visual_redaction' THEN 1 ELSE 0 END) as visual_redactions,
  SUM(CASE WHEN dr.redaction_type = 'text_gap' THEN 1 ELSE 0 END) as text_gaps,
  MAX(dr.page_number) as max_redacted_page
FROM documents d
LEFT JOIN document_redactions dr ON d.id = dr.document_id
WHERE d.has_redactions = 1
GROUP BY d.id;
CREATE TRIGGER documents_fts_insert AFTER INSERT ON documents BEGIN
  INSERT INTO documents_fts(rowid, file_name, content_preview, evidence_type, content)
  VALUES (NEW.id, NEW.file_name, NEW.content_preview, NEW.evidence_type, NEW.content);
END;
CREATE TRIGGER documents_fts_update AFTER UPDATE ON documents BEGIN
  UPDATE documents_fts SET 
    file_name = NEW.file_name,
    content_preview = NEW.content_preview,
    evidence_type = NEW.evidence_type,
    content = NEW.content
  WHERE rowid = OLD.id;
END;
CREATE TRIGGER documents_fts_delete AFTER DELETE ON documents BEGIN
  DELETE FROM documents_fts WHERE rowid = OLD.id;
END;
CREATE TRIGGER evidence_fts_insert AFTER INSERT ON evidence BEGIN
        INSERT INTO evidence_fts(rowid, title, description, extracted_text, evidence_type, evidence_tags)
        VALUES (NEW.id, NEW.title, NEW.description, NEW.extracted_text, NEW.evidence_type, NEW.evidence_tags);
      END;
CREATE TRIGGER evidence_fts_update AFTER UPDATE ON evidence BEGIN
        UPDATE evidence_fts SET 
          title = NEW.title,
          description = NEW.description,
          extracted_text = NEW.extracted_text,
          evidence_type = NEW.evidence_type,
          evidence_tags = NEW.evidence_tags
        WHERE rowid = OLD.id;
      END;
CREATE TRIGGER evidence_fts_delete AFTER DELETE ON evidence BEGIN
        DELETE FROM evidence_fts WHERE rowid = OLD.id;
      END;
CREATE TRIGGER media_images_ad AFTER DELETE ON media_images BEGIN
  DELETE FROM media_images_fts WHERE rowid = old.id;
END;
CREATE VIRTUAL TABLE entities_fts USING fts5(full_name, primary_role, connections_summary, secondary_roles, content='entities', content_rowid='id')
/* entities_fts(full_name,primary_role,connections_summary,secondary_roles) */;
CREATE TRIGGER entities_fts_insert AFTER INSERT ON entities BEGIN
        INSERT INTO entities_fts(rowid, full_name, primary_role, connections_summary, secondary_roles) VALUES (NEW.id, NEW.full_name, NEW.primary_role, NEW.connections_summary, NEW.secondary_roles);
    END;
CREATE TRIGGER entities_fts_update AFTER UPDATE ON entities BEGIN
        UPDATE entities_fts SET full_name = NEW.full_name, primary_role = NEW.primary_role, connections_summary = NEW.connections_summary, secondary_roles = NEW.secondary_roles WHERE rowid = OLD.id;
    END;
CREATE TRIGGER entities_fts_delete AFTER DELETE ON entities BEGIN
        DELETE FROM entities_fts WHERE rowid = OLD.id;
    END;
CREATE TABLE document_spans (
  id TEXT PRIMARY KEY,
  document_id INTEGER,
  page_num INTEGER,
  span_start_char INTEGER,
  span_end_char INTEGER,
  raw_text TEXT,
  cleaned_text TEXT,
  ocr_confidence REAL,
  layout_json TEXT,
  FOREIGN KEY (document_id) REFERENCES documents(id)
);
CREATE TABLE mentions (
  id TEXT PRIMARY KEY,
  document_id INTEGER,
  span_id TEXT,
  mention_start_char INTEGER,
  mention_end_char INTEGER,
  surface_text TEXT,
  normalised_text TEXT,
  entity_type TEXT,
  ner_model TEXT,
  ner_confidence REAL,
  context_window_before TEXT,
  context_window_after TEXT,
  sentence_id TEXT,
  paragraph_id TEXT,
  extracted_features_json TEXT,
  FOREIGN KEY (document_id) REFERENCES documents(id),
  FOREIGN KEY (span_id) REFERENCES document_spans(id)
);
CREATE TABLE resolution_candidates (
  id TEXT PRIMARY KEY,
  left_entity_id INTEGER,
  right_entity_id INTEGER,
  mention_id TEXT,
  candidate_type TEXT,
  score REAL,
  feature_vector_json TEXT,
  decision TEXT,
  decided_at DATETIME,
  decided_by TEXT,
  FOREIGN KEY (left_entity_id) REFERENCES entities(id),
  FOREIGN KEY (right_entity_id) REFERENCES entities(id),
  FOREIGN KEY (mention_id) REFERENCES mentions(id)
);
CREATE VIEW entity_summary AS
      SELECT 
          e.id,
          e.full_name,
          e.primary_role,
          e.likelihood_level,
          e.mentions,
          e.red_flag_rating,
          e.red_flag_score,
          e.title as entity_type,
          e.title,
          e.role,
          e.title_variants,
          (
            SELECT GROUP_CONCAT(type_name)
            FROM (
              SELECT DISTINCT et.type_name AS type_name
              FROM entity_evidence_types eet2
              JOIN evidence_types et ON eet2.evidence_type_id = et.id
              WHERE eet2.entity_id = e.id
            ) AS distinct_types
          ) AS evidence_types,
          0 as document_count,
          0 as mention_count
      FROM entities e
      GROUP BY e.id
/* entity_summary(id,full_name,primary_role,likelihood_level,mentions,red_flag_rating,red_flag_score,entity_type,title,role,title_variants,evidence_types,document_count,mention_count) */;
