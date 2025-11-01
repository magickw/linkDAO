import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { priceOracleService } from '../services/priceOracleService';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { asyncHandler } from '../utils/asyncHandler';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';

export class PriceOracleController {
  /**
   * Convert cryptocurrency to fiat currency
   */
  static convertCryptoToFiat = asyncHandler(async (req: Request, res: Response) => {
    const { amount, cryptoSymbol, fiatCurrency } = req.query as {
      amount: string;
      cryptoSymbol: string;
      fiatCurrency?: string;
    };

    if (!amount || !cryptoSymbol) {
      return res.status(400).json({
        error: 'Missing required parameters: amount and cryptoSymbol',
      });
    }

    try {
      const result = await priceOracleService.convertCryptoToFiat(
        amount,
        cryptoSymbol,
        fiatCurrency || 'USD'
      );

      return res.json(result);
    } catch (error: any) {
      return res.status(500).json({
        error: error.message || 'Failed to convert cryptocurrency to fiat',
      });
    }
  });

  /**
   * Convert fiat currency to cryptocurrency
   */
  static convertFiatToCrypto = asyncHandler(async (req: Request, res: Response) => {
    const { amount, fiatCurrency, cryptoSymbol } = req.query as {
      amount: string;
      fiatCurrency: string;
      cryptoSymbol: string;
    };

    if (!amount || !fiatCurrency || !cryptoSymbol) {
      return res.status(400).json({
        error: 'Missing required parameters: amount, fiatCurrency, and cryptoSymbol',
      });
    }

    try {
      const result = await priceOracleService.convertFiatToCrypto(
        amount,
        fiatCurrency,
        cryptoSymbol
      );

      return res.json(result);
    } catch (error: any) {
      return res.status(500).json({
        error: error.message || 'Failed to convert fiat to cryptocurrency',
      });
    }
  });

  /**
   * Get current price of a cryptocurrency
   */
  static getCryptoPrice = asyncHandler(async (req: Request, res: Response) => {
    const { symbol } = req.params;

    if (!symbol) {
      return res.status(400).json({
        error: 'Missing required parameter: symbol',
      });
    }

    try {
      const priceData = await priceOracleService.getCryptoPrice(symbol);

      return res.json(priceData);
    } catch (error: any) {
      return res.status(500).json({
        error: error.message || 'Failed to fetch cryptocurrency price',
      });
    }
  });

  /**
   * Get prices for multiple cryptocurrencies
   */
  static getMultipleCryptoPrices = asyncHandler(async (req: Request, res: Response) => {
    const { symbols } = req.query as { symbols: string };

    if (!symbols) {
      return res.status(400).json({
        error: 'Missing required parameter: symbols',
      });
    }

    try {
      const symbolArray = symbols.split(',').map(s => s.trim());
      const prices = await priceOracleService.getMultipleCryptoPrices(symbolArray);

      return res.json(prices);
    } catch (error: any) {
      return res.status(500).json({
        error: error.message || 'Failed to fetch cryptocurrency prices',
      });
    }
  });

  /**
   * Get supported cryptocurrencies
   */
  static getSupportedCryptocurrencies = asyncHandler(async (req: Request, res: Response) => {
    try {
      const cryptocurrencies = await priceOracleService.getSupportedCryptocurrencies();

      return res.json({
        cryptocurrencies,
      });
    } catch (error: any) {
      return res.status(500).json({
        error: error.message || 'Failed to fetch supported cryptocurrencies',
      });
    }
  });

  /**
   * Get supported fiat currencies
   */
  static getSupportedFiatCurrencies = asyncHandler(async (req: Request, res: Response) => {
    try {
      const fiatCurrencies = await priceOracleService.getSupportedFiatCurrencies();

      return res.json({
        fiatCurrencies,
      });
    } catch (error: any) {
      return res.status(500).json({
        error: error.message || 'Failed to fetch supported fiat currencies',
      });
    }
  });

  /**
   * Get all supported currencies
   */
  static getAllSupportedCurrencies = asyncHandler(async (req: Request, res: Response) => {
    try {
      const currencies = await priceOracleService.getAllSupportedCurrencies();

      return res.json(currencies);
    } catch (error: any) {
      return res.status(500).json({
        error: error.message || 'Failed to fetch supported currencies',
      });
    }
  });

  /**
   * Convert product price to multiple fiat currencies
   */
  static convertProductPrice = asyncHandler(async (req: Request, res: Response) => {
    const { amount, cryptoSymbol } = req.query as {
      amount: string;
      cryptoSymbol: string;
    };

    if (!amount || !cryptoSymbol) {
      return res.status(400).json({
        error: 'Missing required parameters: amount and cryptoSymbol',
      });
    }

    try {
      const conversions = await priceOracleService.convertProductPrice(
        amount,
        cryptoSymbol
      );

      return res.json(conversions);
    } catch (error: any) {
      return res.status(500).json({
        error: error.message || 'Failed to convert product price',
      });
    }
  });

  /**
   * Get price trend data for a cryptocurrency
   */
  static getPriceTrend = asyncHandler(async (req: Request, res: Response) => {
    const { symbol } = req.params;
    const { days } = req.query as { days?: string };

    if (!symbol) {
      return res.status(400).json({
        error: 'Missing required parameter: symbol',
      });
    }

    try {
      const trendData = await priceOracleService.getPriceTrend(
        symbol,
        days ? parseInt(days) : 30
      );

      return res.json(trendData);
    } catch (error: any) {
      return res.status(500).json({
        error: error.message || 'Failed to fetch price trend data',
      });
    }
  });

  /**
   * Get market data for a cryptocurrency
   */
  static getMarketData = asyncHandler(async (req: Request, res: Response) => {
    const { symbol } = req.params;

    if (!symbol) {
      return res.status(400).json({
        error: 'Missing required parameter: symbol',
      });
    }

    try {
      const marketData = await priceOracleService.getMarketData(symbol);

      return res.json(marketData);
    } catch (error: any) {
      return res.status(500).json({
        error: error.message || 'Failed to fetch market data',
      });
    }
  });
}