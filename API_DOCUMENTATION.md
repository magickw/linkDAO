# LinkDAO API Documentation

This document provides comprehensive documentation for the LinkDAO backend API endpoints.

## 1. Authentication API

### 1.1 Login
**POST** `/api/auth/login`

Authenticate a user with their wallet address.

**Request Body**:
```json
{
  "address": "0x1234567890123456789012345678901234567890"
}
```

**Response**:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "1",
    "address": "0x1234567890123456789012345678901234567890",
    "handle": "testuser",
    "ens": "testuser.eth",
    "avatarCid": "QmAvatar123",
    "bioCid": "QmBio123",
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  }
}
```

### 1.2 Register
**POST** `/api/auth/register`

Register a new user profile.

**Request Body**:
```json
{
  "address": "0x1234567890123456789012345678901234567890",
  "handle": "testuser",
  "ens": "testuser.eth",
  "avatarCid": "QmAvatar123",
  "bioCid": "QmBio123"
}
```

**Response**:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "1",
    "address": "0x1234567890123456789012345678901234567890",
    "handle": "testuser",
    "ens": "testuser.eth",
    "avatarCid": "QmAvatar123",
    "bioCid": "QmBio123",
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  }
}
```

### 1.3 Get Current User
**GET** `/api/auth/me`

Get the currently authenticated user's profile.

**Headers**:
```
Authorization: Bearer <token>
```

**Response**:
```json
{
  "success": true,
  "user": {
    "id": "1",
    "address": "0x1234567890123456789012345678901234567890",
    "handle": "testuser",
    "ens": "testuser.eth",
    "avatarCid": "QmAvatar123",
    "bioCid": "QmBio123",
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  }
}
```

## 2. Profile API

### 2.1 Create Profile
**POST** `/api/profiles`

Create a new user profile.

**Headers**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "address": "0x1234567890123456789012345678901234567890",
  "handle": "testuser",
  "ens": "testuser.eth",
  "avatarCid": "QmAvatar123",
  "bioCid": "QmBio123"
}
```

**Response**:
```json
{
  "id": "1",
  "address": "0x1234567890123456789012345678901234567890",
  "handle": "testuser",
  "ens": "testuser.eth",
  "avatarCid": "QmAvatar123",
  "bioCid": "QmBio123",
  "createdAt": "2023-01-01T00:00:00.000Z",
  "updatedAt": "2023-01-01T00:00:00.000Z"
}
```

### 2.2 Get Profile by ID
**GET** `/api/profiles/:id`

Get a user profile by ID.

**Response**:
```json
{
  "id": "1",
  "address": "0x1234567890123456789012345678901234567890",
  "handle": "testuser",
  "ens": "testuser.eth",
  "avatarCid": "QmAvatar123",
  "bioCid": "QmBio123",
  "createdAt": "2023-01-01T00:00:00.000Z",
  "updatedAt": "2023-01-01T00:00:00.000Z"
}
```

### 2.3 Get Profile by Address
**GET** `/api/profiles/address/:address`

Get a user profile by wallet address.

**Response**:
```json
{
  "id": "1",
  "address": "0x1234567890123456789012345678901234567890",
  "handle": "testuser",
  "ens": "testuser.eth",
  "avatarCid": "QmAvatar123",
  "bioCid": "QmBio123",
  "createdAt": "2023-01-01T00:00:00.000Z",
  "updatedAt": "2023-01-01T00:00:00.000Z"
}
```

### 2.4 Update Profile
**PUT** `/api/profiles/:id`

Update an existing user profile.

**Headers**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "handle": "updateduser",
  "ens": "updateduser.eth",
  "avatarCid": "QmUpdatedAvatar123",
  "bioCid": "QmUpdatedBio123"
}
```

**Response**:
```json
{
  "id": "1",
  "address": "0x1234567890123456789012345678901234567890",
  "handle": "updateduser",
  "ens": "updateduser.eth",
  "avatarCid": "QmUpdatedAvatar123",
  "bioCid": "QmUpdatedBio123",
  "createdAt": "2023-01-01T00:00:00.000Z",
  "updatedAt": "2023-01-02T00:00:00.000Z"
}
```

### 2.5 Delete Profile
**DELETE** `/api/profiles/:id`

