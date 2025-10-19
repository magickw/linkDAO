# Notification Delivery System Documentation

## Overview

The notification delivery system provides comprehensive email and push notification capabilities for the LinkDAO communities platform. The system supports multiple notification channels (email, push, in-app) with user preferences and granular control over notification types.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│         Community Notification Service              │
│  (Orchestrates all notification channels)           │
└─────────────────┬───────────────────────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
┌───────▼────────┐  ┌───────▼────────┐
│ Email Service  │  │  Push Service  │
│   (Resend)     │  │   (Firebase)   │
└────────────────┘  └────────────────┘
```

## Services

### 1. Email Service (`emailService.ts`)

**Purpose**: Handles email delivery using Resend API

**Features**:
- Beautiful HTML email templates
- Community-specific branding (avatar, colors)
- Template types:
  - Welcome/Join emails
  - New post notifications
  - Comment notifications
  - Governance proposal notifications
  - Moderation action notifications
  - Role change notifications

**Configuration**:
```env
RESEND_API_KEY=re_xxxxxxxxxxxxx
FROM_EMAIL=noreply@linkdao.app
```

**Usage**:
```typescript
import emailService from './services/emailService';

await emailService.sendCommunityJoinEmail('user@example.com', {
  communityName: 'DeFi Traders',
  communityAvatar: 'https://...',
  actionUrl: '/communities/defi-traders',
});
```

### 2. Push Notification Service (`pushNotificationService.ts`)

**Purpose**: Handles push notifications using Firebase Cloud Messaging (FCM)

**Features**:
- iOS, Android, and Web push support
- Batch sending (up to 500 tokens per request)
- Automatic invalid token cleanup
- Rich notifications with images and actions
- Badge count management

**Configuration**:

Option 1: Using service account file
```env
FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/firebase-service-account.json
```

Option 2: Using JSON string (recommended for production)
```env
FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"..."}'
```

**Usage**:
```typescript
import pushNotificationService from './services/pushNotificationService';

// Send to single user
await pushNotificationService.sendToUser('0x123...', {
  title: 'New Post',
  body: 'Someone posted in DeFi Traders',
  actionUrl: '/communities/defi-traders/posts/123',
});

// Register device token
await pushNotificationService.registerToken(
  '0x123...',
  'fcm-device-token',
  'ios'
);
```

### 3. Community Notification Service (`communityNotificationService.ts`)

**Purpose**: High-level orchestration service that combines email and push notifications

**Features**:
- Unified interface for sending notifications
- Respects user preferences
- Supports bulk notifications
- Helper methods for common notification scenarios

**Notification Types**:
- `community_join` - Welcome message when joining
- `new_post` - New posts in communities
- `new_comment` / `post_reply` / `comment_reply` - Comment notifications
- `post_upvote` / `comment_upvote` - Voting notifications
- `mention` - Mentions in posts/comments
- `governance_proposal` / `governance_vote` / `governance_passed` / `governance_executed` - Governance notifications
- `moderation_action` / `moderation_warning` / `moderation_ban` - Moderation notifications
- `role_change` / `role_promotion` - Role updates
- `community_announcement` - Important announcements

**Usage**:
```typescript
import communityNotificationService from './services/communityNotificationService';

// Send notification to user
await communityNotificationService.sendNotification({
  userAddress: '0x123...',
  communityId: 'defi-traders',
  communityName: 'DeFi Traders',
  type: 'new_post',
  title: 'New post in DeFi Traders',
  message: 'Alice posted: Trading strategies for 2025',
  actionUrl: '/communities/defi-traders/posts/123',
  userName: 'Alice',
  contentPreview: 'Trading strategies for 2025...',
});

// Helper methods
await communityNotificationService.notifyUserJoinedCommunity(
  '0x123...',
  'defi-traders',
  'DeFi Traders'
);

