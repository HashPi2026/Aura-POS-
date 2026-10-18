import pg from 'pg';
const { Client } = pg;

const connectionString = 'postgresql://postgres:FJm9J64qEHKOL8TA@db.hwdxpvmypxnpfiamcmvs.supabase.co:5432/postgres';

async function main() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();

  const tables = ['businesses', 'sales', 'sale_items', 'payments', 'users'];

  for (const t of tables) {
    const res = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position;
    `, [t]);

    console.log(`\nColumns for table: ${t}`);
    console.table(res.rows);
  }

  await client.end();
}

main().catch(console.error);
