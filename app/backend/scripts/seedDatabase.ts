#!/usr/bin/env ts-node

/**
 * Database Seeding System for Marketplace API Integration
 * 
 * This script generates realistic sample data for marketplace functionality:
 * - 50+ sample products across multiple categories
 * - 10+ sample sellers with complete profiles
 * - Sample user accounts, cart data, and order history
 * 
 * Usage:
 *   npm run seed:marketplace
 *   ts-node scripts/seedDatabase.ts
 *   ts-node scripts/seedDatabase.ts --users=20 --sellers=15 --products=100
 */

import { faker } from '@faker-js/faker';
import { db } from '../src/db/connection';
import { 
  users, 
  sellers, 
  products, 
  categories, 
  orders, 
  listings,
  reviews,
  carts,
  cartItems
} from '../src/db/schema';
import { eq } from 'drizzle-orm';

interface SeedOptions {
  users: number;
  sellers: number;
  products: number;
  categories: number;
  orders: number;
  clean: boolean;
}

export class DatabaseSeeder {
  private defaultOptions: SeedOptions = {
    users: 25,
    sellers: 12,
    products: 60,
    categories: 8,
    orders: 40,
    clean: true
  };

  /**
   * Main seeding function
   */
  async seed(options: Partial<SeedOptions> = {}): Promise<void> {
    if (!db) {
      throw new Error('Database connection not available. Please check DATABASE_URL environment variable.');
    }

    const opts = { ...this.defaultOptions, ...options };
    
    console.log('🌱 Starting marketplace database seeding...');
    console.log(`📊 Configuration:`, opts);

    try {
      if (opts.clean) {
        await this.clearData();
      }

      // Seed in dependency order
      const createdCategories = await this.seedCategories(opts.categories);
      console.log(`✅ Created ${createdCategories.length} product categories`);

      const createdUsers = await this.seedUsers(opts.users);
      console.log(`✅ Created ${createdUsers.length} users`);

      const createdSellers = await this.seedSellers(createdUsers.slice(0, opts.sellers));
      console.log(`✅ Created ${createdSellers.length} sellers`);

      const createdProducts = await this.seedProducts(createdSellers, createdCategories, opts.products);
      console.log(`✅ Created ${createdProducts.length} products`);

      const createdListings = await this.seedListings(createdProducts, createdSellers);
      console.log(`✅ Created ${createdListings.length} marketplace listings`);

      const createdOrders = await this.seedOrders(createdUsers, createdListings, opts.orders);
      console.log(`✅ Created ${createdOrders.length} orders`);

      const createdReviews = await this.seedReviews(createdOrders, createdUsers);
      console.log(`✅ Created ${createdReviews.length} reviews`);

      const createdCarts = await this.seedCarts(createdUsers, createdProducts);
      console.log(`✅ Created ${createdCarts.length} shopping carts`);

      console.log('🎉 Marketplace database seeding completed successfully!');
    } catch (error) {
      console.error('❌ Database seeding failed:', error);
      throw error;
    }
  }

  /**
   * Clear existing data
   */
  private async clearData(): Promise<void> {
    console.log('🧹 Clearing existing marketplace data...');
    
    try {
      // Clear in reverse dependency order
      await db.delete(cartItems);
      await db.delete(carts);
      await db.delete(reviews);
      await db.delete(orders);
      await db.delete(listings);
      await db.delete(products);
      await db.delete(sellers);
      await db.delete(categories);
      await db.delete(users);
      
      console.log('✅ Existing data cleared');
    } catch (error) {
      console.error('❌ Data clearing failed:', error);
      throw error;
    }
  }

