import { databaseService } from './src/services/databaseService';

console.log('Database connection status:', databaseService.isDatabaseConnected());

if (!databaseService.isDatabaseConnected()) {
  console.log('Database is not connected. Check your DATABASE_URL configuration.');
  process.exit(1);
}

console.log('Database connection is active.');
process.exit(0);