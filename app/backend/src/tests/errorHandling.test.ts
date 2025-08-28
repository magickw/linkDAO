import request from 'supertest';
import app from '../index';
import { generateToken } from '../middleware/authMiddleware';

// Mock the indexer service to prevent it from running during tests
jest.mock('../services/indexerService', () => {
  return {
    IndexerService: jest.fn().mockImplementation(() => {
      return {
        start: jest.fn().mockResolvedValue(undefined),
        stop: jest.fn().mockResolvedValue(undefined)
      };
    })
  };
});

// Mock the WebSocket server
jest.mock('socket.io', () => {
  return {
    Server: jest.fn().mockImplementation(() => {
      return {
        on: jest.fn(),
        close: jest.fn()
      };
    })
  };
});

describe('Error Handling', () => {
  const testAddress = '0x1234567890123456789012345678901234567890';
  const testHandle = 'testuser';

  // Increase timeout for all tests
  jest.setTimeout(10000);

  it('should return 404 for non-existent profile', async () => {
    const response = await request(app)
      .get('/api/profiles/non-existent-id')
      .expect(404);

    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('error', 'Profile not found');
  });

  it('should return 400 for duplicate profile creation', async () => {
    // Register a user first
    await request(app)
      .post('/api/auth/register')
      .send({
        address: testAddress,
        handle: testHandle
      })
      .expect(201);

    // Try to register the same user again
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        address: testAddress,
        handle: testHandle
      })
      .expect(400);

    expect(response.body).toHaveProperty('success', false);
    expect(response.body).toHaveProperty('error', 'User profile already exists for this address');
  });

  it('should return 404 for non-existent route', async () => {
    const response = await request(app)
      .get('/api/non-existent-route')
      .expect(404);

    expect(response.body).toHaveProperty('success', false);
    expect(response.body.error).toContain('Not found');
  });
});