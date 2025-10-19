# Database Seeding Scripts

This directory contains scripts for seeding the database with realistic sample data for development and testing.

## Marketplace Seeding System

The marketplace seeding system (`seedDatabase.ts`) generates comprehensive sample data for the marketplace API integration, including:

### Generated Data

- **Users (25 default)**: Complete user profiles with billing and shipping addresses
- **Sellers (12 default)**: Seller profiles with store information, performance metrics, and verification status
- **Product Categories (8 default)**: Organized categories like Electronics, Fashion, Home & Garden, etc.
- **Products (60 default)**: Realistic products with pricing, descriptions, images, and metadata
- **Marketplace Listings**: Corresponding marketplace listings for products
- **Orders (40 default)**: Order history with payment details, shipping information, and tracking
- **Reviews**: Customer reviews for completed orders
- **Shopping Carts**: Active shopping carts with items for testing cart functionality

### Usage

#### Quick Start
```bash
# Use default settings (25 users, 12 sellers, 60 products, 40 orders)
npm run seed:marketplace

# Or use the shell script
./scripts/seed-marketplace.sh
```

#### Custom Configuration
```bash
# Create more data
npm run seed:marketplace:large

# Or specify exact numbers
ts-node scripts/seedDatabase.ts --users=50 --sellers=20 --products=150 --orders=100

# Don't clean existing data (add to existing)
ts-node scripts/seedDatabase.ts --no-clean
```

#### Shell Script Options
```bash
# Show help
./scripts/seed-marketplace.sh --help

# Custom configuration
./scripts/seed-marketplace.sh --users=30 --products=80 --orders=60

# Add to existing data without cleaning
./scripts/seed-marketplace.sh --no-clean
```

### Requirements

- **Database**: PostgreSQL database with proper schema
- **Environment**: `DATABASE_URL` environment variable must be set
- **Dependencies**: `@faker-js/faker` for realistic data generation

### Data Quality

The seeding system generates high-quality, realistic data:

- **Addresses**: Real-looking addresses with proper formatting
- **Products**: Category-appropriate names, descriptions, and pricing
- **Images**: Placeholder images from reliable sources
- **Relationships**: Proper foreign key relationships and data consistency
- **Variety**: Diverse data across different categories and price ranges

### Testing

```bash
# Test the seeding system without running it
node scripts/test-seed.js
```

### Integration with API

After seeding, you can test the marketplace API endpoints:

```bash
# Start the backend server
npm run dev

# Test endpoints
curl http://localhost:3001/api/marketplace/listings
curl http://localhost:3001/api/marketplace/sellers
curl http://localhost:3001/api/auth/profile
curl http://localhost:3001/api/cart
```

## Other Seeding Scripts

### Test Data Seeding
```bash
# Seed test data for general testing
npm run seed:test

# Minimal test dataset
npm run seed:test:minimal

# Comprehensive test dataset  
npm run seed:test:comprehensive

# Clean test database
npm run seed:test:clean
```

## Environment Setup

Make sure your environment is properly configured:

```bash
# Required environment variable
export DATABASE_URL="postgresql://user:password@host:port/database"

# Optional: specify test database
export TEST_DATABASE_URL="postgresql://user:password@host:port/test_database"
```

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Ensure `DATABASE_URL` is set correctly
   - Verify database is running and accessible
   - Check database credentials and permissions

2. **TypeScript Compilation Errors**
   - Run `npm install` to ensure all dependencies are installed
   - Check that `@faker-js/faker` is properly installed

3. **Foreign Key Constraint Errors**
   - Ensure database schema is up to date
   - Run migrations before seeding: `npm run migrate`

4. **Memory Issues with Large Datasets**
   - Reduce the number of records being generated
   - Use `--no-clean` to add data incrementally

### Getting Help

If you encounter issues:

1. Check the console output for specific error messages
2. Verify your database schema matches the expected structure
3. Test with smaller datasets first
4. Check the database logs for constraint violations

## Development

### Adding New Data Types

To add new types of sample data:

1. Add the table import to `seedDatabase.ts`
2. Create a seeding method (e.g., `seedNewDataType()`)
3. Add it to the main `seed()` method in dependency order
4. Update the CLI options if needed

### Modifying Data Generation

The seeding system uses Faker.js for realistic data generation. You can:

- Modify existing data generators in the seeding methods
- Add new faker providers for specific data types
- Customize data relationships and constraints
- Adjust data distribution and variety

### Performance Optimization

For large datasets:

- Use batch inserts where possible
- Consider using database transactions
- Implement progress reporting for long-running seeds
- Add memory usage monitoring