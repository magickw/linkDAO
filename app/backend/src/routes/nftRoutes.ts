import { Router } from 'express';
import { NFTController, uploadNFTFiles } from '../controllers/nftController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// NFT routes
router.post('/nfts', authenticateToken, uploadNFTFiles, NFTController.createNFT);
router.get('/nfts/search', NFTController.searchNFTs);
router.get('/nfts/listings', NFTController.getActiveListings);
router.get('/nfts/auctions', NFTController.getActiveAuctions);
router.get('/nfts/:id', NFTController.getNFT);
router.get('/nfts/:id/offers', NFTController.getNFTOffers);
router.get('/nfts/:id/provenance', NFTController.getNFTProvenance);
router.post('/nfts/:id/list', authenticateToken, NFTController.listNFT);
router.post('/nfts/:id/auction', authenticateToken, NFTController.createAuction);
router.post('/nfts/:id/offer', authenticateToken, NFTController.makeOffer);
router.post('/nfts/:id/verify', authenticateToken, NFTController.verifyNFT);

// Collection routes
router.post('/collections', authenticateToken, uploadNFTFiles, NFTController.createCollection);
router.get('/creators/:creatorId/nfts', NFTController.getNFTsByCreator);
router.get('/collections/:collectionId/nfts', NFTController.getNFTsByCollection);

export default router;