  /**
   * Seed product categories
   */
  private async seedCategories(count: number): Promise<any[]> {
    const categoryData = [
      { name: 'Electronics', slug: 'electronics', description: 'Computers, phones, gadgets and electronic devices' },
      { name: 'Fashion & Apparel', slug: 'fashion', description: 'Clothing, shoes, accessories and fashion items' },
      { name: 'Home & Garden', slug: 'home-garden', description: 'Furniture, decor, tools and garden supplies' },
      { name: 'Sports & Outdoors', slug: 'sports', description: 'Athletic gear, outdoor equipment and fitness items' },
      { name: 'Books & Media', slug: 'books-media', description: 'Books, movies, music and educational content' },
      { name: 'Art & Collectibles', slug: 'art', description: 'Artwork, collectibles and unique creative items' },
      { name: 'Digital Assets', slug: 'digital', description: 'Digital downloads, software and virtual items' },
      { name: 'NFTs & Crypto', slug: 'nfts', description: 'Non-fungible tokens and crypto collectibles' },
      { name: 'Automotive', slug: 'automotive', description: 'Car parts, accessories and automotive supplies' },
      { name: 'Health & Beauty', slug: 'health-beauty', description: 'Skincare, cosmetics and wellness products' }
    ];

    const categoriesToCreate = categoryData.slice(0, count).map(cat => ({
      id: faker.string.uuid(),
      name: cat.name,
      slug: cat.slug,
      description: cat.description,
      path: JSON.stringify([cat.name]),
      imageUrl: faker.image.urlPicsumPhotos({ width: 400, height: 300 }),
      isActive: true,
      sortOrder: faker.number.int({ min: 0, max: 100 }),
      createdAt: faker.date.past({ years: 1 }),
      updatedAt: new Date()
    }));

    return await db.insert(categories).values(categoriesToCreate).returning();
  }

  /**
   * Seed users
   */
  private async seedUsers(count: number): Promise<any[]> {
    const usersData = [];
    
    for (let i = 0; i < count; i++) {
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      
      usersData.push({
        id: faker.string.uuid(),
        walletAddress: faker.finance.ethereumAddress(),
        handle: faker.internet.userName({ firstName, lastName }).toLowerCase(),
        
        // Billing address
        billingFirstName: firstName,
        billingLastName: lastName,
        billingCompany: Math.random() > 0.7 ? faker.company.name() : null,
        billingAddress1: faker.location.streetAddress(),
        billingAddress2: Math.random() > 0.8 ? faker.location.secondaryAddress() : null,
        billingCity: faker.location.city(),
        billingState: faker.location.state(),
        billingZipCode: faker.location.zipCode(),
        billingCountry: faker.location.countryCode(),
        billingPhone: faker.phone.number(),
        
        // Shipping address (sometimes same as billing)
        shippingSameAsBilling: Math.random() > 0.3,
        shippingFirstName: Math.random() > 0.3 ? firstName : faker.person.firstName(),
        shippingLastName: Math.random() > 0.3 ? lastName : faker.person.lastName(),
        shippingAddress1: Math.random() > 0.3 ? faker.location.streetAddress() : null,
        shippingCity: Math.random() > 0.3 ? faker.location.city() : null,
        shippingState: Math.random() > 0.3 ? faker.location.state() : null,
        shippingZipCode: Math.random() > 0.3 ? faker.location.zipCode() : null,
        shippingCountry: Math.random() > 0.3 ? faker.location.countryCode() : null,
        shippingPhone: Math.random() > 0.3 ? faker.phone.number() : null,
        
        createdAt: faker.date.past({ years: 2 })
      });
    }

    return await db.insert(users).values(usersData).returning();
  }

