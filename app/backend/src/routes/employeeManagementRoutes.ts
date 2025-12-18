import { Router } from 'express';
import { employeeManagementController } from '../controllers/employeeManagementController';
import {
  validateAdminRole,
  requirePermission,
  requireRole,
  adminRateLimit,
  auditAdminAction
} from '../middleware/adminAuthMiddleware';
import { csrfProtection } from '../middleware/csrfProtection';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.use(authMiddleware);
router.use(validateAdminRole);
router.use(adminRateLimit());

router.post(
  '/employees',
  csrfProtection,
  requireRole(['super_admin', 'admin']),
  auditAdminAction('create_employee'),
  employeeManagementController.createEmployee
);

router.get(
  '/employees',
  requireRole(['super_admin', 'admin']),
  employeeManagementController.listEmployees
);

router.get(
  '/employees/:employeeId',
  requireRole(['super_admin', 'admin']),
  employeeManagementController.getEmployee
);

router.put(
  '/employees/:employeeId',
  csrfProtection,
  requireRole(['super_admin', 'admin']),
  auditAdminAction('update_employee'),
  employeeManagementController.updateEmployee
);

router.patch(
  '/employees/:employeeId/role',
  csrfProtection,
  requireRole(['super_admin', 'admin']),
  auditAdminAction('update_employee_role'),
  employeeManagementController.updateEmployeeRole
);

router.patch(
  '/employees/:employeeId/permissions',
  csrfProtection,
  requireRole(['super_admin', 'admin']),
  auditAdminAction('update_employee_permissions'),
  employeeManagementController.updateEmployeePermissions
);

router.patch(
  '/employees/:employeeId/status',
  csrfProtection,
  requireRole(['super_admin', 'admin']),
  auditAdminAction('update_employee_status'),
  employeeManagementController.updateEmployeeStatus
);

router.post(
  '/employees/:employeeId/reset-password',
  csrfProtection,
  requireRole(['super_admin', 'admin']),
  auditAdminAction('reset_employee_password'),
  employeeManagementController.resetEmployeePassword
);

router.delete(
  '/employees/:employeeId',
  csrfProtection,
  requireRole('super_admin'),
  auditAdminAction('delete_employee'),
  adminRateLimit(10, 15 * 60 * 1000),
  employeeManagementController.deleteEmployee
);

router.get(
  '/roles',
  requireRole(['super_admin', 'admin']),
  employeeManagementController.listRoles
);

router.get(
  '/permissions',
  requireRole(['super_admin', 'admin']),
  employeeManagementController.listPermissions
);

router.post(
  '/employees/invite',
  csrfProtection,
  requireRole(['super_admin', 'admin']),
  auditAdminAction('invite_employee'),
  employeeManagementController.inviteEmployee
);

router.post(
  '/employees/bulk-invite',
  csrfProtection,
  requireRole(['super_admin', 'admin']),
  auditAdminAction('bulk_invite_employees'),
  adminRateLimit(5, 15 * 60 * 1000),
  employeeManagementController.bulkInviteEmployees
);

router.post(
  '/employees/check-inactive',
  csrfProtection,
  requireRole(['super_admin', 'admin']),
  auditAdminAction('check_inactive_employees'),
  adminRateLimit(5, 60 * 60 * 1000),
  employeeManagementController.checkInactiveEmployees
);

export default router;
