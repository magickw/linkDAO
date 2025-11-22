# EnhancedLDAOStaking Contract Deployment Troubleshooting

## Current Issue

The `EnhancedLDAOStaking` contract compilation is failing with the error:
```
CodeGenerationError: Some immutables were read from but never assigned, possibly because of optimization.
```

## Root Cause

This error typically occurs when:
1. Immutable variables are declared but not properly initialized in the constructor
2. There are complex constructor operations that the optimizer can't handle
3. Stack depth issues in constructor functions

## Immediate Workaround

The `NEXT_PUBLIC_API_STAKING_ADDRESS` environment variable has been set to a placeholder address:
```
NEXT_PUBLIC_API_STAKING_ADDRESS=0x0000000000000000000000000000000000000000
```

This prevents application crashes but disables staking functionality until the contract is properly deployed.

## Solutions

### Option 1: Fix the Contract Compilation (Recommended)

1. **Check for uninitialized immutable variables** in `EnhancedLDAOStaking.sol`:
   - Review all `immutable` declarations
   - Ensure all are properly initialized in the constructor

2. **Simplify the constructor** if it has too many operations:
   - Move tier initialization to a separate function
   - Call initialization function after deployment

3. **Try different optimization settings**:
   ```typescript
   // In hardhat.config.ts
   settings: {
     optimizer: {
       enabled: true,
       runs: 1, // Lower runs for better compilation success
     },
     viaIR: true, // Enable for complex contracts
   }
   ```

### Option 2: Use Alternative Contract (Temporary)

You can temporarily use an existing contract address until the staking contract is fixed:

```bash
# Use LDAOToken contract as temporary staking address
NEXT_PUBLIC_API_STAKING_ADDRESS=0xc9F690B45e33ca909bB9ab97836091673232611B
```

**Note**: This is not functional but prevents errors.

### Option 3: Deploy Minimal Staking Contract

Create a simplified staking contract without the complex features that cause compilation issues.

## Deployment Script

The deployment script is ready at `scripts/deploy-staking.ts` and will work once compilation issues are resolved.

## Next Steps

1. **Identify the specific contract causing compilation issues**
2. **Fix the immutable variable initialization**
3. **Test compilation with different optimization settings**
4. **Deploy the fixed contract**
5. **Update environment variables with the deployed address**

## Testing Compilation

To test if the issue is resolved:
```bash
cd app/contracts
npx hardhat compile
```

## Environment Variables to Update After Deployment

Once the staking contract is successfully deployed, update these files:

### Frontend
- `app/frontend/.env.local`
- `app/frontend/.env.blockchain`

### Backend
- `app/backend/.env.local`
- `app/backend/.env.example`

Replace the placeholder address with the actual deployed contract address.