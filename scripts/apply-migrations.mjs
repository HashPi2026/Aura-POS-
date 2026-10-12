import pg from 'pg';
import fs from 'fs';
import path from 'path';

const { Client } = pg;

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:FMistry1804jay@db.ianuulantdgsshslnzhl.supabase.co:5432/postgres';

async function runMigrations() {
  console.log('Connecting to Supabase PostgreSQL...');
  
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  try {
    await client.connect();
    console.log('Connected to Supabase PostgreSQL database successfully!');

    const migrationsDir = path.resolve('supabase/migrations');
    const files = fs.readdirSync(migrationsDir).sort();

    for (const file of files) {
      if (file.endsWith('.sql')) {
        console.log(`Applying migration: ${file}...`);
        const filePath = path.join(migrationsDir, file);
        const sql = fs.readFileSync(filePath, 'utf-8');
        await client.query(sql);
        console.log(`Applied: ${file}`);
      }
    }

    console.log('All migrations applied successfully!');

    // Verify tables exist
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    console.log('Public Tables Created:', res.rows.map(r => r.table_name).join(', '));
  } catch (err) {
    console.error('Migration error:', err.message);
  } finally {
    await client.end();
  }
}

runMigrations();
