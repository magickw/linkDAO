/**
 * Web3 services main exports
 */

export * from './tokenService';
export * from './governanceService';
export * from './onChainVerificationService';

// Re-export service instances for convenience
export { tokenService } from './tokenService';
export { governanceService } from './governanceService';
export { onChainVerificationService } from './onChainVerificationService';