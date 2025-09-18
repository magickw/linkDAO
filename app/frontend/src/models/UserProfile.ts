export interface UserProfile {
  id: string;
  walletAddress: string;
  handle: string;
  ens: string;
  avatarCid: string;
  bioCid: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserProfileInput {
  walletAddress: string;
  handle: string;
  ens?: string;
  avatarCid?: string;
  bioCid?: string;
}

export interface UpdateUserProfileInput {
  handle?: string;
  ens?: string;
  avatarCid?: string;
  bioCid?: string;
}