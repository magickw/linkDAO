-- Marketplace Reputation System Migration
-- This creates a simplified reputation system specifically for marketplace functionality

-- User reputation table with marketplace-specific metrics
CREATE TABLE IF NOT EXISTS "user_reputation" (
  "wallet_address" varchar(66) PRIMARY KEY,
  "reputation_score" numeric(5,2) DEFAULT 0.00 NOT NULL,
  "total_transactions" integer DEFAULT 0 NOT NULL,
  "positive_reviews" integer DEFAULT 0 NOT NULL,
  "negative_reviews" integer DEFAULT 0 NOT NULL,
  "neutral_reviews" integer DEFAULT 0 NOT NULL,
  "successful_sales" integer DEFAULT 0 NOT NULL,
  "successful_purchases" integer DEFAULT 0 NOT NULL,
  "disputed_transactions" integer DEFAULT 0 NOT NULL,
  "resolved_disputes" integer DEFAULT 0 NOT NULL,
  "average_response_time" numeric(10,2) DEFAULT 0.00, -- in hours
  "completion_rate" numeric(5,2) DEFAULT 100.00, -- percentage
  "last_calculated" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Reputation history for audit purposes
CREATE TABLE IF NOT EXISTS "reputation_history" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "wallet_address" varchar(66) NOT NULL,
  "event_type" varchar(50) NOT NULL, -- 'review_received', 'transaction_completed', 'dispute_resolved', etc.
  "score_change" numeric(5,2) NOT NULL,
  "previous_score" numeric(5,2) NOT NULL,
  "new_score" numeric(5,2) NOT NULL,
  "transaction_id" varchar(100), -- reference to order/transaction
  "review_id" uuid, -- reference to review if applicable
  "description" text,
  "metadata" jsonb, -- additional context data
  "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY ("wallet_address") REFERENCES "user_reputation"("wallet_address") ON DELETE CASCADE
);

