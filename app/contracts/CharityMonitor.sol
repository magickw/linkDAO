// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./LDAOTreasury.sol";

/**
 * @title CharityMonitor
 * @notice Monitoring and alerting system for charity operations
 * @dev Tracks charity activities and provides transparency metrics
 */
contract CharityMonitor is Ownable, ReentrancyGuard {
    // Monitored treasury
    LDAOTreasury public immutable treasury;
    
    // Alert thresholds
    struct AlertThresholds {
        uint256 dailyDisbursementLimit; // Alert when exceeded
        uint256 monthlyDisbursementLimit; // Alert when exceeded
        uint256 singleDisbursementLimit; // Alert when exceeded
        uint256 charityCountThreshold; // Alert when too many charities
        uint256 lowFundThreshold; // Alert when funds are low
    }
    
    AlertThresholds public alertThresholds;
    
    // Monitoring data
    struct DailyMetrics {
        uint256 date; // Unix timestamp (days since epoch)
        uint256 totalDisbursed;
        uint256 disbursementCount;
        uint256 activeCharities;
        uint256 newCharities;
        mapping(address => uint256) charityDisbursements;
    }
    
    struct CharityMetrics {
        address charityAddress;
        string name;
        uint256 totalReceived;
        uint256 lastDisbursement;
        uint256 disbursementCount;
        uint256 averageDisbursement;
        bool isActive;
        uint256 verificationDate;
        uint256 riskScore; // 0-100, higher = more risk
    }
    
    // Storage
    mapping(uint256 => DailyMetrics) public dailyMetrics; // date => metrics
    mapping(address => CharityMetrics) public charityMetrics;
    address[] public charityAddresses;
    
    // Alert system
    struct Alert {
        uint256 id;
        address triggeredBy;
        string alertType;
        address relatedCharity;
        uint256 amount;
        string description;
        uint256 timestamp;
        bool acknowledged;
        string resolution;
    }
    
    mapping(uint256 => Alert) public alerts;
    uint256 public nextAlertId = 1;
    uint256[] public activeAlerts;
    
    // Events
    event AlertTriggered(
        uint256 indexed alertId,
        string indexed alertType,
        address indexed charity,
        uint256 amount,
        string description
    );
    
    event AlertAcknowledged(
        uint256 indexed alertId,
        address indexed acknowledgedBy,
        string resolution
    );
    
    event DailyMetricsUpdated(
        uint256 indexed date,
        uint256 totalDisbursed,
        uint256 disbursementCount,
        uint256 activeCharities
    );
    
    event CharityRiskScoreUpdated(
        address indexed charity,
        uint256 oldScore,
        uint256 newScore
    );
    
    constructor(address _treasury) Ownable(msg.sender) {
        treasury = LDAOTreasury(_treasury);
        
        // Initialize default thresholds
        alertThresholds = AlertThresholds({
            dailyDisbursementLimit: 400000 * 1e18, // 400k LDAO (80% of daily limit)
            monthlyDisbursementLimit: 10000000 * 1e18, // 10M LDAO
            singleDisbursementLimit: 50000 * 1e18, // 50k LDAO (half of max)
            charityCountThreshold: 100, // Alert when >100 charities
            lowFundThreshold: 1000000 * 1e18 // 1M LDAO
        });
    }
    
    /**
     * @notice Record a charity disbursement for monitoring
     * @param charity Address of the charity
     * @param amount Amount disbursed
     * @param description Description of the disbursement
     */
    function recordDisbursement(
        address charity,
        uint256 amount,
        string calldata description
    ) external nonReentrant {
        require(msg.sender == address(treasury), "Only treasury can call");
        
        uint256 currentDate = block.timestamp / 1 days;
        
        // Update daily metrics
        if (dailyMetrics[currentDate].date == 0) {
            dailyMetrics[currentDate].date = currentDate;
        }
        
        dailyMetrics[currentDate].totalDisbursed += amount;
        dailyMetrics[currentDate].disbursementCount++;
        dailyMetrics[currentDate].charityDisbursements[charity] += amount;
        
        // Update charity metrics
        _updateCharityMetrics(charity, amount);
        
        // Check alert conditions
        _checkAlertConditions(charity, amount, currentDate);
        
        emit DailyMetricsUpdated(
            currentDate,
            dailyMetrics[currentDate].totalDisbursed,
            dailyMetrics[currentDate].disbursementCount,
            _getActiveCharityCount()
        );
    }
    
    /**
     * @notice Record charity verification
     * @param charity Address of the charity
     * @param name Name of the charity
     * @param verified Whether verified or unverified
     */
    function recordCharityVerification(
        address charity,
        string calldata name,
        bool verified
    ) external nonReentrant {
        require(msg.sender == address(treasury), "Only treasury can call");
        
        if (verified && charityMetrics[charity].charityAddress == address(0)) {
            // New charity
            charityMetrics[charity] = CharityMetrics({
                charityAddress: charity,
                name: name,
                totalReceived: 0,
                lastDisbursement: 0,
                disbursementCount: 0,
                averageDisbursement: 0,
                isActive: true,
                verificationDate: block.timestamp,
                riskScore: 50 // Default risk score
            });
            
            charityAddresses.push(charity);
            
            uint256 currentDate = block.timestamp / 1 days;
            dailyMetrics[currentDate].newCharities++;
            
            // Alert if too many charities
            if (charityAddresses.length > alertThresholds.charityCountThreshold) {
                _createAlert(
                    "CHARITY_COUNT_HIGH",
                    charity,
                    0,
                    `Charity count (${charityAddresses.length}) exceeds threshold`
                );
            }
        } else {
            // Update existing charity
            charityMetrics[charity].isActive = verified;
            if (verified) {
                charityMetrics[charity].verificationDate = block.timestamp;
            }
        }
    }
    
    /**
     * @notice Update alert thresholds
     * @param thresholds New alert thresholds
     */
    function updateAlertThresholds(AlertThresholds calldata thresholds) external onlyOwner {
        alertThresholds = thresholds;
    }
    
    /**
     * @notice Acknowledge an alert
     * @param alertId ID of the alert
     * @param resolution Resolution description
     */
    function acknowledgeAlert(uint256 alertId, string calldata resolution) external onlyOwner {
        require(alerts[alertId].id != 0, "Alert does not exist");
        require(!alerts[alertId].acknowledged, "Already acknowledged");
        
        alerts[alertId].acknowledged = true;
        alerts[alertId].resolution = resolution;
        
        // Remove from active alerts
        _removeFromActiveAlerts(alertId);
        
        emit AlertAcknowledged(alertId, msg.sender, resolution);
    }
    
    /**
     * @notice Get active alerts
     * @return Array of active alert IDs
     */
    function getActiveAlerts() external view returns (uint256[] memory) {
        return activeAlerts;
    }
    
    /**
     * @notice Get charity risk score
     * @param charity Address of the charity
     * @return Risk score (0-100)
     */
    function getCharityRiskScore(address charity) external view returns (uint256) {
        return charityMetrics[charity].riskScore;
    }
    
    /**
     * @notice Get monthly disbursement total
     * @param month Unix timestamp (days since epoch) for month start
     * @return Total disbursements for the month
     */
    function getMonthlyDisbursements(uint256 month) external view returns (uint256) {
        uint256 total = 0;
        uint256 monthEnd = month + 30 days;
        
        for (uint256 i = month; i < monthEnd; i += 1 days) {
            total += dailyMetrics[i].totalDisbursed;
        }
        
        return total;
    }
    
    /**
     * @notice Get charity summary statistics
     * @param charity Address of the charity
     * @return Summary statistics
     */
    function getCharitySummary(address charity) external view returns (
        uint256 totalReceived,
        uint256 disbursementCount,
        uint256 averageDisbursement,
        uint256 lastDisbursement,
        uint256 riskScore,
        bool isActive,
        uint256 verificationDate
    ) {
        CharityMetrics storage metrics = charityMetrics[charity];
        return (
            metrics.totalReceived,
            metrics.disbursementCount,
            metrics.averageDisbursement,
            metrics.lastDisbursement,
            metrics.riskScore,
            metrics.isActive,
            metrics.verificationDate
        );
    }
    
    // Internal functions
    
    function _updateCharityMetrics(address charity, uint256 amount) internal {
        CharityMetrics storage metrics = charityMetrics[charity];
        
        metrics.totalReceived += amount;
        metrics.lastDisbursement = block.timestamp;
        metrics.disbursementCount++;
        
        // Calculate average
        if (metrics.disbursementCount > 0) {
            metrics.averageDisbursement = metrics.totalReceived / metrics.disbursementCount;
        }
        
        // Update risk score based on patterns
        _updateRiskScore(charity);
    }
    
    function _updateRiskScore(address charity) internal {
        CharityMetrics storage metrics = charityMetrics[charity];
        uint256 oldScore = metrics.riskScore;
        uint256 newScore = 50; // Base score
        
        // Factor in disbursement frequency
        uint256 daysSinceVerification = (block.timestamp - metrics.verificationDate) / 1 days;
        if (daysSinceVerification > 0) {
            uint256 frequency = metrics.disbursementCount * 100 / daysSinceVerification;
            if (frequency > 10) newScore += 20; // High frequency increases risk
            if (frequency > 30) newScore += 30; // Very high frequency
        }
        
        // Factor in average disbursement size
        if (metrics.averageDisbursement > 50000 * 1e18) {
            newScore += 15; // Large disbursements increase risk
        }
        
        // Cap at 100
        if (newScore > 100) newScore = 100;
        if (newScore < 0) newScore = 0;
        
        metrics.riskScore = newScore;
        
        if (oldScore != newScore) {
            emit CharityRiskScoreUpdated(charity, oldScore, newScore);
        }
    }
    
    function _checkAlertConditions(address charity, uint256 amount, uint256 date) internal {
        // Check daily limit
        if (dailyMetrics[date].totalDisbursed > alertThresholds.dailyDisbursementLimit) {
            _createAlert(
                "DAILY_LIMIT_EXCEEDED",
                charity,
                amount,
                `Daily disbursement (${dailyMetrics[date].totalDisbursed}) exceeds threshold`
            );
        }
        
        // Check single disbursement limit
        if (amount > alertThresholds.singleDisbursementLimit) {
            _createAlert(
                "LARGE_DISBURSEMENT",
                charity,
                amount,
                `Single disbursement exceeds threshold`
            );
        }
        
        // Check monthly limit
        uint256 monthStart = (date / 30 days) * 30 days;
        uint256 monthlyTotal = getMonthlyDisbursements(monthStart);
        if (monthlyTotal > alertThresholds.monthlyDisbursementLimit) {
            _createAlert(
                "MONTHLY_LIMIT_EXCEEDED",
                charity,
                amount,
                `Monthly disbursement (${monthlyTotal}) exceeds threshold`
            );
        }
        
        // Check fund level
        (,,uint256 availableBalance,,,,) = treasury.getCharityFund();
        if (availableBalance < alertThresholds.lowFundThreshold) {
            _createAlert(
                    "LOW_FUNDS",
                    address(0),
                    availableBalance,
                    "Charity fund balance is low"
                );
        }
    }
    
    function _createAlert(
        string calldata alertType,
        address charity,
        uint256 amount,
        string calldata description
    ) internal {
        uint256 alertId = nextAlertId++;
        
        alerts[alertId] = Alert({
            id: alertId,
            triggeredBy: msg.sender,
            alertType: alertType,
            relatedCharity: charity,
            amount: amount,
            description: description,
            timestamp: block.timestamp,
            acknowledged: false,
            resolution: ""
        });
        
        activeAlerts.push(alertId);
        
        emit AlertTriggered(alertId, alertType, charity, amount, description);
    }
    
    function _removeFromActiveAlerts(uint256 alertId) internal {
        uint256 length = activeAlerts.length;
        for (uint256 i = 0; i < length; i++) {
            if (activeAlerts[i] == alertId) {
                activeAlerts[i] = activeAlerts[length - 1];
                activeAlerts.pop();
                break;
            }
        }
    }
    
    function _getActiveCharityCount() internal view returns (uint256) {
        uint256 count = 0;
        for (uint256 i = 0; i < charityAddresses.length; i++) {
            if (charityMetrics[charityAddresses[i]].isActive) {
                count++;
            }
        }
        return count;
    }
}