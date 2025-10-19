# Automated Proposal Execution System

This document describes the implementation of automated proposal execution for the LinkDAO community governance system.

## Overview

The automated execution system enables proposals to be executed automatically based on schedules, recurrence patterns, or dependencies, reducing manual intervention and improving governance efficiency.

## Database Schema

### Community Automated Executions Table

Stores automated execution configurations for governance proposals.

**Fields:**
- `id`: Unique identifier
- `proposalId`: Reference to the governance proposal
- `executionType`: Type of automation ('scheduled', 'recurring', 'dependent')
- `executionTime`: Timestamp for scheduled execution
- `recurrencePattern`: Pattern for recurring executions (cron expression or interval)
- `dependencyProposalId`: Reference to another proposal that must be executed first
- `executionStatus`: Current status ('pending', 'executed', 'failed', 'cancelled')
- `executionResult`: Result of the execution attempt
- `metadata`: Additional data about the execution
- `createdAt`: Timestamp when execution was configured
- `updatedAt`: Timestamp when execution was last updated

## API Methods

### Create Automated Execution

Configure automated execution for a proposal.

**Endpoint:** `POST /api/communities/automated-executions`

**Request Body:**
```json
{
  "proposalId": "uuid",
  "executionType": "scheduled",
  "executionTime": "2024-01-01T12:00:00Z",
  "recurrencePattern": "0 0 * * *", // Optional, for recurring executions
  "dependencyProposalId": "uuid", // Optional, for dependent executions
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
    "executionType": "scheduled",
    "executionTime": "2024-01-01T12:00:00Z",
    "recurrencePattern": "0 0 * * *",
    "dependencyProposalId": "uuid",
    "executionStatus": "pending",
    "createdAt": "2023-01-01T00:00:00Z"
  }
}
```

### Get Automated Executions

Get all automated executions for a proposal.

**Endpoint:** `GET /api/communities/:proposalId/automated-executions?page=1&limit=10`

**Response:**
```json
{
  "executions": [
    {
      "id": "uuid",
      "proposalId": "uuid",
      "executionType": "scheduled",
      "executionTime": "2024-01-01T12:00:00Z",
      "recurrencePattern": "0 0 * * *",
      "dependencyProposalId": "uuid",
      "executionStatus": "pending",
      "executionResult": null,
      "metadata": {},
      "createdAt": "2023-01-01T00:00:00Z",
      "updatedAt": "2023-01-01T00:00:00Z"
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

### Execution Types

1. **Scheduled Execution**: Execute at a specific time
2. **Recurring Execution**: Execute repeatedly based on a pattern
3. **Dependent Execution**: Execute after another proposal is completed

### Execution Process

1. **Configuration**: Proposals can be configured for automated execution
2. **Scheduling**: System periodically checks for pending executions
3. **Execution**: System automatically executes eligible proposals
4. **Result Tracking**: Execution results are recorded
5. **Recurrence**: Recurring executions create new scheduled executions

### Execution Validation

When creating automated execution:
1. The proposal must exist
2. Dependency proposals (if specified) must exist
3. Execution times must be in the future (for scheduled executions)

### Error Handling

1. **Execution Failures**: Failed executions are marked with status 'failed'
2. **Retry Logic**: Failed executions can be manually retried
3. **Logging**: All execution attempts are logged with results
4. **Notifications**: Critical failures can trigger alerts

## Security Considerations

1. **Authorization**: Only authorized users can configure automated execution
2. **Validation**: All inputs are validated to prevent injection attacks
3. **Audit Trail**: All automated execution actions are logged
4. **Rate Limiting**: Prevent abuse of automated execution system
5. **Timeouts**: Prevent infinite loops in recurring executions

## Future Enhancements

1. **Advanced Scheduling**: Full cron expression support
2. **Execution Conditions**: Conditional execution based on external factors
3. **Parallel Execution**: Execute multiple independent proposals simultaneously
4. **Execution Templates**: Predefined execution patterns for common scenarios
5. **Monitoring Dashboard**: Real-time view of automated execution status