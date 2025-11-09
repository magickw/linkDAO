# IPFS Integration Documentation

## Overview

The IPFS (InterPlanetary File System) integration provides decentralized, permanent storage for governance proposals, post content, documents, and other content types that benefit from censorship resistance and permanence. This system ensures that important DAO content remains accessible regardless of central server availability.

## Key Features

1. **Permanent Storage**: Content-addressed storage ensures permanence
2. **Decentralization**: Distributed storage across IPFS network
3. **Censorship Resistance**: No single point of failure
4. **Content Integrity**: Cryptographic verification of stored content
5. **Governance Support**: Special handling for DAO proposals and voting
6. **Post Content Storage**: Permanent storage for social feed content
7. **NFT Metadata**: IPFS-based NFT metadata storage
8. **Pin Management**: Automated pinning for important content

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│   Application   │────│   IPFS Routes    │────│  IPFS Service    │
└─────────────────┘    └──────────────────┘    └──────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│   IPFS Node      │    │  Integration     │    │   Content        │
│   (Remote/Local) │    │   Service        │    │   Verification   │
└──────────────────┘    └──────────────────┘    └──────────────────┘
```

## Services

### 1. IPFS Service (`ipfsService.ts`)

Core IPFS functionality with file operations.

**Key Methods:**
- `uploadFile()` - Upload content to IPFS
- `uploadDirectory()` - Upload multiple files as a directory
- `downloadFile()` - Download content from IPFS
- `fileExists()` - Check if file exists on IPFS
- `pinFile()` - Pin content to ensure permanence
- `unpinFile()` - Unpin content
- `getFileMetadata()` - Get file metadata
- `getNodeInfo()` - Get IPFS node information
- `verifyFileIntegrity()` - Verify content integrity

### 2. IPFS Integration Service (`ipfsIntegrationService.ts`)

Application-specific IPFS integration with DAO use cases.

**Key Methods:**
- `uploadGovernanceProposal()` - Upload governance proposals
- `uploadPostContent()` - Upload social post content
- `uploadDocument()` - Upload general documents
- `downloadGovernanceProposal()` - Download proposals
- `downloadPostContent()` - Download post content
- `downloadDocument()` - Download documents
- `pinContent()` - Pin important content
- `unpinContent()` - Unpin content
- `createNFTMetadata()` - Create standard NFT metadata
- `uploadNFTMetadata()` - Upload NFT metadata to IPFS

### 3. IPFS Routes (`ipfsRoutes.ts`)

REST API endpoints for IPFS operations.

**Endpoints:**
- `POST /api/ipfs/upload` - Upload file
- `POST /api/ipfs/upload-multiple` - Upload multiple files
- `GET /api/ipfs/:hash` - Download file
- `GET /api/ipfs/metadata/:hash` - Get metadata
- `POST /api/ipfs/pin/:hash` - Pin content
- `DELETE /api/ipfs/unpin/:hash` - Unpin content
- `GET /api/ipfs/exists/:hash` - Check existence
- `GET /api/ipfs/pin-status/:hash` - Get pin status
- `POST /api/ipfs/governance-proposal` - Upload proposal
- `POST /api/ipfs/post-content` - Upload post content
- `GET /api/ipfs/governance-proposal/:hash` - Download proposal
- `GET /api/ipfs/post-content/:hash` - Download post content
- `GET /api/ipfs/health` - Health check

## Configuration

### Environment Variables

```bash
# IPFS API configuration
IPFS_API_URL=http://localhost:5001
IPFS_GATEWAY_URL=https://ipfs.io/ipfs

# IPFS project credentials (if using hosted service like Pinata)
IPFS_PROJECT_ID=your-project-id
IPFS_PROJECT_SECRET=your-project-secret

# Default pinning behavior
IPFS_DEFAULT_PINNING=true
```

## Usage Examples

### 1. Uploading a Document

```javascript
const content = 'Document content here';
const metadata = await ipfsIntegrationService.uploadDocument(content, {
  title: 'My Document',
  description: 'A sample document',
  contentType: 'document',
  userId: 'user123',
  tags: ['important', 'legal']
});
```

### 2. Uploading a Governance Proposal

```javascript
const proposal = await ipfsIntegrationService.uploadGovernanceProposal({
  title: 'New Treasury Proposal',
  description: 'Proposal to allocate treasury funds...',
  proposer: '0x1234...',
  startTime: new Date(),
  endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  status: 'active'
}, 'user123');
```

### 3. Uploading Post Content

```javascript
const post = await ipfsIntegrationService.uploadPostContent({
  title: 'My Post',
  content: 'Post content here...',
  author: 'author123',
  communityId: 'community456',
  tags: ['discussion', 'decentralization'],
  createdAt: new Date()
}, 'user123');
```

### 4. Pinning Important Content

```javascript
const success = await ipfsIntegrationService.pinContent('QmHash123...', 'Governance proposal');
```

## API Endpoints

### Upload File
```
POST /api/ipfs/upload
Body: multipart/form-data
  - file: <file content>
  - pin: true/false
  - name: <file name>
  - description: <description>
  - tags: <comma-separated tags>
  - contentType: <content type>
