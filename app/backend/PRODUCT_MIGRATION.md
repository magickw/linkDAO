# Product Management Migration Guide

This document describes the database migration for the Web3 marketplace product management system.

## Overview

The product migration adds comprehensive product management capabilities to the LinkDAO marketplace, including:

- **Categories**: Hierarchical product categorization system
- **Products**: Main product catalog with rich metadata
- **Product Tags**: Efficient tagging system for search and filtering

## Migration Files

### 1. Schema Definition
- **File**: `src/db/schema.ts`
- **Tables Added**: `categories`, `products`, `product_tags`
- **Relationships**: Full foreign key constraints with proper cascade rules

### 2. Migration SQL
- **File**: `drizzle/0006_product_tables.sql`
- **Type**: DDL migration with sample data
- **Features**: Idempotent execution, comprehensive indexing

### 3. Migration Scripts
- **Migration**: `src/scripts/migrateProducts.ts`
- **Verification**: `src/scripts/verifyProductMigration.ts`

## Database Schema

### Categories Table
```sql
CREATE TABLE "categories" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" varchar(255) NOT NULL,
  "slug" varchar(255) NOT NULL UNIQUE,
  "description" text,
  "parent_id" uuid REFERENCES categories(id),
  "path" text NOT NULL, -- JSON array for breadcrumbs
  "image_url" text,
  "is_active" boolean DEFAULT true,
  "sort_order" integer DEFAULT 0,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
```

### Products Table
```sql
CREATE TABLE "products" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "seller_id" uuid NOT NULL REFERENCES users(id),
  "title" varchar(500) NOT NULL,
  "description" text NOT NULL,
  "price_amount" numeric(20, 8) NOT NULL,
  "price_currency" varchar(10) NOT NULL,
  "category_id" uuid NOT NULL REFERENCES categories(id),
  "images" text NOT NULL, -- JSON array of IPFS hashes
  "metadata" text NOT NULL, -- JSON ProductMetadata
  "inventory" integer DEFAULT 0 NOT NULL,
  "status" varchar(32) DEFAULT 'active',
  "tags" text, -- JSON array of tags
  "shipping" text, -- JSON ShippingInfo
  "nft" text, -- JSON NFTInfo
  "views" integer DEFAULT 0,
  "favorites" integer DEFAULT 0,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);
```

### Product Tags Table
```sql
CREATE TABLE "product_tags" (
  "id" serial PRIMARY KEY,
  "product_id" uuid NOT NULL REFERENCES products(id),
  "tag" varchar(100) NOT NULL,
  "created_at" timestamp DEFAULT now()
);
```

## Indexes

The migration creates comprehensive indexes for optimal query performance:

### Product Indexes
- `product_title_idx`: Full-text search on titles
- `product_status_idx`: Filter by product status
- `product_category_idx`: Category-based filtering
- `product_seller_idx`: Seller-based queries
- `product_price_idx`: Price range filtering
- `product_created_at_idx`: Chronological sorting
- `product_inventory_idx`: Stock availability

### Tag Indexes
- `product_tag_idx`: Composite index for product-tag relationships
- `tag_idx`: Tag-based search optimization

## Foreign Key Relationships

### Cascade Rules
- **Categories → Categories**: `CASCADE` (delete child categories)
- **Products → Users**: `CASCADE` (delete products when user deleted)
- **Products → Categories**: `RESTRICT` (prevent category deletion with products)
- **Product Tags → Products**: `CASCADE` (delete tags with products)

## Default Data

The migration includes default categories:

```
Electronics
├── Computers
├── Smartphones  
└── Gaming
Fashion
Home & Garden
Books
Sports
Art & Collectibles
Digital Assets
```

## Running the Migration

### Prerequisites
1. Ensure `DATABASE_URL` environment variable is set
2. Database connection should be available
3. Users table should exist (dependency)

### Commands

```bash
# Run the product migration
npm run db:migrate:products

# Verify the migration
npm run db:verify:products

# Generate new migrations (if schema changes)
npm run db:generate
```

