export interface SocialLink {
  platform: string; // e.g., 'twitter', 'linkedin', 'github', 'website', 'instagram', 'facebook', 'youtube', 'discord', 'telegram'
  url: string;
  username?: string;
}

export interface UserProfile {
  id: string;
  walletAddress: string;
  handle: string;
  displayName?: string;
  ens: string;
  avatarCid: string;
  bannerCid?: string; // New: Banner image CID
  profileCid?: string; // Backend compatibility - some endpoints return profileCid instead of avatarCid
  bioCid: string;
  email?: string;
  socialLinks?: SocialLink[]; // New: Social media links
  website?: string; // New: Primary website
  // Billing Address
  billingFirstName?: string;
  billingLastName?: string;
  billingCompany?: string;
  billingAddress1?: string;
  billingAddress2?: string;
  billingCity?: string;
  billingState?: string;
  billingZipCode?: string;
  billingCountry?: string;
  billingPhone?: string;
  // Shipping Address
  shippingFirstName?: string;
  shippingLastName?: string;
  shippingCompany?: string;
  shippingAddress1?: string;
  shippingAddress2?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingZipCode?: string;
  shippingCountry?: string;
  shippingPhone?: string;
  shippingSameAsBilling?: boolean;
  isVerified?: boolean; // New: Explicit verification status
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserProfileInput {
  walletAddress: string;
  handle: string;
  ens?: string;
  avatarCid?: string;
  bannerCid?: string; // New
  bioCid?: string;
  socialLinks?: SocialLink[]; // New
  website?: string; // New
  // Billing Address
  billingFirstName?: string;
  billingLastName?: string;
  billingCompany?: string;
  billingAddress1?: string;
  billingAddress2?: string;
  billingCity?: string;
  billingState?: string;
  billingZipCode?: string;
  billingCountry?: string;
  billingPhone?: string;
  // Shipping Address
  shippingFirstName?: string;
  shippingLastName?: string;
  shippingCompany?: string;
  shippingAddress1?: string;
  shippingAddress2?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingZipCode?: string;
  shippingCountry?: string;
  shippingPhone?: string;
  shippingSameAsBilling?: boolean;
  displayName?: string;
}

export interface UpdateUserProfileInput {
  handle?: string;
  displayName?: string;
  ens?: string;
  avatarCid?: string;
  bannerCid?: string; // New
  bioCid?: string;
  email?: string;
  socialLinks?: SocialLink[]; // New
  website?: string; // New
  // Billing Address
  billingFirstName?: string;
  billingLastName?: string;
  billingCompany?: string;
  billingAddress1?: string;
  billingAddress2?: string;
  billingCity?: string;
  billingState?: string;
  billingZipCode?: string;
  billingCountry?: string;
  billingPhone?: string;
  // Shipping Address
  shippingFirstName?: string;
  shippingLastName?: string;
  shippingCompany?: string;
  shippingAddress1?: string;
  shippingAddress2?: string;
  shippingCity?: string;
  shippingState?: string;
  shippingZipCode?: string;
  shippingCountry?: string;
  shippingPhone?: string;
  shippingSameAsBilling?: boolean;
}