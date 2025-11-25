import { EntityNameService } from '../src/services/EntityNameService';

const testNames = [
  'Who Was',
  'You Don',
  'He Said',
  'She Went',
  'It Is',
  'They Are',
  'Was There',
  'Is That',
  'Alan Dershowitz',
  'Barack Obama',
  'Jeffrey Epstein',
  'Bill Clinton'
];

console.log('Testing EntityNameService validation...');

for (const name of testNames) {
  const isValid = EntityNameService.isValidPersonName(name);
  console.log(`"${name}": ${isValid ? 'VALID' : 'INVALID'}`);
}
