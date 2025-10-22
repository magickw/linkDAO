/**
 * API endpoint for cultural adaptations
 * Returns cultural adaptation data for a specific language/region
 */

import { NextApiRequest, NextApiResponse } from 'next';

interface CulturalAdaptation {
  language: string;
  dateFormat: string;
  numberFormat: string;
  currencyFormat: string;
  addressFormat: string;
  phoneFormat: string;
  culturalNotes: string[];
  localizedExamples: Record<string, string>;
}

// Mock cultural adaptation data
const mockCulturalAdaptations: Record<string, CulturalAdaptation> = {
  es: {
    language: 'es',
    dateFormat: 'DD/MM/YYYY',
    numberFormat: '1.000,00',
    currencyFormat: '€1.000,00',
    addressFormat: 'Calle Principal 123, 28001 Madrid, España',
    phoneFormat: '+34 912 34 56 78',
    culturalNotes: [
      'En España, las transacciones financieras suelen requerir identificación adicional.',
      'Los horarios bancarios tradicionales son de 9:00 a 14:00, lunes a viernes.',
      'Es común usar transferencias bancarias para pagos grandes en lugar de tarjetas.',
      'La regulación MiCA de la UE se aplica a las criptomonedas desde 2024.'
    ],
    localizedExamples: {
      currency: '€1.000,00 EUR (Euro)',
      date: '25/12/2023',
      time: '14:30',
      address: 'Calle Principal 123, 28001 Madrid, España',
      phone: '+34 912 34 56 78',
      bankAccount: 'ES91 2100 0418 4502 0005 1332',
      taxId: 'B12345678 (CIF para empresas)',
      walletExample: '0x742d35Cc6634C0532925a3b8D4C0532925a3b8D4',
      gasPrice: '20 gwei (≈ €0,50 por transacción)',
      stakingReward: '5% APY (rendimiento anual)'
    }
  },
  fr: {
    language: 'fr',
    dateFormat: 'DD/MM/YYYY',
    numberFormat: '1 000,00',
    currencyFormat: '1 000,00 €',
    addressFormat: '123 Rue Principale, 75001 Paris, France',
    phoneFormat: '+33 1 23 45 67 89',
    culturalNotes: [
      'En France, les transactions crypto sont soumises à la réglementation PSAN.',
      'Les gains en crypto-monnaies sont imposables selon le régime des plus-values.',
      'La CNIL régule strictement la protection des données personnelles.',
      'Les paiements en ligne nécessitent souvent une authentification forte (3D Secure).'
    ],
    localizedExamples: {
      currency: '1 000,00 € EUR (Euro)',
      date: '25/12/2023',
      time: '14h30',
      address: '123 Rue Principale, 75001 Paris, France',
      phone: '+33 1 23 45 67 89',
      bankAccount: 'FR14 2004 1010 0505 0001 3M02 606',
      taxId: '12345678901 (SIREN)',
      walletExample: '0x742d35Cc6634C0532925a3b8D4C0532925a3b8D4',
      gasPrice: '20 gwei (≈ 0,50 € par transaction)',
      stakingReward: '5% APY (rendement annuel)'
    }
  },
  de: {
    language: 'de',
    dateFormat: 'DD.MM.YYYY',
    numberFormat: '1.000,00',
    currencyFormat: '1.000,00 €',
    addressFormat: 'Hauptstraße 123, 10115 Berlin, Deutschland',
    phoneFormat: '+49 30 12345678',
    culturalNotes: [
      'In Deutschland unterliegen Kryptowährungen der BaFin-Regulierung.',
      'Krypto-Gewinne sind nach einem Jahr Haltedauer steuerfrei.',
      'Die DSGVO regelt streng den Umgang mit personenbezogenen Daten.',
      'Deutsche Banken sind oft konservativ bei Krypto-bezogenen Transaktionen.'
    ],
    localizedExamples: {
      currency: '1.000,00 € EUR (Euro)',
      date: '25.12.2023',
      time: '14:30 Uhr',
      address: 'Hauptstraße 123, 10115 Berlin, Deutschland',
      phone: '+49 30 12345678',
      bankAccount: 'DE89 3704 0044 0532 0130 00',
      taxId: '12/345/67890 (Steuernummer)',
      walletExample: '0x742d35Cc6634C0532925a3b8D4C0532925a3b8D4',
      gasPrice: '20 gwei (≈ 0,50 € pro Transaktion)',
      stakingReward: '5% APY (jährliche Rendite)'
    }
  },
  zh: {
    language: 'zh',
    dateFormat: 'YYYY年MM月DD日',
    numberFormat: '1,000.00',
    currencyFormat: '¥1,000.00',
    addressFormat: '中国北京市朝阳区主要街道123号 100001',
    phoneFormat: '+86 138 0013 8000',
    culturalNotes: [
      '在中国大陆，加密货币交易受到严格监管。',
      '建议使用合规的数字资产服务提供商。',
      '跨境支付需要遵守外汇管理规定。',
      '数字人民币（DCEP）是官方认可的数字货币。'
    ],
    localizedExamples: {
      currency: '¥1,000.00 CNY (人民币)',
      date: '2023年12月25日',
      time: '14:30',
      address: '中国北京市朝阳区主要街道123号 100001',
      phone: '+86 138 0013 8000',
      bankAccount: '6222 0012 3456 7890 123',
      taxId: '91110000123456789X (统一社会信用代码)',
      walletExample: '0x742d35Cc6634C0532925a3b8D4C0532925a3b8D4',
      gasPrice: '20 gwei (≈ ¥3.50 每笔交易)',
      stakingReward: '5% APY (年化收益率)'
    }
  },
  ja: {
    language: 'ja',
    dateFormat: 'YYYY年MM月DD日',
    numberFormat: '1,000.00',
    currencyFormat: '¥1,000',
    addressFormat: '〒100-0001 東京都千代田区主要通り123',
    phoneFormat: '+81 3-1234-5678',
    culturalNotes: [
      '日本では暗号資産は金融庁の監督下にあります。',
      '暗号資産の利益は雑所得として課税されます。',
      '取引所は暗号資産交換業者として登録が必要です。',
      '個人情報保護法により、データの取り扱いが厳格に規制されています。'
    ],
    localizedExamples: {
      currency: '¥1,000 JPY (日本円)',
      date: '2023年12月25日',
      time: '14:30',
      address: '〒100-0001 東京都千代田区主要通り123',
      phone: '+81 3-1234-5678',
      bankAccount: '1234-567890 (普通預金)',
      taxId: '1234567890123 (マイナンバー)',
      walletExample: '0x742d35Cc6634C0532925a3b8D4C0532925a3b8D4',
      gasPrice: '20 gwei (≈ ¥70 per transaction)',
      stakingReward: '5% APY (年利)'
    }
  },
  ar: {
    language: 'ar',
    dateFormat: 'DD/MM/YYYY',
    numberFormat: '1,000.00',
    currencyFormat: '1,000.00 ر.س',
    addressFormat: 'شارع الرئيسي 123، الرياض 12345، السعودية',
    phoneFormat: '+966 11 123 4567',
    culturalNotes: [
      'في المملكة العربية السعودية، تخضع العملات المشفرة لرقابة البنك المركزي.',
      'يجب التأكد من التوافق مع أحكام الشريعة الإسلامية.',
      'المعاملات المالية تتطلب التحقق من الهوية بدقة.',
      'أوقات العمل تختلف خلال شهر رمضان والعطل الدينية.'
    ],
    localizedExamples: {
      currency: '1,000.00 ر.س SAR (ريال سعودي)',
      date: '٢٥/١٢/٢٠٢٣',
      time: '٢:٣٠ م',
      address: 'شارع الرئيسي 123، الرياض 12345، السعودية',
      phone: '+966 11 123 4567',
      bankAccount: 'SA44 2000 0001 2345 6789 1234',
      taxId: '1234567890 (الرقم الضريبي)',
      walletExample: '0x742d35Cc6634C0532925a3b8D4C0532925a3b8D4',
      gasPrice: '20 gwei (≈ 1.90 ر.س لكل معاملة)',
      stakingReward: '5% APY (عائد سنوي)'
    }
  }
};

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const { language } = req.query;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!language || typeof language !== 'string') {
    return res.status(400).json({ error: 'Language parameter is required' });
  }

  // Check if we have cultural adaptations for this language
  const adaptation = mockCulturalAdaptations[language];
  
  if (!adaptation) {
    return res.status(404).json({ error: 'No cultural adaptations found for this language' });
  }

  // Return cultural adaptation data
  res.status(200).json(adaptation);
}