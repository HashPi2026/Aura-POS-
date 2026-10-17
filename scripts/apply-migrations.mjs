import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Client } = pg;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('Error: DATABASE_URL environment variable is missing.');
  console.error('Usage: DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres" node scripts/apply-migrations.mjs');
  process.exit(1);
}

async function runMigrations() {
  console.log('Connecting to Supabase PostgreSQL via DATABASE_URL...');
  
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  try {
    await client.connect();
    console.log('Connected to Supabase PostgreSQL database successfully!');

    // Create schema_migrations tracker table if not exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Existing migrations previously run in Phase 1
    const appliedRes = await client.query('SELECT version FROM public.schema_migrations');
    const appliedSet = new Set(appliedRes.rows.map(r => r.version));

    // If schema_migrations is brand new but tables already exist, seed already-applied migrations 1, 2, 3
    if (appliedSet.size === 0) {
      const tableCheck = await client.query(`
        SELECT COUNT(*) FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'businesses'
      `);
      if (parseInt(tableCheck.rows[0].count, 10) > 0) {
        console.log('Detected existing schema; marking initial migrations 1-3 as recorded...');
        const initialFiles = [
          '20261009000001_initial_schema.sql',
          '20261009000002_rls_policies.sql',
          '20261009000003_rpc_atomic_sync_sale.sql'
        ];
        for (const initFile of initialFiles) {
          await client.query('INSERT INTO public.schema_migrations (version) VALUES ($1) ON CONFLICT DO NOTHING', [initFile]);
          appliedSet.add(initFile);
        }
      }
    }

    const migrationsDir = path.resolve('supabase/migrations');
    const files = fs.readdirSync(migrationsDir).sort();

    for (const file of files) {
      if (file.endsWith('.sql')) {
        if (appliedSet.has(file)) {
          console.log(`Skipping already applied migration: ${file}`);
          continue;
        }

        console.log(`Applying migration: ${file}...`);
        const filePath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(filePath, 'utf-8');

        await client.query('BEGIN');
        try {
          await client.query(sql);
          await client.query('INSERT INTO public.schema_migrations (version) VALUES ($1)', [file]);
          await client.query('COMMIT');
          console.log(`Applied and committed: ${file}`);
        } catch (migrationErr) {
          await client.query('ROLLBACK');
          throw migrationErr;
        }
      }
    }

    console.log('All migrations are up to date!');

    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    console.log('Public Tables Verified:', res.rows.map(r => r.table_name).join(', '));
  } catch (err) {
    console.error('Migration error:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigrations();
