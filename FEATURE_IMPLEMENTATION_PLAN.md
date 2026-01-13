# Feature Implementation Plan from Unused Variables Analysis

**Date:** 2026-01-14
**Total Unused Variables Analyzed:** 97
**Current Status:** 62 warnings remaining (62% reduction from 163)

## Executive Summary

This document catalogs all unused variables discovered during the linting cleanup, groups them into coherent features, prioritizes them by impact, and provides a clear implementation roadmap.

## Feature Categories & Prioritization

### Priority 1: Core Investigation Features (HIGH IMPACT)

These features directly enhance the investigation workflow and user experience.

#### 1.1 Chain of Custody Tracking

**Impact:** Critical for legal admissibility
**Complexity:** Medium
**Files Affected:**

- `InvestigationWorkspace.tsx` - Modal integration
- `evidenceChainService` - Service implementation

**Unused Variables:**

- `ChainOfCustodyModal` component
- `evidenceChainService` instance
- `custodyEvidenceId` state

**Implementation Steps:**

1. Create chain of custody modal UI
2. Implement custody transfer workflow
3. Add custody history timeline
4. Integrate with evidence items
5. Add audit logging

**Safe to Delete:** No - Keep modal component, service is infrastructure

---

#### 1.2 Evidence Management

**Impact:** High - Core functionality
**Complexity:** Medium

**Features to Implement:**

- Evidence detail view (`selectedEvidence` state)
- Evidence removal UI (`removeEvidence` function)
- Evidence loading states (`evidenceLoading`)
- Evidence update callbacks (`onEvidenceUpdate`)
- Quick add feature (`showQuickAdd` state)
- Evidence deletion (`Trash2` icon)

**Files Affected:**

- `InvestigationEvidencePanel.tsx`
- `AddToInvestigationButton.tsx`

**Implementation Steps:**

1. Create evidence detail modal/panel
2. Implement CRUD operations UI
3. Add confirmation dialogs
4. Add loading spinners
5. Wire up callbacks

**Safe to Delete:** Loading states can be combined; keep core evidence CRUD structure

---

#### 1.3 Timeline Event Management

**Impact:** High - Core feature
**Complexity:** High

**Features to Implement:**

- Event selection/detail view (`selectedEvent`)
- Auto-generated titles (`generateEventTitle`)
- Auto-generated descriptions (`generateEventDescription`, `_generateDescription`)
- Event type mapping (`mapCategoryToType`, `_mapEvidenceType`)
- Significance scoring (`determineSignificance`, `_calculateSignificance`)
- Color coding (`getTypeColor`)
- Date parsing (`parseDate`, `_parseDate`)

**Files Affected:**

- `Timeline.tsx`
- `InvestigationTimelineBuilder.tsx`
- `timelineRepository.ts`

**Implementation Steps:**

1. Consolidate all timeline utilities into a single service
2. Implement auto-generation logic for titles/descriptions
3. Add event detail panel
4. Implement type-based color coding
5. Add significance filters

**Safe to Delete:** Merge duplicate implementations; multiple helper functions can be consolidated

---

### Priority 2: Forensic Analysis Tools (MEDIUM-HIGH IMPACT)

#### 2.1 Document Analysis Enhancement

**Impact:** Medium-High
**Complexity:** High

**Features to Implement:**

- OCR prettification (`prettifyOCRText`)
- Search highlighting (`highlight` function)
- Document metadata display (`metadata` icons)
- Case context integration (`caseContext`)
- Mock forensic analysis (`_generateMockAnalysis`)
- Date formatting (`format` from date-fns)

**Files Affected:**

- `ForensicDocumentAnalyzer.tsx`
- `DocumentModal.tsx`
- `DocumentBrowser.tsx`
- `DocumentMetadataPanel.tsx`

**Implementation Steps:**

1. Implement OCR text cleanup algorithm
2. Add search term highlighting to document viewer
3. Create metadata sidebar with icons
4. Integrate case context for focused analysis
5. Build forensic analysis generator

**Safe to Delete:** Mock data generation can be removed after real implementation

---

#### 2.2 Network Visualization

**Impact:** Medium
**Complexity:** High

**Features to Implement:**

