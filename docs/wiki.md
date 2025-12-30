# 🧠 Epstein Archive Wiki: Institutional Memory & System Guide

## 📌 Executive Summary
The Epstein Archive Platform (V9.0.0) is a forensic research and journalism tool designed to ingest, analyze, and visualize thousands of pages of court documents, flight logs, and estate emails. This wiki serves as the **Core Memory** for the system, documenting the rationale behind its architecture, data models, and UX patterns.

---

## 🏗️ System Architecture
The application is built on a modern **Vite + Express + SQLite** stack, optimized for fast full-text search and complex entity relationship mapping.

### Core Modules:
1.  **Ingestion Engine**: Processes raw PDFs and text files, performing OCR and entity extraction using natural language processing (NLP).
2.  **Entity Resolution**: Normalizes messy archival data (e.g., merging "D. Trump" and "Donald Trump").
3.  **Forensic Workspace**: A set of tools for researchers to build hypotheses, track evidence, and map financial transactions.
4.  **Integrated Document Viewer**: A dual-pane renderer that links extracted text to original source PDFs with fuzzy page-level mapping.

---

## 📊 Data Model & Provenance
Trust is the currency of this platform. Every piece of data is linked back to a verified source document.

### Entity Tiers:
- **Verified (Level 1)**: Direct mentions in multiple court documents or flight logs.
- **Derived (Level 2)**: Entities extracted through NLP with a high confidence score.
- **Red Flag Index**: A 1-5 rating system based on the frequency and context of mentions (e.g., direct eyewitness testimony vs. simple social association).

---

## 🎨 UX Philosophy: Context-First
We believe archival data is useless without context. The UI follows these patterns:
- **Side-by-Side Viewing**: Never show text without its original source.
- **Relationship-Centric Navigation**: Users navigate by clicking on people and organizations, not just searching for keywords.
- **Metadata Transparency**: Display confidence scores and extraction dates for every entity.

---

## 🤖 LLM Accessibility
This documentation is explicitly structured to allow future AI assistants to:
1.  Understand the database schema (`src/server.ts`) without brute-forcing queries.
2.  Follow the deployment pipeline (`deploy-to-production.sh`).
3.  Troubleshoot common issues like port conflicts or database WAL locks.

---

## 📅 Roadmap & Evolution
- **V8.x**: Flight Tracker and Timeline Integration.
- **V9.0.0 (Current)**: Integrated PDF Viewing, Fuzzy Linking, and zero-404 Media Integrity.
- **Future**: AI-powered cross-referencing and automated deposition summarization.