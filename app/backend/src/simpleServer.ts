import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// CORS configuration
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['*'],
  exposedHeaders: ['*']
}));

app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Basic API routes
app.get('/api/posts/feed', (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 'mock-1',
        author: '0x1234567890123456789012345678901234567890',
        content: 'Welcome to LinkDAO! This is a mock post while the backend is starting up.',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        likes: 5,
        comments: 2,
        tags: ['welcome', 'mock'],
        communityId: null,
        isPublished: true,
        isDeleted: false
      },
      {
        id: 'mock-2',
        author: '0x0987654321098765432109876543210987654321',
        content: 'The backend service is currently being initialized. Please check back in a few minutes.',
        createdAt: new Date(Date.now() - 60000).toISOString(),
        updatedAt: new Date(Date.now() - 60000).toISOString(),
        likes: 3,
        comments: 1,
        tags: ['backend', 'status'],
        communityId: null,
        isPublished: true,
        isDeleted: false
      }
    ],
    message: 'Mock feed data'
  });
});

app.get('/api/posts', (req, res) => {
  res.json({
    success: true,
    data: [],
    message: 'Get all posts - mock response'
  });
});

app.get('/api/posts/:id', (req, res) => {
  const { id } = req.params;
  res.json({
    id,
    author: 'mock-author',
    content: 'This is a mock post response',
    createdAt: new Date().toISOString(),
    message: 'Post endpoint working - mock response'
  });
});

app.get('/api/posts/author/:author', (req, res) => {
  const { author } = req.params;
  res.json({
    success: true,
    data: [],
    message: `Posts by author ${author} - mock response`
  });
});

app.get('/api/posts/tag/:tag', (req, res) => {
  const { tag } = req.params;
  res.json({
    success: true,
    data: [],
    message: `Posts by tag ${tag} - mock response`
  });
});

app.post('/api/posts', (req, res) => {
  res.json({
    success: true,
    message: 'Create post endpoint working - mock response',
    data: { id: 'mock-post-id' }
  });
});

app.put('/api/posts/:id', (req, res) => {
  const { id } = req.params;
  res.json({
    success: true,
    message: `Update post ${id} - mock response`,
    data: { id }
  });
});

app.delete('/api/posts/:id', (req, res) => {
  const { id } = req.params;
  res.status(204).send();
});

// Community routes
app.get('/api/communities', (req, res) => {
  res.json({
    success: true,
    data: [],
    message: 'Get all communities - mock response'
  });
});

app.get('/api/communities/:id', (req, res) => {
  const { id } = req.params;
  res.json({
    id,
    name: 'Mock Community',
    description: 'This is a mock community',
    createdAt: new Date().toISOString(),
    message: 'Community endpoint working - mock response'
  });
});

// Profile routes
app.get('/api/profiles/:id', (req, res) => {
  const { id } = req.params;
  res.json({
    id,
    username: 'mock-user',
    bio: 'This is a mock profile',
    createdAt: new Date().toISOString(),
    message: 'Profile endpoint working - mock response'
  });
});

app.get('/api/profiles/address/:address', (req, res) => {
  const { address } = req.params;
  res.json({
    address,
    username: 'mock-user',
    bio: 'This is a mock profile',
    createdAt: new Date().toISOString(),
    message: 'Profile by address endpoint working - mock response'
  });
});

// Search routes
app.get('/api/search', (req, res) => {
  res.json({
    success: true,
    data: [],
    message: 'Search endpoint working - mock response'
  });
});

// Follow routes
app.get('/api/follow/followers/:address', (req, res) => {
  const { address } = req.params;
  res.json({
    success: true,
    data: [],
    message: `Followers for ${address} - mock response`
  });
});

app.get('/api/follow/following/:address', (req, res) => {
  const { address } = req.params;
  res.json({
    success: true,
    data: [],
    message: `Following for ${address} - mock response`
  });
});

// Catch all API routes
app.use('/api/*', (req, res) => {
  res.json({
    success: true,
    message: `API endpoint ${req.method} ${req.originalUrl} - mock response`,
    data: null
  });
});

// Error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', error);
  res.status(500).json({
    error: 'Internal Server Error',
    message: error.message,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
    timestamp: new Date().toISOString()
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 LinkDAO Simple Backend running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  console.log(`📡 API ready: http://localhost:${PORT}/`);
});

export default app;