Delete a user profile.

**Headers**:
```
Authorization: Bearer <token>
```

**Response**:
```
Status: 204 No Content
```

### 2.6 Get All Profiles
**GET** `/api/profiles`

Get all user profiles.

**Response**:
```json
[
  {
    "id": "1",
    "address": "0x1234567890123456789012345678901234567890",
    "handle": "testuser",
    "ens": "testuser.eth",
    "avatarCid": "QmAvatar123",
    "bioCid": "QmBio123",
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  }
]
```

## 3. Post API

### 3.1 Create Post
**POST** `/api/posts`

Create a new post.

**Headers**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "author": "0x1234567890123456789012345678901234567890",
  "content": "This is a test post",
  "tags": ["test", "post"]
}
```

**Response**:
```json
{
  "id": "1",
  "author": "0x1234567890123456789012345678901234567890",
  "content": "This is a test post",
  "tags": ["test", "post"],
  "createdAt": "2023-01-01T00:00:00.000Z",
  "updatedAt": "2023-01-01T00:00:00.000Z"
}
```

### 3.2 Get Post by ID
**GET** `/api/posts/:id`

Get a post by ID.

**Response**:
```json
{
  "id": "1",
  "author": "0x1234567890123456789012345678901234567890",
  "content": "This is a test post",
  "tags": ["test", "post"],
  "createdAt": "2023-01-01T00:00:00.000Z",
  "updatedAt": "2023-01-01T00:00:00.000Z"
}
```

### 3.3 Get Posts by Author
**GET** `/api/posts/author/:author`

Get posts by author address.

**Response**:
```json
[
  {
    "id": "1",
    "author": "0x1234567890123456789012345678901234567890",
    "content": "This is a test post",
    "tags": ["test", "post"],
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  }
]
```

### 3.4 Get Posts by Tag
**GET** `/api/posts/tag/:tag`

Get posts by tag.

**Response**:
```json
[
  {
    "id": "1",
    "author": "0x1234567890123456789012345678901234567890",
    "content": "This is a test post",
    "tags": ["test", "post"],
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  }
]
```

### 3.5 Update Post
**PUT** `/api/posts/:id`

Update an existing post.

**Headers**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "content": "This is an updated test post",
  "tags": ["test", "updated"]
}
```

**Response**:
```json
{
  "id": "1",
  "author": "0x1234567890123456789012345678901234567890",
  "content": "This is an updated test post",
  "tags": ["test", "updated"],
  "createdAt": "2023-01-01T00:00:00.000Z",
  "updatedAt": "2023-01-02T00:00:00.000Z"
}
```

### 3.6 Delete Post
**DELETE** `/api/posts/:id`

Delete a post.

**Headers**:
```
Authorization: Bearer <token>
```

**Response**:
```
Status: 204 No Content
```

### 3.7 Get All Posts
**GET** `/api/posts`

Get all posts.

**Response**:
```json
[
  {
    "id": "1",
    "author": "0x1234567890123456789012345678901234567890",
    "content": "This is a test post",
    "tags": ["test", "post"],
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  }
]
```

### 3.8 Get User Feed
**GET** `/api/posts/feed`

Get the authenticated user's feed.

**Headers**:
```
Authorization: Bearer <token>
```

**Query Parameters**:
- `forUser` (optional): Address of user to get feed for

**Response**:
```json
[
  {
    "id": "1",
    "author": "0x1234567890123456789012345678901234567890",
    "content": "This is a test post",
    "tags": ["test", "post"],
    "createdAt": "2023-01-01T00:00:00.000Z",
    "updatedAt": "2023-01-01T00:00:00.000Z"
  }
]
```

## 4. Follow API

### 4.1 Follow User
**POST** `/api/follow/follow`

Follow a user.

**Headers**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "follower": "0x1234567890123456789012345678901234567890",
  "following": "0xabcdef1234567890abcdef1234567890abcdef12"
}
```

**Response**:
```json
{
  "success": true
}
```

### 4.2 Unfollow User
**POST** `/api/follow/unfollow`

Unfollow a user.

**Headers**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "follower": "0x1234567890123456789012345678901234567890",
  "following": "0xabcdef1234567890abcdef1234567890abcdef12"
}
```

