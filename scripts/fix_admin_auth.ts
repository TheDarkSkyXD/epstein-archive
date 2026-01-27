import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';

const db = new Database('epstein-archive.db');

console.log('🔒 Fixing Admin Authentication...');

try {
  // 1. Check if password_hash column exists
  const tableInfo = db.pragma('table_info(users)') as any[];
  const hasPasswordHash = tableInfo.some((col) => col.name === 'password_hash');

  if (!hasPasswordHash) {
    console.log('   ➕ Adding password_hash column...');
    db.prepare('ALTER TABLE users ADD COLUMN password_hash TEXT').run();
  } else {
    console.log('   ✅ password_hash column already exists.');
  }

  // 2. Update Admin User
  const adminPassword = 'epstein2026!';
  const hashedPassword = bcrypt.hashSync(adminPassword, 10);

  // Find the admin user (usually user-1 or by role)
  // We will force user-1 to be the admin
  console.log('   🔄 Updating admin user credentials...');

  const result = db
    .prepare(
      `
    UPDATE users 
    SET username = 'admin', 
        password_hash = ?,
        role = 'admin',
        email = 'admin@example.com'
    WHERE id = 'user-1'
  `,
    )
    .run(hashedPassword);

  if (result.changes > 0) {
    console.log('   ✅ Admin user (user-1) updated successfully.');
    console.log(`      Username: admin`);
    console.log(`      Password: ${adminPassword}`);
  } else {
    console.warn('   ⚠️  User user-1 not found. Creating new admin...');
    const insert = db
      .prepare(
        `
      INSERT INTO users (id, username, email, role, password_hash, created_at)
      VALUES ('user-1', 'admin', 'admin@example.com', 'admin', ?, datetime('now'))
    `,
      )
      .run(hashedPassword);
    console.log('   ✅ Admin user created.');
  }
} catch (error) {
  console.error('❌ Error fixing auth:', error);
  process.exit(1);
}

console.log('✨ Done. You should now be able to login.');
