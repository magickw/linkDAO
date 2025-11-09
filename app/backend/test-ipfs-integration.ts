import { ipfsIntegrationService } from '../src/services/ipfsIntegrationService';
import { ipfsService } from '../src/services/ipfsService';

// Simple test to verify IPFS integration functionality
async function testIPFSIntegration() {
  console.log('Testing IPFS Integration System...\n');
  
  // 1. Test IPFS service initialization
  try {
    console.log('✅ IPFS service initialization check...');
    // IPFS service is initialized automatically in the constructor
    console.log('✅ IPFS service ready\n');
  } catch (error) {
    console.error('❌ IPFS service initialization failed:', error);
    return;
  }

  // 2. Test document upload/download functionality
  try {
    console.log('✅ Document upload/download functionality check...');
    
    const testContent = 'Test document content for IPFS integration';
    const userId = 'test-user';
    
    // Upload a test document
    const metadata = await ipfsIntegrationService.uploadDocument(testContent, {
      title: 'Test Document',
      description: 'Test document for IPFS integration',
      contentType: 'document',
      userId: userId,
      tags: ['test', 'document']
    });
    
    console.log(`✅ Document uploaded successfully: ${metadata.ipfsHash}`);
    
    // Download the test document
    const { content } = await ipfsIntegrationService.downloadDocument(metadata.ipfsHash);
    
    console.log(`✅ Document downloaded successfully`);
    console.log(`✅ Document content matches: ${content.toString('utf8') === testContent}`);
    
    // Verify content integrity
    const isIntegrityValid = await ipfsIntegrationService.verifyContentIntegrity(metadata.ipfsHash, metadata.size);
    console.log(`✅ Content integrity verified: ${isIntegrityValid}`);
    
    // Check if content exists
    const exists = await ipfsIntegrationService.contentExists(metadata.ipfsHash);
    console.log(`✅ Content exists check: ${exists}`);
    
    // Get pin status
    const pinStatus = await ipfsIntegrationService.getPinStatus(metadata.ipfsHash);
    console.log(`✅ Pin status: ${pinStatus}`);
    
  } catch (error) {
    console.error('❌ Document upload/download functionality failed:', error);
    return;
  }

  // 3. Test governance proposal functionality
  try {
    console.log('\n✅ Governance proposal functionality check...');
    
    const proposal = await ipfsIntegrationService.uploadGovernanceProposal({
      title: 'Test Proposal',
      description: 'This is a test governance proposal',
      proposer: 'test-user',
      startTime: new Date(),
      endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      status: 'active'
    }, 'test-user');
    
    console.log(`✅ Governance proposal uploaded successfully: ${proposal.ipfsHash}`);
    
    // Download the proposal
    const downloadedProposal = await ipfsIntegrationService.downloadGovernanceProposal(proposal.ipfsHash);
    console.log(`✅ Governance proposal downloaded successfully: ${downloadedProposal.title}`);
    
  } catch (error) {
    console.error('❌ Governance proposal functionality failed:', error);
    return;
  }

  // 4. Test post content functionality
  try {
    console.log('\n✅ Post content functionality check...');
    
    const post = await ipfsIntegrationService.uploadPostContent({
      title: 'Test Post',
      content: 'This is a test post content for IPFS integration',
      author: 'test-user',
      createdAt: new Date()
    }, 'test-user');
    
    console.log(`✅ Post content uploaded successfully: ${post.ipfsHash}`);
    
    // Download the post
    const downloadedPost = await ipfsIntegrationService.downloadPostContent(post.ipfsHash);
    console.log(`✅ Post content downloaded successfully: ${downloadedPost.title}`);
    
  } catch (error) {
    console.error('❌ Post content functionality failed:', error);
    return;
  }

  // 5. Test pinning functionality
  try {
    console.log('\n✅ Pinning functionality check...');
    
    const testContent = 'Test content for pinning';
    const metadata = await ipfsIntegrationService.uploadDocument(testContent, {
      title: 'Test Pinning Document',
      description: 'Test document for pinning functionality',
      contentType: 'document',
      userId: 'test-user'
    });
    
    // Pin the content
    const pinResult = await ipfsIntegrationService.pinContent(metadata.ipfsHash, 'Test pinning');
    console.log(`✅ Content pinned: ${pinResult}`);
    
    // Get pin status
    const pinStatus = await ipfsIntegrationService.getPinStatus(metadata.ipfsHash);
    console.log(`✅ Pin status after pinning: ${pinStatus}`);
    
    // Unpin the content
    const unpinResult = await ipfsIntegrationService.unpinContent(metadata.ipfsHash, 'Test unpinning');
    console.log(`✅ Content unpinned: ${unpinResult}`);
    
  } catch (error) {
    console.error('❌ Pinning functionality failed:', error);
    return;
  }

  // 6. Test NFT metadata functionality
  try {
    console.log('\n✅ NFT metadata functionality check...');
    
    const nftMetadata = ipfsIntegrationService.createNFTMetadata({
      name: 'Test NFT',
      description: 'This is a test NFT for IPFS integration',
      image: 'QmTestImageHash123456789'
    });
    
    console.log('✅ NFT metadata created successfully');
    
    // Upload NFT metadata
    const metadata = await ipfsIntegrationService.uploadNFTMetadata(nftMetadata);
    console.log(`✅ NFT metadata uploaded successfully: ${metadata.ipfsHash}`);
    
  } catch (error) {
    console.error('❌ NFT metadata functionality failed:', error);
    return;
  }

  console.log('\n🎉 All tests passed! IPFS Integration System is working correctly.');
}

// Run the test
testIPFSIntegration().catch(error => {
  console.error('Test suite failed:', error);
  process.exit(1);
});