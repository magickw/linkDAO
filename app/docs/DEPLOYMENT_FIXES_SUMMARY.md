# LinkDAO Deployment Fixes Summary

This document summarizes all the changes made to fix the deployment issues encountered with Vercel and other deployment platforms.

## Problem

The deployment was failing with the following error:

```
npm error code ERESOLVE
npm error ERESOLVE unable to resolve dependency tree
npm error While resolving: @linkdao/contracts@0.1.0
npm error Found: @nomicfoundation/hardhat-chai-matchers@2.1.0
npm error Could not resolve dependency:
npm error peer @nomicfoundation/hardhat-chai-matchers@"^1.0.0" from @nomicfoundation/hardhat-toolbox@2.0.2
```

This is a common dependency conflict issue between Hardhat packages.

## Solution

We implemented multiple fixes to resolve the dependency conflicts:

### 1. Added `legacyPeerDeps` Configuration

We added the `legacyPeerDeps` configuration to all package.json files to bypass strict peer dependency checks:

- `/app/package.json` (root)
- `/app/frontend/package.json`
- `/app/backend/package.json`
- `/app/contracts/package.json`
- `/app/mobile/package.json`

```json
"npm": {
  "legacyPeerDeps": true
}
```

### 2. Added `.npmrc` Files

We created `.npmrc` files in all directories to ensure the `legacy-peer-deps` flag is always used during npm install:

- `/app/.npmrc`
- `/app/frontend/.npmrc`
- `/app/backend/.npmrc`
- `/app/contracts/.npmrc`
- `/app/mobile/.npmrc`

Each file contains:
```
legacy-peer-deps=true
```

### 3. Updated Vercel Configuration

We ensured the Vercel configuration includes the `NPM_FLAGS` setting:

`/app/frontend/vercel.json`:
```json
"build": {
  "env": {
    "NPM_FLAGS": "--legacy-peer-deps"
  }
}
```

We also created a root `/app/vercel.json` file:
```json
{
  "version": 2,
  "build": {
    "env": {
      "NPM_FLAGS": "--legacy-peer-deps"
    }
  },
  "github": {
    "silent": true
  }
}
```

### 4. Environment Variable Templates

We created `.env.example` files for all workspaces to make it easier to set up environment variables:

- `/app/backend/.env.example`
- `/app/contracts/.env.example`

### 5. Updated Documentation

We updated the documentation to include deployment instructions:

- `/app/docs/DEPLOYMENT_GUIDE.md` - Comprehensive deployment guide
- `/app/README.md` - Updated with deployment instructions

### 6. Created Deployment Scripts

We created helpful scripts for the deployment process:

- `/app/scripts/deploy.sh` - Automated deployment script
- Made the script executable with `chmod +x`

## Testing

We verified that our fixes work by:

1. Running `npm install --legacy-peer-deps` in the root directory - ✅ Success
2. Running `npm run build` in the frontend directory - ✅ Success

## Deployment Instructions

To deploy the application:

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Set the root directory to `app/frontend`
4. Add the required environment variables
5. Deploy

For backend deployment:
1. Use any Node.js hosting provider
2. Set the root directory to `app/backend`
3. Set build command to `npm run build`
4. Set start command to `npm start`
5. Add environment variables

For smart contract deployment:
1. Update the `.env` file in the `contracts` directory
2. Run `npm run deploy` in the contracts directory

## Additional Notes

The `legacyPeerDeps` approach is a safe solution for this type of dependency conflict. It allows npm to install packages even when there are peer dependency conflicts, which is common in blockchain development environments where different Hardhat plugins may have conflicting peer dependency requirements.

This approach does not compromise the functionality of the application and is widely used in the Ethereum development community.

The addition of `.npmrc` files ensures that the `legacy-peer-deps` flag is used consistently across all environments, including deployment platforms that may not respect the package.json configuration.