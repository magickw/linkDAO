const postgres = require('postgres');
const bcrypt = require('bcrypt');

// Database connection
const connectionString = "postgresql://neondb_owner:npg_eqKdwjDV7R9I@ep-quiet-lake-adx0tq66-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
const sql = postgres(connectionString, { ssl: 'require' });

const SALT_ROUNDS = 12;

async function createAdminUser() {
  try {
    console.log('Creating admin user...');
    
    // Admin user details
    const email = 'admin@linkdao.io';
    const password = 'Admin123!'; // Change this to a secure password
    const role = 'super_admin';
    const walletAddress = '0x0000000000000000000000000000000000000000'; // Placeholder, change to actual wallet address
    
    // Hash the password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    
    // Insert the user directly
    const result = await sql`
      INSERT INTO users (
        email, 
        password_hash, 
        role, 
        wallet_address, 
        email_verified, 
        permissions,
        created_at,
        updated_at
      ) VALUES (
        ${email.toLowerCase()},
        ${passwordHash},
        ${role},
        ${walletAddress.toLowerCase()},
        true,
        ${JSON.stringify(['*'])}, -- Super admin gets all permissions
        NOW(),
        NOW()
      )
      RETURNING id, email, role
    `;
    
    if (result.length > 0) {
      console.log('✅ Admin user created successfully!');
      console.log('User ID:', result[0].id);
      console.log('Email:', result[0].email);
      console.log('Role:', result[0].role);
      console.log('\n⚠️  IMPORTANT: Change the default password after first login!');
    } else {
      console.error('❌ Failed to create admin user');
    }
  } catch (error) {
    if (error.message.includes('duplicate key')) {
      console.log('ℹ️  Admin user already exists with this email');
    } else {
      console.error('Error creating admin user:', error.message);
    }
  } finally {
    await sql.end();
  }
}

// Run the function
createAdminUser();