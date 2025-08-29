import { z } from 'zod';

// Physical address validation schema
export const physicalAddressSchema = z.object({
  street: z.string().min(1, 'Street address is required').max(200, 'Street address too long'),
  city: z.string().min(1, 'City is required').max(100, 'City name too long'),
  state: z.string().min(1, 'State is required').max(100, 'State name too long'),
  postalCode: z.string().min(1, 'Postal code is required').max(20, 'Postal code too long'),
  country: z.string().min(1, 'Country is required').max(100, 'Country name too long'),
  isDefault: z.boolean().optional(),
  type: z.enum(['shipping', 'billing']).optional()
});

// User validation schemas
export const userProfileSchema = z.object({
  walletAddress: z.string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address format')
    .length(42, 'Wallet address must be 42 characters long'),
  handle: z.string()
    .min(1, 'Handle is required')
    .max(64, 'Handle must be 64 characters or less')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Handle can only contain letters, numbers, underscores, and hyphens'),
  ens: z.string()
    .max(255, 'ENS name too long')
    .optional(),
  avatarCid: z.string()
    .max(100, 'Avatar CID too long')
    .optional(),
  bioCid: z.string()
    .max(100, 'Bio CID too long')
    .optional(),
  physicalAddress: physicalAddressSchema.optional()
});

export const updateUserProfileSchema = userProfileSchema.partial().omit({ walletAddress: true });

// Product/Listing validation schemas
export const priceSchema = z.string()
  .regex(/^\d+(\.\d+)?$/, 'Price must be a valid decimal number')
  .refine((val) => parseFloat(val) > 0, 'Price must be greater than 0')
  .refine((val) => parseFloat(val) <= 1e18, 'Price too large');

export const createListingSchema = z.object({
  sellerWalletAddress: z.string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid seller wallet address format'),
  tokenAddress: z.string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid token address format'),
  price: priceSchema,
  quantity: z.number()
    .int('Quantity must be an integer')
    .min(1, 'Quantity must be at least 1')
    .max(1000000, 'Quantity too large'),
  itemType: z.enum(['PHYSICAL', 'DIGITAL', 'NFT', 'SERVICE'], {
    errorMap: () => ({ message: 'Item type must be PHYSICAL, DIGITAL, NFT, or SERVICE' })
  }),
  listingType: z.enum(['FIXED_PRICE', 'AUCTION'], {
    errorMap: () => ({ message: 'Listing type must be FIXED_PRICE or AUCTION' })
  }),
  duration: z.number()
    .int('Duration must be an integer')
    .min(3600, 'Duration must be at least 1 hour')
    .max(2592000, 'Duration cannot exceed 30 days')
    .optional(),
  metadataURI: z.string()
    .url('Metadata URI must be a valid URL')
    .max(500, 'Metadata URI too long'),
  nftStandard: z.enum(['ERC721', 'ERC1155'])
    .optional(),
  tokenId: z.string()
    .max(78, 'Token ID too long')
    .optional(),
  reservePrice: priceSchema.optional(),
  minIncrement: priceSchema.optional()
}).refine((data) => {
  // NFT items must have nftStandard and tokenId
  if (data.itemType === 'NFT') {
    return data.nftStandard && data.tokenId;
  }
  return true;
}, {
  message: 'NFT items must include nftStandard and tokenId',
  path: ['nftStandard']
}).refine((data) => {
  // Auction items must have reservePrice and minIncrement
  if (data.listingType === 'AUCTION') {
    return data.reservePrice && data.minIncrement;
  }
  return true;
}, {
  message: 'Auction items must include reservePrice and minIncrement',
  path: ['reservePrice']
});

export const updateListingSchema = z.object({
  price: priceSchema.optional(),
  quantity: z.number()
    .int('Quantity must be an integer')
    .min(0, 'Quantity cannot be negative')
    .max(1000000, 'Quantity too large')
    .optional()
});

// Bid validation schema
export const placeBidSchema = z.object({
  bidderWalletAddress: z.string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid bidder wallet address format'),
  amount: priceSchema
});

// Offer validation schema
export const makeOfferSchema = z.object({
  buyerWalletAddress: z.string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid buyer wallet address format'),
  amount: priceSchema
});

// Order validation schema
export const createOrderSchema = z.object({
  listingId: z.string()
    .regex(/^\d+$/, 'Listing ID must be a valid number'),
  buyerWalletAddress: z.string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid buyer wallet address format'),
  sellerWalletAddress: z.string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid seller wallet address format'),
  amount: priceSchema,
  paymentToken: z.string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid payment token address format'),
  escrowId: z.string()
    .regex(/^\d+$/, 'Escrow ID must be a valid number')
    .optional()
});

