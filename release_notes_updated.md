## Version 6.8.0 (December 14, 2025)

Media Browser Batch People Tagging

- **Batch People Tagging**: Added support for tagging people in batch mode, allowing users to select multiple images and assign entities to them in bulk
- **Enhanced Batch Toolbar**: Added People tagging option to the batch toolbar with dedicated UI
- **Batch API Endpoint**: Added new `/api/media/images/batch/people` endpoint for batch assigning/removing people from images

---

## Version 6.7.0 (December 14, 2025)

Media Browser Batch Editing & Enhanced Rotation

- **Batch Editing**: Added comprehensive batch editing capabilities to the media browser, allowing users to select multiple images and apply operations in bulk:
  - Multi-select with Shift+Click (range selection) and Ctrl/Cmd+Click (toggle selection)
  - Batch rotation (left/right)
  - Batch tagging
  - Batch rating assignment
  - Batch metadata updates (titles/descriptions)
- **Enhanced Rotation Persistence**: Fixed image rotation functionality to properly persist rotation values across navigation and sessions
- **Batch Toolbar**: Added specialized toolbar for batch operations with intuitive controls
- **Keyboard Shortcuts**: Added keyboard shortcuts for batch operations (Ctrl/Cmd+B to enter batch mode, Esc to exit, Ctrl/Cmd+A to select all)
- **Visual Selection Indicators**: Added clear visual indicators for selected images in both grid and list views

---

## Version 6.6.0 (December 13, 2025)

Media Navigation & UX Improvements

- **Advanced Media Filtering**: Users can now filter the media gallery by specific Tags or People.
- **Smart Navigation**: Clickable tags and person names in the Media Viewer now instantly filter the gallery.
- **Entity Photo Integration**: Entity Cards now feature a "Photos" section displaying associated images.
- **Image Rotation Fix**: Resolved orientation issues for specific images.
- **Navigation UX**: Active filters are clearly displayed in the gallery with one-click removal.

---

## Version 6.5.0 (December 13, 2025)

Investigation Data & Admin Polish

- **Real Investigation Data**: Replaced the "Example" placeholder with a fully seeded "Ghislaine Maxwell Recruitment Network" investigation, featuring real entities, timeline events, and hypothesis tracking.
- **Admin Logout**: Added secure Logout functionality to the Admin Dashboard.
- **Auth Fixes**: Fixed state persistence bug; admin UI elements now correctly vanish immediately upon logout.
- **UI Improvements**: Fixed "View Original" tab overlay issues (z-index) and added "Click Outside to Close" for smoother document modal interactions.

---

## Version 6.4.0 (December 13, 2024)
Admin Dashboard & Image Rotation
- **Admin Dashboard**: Dedicated interface for user management and system administration.
- **Image Rotation**: Admins can now rotate images 90° clockwise directly in the Media Viewer.
- **Security**: Strict role-based access control for all media editing functions.
- **Bug Fixes**: Resolved an issue where keyboard shortcuts interfered with text editing.

# Epstein Archive: Release Notes

## Version 6.3.1 (December 13, 2025)

Entity cleanup, new Estate photos, and UI bug fixes.

**Data Updates**
- **New Estate Photos**: Imported 19 high-resolution photos from the "12.11.25 Estate Production" tranche.
- **Entity Cleanup**: Consolidated "Jane Doe No" into "Jane Doe".
- **Type Corrections**: Fixed incorrect types for "Vanity Fair" (Magazine), "World War" (Event), and "Rights Act" (Legislation).

**UI Fixes**
- **Release Notes**: Fixed an issue where the "What's New" panel was truncating long entries (showing only the first 8 bullet points).

---

## Version 6.3.0 (December 12, 2025)

Introduces comprehensive Admin Authentication and In-Place Media Editing capabilities.

**Authentication System**
- **Admin Login**: Secure login portal (`/login`) for authorized administrators.
- **Admin Role**: Role-based access control protecting sensitive operations.
- **Session Management**: Secure JWT-based sessions with persistent login state.

**Media Management**
- **In-Place Editing**: Admins can now edit image Titles and Descriptions directly within the Media Viewer.
- **Improved Workflow**: Rapidly fix metadata errors or add context without leaving the application.

---

## Version 6.0.0 (December 12, 2025)

Major entity data quality overhaul with comprehensive consolidation and cleanup.

**Entity Consolidation**
- Consolidated **109 duplicate/fragmented entities** (46,304 → 46,195)
- Merged 55 Trump properties into **Trump Organization** (now 4,382 mentions)
- Consolidated Ghislaine Maxwell nicknames (gmax, Dear Ghislaine, etc.) - now 2,509 mentions
- Palm Beach misspellings fixed (Palm Bch, Palm Bead Post, etc.) - now 7,208 mentions
- Donald Trump fragments merged (With Trump, Elect Trump, etc.) - now 3,691 mentions

**Junk Entity Cleanup**
- Removed 38 garbage entities incorrectly classified as people
- Deleted "Use Over" (10,759 false mentions), "An Ex" (4,882), "Al Research" (2,205), etc.

