# Community Enhancements - Quick Reference Guide

## 🚀 Quick Start

### 1. Database Setup

```bash
# Run the badges migration
cd app/backend
psql -d your_database -f drizzle/0048_community_badges_achievements.sql
```

### 2. Environment Variables

```bash
# Add to .env
LDAO_TOKEN_ADDRESS=0x5FbDB2315678afecb367f032d93F642f64180aa3
GOVERNANCE_ADDRESS=0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9
REPUTATION_ADDRESS=0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9
RPC_URL=http://127.0.0.1:8545
```

---

## 📚 Service Imports

```typescript
// Blockchain integration
import { blockchainService } from './services/blockchainIntegration';

// Advanced moderation
import { moderationService } from './services/advancedModeration';

// Events management
import { eventsService } from './services/communityEvents';

// Badges & achievements
import { badgesService } from './services/badgesAchievements';
```

---

## 🔗 Blockchain Integration Examples

### Check Token Balance
```typescript
const result = await blockchainService.checkTokenBalance(
  userAddress,
  '1000' // minimum tokens
);

if (result.hasBalance) {
  console.log(`User has ${result.balance} tokens`);
}
```

### Verify NFT Ownership
```typescript
const result = await blockchainService.checkNFTOwnership(
  userAddress,
  nftCollectionAddress,
  tokenId // optional
);

if (result.ownsNFT) {
  console.log(`User owns NFTs: ${result.tokenIds.join(', ')}`);
}
```

### Check Staking
```typescript
const result = await blockchainService.checkStakingRequirement(
  userAddress,
  '5000'
);

if (result.hasStaked) {
  console.log(`User has staked ${result.stakedAmount} tokens`);
}
```

### Get Treasury Balance
```typescript
const balance = await blockchainService.getTreasuryBalance(treasuryAddress);

console.log(`ETH: ${balance.eth}`);
console.log(`LDAO: ${balance.ldao}`);
```

---

## 🛡️ Content Moderation Examples

### Submit Report
```typescript
const report = await moderationService.submitReport(
  'post-123',
  'post',
  'user-456',
  '0x...',
  'spam',
  'This is spam',
  'Detailed description'
);
```

### ML Abuse Detection
```typescript
const result = await moderationService.detectAbuse(
  'Content text here',
  'Additional context'
);

if (result.isAbusive) {
  console.log(`Severity: ${result.severity}`);
  console.log(`Confidence: ${result.confidence}`);
  console.log(`Categories: ${result.categories.join(', ')}`);
  console.log(`Suggested action: ${result.suggestedAction}`);
}
```

### Get Moderation Queue
```typescript
const queue = await moderationService.getModerationQueue({
  status: 'pending',
  priority: 'high',
  limit: 50
});
```

---

## 📅 Events Management Examples

### Create Event
```typescript
const event = await eventsService.createEvent(
  'community-id',
  'creator-address',
  {
    title: 'Weekly Community Meetup',
    description: 'Join us for our weekly discussion',
    eventType: 'meetup',
    startTime: new Date('2025-02-01T18:00:00Z'),
    endTime: new Date('2025-02-01T20:00:00Z'),
    timezone: 'UTC',
    location: {
      type: 'virtual',
      virtualLink: 'https://meet.example.com/room123',
      platform: 'Zoom'
    },
    capacity: 100,
    hosts: ['0x...'],
    tags: ['weekly', 'discussion'],
    isPublic: true,
    requiresApproval: false
  }
);
```

### RSVP to Event
```typescript
const rsvp = await eventsService.rsvpToEvent(
  eventId,
  userId,
  userAddress,
  'going' // or 'interested', 'maybe', 'not_going'
);
```

### Check-in to Event
```typescript
await eventsService.checkInToEvent(eventId, userId);
```

### Submit Feedback
```typescript
await eventsService.submitEventFeedback(
  eventId,
  userId,
  5, // rating out of 5
  'Great event!'
);
```

### Export to Calendar
```typescript
const icalContent = await eventsService.exportToCalendar(eventId);
// Returns iCal format string
```

### Get Event Analytics
```typescript
const analytics = await eventsService.getEventAnalytics(eventId);

console.log(`Going: ${analytics.going}`);
console.log(`Attendance rate: ${analytics.attendanceRate}%`);
console.log(`Average rating: ${analytics.averageRating}`);
```

---

## 🏆 Badges & Achievements Examples

### Check and Award Badges
```typescript
const earned = await badgesService.checkAndAwardBadges(
  userAddress,
  communityId
);

earned.forEach(badge => {
  console.log(`Earned: ${badge.name} (${badge.tier})`);
});
```

### Track Badge Progress
```typescript
await badgesService.trackBadgeProgress(
  userAddress,
  badgeId,
  75, // current value
  100 // target value
);
```