- Relationship selection (`onRelationshipSelect`)
- Advanced scaling (`d3Scale`)
- Graph controls (`ZoomIn`, `ZoomOut`, `RefreshCw`, `Maximize`, `Filter`)
- Network filters (`Filter`, `AlertTriangle`)
- Mouse wheel zoom (`_handleWheel`)
- Container responsive sizing (`_containerRef`)
- Drag offset tracking (`_dragOffset`)
- Space key pan mode (`spacePressed`)

**Files Affected:**

- `EntityRelationshipMapper.tsx`
- `NetworkVisualization.tsx`
- `NetworkGraph.tsx`

**Implementation Steps:**

1. Add graph control toolbar
2. Implement zoom/pan controls
3. Add relationship click handlers
4. Implement filter UI
5. Add keyboard shortcuts

**Safe to Delete:** Multiple unused d3 imports can be consolidated

---

#### 2.3 Financial Analysis

**Impact:** Medium-High
**Complexity:** Medium

**Features to Implement:**

- Transaction tracking (`investigation`, `evidence` props)
- Search and filtering (`Search`, `Filter`, `X` icons)
- Flow visualization
- Loading/error states

**Files Affected:**

- `FinancialTransactionAnalysis.tsx`
- `FinancialTransactionMapper.tsx`

**Implementation Steps:**

1. Connect to real transaction data
2. Implement search UI
3. Add transaction filters
4. Create flow diagrams
5. Add pattern detection

**Safe to Delete:** Mock transaction data after real implementation

---

### Priority 3: UI/UX Enhancements (MEDIUM IMPACT)

#### 3.1 Pattern Recognition & AI

**Impact:** Medium
**Complexity:** High

**Features to Implement:**

- Pattern visualization (`TrendingUp`, `AlertTriangle`, `FileText`)
- Severity indicators
- Investigation context integration

**Files Affected:**

- `PatternRecognitionAI.tsx`

**Implementation Steps:**

1. Implement pattern detection algorithms
2. Add visualization components
3. Integrate with investigation context
4. Add severity scoring
5. Create pattern alerts

**Safe to Delete:** Keep structure, remove placeholder icons

---

#### 3.2 Hypothesis Testing

**Impact:** Medium
**Complexity:** Medium

**Features to Implement:**

- Confidence calculation (`_updateHypothesisConfidence`, `_calculateOverallConfidence`)
- Tracking indicators (`TrendingUp`, `Calendar`, `AlertTriangle`)

**Files Affected:**

- `HypothesisTestingFramework.tsx`

**Implementation Steps:**

1. Implement confidence calculation algorithm
2. Add visual confidence indicators
3. Create hypothesis timeline
4. Add evidence linking

**Safe to Delete:** Unused helper functions after consolidation

---

#### 3.3 Report Generation

**Impact:** Medium
**Complexity:** Low

**Features to Implement:**

- Report export (`Download`, `Share2`, `Mail`)
- Custom sections (`_customSections`)
- Target audience styling (`getTargetAudienceColor`)
- Multiple export formats

**Files Affected:**

- `ForensicReportGenerator.tsx`
- `InvestigationExportTools.tsx`

**Implementation Steps:**

1. Implement PDF export
2. Add CSV/JSON export
3. Create custom section builder
4. Add email integration
5. Implement print styling

**Safe to Delete:** Unused export format icons after implementation

---

#### 3.4 Investigation UI Polish

**Impact:** Low-Medium
**Complexity:** Low

**Features to Implement:**

- Example investigations (`showExampleInvestigation`, `_createExampleInvestigation`)
- Forensic tools collapsible (`_forensicToolsCollapsed`)
- Onboarding flow
- Communication features (`MessageSquare`, `Phone`, `Mail`)
- Admin features (`Settings`, `Lock`)
- Filter UI (`Filter` icons)

**Files Affected:**

- `InvestigationWorkspace.tsx`
- `InvestigationExportTools.tsx`

**Implementation Steps:**

1. Create example investigation templates
2. Add panel collapse animations
3. Build onboarding tour
4. Add communication integrations
5. Implement admin controls

**Safe to Delete:** Example investigation data can be external JSON

---

### Priority 4: Search & Navigation (MEDIUM IMPACT)

#### 4.1 Enhanced Search