-- Reputation calculation triggers and update mechanisms
CREATE TABLE IF NOT EXISTS "reputation_calculation_rules" (
  "id" serial PRIMARY KEY,
  "rule_name" varchar(100) NOT NULL UNIQUE,
  "event_type" varchar(50) NOT NULL,
  "score_impact" numeric(5,2) NOT NULL,
  "weight_factor" numeric(3,2) DEFAULT 1.00,
  "min_threshold" integer DEFAULT 0, -- minimum transactions before rule applies
  "max_impact" numeric(5,2), -- maximum score change per event
  "description" text,
  "is_active" boolean DEFAULT true,
  "created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Insert default reputation calculation rules
INSERT INTO "reputation_calculation_rules" ("rule_name", "event_type", "score_impact", "weight_factor", "description") VALUES
('positive_review', 'review_received', 2.50, 1.00, 'Positive review received from buyer/seller'),
('negative_review', 'review_received', -5.00, 1.00, 'Negative review received from buyer/seller'),
('neutral_review', 'review_received', 0.50, 1.00, 'Neutral review received from buyer/seller'),
('successful_transaction', 'transaction_completed', 1.00, 1.00, 'Successfully completed transaction'),
('dispute_opened', 'dispute_created', -3.00, 1.00, 'Dispute opened against user'),
('dispute_resolved_favor', 'dispute_resolved', 2.00, 1.00, 'Dispute resolved in user favor'),
('dispute_resolved_against', 'dispute_resolved', -7.50, 1.00, 'Dispute resolved against user'),
('fast_response', 'response_time', 0.25, 1.00, 'Fast response time bonus'),
('slow_response', 'response_time', -0.50, 1.00, 'Slow response time penalty'),
('high_completion_rate', 'completion_rate', 1.50, 1.00, 'High transaction completion rate bonus'),
('low_completion_rate', 'completion_rate', -2.00, 1.00, 'Low transaction completion rate penalty');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS "idx_user_reputation_score" ON "user_reputation"("reputation_score");
CREATE INDEX IF NOT EXISTS "idx_user_reputation_total_transactions" ON "user_reputation"("total_transactions");
CREATE INDEX IF NOT EXISTS "idx_user_reputation_updated_at" ON "user_reputation"("updated_at");

CREATE INDEX IF NOT EXISTS "idx_reputation_history_wallet_address" ON "reputation_history"("wallet_address");
CREATE INDEX IF NOT EXISTS "idx_reputation_history_event_type" ON "reputation_history"("event_type");
CREATE INDEX IF NOT EXISTS "idx_reputation_history_created_at" ON "reputation_history"("created_at");
CREATE INDEX IF NOT EXISTS "idx_reputation_history_transaction_id" ON "reputation_history"("transaction_id");

CREATE INDEX IF NOT EXISTS "idx_reputation_rules_event_type" ON "reputation_calculation_rules"("event_type");
CREATE INDEX IF NOT EXISTS "idx_reputation_rules_active" ON "reputation_calculation_rules"("is_active");

-- Function to update reputation score
CREATE OR REPLACE FUNCTION update_reputation_score(
  p_wallet_address varchar(66),
  p_event_type varchar(50),
  p_transaction_id varchar(100) DEFAULT NULL,
  p_review_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT NULL
) RETURNS void AS $$
DECLARE
  v_rule_record RECORD;
  v_current_reputation RECORD;
  v_score_change numeric(5,2) := 0;
  v_new_score numeric(5,2);
BEGIN
  -- Get current reputation or create if doesn't exist
  SELECT * INTO v_current_reputation 
  FROM user_reputation 
  WHERE wallet_address = p_wallet_address;
  
  IF NOT FOUND THEN
    INSERT INTO user_reputation (wallet_address) VALUES (p_wallet_address);
    SELECT * INTO v_current_reputation 
    FROM user_reputation 
    WHERE wallet_address = p_wallet_address;
  END IF;
  
  -- Get applicable rule
  SELECT * INTO v_rule_record
  FROM reputation_calculation_rules
  WHERE event_type = p_event_type AND is_active = true
  LIMIT 1;
  
  IF FOUND THEN
    -- Calculate score change based on rule
    v_score_change := v_rule_record.score_impact * v_rule_record.weight_factor;
    
    -- Apply max impact limit if set
    IF v_rule_record.max_impact IS NOT NULL THEN
      v_score_change := LEAST(ABS(v_score_change), v_rule_record.max_impact) * SIGN(v_score_change);
    END IF;
    
    -- Calculate new score (minimum 0, maximum 100)
    v_new_score := GREATEST(0, LEAST(100, v_current_reputation.reputation_score + v_score_change));
    
    -- Update reputation score
    UPDATE user_reputation 
    SET 
      reputation_score = v_new_score,
      last_calculated = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    WHERE wallet_address = p_wallet_address;
    
    -- Insert history record
    INSERT INTO reputation_history (
      wallet_address,
      event_type,
      score_change,
      previous_score,
      new_score,
      transaction_id,
      review_id,
      description,
      metadata
    ) VALUES (
      p_wallet_address,
      p_event_type,
      v_score_change,
      v_current_reputation.reputation_score,
      v_new_score,
      p_transaction_id,
      p_review_id,
      v_rule_record.description,
      p_metadata
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate comprehensive reputation metrics
CREATE OR REPLACE FUNCTION calculate_reputation_metrics(p_wallet_address varchar(66))
RETURNS void AS $$
DECLARE
  v_total_reviews integer := 0;
  v_avg_response_time numeric(10,2) := 0;
  v_completion_rate numeric(5,2) := 100.00;
BEGIN
  -- Update transaction counts and review counts
  UPDATE user_reputation 
  SET 
    total_transactions = (
      SELECT COUNT(*) 
      FROM orders 
      WHERE (buyer_id = (SELECT id FROM users WHERE wallet_address = p_wallet_address)
             OR seller_id = (SELECT id FROM users WHERE wallet_address = p_wallet_address))
        AND status = 'completed'
    ),
    positive_reviews = (
      SELECT COUNT(*) 
      FROM reviews 
      WHERE reviewed_user_id = (SELECT id FROM users WHERE wallet_address = p_wallet_address)
        AND rating >= 4
    ),
    negative_reviews = (
      SELECT COUNT(*) 
      FROM reviews 
      WHERE reviewed_user_id = (SELECT id FROM users WHERE wallet_address = p_wallet_address)
        AND rating <= 2
    ),
    neutral_reviews = (
      SELECT COUNT(*) 
      FROM reviews 
      WHERE reviewed_user_id = (SELECT id FROM users WHERE wallet_address = p_wallet_address)
        AND rating = 3
    ),
    successful_sales = (
      SELECT COUNT(*) 
      FROM orders 
      WHERE seller_id = (SELECT id FROM users WHERE wallet_address = p_wallet_address)
        AND status = 'completed'
    ),
    successful_purchases = (
      SELECT COUNT(*) 
      FROM orders 
      WHERE buyer_id = (SELECT id FROM users WHERE wallet_address = p_wallet_address)
        AND status = 'completed'
    ),
    disputed_transactions = (
      SELECT COUNT(*) 
      FROM disputes d
      JOIN orders o ON d.escrow_id = o.escrow_id
      WHERE (o.buyer_id = (SELECT id FROM users WHERE wallet_address = p_wallet_address)
             OR o.seller_id = (SELECT id FROM users WHERE wallet_address = p_wallet_address))
    ),
    resolved_disputes = (
      SELECT COUNT(*) 
      FROM disputes d
      JOIN orders o ON d.escrow_id = o.escrow_id
      WHERE (o.buyer_id = (SELECT id FROM users WHERE wallet_address = p_wallet_address)
             OR o.seller_id = (SELECT id FROM users WHERE wallet_address = p_wallet_address))
        AND d.status = 'resolved'
    ),
    updated_at = CURRENT_TIMESTAMP
  WHERE wallet_address = p_wallet_address;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update reputation metrics when reviews are added
CREATE OR REPLACE FUNCTION trigger_reputation_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Update reputation based on review
  IF TG_OP = 'INSERT' THEN
    PERFORM update_reputation_score(
      (SELECT wallet_address FROM users WHERE id = NEW.reviewed_user_id),
      'review_received',
      NULL,
      NEW.id,
      json_build_object('rating', NEW.rating, 'reviewer_id', NEW.reviewer_id)::jsonb
    );
    
    -- Recalculate comprehensive metrics
    PERFORM calculate_reputation_metrics(
      (SELECT wallet_address FROM users WHERE id = NEW.reviewed_user_id)
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for review updates
DROP TRIGGER IF EXISTS reputation_update_on_review ON reviews;
CREATE TRIGGER reputation_update_on_review
  AFTER INSERT ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION trigger_reputation_update();

-- Trigger to update reputation when orders are completed
CREATE OR REPLACE FUNCTION trigger_reputation_on_order_completion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Update reputation for both buyer and seller
    PERFORM update_reputation_score(
      (SELECT wallet_address FROM users WHERE id = NEW.seller_id),
      'transaction_completed',
      NEW.id::varchar,
      NULL,
      json_build_object('role', 'seller', 'amount', NEW.amount)::jsonb
    );
    
    PERFORM update_reputation_score(
      (SELECT wallet_address FROM users WHERE id = NEW.buyer_id),
      'transaction_completed',
      NEW.id::varchar,
      NULL,
      json_build_object('role', 'buyer', 'amount', NEW.amount)::jsonb
    );
    
    -- Recalculate comprehensive metrics for both users
    PERFORM calculate_reputation_metrics((SELECT wallet_address FROM users WHERE id = NEW.seller_id));
    PERFORM calculate_reputation_metrics((SELECT wallet_address FROM users WHERE id = NEW.buyer_id));
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for order completion
DROP TRIGGER IF EXISTS reputation_update_on_order_completion ON orders;
CREATE TRIGGER reputation_update_on_order_completion
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION trigger_reputation_on_order_completion();