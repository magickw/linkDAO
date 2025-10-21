# Community Blockchain Integration

Complete blockchain integration for LinkDAO communities, enabling token-gating and treasury management.

## Overview

This integration provides:

1. **Token-Gating**: Control access to community content based on blockchain criteria
2. **Treasury Management**: Manage community funds through decentralized governance
3. **React Hooks**: Easy-to-use hooks for React components
4. **Type Safety**: Full TypeScript support with comprehensive type definitions

## Architecture

### Services

#### `communityTokenGating.ts`
Handles blockchain verification for token-gated content access.

**Key Features:**
- Token balance verification
- NFT ownership checking
- Staking amount validation
- Voting power verification
- Batch requirement checking (AND/OR logic)

#### `communityTreasury.ts`
Manages community treasury operations and governance.

**Key Features:**
- Treasury balance tracking
- Proposal creation and execution
- Transaction history
- Fund allocation management
- Token approval management

### React Hooks

#### `useTokenGating.ts`
React hooks for token-gating functionality.

#### `useTreasuryManagement.ts`
React hooks for treasury operations.

## Setup

### 1. Environment Configuration

Add the following to your `.env.local`:

```bash
# Blockchain Configuration
NEXT_PUBLIC_LDAO_TOKEN_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
NEXT_PUBLIC_GOVERNANCE_ADDRESS=0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9
NEXT_PUBLIC_MARKETPLACE_ADDRESS=0x0165878A594ca255338adfa4d48449f69242Eb8F
NEXT_PUBLIC_REPUTATION_ADDRESS=0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9
NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545
```

### 2. Contract Deployment

Ensure contracts are deployed. Contract addresses are loaded from:
- `app/contracts/deployed-addresses-localhost.json` (development)
- Environment variables (production)

## Usage Examples

### Token-Gating

#### Basic Token Balance Check

```typescript
import { useTokenGating } from '@/hooks/useTokenGating';

function TokenGatedContent() {
  const { hasAccess, loading, error } = useTokenGating({
    type: 'token_balance',
    tokenAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    minimumBalance: '100' // 100 LDAO tokens required
  });

  if (loading) return <div>Checking access...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!hasAccess) return <div>You need 100 LDAO tokens to access this content</div>;

  return <div>Welcome! You have access to premium content.</div>;
}
```

#### NFT Ownership Check

```typescript
import { useTokenGating } from '@/hooks/useTokenGating';

function NFTGatedContent() {
  const { hasAccess, userTokenIds } = useTokenGating({
    type: 'nft_ownership',
    nftCollection: '0x...', // NFT collection address
    tokenId: '42' // Optional: specific token ID
  });

  if (!hasAccess) {
    return <div>You must own an NFT from this collection</div>;
  }

  return (
    <div>
      <h2>NFT Holder Content</h2>
      <p>Your NFTs: {userTokenIds?.join(', ')}</p>
    </div>
  );
}
```

#### Staking Requirement

```typescript
import { useTokenGating } from '@/hooks/useTokenGating';

function StakerOnlyContent() {
  const { hasAccess, userBalance } = useTokenGating({
    type: 'staking_amount',
    minimumBalance: '1000' // 1000 LDAO staked required
  });

  return (
    <div>
      {hasAccess ? (
        <div>Premium staker content</div>
      ) : (
        <div>
          You have {userBalance} LDAO staked.
          Need 1000 to access this content.
        </div>
      )}
    </div>
  );
}
```

#### Multiple Requirements (AND logic)

```typescript
import { useMultipleTokenGating } from '@/hooks/useTokenGating';

function ExclusiveContent() {
  const { hasAccess } = useMultipleTokenGating(
    [
      { type: 'token_balance', minimumBalance: '500' },
      { type: 'staking_amount', minimumBalance: '100' },
      { type: 'voting_power', minimumBalance: '200' }
    ],
    'AND' // User must meet ALL requirements
  );

  return hasAccess ? <div>Ultra-premium content</div> : <div>Access denied</div>;
}
```

#### Multiple Requirements (OR logic)

