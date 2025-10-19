# Sophisticated Proposal Types Implementation

This document describes the implementation of sophisticated proposal types for the LinkDAO community governance system.

## Overview

The governance system has been enhanced to support more sophisticated proposal types that enable advanced community decision-making. These include:

1. **Spending Proposals** - Multi-sig treasury approvals
2. **Parameter Change Proposals** - DAO settings modifications
3. **Grant Proposals** - Milestone-based funding
4. **Membership Proposals** - Adding/removing moderators

## Proposal Types

### 1. Spending Proposals (`spending`)

Spending proposals allow communities to approve treasury expenditures with multi-signature requirements.

**Metadata Requirements:**
- `amount`: The amount to be spent
- `recipient`: The recipient address
- `description`: Description of the spending purpose

**Example:**
```json
{
  "type": "spending",
  "title": "Community Development Fund",
  "description": "Allocate funds for community development initiatives",
  "metadata": {
    "amount": "1000",
    "recipient": "0x1234567890123456789012345678901234567890",
    "description": "Funding for developer bounties and community events"
  }
}
```

### 2. Parameter Change Proposals (`parameter_change`)

Parameter change proposals allow communities to modify DAO settings and governance parameters.

**Metadata Requirements:**
- `parameter`: The parameter to change (supports nested parameters like "governance.quorum")
- `newValue`: The new value for the parameter

**Example:**
```json
{
  "type": "parameter_change",
  "title": "Adjust Quorum Requirement",
  "description": "Reduce quorum requirement to increase participation",
  "metadata": {
    "parameter": "governance.quorum",
    "newValue": "5"
  }
}
```

### 3. Grant Proposals (`grant`)

Grant proposals enable milestone-based funding for community projects.

**Metadata Requirements:**
- `recipient`: The recipient address
- `amount`: The total grant amount
- `milestones`: Array of milestone objects with description and amount

**Example:**
```json
{
  "type": "grant",
  "title": "Documentation Improvement Grant",
  "description": "Fund to improve community documentation",
  "metadata": {
    "recipient": "0xabcdef1234567890abcdef1234567890abcdef12",
    "amount": "500",
    "milestones": [
      {
        "description": "Complete initial documentation audit",
        "amount": "100",
        "deadline": "2023-12-31"
      },
      {
        "description": "Create 10 new documentation pages",
        "amount": "200",
        "deadline": "2024-03-31"
      },
      {
        "description": "Community review and feedback integration",
        "amount": "200",
        "deadline": "2024-06-30"
      }
    ]
  }
}
```

### 4. Membership Proposals (`membership`)

Membership proposals allow communities to add or remove moderators.

**Metadata Requirements:**
- `targetAddress`: The user address to modify
- `action`: Either "add_moderator" or "remove_moderator"

**Example:**
```json
{
  "type": "membership",
  "title": "Add New Moderator",
  "description": "Promote active community member to moderator role",
  "metadata": {
    "targetAddress": "0x9876543210987654321098765432109876543210",
    "action": "add_moderator"
  }
}
```

## Enhanced Features

### Stake Requirements

Proposals can now require a minimum stake to vote, ensuring that only committed community members can participate in important decisions.

**Usage:**
```json
{
  "requiredStake": 100
}
```

### Execution Delays

High-impact proposals can have execution delays to allow for additional review or emergency halt mechanisms.

**Usage:**
```json
{
  "executionDelay": 86400
}
```

This adds a 24-hour delay before the proposal can be executed.

## Implementation Details

### Database Schema Changes

The `community_governance_proposals` table has been enhanced with:

- `required_stake`: Minimum stake required to vote (default: 0)
- `execution_delay`: Delay in seconds before execution (optional)

### API Endpoints

The existing governance endpoints now support the new proposal types:

- `POST /api/communities/:id/governance` - Create new proposal with enhanced types
- `POST /api/communities/:id/governance/:proposalId/vote` - Vote on proposals with stake validation
- `POST /api/communities/:id/governance/:proposalId/execute` - Execute proposals with enhanced logic

### Validation

The system validates proposal metadata based on proposal type to ensure all required fields are present.

### Execution Logic

Each proposal type has specific execution logic:

1. **Spending**: Logs treasury spending actions in the moderation audit trail
2. **Parameter Change**: Updates community settings with nested parameter support
3. **Grant**: Creates grant records for milestone tracking
4. **Membership**: Updates user roles in the community

## Security Considerations

1. All proposals require proper authentication and authorization
2. Stake requirements prevent spam voting
3. Execution delays provide security for high-impact proposals
4. Audit trails track all governance actions
5. Role-based access control ensures only authorized users can create proposals