```

### Download File
```
GET /api/ipfs/{hash}
```

### Upload Governance Proposal
```
POST /api/ipfs/governance-proposal
Body: {
  "title": "Proposal Title",
  "description": "Proposal Description",
  "proposer": "Proposer Address",
  "startTime": "2023-01-01T00:00:00Z",
  "endTime": "2023-01-08T00:00:00Z",
  "status": "active"
}
```

### Get Pin Status
```
GET /api/ipfs/pin-status/{hash}
```

## Content Types Supported

### 1. Governance Content
- Proposals
- Voting records
- DAO documentation
- Meeting minutes

### 2. Social Content
- Posts and comments
- User-generated content
- Community discussions

### 3. Documents
- Legal documents
- Whitepapers
- Research reports
- Meeting notes

### 4. NFT Metadata
- Token metadata
- Collection information
- Asset properties

### 5. Media Content
- Images (with IPFS links)
- Videos (with IPFS links)
- Audio files

## Storage Strategy

### Content Permanence
- Important governance content is automatically pinned
- Core DAO documents are pinned for permanence
- User content is pinned based on importance metrics

### Pin Management
- Automatic pinning for governance proposals
- Manual pinning for important content
- Periodic pin status checks
- Garbage collection for unpinned content

### Content Verification
- Cryptographic integrity checks
- Size verification against original
- Availability testing

## Integration with LinkDAO

The IPFS system integrates seamlessly with existing LinkDAO infrastructure:

1. **Governance System**: Proposals stored permanently on IPFS
2. **Social Platform**: Post content stored with permanence
3. **NFT Marketplace**: Metadata stored on IPFS
4. **Document Management**: Legal and compliance docs
5. **Audit Trail**: Immutable records for transparency

## Benefits of IPFS Integration

### Permanence
- Content remains accessible even if central servers fail
- Cryptographic content addressing prevents tampering
- Distributed storage ensures longevity

### Decentralization
- Aligns with Web3 principles
- Reduces dependence on centralized infrastructure
- Censorship-resistant content storage

### Transparency
- Immutable records for governance
- Public verifiability of content
- Transparent DAO operations

### Cost Efficiency
- Distributed storage reduces hosting costs
- Community can contribute to content pinning
- No single point of failure reduces maintenance

## Security Considerations

### Content Validation
- All content is validated before IPFS upload
- Size limits prevent abuse
- Format validation for supported types

### Privacy
- Sensitive content should use encryption before upload
- Public IPFS should only contain appropriate content
- User-specific content should use private alternatives

### Pinning Security
- Pinning operations are logged
- Access controls for pin management
- Regular audits of pinned content

## Monitoring and Maintenance

### Health Checks
- Regular IPFS node connectivity checks
- Pin status monitoring
- Content availability verification

### Performance Monitoring
- Upload/download speed tracking
- Node response times
- Availability metrics

### Maintenance Tasks
- Regular pin status verification
- Content integrity checks
- Node health monitoring

## Troubleshooting

### Common Issues

1. **IPFS Node Unreachable**:
   - Check IPFS_API_URL configuration
   - Verify IPFS node is running
   - Check network connectivity

2. **Upload Failures**:
   - Verify file size limits
   - Check network connectivity
   - Validate content format

3. **Pin Operation Failures**:
   - Check available storage space
   - Verify IPFS node status
   - Review pinning quotas

### Logs and Diagnostics
- All IPFS operations are logged
- Error details include context for debugging
- Performance metrics available for analysis

## Future Enhancements

### Advanced Features
- IPFS Cluster integration for pinning coordination
- Content addressing verification
- Advanced pinning strategies
- IPFS pubsub for real-time updates

### Performance Improvements
- IPFS gateway optimization
- Content caching strategies
- Bandwidth efficient transfers
- Parallel upload capabilities

### Security Enhancements
- Encrypted content uploads
- Private IPFS networks
- Access-controlled content
- Advanced content filtering

## Best Practices

### Content Upload
- Use appropriate content types
- Provide meaningful metadata
- Verify content before upload
- Use appropriate pinning strategies

### Pin Management
- Pin only essential content
- Regular pin status checks
- Automated pin lifecycle management
- Cost-aware pinning decisions

### Integration
- Handle IPFS failures gracefully
- Implement fallback mechanisms
- Cache frequently accessed content
- Monitor IPFS performance metrics