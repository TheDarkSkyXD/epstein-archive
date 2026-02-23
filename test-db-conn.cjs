const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://epstein:epstein@localhost:5435/epstein_archive',
});

pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('Connection error:', err.message);
    process.exit(1);
  } else {
    console.log('Connected successfully at:', res.rows[0].now);
    process.exit(0);
  }
});
