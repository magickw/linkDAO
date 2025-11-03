import { logger } from '../utils/logger';

export interface ScamDetectionResult {
  isScam: boolean;
  confidence: number;
  category: string;
  patterns: string[];
  reasoning: string;
}

export interface ContentInput {
  text?: string;
  title?: string;
  metadata?: Record<string, any>;
  userProfile?: {
    handle?: string;
    bio?: string;
    profileImage?: string;
    walletAddress?: string;
    reputation?: number;
    accountAge?: number;
  };
}

/**
 * Custom Scam Detection Service
 * Implements crypto-specific scam detection patterns and models
 */
export class CustomScamDetectionService {
  private seedPhraseDetector: SeedPhraseDetector;
  private cryptoScamDetector: CryptoScamDetector;
  private impersonationDetector: ImpersonationDetector;
  private marketManipulationDetector: MarketManipulationDetector;
  private phishingDetector: PhishingDetector;

  constructor() {
    this.seedPhraseDetector = new SeedPhraseDetector();
    this.cryptoScamDetector = new CryptoScamDetector();
    this.impersonationDetector = new ImpersonationDetector();
    this.marketManipulationDetector = new MarketManipulationDetector();
    this.phishingDetector = new PhishingDetector();
  }

  /**
   * Analyze content for various scam patterns
   */
  async analyzeContent(content: ContentInput): Promise<ScamDetectionResult> {
    try {
      const results = await Promise.all([
        this.seedPhraseDetector.detect(content),
        this.cryptoScamDetector.detect(content),
        this.impersonationDetector.detect(content),
        this.marketManipulationDetector.detect(content),
        this.phishingDetector.detect(content)
      ]);

      // Aggregate results with weighted scoring
      const aggregatedResult = this.aggregateResults(results);
      
      logger.info('Scam detection analysis completed', {
        contentId: content.metadata?.contentId,
        isScam: aggregatedResult.isScam,
        confidence: aggregatedResult.confidence,
        category: aggregatedResult.category
      });

      return aggregatedResult;
    } catch (error) {
      logger.error('Error in scam detection analysis', { error });
      return {
        isScam: false,
        confidence: 0,
        category: 'error',
        patterns: [],
        reasoning: 'Analysis failed due to technical error'
      };
    }
  }

  /**
   * Aggregate results from multiple detectors
   */
  private aggregateResults(results: ScamDetectionResult[]): ScamDetectionResult {
    const scamResults = results.filter(r => r.isScam);
    
    if (scamResults.length === 0) {
      return {
        isScam: false,
        confidence: 0,
        category: 'clean',
        patterns: [],
        reasoning: 'No scam patterns detected'
      };
    }

    // Find highest confidence scam detection
    const highestConfidence = scamResults.reduce((max, current) => 
      current.confidence > max.confidence ? current : max
    );

    // Combine patterns from all positive detections
    const allPatterns = scamResults.flatMap(r => r.patterns);
    const allReasons = scamResults.map(r => r.reasoning).join('; ');

    return {
      isScam: true,
      confidence: highestConfidence.confidence,
      category: highestConfidence.category,
      patterns: [...new Set(allPatterns)], // Remove duplicates
      reasoning: allReasons
    };
  }
}

/**
 * Seed Phrase Detection
 * Detects potential seed phrases and private keys
 */
