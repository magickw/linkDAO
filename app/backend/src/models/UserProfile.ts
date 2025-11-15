export interface UserProfile {
  id: string;
  walletAddress: string;
  handle: string;        // Essential field with fallback
  displayName: string;   // Essential field with fallback
  ens?: string;
  avatarCid?: string;
  bioCid?: string;
  email?: string;
  physicalAddress?: PhysicalAddress;
  createdAt: Date;
  updatedAt: Date;
  // Billing address fields
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
  // Shipping address fields
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

export interface PhysicalAddress {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault?: boolean;
  type?: 'shipping' | 'billing';
}

export interface CreateUserProfileInput {
  walletAddress: string;
  handle?: string;
  displayName?: string;
  ens?: string;
  avatarCid?: string;
  bioCid?: string;
  physicalAddress?: PhysicalAddress;
  // Billing address fields
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
  // Shipping address fields
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

export interface UpdateUserProfileInput {
  handle?: string;
  displayName?: string;
  ens?: string;
  avatarCid?: string;
  bioCid?: string;
  email?: string;
  physicalAddress?: PhysicalAddress;
  // Billing address fields
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
  // Shipping address fields
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
