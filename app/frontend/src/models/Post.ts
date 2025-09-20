export interface Post {
  id: string;
  author: string;
  parentId: string | null;
  contentCid: string;
  mediaCids: string[];
  tags: string[];
  createdAt: Date;
  onchainRef: string;
}

export interface CreatePostInput {
  author: string;
  parentId?: string;
  content: string; // This would be uploaded to IPFS and the CID stored
  media?: string[]; // Media files would be uploaded to IPFS and CIDs stored
  tags?: string[];
  onchainRef?: string;
  poll?: any; // Poll data for poll posts
  proposal?: any; // Proposal data for governance posts
}

export interface UpdatePostInput {
  content?: string;
  media?: string[];
  tags?: string[];
}