class SeedPhraseDetector {
  private readonly BIP39_WORDS = [
    'abandon', 'ability', 'able', 'about', 'above', 'absent', 'absorb', 'abstract', 'absurd', 'abuse',
    'access', 'accident', 'account', 'accuse', 'achieve', 'acid', 'acoustic', 'acquire', 'across', 'act',
    'action', 'actor', 'actress', 'actual', 'adapt', 'add', 'addict', 'address', 'adjust', 'admit',
    'adult', 'advance', 'advice', 'aerobic', 'affair', 'afford', 'afraid', 'again', 'age', 'agent',
    'agree', 'ahead', 'aim', 'air', 'airport', 'aisle', 'alarm', 'album', 'alcohol', 'alert',
    'alien', 'all', 'alley', 'allow', 'almost', 'alone', 'alpha', 'already', 'also', 'alter',
    'always', 'amateur', 'amazing', 'among', 'amount', 'amused', 'analyst', 'anchor', 'ancient', 'anger',
    'angle', 'angry', 'animal', 'ankle', 'announce', 'annual', 'another', 'answer', 'antenna', 'antique',
    'anxiety', 'any', 'apart', 'apology', 'appear', 'apple', 'approve', 'april', 'arch', 'arctic',
    'area', 'arena', 'argue', 'arm', 'armed', 'armor', 'army', 'around', 'arrange', 'arrest',
    'arrive', 'arrow', 'art', 'artefact', 'artist', 'artwork', 'ask', 'aspect', 'assault', 'asset',
    'assist', 'assume', 'asthma', 'athlete', 'atom', 'attack', 'attend', 'attitude', 'attract', 'auction',
    'audit', 'august', 'aunt', 'author', 'auto', 'autumn', 'average', 'avocado', 'avoid', 'awake',
    'aware', 'away', 'awesome', 'awful', 'awkward', 'axis', 'baby', 'bachelor', 'bacon', 'badge',
    'bag', 'balance', 'balcony', 'ball', 'bamboo', 'banana', 'banner', 'bar', 'barely', 'bargain',
    'barrel', 'base', 'basic', 'basket', 'battle', 'beach', 'bean', 'beauty', 'because', 'become',
    'beef', 'before', 'begin', 'behave', 'behind', 'believe', 'below', 'belt', 'bench', 'benefit',
    'best', 'betray', 'better', 'between', 'beyond', 'bicycle', 'bid', 'bike', 'bind', 'biology',
    'bird', 'birth', 'bitter', 'black', 'blade', 'blame', 'blanket', 'blast', 'bleak', 'bless',
    'blind', 'blood', 'blossom', 'blow', 'blue', 'blur', 'blush', 'board', 'boat', 'body',
    'boil', 'bomb', 'bone', 'bonus', 'book', 'boost', 'border', 'boring', 'borrow', 'boss',
    'bottom', 'bounce', 'box', 'boy', 'bracket', 'brain', 'brand', 'brass', 'brave', 'bread',
    'breeze', 'brick', 'bridge', 'brief', 'bright', 'bring', 'brisk', 'broccoli', 'broken', 'bronze',
    'broom', 'brother', 'brown', 'brush', 'bubble', 'buddy', 'budget', 'buffalo', 'build', 'bulb',
    'bulk', 'bullet', 'bundle', 'bunker', 'burden', 'burger', 'burst', 'bus', 'business', 'busy',
    'butter', 'buyer', 'buzz', 'cabbage', 'cabin', 'cable', 'cactus', 'cage', 'cake', 'call',
    'calm', 'camera', 'camp', 'can', 'canal', 'cancel', 'candy', 'cannon', 'canoe', 'canvas',
    'canyon', 'capable', 'capital', 'captain', 'car', 'carbon', 'card', 'care', 'career', 'careful',
    'careless', 'cargo', 'carpet', 'carry', 'cart', 'case', 'cash', 'casino', 'cast', 'casual',
    'cat', 'catalog', 'catch', 'category', 'cattle', 'caught', 'cause', 'caution', 'cave', 'ceiling',
    'celery', 'cement', 'census', 'century', 'cereal', 'certain', 'chair', 'chalk', 'champion', 'change',
    'chaos', 'chapter', 'charge', 'chase', 'chat', 'cheap', 'check', 'cheese', 'chef', 'cherry',
    'chest', 'chicken', 'chief', 'child', 'chimney', 'choice', 'choose', 'chronic', 'chuckle', 'chunk',
    'churn', 'cigar', 'cinnamon', 'circle', 'citizen', 'city', 'civil', 'claim', 'clamp', 'clarify',
    'claw', 'clay', 'clean', 'clerk', 'clever', 'click', 'client', 'cliff', 'climb', 'clinic',
    'clip', 'clock', 'clog', 'close', 'cloth', 'cloud', 'clown', 'club', 'clump', 'cluster',
    'clutch', 'coach', 'coast', 'coconut', 'code', 'coffee', 'coil', 'coin', 'collect', 'color',
    'column', 'combine', 'come', 'comfort', 'comic', 'common', 'company', 'concert', 'conduct', 'confirm',
    'congress', 'connect', 'consider', 'control', 'convince', 'cook', 'cool', 'copper', 'copy', 'coral',
    'core', 'corn', 'correct', 'cost', 'cotton', 'couch', 'country', 'couple', 'course', 'cousin',
    'cover', 'coyote', 'crack', 'cradle', 'craft', 'cram', 'crane', 'crash', 'crater', 'crawl',
    'crazy', 'cream', 'credit', 'creek', 'crew', 'cricket', 'crime', 'crisp', 'critic', 'crop',
    'cross', 'crouch', 'crowd', 'crucial', 'cruel', 'cruise', 'crumble', 'crunch', 'crush', 'cry',
    'crystal', 'cube', 'culture', 'cup', 'cupboard', 'curious', 'current', 'curtain', 'curve', 'cushion',
    'custom', 'cute', 'cycle', 'dad', 'damage', 'damp', 'dance', 'danger', 'daring', 'dash',
    'daughter', 'dawn', 'day', 'deal', 'debate', 'debris', 'decade', 'december', 'decide', 'decline',
    'decorate', 'decrease', 'deer', 'defense', 'define', 'defy', 'degree', 'delay', 'deliver', 'demand',
    'demise', 'denial', 'dentist', 'deny', 'depart', 'depend', 'deposit', 'depth', 'deputy', 'derive',
    'describe', 'desert', 'design', 'desk', 'despair', 'destroy', 'detail', 'detect', 'device', 'devote',
    'diagram', 'dial', 'diamond', 'diary', 'dice', 'diesel', 'diet', 'differ', 'digital', 'dignity',
    'dilemma', 'dinner', 'dinosaur', 'direct', 'dirt', 'disagree', 'discover', 'disease', 'dish', 'dismiss',
    'disorder', 'display', 'distance', 'divert', 'divide', 'divorce', 'dizzy', 'doctor', 'document', 'dog',
    'doll', 'dolphin', 'domain', 'donate', 'donkey', 'donor', 'door', 'dose', 'double', 'dove',
    'draft', 'dragon', 'drama', 'drape', 'draw', 'dream', 'dress', 'drift', 'drill', 'drink',
    'drip', 'drive', 'drop', 'drum', 'dry', 'duck', 'dumb', 'dune', 'during', 'dust',
    'dutch', 'duty', 'dwarf', 'dynamic', 'eager', 'eagle', 'early', 'earn', 'earth', 'easily',
    'east', 'easy', 'echo', 'ecology', 'economy', 'edge', 'edit', 'educate', 'effort', 'egg',
    'eight', 'either', 'elbow', 'elder', 'electric', 'elegant', 'element', 'elephant', 'elevator', 'elite',
    'else', 'embark', 'embody', 'embrace', 'emerge', 'emotion', 'employ', 'empower', 'empty', 'enable',
    'enact', 'end', 'endless', 'endorse', 'enemy', 'energy', 'enforce', 'engage', 'engine', 'enhance',
    'enjoy', 'enlist', 'enough', 'enrich', 'enroll', 'ensure', 'enter', 'entire', 'entry', 'envelope',
    'episode', 'equal', 'equip', 'era', 'erase', 'erode', 'erosion', 'error', 'erupt', 'escape',
    'essay', 'essence', 'estate', 'eternal', 'ethics', 'evidence', 'evil', 'evoke', 'evolve', 'exact',
    'example', 'excess', 'exchange', 'excite', 'exclude', 'excuse', 'execute', 'exercise', 'exhaust', 'exhibit',
    'exile', 'exist', 'exit', 'exotic', 'expand', 'expect', 'expire', 'explain', 'expose', 'express',
    'extend', 'extra', 'eye', 'eyebrow', 'fabric', 'face', 'faculty', 'fade', 'faint', 'faith',
    'fall', 'false', 'fame', 'family', 'famous', 'fan', 'fancy', 'fantasy', 'farm', 'fashion',
    'fat', 'fatal', 'father', 'fatigue', 'fault', 'favorite', 'feature', 'february', 'federal', 'fee',
    'feed', 'feel', 'female', 'fence', 'festival', 'fetch', 'fever', 'few', 'fiber', 'fiction',
    'field', 'figure', 'file', 'fill', 'film', 'filter', 'final', 'find', 'fine', 'finger',
    'finish', 'fire', 'firm', 'first', 'fiscal', 'fish', 'fit', 'fitness', 'fix', 'flag',
    'flame', 'flat', 'flavor', 'flee', 'flight', 'flip', 'float', 'flock', 'floor', 'flower',
    'fluid', 'flush', 'fly', 'foam', 'focus', 'fog', 'foil', 'fold', 'follow', 'food',
    'foot', 'force', 'forest', 'forget', 'fork', 'fortune', 'forum', 'forward', 'fossil', 'foster',
    'found', 'fox', 'frame', 'frequent', 'fresh', 'friend', 'fringe', 'frog', 'front', 'frost',
    'frown', 'frozen', 'fruit', 'fuel', 'fun', 'funny', 'furnace', 'fury', 'future', 'gadget',
    'gain', 'galaxy', 'gallery', 'game', 'gap', 'garage', 'garbage', 'garden', 'garlic', 'garment',
    'gas', 'gasp', 'gate', 'gather', 'gauge', 'gaze', 'general', 'genius', 'genre', 'gentle',
    'genuine', 'gesture', 'ghost', 'giant', 'gift', 'giggle', 'ginger', 'giraffe', 'girl', 'give',
    'glad', 'glance', 'glare', 'glass', 'glide', 'glimpse', 'globe', 'gloom', 'glory', 'glove',
    'glow', 'glue', 'goat', 'goddess', 'gold', 'good', 'goose', 'gorilla', 'gospel', 'gossip',
    'govern', 'gown', 'grab', 'grace', 'grain', 'grant', 'grape', 'grass', 'gravity', 'great',
    'green', 'grid', 'grief', 'grit', 'grocery', 'group', 'grow', 'grunt', 'guard', 'guess',
    'guide', 'guilt', 'guitar', 'gun', 'gym', 'habit', 'hair', 'half', 'hammer', 'hamster',
    'hand', 'happy', 'harbor', 'hard', 'harsh', 'harvest', 'hat', 'have', 'hawk', 'hazard',
    'head', 'health', 'heart', 'heavy', 'hedgehog', 'height', 'held', 'hello', 'helmet', 'help',
    'hen', 'hero', 'hidden', 'high', 'hill', 'hint', 'hip', 'hire', 'history', 'hobby',
    'hockey', 'hold', 'hole', 'holiday', 'hollow', 'home', 'honey', 'hood', 'hope', 'horn',
    'horror', 'horse', 'hospital', 'host', 'hotel', 'hour', 'hover', 'hub', 'huge', 'human',
    'humble', 'humor', 'hundred', 'hungry', 'hunt', 'hurdle', 'hurry', 'hurt', 'husband', 'hybrid',
    'ice', 'icon', 'idea', 'identify', 'idle', 'ignore', 'ill', 'illegal', 'illness', 'image',
    'imitate', 'immense', 'immune', 'impact', 'impose', 'improve', 'impulse', 'inch', 'include', 'income',
    'increase', 'index', 'indicate', 'indoor', 'industry', 'infant', 'inflict', 'inform', 'inhale', 'inherit',
    'initial', 'inject', 'injury', 'inmate', 'inner', 'innocent', 'input', 'inquiry', 'insane', 'insect',
    'inside', 'inspire', 'install', 'intact', 'interest', 'into', 'invest', 'invite', 'involve', 'iron',
    'island', 'isolate', 'issue', 'item', 'ivory', 'jacket', 'jaguar', 'jar', 'jazz', 'jealous',
    'jeans', 'jelly', 'jewel', 'job', 'join', 'joke', 'journey', 'joy', 'judge', 'juice',
    'jump', 'jungle', 'junior', 'junk', 'just', 'kangaroo', 'keen', 'keep', 'ketchup', 'key',
    'kick', 'kid', 'kidney', 'kind', 'kingdom', 'kiss', 'kit', 'kitchen', 'kite', 'kitten',
    'kiwi', 'knee', 'knife', 'knock', 'know', 'lab', 'label', 'labor', 'ladder', 'lady',
    'lake', 'lamp', 'language', 'laptop', 'large', 'later', 'latin', 'laugh', 'laundry', 'lava',
    'law', 'lawn', 'lawsuit', 'layer', 'lazy', 'leader', 'leaf', 'learn', 'leave', 'lecture',
    'left', 'leg', 'legal', 'legend', 'leisure', 'lemon', 'lend', 'length', 'lens', 'leopard',
    'lesson', 'letter', 'level', 'liar', 'liberty', 'library', 'license', 'life', 'lift', 'light',
    'like', 'limb', 'limit', 'link', 'lion', 'liquid', 'list', 'little', 'live', 'lizard',
    'load', 'loan', 'lobster', 'local', 'lock', 'logic', 'lonely', 'long', 'loop', 'lottery',
    'loud', 'lounge', 'love', 'loyal', 'lucky', 'luggage', 'lumber', 'lunar', 'lunch', 'luxury',
    'lying', 'machine', 'mad', 'magic', 'magnet', 'maid', 'mail', 'main', 'major', 'make',
    'mammal', 'man', 'manage', 'mandate', 'mango', 'mansion', 'manual', 'maple', 'marble', 'march',
    'margin', 'marine', 'market', 'marriage', 'mask', 'mass', 'master', 'match', 'material', 'math',
    'matrix', 'matter', 'maximum', 'maze', 'meadow', 'mean', 'measure', 'meat', 'mechanic', 'medal',
    'media', 'melody', 'melt', 'member', 'memory', 'mention', 'menu', 'mercy', 'merge', 'merit',
    'merry', 'mesh', 'message', 'metal', 'method', 'middle', 'midnight', 'milk', 'million', 'mimic',
    'mind', 'minimum', 'minor', 'minute', 'miracle', 'mirror', 'misery', 'miss', 'mistake', 'mix',
    'mixed', 'mixture', 'mobile', 'model', 'modify', 'mom', 'moment', 'monitor', 'monkey', 'monster',
    'month', 'moon', 'moral', 'more', 'morning', 'mosquito', 'mother', 'motion', 'motor', 'mountain',
    'mouse', 'move', 'movie', 'much', 'muffin', 'mule', 'multiply', 'muscle', 'museum', 'mushroom',
    'music', 'must', 'mutual', 'myself', 'mystery', 'myth', 'naive', 'name', 'napkin', 'narrow',
    'nasty', 'nation', 'nature', 'near', 'neck', 'need', 'negative', 'neglect', 'neither', 'nephew',
    'nerve', 'nest', 'net', 'network', 'neutral', 'never', 'news', 'next', 'nice', 'night',
    'noble', 'noise', 'nominee', 'noodle', 'normal', 'north', 'nose', 'notable', 'note', 'nothing',
    'notice', 'novel', 'now', 'nuclear', 'number', 'nurse', 'nut', 'oak', 'obey', 'object',
    'oblige', 'obscure', 'observe', 'obtain', 'obvious', 'occur', 'ocean', 'october', 'odor', 'off',
    'offer', 'office', 'often', 'oil', 'okay', 'old', 'olive', 'olympic', 'omit', 'once',
    'one', 'onion', 'online', 'only', 'open', 'opera', 'opinion', 'oppose', 'option', 'orange',
    'orbit', 'orchard', 'order', 'ordinary', 'organ', 'orient', 'original', 'orphan', 'ostrich', 'other',
    'outdoor', 'outer', 'output', 'outside', 'oval', 'oven', 'over', 'own', 'owner', 'oxygen',
    'oyster', 'ozone', 'pact', 'paddle', 'page', 'pair', 'palace', 'palm', 'panda', 'panel',
    'panic', 'panther', 'paper', 'parade', 'parent', 'park', 'parrot', 'part', 'pass', 'patch',
    'path', 'patient', 'patrol', 'pattern', 'pause', 'pave', 'payment', 'peace', 'peanut', 'pear',
    'peasant', 'pelican', 'pen', 'penalty', 'pencil', 'people', 'pepper', 'perfect', 'permit', 'person',
    'pet', 'phone', 'photo', 'phrase', 'physical', 'piano', 'picnic', 'picture', 'piece', 'pig',
    'pigeon', 'pill', 'pilot', 'pink', 'pioneer', 'pipe', 'pistol', 'pitch', 'pizza', 'place',
    'planet', 'plastic', 'plate', 'play', 'please', 'pledge', 'pluck', 'plug', 'plunge', 'poem',
    'poet', 'point', 'polar', 'pole', 'police', 'pond', 'pony', 'pool', 'popular', 'portion',
    'position', 'possible', 'post', 'potato', 'pottery', 'poverty', 'powder', 'power', 'practice', 'praise',
    'predict', 'prefer', 'prepare', 'present', 'pretty', 'prevent', 'price', 'pride', 'primary', 'print',
    'priority', 'prison', 'private', 'prize', 'problem', 'process', 'produce', 'profit', 'program', 'project',
    'promote', 'proof', 'property', 'prosper', 'protect', 'proud', 'provide', 'public', 'pudding', 'pull',
    'pulp', 'pulse', 'pumpkin', 'punch', 'pupil', 'puppy', 'purchase', 'purity', 'purpose', 'purse',
    'push', 'put', 'puzzle', 'pyramid', 'quality', 'quantum', 'quarter', 'question', 'quick', 'quiet',
    'quilt', 'quit', 'quiz', 'quote', 'rabbit', 'raccoon', 'race', 'rack', 'radar', 'radio',
    'rail', 'rain', 'raise', 'rally', 'ramp', 'ranch', 'random', 'range', 'rapid', 'rare',
    'rate', 'rather', 'raven', 'raw', 'razor', 'ready', 'real', 'reason', 'rebel', 'rebuild',
    'recall', 'receive', 'recipe', 'record', 'recycle', 'reduce', 'reflect', 'reform', 'refuse', 'region',
    'regret', 'regular', 'reject', 'relax', 'release', 'relief', 'rely', 'remain', 'remember', 'remind',
    'remove', 'render', 'renew', 'rent', 'reopen', 'repair', 'repeat', 'replace', 'report', 'require',
    'rescue', 'resemble', 'resist', 'resource', 'response', 'result', 'retire', 'retreat', 'return', 'reunion',
    'reveal', 'review', 'reward', 'rhythm', 'rib', 'ribbon', 'rice', 'rich', 'ride', 'ridge',
    'rifle', 'right', 'rigid', 'ring', 'riot', 'ripple', 'rise', 'risk', 'ritual', 'rival',
    'river', 'road', 'roast', 'rob', 'robot', 'robust', 'rocket', 'romance', 'roof', 'rookie',
    'room', 'rose', 'rotate', 'rough', 'round', 'route', 'royal', 'rubber', 'rude', 'rug',
    'rule', 'run', 'runway', 'rural', 'sad', 'saddle', 'sadness', 'safe', 'sail', 'salad',
    'salmon', 'salon', 'salt', 'salute', 'same', 'sample', 'sand', 'satisfy', 'satoshi', 'sauce',
    'sausage', 'save', 'say', 'scale', 'scan', 'scare', 'scatter', 'scene', 'scheme', 'school',
    'science', 'scissors', 'scorpion', 'scout', 'scrap', 'screen', 'script', 'scrub', 'sea', 'search',
    'season', 'seat', 'second', 'secret', 'section', 'security', 'seed', 'seek', 'segment', 'select',
    'sell', 'seminar', 'senior', 'sense', 'sentence', 'series', 'service', 'session', 'settle', 'setup',
    'seven', 'shadow', 'shaft', 'shallow', 'share', 'shed', 'shell', 'sheriff', 'shield', 'shift',
    'shine', 'ship', 'shirt', 'shock', 'shoe', 'shoot', 'shop', 'short', 'shoulder', 'shove',
    'shrimp', 'shrug', 'shuffle', 'shy', 'sibling', 'sick', 'side', 'siege', 'sight', 'sign',
    'silent', 'silk', 'silly', 'silver', 'similar', 'simple', 'since', 'sing', 'siren', 'sister',
    'situate', 'six', 'size', 'skate', 'sketch', 'ski', 'skill', 'skin', 'skirt', 'skull',
    'slab', 'slam', 'sleep', 'slender', 'slice', 'slide', 'slight', 'slim', 'slogan', 'slot',
    'slow', 'slush', 'small', 'smart', 'smile', 'smoke', 'smooth', 'snack', 'snake', 'snap',
    'sniff', 'snow', 'soap', 'soccer', 'social', 'sock', 'soda', 'soft', 'solar', 'sold',
    'soldier', 'solid', 'solution', 'solve', 'someone', 'song', 'soon', 'sorry', 'sort', 'soul',
    'sound', 'soup', 'source', 'south', 'space', 'spare', 'spatial', 'spawn', 'speak', 'special',
    'speed', 'spell', 'spend', 'sphere', 'spice', 'spider', 'spike', 'spin', 'spirit', 'split',
    'spoil', 'sponsor', 'spoon', 'sport', 'spot', 'spray', 'spread', 'spring', 'spy', 'square',
    'squeeze', 'squirrel', 'stable', 'stadium', 'staff', 'stage', 'stairs', 'stamp', 'stand', 'start',
    'state', 'stay', 'steak', 'steel', 'stem', 'step', 'stereo', 'stick', 'still', 'sting',
    'stock', 'stomach', 'stone', 'stool', 'story', 'stove', 'strategy', 'street', 'strike', 'strong',
    'struggle', 'student', 'stuff', 'stumble', 'style', 'subject', 'submit', 'subway', 'success', 'such',
    'sudden', 'suffer', 'sugar', 'suggest', 'suit', 'summer', 'sun', 'sunny', 'sunset', 'super',
    'supply', 'supreme', 'sure', 'surface', 'surge', 'surprise', 'surround', 'survey', 'suspect', 'sustain',
    'swallow', 'swamp', 'swap', 'swear', 'sweet', 'swift', 'swim', 'swing', 'switch', 'sword',
    'symbol', 'symptom', 'syrup', 'system', 'table', 'tackle', 'tag', 'tail', 'talent', 'talk',
    'tank', 'tape', 'target', 'task', 'taste', 'tattoo', 'taxi', 'teach', 'team', 'tell',
    'ten', 'tenant', 'tennis', 'tent', 'term', 'test', 'text', 'thank', 'that', 'theme',
    'then', 'theory', 'there', 'they', 'thing', 'this', 'thought', 'three', 'thrive', 'throw',
    'thumb', 'thunder', 'ticket', 'tide', 'tiger', 'tilt', 'timber', 'time', 'tiny', 'tip',
    'tired', 'tissue', 'title', 'toast', 'tobacco', 'today', 'toddler', 'toe', 'together', 'toilet',
    'token', 'tomato', 'tomorrow', 'tone', 'tongue', 'tonight', 'tool', 'tooth', 'top', 'topic',
    'topple', 'torch', 'tornado', 'tortoise', 'toss', 'total', 'tourist', 'toward', 'tower', 'town',
    'toy', 'track', 'trade', 'traffic', 'tragic', 'train', 'transfer', 'trap', 'trash', 'travel',
    'tray', 'treat', 'tree', 'trend', 'trial', 'tribe', 'trick', 'trigger', 'trim', 'trip',
    'trophy', 'trouble', 'truck', 'true', 'truly', 'trumpet', 'trust', 'truth', 'try', 'tube',
    'tuition', 'tumble', 'tuna', 'tunnel', 'turkey', 'turn', 'turtle', 'twelve', 'twenty', 'twice',
    'twin', 'twist', 'two', 'type', 'typical', 'ugly', 'umbrella', 'unable', 'unaware', 'uncle',
    'uncover', 'under', 'undo', 'unfair', 'unfold', 'unhappy', 'uniform', 'unique', 'unit', 'universe',
    'unknown', 'unlock', 'until', 'unusual', 'unveil', 'update', 'upgrade', 'uphold', 'upon', 'upper',
    'upset', 'urban', 'urge', 'usage', 'use', 'used', 'useful', 'useless', 'usual', 'utility',
    'vacant', 'vacuum', 'vague', 'valid', 'valley', 'valve', 'van', 'vanish', 'vapor', 'various',
    'vast', 'vault', 'vehicle', 'velvet', 'vendor', 'venture', 'venue', 'verb', 'verify', 'version',
    'very', 'vessel', 'veteran', 'viable', 'vibe', 'vicious', 'victory', 'video', 'view', 'village',
    'vintage', 'violin', 'virtual', 'virus', 'visa', 'visit', 'visual', 'vital', 'vivid', 'vocal',
    'voice', 'void', 'volcano', 'volume', 'vote', 'voyage', 'wage', 'wagon', 'wait', 'walk',
    'wall', 'walnut', 'want', 'warfare', 'warm', 'warrior', 'wash', 'wasp', 'waste', 'water',
    'wave', 'way', 'wealth', 'weapon', 'wear', 'weasel', 'weather', 'web', 'wedding', 'weekend',
    'weird', 'welcome', 'west', 'wet', 'what', 'wheat', 'wheel', 'when', 'where', 'whip',
    'whisper', 'wide', 'width', 'wife', 'wild', 'will', 'win', 'window', 'wine', 'wing',
    'wink', 'winner', 'winter', 'wire', 'wisdom', 'wise', 'wish', 'witness', 'wolf', 'woman',
    'wonder', 'wood', 'wool', 'word', 'work', 'world', 'worry', 'worth', 'wrap', 'wreck',
    'wrestle', 'wrist', 'write', 'wrong', 'yard', 'year', 'yellow', 'you', 'young', 'youth',
    'zebra', 'zero', 'zone', 'zoo'
  ];

