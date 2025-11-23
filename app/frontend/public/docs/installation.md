# Installation Guide

## Prerequisites

Before installing LinkDAO, ensure you have the following:

- **Node.js** (v18 or higher)
- **npm** or **yarn** package manager
- **Git** for version control
- **MetaMask** or compatible Web3 wallet

## Quick Installation

### 1. Clone the Repository

```bash
git clone https://github.com/linkdao/linkdao.git
cd linkdao
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Configure Environment

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:10000
NEXT_PUBLIC_CHAIN_ID=84532
NEXT_PUBLIC_LDAO_TOKEN_ADDRESS=your_token_address
NEXT_PUBLIC_USDC_TOKEN_ADDRESS=your_usdc_address
```

### 4. Start Development Server

```bash
npm run dev
# or
yarn dev
```

The application will be available at `http://localhost:3000`

## Production Deployment

For production deployment instructions, see the [Deployment Guide](/docs/deployment).

## Troubleshooting

### Common Issues

**Port Already in Use**
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

**Module Not Found**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Next Steps

- [Quick Start Guide](/docs/quick-start) - Get started with LinkDAO
- [Wallet Setup](/docs/wallet-setup) - Configure your wallet
- [API Reference](/docs/api-reference) - Explore the API

## Support

Need help? Visit our [Support Page](/support) or join our [Discord](https://discord.gg/linkdao).
