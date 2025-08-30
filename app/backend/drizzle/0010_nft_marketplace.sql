-- NFT Collections table
CREATE TABLE IF NOT EXISTS "nft_collections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"symbol" varchar(32) NOT NULL,
	"description" text,
	"image_hash" varchar(128) NOT NULL,
	"contract_address" varchar(66),
	"external_url" varchar(500),
	"max_supply" integer,
	"current_supply" integer DEFAULT 0,
	"mint_price" varchar(128) NOT NULL,
	"is_public_mint" boolean DEFAULT false,
	"royalty" integer NOT NULL,
	"is_verified" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "nft_collections_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action,
	CONSTRAINT "nft_collections_contract_address_unique" UNIQUE("contract_address")
);

-- NFTs table
CREATE TABLE IF NOT EXISTS "nfts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_id" uuid NOT NULL,
	"collection_id" uuid,
	"token_id" varchar(128),
	"contract_address" varchar(66),
	"name" varchar(255) NOT NULL,
	"description" text,
	"image_hash" varchar(128) NOT NULL,
	"animation_hash" varchar(128),
	"metadata_hash" varchar(128) NOT NULL,
	"metadata_uri" varchar(500) NOT NULL,
	"attributes" text,
	"royalty" integer NOT NULL,
	"content_hash" varchar(128) NOT NULL,
	"external_url" varchar(500),
	"is_verified" boolean DEFAULT false,
	"verified_at" timestamp,
	"verifier_id" uuid,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "nfts_creator_id_users_id_fk" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action,
	CONSTRAINT "nfts_collection_id_nft_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "nft_collections"("id") ON DELETE no action ON UPDATE no action,
	CONSTRAINT "nfts_verifier_id_users_id_fk" FOREIGN KEY ("verifier_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action,
	CONSTRAINT "nfts_content_hash_unique" UNIQUE("content_hash")
);

-- NFT Listings table
CREATE TABLE IF NOT EXISTS "nft_listings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nft_id" uuid NOT NULL,
	"seller_id" uuid NOT NULL,
	"price" varchar(128) NOT NULL,
	"currency" varchar(66) NOT NULL,
	"is_active" boolean DEFAULT true,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "nft_listings_nft_id_nfts_id_fk" FOREIGN KEY ("nft_id") REFERENCES "nfts"("id") ON DELETE no action ON UPDATE no action,
	CONSTRAINT "nft_listings_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action
);

-- NFT Auctions table
CREATE TABLE IF NOT EXISTS "nft_auctions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nft_id" uuid NOT NULL,
	"seller_id" uuid NOT NULL,
	"starting_price" varchar(128) NOT NULL,
	"reserve_price" varchar(128),
	"current_bid" varchar(128) DEFAULT '0',
	"current_bidder_id" uuid,
	"currency" varchar(66) NOT NULL,
	"is_active" boolean DEFAULT true,
	"end_time" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "nft_auctions_nft_id_nfts_id_fk" FOREIGN KEY ("nft_id") REFERENCES "nfts"("id") ON DELETE no action ON UPDATE no action,
	CONSTRAINT "nft_auctions_seller_id_users_id_fk" FOREIGN KEY ("seller_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action,
	CONSTRAINT "nft_auctions_current_bidder_id_users_id_fk" FOREIGN KEY ("current_bidder_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action
);

-- NFT Bids table
CREATE TABLE IF NOT EXISTS "nft_bids" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auction_id" uuid NOT NULL,
	"bidder_id" uuid NOT NULL,
	"amount" varchar(128) NOT NULL,
	"transaction_hash" varchar(66),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "nft_bids_auction_id_nft_auctions_id_fk" FOREIGN KEY ("auction_id") REFERENCES "nft_auctions"("id") ON DELETE no action ON UPDATE no action,
	CONSTRAINT "nft_bids_bidder_id_users_id_fk" FOREIGN KEY ("bidder_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action
);

-- NFT Offers table
CREATE TABLE IF NOT EXISTS "nft_offers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nft_id" uuid NOT NULL,
	"buyer_id" uuid NOT NULL,
	"amount" varchar(128) NOT NULL,
	"currency" varchar(66) NOT NULL,
	"is_active" boolean DEFAULT true,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "nft_offers_nft_id_nfts_id_fk" FOREIGN KEY ("nft_id") REFERENCES "nfts"("id") ON DELETE no action ON UPDATE no action,
	CONSTRAINT "nft_offers_buyer_id_users_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action
);

-- NFT Transfers table (for provenance tracking)
CREATE TABLE IF NOT EXISTS "nft_transfers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nft_id" uuid NOT NULL,
	"from_user_id" uuid,
	"to_user_id" uuid NOT NULL,
	"transaction_hash" varchar(66) NOT NULL,
	"block_number" integer NOT NULL,
	"price" varchar(128),
	"currency" varchar(66),
	"transfer_type" varchar(32) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "nft_transfers_nft_id_nfts_id_fk" FOREIGN KEY ("nft_id") REFERENCES "nfts"("id") ON DELETE no action ON UPDATE no action,
	CONSTRAINT "nft_transfers_from_user_id_users_id_fk" FOREIGN KEY ("from_user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action,
	CONSTRAINT "nft_transfers_to_user_id_users_id_fk" FOREIGN KEY ("to_user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action,
	CONSTRAINT "nft_transfers_transaction_hash_unique" UNIQUE("transaction_hash")
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "nfts_creator_created_idx" ON "nfts" ("creator_id","created_at");
CREATE INDEX IF NOT EXISTS "nfts_collection_idx" ON "nfts" ("collection_id");
CREATE INDEX IF NOT EXISTS "nft_listings_active_idx" ON "nft_listings" ("is_active","expires_at");
CREATE INDEX IF NOT EXISTS "nft_auctions_active_idx" ON "nft_auctions" ("is_active","end_time");
CREATE INDEX IF NOT EXISTS "nft_bids_auction_created_idx" ON "nft_bids" ("auction_id","created_at");
CREATE INDEX IF NOT EXISTS "nft_offers_active_idx" ON "nft_offers" ("is_active","expires_at");
CREATE INDEX IF NOT EXISTS "nft_transfers_nft_created_idx" ON "nft_transfers" ("nft_id","created_at");