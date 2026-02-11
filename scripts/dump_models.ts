import fetch from 'node-fetch';
import fs from 'fs';

async function dump() {
  const host = 'http://localhost:52415';
  try {
    const response = await fetch(`${host}/v1/models`);
    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error(e);
  }
}

dump();
