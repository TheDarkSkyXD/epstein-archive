import fs from 'fs';
import path from 'path';

console.log('Running Smoke Tests...');

// 1. Check DB existence
const dbPath = process.env.DB_PATH || 'epstein-archive.db';
if (!fs.existsSync(dbPath)) {
  console.error(`❌ Database not found at ${dbPath}`);
  process.exit(1);
}
console.log('✅ Database file exists');

// 2. Check Source Integrity
const mainApp = path.resolve('src/App.tsx');
if (!fs.existsSync(mainApp)) {
  console.error('❌ src/App.tsx missing');
  process.exit(1);
}

// 3. Check for specific reorganized paths
const checkPaths = [
  'src/components/common/Card.tsx',
  'src/components/layout/Footer.tsx',
  'src/components/investigation/InvestigationWorkspace.tsx',
];

let failed = false;
checkPaths.forEach((p) => {
  if (!fs.existsSync(p)) {
    console.error(`❌ Missing component: ${p}`);
    failed = true;
  }
});

if (failed) process.exit(1);

console.log('✅ Critical components found');

console.log('✅ Smoke Tests Passed');
process.exit(0);
