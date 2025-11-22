# Feed Blockchain Integration - Quick Start Guide

## 🚀 5-Minute Integration Guide

### Step 1: Import the Hooks

```typescript
import {
  useUserBlockchainProfile,
  usePostTokenGating,
  useFeedTipping,
  useTokenTierDisplay
} from '@/hooks/useFeedBlockchain';
```

### Step 2: Add to Your Post Card

```typescript
function EnhancedPostCard({ post }) {
  // Get author's blockchain profile
  const { profile } = useUserBlockchainProfile(post.authorAddress);

  // Check if user can access token-gated content
  const { hasAccess, reason } = usePostTokenGating(post.tokenGating?.requirement);

  // Tipping functionality
  const { sendTip, loading: tippingLoading } = useFeedTipping();

  // Get tier display configs
  const { tokenTierConfig, reputationTierConfig } = useTokenTierDisplay(post.authorAddress);

  return (
    <div>
      {/* Display token tier badge */}
      {tokenTierConfig && (
        <span style={{
          color: tokenTierConfig.color,
          backgroundColor: tokenTierConfig.bgColor,
          padding: '2px 8px',
          borderRadius: '4px'
        }}>
          {tokenTierConfig.icon} {tokenTierConfig.label}
        </span>
      )}

      {/* Display reputation */}
      {profile && (
        <span>⭐ {profile.reputation} rep</span>
      )}

      {/* Token-gated content */}
      {post.isTokenGated ? (
        hasAccess ? (
          <div>{post.content}</div>
        ) : (
          <div>
            🔒 Locked Content
            <p>{reason}</p>
            <button>Connect Wallet to Unlock</button>
          </div>
        )
      ) : (
        <div>{post.content}</div>
      )}

      {/* Tipping button */}
      <button
        onClick={() => sendTip(post.authorAddress, '10', 'Great post!')}
        disabled={tippingLoading}
      >
        {tippingLoading ? 'Sending...' : '💸 Tip 10 LDAO'}
      </button>
    </div>
  );
}
```

### Step 3: Optimize Feed with Batch Loading

```typescript
function FeedPage({ posts }) {
  // Extract all unique author addresses
  const authorAddresses = [...new Set(posts.map(p => p.authorAddress))];

  // Batch load all profiles
  const { profiles, loading } = useBatchUserProfiles(authorAddresses);

  return (
    <div>
      {posts.map(post => (
        <EnhancedPostCard
          key={post.id}
          post={post}
          authorProfile={profiles.get(post.authorAddress)}
        />
      ))}
    </div>
  );
}
```

---

## 🎯 Common Use Cases

### 1. Token-Gated Premium Content

```typescript
// Post object structure
const post = {
  id: '123',
  content: 'Full premium content here...',
  preview: 'This is a preview...',
  isTokenGated: true,
  tokenGating: {
    requirement: {
      type: 'token_balance',
      minimumAmount: '1000' // Requires 1000 LDAO
    }
  }
};

// Component usage
const { hasAccess, reason } = usePostTokenGating(post.tokenGating.requirement);

// Display
{hasAccess ? (
  <div>{post.content}</div>
) : (
  <LockedContent
    preview={post.preview}
    requirement={`Need ${post.tokenGating.requirement.minimumAmount} LDAO`}
  />
)}
```

### 2. NFT-Gated Exclusive Content

```typescript
const post = {
  tokenGating: {
    requirement: {
      type: 'nft_ownership',
      nftContract: '0x...', // NFT collection address
      tokenId: '42' // Optional: specific NFT
    }
  }
};

const { hasAccess, reason } = usePostTokenGating(post.tokenGating.requirement);

{!hasAccess && (
  <div>
    🎨 NFT Holders Only
    <p>{reason}</p>
    <a href="/marketplace">Get NFT</a>
  </div>
)}
```

### 3. Reputation-Gated Content

```typescript
const post = {
  tokenGating: {
    requirement: {
      type: 'reputation',
      minimumAmount: '100' // Need 100 reputation
    }
  }
};
```

### 4. Staking-Gated Content

```typescript
const post = {
  tokenGating: {
    requirement: {
      type: 'staking',
      minimumAmount: '5000' // Need 5000 LDAO staked
    }
  }
};
```

---

## 🏆 Tier System Reference

### Token Tiers

| Tier | Icon | Balance | Color |
|------|------|---------|-------|
| Whale | 🐋 | 100,000+ | Purple |
| Dolphin | 🐬 | 50,000+ | Blue |
| Fish | 🐟 | 10,000+ | Green |
| Shrimp | 🦐 | 1,000+ | Orange |
| Member | 👤 | 0+ | Gray |

### Reputation Tiers

| Tier | Icon | Reputation | Color |
|------|------|------------|-------|
| Legendary | 👑 | 10,000+ | Red |
| Expert | ⭐ | 5,000+ | Purple |
| Trusted | ✓ | 1,000+ | Green |
| Contributor | 📝 | 100+ | Blue |
| Active | 🔥 | 10+ | Orange |
| New | 🌱 | 0+ | Gray |

---

## 🎨 Ready-to-Use Components

### Token Tier Badge

```typescript
function TokenTierBadge({ userAddress }: { userAddress: string }) {
  const { tokenTierConfig } = useTokenTierDisplay(userAddress);

  if (!tokenTierConfig) return null;

  return (
    <span
      className="tier-badge"
      style={{
        color: tokenTierConfig.color,
        backgroundColor: tokenTierConfig.bgColor,
        padding: '2px 8px',
        borderRadius: '12px',
        fontSize: '12px',
        fontWeight: 600
      }}
    >
      {tokenTierConfig.icon} {tokenTierConfig.label}
    </span>
  );
}
```

### Reputation Display

