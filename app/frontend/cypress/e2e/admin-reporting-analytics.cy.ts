describe('Admin Reporting and Analytics E2E Tests', () => {
  let adminCredentials: { email: string; password: string; token: string };

  before(() => {
    // Setup test admin with reporting permissions
    cy.task('createTestAdmin', {
      email: 'reporting-admin@test.com',
      password: 'TestAdmin123!',
      role: 'super_admin',
      permissions: ['analytics_access', 'report_generation', 'data_export', 'advanced_analytics']
    }).then((admin) => {
      adminCredentials = admin as any;
    });

    // Generate comprehensive test data for analytics
    cy.task('generateAnalyticsTestData', {
      timeRange: '90d',
      users: 1000,
      posts: 5000,
      transactions: 2000,
      moderationActions: 500,
      disputes: 50,
      sellers: 100
    });
  });

  after(() => {
    cy.task('cleanupTestData');
  });

  beforeEach(() => {
    // Login as admin
    cy.visit('/admin/login');
    cy.get('[data-testid="email-input"]').type(adminCredentials.email);
    cy.get('[data-testid="password-input"]').type(adminCredentials.password);
    cy.get('[data-testid="login-button"]').click();
    
    cy.url().should('include', '/admin/dashboard');
  });

  describe('Advanced Analytics Dashboard', () => {
    it('should display comprehensive analytics overview', () => {
      // Navigate to analytics
      cy.get('[data-testid="nav-analytics"]').click();
      cy.url().should('include', '/admin/analytics');

      // Verify main analytics sections
      cy.get('[data-testid="analytics-overview"]').should('be.visible');
      cy.get('[data-testid="user-analytics-section"]').should('be.visible');
      cy.get('[data-testid="content-analytics-section"]').should('be.visible');
      cy.get('[data-testid="business-analytics-section"]').should('be.visible');
      cy.get('[data-testid="system-analytics-section"]').should('be.visible');

      // Check key performance indicators
      cy.get('[data-testid="kpi-total-users"]').should('contain.text', '1,000');
      cy.get('[data-testid="kpi-active-users"]').should('be.visible');
      cy.get('[data-testid="kpi-user-growth"]').should('be.visible');
      cy.get('[data-testid="kpi-engagement-rate"]').should('be.visible');

      // Verify charts are loaded
      cy.get('[data-testid="user-growth-chart"]').should('be.visible');
      cy.get('[data-testid="engagement-trends-chart"]').should('be.visible');
      cy.get('[data-testid="content-volume-chart"]').should('be.visible');
      cy.get('[data-testid="revenue-chart"]').should('be.visible');
    });

    it('should provide interactive chart functionality', () => {
      cy.get('[data-testid="nav-analytics"]').click();

      // Test chart zoom functionality
      cy.get('[data-testid="user-growth-chart"]').within(() => {
        cy.get('canvas').trigger('wheel', { deltaY: -100 }); // Zoom in
      });
      cy.get('[data-testid="chart-zoom-indicator"]').should('be.visible');

      // Test chart pan
      cy.get('[data-testid="user-growth-chart"]').within(() => {
        cy.get('canvas')
          .trigger('mousedown', { clientX: 200, clientY: 150 })
          .trigger('mousemove', { clientX: 250, clientY: 150 })
          .trigger('mouseup');
      });

      // Reset zoom
      cy.get('[data-testid="reset-zoom-button"]').click();
      cy.get('[data-testid="chart-zoom-indicator"]').should('not.exist');

      // Test drill-down functionality
      cy.get('[data-testid="user-growth-chart"]').within(() => {
        cy.get('canvas').click(300, 200);
      });
      cy.get('[data-testid="drill-down-modal"]').should('be.visible');
      cy.get('[data-testid="detailed-breakdown"]').should('be.visible');
      cy.get('[data-testid="close-drill-down"]').click();
    });

    it('should filter analytics by multiple dimensions', () => {
      cy.get('[data-testid="nav-analytics"]').click();

      // Apply time range filter
      cy.get('[data-testid="time-range-filter"]').select('30d');
      cy.get('[data-testid="apply-filters"]').click();
      
      // Verify charts update
      cy.get('[data-testid="user-growth-chart"]').should('have.attr', 'data-time-range', '30d');

      // Apply user segment filter
      cy.get('[data-testid="user-segment-filter"]').click();
      cy.get('[data-testid="segment-new-users"]').check();
      cy.get('[data-testid="segment-returning-users"]').check();
      cy.get('[data-testid="apply-segment-filter"]').click();

      // Apply geographic filter
      cy.get('[data-testid="geographic-filter"]').click();
      cy.get('[data-testid="region-north-america"]').check();
      cy.get('[data-testid="region-europe"]').check();
      cy.get('[data-testid="apply-geographic-filter"]').click();

      // Verify filtered data
      cy.get('[data-testid="active-filters"]').should('contain', '30 days');
      cy.get('[data-testid="active-filters"]').should('contain', 'New Users, Returning Users');
      cy.get('[data-testid="active-filters"]').should('contain', 'North America, Europe');

      // Clear all filters
      cy.get('[data-testid="clear-all-filters"]').click();
      cy.get('[data-testid="active-filters"]').should('not.exist');
    });
  });

  describe('User Journey Analytics', () => {
    it('should visualize user journey flows and conversion funnels', () => {
      cy.get('[data-testid="nav-analytics"]').click();
      
      // Navigate to user journey section
      cy.get('[data-testid="user-journey-tab"]').click();
      cy.get('[data-testid="user-journey-dashboard"]').should('be.visible');

      // Verify journey visualization
      cy.get('[data-testid="journey-flow-diagram"]').should('be.visible');
      cy.get('[data-testid="conversion-funnel"]').should('be.visible');
      cy.get('[data-testid="drop-off-analysis"]').should('be.visible');

      // Interact with journey flow
      cy.get('[data-testid="journey-step"]').first().click();
      cy.get('[data-testid="step-details-panel"]').should('be.visible');
      cy.get('[data-testid="step-metrics"]').should('be.visible');
      cy.get('[data-testid="user-paths"]').should('be.visible');

      // Analyze conversion funnel
      cy.get('[data-testid="funnel-step"]').each(($step, index) => {
        cy.wrap($step).should('contain.text', 'Step ' + (index + 1));
        cy.wrap($step).should('have.attr', 'data-conversion-rate');
      });

      // View drop-off points
      cy.get('[data-testid="high-drop-off-point"]').first().click();
      cy.get('[data-testid="drop-off-analysis-modal"]').should('be.visible');
      cy.get('[data-testid="drop-off-reasons"]').should('be.visible');
      cy.get('[data-testid="improvement-suggestions"]').should('be.visible');
    });

    it('should provide cohort analysis functionality', () => {
      cy.get('[data-testid="nav-analytics"]').click();
      cy.get('[data-testid="cohort-analysis-tab"]').click();

      // Configure cohort analysis
      cy.get('[data-testid="cohort-configuration"]').should('be.visible');
      cy.get('[data-testid="cohort-period"]').select('Weekly');
      cy.get('[data-testid="cohort-metric"]').select('User Retention');
      cy.get('[data-testid="generate-cohort-analysis"]').click();

      // Verify cohort table
      cy.get('[data-testid="cohort-table"]').should('be.visible');
      cy.get('[data-testid="cohort-heatmap"]').should('be.visible');

      // Check cohort data
      cy.get('[data-testid="cohort-row"]').should('have.length.at.least', 8); // 8 weeks of data
      cy.get('[data-testid="retention-cell"]').each(($cell) => {
        cy.wrap($cell).should('have.attr', 'data-retention-rate');
      });

      // View cohort details
      cy.get('[data-testid="cohort-row"]').first().click();
      cy.get('[data-testid="cohort-details-modal"]').should('be.visible');
      cy.get('[data-testid="cohort-user-list"]').should('be.visible');
      cy.get('[data-testid="cohort-behavior-analysis"]').should('be.visible');
    });

    it('should segment users and analyze behavior patterns', () => {
      cy.get('[data-testid="nav-analytics"]').click();
      cy.get('[data-testid="user-segmentation-tab"]').click();

      // Create custom user segment
      cy.get('[data-testid="create-segment-button"]').click();
      cy.get('[data-testid="segment-builder-modal"]').should('be.visible');

      // Define segment criteria
      cy.get('[data-testid="segment-name"]').type('High-Value Users');
      cy.get('[data-testid="add-criteria"]').click();
      cy.get('[data-testid="criteria-field"]').select('Total Spent');
      cy.get('[data-testid="criteria-operator"]').select('Greater than');
      cy.get('[data-testid="criteria-value"]').type('500');

      // Add additional criteria
      cy.get('[data-testid="add-criteria"]').click();
      cy.get('[data-testid="criteria-field"]').last().select('Login Frequency');
      cy.get('[data-testid="criteria-operator"]').last().select('Greater than');
      cy.get('[data-testid="criteria-value"]').last().type('10');

      // Save segment
      cy.get('[data-testid="save-segment"]').click();
      cy.get('[data-testid="segment-created"]').should('be.visible');

      // Analyze segment
      cy.get('[data-testid="segment-list"]').should('contain', 'High-Value Users');
      cy.get('[data-testid="analyze-segment"]').click();
      cy.get('[data-testid="segment-analysis"]').should('be.visible');
      cy.get('[data-testid="segment-size"]').should('be.visible');
      cy.get('[data-testid="segment-behavior-metrics"]').should('be.visible');
    });
  });

  describe('Report Builder and Generation', () => {
    it('should create custom reports with drag-and-drop interface', () => {
      // Navigate to report builder
      cy.get('[data-testid="nav-reports"]').click();
      cy.url().should('include', '/admin/reports');

      // Start new report
      cy.get('[data-testid="create-report-button"]').click();
      cy.get('[data-testid="report-builder"]').should('be.visible');

      // Add report sections
      cy.get('[data-testid="component-library"]').should('be.visible');
      
      // Drag metrics component
      cy.get('[data-testid="metrics-component"]')
        .trigger('dragstart')
        .get('[data-testid="report-canvas"]')
        .trigger('drop');

      // Configure metrics component
      cy.get('[data-testid="metrics-widget"]').click();
      cy.get('[data-testid="component-properties"]').should('be.visible');
      cy.get('[data-testid="select-metrics"]').click();
      cy.get('[data-testid="metric-total-users"]').check();
      cy.get('[data-testid="metric-active-users"]').check();
      cy.get('[data-testid="apply-metrics"]').click();

      // Add chart component
      cy.get('[data-testid="chart-component"]')
        .trigger('dragstart')
        .get('[data-testid="report-canvas"]')
        .trigger('drop');

      // Configure chart
      cy.get('[data-testid="chart-widget"]').click();
      cy.get('[data-testid="chart-type"]').select('Line Chart');
      cy.get('[data-testid="chart-data-source"]').select('User Growth');
      cy.get('[data-testid="chart-time-range"]').select('Last 30 days');
      cy.get('[data-testid="apply-chart-config"]').click();

      // Add table component
      cy.get('[data-testid="table-component"]')
        .trigger('dragstart')
        .get('[data-testid="report-canvas"]')
        .trigger('drop');

      // Configure table
      cy.get('[data-testid="table-widget"]').click();
      cy.get('[data-testid="table-data-source"]').select('Top Content');
      cy.get('[data-testid="table-columns"]').click();
      cy.get('[data-testid="column-title"]').check();
      cy.get('[data-testid="column-views"]').check();
      cy.get('[data-testid="column-engagement"]').check();
      cy.get('[data-testid="apply-table-config"]').click();

      // Save report template
      cy.get('[data-testid="save-report-template"]').click();
      cy.get('[data-testid="template-name"]').type('Monthly Performance Report');
      cy.get('[data-testid="template-description"]').type('Comprehensive monthly analytics report');
      cy.get('[data-testid="save-template"]').click();
      cy.get('[data-testid="template-saved"]').should('be.visible');
    });

    it('should generate and schedule automated reports', () => {
      cy.get('[data-testid="nav-reports"]').click();

      // Navigate to scheduled reports
      cy.get('[data-testid="scheduled-reports-tab"]').click();
      cy.get('[data-testid="schedule-new-report"]').click();

      // Configure report schedule
      cy.get('[data-testid="report-schedule-modal"]').should('be.visible');
      cy.get('[data-testid="select-template"]').select('Monthly Performance Report');
      cy.get('[data-testid="schedule-frequency"]').select('Weekly');
      cy.get('[data-testid="schedule-day"]').select('Monday');
      cy.get('[data-testid="schedule-time"]').type('09:00');

      // Configure recipients
      cy.get('[data-testid="add-recipient"]').click();
      cy.get('[data-testid="recipient-email"]').type('stakeholder@company.com');
      cy.get('[data-testid="recipient-role"]').select('Executive');
      cy.get('[data-testid="add-recipient-confirm"]').click();

      // Set report parameters
      cy.get('[data-testid="report-parameters"]').click();
      cy.get('[data-testid="parameter-time-range"]').select('Previous week');
      cy.get('[data-testid="parameter-format"]').select('PDF');
      cy.get('[data-testid="include-executive-summary"]').check();

      // Save schedule
      cy.get('[data-testid="save-schedule"]').click();
      cy.get('[data-testid="schedule-created"]').should('be.visible');

      // Verify scheduled report appears in list
      cy.get('[data-testid="scheduled-reports-list"]')
        .should('contain', 'Monthly Performance Report');
      cy.get('[data-testid="schedule-status"]').should('contain', 'Active');
    });

    it('should export reports in multiple formats', () => {
      cy.get('[data-testid="nav-reports"]').click();

      // Generate report for export
      cy.get('[data-testid="report-templates"]').should('be.visible');
      cy.get('[data-testid="template-item"]').first().within(() => {
        cy.get('[data-testid="generate-report"]').click();
      });

      // Wait for report generation
      cy.get('[data-testid="report-generation-progress"]').should('be.visible');
      cy.get('[data-testid="report-ready"]', { timeout: 15000 }).should('be.visible');

      // Test PDF export
      cy.get('[data-testid="export-dropdown"]').click();
      cy.get('[data-testid="export-pdf"]').click();
      cy.get('[data-testid="pdf-options-modal"]').should('be.visible');
      cy.get('[data-testid="include-cover-page"]').check();
      cy.get('[data-testid="include-appendix"]').check();
      cy.get('[data-testid="generate-pdf"]').click();
      cy.get('[data-testid="pdf-download-ready"]', { timeout: 10000 }).should('be.visible');

      // Test Excel export
      cy.get('[data-testid="export-dropdown"]').click();
      cy.get('[data-testid="export-excel"]').click();
      cy.get('[data-testid="excel-options-modal"]').should('be.visible');
      cy.get('[data-testid="include-raw-data"]').check();
      cy.get('[data-testid="include-charts"]').check();
      cy.get('[data-testid="generate-excel"]').click();
      cy.get('[data-testid="excel-download-ready"]', { timeout: 10000 }).should('be.visible');

      // Test CSV export
      cy.get('[data-testid="export-dropdown"]').click();
      cy.get('[data-testid="export-csv"]').click();
      cy.get('[data-testid="csv-options-modal"]').should('be.visible');
      cy.get('[data-testid="select-datasets"]').click();
      cy.get('[data-testid="dataset-users"]').check();
      cy.get('[data-testid="dataset-content"]').check();
      cy.get('[data-testid="generate-csv"]').click();
      cy.get('[data-testid="csv-download-ready"]', { timeout: 5000 }).should('be.visible');
    });
  });

  describe('Advanced Data Analysis', () => {
    it('should perform statistical analysis and trend detection', () => {
      cy.get('[data-testid="nav-analytics"]').click();
      
      // Navigate to advanced analysis
      cy.get('[data-testid="advanced-analysis-tab"]').click();
      cy.get('[data-testid="statistical-analysis"]').should('be.visible');

      // Run correlation analysis
      cy.get('[data-testid="correlation-analysis"]').click();
      cy.get('[data-testid="select-variables"]').click();
      cy.get('[data-testid="variable-user-engagement"]').check();
      cy.get('[data-testid="variable-content-quality"]').check();
      cy.get('[data-testid="variable-session-duration"]').check();
      cy.get('[data-testid="run-correlation"]').click();

      // View correlation results
      cy.get('[data-testid="correlation-matrix"]').should('be.visible');
      cy.get('[data-testid="correlation-heatmap"]').should('be.visible');
      cy.get('[data-testid="significant-correlations"]').should('be.visible');

      // Run trend analysis
      cy.get('[data-testid="trend-analysis"]').click();
      cy.get('[data-testid="select-metric"]').select('User Growth Rate');
      cy.get('[data-testid="analysis-period"]').select('Last 90 days');
      cy.get('[data-testid="detect-trends"]').click();

      // View trend results
      cy.get('[data-testid="trend-chart"]').should('be.visible');
      cy.get('[data-testid="trend-summary"]').should('be.visible');
      cy.get('[data-testid="seasonal-patterns"]').should('be.visible');
      cy.get('[data-testid="trend-forecast"]').should('be.visible');
    });

    it('should provide predictive analytics and forecasting', () => {
      cy.get('[data-testid="nav-analytics"]').click();
      cy.get('[data-testid="predictive-analytics-tab"]').click();

      // Configure prediction model
      cy.get('[data-testid="prediction-setup"]').should('be.visible');
      cy.get('[data-testid="prediction-target"]').select('User Growth');
      cy.get('[data-testid="prediction-horizon"]').select('30 days');
      cy.get('[data-testid="include-seasonality"]').check();
      cy.get('[data-testid="include-external-factors"]').check();

      // Run prediction
      cy.get('[data-testid="generate-prediction"]').click();
      cy.get('[data-testid="prediction-progress"]').should('be.visible');
      cy.get('[data-testid="prediction-complete"]', { timeout: 20000 }).should('be.visible');

      // View prediction results
      cy.get('[data-testid="prediction-chart"]').should('be.visible');
      cy.get('[data-testid="confidence-intervals"]').should('be.visible');
      cy.get('[data-testid="prediction-accuracy"]').should('be.visible');
      cy.get('[data-testid="key-drivers"]').should('be.visible');

      // Test scenario analysis
      cy.get('[data-testid="scenario-analysis"]').click();
      cy.get('[data-testid="scenario-name"]').type('Increased Marketing');
      cy.get('[data-testid="scenario-factor"]').select('Marketing Spend');
      cy.get('[data-testid="scenario-change"]').type('25');
      cy.get('[data-testid="run-scenario"]').click();

      cy.get('[data-testid="scenario-results"]').should('be.visible');
      cy.get('[data-testid="scenario-impact"]').should('be.visible');
    });

    it('should detect anomalies and provide alerts', () => {
      cy.get('[data-testid="nav-analytics"]').click();
      cy.get('[data-testid="anomaly-detection-tab"]').click();

      // Configure anomaly detection
      cy.get('[data-testid="anomaly-setup"]').should('be.visible');
      cy.get('[data-testid="monitored-metrics"]').click();
      cy.get('[data-testid="metric-user-signups"]').check();
      cy.get('[data-testid="metric-engagement-rate"]').check();
      cy.get('[data-testid="metric-error-rate"]').check();
      cy.get('[data-testid="apply-metrics"]').click();

      // Set sensitivity levels
      cy.get('[data-testid="sensitivity-level"]').select('Medium');
      cy.get('[data-testid="alert-threshold"]').type('2'); // 2 standard deviations

      // Enable real-time monitoring
      cy.get('[data-testid="enable-real-time"]').check();
      cy.get('[data-testid="save-anomaly-config"]').click();

      // View detected anomalies
      cy.get('[data-testid="anomaly-list"]').should('be.visible');
      cy.get('[data-testid="anomaly-item"]').should('have.length.at.least', 1);

      // Investigate anomaly
      cy.get('[data-testid="anomaly-item"]').first().click();
      cy.get('[data-testid="anomaly-details-modal"]').should('be.visible');
      cy.get('[data-testid="anomaly-timeline"]').should('be.visible');
      cy.get('[data-testid="potential-causes"]').should('be.visible');
      cy.get('[data-testid="impact-assessment"]').should('be.visible');

      // Mark anomaly as investigated
      cy.get('[data-testid="mark-investigated"]').click();
      cy.get('[data-testid="investigation-notes"]').type('Anomaly caused by marketing campaign launch');
      cy.get('[data-testid="save-investigation"]').click();
    });
  });

  describe('Performance Monitoring and Optimization', () => {
    it('should monitor report generation performance', () => {
      cy.get('[data-testid="nav-reports"]').click();
      cy.get('[data-testid="performance-monitoring-tab"]').click();

      // View report performance metrics
      cy.get('[data-testid="performance-dashboard"]').should('be.visible');
      cy.get('[data-testid="generation-time-chart"]').should('be.visible');
      cy.get('[data-testid="resource-usage-chart"]').should('be.visible');
      cy.get('[data-testid="error-rate-metric"]').should('be.visible');

      // Check slow reports
      cy.get('[data-testid="slow-reports-list"]').should('be.visible');
      cy.get('[data-testid="optimization-suggestions"]').should('be.visible');

      // View detailed performance analysis
      cy.get('[data-testid="slow-report-item"]').first().click();
      cy.get('[data-testid="performance-analysis-modal"]').should('be.visible');
      cy.get('[data-testid="execution-breakdown"]').should('be.visible');
      cy.get('[data-testid="bottleneck-analysis"]').should('be.visible');
      cy.get('[data-testid="optimization-recommendations"]').should('be.visible');
    });

    it('should handle large dataset analytics efficiently', () => {
      // Generate large dataset
      cy.task('generateLargeAnalyticsDataset', {
        users: 100000,
        events: 1000000,
        timeRange: '1y'
      });

      cy.get('[data-testid="nav-analytics"]').click();

      // Test performance with large dataset
      const startTime = Date.now();
      cy.get('[data-testid="large-dataset-analysis"]').click();
      cy.get('[data-testid="dataset-size-warning"]').should('be.visible');
      cy.get('[data-testid="proceed-with-analysis"]').click();

      // Verify progressive loading
      cy.get('[data-testid="progressive-loading"]').should('be.visible');
      cy.get('[data-testid="data-sampling-indicator"]').should('be.visible');

      // Check that analysis completes within reasonable time
      cy.get('[data-testid="analysis-complete"]', { timeout: 30000 }).should('be.visible');
      
      cy.then(() => {
        const loadTime = Date.now() - startTime;
        expect(loadTime).to.be.lessThan(30000); // Should complete within 30 seconds
      });

      // Verify data quality indicators
      cy.get('[data-testid="data-quality-score"]').should('be.visible');
      cy.get('[data-testid="sampling-accuracy"]').should('be.visible');
    });

    it('should provide caching and optimization features', () => {
      cy.get('[data-testid="nav-analytics"]').click();
      cy.get('[data-testid="optimization-settings"]').click();

      // Configure caching
      cy.get('[data-testid="cache-settings"]').should('be.visible');
      cy.get('[data-testid="enable-query-cache"]').check();
      cy.get('[data-testid="cache-duration"]').select('1 hour');
      cy.get('[data-testid="enable-result-cache"]').check();

      // Configure data sampling
      cy.get('[data-testid="sampling-settings"]').should('be.visible');
      cy.get('[data-testid="enable-smart-sampling"]').check();
      cy.get('[data-testid="sampling-threshold"]').type('10000');
      cy.get('[data-testid="sampling-accuracy"]').select('95%');

      // Save optimization settings
      cy.get('[data-testid="save-optimization-settings"]').click();
      cy.get('[data-testid="settings-saved"]').should('be.visible');

      // Test cache effectiveness
      cy.get('[data-testid="run-cached-query"]').click();
      cy.get('[data-testid="cache-hit-indicator"]').should('be.visible');
      cy.get('[data-testid="query-time"]').should('contain', 'ms'); // Should be very fast
    });
  });

  describe('Data Privacy and Compliance', () => {
    it('should handle data anonymization and privacy controls', () => {
      cy.get('[data-testid="nav-analytics"]').click();
      cy.get('[data-testid="privacy-controls-tab"]').click();

      // Configure data anonymization
      cy.get('[data-testid="anonymization-settings"]').should('be.visible');
      cy.get('[data-testid="enable-pii-anonymization"]').check();
      cy.get('[data-testid="anonymization-level"]').select('High');

      // Set data retention policies
      cy.get('[data-testid="retention-settings"]').should('be.visible');
      cy.get('[data-testid="analytics-data-retention"]').select('2 years');
      cy.get('[data-testid="personal-data-retention"]').select('1 year');

      // Configure access controls
      cy.get('[data-testid="access-controls"]').should('be.visible');
      cy.get('[data-testid="require-justification"]').check();
      cy.get('[data-testid="audit-data-access"]').check();

      // Save privacy settings
      cy.get('[data-testid="save-privacy-settings"]').click();
      cy.get('[data-testid="privacy-settings-saved"]').should('be.visible');

      // Test data access with justification
      cy.get('[data-testid="access-sensitive-data"]').click();
      cy.get('[data-testid="access-justification-modal"]').should('be.visible');
      cy.get('[data-testid="justification-reason"]').select('Compliance audit');
      cy.get('[data-testid="justification-details"]').type('Required for quarterly compliance review');
      cy.get('[data-testid="submit-justification"]').click();

      cy.get('[data-testid="access-granted"]').should('be.visible');
      cy.get('[data-testid="access-logged"]').should('be.visible');
    });

    it('should generate compliance reports', () => {
      cy.get('[data-testid="nav-reports"]').click();
      cy.get('[data-testid="compliance-reports-tab"]').click();

      // Generate GDPR compliance report
      cy.get('[data-testid="gdpr-report"]').click();
      cy.get('[data-testid="gdpr-report-config"]').should('be.visible');
      cy.get('[data-testid="report-period"]').select('Last quarter');
      cy.get('[data-testid="include-data-processing"]').check();
      cy.get('[data-testid="include-user-requests"]').check();
      cy.get('[data-testid="generate-gdpr-report"]').click();

      // Wait for report generation
      cy.get('[data-testid="compliance-report-progress"]').should('be.visible');
      cy.get('[data-testid="gdpr-report-ready"]', { timeout: 15000 }).should('be.visible');

      // Verify report contents
      cy.get('[data-testid="view-report"]').click();
      cy.get('[data-testid="compliance-summary"]').should('be.visible');
      cy.get('[data-testid="data-processing-activities"]').should('be.visible');
      cy.get('[data-testid="user-rights-requests"]').should('be.visible');
      cy.get('[data-testid="breach-incidents"]').should('be.visible');

      // Export compliance report
      cy.get('[data-testid="export-compliance-report"]').click();
      cy.get('[data-testid="compliance-export-complete"]').should('be.visible');
    });
  });
});