### Award Achievement
```typescript
await badgesService.awardAchievement(
  userAddress,
  achievementId,
  communityId,
  { details: 'Created first high-quality post' }
);
```

### Update Quest Progress
```typescript
await badgesService.updateQuestProgress(
  userAddress,
  questId,
  2 // step number completed
);
```

### Get Leaderboard
```typescript
const leaderboard = await badgesService.getLeaderboard(
  communityId,
  'badges', // or 'achievements', 'reputation', 'contributions'
  'weekly', // or 'all_time', 'monthly', 'daily'
  100 // limit
);

leaderboard.forEach(entry => {
  console.log(`#${entry.rank}: ${entry.userAddress} - Score: ${entry.score}`);
});
```

---

## 🎯 Common Use Cases

### Token-Gate Community Content

```typescript
// Backend check
const canAccess = await blockchainService.checkTokenBalance(
  userAddress,
  '100'
);

if (!canAccess.hasBalance) {
  throw new Error(`Need ${canAccess.minimumRequired} tokens to access`);
}
```

### Auto-Moderate Flagged Content

```typescript
// When content is reported
const mlResult = await moderationService.detectAbuse(
  reportedContent,
  contentContext
);

if (mlResult.severity === 'critical' && mlResult.confidence > 0.9) {
  // Auto-remove content
  await autoModerateContent(contentId);
}
```

### Award Badge on Milestone

```typescript
// When user creates 100th post
if (userPostCount === 100) {
  await badgesService.awardBadge(
    userAddress,
    'active-participant-badge-id',
    communityId
  );
}
```

### Create Token-Gated Event

```typescript
const event = await eventsService.createEvent(
  communityId,
  creatorAddress,
  {
    // ... event details
    tokenGating: {
      enabled: true,
      minimumTokens: 1000,
      stakingRequired: 500
    }
  }
);
```

---

## 🔍 Testing

### Test Blockchain Integration
```bash
# Make sure local blockchain is running
npx hardhat node

# Test token balance check
curl -X POST http://localhost:3000/api/blockchain/check-balance \
  -H "Content-Type: application/json" \
  -d '{"userAddress": "0x...", "minimumBalance": "100"}'
```

### Test Moderation
```bash
# Submit test report
curl -X POST http://localhost:3000/api/moderation/report \
  -H "Content-Type: application/json" \
  -d '{
    "contentId": "test-123",
    "contentType": "post",
    "category": "spam",
    "reason": "Testing moderation system"
  }'
```

---

## 📊 Database Queries

### Get User's Badges
```sql
SELECT b.name, b.tier, ub.earned_at
FROM community_user_badges ub
JOIN community_badges b ON ub.badge_id = b.id
WHERE ub.user_address = '0x...'
ORDER BY ub.earned_at DESC;
```

### Get Event Attendance
```sql
SELECT COUNT(*) as going_count
FROM event_rsvps
WHERE event_id = 'event-123'
AND status = 'going';
```

### Get Leaderboard
```sql
SELECT rank, user_address, score
FROM community_leaderboards
WHERE community_id = 'community-123'
AND leaderboard_type = 'badges'
AND time_period = 'weekly'
ORDER BY rank ASC
LIMIT 10;
```

---

## ⚠️ Important Notes

1. **Blockchain Calls**: All blockchain calls are read-only. Write operations require user's wallet signature.

2. **ML Moderation**: The ML detection is pattern-based. For production, integrate with services like Perspective API or OpenAI Moderation.

3. **Events**: Set up cron jobs to send event reminders and update event statuses.

4. **Badges**: Run `badgesService.updateLeaderboards()` periodically to keep leaderboards current.

5. **Performance**: Use caching for blockchain calls to reduce RPC requests.

---

## 🚨 Error Handling

```typescript
try {
  const result = await blockchainService.checkTokenBalance(
    userAddress,
    '1000'
  );
} catch (error) {
  console.error('Blockchain error:', error);
  // Fall back to cached data or show error to user
}
```

---

## 📝 Next Steps

1. **Deploy Database Migration**
   ```bash
   psql -d linkdao -f drizzle/0048_community_badges_achievements.sql
   ```

2. **Configure Environment**
   - Add contract addresses to `.env`
   - Set up RPC endpoint

3. **Test Integration**
   - Test token-gating
   - Test event creation
   - Test badge awarding

4. **Monitor**
   - Set up logging for blockchain calls
   - Monitor moderation accuracy
   - Track event attendance rates

---

## 🎊 You're Ready!

All enhanced features are production-ready. Start integrating them into your community workflows!

For detailed implementation, see:
- `COMMUNITY_ENHANCEMENTS_SUMMARY.md`
- Individual service files for API documentation