**New Entities & Role Fixes**
- Created "Bubba" entity with "Unknown private individual" role
- Fixed Trump Organization type: Organization/Corporation (was incorrectly Person)
- Pattern-based role assignment for titles (Dr., Det., Prof., etc.)

**New Tooling**
- Added `scripts/entity_data_quality.ts` - reusable 4-phase cleanup script

---

## Version 5.9.0 (December 12, 2025)

Navigation and Black Book improvements.

**Navigation Menu**
- Main menu buttons now fit their content with varying widths
- Buttons still span edge-to-edge on desktop using flexbox layout
- Increased padding for better readability

**Black Book Viewer**
- Fix: Alphabet filter now works correctly like a real address book
- Clicking a letter shows all entries whose names start with that letter
- Improved sorting with case-insensitive ordering

**Data Normalization**
- Fixed OCR typo: "Trump, Donaic" → "Trump, Donald"
- Linked Trump's Black Book entry to correct entity profile

---

## Version 5.8.0 (December 12, 2025)

Document viewer improvements and content cleanup.

**Original File Links**
- Linked 2,629 text documents to their original PDF files
- "View Original" tab now displays the PDF for text documents
- Birthday Book, Flight Logs, and all other extracted text files now show originals

**Content Cleanup**
- Stripped RTF formatting from 4 documents (EPSTEIN_INCRIMINATING_DOCUMENT, Katie Johnson Testimony, overview)
- RTF control codes like \rtf1, \par, \fs24 removed from document content
- Documents now display as clean, readable text

**Database Fixes**
- Resolved FTS trigger corruption causing database errors
- Added original_file_path column with server-relative paths

---

## Version 5.7.0 (December 12, 2025)

Black Book restoration, media enrichment, and bug fixes.

**Black Book Viewer**
- Fix: Black Book now loads all 1,101 contacts (was empty)
- Fixed blackBookRepository to join with entities table instead of non-existent people table
- Clickable known entities: Names with entity profiles now display as cyan links with external icon
- Clicking opens EvidenceModal with full entity profile

**Media Gallery**
- Imported 408 media images with descriptive titles
- Title generation based on folder context (Survivors, Trump Epstein, Evidence, etc.)
- USVI Production images titled by location (Main Estate, Pool Complex, Temple Structure, etc.)
- Named survivor photos correctly titled (Virginia Giuffre, Teela Davies)

**Bug Fixes**
- Fix: DocumentContentRenderer variable shadowing issue (document.addEventListener error)
- Fix: Server path handling for original file URLs (double slash prevention)

---

# 🚀 Epstein Archive: Production Release Notes (v5.6.0)
**December 11, 2025**

Production readiness overhaul, containerization, and security hardening.

## 🏭 Production Readiness
- **Docker Support**: Added `Dockerfile` and `docker-compose.yml` for easy containerized deployment.
- **Compression**: Enabled Gzip compression for all API responses to reduce bandwidth and improve load times.
- **Process Management**: Added `ecosystem.config.cjs` for PM2 support, enabling process monitoring and auto-restart.
- **Security Hardening**: Reinforced `helmet` policies and refined rate limiting configurations.
- **Performance**: Optimized FTS indices and added caching headers for static assets.

## ⚖️ Forensic & Evidence Pipeline
- **Server-Side Analysis**: Moved complex evidence analysis logic (authenticity scoring, chain of custody verification) from the client to the server for enhanced security and reliability.
- **Forensic Metrics**: Introduced a dedicated database schema for storing granular document metrics (readability, sentiment, metadata anomalies).
- **Chain of Custody API**: New endpoints to securely track and retrieve the chain of custody for every piece of evidence.

## ♿ Accessibility & UX
- **Accessible Network View**: Added a toggleable "Table View" for the Network Visualization, allowing screen reader users and those preferring data tables to access complex graph data.
- **Alert Removal**: Verified removal of intrusive `alert()` dialogs in favor of non-blocking notifications.

---

# 🚀 Epstein Archive: Production Release Notes (v5.4.0)
**December 11, 2025**

Major architecture overhaul and enhanced investigative capabilities.

## 🏗️ Architecture Refactor
- **Repository Pattern**: Migrated to modular Repository Pattern.
- **Database Migrations**: Implemented formal schema migration system.
- **Full Text Search (FTS5)**: Upgraded to SQLite FTS5 for faster search.

## 🕵️‍♂️ New Features
- **Entity Creation**: Comprehensive UI for creating new entities.
- **Relationship Management**: "Create Connection" tool to link entities.
- **Timeline API**: New endpoints for investigation timeline events.

## 🧹 Data Quality
- **Entity Role Classification**: Reduced "Unknown" roles from 84% to 0.6%.
- **Relationship Cleanup**: Removed 216,000+ orphaned records.

---

# 🚀 Epstein Archive: Production Release Notes (v5.3.8)
**December 10, 2025**

Final polish for navigation and media sections.

