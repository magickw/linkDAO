-- Add employee management fields to users table
-- Migration: Add employee lifecycle tracking fields

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_employee BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS employee_status VARCHAR(20) DEFAULT 'active' CHECK (employee_status IN ('invited', 'active', 'suspended', 'terminated')),
ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS invited_at TIMESTAMP;

-- Create index for employee queries
CREATE INDEX IF NOT EXISTS idx_users_is_employee ON users(is_employee) WHERE is_employee = true;
CREATE INDEX IF NOT EXISTS idx_users_employee_status ON users(employee_status) WHERE is_employee = true;

-- Update existing admin/support users to be marked as employees
UPDATE users 
SET is_employee = true,
    employee_status = 'active'
WHERE role IN ('admin', 'super_admin', 'moderator', 'analyst', 'support')
  AND is_employee IS NOT true;

-- Add comments
COMMENT ON COLUMN users.is_employee IS 'Flag to distinguish employees from regular users';
COMMENT ON COLUMN users.employee_status IS 'Employee lifecycle status: invited, active, suspended, terminated';
COMMENT ON COLUMN users.invited_by IS 'Admin who invited this employee';
COMMENT ON COLUMN users.invited_at IS 'When the employee was invited';
