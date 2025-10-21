# Blockchain Integration - Quick Reference

## Import Statements

```typescript
// Token-Gating
import { useTokenGating, useMultipleTokenGating, useUserTokenBalance } from '@/hooks/useTokenGating';
import { communityTokenGatingService } from '@/services/blockchain/communityTokenGating';

// Treasury Management
import { useTreasuryBalance, useCreateTreasuryProposal } from '@/hooks/useTreasuryManagement';
import { communityTreasuryService } from '@/services/blockchain/communityTreasury';
```

## Common Patterns

### 1. Basic Token-Gating

```typescript
function MyComponent() {
  const { hasAccess, loading } = useTokenGating({
    type: 'token_balance',
    minimumBalance: '100'
  });

  if (loading) return <Loading />;
  return hasAccess ? <PremiumContent /> : <LockedMessage />;
}
```

### 2. Staking Requirement

```typescript
const { hasAccess, userBalance } = useTokenGating({
  type: 'staking_amount',
  minimumBalance: '1000'
});
```

### 3. Multiple Requirements (AND)

```typescript
const { hasAccess } = useMultipleTokenGating(
  [
    { type: 'token_balance', minimumBalance: '500' },
    { type: 'staking_amount', minimumBalance: '100' }
  ],
  'AND'
);
```

### 4. Multiple Requirements (OR)

```typescript
const { hasAccess } = useMultipleTokenGating(
  [
    { type: 'token_balance', minimumBalance: '1000' },
    { type: 'nft_ownership', nftCollection: '0x...' }
  ],
  'OR'
);
```

### 5. Display Treasury Balance

```typescript
function TreasuryWidget({ treasuryAddress }) {
  const { balances, loading } = useTreasuryBalance(treasuryAddress);

  return (
    <div>
      {balances.map(b => (
        <div key={b.tokenAddress}>
          {b.tokenSymbol}: {b.balance}
        </div>
      ))}
    </div>
  );
}
```

### 6. Create Treasury Proposal

```typescript
function ProposalForm({ communityId, treasuryAddress }) {
  const { createProposal, loading } = useCreateTreasuryProposal();

  const handleSubmit = async () => {
    const proposalId = await createProposal(
      communityId,
      treasuryAddress,
      'Grant Proposal',
      'Fund development team',
      '0x...', // recipient
      '10000'  // amount
    );
  };
}
```

### 7. Get User Balances

```typescript
const { balance } = useUserTokenBalance();
const { staked } = useUserStakedAmount();
const { votingPower } = useUserVotingPower();
```

## Contract Addresses

```typescript
// From deployed-addresses-localhost.json
const LDAO_TOKEN = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
const GOVERNANCE = '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9';
const MARKETPLACE = '0x0165878A594ca255338adfa4d48449f69242Eb8F';
```

## Token-Gating Requirement Types

```typescript
// Token Balance
{ type: 'token_balance', minimumBalance: '100' }

// Staking Amount
{ type: 'staking_amount', minimumBalance: '500' }

// Voting Power
{ type: 'voting_power', minimumBalance: '1000' }

// NFT Ownership (any from collection)
{ type: 'nft_ownership', nftCollection: '0x...' }

// Specific NFT
{ type: 'nft_ownership', nftCollection: '0x...', tokenId: '42' }
```

## Error Handling

```typescript
const { hasAccess, loading, error } = useTokenGating(requirement);

if (error) {
  return <ErrorMessage message={error} />;
}
```

## Direct Service Calls

```typescript
// Check access programmatically
const result = await communityTokenGatingService.checkContentAccess(
  userAddress,
  requirement
);

// Get treasury balance
const balances = await communityTreasuryService.getTreasuryBalance(
  treasuryAddress
);
```

## Environment Variables

Add to `.env.local`:

```bash
NEXT_PUBLIC_LDAO_TOKEN_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
NEXT_PUBLIC_GOVERNANCE_ADDRESS=0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9
NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545
```

## Testing

```bash
# Run integration tests
npm test -- src/services/blockchain/__tests__/communityBlockchain.integration.test.ts
```