## 🧭 Navigation & Media
- **Navigation Layout**: Validated and deployed the full-width desktop navigation bar for a cleaner, "end-to-end" visual style.
- **Section Renaming**: Officially deployed the rename of "Media" to **"Media & Articles"** to improve content discoverability.
- **System Stability**: Verified loading performance for the Media gallery and Article viewer components.

---

# 🚀 Epstein Archive: Production Release Notes (v5.3.7)
**December 10, 2025**

Navigation improvements and label clarity.

## 🧭 Navigation
- **Expanded Navigation Bar**: Desktop navigation buttons now span the full width of the container for better touch targets and visual balance.
- **Terminology**: Renamed "Media" to "Media & Articles" to better reflect the section's content (news coverage + image gallery).

---

# 🚀 Epstein Archive: Production Release Notes (v5.3.6)
**December 10, 2025**

UI polish for educational content.

## 🎨 User Interface
- **About Page Redesign**: Enhanced the "Legal Thresholds" section with a modern, card-based layout.
- **Risk Methodology**: Added clear visual indicators (badges) for legal concepts like "Mere Presence" vs "Conspiracy" and explained their direct correlation to the Red Flag Index.
- **DOJ Findings**: Highlighted critical 2025 DOJ findings in a dedicated callout box for better visibility.

---

# 🚀 Epstein Archive: Production Release Notes (v5.3.5)
**December 10, 2025**

Mobile UX refinement and conflict resolution for onboarding flows.

## 📱 Mobile Experience
- **UI Clash Fix**: Resolved a visual conflict where the "Investigations" attraction popup would overlap with the "Getting Started" onboarding tour.
- **Smart Popups**: The Investigations attraction popup is now automatically suppressed on mobile devices (where screen real estate is premium) and when the onboarding tour is active.

---

# 🚀 Epstein Archive: Production Release Notes (v5.3.4)
**December 10, 2025**

Forced cache invalidation to resolve production data display issues.

## 🐛 Fixes
- **Aggressive Cache Busting**: Updated client-side storage keys to `v5.3.4` and added logic to actively remove stale `v5.3.1` data from local storage.
- **Data Sync**: Ensured the "Still nothing on prod" issue is resolved by forcing a fresh fetch of entity statistics and red flag ratings.

---

# 🚀 Epstein Archive: Production Release Notes (v5.3.3)
**December 10, 2025**

Codebase modernization and terminology standardization.

## 🧹 Refactoring
- **Terminology Update**: Completely removed legacy `spice_rating` references from the codebase, replacing them with the standardized `red_flag_rating` (DB) and `redFlagIndex` (UI/Logic).
- **Frontend Sync**: Updated `DataVisualization` components to use the new naming convention, ensuring data flows correctly from the API.
- **Service Layer**: Refactored `DatabaseService` and `dataLoader` to align with the `red_flag` nomenclature.

---

# 🚀 Epstein Archive: Production Release Notes (v5.3.2)
**December 10, 2025**

Database schema integrity update and stability improvements.

## 🛠 Database & Backend
- **Schema Migration**: Added missing `red_flag_rating` column to `media_items` table in the production database.
- **Data Integrity**: Migrated existing `spice_rating` values to the standardized `red_flag_rating` column.
- **Strict Validation**: Re-enabled strict schema validation on server startup to prevent future data inconsistencies.

---

# 🚀 Epstein Archive: Production Release Notes (v5.3.1)
**December 10, 2025**

Hotfix for data visualization and client-side caching issues.

## 🐛 Bug Fixes
- **Data Integrity**: Forced client-side cache refresh to ensure all users see the full 75,517 entity dataset instead of cached development stats.
- **Cache Busting**: Updated localStorage keys to `v5.3.1` namespace to clear stale "131 entities" counts.

---

# 🚀 Epstein Archive: Production Release Notes (v5.3.12)
**December 10, 2025**

Advanced investigative tools and network analysis enrichment.

## 🕵️‍♂️ Investigation & Network Tools
- **Entity Creation UI**: Full interface to manually create new Subjects.
- **Relationship Editor**: "Create Connection" tool for entity linking.
- **Rich Network Graph**: Detailed evidence data on connection lines.

---

# 🚀 Epstein Archive: Production Release Notes (v5.3.0)
**December 10, 2025**

Refining the mobile experience and standardizing "Red Flag" terminology for a consistent, professional investigative tool.

## 🌟 Key Highlights

### 1. Mobile Responsiveness (About Page)
- **Card-Based Tables**: Transformed the "Document Sources" and "Timeline" tables into responsive cards on mobile devices.
- **Improved Readability**: Eliminated narrow columns and horizontal scrolling for better data consumption on small screens.

### 2. Red Flag Index Standardization
- **Terminology Update**: Removed all remaining internal "Spice" references, replacing them with the professional "Red Flag Index" nomenclature.
- **High-Risk Visualization**: Updated data visualization logic to ensure high-risk entities (like Jeffrey Epstein) are consistently represented with correct "Red Flag" color branding (Purple/Red).

---

# 🚀 Epstein Archive: Production Release Notes (v5.2.1)
**December 10, 2025**

