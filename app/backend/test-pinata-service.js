const axios = require('axios');
const FormData = require('form-data');

// Test Pinata API connection
async function testPinataConnection() {
    console.log('🧪 Testing Pinata IPFS Service...\n');

    const PINATA_API_KEY = process.env.PINATA_API_KEY || '4185eb9caf5e9dd141de';
    const PINATA_API_KEY_SECRET = process.env.PINATA_API_KEY_SECRET || '5c3cb743b67cf1815abdff75516b73302b5592626cacf83cd05de5f7eaabca77';

    // Test 1: Check authentication
    console.log('Test 1: Checking Pinata authentication...');
    try {
        const authResponse = await axios.get('https://api.pinata.cloud/data/testAuthentication', {
            headers: {
                'pinata_api_key': PINATA_API_KEY,
                'pinata_secret_api_key': PINATA_API_KEY_SECRET
            }
        });
        console.log('✅ Authentication successful:', authResponse.data);
    } catch (error) {
        console.error('❌ Authentication failed:', error.response?.data || error.message);
        return;
    }

    // Test 2: Upload a small test file
    console.log('\nTest 2: Uploading test file to Pinata...');
    try {
        const formData = new FormData();
        const testContent = Buffer.from('Hello from LinkDAO! Test upload at ' + new Date().toISOString());

        formData.append('file', testContent, {
            filename: `test-${Date.now()}.txt`,
            contentType: 'text/plain'
        });

        const pinataMetadata = {
            name: `test-upload-${Date.now()}`,
            keyvalues: {
                description: 'Test upload from LinkDAO',
                tags: 'test',
                mimeType: 'text/plain'
            }
        };
        formData.append('pinataMetadata', JSON.stringify(pinataMetadata));

        const pinataOptions = {
            cidVersion: 1
        };
        formData.append('pinataOptions', JSON.stringify(pinataOptions));

        const uploadResponse = await axios.post(
            'https://api.pinata.cloud/pinning/pinFileToIPFS',
            formData,
            {
                headers: {
                    ...formData.getHeaders(),
                    'pinata_api_key': PINATA_API_KEY,
                    'pinata_secret_api_key': PINATA_API_KEY_SECRET
                },
                maxBodyLength: Infinity,
                maxContentLength: Infinity
            }
        );

        console.log('✅ Upload successful!');
        console.log('   IPFS Hash:', uploadResponse.data.IpfsHash);
        console.log('   Size:', uploadResponse.data.PinSize, 'bytes');
        console.log('   Timestamp:', uploadResponse.data.Timestamp);
        console.log('   Gateway URL: https://gateway.pinata.cloud/ipfs/' + uploadResponse.data.IpfsHash);

        // Test 3: Verify the file can be accessed
        console.log('\nTest 3: Verifying file accessibility...');
        const ipfsHash = uploadResponse.data.IpfsHash;
        const gatewayUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;

        const downloadResponse = await axios.get(gatewayUrl, {
            timeout: 10000
        });

        console.log('✅ File accessible via gateway');
        console.log('   Content:', downloadResponse.data);

        // Test 4: Check pinned files list
        console.log('\nTest 4: Checking pinned files...');
        const pinListResponse = await axios.get('https://api.pinata.cloud/data/pinList?status=pinned&pageLimit=5', {
            headers: {
                'pinata_api_key': PINATA_API_KEY,
                'pinata_secret_api_key': PINATA_API_KEY_SECRET
            }
        });

        console.log('✅ Pin list retrieved');
        console.log('   Total pins:', pinListResponse.data.count);
        console.log('   Recent pins:', pinListResponse.data.rows.length);

        console.log('\n🎉 All Pinata tests passed! Service is working correctly.');

    } catch (error) {
        console.error('❌ Test failed:', error.response?.data || error.message);
        if (error.response?.status === 413) {
            console.error('   Error: File too large for upload');
        }
    }
}

// Run the test
testPinataConnection().catch(console.error);