```typescript
function ReputationBadge({ userAddress }: { userAddress: string }) {
  const { profile, reputationTierConfig } = useTokenTierDisplay(userAddress);

  if (!profile || !reputationTierConfig) return null;

  return (
    <div className="reputation-badge">
      <span
        style={{
          color: reputationTierConfig.color,
          backgroundColor: reputationTierConfig.bgColor,
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: '11px'
        }}
      >
        {reputationTierConfig.icon} {profile.reputation}
      </span>
      <span className="reputation-tier">{reputationTierConfig.label}</span>
    </div>
  );
}
```

### Tip Modal

```typescript
function TipModal({ recipientAddress, onClose }) {
  const [amount, setAmount] = useState('10');
  const [message, setMessage] = useState('');
  const { sendTip, loading, txHash } = useFeedTipping();

  const handleTip = async () => {
    try {
      await sendTip(recipientAddress, amount, message);
      alert(`Tip sent! TX: ${txHash}`);
      onClose();
    } catch (error) {
      alert('Failed to send tip');
    }
  };

  return (
    <div className="modal">
      <h3>Send Tip</h3>
      <input
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount (LDAO)"
      />
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Optional message"
      />
      <button onClick={handleTip} disabled={loading}>
        {loading ? 'Sending...' : `Send ${amount} LDAO`}
      </button>
      <button onClick={onClose}>Cancel</button>
    </div>
  );
}
```

### Locked Content Card

```typescript
function LockedPostCard({ post }) {
  const { hasAccess, reason } = usePostTokenGating(post.tokenGating.requirement);

  return (
    <div className="post-card locked">
      <div className="preview">{post.preview}</div>

      {!hasAccess && (
        <div className="lock-overlay">
          <div className="lock-icon">🔒</div>
          <h4>Premium Content</h4>
          <p>{reason}</p>

          <div className="unlock-actions">
            <button>Connect Wallet</button>
            <button>Get Tokens</button>
          </div>
        </div>
      )}

      {hasAccess && (
        <div className="full-content">{post.content}</div>
      )}
    </div>
  );
}
```

---

## 📊 Analytics Tracking

```typescript
// Track when users view token-gated content
const { hasAccess } = usePostTokenGating(requirement);

useEffect(() => {
  if (hasAccess) {
    analytics.track('token_gated_content_viewed', {
      postId: post.id,
      gatingType: requirement.type,
      minimumAmount: requirement.minimumAmount
    });
  }
}, [hasAccess]);

// Track tips
const { sendTip } = useFeedTipping();

const handleTip = async (amount: string) => {
  const result = await sendTip(recipientAddress, amount);

  analytics.track('tip_sent', {
    amount,
    txHash: result.txHash,
    recipient: recipientAddress
  });
};
```

---

## 🔧 Environment Setup

```bash
# .env.local
NEXT_PUBLIC_LDAO_TOKEN_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
NEXT_PUBLIC_REPUTATION_ADDRESS=0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9
NEXT_PUBLIC_GOVERNANCE_ADDRESS=0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9
NEXT_PUBLIC_CHAIN_ID=31337
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545
```

---

## ⚡ Performance Tips

### 1. Batch Load Profiles
```typescript
// ✅ Good: Load all at once
const { profiles } = useBatchUserProfiles(allUserAddresses);

// ❌ Bad: Load individually
posts.forEach(post => {
  useUserBlockchainProfile(post.authorAddress); // Too many calls!
});
```

### 2. Cache Aggressively
```typescript
// Cache profiles for 5 minutes
const CACHE_TTL = 5 * 60 * 1000;

// Check cache before fetching
const cached = localStorage.getItem(`profile_${address}`);
if (cached) {
  const { data, timestamp } = JSON.parse(cached);
  if (Date.now() - timestamp < CACHE_TTL) {
    return data;
  }
}
```

### 3. Lazy Load
```typescript
// Only load when visible
import { useInView } from 'react-intersection-observer';

const { ref, inView } = useInView({ triggerOnce: true });
const { profile } = useUserBlockchainProfile(
  inView ? userAddress : undefined
);
```

---

## 🐛 Troubleshooting

### Profile Not Loading?
```typescript
// Check wallet connection
const { isConnected } = useAccount();
if (!isConnected) {
  console.log('Wallet not connected');
}

// Check contract addresses
console.log('LDAO:', process.env.NEXT_PUBLIC_LDAO_TOKEN_ADDRESS);
console.log('Reputation:', process.env.NEXT_PUBLIC_REPUTATION_ADDRESS);
```

### Tipping Fails?
```typescript
// Check user has sufficient balance
const balance = await ldaoToken.balanceOf(userAddress);
console.log('User balance:', ethers.formatEther(balance));

// Check allowance
const allowance = await ldaoToken.allowance(userAddress, recipientAddress);
```

### Token-Gating Not Working?
```typescript
// Check requirement format
const requirement = {
  type: 'token_balance', // Must be exact
  minimumAmount: '1000'  // Must be string
};

// Check user's actual balance
const result = await feedBlockchainService.checkPostAccess(
  userAddress,
  requirement
);
console.log('Has access:', result.hasAccess);
console.log('Reason:', result.reason);
```

---

## 🎊 You're Ready!

Your feed now has **full blockchain integration** with:

✅ Token-gated content
✅ On-chain reputation display
✅ NFT profile pictures
✅ Real blockchain tipping
✅ Token tier indicators
✅ Weighted engagement scoring
✅ Batch performance optimization

**Start integrating into your existing components now!** 🚀

For detailed documentation, see:
- `FEED_BLOCKCHAIN_USE_CASES.md` - Full assessment
- `FEED_BLOCKCHAIN_IMPLEMENTATION.md` - Complete implementation guide
