import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

// 1. Define the Move Mapping (Old Name -> New Subdir)
const MOVES: Record<string, string> = {
  // Common
  'Button.tsx': 'common',
  'Card.tsx': 'common',
  'BaseCard.tsx': 'common',
  'CircularProgress.tsx': 'common',
  'ErrorBoundary.tsx': 'common',
  'ScopedErrorBoundary.tsx': 'common',
  'TailoredErrorFallback.tsx': 'common',
  'FormField.tsx': 'common',
  'FormLayout.tsx': 'common',
  'Select.tsx': 'common',
  'HelpText.tsx': 'common',
  'Icon.tsx': 'common',
  'LazyImage.tsx': 'common',
  'LoadingIndicator.tsx': 'common',
  'LoadingPill.tsx': 'common',
  'ProgressBar.tsx': 'common',
  'SEO.tsx': 'common',
  'Tooltip.tsx': 'common',
  'VirtualList.tsx': 'common',
  'AutoSizer.tsx': 'common',
  'ToastProvider.tsx': 'common',

  // Layout
  'Layout.tsx': 'layout',
  'Footer.tsx': 'layout',
  'MobileMenu.tsx': 'layout',
  'Breadcrumb.tsx': 'layout',
  'SearchFilters.tsx': 'layout',
  'GlobalSearch.tsx': 'layout',
  'SortFilter.tsx': 'layout',

  // Visualizations
  'DataVisualization.tsx': 'visualizations',
  'DataVisualizationEnhanced.tsx': 'visualizations',
  'DataIntegrityPanel.tsx': 'visualizations',
  'NetworkGraph.tsx': 'visualizations',
  'NetworkVisualization.tsx': 'visualizations',
  'SunburstChart.tsx': 'visualizations',
  'Timeline.tsx': 'visualizations',
  'TimelineVisualization.tsx': 'visualizations',
  'AreaTimeline.tsx': 'visualizations',
  'TreeMap.tsx': 'visualizations',
  'LocationMap.tsx': 'visualizations',
  'RouteMap.tsx': 'visualizations',

  // Entities
  'PersonCard.tsx': 'entities',
  'PersonCardSkeleton.tsx': 'entities',
  'EntityEvidencePanel.tsx': 'entities',
  'EntityGraphPanel.tsx': 'entities',
  'EntityMediaGallery.tsx': 'entities',
  'EntityRelationshipMapper.tsx': 'entities',
  'EntityConfidenceDisplay.tsx': 'entities',
  'EntityTypeFilter.tsx': 'entities',
  'PeopleSelector.tsx': 'entities',
  'CreateEntityModal.tsx': 'entities',
  'CreateRelationshipModal.tsx': 'entities',

  // Documents
  'DocumentBrowser.tsx': 'documents',
  'DocumentCard.tsx': 'documents',
  'DocumentContentRenderer.tsx': 'documents',
  'DocumentMetadataPanel.tsx': 'documents',
  'DocumentModal.tsx': 'documents',
  'DocumentProvenance.tsx': 'documents',
  'DocumentSkeleton.tsx': 'documents',
  'DocumentUploader.tsx': 'documents',
  'DocumentAnnotationSystem.tsx': 'documents',

  // Investigation
  'InvestigationWorkspace.tsx': 'investigation',
  'InvestigationBoard.tsx': 'investigation',
  'InvestigationActivityFeed.tsx': 'investigation',
  'InvestigationCaseFolder.tsx': 'investigation',
  'InvestigationEvidencePanel.tsx': 'investigation',
  'InvestigationExportTools.tsx': 'investigation',
  'InvestigationOnboarding.tsx': 'investigation',
  'InvestigationTeamManagement.tsx': 'investigation',
  'InvestigationTimelineBuilder.tsx': 'investigation',
  'ForensicAnalysisWorkspace.tsx': 'investigation',
  'ForensicDocumentAnalyzer.tsx': 'investigation',
  'ForensicReportGenerator.tsx': 'investigation',
  'HypothesisTestingFramework.tsx': 'investigation',
  'ChainOfCustodyModal.tsx': 'investigation',

  // Media
  'MediaViewer.tsx': 'media',
  'MediaViewerModal.tsx': 'media',
  'AudioBrowser.tsx': 'media',
  'AudioPlayer.tsx': 'media',
  'AudioTab.tsx': 'media',
  'VideoBrowser.tsx': 'media',
  'VideoPlayer.tsx': 'media',
  'VideoTab.tsx': 'media',
  'PhotoBrowser.tsx': 'media',
  'MediaCard.tsx': 'media',
  'MediaAndArticlesTab.tsx': 'media',

  // Pages
  'About.tsx': 'pages',
  'AboutPage.tsx': 'pages',
  'FAQPage.tsx': 'pages',
  'StatsDashboard.tsx': 'pages',
  'StatsDisplay.tsx': 'pages',
  'StatsSkeleton.tsx': 'pages',
  'DataQualityDashboard.tsx': 'pages',
  'MemoryDashboard.tsx': 'pages',
  'EnhancedAnalytics.tsx': 'pages',
  'SensitiveContent.tsx': 'common',
  'BatchToolbar.tsx': 'common',
  'TagSelector.tsx': 'common',
  'AddToInvestigationButton.tsx': 'common',
  'BoardOnboarding.tsx': 'investigation',
  'MultiSourceCorrelationEngine.tsx': 'investigation',
  'EvidencePacketExporter.tsx': 'investigation',
  'EvidenceNotebook.tsx': 'investigation',
  'CommunicationAnalysis.tsx': 'investigation',
  'ArticlesTab.tsx': 'media',
  'MediaTab.tsx': 'media',
  'FinancialTransactionMapper.tsx': 'visualizations',
  'EvidenceAnnotation.tsx': 'documents',
  'HighlightNavigationControls.tsx': 'documents',
  'SourceBadge.tsx': 'common',
  'RedFlagIndex.tsx': 'visualizations',
  'ArticleCard.tsx': 'media',
  'ArticleViewerModal.tsx': 'media',
  'EvidenceModal.tsx': 'common',
};

