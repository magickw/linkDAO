/**
 * Tax Services Index
 * Exports all tax-related services for easy importing
 */

export {
  TaxRemittanceService,
  taxRemittanceService,
  type TaxPeriod,
  type TaxRemittanceReport,
} from './taxRemittanceService';

export {
  StripeTaxIntegrationService,
  stripeTaxService,
} from './stripeTaxIntegrationService';

export {
  CryptoTaxEscrowService,
  cryptoTaxEscrowService,
} from './cryptoTaxEscrowService';

export {
  TaxAwareEscrowService,
} from './taxAwareEscrowService';

export {
  TaxReportingSchedulingService,
  taxReportingSchedulingService,
} from './taxReportingSchedulingService';
