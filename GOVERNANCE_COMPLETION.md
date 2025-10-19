# Governance System Completion Plan

## Current Status
- ✅ Database schema exists (communityGovernanceProposals, communityGovernanceVotes)
- ✅ Basic CRUD operations implemented
- ❌ Proposal lifecycle management missing
- ❌ Voting weight calculation incomplete
- ❌ Proposal execution logic missing

## Implementation Required

### 1. Proposal Lifecycle Management
```typescript
// Add to communityService.ts
async updateProposalStatus(proposalId: string) {
  const now = new Date();
  
  const proposal = await db
    .select()
    .from(communityGovernanceProposals)
    .where(eq(communityGovernanceProposals.id, proposalId))
    .limit(1);

  if (proposal.length === 0) return;

  const p = proposal[0];
  let newStatus = p.status;

  // Check if voting period ended
  if (now > p.votingEndTime && p.status === 'active') {
    const totalVotes = Number(p.yesVotes) + Number(p.noVotes) + Number(p.abstainVotes);
    const yesPercentage = totalVotes > 0 ? (Number(p.yesVotes) / totalVotes) * 100 : 0;
    
    if (totalVotes >= Number(p.quorum)) {
      newStatus = yesPercentage >= p.requiredMajority ? 'passed' : 'rejected';
    } else {
      newStatus = 'failed'; // Didn't reach quorum
    }

    await db
      .update(communityGovernanceProposals)
      .set({ status: newStatus, updatedAt: now })
      .where(eq(communityGovernanceProposals.id, proposalId));
  }
}
```

### 2. Enhanced Voting Weight Calculation
```typescript
// Update voteOnProposal method
async calculateVotingPower(communityId: string, voterAddress: string): Promise<number> {
  const member = await db
    .select({ reputation: communityMembers.reputation, role: communityMembers.role })
    .from(communityMembers)
    .where(and(
      eq(communityMembers.communityId, communityId),
      eq(communityMembers.userAddress, voterAddress)
    ))
    .limit(1);

  if (member.length === 0) return 0;

  let votingPower = member[0].reputation || 1;
  
  // Role-based multipliers
  if (member[0].role === 'admin') votingPower *= 3;
  else if (member[0].role === 'moderator') votingPower *= 2;
  
  return Math.max(1, votingPower);
}
```

### 3. Proposal Execution Framework
```typescript
async executeProposal(proposalId: string, executorAddress: string) {
  const proposal = await db
    .select()
    .from(communityGovernanceProposals)
    .where(eq(communityGovernanceProposals.id, proposalId))
    .limit(1);

  if (proposal.length === 0 || proposal[0].status !== 'passed') {
    return { success: false, message: 'Proposal cannot be executed' };
  }

  // Execute based on proposal type
  switch (proposal[0].type) {
    case 'settings_update':
      return await this.executeSettingsUpdate(proposal[0]);
    case 'member_promotion':
      return await this.executeMemberPromotion(proposal[0]);
    case 'treasury_action':
      return await this.executeTreasuryAction(proposal[0]);
    default:
      return { success: false, message: 'Unknown proposal type' };
  }
}
```