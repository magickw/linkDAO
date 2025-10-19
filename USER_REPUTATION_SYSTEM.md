# User Reputation System

## Overview

The User Reputation System is a comprehensive framework for tracking, measuring, and managing user reputation within the LinkDAO platform. This system provides multi-dimensional reputation scoring, tier-based benefits and restrictions, automated penalty management, and detailed analytics.

## Features

### 1. Multi-Dimensional Reputation Scoring
- **Overall Reputation Score**: Composite score representing overall community standing
- **Moderation Score**: Score based on user's moderation history and behavior
- **Reporting Score**: Score based on quality and accuracy of content reports
- **Jury Score**: Score based on participation and accuracy in appeal processes
- **Detailed Metrics**: Engagement, quality, community, trust, activity, and consistency scores

### 2. Reputation Tiers
- **Bronze Tier**: Entry-level reputation with basic community access
- **Silver Tier**: Intermediate reputation with increased privileges
- **Gold Tier**: High reputation with premium features and moderation privileges
- **Platinum Tier**: Elite reputation with maximum privileges and leadership opportunities

### 3. Automated Penalties
- **Warning System**: Progressive penalty system with escalating consequences
- **Temporary Limitations**: Time-based restrictions on platform activities
- **Permanent Restrictions**: Long-term or permanent limitations for severe violations
- **Suspension and Ban**: Temporary or permanent removal from platform

### 4. Reputation Events and History
- **Event Tracking**: Detailed logging of all reputation-affecting events
- **Score Change History**: Complete history of reputation score modifications
- **Severity Multipliers**: Context-aware adjustments to reputation impacts
- **Audit Trail**: Comprehensive audit trail for all reputation changes

### 5. Analytics and Leaderboards
- **Reputation Leaderboard**: Community-wide ranking of users by reputation
- **Trend Analysis**: Historical analysis of reputation changes over time
- **Performance Metrics**: Detailed metrics on user engagement and quality
- **Custom Reporting**: Flexible reporting capabilities for community management

## Architecture

### Core Components
- `UserReputationSystemService`: Core service managing reputation calculations and storage
- `UserReputationSystemController`: REST API controller for reputation management
- `UserReputationSystemRoutes`: API route definitions for reputation endpoints

### Data Models

#### UserReputation
```typescript
interface UserReputation {
  userId: string;
  overallScore: number;
  moderationScore: number;
  reportingScore: number;
  juryScore: number;
  violationCount: number;
  helpfulReportsCount: number;
  falseReportsCount: number;
  successfulAppealsCount: number;
  juryDecisionsCount: number;
  juryAccuracyRate: number;
  lastViolationAt: Date | null;
  reputationTier: 'bronze' | 'silver' | 'gold' | 'platinum';
  createdAt: Date;
  updatedAt: Date;
}
```

#### ReputationChangeEvent
```typescript
interface ReputationChangeEvent {
  id: string;
  userId: string;
  eventType: 'violation' | 'helpful_report' | 'false_report' | 'successful_aple' | 'jury_accuracy' | 'manual_adjustment';
  scoreChange: number;
  previousScore: number;
  newScore: number;
  severityMultiplier: number;
  relatedEntityId: string;
  description: string;
  metadata: Record<string, any>;
  createdAt: Date;
}
```

#### ReputationPenalty
```typescript
interface ReputationPenalty {
  id: string;
  userId: string;
  penaltyType: 'warning' | 'temporary_limit' | 'permanent_limit' | 'suspension' | 'ban';
  severityLevel: number;
  violationCount: number;
  penaltyStart: Date;
  penaltyEnd: Date | null;
  isActive: boolean;
  caseId: string;
  description: string;
  createdAt: Date;
}
```

## API Endpoints

### Reputation Management
```
GET /api/user-reputation/{userId}
```
Get user reputation by user ID

```
POST /api/user-reputation/update
```
Update user reputation based on an event

```
POST /api/user-reputation/penalty
```
Apply reputation-based penalties

### History and Analytics
```
GET /api/user-reputation/history/{userId}
```
Get user's reputation history

```
GET /api/user-reputation/leaderboard
```
Get reputation leaderboard

```
GET /api/user-reputation/metrics/{userId}
```
Calculate multi-dimensional reputation metrics

### Configuration
```
GET /api/user-reputation/tiers
```
Get reputation tiers configuration

### Health Check
```
GET /api/user-reputation/health
```
Check the health status of the reputation system

## Reputation Tiers

