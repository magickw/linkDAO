import { z } from 'zod';

// Regional compliance configurations
export interface RegionalCompliance {
  region: string;
  country: string;
  gdprApplicable: boolean;
  ccpaApplicable: boolean;
  dataLocalization: boolean;
  contentRestrictions: string[];
  retentionPeriodDays: number;
  consentRequired: boolean;
  rightToErasure: boolean;
  dataPortability: boolean;
  minorProtections: boolean;
  cryptoRegulations: string[];
}

export interface GeofencingRule {
  id: string;
  name: string;
  regions: string[];
  action: 'allow' | 'block' | 'restrict' | 'require_consent';
  contentTypes: string[];
  reason: string;
  priority: number;
  active: boolean;
}

export interface ComplianceContext {
  userRegion: string;
  userCountry: string;
  contentType: string;
  hasConsent: boolean;
  userAge?: number;
  isHighRisk: boolean;
}

export interface ComplianceDecision {
  allowed: boolean;
  action: 'allow' | 'block' | 'restrict' | 'require_consent';
  reason: string;
  requirements: string[];
  dataHandling: {
    canStore: boolean;
    canProcess: boolean;
    canTransfer: boolean;
    retentionDays: number;
    encryptionRequired: boolean;
  };
  userRights: string[];
}

// Regional compliance configurations
const REGIONAL_COMPLIANCE: Record<string, RegionalCompliance> = {
  'EU': {
    region: 'EU',
    country: 'MULTIPLE',
    gdprApplicable: true,
    ccpaApplicable: false,
    dataLocalization: true,
    contentRestrictions: ['hate_speech', 'terrorist_content', 'child_exploitation'],
    retentionPeriodDays: 365,
    consentRequired: true,
    rightToErasure: true,
    dataPortability: true,
    minorProtections: true,
    cryptoRegulations: ['MiCA', 'AML5']
  },
  'US_CA': {
    region: 'US',
    country: 'US',
    gdprApplicable: false,
    ccpaApplicable: true,
    dataLocalization: false,
    contentRestrictions: ['child_exploitation'],
    retentionPeriodDays: 1095,
    consentRequired: false,
    rightToErasure: true,
    dataPortability: true,
    minorProtections: true,
    cryptoRegulations: ['BSA', 'FinCEN']
  },
  'US_OTHER': {
    region: 'US',
    country: 'US',
    gdprApplicable: false,
    ccpaApplicable: false,
    dataLocalization: false,
    contentRestrictions: ['child_exploitation'],
    retentionPeriodDays: 2555,
    consentRequired: false,
    rightToErasure: false,
    dataPortability: false,
    minorProtections: true,
    cryptoRegulations: ['BSA', 'FinCEN']
  },
  'CN': {
    region: 'APAC',
    country: 'CN',
    gdprApplicable: false,
    ccpaApplicable: false,
    dataLocalization: true,
    contentRestrictions: ['political_content', 'crypto_trading', 'gambling'],
    retentionPeriodDays: 180,
    consentRequired: true,
    rightToErasure: false,
    dataPortability: false,
    minorProtections: true,
    cryptoRegulations: ['CRYPTO_BAN']
  },
  'DEFAULT': {
    region: 'GLOBAL',
    country: 'UNKNOWN',
    gdprApplicable: false,
    ccpaApplicable: false,
    dataLocalization: false,
    contentRestrictions: ['child_exploitation', 'terrorism'],
    retentionPeriodDays: 730,
    consentRequired: false,
    rightToErasure: false,
    dataPortability: false,
    minorProtections: true,
    cryptoRegulations: []
  }
};

// Default geofencing rules
const DEFAULT_GEOFENCING_RULES: GeofencingRule[] = [
  {
    id: 'eu_gdpr_dm_scanning',
    name: 'EU GDPR DM Scanning Consent',
    regions: ['EU'],
    action: 'require_consent',
    contentTypes: ['dm', 'private_message'],
    reason: 'GDPR requires explicit consent for private message scanning',
    priority: 100,
    active: true
  },
  {
    id: 'china_crypto_block',
    name: 'China Crypto Content Block',
    regions: ['CN'],
    action: 'block',
    contentTypes: ['marketplace_listing', 'crypto_discussion'],
    reason: 'Crypto trading content blocked in China',
    priority: 90,
    active: true
  },
  {
    id: 'minor_protection_global',
    name: 'Global Minor Protection',
    regions: ['*'],
    action: 'restrict',
    contentTypes: ['adult_content', 'gambling'],
    reason: 'Enhanced protection for users under 18',
    priority: 80,
    active: true
  },
  {
    id: 'eu_right_to_erasure',
    name: 'EU Right to Erasure',
    regions: ['EU'],
    action: 'allow',
    contentTypes: ['*'],
    reason: 'GDPR Article 17 - Right to Erasure',
    priority: 70,
    active: true
  }
];

