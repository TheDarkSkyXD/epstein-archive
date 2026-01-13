// Test the API functionality
console.log('Testing API endpoints...');

const API_BASE_URL = 'http://localhost:3012/api';

async function testApiEndpoint(url: string, description: string) {
  try {
    console.log(`\nTesting ${description}...`);
    const response = await fetch(url);
    const data = await response.json();
    console.log(`  Status: ${response.status} ${response.statusText}`);
    console.log(`  Success: ${response.ok}`);
    if (response.ok) {
      console.log(`  Data keys: ${Object.keys(data).join(', ')}`);
    } else {
      console.log(`  Error: ${data.error || 'Unknown error'}`);
    }
    return { success: response.ok, data };
  } catch (error) {
    console.log(`  Error: ${(error as Error).message}`);
    return { success: false, error };
  }
}

async function runTests() {
  console.log('API Tests Started');

  // Test 1: Health check
  await testApiEndpoint(`${API_BASE_URL}/health`, 'Health endpoint');

  // Test 2: Stats endpoint
  const statsResult = await testApiEndpoint(`${API_BASE_URL}/stats`, 'Statistics endpoint');

  // Test 3: Entities endpoint
  await testApiEndpoint(`${API_BASE_URL}/entities`, 'Entities endpoint');

  // Test 4: Search endpoint
  await testApiEndpoint(`${API_BASE_URL}/search?q=Trump`, 'Search endpoint');

  console.log('\nAPI Tests Completed');
}

runTests();
