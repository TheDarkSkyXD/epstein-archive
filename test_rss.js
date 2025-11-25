import { DOMParser } from 'xmldom';

// Test RSS feed fetching
async function testRSSFeed() {
  const feedUrl = "https://generik.substack.com/feed";
  
  try {
    console.log('Testing RSS feed fetch...');
    const response = await fetch(feedUrl);
    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers.get('content-type'));
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const text = await response.text();
    console.log('Response text length:', text.length);
    console.log('Response text preview:', text.substring(0, 200));
    
    // Try to parse as XML
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, 'text/xml');
    
    const parserError = xmlDoc.getElementsByTagName('parsererror');
    if (parserError.length > 0) {
      console.error('XML parsing error:', parserError[0].textContent);
    } else {
      console.log('XML parsing successful');
      
      const items = xmlDoc.getElementsByTagName('item');
      console.log('Found items:', items.length);
      
      if (items.length > 0) {
        // Check first 5 items for epstein content
        for (let i = 0; i < Math.min(5, items.length); i++) {
          const item = items[i];
          const title = item.getElementsByTagName('title')[0]?.textContent;
          const description = item.getElementsByTagName('description')[0]?.textContent;
          
          console.log(`\n--- Item ${i + 1} ---`);
          console.log('Title:', title);
          console.log('Description preview:', description?.substring(0, 100));
          
          // Check for epstein tag
          const categories = item.getElementsByTagName('category');
          console.log('Categories found:', categories.length);
          for (let j = 0; j < categories.length; j++) {
            console.log('Category:', categories[j].textContent);
          }
          
          // Check if title or description contains "epstein"
          const hasEpstein = 
            (title && title.toLowerCase().includes('epstein')) ||
            (description && description.toLowerCase().includes('epstein'));
          console.log('Contains "epstein":', hasEpstein);
        }
      }
    }
    
  } catch (error) {
    console.error('Error fetching RSS feed:', error);
  }
}

testRSSFeed();