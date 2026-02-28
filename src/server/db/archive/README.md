# Database Archive

This directory contains deprecated database artifacts.

## `schema.sql`

This file contains the original SQLite schema definition. It is no longer the source of truth for the database structure.
The active database is PostgreSQL, and its schema is managed via migrations located in `src/server/db/postgres/migrations`.

**DO NOT EDIT `schema.sql`.** It is kept for reference only.
