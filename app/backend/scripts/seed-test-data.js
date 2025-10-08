#!/usr/bin/env node

/**
 * Database Seeding Script
 * Seeds the test database with realistic fixture data
 */

const { DatabaseSeeder } = require('../dist/tests/fixtures/databaseSeeder');

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'default';
  
  console.log(`🌱 Running database seeder with command: ${command}`);
  
  const seeder = new DatabaseSeeder();
  
  try {
    switch (command) {
      case 'minimal':
        console.log('Creating minimal test dataset...');
        await seeder.seedMinimal();
        break;
        
      case 'comprehensive':
        console.log('Creating comprehensive test dataset...');
        await seeder.seedComprehensive();
        break;
        
      case 'clean':
        console.log('Cleaning test database...');
        await seeder.cleanDatabase();
        break;
        
      case 'custom':
        const options = {
          userCount: parseInt(args[1]) || 50,
          communityCount: parseInt(args[2]) || 10,
          productCount: parseInt(args[3]) || 100,
          postCount: parseInt(args[4]) || 200,
          proposalCount: parseInt(args[5]) || 25,
          daoCount: parseInt(args[6]) || 5,
          clean: true
        };
        console.log('Creating custom test dataset with options:', options);
        await seeder.seed(options);
        break;
        
      default:
        console.log('Creating default test dataset...');
        await seeder.seed();
        break;
    }
    
    console.log('✅ Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    process.exit(1);
  } finally {
    await seeder.close();
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };