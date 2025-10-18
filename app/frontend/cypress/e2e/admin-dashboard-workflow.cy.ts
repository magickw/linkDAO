describe('Admin Dashboard Workflow E2E Tests', () => {
  let adminCredentials: { email: string; password: string; token: string };

  before(() => {
    // Setup test admin account
    cy.task('createTestAdmin', {
      email: 'e2e-admin@test.com',
      password: 'TestAdmin123!',
      role: 'super_admin',
      permissions: ['dashboard_access', 'analytics_view', 'system_monitoring', 'user_management']
    }).then((admin) => {
      adminCredentials = admin as any;
    });

    // Setup test data
    cy.task('seedTestData', {
      users: 50,
      posts: 200,
      moderationItems: 10,
      sellers: 15,
      disputes: 5
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
    
    // Wait for dashboard to load
    cy.url().should('include', '/admin/dashboard');
    cy.get('[data-testid="admin-dashboard"]').should('be.visible');
  });

  describe('Dashboard Overview and Navigation', () => {
    it('should display real-time metrics on dashboard load', () => {
      // Verify main metrics are displayed
      cy.get('[data-testid="real-time-users-metric"]').should('be.visible');
      cy.get('[data-testid="system-health-indicator"]').should('be.visible');
      cy.get('[data-testid="moderation-queue-count"]').should('be.visible');
      cy.get('[data-testid="seller-metrics-summary"]').should('be.visible');
      cy.get('[data-testid="dispute-stats-summary"]').should('be.visible');

      // Verify metrics have actual values
      cy.get('[data-testid="real-time-users-metric"]').should('not.contain', '0');
      cy.get('[data-testid="moderation-queue-count"]').should('contain.text', '10');
    });

    it('should update metrics in real-time', () => {
      // Get initial user count
      cy.get('[data-testid="real-time-users-metric"]')
        .invoke('text')
        .then((initialCount) => {
          // Simulate user activity in background
          cy.task('simulateUserActivity', { userCount: 5 });
          
          // Wait for WebSocket update
          cy.wait(2000);
          
          // Verify count increased
          cy.get('[data-testid="real-time-users-metric"]')
            .should('not.contain', initialCount);
        });
    });

    it('should navigate between admin sections', () => {
      // Test navigation to analytics
      cy.get('[data-testid="nav-analytics"]').click();
      cy.url().should('include', '/admin/analytics');
      cy.get('[data-testid="analytics-dashboard"]').should('be.visible');

      // Test navigation to user management
      cy.get('[data-testid="nav-users"]').click();
      cy.url().should('include', '/admin/users');
      cy.get('[data-testid="user-management-table"]').should('be.visible');

      // Test navigation to moderation
      cy.get('[data-testid="nav-moderation"]').click();
      cy.url().should('include', '/admin/moderation');
      cy.get('[data-testid="moderation-queue"]').should('be.visible');

      // Return to dashboard
      cy.get('[data-testid="nav-dashboard"]').click();
      cy.url().should('include', '/admin/dashboard');
    });
  });

  describe('Interactive Dashboard Customization', () => {
    it('should allow dashboard layout customization', () => {
      // Enter edit mode
      cy.get('[data-testid="customize-dashboard-button"]').click();
      cy.get('[data-testid="dashboard-edit-mode"]').should('be.visible');

      // Drag and drop widget
      cy.get('[data-testid="metrics-widget"]')
        .trigger('mousedown', { which: 1 })
        .trigger('mousemove', { clientX: 300, clientY: 200 })
        .trigger('mouseup');

      // Resize widget
      cy.get('[data-testid="metrics-widget"] [data-testid="resize-handle"]')
        .trigger('mousedown', { which: 1 })
        .trigger('mousemove', { clientX: 400, clientY: 300 })
        .trigger('mouseup');

      // Save layout
      cy.get('[data-testid="save-layout-button"]').click();
      cy.get('[data-testid="layout-saved-notification"]').should('be.visible');

      // Verify layout persists after refresh
      cy.reload();
      cy.get('[data-testid="metrics-widget"]').should('have.attr', 'data-position');
    });

    it('should add and remove dashboard widgets', () => {
      // Open widget selector
      cy.get('[data-testid="add-widget-button"]').click();
      cy.get('[data-testid="widget-selector-modal"]').should('be.visible');

      // Add new widget
      cy.get('[data-testid="widget-option-ai-insights"]').click();
      cy.get('[data-testid="add-selected-widgets-button"]').click();

      // Verify widget was added
      cy.get('[data-testid="ai-insights-widget"]').should('be.visible');

      // Remove widget
      cy.get('[data-testid="ai-insights-widget"] [data-testid="remove-widget-button"]').click();
      cy.get('[data-testid="confirm-remove-widget"]').click();
      cy.get('[data-testid="ai-insights-widget"]').should('not.exist');
    });
  });

  describe('Analytics and Visualization Interaction', () => {
    it('should display interactive charts with drill-down capability', () => {
      cy.get('[data-testid="nav-analytics"]').click();

      // Verify charts are loaded
      cy.get('[data-testid="user-growth-chart"]').should('be.visible');
      cy.get('[data-testid="content-metrics-chart"]').should('be.visible');
      cy.get('[data-testid="engagement-chart"]').should('be.visible');

      // Test chart interaction - click on data point
      cy.get('[data-testid="user-growth-chart"] canvas')
        .click(200, 150);

      // Verify drill-down modal opens
      cy.get('[data-testid="chart-drill-down-modal"]').should('be.visible');
      cy.get('[data-testid="detailed-metrics-table"]').should('be.visible');

      // Close modal
      cy.get('[data-testid="close-drill-down-modal"]').click();
      cy.get('[data-testid="chart-drill-down-modal"]').should('not.exist');
    });

    it('should filter analytics by time range', () => {
      cy.get('[data-testid="nav-analytics"]').click();

      // Change time range
      cy.get('[data-testid="time-range-selector"]').select('7d');
      
      // Verify charts update
      cy.get('[data-testid="user-growth-chart"]').should('have.attr', 'data-time-range', '7d');
      
      // Test custom date range
      cy.get('[data-testid="time-range-selector"]').select('custom');
      cy.get('[data-testid="start-date-picker"]').type('2024-01-01');
      cy.get('[data-testid="end-date-picker"]').type('2024-01-31');
      cy.get('[data-testid="apply-date-range"]').click();

      // Verify custom range is applied
      cy.get('[data-testid="date-range-display"]').should('contain', '2024-01-01 to 2024-01-31');
    });

    it('should export analytics data', () => {
      cy.get('[data-testid="nav-analytics"]').click();

      // Test PDF export
      cy.get('[data-testid="export-dropdown"]').click();
      cy.get('[data-testid="export-pdf"]').click();
      
      // Verify download initiated
      cy.get('[data-testid="export-progress"]').should('be.visible');
      cy.get('[data-testid="export-complete-notification"]', { timeout: 10000 })
        .should('be.visible');

      // Test Excel export
      cy.get('[data-testid="export-dropdown"]').click();
      cy.get('[data-testid="export-excel"]').click();
      cy.get('[data-testid="export-complete-notification"]', { timeout: 10000 })
        .should('be.visible');
    });
  });

  describe('AI Insights and Alerts Workflow', () => {
    it('should display AI-generated insights', () => {
      // Navigate to AI insights section
      cy.get('[data-testid="nav-ai-insights"]').click();
      cy.url().should('include', '/admin/ai-insights');

      // Verify insights are displayed
      cy.get('[data-testid="ai-insights-list"]').should('be.visible');
      cy.get('[data-testid="insight-card"]').should('have.length.at.least', 1);

      // Check insight details
      cy.get('[data-testid="insight-card"]').first().within(() => {
        cy.get('[data-testid="insight-title"]').should('be.visible');
        cy.get('[data-testid="insight-confidence"]').should('be.visible');
        cy.get('[data-testid="insight-severity"]').should('be.visible');
        cy.get('[data-testid="insight-recommendations"]').should('be.visible');
      });
    });

    it('should handle real-time alerts', () => {
      // Simulate critical alert
      cy.task('triggerCriticalAlert', {
        type: 'system_overload',
        severity: 'critical',
        message: 'CPU usage exceeds 95%'
      });

      // Verify alert notification appears
      cy.get('[data-testid="alert-notification"]', { timeout: 5000 })
        .should('be.visible')
        .and('contain', 'CPU usage exceeds 95%');

      // Click on alert to view details
      cy.get('[data-testid="alert-notification"]').click();
      cy.get('[data-testid="alert-details-modal"]').should('be.visible');

      // Acknowledge alert
      cy.get('[data-testid="acknowledge-alert-button"]').click();
      cy.get('[data-testid="alert-acknowledged-message"]').should('be.visible');

      // Close alert modal
      cy.get('[data-testid="close-alert-modal"]').click();
      cy.get('[data-testid="alert-details-modal"]').should('not.exist');
    });

    it('should generate new AI insights on demand', () => {
      cy.get('[data-testid="nav-ai-insights"]').click();

      // Trigger new analysis
      cy.get('[data-testid="generate-insights-button"]').click();
      cy.get('[data-testid="analysis-options-modal"]').should('be.visible');

      // Select analysis type
      cy.get('[data-testid="analysis-type-predictive"]').check();
      cy.get('[data-testid="time-range-7d"]').check();
      cy.get('[data-testid="metrics-user-growth"]').check();
      cy.get('[data-testid="metrics-content-volume"]').check();

      // Start analysis
      cy.get('[data-testid="start-analysis-button"]').click();

      // Verify analysis is running
      cy.get('[data-testid="analysis-progress"]').should('be.visible');
      cy.get('[data-testid="analysis-status"]').should('contain', 'Processing');

      // Wait for completion
      cy.get('[data-testid="analysis-complete"]', { timeout: 30000 })
        .should('be.visible');

      // Verify new insights are displayed
      cy.get('[data-testid="new-insights-notification"]').should('be.visible');
      cy.get('[data-testid="insight-card"]').should('have.length.at.least', 1);
    });
  });

  describe('System Health Monitoring Workflow', () => {
    it('should display comprehensive system health status', () => {
      // Navigate to system health
      cy.get('[data-testid="nav-system-health"]').click();
      cy.url().should('include', '/admin/system-health');

      // Verify health overview
      cy.get('[data-testid="system-health-overview"]').should('be.visible');
      cy.get('[data-testid="overall-health-status"]').should('be.visible');

      // Check component health
      cy.get('[data-testid="component-health-list"]').should('be.visible');
      cy.get('[data-testid="component-item"]').should('have.length.at.least', 3);

      // Verify each component shows status
      cy.get('[data-testid="component-item"]').each(($component) => {
        cy.wrap($component).within(() => {
          cy.get('[data-testid="component-name"]').should('be.visible');
          cy.get('[data-testid="component-status"]').should('be.visible');
          cy.get('[data-testid="component-response-time"]').should('be.visible');
        });
      });
    });

    it('should show performance metrics and trends', () => {
      cy.get('[data-testid="nav-system-health"]').click();

      // Check performance metrics section
      cy.get('[data-testid="performance-metrics"]').should('be.visible');
      cy.get('[data-testid="cpu-usage-chart"]').should('be.visible');
      cy.get('[data-testid="memory-usage-chart"]').should('be.visible');
      cy.get('[data-testid="response-time-chart"]').should('be.visible');

      // Test metric time range selection
      cy.get('[data-testid="metrics-time-range"]').select('1h');
      cy.get('[data-testid="cpu-usage-chart"]').should('have.attr', 'data-time-range', '1h');

      // Test metric refresh
      cy.get('[data-testid="refresh-metrics-button"]').click();
      cy.get('[data-testid="metrics-refreshing"]').should('be.visible');
      cy.get('[data-testid="metrics-updated"]', { timeout: 5000 }).should('be.visible');
    });

    it('should handle capacity planning recommendations', () => {
      cy.get('[data-testid="nav-system-health"]').click();

      // Navigate to capacity planning
      cy.get('[data-testid="capacity-planning-tab"]').click();
      cy.get('[data-testid="capacity-planning-dashboard"]').should('be.visible');

      // Verify capacity forecasts
      cy.get('[data-testid="capacity-forecast-chart"]').should('be.visible');
      cy.get('[data-testid="resource-utilization-trends"]').should('be.visible');

      // Check recommendations
      cy.get('[data-testid="scaling-recommendations"]').should('be.visible');
      cy.get('[data-testid="recommendation-item"]').should('have.length.at.least', 1);

      // View recommendation details
      cy.get('[data-testid="recommendation-item"]').first().click();
      cy.get('[data-testid="recommendation-details-modal"]').should('be.visible');
      cy.get('[data-testid="recommendation-description"]').should('be.visible');
      cy.get('[data-testid="estimated-cost"]').should('be.visible');
      cy.get('[data-testid="implementation-timeline"]').should('be.visible');

      // Close recommendation details
      cy.get('[data-testid="close-recommendation-modal"]').click();
    });
  });

  describe('Mobile Admin Interface', () => {
    it('should provide mobile-optimized admin experience', () => {
      // Set mobile viewport
      cy.viewport('iphone-x');

      // Verify mobile navigation
      cy.get('[data-testid="mobile-nav-toggle"]').should('be.visible');
      cy.get('[data-testid="mobile-nav-toggle"]').click();
      cy.get('[data-testid="mobile-nav-menu"]').should('be.visible');

      // Test mobile dashboard
      cy.get('[data-testid="mobile-nav-dashboard"]').click();
      cy.get('[data-testid="mobile-dashboard-grid"]').should('be.visible');

      // Verify mobile-optimized widgets
      cy.get('[data-testid="mobile-metric-card"]').should('have.length.at.least', 4);
      cy.get('[data-testid="mobile-metric-card"]').each(($card) => {
        cy.wrap($card).should('be.visible');
      });

      // Test swipe gestures on mobile moderation
      cy.get('[data-testid="mobile-nav-toggle"]').click();
      cy.get('[data-testid="mobile-nav-moderation"]').click();
      
      // Swipe to approve/reject content
      cy.get('[data-testid="mobile-moderation-card"]').first()
        .trigger('touchstart', { touches: [{ clientX: 100, clientY: 200 }] })
        .trigger('touchmove', { touches: [{ clientX: 300, clientY: 200 }] })
        .trigger('touchend');

      // Verify swipe action
      cy.get('[data-testid="swipe-action-confirm"]').should('be.visible');
    });

    it('should handle mobile push notifications', () => {
      cy.viewport('iphone-x');

      // Enable push notifications
      cy.get('[data-testid="mobile-nav-toggle"]').click();
      cy.get('[data-testid="mobile-nav-settings"]').click();
      cy.get('[data-testid="push-notifications-toggle"]').click();

      // Simulate critical alert
      cy.task('triggerMobileCriticalAlert', {
        type: 'security_breach',
        severity: 'critical'
      });

      // Verify push notification appears
      cy.get('[data-testid="mobile-push-notification"]', { timeout: 5000 })
        .should('be.visible');

      // Test quick actions in notification
      cy.get('[data-testid="notification-quick-action"]').click();
      cy.get('[data-testid="quick-action-modal"]').should('be.visible');
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle network connectivity issues gracefully', () => {
      // Simulate network failure
      cy.intercept('GET', '/api/admin/dashboard/metrics', { forceNetworkError: true });

      // Refresh dashboard
      cy.reload();

      // Verify error state is displayed
      cy.get('[data-testid="network-error-message"]').should('be.visible');
      cy.get('[data-testid="retry-connection-button"]').should('be.visible');

      // Restore network and retry
      cy.intercept('GET', '/api/admin/dashboard/metrics').as('metricsRequest');
      cy.get('[data-testid="retry-connection-button"]').click();

      // Verify recovery
      cy.wait('@metricsRequest');
      cy.get('[data-testid="admin-dashboard"]').should('be.visible');
      cy.get('[data-testid="network-error-message"]').should('not.exist');
    });

    it('should handle API errors with appropriate fallbacks', () => {
      // Simulate API error
      cy.intercept('GET', '/api/admin/ai-insights', { statusCode: 500 });

      cy.get('[data-testid="nav-ai-insights"]').click();

      // Verify error handling
      cy.get('[data-testid="api-error-message"]').should('be.visible');
      cy.get('[data-testid="fallback-recommendations"]').should('be.visible');

      // Test error recovery
      cy.intercept('GET', '/api/admin/ai-insights').as('insightsRequest');
      cy.get('[data-testid="retry-api-request"]').click();
      cy.wait('@insightsRequest');
      cy.get('[data-testid="ai-insights-list"]').should('be.visible');
    });

    it('should maintain session during extended use', () => {
      // Simulate extended session
      cy.task('extendSession', { duration: '2h' });

      // Perform actions after extended time
      cy.get('[data-testid="nav-analytics"]').click();
      cy.get('[data-testid="analytics-dashboard"]').should('be.visible');

      // Verify session is still valid
      cy.get('[data-testid="user-menu"]').click();
      cy.get('[data-testid="session-status"]').should('contain', 'Active');
    });
  });

  describe('Performance and Responsiveness', () => {
    it('should load dashboard within acceptable time limits', () => {
      const startTime = Date.now();

      cy.visit('/admin/dashboard');
      cy.get('[data-testid="admin-dashboard"]').should('be.visible');

      cy.then(() => {
        const loadTime = Date.now() - startTime;
        expect(loadTime).to.be.lessThan(3000); // Should load within 3 seconds
      });
    });

    it('should handle large datasets efficiently', () => {
      // Load large dataset
      cy.task('createLargeDataset', { 
        users: 10000, 
        posts: 50000, 
        transactions: 25000 
      });

      // Navigate to analytics with large dataset
      cy.get('[data-testid="nav-analytics"]').click();
      
      // Verify charts load without performance issues
      cy.get('[data-testid="user-growth-chart"]', { timeout: 10000 }).should('be.visible');
      cy.get('[data-testid="content-metrics-chart"]').should('be.visible');

      // Test pagination and virtual scrolling
      cy.get('[data-testid="data-table"]').should('be.visible');
      cy.get('[data-testid="virtual-scroll-container"]').should('be.visible');

      // Verify smooth scrolling
      cy.get('[data-testid="data-table"]').scrollTo('bottom');
      cy.get('[data-testid="load-more-indicator"]').should('be.visible');
    });
  });
});