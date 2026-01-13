# Epstein Archive API Documentation

## Overview

The Epstein Archive API provides access to the document corpus, entity graph, and investigation tools.

**Base URL**: `/api`

## Authentication

Currently, the API is open for read access but requires authentication headers for mutation operations in production.
_(Note: Full JWT implementation is pending in Tier 5)_

## Endpoints

### 📂 Evidence & Documents

#### Upload Document

`POST /api/evidence/upload`
Upload a new document to the archive.

- **Body**: `multipart/form-data` with `file` field.
- **Restrictions**: Max 50MB. Allowed: PDF, TXT, DOCX, JPG, PNG.
- **Returns**: `{ success: true, documentId: 123 }`

#### Search Evidence

`GET /api/evidence/search?query=...`
Full-text search across documents and entities.

- **Params**: `query`, `limit`, `page`, `redFlagMin`, `redFlagMax`.

#### Get Forensic Metrics

`GET /api/evidence/:id/metrics`
Retrieve forensic analysis scores (authenticity, readability).

#### Trigger Analysis

`POST /api/evidence/:id/analyze`
Trigger server-side forensic analysis.

### 🕵️‍♂️ Investigations

#### Create Investigation

`POST /api/investigation`
Create a new investigation case.

#### Add Evidence to Case

`POST /api/investigation/add-evidence`
Link an existing document to an investigation.

### 👥 Entities

#### Get Entity

`GET /api/entities/:id`
Get detailed entity profile, including stats and role.

#### Create Entity

`POST /api/entities`
Manually create a new Person/Organization.

#### Update Entity

`PATCH /api/entities/:id`
Update entity metadata.

### 🔗 Relationships

#### Get Graph

`GET /api/graph`
Get network graph data (nodes/edges).

## Architecture

- **Server**: Node.js + Express
- **Database**: SQLite (Production)
- **Search**: FTS5 (Full Text Search) + Vector Fallback (planned)
- **ORM**: Raw SQL via `better-sqlite3` (Repository Pattern)

## Development

- **Start Server**: `npm run server`
- **Run Migrations**: `npm run migrate`
- **Backfill Mentions**: `npm run backfill`
