const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/data/peopleData.ts');
let content = fs.readFileSync(filePath, 'utf8');

// Regex to match "Name": {
// We capture the name to use as ID
const regex = /"([^"]+)": \{/g;

content = content.replace(regex, (match, name) => {
  // Check if it's the start of the file export or an object key
  // The export line is: export const peopleData: Record<string, Person> = {
  // We only want to replace keys inside the object.
  // The keys are indented.
  
  // Actually, the regex matches "Name": {
  // The export line doesn't match this pattern.
  
  return `"${name}": {
    id: "${name}",
    role: "Unknown",
    secondary_roles: "",
    status: "Unknown",
    connections: "",
    fileReferences: [],`;
});

fs.writeFileSync(filePath, content);
console.log('Updated peopleData.ts');
