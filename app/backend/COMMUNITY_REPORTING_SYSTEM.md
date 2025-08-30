# Community Reporting System

## Overview

The Community Reporting System is a comprehensive solution for handling user-generated reports of harmful content. It implements reputation-based weighting, automatic escalation, anti-abuse measures, and comprehensive analytics.

## Features

### ✅ Implemented Features

1. **Report Submission API** - Users can report content with validation and rate limiting
2. **Reporter Reputation Weighting** - Report weights are adjusted based on user reputation and history
3. **Report Aggregation Logic** - Automatic escalation when weighted reports exceed thresholds
4. **Status Tracking** - Real-time status updates and feedback mechanisms
5. **Anti-Abuse Measures** - Detection and prevention of false reporting patterns
6. **Comprehensive Testing** - Full test suite covering all functionality

## API Endpoints

### Public Endpoints

#### Submit Report
```http
POST /api/reports/submit
Authorization: Bearer <token>
Content-Type: application/json

{
  "contentId": "content-123",
  "contentType": "post",
  "reason": "spam",
  "details": "This content is clearly spam",
  "category": "spam"
}
```

#### Get User Reports
```http
GET /api/reports/my-reports?page=1&limit=20
Authorization: Bearer <token>
```

#### Check Report Status
```http
GET /api/reports/status/content-123
Authorization: Bearer <token>
```

### Moderator Endpoints

#### Get Moderation Queue
```http
GET /api/reports/queue?status=under_review&page=1&limit=50
Authorization: Bearer <moderator-token>
```

#### Update Report Status
```http
PUT /api/reports/123/status
Authorization: Bearer <moderator-token>
Content-Type: application/json

{
  "status": "resolved",
  "resolution": "Content removed for policy violation",
  "moderatorNotes": "Clear violation of harassment policy"
}
```

#### Get Analytics
```http
GET /api/reports/analytics
Authorization: Bearer <admin-token>
```

## System Configuration

### Escalation Thresholds
- **Posts**: 3.0 weighted reports
- **Comments**: 2.5 weighted reports  
- **DMs**: 2.0 weighted reports
- **Listings**: 3.5 weighted reports
- **NFTs**: 4.0 weighted reports

### Reputation Weights
- **High Reputation (≥100)**: 2.0x weight
- **Medium Reputation (≥50)**: 1.5x weight
- **Normal Reputation**: 1.0x weight
- **Low Reputation (<0)**: 0.5x weight
- **High False Report Rate (>50%)**: 0.5x penalty

### Rate Limits
- **Report Submission**: 10 reports per 15 minutes
- **Daily Limit**: 20 reports per user per day
- **Minimum Reputation**: -50 (users below this cannot report)

### Anti-Abuse Detection
- **Rapid-Fire**: More than 5 reports in 1 hour
- **Targeting**: More than 3 reports on same content in 24 hours
- **Penalties**: Weight reduction to 0.1, reputation penalty -10

## Database Schema

### Content Reports Table
```sql
CREATE TABLE content_reports (
  id SERIAL PRIMARY KEY,
  content_id VARCHAR(64) NOT NULL,
  content_type VARCHAR(24) NOT NULL,
  reporter_id UUID NOT NULL REFERENCES users(id),
  reason VARCHAR(48) NOT NULL,
  details TEXT,
  category VARCHAR(24),
  weight NUMERIC(5,4) DEFAULT 1,
  status VARCHAR(24) DEFAULT 'open',
  moderator_id UUID REFERENCES users(id),
  resolution TEXT,
  moderator_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Workflow

### 1. Report Submission
1. User submits report via API
2. System validates request and checks rate limits
3. Reporter weight is calculated based on reputation
4. Report is stored with calculated weight
5. Aggregation check is triggered

### 2. Aggregation and Escalation
1. System calculates total weighted reports for content
2. If threshold exceeded, creates moderation case
3. All related reports marked as 'under_review'
4. Moderators notified of new case

### 3. Moderation Review
1. Moderator reviews content and evidence
2. Makes decision (resolved/dismissed)
3. Updates all related reports
4. Reporter reputations updated based on accuracy

### 4. Reputation Updates
- **Accurate Reports**: +5 reputation points
- **False Reports**: -10 reputation points
- **Abuse Detection**: Additional penalties applied

## Testing

The system includes comprehensive tests covering:

- **Unit Tests**: Individual component functionality
- **Integration Tests**: Complete workflow simulation
- **Edge Cases**: Error handling and abuse scenarios

Run tests with:
```bash
npm test -- --testPathPattern="report.*\.simple\.test\.ts"
```

## Usage Examples

### Basic Report Submission
```javascript
const response = await fetch('/api/reports/submit', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    contentId: 'post-123',
    contentType: 'post',
    reason: 'harassment',
    details: 'User is harassing others in comments'
  })
});

const result = await response.json();
console.log('Report submitted:', result.reportId);
```

### Check Content Status
```javascript
const response = await fetch('/api/reports/status/post-123', {
  headers: { 'Authorization': `Bearer ${token}` }
});

const status = await response.json();
console.log('Content status:', status.status);
console.log('Can report:', status.canReport);
```

### Moderator Queue Management
```javascript
const response = await fetch('/api/reports/queue?status=under_review', {
  headers: { 'Authorization': `Bearer ${moderatorToken}` }
});

const queue = await response.json();
console.log('Pending reports:', queue.reports.length);
```

## Security Considerations

1. **Authentication Required**: All endpoints require valid JWT tokens
2. **Rate Limiting**: Prevents spam and abuse
3. **Input Validation**: All inputs validated with Zod schemas
4. **SQL Injection Protection**: Using parameterized queries via Drizzle ORM
5. **Reputation Gating**: Low reputation users have limited reporting ability

## Performance Optimizations

1. **Database Indexing**: Optimized queries with proper indexes
2. **Caching**: Report status and aggregations can be cached
3. **Batch Processing**: Multiple reports processed efficiently
4. **Pagination**: Large result sets properly paginated

## Monitoring and Analytics

The system provides comprehensive analytics including:
- Total reports by status
- Average resolution time
- False positive rates
- Top violation reasons
- Daily report trends
- Reporter accuracy metrics

## Future Enhancements

Potential improvements for future iterations:
1. Machine learning for automatic report classification
2. Real-time notifications for moderators
3. Advanced abuse pattern detection
4. Integration with blockchain governance
5. Automated content takedown for high-confidence cases

## Support

For questions or issues with the Community Reporting System:
1. Check the test files for usage examples
2. Review the API documentation above
3. Examine the service and controller implementations
4. Run the test suite to verify functionality