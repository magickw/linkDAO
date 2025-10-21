import { PaymentMethod, PaymentMethodType } from '../types/paymentPrioritization';

export interface EnhancedUnavailabilityReason {
    type: 'insufficient_balance' | 'service_unavailable' | 'network_error' | 'validation_failed' |
    'rate_limit' | 'maintenance' | 'wallet_disconnected' | 'token_not_found' | 'slippage_exceeded' |
    'gas_estimation_failed' | 'user_rejected' | 'timeout';
    message: string;
    details?: string;
    retryAfter?: number; // seconds
    errorCode?: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    isTemporary: boolean;
    suggestedActions: string[];
}

export interface EnhancedUserAction {
    type: 'add_funds' | 'switch_network' | 'wait_and_retry' | 'contact_support' | 'use_alternative' |
    'reconnect_wallet' | 'approve_token' | 'adjust_slippage' | 'increase_gas' | 'refresh_page';
    description: string;
    actionUrl?: string;
    priority: 'high' | 'medium' | 'low';
    estimatedTime?: number; // seconds to complete action
    isAutomatable?: boolean;
}

export interface EnhancedRetryStrategy {
    canRetry: boolean;
    retryAfter?: number; // seconds
    maxRetries: number;
    currentAttempt: number;
    backoffMultiplier: number;
    retryConditions?: string[];
    autoRetry?: boolean;
    retryWithDifferentParams?: boolean;
}

export interface EnhancedUnavailabilityHandlingResult {
    fallbackMethods: PaymentMethod[];
    userMessage: string;
    technicalMessage?: string;
    actionRequired?: EnhancedUserAction[];
    retryStrategy?: EnhancedRetryStrategy;
    severity: 'low' | 'medium' | 'high' | 'critical';
    canProceedWithoutAction: boolean;
    estimatedResolutionTime?: number; // seconds
    alternativeStrategies: AlternativeStrategy[];
    diagnosticInfo?: DiagnosticInfo;
    userGuidance: UserGuidance;
}

export interface AlternativeStrategy {
    type: 'immediate_fallback' | 'delayed_retry' | 'parameter_adjustment' | 'network_switch' | 'manual_intervention';
    description: string;
    estimatedSuccessRate: number; // 0-1
    estimatedTime: number; // seconds
    requiredActions: string[];
    fallbackMethods?: PaymentMethod[];
}

export interface DiagnosticInfo {
    timestamp: number;
    userAgent: string;
    networkId?: number;
    walletType?: string;
    balanceInfo?: BalanceInfo;
    networkHealth?: NetworkHealthInfo;
    transactionParams?: any;
}

export interface BalanceInfo {
    hasBalance: boolean;
    currentBalance?: string;
    requiredAmount?: string;
    shortfall?: string;
    lastUpdated: number;
}

export interface NetworkHealthInfo {
    isOnline: boolean;
    latency: number;
    congestionLevel: 'low' | 'medium' | 'high';
    gasPrice: number;
    blockHeight: number;
}

export interface UserGuidance {
    primaryRecommendation: string;
    stepByStepInstructions?: string[];
    troubleshootingTips: string[];
    preventionTips: string[];
    whenToContactSupport: string;
}

export interface EnhancedTransactionContext {
    amount: number;
    currency: string;
    recipient?: string;
    urgency: 'low' | 'medium' | 'high';
    userExperience: 'beginner' | 'intermediate' | 'advanced';
    previousFailures?: string[];
    timeConstraints?: number; // seconds until deadline
    costSensitivity: 'low' | 'medium' | 'high';
}

export class EnhancedPaymentMethodUnavailabilityHandler {
    private retryAttempts: Map<string, number> = new Map();
    private lastRetryTime: Map<string, number> = new Map();
    private failureHistory: Map<string, EnhancedUnavailabilityReason[]> = new Map();
    private diagnosticData: Map<string, DiagnosticInfo> = new Map();
    private recoveryStrategies: Map<string, AlternativeStrategy[]> = new Map();

