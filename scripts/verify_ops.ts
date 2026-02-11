import { BackupService } from '../src/server/services/BackupService.js';
import { IngestRunsRepository } from '../src/server/db/ingestRunsRepository.js';
import { FtsMaintenanceService } from '../src/server/services/ftsMaintenance.js';

async function verifyOps() {
  console.log('--- Phase 4: Ops & Observability Verification ---');

  // 1. Test BackupService
  console.log('\n[1/3] Testing BackupService...');
  try {
    const backupPath = await BackupService.createBackup();
    console.log('✅ Backup created successfully at:', backupPath);
    const backups = BackupService.listBackups();
    console.log('✅ Backup list retrieved:', backups.length, 'backups found.');
  } catch (e: any) {
    console.error('❌ BackupService test failed:', e.message);
  }

  // 2. Test IngestRunsRepository
  console.log('\n[2/3] Testing IngestRunsRepository...');
  try {
    const runs = IngestRunsRepository.getRuns(5);
    console.log('✅ Successfully fetched', runs.length, 'ingest runs.');
    if (runs.length > 0) {
      console.log('Latest Run ID:', runs[0].id, 'Status:', runs[0].status);
    }
  } catch (e: any) {
    console.error('❌ IngestRunsRepository test failed:', e.message);
  }

  // 3. Test FTS Integrity
  console.log('\n[3/3] Testing FTS Integrity Check...');
  try {
    const ftsStatus = await FtsMaintenanceService.checkIntegrity();
    console.log('✅ FTS status retrieved for', ftsStatus.length, 'tables.');
    ftsStatus.forEach((s) => {
      console.log(
        `- ${s.table}: ${s.isSynced ? 'Synced' : 'DESYNCED'} (${s.sourceCount} vs ${s.ftsCount})`,
      );
    });
  } catch (e: any) {
    console.error('❌ FTS Integrity test failed:', e.message);
  }

  console.log('\n--- Verification Complete ---');
}

verifyOps().catch(console.error);
