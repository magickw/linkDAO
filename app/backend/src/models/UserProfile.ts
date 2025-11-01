export interface UserProfile {
  id: string;
  walletAddress: string;
  handle: string;
  ens: string;
  avatarCid: string;
  bioCid: string;
  physicalAddress?: PhysicalAddress;
  createdAt: Date;
  updatedAt: Date;
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
  handle: string;
  ens?: string;
  avatarCid?: string;
  bioCid?: string;
  physicalAddress?: PhysicalAddress;
}

export interface UpdateUserProfileInput {
  handle?: string;
  ens?: string;
  avatarCid?: string;
  bioCid?: string;
  physicalAddress?: PhysicalAddress;
}
