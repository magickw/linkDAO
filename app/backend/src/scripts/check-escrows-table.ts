
import postgres from "postgres";
import dotenv from "dotenv";

dotenv.config();

async function checkEscrowsTable() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL not set");
    return;
  }

  const sql = postgres(connectionString);

  try {
    console.log("Checking escrows table structure...");
    const columns = await sql`
      SELECT column_name, data_type, character_maximum_length 
      FROM information_schema.columns 
      WHERE table_name = 'escrows';
    `;
    console.log("Escrows columns:", JSON.stringify(columns, null, 2));

    const constraints = await sql`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_name = 'escrows';
    `;
    console.log("Escrows constraints:", JSON.stringify(constraints, null, 2));

  } catch (error) {
    console.error("Error checking table:", error);
  } finally {
    await sql.end();
  }
}

checkEscrowsTable();