    /**
     * Enhanced handling of unavailable payment methods with comprehensive recovery strategies
     */
    async handleUnavailableMethod(
        method: PaymentMethod,
        reason: EnhancedUnavailabilityReason,
        context: EnhancedTransactionContext,
        availableAlternatives: PaymentMethod[]
    ): Promise<EnhancedUnavailabilityHandlingResult> {
        // Record failure for pattern analysis
        this.recordFailure(method, reason, context);

        // Generate diagnostic information
        const diagnosticInfo = await this.generateDiagnosticInfo(method, reason, context);

        // Determine handling strategy based on reason type and context
        const handlingStrategy = this.determineHandlingStrategy(reason, context);

        switch (handlingStrategy) {
            case 'immediate_recovery':
                return this.handleImmediateRecovery(method, reason, context, availableAlternatives, diagnosticInfo);

            case 'guided_recovery':
                return this.handleGuidedRecovery(method, reason, context, availableAlternatives, diagnosticInfo);

            case 'fallback_priority':
                return this.handleFallbackPriority(method, reason, context, availableAlternatives, diagnosticInfo);

            case 'escalated_support':
                return this.handleEscalatedSupport(method, reason, context, availableAlternatives, diagnosticInfo);

            default:
                return this.handleGenericRecovery(method, reason, context, availableAlternatives, diagnosticInfo);
        }
    }

    /**
     * Handle immediate recovery scenarios (auto-fixable issues)
     */
    private async handleImmediateRecovery(
        method: PaymentMethod,
        reason: EnhancedUnavailabilityReason,
        context: EnhancedTransactionContext,
        availableAlternatives: PaymentMethod[],
        diagnosticInfo: DiagnosticInfo
    ): Promise<EnhancedUnavailabilityHandlingResult> {
        const fallbackMethods = this.intelligentlyPrioritizeFallbacks(availableAlternatives, method, context, reason);
        const retryStrategy = this.createEnhancedRetryStrategy(method, reason, context);
        const alternativeStrategies = this.generateAlternativeStrategies(method, reason, context, fallbackMethods);

        let actionRequired: EnhancedUserAction[] = [];
        let userMessage: string;
        let canProceedWithoutAction = true;

        switch (reason.type) {
            case 'wallet_disconnected':
                actionRequired = [{
                    type: 'reconnect_wallet',
                    description: 'Reconnect your wallet to continue',
                    priority: 'high',
                    estimatedTime: 10,
                    isAutomatable: true
                }];
                userMessage = 'Your wallet connection was lost. Please reconnect to continue with the payment.';
                canProceedWithoutAction = fallbackMethods.some(m => m.type === PaymentMethodType.FIAT_STRIPE);
                break;

            case 'gas_estimation_failed':
                actionRequired = [
                    {
                        type: 'increase_gas',
                        description: 'Increase gas limit for the transaction',
                        priority: 'high',
                        estimatedTime: 5,
                        isAutomatable: true
                    },
                    {
                        type: 'refresh_page',
                        description: 'Refresh the page to reset gas estimation',
                        priority: 'medium',
                        estimatedTime: 10
                    }
                ];
                userMessage = 'Unable to estimate gas fees. This usually resolves quickly with a retry or gas adjustment.';
                break;

            case 'user_rejected':
                userMessage = 'Transaction was cancelled. You can try again or use a different payment method.';
                canProceedWithoutAction = true;
                break;

            default:
                userMessage = `${method.name} encountered a temporary issue: ${reason.message}. Attempting automatic recovery...`;
        }

        return {
            fallbackMethods,
            userMessage,
            technicalMessage: reason.details,
            actionRequired,
            retryStrategy,
            severity: reason.severity,
            canProceedWithoutAction,
            estimatedResolutionTime: this.estimateResolutionTime(reason, context),
            alternativeStrategies,
            diagnosticInfo,
            userGuidance: this.generateUserGuidance(reason, context, 'immediate_recovery')
        };
    }

