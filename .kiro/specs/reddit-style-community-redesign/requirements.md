# Requirements Document

## Introduction

This feature transforms the existing community page into a Reddit-style interface that provides a more familiar and intuitive user experience. The redesign focuses on improving layout structure, enhancing post display, adding community features, and integrating governance elements while maintaining mobile optimization.

## Requirements

### Requirement 1

**User Story:** As a community member, I want a three-column Reddit-style layout, so that I can easily navigate between community content, information, and navigation options.

#### Acceptance Criteria

1. WHEN a user visits a community page THEN the system SHALL display a three-column layout with left sidebar navigation, center content area, and right sidebar community info
2. WHEN the viewport is desktop size THEN the system SHALL show all three columns simultaneously
3. WHEN the viewport is tablet size THEN the system SHALL collapse the left sidebar and show a toggle button
4. WHEN the viewport is mobile size THEN the system SHALL show only the center content with collapsible sidebars

### Requirement 2

**User Story:** As a community member, I want an improved subreddit-style header, so that I can quickly identify the community and access key information.

#### Acceptance Criteria

1. WHEN a user views a community page THEN the system SHALL display a compact header with community banner/cover image option
2. WHEN a community has a banner image THEN the system SHALL display it prominently in the header
3. WHEN a community lacks a banner image THEN the system SHALL show a default gradient background
4. WHEN displaying the header THEN the system SHALL include community name, member count, and join/leave button

### Requirement 3

**User Story:** As a community moderator, I want to pin important posts, so that critical information stays visible to all members.

#### Acceptance Criteria

1. WHEN a moderator selects a post THEN the system SHALL provide an option to pin the post
2. WHEN posts are pinned THEN the system SHALL display them at the top of the post list with a distinctive pin indicator
3. WHEN multiple posts are pinned THEN the system SHALL allow ordering of pinned posts
4. WHEN viewing pinned posts THEN the system SHALL limit the display to a maximum of 3 pinned posts

### Requirement 4

**User Story:** As a community member, I want post flairs for categorization, so that I can quickly identify different types of content.

#### Acceptance Criteria

1. WHEN creating a post THEN the system SHALL allow users to select from predefined flair categories (Discussion, Guide, Question, Announcement, etc.)
2. WHEN displaying posts THEN the system SHALL show colored flair tags next to post titles
3. WHEN filtering posts THEN the system SHALL allow users to filter by specific flair types
4. WHEN moderators manage the community THEN the system SHALL allow them to create and customize flair options

### Requirement 5

**User Story:** As a community member, I want prominent voting arrows like Reddit, so that I can easily upvote or downvote content.

#### Acceptance Criteria

1. WHEN displaying posts THEN the system SHALL show upvote/downvote arrows on the left side of each post
2. WHEN a user clicks vote arrows THEN the system SHALL update the vote count immediately with visual feedback
3. WHEN displaying vote counts THEN the system SHALL show the net score prominently
4. WHEN a user has voted THEN the system SHALL highlight the selected vote arrow

### Requirement 6

**User Story:** As a community member, I want thumbnail previews for posts with links, so that I can quickly assess content before clicking.

#### Acceptance Criteria

1. WHEN a post contains a link THEN the system SHALL generate and display a thumbnail preview
2. WHEN a post contains an image THEN the system SHALL show a thumbnail of the image
3. WHEN a post contains a video THEN the system SHALL show a video thumbnail with play indicator
4. WHEN thumbnail generation fails THEN the system SHALL show a default content type icon

### Requirement 7

**User Story:** As a community member, I want enhanced post metadata, so that I can see comprehensive information about each post.

#### Acceptance Criteria

1. WHEN displaying posts THEN the system SHALL show post age in relative time format (e.g., "2 hours ago")
2. WHEN posts have awards THEN the system SHALL display award icons and counts
3. WHEN posts are crossposted THEN the system SHALL show crosspost indicators and source community
4. WHEN displaying post metadata THEN the system SHALL include author, timestamp, comment count, and engagement metrics

### Requirement 8

**User Story:** As a community member, I want to toggle between compact and card view, so that I can customize my browsing experience.

#### Acceptance Criteria

1. WHEN viewing the community page THEN the system SHALL provide a view toggle button
2. WHEN in card view THEN the system SHALL display posts with full thumbnails and expanded content
3. WHEN in compact view THEN the system SHALL display posts in a condensed list format
4. WHEN toggling views THEN the system SHALL remember the user's preference for future visits

### Requirement 9

**User Story:** As a community member, I want a comprehensive "About Community" sidebar widget, so that I can understand the community's purpose and rules.

#### Acceptance Criteria

1. WHEN viewing a community THEN the system SHALL display an "About Community" widget in the right sidebar
2. WHEN displaying community info THEN the system SHALL include description, creation date, member count, and active users
3. WHEN showing community rules THEN the system SHALL display them in an expandable/collapsible format
4. WHEN community has custom widgets THEN the system SHALL display them below the about section

### Requirement 10

**User Story:** As a community member, I want to discover related communities, so that I can explore similar interests.

#### Acceptance Criteria

1. WHEN viewing a community THEN the system SHALL display a "Similar Communities" widget
2. WHEN showing related communities THEN the system SHALL base recommendations on shared members, topics, or tags
3. WHEN displaying related communities THEN the system SHALL show community name, member count, and join button
4. WHEN no related communities exist THEN the system SHALL show popular communities from the same category

