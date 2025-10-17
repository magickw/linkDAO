# Admin Enhancement Test Plan

## Overview
This document outlines the test plan for the Admin Enhancement features implemented across Phases 1-3.

---

## Phase 2.1: Advanced Moderation Features

### Bulk Moderation Actions
**Component:** `ModerationQueue.tsx`

#### Test Cases:
1. **Bulk Selection**
   - [ ] Enable bulk actions mode
   - [ ] Select individual items using checkboxes
   - [ ] Use "Select All" to select all items on current page
   - [ ] Verify selected count is displayed correctly
   - [ ] Deselect items and verify count updates

2. **Bulk Approve**
   - [ ] Select multiple pending items
   - [ ] Click "Approve All" button
   - [ ] Verify confirmation dialog (if implemented)
   - [ ] Confirm action executes successfully
   - [ ] Verify items are removed from pending queue
   - [ ] Check that selection is cleared after action

3. **Bulk Reject**
   - [ ] Select multiple items
   - [ ] Click "Reject All" button
   - [ ] Verify action completes
   - [ ] Check audit log for bulk action entry

4. **Bulk Escalate**
   - [ ] Select items requiring escalation
   - [ ] Use bulk escalate action
   - [ ] Verify items move to escalated status

5. **Bulk Delete**
   - [ ] Select items to delete
   - [ ] Execute bulk delete
   - [ ] Verify items are permanently removed

### Advanced Filtering
**Component:** `ModerationQueue.tsx`

#### Test Cases:
1. **Filter by Type**
   - [ ] Filter by "Post"
   - [ ] Filter by "Comment"
   - [ ] Filter by "User Report"
   - [ ] Verify results match selected type

2. **Filter by Status**
   - [ ] Filter by "Pending"
   - [ ] Filter by "Under Review"
   - [ ] Filter by "Resolved"
   - [ ] Verify correct status filtering

3. **Filter by Priority**
   - [ ] Filter by "Urgent"
   - [ ] Filter by "High"
   - [ ] Filter by "Medium"
   - [ ] Filter by "Low"

4. **Date Range Filtering**
   - [ ] Set start date
   - [ ] Set end date
   - [ ] Verify items within date range are shown
   - [ ] Test with today's date
   - [ ] Test with past dates

5. **Keyword Search**
   - [ ] Enter search term
   - [ ] Verify results contain keyword
   - [ ] Test with special characters
   - [ ] Test with partial matches

6. **Saved Filter Presets**
   - [ ] Create new filter preset with name
   - [ ] Apply multiple filters
   - [ ] Save as preset
   - [ ] Verify preset appears in dropdown
   - [ ] Load saved preset
   - [ ] Verify all filters are applied correctly
   - [ ] Delete preset
   - [ ] Verify preset is removed

### Moderation History
**Component:** `ModerationHistory.tsx`

#### Test Cases:
1. **View History**
   - [ ] Navigate to Mod History tab
   - [ ] Verify recent actions are displayed
   - [ ] Check action details (moderator, action type, reason, timestamp)
   - [ ] Verify pagination works

2. **Filter History**
   - [ ] Filter by moderator
   - [ ] Filter by action type
   - [ ] Filter by date range
   - [ ] Search by keywords

3. **Undo Action**
   - [ ] Find recent action with undo capability
   - [ ] Click undo button
   - [ ] Verify confirmation dialog
   - [ ] Confirm undo
   - [ ] Verify item returns to previous state
   - [ ] Check that undo is logged in history

4. **Export History**
   - [ ] Select date range
   - [ ] Apply filters
   - [ ] Click export button
   - [ ] Verify download initiates
   - [ ] Open exported file
   - [ ] Verify data matches on-screen display

---

## Phase 2.2: Enhanced User Management

### Bulk User Operations
**Component:** `UserManagement.tsx`

#### Test Cases:
1. **Bulk Suspend**
   - [ ] Enable bulk actions
   - [ ] Select multiple users
   - [ ] Click "Suspend All"
   - [ ] Enter suspension reason
   - [ ] Set duration or permanent
   - [ ] Verify users are suspended
   - [ ] Check users can't log in

2. **Bulk Unsuspend**
   - [ ] Select suspended users
   - [ ] Click "Unsuspend All"
   - [ ] Verify users are reactivated
   - [ ] Test user can log in again

3. **Bulk Role Change**
   - [ ] Select users
   - [ ] Choose new role (moderator/admin)
   - [ ] Apply change
   - [ ] Verify role updates
   - [ ] Test new permissions are active

### User Activity Timeline
**Component:** `UserManagement.tsx` (detail panel)

