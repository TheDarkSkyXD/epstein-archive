-- Hypotheses table
CREATE TABLE IF NOT EXISTS hypotheses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    investigation_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'draft', -- draft, testing, supported, refuted
    confidence INTEGER DEFAULT 50,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(investigation_id) REFERENCES investigations(id) ON DELETE CASCADE
);

-- Link between Hypotheses and Evidence
CREATE TABLE IF NOT EXISTS hypothesis_evidence (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    hypothesis_id INTEGER NOT NULL,
    evidence_id INTEGER NOT NULL,
    relevance TEXT DEFAULT 'supporting', -- supporting, contradicting, neutral
    weight INTEGER DEFAULT 5,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(hypothesis_id) REFERENCES hypotheses(id) ON DELETE CASCADE,
    FOREIGN KEY(evidence_id) REFERENCES evidence(id) ON DELETE CASCADE
);

-- Investigation Notebook (Narrative/Ordering)
CREATE TABLE IF NOT EXISTS investigation_notebook (
    investigation_id INTEGER PRIMARY KEY,
    order_json TEXT DEFAULT '[]', -- JSON array of evidence IDs representing the narrative order
    annotations_json TEXT DEFAULT '[]', -- JSON array of specific annotations/notes for the notebook
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(investigation_id) REFERENCES investigations(id) ON DELETE CASCADE
);
