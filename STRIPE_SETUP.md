# Stripe Configuration Instructions

Since `.env` files are gitignored, please add the following to your `.env` file manually:

## Add to `/Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/backend/.env`

```bash
# ===== STRIPE PAYMENT CONFIGURATION =====
# Test mode keys (safe to use for development)
STRIPE_SECRET_KEY=sk_test_51Placeholder_TestSecretKey_GetRealKeyFromStripeDashboard
STRIPE_PUBLISHABLE_KEY=pk_test_51Placeholder_TestPublishableKey_GetRealKeyFromStripeDashboard
STRIPE_WEBHOOK_SECRET=whsec_placeholder_webhook_secret

# Stripe Connect (optional for escrow)
STRIPE_CONNECT_CLIENT_ID=ca_placeholder
STRIPE_PLATFORM_ACCOUNT_ID=acct_placeholder

# ===== BLOCKCHAIN CONFIGURATION (Optional) =====
# For crypto payments
ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/YOUR_INFURA_KEY
POLYGON_RPC_URL=https://polygon-rpc.com
BASE_RPC_URL=https://mainnet.base.org

# Escrow contract addresses
ESCROW_CONTRACT_ADDRESS_ETH=0x0000000000000000000000000000000000000000
ESCROW_CONTRACT_ADDRESS_POLYGON=0x0000000000000000000000000000000000000000
ESCROW_CONTRACT_ADDRESS_BASE=0x0000000000000000000000000000000000000000

# Token addresses (USDC)
USDC_ADDRESS_ETH=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
USDC_ADDRESS_POLYGON=0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174
USDC_ADDRESS_BASE=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913

# ===== CHECKOUT CONFIGURATION =====
CHECKOUT_SESSION_EXPIRY=30
PLATFORM_FEE_PERCENTAGE=2.5
TAX_RATE=8.0
SHIPPING_COST_PER_ITEM=5.00
```

## Get Real Stripe Test Keys

1. Go to https://dashboard.stripe.com/register
2. Sign up for a free Stripe account
3. Navigate to **Developers** → **API keys**
4. Copy your **Test mode** keys:
   - **Publishable key** (starts with `pk_test_`)
   - **Secret key** (starts with `sk_test_`)
5. Replace the placeholder values above

## Test Card Numbers

Use these test cards in Stripe test mode:
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **3D Secure**: `4000 0025 0000 3155`
- **Expiry**: Any future date (e.g., `12/34`)
- **CVC**: Any 3 digits (e.g., `123`)
- **ZIP**: Any 5 digits (e.g., `12345`)

## Quick Setup Command

```bash
# Open .env file
code /Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/backend/.env

# Or use nano
nano /Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/backend/.env
```

Then paste the configuration above and save.