**Response**:
```json
{
  "success": true
}
```

### 4.3 Get Followers
**GET** `/api/follow/followers/:address`

Get followers of a user.

**Response**:
```json
[
  "0x1234567890123456789012345678901234567890",
  "0xabcdef1234567890abcdef1234567890abcdef12"
]
```

### 4.4 Get Following
**GET** `/api/follow/following/:address`

Get users that a user is following.

**Response**:
```json
[
  "0x1234567890123456789012345678901234567890",
  "0xabcdef1234567890abcdef1234567890abcdef12"
]
```

### 4.5 Check Follow Status
**GET** `/api/follow/is-following/:follower/:following`

Check if one user is following another.

**Response**:
```json
true
```

### 4.6 Get Follow Count
**GET** `/api/follow/count/:address`

Get follow counts for a user.

**Response**:
```json
{
  "followers": 10,
  "following": 5
}
```

## 5. AI API

### 5.1 List Bots
**GET** `/api/ai/bots`

List all available AI bots.

**Response**:
```json
[
  {
    "id": "wallet-guard",
    "name": "Wallet Guard",
    "description": "AI-powered wallet security analysis",
    "category": "security"
  }
]
```

### 5.2 Get Bots by Category
**GET** `/api/ai/bots/category/:category`

Get AI bots by category.

**Response**:
```json
[
  {
    "id": "wallet-guard",
    "name": "Wallet Guard",
    "description": "AI-powered wallet security analysis",
    "category": "security"
  }
]
```

### 5.3 Process Message with Bot
**POST** `/api/ai/bots/:botId/process`

Process a message with a specific AI bot.

**Headers**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "message": "Analyze this transaction for security risks",
  "userId": "0x1234567890123456789012345678901234567890"
}
```

**Response**:
```json
{
  "response": "The transaction appears to be secure. No immediate risks detected.",
  "tokensUsed": 45,
  "model": "gpt-4-turbo"
}
```

### 5.4 Analyze Transaction
**POST** `/api/ai/bots/wallet-guard/analyze-transaction`

Analyze a transaction for security risks.

**Headers**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "transaction": {
    "from": "0x1234567890123456789012345678901234567890",
    "to": "0xabcdef1234567890abcdef1234567890abcdef12",
    "value": "1000000000000000000",
    "data": "0x"
  },
  "userId": "0x1234567890123456789012345678901234567890"
}
```

**Response**:
```json
{
  "riskLevel": "low",
  "analysis": "Transaction appears secure. Recipient is a known contract.",
  "recommendations": ["Proceed with transaction"]
}
```

### 5.5 Summarize Proposal
**POST** `/api/ai/bots/proposal-summarizer/summarize`

Summarize a governance proposal.

**Headers**:
```
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body**:
```json
{
  "proposal": {
    "id": "1",
    "title": "Increase Community Fund Allocation",
    "description": "Proposal to increase the community fund allocation from 10% to 15% of treasury funds for expanded community initiatives.",
    "proposer": "0x1234567890123456789012345678901234567890"
  }
}
```

**Response**:
```json
{
  "summary": "This proposal suggests increasing community fund allocation from 10% to 15% to support expanded initiatives.",
  "keyPoints": [
    "Increase from 10% to 15% allocation",
    "Focus on community initiatives",
    "Requires treasury fund adjustment"
  ],
  "sentiment": "positive"
}
```

## 6. Error Responses

All API endpoints return consistent error responses in the following format:

```json
{
  "success": false,
  "error": "Error message"
}
```

### Common HTTP Status Codes:
- **200**: Success
- **201**: Created
- **204**: No Content (successful deletion)
- **400**: Bad Request (validation errors)
- **401**: Unauthorized (missing or invalid token)
- **403**: Forbidden (insufficient permissions)
- **404**: Not Found
- **500**: Internal Server Error

## 7. Authentication

All protected endpoints require a valid JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

Tokens are obtained through the authentication endpoints and expire after 15 minutes. Refresh tokens are available for extended sessions.

## 8. Rate Limiting

API endpoints are rate-limited to prevent abuse:
- General API: 100 requests per 15 minutes per IP
- Authentication: 5 requests per 15 minutes per IP

Exceeding these limits will result in a 429 (Too Many Requests) response.