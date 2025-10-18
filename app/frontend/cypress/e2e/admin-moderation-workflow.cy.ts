describe('Admin Moderation Workflow E2E Tests', () => {
  let adminCredentials: { email: string; password: string; token: string };
  let moderatorCredentials: { email: string; password: string; token: string };

  before(() => {
    // Setup test accounts
    cy.task('createTestAdmin', {
      email: 'moderation-admin@test.com',
      password: 'TestAdmin123!',
      role: 'super_admin',
      permissions: ['moderation_access', 'ai_moderation', 'dispute_resolution', 'user_management']
    }).then((admin) => {
      adminCredentials = admin as any;
    });

    cy.task('createTestAdmin', {
      email: 'moderator@test.com',
      password: 'TestMod123!',
      role: 'moderator',
      permissions: ['content_moderation', 'basic_moderation']
    }).then((moderator) => {
      moderatorCredentials = moderator as any;
    });

    // Setup test content for moderation
    cy.task('createModerationTestData', {
      flaggedPosts: 15,
      reportedUsers: 8,
      pendingDisputes: 5,
      aiDetectedContent: 10
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

  describe('Moderation Queue Management', () => {
    it('should display and process moderation queue items', () => {
      // Navigate to moderation queue
      cy.get('[data-testid="nav-moderation"]').click();
      cy.url().should('include', '/admin/moderation');

      // Verify queue is loaded
      cy.get('[data-testid="moderation-queue"]').should('be.visible');
      cy.get('[data-testid="queue-item"]').should('have.length.at.least', 10);

      // Check queue statistics
      cy.get('[data-testid="queue-stats"]').should('be.visible');
      cy.get('[data-testid="pending-count"]').should('contain.text', '15');
      cy.get('[data-testid="processed-today"]').should('be.visible');
      cy.get('[data-testid="average-processing-time"]').should('be.visible');

      // Process first item - approve
      cy.get('[data-testid="queue-item"]').first().within(() => {
        cy.get('[data-testid="item-content"]').should('be.visible');
        cy.get('[data-testid="ai-risk-score"]').should('be.visible');
        cy.get('[data-testid="approve-button"]').click();
      });

      // Verify approval confirmation
      cy.get('[data-testid="approval-confirmation"]').should('be.visible');
      cy.get('[data-testid="confirm-approval"]').click();

      // Verify item is removed from queue
      cy.get('[data-testid="item-processed-notification"]').should('be.visible');
      cy.get('[data-testid="pending-count"]').should('contain.text', '14');
    });

    it('should handle content rejection with reasons', () => {
      cy.get('[data-testid="nav-moderation"]').click();

      // Reject content with reason
      cy.get('[data-testid="queue-item"]').first().within(() => {
        cy.get('[data-testid="reject-button"]').click();
      });

      // Select rejection reason
      cy.get('[data-testid="rejection-reason-modal"]').should('be.visible');
      cy.get('[data-testid="reason-spam"]').check();
      cy.get('[data-testid="additional-notes"]').type('Promotional content without disclosure');
      cy.get('[data-testid="confirm-rejection"]').click();

      // Verify rejection is processed
      cy.get('[data-testid="rejection-confirmation"]').should('be.visible');
      cy.get('[data-testid="user-notification-sent"]').should('be.visible');
    });

    it('should escalate complex cases to senior moderators', () => {
      cy.get('[data-testid="nav-moderation"]').click();

      // Find high-risk item
      cy.get('[data-testid="queue-item"]')
        .contains('[data-testid="ai-risk-score"]', '0.8')
        .parent()
        .within(() => {
          cy.get('[data-testid="escalate-button"]').click();
        });

      // Fill escalation form
      cy.get('[data-testid="escalation-modal"]').should('be.visible');
      cy.get('[data-testid="escalation-reason"]').select('Complex policy interpretation');
      cy.get('[data-testid="escalation-notes"]').type('Requires senior review for policy clarification');
      cy.get('[data-testid="assign-to-senior"]').select('Senior Moderator Team');
      cy.get('[data-testid="confirm-escalation"]').click();

      // Verify escalation
      cy.get('[data-testid="escalation-success"]').should('be.visible');
      cy.get('[data-testid="escalated-item-badge"]').should('be.visible');
    });
  });

  describe('AI-Assisted Moderation', () => {
    it('should display AI risk scores and recommendations', () => {
      cy.get('[data-testid="nav-moderation"]').click();

      // Verify AI assistance is active
      cy.get('[data-testid="ai-moderation-status"]').should('contain', 'Active');

      // Check AI scores on queue items
      cy.get('[data-testid="queue-item"]').each(($item) => {
        cy.wrap($item).within(() => {
          cy.get('[data-testid="ai-risk-score"]').should('be.visible');
          cy.get('[data-testid="ai-recommendation"]').should('be.visible');
          cy.get('[data-testid="confidence-indicator"]').should('be.visible');
        });
      });

      // View detailed AI analysis
      cy.get('[data-testid="queue-item"]').first().within(() => {
        cy.get('[data-testid="view-ai-analysis"]').click();
      });

      cy.get('[data-testid="ai-analysis-modal"]').should('be.visible');
      cy.get('[data-testid="risk-factors"]').should('be.visible');
      cy.get('[data-testid="similar-cases"]').should('be.visible');
      cy.get('[data-testid="policy-violations"]').should('be.visible');
      cy.get('[data-testid="recommended-action"]').should('be.visible');

      cy.get('[data-testid="close-ai-analysis"]').click();
    });

    it('should allow AI recommendation override with justification', () => {
      cy.get('[data-testid="nav-moderation"]').click();

      // Find item with AI recommendation to reject
      cy.get('[data-testid="queue-item"]')
        .contains('[data-testid="ai-recommendation"]', 'Reject')
        .parent()
        .within(() => {
          // Override AI recommendation by approving
          cy.get('[data-testid="approve-button"]').click();
        });

      // Provide override justification
      cy.get('[data-testid="ai-override-modal"]').should('be.visible');
      cy.get('[data-testid="override-reason"]').select('False positive - content is acceptable');
      cy.get('[data-testid="override-justification"]')
        .type('Content appears to be legitimate user-generated content, not spam as AI suggested');
      cy.get('[data-testid="confirm-override"]').click();

      // Verify override is logged
      cy.get('[data-testid="override-logged"]').should('be.visible');
      cy.get('[data-testid="ai-feedback-submitted"]').should('be.visible');
    });

    it('should batch process similar AI-detected violations', () => {
      cy.get('[data-testid="nav-moderation"]').click();

      // Enable batch mode
      cy.get('[data-testid="batch-mode-toggle"]').click();
      cy.get('[data-testid="batch-selection-mode"]').should('be.visible');

      // Select multiple similar violations
      cy.get('[data-testid="queue-item"]')
        .contains('[data-testid="violation-type"]', 'Spam')
        .parent()
        .find('[data-testid="batch-select-checkbox"]')
        .check();

      cy.get('[data-testid="selected-items-count"]').should('contain', '3');

      // Apply batch action
      cy.get('[data-testid="batch-actions-dropdown"]').select('Reject All');
      cy.get('[data-testid="batch-rejection-reason"]').select('Spam content');
      cy.get('[data-testid="apply-batch-action"]').click();

      // Confirm batch processing
      cy.get('[data-testid="batch-confirmation-modal"]').should('be.visible');
      cy.get('[data-testid="confirm-batch-processing"]').click();

      // Verify batch processing results
      cy.get('[data-testid="batch-processing-complete"]').should('be.visible');
      cy.get('[data-testid="batch-results-summary"]').should('contain', '3 items processed');
    });
  });

  describe('Dispute Resolution Workflow', () => {
    it('should manage dispute cases from submission to resolution', () => {
      // Navigate to disputes
      cy.get('[data-testid="nav-disputes"]').click();
      cy.url().should('include', '/admin/disputes');

      // Verify dispute queue
      cy.get('[data-testid="dispute-queue"]').should('be.visible');
      cy.get('[data-testid="dispute-case"]').should('have.length.at.least', 5);

      // Open first dispute case
      cy.get('[data-testid="dispute-case"]').first().click();
      cy.get('[data-testid="dispute-details-modal"]').should('be.visible');

      // Review case details
      cy.get('[data-testid="dispute-timeline"]').should('be.visible');
      cy.get('[data-testid="evidence-section"]').should('be.visible');
      cy.get('[data-testid="parties-involved"]').should('be.visible');
      cy.get('[data-testid="ai-case-analysis"]').should('be.visible');

      // View evidence
      cy.get('[data-testid="evidence-item"]').first().click();
      cy.get('[data-testid="evidence-viewer"]').should('be.visible');
      cy.get('[data-testid="evidence-authenticity-check"]').should('be.visible');

      // Add case notes
      cy.get('[data-testid="add-case-note"]').click();
      cy.get('[data-testid="case-note-input"]')
        .type('Reviewed evidence, appears to be legitimate dispute requiring mediation');
      cy.get('[data-testid="save-case-note"]').click();

      // Make resolution decision
      cy.get('[data-testid="resolution-section"]').should('be.visible');
      cy.get('[data-testid="resolution-type"]').select('Mediated Settlement');
      cy.get('[data-testid="resolution-details"]')
        .type('Partial refund recommended based on evidence review');
      cy.get('[data-testid="submit-resolution"]').click();

      // Confirm resolution
      cy.get('[data-testid="resolution-confirmation"]').should('be.visible');
      cy.get('[data-testid="notify-parties"]').check();
      cy.get('[data-testid="confirm-resolution"]').click();

      // Verify case closure
      cy.get('[data-testid="case-resolved-notification"]').should('be.visible');
      cy.get('[data-testid="case-status"]').should('contain', 'Resolved');
    });

    it('should handle evidence analysis with AI assistance', () => {
      cy.get('[data-testid="nav-disputes"]').click();

      // Open dispute with multiple evidence items
      cy.get('[data-testid="dispute-case"]')
        .contains('[data-testid="evidence-count"]', '5')
        .click();

      // Trigger AI evidence analysis
      cy.get('[data-testid="analyze-evidence-ai"]').click();
      cy.get('[data-testid="ai-analysis-progress"]').should('be.visible');

      // Wait for AI analysis completion
      cy.get('[data-testid="ai-analysis-complete"]', { timeout: 15000 })
        .should('be.visible');

      // Review AI findings
      cy.get('[data-testid="ai-evidence-summary"]').should('be.visible');
      cy.get('[data-testid="authenticity-scores"]').should('be.visible');
      cy.get('[data-testid="contradiction-detection"]').should('be.visible');
      cy.get('[data-testid="similar-cases"]').should('be.visible');

      // View detailed analysis
      cy.get('[data-testid="view-detailed-analysis"]').click();
      cy.get('[data-testid="evidence-timeline"]').should('be.visible');
      cy.get('[data-testid="credibility-assessment"]').should('be.visible');
      cy.get('[data-testid="recommended-resolution"]').should('be.visible');
    });

    it('should track dispute resolution satisfaction', () => {
      cy.get('[data-testid="nav-disputes"]').click();

      // Navigate to resolved cases
      cy.get('[data-testid="filter-resolved-cases"]').click();
      cy.get('[data-testid="resolved-cases-list"]').should('be.visible');

      // View satisfaction metrics
      cy.get('[data-testid="satisfaction-metrics"]').should('be.visible');
      cy.get('[data-testid="average-satisfaction"]').should('be.visible');
      cy.get('[data-testid="resolution-time-stats"]').should('be.visible');

      // Check individual case satisfaction
      cy.get('[data-testid="resolved-case"]').first().within(() => {
        cy.get('[data-testid="satisfaction-score"]').should('be.visible');
        cy.get('[data-testid="view-feedback"]').click();
      });

      // Review party feedback
      cy.get('[data-testid="feedback-modal"]').should('be.visible');
      cy.get('[data-testid="complainant-feedback"]').should('be.visible');
      cy.get('[data-testid="respondent-feedback"]').should('be.visible');
      cy.get('[data-testid="improvement-suggestions"]').should('be.visible');
    });
  });

  describe('User Management and Actions', () => {
    it('should manage user accounts and apply sanctions', () => {
      // Navigate to user management
      cy.get('[data-testid="nav-users"]').click();
      cy.url().should('include', '/admin/users');

      // Search for specific user
      cy.get('[data-testid="user-search"]').type('test-user-violations');
      cy.get('[data-testid="search-button"]').click();

      // View user profile
      cy.get('[data-testid="user-result"]').first().click();
      cy.get('[data-testid="user-profile-modal"]').should('be.visible');

      // Review user activity and violations
      cy.get('[data-testid="user-activity-tab"]').click();
      cy.get('[data-testid="violation-history"]').should('be.visible');
      cy.get('[data-testid="content-reports"]').should('be.visible');
      cy.get('[data-testid="behavior-analysis"]').should('be.visible');

      // Apply warning
      cy.get('[data-testid="user-actions-dropdown"]').select('Issue Warning');
      cy.get('[data-testid="warning-reason"]').select('Inappropriate content');
      cy.get('[data-testid="warning-message"]')
        .type('Please review community guidelines regarding appropriate content');
      cy.get('[data-testid="send-warning"]').click();

      // Verify warning is applied
      cy.get('[data-testid="warning-sent-confirmation"]').should('be.visible');
      cy.get('[data-testid="user-status"]').should('contain', 'Warning Issued');
    });

    it('should handle user suspension workflow', () => {
      cy.get('[data-testid="nav-users"]').click();

      // Find user with multiple violations
      cy.get('[data-testid="filter-high-risk-users"]').click();
      cy.get('[data-testid="high-risk-user"]').first().click();

      // Review violation pattern
      cy.get('[data-testid="violation-pattern-analysis"]').should('be.visible');
      cy.get('[data-testid="escalation-recommendation"]').should('be.visible');

      // Apply suspension
      cy.get('[data-testid="user-actions-dropdown"]').select('Suspend Account');
      cy.get('[data-testid="suspension-modal"]').should('be.visible');
      
      cy.get('[data-testid="suspension-duration"]').select('7 days');
      cy.get('[data-testid="suspension-reason"]').select('Repeated policy violations');
      cy.get('[data-testid="suspension-details"]')
        .type('Multiple violations of community guidelines despite previous warnings');
      cy.get('[data-testid="notify-user"]').check();
      cy.get('[data-testid="confirm-suspension"]').click();

      // Verify suspension
      cy.get('[data-testid="suspension-applied"]').should('be.visible');
      cy.get('[data-testid="user-status"]').should('contain', 'Suspended');
      cy.get('[data-testid="suspension-end-date"]').should('be.visible');
    });

    it('should manage appeals process', () => {
      // Navigate to appeals
      cy.get('[data-testid="nav-appeals"]').click();
      cy.url().should('include', '/admin/appeals');

      // Review pending appeals
      cy.get('[data-testid="appeals-queue"]').should('be.visible');
      cy.get('[data-testid="appeal-case"]').should('have.length.at.least', 1);

      // Open appeal case
      cy.get('[data-testid="appeal-case"]').first().click();
      cy.get('[data-testid="appeal-details-modal"]').should('be.visible');

      // Review original decision and appeal
      cy.get('[data-testid="original-decision"]').should('be.visible');
      cy.get('[data-testid="appeal-reasoning"]').should('be.visible');
      cy.get('[data-testid="additional-evidence"]').should('be.visible');

      // Make appeal decision
      cy.get('[data-testid="appeal-decision"]').select('Uphold Original Decision');
      cy.get('[data-testid="decision-reasoning"]')
        .type('Original decision was appropriate based on clear policy violation');
      cy.get('[data-testid="submit-appeal-decision"]').click();

      // Confirm decision
      cy.get('[data-testid="appeal-decision-confirmation"]').should('be.visible');
      cy.get('[data-testid="notify-appellant"]').check();
      cy.get('[data-testid="confirm-appeal-decision"]').click();

      // Verify appeal closure
      cy.get('[data-testid="appeal-resolved"]').should('be.visible');
    });
  });

  describe('Moderation Analytics and Reporting', () => {
    it('should display comprehensive moderation metrics', () => {
      // Navigate to moderation analytics
      cy.get('[data-testid="nav-moderation-analytics"]').click();
      cy.url().should('include', '/admin/moderation/analytics');

      // Verify key metrics
      cy.get('[data-testid="moderation-overview"]').should('be.visible');
      cy.get('[data-testid="processing-speed-metric"]').should('be.visible');
      cy.get('[data-testid="accuracy-metric"]').should('be.visible');
      cy.get('[data-testid="ai-assistance-metric"]').should('be.visible');

      // Check trend charts
      cy.get('[data-testid="moderation-volume-chart"]').should('be.visible');
      cy.get('[data-testid="processing-time-chart"]').should('be.visible');
      cy.get('[data-testid="violation-types-chart"]').should('be.visible');

      // Test time range filtering
      cy.get('[data-testid="analytics-time-range"]').select('30d');
      cy.get('[data-testid="moderation-volume-chart"]')
        .should('have.attr', 'data-time-range', '30d');
    });

    it('should generate moderation performance reports', () => {
      cy.get('[data-testid="nav-moderation-analytics"]').click();

      // Navigate to reports section
      cy.get('[data-testid="reports-tab"]').click();
      cy.get('[data-testid="report-generator"]').should('be.visible');

      // Configure report
      cy.get('[data-testid="report-type"]').select('Moderator Performance');
      cy.get('[data-testid="report-period"]').select('Last 30 days');
      cy.get('[data-testid="include-ai-metrics"]').check();
      cy.get('[data-testid="include-quality-scores"]').check();

      // Generate report
      cy.get('[data-testid="generate-report"]').click();
      cy.get('[data-testid="report-generation-progress"]').should('be.visible');

      // Wait for completion
      cy.get('[data-testid="report-ready"]', { timeout: 15000 }).should('be.visible');

      // Preview report
      cy.get('[data-testid="preview-report"]').click();
      cy.get('[data-testid="report-preview-modal"]').should('be.visible');
      cy.get('[data-testid="report-summary"]').should('be.visible');
      cy.get('[data-testid="performance-metrics"]').should('be.visible');

      // Export report
      cy.get('[data-testid="export-pdf"]').click();
      cy.get('[data-testid="export-complete"]', { timeout: 10000 }).should('be.visible');
    });

    it('should track AI model performance and accuracy', () => {
      cy.get('[data-testid="nav-moderation-analytics"]').click();

      // Navigate to AI performance section
      cy.get('[data-testid="ai-performance-tab"]').click();
      cy.get('[data-testid="ai-metrics-dashboard"]').should('be.visible');

      // Check AI accuracy metrics
      cy.get('[data-testid="ai-accuracy-score"]').should('be.visible');
      cy.get('[data-testid="false-positive-rate"]').should('be.visible');
      cy.get('[data-testid="false-negative-rate"]').should('be.visible');

      // View model performance over time
      cy.get('[data-testid="accuracy-trend-chart"]').should('be.visible');
      cy.get('[data-testid="confidence-distribution"]').should('be.visible');

      // Check human override analysis
      cy.get('[data-testid="override-analysis"]').should('be.visible');
      cy.get('[data-testid="override-reasons"]').should('be.visible');
      cy.get('[data-testid="learning-opportunities"]').should('be.visible');

      // Trigger model retraining
      cy.get('[data-testid="retrain-model-button"]').click();
      cy.get('[data-testid="retraining-confirmation"]').should('be.visible');
      cy.get('[data-testid="confirm-retraining"]').click();
      cy.get('[data-testid="retraining-started"]').should('be.visible');
    });
  });

  describe('Workflow Automation and Efficiency', () => {
    it('should configure automated moderation rules', () => {
      // Navigate to automation settings
      cy.get('[data-testid="nav-automation"]').click();
      cy.url().should('include', '/admin/automation');

      // Create new automation rule
      cy.get('[data-testid="create-rule-button"]').click();
      cy.get('[data-testid="rule-builder-modal"]').should('be.visible');

      // Configure rule conditions
      cy.get('[data-testid="rule-name"]').type('Auto-reject spam content');
      cy.get('[data-testid="trigger-type"]').select('Content submitted');
      cy.get('[data-testid="condition-ai-score"]').select('Greater than');
      cy.get('[data-testid="condition-value"]').type('0.9');
      cy.get('[data-testid="condition-violation-type"]').select('Spam');

      // Configure actions
      cy.get('[data-testid="action-type"]').select('Auto-reject');
      cy.get('[data-testid="action-reason"]').select('Automated spam detection');
      cy.get('[data-testid="notify-user"]').check();

      // Save rule
      cy.get('[data-testid="save-rule"]').click();
      cy.get('[data-testid="rule-saved"]').should('be.visible');

      // Verify rule is active
      cy.get('[data-testid="active-rules-list"]').should('contain', 'Auto-reject spam content');
      cy.get('[data-testid="rule-status"]').should('contain', 'Active');
    });

    it('should handle escalation workflows', () => {
      cy.get('[data-testid="nav-automation"]').click();

      // Configure escalation rule
      cy.get('[data-testid="escalation-rules-tab"]').click();
      cy.get('[data-testid="create-escalation-rule"]').click();

      // Set escalation conditions
      cy.get('[data-testid="escalation-name"]').type('High-risk content escalation');
      cy.get('[data-testid="escalation-trigger"]').select('AI confidence below threshold');
      cy.get('[data-testid="confidence-threshold"]').type('0.7');
      cy.get('[data-testid="escalation-target"]').select('Senior Moderator');

      // Configure notification
      cy.get('[data-testid="escalation-notification"]').check();
      cy.get('[data-testid="notification-template"]').select('High-risk content review');

      // Save escalation rule
      cy.get('[data-testid="save-escalation-rule"]').click();
      cy.get('[data-testid="escalation-rule-saved"]').should('be.visible');

      // Test escalation trigger
      cy.task('createHighRiskContent', { aiConfidence: 0.6 });
      
      // Verify escalation was triggered
      cy.get('[data-testid="nav-moderation"]').click();
      cy.get('[data-testid="escalated-items"]').should('have.length.at.least', 1);
      cy.get('[data-testid="escalation-badge"]').should('be.visible');
    });

    it('should optimize moderator workload distribution', () => {
      // Login as different moderator to test workload
      cy.get('[data-testid="user-menu"]').click();
      cy.get('[data-testid="logout"]').click();

      // Login as regular moderator
      cy.visit('/admin/login');
      cy.get('[data-testid="email-input"]').type(moderatorCredentials.email);
      cy.get('[data-testid="password-input"]').type(moderatorCredentials.password);
      cy.get('[data-testid="login-button"]').click();

      // Check assigned workload
      cy.get('[data-testid="nav-moderation"]').click();
      cy.get('[data-testid="my-queue"]').should('be.visible');
      cy.get('[data-testid="assigned-items-count"]').should('be.visible');

      // Verify workload balancing
      cy.get('[data-testid="workload-indicator"]').should('be.visible');
      cy.get('[data-testid="queue-item"]').should('have.length.at.most', 10); // Reasonable workload

      // Check for priority items
      cy.get('[data-testid="priority-items"]').should('be.visible');
      cy.get('[data-testid="high-priority-badge"]').should('exist');
    });
  });

  describe('Mobile Moderation Interface', () => {
    it('should provide mobile-optimized moderation tools', () => {
      // Set mobile viewport
      cy.viewport('iphone-x');

      // Navigate to mobile moderation
      cy.get('[data-testid="mobile-nav-toggle"]').click();
      cy.get('[data-testid="mobile-nav-moderation"]').click();

      // Verify mobile moderation interface
      cy.get('[data-testid="mobile-moderation-queue"]').should('be.visible');
      cy.get('[data-testid="mobile-queue-item"]').should('have.length.at.least', 5);

      // Test swipe actions
      cy.get('[data-testid="mobile-queue-item"]').first()
        .trigger('touchstart', { touches: [{ clientX: 100, clientY: 200 }] })
        .trigger('touchmove', { touches: [{ clientX: 300, clientY: 200 }] })
        .trigger('touchend');

      // Verify swipe action menu
      cy.get('[data-testid="swipe-actions"]').should('be.visible');
      cy.get('[data-testid="swipe-approve"]').should('be.visible');
      cy.get('[data-testid="swipe-reject"]').should('be.visible');
      cy.get('[data-testid="swipe-escalate"]').should('be.visible');

      // Execute swipe action
      cy.get('[data-testid="swipe-approve"]').click();
      cy.get('[data-testid="mobile-action-confirmation"]').should('be.visible');
    });

    it('should handle mobile push notifications for urgent cases', () => {
      cy.viewport('iphone-x');

      // Simulate urgent moderation case
      cy.task('createUrgentModerationCase', {
        type: 'harassment',
        severity: 'high',
        requiresImmediate: true
      });

      // Verify push notification
      cy.get('[data-testid="mobile-push-notification"]', { timeout: 5000 })
        .should('be.visible')
        .and('contain', 'Urgent moderation required');

      // Tap notification to open case
      cy.get('[data-testid="mobile-push-notification"]').click();
      cy.get('[data-testid="urgent-case-modal"]').should('be.visible');

      // Quick moderate from notification
      cy.get('[data-testid="quick-moderate-reject"]').click();
      cy.get('[data-testid="quick-rejection-reason"]').select('Harassment');
      cy.get('[data-testid="confirm-quick-action"]').click();

      // Verify action completed
      cy.get('[data-testid="urgent-case-resolved"]').should('be.visible');
    });
  });
});