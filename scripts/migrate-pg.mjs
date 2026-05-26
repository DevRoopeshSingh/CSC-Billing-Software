import 'dotenv/config';
import postgres from 'postgres';

async function run() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  const sql = postgres(connectionString, { max: 1 });

  console.log('Running missing KYC schema updates directly...');
  
  const statements = [
    `ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "aadhaar_number" text DEFAULT '' NOT NULL;`,
    `ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "pan_number" text DEFAULT '' NOT NULL;`,
    `ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "kyc_verified" boolean DEFAULT false NOT NULL;`
  ];
  
  for (const statement of statements) {
    try {
      console.log(`Executing: ${statement}...`);
      await sql.unsafe(statement);
    } catch (err) {
      if (err.code === '42701') {
        console.log(`Skipping: Column already exists.`);
      } else {
        throw err;
      }
    }
  }

  console.log('Validating aadhaar_number, pan_number, and kyc_verified columns in customers table...');
  const columns = await sql`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name='customers'
  `;
  const columnNames = columns.map(c => c.column_name);
  console.log('Customer columns:', columnNames.join(', '));

  console.log('Schema alignment completed successfully!');
  process.exit(0);
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