    /**
     * Handle guided recovery scenarios (user assistance needed)
     */
    private async handleGuidedRecovery(
        method: PaymentMethod,
        reason: EnhancedUnavailabilityReason,
        context: EnhancedTransactionContext,
        availableAlternatives: PaymentMethod[],
        diagnosticInfo: DiagnosticInfo
    ): Promise<EnhancedUnavailabilityHandlingResult> {
        const fallbackMethods = this.intelligentlyPrioritizeFallbacks(availableAlternatives, method, context, reason);
        const alternativeStrategies = this.generateAlternativeStrategies(method, reason, context, fallbackMethods);

        let actionRequired: EnhancedUserAction[] = [];
        let userMessage: string;
        let canProceedWithoutAction = false;

        switch (reason.type) {
            case 'insufficient_balance':
                const balanceInfo = diagnosticInfo.balanceInfo;
                if (balanceInfo?.shortfall) {
                    actionRequired = [
                        {
                            type: 'add_funds',
                            description: `Add ${balanceInfo.shortfall} ${method.name} to your wallet`,
                            priority: 'high',
                            estimatedTime: 300, // 5 minutes
                            actionUrl: this.getAddFundsUrl(method)
                        },
                        {
                            type: 'use_alternative',
                            description: 'Use a different payment method',
                            priority: 'medium',
                            estimatedTime: 30
                        }
                    ];
                    userMessage = `Insufficient ${method.name} balance. You need ${balanceInfo.shortfall} more to complete this transaction.`;
                } else {
                    userMessage = `Insufficient ${method.name} balance. Please add funds or use an alternative payment method.`;
                }
                canProceedWithoutAction = fallbackMethods.length > 0;
                break;

            case 'token_not_found':
                actionRequired = [
                    {
                        type: 'approve_token',
                        description: 'Add token to your wallet',
                        priority: 'high',
                        estimatedTime: 60
                    },
                    {
                        type: 'switch_network',
                        description: 'Switch to a network where this token is available',
                        priority: 'medium',
                        estimatedTime: 30
                    }
                ];
                userMessage = `${method.name} token not found in your wallet. You may need to add it or switch networks.`;
                break;

            case 'slippage_exceeded':
                actionRequired = [
                    {
                        type: 'adjust_slippage',
                        description: 'Increase slippage tolerance',
                        priority: 'high',
                        estimatedTime: 15
                    }
                ];
                userMessage = 'Transaction failed due to price movement. Adjusting slippage tolerance may help.';
                canProceedWithoutAction = fallbackMethods.length > 0;
                break;

            default:
                userMessage = `${method.name} requires your attention: ${reason.message}`;
                canProceedWithoutAction = fallbackMethods.length > 0;
        }

        return {
            fallbackMethods,
            userMessage,
            technicalMessage: reason.details,
            actionRequired,
            retryStrategy: this.createEnhancedRetryStrategy(method, reason, context),
            severity: reason.severity,
            canProceedWithoutAction,
            estimatedResolutionTime: this.estimateResolutionTime(reason, context),
            alternativeStrategies,
            diagnosticInfo,
            userGuidance: this.generateUserGuidance(reason, context, 'guided_recovery')
        };
    }