### Requirement 11

**User Story:** As a community member, I want to see real-time community statistics, so that I can gauge community activity and engagement.

#### Acceptance Criteria

1. WHEN viewing a community THEN the system SHALL display current online member count
2. WHEN showing statistics THEN the system SHALL include total posts this week, active discussions, and growth metrics
3. WHEN displaying member activity THEN the system SHALL show members online now vs. total members
4. WHEN statistics are unavailable THEN the system SHALL show placeholder text or hide the widget

### Requirement 12

**User Story:** As a community member, I want to see the moderator list prominently, so that I know who manages the community.

#### Acceptance Criteria

1. WHEN viewing a community THEN the system SHALL display a moderator list widget in the sidebar
2. WHEN showing moderators THEN the system SHALL include their usernames, roles, and tenure
3. WHEN displaying moderator info THEN the system SHALL show special badges or indicators for different mod roles
4. WHEN moderators are offline THEN the system SHALL show their last active time

### Requirement 13

**User Story:** As a community member, I want comment previews on posts, so that I can see engaging discussions without clicking through.

#### Acceptance Criteria

1. WHEN displaying posts THEN the system SHALL show a snippet of the top comment for each post
2. WHEN showing comment previews THEN the system SHALL limit the preview to 100 characters with ellipsis
3. WHEN posts have no comments THEN the system SHALL show "No comments yet" or similar placeholder
4. WHEN comment previews are clicked THEN the system SHALL expand to show the full comment thread

### Requirement 14

**User Story:** As a community member, I want quick action buttons, so that I can save, hide, or report content efficiently.

#### Acceptance Criteria

1. WHEN hovering over posts THEN the system SHALL display quick action buttons (save, hide, report, share)
2. WHEN clicking save THEN the system SHALL add the post to the user's saved items with visual confirmation
3. WHEN clicking hide THEN the system SHALL remove the post from the user's feed with undo option
4. WHEN clicking report THEN the system SHALL open a reporting modal with predefined categories

### Requirement 15

**User Story:** As a community member, I want expanded sorting options, so that I can view content in my preferred order.

#### Acceptance Criteria

1. WHEN viewing posts THEN the system SHALL provide sorting options: Best, Hot, New, Top, Rising, Controversial
2. WHEN selecting "Top" THEN the system SHALL provide time filters: Hour, Day, Week, Month, Year, All Time
3. WHEN changing sort order THEN the system SHALL update the post list immediately without page reload
4. WHEN sorting preferences are set THEN the system SHALL remember them for the user's next visit

### Requirement 16

**User Story:** As a community member, I want filtering options, so that I can find specific types of content.

#### Acceptance Criteria

1. WHEN viewing a community THEN the system SHALL provide filters by flair, author, and time period
2. WHEN applying flair filters THEN the system SHALL show only posts with the selected flair
3. WHEN filtering by author THEN the system SHALL show posts from specific users
4. WHEN combining filters THEN the system SHALL apply all selected filters simultaneously

### Requirement 17

**User Story:** As a DAO member, I want governance proposals highlighted, so that I can easily identify and participate in community decisions.

#### Acceptance Criteria

1. WHEN governance proposals are posted THEN the system SHALL display them with distinctive visual styling
2. WHEN showing proposals THEN the system SHALL include voting status, deadline, and participation metrics
3. WHEN proposals are active THEN the system SHALL show a prominent "Vote Now" button
4. WHEN proposals are closed THEN the system SHALL display the final results and implementation status

### Requirement 18

**User Story:** As a DAO member, I want to see voting participation rates, so that I can understand community engagement in governance.

#### Acceptance Criteria

1. WHEN viewing governance content THEN the system SHALL display current participation rates for active proposals
2. WHEN showing voting power THEN the system SHALL indicate the user's voting weight based on token holdings
3. WHEN displaying participation metrics THEN the system SHALL show percentage of eligible voters who have participated
4. WHEN governance is inactive THEN the system SHALL show historical participation data

### Requirement 19

**User Story:** As a community member, I want quick polling features, so that I can gauge community sentiment on various topics.

#### Acceptance Criteria

1. WHEN creating posts THEN the system SHALL provide an option to add a quick poll
2. WHEN viewing polls THEN the system SHALL display voting options with real-time results
3. WHEN participating in polls THEN the system SHALL allow one vote per user with immediate result updates
4. WHEN polls expire THEN the system SHALL show final results and disable further voting

### Requirement 20

**User Story:** As a mobile user, I want collapsible sidebars, so that I can access community information without cluttering the interface.

#### Acceptance Criteria

1. WHEN viewing on mobile THEN the system SHALL make community rules and info collapsible
2. WHEN sidebars are collapsed THEN the system SHALL show toggle buttons to expand them
3. WHEN expanding sidebars on mobile THEN the system SHALL overlay them on top of the main content
4. WHEN closing mobile sidebars THEN the system SHALL return focus to the main content area

### Requirement 21

**User Story:** As a mobile user, I want swipe actions for posts, so that I can quickly vote and save content with gestures.

#### Acceptance Criteria

1. WHEN swiping left on a post THEN the system SHALL reveal upvote and downvote actions
2. WHEN swiping right on a post THEN the system SHALL reveal save and share actions
3. WHEN completing swipe actions THEN the system SHALL provide haptic feedback and visual confirmation
4. WHEN swipe gestures are not supported THEN the system SHALL fall back to tap-based interactions