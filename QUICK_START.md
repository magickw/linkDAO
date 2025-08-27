# LinkDAO Quick Start Guide

Welcome to the LinkDAO development team! This guide will help you get started with the project quickly.

## Project Overview

LinkDAO is a web3-based social platform with native cryptocurrency wallets and DAO governance. The project is organized as a monorepo with multiple workspaces.

## Repository Structure

```
linkdao-app/
├── contracts/     # Smart contracts (Solidity)
├── frontend/      # Web application (Next.js/React)
├── backend/       # API services (Node.js)
├── mobile/        # Mobile app (React Native)
├── docs/          # Documentation
└── scripts/       # Utility scripts
```

## Initial Setup

1. **Navigate to the project directory:**
   ```bash
   cd linkdao-app
   ```

2. **Run the initialization script:**
   ```bash
   ./scripts/init.sh
   ```
   
   This will install all dependencies for all workspaces.

## Working with Workspaces

### Smart Contracts (Solidity)
```bash
cd contracts
npm run build        # Compile contracts
npm run test         # Run contract tests
npm run deploy       # Deploy contracts (requires network config)
```

### Web Frontend (Next.js/React)
```bash
cd frontend
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
```

### Backend API (Node.js)
```bash
cd backend
npm run dev          # Start development server with hot reload
npm run build        # Compile TypeScript to JavaScript
npm run start        # Start production server
```

### Mobile App (React Native)
```bash
cd mobile
npm start            # Start Expo development server
npm run android      # Start on Android
npm run ios          # Start on iOS
```

## Development Workflow

1. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes in the appropriate workspace**

3. **Test your changes:**
   ```bash
   ./scripts/test-setup.sh
   ```

4. **Commit your changes with a conventional commit message:**
   ```bash
   git commit -m "feat(workspace): description of your changes"
   ```

5. **Push and create a pull request**

## Key Documentation

- [PRODUCT_SPEC.md](PRODUCT_SPEC.md) - Detailed product specifications
- [TECHNICAL_ARCHITECTURE.md](TECHNICAL_ARCHITECTURE.md) - Technical architecture
- [DELIVERY_PLAN.md](DELIVERY_PLAN.md) - Development timeline and milestones
- [docs/DEVELOPMENT_GUIDELINES.md](docs/DEVELOPMENT_GUIDELINES.md) - Coding standards and best practices

## Need Help?

1. Check the documentation in the [docs/](linkdao-app/docs/) directory
2. Look at existing code for examples
3. Ask questions in the team chat
4. Create an issue if you find a problem

## Next Steps

1. Get familiar with the codebase by exploring each workspace
2. Set up your development environment
3. Run the initialization script
4. Start with a small task to get comfortable with the workflow

Happy coding!