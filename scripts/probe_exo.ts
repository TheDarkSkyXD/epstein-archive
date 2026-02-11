import fetch from 'node-fetch';

async function probe() {
  const host = 'http://localhost:52415';
  const modelsResponse = await fetch(`${host}/v1/models`);
  const modelsData = await modelsResponse.json();
  const models = modelsData.data.map((m) => m.id);

  console.log(`🔍 Probing ${models.length} models...`);

  for (const model of models) {
    try {
      const response = await fetch(`${host}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: 'Say hello' }],
          max_tokens: 5,
        }),
      });

      if (response.ok) {
        console.log(`✅ SUCCESS: Model "${model}" works!`);
        process.exit(0);
      } else {
        const err = await response.text();
        console.log(`❌ FAILED: Model "${model}" -> ${response.status} ${err.substring(0, 100)}`);
      }
    } catch (e) {
      console.log(`⚠️ ERROR: Model "${model}" -> ${e.message}`);
    }
  }
}

probe();
