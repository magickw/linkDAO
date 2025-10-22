/**
 * Metrics Collection and Analysis for Payment Method Prioritization A/B Testing
 * This script collects, analyzes, and reports on A/B test metrics
 */

const { Client } = require('pg');
const Redis = require('redis');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class MetricsCollector {
    constructor(config) {
        this.config = config;
        this.dbClient = new Client(config.database);
        this.redisClient = Redis.createClient(config.redis);
        this.prometheusUrl = config.prometheus.url;
    }

    async initialize() {
        await this.dbClient.connect();
        await this.redisClient.connect();
        console.log('Metrics collector initialized');
    }

    /**
     * Collect conversion rate metrics
     */
    async collectConversionMetrics(experimentId, timeRange = '24h') {
        const query = `
            SELECT 
                experiment_variant,
                COUNT(*) as total_users,
                COUNT(CASE WHEN checkout_completed = true THEN 1 END) as conversions,
                ROUND(
                    COUNT(CASE WHEN checkout_completed = true THEN 1 END) * 100.0 / COUNT(*), 
                    2
                ) as conversion_rate
            FROM user_experiment_events 
            WHERE experiment_id = $1 
                AND created_at >= NOW() - INTERVAL '${timeRange}'
            GROUP BY experiment_variant
        `;
        
        const result = await this.dbClient.query(query, [experimentId]);
        return result.rows;
    }

    /**
     * Collect cost savings metrics
     */
    async collectCostMetrics(experimentId, timeRange = '24h') {
        const query = `
            SELECT 
                experiment_variant,
                AVG(actual_transaction_cost) as avg_cost,
                AVG(estimated_gas_fee) as avg_gas_fee,
                AVG(total_cost_savings) as avg_savings,
                PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY actual_transaction_cost) as median_cost
            FROM payment_transactions pt
            JOIN user_experiment_events uee ON pt.user_id = uee.user_id
            WHERE uee.experiment_id = $1 
                AND pt.created_at >= NOW() - INTERVAL '${timeRange}'
                AND pt.status = 'completed'
            GROUP BY experiment_variant
        `;
        
        const result = await this.dbClient.query(query, [experimentId]);
        return result.rows;
    }

    /**
     * Collect user satisfaction metrics
     */
    async collectSatisfactionMetrics(experimentId, timeRange = '24h') {
        const query = `
            SELECT 
                experiment_variant,
                AVG(satisfaction_score) as avg_satisfaction,
                COUNT(*) as total_responses,
                COUNT(CASE WHEN satisfaction_score >= 4 THEN 1 END) as positive_responses,
                ROUND(
                    COUNT(CASE WHEN satisfaction_score >= 4 THEN 1 END) * 100.0 / COUNT(*), 
                    2
                ) as positive_rate
            FROM user_feedback uf
            JOIN user_experiment_events uee ON uf.user_id = uee.user_id
            WHERE uee.experiment_id = $1 
                AND uf.created_at >= NOW() - INTERVAL '${timeRange}'
            GROUP BY experiment_variant
        `;
        
        const result = await this.dbClient.query(query, [experimentId]);
        return result.rows;
    }

    /**
     * Collect payment method distribution metrics
     */
    async collectPaymentMethodMetrics(experimentId, timeRange = '24h') {
        const query = `
            SELECT 
                experiment_variant,
                payment_method,
                COUNT(*) as selections,
                ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (PARTITION BY experiment_variant), 2) as percentage
            FROM payment_method_selections pms
            JOIN user_experiment_events uee ON pms.user_id = uee.user_id
            WHERE uee.experiment_id = $1 
                AND pms.created_at >= NOW() - INTERVAL '${timeRange}'
            GROUP BY experiment_variant, payment_method
            ORDER BY experiment_variant, selections DESC
        `;
        
        const result = await this.dbClient.query(query, [experimentId]);
        return result.rows;
    }

    /**
     * Collect performance metrics from Prometheus
     */
    async collectPerformanceMetrics(timeRange = '24h') {
        const metrics = {};
        
        // Response time metrics
        const responseTimeQuery = `histogram_quantile(0.95, rate(payment_prioritization_duration_seconds_bucket[5m]))`;
        const responseTimeResult = await this.queryPrometheus(responseTimeQuery);
        metrics.responseTime95th = responseTimeResult.data.result[0]?.value[1] || 0;
        
        // Error rate metrics
        const errorRateQuery = `rate(payment_prioritization_errors_total[5m])`;
        const errorRateResult = await this.queryPrometheus(errorRateQuery);
        metrics.errorRate = errorRateResult.data.result[0]?.value[1] || 0;
        
        // Cache hit rate
        const cacheHitQuery = `cache_hit_rate{service="payment-prioritization"}`;
        const cacheHitResult = await this.queryPrometheus(cacheHitQuery);
        metrics.cacheHitRate = cacheHitResult.data.result[0]?.value[1] || 0;
        
        // WebSocket connections
        const wsConnectionsQuery = `websocket_active_connections`;
        const wsConnectionsResult = await this.queryPrometheus(wsConnectionsQuery);
        metrics.activeWebSocketConnections = wsConnectionsResult.data.result[0]?.value[1] || 0;
        
        return metrics;
    }

    /**
     * Query Prometheus for metrics
     */
    async queryPrometheus(query) {
        try {
            const response = await axios.get(`${this.prometheusUrl}/api/v1/query`, {
                params: { query }
            });
            return response.data;
        } catch (error) {
            console.error('Error querying Prometheus:', error.message);
            return { data: { result: [] } };
        }
    }

    /**
     * Calculate statistical significance
     */
    calculateStatisticalSignificance(controlData, treatmentData, metric) {
        const controlValue = controlData[metric];
        const treatmentValue = treatmentData[metric];
        const controlSampleSize = controlData.total_users || controlData.total_responses;
        const treatmentSampleSize = treatmentData.total_users || treatmentData.total_responses;
        
        // Simple z-test for proportions (conversion rate)
        if (metric === 'conversion_rate') {
            const p1 = controlValue / 100;
            const p2 = treatmentValue / 100;
            const n1 = controlSampleSize;
            const n2 = treatmentSampleSize;
            
            const pooledP = (p1 * n1 + p2 * n2) / (n1 + n2);
            const se = Math.sqrt(pooledP * (1 - pooledP) * (1/n1 + 1/n2));
            const z = (p2 - p1) / se;
            const pValue = 2 * (1 - this.normalCDF(Math.abs(z)));
            
            return {
                zScore: z,
                pValue: pValue,
                significant: pValue < 0.05,
                confidenceLevel: (1 - pValue) * 100
            };
        }
        
        // For other metrics, use t-test approximation
        return {
            significant: false,
            confidenceLevel: 0,
            note: 'Statistical test not implemented for this metric'
        };
    }

    /**
     * Normal cumulative distribution function
     */
    normalCDF(x) {
        return 0.5 * (1 + this.erf(x / Math.sqrt(2)));
    }

    /**
     * Error function approximation
     */
    erf(x) {
        const a1 =  0.254829592;
        const a2 = -0.284496736;
        const a3 =  1.421413741;
        const a4 = -1.453152027;
        const a5 =  1.061405429;
        const p  =  0.3275911;
        
        const sign = x >= 0 ? 1 : -1;
        x = Math.abs(x);
        
        const t = 1.0 / (1.0 + p * x);
        const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
        
        return sign * y;
    }

    /**
     * Generate comprehensive experiment report
     */
    async generateExperimentReport(experimentId, timeRange = '24h') {
        console.log(`Generating experiment report for ${experimentId}...`);
        
        const [
            conversionMetrics,
            costMetrics,
            satisfactionMetrics,
            paymentMethodMetrics,
            performanceMetrics
        ] = await Promise.all([
            this.collectConversionMetrics(experimentId, timeRange),
            this.collectCostMetrics(experimentId, timeRange),
            this.collectSatisfactionMetrics(experimentId, timeRange),
            this.collectPaymentMethodMetrics(experimentId, timeRange),
            this.collectPerformanceMetrics(timeRange)
        ]);

        // Find control and treatment groups
        const controlConversion = conversionMetrics.find(m => m.experiment_variant === 'control');
        const treatmentConversion = conversionMetrics.find(m => m.experiment_variant === 'treatment');
        
        const controlCost = costMetrics.find(m => m.experiment_variant === 'control');
        const treatmentCost = costMetrics.find(m => m.experiment_variant === 'treatment');
        
        const controlSatisfaction = satisfactionMetrics.find(m => m.experiment_variant === 'control');
        const treatmentSatisfaction = satisfactionMetrics.find(m => m.experiment_variant === 'treatment');

        // Calculate statistical significance
        const conversionSignificance = controlConversion && treatmentConversion ? 
            this.calculateStatisticalSignificance(controlConversion, treatmentConversion, 'conversion_rate') : null;

        const report = {
            experimentId,
            timeRange,
            generatedAt: new Date().toISOString(),
            
            // Conversion Metrics
            conversion: {
                control: controlConversion,
                treatment: treatmentConversion,
                improvement: treatmentConversion && controlConversion ? 
                    ((treatmentConversion.conversion_rate - controlConversion.conversion_rate) / controlConversion.conversion_rate * 100).toFixed(2) : null,
                significance: conversionSignificance
            },
            
            // Cost Metrics
            cost: {
                control: controlCost,
                treatment: treatmentCost,
                savings: treatmentCost && controlCost ? 
                    ((controlCost.avg_cost - treatmentCost.avg_cost) / controlCost.avg_cost * 100).toFixed(2) : null
            },
            
            // Satisfaction Metrics
            satisfaction: {
                control: controlSatisfaction,
                treatment: treatmentSatisfaction,
                improvement: treatmentSatisfaction && controlSatisfaction ? 
                    (treatmentSatisfaction.avg_satisfaction - controlSatisfaction.avg_satisfaction).toFixed(2) : null
            },
            
            // Payment Method Distribution
            paymentMethods: paymentMethodMetrics,
            
            // Performance Metrics
            performance: performanceMetrics,
            
            // Recommendations
            recommendations: this.generateRecommendations({
                conversionSignificance,
                conversionImprovement: treatmentConversion && controlConversion ? 
                    ((treatmentConversion.conversion_rate - controlConversion.conversion_rate) / controlConversion.conversion_rate * 100) : 0,
                costSavings: treatmentCost && controlCost ? 
                    ((controlCost.avg_cost - treatmentCost.avg_cost) / controlCost.avg_cost * 100) : 0,
                satisfactionImprovement: treatmentSatisfaction && controlSatisfaction ? 
                    (treatmentSatisfaction.avg_satisfaction - controlSatisfaction.avg_satisfaction) : 0
            })
        };

        return report;
    }

    /**
     * Generate recommendations based on experiment results
     */
    generateRecommendations(metrics) {
        const recommendations = [];
        
        if (metrics.conversionSignificance?.significant) {
            if (metrics.conversionImprovement > 3) {
                recommendations.push({
                    type: 'success',
                    message: 'Strong positive impact on conversion rate. Recommend full rollout.',
                    priority: 'high'
                });
            } else if (metrics.conversionImprovement > 0) {
                recommendations.push({
                    type: 'success',
                    message: 'Positive impact on conversion rate. Consider gradual rollout.',
                    priority: 'medium'
                });
            } else {
                recommendations.push({
                    type: 'warning',
                    message: 'Negative impact on conversion rate. Consider rollback.',
                    priority: 'high'
                });
            }
        } else {
            recommendations.push({
                type: 'info',
                message: 'No statistically significant impact on conversion rate. Continue monitoring.',
                priority: 'low'
            });
        }
        
        if (metrics.costSavings > 5) {
            recommendations.push({
                type: 'success',
                message: `Significant cost savings of ${metrics.costSavings.toFixed(1)}%. Strong business case for rollout.`,
                priority: 'high'
            });
        }
        
        if (metrics.satisfactionImprovement > 0.2) {
            recommendations.push({
                type: 'success',
                message: 'Improved user satisfaction. Positive user experience impact.',
                priority: 'medium'
            });
        }
        
        return recommendations;
    }

    /**
     * Save report to file
     */
    async saveReport(report, filename) {
        const reportPath = path.join(__dirname, 'reports', filename);
        await fs.mkdir(path.dirname(reportPath), { recursive: true });
        await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
        console.log(`Report saved to ${reportPath}`);
    }

    /**
     * Send report via webhook (Slack, email, etc.)
     */
    async sendReport(report, webhookUrl) {
        const summary = this.generateReportSummary(report);
        
        try {
            await axios.post(webhookUrl, {
                text: `Payment Method Prioritization A/B Test Report`,
                attachments: [{
                    color: report.recommendations.some(r => r.type === 'success') ? 'good' : 
                           report.recommendations.some(r => r.type === 'warning') ? 'warning' : '#439FE0',
                    fields: [
                        {
                            title: 'Conversion Rate',
                            value: summary.conversion,
                            short: true
                        },
                        {
                            title: 'Cost Savings',
                            value: summary.cost,
                            short: true
                        },
                        {
                            title: 'User Satisfaction',
                            value: summary.satisfaction,
                            short: true
                        },
                        {
                            title: 'Statistical Significance',
                            value: summary.significance,
                            short: true
                        }
                    ]
                }]
            });
            console.log('Report sent via webhook');
        } catch (error) {
            console.error('Error sending report:', error.message);
        }
    }

    /**
     * Generate report summary for notifications
     */
    generateReportSummary(report) {
        return {
            conversion: report.conversion.improvement ? 
                `${report.conversion.improvement}% improvement` : 'No significant change',
            cost: report.cost.savings ? 
                `${report.cost.savings}% savings` : 'No significant change',
            satisfaction: report.satisfaction.improvement ? 
                `+${report.satisfaction.improvement} points` : 'No significant change',
            significance: report.conversion.significance?.significant ? 
                `Yes (${report.conversion.significance.confidenceLevel.toFixed(1)}%)` : 'No'
        };
    }

    async close() {
        await this.dbClient.end();
        await this.redisClient.quit();
        console.log('Metrics collector closed');
    }
}

