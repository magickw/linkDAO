import { Router } from 'express';
import { PriceOracleController } from '../controllers/priceOracleController';

const router = Router();

// Price conversion routes
router.get('/convert/crypto-to-fiat', PriceOracleController.convertCryptoToFiat);
router.get('/convert/fiat-to-crypto', PriceOracleController.convertFiatToCrypto);

// Price data routes
router.get('/price/:symbol', PriceOracleController.getCryptoPrice);
router.get('/prices', PriceOracleController.getMultipleCryptoPrices);
router.get('/price-trend/:symbol', PriceOracleController.getPriceTrend);
router.get('/market-data/:symbol', PriceOracleController.getMarketData);

// Currency information routes
router.get('/currencies/crypto', PriceOracleController.getSupportedCryptocurrencies);
router.get('/currencies/fiat', PriceOracleController.getSupportedFiatCurrencies);
router.get('/currencies/all', PriceOracleController.getAllSupportedCurrencies);

// Product price conversion
router.get('/product-price', PriceOracleController.convertProductPrice);

export default router;