import postgres from 'https://deno.land/x/postgresjs/mod.js';

// Requires the connection string to be passed or read from env.
const connectionString = Deno.env.get('DATABASE_URL');

if (!connectionString) {
  console.log('Error: DATABASE_URL environment variable is required.');
  Deno.exit(1);
}

const sql = postgres(connectionString, { ssl: 'require' });

async function runSQL() {
  try {
    console.log('Reading SQL file...');
    const sqlText = await Deno.readTextFile('./supabase/clinical_vector_search.sql');
    
    console.log('Executing SQL payload...');
    // postgres.js can execute multiple statements safely with simple query format
    await sql.unsafe(sqlText);
    
    console.log('SQL Execution complete!');
  } catch (e) {
    console.error('Error executing SQL:', e);
  } finally {
    await sql.end();
  }
}

runSQL();