  private readonly PRIVATE_KEY_PATTERNS = [
    /\b[0-9a-fA-F]{64}\b/, // 64 character hex string (private key)
    /\b0x[0-9a-fA-F]{64}\b/, // 0x prefixed private key
    /\bL[1-9A-HJ-NP-Za-km-z]{50,51}\b/, // WIF format private key
    /\bK[1-9A-HJ-NP-Za-km-z]{50,51}\b/, // WIF compressed private key
    /\b5[1-9A-HJ-NP-Za-km-z]{50,51}\b/, // WIF uncompressed private key
  ];

  async detect(content: ContentInput): Promise<ScamDetectionResult> {
    const text = `${content.text || ''} ${content.title || ''}`.toLowerCase();
    const patterns: string[] = [];
    let confidence = 0;

    // Check for seed phrase patterns
    const seedPhraseResult = this.detectSeedPhrase(text);
    if (seedPhraseResult.detected) {
      patterns.push('seed_phrase');
      confidence = Math.max(confidence, seedPhraseResult.confidence);
    }

    // Check for private key patterns
    const privateKeyResult = this.detectPrivateKey(text);
    if (privateKeyResult.detected) {
      patterns.push('private_key');
      confidence = Math.max(confidence, privateKeyResult.confidence);
    }

    // Check for wallet recovery phrases
    const recoveryPhraseResult = this.detectRecoveryPhrase(text);
    if (recoveryPhraseResult.detected) {
      patterns.push('recovery_phrase');
      confidence = Math.max(confidence, recoveryPhraseResult.confidence);
    }

    const isScam = patterns.length > 0;
    
    return {
      isScam,
      confidence,
      category: isScam ? 'seed_phrase_exposure' : 'clean',
      patterns,
      reasoning: isScam 
        ? `Detected potential seed phrase or private key exposure: ${patterns.join(', ')}`
        : 'No seed phrase or private key patterns detected'
    };
  }

