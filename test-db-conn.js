const { Client } = require('pg');
require('dotenv').config({ path: '.env.runtime', quiet: true });
require('dotenv').config({ path: '.env.local', quiet: true });

async function run() {
  const connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;
  if (!connectionString) {
    throw new Error('Missing DATABASE_URL or SUPABASE_DB_URL');
  }

  const client = new Client({
    connectionString,
  });
  try {
    await client.connect();
    const res = await client.query('SELECT count(*) FROM novels;');
    console.log("OLD DB NOVELS COUNT:", res.rows[0].count);
    await client.end();
  } catch(e) {
    console.error("CONN ERROR:", e.message);
  }
}
run();