Comprehensive UI modernization and critical database schema alignment. This release focuses on "making data beautiful" while ensuring absolute integrity in the production environment.

## 🌟 Key Highlights

### 1. Visual & UI Modernization
- **Glassmorphism Design**: Implemented a modern slate-glass aesthetic across dashboards and cards using backdrop blurs and subtle gradients.
- **Enhanced Data Visualization**:
    - **Interactive Charts**: Upgraded bar and pie charts with rich gradient fills (Red-Pink-Blue scales) and custom dark-themed tooltips.
    - **Responsive Layouts**: Optimized charts and grids to stack gracefully on mobile devices.
- **Mobile-First Cards**: Redesigned Entity and Document cards to handle long text gracefully and stack metadata vertically on small screens.

### 2. Production Stability Fixes
- **Schema Alignment**: Fixed critical server crashes by aligning `server.production.ts` queries with the actual `epstein-archive-production.db` schema (mapping `title` -> `file_name`, `red_flag_rating` -> `spice_rating`).
- **Entity Integrity**: Restored full access to 75,517 entities and 2,646 documents in the production API.
- **Error Resolution**: Eliminated "no such column" SQL errors in the production build.

### 3. About Page Refactor
- **Responsive Tables**: Converted the "Document Sources" table into a card-based layout for mobile users.
- **Visual Polish**: Added impact badges and redaction status indicators to the source list.

---

# 🚀 Epstein Archive: Production Release Notes (v5.2.0)
**December 10, 2025**

Major forensic update enhancing data integrity, transparency, and analysis capabilities. This release transforms the platform into a true forensic intelligence tool.

## 🌟 Key Highlights

### 1. Forensic Intelligence Platform
- **System Analysis Table**: Added a detailed comparison in the **About** section contrasting the "Status Quo" of chaotic files with our new "Forensic Intelligence Platform," highlighting structured data, network graphs, and risk quantification.
- **Interactive Data Sources**: Replaced static lists with a dynamic **Data Sources Grid** in the About page, providing direct access to 12+ primary datasets (Black Book, Flight Logs, Court Files).

### 2. Data Integrity & Verification
- **Full Production Dataset Activated**: Switched production environment to the high-integrity database (`epstein-archive-production.db`), increasing entity coverage from ~130 to **75,517 unique profiles**.
- **Missing Articles Restored**: Identified and fixed a critical data gap where the "Investigative Articles" table was missing. Successfully ingested **29 investigative pieces**.
- **Black Book Repair**: Fixed database triggers and schema issues that were preventing Black Book imports. Successfully processed **1,102 entries**, **1,133 phone numbers**, and created **1,033 profiles**.
- **Full Audit**: Verified production database integrity across all subsystems: 75,517 Profiles, 2,646 Documents, and 1,101 Black Book entries.

### 3. Document Transparency
- **Original Document Access**: Implemented "Download Original" functionality across the entire application.
- **Universal Availability**: Users can now download the original source file (PDF, Image, etc.) directly from:
    - The **Document Viewer** toolbar.
    - The **Email Viewer** header.
    - **Legal Document** banners (Court cases, Depositions).
    - **Article** headers.

---

# 🚀 Epstein Archive: Production Release Notes (v5.1.0)
**December 9, 2025**

Major content update expanding the archive's scope with verified source indexes, in-depth analysis, and enhanced document accessibility.

## 🌟 Key Highlights

### 1. Document Sources & Analysis
- **Verified Sources Index**: Discovered a comprehensive table of 12 verified datasets (e.g., Black Book, Flight Logs, Depositions) in the About page, providing direct access to key evidence.
- **In-Depth Analysis**: Added the "What Documents Exist" investigative report, contextualizing the difference between social association and criminal complicity.

### 2. Document Accessibility
- **Direct Downloads**: Added "Download Original" links to document viewers, allowing users to save original source files (PDFs, Emails) when available.
- **Source Verification**: Document headers now clearly indicate the originating source type (Federal, Leaked, Court Document).

---

# 🚀 Epstein Archive: Production Release Notes (v5.0.1)
**December 9, 2025**

Hotfix release addressing UI regressions and critical build issues.

## 🌟 Key Highlights

### 1. UI Restoration
- **Menu Styling**: Reverted main menu to button style (fixed toolbar look).
- **Chips Spacing**: Added gap between numbers and labels in header stats.

### 2. Stability Fixes
- **Media & Black Book**: Fixed TypeScript `Database` type errors that caused service crashes.
- **Build System**: Improved type definitions for `better-sqlite3`.

---

# 🚀 Epstein Archive: Production Release Notes (v5.0.0)
**December 8, 2025**

Major update featuring a completely redesigned Media experience, new Article ingestion pipeline, and consolidation of all previous v4.x enhancements.

## 🌟 Key Highlights

### 1. Photo Library Overhaul
- **Pro-Grade Media Browser**: Re-engineered the Photo Library with a clean dark interface, featuring a dedicated albums sidebar, responsive image grid, and professional metadata viewer.
- **Improved Navigation**: Merged "Evidence Media" and "Photo Library" into a single, unified experience.
- **Smart Albums**: Fixed duplicate album issues and resolved naming bugs.
- **Enhanced Performance**: Implemented robust thumbnail generation and smart fallbacks.

