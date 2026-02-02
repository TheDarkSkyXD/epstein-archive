import { RedactionResolver } from '../src/server/services/RedactionResolver';

const tests = [
  {
    name: 'Known Alias',
    text: 'Hello [Lawyer], how are you?',
    context: {},
    expected: 'Alan Dershowitz',
  },
  {
    name: 'Sender Context',
    text: 'From: [Sender]',
    context: { sender: 'test@example.com' },
    expected: 'test@example.com',
  },
  {
    name: 'No Context',
    text: 'Met with [Person A]',
    context: {},
    expected: null, // No guess
  },
];

console.log('🧪 Testing RedactionResolver...');

for (const t of tests) {
  const result = RedactionResolver.resolve(t.text, t.context);
  const found = result.candidates.find((c) => c.guess);

  if (t.expected) {
    if (found && found.guess === t.expected) {
      console.log(`✅ ${t.name}: Passed (Guessed: ${found.guess})`);
    } else {
      console.error(`❌ ${t.name}: Failed. Expected ${t.expected}, got ${found?.guess}`);
    }
  } else {
    if (!found) {
      console.log(`✅ ${t.name}: Passed (No incorrect guess)`);
    } else {
      console.error(`❌ ${t.name}: Failed. Expected no guess, got ${found.guess}`);
    }
  }
}