    /**
     * Handle fallback priority scenarios (immediate alternative needed)
     */
    private async handleFallbackPriority(
        method: PaymentMethod,
        reason: EnhancedUnavailabilityReason,
        context: EnhancedTransactionContext,
        availableAlternatives: PaymentMethod[],
        diagnosticInfo: DiagnosticInfo
    ): Promise<EnhancedUnavailabilityHandlingResult> {
        const fallbackMethods = this.intelligentlyPrioritizeFallbacks(availableAlternatives, method, context, reason);
        const alternativeStrategies = this.generateAlternativeStrategies(method, reason, context, fallbackMethods);

        // For high urgency or critical failures, prioritize immediate alternatives
        const prioritizedFallbacks = context.urgency === 'high' ?
            this.prioritizeBySpeed(fallbackMethods) :
            this.prioritizeByReliability(fallbackMethods);

        let userMessage: string;
        let actionRequired: EnhancedUserAction[] = [];

        switch (reason.type) {
            case 'service_unavailable':
                userMessage = `${method.name} service is temporarily unavailable. ${prioritizedFallbacks.length > 0 ? 'We recommend using an alternative payment method.' : 'Please try again later.'}`;
                break;

            case 'network_error':
                userMessage = `Network connectivity issues with ${method.name}. ${prioritizedFallbacks.some(m => m.type === PaymentMethodType.FIAT_STRIPE) ? 'Fiat payment is recommended as it doesn\'t rely on blockchain connectivity.' : 'Please try an alternative method.'}`;
                break;

            case 'maintenance':
                const maintenanceEnd = reason.retryAfter ? new Date(Date.now() + reason.retryAfter * 1000) : null;
                userMessage = `${method.name} is under maintenance${maintenanceEnd ? ` until ${maintenanceEnd.toLocaleTimeString()}` : ''}. Please use an alternative payment method.`;
                break;

            default:
                userMessage = `${method.name} is currently unavailable: ${reason.message}. Please select an alternative payment method.`;
        }

        if (prioritizedFallbacks.length === 0) {
            actionRequired = [{
                type: 'contact_support',
                description: 'Contact support for assistance',
                priority: 'high',
                estimatedTime: 300
            }];
        }

        return {
            fallbackMethods: prioritizedFallbacks,
            userMessage,
            technicalMessage: reason.details,
            actionRequired,
            retryStrategy: reason.isTemporary ? this.createEnhancedRetryStrategy(method, reason, context) : undefined,
            severity: reason.severity,
            canProceedWithoutAction: prioritizedFallbacks.length > 0,
            estimatedResolutionTime: this.estimateResolutionTime(reason, context),
            alternativeStrategies,
            diagnosticInfo,
            userGuidance: this.generateUserGuidance(reason, context, 'fallback_priority')
        };
    }

    /**
     * Handle escalated support scenarios (critical failures)
     */
    private async handleEscalatedSupport(
        method: PaymentMethod,
        reason: EnhancedUnavailabilityReason,
        context: EnhancedTransactionContext,
        availableAlternatives: PaymentMethod[],
        diagnosticInfo: DiagnosticInfo
    ): Promise<EnhancedUnavailabilityHandlingResult> {
        const fallbackMethods = this.intelligentlyPrioritizeFallbacks(availableAlternatives, method, context, reason);

        const actionRequired: EnhancedUserAction[] = [
            {
                type: 'contact_support',
                description: 'Contact technical support immediately',
                priority: 'high',
                estimatedTime: 300,
                actionUrl: '/support?issue=payment-critical'
            }
        ];

        if (fallbackMethods.length > 0) {
            actionRequired.push({
                type: 'use_alternative',
                description: 'Use alternative payment method while we resolve this issue',
                priority: 'medium',
                estimatedTime: 60
            });
        }

        return {
            fallbackMethods,
            userMessage: `Critical issue with ${method.name}: ${reason.message}. Our technical team has been notified and will investigate immediately.`,
            technicalMessage: `Error Code: ${reason.errorCode || 'UNKNOWN'} | ${reason.details}`,
            actionRequired,
            severity: 'critical',
            canProceedWithoutAction: fallbackMethods.length > 0,
            estimatedResolutionTime: 1800, // 30 minutes for critical issues
            alternativeStrategies: this.generateAlternativeStrategies(method, reason, context, fallbackMethods),
            diagnosticInfo,
            userGuidance: this.generateUserGuidance(reason, context, 'escalated_support')
        };
    }

    /**
     * Handle generic recovery scenarios
     */
    private async handleGenericRecovery(
        method: PaymentMethod,
        reason: EnhancedUnavailabilityReason,
        context: EnhancedTransactionContext,
        availableAlternatives: PaymentMethod[],
        diagnosticInfo: DiagnosticInfo
    ): Promise<EnhancedUnavailabilityHandlingResult> {
        const fallbackMethods = this.intelligentlyPrioritizeFallbacks(availableAlternatives, method, context, reason);

        return {
            fallbackMethods,
            userMessage: `${method.name} is currently unavailable: ${reason.message}. ${fallbackMethods.length > 0 ? 'Please try an alternative payment method.' : 'Please try again later.'}`,
            technicalMessage: reason.details,
            retryStrategy: reason.isTemporary ? this.createEnhancedRetryStrategy(method, reason, context) : undefined,
            severity: reason.severity,
            canProceedWithoutAction: fallbackMethods.length > 0,
            estimatedResolutionTime: this.estimateResolutionTime(reason, context),
            alternativeStrategies: this.generateAlternativeStrategies(method, reason, context, fallbackMethods),
            diagnosticInfo,
            userGuidance: this.generateUserGuidance(reason, context, 'generic_recovery')
        };
    }

