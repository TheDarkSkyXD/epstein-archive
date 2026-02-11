import fetch from 'node-fetch';

async function probe() {
  const host = 'http://localhost:52415';

  // 1. Try specific IDs from context
  const candidates = [
    '8A6B3AA5',
    'mlx-community/Meta-Llama-3.1-8B-Instruct-8bit',
    'Meta-Llama-3.1-8B-Instruct-8bit',
    'Llama-3.1-8B-Instruct-8bit',
    'llama-3.1-8b-instruct-8bit',
  ];

  console.log('🔍 Probing specific candidates...');

  for (const model of candidates) {
    try {
      const start = Date.now();
      const response = await fetch(`${host}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: 'hi' }],
          max_tokens: 1,
        }),
      });

      if (response.ok) {
        console.log(`✅ SUCCESS: Active Model ID is "${model}" (${Date.now() - start}ms)`);
        process.exit(0);
      } else {
        // console.log(`❌ ${model}: ${response.status}`);
      }
    } catch (e) {
      console.log(`⚠️ ${model}: ${e.message}`);
    }
  }

  console.log('❌ No candidates worked.');
}

probe();
