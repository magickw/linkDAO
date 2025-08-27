# Getting Started with LinkDAO

This guide will help you set up and run the LinkDAO project locally.

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js (version 18 or higher)
- npm (version 8 or higher)
- Git

## Project Structure

The LinkDAO project is organized as a monorepo with the following workspaces:
- `contracts`: Smart contracts (Solidity)
- `frontend`: Web application (Next.js/React)
- `backend`: API and services (Node.js)
- `mobile`: Mobile application (React Native)

## Initial Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd linkdao-app
   ```

2. Install dependencies for all workspaces:
   ```bash
   npm install
   ```

## Running the Applications

### Smart Contracts

1. Navigate to the contracts directory:
   ```bash
   cd contracts
   ```

2. Compile the contracts:
   ```bash
   npm run build
   ```

3. Deploy the contracts (to a local network or testnet):
   ```bash
   npm run deploy
   ```

### Web Frontend

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open your browser to http://localhost:3000

### Backend API

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. The API will be available at http://localhost:3001

### Mobile App

1. Navigate to the mobile directory:
   ```bash
   cd mobile
   ```

2. Start the Expo development server:
   ```bash
   npm start
   ```

3. Follow the instructions to run on iOS, Android, or web

## Environment Variables

Each workspace may require environment variables. Check the `.env.example` files in each directory for the required variables.

## Testing

To run tests for all workspaces:
```bash
npm test
```

To run tests for a specific workspace:
```bash
npm run test --workspace=<workspace-name>
```

## Building for Production

To build all workspaces for production:
```bash
npm run build
```

To build a specific workspace:
```bash
npm run build --workspace=<workspace-name>
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write tests if applicable
5. Commit your changes
6. Push to the branch
7. Create a pull request

## Troubleshooting

If you encounter any issues during setup:

1. Ensure all prerequisites are installed and up to date
2. Clear npm cache: `npm cache clean --force`
3. Delete node_modules and reinstall: `rm -rf node_modules && npm install`
4. Check the console for specific error messages
5. Refer to the documentation for the specific technology (Next.js, Hardhat, etc.)

## Support

For additional help, please:
1. Check the existing issues in the repository
2. Create a new issue if your problem hasn't been reported
3. Contact the development team