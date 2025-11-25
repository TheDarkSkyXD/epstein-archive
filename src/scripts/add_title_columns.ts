import { databaseService } from '../services/DatabaseService';

async function addTitleColumns() {
  console.log('=== Adding Title/Role Columns to Entities Table ===\n');

  try {
    // Check if columns already exist
    const tableInfo = databaseService.prepare("PRAGMA table_info(entities)").all() as any[];
    const existingColumns = tableInfo.map((col: any) => col.name);

    console.log('Existing columns:', existingColumns.join(', '));

    // Add title column if it doesn't exist
    if (!existingColumns.includes('title')) {
      console.log('\nAdding "title" column...');
      databaseService.exec('ALTER TABLE entities ADD COLUMN title TEXT');
      console.log('✅ Added "title" column');
    } else {
      console.log('\n✓ "title" column already exists');
    }

    // Add role column if it doesn't exist
    if (!existingColumns.includes('role')) {
      console.log('Adding "role" column...');
      databaseService.exec('ALTER TABLE entities ADD COLUMN role TEXT');
      console.log('✅ Added "role" column');
    } else {
      console.log('✓ "role" column already exists');
    }

    // Add title_variants column if it doesn't exist
    if (!existingColumns.includes('title_variants')) {
      console.log('Adding "title_variants" column...');
      databaseService.exec('ALTER TABLE entities ADD COLUMN title_variants TEXT');
      console.log('✅ Added "title_variants" column');
    } else {
      console.log('✓ "title_variants" column already exists');
    }

    // Verify changes
    const updatedTableInfo = databaseService.prepare("PRAGMA table_info(entities)").all() as any[];
    const updatedColumns = updatedTableInfo.map((col: any) => col.name);

    console.log('\n=== Schema Update Complete ===');
    console.log('Updated columns:', updatedColumns.join(', '));
    console.log('\n✅ Schema enhancement successful!');

  } catch (error) {
    console.error('\n❌ Error adding columns:', error);
    process.exit(1);
  }
}

addTitleColumns();
