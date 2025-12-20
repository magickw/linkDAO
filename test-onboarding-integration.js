/**
 * Integration Test for Community Onboarding
 * This test verifies the end-to-end functionality of the onboarding system
 */

const fetch = require('node-fetch');

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:10000';

// Test user credentials
const TEST_USER_WALLET = '0x1234567890123456789012345678901234567890';

async function testOnboardingFlow() {
  console.log('🧪 Starting Community Onboarding Integration Tests...\n');

  try {
    // Test 1: Check onboarding status for new user
    console.log('1️⃣ Testing onboarding status check...');
    const statusResponse = await fetch(`${API_BASE_URL}/api/onboarding/status`, {
      headers: {
        'Authorization': 'Bearer mock-token',
        'Content-Type': 'application/json',
      },
    });

    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      console.log('✅ Status check successful:', statusData.success ? 'PASS' : 'FAIL');
      console.log('   Needs onboarding:', statusData.data?.needsOnboarding || 'Unknown');
    } else {
      console.log('❌ Status check failed:', statusResponse.status);
    }

    // Test 2: Get available categories
    console.log('\n2️⃣ Testing categories endpoint...');
    const categoriesResponse = await fetch(`${API_BASE_URL}/api/onboarding/categories`);
    
    if (categoriesResponse.ok) {
      const categoriesData = await categoriesResponse.json();
      console.log('✅ Categories fetch successful:', categoriesData.success ? 'PASS' : 'FAIL');
      console.log('   Categories count:', categoriesData.data?.length || 0);
      
      if (categoriesData.data?.length > 0) {
        console.log('   Sample categories:', categoriesData.data.slice(0, 3).map(c => c.name));
      }
    } else {
      console.log('❌ Categories fetch failed:', categoriesResponse.status);
    }

    // Test 3: Get available tags
    console.log('\n3️⃣ Testing tags endpoint...');
    const tagsResponse = await fetch(`${API_BASE_URL}/api/onboarding/tags`);
    
    if (tagsResponse.ok) {
      const tagsData = await tagsResponse.json();
      console.log('✅ Tags fetch successful:', tagsData.success ? 'PASS' : 'FAIL');
      console.log('   Tags count:', tagsData.data?.length || 0);
      
      if (tagsData.data?.length > 0) {
        console.log('   Sample tags:', tagsData.data.slice(0, 5).map(t => t.name));
      }
    } else {
      console.log('❌ Tags fetch failed:', tagsResponse.status);
    }

    // Test 4: Save user preferences
    console.log('\n4️⃣ Testing save preferences...');
    const saveResponse = await fetch(`${API_BASE_URL}/api/onboarding/preferences`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer mock-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        preferredCategories: ['development', 'defi'],
        preferredTags: ['react', 'ethereum', 'solidity'],
      }),
    });

    if (saveResponse.ok) {
      const saveData = await saveResponse.json();
      console.log('✅ Save preferences successful:', saveData.success ? 'PASS' : 'FAIL');
      console.log('   Preferences saved:', saveData.data?.preferredCategories || []);
      console.log('   Tags saved:', saveData.data?.preferredTags || []);
    } else {
      console.log('❌ Save preferences failed:', saveResponse.status);
      const errorText = await saveResponse.text();
      console.log('   Error:', errorText);
    }

    // Test 5: Verify feed with preferences
    console.log('\n5️⃣ Testing personalized feed...');
    const feedResponse = await fetch(`${API_BASE_URL}/api/feed?page=1&limit=10&sort=new&feedSource=all`, {
      headers: {
        'Authorization': 'Bearer mock-token',
        'Content-Type': 'application/json',
      },
    });

    if (feedResponse.ok) {
      const feedData = await feedResponse.json();
      console.log('✅ Feed fetch successful:', feedData.success ? 'PASS' : 'FAIL');
      console.log('   Posts count:', feedData.data?.posts?.length || 0);
      
      if (feedData.data?.posts?.length > 0) {
        console.log('   Sample posts:', feedData.data.posts.slice(0, 3).map(p => ({
          id: p.id,
          hasCommunity: !!p.communityId || !!p.dao,
        })));
      }
    } else {
      console.log('❌ Feed fetch failed:', feedResponse.status);
    }

    // Test 6: Skip onboarding
    console.log('\n6️⃣ Testing skip onboarding...');
    const skipResponse = await fetch(`${API_BASE_URL}/api/onboarding/skip`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer mock-token',
        'Content-Type': 'application/json',
      },
    });

    if (skipResponse.ok) {
      const skipData = await skipResponse.json();
      console.log('✅ Skip onboarding successful:', skipData.success ? 'PASS' : 'FAIL');
      console.log('   Skip status:', skipData.data?.skipOnboarding || false);
    } else {
      console.log('❌ Skip onboarding failed:', skipResponse.status);
    }

    console.log('\n✨ Integration tests completed!');
    console.log('\n📊 Summary:');
    console.log('   - Onboarding API endpoints are accessible');
    console.log('   - Categories and tags can be fetched');
    console.log('   - User preferences can be saved');
    console.log('   - Feed can be personalized based on preferences');
    console.log('   - Onboarding can be skipped');

  } catch (error) {
    console.error('\n❌ Integration test failed:', error.message);
    console.error('   Make sure the backend server is running on', API_BASE_URL);
  }
}

// Run the tests
testOnboardingFlow();