```typescript
import { useMultipleTokenGating } from '@/hooks/useTokenGating';

function FlexibleAccess() {
  const { hasAccess } = useMultipleTokenGating(
    [
      { type: 'token_balance', minimumBalance: '1000' },
      { type: 'nft_ownership', nftCollection: '0x...' }
    ],
    'OR' // User needs to meet ANY requirement
  );

  return hasAccess ? <div>Welcome!</div> : <div>Access denied</div>;
}
```

### Treasury Management

#### Display Treasury Balance

```typescript
import { useTreasuryBalance } from '@/hooks/useTreasuryManagement';

function TreasuryDashboard({ treasuryAddress }: { treasuryAddress: string }) {
  const { balances, loading, error, refetch } = useTreasuryBalance(treasuryAddress);

  if (loading) return <div>Loading treasury balance...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>Treasury Balance</h2>
      {balances.map(balance => (
        <div key={balance.tokenAddress}>
          <strong>{balance.tokenSymbol}:</strong> {balance.balance}
        </div>
      ))}
      <button onClick={refetch}>Refresh</button>
    </div>
  );
}
```

#### Create Treasury Proposal

```typescript
import { useCreateTreasuryProposal } from '@/hooks/useTreasuryManagement';

function CreateProposalForm({ communityId, treasuryAddress }: Props) {
  const { createProposal, loading, error, proposalId } = useCreateTreasuryProposal();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const id = await createProposal(
        communityId,
        treasuryAddress,
        'Fund Developer Grant',
        'Allocate 10,000 LDAO to developer team for Q1 2025',
        '0x...', // Recipient address
        '10000' // Amount in LDAO
      );

      console.log('Proposal created:', id);
    } catch (err) {
      console.error('Failed to create proposal:', err);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Create Treasury Proposal</h2>
      {/* Form fields */}
      <button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create Proposal'}
      </button>
      {error && <div className="error">{error}</div>}
      {proposalId && <div>Proposal ID: {proposalId}</div>}
    </form>
  );
}
```

#### Display Treasury Transactions

```typescript
import { useTreasuryTransactions } from '@/hooks/useTreasuryManagement';

function TreasuryHistory({ treasuryAddress }: { treasuryAddress: string }) {
  const { transactions, loading } = useTreasuryTransactions(treasuryAddress, 20);

  if (loading) return <div>Loading transactions...</div>;

  return (
    <div>
      <h2>Transaction History</h2>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Type</th>
            <th>From</th>
            <th>To</th>
            <th>Amount</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map(tx => (
            <tr key={tx.hash}>
              <td>{tx.timestamp.toLocaleDateString()}</td>
              <td>{tx.type}</td>
              <td>{tx.from.slice(0, 8)}...</td>
              <td>{tx.to.slice(0, 8)}...</td>
              <td>{tx.amount} LDAO</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

#### Deposit to Treasury

```typescript
import { useDepositToTreasury } from '@/hooks/useTreasuryManagement';

function TreasuryDeposit({ treasuryAddress }: { treasuryAddress: string }) {
  const { deposit, loading, transactionHash } = useDepositToTreasury();
  const [amount, setAmount] = useState('');

  const handleDeposit = async () => {
    try {
      const txHash = await deposit(treasuryAddress, amount);
      console.log('Deposited! Transaction:', txHash);
    } catch (err) {
      console.error('Deposit failed:', err);
    }
  };

  return (
    <div>
      <h2>Deposit to Treasury</h2>
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount in LDAO"
      />
      <button onClick={handleDeposit} disabled={loading}>
        {loading ? 'Depositing...' : 'Deposit'}
      </button>
      {transactionHash && <div>Success! TX: {transactionHash}</div>}
    </div>
  );
}
```

### Combined Example: Community Settings

```typescript
import { useTokenGating, useUserTokenBalance } from '@/hooks/useTokenGating';
import { useTreasuryBalance } from '@/hooks/useTreasuryManagement';

