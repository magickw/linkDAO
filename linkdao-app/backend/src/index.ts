import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import userProfileRoutes from './routes/userProfileRoutes';
import postRoutes from './routes/postRoutes';
import followRoutes from './routes/followRoutes';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'LinkDAO Backend API' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/profiles', userProfileRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/follow', followRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`LinkDAO backend server running on port ${PORT}`);
});

export default app;