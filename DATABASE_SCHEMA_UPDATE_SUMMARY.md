# Database Schema Update Summary

## Overview
This document summarizes the database schema updates made to support the new Web3 social feed features including posts, reactions, tips, and tagging functionality.

## New Tables Added

### 1. Post Tags Table (`post_tags`)
- **Purpose**: Efficient querying of posts by tags
- **Columns**:
  - `id` (SERIAL, PRIMARY KEY)
  - `post_id` (INTEGER, REFERENCES posts.id)
  - `tag` (VARCHAR(64), NOT NULL)
  - `created_at` (TIMESTAMP, DEFAULT NOW())
- **Indexes**: Index on (post_id, tag)

### 2. Reactions Table (`reactions`)
- **Purpose**: Store token-based reactions to posts
- **Columns**:
  - `id` (SERIAL, PRIMARY KEY)
  - `post_id` (INTEGER, REFERENCES posts.id)
  - `user_id` (UUID, REFERENCES users.id)
  - `type` (VARCHAR(32), NOT NULL) - Values: 'hot', 'diamond', 'bullish', 'governance', 'art'
  - `amount` (NUMERIC, NOT NULL) - Amount of tokens staked
  - `rewards_earned` (NUMERIC, DEFAULT '0') - Rewards earned by the post author
  - `created_at` (TIMESTAMP, DEFAULT NOW())
- **Indexes**: Index on (post_id, user_id)

### 3. Tips Table (`tips`)
- **Purpose**: Store direct token transfers to post authors
- **Columns**:
  - `id` (SERIAL, PRIMARY KEY)
  - `post_id` (INTEGER, REFERENCES posts.id)
  - `from_user_id` (UUID, REFERENCES users.id)
  - `to_user_id` (UUID, REFERENCES users.id)
  - `token` (VARCHAR(64), NOT NULL) - Token type (e.g., USDC, LNK)
  - `amount` (NUMERIC, NOT NULL) - Amount transferred
  - `message` (TEXT) - Optional message with the tip
  - `tx_hash` (VARCHAR(66)) - Blockchain transaction hash
  - `created_at` (TIMESTAMP, DEFAULT NOW())
- **Indexes**: Index on (post_id)

## Updated Tables

### Posts Table (`posts`)
Added new columns to support enhanced social feed functionality:
- `title` (TEXT) - Post title
- `media_cids` (TEXT) - JSON array of media IPFS CIDs
- `tags` (TEXT) - JSON array of tags
- `staked_value` (NUMERIC, DEFAULT '0') - Total tokens staked on this post
- `reputation_score` (INTEGER, DEFAULT 0) - Author's reputation score at time of posting
- `dao` (VARCHAR(64)) - DAO community this post belongs to

## Migration Details

The migration was applied using Drizzle Kit's push command, which:
1. Added the new tables with appropriate foreign key constraints
2. Added new columns to the existing posts table
3. Created necessary indexes for efficient querying
4. Preserved all existing data

## Schema Validation

The updated schema was validated by:
1. Running `npx drizzle-kit push` to apply changes
2. Verifying that all foreign key relationships are correctly defined
3. Ensuring backward compatibility with existing data
4. Confirming that all new tables have appropriate indexes

## Impact on Existing Functionality

The schema updates maintain full backward compatibility with existing functionality:
- All existing posts, users, and other data remain intact
- New columns in the posts table are nullable to accommodate existing records
- Foreign key constraints ensure data integrity across all tables
- Indexes improve query performance for both existing and new functionality

## Next Steps

1. Update backend services to utilize the new schema for social feed features
2. Implement API endpoints for reactions, tips, and enhanced post functionality
3. Update frontend components to leverage the new data structures
4. Create database seed data for testing the new features