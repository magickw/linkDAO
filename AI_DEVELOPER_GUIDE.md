# AI Integration Developer Guide for LinkDAO

## Overview
This guide provides instructions for developers who want to extend or modify the AI capabilities in LinkDAO.

## Architecture

### Core Components

1. **AI Service** (`/backend/src/services/aiService.ts`)
   - Central gateway for all AI interactions
   - Handles communication with LLM providers
   - Manages vector database connections
   - Provides common AI utilities

2. **Bot Framework** (`/backend/src/services/aiService.ts`)
   - Base class for all AI bots
   - Standardized interface for bot interactions
   - Configuration management

3. **Individual Bots** (`/backend/src/services/bots/`)
   - Specialized implementations for different use cases
   - Each bot focuses on a specific domain

4. **Bot Manager** (`/backend/src/services/botManager.ts`)
   - Registry for all available bots
   - Coordination between bots
   - Category-based organization

5. **API Routes** (`/backend/src/routes/aiRoutes.ts`)
   - RESTful endpoints for bot interactions
   - Specialized endpoints for common operations

6. **Frontend Components** (`/frontend/src/components/AIChatInterface.tsx`)
   - User interface for bot interactions
   - Chat-style conversation display

7. **Frontend Hooks** (`/frontend/src/hooks/useAIBots.ts`)
   - React hooks for bot interactions
   - State management for bot data

## Adding a New AI Bot

### 1. Create the Bot Implementation

Create a new file in `/backend/src/services/bots/`:

```typescript
import { AIBot, aiService, AIResponse } from '../aiService';

export class MyNewBot extends AIBot {
  constructor() {
    super(
      {
        name: 'My New Bot',
        description: 'Description of what this bot does',
        scope: ['relevant', 'categories'],
        permissions: ['required', 'permissions'],
        aiModel: 'gpt-4-turbo',
        persona: 'appropriate-persona',
      },
      aiService
    );
  }

  async processMessage(userMessage: string, userId: string): Promise<AIResponse> {
    // Implement bot-specific logic here
    const prompt = `
      User message: "${userMessage}"
      User ID: ${userId}
      
      Provide a helpful response based on your bot's specialization.
    `;

    return await this.aiService.generateText([
      {
        role: 'system',
        content: 'You are a specialized AI assistant.'
      },
      {
        role: 'user',
        content: prompt
      }
    ]);
  }
}
```

### 2. Register the Bot

Add the new bot to the bot manager in `/backend/src/services/botManager.ts`:

```typescript
import { MyNewBot } from './bots/myNewBot';

// In initializeBots function
botRegistry.set('my-new-bot', new MyNewBot());
```

### 3. Add API Routes (if needed)

Add new endpoints in `/backend/src/routes/aiRoutes.ts`:

```typescript
// Specialized endpoint for your bot
router.post('/bots/my-new-bot/special-function', async (req, res) => {
  try {
    const { data } = req.body;
    
    // Process with your bot
    const result = await processMessageWithBot('my-new-bot', JSON.stringify(data), 'system');
    res.json(result);
  } catch (error: any) {
    console.error('Error with my new bot:', error);
    res.status(500).json({ error: error.message || 'Failed to process with my new bot' });
  }
});
```

### 4. Update Frontend (if needed)

Add new functionality to the frontend hook `/frontend/src/hooks/useAIBots.ts`:

```typescript
// Add a new function for your bot's specialized feature
const myNewBotFunction = useCallback(async (data: any) => {
  try {
    const response = await fetch('/api/ai/bots/my-new-bot/special-function', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to process with my new bot');
    }
    
    const data = await response.json();
    return data;
  } catch (err) {
    console.error('Error with my new bot:', err);
    throw err;
  }
}, []);
```

## Environment Variables

The AI system requires several environment variables to be set:

```env
# OpenAI API
OPENAI_API_KEY=your_openai_api_key

# Pinecone (Vector Database)
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_ENVIRONMENT=your_pinecone_environment
PINECONE_INDEX_NAME=your_index_name

# RPC URL for on-chain data
RPC_URL=your_rpc_url
```

