// Full test of CSRF implementation
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
    console.log(`Created new CSRF session for ID ${normalizedSessionId}`);
  } else {
    console.log(`Using existing CSRF session for ID ${normalizedSessionId}`);
  }
  
  const token = crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
  const hash = crypto.createHmac('sha256', session.secret).update(token).digest('hex');
  
  session.tokens.add(hash);
  console.log(`Generated CSRF token for session ${normalizedSessionId}: token=${token}, hash=${hash}`);
  
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
    console.log(`CSRF verification failed: No session found for ID ${normalizedSessionId}`);
    console.log(`Available sessions: ${Array.from(csrfStore.keys()).join(', ')}`);
    return false;
  }
  
  const hash = crypto.createHmac('sha256', session.secret).update(token).digest('hex');
  const isValid = session.tokens.has(hash);
  console.log(`CSRF verification for session ${normalizedSessionId}: token=${token}, hash=${hash}, isValid=${isValid}`);
  return isValid;
}

// Test the full flow
console.log('=== CSRF Full Flow Test ===');

// 1. Generate a session ID (simulating what uuidgen does)
const sessionId = '0EBAB858-6895-456D-B499-DD427809F52A';
console.log(`\n1. Generated session ID: ${sessionId}`);

// 2. Generate a CSRF token (simulating the /api/csrf-token endpoint)
console.log('\n2. Generating CSRF token...');
const csrfToken = generateCSRFToken(sessionId);
console.log(`Generated CSRF token: ${csrfToken}`);

// 3. Verify the token (simulating the POST /api/posts endpoint)
console.log('\n3. Verifying CSRF token...');
const isValid = verifyCSRFToken(sessionId, csrfToken);
console.log(`Token is valid: ${isValid}`);

// 4. Test with different case
console.log('\n4. Testing with different case...');
const upperSessionId = sessionId.toUpperCase();
console.log(`Upper case session ID: ${upperSessionId}`);
const isUpperValid = verifyCSRFToken(upperSessionId, csrfToken);
console.log(`Token is valid with upper case session ID: ${isUpperValid}`);

console.log('\n=== Test Complete ===');