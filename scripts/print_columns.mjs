import pg from 'pg';
const { Client } = pg;
const connectionString = 'postgresql://postgres:FJm9J64qEHKOL8TA@db.hwdxpvmypxnpfiamcmvs.supabase.co:5432/postgres';

async function main() {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  const tables = ['locations', 'products', 'memberships', 'orders', 'kitchen_tickets', 'expenses', 'suppliers'];
  for (const t of tables) {
    const res = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = $1
      ORDER BY ordinal_position
    `, [t]);
    console.log(`\nTable ${t}:`);
    for (const r of res.rows) {
      console.log(`  ${r.column_name} (${r.data_type}, nullable: ${r.is_nullable})`);
    }
  }

  // Check roles in memberships
  const constr = await client.query(`
    SELECT conname, pg_get_constraintdef(oid)
    FROM pg_constraint
    WHERE conrelid = 'memberships'::regclass;
  `);
  console.log('\nMemberships constraints:', constr.rows);

  await client.end();
}
main().catch(console.error);
