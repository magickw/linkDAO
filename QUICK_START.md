# LinkDAO Quick Start Guide

Welcome to the LinkDAO development team! This guide will help you get started with the project quickly.

## Project Overview

LinkDAO is a web3-based social platform with native cryptocurrency wallets and DAO governance. The project is organized as a monorepo with multiple workspaces.

## Repository Structure

```
app/
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
   cd app
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

## AI Features

LinkDAO includes an advanced AI system with specialized bots for different functions:

### AI Service Architecture
- **AI Gateway**: Central service for LLM interactions
- **Bot Framework**: Modular bot system
- **Vector Database**: Pinecone for contextual retrieval
- **On-chain Data**: Integration with Ethereum data

### Available AI Bots
1. **Wallet Guard**: Transaction safety analysis
2. **Proposal Summarizer**: Governance proposal simplification
3. **Community Moderator**: Content moderation
4. **Social Copilot**: Content creation assistance

### Running AI Demos
```bash
cd app
npx ts-node scripts/ai-demo.ts
```

### AI Development
- Backend AI services: `/backend/src/services/aiService.ts`
- Individual bots: `/backend/src/services/bots/`
- Frontend components: `/frontend/src/components/AIChatInterface.tsx`
- React hooks: `/frontend/src/hooks/useAIBots.ts`

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
- [AI_INTEGRATION_PLAN.md](AI_INTEGRATION_PLAN.md) - AI integration strategy
- [AI_DEVELOPER_GUIDE.md](AI_DEVELOPER_GUIDE.md) - AI development guidelines
- [docs/DEVELOPMENT_GUIDELINES.md](docs/DEVELOPMENT_GUIDELINES.md) - Coding standards and best practices

## Need Help?

1. Check the documentation in the [docs/](app/docs/) directory
2. Look at existing code for examples
3. Ask questions in the team chat
4. Create an issue if you find a problem

## Next Steps

1. Get familiar with the codebase by exploring each workspace
2. Set up your development environment
3. Run the initialization script
4. Try the AI demo script
5. Start with a small task to get comfortable with the workflow

Happy coding!