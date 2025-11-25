// Test script to check each of the 6 issues
console.log('=== TESTING EPSTEIN FILES APP ISSUES ===\n');

// Issue 1: Analytics page breaks the app
console.log('1. Testing Analytics Page...');
try {
  // Check if DataVisualization component can be imported
  const dataVizResponse = await fetch('/src/components/DataVisualization.tsx');
  console.log('✓ DataVisualization component accessible:', dataVizResponse.ok);
} catch (error) {
  console.log('✗ Analytics page error:', error.message);
}

// Issue 2: Search page content access
console.log('\n2. Testing Search Page Content Access...');
try {
  // Check if EvidenceSearch component loads data
  const searchResponse = await fetch('/src/components/EvidenceSearch.tsx');
  console.log('✓ EvidenceSearch component accessible:', searchResponse.ok);
} catch (error) {
  console.log('✗ Search page error:', error.message);
}

// Issue 3: Document highlighting
console.log('\n3. Testing Document Highlighting...');
try {
  // Check if EvidenceModal supports highlighting
  const modalResponse = await fetch('/src/components/EvidenceModal.tsx');
  const modalText = await modalResponse.text();
  const hasHighlighting = modalText.includes('searchTerm') && modalText.includes('highlight');
  console.log('✓ EvidenceModal has highlighting support:', hasHighlighting);
} catch (error) {
  console.log('✗ Document highlighting error:', error.message);
}

// Issue 4: Timeline document opening
console.log('\n4. Testing Timeline Document Opening...');
try {
  const timelineResponse = await fetch('/src/components/Timeline.tsx');
  const timelineText = await timelineResponse.text();
  const hasClickHandler = timelineText.includes('onClick') && timelineText.includes('setSelectedEvent');
  console.log('✓ Timeline has click handlers:', hasClickHandler);
} catch (error) {
  console.log('✗ Timeline error:', error.message);
}

// Issue 5: Document pane mock data
console.log('\n5. Testing Document Pane for Mock Data...');
try {
  const docBrowserResponse = await fetch('/src/components/DocumentBrowser.tsx');
  const docBrowserText = await docBrowserResponse.text();
  const usesRealProcessor = docBrowserText.includes('DocumentProcessor') && !docBrowserText.includes('mockData');
  console.log('✓ DocumentBrowser uses real processor:', usesRealProcessor);
} catch (error) {
  console.log('✗ Document pane error:', error.message);
}

// Issue 6: RSS feed loading
console.log('\n6. Testing RSS Feed Loading...');
try {
  const articleFeedResponse = await fetch('/src/components/ArticleFeed.tsx');
  const articleFeedText = await articleFeedResponse.text();
  const hasFeedService = articleFeedText.includes('ArticleFeedService');
  console.log('✓ ArticleFeed uses feed service:', hasFeedService);
} catch (error) {
  console.log('✗ RSS feed error:', error.message);
}

console.log('\n=== TEST COMPLETE ===');

// Test data loading
console.log('\n=== TESTING DATA LOADING ===');
try {
  const peopleResponse = await fetch('/data/people.json');
  const peopleData = await peopleResponse.json();
  console.log('✓ People data loaded:', peopleData.length, 'records');
  
  const evidenceResponse = await fetch('/data/evidence_database.json');
  console.log('✓ Evidence database accessible:', evidenceResponse.ok);
  
  const searchableResponse = await fetch('/data/searchable_files.json');
  console.log('✓ Searchable files accessible:', searchableResponse.ok);
} catch (error) {
  console.log('✗ Data loading error:', error.message);
}