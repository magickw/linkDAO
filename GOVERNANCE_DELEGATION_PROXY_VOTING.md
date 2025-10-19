# Delegation and Proxy Voting System

This document describes the implementation of delegation and proxy voting for the LinkDAO community governance system.

## Overview

The delegation system enables advanced governance features including:

1. **Liquid Democracy** - Transferable voting power
2. **Proxy Voting** - Voting on behalf of inactive members
3. **Delegation Pools** - Collective decision making
4. **Reputation-based Delegation** - Weighted delegation based on reputation

## Database Schema

### Community Delegations Table

Stores delegation relationships between community members.

**Fields:**
- `id`: Unique identifier
- `communityId`: Reference to the community
- `delegatorAddress`: Address of the user delegating their voting power
- `delegateAddress`: Address of the user receiving the delegated voting power
- `votingPower`: Amount of voting power delegated
- `isRevocable`: Whether the delegation can be revoked
- `expiryDate`: Optional expiration date for the delegation
- `metadata`: Additional data about the delegation
- `createdAt`: Timestamp when delegation was created
- `updatedAt`: Timestamp when delegation was last updated

### Community Proxy Votes Table

Stores proxy votes cast on behalf of other community members.

**Fields:**
- `id`: Unique identifier
- `proposalId`: Reference to the governance proposal
- `proxyAddress`: Address of the user casting the proxy vote
- `voterAddress`: Address of the user on whose behalf the vote is cast
- `voteChoice`: The vote choice ('yes', 'no', 'abstain')
- `votingPower`: Amount of voting power represented by this proxy vote
- `reason`: Optional reason for the vote
- `createdAt`: Timestamp when vote was cast

## API Methods

### Create Delegation

Create a new delegation relationship.

**Endpoint:** `POST /api/communities/:communityId/delegations`

**Request Body:**
```json
{
  "delegatorAddress": "0x123...",
  "delegateAddress": "0x456...",
  "expiryDate": "2024-12-31T23:59:59Z", // Optional
  "metadata": {} // Optional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "communityId": "uuid",
    "delegatorAddress": "0x123...",
    "delegateAddress": "0x456...",
    "votingPower": 100,
    "isRevocable": true,
    "expiryDate": "2024-12-31T23:59:59Z",
    "createdAt": "2023-01-01T00:00:00Z"
  }
}
```

### Revoke Delegation

Revoke an existing delegation.

**Endpoint:** `DELETE /api/communities/:communityId/delegations`

**Request Body:**
```json
{
  "delegatorAddress": "0x123..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Delegation revoked successfully"
}
```

### Get Delegations as Delegate

Get all delegations where a user is the delegate.

**Endpoint:** `GET /api/communities/:communityId/delegations?delegateAddress=0x123...&page=1&limit=10`

**Response:**
```json
{
  "delegations": [
    {
      "id": "uuid",
      "communityId": "uuid",
      "delegatorAddress": "0x789...",
      "delegateAddress": "0x123...",
      "votingPower": 150,
      "isRevocable": true,
      "expiryDate": "2024-12-31T23:59:59Z",
      "metadata": {},
      "createdAt": "2023-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

### Create Proxy Vote

Cast a vote on behalf of another user.

**Endpoint:** `POST /api/communities/proxy-votes`

**Request Body:**
```json
{
  "proposalId": "uuid",
  "proxyAddress": "0x123...",
  "voterAddress": "0x456...",
  "vote": "yes",
  "reason": "Agree with the proposal" // Optional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "proposalId": "uuid",
    "proxyAddress": "0x123...",
    "voterAddress": "0x456...",
    "voteChoice": "yes",
    "votingPower": 100,
    "reason": "Agree with the proposal",
    "createdAt": "2023-01-01T00:00:00Z"
  }
}
```

## Implementation Details

### Voting Power Calculation

The `calculateVotingPower` method has been enhanced to account for delegations:

1. If a user has delegated their voting power, they have 0 voting power
2. Otherwise, voting power is calculated based on reputation and role multipliers

### Delegation Validation

When creating a delegation:
1. Both delegator and delegate must be active community members
2. No existing delegation can exist for the same delegator
3. Voting power is calculated and stored with the delegation

### Proxy Vote Validation

When creating a proxy vote:
1. The proposal must exist and be active
2. A valid delegation must exist from the voter to the proxy
3. No existing proxy vote can exist for the same voter and proposal

### Expiration Handling

Delegations can have optional expiration dates:
1. Expired delegations are not considered when calculating voting power
2. Proxy votes cannot be cast using expired delegations

## Security Considerations

1. **Authentication**: All delegation operations require proper authentication
2. **Authorization**: Users can only create delegations for themselves as delegators
3. **Validation**: All inputs are validated to prevent injection attacks
4. **Audit Trail**: All delegation and proxy vote actions are logged
5. **Revocability**: Delegations can be revoked by the delegator (if revocable)

## Future Enhancements

1. **Delegation Pools**: Allow multiple users to delegate to a single pool
2. **Weighted Delegation**: Allow partial delegation of voting power
3. **Automatic Expiry**: Implement automatic cleanup of expired delegations
4. **Delegation Analytics**: Provide insights into delegation patterns
5. **Cross-community Delegation**: Allow delegation across multiple communities