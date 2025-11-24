const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
require('dotenv').config();

async function testImageUpload() {
  console.log('🧪 Testing Pinata image upload...');

  // Create a simple 1x1 PNG image (smallest valid PNG)
  const pngBuffer = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
    0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,
    0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
    0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
    0x42, 0x60, 0x82
  ]);

  console.log(`📊 Image size: ${pngBuffer.length} bytes (${(pngBuffer.length / 1024).toFixed(2)} KB)`);

  const formData = new FormData();
  formData.append('file', pngBuffer, {
    filename: 'test-image.png',
    contentType: 'image/png'
  });

  formData.append('pinataMetadata', JSON.stringify({
    name: 'test-image-upload',
    keyvalues: {
      description: 'Test image upload from LinkDAO',
      tags: 'test,image',
      mimeType: 'image/png'
    }
  }));

  formData.append('pinataOptions', JSON.stringify({
    cidVersion: 1
  }));

  try {
    console.log('📤 Uploading image to Pinata...');

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
    console.log('MIME Type:', response.data.MimeType);
    console.log('\n🌐 You can view the image at:');
    console.log(`   https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`);

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
testImageUpload()
  .then(() => {
    console.log('\n✅ Image upload test passed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Image upload test failed:', error.message);
    process.exit(1);
  });
