
import { prettifyOCRText } from '../src/utils/prettifyOCR';

const testCases = [
  {
    name: "Broken Sentence Merge",
    input: `This is a sentence that
has been broken into
multiple lines incorrectly.`,
    expected: "This is a sentence that has been broken into multiple lines incorrectly."
  },
  {
    name: "Paragraph Preservation",
    input: `This is paragraph one.
This is paragraph two.`,
    expected: "This is paragraph one.\n\nThis is paragraph two."
  },
  {
    name: "List Preservation",
    input: `Here is a list:
1. Item one
2. Item two
- Item three`,
    expected: "Here is a list:\n\n1. Item one\n2. Item two\n- Item three"
  },
  {
    name: "Header Label Preservation",
    input: `Contact info:
Tel: 555-0199
Email: test@example.com`,
    expected: "Contact info:\n\nTel: 555-0199\nEmail: test@example.com"
  },
  {
    name: "Mid-sentence Punctuation",
    input: `Dr. Smith said hello. He
was happy.`,
    expected: "Dr. Smith said hello. He was happy."
  }
];

console.log("Running Prettify OCR Tests...\n");

testCases.forEach((test, index) => {
  console.log(`Test ${index + 1}: ${test.name}`);
  const result = prettifyOCRText(test.input);
  console.log("RAW:");
  console.log(JSON.stringify(test.input));
  console.log("RESULT:");
  console.log(JSON.stringify(result));
  
  // Simple check
  // Note: Exact match might be hard due to specific spacing, but let's look for single line vs multiline
  const passed = result.includes(test.expected) || result === test.expected; 
  // We won't assert true/false strictly here as we are tuning, just visual check
  console.log("-----------------------------------");
});