  private detectSeedPhrase(text: string): { detected: boolean; confidence: number } {
    const words = text.split(/\s+/).filter(word => word.length > 2);
    const bip39Words = words.filter(word => this.BIP39_WORDS.includes(word.toLowerCase()));
    
    // Check for sequences of BIP39 words
    if (bip39Words.length >= 12) {
      return { detected: true, confidence: 0.95 };
    } else if (bip39Words.length >= 8) {
      return { detected: true, confidence: 0.80 };
    } else if (bip39Words.length >= 6) {
      return { detected: true, confidence: 0.60 };
    }

    // Check for seed phrase indicators
    const seedPhraseIndicators = [
      'seed phrase', 'mnemonic', 'recovery phrase', 'backup phrase',
      'wallet words', '12 words', '24 words', 'private words'
    ];

    const hasIndicator = seedPhraseIndicators.some(indicator => 
      text.includes(indicator.toLowerCase())
    );

    if (hasIndicator && bip39Words.length >= 4) {
      return { detected: true, confidence: 0.85 };
    }

    return { detected: false, confidence: 0 };
  }

  private detectPrivateKey(text: string): { detected: boolean; confidence: number } {
    for (const pattern of this.PRIVATE_KEY_PATTERNS) {
      if (pattern.test(text)) {
        return { detected: true, confidence: 0.99 };
      }
    }

    // Check for private key indicators
    const privateKeyIndicators = [
      'private key', 'priv key', 'secret key', 'wallet key'
    ];

    const hasIndicator = privateKeyIndicators.some(indicator => 
      text.includes(indicator.toLowerCase())
    );

    if (hasIndicator) {
      return { detected: true, confidence: 0.70 };
    }

    return { detected: false, confidence: 0 };
  }