    /**
     * Intelligently prioritize fallback methods based on context and failure reason
     */
    private intelligentlyPrioritizeFallbacks(
        availableMethods: PaymentMethod[],
        failedMethod: PaymentMethod,
        context: EnhancedTransactionContext,
        reason: EnhancedUnavailabilityReason
    ): PaymentMethod[] {
        const filtered = availableMethods.filter(m => m.id !== failedMethod.id);

        // Score each method based on multiple factors
        const scoredMethods = filtered.map(method => ({
            method,
            score: this.calculateFallbackScore(method, failedMethod, context, reason)
        }));

        // Sort by score (highest first)
        return scoredMethods
            .sort((a, b) => b.score - a.score)
            .map(item => item.method);
    }

    /**
     * Calculate fallback score based on multiple factors
     */
    private calculateFallbackScore(
        method: PaymentMethod,
        failedMethod: PaymentMethod,
        context: EnhancedTransactionContext,
        reason: EnhancedUnavailabilityReason
    ): number {
        let score = 0;

        // Base reliability scores
        const reliabilityScores = {
            [PaymentMethodType.FIAT_STRIPE]: 90,
            [PaymentMethodType.STABLECOIN_USDC]: 80,
            [PaymentMethodType.STABLECOIN_USDT]: 75,
            [PaymentMethodType.NATIVE_ETH]: 70
        };
        score += reliabilityScores[method.type] || 50;

        // Context-based adjustments
        if (context.urgency === 'high') {
            // Prioritize faster methods for urgent transactions
            if (method.type === PaymentMethodType.FIAT_STRIPE) score += 20;
        }

        if (context.costSensitivity === 'high') {
            // Prioritize lower-cost methods
            if (method.type === PaymentMethodType.STABLECOIN_USDC) score += 15;
            if (method.type === PaymentMethodType.STABLECOIN_USDT) score += 10;
        }

        // Reason-based adjustments
        switch (reason.type) {
            case 'network_error':
                // Prioritize non-blockchain methods
                if (method.type === PaymentMethodType.FIAT_STRIPE) score += 30;
                break;

            case 'insufficient_balance':
                // If failed method was crypto, slightly prefer other crypto (user likely has crypto)
                if (failedMethod.type !== PaymentMethodType.FIAT_STRIPE &&
                    method.type !== PaymentMethodType.FIAT_STRIPE) {
                    score += 10;
                }
                break;

            case 'gas_estimation_failed':
                // Prefer methods with predictable fees
                if (method.type === PaymentMethodType.FIAT_STRIPE) score += 25;
                if (method.type === PaymentMethodType.STABLECOIN_USDC) score += 15;
                break;
        }

        // User experience adjustments
        if (context.userExperience === 'beginner') {
            // Prioritize simpler methods for beginners
            if (method.type === PaymentMethodType.FIAT_STRIPE) score += 15;
        }

        return score;
    }

