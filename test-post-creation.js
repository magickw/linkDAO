require('dotenv').config();

async function testPostCreation() {
  try {
    const response = await fetch('https://api.linkdao.io/api/quick-posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token'
      },
      body: JSON.stringify({
        content: 'Test post for debugging'
      })
    });

    const text = await response.text();
    console.log('Status:', response.status);
    console.log('Response:', text);
    
    if (response.status === 500) {
      console.log('500 error - this suggests a server-side issue, likely the schema problem');
    }
  } catch (error) {
    console.error('Network error:', error);
  }
}

testPostCreation();