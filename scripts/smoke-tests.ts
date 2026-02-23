import fs from 'fs';
import path from 'path';

console.log('Running Smoke Tests...');

const dbConnectionModule = path.resolve('src/server/db/connection.ts');
if (!fs.existsSync(dbConnectionModule)) {
  console.error('❌ src/server/db/connection.ts missing');
  process.exit(1);
}
console.log('✅ DB connection module present');

const mainApp = path.resolve('src/client/App.tsx');
if (!fs.existsSync(mainApp)) {
  console.error('❌ src/client/App.tsx missing');
  process.exit(1);
}

const checkPaths = [
  'src/client/components/entities/SubjectCardV2.tsx',
  'src/client/components/layout/Footer.tsx',
  'src/client/components/investigation/InvestigationWorkspace.tsx',
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
