import { EntityNameService } from '../src/services/EntityNameService';

const namesToTest = [
  'Client Privileged Communication',
  'Client Privileged Communications',
  'Mail To Senator Humphrey',
  'Junk Mail To You As Pdfs',
  'Mail To Anyone Who Doesn',
  'May Constitute Inside Information',
  'Typically Preferred',
  'Obama Conducts'
];

console.log('Testing specific names against EntityNameService...');

for (const name of namesToTest) {
  const isValid = EntityNameService.isValidEntity(name);
  console.log(`"${name}": ${isValid ? 'VALID' : 'INVALID'}`);
  
  if (isValid) {
    // detailed debug
    const words = name.trim().split(/\s+/);
    const lowerWords = words.map(w => w.toLowerCase());
    const firstWord = lowerWords[0];
    
    console.log(`  - First word: "${firstWord}"`);
    // Check generic nouns manually
    // @ts-expect-error - Accessing private static property for debugging
    const genericNouns = EntityNameService.GENERIC_NOUNS;
    // @ts-expect-error - Accessing private static property for debugging
    const prepositions = EntityNameService.PREPOSITIONS;
    // @ts-expect-error - Accessing private static property for debugging
    const verbs = EntityNameService.COMMON_VERBS;
    
    console.log(`  - In Generic Nouns? ${genericNouns.has(firstWord)}`);
    console.log(`  - In Prepositions? ${prepositions.has(firstWord)}`);
    console.log(`  - In Verbs? ${verbs.has(firstWord)}`);
  }
}