## Data Models

### Bot Configuration

```typescript
interface AIBotConfig {
  name: string;
  description: string;
  scope: string[];
  permissions: string[];
  aiModel: string;
  persona: string;
  settings?: Record<string, any>;
}
```

### AI Response

```typescript
interface AIResponse {
  content: string;
  tokensUsed: number;
  model: string;
}
```

### Message

```typescript
interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}
```

## Error Handling

All AI services should properly handle errors:

1. **Network Errors**: Connection issues with AI providers
2. **Rate Limiting**: API quota exceeded
3. **Content Policy**: Blocked by content filters
4. **Invalid Input**: Malformed requests

## Testing

### Backend Testing

Create tests in `/backend/tests/ai/`:

```typescript
import { MyNewBot } from '../src/services/bots/myNewBot';

describe('MyNewBot', () => {
  let bot: MyNewBot;

  beforeEach(() => {
    bot = new MyNewBot();
  });

  it('should process messages correctly', async () => {
    const result = await bot.processMessage('Hello', 'user123');
    expect(result.content).toBeDefined();
    expect(result.tokensUsed).toBeGreaterThanOrEqual(0);
  });
});
```

### Frontend Testing

Create tests in `/frontend/tests/components/`:

```typescript
import { render, screen } from '@testing-library/react';
import AIChatInterface from '../src/components/AIChatInterface';

describe('AIChatInterface', () => {
  it('renders correctly', () => {
    render(<AIChatInterface />);
    expect(screen.getByText('AI Assistant')).toBeInTheDocument();
  });
});
```

## Performance Considerations

1. **Caching**: Cache frequent AI responses to reduce API calls
2. **Rate Limiting**: Implement client-side rate limiting
3. **Streaming**: Use streaming responses for long outputs
4. **Compression**: Compress large payloads when possible

## Security

1. **Input Validation**: Sanitize all user inputs
2. **Output Filtering**: Filter AI responses for sensitive content
3. **Access Control**: Verify user permissions for bot interactions
4. **Audit Logging**: Log all AI interactions for security review

## Monitoring

1. **Usage Tracking**: Monitor API usage and costs
2. **Error Rates**: Track failed requests and errors
3. **Response Times**: Monitor latency of AI responses
4. **User Satisfaction**: Collect feedback on bot usefulness

## Extending the System

### Adding New LLM Providers

Modify the AI service to support additional providers:

```typescript
async generateWithAnthropic(prompt: string): Promise<AIResponse> {
  // Implementation for Anthropic Claude
}

async generateWithOpenSource(model: string, prompt: string): Promise<AIResponse> {
  // Implementation for open-source models
}
```

### Adding Vector Database Providers

Extend the AI service to support alternative vector databases:

```typescript
async initializeWeaviate() {
  // Initialize Weaviate client
}

async retrieveContextFromWeaviate(query: string): Promise<any[]> {
  // Retrieve context from Weaviate
}
```

## Troubleshooting

### Common Issues

1. **API Key Errors**: Verify environment variables are set correctly
2. **Rate Limiting**: Implement exponential backoff for retries
3. **Content Filtering**: Adjust prompts to avoid sensitive topics
4. **Network Issues**: Add retry logic for transient failures

### Debugging Tips

1. **Enable Logging**: Set verbose logging for AI interactions
2. **Test Prompts**: Use the OpenAI playground to test prompts
3. **Check Permissions**: Verify bot permissions are correctly set
4. **Monitor Usage**: Check API usage dashboards for quotas

## Best Practices

1. **Prompt Engineering**: Design clear, specific prompts
2. **Persona Consistency**: Maintain consistent bot personalities
3. **User Privacy**: Never store sensitive user information
4. **Cost Management**: Monitor and optimize API usage
5. **Fallback Handling**: Provide graceful degradation when AI is unavailable