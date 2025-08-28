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

describe('Authentication API', () => {
  const testAddress = '0x1234567890123456789012345678901234567890';
  const testHandle = 'testuser';
  const testEns = 'testuser.eth';
  
  const secondAddress = '0x2345678901234567890123456789012345678901';
  const secondHandle = 'seconduser';

  // Set a longer timeout for tests
  jest.setTimeout(30000);

  it('should register a new user and return a token', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        address: testAddress,
        handle: testHandle,
        ens: testEns
      })
      .expect(201);

    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('token');
    expect(response.body.user).toHaveProperty('address', testAddress);
    expect(response.body.user).toHaveProperty('handle', testHandle);
  });

  it('should login an existing user and return a token', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        address: testAddress
      })
      .expect(200);

    expect(response.body).toHaveProperty('success', true);
    expect(response.body).toHaveProperty('token');
    expect(response.body.user).toHaveProperty('address', testAddress);
    expect(response.body.user).toHaveProperty('handle', testHandle);
  });

  it('should return 404 for non-existent user login', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        address: '0x0000000000000000000000000000000000000000'
      })
      .expect(404);

    expect(response.body).toHaveProperty('error');
  });

  it('should return 401 for requests without token', async () => {
    const response = await request(app)
      .post('/api/profiles')
      .send({
        address: testAddress,
        handle: 'anotheruser'
      })
      .expect(401);

    expect(response.body).toHaveProperty('error', 'Access token required');
  });

  it('should return 403 for requests with invalid token', async () => {
    const response = await request(app)
      .post('/api/profiles')
      .set('Authorization', 'Bearer invalidtoken')
      .send({
        address: testAddress,
        handle: 'anotheruser'
      })
      .expect(403);

    expect(response.body).toHaveProperty('error', 'Invalid or expired token');
  });

  it('should allow authenticated user to update their profile', async () => {
    // Register a second user
    const registerResponse = await request(app)
      .post('/api/auth/register')
      .send({
        address: secondAddress,
        handle: secondHandle
      })
      .expect(201);
    
    // Get the profile ID from the registration response
    const profileId = registerResponse.body.user.id;
    
    // Generate a valid token for the second user
    const token = generateToken(secondAddress);

    const response = await request(app)
      .put(`/api/profiles/${profileId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        handle: 'updateduser',
        ens: 'updateduser.eth'
      })
      .expect(200);

    expect(response.body).toHaveProperty('address', secondAddress);
    expect(response.body).toHaveProperty('handle', 'updateduser');
  });
});