  /**
   * Seed sellers with complete profiles
   */
  private async seedSellers(userList: any[]): Promise<any[]> {
    const sellersData = userList.map(user => ({
      id: faker.number.int({ min: 1, max: 999999 }),
      walletAddress: user.walletAddress,
      displayName: faker.person.fullName(),
      storeName: faker.company.name() + (Math.random() > 0.5 ? ' Store' : ' Shop'),
      bio: faker.lorem.paragraph(),
      description: faker.lorem.paragraphs(2),
      sellerStory: faker.lorem.paragraphs(3),
      location: `${faker.location.city()}, ${faker.location.state()}`,
      
      // Images
      profileImageIpfs: faker.string.alphanumeric(46),
      profileImageCdn: faker.image.avatar(),
      coverImageIpfs: faker.string.alphanumeric(46),
      coverImageCdn: faker.image.urlPicsumPhotos({ width: 1200, height: 400 }),
      
      // Social links
      websiteUrl: Math.random() > 0.6 ? faker.internet.url() : null,
      twitterHandle: Math.random() > 0.5 ? faker.internet.userName() : null,
      discordHandle: Math.random() > 0.7 ? faker.internet.userName() + '#' + faker.string.numeric(4) : null,
      telegramHandle: Math.random() > 0.8 ? faker.internet.userName() : null,
      
      // Performance metrics
      performanceMetrics: JSON.stringify({
        totalSales: faker.number.int({ min: 0, max: 1000 }),
        averageRating: faker.number.float({ min: 3.0, max: 5.0, fractionDigits: 1 }),
        responseTime: faker.number.int({ min: 1, max: 48 }), // hours
        completionRate: faker.number.float({ min: 0.8, max: 1.0, fractionDigits: 2 }),
        repeatCustomers: faker.number.int({ min: 0, max: 200 })
      }),
      
      // Verification
      isVerified: Math.random() > 0.3,
      verificationLevels: JSON.stringify({
        identity: Math.random() > 0.4,
        business: Math.random() > 0.6,
        address: Math.random() > 0.5,
        phone: Math.random() > 0.3,
        email: Math.random() > 0.2
      }),
      
      // ENS (optional)
      ensHandle: Math.random() > 0.8 ? faker.internet.userName().toLowerCase() + '.eth' : null,
      ensVerified: Math.random() > 0.9,
      ensLastVerified: Math.random() > 0.9 ? faker.date.recent() : null,
      
      // Status
      isOnline: Math.random() > 0.4,
      lastSeen: faker.date.recent({ days: 7 }),
      tier: faker.helpers.arrayElement(['basic', 'premium', 'pro', 'enterprise']),
      
      // Onboarding
      onboardingCompleted: Math.random() > 0.2,
      onboardingSteps: JSON.stringify({
        profile_setup: Math.random() > 0.1,
        verification: Math.random() > 0.3,
        payout_setup: Math.random() > 0.4,
        first_listing: Math.random() > 0.2
      }),
      
      createdAt: faker.date.past({ years: 1 }),
      updatedAt: faker.date.recent({ days: 30 })
    }));

    return await db.insert(sellers).values(sellersData).returning();
  }