#### Test Cases:
1. **View Activity**
   - [ ] Select a user
   - [ ] Expand Activity Timeline section
   - [ ] Verify activities are loaded
   - [ ] Check activity types (login, post, transaction, etc.)

2. **Activity Details**
   - [ ] Verify each activity shows:
     - [ ] Activity type with appropriate icon
     - [ ] Activity description
     - [ ] Timestamp
     - [ ] IP address (if available)
     - [ ] Additional details

3. **Activity Filtering**
   - [ ] Verify most recent activities show first
   - [ ] Check pagination if many activities
   - [ ] Verify loading states

### Advanced User Search
**Component:** `UserManagement.tsx`

#### Test Cases:
1. **Field-Specific Search**
   - [ ] Search by username
   - [ ] Search by email
   - [ ] Search by wallet address
   - [ ] Search by ENS name
   - [ ] Verify "All Fields" search

2. **Advanced Filters**
   - [ ] Filter by role
   - [ ] Filter by account status (active/suspended)
   - [ ] Filter by KYC status
   - [ ] Combine multiple filters

3. **Date Range Filters**
   - [ ] Filter by last login date (after/before)
   - [ ] Filter by account creation date
   - [ ] Test with various date combinations
   - [ ] Clear all filters button

4. **Export Users**
   - [ ] Apply filters
   - [ ] Click export
   - [ ] Verify CSV/Excel download
   - [ ] Check exported data matches filters

---

## Phase 2.3: Dispute Resolution Enhancements

### Evidence Management
**Component:** `DisputeResolution.tsx`

#### Test Cases:
1. **Upload Evidence**
   - [ ] Select dispute
   - [ ] Click upload evidence
   - [ ] Select multiple files
   - [ ] Verify files upload successfully
   - [ ] Check file details display (name, size, type, date)

2. **View Evidence**
   - [ ] Click preview button on evidence
   - [ ] Verify image preview works
   - [ ] Test download button
   - [ ] Verify file downloads correctly

3. **Verify Evidence**
   - [ ] Click verify button on pending evidence
   - [ ] Verify status changes to "verified"
   - [ ] Check visual indicator updates

4. **Reject Evidence**
   - [ ] Click reject button
   - [ ] Verify status changes to "rejected"
   - [ ] Check color coding updates

5. **Delete Evidence**
   - [ ] Click delete button
   - [ ] Verify confirmation dialog
   - [ ] Confirm deletion
   - [ ] Verify evidence is removed

6. **Evidence by Party**
   - [ ] Verify buyer evidence shows in blue section
   - [ ] Verify seller evidence shows in green section
   - [ ] Verify admin evidence shows in purple section
   - [ ] Check each section is properly labeled

### Communication Thread
**Component:** `DisputeResolution.tsx`

#### Test Cases:
1. **View Messages**
   - [ ] Select dispute
   - [ ] Expand communication thread
   - [ ] Verify messages are displayed
   - [ ] Check message ordering (newest first/last)

2. **Send Message**
   - [ ] Type message in input field
   - [ ] Press Enter to send
   - [ ] Verify message appears in thread
   - [ ] Check timestamp is current
   - [ ] Verify sender is "admin"

3. **Message Formatting**
   - [ ] Test multiline messages (Shift+Enter)
   - [ ] Verify message wraps correctly
   - [ ] Check color coding by sender:
     - [ ] Admin messages (purple)
     - [ ] Buyer messages (blue)
     - [ ] Seller messages (green)

4. **Attachments** (if implemented)
   - [ ] Attach files to message
   - [ ] Verify file appears in message
   - [ ] Test file download from message

5. **Empty State**
   - [ ] View dispute with no messages
   - [ ] Verify empty state shows
   - [ ] Check helpful message displays

---

## Phase 2.4: Seller Management Features

### Enhanced Application Review
**Component:** `SellerApplications.tsx`

#### Test Cases:
1. **Bulk Application Actions**
   - [ ] Enable bulk actions
   - [ ] Select multiple applications
   - [ ] Bulk approve applications
   - [ ] Bulk reject applications
   - [ ] Verify status updates correctly

2. **Risk Assessment**
   - [ ] Select an application
   - [ ] Verify risk assessment panel displays
   - [ ] Check overall risk score (0-100)
   - [ ] Verify risk level (Low/Medium/High/Very High)
   - [ ] Check color coding matches risk level
   - [ ] View individual risk factors
   - [ ] Verify factor scores display
   - [ ] Read risk notes
   - [ ] Collapse/expand risk assessment