  private detectRecoveryPhrase(text: string): { detected: boolean; confidence: number } {
    const recoveryIndicators = [
      'recovery phrase', 'backup words', 'restore wallet',
      'import wallet', 'wallet backup', 'mnemonic phrase'
    ];

    const hasIndicator = recoveryIndicators.some(indicator => 
      text.includes(indicator.toLowerCase())
    );

    if (hasIndicator) {
      return { detected: true, confidence: 0.75 };
    }

    return { detected: false, confidence: 0 };
  }
}

/**
 * Crypto Scam Pattern Detection
 * Detects common crypto scam patterns like fake giveaways, airdrops, etc.
 */
class CryptoScamDetector {
  private readonly SCAM_PATTERNS = {
    giveaway: [
      /\b(?:free|giving away|giveaway)\s+(?:\d+\s+)?(?:btc|eth|bitcoin|ethereum|usdt|usdc)\b/i,
      /\bsend\s+\d+.*(?:get|receive|return)\s+\d+/i,
      /\bdouble your (?:btc|eth|bitcoin|ethereum|crypto)/i,
      /\b(?:elon|musk|vitalik|bezos|gates)\s+(?:giveaway|giving)/i
    ],
    airdrop: [
      /\bfree\s+airdrop\b/i,
      /\bclaim your (?:free )?tokens?\b/i,
      /\blimited time airdrop\b/i,
      /\b(?:exclusive|special) airdrop\b/i
    ],
    investment: [
      /\bguaranteed (?:profit|returns?)\b/i,
      /\b(?:100%|guaranteed) (?:safe|secure) investment\b/i,
      /\bmake \$\d+.*(?:daily|weekly|monthly)\b/i,
      /\bno risk.*high return/i,
      /\bget rich quick/i
    ],
    urgency: [
      /\bact now\b/i,
      /\blimited time\b/i,
      /\bonly \d+ (?:spots?|places?) left\b/i,
      /\bexpires? (?:today|soon|in \d+)/i,
      /\bhurry up\b/i
    ],
    impersonation: [
      /\bofficial (?:elon|musk|vitalik|coinbase|binance)/i,
      /\bverified (?:account|profile)/i,
      /\bceo of (?:tesla|spacex|ethereum)/i
    ]
  };

