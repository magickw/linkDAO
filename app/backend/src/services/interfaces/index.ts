/**
 * Service Interfaces Index
 * 
 * Exports all service interfaces for the order lifecycle infrastructure.
 * 
 * @see .kiro/specs/order-lifecycle-infrastructure/design.md
 */

// Seller Notification Service Interface
export { ISellerNotificationService, SellerNotificationServiceFactory } from './ISellerNotificationService';
export type { default as ISellerNotificationServiceDefault } from './ISellerNotificationService';

// Seller Workflow Service Interface
export { ISellerWorkflowService, SellerWorkflowServiceFactory } from './ISellerWorkflowService';
export type { default as ISellerWorkflowServiceDefault } from './ISellerWorkflowService';
