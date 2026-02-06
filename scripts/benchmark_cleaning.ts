#!/usr/bin/env tsx
import { TextCleaner } from './utils/text_cleaner.js';
import { AIEnrichmentService } from '../src/server/services/AIEnrichmentService.js';

async function runBenchmark() {
  const testCases = [
    {
      original: 'wh=n he arrived th=re',
      context: 'I was waiting for him at the house when he arrived there.',
      expected: 'when he arrived there',
    },
    {
      original: 'the cl=ent was unhappy',
      context: 'The attorney said the client was unhappy with the settlement.',
      expected: 'the client was unhappy',
    },
    {
      original: 'sent via =9yo agent',
      context: 'The documents were sent via a 19yo agent in the Thomas islands.',
      expected: 'sent via 19yo agent',
    },
  ];

  console.log('=== DATA CLEANING BENCHMARK ===');
  console.log(`| Original | Regex Sledgehammer | Agentic AI (POC) | Match? |`);
  console.log(`|----------|--------------------|------------------|--------|`);

  for (const tc of testCases) {
    const regexResult = TextCleaner.cleanEmailText(tc.original);
    const aiResult = await AIEnrichmentService.repairMimeWildcards(tc.original, tc.context);

    const match = aiResult.toLowerCase() === tc.expected.toLowerCase() ? '✅' : '❌';

    console.log(`| ${tc.original} | ${regexResult} | ${aiResult} | ${match} |`);
  }
}

runBenchmark().catch(console.error);