  /**
   * Seed products with realistic data
   */
  private async seedProducts(sellerList: any[], categoryList: any[], count: number): Promise<any[]> {
    const productsData = [];
    
    for (let i = 0; i < count; i++) {
      const seller = faker.helpers.arrayElement(sellerList);
      const category = faker.helpers.arrayElement(categoryList);
      const isDigital = category.slug === 'digital' || category.slug === 'nfts';
      const isNFT = category.slug === 'nfts';
      
      // Generate realistic pricing based on category
      const priceRanges = {
        'electronics': { min: 50, max: 2000 },
        'fashion': { min: 20, max: 500 },
        'home-garden': { min: 15, max: 800 },
        'sports': { min: 25, max: 1200 },
        'books-media': { min: 5, max: 100 },
        'art': { min: 100, max: 5000 },
        'digital': { min: 1, max: 200 },
        'nfts': { min: 0.01, max: 50 },
        'automotive': { min: 30, max: 3000 },
        'health-beauty': { min: 10, max: 300 }
      };
      
      const priceRange = priceRanges[category.slug as keyof typeof priceRanges] || { min: 10, max: 500 };
      const fiatPrice = faker.number.float({ 
        min: priceRange.min, 
        max: priceRange.max, 
        fractionDigits: 2 
      });
      
      // Convert to crypto price (assuming 1 ETH = $2000)
      const cryptoPrice = fiatPrice / 2000;
      
      productsData.push({
        id: faker.string.uuid(),
        sellerId: seller.walletAddress,
        title: this.generateProductTitle(category.name),
        description: this.generateProductDescription(category.name),
        priceAmount: fiatPrice.toString(),
        priceCurrency: 'USD',
        categoryId: category.id,
        
        // Images
        images: JSON.stringify([
          faker.image.urlPicsumPhotos({ width: 800, height: 600 }),
          faker.image.urlPicsumPhotos({ width: 800, height: 600 }),
          faker.image.urlPicsumPhotos({ width: 800, height: 600 })
        ]),
        
        // Enhanced image fields
        imageIpfsHashes: JSON.stringify([
          faker.string.alphanumeric(46),
          faker.string.alphanumeric(46),
          faker.string.alphanumeric(46)
        ]),
        
        imageCdnUrls: JSON.stringify({
          thumbnail: faker.image.urlPicsumPhotos({ width: 200, height: 200 }),
          medium: faker.image.urlPicsumPhotos({ width: 400, height: 400 }),
          large: faker.image.urlPicsumPhotos({ width: 800, height: 800 })
        }),
        
        primaryImageIndex: 0,
        
        // Metadata
        metadata: JSON.stringify({
          brand: faker.company.name(),
          model: faker.commerce.productName(),
          condition: faker.helpers.arrayElement(['new', 'like-new', 'good', 'fair']),
          weight: isDigital ? null : faker.number.float({ min: 0.1, max: 50, fractionDigits: 1 }),
          dimensions: isDigital ? null : {
            length: faker.number.float({ min: 1, max: 100, fractionDigits: 1 }),
            width: faker.number.float({ min: 1, max: 100, fractionDigits: 1 }),
            height: faker.number.float({ min: 1, max: 100, fractionDigits: 1 })
          },
          materials: isDigital ? null : faker.helpers.arrayElements([
            'plastic', 'metal', 'wood', 'fabric', 'glass', 'ceramic'
          ], { min: 1, max: 3 }),
          colors: faker.helpers.arrayElements([
            'black', 'white', 'red', 'blue', 'green', 'yellow', 'purple', 'orange'
          ], { min: 1, max: 2 })
        }),
        
        inventory: isDigital ? null : faker.number.int({ min: 0, max: 100 }),
        status: faker.helpers.arrayElement(['active', 'inactive', 'sold_out']),
        
        // Tags
        tags: JSON.stringify(this.generateProductTags(category.name)),
        
        // Shipping info
        shipping: isDigital ? null : JSON.stringify({
          freeShipping: Math.random() > 0.4,
          shippingCost: Math.random() > 0.4 ? 0 : faker.number.float({ min: 5, max: 50, fractionDigits: 2 }),
          estimatedDays: faker.number.int({ min: 1, max: 14 }),
          shippingMethods: faker.helpers.arrayElements([
            'standard', 'express', 'overnight', 'pickup'
          ], { min: 1, max: 3 })
        }),
        
        // NFT info
        nft: isNFT ? JSON.stringify({
          tokenId: faker.string.numeric(6),
          contractAddress: faker.finance.ethereumAddress(),
          blockchain: 'ethereum',
          standard: 'ERC721',
          royalties: faker.number.float({ min: 0, max: 10, fractionDigits: 1 })
        }) : null,
        
        // Stats
        views: faker.number.int({ min: 0, max: 1000 }),
        favorites: faker.number.int({ min: 0, max: 100 }),
        
        // Listing details
        listingStatus: faker.helpers.arrayElement(['draft', 'active', 'paused', 'sold']),
        publishedAt: Math.random() > 0.2 ? faker.date.past({ years: 1 }) : null,
        
        // SEO
        seoTitle: null, // Will be auto-generated
        seoDescription: null, // Will be auto-generated
        seoKeywords: JSON.stringify(this.generateProductTags(category.name)),
        
        createdAt: faker.date.past({ years: 1 }),
        updatedAt: faker.date.recent({ days: 30 })
      });
    }

    return await db.insert(products).values(productsData).returning();
  }

