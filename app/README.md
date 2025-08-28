# LinkDAO Application

This is the main application repository for LinkDAO, a web3-based social platform with native cryptocurrency wallets and DAO governance.

## Project Structure

```
app/
├── contracts/          # Smart contracts (Solidity)
├── frontend/           # Web application (Next.js/React)
├── backend/            # API and services (Node.js)
├── mobile/             # Mobile application (React Native)
├── docs/               # Documentation
└── scripts/            # Deployment and utility scripts
```

## Prerequisites

- Node.js >= 18.0.0
- npm >= 8.0.0
- Docker (for local development)

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start development servers:
   ```bash
   npm run dev
   ```

3. For contract development:
   ```bash
   npm run deploy:contracts
   ```

## Workspaces

This project uses npm workspaces to manage multiple packages:

- `frontend`: Web application
- `backend`: API and services
- `contracts`: Smart contracts
- `mobile`: Mobile application

## Development

Each workspace has its own development commands. Check the respective README files for more details.

## Deployment

Deployment scripts are located in the `scripts/` directory.