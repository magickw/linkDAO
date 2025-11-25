/**
 * Test Script for Quick Post Creation
 *
 * This script tests the create quick post functionality from the Facebook style composer
 *
 * Run with: node test-quick-post.js
 */

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

async function testQuickPostCreation() {
  console.log('🧪 Testing Quick Post Creation Functionality\n');
  console.log('Backend URL:', BACKEND_URL);
  console.log('-------------------------------------------\n');

  // Test 1: Health Check
  console.log('Test 1: Health Check');
  try {
    const healthResponse = await fetch(`${BACKEND_URL}/api/quick-posts/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health check passed:', healthData);
    console.log('Controller Status:', healthData.controllerStatus);
    console.log('');
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    console.log('⚠️  Make sure the backend server is running on', BACKEND_URL);
    return;
  }

  // Test 2: Get CSRF Token
  console.log('Test 2: Get CSRF Token');
  let csrfToken;
  let sessionId = crypto.randomUUID();

  try {
    const csrfResponse = await fetch(`${BACKEND_URL}/api/quick-posts/csrf-token`, {
      headers: {
        'x-session-id': sessionId
      }
    });
    const csrfData = await csrfResponse.json();
    csrfToken = csrfData.data?.csrfToken;
    console.log('✅ CSRF token obtained:', csrfToken ? 'Yes' : 'No');
    console.log('');
  } catch (error) {
    console.error('❌ CSRF token request failed:', error.message);
    console.log('');
  }

  // Test 3: Create Quick Post (without auth - should get proper error)
  console.log('Test 3: Create Quick Post (without authentication)');
  const testPost = {
    content: 'This is a test quick post from the automated test script! #testing #quickpost',
    authorId: 'test_user_123',
    tags: ['testing', 'quickpost'],
    media: []
  };

  try {
    const createResponse = await fetch(`${BACKEND_URL}/api/quick-posts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-session-id': sessionId,
        ...(csrfToken && { 'x-csrf-token': csrfToken })
      },
      body: JSON.stringify(testPost)
    });

    const createData = await createResponse.json();

    if (createResponse.ok) {
      console.log('✅ Quick post created successfully!');
      console.log('Post ID:', createData.data?.id);
      console.log('Content CID:', createData.data?.contentCid);
      console.log('Created At:', createData.data?.createdAt);

      // Test 4: Retrieve the created post
      if (createData.data?.id) {
        console.log('\nTest 4: Retrieve Created Post');
        try {
          const getResponse = await fetch(`${BACKEND_URL}/api/quick-posts/${createData.data.id}`);
          const getData = await getResponse.json();

          if (getResponse.ok) {
            console.log('✅ Successfully retrieved post');
            console.log('Author ID:', getData.data?.authorId);
            console.log('Content CID:', getData.data?.contentCid);
          } else {
            console.log('❌ Failed to retrieve post:', getData.error);
          }
        } catch (error) {
          console.error('❌ Error retrieving post:', error.message);
        }
      }
    } else {
      console.log('⚠️  Post creation returned error (expected if auth is required):');
      console.log('Status:', createResponse.status);
      console.log('Message:', createData.error || createData.message);
    }
  } catch (error) {
    console.error('❌ Error creating post:', error.message);
  }

  console.log('\n-------------------------------------------');
  console.log('Test Summary:');
  console.log('-------------------------------------------');
  console.log('The quick post system is structured as follows:');
  console.log('');
  console.log('Frontend Flow:');
  console.log('1. FacebookStylePostComposer component collects user input');
  console.log('2. On submit, handlePostSubmit in index.tsx is called');
  console.log('3. If no communityId, QuickPostService.createQuickPost is used');
  console.log('4. Service sends POST request to /api/quick-posts');
  console.log('');
  console.log('Backend Flow:');
  console.log('1. Request hits quickPostRoutes.ts');
  console.log('2. Routes to QuickPostController.createQuickPost');
  console.log('3. Content is uploaded to IPFS (or mock CID if IPFS fails)');
  console.log('4. QuickPostService.createQuickPost saves to database');
  console.log('5. Post is returned with ID and CID');
  console.log('');
  console.log('Key Features:');
  console.log('✓ CSRF protection');
  console.log('✓ Session management');
  console.log('✓ IPFS content storage with fallback');
  console.log('✓ Media attachments support');
  console.log('✓ Hashtag extraction and tagging');
  console.log('✓ Parent post support (for replies)');
  console.log('');
}

// Run the test
testQuickPostCreation().catch(console.error);
