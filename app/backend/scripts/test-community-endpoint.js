const axios = require('axios');

async function testCommunityEndpoint() {
    const communityId = '1174a923-f8a9-4898-9e66-375056794a0b';
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:10000';
    const url = `${backendUrl}/api/communities/${communityId}`;

    console.log(`Testing endpoint: ${url}`);

    try {
        const response = await axios.get(url);
        console.log('✅ Success! Status:', response.status);
        console.log('Response data:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.log('❌ Error! Status:', error.response?.status);
        console.log('Error data:', JSON.stringify(error.response?.data, null, 2));
        console.log('Error message:', error.message);
    }
}

testCommunityEndpoint();