### Manual Execution
```bash
# Using tsx directly
npx tsx src/scripts/migrateProducts.ts

# Using node (after build)
node dist/scripts/migrateProducts.js
```

## Verification

The verification script checks:

1. **Table Existence**: All tables created successfully
2. **Column Count**: Correct number of columns per table
3. **Indexes**: All performance indexes created
4. **Foreign Keys**: Proper relationship constraints
5. **Sample Data**: Default categories inserted
6. **Operations**: Basic CRUD operations work
7. **Cleanup**: Test data properly removed

### Expected Output
```
🔍 Verifying product migration...

📋 Checking table existence:
   ✅ categories (11 columns)
   ✅ products (18 columns)
   ✅ product_tags (4 columns)

🔗 Checking indexes:
   categories: 2 indexes
   products: 8 indexes
   product_tags: 3 indexes

🔗 Checking foreign key constraints:
   ✅ categories.parent_id → categories.id
   ✅ products.seller_id → users.id
   ✅ products.category_id → categories.id
   ✅ product_tags.product_id → products.id

📊 Checking sample data:
   Categories: 10 records
   Products: 0 records
   Product Tags: 0 records

🧪 Testing basic operations:
   ✅ Category insertion
   ✅ Product insertion
   ✅ Product tag insertion
   ✅ Test data cleanup completed

🎉 Product migration verification completed successfully!
```

## Rollback

If rollback is needed:

```sql
-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS product_tags CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS categories CASCADE;

-- Remove product_id column from listings
ALTER TABLE listings DROP COLUMN IF EXISTS product_id;
```

## Integration with Existing Code

### Models
- **TypeScript Interfaces**: `src/models/Product.ts`
- **Validation**: Built-in validation in ProductService
- **Type Safety**: Full TypeScript support

### Services
- **ProductService**: `src/services/productService.ts`
- **Database Operations**: `src/services/databaseService.ts`
- **IPFS Integration**: `src/services/metadataService.ts`

### API Endpoints
- **Routes**: `src/routes/productRoutes.ts`
- **Controller**: `src/controllers/productController.ts`
- **Middleware**: File upload support with multer

## Performance Considerations

### Indexing Strategy
- **Composite Indexes**: Multi-column indexes for common query patterns
- **Partial Indexes**: Consider adding for active products only
- **Full-Text Search**: PostgreSQL full-text search on product titles/descriptions

### Scaling Recommendations
1. **Partitioning**: Consider partitioning products by category for large datasets
2. **Caching**: Implement Redis caching for frequently accessed categories
3. **Search**: Consider Elasticsearch for advanced search capabilities
4. **Images**: Use CDN for IPFS image delivery

## Monitoring

### Key Metrics to Monitor
- Table sizes and growth rates
- Query performance on indexed columns
- Foreign key constraint violations
- Category hierarchy depth

### Useful Queries
```sql
-- Check table sizes
SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE tablename IN ('categories', 'products', 'product_tags');

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE tablename IN ('categories', 'products', 'product_tags');

-- Check constraint violations
SELECT conname, conrelid::regclass, confrelid::regclass
FROM pg_constraint 
WHERE contype = 'f' AND connamespace = 'public'::regnamespace;
```

## Troubleshooting

### Common Issues

1. **Foreign Key Violations**
   - Ensure users table exists before running migration
   - Check that referenced user IDs exist when inserting products

2. **Unique Constraint Violations**
   - Category slugs must be unique
   - Handle slug generation in application code

3. **JSON Validation**
   - Ensure JSON fields contain valid JSON
   - Use proper escaping in application code

4. **Performance Issues**
   - Monitor query execution plans
   - Consider additional indexes for specific query patterns
   - Use EXPLAIN ANALYZE for slow queries

### Support
For issues or questions, check:
1. Migration logs for specific error messages
2. Database logs for constraint violations
3. Application logs for service-level errors