function CommunitySettings({ community }: { community: Community }) {
  // Check if user is admin (has governance token)
  const { hasAccess: isAdmin } = useTokenGating({
    type: 'voting_power',
    minimumBalance: '1000'
  });

  // Get user's token balance
  const { balance } = useUserTokenBalance();

  // Get treasury info
  const { balances: treasuryBalances } = useTreasuryBalance(
    community.treasury_address
  );

  return (
    <div>
      <h1>{community.display_name} Settings</h1>

      <section>
        <h2>Your Status</h2>
        <p>LDAO Balance: {balance}</p>
        <p>Role: {isAdmin ? 'Admin' : 'Member'}</p>
      </section>

      {isAdmin && (
        <section>
          <h2>Treasury</h2>
          {treasuryBalances.map(b => (
            <div key={b.tokenAddress}>
              {b.tokenSymbol}: {b.balance}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
```

## API Reference

### Token Gating Service

#### `checkContentAccess(userAddress, requirement)`
Check if a user has access based on a single requirement.

**Parameters:**
- `userAddress` (string): User's wallet address
- `requirement` (TokenGatingRequirement): Access requirement

**Returns:** `Promise<AccessCheckResult>`

#### `checkAllRequirements(userAddress, requirements)`
Check if user meets ALL requirements (AND logic).

**Parameters:**
- `userAddress` (string): User's wallet address
- `requirements` (TokenGatingRequirement[]): Array of requirements

**Returns:** `Promise<boolean>`

#### `checkAnyRequirement(userAddress, requirements)`
Check if user meets ANY requirement (OR logic).

**Parameters:**
- `userAddress` (string): User's wallet address
- `requirements` (TokenGatingRequirement[]): Array of requirements

**Returns:** `Promise<boolean>`

### Treasury Service

#### `getTreasuryBalance(treasuryAddress)`
Get all token balances for a treasury.

**Parameters:**
- `treasuryAddress` (string): Treasury wallet address

**Returns:** `Promise<TreasuryBalance[]>`

#### `createTreasuryProposal(...)`
Create a new governance proposal for treasury spending.

**Returns:** `Promise<string>` (proposal ID)

#### `executeTreasuryProposal(proposalId)`
Execute an approved treasury proposal.

**Returns:** `Promise<string>` (transaction hash)

## Token Gating Requirement Types

```typescript
type TokenGatingRequirement = {
  type: 'token_balance' | 'nft_ownership' | 'staking_amount' | 'voting_power';
  tokenAddress?: string;      // ERC20 or ERC721 contract address
  tokenId?: string;            // Specific NFT token ID (optional)
  minimumBalance?: string;     // Minimum balance/stake/power required
  nftCollection?: string;      // Alternative to tokenAddress for NFTs
}
```

## Testing

Run the integration tests:

```bash
cd app/frontend
npm test -- src/services/blockchain/__tests__/communityBlockchain.integration.test.ts
```

## Security Considerations

1. **Always validate on backend**: Client-side checks are for UX only
2. **Use backend verification**: Implement server-side token verification
3. **Rate limit**: Prevent spam from repeated blockchain calls
4. **Error handling**: Always handle errors gracefully
5. **Gas costs**: Inform users of transaction costs

## Troubleshooting

### Web3 Provider Not Available
- Ensure user has MetaMask or another Web3 wallet installed
- Check that the user is connected to the correct network

### Contract Calls Failing
- Verify contract addresses in environment variables
- Ensure local blockchain is running (`npx hardhat node`)
- Check that contracts are deployed

### Balance Shows 0
- Verify user is connected with correct wallet
- Check that the token contract address is correct
- Ensure user has actually received/staked tokens

## Next Steps

1. **Backend Integration**: Implement server-side verification
2. **Event Indexing**: Set up event indexing for proposal tracking
3. **Subgraph**: Consider using The Graph for historical data
4. **Multi-chain**: Extend to support multiple chains
5. **Advanced Features**: Add token streaming, vesting, etc.

## Support

For issues or questions:
- Check the integration tests for usage examples
- Review the TypeScript type definitions
- Consult the blockchain contracts in `app/contracts/contracts/`
