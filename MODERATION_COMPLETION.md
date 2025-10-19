# Moderation System Completion Plan

## Current Status
- ✅ Database schema exists (communityModerationActions)
- ✅ Basic moderation actions implemented (ban/unban/promote/demote)
- ❌ Post approval/rejection workflow missing
- ❌ Content flagging system incomplete
- ❌ Moderation queue management missing

## Critical Additions Needed

### 1. Post Approval Workflow
```typescript
// Add to communityService.ts
async approvePost(postId: string, moderatorAddress: string, communityId: string) {
  // Update post status to approved
  await db
    .update(posts)
    .set({ 
      status: 'approved',
      approvedBy: moderatorAddress,
      approvedAt: new Date(),
      updatedAt: new Date()
    })
    .where(eq(posts.id, parseInt(postId)));

  // Record moderation action
  await db
    .insert(communityModerationActions)
    .values({
      communityId,
      moderatorAddress,
      action: 'approve_post',
      targetType: 'post',
      targetId: postId,
      reason: 'Post approved by moderator',
      metadata: JSON.stringify({ postId, action: 'approve' }),
    });

  return { success: true, message: 'Post approved successfully' };
}

async rejectPost(postId: string, moderatorAddress: string, communityId: string, reason: string) {
  // Update post status to rejected
  await db
    .update(posts)
    .set({ 
      status: 'rejected',
      rejectedBy: moderatorAddress,
      rejectedAt: new Date(),
      rejectionReason: reason,
      updatedAt: new Date()
    })
    .where(eq(posts.id, parseInt(postId)));

  // Record moderation action
  await db
    .insert(communityModerationActions)
    .values({
      communityId,
      moderatorAddress,
      action: 'reject_post',
      targetType: 'post',
      targetId: postId,
      reason: reason || 'Post rejected by moderator',
      metadata: JSON.stringify({ postId, action: 'reject', reason }),
    });

  return { success: true, message: 'Post rejected successfully' };
}
```

### 2. Moderation Queue Management
```typescript
async getModerationQueue(communityId: string, options: {
  page: number;
  limit: number;
  type?: 'posts' | 'reports' | 'all';
}) {
  const { page, limit, type = 'all' } = options;
  const offset = (page - 1) * limit;

  // Get pending posts requiring approval
  const pendingPosts = await db
    .select({
      id: posts.id,
      type: sql`'post'`,
      title: posts.title,
      authorId: posts.authorId,
      createdAt: posts.createdAt,
      status: posts.status,
    })
    .from(posts)
    .where(and(
      eq(posts.communityId, communityId),
      eq(posts.status, 'pending')
    ))
    .orderBy(desc(posts.createdAt))
    .limit(limit)
    .offset(offset);

  return {
    items: pendingPosts,
    pagination: { page, limit, total: pendingPosts.length }
  };
}
```

### 3. Content Flagging System
```typescript
async flagContent(data: {
  communityId: string;
  reporterAddress: string;
  targetType: 'post' | 'comment' | 'user';
  targetId: string;
  reason: string;
  category: 'spam' | 'harassment' | 'inappropriate' | 'other';
}) {
  // Record the flag/report
  await db
    .insert(communityModerationActions)
    .values({
      communityId: data.communityId,
      moderatorAddress: data.reporterAddress,
      action: 'flag_content',
      targetType: data.targetType,
      targetId: data.targetId,
      reason: data.reason,
      metadata: JSON.stringify({
        category: data.category,
        reporterAddress: data.reporterAddress,
        flaggedAt: new Date()
      }),
    });

  return { success: true, message: 'Content flagged for review' };
}
```