    /**
     * Generate alternative strategies for recovery
     */
    private generateAlternativeStrategies(
        method: PaymentMethod,
        reason: EnhancedUnavailabilityReason,
        context: EnhancedTransactionContext,
        fallbackMethods: PaymentMethod[]
    ): AlternativeStrategy[] {
        const strategies: AlternativeStrategy[] = [];

        // Immediate fallback strategy
        if (fallbackMethods.length > 0) {
            strategies.push({
                type: 'immediate_fallback',
                description: `Switch to ${fallbackMethods[0].name} immediately`,
                estimatedSuccessRate: 0.9,
                estimatedTime: 30,
                requiredActions: ['Select alternative payment method'],
                fallbackMethods: [fallbackMethods[0]]
            });
        }

        // Retry strategy (if applicable)
        if (reason.isTemporary) {
            strategies.push({
                type: 'delayed_retry',
                description: `Wait ${reason.retryAfter || 60} seconds and retry ${method.name}`,
                estimatedSuccessRate: 0.7,
                estimatedTime: (reason.retryAfter || 60) + 30,
                requiredActions: ['Wait for retry period', 'Retry original method']
            });
        }

        // Parameter adjustment strategy
        if (['slippage_exceeded', 'gas_estimation_failed'].includes(reason.type)) {
            strategies.push({
                type: 'parameter_adjustment',
                description: 'Adjust transaction parameters and retry',
                estimatedSuccessRate: 0.8,
                estimatedTime: 60,
                requiredActions: ['Adjust slippage/gas settings', 'Retry transaction']
            });
        }

        // Network switch strategy
        if (reason.type === 'network_error' && method.type !== PaymentMethodType.FIAT_STRIPE) {
            strategies.push({
                type: 'network_switch',
                description: 'Switch to a different network',
                estimatedSuccessRate: 0.6,
                estimatedTime: 120,
                requiredActions: ['Switch network in wallet', 'Retry payment']
            });
        }

        return strategies.sort((a, b) => b.estimatedSuccessRate - a.estimatedSuccessRate);
    }

    /**
     * Generate comprehensive user guidance
     */
    private generateUserGuidance(
        reason: EnhancedUnavailabilityReason,
        context: EnhancedTransactionContext,
        strategy: string
    ): UserGuidance {
        const guidance: UserGuidance = {
            primaryRecommendation: '',
            troubleshootingTips: [],
            preventionTips: [],
            whenToContactSupport: 'Contact support if the issue persists after trying all suggested solutions.'
        };

        switch (reason.type) {
            case 'insufficient_balance':
                guidance.primaryRecommendation = 'Add funds to your wallet or use an alternative payment method.';
                guidance.stepByStepInstructions = [
                    'Check your current balance in the wallet',
                    'Calculate how much more you need',
                    'Add funds through your wallet or exchange',
                    'Wait for confirmation before retrying'
                ];
                guidance.troubleshootingTips = [
                    'Ensure you\'re checking the correct network',
                    'Account for gas fees in addition to the payment amount',
                    'Refresh your wallet to see updated balances'
                ];
                guidance.preventionTips = [
                    'Keep a buffer amount for gas fees',
                    'Monitor your balances regularly',
                    'Set up balance alerts if available'
                ];
                break;

            case 'network_error':
                guidance.primaryRecommendation = 'Check your internet connection and try again, or use fiat payment.';
                guidance.troubleshootingTips = [
                    'Check your internet connection',
                    'Try refreshing the page',
                    'Switch to a different network if available',
                    'Clear browser cache and cookies'
                ];
                guidance.preventionTips = [
                    'Use a stable internet connection for transactions',
                    'Keep fiat payment as a backup option',
                    'Avoid peak network congestion times'
                ];
                break;

            case 'wallet_disconnected':
                guidance.primaryRecommendation = 'Reconnect your wallet and try again.';
                guidance.stepByStepInstructions = [
                    'Click the wallet connection button',
                    'Select your wallet from the list',
                    'Approve the connection in your wallet',
                    'Retry the payment'
                ];
                guidance.troubleshootingTips = [
                    'Make sure your wallet extension is unlocked',
                    'Try refreshing the page if connection fails',
                    'Check if your wallet supports this website'
                ];
                break;

            default:
                guidance.primaryRecommendation = reason.suggestedActions[0] || 'Try an alternative payment method.';
                guidance.troubleshootingTips = reason.suggestedActions;
        }

        return guidance;
    }

