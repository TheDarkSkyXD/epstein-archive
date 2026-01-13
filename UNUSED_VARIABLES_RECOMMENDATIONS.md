# Unused Variables - Functionality Recommendations

This document catalogs unused variables throughout the codebase and provides recommendations for how they could be implemented as features in the relational dataset.

## Overview

The Epstein Archive is a comprehensive relational database containing:

- **Entities** (people, organizations, locations)
- **Documents** with full-text search
- **Media** (photos, audio, video) with transcripts
- **Relationships** between entities
- **Timeline events**
- **Flight logs**
- **Investigations and evidence tracking**

## Scripts

### emergency_cleanup.ts

**Unused**: `deleteList` (line 122)

```typescript
const deleteList = [...JUNK_TERMS_EXACT];
```

**Recommendation**: **Audit Trail System**

- Log deleted entities to a `cleanup_audit` table
- Track: entity_id, name, reason, deleted_at, deleted_by
- Enable rollback functionality
- Generate cleanup reports showing what was removed
- **Feature Value**: Accountability and ability to restore accidentally removed data

---

### ingest_intelligence.ts

**Unused**: `docMentions` (line 217)
**Unused**: `filenameTags` (line 61)

**Recommendation**: **Enhanced Entity Linking**

- Use `docMentions` to create document-entity links in `entity_mentions` table
- Track confidence scores for mentions
- **Feature Value**: Cross-reference entities across documents, find co-occurrence patterns

**Recommendation**: **Automatic Tagging System**

- Use `filenameTags` to auto-tag media/documents based on filename patterns
- Create `media_tags` entries automatically
- **Feature Value**: Better organization and searchability of evidence

---

### recover_media_tags.ts

No unused variables - this script is well-utilized.

---

### verify_deployment.ts

**Unused**: `verifyPortAssignments` (line 210)

**Recommendation**: **Health Check Dashboard**

- Expose health check endpoint: `/api/health`
- Check database connectivity, port availability, file system access
- Display in Admin Dashboard with status indicators
- **Feature Value**: Proactive monitoring and debugging

---

## Components

### App.tsx

**Unused**: `_Timeline`, `_DocumentUploader`, `_loadingProgressValue`, `_documentLoadingProgressValue`, `_handleDocumentsUploaded`

**Recommendation**: **Upload Progress UI**

- Show progress bar for document uploads
- Display current file being processed
- Allow cancellation of uploads
- **Feature Value**: Better UX for bulk document ingestion

**Recommendation**: **Timeline View Integration**

- Add timeline to main navigation
- Show chronological view of all events (flights, documents, media dates)
- Filter by date range, entity, event type
- **Feature Value**: Temporal analysis of evidence

---

### AddToInvestigationButton.tsx

**Unused**: `EvidenceItem` type import

**Recommendation**: **Evidence Type Safety**

- Use the type to validate evidence structure before adding to investigations
- Create evidence preview tooltips
- **Feature Value**: Type-safe evidence management

---

### ArticleFeed.tsx & ArticlesTab.tsx

**Unused**: `showQuickAdd`, `setShowQuickAdd`

**Recommendation**: **Quick Add Article Feature**

- Add floating "+" button to quickly add articles from web
- Browser extension integration
- Paste URL to auto-fetch article content
- **Feature Value**: Faster evidence collection workflow

---

### AudioBrowser.tsx & AudioPlayer.tsx

**Unused**: `_setShowTranscript`

**Recommendation**: **Transcript Toggle Settings**

- Add user preference to show/hide transcripts by default
- Save preference to localStorage or user settings
- Toggle button in player controls
- **Feature Value**: Customizable viewing experience

---

### BlackBookViewer.tsx

No major unused variables - this component is efficient.

---

### DataVisualization.tsx & DataVisualizationEnhanced.tsx

**Unused**: Various chart-related imports

**Recommendation**: **Advanced Analytics Dashboard**

- Implement zoom/pan controls for charts
- Add filters by risk level, entity type, date range
- Export chart data as CSV/JSON
- **Feature Value**: Deep data exploration and reporting

---

### DocumentAnnotationSystem.tsx

**Unused**: `textContent`, `IconComponent`

**Recommendation**: **Annotation Templates**

- Use `IconComponent` to show visual indicators for annotation types
- Create annotation categories with custom icons (evidence, contradiction, question, note)
- **Feature Value**: Visual distinction between annotation types

**Recommendation**: **Text Extraction API**

- Use `textContent` to provide API endpoint for extracting annotated text
- Generate evidence summaries automatically
- **Feature Value**: Automated report generation

---

### DocumentBrowser.tsx

**Unused**: `useCallback`, `prettifyOCRText`, `setCollection`, `DocumentCard`

**Recommendation**: **Document Collections Feature**

- Enable creation of custom document collections
- Use `setCollection` to assign documents to collections
- Collections UI similar to playlists
- **Feature Value**: Organize documents by investigation or topic

**Recommendation**: **OCR Quality Improvement**

- Apply `prettifyOCRText` to all OCR documents
- Show original vs. cleaned text toggle
- Re-OCR capability for poor quality documents
- **Feature Value**: Better searchability and readability

**Recommendation**: **Document Card View**

- Implement grid view with `DocumentCard` component
- Show thumbnail, title, date, entities mentioned
- Pinterest-style masonry layout
- **Feature Value**: Visual browsing mode

---

### DocumentModal.tsx

