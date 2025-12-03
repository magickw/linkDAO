
import { marketplaceService } from './services/marketplaceService';

async function test() {
    console.log('marketplaceService:', marketplaceService);
    try {
        await marketplaceService.createListing({
            sellerWalletAddress: '0x123',
            tokenAddress: '0x000',
            price: '100',
            quantity: 1,
            itemType: 'DIGITAL',
            listingType: 'FIXED_PRICE',
            metadataURI: 'test',
            isEscrowed: false
        });
    } catch (e) {
        console.error('Error:', e);
    }
}

test();
