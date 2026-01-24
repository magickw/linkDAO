const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

async function addColumn() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('Connected to database');
    
    await client.query('ALTER TABLE escrows ADD COLUMN IF NOT EXISTS on_chain_id varchar(255);');
    console.log('Column on_chain_id added to escrows table');
  } catch (err) {
    console.error('Error adding column:', err);
  } finally {
    await client.end();
  }
}

addColumn();
