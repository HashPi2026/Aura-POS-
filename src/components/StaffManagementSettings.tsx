import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Trash2,
  Shield,
  KeyRound,
  Check,
  X,
  Mail,
  User,
  Coffee,
  ChefHat,
  Receipt,
  FileSpreadsheet,
  Crown,
  RefreshCw,
  Lock,
} from 'lucide-react';
import { restApi } from '../api/restClient';
import { useAuthStore } from '../store/useAuthStore';
import { usePosStore } from '../store/usePosStore';
import { UserRole } from '../types/database';

interface StaffMember {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  role: UserRole;
  username?: string;
  isActive: boolean;
  hasPassword?: boolean;
}

export const StaffManagementSettings: React.FC = () => {
  const { currentBusiness, user: currentUser } = useAuthStore();
  const { showBanner } = usePosStore();

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('cashier');
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('1234');
  const [formError, setFormError] = useState<string | null>(null);

  const fetchStaff = async () => {
    setIsLoading(true);
    try {
      const res = await restApi.staff.getAll(currentBusiness?.id);
      if (res && Array.isArray(res.staff)) {
        setStaff(res.staff);
      } else {
        setStaff([]);
      }
    } catch (err: any) {
      console.warn('Could not fetch staff from server:', err.message);
      setStaff([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, [currentBusiness?.id]);

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!fullName.trim() || !email.trim()) {
      setFormError('Please enter full name and email/login ID.');
      return;
    }

    if (!password.trim() || password.length < 4) {
      setFormError('Password must be at least 4 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await restApi.staff.create({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        role,
        password: password.trim(),
        pin: pin.trim() || '1234',
        businessId: currentBusiness?.id || 'KWI-BUS_001',
      });

      if (res && res.success) {
        showBanner(`Employee "${fullName}" added successfully!`);
        setIsModalOpen(false);
        setFullName('');
        setEmail('');
        setPassword('');
        setPin('1234');
        setRole('cashier');
        await fetchStaff();
      } else {
        setFormError(res?.error || 'Failed to create employee. Try again.');
      }
    } catch (err: any) {
      setFormError(err.message || 'Error creating employee');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStaff = async (member: StaffMember) => {
    if (member.role === 'owner') {
      showBanner('Cannot delete store owner account.');
      return;
    }

    if (confirm(`Are you sure you want to remove employee "${member.fullName}"?`)) {
      try {
        await restApi.staff.delete(member.id);
        showBanner(`Removed employee "${member.fullName}"`);
        await fetchStaff();
      } catch (err: any) {
        showBanner('Failed to remove employee.');
      }
    }
  };

  const getRoleBadge = (r: UserRole) => {
    switch (r) {
      case 'owner':
        return {
          label: 'Owner',
          icon: <Crown className="w-3.5 h-3.5 text-amber-500" />,
          color: 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
        };
      case 'manager':
        return {
          label: 'Manager',
          icon: <Shield className="w-3.5 h-3.5 text-indigo-500" />,
          color: 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800',
        };
      case 'cashier':
        return {
          label: 'Cashier',
          icon: <Receipt className="w-3.5 h-3.5 text-teal-500" />,
          color: 'bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800',
        };
      case 'waiter':
        return {
          label: 'Waiter',
          icon: <Coffee className="w-3.5 h-3.5 text-purple-500" />,
          color: 'bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
        };
      case 'kitchen':
        return {
          label: 'Kitchen / Barista',
          icon: <ChefHat className="w-3.5 h-3.5 text-orange-500" />,
          color: 'bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800',
        };
      case 'accountant':
        return {
          label: 'Accountant',
          icon: <FileSpreadsheet className="w-3.5 h-3.5 text-blue-500" />,
          color: 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
        };
      default:
        return {
          label: r,
          icon: <User className="w-3.5 h-3.5 text-slate-500" />,
          color: 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200',
        };
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 border border-teal-200 dark:border-teal-800 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <span>Employee & Staff Management</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold">
                {staff.length} Active
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Create and manage employee login credentials with role-based access permissions.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchStaff}
            disabled={isLoading}
            className="h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-teal-600' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="h-9 px-3.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all active:scale-[0.98]"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Employee</span>
          </button>
        </div>
      </div>

      {/* Staff List Table */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-teal-600" />
            <span>Loading staff credentials...</span>
          </div>
        ) : staff.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No employees registered yet. Click "Add Employee" to grant cashier or waiter access.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-4">User ID</th>
                  <th className="py-2.5 px-4">Full Name</th>
                  <th className="py-2.5 px-3">Login Email / Username</th>
                  <th className="py-2.5 px-3">Role & Permissions</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {staff.map((member) => {
                  const badge = getRoleBadge(member.role);
                  const isCurrent = currentUser?.id === member.userId;

                  return (
                    <tr
                      key={member.id || member.userId}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-teal-600 dark:text-teal-400">
                        {member.userId}
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          <span>{member.fullName}</span>
                          {isCurrent && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 font-bold">
                              You
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-300">
                        {member.email}
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-bold border ${badge.color}`}
                        >
                          {badge.icon}
                          <span>{badge.label}</span>
                        </span>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>Active</span>
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        {member.role !== 'owner' ? (
                          <button
                            onClick={() => handleDeleteStaff(member)}
                            title="Remove Employee"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <span className="text-[11px] font-bold text-slate-400">Owner</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Employee Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 select-none animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-teal-600" />
                <span>Create Employee Credentials</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 text-xs text-rose-600 font-bold">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateEmployee} className="flex flex-col gap-3.5">
              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Priya Sharma"
                  className="w-full h-10 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-teal-500 font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                  Login Email or Username *
                </label>
                <input
                  type="text"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. priya.cashier@store.com or priya"
                  className="w-full h-10 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-teal-500 font-medium"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                  Assigned Role & Access Level *
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-teal-500 font-medium"
                >
                  <option value="cashier">💵 Cashier — Billing, Cart, Cash Drawer & Receipts</option>
                  <option value="waiter">🍽️ Waiter — Order Taking, Table Layout & KOTs</option>
                  <option value="kitchen">👨‍🍳 Kitchen / Barista — Kitchen Display Screen (KDS)</option>
                  <option value="manager">🛡️ Manager — Menu Editing, Discounts, Reports</option>
                  <option value="accountant">📊 Accountant — Sales Reports, Tax & GST Analytics</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                    Login Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min 4 characters"
                    className="w-full h-10 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-teal-500 font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block mb-1">
                    Quick PIN (Optional)
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="1234"
                    className="w-full h-10 px-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-500">
                Employee will be assigned standard ID <strong className="text-teal-600 dark:text-teal-400 font-mono">KWI-USR-XXXX</strong> and can log into the POS terminal with their email/username and password.
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSubmitting ? 'Creating...' : 'Create Employee'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