// Escrow validation schema
export const createEscrowSchema = z.object({
  listingId: z.string()
    .regex(/^\d+$/, 'Listing ID must be a valid number'),
  buyerWalletAddress: z.string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid buyer wallet address format'),
  deliveryInfo: z.string()
    .max(1000, 'Delivery info too long')
    .optional()
});

// Dispute validation schema
export const createDisputeSchema = z.object({
  escrowId: z.string()
    .regex(/^\d+$/, 'Escrow ID must be a valid number'),
  reporterWalletAddress: z.string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid reporter wallet address format'),
  reason: z.string()
    .min(10, 'Dispute reason must be at least 10 characters')
    .max(1000, 'Dispute reason too long'),
  evidence: z.array(z.string().url('Evidence must be valid URLs'))
    .max(10, 'Too many evidence items')
    .optional()
});

// Reputation validation schema
export const reputationSchema = z.object({
  walletAddress: z.string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid wallet address format'),
  score: z.number()
    .int('Score must be an integer')
    .min(0, 'Score cannot be negative')
    .max(1000, 'Score cannot exceed 1000'),
  daoApproved: z.boolean()
});

// Review validation schema
export const reviewSchema = z.object({
  reviewerId: z.string().uuid('Invalid reviewer ID'),
  revieweeId: z.string().uuid('Invalid reviewee ID'),
  orderId: z.string().uuid('Invalid order ID'),
  rating: z.number()
    .int('Rating must be an integer')
    .min(1, 'Rating must be at least 1')
    .max(5, 'Rating cannot exceed 5'),
  comment: z.string()
    .max(1000, 'Comment too long')
    .optional(),
  ipfsHash: z.string()
    .max(64, 'IPFS hash too long')
    .optional()
});

// Validation helper functions
export class ValidationHelper {
  static validateEthereumAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  static validatePrice(price: string): boolean {
    try {
      const num = parseFloat(price);
      return num > 0 && num <= 1e18 && /^\d+(\.\d+)?$/.test(price);
    } catch {
      return false;
    }
  }

  static validateIPFSHash(hash: string): boolean {
    // Basic IPFS hash validation (CIDv0 and CIDv1)
    return /^(Qm[1-9A-HJ-NP-Za-km-z]{44}|b[A-Za-z2-7]{58}|z[1-9A-HJ-NP-Za-km-z]{48})$/.test(hash);
  }

  static validateURL(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  static sanitizeString(input: string, maxLength: number = 1000): string {
    return input
      .trim()
      .slice(0, maxLength)
      .replace(/[<>]/g, ''); // Basic XSS prevention
  }

  static validateTokenId(tokenId: string): boolean {
    // Token ID can be a number or hex string
    return /^(0x)?[0-9a-fA-F]+$/.test(tokenId) && tokenId.length <= 78;
  }

  static validateQuantity(quantity: number): boolean {
    return Number.isInteger(quantity) && quantity > 0 && quantity <= 1000000;
  }

  static validateDuration(duration: number): boolean {
    return Number.isInteger(duration) && duration >= 3600 && duration <= 2592000;
  }
}

// Custom validation errors
export class ValidationError extends Error {
  public field: string;
  public code: string;

  constructor(message: string, field: string, code: string = 'VALIDATION_ERROR') {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.code = code;
  }
}

// Validation middleware helper
export function validateSchema<T>(schema: z.ZodSchema<T>) {
  return (data: unknown): T => {
    try {
      return schema.parse(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const firstError = error.errors[0];
        throw new ValidationError(
          firstError.message,
          firstError.path.join('.'),
          'SCHEMA_VALIDATION_ERROR'
        );
      }
      throw error;
    }
  };
}

// Export validation functions
export const validateUserProfile = validateSchema(userProfileSchema);
export const validateUpdateUserProfile = validateSchema(updateUserProfileSchema);
export const validateCreateListing = validateSchema(createListingSchema);
export const validateUpdateListing = validateSchema(updateListingSchema);
export const validatePlaceBid = validateSchema(placeBidSchema);
export const validateMakeOffer = validateSchema(makeOfferSchema);
export const validateCreateOrder = validateSchema(createOrderSchema);
export const validateCreateEscrow = validateSchema(createEscrowSchema);
export const validateCreateDispute = validateSchema(createDisputeSchema);
export const validateReputation = validateSchema(reputationSchema);
export const validateReview = validateSchema(reviewSchema);