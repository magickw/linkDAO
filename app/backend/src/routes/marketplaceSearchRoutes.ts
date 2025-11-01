import { Router } from 'express';
import { MarketplaceSearchController } from '../controllers/marketplaceSearchController';

const router = Router();

// Enhanced product search
router.get('/products', MarketplaceSearchController.searchProducts);

// Search suggestions
router.get('/suggestions', MarketplaceSearchController.getSearchSuggestions);

// Product recommendations
router.get('/recommendations', MarketplaceSearchController.getProductRecommendations);

// Product comparison
router.get('/compare', MarketplaceSearchController.compareProducts);

export default router;
