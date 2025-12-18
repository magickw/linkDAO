import { Request, Response } from 'express';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, and, or, like, inArray } from 'drizzle-orm';
import { users } from '../db/schema';
import { AdminAuthService } from '../services/adminAuthService';
import { safeLogger } from '../utils/safeLogger';
import { ApiResponse } from '../utils/apiResponse';
import crypto from 'crypto';

const connectionString = process.env.DATABASE_URL!;
const sql = postgres(connectionString, { ssl: 'require' });
const db = drizzle(sql);

const EMPLOYEE_ROLES = ['support', 'moderator', 'analyst', 'admin', 'super_admin'] as const;
type EmployeeRole = typeof EMPLOYEE_ROLES[number];

const PERMISSION_CATEGORIES = {
  users: ['users.view', 'users.edit', 'users.suspend', 'users.delete'],
  content: ['content.view', 'content.moderate', 'content.delete'],
  marketplace: ['marketplace.view', 'marketplace.seller_review', 'marketplace.manage'],
  disputes: ['disputes.view', 'disputes.resolve', 'disputes.escalate'],
  system: ['system.settings', 'system.analytics', 'system.audit'],
  support: ['support.chat', 'support.tickets', 'support.knowledge_base'],
  governance: ['governance.view', 'governance.verify', 'governance.manage'],
  returns: ['returns.view', 'returns.manage', 'returns.analytics'],
  admin: ['admin.manage', 'admin.roles']
};

const ROLE_PERMISSIONS: Record<EmployeeRole, string[]> = {
  support: [
    'support.chat',
    'support.tickets',
    'support.knowledge_base',
    'users.view',
    'content.view'
  ],
  moderator: [
    'content.view',
    'content.moderate',
    'content.delete',
    'users.view',
    'users.suspend',
    'disputes.view',
    'disputes.resolve'
  ],
  analyst: [
    'users.view',
    'content.view',
    'marketplace.view',
    'system.analytics',
    'returns.analytics'
  ],
  admin: [
    'users.view',
    'users.edit',
    'users.suspend',
    'content.view',
    'content.moderate',
    'content.delete',
    'marketplace.view',
    'marketplace.seller_review',
    'marketplace.manage',
    'disputes.view',
    'disputes.resolve',
    'disputes.escalate',
    'system.settings',
    'system.analytics',
    'system.audit',
    'support.chat',
    'support.tickets',
    'support.knowledge_base',
    'governance.view',
    'governance.verify',
    'returns.view',
    'returns.manage',
    'returns.analytics'
  ],
  super_admin: ['*']
};

interface CreateEmployeeRequest {
  email: string;
  name: string;
  role: EmployeeRole;
  permissions?: string[];
  generatePassword?: boolean;
  sendEmail?: boolean;
}

interface UpdateEmployeeRequest {
  name?: string;
  email?: string;
  role?: EmployeeRole;
  permissions?: string[];
}

class EmployeeManagementController {
  async createEmployee(req: Request, res: Response) {
    try {
      const {
        email,
        name,
        role,
        permissions: customPermissions,
        generatePassword = true,
        sendEmail = false
      }: CreateEmployeeRequest = req.body;

      if (!email || !name || !role) {
        return ApiResponse.badRequest(res, 'Email, name, and role are required');
      }

      if (!EMPLOYEE_ROLES.includes(role)) {
        return ApiResponse.badRequest(res, `Invalid role. Must be one of: ${EMPLOYEE_ROLES.join(', ')}`);
      }

      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);

      if (existingUser.length > 0) {
        return ApiResponse.badRequest(res, 'Email already exists');
      }

      const password = generatePassword 
        ? crypto.randomBytes(16).toString('hex')
        : crypto.randomBytes(8).toString('hex');

      const passwordHash = await AdminAuthService.hashPassword(password);

      const permissions = customPermissions || ROLE_PERMISSIONS[role];

      const dummyWalletAddress = `0x${crypto.randomBytes(20).toString('hex')}`;

      const [newEmployee] = await db
        .insert(users)
        .values({
          email: email.toLowerCase(),
          displayName: name,
          handle: email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, ''),
          role,
          passwordHash,
          permissions: permissions as any,
          emailVerified: true,
          walletAddress: dummyWalletAddress,
          isEmployee: true,
          employeeStatus: 'active',
          invitedBy: req.user?.id,
          invitedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      safeLogger.info('Employee created:', {
        id: newEmployee.id,
        email: newEmployee.email,
        role: newEmployee.role,
        createdBy: req.user?.id
      });

      return ApiResponse.success(res, {
        employee: {
          id: newEmployee.id,
          email: newEmployee.email,
          name: newEmployee.displayName,
          role: newEmployee.role,
          permissions: newEmployee.permissions,
          emailVerified: newEmployee.emailVerified,
          createdAt: newEmployee.createdAt
        },
        credentials: generatePassword ? {
          email: newEmployee.email,
          temporaryPassword: password,
          note: 'Store this password securely. It will not be shown again.'
        } : undefined
      }, 201);

    } catch (error) {
      safeLogger.error('Error creating employee:', error);
      return ApiResponse.serverError(res, 'Failed to create employee');
    }
  }