await communityNotificationService.notifyNewPost(
  ['0x123...', '0x456...'], // multiple users
  'defi-traders',
  'DeFi Traders',
  'post-123',
  'Alice',
  'Trading strategies for 2025'
);
```

## API Endpoints

### Get Notification Preferences
```
GET /api/notification-preferences
Authorization: Bearer <token>

Response:
{
  "success": true,
  "preferences": {
    "email": true,
    "push": true,
    "inApp": true,
    "types": [
      "community_join",
      "new_post",
      "governance_proposal",
      ...
    ]
  }
}
```

### Update Notification Preferences
```
PUT /api/notification-preferences
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": true,
  "push": false,
  "inApp": true,
  "types": ["new_post", "governance_proposal"]
}

Response:
{
  "success": true,
  "preferences": { ... }
}
```

### Register Push Token
```
POST /api/notification-preferences/push-token
Authorization: Bearer <token>
Content-Type: application/json

{
  "token": "fcm-device-token-here",
  "platform": "ios" // "ios" | "android" | "web"
}

Response:
{
  "success": true,
  "message": "Push token registered successfully"
}
```

### Unregister Push Token
```
DELETE /api/notification-preferences/push-token
Authorization: Bearer <token>
Content-Type: application/json

{
  "token": "fcm-device-token-here"
}

Response:
{
  "success": true,
  "message": "Push token unregistered successfully"
}
```

### Test Notification (Debug Only)
```
POST /api/notification-preferences/test
Authorization: Bearer <token>
Content-Type: application/json

{
  "type": "email" // "email" | "push" | "both"
}

Response:
{
  "success": true,
  "message": "Test email notification sent"
}
```

## Database Schema

### notifications table
```sql
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  order_id VARCHAR(64),
  user_address VARCHAR(66) NOT NULL,
  type VARCHAR(64) NOT NULL,
  message TEXT NOT NULL,
  metadata TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### notification_preferences table
