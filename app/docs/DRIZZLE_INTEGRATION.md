# Drizzle ORM Integration

This document explains how Drizzle ORM is integrated into the LinkDAO platform for database operations.

## Architecture Overview

The LinkDAO platform uses Drizzle ORM with PostgreSQL as the primary database solution. This provides:

- Type-safe database queries
- Automated migrations
- Support for both on-chain data indexing and AI RAG pipelines
- Integration with pgvector for semantic search capabilities

## Database Schema

The database schema includes tables for:

- **Users/Profiles**: User information and profiles
- **Posts**: Social media posts with IPFS metadata
- **Follows**: User following relationships
- **Payments**: Payment records and transactions
- **Governance Proposals**: DAO governance proposals
- **AI Bot Configs**: AI bot configurations and settings
- **Embeddings**: Vector embeddings for semantic search (using pgvector)
- **Marketplace**: Listings, bids, escrows, and reputation data

## Implementation Details

### Schema Definition

The database schema is defined in `app/backend/src/db/schema.ts` using Drizzle's schema definition system. This provides type safety and automatic migration generation.

### Database Connection

The database connection is established in `app/backend/src/db/index.ts` using the `DATABASE_URL` environment variable.

### Database Service

The `DatabaseService` class in `app/backend/src/services/databaseService.ts` provides a clean interface for all database operations using Drizzle ORM.

## Migration Process

1. Schema changes are defined in the schema file
2. Migration files are generated using Drizzle Kit
3. Migrations are applied using the migration script

## Environment Configuration

The `DATABASE_URL` environment variable must be set in the `.env` file:

```
DATABASE_URL=postgresql://username:password@localhost:5432/linkdao
```

## Running Migrations

To run database migrations:

```bash
npm run db:migrate
```

## Development Workflow

1. Modify the schema in `src/db/schema.ts`
2. Generate migrations with `npm run db:generate`
3. Apply migrations with `npm run db:migrate`
4. Use the DatabaseService for all database operations

## Type Safety

All database operations are type-safe thanks to Drizzle's TypeScript integration. This reduces runtime errors and provides better developer experience with autocompletion and type checking.