  private readonly SUSPICIOUS_DOMAINS = [
    'bit.ly', 'tinyurl.com', 'short.link', 't.co',
    'goo.gl', 'ow.ly', 'buff.ly', 'is.gd'
  ];

  async detect(content: ContentInput): Promise<ScamDetectionResult> {
    const text = `${content.text || ''} ${content.title || ''}`;
    const patterns: string[] = [];
    let confidence = 0;

    // Check each scam pattern category
    for (const [category, regexes] of Object.entries(this.SCAM_PATTERNS)) {
      const categoryResult = this.checkPatternCategory(text, regexes, category);
      if (categoryResult.detected) {
        patterns.push(category);
        confidence = Math.max(confidence, categoryResult.confidence);
      }
    }

    // Check for suspicious URLs
    const urlResult = this.checkSuspiciousUrls(text);
    if (urlResult.detected) {
      patterns.push('suspicious_url');
      confidence = Math.max(confidence, urlResult.confidence);
    }

    // Check for multiple scam indicators (increases confidence)
    if (patterns.length > 1) {
      confidence = Math.min(0.95, confidence + 0.1 * (patterns.length - 1));
    }

    const isScam = patterns.length > 0;
    
    return {
      isScam,
      confidence,
      category: isScam ? 'crypto_scam' : 'clean',
      patterns,
      reasoning: isScam 
        ? `Detected crypto scam patterns: ${patterns.join(', ')}`
        : 'No crypto scam patterns detected'
    };
  }

  private checkPatternCategory(text: string, regexes: RegExp[], category: string): { detected: boolean; confidence: number } {
    const matches = regexes.filter(regex => regex.test(text));
    
    if (matches.length === 0) {
      return { detected: false, confidence: 0 };
    }

    // Higher confidence for more matches and certain categories
    let confidence = 0.6 + (matches.length * 0.1);
    
    if (category === 'giveaway' || category === 'investment') {
      confidence += 0.2; // These are high-risk categories
    }

    return { detected: true, confidence: Math.min(0.95, confidence) };
  }

  private checkSuspiciousUrls(text: string): { detected: boolean; confidence: number } {
    const urlRegex = /https?:\/\/[^\s]+/g;
    const urls: string[] = text.match(urlRegex) || [];
    
    const suspiciousUrls = urls.filter(url => 
      this.SUSPICIOUS_DOMAINS.some(domain => url.includes(domain))
    );

    if (suspiciousUrls.length > 0) {
      return { detected: true, confidence: 0.4 }; // Lower confidence, needs other indicators
    }

    return { detected: false, confidence: 0 };
  }
}