### 2. New Investigative Journalism Hub
- **Article Ingestion Engine**: Added a new backend pipeline to fetch and index articles from **Substack** and **Miami Herald**.
- **Integrated Reading Experience**: Articles now appear directly in the "Investigative Articles" tab.
- **Database Backed**: All articles are stored for fast search.

### 3. Investigation & Document Enhancements
- **Email Viewer & Parsing**: Fixed email document rendering, including proper header parsing.
- **Investigation Workspace**: Improved Financial Transaction Mapper.
- **Search & Filtering**: Added searches by evidence type.

---

# 🚀 Epstein Archive: Production Release Notes (v4.7.1)
**December 6, 2025**

Investigation feature enhancements and UI polish.

## 🌟 Key Highlights

### 1. Investigation Feature Improvements
- **Financial Pane Text Fix**: Entity names in the Financial Transaction Mapper now use proper text truncation (`whitespace-nowrap` + `text-ellipsis`) instead of wrapping, with full text shown on hover via tooltips.
- **Modal Scroll Fix**: New Investigation modal now includes `max-h-[90vh] overflow-y-auto` ensuring all content is accessible on smaller screens with visible action buttons.
- **Database Schema Update**: Added missing `scope`, `collaborator_ids`, `created_at`, and `updated_at` columns to the investigations table.

### 2. Example Investigation
- **Maxwell-Epstein Financial Network**: Created a plausible example investigation tracing financial connections between Ghislaine Maxwell, Jeffrey Epstein, and their associates through shell companies and offshore accounts.

### 3. Documentation
- **Walkthrough Added**: Added comprehensive Investigation feature walkthrough explaining how to create investigations, add evidence, test hypotheses, and use all 9 workspace tabs.

---

# 🚀 Epstein Archive: Production Release Notes (v4.7.0)
**December 6, 2025**

Investigation feature enhancements and UI polish.

## 🌟 Key Highlights

### 1. Investigation Feature Improvements
- **Financial Pane Text Fix**: Entity names in the Financial Transaction Mapper now use proper text truncation (`whitespace-nowrap` + `text-ellipsis`) instead of wrapping, with full text shown on hover via tooltips.
- **Modal Scroll Fix**: New Investigation modal now includes `max-h-[90vh] overflow-y-auto` ensuring all content is accessible on smaller screens with visible action buttons.
- **Database Schema Update**: Added missing `scope`, `collaborator_ids`, `created_at`, and `updated_at` columns to the investigations table.

### 2. Example Investigation
- **Maxwell-Epstein Financial Network**: Created a plausible example investigation tracing financial connections between Ghislaine Maxwell, Jeffrey Epstein, and their associates through shell companies and offshore accounts.

### 3. Documentation
- **Walkthrough Added**: Added comprehensive Investigation feature walkthrough explaining how to create investigations, add evidence, test hypotheses, and use all 9 workspace tabs.

---

# 🚀 Epstein Archive: Production Release Notes (v4.5.9)
**December 5, 2025**

Minor layout fix for document viewers.

## 🌟 Key Highlights

### 1. Bug Fixes
- **Document Viewer Alignment**: Fixed an issue where the document viewer modal could appear off-center or clipped. It is now properly centered to the screen viewport using React Portals.

---

# 🚀 Epstein Archive: Production Release Notes (v4.5.8)
**December 5, 2025**

Fine-tuning responsive layout for search.

## 🌟 Key Highlights

### 1. Visual Refinements
- **Search Bar**: Optimized search input padding. Reduced excessive spacing on desktop while ensuring sufficient breathing room for the icon on mobile devices.

---

# 🚀 Epstein Archive: Production Release Notes (v4.5.7)
**December 5, 2025**

Quick fix for search input visual regressions.

## 🌟 Key Highlights

### 1. Bug Fixes
- **Search Bar**: Fixed an issue where the search icon was obscured and text alignment was incorrect due to invalid styling properties.

---

# 🚀 Epstein Archive: Production Release Notes (v4.5.6)
**December 4, 2025**

UI decluttering and refinement.

## 🌟 Key Highlights

### 1. Evidence Search Polish
- **Less Clutter**: Moved all descriptive help text into popover tooltips to clean up the search interface.
- **Consistent Icons**: Standardized all help icons to use the application-standard info icon `(i)`.

---

# 🚀 Epstein Archive: Production Release Notes (v4.5.5)
**December 4, 2025**

Responsive layout improvements for tablet and desktop users.

## 🌟 Key Highlights

### 1. Navigation Polish
- **Better Wrapping**: Navigation tabs now fold gracefully to a second line on medium-sized screens (tablets/small laptops) instead of forcing a horizontal scroll. This improves accessibility and visibility of all menu items.

---

# 🚀 Epstein Archive: Production Release Notes (v4.5.4)
**December 3, 2025**

Refinements to sorting logic and UI consistency.