  /**
   * Seed marketplace listings
   */
  private async seedListings(productList: any[], sellerList: any[]): Promise<any[]> {
    const listingsData = productList.map(product => {
      const seller = sellerList.find(s => s.walletAddress === product.sellerId);
      const isAuction = Math.random() > 0.8;
      
      return {
        id: faker.number.int({ min: 1, max: 999999 }),
        sellerId: seller?.walletAddress || faker.string.uuid(),
        productId: product.id,
        tokenAddress: faker.finance.ethereumAddress(),
        price: product.priceAmount,
        quantity: faker.number.int({ min: 1, max: 10 }),
        itemType: faker.helpers.arrayElement(['PHYSICAL', 'DIGITAL', 'NFT', 'SERVICE']),
        listingType: isAuction ? 'AUCTION' : 'FIXED_PRICE',
        status: faker.helpers.arrayElement(['active', 'inactive', 'sold', 'expired']),
        startTime: faker.date.past({ years: 1 }),
        endTime: isAuction ? faker.date.future({ days: 7 }) : null,
        highestBid: isAuction ? faker.number.float({ min: 0, max: parseFloat(product.priceAmount), fractionDigits: 2 }).toString() : null,
        highestBidder: isAuction && Math.random() > 0.5 ? faker.finance.ethereumAddress() : null,
        metadataURI: `ipfs://${faker.string.alphanumeric(46)}`,
        isEscrowed: Math.random() > 0.6,
        reservePrice: isAuction ? faker.number.float({ min: 0, max: parseFloat(product.priceAmount) * 0.8, fractionDigits: 2 }).toString() : null,
        minIncrement: isAuction ? faker.number.float({ min: 1, max: 50, fractionDigits: 2 }).toString() : null,
        reserveMet: isAuction ? Math.random() > 0.5 : false,
        createdAt: faker.date.past({ years: 1 }),
        updatedAt: faker.date.recent({ days: 30 })
      };
    });

    return await db.insert(listings).values(listingsData).returning();
  }

  /**
   * Seed orders with realistic order history
   */
  private async seedOrders(userList: any[], listingList: any[], count: number): Promise<any[]> {
    const ordersData = [];
    
    for (let i = 0; i < count; i++) {
      const buyer = faker.helpers.arrayElement(userList);
      const listing = faker.helpers.arrayElement(listingList);
      const orderTotal = faker.number.float({ min: 10, max: 500, fractionDigits: 2 });
      
      ordersData.push({
        id: faker.number.int({ min: 1, max: 999999 }),
        listingId: listing.id,
        buyerId: buyer.id,
        sellerId: listing.sellerId,
        amount: orderTotal.toString(),
        paymentToken: faker.finance.ethereumAddress(),
        status: faker.helpers.arrayElement(['pending', 'completed', 'disputed', 'refunded', 'cancelled']),
        
        // Enhanced order fields
        checkoutSessionId: faker.string.alphanumeric(32),
        paymentMethod: faker.helpers.arrayElement(['crypto', 'fiat', 'escrow']),
        paymentDetails: JSON.stringify({
          method: faker.helpers.arrayElement(['stripe', 'paypal', 'ethereum', 'bitcoin']),
          transactionId: faker.string.alphanumeric(32),
          processingFee: faker.number.float({ min: 0.5, max: 10, fractionDigits: 2 })
        }),
        
        // Addresses
        shippingAddress: JSON.stringify({
          firstName: buyer.shippingFirstName || buyer.billingFirstName,
          lastName: buyer.shippingLastName || buyer.billingLastName,
          address1: buyer.shippingAddress1 || buyer.billingAddress1,
          city: buyer.shippingCity || buyer.billingCity,
          state: buyer.shippingState || buyer.billingState,
          zipCode: buyer.shippingZipCode || buyer.billingZipCode,
          country: buyer.shippingCountry || buyer.billingCountry,
          phone: buyer.shippingPhone || buyer.billingPhone
        }),
        
        billingAddress: JSON.stringify({
          firstName: buyer.billingFirstName,
          lastName: buyer.billingLastName,
          address1: buyer.billingAddress1,
          city: buyer.billingCity,
          state: buyer.billingState,
          zipCode: buyer.billingZipCode,
          country: buyer.billingCountry,
          phone: buyer.billingPhone
        }),
        
        orderNotes: Math.random() > 0.7 ? faker.lorem.sentence() : null,
        trackingNumber: Math.random() > 0.5 ? faker.string.alphanumeric(12).toUpperCase() : null,
        trackingCarrier: Math.random() > 0.5 ? faker.helpers.arrayElement(['UPS', 'FedEx', 'USPS', 'DHL']) : null,
        estimatedDelivery: faker.date.future({ days: 14 }),
        actualDelivery: Math.random() > 0.6 ? faker.date.recent({ days: 7 }) : null,
        
        totalAmount: orderTotal.toString(),
        currency: 'USD',
        orderMetadata: JSON.stringify({
          source: faker.helpers.arrayElement(['web', 'mobile', 'api']),
          userAgent: faker.internet.userAgent(),
          ipAddress: faker.internet.ip(),
          referrer: Math.random() > 0.5 ? faker.internet.url() : null
        }),
        
        createdAt: faker.date.past({ years: 1 })
      });
    }

    return await db.insert(orders).values(ordersData).returning();
  }