    /**
     * Create enhanced retry strategy with intelligent backoff
     */
    private createEnhancedRetryStrategy(
        method: PaymentMethod,
        reason: EnhancedUnavailabilityReason,
        context: EnhancedTransactionContext
    ): EnhancedRetryStrategy {
        const methodKey = `${method.id}-${reason.type}`;
        const currentAttempt = this.retryAttempts.get(methodKey) || 0;

        let maxRetries = 3;
        let backoffMultiplier = 2;
        let baseRetryAfter = 30;
        let autoRetry = false;

        // Adjust strategy based on reason type
        switch (reason.type) {
            case 'network_error':
                maxRetries = 5;
                baseRetryAfter = 10;
                autoRetry = true;
                break;
            case 'gas_estimation_failed':
                maxRetries = 3;
                baseRetryAfter = 5;
                autoRetry = true;
                break;
            case 'service_unavailable':
                maxRetries = 3;
                baseRetryAfter = 60;
                break;
            case 'rate_limit':
                maxRetries = 2;
                baseRetryAfter = reason.retryAfter || 300;
                backoffMultiplier = 1;
                break;
            case 'timeout':
                maxRetries = 2;
                baseRetryAfter = 15;
                break;
        }

        // Adjust for urgency
        if (context.urgency === 'high') {
            baseRetryAfter = Math.max(baseRetryAfter / 2, 5);
            autoRetry = true;
        }

        const retryAfter = Math.min(
            baseRetryAfter * Math.pow(backoffMultiplier, currentAttempt),
            600 // Max 10 minutes
        );

        return {
            canRetry: currentAttempt < maxRetries && reason.isTemporary,
            retryAfter,
            maxRetries,
            currentAttempt,
            backoffMultiplier,
            retryConditions: reason.suggestedActions,
            autoRetry,
            retryWithDifferentParams: ['slippage_exceeded', 'gas_estimation_failed'].includes(reason.type)
        };
    }

    /**
     * Generate diagnostic information for troubleshooting
     */
    private async generateDiagnosticInfo(
        method: PaymentMethod,
        reason: EnhancedUnavailabilityReason,
        context: EnhancedTransactionContext
    ): Promise<DiagnosticInfo> {
        return {
            timestamp: Date.now(),
            userAgent: navigator.userAgent,
            networkId: (window as any).ethereum?.chainId,
            walletType: (window as any).ethereum?.isMetaMask ? 'MetaMask' : 'Unknown',
            balanceInfo: await this.getBalanceInfo(method, context),
            networkHealth: await this.getNetworkHealth(),
            transactionParams: {
                amount: context.amount,
                currency: context.currency,
                urgency: context.urgency
            }
        };
    }

    /**
     * Get balance information for diagnostic purposes
     */
    private async getBalanceInfo(method: PaymentMethod, context: EnhancedTransactionContext): Promise<BalanceInfo> {
        // Mock implementation - in real app, this would query actual balances
        return {
            hasBalance: false,
            currentBalance: '0',
            requiredAmount: context.amount.toString(),
            shortfall: context.amount.toString(),
            lastUpdated: Date.now()
        };
    }

    /**
     * Get network health information
     */
    private async getNetworkHealth(): Promise<NetworkHealthInfo> {
        // Mock implementation - in real app, this would check actual network status
        return {
            isOnline: navigator.onLine,
            latency: Math.random() * 1000 + 100,
            congestionLevel: 'medium',
            gasPrice: 50,
            blockHeight: 18000000
        };
    }

    /**
     * Record failure for pattern analysis
     */
    private recordFailure(
        method: PaymentMethod,
        reason: EnhancedUnavailabilityReason,
        context: EnhancedTransactionContext
    ): void {
        const key = method.id;
        const failures = this.failureHistory.get(key) || [];
        failures.push(reason);

        // Keep only last 10 failures
        if (failures.length > 10) {
            failures.shift();
        }

        this.failureHistory.set(key, failures);
    }

    /**
     * Estimate resolution time based on reason and historical data
     */
    private estimateResolutionTime(reason: EnhancedUnavailabilityReason, context: EnhancedTransactionContext): number {
        const baseEstimates = {
            'insufficient_balance': 300, // 5 minutes
            'service_unavailable': 600, // 10 minutes
            'network_error': 120, // 2 minutes
            'validation_failed': 60, // 1 minute
            'rate_limit': reason.retryAfter || 300,
            'maintenance': reason.retryAfter || 1800,
            'wallet_disconnected': 30,
            'token_not_found': 120,
            'slippage_exceeded': 60,
            'gas_estimation_failed': 30,
            'user_rejected': 0,
            'timeout': 60
        };

        return baseEstimates[reason.type] || 300;
    }

