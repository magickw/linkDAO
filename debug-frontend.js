// Debug script to test frontend posting functionality
// Run this in the browser console on http://localhost:3000

console.log('=== LinkDAO Frontend Debug Script ===');

// Test 1: Check if backend is reachable
async function testBackendConnection() {
    console.log('Testing backend connection...');
    try {
        const response = await fetch('http://localhost:3002/health');
        const data = await response.json();
        console.log('✅ Backend is reachable:', data);
        return true;
    } catch (error) {
        console.error('❌ Backend connection failed:', error);
        return false;
    }
}

// Test 2: Check if posts API works
async function testPostsAPI() {
    console.log('Testing posts API...');
    try {
        const response = await fetch('http://localhost:3002/api/posts');
        const posts = await response.json();
        console.log(`✅ Posts API works, found ${posts.length} posts`);
        return true;
    } catch (error) {
        console.error('❌ Posts API failed:', error);
        return false;
    }
}

// Test 3: Test creating a post
async function testCreatePost() {
    console.log('Testing post creation...');
    const testPost = {
        author: '0x1234567890123456789012345678901234567890',
        content: 'Test post from frontend debug script',
        tags: ['debug', 'frontend', 'test']
    };
    
    try {
        const response = await fetch('http://localhost:3002/api/posts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testPost)
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ Post creation successful:', result);
            return true;
        } else {
            const error = await response.json();
            console.error('❌ Post creation failed:', error);
            return false;
        }
    } catch (error) {
        console.error('❌ Post creation network error:', error);
        return false;
    }
}

// Test 4: Check environment variables
function testEnvironmentVariables() {
    console.log('Checking environment variables...');
    
    // These should be available in the browser
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'Not set';
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'Not set';
    
    console.log('NEXT_PUBLIC_BACKEND_URL:', backendUrl);
    console.log('NEXT_PUBLIC_API_URL:', apiUrl);
    
    if (backendUrl.includes('localhost:3002')) {
        console.log('✅ Backend URL is correctly set for local development');
        return true;
    } else {
        console.log('❌ Backend URL is not set for local development');
        return false;
    }
}

// Run all tests
async function runAllTests() {
    console.log('Running all tests...\n');
    
    const results = {
        backend: await testBackendConnection(),
        postsAPI: await testPostsAPI(),
        createPost: await testCreatePost(),
        envVars: testEnvironmentVariables()
    };
    
    console.log('\n=== Test Results ===');
    Object.entries(results).forEach(([test, passed]) => {
        console.log(`${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASSED' : 'FAILED'}`);
    });
    
    const allPassed = Object.values(results).every(result => result);
    console.log(`\n${allPassed ? '🎉 All tests passed!' : '⚠️  Some tests failed'}`);
    
    return results;
}

// Export for manual testing
window.debugLinkDAO = {
    testBackendConnection,
    testPostsAPI,
    testCreatePost,
    testEnvironmentVariables,
    runAllTests
};

console.log('Debug functions available as window.debugLinkDAO');
console.log('Run window.debugLinkDAO.runAllTests() to test everything');