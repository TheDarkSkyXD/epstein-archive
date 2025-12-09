#!/usr/bin/expect -f

set timeout -1
set server "deploy@68.183.186.127"
set port "22"
set prod_dir "/root/epstein-archive"

# Step 1: Backup database
spawn ssh $server "cd $prod_dir && sudo cp epstein-archive.db epstein-archive.db.backup-\$(date +%Y%m%d-%H%M%S)"
expect "password:"
send "$password\r"
expect eof

# Step 2: Upload consolidated database
spawn scp epstein-archive.db $server:$prod_dir/
expect "password:"
send "$password\r"
expect eof

# Step 3: Upload enhancement scripts
spawn scp scripts/enhance_schema.sql scripts/generate_relationships_and_scoring.ts $server:$prod_dir/scripts/
expect "password:"
send "$password\r"
expect eof

# Step 4: Apply schema
spawn ssh $server "cd $prod_dir && sudo sqlite3 epstein-archive.db < scripts/enhance_schema.sql"
expect "password:"
send "$password\r"
expect eof

# Step 5: Generate relationships
spawn ssh $server "cd $prod_dir && sudo npx tsx scripts/generate_relationships_and_scoring.ts"
expect "password:"
send "$password\r"
expect eof

# Step 6: Upload server code
spawn scp src/server.production.ts src/services/DatabaseService.ts src/types.ts $server:$prod_dir/src/
expect "password:"
send "$password\r"
expect eof

# Step 7: Build frontend
puts "Building frontend..."
exec npm run build

# Step 8: Upload frontend
spawn rsync -avz --delete dist/ $server:$prod_dir/dist/
expect "password:"
send "$password\r"
expect eof

# Step 9: Restart server
spawn ssh $server "cd $prod_dir && sudo pm2 restart epstein-api"
expect "password:"
send "$password\r"
expect eof

puts "Deployment complete!"
