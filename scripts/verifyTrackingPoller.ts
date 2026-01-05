const { trackingPollerService } = require('../app/backend/src/services/trackingPollerService');
// const { db } = require('../app/backend/src/db');
// const { trackingRecords } = require('../app/backend/src/db/schema');
// const { eq } = require('drizzle-orm');

async function main() {
    console.log('🧪 Verifying TrackingPollerService...');

    try {
        // 1. Create a dummy tracking record if none exists
        // (This would require DB write, maybe too intrusive for a verification script on production unless we clean up)
        // Let's just check if start/stop works without error.

        console.log('Starting service...');
        trackingPollerService.start();

        // Wait a bit
        console.log('Waiting 2 seconds...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        console.log('Stopping service...');
        trackingPollerService.stop();

        console.log('✅ TrackingPollerService start/stop verified.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Verification failed:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}
