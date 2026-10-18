import pg from 'pg';
const { Client } = pg;

const connectionString = 'postgresql://postgres:FJm9J64qEHKOL8TA@db.hwdxpvmypxnpfiamcmvs.supabase.co:5432/postgres';

async function main() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  const tables = [
    'businesses',
    'users',
    'memberships',
    'locations',
    'products',
    'product_modifiers',
    'orders',
    'order_items',
    'sales',
    'sale_items',
    'payments',
    'kitchen_tickets'
  ];

  for (const t of tables) {
    const res = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position;
    `, [t]);

    console.log(`\n=== Table: ${t} ===`);
    console.table(res.rows);
  }

  // Also check constraints on users and memberships
  const constr = await client.query(`
    SELECT conrelid::regclass as table_name, conname, pg_get_constraintdef(oid)
    FROM pg_constraint
    WHERE connamespace = 'public'::regnamespace;
  `);
  console.log('\n=== All Public Constraints ===');
  console.table(constr.rows);

  await client.end();
}

main().catch(console.error);