/**
 * Impersonation Detection
 * Detects attempts to impersonate known figures or brands
 */
class ImpersonationDetector {
  private readonly KNOWN_FIGURES = [
    'elon musk', 'vitalik buterin', 'satoshi nakamoto', 'changpeng zhao',
    'brian armstrong', 'michael saylor', 'jack dorsey', 'tim cook',
    'jeff bezos', 'bill gates', 'warren buffett'
  ];

  private readonly KNOWN_BRANDS = [
    'coinbase', 'binance', 'kraken', 'gemini', 'ftx', 'okx',
    'uniswap', 'opensea', 'metamask', 'ledger', 'trezor',
    'tesla', 'spacex', 'microsoft', 'apple', 'google', 'amazon'
  ];

  private readonly VERIFICATION_CLAIMS = [
    /\bverified\s+(?:account|profile|user)\b/i,
    /\bofficial\s+(?:account|profile|page)\b/i,
    /\bceo\s+of\b/i,
    /\bfounder\s+of\b/i,
    /\breal\s+(?:elon|vitalik|satoshi)\b/i
  ];

  async detect(content: ContentInput): Promise<ScamDetectionResult> {
    const text = `${content.text || ''} ${content.title || ''}`.toLowerCase();
    const userProfile = content.userProfile;
    const patterns: string[] = [];
    let confidence = 0;

    // Check profile impersonation
    const profileResult = this.checkProfileImpersonation(userProfile, text);
    if (profileResult.detected) {
      patterns.push('profile_impersonation');
      confidence = Math.max(confidence, profileResult.confidence);
    }

    // Check content impersonation claims
    const contentResult = this.checkContentImpersonation(text);
    if (contentResult.detected) {
      patterns.push('content_impersonation');
      confidence = Math.max(confidence, contentResult.confidence);
    }

    // Check for brand impersonation
    const brandResult = this.checkBrandImpersonation(text, userProfile);
    if (brandResult.detected) {
      patterns.push('brand_impersonation');
      confidence = Math.max(confidence, brandResult.confidence);
    }

    const isScam = patterns.length > 0;
    
    return {
      isScam,
      confidence,
      category: isScam ? 'impersonation' : 'clean',
      patterns,
      reasoning: isScam 
        ? `Detected impersonation attempts: ${patterns.join(', ')}`
        : 'No impersonation patterns detected'
    };
  }

  private checkProfileImpersonation(userProfile: any, text: string): { detected: boolean; confidence: number } {
    if (!userProfile) return { detected: false, confidence: 0 };

    const handle = userProfile.handle?.toLowerCase() || '';
    const bio = userProfile.bio?.toLowerCase() || '';

    // Check if handle closely matches known figures
    const handleSimilarity = this.KNOWN_FIGURES.some(figure => {
      const normalized = figure.replace(/\s+/g, '').toLowerCase();
      return handle.includes(normalized) || this.calculateSimilarity(handle, normalized) > 0.8;
    });

    // Check if bio claims to be someone famous
    const bioImpersonation = this.KNOWN_FIGURES.some(figure => 
      bio.includes(figure) || text.includes(`i am ${figure}`)
    );

    if (handleSimilarity || bioImpersonation) {
      return { detected: true, confidence: 0.85 };
    }

    return { detected: false, confidence: 0 };
  }

  private checkContentImpersonation(text: string): { detected: boolean; confidence: number } {
    const hasVerificationClaim = this.VERIFICATION_CLAIMS.some(pattern => pattern.test(text));
    const mentionsKnownFigure = this.KNOWN_FIGURES.some(figure => text.includes(figure));

    if (hasVerificationClaim && mentionsKnownFigure) {
      return { detected: true, confidence: 0.90 };
    } else if (hasVerificationClaim) {
      return { detected: true, confidence: 0.60 };
    }

    return { detected: false, confidence: 0 };
  }

  private checkBrandImpersonation(text: string, userProfile: any): { detected: boolean; confidence: number } {
    const handle = userProfile?.handle?.toLowerCase() || '';
    
    const brandInHandle = this.KNOWN_BRANDS.some(brand => 
      handle.includes(brand) && !handle.includes('fan') && !handle.includes('unofficial')
    );

    const brandClaims = this.KNOWN_BRANDS.some(brand => 
      text.includes(`official ${brand}`) || text.includes(`${brand} team`)
    );

    if (brandInHandle || brandClaims) {
      return { detected: true, confidence: 0.75 };
    }

    return { detected: false, confidence: 0 };
  }

  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }
}

/**
 * Market Manipulation Detection
 * Detects pump and dump schemes, coordinated trading signals
 */
class MarketManipulationDetector {
  private readonly PUMP_PATTERNS = [
    /\bpump\s+(?:and\s+)?dump\b/i,
    /\bto\s+the\s+moon\b/i,
    /\b(?:buy|pump)\s+now\s+before/i,
    /\bcoordinated\s+(?:buy|pump)\b/i,
    /\bmass\s+(?:buy|purchase)\b/i
  ];

  private readonly SIGNAL_PATTERNS = [
    /\btrading\s+signal\b/i,
    /\b(?:buy|sell)\s+signal\b/i,
    /\bentry\s+point\b/i,
    /\btarget\s+price\b/i,
    /\bstop\s+loss\b/i,
    /\b(?:long|short)\s+position\b/i
  ];

  private readonly MANIPULATION_INDICATORS = [
    /\bguaranteed\s+(?:profit|gains?)\b/i,
    /\b(?:100%|sure)\s+(?:win|profit)\b/i,
    /\binsider\s+(?:info|information|tip)\b/i,
    /\bwhale\s+(?:alert|movement)\b/i,
    /\bmarket\s+maker\s+(?:signal|tip)\b/i
  ];

