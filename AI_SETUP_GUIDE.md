# Comprehensive AI Setup Guide for LinkDAO

## Overview
This guide provides step-by-step instructions for setting up all AI features in LinkDAO, including obtaining API keys, configuring environment variables, and testing the integration.

## Prerequisites
- Node.js v16 or higher
- npm v7 or higher
- Basic familiarity with terminal/command prompt
- Access to the LinkDAO codebase

## Step 1: Obtain API Keys

### OpenAI API Key
1. Visit [OpenAI Platform](https://platform.openai.com/)
2. Sign up for an account or log in if you already have one
3. Navigate to the API keys section: https://platform.openai.com/api-keys
4. Click "Create new secret key"
5. Copy the generated key and save it securely

### Pinecone API Key (Optional but Recommended)
1. Visit [Pinecone](https://www.pinecone.io/)
2. Sign up for an account or log in if you already have one
3. Navigate to the API keys section in your dashboard
4. Create a new API key
5. Copy the generated key and save it securely

### Pinecone Index Setup
1. In your Pinecone dashboard, create a new index
2. Name it "linkdao" (or update the PINECONE_INDEX_NAME in your .env file)
3. Select the appropriate environment/region
4. Note the environment name for your .env file

## Step 2: Configure Environment Variables

### Backend Environment Configuration
Navigate to the backend directory and edit the `.env` file:

```bash
cd /Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/backend
nano .env
```

Update the following variables with your actual keys:

```env
# OpenAI API Configuration
OPENAI_API_KEY=your_actual_openai_api_key_here

# Pinecone Vector Database Configuration
PINECONE_API_KEY=your_actual_pinecone_api_key_here
PINECONE_ENVIRONMENT=your_pinecone_environment_here
PINECONE_INDEX_NAME=linkdao

# Ethereum RPC URL for on-chain data
RPC_URL=https://mainnet.base.org

# Server Configuration
PORT=3002

# Frontend URL for CORS
FRONTEND_URL=http://localhost:3004
```

### Environment Variable Details

| Variable | Required | Description |
|----------|----------|-------------|
| OPENAI_API_KEY | Yes | Your OpenAI API key for accessing GPT models |
| PINECONE_API_KEY | No | Your Pinecone API key for vector database |
| PINECONE_ENVIRONMENT | No | Your Pinecone environment (e.g., us-west1-gcp) |
| PINECONE_INDEX_NAME | No | Your Pinecone index name (default: linkdao) |
| RPC_URL | Yes | Ethereum RPC endpoint for on-chain data |
| PORT | Yes | Backend server port (default: 3002) |
| FRONTEND_URL | Yes | Frontend URL for CORS configuration |

## Step 3: Install Dependencies

Ensure all dependencies are installed:

```bash
# Install backend dependencies
cd /Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/backend
npm install

# Install frontend dependencies
cd /Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/frontend
npm install
```

## Step 4: Build the Backend

Compile the TypeScript code:

```bash
cd /Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/backend
npm run build
```

## Step 5: Test the Setup

### Run Verification Script
```bash
cd /Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app
node scripts/verify-env.js
```

### Start the Backend
```bash
cd /Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/backend
npm run dev
```

### Test API Endpoints
Once the backend is running, test the AI endpoints:

```bash
# Get list of available bots
curl http://localhost:3002/api/ai/bots

# Test Wallet Guard bot
curl -X POST http://localhost:3002/api/ai/bots/wallet-guard/process \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Is this contract safe: 0x741f1923953245b6e52578205d83e468c1b390d4?",
    "userId": "0x1234567890123456789012345678901234567890"
  }'
```

## Step 6: Start the Frontend

In a new terminal window:

```bash
cd /Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/frontend
npm run dev
```

Visit http://localhost:3004 to access the frontend and test the AI chat interface.

## Troubleshooting

### Common Issues

1. **API Key Errors**
   - Verify that your API keys are correctly copied to the .env file
   - Ensure there are no extra spaces or characters in the keys
   - Check that your OpenAI account has billing configured

2. **Port Conflicts**
   - If port 3002 is already in use, change the PORT variable in .env
   - Update the FRONTEND_URL accordingly if you change the frontend port

3. **Dependency Issues**
   - Run `npm install --legacy-peer-deps` if you encounter peer dependency conflicts
   - Ensure you're using Node.js v16 or higher

4. **Compilation Errors**
   - Run `npm run build` in the backend directory to check for TypeScript errors
   - Ensure all environment variables are properly set

### Debugging Tips

1. **Check Backend Logs**
   ```bash
   cd /Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app/backend
   tail -f logs/server.log
   ```

2. **Test Environment Variables**
   ```bash
   cd /Users/bfguo/Dropbox/Mac/Documents/LinkDAO/app
   node scripts/verify-env.js
   ```

3. **Verify API Keys**
   - Test your OpenAI API key with a simple curl request:
   ```bash
   curl https://api.openai.com/v1/models \
     -H "Authorization: Bearer YOUR_OPENAI_API_KEY"
   ```

## Security Best Practices

1. **Protect Your API Keys**
   - Never commit API keys to version control
   - Use environment variables for all sensitive data
   - Rotate API keys regularly

2. **Environment-Specific Configuration**
   - Use different .env files for development, staging, and production
   - .env.development, .env.staging, .env.production

3. **Access Control**
   - Implement rate limiting for API endpoints
   - Use authentication for sensitive operations
   - Monitor API usage for unusual patterns

## Cost Management

1. **Monitor Usage**
   - Track OpenAI API usage through your dashboard
   - Set up billing alerts to avoid unexpected charges
   - Use caching for frequently requested responses

2. **Optimize Requests**
   - Use appropriate models for different tasks (cheaper models for simple tasks)
   - Limit the length of prompts and responses when possible
   - Batch requests when appropriate

## Next Steps

1. **Customize AI Bots**
   - Modify bot personalities and prompts
   - Add new specialized bots for specific use cases
   - Implement custom logic for bot interactions

2. **Enhance Frontend Integration**
   - Add AI features to more pages
   - Implement voice or image-based interactions
   - Create specialized UI components for different bot types

3. **Improve Performance**
   - Implement caching for AI responses
   - Add loading states and progress indicators
   - Optimize prompts for faster responses

4. **Add Analytics**
   - Track bot usage and user engagement
   - Monitor response quality and user satisfaction
   - Implement feedback mechanisms for continuous improvement

## Support

For issues with the AI setup:

1. Check the [AI Developer Guide](AI_DEVELOPER_GUIDE.md) for technical details
2. Review the [AI Integration Plan](AI_INTEGRATION_PLAN.md) for architectural information
3. Consult the [AI Setup and Usage Guide](AI_SETUP_AND_USAGE.md) for comprehensive instructions
4. Open an issue in the repository if you encounter bugs or problems

## Conclusion

You've successfully set up the AI features for LinkDAO! The platform now includes four specialized AI bots that enhance the user experience across social, wallet, and governance features. Remember to monitor your API usage and implement proper security measures to protect your users and your investment in these features.