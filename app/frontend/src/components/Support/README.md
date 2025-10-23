# LinkDAO Support Components

This directory contains all the React components that make up the LinkDAO support system. These components provide a comprehensive support experience for users of the LinkDAO platform.

## Component Overview

### Core Support Components

#### `LDAOSupportCenter.tsx`
The main support center component for LDAO token-related support. Includes tabs for help center, tickets, and contact information.

#### `SupportDocuments.tsx`
The documentation library component with search, filtering, and document viewing capabilities.

#### `SupportTicketDashboard.tsx`
The ticket management dashboard for viewing and managing support tickets.

#### `SupportTicketForm.tsx`
The form component for creating new support tickets.

### New Enhanced Components

#### `AIChatSupport.tsx`
An AI-powered chat support component that provides instant assistance to users. Features include:
- Real-time chat interface
- Message history
- Feedback collection (thumbs up/down)
- Text-to-speech options
- Conversation restart functionality

#### `SupportWidget.tsx`
A floating support widget that provides quick access to all support channels. Features include:
- Collapsible interface
- Multiple support channels (AI chat, docs, community, contact)
- Always visible floating button

#### `PersonalizedSupportDashboard.tsx`
A personalized dashboard that shows user-specific support information. Features include:
- Recently viewed documents
- Saved documents
- Open tickets
- Suggested articles
- Quick action buttons

#### `MultiLanguageSupport.tsx`
A multi-language support component that allows users to access documentation in their preferred language. Features include:
- Language selector with flag icons
- Text-to-speech functionality
- Translation request system

#### `SupportAnalyticsDashboard.tsx`
A comprehensive analytics dashboard for support metrics. Features include:
- Ticket volume tracking
- Category distribution visualization
- Resolution rate monitoring
- Agent performance metrics
- Time-based filtering

#### `CommunitySupportForum.tsx`
A community forum component for peer-to-peer support. Features include:
- Post creation and viewing
- Voting system
- Category filtering
- Search functionality
- Bookmarking posts

## Integration Guide

### Using Support Components in Pages

To use these components in your pages, import them from the index file:

```tsx
import {
  SupportWidget,
  PersonalizedSupportDashboard,
  MultiLanguageSupport
} from '@/components/Support';
```

### Adding New Support Channels

To add a new support channel to the widget:

1. Add a new option to the `supportOptions` array in `SupportWidget.tsx`
2. Implement the action handler for the new channel
3. Add appropriate styling and icons

### Customizing Analytics

To customize the analytics dashboard:

1. Modify the mock data in `SupportAnalyticsDashboard.tsx` to connect to real APIs
2. Adjust the time range filters as needed
3. Add new metrics or visualizations as required

## Testing

Each component has corresponding test files in the `__tests__` directory. To run tests:

```bash
npm test
```

## Styling

All components use Tailwind CSS for styling and follow the LinkDAO design system. Color classes are used consistently:
- Blue: Primary actions and links
- Green: Success states and positive actions
- Red: Error states and destructive actions
- Yellow: Warnings and neutral actions
- Purple: Special features and highlights

## Accessibility

Components are designed with accessibility in mind:
- Proper ARIA labels
- Keyboard navigation support
- Sufficient color contrast
- Semantic HTML structure

## Future Enhancements

Planned improvements include:
- Integration with real AI chat APIs
- Live chat functionality with human agents
- Advanced analytics with real-time data
- User feedback collection and analysis
- Personalization based on user behavior
- Mobile-specific optimizations

## Contributing

To contribute to the support components:

1. Create a new branch for your feature
2. Add or modify components as needed
3. Write corresponding tests
4. Update this documentation
5. Submit a pull request for review

## Support

For issues with these components, please create a ticket in the support system or contact the development team.