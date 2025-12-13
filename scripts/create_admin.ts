
import bcrypt from 'bcryptjs';
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = process.env.DB_PATH || path.join(process.cwd(), 'epstein-archive.db');
console.log(`Using database: ${dbPath}`);

const db = new Database(dbPath);

const username = process.argv[2] || 'admin';
const password = process.argv[3] || 'admin123'; // Default weak password, change ASAP
const email = 'admin@example.com';

try {
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(password, salt);
  const id = 'user-admin-01';

  // Check if exists
  const existing = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

  if (existing) {
    console.log(`Updating existing user ${username}...`);
    db.prepare(`
      UPDATE users 
      SET password_hash = ?, role = 'admin', email = ?, last_active = CURRENT_TIMESTAMP
      WHERE username = ?
    `).run(hash, email, username);
  } else {
    console.log(`Creating new user ${username}...`);
    db.prepare(`
      INSERT INTO users (id, username, email, role, password_hash, created_at, last_active)
      VALUES (?, ?, ?, 'admin', ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).run(id, username, email, hash);
  }

  console.log(`User ${username} configured with role 'admin'.`);
  
} catch (error) {
  console.error('Error creating admin:', error);
}
