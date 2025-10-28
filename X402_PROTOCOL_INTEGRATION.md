# x402 Protocol Integration

This document describes the implementation of the x402 protocol integration in LinkDAO to reduce transaction fees during the checkout process.

## Overview

The x402 protocol is a payment standard developed by Coinbase that allows for reduced transaction fees when processing payments through their platform. This integration provides users with a cost-effective payment option during checkout.

## Implementation Details

### Backend Implementation

The backend implementation is located in `/app/backend/src/services/x402PaymentService.ts` and includes:

1. **CDP SDK Integration**: The service uses the Coinbase Developer Platform (CDP) SDK to handle payment processing
2. **Payment Processing**: Creates payment URLs for x402 transactions
3. **Status Checking**: Allows checking the status of x402 payments
4. **Refund Processing**: Handles refund requests for x402 payments

The service is configured to use API credentials stored in environment variables:
- `COINBASE_API_KEY`: The API key for Coinbase CDP
- `COINBASE_API_SECRET`: The API secret for Coinbase CDP

### Frontend Implementation

The frontend implementation is located in `/app/frontend/src/services/x402PaymentService.ts` and includes:

1. **API Communication**: Communicates with the backend x402 payment API endpoints
2. **Payment Processing**: Initiates x402 payments through the backend service
3. **Status Checking**: Checks payment status through the backend service
4. **Refund Processing**: Processes refunds through the backend service

### API Routes

The backend exposes the following API routes for x402 payment processing:

1. `POST /api/x402/payment` - Process a new x402 payment
2. `GET /api/x402/payment/:transactionId` - Check the status of an x402 payment
3. `POST /api/x402/payment/:transactionId/refund` - Process a refund for an x402 payment

### Payment Method Prioritization

The x402 payment method has been integrated into the payment method prioritization system in `/app/frontend/src/config/paymentMethodPrioritization.ts`. It is configured as the highest priority payment method to encourage its use for reduced transaction fees.

## Configuration

To use the x402 protocol integration, you need to:

1. Obtain API credentials from Coinbase Developer Platform
2. Add the credentials to the backend environment variables:
   ```
   COINBASE_API_KEY=your_api_key_here
   COINBASE_API_SECRET=your_api_secret_here
   ```

## Testing

Unit tests have been implemented for both frontend and backend services:

- Frontend tests: `/app/frontend/src/services/__tests__/x402PaymentService.test.ts`
- Backend tests: `/app/backend/src/tests/x402PaymentService.test.ts`

The tests cover:
- Successful payment processing
- Payment status checking
- Refund processing
- Error handling

## Benefits

The x402 protocol integration provides several benefits:

1. **Reduced Transaction Fees**: Users can take advantage of lower fees when paying with x402
2. **Improved User Experience**: Seamless integration with the existing checkout flow
3. **Cost Savings**: Reduced costs for both buyers and sellers on the platform
4. **Enhanced Payment Options**: Additional payment method that can improve conversion rates

## Security

The implementation follows security best practices:

1. API credentials are stored securely in environment variables
2. All communication between frontend and backend uses HTTPS
3. Input validation is performed on all API endpoints
4. Error handling is implemented to prevent information leakage