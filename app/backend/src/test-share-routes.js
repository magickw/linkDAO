/**
 * Minimal test server to verify share URL routes work
 */

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 10000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Test server is running',
    data: null
  });
});

// Mock community post share route
app.get('/cp/:shareId', (req, res) => {
  const { shareId } = req.params;
  console.log(`[Test Server] Received request for shareId: ${shareId}`);
  
  // Mock response for testing
  const mockResponse = {
    success: true,
    data: {
      type: 'community_post',
      post: {
        id: 'test-post-123',
        shareId: shareId,
        title: 'Test Community Post',
        content: 'This is a test community post to verify the share URL functionality.',
        communityId: 'test-community',
        communityName: 'Test Community',
        communitySlug: 'test-community',
        authorHandle: 'testuser',
        authorName: 'Test User',
        createdAt: new Date().toISOString()
      },
      canonicalUrl: `/communities/test-community/posts/${shareId}`,
      shareUrl: `/cp/${shareId}`,
      owner: {
        type: 'user',
        id: 'test-user'
      }
    }
  };
  
  console.log(`[Test Server] Returning mock response for shareId: ${shareId}`);
  res.json(mockResponse);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Test server running on port ${PORT}`);
  console.log(`📡 Test community post share URLs at: http://localhost:${PORT}/cp/:shareId`);
  console.log(`💚 Health check at: http://localhost:${PORT}/api/health`);
});