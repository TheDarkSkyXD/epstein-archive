import { EntityNameService } from '../services/EntityNameService';

// Test the EntityNameService functionality
console.log('Testing EntityNameService...');

// Test 1: Check that false positive patterns are correctly identified
console.log('\n1. Testing false positive pattern detection:');
const falsePositives = [
  'In No Event And Under No Legal Theory',
  'Including Any Direct',
  'Please notify us immediately by return',
  'Confidentiality notice',
  'This email and any files'
];

falsePositives.forEach(name => {
  const isValid = EntityNameService.isValidPersonName(name);
  console.log(`  "${name}" -> ${isValid ? 'VALID' : 'INVALID'} (should be INVALID)`);
  if (isValid) {
    console.log(`    ERROR: False positive "${name}" was incorrectly identified as a valid person name!`);
  }
});

// Test 2: Check that valid person names are correctly identified
console.log('\n2. Testing valid person name detection:');
const validNames = [
  'Donald Trump',
  'Jeffrey Epstein',
  'Bill Clinton',
  'Ghislaine Maxwell',
  'Prince Andrew'
];

validNames.forEach(name => {
  const isValid = EntityNameService.isValidPersonName(name);
  console.log(`  "${name}" -> ${isValid ? 'VALID' : 'INVALID'} (should be VALID)`);
  if (!isValid) {
    console.log(`    ERROR: Valid name "${name}" was incorrectly identified as invalid!`);
  }
});

// Test 3: Check name consolidation
console.log('\n3. Testing name consolidation:');
const nameVariants = [
  { input: 'Trump', expected: 'Donald Trump' },
  { input: 'DT', expected: 'Donald Trump' },
  { input: 'DJT', expected: 'Donald Trump' },
  { input: 'Donnie', expected: 'Donald Trump' },
  { input: 'Donald', expected: 'Donald Trump' },
  { input: 'Epstein', expected: 'Jeffrey Epstein' },
  { input: 'Clinton', expected: 'Bill Clinton' }
];

nameVariants.forEach(({ input, expected }) => {
  const consolidated = EntityNameService.consolidatePersonName(input);
  console.log(`  "${input}" -> "${consolidated}" (expected: "${expected}")`);
  if (consolidated !== expected) {
    console.log(`    ERROR: Expected "${expected}" but got "${consolidated}"!`);
  }
});

// Test 4: Check organization recognition
console.log('\n4. Testing organization recognition:');
const organizations = [
  { name: 'Russia', expected: true },
  { name: 'CIA', expected: true },
  { name: 'FBI', expected: true },
  { name: 'Mossad', expected: true },
  { name: 'Kremlin', expected: true },
  { name: 'Central Intelligence Agency', expected: true }
];

organizations.forEach(({ name, expected }) => {
  const isValid = EntityNameService.isValidOrganizationName(name);
  console.log(`  "${name}" -> ${isValid ? 'VALID' : 'INVALID'} (expected: ${expected ? 'VALID' : 'INVALID'})`);
  if (isValid !== expected) {
    console.log(`    ERROR: Expected ${expected ? 'VALID' : 'INVALID'} but got ${isValid ? 'VALID' : 'INVALID'}!`);
  }
});

console.log('\nEntityNameService tests completed.');