// Configuration
const config = {
    database: {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'payment_prioritization',
        user: process.env.DB_USER || 'payment_user',
        password: process.env.DB_PASSWORD || 'password'
    },
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379
    },
    prometheus: {
        url: process.env.PROMETHEUS_URL || 'http://localhost:9090'
    }
};

// Main execution
async function main() {
    const collector = new MetricsCollector(config);
    
    try {
        await collector.initialize();
        
        const experimentId = process.argv[2] || 'stablecoin_first_prioritization';
        const timeRange = process.argv[3] || '24h';
        
        const report = await collector.generateExperimentReport(experimentId, timeRange);
        
        // Save report
        const filename = `experiment_report_${experimentId}_${new Date().toISOString().split('T')[0]}.json`;
        await collector.saveReport(report, filename);
        
        // Send report if webhook URL is provided
        const webhookUrl = process.env.SLACK_WEBHOOK_URL;
        if (webhookUrl) {
            await collector.sendReport(report, webhookUrl);
        }
        
        // Print summary to console
        console.log('\n=== EXPERIMENT REPORT SUMMARY ===');
        console.log(`Experiment: ${experimentId}`);
        console.log(`Time Range: ${timeRange}`);
        console.log(`Generated: ${report.generatedAt}`);
        console.log('\nKey Metrics:');
        console.log(`- Conversion Rate Improvement: ${report.conversion.improvement || 'N/A'}%`);
        console.log(`- Cost Savings: ${report.cost.savings || 'N/A'}%`);
        console.log(`- Satisfaction Improvement: ${report.satisfaction.improvement || 'N/A'} points`);
        console.log(`- Statistical Significance: ${report.conversion.significance?.significant ? 'Yes' : 'No'}`);
        
        console.log('\nRecommendations:');
        report.recommendations.forEach(rec => {
            console.log(`- [${rec.priority.toUpperCase()}] ${rec.message}`);
        });
        
    } catch (error) {
        console.error('Error generating report:', error);
        process.exit(1);
    } finally {
        await collector.close();
    }
}

if (require.main === module) {
    main();
}

module.exports = MetricsCollector;