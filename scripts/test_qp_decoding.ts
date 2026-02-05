import { TextCleaner } from './utils/text_cleaner.js';
import { simpleParser } from 'mailparser';

async function testDecoding() {
  const cases = [
    {
      name: 'Standard QP',
      input: 'Subject: =?UTF-8?Q?Hello_World?=\n\nThis is a test.',
      expected: 'This is a test.',
    },
    {
      name: 'Broken QP (User Case)',
      input: 'Content-Transfer-Encoding: quoted-printable\n\nShe is =9yo', // Simulating the issue
      expected: 'She is 19yo',
    },
    {
      name: 'Broken QP (Generalized)',
      input: 'Content-Transfer-Encoding: quoted-printable\n\nIt happened =5 days ago',
      expected: 'It happened 15 days ago',
    },
    {
      name: 'Math Safety',
      input: 'x=5',
      expected: 'x=5', // Should NOT change
    },
    {
      name: 'Soft Line Break',
      input: 'Content-Transfer-Encoding: quoted-printable\n\nShe is 1=\n9yo',
      expected: 'She is 19yo',
    },
    {
      name: 'TextCleaner Direct',
      input: 'She is =9yo',
      expected: 'She is 19yo', // Expecting failure here if cleaner doesn't handle it
    },
  ];

  console.log('--- Testing MailParser ---');
  for (const c of cases) {
    if (c.name === 'TextCleaner Direct') continue;
    try {
      const parsed = await simpleParser(c.input);
      const text = parsed.text || '';
      console.log(`[${c.name}]`);
      console.log(`Input: ${JSON.stringify(c.input)}`);
      console.log(`Output: ${JSON.stringify(text)}`);

      if (text.includes('19yo')) console.log("✅ Decoded '19yo' correctly");
      else if (text.includes('=9yo')) console.log("❌ Failed: Left as '=9yo'");
      else console.log(`⚠️  Output: ${text}`);
      console.log('---');
    } catch (e) {
      console.error(e);
    }
  }

  console.log('\n--- Testing TextCleaner Only ---');
  const tests = [
    'She is =9yo',
    'th=y are coming wh=n the sun sets',
    'It happened =5 days ago',
    'x=5',
    'width=50',
    'wh=re is the girl?',
  ];

  for (const t of tests) {
    const cleaned = TextCleaner.cleanEmailText(t);
    console.log(`Input: "${t}" -> Cleaned: "${cleaned}"`);
  }
}

testDecoding();
