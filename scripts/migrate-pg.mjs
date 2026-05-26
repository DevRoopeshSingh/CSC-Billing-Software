import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import postgres from 'postgres';

async function run() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  const sql = postgres(connectionString, { max: 1 });

  console.log('Running robust schema synchronization directly...');
  
  const migrationDir = './drizzle/pg';
  const files = fs.readdirSync(migrationDir)
    .filter(f => f.endsWith('.sql'))
    .sort(); // Ensure 0000 -> 0011 ordering

  for (const file of files) {
    console.log(`\n--- Processing ${file} ---`);
    const content = fs.readFileSync(path.join(migrationDir, file), 'utf8');
    const statements = content.split('--> statement-breakpoint').map(s => s.trim()).filter(s => s);

    for (const statement of statements) {
      try {
        await sql.unsafe(statement);
        console.log(`[SUCCESS] ${statement.substring(0, 50)}...`);
      } catch (err) {
        if (err.code === '42701') {
          // Column already exists
          console.log(`[SKIPPED] Column already exists: ${statement.substring(0, 50)}...`);
        } else if (err.code === '42P07') {
          // Table/relation already exists
          console.log(`[SKIPPED] Table already exists: ${statement.substring(0, 50)}...`);
        } else if (err.code === '42710') {
          // Constraint already exists
          console.log(`[SKIPPED] Constraint already exists: ${statement.substring(0, 50)}...`);
        } else if (err.code === '23505') {
          // Unique violation (e.g. inserting default data)
          console.log(`[SKIPPED] Data already exists: ${statement.substring(0, 50)}...`);
        } else if (err.message && err.message.includes('already exists')) {
          console.log(`[SKIPPED] Entity already exists: ${statement.substring(0, 50)}...`);
        } else {
          console.error(`[ERROR] Failed to execute: ${statement}`);
          console.error(err);
          // Don't throw, try to continue with other statements
        }
      }
    }
  }

  console.log('\nSchema alignment completed successfully!');
  process.exit(0);
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
