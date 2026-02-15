import { AIEnrichmentService } from '../src/server/services/AIEnrichmentService';

async function testDiscovery() {
  process.env.AI_PROVIDER = 'exo_cluster';
  process.env.EXO_HOST = 'http://127.0.0.1:52415';

  console.log('Testing Exo Model Discovery...');
  try {
    // @ts-ignore
    const model = await AIEnrichmentService.autoDiscoverExoModel();
    console.log('Discovered Model:', model);

    // @ts-ignore
    const endpoint = AIEnrichmentService.getApiEndpoint();
    console.log('API Endpoint:', endpoint);

    const response = await fetch(`${process.env.EXO_HOST}/v1/models`);
    const data = await response.json();
    console.log(
      'Available Models from API:',
      (data as any).data.map((m: any) => m.id),
    );
  } catch (e) {
    console.error('Discovery Failed:', e);
  }
}

testDiscovery();
