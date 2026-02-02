import { simpleParser } from 'mailparser';
import * as fs from 'fs';
import { convert } from 'html-to-text';

const filePath =
  'data/emails/jeeproject_yahoo/20160203-You need everything in this email.-3152.eml';

async function test() {
  console.log(`Reading ${filePath}...`);
  const buffer = fs.readFileSync(filePath);
  console.log(`Buffer size: ${buffer.length}`);

  try {
    const parsed = await simpleParser(buffer);
    console.log('--- Parsed ---');
    console.log('Subject:', parsed.subject);
    console.log('From:', parsed.from?.text);
    console.log('Date:', parsed.date);
    console.log('Text Body present:', !!parsed.text);
    console.log('HTML Body present:', !!parsed.html);

    if (parsed.text) {
      console.log('--- Text Body Preview ---');
      console.log(parsed.text.substring(0, 200));
    }

    if (parsed.html) {
      console.log('--- HTML Body Preview ---');
      console.log(parsed.html.substring(0, 200));
      const converted = convert(parsed.html, { wordwrap: 130 });
      console.log('--- Converted HTML ---');
      console.log(converted.substring(0, 200));
    }
  } catch (e) {
    console.error('Parsing failed:', e);
  }
}

test();
