import { ArticleFeedService } from './src/services/articleFeedService.ts';

async function testArticleFeed() {
  const service = new ArticleFeedService();
  const feedUrl = "https://generik.substack.com/feed";
  
  console.log('Testing article feed service...');
  
  try {
    // Test without filter first
    console.log('\n1. Testing without filter:');
    const allArticles = await service.fetchArticles(feedUrl);
    console.log(`Found ${allArticles.length} total articles`);
    
    if (allArticles.length > 0) {
      console.log('\nFirst 3 articles:');
      allArticles.slice(0, 3).forEach((article, i) => {
        console.log(`${i + 1}. ${article.title}`);
        console.log(`   Date: ${article.pubDate}`);
        console.log(`   Categories: [${article.categories.join(', ')}]`);
        console.log(`   Description: ${article.description.substring(0, 100)}...`);
      });
    }
    
    // Test with epstein filter
    console.log('\n2. Testing with "epstein" filter:');
    const filteredArticles = await service.fetchArticles(feedUrl, 'epstein');
    console.log(`Found ${filteredArticles.length} articles with "epstein"`);
    
    if (filteredArticles.length > 0) {
      console.log('\nFiltered articles:');
      filteredArticles.forEach((article, i) => {
        console.log(`${i + 1}. ${article.title}`);
        console.log(`   Date: ${article.pubDate}`);
        console.log(`   Categories: [${article.categories.join(', ')}]`);
        console.log(`   Description: ${article.description.substring(0, 100)}...`);
      });
    }
    
  } catch (error) {
    console.error('Error testing article feed:', error);
  }
}

testArticleFeed();