export class GeofencingComplianceService {
  private regionalCompliance: Record<string, RegionalCompliance>;
  private geofencingRules: GeofencingRule[];

  constructor() {
    this.regionalCompliance = { ...REGIONAL_COMPLIANCE };
    this.geofencingRules = [...DEFAULT_GEOFENCING_RULES];
  }

  /**
   * Determine compliance requirements for a given context
   */
  async evaluateCompliance(context: ComplianceContext): Promise<ComplianceDecision> {
    const compliance = this.getRegionalCompliance(context.userRegion, context.userCountry);
    const applicableRules = this.getApplicableRules(context);
    
    // Evaluate geofencing rules
    const ruleDecision = this.evaluateGeofencingRules(applicableRules, context);
    
    // Determine data handling requirements
    const dataHandling = this.determineDataHandling(compliance, context);
    
    // Determine user rights
    const userRights = this.determineUserRights(compliance);
    
    // Check for blocking conditions
    if (ruleDecision.action === 'block') {
      return {
        allowed: false,
        action: 'block',
        reason: ruleDecision.reason,
        requirements: [],
        dataHandling: {
          canStore: false,
          canProcess: false,
          canTransfer: false,
          retentionDays: 0,
          encryptionRequired: true
        },
        userRights
      };
    }

    // Check consent requirements
    const requirements: string[] = [];
    if (compliance.consentRequired && !context.hasConsent) {
      if (context.contentType === 'dm' || context.contentType === 'private_message') {
        requirements.push('explicit_consent_dm_scanning');
      }
    }

    // Check minor protections
    if (compliance.minorProtections && context.userAge && context.userAge < 18) {
      requirements.push('parental_consent');
      if (context.contentType === 'adult_content') {
        return {
          allowed: false,
          action: 'block',
          reason: 'Content blocked for minors',
          requirements,
          dataHandling,
          userRights
        };
      }
    }

    // Check content restrictions
    const restrictedContent = this.checkContentRestrictions(compliance, context);
    if (restrictedContent.isRestricted) {
      return {
        allowed: false,
        action: 'block',
        reason: restrictedContent.reason,
        requirements,
        dataHandling,
        userRights
      };
    }

    return {
      allowed: true,
      action: ruleDecision.action === 'require_consent' && requirements.length > 0 ? 'require_consent' : 'allow',
      reason: ruleDecision.reason || 'Compliant with regional regulations',
      requirements,
      dataHandling,
      userRights
    };
  }

  /**
   * Get data retention period for a region
   */
  getDataRetentionPeriod(region: string, country: string): number {
    const compliance = this.getRegionalCompliance(region, country);
    return compliance.retentionPeriodDays;
  }

  /**
   * Check if data localization is required
   */
  requiresDataLocalization(region: string, country: string): boolean {
    const compliance = this.getRegionalCompliance(region, country);
    return compliance.dataLocalization;
  }

  /**
   * Get applicable crypto regulations
   */
  getCryptoRegulations(region: string, country: string): string[] {
    const compliance = this.getRegionalCompliance(region, country);
    return compliance.cryptoRegulations;
  }

  /**
   * Check if user has right to erasure
   */
  hasRightToErasure(region: string, country: string): boolean {
    const compliance = this.getRegionalCompliance(region, country);
    return compliance.rightToErasure;
  }

  /**
   * Check if user has right to data portability
   */
  hasDataPortabilityRight(region: string, country: string): boolean {
    const compliance = this.getRegionalCompliance(region, country);
    return compliance.dataPortability;
  }

