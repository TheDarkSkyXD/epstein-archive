import { EntityNameService } from '../src/services/EntityNameService';

// Test the exact flow
const testName = "Client Privileged Communication";
console.log(`Testing: "${testName}"`);

// Check isValidPersonName
const isValidPerson = EntityNameService.isValidPersonName(testName);
console.log(`isValidPersonName: ${isValidPerson}`);

// Check isValidOrganizationName  
const isValidOrg = EntityNameService.isValidOrganizationName(testName);
console.log(`isValidOrganizationName: ${isValidOrg}`);

// Check isValidEntity (which calls both)
const isValidEntity = EntityNameService.isValidEntity(testName);
console.log(`isValidEntity: ${isValidEntity}`);

// Manual check
const words = testName.trim().split(/\s+/);
const lowerWords = words.map(w => w.toLowerCase());
const firstWord = lowerWords[0];

console.log(`\nManual checks:`);
console.log(`First word (lowercase): "${firstWord}"`);

// Access the private sets via type assertion
const service = EntityNameService as any;
console.log(`GENERIC_NOUNS has "${firstWord}": ${service.GENERIC_NOUNS?.has(firstWord)}`);
console.log(`GENERIC_NOUNS size: ${service.GENERIC_NOUNS?.size}`);
