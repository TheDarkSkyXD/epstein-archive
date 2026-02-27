import { getMaintenancePool } from '../src/server/db/connection.js';
import 'dotenv/config';

const BOILERPLATE_CANDIDATE_THRESHOLD = 10;
const BOILERPLATE_CONFIRMED_THRESHOLD = 100;

async function promoteBoilerplate() {
  const pool = getMaintenancePool();
  console.log('Starting Boilerplate Promotion Job...');

  const candidateResult = await pool.query(
    `UPDATE boilerplate_phrases SET status = 'candidate' WHERE status = 'pending' AND frequency > $1`,
    [BOILERPLATE_CANDIDATE_THRESHOLD],
  );
  if (candidateResult.rowCount && candidateResult.rowCount > 0) {
    console.log(`Promoted ${candidateResult.rowCount} phrases to 'candidate'`);
  }

  const confirmedResult = await pool.query(
    `UPDATE boilerplate_phrases SET status = 'confirmed'
     WHERE (status = 'pending' OR status = 'candidate') AND frequency > $1`,
    [BOILERPLATE_CONFIRMED_THRESHOLD],
  );
  if (confirmedResult.rowCount && confirmedResult.rowCount > 0) {
    console.log(`Promoted ${confirmedResult.rowCount} phrases to 'confirmed'`);
  }

  console.log(
    'Note: Existing document_sentences is_boilerplate flags are not automatically updated.',
  );
  console.log('Boilerplate Promotion Complete.');
}

promoteBoilerplate().catch((e) => {
  console.error(e);
  process.exit(1);
});