  async detect(content: ContentInput): Promise<ScamDetectionResult> {
    const text = `${content.text || ''} ${content.title || ''}`;
    const patterns: string[] = [];
    let confidence = 0;

    // Check for pump and dump patterns
    const pumpResult = this.checkPatterns(text, this.PUMP_PATTERNS, 'pump_dump');
    if (pumpResult.detected) {
      patterns.push('pump_dump');
      confidence = Math.max(confidence, pumpResult.confidence);
    }

    // Check for trading signal patterns
    const signalResult = this.checkPatterns(text, this.SIGNAL_PATTERNS, 'trading_signal');
    if (signalResult.detected) {
      patterns.push('trading_signal');
      confidence = Math.max(confidence, signalResult.confidence);
    }

    // Check for manipulation indicators
    const manipulationResult = this.checkPatterns(text, this.MANIPULATION_INDICATORS, 'manipulation');
    if (manipulationResult.detected) {
      patterns.push('manipulation');
      confidence = Math.max(confidence, manipulationResult.confidence);
    }

    // Check for coordinated activity indicators
    const coordinationResult = this.checkCoordinationIndicators(text);
    if (coordinationResult.detected) {
      patterns.push('coordination');
      confidence = Math.max(confidence, coordinationResult.confidence);
    }

    const isScam = patterns.length > 0;
    
    return {
      isScam,
      confidence,
      category: isScam ? 'market_manipulation' : 'clean',
      patterns,
      reasoning: isScam 
        ? `Detected market manipulation patterns: ${patterns.join(', ')}`
        : 'No market manipulation patterns detected'
    };
  }

  private checkPatterns(text: string, patterns: RegExp[], category: string): { detected: boolean; confidence: number } {
    const matches = patterns.filter(pattern => pattern.test(text));
    
    if (matches.length === 0) {
      return { detected: false, confidence: 0 };
    }

    let confidence = 0.5 + (matches.length * 0.15);
    
    if (category === 'pump_dump' || category === 'manipulation') {
      confidence += 0.2; // Higher risk categories
    }

    return { detected: true, confidence: Math.min(0.90, confidence) };
  }

  private checkCoordinationIndicators(text: string): { detected: boolean; confidence: number } {
    const coordinationWords = [
      'everyone buy', 'all buy now', 'coordinated effort',
      'group buy', 'mass purchase', 'together we pump'
    ];

    const hasCoordination = coordinationWords.some(phrase => 
      text.toLowerCase().includes(phrase)
    );

    if (hasCoordination) {
      return { detected: true, confidence: 0.80 };
    }

    return { detected: false, confidence: 0 };
  }
}

/**
 * Phishing Detection
 * Detects wallet-related phishing attempts
 */
class PhishingDetector {
  private readonly PHISHING_PATTERNS = [
    /\bconnect\s+your\s+wallet\s+(?:to|for)\b/i,
    /\bverify\s+your\s+wallet\b/i,
    /\bvalidate\s+your\s+(?:wallet|account)\b/i,
    /\bupdate\s+your\s+wallet\s+security\b/i,
    /\bwallet\s+(?:suspended|locked|frozen)\b/i,
    /\bimmediate\s+action\s+required\b/i,
    /\bclick\s+here\s+to\s+(?:verify|validate|unlock)\b/i,
    /\byour\s+account\s+will\s+be\s+(?:suspended|closed|deleted)\b/i
  ];

  private readonly URGENCY_INDICATORS = [
    /\bwithin\s+\d+\s+hours?\b/i,
    /\bexpires?\s+(?:today|soon|in\s+\d+)\b/i,
    /\bact\s+immediately\b/i,
    /\burgent\s+action\b/i,
    /\btime\s+sensitive\b/i
  ];

  private readonly FAKE_SECURITY_CLAIMS = [
    /\bsecurity\s+breach\s+detected\b/i,
    /\bunauthorized\s+access\s+attempt\b/i,
    /\bsuspicious\s+activity\s+detected\b/i,
    /\byour\s+funds\s+are\s+at\s+risk\b/i,
    /\bsecurity\s+update\s+required\b/i
  ];

  async detect(content: ContentInput): Promise<ScamDetectionResult> {
    const text = `${content.text || ''} ${content.title || ''}`;
    const patterns: string[] = [];
    let confidence = 0;

    // Check for phishing patterns
    const phishingResult = this.checkPatterns(text, this.PHISHING_PATTERNS, 'phishing');
    if (phishingResult.detected) {
      patterns.push('phishing');
      confidence = Math.max(confidence, phishingResult.confidence);
    }

    // Check for urgency indicators
    const urgencyResult = this.checkPatterns(text, this.URGENCY_INDICATORS, 'urgency');
    if (urgencyResult.detected) {
      patterns.push('urgency');
      confidence = Math.max(confidence, urgencyResult.confidence);
    }

    // Check for fake security claims
    const securityResult = this.checkPatterns(text, this.FAKE_SECURITY_CLAIMS, 'fake_security');
    if (securityResult.detected) {
      patterns.push('fake_security');
      confidence = Math.max(confidence, securityResult.confidence);
    }

    // Check for suspicious links
    const linkResult = this.checkSuspiciousLinks(text);
    if (linkResult.detected) {
      patterns.push('suspicious_link');
      confidence = Math.max(confidence, linkResult.confidence);
    }

    // Multiple indicators increase confidence
    if (patterns.length > 1) {
      confidence = Math.min(0.95, confidence + 0.1 * (patterns.length - 1));
    }

    const isScam = patterns.length > 0;
    
    return {
      isScam,
      confidence,
      category: isScam ? 'phishing' : 'clean',
      patterns,
      reasoning: isScam 
        ? `Detected phishing patterns: ${patterns.join(', ')}`
        : 'No phishing patterns detected'
    };
  }

  private checkPatterns(text: string, patterns: RegExp[], category: string): { detected: boolean; confidence: number } {
    const matches = patterns.filter(pattern => pattern.test(text));
    
    if (matches.length === 0) {
      return { detected: false, confidence: 0 };
    }

    let confidence = 0.6 + (matches.length * 0.1);
    
    if (category === 'phishing' || category === 'fake_security') {
      confidence += 0.15; // Higher risk categories
    }

    return { detected: true, confidence: Math.min(0.90, confidence) };
  }

  private checkSuspiciousLinks(text: string): { detected: boolean; confidence: number } {
    const urlRegex = /https?:\/\/[^\s]+/g;
    const urls: string[] = text.match(urlRegex) || [];
    
    // Check for URL shorteners or suspicious domains
    const suspiciousDomains = [
      'bit.ly', 'tinyurl.com', 'short.link', 't.co', 'goo.gl'
    ];

    const hasSuspiciousUrl = urls.some(url => 
      suspiciousDomains.some(domain => url.includes(domain)) ||
      url.includes('metamask') && !url.includes('metamask.io') ||
      url.includes('coinbase') && !url.includes('coinbase.com')
    );

    if (hasSuspiciousUrl) {
      return { detected: true, confidence: 0.70 };
    }

    return { detected: false, confidence: 0 };
  }
}