3. **Document Verification**
   - [ ] Expand document verification section
   - [ ] View uploaded documents
   - [ ] Check document details (name, size, date)
   - [ ] Click preview button
   - [ ] Click download button
   - [ ] Verify unverified documents
   - [ ] Mark document as verified
   - [ ] Check status badge updates

### Seller Performance Monitoring
**Component:** `SellerPerformance.tsx`

#### Test Cases:
1. **Performance Dashboard**
   - [ ] Navigate to Seller Performance tab
   - [ ] Verify summary cards display:
     - [ ] Total Revenue
     - [ ] Total Orders
     - [ ] Average Rating
     - [ ] Active Sellers count
   - [ ] Check values are calculated correctly

2. **Performance Filters**
   - [ ] Filter by status (Excellent/Good/Warning/Critical)
   - [ ] Filter by minimum rating
   - [ ] Sort by revenue/rating/orders/disputes
   - [ ] Search for specific seller
   - [ ] Set date range
   - [ ] Apply multiple filters simultaneously

3. **Seller Performance Cards**
   - [ ] View seller list
   - [ ] Check each card shows:
     - [ ] Business name and avatar
     - [ ] Status badge with icon
     - [ ] Revenue with trend
     - [ ] Orders with trend
     - [ ] Rating with stars
     - [ ] Fulfillment rate
     - [ ] Dispute rate

4. **Trend Indicators**
   - [ ] Verify positive trends show green with up arrow
   - [ ] Verify negative trends show red with down arrow
   - [ ] Check percentage values display

5. **Detailed Performance View**
   - [ ] Select a seller
   - [ ] View detailed metrics panel
   - [ ] Expand detailed metrics section
   - [ ] Verify revenue metrics:
     - [ ] Total revenue
     - [ ] Average order value
     - [ ] Growth trend
   - [ ] Verify order metrics:
     - [ ] Total/completed/cancelled orders
     - [ ] Growth trend
   - [ ] Verify rating & reviews:
     - [ ] Average rating
     - [ ] Total reviews
     - [ ] Visual progress bar
   - [ ] Verify performance indicators:
     - [ ] Fulfillment rate with progress bar
     - [ ] Dispute rate with progress bar
     - [ ] Average response time
   - [ ] Check color coding on progress bars

6. **Export Performance**
   - [ ] Apply filters
   - [ ] Click export report
   - [ ] Verify download initiates
   - [ ] Check exported data

---

## Phase 3: Backend Integration Testing

### Seller Endpoints

#### GET /api/admin/sellers/applications
**Test Cases:**
- [ ] Fetch all applications without filters
- [ ] Filter by status (pending/approved/rejected)
- [ ] Filter by business type
- [ ] Search by name
- [ ] Test pagination
- [ ] Verify response structure
- [ ] Check total count accuracy

#### GET /api/admin/sellers/applications/:id/risk-assessment
**Test Cases:**
- [ ] Fetch risk assessment for valid application
- [ ] Verify overall score calculation
- [ ] Check individual factor scores
- [ ] Verify risk notes generation
- [ ] Test with new vs established seller
- [ ] Test with high vs low KYC status
- [ ] Test with various dispute rates

#### GET /api/admin/sellers/performance
**Test Cases:**
- [ ] Fetch all seller performance data
- [ ] Filter by status
- [ ] Filter by minimum rating
- [ ] Sort by different fields
- [ ] Apply date range filter
- [ ] Test pagination
- [ ] Verify metric calculations
- [ ] Check performance status determination

#### GET /api/admin/sellers/performance/export
**Test Cases:**
- [ ] Export all performance data
- [ ] Export with filters applied
- [ ] Verify download URL is returned
- [ ] Test file format (CSV/Excel)

### Dispute Endpoints

#### POST /api/admin/disputes/:id/evidence
**Test Cases:**
- [ ] Upload single file
- [ ] Upload multiple files
- [ ] Test with images
- [ ] Test with PDFs
- [ ] Test with large files
- [ ] Verify file metadata returned
- [ ] Test upload as different parties (buyer/seller/admin)

#### DELETE /api/admin/disputes/:id/evidence/:evidenceId
**Test Cases:**
- [ ] Delete evidence successfully
- [ ] Test with invalid evidence ID
- [ ] Verify evidence is removed
- [ ] Check authorization

#### PATCH /api/admin/disputes/:id/evidence/:evidenceId/status
**Test Cases:**
- [ ] Update status to "verified"
- [ ] Update status to "rejected"
- [ ] Update status to "pending"
- [ ] Test with invalid status
- [ ] Verify status update persists

