const axios = require('axios');
const FormData = require('form-data');
require('dotenv').config();

async function testPinataUpload() {
  console.log('🧪 Testing Pinata file upload...');

  // Create a simple test file
  const testContent = Buffer.from('Hello from LinkDAO! This is a test upload.');
  const formData = new FormData();

  formData.append('file', testContent, {
    filename: 'test-file.txt',
    contentType: 'text/plain'
  });

  formData.append('pinataMetadata', JSON.stringify({
    name: 'test-upload',
    keyvalues: {
      description: 'Test upload from LinkDAO backend',
      tags: 'test',
      mimeType: 'text/plain'
    }
  }));

  formData.append('pinataOptions', JSON.stringify({
    cidVersion: 1
  }));

  try {
    console.log('📤 Uploading to Pinata...');
    console.log('API Key:', process.env.PINATA_API_KEY ? '✅ Found' : '❌ Missing');
    console.log('API Secret:', process.env.PINATA_API_KEY_SECRET ? '✅ Found' : '❌ Missing');

    const headers = {
      ...formData.getHeaders()
    };

    if (process.env.PINATA_API_KEY && process.env.PINATA_API_KEY_SECRET) {
      headers['pinata_api_key'] = process.env.PINATA_API_KEY;
      headers['pinata_secret_api_key'] = process.env.PINATA_API_KEY_SECRET;
    }

    const response = await axios.post(
      'https://api.pinata.cloud/pinning/pinFileToIPFS',
      formData,
      {
        headers,
        maxBodyLength: Infinity,
        maxContentLength: Infinity
      }
    );

    console.log('✅ Upload successful!');
    console.log('IPFS Hash:', response.data.IpfsHash);
    console.log('Gateway URL:', `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`);
    console.log('Full response:', JSON.stringify(response.data, null, 2));

    return response.data;
  } catch (error) {
    console.error('❌ Upload failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

// Run the test
testPinataUpload()
  .then(() => {
    console.log('\n✅ Test passed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  });
