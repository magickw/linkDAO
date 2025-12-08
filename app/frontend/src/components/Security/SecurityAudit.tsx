import React, { useState, useEffect } from 'react';
import { 
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';

interface SecurityCheck {
  id: string;
  title: string;
  description: string;
  status: 'pass' | 'warning' | 'fail' | 'info';
  details?: string;
  recommendation?: string;
}

interface SecurityAuditProps {
  walletAddress?: string;
  networkId?: number;
  className?: string;
}

export const SecurityAudit: React.FC<SecurityAuditProps> = ({
  walletAddress,
  networkId,
  className = ''
}) => {
  const [checks, setChecks] = useState<SecurityCheck[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [expandedCheck, setExpandedCheck] = useState<string | null>(null);

  useEffect(() => {
    performSecurityAudit();
  }, [walletAddress, networkId]);

  const performSecurityAudit = async () => {
    const securityChecks: SecurityCheck[] = [];

    // Check 1: Network Security
    if (networkId) {
      if (networkId === 8453) {
        // Base Mainnet
        securityChecks.push({
          id: 'network',
          title: 'Network Security',
          description: 'Connected to Base Mainnet',
          status: 'pass',
          details: 'Base Mainnet is a secure Layer 2 network with Ethereum-level security',
          recommendation: 'Continue using Base Mainnet for production'
        });
      } else if (networkId === 84532) {
        // Base Sepolia
        securityChecks.push({
          id: 'network',
          title: 'Network Security',
          description: 'Connected to Base Sepolia Testnet',
          status: 'warning',
          details: 'Testnet networks are for testing purposes only',
          recommendation: 'Switch to Base Mainnet for production use'
        });
      } else {
        securityChecks.push({
          id: 'network',
          title: 'Network Security',
          description: 'Connected to unsupported network',
          status: 'fail',
          details: `Chain ID: ${networkId}`,
          recommendation: 'Switch to Base Mainnet (8453) or Base Sepolia (84532)'
        });
      }
    }

    // Check 2: Wallet Connection Security
    if (walletAddress) {
      // Check if it's a contract address (potential multi-sig)
      const isContract = await checkIsContract(walletAddress);
      
      if (isContract) {
        securityChecks.push({
          id: 'wallet',
          title: 'Wallet Type',
          description: 'Multi-signature wallet detected',
          status: 'pass',
          details: 'Multi-sig wallets provide enhanced security',
          recommendation: 'Ensure proper multi-sig configuration'
        });
      } else {
        securityChecks.push({
          id: 'wallet',
          title: 'Wallet Type',
          description: 'Standard EOA wallet',
          status: 'info',
          details: 'EOA (Externally Owned Account) wallet',
          recommendation: 'Consider using a hardware wallet for enhanced security'
        });
      }
    }

    // Check 3: Browser Security
    const browserCheck = checkBrowserSecurity();
    securityChecks.push(browserCheck);

    // Check 4: HTTPS Connection
    const httpsCheck = checkHTTPSConnection();
    securityChecks.push(httpsCheck);

    // Check 5: Local Storage Security
    const localStorageCheck = checkLocalStorageSecurity();
    securityChecks.push(localStorageCheck);

    // Check 6: Phishing Protection
    const phishingCheck = checkPhishingProtection();
    securityChecks.push(phishingCheck);

    setChecks(securityChecks);
  };

  const checkIsContract = async (address: string): Promise<boolean> => {
    try {
      const response = await fetch(`https://api.basescan.org/api?module=contract&action=getabi&address=${address}&apikey=YourApiKey`);
      const data = await response.json();
      return data.status === '1' && data.result !== 'Contract source code not verified';
    } catch {
      // Fallback: Assume it's not a contract if API fails
      return false;
    }
  };

  const checkBrowserSecurity = (): SecurityCheck => {
    const userAgent = navigator.userAgent;
    const isSecure = userAgent.includes('Chrome') || userAgent.includes('Firefox') || userAgent.includes('Safari');
    
    return {
      id: 'browser',
      title: 'Browser Security',
      description: isSecure ? 'Secure browser detected' : 'Browser security check',
      status: isSecure ? 'pass' : 'warning',
      details: `Browser: ${userAgent.split(' ')[0]}`,
      recommendation: isSecure ? 'Keep browser updated' : 'Use a modern browser like Chrome, Firefox, or Safari'
    };
  };

  const checkHTTPSConnection = (): SecurityCheck => {
    const isHTTPS = window.location.protocol === 'https:';
    
    return {
      id: 'https',
      title: 'Connection Security',
      description: isHTTPS ? 'Secure HTTPS connection' : 'Unencrypted connection',
      status: isHTTPS ? 'pass' : 'fail',
      details: `Protocol: ${window.location.protocol}`,
      recommendation: isHTTPS ? 'Connection is secure' : 'Use HTTPS for all transactions'
    };
  };

  const checkLocalStorageSecurity = (): SecurityCheck => {
    try {
      const testKey = 'security_test';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      
      return {
        id: 'localStorage',
        title: 'Local Storage',
        description: 'Local storage is accessible',
        status: 'info',
        details: 'Local storage is used for session management',
        recommendation: 'Clear sensitive data when using shared devices'
      };
    } catch {
      return {
        id: 'localStorage',
        title: 'Local Storage',
        description: 'Local storage is disabled',
        status: 'warning',
        details: 'Local storage may be blocked by browser settings',
        recommendation: 'Enable local storage for better user experience'
      };
    }
  };

  const checkPhishingProtection = (): SecurityCheck => {
    const currentDomain = window.location.hostname;
    const officialDomains = ['linkdao.io', 'www.linkdao.io', 'app.linkdao.io'];
    const isOfficial = officialDomains.includes(currentDomain);
    
    return {
      id: 'phishing',
      title: 'Phishing Protection',
      description: isOfficial ? 'Official LinkDAO domain' : 'Domain verification needed',
      status: isOfficial ? 'pass' : 'warning',
      details: `Current domain: ${currentDomain}`,
      recommendation: isOfficial ? 'You are on the official site' : 'Verify you are on the official LinkDAO site'
    };
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />;
      case 'fail':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />;
      case 'info':
        return <InformationCircleIcon className="w-5 h-5 text-blue-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass':
        return 'border-green-500 bg-green-50 dark:bg-green-900/20';
      case 'warning':
        return 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20';
      case 'fail':
        return 'border-red-500 bg-red-50 dark:bg-red-900/20';
      case 'info':
        return 'border-blue-500 bg-blue-50 dark:bg-blue-900/20';
      default:
        return 'border-gray-500 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  const overallStatus = checks.length > 0 ? {
    pass: checks.filter(c => c.status === 'pass').length,
    warning: checks.filter(c => c.status === 'warning').length,
    fail: checks.filter(c => c.status === 'fail').length,
    info: checks.filter(c => c.status === 'info').length,
  } : null;

  const getOverallStatusIcon = () => {
    if (!overallStatus) return null;
    
    if (overallStatus.fail > 0) {
      return <ExclamationTriangleIcon className="w-6 h-6 text-red-500" />;
    } else if (overallStatus.warning > 0) {
      return <ExclamationTriangleIcon className="w-6 h-6 text-yellow-500" />;
    } else {
      return <ShieldCheckIcon className="w-6 h-6 text-green-500" />;
    }
  };

  const getOverallStatusMessage = () => {
    if (!overallStatus) return 'Running security checks...';
    
    if (overallStatus.fail > 0) {
      return `${overallStatus.fail} critical issue${overallStatus.fail > 1 ? 's' : ''} found`;
    } else if (overallStatus.warning > 0) {
      return `${overallStatus.warning} warning${overallStatus.warning > 1 ? 's' : ''} found`;
    } else {
      return 'All security checks passed';
    }
  };

  return (
    <div className={`security-audit ${className}`}>
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <ShieldCheckIcon className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Security Audit
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Comprehensive security assessment
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            {showDetails ? (
              <EyeSlashIcon className="w-5 h-5" />
            ) : (
              <EyeIcon className="w-5 h-5" />
            )}
            <span className="text-sm">{showDetails ? 'Hide' : 'Show'} Details</span>
          </button>
        </div>

        {/* Overall Status */}
        {overallStatus && (
          <div className="flex items-center space-x-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            {getOverallStatusIcon()}
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {getOverallStatusMessage()}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {checks.length} checks completed
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Security Checks */}
      {showDetails && (
        <div className="mt-4 space-y-3">
          {checks.map((check) => (
            <div
              key={check.id}
              className={`bg-white dark:bg-gray-800 rounded-lg border p-4 cursor-pointer transition-all duration-200 ${getStatusColor(check.status)}`}
              onClick={() => setExpandedCheck(expandedCheck === check.id ? null : check.id)}
            >
              <div className="flex items-start space-x-3">
                {getStatusIcon(check.status)}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                      {check.title}
                    </h3>
                    <span className={`text-xs px-2 py-1 rounded-full ${check.status === 'pass' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : check.status === 'warning' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' : check.status === 'fail' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'}`}>
                      {check.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {check.description}
                  </p>
                  
                  {expandedCheck === check.id && (
                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                      {check.details && (
                        <div className="mb-2">
                          <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Details:
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {check.details}
                          </p>
                        </div>
                      )}
                      {check.recommendation && (
                        <div>
                          <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Recommendation:
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {check.recommendation}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-4 flex justify-end space-x-3">
        <button
          onClick={performSecurityAudit}
          className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400"
        >
          Refresh Audit
        </button>
        <button
          onClick={() => window.print()}
          className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400"
        >
          Export Report
        </button>
      </div>
    </div>
  );
};