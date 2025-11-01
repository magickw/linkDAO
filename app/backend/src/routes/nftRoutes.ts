import { Router } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { NFTController, uploadNFTFiles } from '../controllers/nftController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// NFT routes
router.post('/nfts', csrfProtection,  authenticateToken, uploadNFTFiles, NFTController.createNFT);
router.get('/nfts/search', NFTController.searchNFTs);
router.get('/nfts/listings', NFTController.getActiveListings);
router.get('/nfts/auctions', NFTController.getActiveAuctions);
router.get('/nfts/:id', NFTController.getNFT);
router.get('/nfts/:id/offers', NFTController.getNFTOffers);
router.get('/nfts/:id/provenance', NFTController.getNFTProvenance);
router.post('/nfts/:id/list', csrfProtection,  authenticateToken, NFTController.listNFT);
router.post('/nfts/:id/auction', csrfProtection,  authenticateToken, NFTController.createAuction);
router.post('/nfts/:id/offer', csrfProtection,  authenticateToken, NFTController.makeOffer);
router.post('/nfts/:id/verify', csrfProtection,  authenticateToken, NFTController.verifyNFT);

// Collection routes
router.post('/collections', csrfProtection,  authenticateToken, uploadNFTFiles, NFTController.createCollection);
router.get('/creators/:creatorId/nfts', NFTController.getNFTsByCreator);
router.get('/collections/:collectionId/nfts', NFTController.getNFTsByCollection);

export default router;
