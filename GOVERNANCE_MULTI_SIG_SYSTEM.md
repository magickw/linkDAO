# Multi-signature Governance System

This document describes the implementation of multi-signature governance actions for the LinkDAO community governance system.

## Overview

The multi-signature system enables enhanced security for high-impact governance proposals by requiring multiple approvals before execution.

## Database Schema

### Community Multi-Sig Approvals Table

Stores multi-signature approvals for governance proposals.

**Fields:**
- `id`: Unique identifier
- `proposalId`: Reference to the governance proposal
- `approverAddress`: Address of the user providing the approval
- `signature`: Optional blockchain signature
- `approvedAt`: Timestamp when approval was given
- `metadata`: Additional data about the approval

### Enhanced Community Governance Proposals Table

The governance proposals table has been enhanced with multi-signature fields:

**New Fields:**
- `requiredSignatures`: Number of signatures required for multi-sig proposals
- `signaturesObtained`: Number of signatures obtained so far
- `multiSigEnabled`: Whether multi-signature is required for this proposal

**New Status Values:**
- `multi_sig_pending`: Proposal has passed voting but awaits multi-signature approvals

## API Methods

### Create Multi-Signature Approval

Approve a multi-signature proposal.

**Endpoint:** `POST /api/communities/multi-sig-approvals`

**Request Body:**
```json
{
  "proposalId": "uuid",
  "approverAddress": "0x123...",
  "signature": "0x456...", // Optional blockchain signature
  "metadata": {} // Optional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "proposalId": "uuid",
    "approverAddress": "0x123...",
    "signature": "0x456...",
    "approvedAt": "2023-01-01T00:00:00Z"
  }
}
```

### Get Multi-Signature Approvals

Get all approvals for a multi-signature proposal.

**Endpoint:** `GET /api/communities/:proposalId/multi-sig-approvals?page=1&limit=10`

**Response:**
```json
{
  "approvals": [
    {
      "id": "uuid",
      "proposalId": "uuid",
      "approverAddress": "0x123...",
      "signature": "0x456...",
      "approvedAt": "2023-01-01T00:00:00Z",
      "metadata": {}
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

## Implementation Details

### Multi-Signature Flow

1. **Proposal Creation**: Proposals can be marked as requiring multi-signature approval
2. **Voting**: Standard voting process occurs
3. **Multi-Signature Pending**: If a proposal passes voting and requires multi-sig, its status becomes `multi_sig_pending`
4. **Approvals**: Community admins/moderators provide multi-signature approvals
5. **Execution**: Once enough signatures are obtained, the proposal can be executed

### Approval Validation

When creating a multi-signature approval:
1. The proposal must exist and require multi-signature
2. The proposal must be in `multi_sig_pending` status
3. The approver must be a community admin or moderator
4. The approver must not have already approved the proposal

### Signature Requirements

The system tracks:
1. Required signatures (set at proposal creation)
2. Obtained signatures (incremented with each approval)
3. Execution is enabled when obtained signatures meet or exceed required signatures

## Security Considerations

1. **Role-based Access**: Only admins and moderators can provide multi-signature approvals
2. **Status Validation**: Proposals must be in the correct state for multi-signature actions
3. **Duplicate Prevention**: Each user can only approve a proposal once
4. **Audit Trail**: All multi-signature actions are logged
5. **Threshold Security**: Configurable signature requirements prevent single points of failure

## Future Enhancements

1. **Blockchain Integration**: Full integration with blockchain multi-signature wallets
2. **Time-based Expiry**: Automatic expiry of multi-signature pending proposals
3. **Approval Weighting**: Different weights for different approver roles
4. **Notification System**: Alerts for multi-signature pending proposals
5. **Emergency Override**: Mechanisms for emergency proposal execution