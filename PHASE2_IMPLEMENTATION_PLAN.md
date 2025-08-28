# Phase 2 Implementation Plan

This document outlines the technical approach for implementing Phase 2 enhancements for the LinkDAO platform, focusing on connecting frontend components to actual backend APIs.

## 1. Connect Frontend Components to Actual Backend APIs

### 1.1 Profile Management API Integration

#### Current State
The profile page currently only interacts with smart contracts using generated hooks. We need to add backend API integration.

#### Implementation Steps

1. **Create Profile API Service**
   - Create a new file: `/app/frontend/src/services/profileService.ts`
   - Implement functions for all profile API endpoints:
     - `createProfile(data: CreateProfileInput): Promise<UserProfile>`
     - `getProfileById(id: string): Promise<UserProfile>`
     - `getProfileByAddress(address: string): Promise<UserProfile>`
     - `updateProfile(id: string, data: UpdateProfileInput): Promise<UserProfile>`
     - `deleteProfile(id: string): Promise<boolean>`

2. **Update Profile Page Component**
   - Modify `/app/frontend/src/pages/profile.tsx` to use the new service
   - Add state management for loading, error, and success states
   - Implement proper error handling and user feedback

3. **Create Custom Hooks**
   - Create `/app/frontend/src/hooks/useProfile.ts` with hooks for:
     - `useProfile(address: string)` - Fetch profile by address
     - `useCreateProfile()` - Create new profile
     - `useUpdateProfile()` - Update existing profile

### 1.2 Social Feed API Integration

#### Current State
The social feed page uses mock data and doesn't connect to the backend API.

#### Implementation Steps

1. **Create Post API Service**
   - Create a new file: `/app/frontend/src/services/postService.ts`
   - Implement functions for all post API endpoints:
     - `createPost(data: CreatePostInput): Promise<Post>`
     - `getPostById(id: string): Promise<Post>`
     - `getPostsByAuthor(author: string): Promise<Post[]>`
     - `getPostsByTag(tag: string): Promise<Post[]>`
     - `updatePost(id: string, data: UpdatePostInput): Promise<Post>`
     - `deletePost(id: string): Promise<boolean>`
     - `getAllPosts(): Promise<Post[]>`
     - `getFeed(forUser?: string): Promise<Post[]>`

2. **Update Social Feed Component**
   - Modify `/app/frontend/src/pages/social.tsx` to fetch real data
   - Replace mockPosts with data from the backend API
   - Implement infinite scrolling or pagination for the feed
   - Add loading states and error handling

3. **Create Custom Hooks**
   - Create `/app/frontend/src/hooks/usePosts.ts` with hooks for:
     - `useFeed(forUser?: string)` - Get user feed
     - `useCreatePost()` - Create new post
     - `usePostsByAuthor(author: string)` - Get posts by author

### 1.3 Follow System API Integration

#### Current State
There's no frontend implementation for the follow system yet.

#### Implementation Steps

1. **Create Follow API Service**
   - Create a new file: `/app/frontend/src/services/followService.ts`
   - Implement functions for all follow API endpoints:
     - `follow(follower: string, following: string): Promise<boolean>`
     - `unfollow(follower: string, following: string): Promise<boolean>`
     - `getFollowers(address: string): Promise<string[]>`
     - `getFollowing(address: string): Promise<string[]>`
     - `isFollowing(follower: string, following: string): Promise<boolean>`
     - `getFollowCount(address: string): Promise<{ followers: number, following: number }>`

2. **Create Follow Components**
   - Create `/app/frontend/src/components/FollowButton.tsx` for follow/unfollow functionality
   - Create `/app/frontend/src/components/FollowerList.tsx` to display followers
   - Create `/app/frontend/src/components/FollowingList.tsx` to display following

3. **Create Custom Hooks**
   - Create `/app/frontend/src/hooks/useFollow.ts` with hooks for:
     - `useFollow()` - Follow/unfollow functionality
     - `useFollowers(address: string)` - Get followers
     - `useFollowing(address: string)` - Get following
     - `useFollowStatus(follower: string, following: string)` - Check follow status

## 2. Implementation Timeline

### Week 1: Profile Management API Integration
- [ ] Create profile service
- [ ] Create profile hooks
- [ ] Update profile page component
- [ ] Add error handling and loading states
- [ ] Test with backend API

### Week 2: Social Feed API Integration
- [ ] Create post service
- [ ] Create post hooks
- [ ] Update social feed component
- [ ] Implement pagination/infinite scrolling
- [ ] Test with backend API

### Week 3: Follow System API Integration
- [ ] Create follow service
- [ ] Create follow hooks
- [ ] Create follow components
- [ ] Integrate with profile and social feed
- [ ] Test with backend API

## 3. Technical Considerations

### Error Handling
- Implement consistent error handling across all services
- Create error boundary components for graceful error display
- Add retry mechanisms for failed API calls

### Performance Optimization
- Implement caching for frequently accessed data
- Use React.memo for components to prevent unnecessary re-renders
- Implement code splitting for better initial load times

### Security
- Validate all inputs on both frontend and backend
- Implement proper authentication for protected endpoints
- Use HTTPS for all API communications

### Testing
- Write unit tests for all new services and hooks
- Implement integration tests for API interactions
- Add end-to-end tests for critical user flows

## 4. Dependencies

### Required Backend Endpoints
Ensure the following backend endpoints are fully implemented and tested:
- `/api/profiles/*`
- `/api/posts/*`
- `/api/follow/*`

### Required Environment Variables
- `NEXT_PUBLIC_BACKEND_URL` - Backend API base URL

## 5. Success Criteria

- [ ] All frontend components successfully connect to backend APIs
- [ ] Error handling is implemented and tested
- [ ] Loading states provide good user experience
- [ ] All new code is covered by unit tests
- [ ] Integration tests pass for all API interactions
- [ ] Documentation is updated with new API usage