
const fs = require('fs');

const path = "data/ocr_clean/text/House Oversight 001/HOUSE_OVERSIGHT_030716.txt";
const content = fs.readFileSync(path, 'utf-8');

console.log("First 50 chars:", JSON.stringify(content.substring(0, 50)));

const FROM_REGEX = /(?:^|[\r\n])(?:From|Source):\s*([^\n\r]+)/i;
const match = content.match(FROM_REGEX);

console.log("Match:", match);
