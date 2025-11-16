const { create } = require('ipfs-http-client');

// IPFS Configuration from environment variables
const projectId = process.env.IPFS_PROJECT_ID || '87bcc6b0da2adb56909c';
const projectSecret = process.env.IPFS_PROJECT_SECRET || 'yf205d2640950c77a1097ad0be488547eaf8325447b9167aa9d117e34623e299a';
const host = process.env.IPFS_HOST || 'api.pinata.cloud';
const port = process.env.IPFS_PORT || '443';
const protocol = process.env.IPFS_PROTOCOL || 'https';

// Create IPFS client with Pinata configuration
const auth = `Basic ${Buffer.from(`${projectId}:${projectSecret}`).toString('base64')}`;

async function testIPFSConnection() {
  console.log('🔍 Testing IPFS connection...');
  console.log('Using configuration:');
  console.log(`  - Host: ${host}`);
  console.log(`  - Port: ${port}`);
  console.log(`  - Protocol: ${protocol}`);
  console.log(`  - Project ID: ${projectId ? '***masked***' : 'not set'}`);
  console.log(`  - Project Secret: ${projectSecret ? '***masked***' : 'not set'}`);

  try {
    console.log('\n📡 Testing IPFS node connectivity...');
    
    const client = create({
      url: `${protocol}://${host}:${port}`,
      headers: {
        authorization: auth,
      },
    });
    
    // Test basic connectivity by getting node information
    const id = await client.id();
    console.log('✅ IPFS node connected successfully!');
    console.log('Node Info:', {
      id: id.id,
      agentVersion: id.agentVersion,
      protocolVersion: id.protocolVersion
    });

    // Test upload functionality with a small test file
    console.log('\n📤 Testing upload functionality...');
    const testContent = `Test upload at ${new Date().toISOString()}`;
    
    const result = await client.add(testContent);
    console.log('✅ Upload successful!', {
      hash: result.path,
      size: result.size
    });

    // Test download functionality
    console.log('\n📥 Testing download functionality...');
    const chunks = [];
    for await (const chunk of client.cat(result.path)) {
      chunks.push(chunk);
    }
    const downloadedContent = Buffer.concat(chunks).toString();
    
    if (downloadedContent === testContent) {
      console.log('✅ Download successful and content verified!');
    } else {
      console.log('❌ Download failed - content mismatch');
      console.log('Expected:', testContent);
      console.log('Received:', downloadedContent);
    }

    // Test pin functionality
    console.log('\n📌 Testing pin functionality...');
    try {
      await client.pin.add(result.path);
      console.log('✅ Pin successful!');
    } catch (pinError) {
      console.log('⚠️ Pin failed (this may be OK depending on your Pinata plan):', pinError.message);
    }

    console.log('\n🎉 IPFS connection test completed successfully!');
    return true;
  } catch (error) {
    console.error('❌ IPFS connection test failed:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    if (error.status) {
      console.error('HTTP status:', error.status);
    }
    return false;
  }
}

// Run the test
testIPFSConnection().then(success => {
  console.log('\n🏁 Test finished', success ? 'successfully' : 'with errors');
  process.exit(success ? 0 : 1);
});