// Test to verify session ID handling
const sessionId = '60AF5E95-B327-4802-A981-1393E6E16150';
console.log(`Original session ID: ${sessionId}`);
console.log(`Lowercase session ID: ${sessionId.toLowerCase()}`);
console.log(`Uppercase session ID: ${sessionId.toUpperCase()}`);

// Test with different formats
console.log('\nTesting different formats:');
console.log(`Mixed case: ${sessionId.substring(0, 5) + sessionId.substring(5).toUpperCase()}`);
console.log(`All lowercase: ${sessionId.toLowerCase()}`);
console.log(`All uppercase: ${sessionId.toUpperCase()}`);