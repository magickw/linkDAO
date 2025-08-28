# LinkDAO - Decentralized Social Platform

LinkDAO is a decentralized social platform built on Ethereum that combines the power of blockchain technology with social networking features. This repository contains the complete implementation of the platform as specified in the product requirements document.

## 🚀 Project Overview

LinkDAO represents the next evolution in social networking, where users truly own their data and identities. Built on Ethereum, the platform offers:

- **Decentralized Identity**: Users control their profiles through Ethereum wallets
- **Tokenized Economy**: Integrated token system for platform governance and rewards
- **AI-Powered Features**: Intelligent content moderation, proposal summarization, and social assistance
- **Real-time Interactions**: WebSocket-powered notifications and messaging
- **Censorship Resistance**: IPFS-based content storage for permanent, decentralized media
- **Reddit-Style Interface**: Familiar social media layout optimized for Web3 communities

## 📋 Phase 1 Implementation Summary

All Phase 1 recommendations have been successfully implemented:

### ✅ Core Infrastructure
- **User Authentication**: Web3 wallet integration with RainbowKit and wagmi
- **Smart Contracts**: Profile registry, follow system, payment router, governance, and token contracts
- **Backend API**: RESTful API with Express.js for profile, post, follow, and AI services
- **Frontend**: Next.js application with responsive UI components

### ✅ Advanced Features
- **Real-time Updates**: WebSocket integration for live notifications
- **Comprehensive Testing**: Unit, integration, and end-to-end tests for all components
- **Security Audits**: Thorough reviews of smart contracts and API endpoints
- **IPFS Integration**: Decentralized content storage and retrieval
- **AI Services**: OpenAI-powered bots for security, governance, moderation, and social assistance
- **Reddit-Style UI**: Community-focused interface with familiar navigation patterns

## 🏗️ Architecture

### Frontend
- **Framework**: Next.js with TypeScript
- **Styling**: Tailwind CSS
- **Wallet Integration**: RainbowKit and wagmi
- **State Management**: React Context API
- **Testing**: Jest and React Testing Library

### Backend
- **Framework**: Express.js with TypeScript
- **Database**: In-memory storage (with potential for PostgreSQL extension)
- **Authentication**: JWT tokens
- **Real-time**: Socket.IO
- **AI Services**: OpenAI GPT-4 and Pinecone
- **Storage**: IPFS and Arweave integration

### Smart Contracts
- **Language**: Solidity ^0.8.20
- **Framework**: Hardhat
- **Standards**: ERC-20, ERC-165
- **Testing**: Hardhat and Chai

## 📁 Repository Structure

```
LinkDAO/
├── app/
│   ├── backend/           # Express.js backend API
│   ├── contracts/         # Solidity smart contracts
│   └── frontend/          # Next.js frontend application
├── docs/                  # Project documentation
├── PHASE1_COMPLETION_SUMMARY.md
├── PHASE1_IMPLEMENTATION_SUMMARY.md
├── PHASE2_COMPLETION_SUMMARY.md
├── PHASE2_PROGRESS_SUMMARY.md
├── REDDIT_STYLE_UI_DOCS.md
├── SMART_CONTRACT_SECURITY_AUDIT.md
├── API_SECURITY_AUDIT.md
├── API_DOCUMENTATION.md
├── FRONTEND_TESTING_SUMMARY.md
└── README.md
```

## 🚀 Getting Started

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0
- Ethereum wallet (MetaMask recommended)
- IPFS node (optional, for local development)

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd LinkDAO
   ```

2. **Install dependencies for all packages**:
   ```bash
   # Install backend dependencies
   cd app/backend
   npm install
   
   # Install frontend dependencies
   cd ../frontend
   npm install
   
   # Install smart contract dependencies
   cd ../contracts
   npm install
   ```

### Running the Application

1. **Start the backend server**:
   ```bash
   cd app/backend
   npm run dev
   ```

2. **Start the frontend development server**:
   ```bash
   cd app/frontend
   npm run dev
   ```

3. **Deploy smart contracts (optional)**:
   ```bash
   cd app/contracts
   npx hardhat compile
   npx hardhat node
   ```

### Testing

Run tests for different components:

```bash
# Frontend unit tests
cd app/frontend
npm test

# Backend tests
cd app/backend
npm test

# Smart contract tests
cd app/contracts
npx hardhat test
```

## 🔐 Security

### Smart Contracts
- Audited for common vulnerabilities
- Follows OpenZeppelin best practices
- Includes comprehensive test coverage
- Implements proper access controls

### Backend API
- Rate limiting to prevent abuse
- Input validation for all endpoints
- JWT-based authentication
- Secure error handling

### Frontend
- Wallet-based authentication
- Secure storage of temporary data
- Proper error handling and user feedback

## 🧪 Testing

The platform includes comprehensive testing at all levels:

- **Unit Tests**: Individual component and function tests
- **Integration Tests**: API and service integration tests
- **End-to-End Tests**: Complete user flow tests
- **Smart Contract Tests**: Thorough contract functionality tests

## 📚 Documentation

- [API Documentation](API_DOCUMENTATION.md)
- [Smart Contract Security Audit](SMART_CONTRACT_SECURITY_AUDIT.md)
- [API Security Audit](API_SECURITY_AUDIT.md)
- [Frontend Testing Summary](FRONTEND_TESTING_SUMMARY.md)
- [Phase 1 Implementation Summary](PHASE1_IMPLEMENTATION_SUMMARY.md)
- [Phase 2 Completion Summary](PHASE2_COMPLETION_SUMMARY.md)
- [Reddit-Style UI Documentation](REDDIT_STYLE_UI_DOCS.md)

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Ethereum](https://ethereum.org/)
- [OpenZeppelin](https://openzeppelin.com/)
- [RainbowKit](https://www.rainbowkit.com/)