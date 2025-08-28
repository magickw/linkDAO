# AI Features Setup and Usage Guide for LinkDAO

## Overview
This guide provides instructions for setting up and using the AI features in LinkDAO, including environment configuration, testing, and integration details.

## Prerequisites

Before setting up the AI features, ensure you have:

1. **OpenAI API Key**: Required for accessing GPT models
2. **Pinecone Account**: For vector database functionality (optional but recommended)
3. **Node.js**: Version 16 or higher
4. **npm**: Version 7 or higher

## Environment Setup

### 1. OpenAI API Key

1. Sign up for an account at [OpenAI](https://platform.openai.com/)
2. Navigate to the API keys section
3. Create a new API key
4. Add it to your backend environment variables:

```bash
# In app/backend/.env
OPENAI_API_KEY=your_openai_api_key_here
```

### 2. Pinecone Configuration (Optional)

1. Sign up for an account at [Pinecone](https://www.pinecone.io/)
2. Create a new index
3. Get your API key and environment details
4. Add them to your backend environment variables:

```bash
# In app/backend/.env
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_ENVIRONMENT=your_pinecone_environment_here
PINECONE_INDEX_NAME=your_index_name_here
```

### 3. RPC URL for On-chain Data

Add an RPC URL for Ethereum data access:

```bash
# In app/backend/.env
RPC_URL=https://mainnet.base.org
```

## Installation

### Backend Dependencies

Navigate to the backend directory and install dependencies:

```bash
cd app/backend
npm install
```

### Frontend Dependencies

Navigate to the frontend directory and install dependencies:

```bash
cd app/frontend
npm install
```

## Running the Services

### 1. Start the Backend

```bash
cd app/backend
npm run dev
```

The backend will start on port 3002 by default.

### 2. Start the Frontend

```bash
cd app/frontend
npm run dev
```

The frontend will start on port 3004 by default.

### 3. Verify AI Services

Check that the AI services are properly integrated by accessing the bots endpoint:

```bash
curl http://localhost:3002/api/ai/bots
```

You should see a list of available bots.

## Testing the AI Features

### Using cURL

#### Get Available Bots
```bash
curl http://localhost:3002/api/ai/bots
```

#### Process Message with Bot
```bash
curl -X POST http://localhost:3002/api/ai/bots/wallet-guard/process \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Is this contract safe: 0x741f1923953245b6e52578205d83e468c1b390d4?",
    "userId": "0x1234567890123456789012345678901234567890"
  }'
```

#### Analyze Transaction (Wallet Guard)
```bash
curl -X POST http://localhost:3002/api/ai/bots/wallet-guard/analyze-transaction \
  -H "Content-Type: application/json" \
  -d '{
    "transaction": {
      "from": "0x1234567890123456789012345678901234567890",
      "to": "0x741f1923953245b6e52578205d83e468c1b390d4",
      "value": "1.0",
      "data": "0x",
      "gasLimit": "21000",
      "gasPrice": "20000000000"
    },
    "userAddress": "0x1234567890123456789012345678901234567890"
  }'
```

#### Summarize Proposal (Proposal Summarizer)
```bash
curl -X POST http://localhost:3002/api/ai/bots/proposal-summarizer/summarize \
  -H "Content-Type: application/json" \
  -d '{
    "proposal": {
      "id": "1",
      "title": "Increase Community Fund Allocation",
      "description": "This proposal aims to increase the community fund allocation from 10% to 15% of treasury funds for expanded community initiatives and developer grants.",
      "proposer": "0x1234567890123456789012345678901234567890",
      "startBlock": 1000000,
      "endBlock": 1001000,
      "forVotes": "1000000",
      "againstVotes": "500000"
    }
  }'
```

### Using the Frontend Interface

1. Navigate to http://localhost:3004
2. Connect your wallet
3. Find the AI chat interface (typically in a sidebar or dedicated page)
4. Select a bot from the dropdown
5. Type your message and send

## Customizing AI Bots

### Adding a New Bot

1. Create a new file in `/backend/src/services/bots/`
2. Extend the `AIBot` class
3. Implement the `processMessage` method
4. Register the bot in `/backend/src/services/botManager.ts`
5. Add API routes in `/backend/src/routes/aiRoutes.ts` (if needed)
6. Create frontend components/hooks (if needed)

### Example Bot Implementation

```typescript
// /backend/src/services/bots/myNewBot.ts
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

## Monitoring and Maintenance

### Logging

All AI interactions are logged for monitoring and debugging:

```bash
# Check backend logs
cd app/backend
tail -f logs/ai-service.log
```

### Performance Metrics

Monitor these key metrics:
- API response times
- Token usage and costs
- Error rates
- User satisfaction scores

### Updates

To update the AI services:

```bash
# Update backend dependencies
cd app/backend
npm update openai @pinecone-database/pinecone

# Rebuild the backend
npm run build
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

### Prompt Engineering
- Design clear, specific prompts
- Provide sufficient context
- Use appropriate persona instructions

### Privacy and Security
- Never store sensitive user information
- Implement proper access controls
- Regularly audit AI interactions

### Cost Management
- Monitor API usage and costs
- Implement caching for common responses
- Use appropriate models for different tasks

## Conclusion

The AI features in LinkDAO provide powerful capabilities to enhance user experience across the platform. By following this guide, you can successfully set up, test, and customize the AI integration to meet your specific needs.

For more detailed technical information, refer to:
- [AI Developer Guide](AI_DEVELOPER_GUIDE.md)
- [AI Integration Plan](AI_INTEGRATION_PLAN.md)
- [AI Implementation Summary](AI_IMPLEMENTATION_SUMMARY.md)