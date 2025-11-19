-- Add ldao_balance to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS ldao_balance numeric(20, 8) DEFAULT '0';

-- Create staking_positions table
CREATE TABLE IF NOT EXISTS staking_positions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount numeric(20, 8) NOT NULL,
  lock_period integer DEFAULT 0, -- in days
  start_time timestamp DEFAULT now(),
  end_time timestamp,
  status varchar(20) DEFAULT 'active', -- 'active', 'unstaked', 'completed'
  rewards_accrued numeric(20, 8) DEFAULT '0',
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staking_positions_user_id ON staking_positions(user_id);
CREATE INDEX IF NOT EXISTS idx_staking_positions_status ON staking_positions(status);
