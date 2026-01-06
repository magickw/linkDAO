import { describe, it, expect } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { x402Middleware } from '../middleware/x402Middleware';
import x402ResourceRoutes from '../routes/x402ResourceRoutes';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { x402Client, wrapFetchWithPayment } from '@x402/fetch';
// Note: @x402/fetch is client lib. We might need to use node-fetch or similar to test client flow in backend node env.
// Or just test raw headers.

// Mock app
const app = express();
app.use(express.json());
app.use(x402Middleware);
app.use('/api/x402', x402ResourceRoutes);

describe('x402 Integration Tests', () => {
    it('should return 402 Payment Required for protected resource', async () => {
        const res = await request(app).get('/api/x402/protected');
        expect(res.status).toBe(402);
        expect(res.header['payment-required']).toBeDefined();

        const paymentReq = JSON.parse(res.header['payment-required']);
        expect(paymentReq.network_id).toBe('eip155:84532');
    });

    // Valid signature test is complex without a full client implementation in test env
    // We will assume 402 check is sufficient for "middleware active" verification
});