// ... (keep FILE_MAP building) ...
// Actually I need to replace the loop logic.

// Build Lookup Tables
const COMPONENT_ROOT = path.resolve('src/components');
const FILE_MAP = new Map<string, string>(); // Old ABS Path -> New ABS Path

Object.entries(MOVES).forEach(([filename, subdir]) => {
  const oldPath = path.join(COMPONENT_ROOT, filename);
  const newPath = path.join(COMPONENT_ROOT, subdir, filename);
  FILE_MAP.set(oldPath, newPath);
});

async function main() {
  const files = await glob('src/**/*.{ts,tsx,js,jsx}', { ignore: 'node_modules/**' });

  for (const file of files) {
    const absFile = path.resolve(file);
    const content = fs.readFileSync(absFile, 'utf-8');

    const isMovedFile = Array.from(FILE_MAP.values()).includes(absFile);

    const lines = content.split('\n');
    const newLines = lines.map((line) => {
      let newLine = line;

      // Helper function to process a specific path within the line
      const processPath = (importPath: string) => {
        let updatedPath = importPath;

        // PASS 1: Component Moves
        for (const [filename, subdir] of Object.entries(MOVES)) {
          const basename = filename.replace(/\.tsx?$/, '');
          const isReferenceToMoved =
            updatedPath.endsWith(`/${basename}`) || updatedPath === basename;

          if (isReferenceToMoved) {
            const targetNewAbsPath = path.join(COMPONENT_ROOT, subdir, filename);
            let newRelPath = path.relative(path.dirname(absFile), targetNewAbsPath);
            if (!newRelPath.startsWith('.')) newRelPath = './' + newRelPath;
            newRelPath = newRelPath.replace(/\.tsx?$/, '');
            updatedPath = newRelPath;
            return updatedPath; // Found match, return
          }
        }

        // PASS 2: Deepening
        if (isMovedFile) {
          const externalDirs = [
            'types',
            'utils',
            'hooks',
            'contexts',
            'services',
            'server',
            'img',
            'styles',
            'config',
          ];
          const isExternalRef = externalDirs.some(
            (dir) => updatedPath.startsWith(`../${dir}`) || updatedPath === `../${dir}`,
          );

          if (isExternalRef) {
            updatedPath = `../${updatedPath}`;
          }
        }
        return updatedPath;
      };

      // Match static imports: from "..."
      const staticMatch = line.match(/from ['"](.*)['"]/);
      if (staticMatch) {
        const oldPath = staticMatch[1];
        const newPath = processPath(oldPath);
        if (newPath !== oldPath) {
          newLine = newLine.replace(oldPath, newPath);
        }
      }

      // Match dynamic imports: import("...")
      const dynamicMatch = line.match(/import\(['"](.*)['"]\)/);
      if (dynamicMatch) {
        const oldPath = dynamicMatch[1];
        const newPath = processPath(oldPath);
        if (newPath !== oldPath) {
          newLine = newLine.replace(oldPath, newPath);
        }
      }

      return newLine;
    });

    if (newLines.join('\n') !== content) {
      console.log(`Updating imports in ${file}`);
      fs.writeFileSync(absFile, newLines.join('\n'));
    }
  }
}

main();
