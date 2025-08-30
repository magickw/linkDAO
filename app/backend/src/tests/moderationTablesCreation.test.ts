import { describe, it, expect } from '@jest/globals';
import { db } from '../db/connection';
import { sql } from 'drizzle-orm';

describe('Moderation Tables Creation', () => {
  it('should be able to create moderation tables', async () => {
    // Test if we can create the moderation_cases table
    const createModerationCasesTable = sql`
      CREATE TABLE IF NOT EXISTS test_moderation_cases (
        id SERIAL PRIMARY KEY,
        content_id VARCHAR(64) NOT NULL,
        content_type VARCHAR(24) NOT NULL CHECK (content_type IN ('post', 'comment', 'listing', 'dm', 'username', 'image', 'video')),
        user_id UUID NOT NULL,
        status VARCHAR(24) DEFAULT 'pending' CHECK (status IN ('pending', 'quarantined', 'blocked', 'allowed', 'appealed', 'under_review')),
        risk_score DECIMAL(5,4) DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 1),
        decision VARCHAR(24) CHECK (decision IN ('allow', 'limit', 'block', 'review')),
        reason_code VARCHAR(48),
        confidence DECIMAL(5,4) DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 1),
        vendor_scores JSONB DEFAULT '{}',
        evidence_cid TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `;

    // Execute the table creation
    await db.execute(createModerationCasesTable);

    // Test if we can insert data
    const insertTestData = sql`
      INSERT INTO test_moderation_cases (content_id, content_type, user_id, status)
      VALUES ('test_content_123', 'post', gen_random_uuid(), 'pending');
    `;

    await db.execute(insertTestData);

    // Test if we can query the data
    const selectData = sql`SELECT COUNT(*) as count FROM test_moderation_cases;`;
    const result = await db.execute(selectData);
    
    expect(result[0].count).toBe('1');

    // Clean up
    const dropTable = sql`DROP TABLE IF EXISTS test_moderation_cases;`;
    await db.execute(dropTable);
  });

  it('should validate check constraints work correctly', async () => {
    // Create a test table with constraints
    const createTable = sql`
      CREATE TABLE IF NOT EXISTS test_constraints (
        id SERIAL PRIMARY KEY,
        risk_score DECIMAL(5,4) CHECK (risk_score >= 0 AND risk_score <= 1),
        content_type VARCHAR(24) CHECK (content_type IN ('post', 'comment', 'listing'))
      );
    `;

    await db.execute(createTable);

    // Test valid data insertion
    const insertValid = sql`
      INSERT INTO test_constraints (risk_score, content_type)
      VALUES (0.5, 'post');
    `;

    await db.execute(insertValid);

    // Test that invalid risk_score is rejected
    const insertInvalidRisk = sql`
      INSERT INTO test_constraints (risk_score, content_type)
      VALUES (1.5, 'post');
    `;

    await expect(db.execute(insertInvalidRisk)).rejects.toThrow();

    // Test that invalid content_type is rejected
    const insertInvalidType = sql`
      INSERT INTO test_constraints (risk_score, content_type)
      VALUES (0.5, 'invalid_type');
    `;

    await expect(db.execute(insertInvalidType)).rejects.toThrow();

    // Clean up
    const dropTable = sql`DROP TABLE IF EXISTS test_constraints;`;
    await db.execute(dropTable);
  });

  it('should validate JSONB columns work correctly', async () => {
    // Create a test table with JSONB
    const createTable = sql`
      CREATE TABLE IF NOT EXISTS test_jsonb (
        id SERIAL PRIMARY KEY,
        vendor_scores JSONB DEFAULT '{}',
        metadata JSONB
      );
    `;

    await db.execute(createTable);

    // Test JSONB insertion
    const insertJsonb = sql`
      INSERT INTO test_jsonb (vendor_scores, metadata)
      VALUES ('{"openai": 0.95, "perspective": 0.8}', '{"source": "api", "version": "1.0"}');
    `;

    await db.execute(insertJsonb);

    // Test JSONB querying
    const selectJsonb = sql`
      SELECT vendor_scores->>'openai' as openai_score, metadata->>'source' as source
      FROM test_jsonb
      WHERE id = 1;
    `;

    const result = await db.execute(selectJsonb);
    expect(result[0].openai_score).toBe('0.95');
    expect(result[0].source).toBe('api');

    // Clean up
    const dropTable = sql`DROP TABLE IF EXISTS test_jsonb;`;
    await db.execute(dropTable);
  });
});