# Vercel Deployment Guide

This guide explains how to deploy the LinkDAO application to Vercel, including solutions for common deployment issues.

## Deployment Configuration

### Root Configuration

The root `vercel.json` file contains the necessary configuration to resolve dependency conflicts:

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

### Workspace Configuration

Each workspace (frontend, backend, contracts, mobile) requires specific configuration to ensure consistent dependency resolution:

1. **Root `.npmrc` file**:
   ```
   legacy-peer-deps=true
   ```

2. **Frontend `.npmrc` file**:
   ```
   legacy-peer-deps=true
   ```

3. **Backend `.npmrc` file**:
   ```
   legacy-peer-deps=true
   ```

4. **Contracts `.npmrc` file**:
   ```
   legacy-peer-deps=true
   ```

5. **Mobile `.npmrc` file**:
   ```
   legacy-peer-deps=true
   ```

### Package.json Configuration

All `package.json` files (root, frontend, backend, contracts, mobile) include:

```json
"npm": {
  "legacyPeerDeps": true
}
```

## Common Deployment Issues

### Hardhat Dependency Conflicts

The most common deployment issue is related to Hardhat dependency conflicts:

```
npm error While resolving: @linkdao/contracts@0.1.0
npm error Found: @nomicfoundation/hardhat-chai-matchers@2.1.0
npm error Could not resolve dependency:
npm error peer @nomicfoundation/hardhat-chai-matchers@"^1.0.0" from @nomicfoundation/hardhat-toolbox@2.0.2
```

This is resolved by using the `--legacy-peer-deps` flag in all configuration files.

## Deployment Steps

1. Ensure all `.npmrc` files contain `legacy-peer-deps=true`
2. Verify that all `package.json` files include `"legacyPeerDeps": true` in the `npm` section
3. Confirm that `vercel.json` includes `"NPM_FLAGS": "--legacy-peer-deps"`
4. Push changes to GitHub
5. Deploy to Vercel through the dashboard or CLI

## Troubleshooting

### If Deployment Still Fails

1. Check the Vercel build logs for specific error messages
2. Verify that all configuration files are correctly set up
3. Try clearing the Vercel cache and redeploying
4. Consider using `--force` flag if necessary:
   ```bash
   vercel --prod --force
   ```

### Environment Variables

Ensure all required environment variables are set in the Vercel project settings:

- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`
- `OPENAI_API_KEY`
- `PINECONE_API_KEY`
- `DATABASE_URL`
- `RPC_URL`

## Best Practices

1. Always test deployment in a staging environment first
2. Keep all configuration files consistent across workspaces
3. Regularly update dependencies to minimize conflicts
4. Document any custom deployment configurations
5. Monitor deployment logs for warnings or errors