/**
 * Authentication and Authorization Flow Tests
 * 
 * Comprehensive tests for authentication workflows including
 * wallet connection, session management, and authorization checks.
 */

import request from 'supertest';
import { Express } from 'express';
import { createTestApp } from '../utils/testApp';
import { testDataFactory } from '../fixtures/testDataFactory';
import jwt from 'jsonwebtoken';

describe('Authentication and Authorization Flows', () => {
  let app: Express;
  let testUser: any;
  let validToken: string;
  let expiredToken: string;

  beforeAll(async () => {
    app = await createTestApp();
    testUser = testDataFactory.createUser();
    
    // Create a valid token
    validToken = jwt.sign(
      { userId: testUser.id, walletAddress: testUser.walletAddress },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '1h' }
    );

    // Create an expired token
    expiredToken = jwt.sign(
      { userId: testUser.id, walletAddress: testUser.walletAddress },
      process.env.JWT_SECRET || 'test-secret',
      { expiresIn: '-1h' }
    );
  });

  describe('Wallet Authentication Flow', () => {
    describe('Complete Authentication Workflow', () => {
      it('should complete full wallet authentication flow', async () => {
        const walletAddress = testDataFactory.createUser().walletAddress;
        const signature = testDataFactory.createValidSignature();
        const message = 'Sign in to LinkDAO';

        // Step 1: Wallet connection request
        const authResponse = await request(app)
          .post('/api/auth/wallet-connect')
          .send({
            walletAddress,
            signature,
            message
          })
          .expect(200);

        expect(authResponse.body).toMatchObject({
          success: true,
          data: {
            token: expect.any(String),
            user: {
              id: expect.any(String),
              walletAddress,
              displayName: expect.any(String)
            },
            expiresIn: expect.any(Number)
          }
        });

        const { token } = authResponse.body.data;

        // Step 2: Use token to access protected resource
        const profileResponse = await request(app)
          .get('/api/auth/profile')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(profileResponse.body).toMatchObject({
          success: true,
          data: {
            id: expect.any(String),
            walletAddress,
            displayName: expect.any(String)
          }
        });

        // Step 3: Update profile using authenticated session
        const updateResponse = await request(app)
          .put('/api/auth/profile')
          .set('Authorization', `Bearer ${token}`)
          .send({
            displayName: 'Updated Name',
            bio: 'Updated bio'
          })
          .expect(200);

        expect(updateResponse.body).toMatchObject({
          success: true,
          data: {
            displayName: 'Updated Name',
            bio: 'Updated bio'
          }
        });

        // Step 4: Logout and invalidate session
        const logoutResponse = await request(app)
          .post('/api/auth/logout')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(logoutResponse.body).toMatchObject({
          success: true,
          data: {
            message: expect.stringContaining('logged out')
          }
        });

        // Step 5: Verify token is invalidated
        await request(app)
          .get('/api/auth/profile')
          .set('Authorization', `Bearer ${token}`)
          .expect(401);
      });

      it('should handle concurrent authentication requests', async () => {
        const users = Array(5).fill(null).map(() => testDataFactory.createUser());
        
        const authPromises = users.map(user =>
          request(app)
            .post('/api/auth/wallet-connect')
            .send({
              walletAddress: user.walletAddress,
              signature: testDataFactory.createValidSignature(),
              message: 'Sign in to LinkDAO'
            })
        );

        const responses = await Promise.all(authPromises);

        // All should succeed
        responses.forEach(response => {
          expect(response.status).toBe(200);
          expect(response.body.success).toBe(true);
          expect(response.body.data.token).toBeDefined();
        });

        // All tokens should be unique
        const tokens = responses.map(r => r.body.data.token);
        const uniqueTokens = new Set(tokens);
        expect(uniqueTokens.size).toBe(tokens.length);
      });
    });

    describe('Authentication Edge Cases', () => {
      it('should handle duplicate wallet connection attempts', async () => {
        const walletAddress = testDataFactory.createUser().walletAddress;
        const authData = {
          walletAddress,
          signature: testDataFactory.createValidSignature(),
          message: 'Sign in to LinkDAO'
        };

        // First authentication
        const firstResponse = await request(app)
          .post('/api/auth/wallet-connect')
          .send(authData)
          .expect(200);

        // Second authentication with same wallet
        const secondResponse = await request(app)
          .post('/api/auth/wallet-connect')
          .send(authData)
          .expect(200);

        // Both should succeed but may have different tokens
        expect(firstResponse.body.success).toBe(true);
        expect(secondResponse.body.success).toBe(true);
        expect(firstResponse.body.data.token).toBeDefined();
        expect(secondResponse.body.data.token).toBeDefined();
      });

      it('should reject authentication with invalid signature format', async () => {
        const invalidSignatures = [
          'invalid-signature',
          '0x123', // Too short
          '0x' + 'a'.repeat(200), // Too long
          '', // Empty
          null, // Null
          undefined // Undefined
        ];

        for (const signature of invalidSignatures) {
          const response = await request(app)
            .post('/api/auth/wallet-connect')
            .send({
              walletAddress: testUser.walletAddress,
              signature,
              message: 'Sign in to LinkDAO'
            })
            .expect(400);

          expect(response.body).toMatchObject({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: expect.stringContaining('signature')
            }
          });
        }
      });

      it('should reject authentication with invalid wallet address format', async () => {
        const invalidAddresses = [
          'invalid-address',
          '0x123', // Too short
          '0x' + 'g'.repeat(40), // Invalid characters
          '', // Empty
          'not-hex-address'
        ];

        for (const walletAddress of invalidAddresses) {
          const response = await request(app)
            .post('/api/auth/wallet-connect')
            .send({
              walletAddress,
              signature: testDataFactory.createValidSignature(),
              message: 'Sign in to LinkDAO'
            })
            .expect(400);

          expect(response.body).toMatchObject({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: expect.stringContaining('wallet address')
            }
          });
        }
      });
    });
  });

  describe('Authorization Middleware Tests', () => {
    describe('Token Validation', () => {
      it('should accept valid JWT token', async () => {
        const response = await request(app)
          .get('/api/auth/profile')
          .set('Authorization', `Bearer ${validToken}`)
          .expect(200);

        expect(response.body.success).toBe(true);
      });

      it('should reject expired JWT token', async () => {
        const response = await request(app)
          .get('/api/auth/profile')
          .set('Authorization', `Bearer ${expiredToken}`)
          .expect(401);

        expect(response.body).toMatchObject({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: expect.stringContaining('expired')
          }
        });
      });

      it('should reject malformed JWT token', async () => {
        const malformedTokens = [
          'invalid-token',
          'Bearer invalid-token',
          'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid',
          ''
        ];

        for (const token of malformedTokens) {
          const response = await request(app)
            .get('/api/auth/profile')
            .set('Authorization', `Bearer ${token}`)
            .expect(401);

          expect(response.body).toMatchObject({
            success: false,
            error: {
              code: 'UNAUTHORIZED'
            }
          });
        }
      });

      it('should reject request without authorization header', async () => {
        const response = await request(app)
          .get('/api/auth/profile')
          .expect(401);

        expect(response.body).toMatchObject({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: expect.stringContaining('token')
          }
        });
      });

      it('should reject token with wrong format in header', async () => {
        const invalidHeaders = [
          validToken, // Missing 'Bearer '
          `Token ${validToken}`, // Wrong prefix
          `Bearer`, // Missing token
          `Bearer ${validToken} extra` // Extra content
        ];

        for (const header of invalidHeaders) {
          const response = await request(app)
            .get('/api/auth/profile')
            .set('Authorization', header)
            .expect(401);

          expect(response.body).toMatchObject({
            success: false,
            error: {
              code: 'UNAUTHORIZED'
            }
          });
        }
      });
    });

    describe('Protected Endpoints Authorization', () => {
      const protectedEndpoints = [
        { method: 'get', path: '/api/auth/profile' },
        { method: 'put', path: '/api/auth/profile' },
        { method: 'post', path: '/api/auth/logout' },
        { method: 'get', path: '/api/cart' },
        { method: 'post', path: '/api/cart/items' },
        { method: 'put', path: '/api/cart/items/test-id' },
        { method: 'delete', path: '/api/cart/items/test-id' }
      ];

      it('should protect all authenticated endpoints', async () => {
        for (const endpoint of protectedEndpoints) {
          const response = await request(app)
            [endpoint.method as keyof typeof request](endpoint.path)
            .send({}) // Send empty body for POST/PUT requests
            .expect(401);

          expect(response.body).toMatchObject({
            success: false,
            error: {
              code: 'UNAUTHORIZED'
            }
          });
        }
      });

      it('should allow access to authenticated endpoints with valid token', async () => {
        // Test a subset of endpoints that don't require additional data
        const testEndpoints = [
          { method: 'get', path: '/api/auth/profile' },
          { method: 'get', path: '/api/cart' }
        ];

        for (const endpoint of testEndpoints) {
          const response = await request(app)
            [endpoint.method as keyof typeof request](endpoint.path)
            .set('Authorization', `Bearer ${validToken}`);

          // Should not be 401 (may be other errors due to missing data/setup)
          expect(response.status).not.toBe(401);
          
          if (response.body.success === false) {
            expect(response.body.error.code).not.toBe('UNAUTHORIZED');
          }
        }
      });
    });

    describe('Session Management', () => {
      let sessionToken: string;

      beforeAll(async () => {
        // Create a session
        const authResponse = await request(app)
          .post('/api/auth/wallet-connect')
          .send({
            walletAddress: testUser.walletAddress,
            signature: testDataFactory.createValidSignature(),
            message: 'Sign in to LinkDAO'
          });
        sessionToken = authResponse.body.data.token;
      });

      it('should maintain session across multiple requests', async () => {
        // Make multiple requests with the same token
        const requests = [
          request(app).get('/api/auth/profile').set('Authorization', `Bearer ${sessionToken}`),
          request(app).get('/api/cart').set('Authorization', `Bearer ${sessionToken}`),
          request(app).get('/api/auth/profile').set('Authorization', `Bearer ${sessionToken}`)
        ];

        const responses = await Promise.all(requests);

        // All should succeed
        responses.forEach(response => {
          expect(response.status).not.toBe(401);
        });
      });

      it('should invalidate session on logout', async () => {
        // Logout
        await request(app)
          .post('/api/auth/logout')
          .set('Authorization', `Bearer ${sessionToken}`)
          .expect(200);

        // Try to use the token after logout
        const response = await request(app)
          .get('/api/auth/profile')
          .set('Authorization', `Bearer ${sessionToken}`)
          .expect(401);

        expect(response.body).toMatchObject({
          success: false,
          error: {
            code: 'UNAUTHORIZED'
          }
        });
      });
    });
  });

  describe('Security Tests', () => {
    describe('Rate Limiting', () => {
      it('should rate limit authentication attempts', async () => {
        const walletAddress = testDataFactory.createUser().walletAddress;
        
        // Make multiple rapid authentication attempts
        const requests = Array(20).fill(null).map(() =>
          request(app)
            .post('/api/auth/wallet-connect')
            .send({
              walletAddress,
              signature: testDataFactory.createValidSignature(),
              message: 'Sign in to LinkDAO'
            })
        );

        const responses = await Promise.all(requests.map(req => req.catch(err => err.response)));

        // Some requests should be rate limited
        const rateLimitedResponses = responses.filter(r => r && r.status === 429);
        expect(rateLimitedResponses.length).toBeGreaterThan(0);

        rateLimitedResponses.forEach(response => {
          expect(response.body).toMatchObject({
            success: false,
            error: {
              code: 'TOO_MANY_REQUESTS'
            }
          });
        });
      });
    });

    describe('Input Sanitization', () => {
      it('should sanitize malicious input in profile updates', async () => {
        const maliciousInputs = {
          displayName: '<script>alert("xss")</script>',
          bio: 'javascript:alert("xss")',
          profileImageUrl: 'http://evil.com/malicious.jpg'
        };

        const response = await request(app)
          .put('/api/auth/profile')
          .set('Authorization', `Bearer ${validToken}`)
          .send(maliciousInputs)
          .expect(200);

        // Check that malicious content is sanitized
        expect(response.body.data.displayName).not.toContain('<script>');
        expect(response.body.data.bio).not.toContain('javascript:');
      });
    });

    describe('Token Security', () => {
      it('should not accept tokens signed with wrong secret', async () => {
        const wrongSecretToken = jwt.sign(
          { userId: testUser.id, walletAddress: testUser.walletAddress },
          'wrong-secret',
          { expiresIn: '1h' }
        );

        const response = await request(app)
          .get('/api/auth/profile')
          .set('Authorization', `Bearer ${wrongSecretToken}`)
          .expect(401);

        expect(response.body).toMatchObject({
          success: false,
          error: {
            code: 'UNAUTHORIZED'
          }
        });
      });

      it('should not accept tokens with tampered payload', async () => {
        // Create a token and tamper with it
        const validTokenParts = validToken.split('.');
        const tamperedPayload = Buffer.from('{"userId":"hacker","walletAddress":"0x0000000000000000000000000000000000000000"}').toString('base64');
        const tamperedToken = `${validTokenParts[0]}.${tamperedPayload}.${validTokenParts[2]}`;

        const response = await request(app)
          .get('/api/auth/profile')
          .set('Authorization', `Bearer ${tamperedToken}`)
          .expect(401);

        expect(response.body).toMatchObject({
          success: false,
          error: {
            code: 'UNAUTHORIZED'
          }
        });
      });
    });
  });

  describe('Error Recovery', () => {
    it('should handle authentication service failures gracefully', async () => {
      // This test would require mocking the authentication service to fail
      // For now, we'll test the error response format
      const response = await request(app)
        .post('/api/auth/wallet-connect')
        .send({
          walletAddress: 'invalid-format',
          signature: testDataFactory.createValidSignature(),
          message: 'Sign in to LinkDAO'
        })
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: expect.any(String),
          message: expect.any(String)
        },
        metadata: {
          timestamp: expect.any(String),
          requestId: expect.any(String)
        }
      });
    });

    it('should provide helpful error messages for common authentication failures', async () => {
      const testCases = [
        {
          data: { walletAddress: '', signature: '', message: '' },
          expectedError: 'VALIDATION_ERROR'
        },
        {
          data: { walletAddress: 'invalid', signature: 'invalid', message: 'test' },
          expectedError: 'VALIDATION_ERROR'
        }
      ];

      for (const testCase of testCases) {
        const response = await request(app)
          .post('/api/auth/wallet-connect')
          .send(testCase.data)
          .expect(400);

        expect(response.body).toMatchObject({
          success: false,
          error: {
            code: testCase.expectedError,
            message: expect.any(String)
          }
        });
      }
    });
  });
});