```sql
CREATE TABLE notification_preferences (
  id SERIAL PRIMARY KEY,
  user_address VARCHAR(66) NOT NULL UNIQUE,
  preferences TEXT NOT NULL, -- JSON string
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### push_tokens table
```sql
CREATE TABLE push_tokens (
  id SERIAL PRIMARY KEY,
  user_address VARCHAR(66) NOT NULL,
  token VARCHAR(255) NOT NULL,
  platform VARCHAR(32) NOT NULL, -- 'ios', 'android', 'web'
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Environment Variables

### Required for Email Notifications

```env
# Resend API Key
# Get from: https://resend.com/api-keys
RESEND_API_KEY=re_xxxxxxxxxxxxx

# From email address (must be verified in Resend)
FROM_EMAIL=noreply@linkdao.app
```

### Required for Push Notifications

**Option 1: Service Account File Path**
```env
# Path to Firebase service account JSON file
FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/firebase-service-account.json
```

**Option 2: Service Account JSON (Recommended for Production)**
```env
# Firebase service account as JSON string
FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account","project_id":"your-project","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"..."}'
```

## Setup Instructions

### 1. Email Setup (Resend)

1. Sign up at https://resend.com
2. Verify your domain or use `onboarding@resend.dev` for testing
3. Create an API key
4. Add to `.env`:
   ```env
   RESEND_API_KEY=re_xxxxxxxxxxxxx
   FROM_EMAIL=noreply@yourdomain.com
   ```

### 2. Push Notification Setup (Firebase)

1. Go to https://console.firebase.google.com
2. Create a new project or use existing
3. Go to Project Settings > Service Accounts
4. Click "Generate new private key"
5. Download the JSON file
6. Either:
   - Save file and set `FIREBASE_SERVICE_ACCOUNT_PATH` in `.env`
   - Or convert to string: `cat firebase-key.json | jq -c` and set `FIREBASE_SERVICE_ACCOUNT_JSON`

**Frontend Setup (Web Push)**:
```typescript
// In your frontend, request permission and get token
import { getMessaging, getToken } from 'firebase/messaging';

const messaging = getMessaging();
const token = await getToken(messaging, {
  vapidKey: 'your-vapid-key'
});

// Register token with backend
await fetch('/api/notification-preferences/push-token', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    token,
    platform: 'web'
  })
});
```

## Integration Examples

### Example 1: Notify when user joins community

```typescript
// In communityService.ts joinCommunity method
import communityNotificationService from './communityNotificationService';

async joinCommunity(userId: string, communityId: string) {
  // ... existing join logic ...

  // Send welcome notification
  await communityNotificationService.notifyUserJoinedCommunity(
    userId,
    communityId,
    community.name,
    community.avatar
  );
}
```

### Example 2: Notify on new post

```typescript
// In communityService.ts createCommunityPost method
async createCommunityPost(postData: PostData) {
  // ... create post ...

  // Get all community members
  const members = await this.getCommunityMembers(postData.communityId);
  const memberAddresses = members
    .filter(m => m.userAddress !== postData.authorAddress)
    .map(m => m.userAddress);

  // Notify members
  await communityNotificationService.notifyNewPost(
    memberAddresses,
    postData.communityId,
    community.name,
    post.id,
    author.name,
    post.title,
    community.avatar
  );
}
```

### Example 3: Notify on governance proposal

```typescript
// In communityService.ts createGovernanceProposal method
async createGovernanceProposal(proposalData: ProposalData) {
  // ... create proposal ...

  // Get all community members
  const members = await this.getCommunityMembers(proposalData.communityId);
  const memberAddresses = members.map(m => m.userAddress);

  // Notify all members
  await communityNotificationService.notifyGovernanceProposal(
    memberAddresses,
    proposalData.communityId,
    community.name,
    proposal.id,
    proposal.title,
    proposer.name,
    community.avatar
  );
}
```

## Testing

### Test Email Notifications
```bash
curl -X POST http://localhost:10000/api/notification-preferences/test \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type": "email"}'
```

### Test Push Notifications
```bash
curl -X POST http://localhost:10000/api/notification-preferences/test \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type": "push"}'
```

### Test Both
```bash
curl -X POST http://localhost:10000/api/notification-preferences/test \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type": "both"}'
```

## Troubleshooting

### Email not sending
- Check `RESEND_API_KEY` is set correctly
- Verify domain in Resend dashboard
- Check console logs for `[EmailService]` messages
- Use `onboarding@resend.dev` for testing without domain verification

### Push notifications not working
- Check Firebase service account is configured
- Verify token registration in `push_tokens` table
- Check Firebase Console > Cloud Messaging for errors
- Ensure frontend has requested notification permission
- Check console logs for `[PushNotificationService]` messages

### Users not receiving notifications
- Check user preferences in database
- Verify notification type is enabled in user's preferences
- Check user has valid email or push token
- Review server logs for delivery errors

## Performance Considerations

### Batch Processing
- Email service sends one email at a time
- Push service batches up to 500 tokens per request
- Use bulk notification methods for sending to multiple users

### Rate Limiting
- Resend: 10 emails/second (free tier), 100/second (paid)
- Firebase: 2,500 messages/second per project
- Consider queueing for large notification batches

### Caching
- User preferences are fetched per notification
- Consider caching frequently accessed preferences
- Push tokens are cached by Firebase SDK

## Security

### API Keys
- Never commit API keys to version control
- Use environment variables
- Rotate keys periodically

### User Data
- Email addresses are not exposed in API responses
- Push tokens are device-specific and revokable
- Notification preferences are user-private

### Input Validation
- All notification content is sanitized
- User preferences are validated before saving
- Push tokens are validated before storage

## Future Enhancements

- [ ] SMS notifications via Twilio
- [ ] Webhook notifications for integrations
- [ ] Notification batching/digests (e.g., daily summary)
- [ ] A/B testing for notification templates
- [ ] Rich push notifications with images
- [ ] Notification analytics and tracking
- [ ] Multi-language support for templates
- [ ] Notification scheduling/delayed delivery