## 🌟 Key Highlights

### 1. Entity Modal Sorting & Search
- **Corrected Sorting**: Fixed an issue where documents were not sorting by Red Flag Index correctly.
- **Mobile Search**: Increased padding on document filter input to prevent icon overlap.

### 2. UI Polish
- **Consistent Heights**: Standardized filter dropdowns and buttons to consistent height across the Evidence Search page.

---

# 🚀 Epstein Archive: Production Release Notes (v4.5.0)
**December 3, 2025**

Enhanced the Entity details view with better filtering and sorting capabilities.

## 🌟 Key Highlights

### 1. Entity Evidence Filtering
- **Local Document Search**: Added a search filter within the Entity Modal to quickly find specific documents by title or content.
- **Improved Sorting**: Verified default sorting prioritizes highly flagged documents (Red Flag Index) followed by mention count.

### 2. Mobile Search Fix
- **Search Input Layout**: Increased left padding in the search bar to prevent the search icon from overlapping with the placeholder text on some mobile devices.

### 3. Mobile UI Improvements
- **Optimized Investigation Button**: Replaced the "New Investigation" button text with a clean "+" icon on mobile devices to save screen space while maintaining accessibility.

### 4. Navigation Sidebar Fixes
- **Sidebar Icons**: Fixed issue where sidebar icons appeared too small when the sidebar was collapsed. Icons now maintain proper sizing and visibility in all states.

---

# 🚀 Epstein Archive: Production Release Notes (v3.9.0)
**December 1, 2025**

We have deployed a comprehensive update focusing on entity type icon improvements, UI enhancements, and bug fixes based on user feedback.

## 🌟 Key Highlights

### 1. Entity Type Icon Improvements
- **Differentiated Entity Icons**: Implemented distinct icons for each entity type (Person, Organization, Location, Document, etc.) to improve visual recognition
- **Custom Dropdown Component**: Created a new EntityTypeFilter component with icon support for the entity type filter dropdown
- **Centralized Icon Mapping**: Refactored PersonCard and PersonCardRefined components to use the centralized entityTypeIcons utility for consistency

### 2. UI Enhancements
- **Improved Visual Hierarchy**: Enhanced card layouts with better spacing and typography
- **Consistent Iconography**: Standardized all icon usage through the Icon wrapper component
- **Accessibility Improvements**: Added proper ARIA attributes and screen reader support

### 3. Performance & Stability
- **Optimized Rendering**: Improved component rendering performance with memoization
- **Bug Fixes**: Resolved several minor UI bugs and edge cases

## 📊 Technical Stats
- **Build Size:** ~1.5MB (gzipped: ~400KB)
- **Modules Transformed:** 2,413
- **Build Time:** ~4 seconds

---

# 🚀 Epstein Archive: Production Release Notes (v3.8.0)
**November 30, 2025**

We have deployed a comprehensive update focusing on performance improvements, navigation enhancements, and bug fixes based on user feedback.

## 🌟 Key Highlights

### 1. Performance & Loading Improvements
- **Single Chip Loading Indicator**: Consolidated loading indicators into a single compact chip with integrated progress bar for better UI clarity
- **Optimized Data Fetching**: Improved database queries and caching mechanisms for faster data retrieval
- **Virtualized Lists**: Implemented virtual scrolling for large datasets to reduce memory consumption

### 2. Navigation & UI Enhancements
- **Mobile Menu Verification**: Ensured all mobile menu buttons correctly navigate to their intended sections
- **Database Schema Fixes**: Resolved issues with importance_score column and entity_summary view
- **Provider Nesting Corrections**: Fixed component hierarchy issues in the main application structure

### 3. Component Improvements
- **LoadingPill Component**: Redesigned with horizontal layout, compact progress bar, and improved accessibility
- **AddToInvestigationButton**: Added quick-add functionality to Document and Media cards for streamlined workflow
- **Error Boundary Implementation**: Enhanced error handling with scoped boundaries for critical components

### 4. Backend & Infrastructure
- **Schema Validation**: Added comprehensive database schema validation and correction scripts
- **Build Process Optimization**: Streamlined build process with improved error handling
- **Dependency Updates**: Updated core dependencies for better stability and security

## 📊 Technical Stats
- **Build Size:** ~1.5MB (gzipped: ~400KB)
- **Modules Transformed:** 2,413
- **Build Time:** ~4 seconds

---

# 🚀 Epstein Archive: Production Release Notes (v3.7.0)
**November 29, 2025**

We have deployed a comprehensive update focusing on navigation improvements, streamlined workflows, and enhanced user experience across all components.

## 🌟 Key Highlights

### 1. Navigation & Workflow Enhancements
- **Contextual Deep Links**: Added direct "View related docs" and "Open network" links on cards and modals for faster navigation
- **Consistent Breadcrumbs**: Implemented breadcrumbs across all pages for better orientation and quick context switching
- **Unified Global Search**: Created sticky global search that filters current view with typed suggestions
- **Streamlined Investigation Linking**: One-click "Quick Add" buttons on all card types (Person, Document, Media) to instantly add items to investigations

