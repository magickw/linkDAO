import { AIBot } from './aiService';
import { safeLogger } from '../utils/safeLogger';
import { WalletGuardBot } from './bots/walletGuardBot';
import { safeLogger } from '../utils/safeLogger';
import { ProposalSummarizerBot } from './bots/proposalSummarizerBot';
import { safeLogger } from '../utils/safeLogger';
import { CommunityModeratorBot } from './bots/communityModeratorBot';
import { safeLogger } from '../utils/safeLogger';
import { SocialCopilotBot } from './bots/socialCopilotBot';
import { safeLogger } from '../utils/safeLogger';

// Bot registry
const botRegistry: Map<string, AIBot> = new Map();

// Initialize bots only when needed
let botsInitialized = false;

function ensureBotsInitialized() {
  if (!botsInitialized) {
    botRegistry.set('wallet-guard', new WalletGuardBot());
    botRegistry.set('proposal-summarizer', new ProposalSummarizerBot());
    botRegistry.set('community-moderator', new CommunityModeratorBot());
    botRegistry.set('social-copilot', new SocialCopilotBot());
    botsInitialized = true;
    safeLogger.info('AI bots initialized:', Array.from(botRegistry.keys()));
  }
}

// Get a specific bot by ID
export function getBot(botId: string): AIBot | undefined {
  ensureBotsInitialized();
  return botRegistry.get(botId);
}

// Get all available bots
export function getAllBots(): { id: string; config: any }[] {
  ensureBotsInitialized();
  const bots = [];
  for (const [id, bot] of botRegistry.entries()) {
    bots.push({
      id,
      config: bot.getConfig()
    });
  }
  return bots;
}

// Process a message with a specific bot
export async function processMessageWithBot(botId: string, message: string, userId: string): Promise<any> {
  ensureBotsInitialized();
  const bot = getBot(botId);
  if (!bot) {
    throw new Error(`Bot with ID ${botId} not found`);
  }
  
  try {
    const response = await bot.processMessage(message, userId);
    return {
      botId,
      botName: bot.getConfig().name,
      response: response.content,
      tokensUsed: response.tokensUsed,
      model: response.model
    };
  } catch (error) {
    safeLogger.error(`Error processing message with bot ${botId}:`, error);
    throw new Error(`Failed to process message with ${botId} bot`);
  }
}

// Bot categories for easier discovery
export const BOT_CATEGORIES: { [key: string]: string[] } = {
  'wallet': ['wallet-guard'],
  'governance': ['proposal-summarizer'],
  'social': ['community-moderator', 'social-copilot'],
  'security': ['wallet-guard'],
  'content': ['social-copilot']
};

// Get bots by category
export function getBotsByCategory(category: string): { id: string; config: any }[] {
  ensureBotsInitialized();
  const botIds = BOT_CATEGORIES[category] || [];
  return botIds.map(id => {
    const bot = getBot(id);
    return bot ? { id, config: bot.getConfig() } : null;
  }).filter((item): item is { id: string; config: any } => item !== null);
}