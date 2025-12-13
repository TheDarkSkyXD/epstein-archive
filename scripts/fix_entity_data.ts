
import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'epstein-archive-production.db');
const db = new Database(DB_PATH);

function main() {
    console.log(`Fixing entity data in ${DB_PATH}...`);
    
    // 1. Map 'title' -> 'full_name'
    const updateName = db.prepare(`
        UPDATE entities 
        SET full_name = title 
        WHERE (full_name IS NULL OR full_name = '') AND title IS NOT NULL
    `);
    const nameResult = updateName.run();
    console.log(`Updated ${nameResult.changes} entities: title -> full_name`);

    // 2. Map 'role' -> 'primary_role'
    const updateRole = db.prepare(`
        UPDATE entities
        SET primary_role = role
        WHERE (primary_role IS NULL OR primary_role = '') AND role IS NOT NULL
    `);
    const roleResult = updateRole.run();
    console.log(`Updated ${roleResult.changes} entities: role -> primary_role`);
    
    // 3. Set default entity_type = 'Person' if missing
    const updateType = db.prepare(`
        UPDATE entities 
        SET entity_type = 'Person' 
        WHERE entity_type IS NULL OR entity_type = ''
    `);
    const typeResult = updateType.run();
    console.log(`Set default entity_type='Person' for ${typeResult.changes} entities.`);

    // 4. Default primary_role if still empty
    const defaultRole = db.prepare(`
        UPDATE entities
        SET primary_role = 'Person of Interest'
        WHERE primary_role IS NULL OR primary_role = ''
    `);
    const defaultRoleResult = defaultRole.run();
    console.log(`Set default primary_role for ${defaultRoleResult.changes} entities.`);
}

main();