### 2. Feedback & Loading Improvements
- **Background Task Notifications**: Added lightweight toast notifications for background tasks (enrich/reindex/import) with start/success/failure states and retry options
- **Optimistic UI Feedback**: Implemented spinners and disabled states for actions like "Open Document" and "Add to Investigation" during processing
- **Progressive Loading**: Added virtual scrolling and page indicators for large lists (People/Media/Docs) to reduce perceived wait times

### 3. Error Handling & Resilience
- **Scoped Error Boundaries**: Implemented route-level error boundaries for Analytics, Media, and EvidenceModal components to localize failures
- **Tailored Error Fallbacks**: Added specific fallbacks for common failure modes (no docs for entity, API unavailable) with helpful next steps and one-click retry

### 4. Consistency & Visual Improvements
- **Icon Standardization**: Standardized all icon usage through the Icon wrapper component for consistency and easier theming
- **Card Layout Unification**: Unified spacing, typography scales, and badge styles across Person, Document, and Media cards for cohesive experience
- **Risk Badge Consolidation**: Consolidated risk badges and Red Flag Index into a single semantic component with consistent color scale and labels

### 5. Accessibility Enhancements
- **Modal Focus Management**: Expanded focus management in modals with trap and restore focus functionality
- **Color-Blind Friendly Risk States**: Replaced purely color-coded risk states with text labels and icons for better accessibility
- **Improved Contrast**: Verified contrast ratios on dark backgrounds for better readability

### 6. Discoverability & Onboarding
- **First-Run Onboarding**: Implemented guided onboarding to highlight power features (filters, risk chips, adding evidence to investigations)
- **Contextual Microcopy**: Added explanatory text under analytics charts and in Evidence modal sections to clarify what users are seeing

### 7. Performance Optimizations
- **Data Loading Strategies**: Implemented server-side streaming/pagination and client-side caching with prefetch for heavy endpoints
- **Computation Optimization**: Added memoization for expensive list item computations and deferred parsing/highlighting to web workers

### 8. Information Architecture Improvements
- **Media View Persistence**: Implemented localStorage persistence for media view settings, filters, and selections with quick reset option
- **Investigation Linking Flow**: Simplified evidence linking from cards with direct one-click addition to investigations

## 📊 Technical Stats
- **Build Size:** ~1.5MB (gzipped: ~400KB)
- **Modules Transformed:** 2,413
- **Build Time:** ~4 seconds

---

# 🚀 Epstein Archive: Production Release Notes (v3.6.0)
**November 28, 2025**

We have deployed a comprehensive update focusing on UI enhancements, improved accessibility, and mobile responsiveness.

## 🌟 Key Highlights

