# API Reference

## Authentication

All authenticated endpoints require JWT token in Authorization header:
```
Authorization: Bearer <token>
```

## Support API

### Create Ticket
```http
POST /api/support/tickets
Content-Type: application/json

{
  "subject": "string",
  "description": "string",
  "category": "technical|account|trading|staking",
  "priority": "low|medium|high|urgent"
}
```

### Get Tickets
```http
GET /api/support/tickets
Authorization: Bearer <token>
```

### Get FAQ
```http
GET /api/support/faq?category=ldao&search=token
```

### Upload File
```http
POST /api/support/upload
Content-Type: multipart/form-data

file: <binary>
```

## User API

### Get Profile
```http
GET /api/users/:address
```

### Update Profile
```http
PUT /api/users/:address
Authorization: Bearer <token>

{
  "username": "string",
  "bio": "string",
  "avatar": "string"
}
```

## Token API

### Get Balance
```http
GET /api/ldao/balance/:address
```

### Get Transactions
```http
GET /api/ldao/transactions/:address
```

## Governance API

### Get Proposals
```http
GET /api/governance/proposals
```

### Create Proposal
```http
POST /api/governance/proposals
Authorization: Bearer <token>

{
  "title": "string",
  "description": "string",
  "actions": []
}
```

### Vote
```http
POST /api/governance/proposals/:id/vote
Authorization: Bearer <token>

{
  "vote": "yes|no|abstain"
}
```

## Rate Limits

- Anonymous: 100 requests/hour
- Authenticated: 1000 requests/hour
- File uploads: 10 requests/hour

## Error Codes

- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Rate Limit Exceeded
- `500` - Internal Server Error
