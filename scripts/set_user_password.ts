
import { DatabaseService } from '../src/services/DatabaseService';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'epstein-archive-production.db');
const args = process.argv.slice(2);

if (args.length < 2) {
    console.log('Usage: npx tsx scripts/set_user_password.ts <username> <new_password>');
    process.exit(1);
}

const [username, password] = args;

console.log(`Setting password for user: ${username} in ${DB_PATH}`);
const db = new Database(DB_PATH);

try {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);
    
    const result = db.prepare('UPDATE users SET password_hash = ? WHERE username = ?').run(hash, username);
    
    if (result.changes > 0) {
        console.log('Password updated successfully.');
    } else {
        console.error('User not found.');
    }
} catch (e) {
    console.error('Error updating password:', e);
}
