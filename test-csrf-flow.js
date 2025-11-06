// Test to simulate the exact CSRF flow in the application
const crypto = require('crypto');

// Test the CSRF token generation and verification logic with normalization
const CSRF_TOKEN_LENGTH = 32;
const CSRF_SECRET_LENGTH = 32;

// Store CSRF secrets per session (in production, use Redis or similar)
const csrfStore = new Map();

function generateCSRFToken(sessionId) {
  // Normalize session ID to lowercase to avoid case sensitivity issues
  const normalizedSessionId = sessionId.toLowerCase();
  let session = csrfStore.get(normalizedSessionId);
  
  if (!session) {
    session = {
      secret: crypto.randomBytes(CSRF_SECRET_LENGTH).toString('hex'),
      tokens: new Set()
    };
    csrfStore.set(normalizedSessionId, session);
    console.log(`[generateCSRFToken] Created new CSRF session for ID ${normalizedSessionId}`);
  } else {
    console.log(`[generateCSRFToken] Using existing CSRF session for ID ${normalizedSessionId}`);
  }
  
  const token = crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
  const hash = crypto.createHmac('sha256', session.secret).update(token).digest('hex');
  
  session.tokens.add(hash);
  console.log(`[generateCSRFToken] Generated CSRF token for session ${normalizedSessionId}: token=${token}, hash=${hash}`);
  
  // Clean up old tokens (keep last 10)
  if (session.tokens.size > 10) {
    const tokensArray = Array.from(session.tokens);
    session.tokens = new Set(tokensArray.slice(-10));
  }
  
  return token;
}

function verifyCSRFToken(sessionId, token) {
  // Normalize session ID to lowercase to avoid case sensitivity issues
  const normalizedSessionId = sessionId.toLowerCase();
  const session = csrfStore.get(normalizedSessionId);
  
  if (!session) {
    console.log(`[verifyCSRFToken] CSRF verification failed: No session found for ID ${normalizedSessionId}`);
    console.log(`[verifyCSRFToken] Available sessions: ${Array.from(csrfStore.keys()).join(', ')}`);
    return false;
  }
  
  const hash = crypto.createHmac('sha256', session.secret).update(token).digest('hex');
  const isValid = session.tokens.has(hash);
  console.log(`[verifyCSRFToken] CSRF verification for session ${normalizedSessionId}: token=${token}, hash=${hash}, isValid=${isValid}`);
  return isValid;
}

// Simulate the exact flow
console.log('=== Simulating CSRF Flow ===');

// 1. Generate a session ID (like uuidgen does)
const sessionId = '60AF5E95-B327-4802-A981-1393E6E16150';
console.log(`\n1. Generated session ID: ${sessionId}`);

// 2. Simulate the /api/csrf-token endpoint call
console.log('\n2. Simulating /api/csrf-token endpoint call...');
console.log(`[getCSRFToken] Request method: GET`);
console.log(`[getCSRFToken] Request path: /api/csrf-token`);
console.log(`[getCSRFToken] Request headers: {"x-session-id": "${sessionId}"}`);

// Normalize session ID to lowercase
const normalizedSessionId = sessionId.toLowerCase();
console.log(`[getCSRFToken] Generating CSRF token for session ${normalizedSessionId} (normalized from ${sessionId})`);

const csrfToken = generateCSRFToken(normalizedSessionId);
console.log(`[getCSRFToken] Generated CSRF token: ${csrfToken}`);

// 3. Simulate the POST /api/posts endpoint call
console.log('\n3. Simulating POST /api/posts endpoint call...');
console.log(`[csrfProtection] Request method: POST`);
console.log(`[csrfProtection] Request path: /api/posts`);
console.log(`[csrfProtection] Request headers: {"x-session-id": "${sessionId}", "x-csrf-token": "${csrfToken}"}`);

// Normalize session ID to lowercase
const normalizedSessionId2 = sessionId.toLowerCase();
console.log(`[csrfProtection] Verifying CSRF token for session ${normalizedSessionId2} (normalized from ${sessionId})`);
console.log(`[csrfProtection] Session ID from request: ${normalizedSessionId2}`);
console.log(`[csrfProtection] CSRF token from request: ${csrfToken}`);

const isValid = verifyCSRFToken(normalizedSessionId2, csrfToken);
console.log(`[csrfProtection] CSRF validation result: ${isValid ? 'successful' : 'failed'}`);

if (isValid) {
  console.log('\n✅ CSRF validation successful - post creation should work');
} else {
  console.log('\n❌ CSRF validation failed - post creation will fail');
}

console.log('\n=== Test Complete ===');