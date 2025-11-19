const postgres = require('postgres');

// Database connection
// Database connection
const connectionString = process.env.DATABASE_URL || "postgresql://localhost:5432/linkdao";
const isProduction = process.env.NODE_ENV === 'production' || (connectionString && !connectionString.includes('localhost') && !connectionString.includes('127.0.0.1'));
const sql = postgres(connectionString, {
  ssl: isProduction ? { rejectUnauthorized: false } : false
});

async function updateAdminPermissions() {
  try {
    console.log('Updating admin user permissions to include seller review access...');

    // Update all admin users to include marketplace.seller_review permission
    const result = await sql`
      UPDATE users 
      SET 
        permissions = CASE 
          WHEN role = 'super_admin' THEN '["*"]'::jsonb
          WHEN role = 'admin' THEN 
            CASE 
              WHEN permissions ? 'marketplace.seller_review' THEN permissions
              ELSE jsonb_insert(
                COALESCE(permissions, '[]'::jsonb),
                '{0}',
                '"marketplace.seller_review"'
              )
            END
          ELSE permissions
        END,
        updated_at = NOW()
      WHERE role IN ('admin', 'super_admin')
      RETURNING id, email, role, permissions;
    `;

    if (result.length > 0) {
      console.log(`✅ Updated ${result.length} admin user(s) with proper permissions!`);

      result.forEach(user => {
        console.log(`User: ${user.email} (${user.role}) - Permissions:`, user.permissions);
      });

      console.log('\n✅ Admin users now have access to seller applications and information!');
    } else {
      console.log('ℹ️  No admin users found in the database');
    }
  } catch (error) {
    console.error('Error updating admin permissions:', error.message);
  } finally {
    await sql.end();
  }
}

// Run the function
updateAdminPermissions();