  /**
   * Add or update geofencing rule
   */
  updateGeofencingRule(rule: GeofencingRule): void {
    const existingIndex = this.geofencingRules.findIndex(r => r.id === rule.id);
    if (existingIndex >= 0) {
      this.geofencingRules[existingIndex] = rule;
    } else {
      this.geofencingRules.push(rule);
    }
    
    // Sort by priority (higher priority first)
    this.geofencingRules.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Remove geofencing rule
   */
  removeGeofencingRule(ruleId: string): boolean {
    const initialLength = this.geofencingRules.length;
    this.geofencingRules = this.geofencingRules.filter(r => r.id !== ruleId);
    return this.geofencingRules.length < initialLength;
  }

  private getRegionalCompliance(region: string, country: string): RegionalCompliance {
    // Try specific country first
    const countryKey = country.toUpperCase();
    if (this.regionalCompliance[countryKey]) {
      return this.regionalCompliance[countryKey];
    }

    // Try region-country combination
    const regionCountryKey = `${region.toUpperCase()}_${countryKey}`;
    if (this.regionalCompliance[regionCountryKey]) {
      return this.regionalCompliance[regionCountryKey];
    }

    // Try region
    const regionKey = region.toUpperCase();
    if (this.regionalCompliance[regionKey]) {
      return this.regionalCompliance[regionKey];
    }

    // Default
    return this.regionalCompliance['DEFAULT'];
  }

  private getApplicableRules(context: ComplianceContext): GeofencingRule[] {
    return this.geofencingRules.filter(rule => {
      if (!rule.active) return false;

      // Check region match
      const regionMatch = rule.regions.includes('*') || 
                         rule.regions.includes(context.userRegion) ||
                         rule.regions.includes(context.userCountry);
      
      if (!regionMatch) return false;

      // Check content type match
      const contentMatch = rule.contentTypes.includes('*') ||
                          rule.contentTypes.includes(context.contentType);

      return contentMatch;
    });
  }

  private evaluateGeofencingRules(rules: GeofencingRule[], context: ComplianceContext): {
    action: GeofencingRule['action'];
    reason: string;
  } {
    // Rules are already sorted by priority
    for (const rule of rules) {
      if (rule.action === 'block') {
        return { action: 'block', reason: rule.reason };
      }
      
      if (rule.action === 'require_consent' && !context.hasConsent) {
        return { action: 'require_consent', reason: rule.reason };
      }
      
      if (rule.action === 'restrict' && context.isHighRisk) {
        return { action: 'restrict', reason: rule.reason };
      }
    }

    return { action: 'allow', reason: 'No blocking rules apply' };
  }

  private determineDataHandling(compliance: RegionalCompliance, context: ComplianceContext): ComplianceDecision['dataHandling'] {
    return {
      canStore: true,
      canProcess: true,
      canTransfer: !compliance.dataLocalization,
      retentionDays: compliance.retentionPeriodDays,
      encryptionRequired: compliance.gdprApplicable || compliance.ccpaApplicable || context.isHighRisk
    };
  }

  private determineUserRights(compliance: RegionalCompliance): string[] {
    const rights: string[] = [];
    
    if (compliance.rightToErasure) {
      rights.push('right_to_erasure');
    }
    
    if (compliance.dataPortability) {
      rights.push('data_portability');
    }
    
    if (compliance.consentRequired) {
      rights.push('withdraw_consent');
    }
    
    if (compliance.gdprApplicable) {
      rights.push('access_personal_data', 'rectification', 'restrict_processing');
    }
    
    if (compliance.ccpaApplicable) {
      rights.push('opt_out_sale', 'non_discrimination');
    }

    return rights;
  }

  private checkContentRestrictions(compliance: RegionalCompliance, context: ComplianceContext): {
    isRestricted: boolean;
    reason: string;
  } {
    for (const restriction of compliance.contentRestrictions) {
      if (this.contentMatchesRestriction(context.contentType, restriction)) {
        return {
          isRestricted: true,
          reason: `Content type '${context.contentType}' is restricted in ${compliance.region}: ${restriction}`
        };
      }
    }

    return { isRestricted: false, reason: '' };
  }

  private contentMatchesRestriction(contentType: string, restriction: string): boolean {
    const restrictionMap: Record<string, string[]> = {
      'hate_speech': ['post', 'comment', 'dm'],
      'terrorist_content': ['post', 'comment', 'media'],
      'child_exploitation': ['media', 'post', 'comment'],
      'political_content': ['post', 'comment'],
      'crypto_trading': ['marketplace_listing', 'post', 'comment'],
      'gambling': ['marketplace_listing', 'post', 'comment'],
      'adult_content': ['media', 'post', 'marketplace_listing']
    };

    const applicableTypes = restrictionMap[restriction] || [];
    return applicableTypes.includes(contentType);
  }
}

export const geofencingComplianceService = new GeofencingComplianceService();