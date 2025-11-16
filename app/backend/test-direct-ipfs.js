import { create } from 'ipfs-http-client';

// IPFS Configuration from environment variables
const projectId = process.env.IPFS_PROJECT_ID || '87bcc6b0da2adb56909c';
const projectSecret = process.env.IPFS_PROJECT_SECRET || 'yf205d2640950c77a1097ad0be488547eaf8325447b9167aa9d117e34623e299a';
const host = process.env.IPFS_HOST || 'api.pinata.cloud';
const port = process.env.IPFS_PORT || '443';
const protocol = process.env.IPFS_PROTOCOL || 'https';

async function testIPFSConfig() {
  console.log('🔍 Testing IPFS direct configuration...');
  console.log('Using configuration:');
  console.log(`  - Host: ${host}`);
  console.log(`  - Port: ${port}`);
  console.log(`  - Protocol: ${protocol}`);
  console.log(`  - Project ID: ${projectId ? '***masked***' : 'not set'}`);
  console.log(`  - Project Secret: ${projectSecret ? '***masked***' : 'not set'}`);

  try {
    // Construct the API URL
    const apiUrl = `${protocol}://${host}:${port}`;
    console.log(`  - API URL: ${apiUrl}`);
    
    // Create auth header
    const auth = `Basic ${Buffer.from(`${projectId}:${projectSecret}`).toString('base64')}`;
    console.log('  - Auth header created');
    
    // Create IPFS client
    const client = create({
      url: apiUrl,
      headers: {
        authorization: auth,
      },
    });
    
    console.log('📡 Testing IPFS node info...');
    const id = await client.id();
    console.log('✅ IPFS node info retrieved successfully!');
    console.log('Node Info:', {
      id: id.id,
      agentVersion: id.agentVersion,
      protocolVersion: id.protocolVersion
    });
    
    return true;
  } catch (error) {
    console.error('❌ IPFS configuration test failed:', error.message);
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
testIPFSConfig().then(success => {
  console.log('\n🏁 Direct IPFS test finished', success ? 'successfully' : 'with errors');
  process.exit(success ? 0 : 1);
});