  /**
   * Seed reviews for completed orders
   */
  private async seedReviews(orderList: any[], userList: any[]): Promise<any[]> {
    // Only create reviews for ~60% of completed orders
    const completedOrders = orderList.filter(order => order.status === 'completed');
    const reviewableOrders = faker.helpers.arrayElements(completedOrders, { min: Math.floor(completedOrders.length * 0.4), max: Math.floor(completedOrders.length * 0.8) });
    
    const reviewsData = reviewableOrders.map(order => {
      const reviewer = userList.find(u => u.id === order.buyerId);
      const reviewee = userList.find(u => u.id === order.sellerId);
      
      return {
        id: faker.string.uuid(),
        reviewerId: reviewer?.id || faker.string.uuid(),
        revieweeId: reviewee?.id || faker.string.uuid(),
        orderId: order.id,
        rating: faker.number.int({ min: 1, max: 5 }),
        title: faker.lorem.sentence({ min: 3, max: 8 }),
        comment: faker.lorem.paragraphs(faker.number.int({ min: 1, max: 3 })),
        isVerified: true, // Since it's from a real order
        helpfulCount: faker.number.int({ min: 0, max: 20 }),
        reportCount: faker.number.int({ min: 0, max: 2 }),
        status: faker.helpers.arrayElement(['active', 'pending', 'hidden']),
        createdAt: faker.date.between({ from: order.createdAt, to: new Date() }),
        updatedAt: faker.date.recent({ days: 7 })
      };
    });

    return await db.insert(reviews).values(reviewsData).returning();
  }

  /**
   * Seed shopping carts for active users
   */
  private async seedCarts(userList: any[], productList: any[]): Promise<any[]> {
    // Create carts for ~40% of users
    const usersWithCarts = faker.helpers.arrayElements(userList, { min: Math.floor(userList.length * 0.3), max: Math.floor(userList.length * 0.5) });
    
    const cartsData = [];
    const cartItemsData = [];
    
    for (const user of usersWithCarts) {
      const cartId = faker.string.uuid();
      
      // Create cart
      cartsData.push({
        id: cartId,
        userId: user.id,
        sessionId: faker.string.alphanumeric(32),
        status: 'active',
        metadata: JSON.stringify({
          source: faker.helpers.arrayElement(['web', 'mobile']),
          userAgent: faker.internet.userAgent()
        }),
        createdAt: faker.date.recent({ days: 30 }),
        updatedAt: faker.date.recent({ days: 7 })
      });
      
      // Add 1-5 items to cart
      const itemCount = faker.number.int({ min: 1, max: 5 });
      const cartProducts = faker.helpers.arrayElements(productList, itemCount);
      
      for (const product of cartProducts) {
        cartItemsData.push({
          id: faker.string.uuid(),
          cartId: cartId,
          productId: product.id,
          quantity: faker.number.int({ min: 1, max: 3 }),
          priceAtTime: product.priceAmount,
          currency: product.priceCurrency,
          metadata: JSON.stringify({
            addedVia: faker.helpers.arrayElement(['product_page', 'search', 'recommendation']),
            originalPrice: product.priceAmount
          }),
          createdAt: faker.date.recent({ days: 14 }),
          updatedAt: faker.date.recent({ days: 7 })
        });
      }
    }
    
    // Insert carts first, then cart items
    const createdCarts = await db.insert(carts).values(cartsData).returning();
    
    if (cartItemsData.length > 0) {
      await db.insert(cartItems).values(cartItemsData);
    }
    
    return createdCarts;
  }

