# Checkout Flow Configuration Guide

## Payment Configuration

### Stripe Setup (Fiat Payments)

1. **Create Stripe Account**
   - Go to https://stripe.com
   - Sign up for a Stripe account
   - Complete business verification

2. **Get API Keys**
   ```bash
   # Test Mode Keys (for development)
   STRIPE_SECRET_KEY=sk_test_51...
   STRIPE_PUBLISHABLE_KEY=pk_test_51...
   
   # Production Keys (for live transactions)
   # STRIPE_SECRET_KEY=sk_live_51...
   # STRIPE_PUBLISHABLE_KEY=pk_live_51...
   ```

3. **Configure Webhooks**
   - Go to Stripe Dashboard → Developers → Webhooks
   - Add endpoint: `https://your-domain.com/api/webhooks/stripe`
   - Select events: `payment_intent.succeeded`, `payment_intent.payment_failed`
   - Copy webhook secret:
   ```bash
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

4. **Set up Stripe Connect (for escrow)**
   ```bash
   STRIPE_CONNECT_CLIENT_ID=ca_...
   STRIPE_PLATFORM_ACCOUNT_ID=acct_...
   ```

### Crypto Payment Setup

1. **Blockchain RPC Endpoints**
   ```bash
   # Ethereum Mainnet
   ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/YOUR_INFURA_KEY
   
   # Polygon
   POLYGON_RPC_URL=https://polygon-rpc.com
   
   # Base
   BASE_RPC_URL=https://mainnet.base.org
   ```

2. **Deploy Escrow Contracts**
   
   Use the existing escrow contract or deploy new ones:
   ```bash
   # Ethereum
   ESCROW_CONTRACT_ADDRESS_ETH=0x...
   
   # Polygon
   ESCROW_CONTRACT_ADDRESS_POLYGON=0x...
   
   # Base
   ESCROW_CONTRACT_ADDRESS_BASE=0x...
   ```

3. **Token Addresses**
   ```bash
   # USDC Addresses (already configured)
   USDC_ADDRESS_ETH=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
   USDC_ADDRESS_POLYGON=0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174
   USDC_ADDRESS_BASE=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
   
   # USDT Addresses
   USDT_ADDRESS_ETH=0xdAC17F958D2ee523a2206206994597C13D831ec7
   USDT_ADDRESS_POLYGON=0xc2132D05D31c914a87C6611C10748AEb04B58e8F
   ```

4. **Wallet Configuration**
   ```bash
   # Platform wallet for gas fee sponsorship (optional)
   PLATFORM_WALLET_PRIVATE_KEY=0x...
   PLATFORM_WALLET_ADDRESS=0x...
   ```

## Environment Variables

Add to `.env` file:

```bash
# ===== PAYMENT CONFIGURATION =====

# Stripe (Fiat Payments)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CONNECT_CLIENT_ID=ca_...
STRIPE_PLATFORM_ACCOUNT_ID=acct_...

# Blockchain RPC
ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/YOUR_KEY
POLYGON_RPC_URL=https://polygon-rpc.com
BASE_RPC_URL=https://mainnet.base.org

# Escrow Contracts
ESCROW_CONTRACT_ADDRESS_ETH=0x...
ESCROW_CONTRACT_ADDRESS_POLYGON=0x...
ESCROW_CONTRACT_ADDRESS_BASE=0x...

# Token Addresses
USDC_ADDRESS_ETH=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
USDC_ADDRESS_POLYGON=0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174
USDC_ADDRESS_BASE=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913

# Platform Wallet (optional)
PLATFORM_WALLET_PRIVATE_KEY=0x...
PLATFORM_WALLET_ADDRESS=0x...

# ===== CHECKOUT CONFIGURATION =====

# Session expiry (minutes)
CHECKOUT_SESSION_EXPIRY=30

# Platform fee percentage
PLATFORM_FEE_PERCENTAGE=2.5

# Tax rate (percentage)
TAX_RATE=8.0

# Shipping calculation
SHIPPING_COST_PER_ITEM=5.00
```

## Database Migration

Run the migration to create checkout tables:

```bash
cd app/backend

# Apply the migration
psql $DATABASE_URL -f drizzle/0051_checkout_system.sql

# Or using Drizzle
npm run db:push
```

## Frontend Integration Testing

### 1. Update Frontend API Base URL

Ensure frontend is pointing to the correct backend:

```typescript
// app/frontend/src/services/checkoutService.ts
private apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
```

### 2. Test Checkout Flow

```bash
# Start backend
cd app/backend
npm run dev

# Start frontend (in another terminal)
cd app/frontend
npm run dev
```

### 3. Manual Testing Steps

1. **Add items to cart**
   - Navigate to marketplace
   - Add products to cart
   - Verify cart badge updates

2. **Navigate to checkout**
   - Click cart icon
   - Click "Proceed to Checkout"
   - Verify checkout page loads

3. **Create checkout session**
   - Verify session is created
   - Check totals calculation
   - Verify payment method options

4. **Enter shipping address**
   - Fill in shipping form
   - Test validation
   - Verify address saves

5. **Select payment method**
   - Test crypto payment selection
   - Test fiat payment selection
   - Verify fee calculations

6. **Process payment**
   - For fiat: Enter test card (4242 4242 4242 4242)
   - For crypto: Connect wallet and approve
   - Verify order creation
   - Verify cart clears

7. **Check order tracking**
   - Navigate to orders page
   - Verify order appears
   - Check order status

### 4. Browser Console Testing

Open browser console and test API directly:

```javascript
// Test create session
fetch('http://localhost:3001/api/checkout/session', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    items: [{
      productId: 'test-123',
      quantity: 1,
      price: 29.99,
      name: 'Test Product',
      sellerId: '0x123...'
    }]
  })
}).then(r => r.json()).then(console.log);

// Test validate
fetch('http://localhost:3001/api/checkout/validate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    shippingAddress: {
      fullName: 'John Doe',
      addressLine1: '123 Main St',
      city: 'San Francisco',
      state: 'CA',
      postalCode: '94102',
      country: 'US'
    }
  })
}).then(r => r.json()).then(console.log);
```

## Next Steps

1. ✅ Database schema created
2. ⏳ Configure payment credentials
3. ⏳ Test frontend integration
4. ⏳ Implement comprehensive tests
5. ⏳ Deploy to staging
6. ⏳ Production deployment
