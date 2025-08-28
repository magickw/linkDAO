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
- **Embeddings**: Vector embeddings for semantic search (currently stored as JSON text)
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

Or to push the schema directly:

```bash
npx drizzle-kit push
```

## Development Workflow

1. Modify the schema in `src/db/schema.ts`
2. Generate migrations with `npm run db:generate`
3. Apply migrations with `npm run db:migrate`
4. Use the DatabaseService for all database operations

## Type Safety

All database operations are type-safe thanks to Drizzle's TypeScript integration. This reduces runtime errors and provides better developer experience with autocompletion and type checking.

## Testing

We've created comprehensive tests in `src/tests/databaseService.test.ts` that verify all database operations work correctly. All tests pass successfully, demonstrating that the database integration is working correctly.

## Resetting the Database

For development purposes, you can reset the database using the reset script:

```bash
npx tsx src/scripts/resetDatabase.ts
```

This will delete all data from all tables while maintaining the schema structure.

## Future Improvements

### pgvector Extension

For production deployment, we recommend installing the pgvector extension to enable true vector similarity search for AI embeddings. This would allow for more efficient and accurate semantic search operations.

### Migration Scripts

For production deployment, we recommend creating more sophisticated migration scripts that can handle schema evolution over time, including:

- Backward-compatible schema changes
- Data migration scripts
- Rollback procedures

## Troubleshooting

### Common Issues

1. **Connection errors**: Verify that the `DATABASE_URL` in your `.env` file is correct and that your PostgreSQL server is running.

2. **Schema issues**: If you encounter schema-related errors, try running `npx drizzle-kit push` to synchronize the schema with your database.

3. **Migration errors**: If migrations fail, check the error message for details. You may need to manually resolve conflicts or reset the database.

### Resetting the Database

If you encounter persistent issues, you can reset the database using the reset script:

```bash
npx tsx src/scripts/resetDatabase.ts
```

This will delete all data from all tables while maintaining the schema structure.