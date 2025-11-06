// Test to verify session ID handling
const sessionId = 'test-session-id';
console.log(`Original session ID: ${sessionId}`);
console.log(`Lowercase session ID: ${sessionId.toLowerCase()}`);
console.log(`Uppercase session ID: ${sessionId.toUpperCase()}`);
console.log(`Mixed case session ID: ${sessionId.substring(0, 5) + sessionId.substring(5).toUpperCase()}`);