// Simple test script to verify blockchain integration methods exist
const { ListingService } = require('./dist/services/listingService');

console.log('Testing ListingService blockchain integration...');

const listingService = new ListingService();

// Check if blockchain methods exist
const methods = [
    'publishToBlockchain',
    'syncWithBlockchain', 
    'getBlockchainData',
    'handleBlockchainEvent'
];

methods.forEach(method => {
    if (typeof listingService[method] === 'function') {
        console.log(`✅ ${method} method exists`);
    } else {
        console.log(`❌ ${method} method missing`);
    }
});

console.log('Blockchain integration test complete!');