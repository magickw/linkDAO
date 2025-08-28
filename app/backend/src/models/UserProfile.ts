export interface UserProfile {
  id: string;
  address: string;
  handle: string;
  ens: string;
  avatarCid: string;
  bioCid: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserProfileInput {
  address: string;
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