### 1. Enhanced Header Buttons
- **Collapsible Icons**: Header buttons (What's New, Shortcuts, Verified Source) now collapse into round icons on desktop with smooth hover animations to show text labels
- **Improved Accessibility**: Added proper `aria-label` attributes and screen reader announcements for all header interactions
- **Smoother Animations**: Implemented transform-based transitions for better performance

### 2. Responsive Sort Label
- **Mobile Optimization**: Removed the word "by" in "Sort by:" on mobile devices to prevent overflow and layout issues
- **Consistent Experience**: Maintains clear functionality across all device sizes

### 3. Interactive Risk Filtering
- **Enhanced Visual Feedback**: Risk level chips (High/Medium/Low Risk) now properly filter entities with improved visual feedback
- **Active State Indicators**: Selected filters display with bright ring effects and enhanced shadows for clear identification

### 4. General UI Improvements
- **Search Icon**: Confirmed existing search icon implementation in the search box
- **Tooltip Effects**: Enhanced fade effects on tooltips with transition-opacity for smoother user experience

# 🚀 Epstein Archive: Production Release Notes (v2.4)
**November 27, 2025**

## 🌟 Key Highlights

### 1. Full Data Verification & Enrichment
- **Complete Entity Loading:** All entities load correctly with metadata
- **Media Verification:** All images and documents are accessible and loading properly
- **Risk/Red Flag Analysis:** Complete risk scoring across all entities
- **Relationship Mapping:** Enriched relationship data with connections between entities

### 2. Build & Infrastructure Fixes
- **Fixed PDF Viewer:** Corrected CSS import paths for react-pdf components
- **Production Build:** Clean build with no errors
- **Optimized Bundle:** Efficient code splitting for faster load times

### 3. UI Improvements
- **Document Metadata Panel:** Enhanced professional metadata display
- **Evidence Search:** Improved search and filtering capabilities
- **Investigation Workspace:** Streamlined workspace for analysis

### 4. Production Deployment
- **End-to-End Verification:** Complete testing of all features
- **Database Integrity:** Verified data consistency and indexing
- **API Performance:** Optimized endpoints for faster responses

## 📊 Technical Stats
- **Build Size:** ~1.5MB (gzipped: ~400KB)
- **Modules Transformed:** 2,413
- **Build Time:** ~4 seconds

---

# 🚀 Epstein Archive: Production Release Notes (v2.3)
**November 27, 2025**

## 🌟 Key Highlights

### 1. Streamlined Navigation
- **Removed Redundant Sidebar:** Eliminated the duplicate left navigation menu for a cleaner, more spacious layout.
- **More Content Space:** Removal of the sidebar provides additional horizontal space for the main content area.
- **Simplified UX:** Users now have a single, clear navigation system via the top tabs.

### 2. Interactive Risk Level Filters
- **Clickable Statistics Chips:** The High Risk, Medium Risk, and Low Risk statistics are now interactive filter buttons.
- **Visual Feedback:** Active filters display with bright ring effects and enhanced shadows for clear indication.
- **Toggle Behavior:** Click a chip to filter by that risk level; click again to deselect and return to unfiltered view.
- **Seamless Integration:** Risk filters work in combination with existing search, entity type, and sort filters.
- **Maintained Sort Order:** Filtering preserves the current sort order for consistent results.

## 📊 User Experience Improvements
- **Cleaner Layout:** Removed visual clutter from duplicate navigation
- **Faster Filtering:** One-click access to risk level filtering
- **Better Visual Hierarchy:** Clear indication of active filters with ring effects

---

# 🚀 Epstein Archive: Production Release Notes (v2.2)
**November 26, 2025**

We have successfully deployed a major update focusing on mobile user experience and accessibility.

## 🌟 Key Highlights

### 1. Mobile UX Overhaul
We've completely redesigned the mobile experience to be more intuitive and touch-friendly.
- **Compact Stats Display:** Key metrics (Subjects, Risk Levels) are now displayed in a compact, single-row layout on all devices.
- **Enhanced Mobile Menu:** Added a dedicated "Home" link, larger touch targets (44px+), and swipe-to-close gestures.
- **Mobile Stats Row:** Restored visibility of critical statistics (Subjects, Files) on mobile screens.
- **Visual Feedback:** Added tactile feedback (active states) to all interactive elements for a more responsive feel.

### 2. Accessibility Improvements
- **Touch Targets:** Optimized button sizes for easier tapping on small screens.
- **Navigation:** Improved menu accessibility and structure.

---

# 🚀 Epstein Archive: Production Release Notes (v2.0)
**November 25, 2025**

We have successfully deployed a major update to the Epstein Archive, focusing on data integrity, relationship mapping, and user experience enhancements. This release transforms the archive from a simple document repository into a sophisticated investigative tool.

## 🌟 Key Highlights

### 1. Massive Entity Consolidation
We've cleaned up the database by merging duplicate and fragmented entities, resulting in a cleaner, more accurate dataset.
- **Merged 1,484 duplicate entities** across 3 phases.
- **Phase 1 (Exact Matches):** Merged 1,249 entities (e.g., "Bill Clinton" + "William Clinton").
- **Phase 2 (Title Normalization):** Merged 133 entities by stripping titles (e.g., "President Clinton" -> "Bill Clinton").
- **Phase 3 (Nickname Resolution):** Merged 101 entities using a nickname dictionary (e.g., "Bill" -> "William").
- **Result:** Reduced total entity count from ~48,675 to **47,191 unique, high-quality entities**.

### 2. Advanced Relationship Mapping
We've implemented a new engine to discover and visualize connections between entities.
- **Co-occurrence Analysis:** Generated **208,207 relationship links** based on entities appearing in the same documents.
- **Contextual Awareness:** Links are weighted by proximity and document relevance.
- **Foundation for Network Graph:** This data powers the upcoming interactive network visualization.

### 3. Entity Importance Scoring
We've introduced a sophisticated scoring system to surface the most relevant figures.
- **Importance Score:** Calculated for all **47,191 entities** based on:
  - Mention frequency
  - Network centrality (number of connections)
  - "Red Flag" rating
  - Presence in the Black Book
- **Smart Sorting:** Default sorting now prioritizes high-importance entities, ensuring users see key figures first.

### 4. Enhanced Filtering & UI
We've refined the user interface to make data exploration more intuitive.
- **Entity Type Filter:** New dropdown to filter by **Person (40,887)**, **Organization (4,351)**, **Location (1,448)**, etc.
- **"Red Flag" Terminology:** Replaced all "Spice" references with professional "Red Flag" terminology (🚩) throughout the app.
- **Improved Search:** Search results now leverage the consolidated data for better accuracy.

### 5. Infrastructure Hardening
- **Database Optimization:** Added indexes and views for faster query performance.
- **Robust Deployment:** Implemented a secure, automated deployment pipeline.
- **Data Integrity:** Fixed database corruption issues and implemented backup procedures.

## 📊 Impact by the Numbers
- **Entities:** 47,191 (Optimized)
- **Relationships:** 208,207 (New)
- **Persons:** 40,887
- **Organizations:** 4,351
- **Merges Performed:** 1,484

## 🔜 What's Next
- **Interactive Network Graph:** Visualizing the 208k relationships.
- **Timeline Analysis:** Deep dive into temporal connections.
- **AI-Powered Summaries:** Auto-generating bios for key figures.