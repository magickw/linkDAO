import React, { useState, useEffect } from 'react';
import { NextPage } from 'next';
import Head from 'next/head';
import { useAuth } from '@/context/AuthContext';
import {
  Users,
  UserPlus,
  Edit,
  Trash2,
  Lock,
  Unlock,
  Mail,
  Key,
  Shield,
  Search,
  Filter,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface Employee {
  id: string;
  email: string;
  name: string;
  handle: string;
  role: string;
  permissions: string[];
  emailVerified: boolean;
  lastLogin: Date | null;
  createdAt: Date;
  isLocked: boolean;
}

interface Role {
  role: string;
  permissions: string[];
  description: string;
}

const EmployeeManagementPage: NextPage = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [newEmployee, setNewEmployee] = useState({
    email: '',
    name: '',
    role: 'support',
    generatePassword: true
  });
  const [generatedCredentials, setGeneratedCredentials] = useState<any>(null);
  const [bulkResults, setBulkResults] = useState<any>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);

  useEffect(() => {
    if (user && (user.role === 'admin' || user.role === 'super_admin')) {
      fetchEmployees();
      fetchRoles();
    }
  }, [user]);

  const fetchEmployees = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/employees?search=${searchQuery}&role=${roleFilter}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setEmployees(data.data.employees);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/roles`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setRoles(data.data.roles);
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
    }
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/employees`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(newEmployee)
        }
      );

      if (response.ok) {
        const data = await response.json();
        setGeneratedCredentials(data.data.credentials);
        setShowCreateModal(false);
        fetchEmployees();
        setNewEmployee({ email: '', name: '', role: 'support', generatePassword: true });
      }
    } catch (error) {
      console.error('Error creating employee:', error);
    }
  };

  const handleResetPassword = async (employeeId: string) => {
    if (!confirm('Are you sure you want to reset this employee\'s password?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/employees/${employeeId}/reset-password`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setGeneratedCredentials(data.data.credentials);
      }
    } catch (error) {
      console.error('Error resetting password:', error);
    }
  };

  const handleToggleLock = async (employee: Employee) => {
    const action = employee.isLocked ? 'unlock' : 'lock';

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/employees/${employee.id}/status`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ action })
        }
      );

      if (response.ok) {
        fetchEmployees();
      }
    } catch (error) {
      console.error('Error toggling lock:', error);
    }
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    if (!confirm('Are you sure you want to delete this employee? This action cannot be undone.')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/employees/${employeeId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        fetchEmployees();
      }
    } catch (error) {
      console.error('Error deleting employee:', error);
    }
  };

  const handleBulkImport = async () => {
    if (!csvFile) return;

    try {
      const text = await csvFile.text();
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
      
      const emailIdx = headers.indexOf('email');
      const nameIdx = headers.indexOf('name');
      const roleIdx = headers.indexOf('role');

      if (emailIdx === -1 || nameIdx === -1 || roleIdx === -1) {
        alert('CSV must have email, name, and role columns');
        return;
      }

      const employeesToCreate = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        return {
          email: values[emailIdx],
          name: values[nameIdx],
          role: values[roleIdx]
        };
      });

      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/employees/bulk-invite`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ employees: employeesToCreate })
        }
      );

      if (response.ok) {
        const data = await response.json();
        setBulkResults(data.data);
        setShowBulkImportModal(false);
        setCsvFile(null);
        fetchEmployees();
      }
    } catch (error) {
      console.error('Error bulk importing employees:', error);
    }
  };

  const handleCheckInactive = async () => {
    if (!confirm('This will suspend all employees who haven\'t logged in for 90+ days. Continue?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/admin/employees/check-inactive`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        alert(`Checked ${data.data.checked} employees, suspended ${data.data.suspended} for inactivity`);
        fetchEmployees();
      }
    } catch (error) {
      console.error('Error checking inactive employees:', error);
    }
  };

  if (!user || (user.role !== 'admin' && user.role !== 'super_admin')) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h1>
          <p className="text-gray-600 dark:text-gray-400">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Employee Management - LinkDAO Admin</title>
        <meta name="description" content="Manage employees and staff members" />
      </Head>

      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center">
                <Users className="w-8 h-8 mr-3 text-blue-600 dark:text-blue-400" />
                Employee Management
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Manage staff members and their permissions
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowBulkImportModal(true)}
                className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <Users className="w-5 h-5 mr-2" />
                Bulk Import
              </button>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <UserPlus className="w-5 h-5 mr-2" />
                Add Employee
              </button>
            </div>
          </div>

          <div className="mb-6 flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by email or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && fetchEmployees()}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  fetchEmployees();
                }}
                className="pl-10 pr-8 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                <option value="">All Roles</option>
                {roles.map((role) => (
                  <option key={role.role} value={role.role}>
                    {role.role}
                  </option>
                ))}
              </select>
            </div>
            {user.role === 'super_admin' && (
              <button
                onClick={handleCheckInactive}
                className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors whitespace-nowrap"
              >
                <Clock className="w-4 h-4 mr-2" />
                Check Inactive
              </button>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Last Login
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                        Loading...
                      </td>
                    </tr>
                  ) : employees.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                        No employees found
                      </td>
                    </tr>
                  ) : (
                    employees.map((employee) => (
                      <tr key={employee.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4">
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {employee.name}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {employee.email}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            <Shield className="w-3 h-3 mr-1" />
                            {employee.role}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            {employee.emailVerified ? (
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            ) : (
                              <XCircle className="w-4 h-4 text-gray-400" />
                            )}
                            {employee.isLocked && (
                              <Lock className="w-4 h-4 text-red-500" />
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                          {employee.lastLogin
                            ? new Date(employee.lastLogin).toLocaleDateString()
                            : 'Never'}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handleResetPassword(employee.id)}
                              className="p-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                              title="Reset Password"
                            >
                              <Key className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleToggleLock(employee)}
                              className="p-2 text-yellow-600 hover:text-yellow-700 dark:text-yellow-400 dark:hover:text-yellow-300"
                              title={employee.isLocked ? 'Unlock' : 'Lock'}
                            >
                              {employee.isLocked ? (
                                <Unlock className="w-4 h-4" />
                              ) : (
                                <Lock className="w-4 h-4" />
                              )}
                            </button>
                            {user.role === 'super_admin' && (
                              <button
                                onClick={() => handleDeleteEmployee(employee.id)}
                                className="p-2 text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Add New Employee
            </h2>
            <form onSubmit={handleCreateEmployee}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={newEmployee.email}
                    onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newEmployee.name}
                    onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Role
                  </label>
                  <select
                    value={newEmployee.role}
                    onChange={(e) => setNewEmployee({ ...newEmployee, role: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {roles.map((role) => (
                      <option key={role.role} value={role.role}>
                        {role.role} - {role.description}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-6 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {generatedCredentials && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Employee Credentials
            </h2>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-3">
                ⚠️ Store these credentials securely. They will not be shown again.
              </p>
              <div className="space-y-2">
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Email:</span>
                  <p className="text-sm text-gray-900 dark:text-white font-mono bg-white dark:bg-gray-700 p-2 rounded mt-1">
                    {generatedCredentials.email}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Temporary Password:</span>
                  <p className="text-sm text-gray-900 dark:text-white font-mono bg-white dark:bg-gray-700 p-2 rounded mt-1">
                    {generatedCredentials.temporaryPassword}
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={() => setGeneratedCredentials(null)}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              I've Saved the Credentials
            </button>
          </div>
        </div>
      )}

      {showBulkImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Bulk Import Employees
            </h2>
            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Upload a CSV file with columns: email, name, role
              </p>
              <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg text-xs font-mono text-gray-800 dark:text-gray-200">
                email,name,role<br />
                support1@linkdao.io,John Doe,support<br />
                support2@linkdao.io,Jane Smith,support
              </div>
            </div>
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
              className="w-full mb-4 text-sm text-gray-900 dark:text-white"
            />
            <div className="flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowBulkImportModal(false);
                  setCsvFile(null);
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkImport}
                disabled={!csvFile}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Import
              </button>
            </div>
          </div>
        </div>
      )}

      {bulkResults && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Bulk Import Results
            </h2>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Total: {bulkResults.summary.total}
                </span>
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-green-600 dark:text-green-400">
                    ✓ Success: {bulkResults.summary.successful}
                  </span>
                  <span className="text-sm text-red-600 dark:text-red-400">
                    ✗ Failed: {bulkResults.summary.failed}
                  </span>
                </div>
              </div>
            </div>

            {bulkResults.successful.length > 0 && (
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Successfully Created
                </h3>
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 max-h-60 overflow-y-auto">
                  {bulkResults.successful.map((emp: any, idx: number) => (
                    <div key={idx} className="mb-3 pb-3 border-b border-green-200 dark:border-green-800 last:border-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{emp.name}</div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">{emp.email}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        Password: <span className="font-mono">{emp.temporaryPassword}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {bulkResults.failed.length > 0 && (
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Failed
                </h3>
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 max-h-40 overflow-y-auto">
                  {bulkResults.failed.map((emp: any, idx: number) => (
                    <div key={idx} className="text-sm text-red-600 dark:text-red-400 mb-2">
                      {emp.email}: {emp.error}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => setBulkResults(null)}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default EmployeeManagementPage;