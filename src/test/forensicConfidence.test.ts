import assert from 'node:assert/strict';
import {
  clearForensicConfidenceCache,
  computeForensicConfidence,
} from '../utils/forensicConfidence';

console.log('Running forensic confidence determinism tests...');

clearForensicConfidenceCache();

const baseInput = {
  toolId: 'documents',
  count: 12,
  ingestRunId: 'run-001',
  rulesetVersion: 'forensic-rules-v1',
  modelId: 'model-alpha',
  factors: {
    coverage: 0.8,
    signalQuality: 0.7,
    corroboration: 0.6,
    modelCertainty: 0.9,
  },
  factorInputs: {
    documentCount: 12,
    timelineCount: 4,
  },
};

const first = computeForensicConfidence(baseInput);
const second = computeForensicConfidence(baseInput);

assert.equal(first.finalScore, second.finalScore, 'same inputs should produce same score');
assert.equal(
  first.metadata.cacheKey,
  second.metadata.cacheKey,
  'same inputs should reuse cache key',
);

const changedRun = computeForensicConfidence({ ...baseInput, ingestRunId: 'run-002' });
assert.notEqual(
  first.metadata.cacheKey,
  changedRun.metadata.cacheKey,
  'ingest run changes must invalidate cache key',
);

const changedRuleset = computeForensicConfidence({
  ...baseInput,
  rulesetVersion: 'forensic-rules-v2',
});
assert.notEqual(
  first.metadata.cacheKey,
  changedRuleset.metadata.cacheKey,
  'ruleset changes must invalidate cache key',
);

const empty = computeForensicConfidence({
  ...baseInput,
  count: 0,
  factors: {
    coverage: null,
    signalQuality: null,
    corroboration: null,
    modelCertainty: null,
  },
});
assert.equal(empty.finalScore, null, 'missing inputs should return N/A (null score)');
assert.ok(empty.missingInputs.length > 0, 'missing input explanation should be present');

console.log('Forensic confidence tests passed.');
