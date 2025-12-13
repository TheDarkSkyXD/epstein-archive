
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { databaseService } from '../src/services/DatabaseService';

const DATA_DIR = path.join(process.cwd(), 'data/csv');

async function ingestFinancialData() {
  console.log('Starting financial data ingestion...');
  
  // Clear existing data to ensure full integrity
  const db = databaseService.getDatabase();
  try {
    db.exec('DELETE FROM financial_transactions');
    db.exec("DELETE FROM sqlite_sequence WHERE name='financial_transactions'");
  } catch (e) {
    console.log('Table might not exist yet, skipping clear.');
  }
  console.log('Cleared existing financial transactions.');

  const files = getAllFiles(DATA_DIR);
  console.log(`Found ${files.length} files to scan.`);

  let totalImported = 0;

  for (const file of files) {
    if (!file.endsWith('.csv')) continue;

    try {
      const content = fs.readFileSync(file, 'utf-8');
      const records = parse(content, {
        columns: true,
        skip_empty_lines: true,
        relax_quotes: true,
        relax_column_count: true
      });

      if (records.length === 0) continue;

      const filename = path.basename(file);
      console.log(`Processing ${filename}...`);

      // Strategy 1: Palm Beach Property Tax
      if (records[0]['OWNERNAME1'] && records[0]['TOTTAXVAL']) {
        console.log(`  -> Detected Property Tax records`);
        let count = 0;
        for (const row of records) {
          const amount = parseFloat(row['TOTTAXVAL'].replace(/[$,]/g, ''));
          if (isNaN(amount) || amount === 0) continue;

          const owner = formatName(row['OWNERNAME1']);
          const date = row['CAMA-RESBLD.YEAR BUILT'] ? `${row['CAMA-RESBLD.YEAR BUILT']}-01-01` : '2019-01-01';
          
          insertTransaction({
            from_entity: owner,
            to_entity: 'Palm Beach County Tax Collector',
            amount,
            currency: 'USD',
            transaction_date: date,
            transaction_type: 'Tax Valuation',
            description: `${row['PROPUSE'] || 'Property'} at ${row['SITEADDR'] || 'Unknown Address'}`,
            risk_level: amount > 1000000 ? 'medium' : 'low',
            source_document_ids: JSON.stringify([filename])
          });
          count++;
        }
        totalImported += count;
        console.log(`  -> Imported ${count} records.`);
      }

      // Strategy 2: Water/Utility Bills
      else if (records[0]["Customer's Name"] && records[0]["FY 07-08 Average Monthly Bill"]) {
        console.log(`  -> Detected Utility Bill records`);
        let count = 0;
        for (const row of records) {
          const billStr = row["FY 07-08 Average Monthly Bill"];
          if (!billStr) continue;
          
          const amount = parseFloat(billStr.replace(/[$,]/g, ''));
          if (isNaN(amount) || amount === 0) continue;

          const customer = formatName(row["Customer's Name"]);
          
          insertTransaction({
            from_entity: customer,
            to_entity: 'Palm Beach Water Utilities',
            amount,
            currency: 'USD',
            transaction_date: '2008-01-01',
            transaction_type: 'Utility Bill',
            description: `Monthly Average Consumption. Premise: ${row['Premise Type'] || 'Unknown'} at ${row['Address 1'] || ''}`,
            risk_level: amount > 5000 ? 'high' : 'low', // High water bill might indicate heavy usage/occupancy
            source_document_ids: JSON.stringify([filename])
          });
          count++;
        }
        totalImported += count;
        console.log(`  -> Imported ${count} records.`);
      }
      
      // Strategy 3: Generic "Amount" column
      else {
        // Look for any column with "Amount" or "Bill" or "Value"
        const amountCol = Object.keys(records[0]).find(k => /amount|bill|value|cost/i.test(k));
        const entityCol = Object.keys(records[0]).find(k => /name|customer|owner|payee|payer/i.test(k));
        const dateCol = Object.keys(records[0]).find(k => /date|year/i.test(k));

        if (amountCol && entityCol) {
             console.log(`  -> Detected Generic Financial records (Col: ${amountCol}, ${entityCol})`);
             let count = 0;
             for (const row of records) {
                 const valStr = String(row[amountCol]);
                 const amount = parseFloat(valStr.replace(/[$,]/g, ''));
                 if (isNaN(amount)) continue;

                 const entity = formatName(row[entityCol]);
                 const date = dateCol ? row[dateCol] : new Date().toISOString().split('T')[0];

                 insertTransaction({
                    from_entity: entity,
                    to_entity: 'Unknown',
                    amount,
                    currency: 'USD',
                    transaction_date: isValidDate(date) ? date : new Date().toISOString().split('T')[0],
                    transaction_type: 'Generic Transaction',
                    description: `Imported from ${filename}`,
                    risk_level: 'low',
                    source_document_ids: JSON.stringify([filename])
                 });
                 count++;
             }
             totalImported += count;
             console.log(`  -> Imported ${count} records.`);
        }
      }

    } catch (e) {
      console.error(`Error processing ${file}:`, e);
    }
  }

  console.log(`\nTotal financial transactions imported: ${totalImported}`);
}

function getAllFiles(dirPath: string, arrayOfFiles: string[] = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      arrayOfFiles.push(path.join(dirPath, "/", file));
    }
  });

  return arrayOfFiles;
}

function formatName(name: string): string {
  if (!name) return 'Unknown';
  // Handle "LAST, FIRST"
  if (name.includes(',')) {
    const parts = name.split(',').map(s => s.trim());
    if (parts.length === 2) {
      return `${parts[1]} ${parts[0]}`; // "FIRST LAST"
    }
  }
  return name.trim();
}

function isValidDate(dateString: string) {
  const regEx = /^\d{4}-\d{2}-\d{2}$/;
  if(!dateString.match(regEx)) return false;  // Invalid format
  const d = new Date(dateString);
  const dNum = d.getTime();
  if(!dNum && dNum !== 0) return false; // NaN value, Invalid date
  return d.toISOString().slice(0,10) === dateString;
}

function insertTransaction(tx: any) {
  const db = databaseService.getDatabase();
  const stmt = db.prepare(`
    INSERT INTO financial_transactions (
      investigation_id, from_entity, to_entity, amount, currency, transaction_date, 
      transaction_type, description, risk_level, source_document_ids
    ) VALUES (
      ?, @from_entity, @to_entity, @amount, @currency, @transaction_date,
      @transaction_type, @description, @risk_level, @source_document_ids
    )
  `);
  
  // Default investigation ID to 1 (or creates a placeholder if needed)
  // Ideally we should match this to relevant investigations
  stmt.run(1, tx);
}

ingestFinancialData();
