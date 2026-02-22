const { Client } = require('pg');

async function run() {
  const client = new Client({
    connectionString: "postgres://postgres.eizkmyewemebhpxiunhe:95xZ22H4wTjQkZ6E@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"
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