  async listEmployees(req: Request, res: Response) {
    try {
      const { role, search, page = 1, limit = 20 } = req.query;

      const offset = (Number(page) - 1) * Number(limit);

      let query = db.select().from(users);

      const conditions: any[] = [
        inArray(users.role, EMPLOYEE_ROLES as any),
        eq(users.isEmployee, true)
      ];

      if (role && EMPLOYEE_ROLES.includes(role as any)) {
        conditions.push(eq(users.role, role as string));
      }

      if (search) {
        conditions.push(
          or(
            like(users.email, `%${search}%`),
            like(users.displayName, `%${search}%`),
            like(users.handle, `%${search}%`)
          )
        );
      }

      const employees = await query
        .where(and(...conditions))
        .limit(Number(limit) as number)
        .offset(offset as number)
        .orderBy(users.createdAt);

      const employeeList = employees.map(emp => ({
        id: emp.id,
        email: emp.email,
        name: emp.displayName,
        handle: emp.handle,
        role: emp.role,
        permissions: emp.permissions,
        emailVerified: emp.emailVerified,
        lastLogin: emp.lastLogin,
        createdAt: emp.createdAt,
        isLocked: emp.lockedUntil && new Date(emp.lockedUntil) > new Date()
      }));

      return ApiResponse.success(res, {
        employees: employeeList,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: employees.length
        }
      });

    } catch (error) {
      safeLogger.error('Error listing employees:', error);
      return ApiResponse.serverError(res, 'Failed to list employees');
    }
  }

  async getEmployee(req: Request, res: Response) {
    try {
      const { employeeId } = req.params;

      const [employee] = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.id, employeeId),
            inArray(users.role, EMPLOYEE_ROLES as any)
          )
        )
        .limit(1);

      if (!employee) {
        return ApiResponse.notFound(res, 'Employee not found');
      }

      return ApiResponse.success(res, {
        employee: {
          id: employee.id,
          email: employee.email,
          name: employee.displayName,
          handle: employee.handle,
          role: employee.role,
          permissions: employee.permissions,
          emailVerified: employee.emailVerified,
          lastLogin: employee.lastLogin,
          loginAttempts: employee.loginAttempts,
          lockedUntil: employee.lockedUntil,
          createdAt: employee.createdAt,
          updatedAt: employee.updatedAt
        }
      });

    } catch (error) {
      safeLogger.error('Error getting employee:', error);
      return ApiResponse.serverError(res, 'Failed to get employee');
    }
  }

  async updateEmployee(req: Request, res: Response) {
    try {
      const { employeeId } = req.params;
      const { name, email, role, permissions }: UpdateEmployeeRequest = req.body;

      const [existingEmployee] = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.id, employeeId),
            inArray(users.role, EMPLOYEE_ROLES as any)
          )
        )
        .limit(1);

      if (!existingEmployee) {
        return ApiResponse.notFound(res, 'Employee not found');
      }

      if (role && !EMPLOYEE_ROLES.includes(role)) {
        return ApiResponse.badRequest(res, `Invalid role. Must be one of: ${EMPLOYEE_ROLES.join(', ')}`);
      }

      if (email && email !== existingEmployee.email) {
        const [emailExists] = await db
          .select()
          .from(users)
          .where(eq(users.email, email.toLowerCase()))
          .limit(1);

        if (emailExists) {
          return ApiResponse.badRequest(res, 'Email already exists');
        }
      }

      const updateData: any = {
        updatedAt: new Date()
      };

      if (name) updateData.displayName = name;
      if (email) updateData.email = email.toLowerCase();
      if (role) {
        updateData.role = role;
        if (!permissions) {
          updateData.permissions = ROLE_PERMISSIONS[role] as any;
        }
      }
      if (permissions) updateData.permissions = permissions as any;

      const [updatedEmployee] = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, employeeId))
        .returning();

      safeLogger.info('Employee updated:', {
        id: updatedEmployee.id,
        updatedBy: req.user?.id,
        changes: updateData
      });

      return ApiResponse.success(res, {
        employee: {
          id: updatedEmployee.id,
          email: updatedEmployee.email,
          name: updatedEmployee.displayName,
          role: updatedEmployee.role,
          permissions: updatedEmployee.permissions,
          updatedAt: updatedEmployee.updatedAt
        }
      });

    } catch (error) {
      safeLogger.error('Error updating employee:', error);
      return ApiResponse.serverError(res, 'Failed to update employee');
    }
  }

  async updateEmployeeRole(req: Request, res: Response) {
    try {
      const { employeeId } = req.params;
      const { role } = req.body;

      if (!role || !EMPLOYEE_ROLES.includes(role)) {
        return ApiResponse.badRequest(res, `Invalid role. Must be one of: ${EMPLOYEE_ROLES.join(', ')}`);
      }

      const [employee] = await db
        .select()
        .from(users)
        .where(eq(users.id, employeeId))
        .limit(1);

      if (!employee) {
        return ApiResponse.notFound(res, 'Employee not found');
      }

      const [updated] = await db
        .update(users)
        .set({
          role,
          permissions: ROLE_PERMISSIONS[role] as any,
          updatedAt: new Date()
        })
        .where(eq(users.id, employeeId))
        .returning();

      safeLogger.info('Employee role updated:', {
        id: employeeId,
        oldRole: employee.role,
        newRole: role,
        updatedBy: req.user?.id
      });

      return ApiResponse.success(res, {
        employee: {
          id: updated.id,
          role: updated.role,
          permissions: updated.permissions
        }
      });

    } catch (error) {
      safeLogger.error('Error updating employee role:', error);
      return ApiResponse.serverError(res, 'Failed to update employee role');
    }
  }

  async updateEmployeePermissions(req: Request, res: Response) {
    try {
      const { employeeId } = req.params;
      const { permissions } = req.body;

      if (!Array.isArray(permissions)) {
        return ApiResponse.badRequest(res, 'Permissions must be an array');
      }

      const [updated] = await db
        .update(users)
        .set({
          permissions: permissions as any,
          updatedAt: new Date()
        })
        .where(eq(users.id, employeeId))
        .returning();

      if (!updated) {
        return ApiResponse.notFound(res, 'Employee not found');
      }

      safeLogger.info('Employee permissions updated:', {
        id: employeeId,
        permissions,
        updatedBy: req.user?.id
      });

      return ApiResponse.success(res, {
        employee: {
          id: updated.id,
          permissions: updated.permissions
        }
      });

    } catch (error) {
      safeLogger.error('Error updating employee permissions:', error);
      return ApiResponse.serverError(res, 'Failed to update employee permissions');
    }
  }

  async updateEmployeeStatus(req: Request, res: Response) {
    try {
      const { employeeId } = req.params;
      const { action } = req.body;

      if (!['lock', 'unlock', 'verify_email'].includes(action)) {
        return ApiResponse.badRequest(res, 'Invalid action. Must be: lock, unlock, or verify_email');
      }

      const updateData: any = { updatedAt: new Date() };

      if (action === 'lock') {
        const lockUntil = new Date();
        lockUntil.setHours(lockUntil.getHours() + 24);
        updateData.lockedUntil = lockUntil;
      } else if (action === 'unlock') {
        updateData.lockedUntil = null;
        updateData.loginAttempts = 0;
      } else if (action === 'verify_email') {
        updateData.emailVerified = true;
      }

      const [updated] = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, employeeId))
        .returning();

      if (!updated) {
        return ApiResponse.notFound(res, 'Employee not found');
      }

      safeLogger.info('Employee status updated:', {
        id: employeeId,
        action,
        updatedBy: req.user?.id
      });

      return ApiResponse.success(res, {
        employee: {
          id: updated.id,
          lockedUntil: updated.lockedUntil,
          emailVerified: updated.emailVerified
        }
      });

    } catch (error) {
      safeLogger.error('Error updating employee status:', error);
      return ApiResponse.serverError(res, 'Failed to update employee status');
    }
  }

  async resetEmployeePassword(req: Request, res: Response) {
    try {
      const { employeeId } = req.params;
      const { sendEmail = false } = req.body;

      const [employee] = await db
        .select()
        .from(users)
        .where(eq(users.id, employeeId))
        .limit(1 as number);

      if (!employee) {
        return ApiResponse.notFound(res, 'Employee not found');
      }

      const newPassword = crypto.randomBytes(12).toString('hex');
      const passwordHash = await AdminAuthService.hashPassword(newPassword);

      await db
        .update(users)
        .set({
          passwordHash,
          loginAttempts: 0,
          lockedUntil: null,
          updatedAt: new Date()
        })
        .where(eq(users.id, employeeId));

      safeLogger.info('Employee password reset:', {
        id: employeeId,
        resetBy: req.user?.id
      });

      return ApiResponse.success(res, {
        message: 'Password reset successfully',
        credentials: {
          email: employee.email,
          temporaryPassword: newPassword,
          note: 'Store this password securely. It will not be shown again.'
        }
      });

    } catch (error) {
      safeLogger.error('Error resetting employee password:', error);
      return ApiResponse.serverError(res, 'Failed to reset employee password');
    }
  }

  async deleteEmployee(req: Request, res: Response) {
    try {
      const { employeeId } = req.params;

      const [employee] = await db
        .select()
        .from(users)
        .where(eq(users.id, employeeId))
        .limit(1);

      if (!employee) {
        return ApiResponse.notFound(res, 'Employee not found');
      }

      if (employee.role === 'super_admin') {
        return ApiResponse.forbidden(res, 'Cannot delete super admin');
      }

      await db
        .delete(users)
        .where(eq(users.id, employeeId));

      safeLogger.info('Employee deleted:', {
        id: employeeId,
        email: employee.email,
        deletedBy: req.user?.id
      });

      return ApiResponse.success(res, null);

    } catch (error) {
      safeLogger.error('Error deleting employee:', error);
      return ApiResponse.serverError(res, 'Failed to delete employee');
    }
  }

  async listRoles(req: Request, res: Response) {
    try {
      const roles = EMPLOYEE_ROLES.map(role => ({
        role,
        permissions: ROLE_PERMISSIONS[role],
        description: this.getRoleDescription(role)
      }));

      return ApiResponse.success(res, { roles });

    } catch (error) {
      safeLogger.error('Error listing roles:', error);
      return ApiResponse.serverError(res, 'Failed to list roles');
    }
  }

  async listPermissions(req: Request, res: Response) {
    try {
      return ApiResponse.success(res, {
        categories: PERMISSION_CATEGORIES,
        allPermissions: Object.values(PERMISSION_CATEGORIES).flat()
      });

    } catch (error) {
      safeLogger.error('Error listing permissions:', error);
      return ApiResponse.serverError(res, 'Failed to list permissions');
    }
  }

  private getRoleDescription(role: EmployeeRole): string {
    const descriptions: Record<EmployeeRole, string> = {
      support: 'Customer support staff - handles live chat, tickets, and user inquiries',
      moderator: 'Content moderator - reviews and moderates content, handles disputes',
      analyst: 'Data analyst - views analytics and generates reports',
      admin: 'Administrator - full access except admin management',
      super_admin: 'Super Administrator - full system access including admin management'
    };
    return descriptions[role];
  }

  async checkInactiveEmployees(req: Request, res: Response) {
    try {
      const inactivityDays = parseInt(process.env.EMPLOYEE_INACTIVITY_DAYS || '90', 10);
      const inactivityThreshold = new Date();
      inactivityThreshold.setDate(inactivityThreshold.getDate() - inactivityDays);

      const { isNull, lt } = await import('drizzle-orm');

      const inactiveEmployees = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.isEmployee, true),
            eq(users.employeeStatus, 'active'),
            or(
              isNull(users.lastLogin),
              lt(users.lastLogin, inactivityThreshold)
            )
          )
        );

      const lockedCount = inactiveEmployees.length;

      for (const employee of inactiveEmployees) {
        await db
          .update(users)
          .set({
            employeeStatus: 'suspended',
            updatedAt: new Date()
          })
          .where(eq(users.id, employee.id));

        safeLogger.info('Employee auto-suspended for inactivity:', {
          id: employee.id,
          email: employee.email,
          lastLogin: employee.lastLogin,
          inactivityDays
        });
      }

      return ApiResponse.success(res, {
        checked: inactiveEmployees.length,
        suspended: lockedCount,
        threshold: inactivityDays
      });

    } catch (error) {
      safeLogger.error('Error checking inactive employees:', error);
      return ApiResponse.serverError(res, 'Failed to check inactive employees');
    }
  }

  async inviteEmployee(req: Request, res: Response) {
    try {
      const { email, name, role } = req.body;

      if (!email || !name || !role) {
        return ApiResponse.badRequest(res, 'Email, name, and role are required');
      }

      if (!EMPLOYEE_ROLES.includes(role)) {
        return ApiResponse.badRequest(res, `Invalid role. Must be one of: ${EMPLOYEE_ROLES.join(', ')}`);
      }

      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1);

      if (existingUser.length > 0) {
        return ApiResponse.badRequest(res, 'Email already exists');
      }

      const inviteToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 48);

      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      const inviteUrl = `${frontendUrl}/invite/accept?token=${inviteToken}`;

      safeLogger.info('Employee invitation created:', {
        email,
        role,
        invitedBy: req.user?.id,
        expiresAt
      });

      return ApiResponse.success(res, {
        inviteUrl,
        expiresAt,
        message: 'Invitation created. Share this URL with the employee.'
      }, 201);

    } catch (error) {
      safeLogger.error('Error inviting employee:', error);
      return ApiResponse.serverError(res, 'Failed to create invitation');
    }
  }

  async bulkInviteEmployees(req: Request, res: Response) {
    try {
      const { employees } = req.body;

      if (!Array.isArray(employees) || employees.length === 0) {
        return ApiResponse.badRequest(res, 'Employees array is required');
      }

      const results = [];
      const errors = [];

      for (const emp of employees) {
        try {
          const { email, name, role } = emp;

          if (!email || !name || !role) {
            errors.push({ email, error: 'Missing required fields' });
            continue;
          }

          if (!EMPLOYEE_ROLES.includes(role)) {
            errors.push({ email, error: 'Invalid role' });
            continue;
          }

          const existingUser = await db
            .select()
            .from(users)
            .where(eq(users.email, email.toLowerCase()))
            .limit(1 as number);

          if (existingUser.length > 0) {
            errors.push({ email, error: 'Email already exists' });
            continue;
          }

          const password = crypto.randomBytes(12).toString('hex');
          const passwordHash = await AdminAuthService.hashPassword(password);
          const dummyWalletAddress = `0x${crypto.randomBytes(20).toString('hex')}`;

          const [newEmployee] = await db
            .insert(users)
            .values({
              email: email.toLowerCase(),
              displayName: name,
              handle: email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, ''),
              role,
              passwordHash,
              permissions: ROLE_PERMISSIONS[role] as any,
              emailVerified: true,
              walletAddress: dummyWalletAddress,
              isEmployee: true,
              employeeStatus: 'active',
              invitedBy: req.user?.id,
              invitedAt: new Date(),
              createdAt: new Date(),
              updatedAt: new Date()
            })
            .returning();

          results.push({
            id: newEmployee.id,
            email: newEmployee.email,
            name: newEmployee.displayName,
            role: newEmployee.role,
            temporaryPassword: password
          });

        } catch (error) {
          errors.push({ email: emp.email, error: 'Failed to create employee' });
        }
      }

      safeLogger.info('Bulk employee creation:', {
        total: employees.length,
        successful: results.length,
        failed: errors.length,
        createdBy: req.user?.id
      });

      return ApiResponse.success(res, {
        successful: results,
        failed: errors,
        summary: {
          total: employees.length,
          successful: results.length,
          failed: errors.length
        }
      }, 201);

    } catch (error) {
      safeLogger.error('Error bulk inviting employees:', error);
      return ApiResponse.serverError(res, 'Failed to bulk invite employees');
    }
  }
}

export const employeeManagementController = new EmployeeManagementController();