#### GET /api/admin/disputes/:id/messages
**Test Cases:**
- [ ] Fetch messages for dispute
- [ ] Verify message ordering
- [ ] Check message structure
- [ ] Test with dispute having no messages
- [ ] Test with dispute having many messages

#### POST /api/admin/disputes/:id/messages
**Test Cases:**
- [ ] Send message as admin
- [ ] Send message with attachments
- [ ] Send internal note
- [ ] Send public message
- [ ] Verify message is saved
- [ ] Check timestamp is set correctly

---

## Integration Testing

### End-to-End Workflows

#### Seller Application Workflow
1. [ ] View pending seller applications
2. [ ] Select an application
3. [ ] Review risk assessment
4. [ ] Verify documents
5. [ ] Approve application
6. [ ] Verify seller status changes
7. [ ] Check seller appears in performance dashboard

#### Dispute Resolution Workflow
1. [ ] View open disputes
2. [ ] Select a dispute
3. [ ] Review evidence from both parties
4. [ ] Upload admin evidence
5. [ ] Send message to parties
6. [ ] Verify evidence
7. [ ] Resolve dispute
8. [ ] Check resolution is saved
9. [ ] Verify dispute status updates

#### User Moderation Workflow
1. [ ] View moderation queue
2. [ ] Filter by priority
3. [ ] Select high-priority items
4. [ ] Bulk approve safe items
5. [ ] Individually review suspicious items
6. [ ] Escalate complex cases
7. [ ] Check moderation history
8. [ ] Export report

---

## Performance Testing

### Load Testing
- [ ] Test with 100+ moderation items
- [ ] Test with 1000+ users in list
- [ ] Test with 50+ disputes
- [ ] Test bulk actions on 100+ items
- [ ] Measure page load times
- [ ] Check pagination performance
- [ ] Test filter performance with large datasets

### API Performance
- [ ] Measure response times for each endpoint
- [ ] Test concurrent requests
- [ ] Test with database under load
- [ ] Monitor memory usage
- [ ] Check for memory leaks

---

## Security Testing

### Authentication & Authorization
- [ ] Test access without admin token
- [ ] Test with invalid token
- [ ] Test with expired token
- [ ] Verify permission checks
- [ ] Test role-based access control
- [ ] Attempt unauthorized bulk actions

### Input Validation
- [ ] Test with SQL injection attempts
- [ ] Test with XSS payloads
- [ ] Test with invalid file types
- [ ] Test with oversized files
- [ ] Test with malformed JSON
- [ ] Test with missing required fields

---

## Browser Compatibility

### Desktop Browsers
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

### Mobile Browsers
- [ ] iOS Safari
- [ ] Android Chrome
- [ ] Mobile Firefox

### Responsive Design
- [ ] Test on mobile (320px - 767px)
- [ ] Test on tablet (768px - 1023px)
- [ ] Test on desktop (1024px+)
- [ ] Verify touch interactions work
- [ ] Check mobile-specific layouts

---

## Accessibility Testing

- [ ] Keyboard navigation works throughout
- [ ] Screen reader compatibility
- [ ] Focus indicators visible
- [ ] Color contrast ratios meet WCAG AA
- [ ] Alt text on images
- [ ] Aria labels on interactive elements
- [ ] Form validation messages are accessible

---

## Error Handling

### Network Errors
- [ ] Test with offline mode
- [ ] Test with slow network
- [ ] Test with connection timeout
- [ ] Verify error messages display
- [ ] Check retry mechanisms

### Server Errors
- [ ] Test with 500 errors
- [ ] Test with 404 errors
- [ ] Test with 403 forbidden
- [ ] Test with rate limiting
- [ ] Verify graceful degradation

---

## Regression Testing

Run full test suite on:
- [ ] Moderation features (Phase 2.1)
- [ ] User management (Phase 2.2)
- [ ] Dispute resolution (Phase 2.3)
- [ ] Seller management (Phase 2.4)
- [ ] All backend endpoints
- [ ] Authentication flows
- [ ] Existing admin features

---

## Sign-Off

### Test Results Summary
- Total Test Cases: ___
- Passed: ___
- Failed: ___
- Blocked: ___
- Not Tested: ___

### Known Issues
[List any known issues or limitations]

### Recommendations
[List recommendations for improvements]

### Approval
- [ ] QA Lead Approval
- [ ] Product Owner Approval
- [ ] Tech Lead Approval

---

## Notes

- All test cases should be executed in a staging environment before production deployment
- Critical bugs (P0/P1) must be fixed before release
- Performance benchmarks should meet or exceed baseline requirements
- Security vulnerabilities must be addressed immediately
- Document any test case modifications or additions during testing