**Impact:** Medium
**Complexity:** Medium

**Features to Implement:**

- Mobile search (`searchTerm`, `onSearchTermChange` in `MobileMenu`)
- Global search modal close (`X` icon)
- FTS (Full-Text Search) (`useFts`)
- Search highlighting

**Files Affected:**

- `MobileMenu.tsx`
- `GlobalSearch.tsx`
- `documentsRepository.ts`

**Implementation Steps:**

1. Enable FTS in SQLite
2. Implement mobile search UI
3. Add search result highlighting
4. Add search filters
5. Implement search history

**Safe to Delete:** FTS flag after enablement

---

#### 4.2 Document Navigation

**Impact:** Medium
**Complexity:** Low

**Features to Implement:**

- Document click handlers (`onDocumentClick`)
- Document collections (`collection`, `_setCollection`)
- Document card view (`_DocumentCard`)

**Files Affected:**

- `PersonCard.tsx`
- `PersonCardRefined.tsx`
- `DocumentBrowser.tsx`

**Implementation Steps:**

1. Implement document detail routing
2. Create collection management
3. Build card/list view toggle
4. Add keyboard navigation

**Safe to Delete:** Duplicate PersonCard implementations (refined vs original)

---

### Priority 5: Infrastructure & Polish (LOW-MEDIUM IMPACT)

#### 5.1 Authentication & Security

**Impact:** Low (already working)
**Complexity:** Low

**Features to Implement:**

- Loading state display (`_isLoading`)
- Error message UI (`_error`)
- Security logging (`password_hash` in logs)

**Files Affected:**

- `AuthContext.tsx`
- `AdminDashboard.tsx`
- `routes.ts`

**Implementation Steps:**

1. Add loading spinners
2. Create error toast system
3. Implement security audit logging
4. Add password history

**Safe to Delete:** Yes - These are polish items

---

#### 5.2 Media Viewer

**Impact:** Low
**Complexity:** Low

**Features to Implement:**

- Metadata display (`Calendar`, `MapPin`)
- Rotation controls (`RotateCcw`)
- Inline viewer (`_showMediaViewer`)
- Filtering state (`_useState` in `MediaTab`)

**Files Affected:**

- `MediaViewerModal.tsx`
- `MediaTab.tsx`
- `DocumentModal.tsx`

**Implementation Steps:**

1. Add EXIF metadata display
2. Implement image rotation
3. Create inline viewer mode
4. Add media type filters

**Safe to Delete:** Unused rotation control after implementation

---

#### 5.3 UI Components & Polish

**Impact:** Low
**Complexity:** Low

**Features to Implement:**

- Table metadata hints (`_metadata` in `TableViewer`)
- Stats display (`_totalMentionsCount`)
- TreeMap tooltips (`_percentage`)
- Loading lifecycle hooks (`_useEffect` in `LoadingPill`)
- Keyboard shortcuts refs (`_useRef`)
- About section (`_Info` icon)
- Card grid layout (`CardGrid`)

**Files Affected:**

- Various UI components

**Implementation Steps:**

1. Add metadata-driven table parsing
2. Display statistics
3. Add tooltips
4. Create loading hooks
5. Implement keyboard shortcuts panel

**Safe to Delete:** Most can be removed - these are minor polish items

---

### Priority 6: Correlation & Advanced Analysis (LOW IMPACT)

#### 6.1 Multi-Source Correlation

**Impact:** Low-Medium
**Complexity:** High

**Features to Implement:**

- Mock correlations (`_generateMockCorrelations`)
- Filtering UI (`Filter`)
- Timeline features (`Clock`)
- Phone/communication analysis (`Phone`)

**Files Affected:**

- `MultiSourceCorrelationEngine.tsx`

**Implementation Steps:**

1. Implement correlation algorithms
2. Add filter interface
3. Create timeline integration
4. Add communication analysis

**Safe to Delete:** Mock data generation

---

#### 6.2 Memory & Relationship Analysis

**Impact:** Low
**Complexity:** Medium

**Features to Implement:**

- Memory editing (`_updateMemoryEntry`)
- Overall quality score (`_overallScore`)
- Graph filters (`_filters`)
- Related entities (`entities` prop)

**Files Affected:**