  /**
   * Generate realistic product titles based on category
   */
  private generateProductTitle(categoryName: string): string {
    const titleTemplates = {
      'Electronics': [
        () => `${faker.company.name()} ${faker.commerce.productName()} - ${faker.commerce.productAdjective()}`,
        () => `Professional ${faker.commerce.productName()} with ${faker.commerce.productMaterial()} Design`,
        () => `Wireless ${faker.commerce.productName()} - Latest Model`
      ],
      'Fashion & Apparel': [
        () => `${faker.commerce.productAdjective()} ${faker.commerce.productName()} - ${faker.color.human()} Color`,
        () => `Premium ${faker.commerce.productName()} Collection`,
        () => `Vintage Style ${faker.commerce.productName()}`
      ],
      'Home & Garden': [
        () => `${faker.commerce.productAdjective()} ${faker.commerce.productName()} for Home`,
        () => `Handcrafted ${faker.commerce.productName()} - ${faker.commerce.productMaterial()}`,
        () => `Modern ${faker.commerce.productName()} Set`
      ],
      'Art & Collectibles': [
        () => `Original ${faker.commerce.productName()} Artwork`,
        () => `Limited Edition ${faker.commerce.productName()}`,
        () => `Rare ${faker.commerce.productAdjective()} ${faker.commerce.productName()}`
      ],
      'Digital Assets': [
        () => `Digital ${faker.commerce.productName()} Pack`,
        () => `Premium ${faker.commerce.productName()} Bundle`,
        () => `Professional ${faker.commerce.productName()} Template`
      ],
      'NFTs & Crypto': [
        () => `${faker.commerce.productAdjective()} NFT Collection #${faker.number.int({ min: 1, max: 9999 })}`,
        () => `Rare ${faker.commerce.productName()} NFT`,
        () => `Exclusive ${faker.commerce.productName()} Token`
      ]
    };
    
    const templates = titleTemplates[categoryName as keyof typeof titleTemplates] || titleTemplates['Electronics'];
    const template = faker.helpers.arrayElement(templates);
    return template();
  }

  /**
   * Generate realistic product descriptions
   */
  private generateProductDescription(categoryName: string): string {
    const baseDescription = faker.lorem.paragraphs(2);
    const features = faker.helpers.arrayElements([
      'High quality materials',
      'Durable construction',
      'Easy to use',
      'Excellent value',
      'Fast shipping',
      'Money-back guarantee',
      'Professional grade',
      'Eco-friendly',
      'Handmade',
      'Limited edition'
    ], { min: 2, max: 4 });
    
    return `${baseDescription}\n\nKey Features:\n${features.map(f => `• ${f}`).join('\n')}`;
  }

  /**
   * Generate product tags based on category
   */
  private generateProductTags(categoryName: string): string[] {
    const baseTags = ['new', 'popular', 'trending'];
    const categoryTags = {
      'Electronics': ['tech', 'gadget', 'wireless', 'smart', 'digital'],
      'Fashion & Apparel': ['style', 'fashion', 'trendy', 'comfortable', 'designer'],
      'Home & Garden': ['home', 'decor', 'furniture', 'garden', 'outdoor'],
      'Sports & Outdoors': ['fitness', 'outdoor', 'sports', 'active', 'gear'],
      'Art & Collectibles': ['art', 'collectible', 'unique', 'handmade', 'vintage'],
      'Digital Assets': ['digital', 'download', 'instant', 'template', 'design'],
      'NFTs & Crypto': ['nft', 'crypto', 'blockchain', 'rare', 'collectible']
    };
    
    const specificTags = categoryTags[categoryName as keyof typeof categoryTags] || [];
    return faker.helpers.arrayElements([...baseTags, ...specificTags], { min: 2, max: 5 });
  }
}

/**
 * CLI interface
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const options: Partial<SeedOptions> = {};
  
  // Parse command line arguments
  for (const arg of args) {
    if (arg.startsWith('--users=')) {
      options.users = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--sellers=')) {
      options.sellers = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--products=')) {
      options.products = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--orders=')) {
      options.orders = parseInt(arg.split('=')[1]);
    } else if (arg === '--no-clean') {
      options.clean = false;
    }
  }
  
  const seeder = new DatabaseSeeder();
  
  try {
    await seeder.seed(options);
    console.log('\n🎉 Marketplace seeding completed successfully!');
    console.log('You can now test the marketplace API endpoints with realistic data.');
  } catch (error) {
    console.error('\n❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { DatabaseSeeder };