    /**
     * Prioritize methods by speed
     */
    private prioritizeBySpeed(methods: PaymentMethod[]): PaymentMethod[] {
        const speedOrder = {
            [PaymentMethodType.FIAT_STRIPE]: 1,
            [PaymentMethodType.STABLECOIN_USDC]: 2,
            [PaymentMethodType.STABLECOIN_USDT]: 3,
            [PaymentMethodType.NATIVE_ETH]: 4
        };

        return methods.sort((a, b) => (speedOrder[a.type] || 5) - (speedOrder[b.type] || 5));
    }

    /**
     * Prioritize methods by reliability
     */
    private prioritizeByReliability(methods: PaymentMethod[]): PaymentMethod[] {
        const reliabilityOrder = {
            [PaymentMethodType.FIAT_STRIPE]: 1,
            [PaymentMethodType.STABLECOIN_USDC]: 2,
            [PaymentMethodType.STABLECOIN_USDT]: 3,
            [PaymentMethodType.NATIVE_ETH]: 4
        };

        return methods.sort((a, b) => (reliabilityOrder[a.type] || 5) - (reliabilityOrder[b.type] || 5));
    }

    /**
     * Determine handling strategy based on reason and context
     */
    private determineHandlingStrategy(
        reason: EnhancedUnavailabilityReason,
        context: EnhancedTransactionContext
    ): 'immediate_recovery' | 'guided_recovery' | 'fallback_priority' | 'escalated_support' | 'generic_recovery' {
        if (reason.severity === 'critical') {
            return 'escalated_support';
        }

        if (['wallet_disconnected', 'gas_estimation_failed', 'user_rejected'].includes(reason.type)) {
            return 'immediate_recovery';
        }

        if (['insufficient_balance', 'token_not_found', 'slippage_exceeded'].includes(reason.type)) {
            return 'guided_recovery';
        }

        if (['service_unavailable', 'network_error', 'maintenance'].includes(reason.type) || context.urgency === 'high') {
            return 'fallback_priority';
        }

        return 'generic_recovery';
    }

    /**
     * Get URL for adding funds for a specific payment method
     */
    private getAddFundsUrl(method: PaymentMethod): string {
        const urls = {
            [PaymentMethodType.NATIVE_ETH]: 'https://ethereum.org/en/get-eth/',
            [PaymentMethodType.STABLECOIN_USDC]: 'https://www.centre.io/usdc',
            [PaymentMethodType.STABLECOIN_USDT]: 'https://tether.to/',
            [PaymentMethodType.FIAT_STRIPE]: '/payment-methods'
        };

        return urls[method.type] || '/wallet';
    }

    /**
     * Clear old data for cleanup
     */
    clearOldData(maxAge: number = 3600000): void { // 1 hour default
        const now = Date.now();

        // Clear old retry attempts
        for (const [key, timestamp] of this.lastRetryTime.entries()) {
            if (now - timestamp > maxAge) {
                this.retryAttempts.delete(key);
                this.lastRetryTime.delete(key);
            }
        }

        // Clear old diagnostic data
        for (const [key, data] of this.diagnosticData.entries()) {
            if (now - data.timestamp > maxAge) {
                this.diagnosticData.delete(key);
            }
        }
    }

    /**
     * Get failure patterns for a method
     */
    getFailurePatterns(method: PaymentMethod): EnhancedUnavailabilityReason[] {
        return this.failureHistory.get(method.id) || [];
    }

    /**
     * Record retry attempt
     */
    recordRetryAttempt(method: PaymentMethod, reason: EnhancedUnavailabilityReason): void {
        const methodKey = `${method.id}-${reason.type}`;
        const currentAttempts = this.retryAttempts.get(methodKey) || 0;
        this.retryAttempts.set(methodKey, currentAttempts + 1);
        this.lastRetryTime.set(methodKey, Date.now());
    }

    /**
     * Reset retry attempts for a method
     */
    resetRetryAttempts(method: PaymentMethod, reason: EnhancedUnavailabilityReason): void {
        const methodKey = `${method.id}-${reason.type}`;
        this.retryAttempts.delete(methodKey);
        this.lastRetryTime.delete(methodKey);
    }
}

// Export singleton instance
export const enhancedPaymentMethodUnavailabilityHandler = new EnhancedPaymentMethodUnavailabilityHandler();