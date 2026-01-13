# Core Memory Integration

## Overview

The Core Memory Integration system enhances the Epstein Archive platform by implementing a persistent, intelligent memory system that ensures data integrity, quality, performance, and consistent UX/UI across all platforms. This system implements four distinct memory types that work synergistically to support forensic research and journalism workflows.

## Memory Types

The system implements four distinct memory types based on cognitive science models:

### Declarative Memory

- **Purpose**: Stores factual information, entity relationships, and document metadata with provenance tracking
- **Content**:
  - Entities and their relationships
  - Document metadata and content
  - Evidence types and classifications
  - Red flag ratings and confidence scores

### Episodic Memory

- **Purpose**: Stores investigation timelines, research sessions, and temporal event sequences
- **Content**:
  - Investigation progress and milestones
  - Researcher interaction history
  - Timeline events and their contexts
  - Session-based work products

### Working Memory

- **Purpose**: Maintains active investigation contexts and temporary research states
- **Content**:
  - Currently active hypotheses
  - Working evidence sets
  - Researcher focus states
  - Temporary analysis results

### Procedural Memory

- **Purpose**: Stores research methodologies, processing workflows, and operational procedures
- **Content**:
  - Document processing pipelines
  - Entity resolution procedures
  - Quality assurance workflows
  - Investigation protocols

## Database Schema

The memory system uses four main tables with supporting indexes:

### memory_entries

- Primary table storing all memory entries
- Contains content, metadata, quality scores, and provenance information
- Supports four memory types and various status values

### memory_relationships

- Stores relationships between memory entries
- Enables complex query patterns and relationship mapping
- Tracks relationship strength and types

### memory_audit_log

- Maintains complete audit trail of all memory operations
- Tracks who performed actions and when
- Preserves old and new values for change tracking

### memory_quality_metrics

- Stores quality metrics for each memory entry
- Tracks source reliability, evidence strength, temporal relevance, and entity confidence
- Calculates overall quality score automatically

## Quality Assurance Framework

Each memory entry receives quality scores across multiple dimensions:

- **Source Reliability**: Based on document type and provenance
- **Evidence Strength**: Based on corroboration and context
- **Temporal Relevance**: Based on event timing
- **Entity Confidence**: Based on name resolution accuracy

Quality scores are automatically calculated and updated to ensure data integrity and trustworthiness.

## API Endpoints

The memory system provides comprehensive REST API endpoints:

- `GET /api/memory` - Retrieve memory entries with filtering and pagination
- `GET /api/memory/:id` - Retrieve a specific memory entry
- `POST /api/memory` - Create a new memory entry
- `PUT /api/memory/:id` - Update an existing memory entry
- `DELETE /api/memory/:id` - Delete a memory entry (soft delete)
- `GET /api/memory/:id/relationships` - Retrieve relationships for a memory entry
- `GET /api/memory/:id/audit` - Retrieve audit logs for a memory entry
- `GET /api/memory/:id/quality` - Retrieve quality metrics for a memory entry
- `POST /api/memory/:id/quality` - Update quality metrics for a memory entry

## React Context and UI

The system includes a React context for state management and a comprehensive UI component:

### Memory Context

- Provides state management for memory entries
- Handles loading, creating, updating, and deleting operations
- Manages selection and search functionality

### Memory Dashboard

- Allows users to view, create, and manage memory entries
- Provides filtering and search capabilities
- Shows detailed memory entry information
- Supports all four memory types with appropriate visual indicators

## Performance Optimization

The system implements several performance optimizations:

- **Indexing Strategy**: Multi-dimensional indexes for complex queries
- **Caching**: Hierarchical caching with LRU eviction
- **Query Optimization**: Intelligent query planning and batch operations
- **Full-Text Search**: FTS for efficient content discovery
- **Connection Pooling**: Optimized database connection usage

## Data Integrity and Provenance

The system maintains complete data integrity through:

- **Provenance Tracking**: Every memory entry maintains complete source provenance
- **Chain of Custody**: Complete tracking of all memory modifications
- **Immutable References**: Immutable reference to original source documents
- **Version History**: Complete version history for all memory transformations

## Migration

To set up the memory tables in the database, run the migration script:

```bash
npm run migrate-memory
```

This will create all necessary tables, indexes, and triggers for the memory system.