- `MemoryDashboard.tsx`
- `memoryRepository.ts`
- `relationshipsRepository.ts`

**Implementation Steps:**

1. Implement memory CRUD
2. Add quality scoring
3. Create graph filter UI
4. Build related entities sidebar

**Safe to Delete:** Partial - consolidate scoring logic

---

## Deletion Candidates (Safe to Remove)

### Immediate Deletion (No Feature Loss)

1. **Duplicate implementations:**
   - PersonCard.tsx vs PersonCardRefined.tsx (keep refined)
   - Multiple date parser implementations (consolidate)
   - Multiple helper function duplicates

2. **Mock data generators:**
   - `_generateMockAnalysis` in ForensicDocumentAnalyzer
   - `_generateMockCorrelations` in MultiSourceCorrelationEngine
   - Mock transaction data

3. **Unused type aliases:**
   - `_BaseHypothesis` (just use `Hypothesis`)
   - `EvidenceItem as _EvidenceItem` (use directly)

4. **Placeholder icons** (until feature implemented):
   - Most unused lucide-react icons can be removed
   - Re-add when implementing features

5. **Development helpers:**
   - `useFts = false` flag (remove after FTS enabled)
   - Example investigation generators (move to JSON)

### Defer Deletion (Feature Implementation Required)

1. **Event/Document helpers** - Consolidate first, then remove originals
2. **Graph/Network controls** - Keep structure, remove after toolbar built
3. **State management** - Keep hooks, remove after features wired

---

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)

**Goal:** Enable core investigation workflow

1. Chain of Custody (1.1)
2. Evidence Management (1.2)
3. Basic Timeline (1.3 - core only)
4. Search Enhancement (4.1 - FTS enablement)

**Estimated Effort:** 2 weeks
**Deleted Code:** Mock data, unused type aliases

---

### Phase 2: Analysis Tools (Weeks 3-5)

**Goal:** Robust forensic analysis capabilities

1. Document Analysis (2.1)
2. Financial Analysis (2.3)
3. Timeline Auto-generation (1.3 - helpers)
4. Network Visualization basics (2.2 - core)

**Estimated Effort:** 3 weeks
**Deleted Code:** Duplicate parsers, mock generators

---

### Phase 3: Intelligence Features (Weeks 6-8)

**Goal:** AI-powered insights

1. Pattern Recognition (3.1)
2. Hypothesis Testing (3.2)
3. Network Advanced Features (2.2 - controls)
4. Correlation Engine (6.1)

**Estimated Effort:** 3 weeks
**Deleted Code:** Placeholder visualization components

---

### Phase 4: Polish & Integration (Weeks 9-10)

**Goal:** Professional, polished product

1. Report Generation (3.3)
2. Document Navigation (4.2)
3. Media Viewer Enhancement (5.2)
4. UI Polish (3.4, 5.3)
5. Authentication Enhancement (5.1)

**Estimated Effort:** 2 weeks
**Deleted Code:** All remaining mock data, duplicate components

---

## Code Deletion Script

Run this after implementing features:

```bash
# Remove duplicate PersonCard
rm src/components/PersonCard.tsx

# Remove mock data functions
grep -r "generateMock" src/ --include="*.tsx" --include="*.ts" -l | xargs sed -i '/generateMock/d'

# Remove unused icon imports (after features implemented)
# Manual review recommended

# Consolidate timeline helpers
# Manual merge required: Timeline.tsx + InvestigationTimelineBuilder.tsx + timelineRepository.ts
```

---

## Metrics

- **Total Unused Variables:** 97
- **Grouped into Features:** 20 major features
- **Immediate Deletion Candidates:** ~25 items
- **Defer Deletion:** ~72 items
- **Estimated Total Implementation Time:** 10 weeks
- **High Priority Features:** 7
- **Medium Priority Features:** 8
- **Low Priority Features:** 5

---

## Next Steps

1. **Review & Approve** this plan
2. **Delete immediate candidates** to clean codebase
3. **Start Phase 1 implementation**
4. **Track progress** with TodoWrite tool
5. **Review after each phase** to adjust priorities

---

**Generated:** 2026-01-14
**Last Updated:** 2026-01-14
**Status:** DRAFT - Awaiting Review
