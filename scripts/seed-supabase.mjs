// scripts/seed-supabase.mjs
// Seeds the Supabase PostgreSQL database with:
//   1. Admin user  (username: admin, password: admin123, PIN: 123456)
//   2. Default center_profiles row
//   3. All services from resources/seeds/services-seed.csv
//
// Usage: node scripts/seed-supabase.mjs
// Safe to re-run — uses upsert logic, won't duplicate rows.

import postgres from 'postgres';
import bcrypt from 'bcryptjs';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

// ── Load .env ─────────────────────────────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const envPath = path.join(rootDir, '.env');

if (!existsSync(envPath)) {
  console.error('❌  .env file not found at', envPath);
  process.exit(1);
}

readFileSync(envPath, 'utf8').split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && k.trim()) process.env[k.trim()] = v.join('=').replace(/^"|"$/g, '').trim();
});

if (!process.env.DATABASE_URL) {
  console.error('❌  DATABASE_URL not set in .env');
  process.exit(1);
}

// ── DB connection ─────────────────────────────────────────────────────────────
const sql = postgres(process.env.DATABASE_URL, {
  max: 1,
  connect_timeout: 15,
  ssl: { rejectUnauthorized: false },
});

// ── CSV parser (handles quoted fields with commas) ────────────────────────────
function parseCSV(content) {
  const lines = content.split('\n').filter(l => l.trim());
  const headers = parseLine(lines[0]);
  return lines.slice(1).map(line => {
    const values = parseLine(line);
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']));
  });
}

function parseLine(line) {
  const result = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuote && line[i + 1] === '"') { cur += '"'; i++; }
      else inQuote = !inQuote;
    } else if (ch === ',' && !inQuote) {
      result.push(cur.trim()); cur = '';
    } else {
      cur += ch;
    }
  }
  result.push(cur.trim());
  return result;
}

// ── Main seeding logic ────────────────────────────────────────────────────────
async function main() {
  console.log('\n🌱  Starting Supabase seed...\n');

  // 1. Admin user
  console.log('👤  Seeding admin user...');
  const passwordHash = await bcrypt.hash('admin123', 12);
  const [adminUser] = await sql`
    INSERT INTO users (username, email, password_hash, role, is_active, created_at)
    VALUES ('admin', NULL, ${passwordHash}, 'admin', true, NOW())
    ON CONFLICT (username) DO UPDATE
      SET password_hash = ${passwordHash},
          role          = 'admin',
          is_active     = true
    RETURNING id
  `;
  console.log(`   ✅  Admin user ready (id=${adminUser.id})`);

  // 2. Center profile (default row)
  console.log('\n🏢  Seeding center profile...');
  const pinHash = await bcrypt.hash('123456', 12);
  const [profile] = await sql`
    SELECT id FROM center_profiles LIMIT 1
  `;
  if (!profile) {
    await sql`
      INSERT INTO center_profiles (
        center_name, address, mobile, email, udyam_number,
        invoice_prefix, invoice_number, theme,
        default_tax_rate, default_payment_mode,
        pin_hash, operating_hours, center_description,
        print_upi_qr
      ) VALUES (
        'CSC Center', '', '', '', '',
        'INV-', 0, 'light',
        '0', 'Cash',
        ${pinHash}, '', '',
        false
      )
    `;
    console.log('   ✅  Default center profile created');
    console.log('   ℹ️   Admin PIN set to: 123456 (rotate via Settings → Security)');
  } else {
    // Only set PIN if not already set
    await sql`
      UPDATE center_profiles
      SET pin_hash = COALESCE(pin_hash, ${pinHash})
      WHERE id = ${profile.id}
    `;
    console.log('   ✅  Center profile already exists — left untouched');
  }

  // 3. Services from CSV
  console.log('\n📋  Seeding services from CSV...');
  const csvPath = path.join(rootDir, 'resources', 'seeds', 'services-seed.csv');
  if (!existsSync(csvPath)) {
    console.warn('   ⚠️   CSV not found at', csvPath, '— skipping services seed');
  } else {
    const rows = parseCSV(readFileSync(csvPath, 'utf8'));
    console.log(`   📄  Parsed ${rows.length} service rows`);

    let inserted = 0;
    let skipped = 0;

    for (const row of rows) {
      const name = row['name']?.trim();
      if (!name) { skipped++; continue; }

      const category       = row['category']?.trim()             || 'Other Services';
      const subcategory    = row['subcategory']?.trim()           || '';
      const defaultPrice   = parseFloat(row['default_price'])     || 0;
      const taxRate        = parseFloat(row['tax_rate'])          || 0;
      const priceIsFrom    = row['price_is_starting_from']?.trim().toLowerCase() === 'true';
      const sortOrder      = parseInt(row['sort_order'])          || 0;
      const keywords       = row['keywords']?.trim()              || '';
      const notes          = row['notes']?.trim()                 || '';
      const isActive       = row['is_active']?.trim().toLowerCase() !== 'false';
      const isBookmarked   = row['is_bookmarked']?.trim().toLowerCase() === 'true';

      await sql`
        INSERT INTO services (
          name, category, subcategory,
          default_price, tax_rate, price_is_starting_from,
          sort_order, keywords, notes,
          is_active, is_bookmarked
        ) VALUES (
          ${name}, ${category}, ${subcategory},
          ${defaultPrice.toFixed(2)}, ${taxRate.toFixed(2)}, ${priceIsFrom},
          ${sortOrder}, ${keywords}, ${notes},
          ${isActive}, ${isBookmarked}
        )
        ON CONFLICT DO NOTHING
      `;
      inserted++;
    }

    console.log(`   ✅  ${inserted} services inserted, ${skipped} skipped`);
  }

  // 4. Final summary
  console.log('\n📊  Final row counts:');
  const tables = ['users','center_profiles','services','customers','invoices','invoice_items'];
  for (const tbl of tables) {
    const [{ c }] = await sql`SELECT COUNT(*)::int AS c FROM ${sql(tbl)}`;
    console.log(`   ${tbl}: ${c} rows`);
  }

  await sql.end();
  console.log('\n🎉  Seed complete!\n');
  console.log('   Sign in with:');
  console.log('     Username : admin');
  console.log('     Password : admin123');
  console.log('     Admin PIN: 123456\n');
}

main().catch(err => {
  console.error('\n❌  Seed failed:', err.message);
  process.exit(1);
});