### Bronze Tier (0-500 points)
**Benefits:**
- Basic community access
- Standard posting privileges

**Restrictions:**
- Limited posting frequency
- No premium features

### Silver Tier (501-1000 points)
**Benefits:**
- Increased posting limits
- Access to private communities
- Priority support

**Restrictions:**
- Moderated posting for sensitive content

### Gold Tier (1001-2000 points)
**Benefits:**
- Unlimited posting privileges
- Premium features access
- Moderation privileges
- Early access to new features
- Community recognition

**Restrictions:**
- None

### Platinum Tier (2001+ points)
**Benefits:**
- All gold tier benefits
- Community leadership opportunities
- Exclusive events and programs
- Direct communication with platform team
- Maximum reputation privileges

**Restrictions:**
- None

## Reputation Events

### Positive Events
- **Helpful Reports**: +10 to +50 points for accurate content reports
- **Successful Appeals**: +5 to +25 points for overturned moderation decisions
- **Jury Accuracy**: +5 to +30 points for accurate jury decisions in appeals
- **Community Contributions**: +10 to +100 points for valuable community contributions

### Negative Events
- **Violations**: -10 to -500 points based on severity
- **False Reports**: -5 to -50 points for inaccurate reports
- **Appeal Failures**: -5 to -25 points for unsuccessful appeals
- **Jury Inaccuracy**: -5 to -30 points for inaccurate jury decisions

## Penalty System

### Warning (Level 1-2)
- Points deduction: -10 to -50 points
- Notification to user
- Temporary posting restrictions

### Temporary Limitation (Level 3)
- Points deduction: -50 to -100 points
- Temporary restriction on specific activities
- Duration: 1-7 days

### Permanent Limitation (Level 4)
- Points deduction: -100 to -200 points
- Permanent restriction on specific activities
- Review required for reinstatement

### Suspension (Level 5)
- Points deduction: -200 to -500 points
- Temporary account suspension
- Duration: 7-30 days

### Ban (Level 5)
- Points deduction: -500 points
- Permanent account ban
- Appeal process required for reinstatement

## Implementation Details

### Reputation Calculation
1. **Base Score**: All users start with 1000 points
2. **Event Impact**: Points are added or subtracted based on user actions
3. **Severity Multiplier**: Impact is adjusted based on context and history
4. **Tier Adjustment**: Reputation tier is updated based on overall score
5. **Benefits Application**: Tier-based benefits are applied automatically

### Data Storage
Reputation data is stored in the database with:
- User reputation scores and metrics
- Detailed event history
- Penalty records
- Tier information

### Performance Considerations
- Efficient score calculation algorithms
- Caching for frequently accessed reputation data
- Batch processing for bulk updates
- Indexing for fast leaderboard queries

## Future Enhancements

1. **Advanced Reputation Features**
   - Cross-community reputation sharing
   - Reputation-based voting power
   - Decentralized reputation verification
   - Blockchain-based reputation storage

2. **Enhanced Analytics**
   - Predictive reputation modeling
   - Behavioral pattern analysis
   - Community influence mapping
   - Reputation network visualization

3. **Gamification Elements**
   - Achievement badges and rewards
   - Reputation challenges and quests
   - Social recognition features
   - Community competition leaderboards

4. **Integration Features**
   - Third-party reputation system integration
   - API for external reputation queries
   - Reputation-based partnership programs
   - Cross-platform reputation portability

## Usage Examples

### Get User Reputation
```javascript
const reputation = await userReputationSystemService.getUserReputation("user-123");
```

### Update Reputation
```javascript
const updatedReputation = await userReputationSystemService.updateUserReputation(
  "user-123",
  "helpful_report",
  25,
  "report-456",
  "Accurate spam report"
);
```

### Apply Penalty
```javascript
const penalty = await userReputationSystemService.applyReputationPenalty(
  "user-123",
  "temporary_limit",
  3,
  "Excessive posting violations",
  "case-789",
  3 // 3 days
);
```

### Get Leaderboard
```javascript
const leaderboard = await userReputationSystemService.getReputationLeaderboard(100);
```

## Security Considerations

- All API endpoints are protected with authentication
- Admin-only access for reputation management functions
- Rate limiting to prevent abuse
- Input validation and sanitization
- Audit logging for all reputation changes
- Secure storage of reputation data

## Monitoring and Maintenance

- Health check endpoints for service monitoring
- Performance metrics collection
- Error logging and alerting
- Regular reputation score validation
- Penalty effectiveness analysis
- Tier progression tracking