import { paymentMiddleware, x402ResourceServer } from '@x402/express';
import { HTTPFacilitatorClient } from '@x402/core/server';
import { ExactEvmScheme } from '@x402/evm/exact/server';

// Initialize Facilitator Client (using testnet/public facilitator for now)
const facilitatorClient = new HTTPFacilitatorClient({
    url: 'https://x402.org/facilitator'
});

// Create Resource Server instance
export const resourceServer = new x402ResourceServer(facilitatorClient);

// Register schemes
// Base Sepolia (84532)
resourceServer.register('eip155:84532', new ExactEvmScheme());
// Base Mainnet (8453)
resourceServer.register('eip155:8453', new ExactEvmScheme());

// Receiving address (Treasury)
// Receiving address (Treasury)
export const PAY_TO_ADDRESS = process.env.TREASURY_WALLET_ADDRESS || '0x742d35Cc6634C0532925a3b844Bc454e4438f44e';

// Configure Middleware
export const x402Middleware = paymentMiddleware(
    {
        // Define protected resources
        // This matches the path in Express router

        // Test route
        'GET /api/x402/protected': {
            accepts: [
                {
                    scheme: 'exact',
                    price: '0.01',
                    network: 'eip155:84532', // Base Sepolia
                    payTo: PAY_TO_ADDRESS
                }
            ],
            description: 'Protected Test Resource',
            mimeType: 'application/json'
        },

        // Checkout route - Note: This is a placeholder configuration
        // The actual checkout route handler will create dynamic middleware based on order amount
        'POST /api/x402/checkout': {
            accepts: [
                {
                    scheme: 'exact',
                    price: '0.01', // Default minimum price
                    network: 'eip155:8453', // Base Mainnet
                    payTo: PAY_TO_ADDRESS,
                    token: 'USDC'
                },
                {
                    scheme: 'exact',
                    price: '0.01', // Default minimum price
                    network: 'eip155:8453', // Base Mainnet
                    payTo: PAY_TO_ADDRESS
                }
            ],
            description: 'Checkout Payment',
            mimeType: 'application/json'
        }
    },
    resourceServer
);