**Unused**: `highlight`, `showMediaViewer`, `setShowMediaViewer`

**Recommendation**: **Inline Media Viewer**

- Open media files directly in modal without leaving document
- Show related photos/audio inline with document
- **Feature Value**: Seamless evidence review

**Recommendation**: **Search Highlighting**

- Use `highlight` to emphasize search terms in document text
- Jump to next/previous occurrence
- **Feature Value**: Faster evidence location

---

### DocumentViewer.tsx & DocumentContentRenderer.tsx

**Unused**: Various icon imports (`FileText`, `Calendar`, `User`, `Hash`, `Layers`, `Clock`)

**Recommendation**: **Document Metadata Panel**

- Show document metadata with icons:
  - 📄 FileText: Document type
  - 📅 Calendar: Date created/modified
  - 👤 User: Author/sender/recipient
  - # Hash: Document ID, case number
  - 🏷️ Layers: Tags and categories
  - ⏰ Clock: Timeline position
- **Feature Value**: Quick metadata overview

---

### EntityModal.tsx

**Unused**: `entities`

**Recommendation**: **Related Entities Sidebar**

- Show entities mentioned in same documents
- Network graph of connected entities
- "People also linked with" section
- **Feature Value**: Discover entity relationships

---

### EnhancedAnalytics.tsx

**Unused**: `analysis`

**Recommendation**: **AI-Powered Insights**

- Generate automated analysis reports
- Identify patterns, outliers, anomalies
- Natural language summaries of data trends
- **Feature Value**: Automated intelligence gathering

---

### ForensicDocumentAnalyzer.tsx

**Unused**: `prettifyOCRText`

**Recommendation**: **Document Quality Score**

- Rate OCR quality on each document
- Suggest re-scanning for low quality docs
- Batch OCR improvement tool
- **Feature Value**: Data quality management

---

### NetworkGraph.tsx

**Unused**: `d3Scale`, `ZoomIn`, `ZoomOut`, `RefreshCw`, `Maximize`, `Filter`, `onRelationshipSelect`, `theta`, `node`, `y2`

**Recommendation**: **Interactive Network Controls**

- Zoom in/out buttons
- Refresh to re-layout graph
- Maximize to fullscreen mode
- Filter by relationship type, entity type
- Click relationships to see details
- Adjust force simulation parameters (theta)
- **Feature Value**: Professional network analysis tools

---

## Implementation Priority

### High Priority (Core Features)

1. **Document Collections** - Organize evidence by investigation
2. **Enhanced Entity Linking** - Automatic mention detection
3. **Audit Trail System** - Track data changes
4. **Transcript Toggle** - User preference for audio/video
5. **Search Highlighting** - Find evidence faster

### Medium Priority (UX Improvements)

6. **Upload Progress UI** - Better feedback during ingestion
7. **Media Viewer Integration** - Inline media in documents
8. **Quick Add Article** - Faster evidence collection
9. **OCR Quality Improvement** - Better text extraction
10. **Document Card View** - Visual browsing

### Low Priority (Advanced Features)

11. **Timeline View** - Temporal analysis
12. **Network Graph Controls** - Advanced graph manipulation
13. **Health Check Dashboard** - System monitoring
14. **AI-Powered Insights** - Automated analysis
15. **Annotation Templates** - Structured annotations

## Database Schema Extensions

To support these features, consider adding:

```sql
-- Audit trail
CREATE TABLE cleanup_audit (
  id INTEGER PRIMARY KEY,
  entity_id INTEGER,
  entity_name TEXT,
  reason TEXT,
  deleted_at TIMESTAMP,
  deleted_by TEXT,
  rollback_data TEXT -- JSON snapshot
);

-- Document collections
CREATE TABLE document_collections (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT
);

CREATE TABLE document_collection_items (
  collection_id INTEGER REFERENCES document_collections(id),
  document_id TEXT,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (collection_id, document_id)
);

-- Document quality metrics
CREATE TABLE document_quality (
  document_id TEXT PRIMARY KEY,
  ocr_confidence REAL,
  needs_review BOOLEAN,
  reviewed_at TIMESTAMP,
  reviewed_by TEXT
);

-- User preferences
CREATE TABLE user_preferences (
  user_id TEXT PRIMARY KEY,
  preferences_json TEXT, -- JSON: {showTranscripts: true, defaultView: 'grid', ...}
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## API Endpoints to Add

```typescript
// Collections
GET    /api/collections
POST   /api/collections
GET    /api/collections/:id/documents
POST   /api/collections/:id/documents
DELETE /api/collections/:id/documents/:docId

// Health check
GET    /api/health

// Document quality
GET    /api/documents/:id/quality
POST   /api/documents/:id/reocr

// User preferences
GET    /api/users/:id/preferences
PUT    /api/users/:id/preferences

// Enhanced search with highlighting
GET    /api/search?q=...&highlight=true

// Audit logs
GET    /api/audit/cleanup
POST   /api/audit/rollback/:id
```

## Conclusion

The unused variables represent partially implemented features or infrastructure that could significantly enhance the Epstein Archive's capabilities. Prioritize based on:

- **User needs**: What makes investigations more effective?
- **Data integrity**: Audit trails and quality tracking
- **Discoverability**: Better search, highlighting, collections
- **Usability**: Progress indicators, toggles, preferences

Each feature leverages the existing relational database structure and would add value to legal researchers, journalists, and investigators using this archive.
