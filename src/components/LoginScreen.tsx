import React, { useState, useEffect } from 'react';
import {
  Coffee,
  Lock,
  Delete,
  ShieldCheck,
  Building2,
  Users,
  Store,
  ChefHat,
  UtensilsCrossed,
  Receipt,
  FileSpreadsheet,
  Crown,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Mail,
  KeyRound,
  LogOut,
  RefreshCw,
  Sparkles,
  Unlock,
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { usePosStore } from '../store/usePosStore';
import { staffPinService, StaffPinMember, DEFAULT_ROLE_PINS } from '../services/staffPinService';
import { UserRole, BusinessType } from '../types/database';

interface LoginScreenProps {
  onUnlock?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onUnlock }) => {
  const {
    user,
    currentBusiness,
    isLoading: authLoading,
    authError,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    createBusiness,
    enableStandaloneMode,
    clearError,
  } = useAuthStore();

  const { isLocked, unlockWithPin, quickUnlockStaff, showBanner } = usePosStore();

  // Mode: 'STAFF_PIN' (default everyday POS terminal) or 'BUSINESS_SETUP' (owner / cloud configuration)
  const [viewMode, setViewMode] = useState<'STAFF_PIN' | 'BUSINESS_SETUP'>('STAFF_PIN');

  // Business Setup Tabs
  const [bizTab, setBizTab] = useState<'SIGN_IN' | 'REGISTER' | 'STANDALONE'>('SIGN_IN');

  // Staff PIN State
  const [staffList, setStaffList] = useState<StaffPinMember[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<StaffPinMember | null>(null);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isLoadingStaff, setIsLoadingStaff] = useState(true);

  // Business Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [bizName, setBizName] = useState('');
  const [bizType, setBizType] = useState<BusinessType>('cafe');
  const [bizGstin, setBizGstin] = useState('');

  const businessId = currentBusiness?.id || '00000000-0000-0000-0000-000000000001';

  // Load staff list whenever businessId changes
  useEffect(() => {
    let isMounted = true;
    setIsLoadingStaff(true);
    staffPinService.getStaffList(businessId).then((list) => {
      if (isMounted) {
        setStaffList(list);
        if (list.length > 0) {
          // Select Owner by default (PIN 1111) for easiest initial access
          const defaultMember = list.find((s) => s.role === 'owner') || list[0];
          setSelectedStaff(defaultMember);
        }
        setIsLoadingStaff(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [businessId]);

  // Physical Keyboard Support: Listen for typing numbers 0-9, Backspace, Enter, Escape
  useEffect(() => {
    if (viewMode !== 'STAFF_PIN') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Do not capture if typing in input/textarea (such as search or modals)
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key >= '0' && e.key <= '9') {
        e.preventDefault();
        handleKeyClick(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleDelete();
      } else if (e.key === 'Delete' || e.key === 'Escape' || e.key.toLowerCase() === 'c') {
        e.preventDefault();
        handleClear();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (pin.length > 0) {
          submitPin(pin);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode, pin, isVerifying, selectedStaff]);

  // Keypad Handlers
  const handleKeyClick = async (num: string) => {
    if (isVerifying) return;
    setPinError(null);

    if (pin.length < 4) {
      const nextPin = pin + num;
      setPin(nextPin);

      if (nextPin.length === 4) {
        await submitPin(nextPin);
      }
    }
  };

  const handleClear = () => {
    setPin('');
    setPinError(null);
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setPinError(null);
  };

  // Submit PIN
  const submitPin = async (inputPin: string) => {
    setIsVerifying(true);
    setPinError(null);

    // unlockWithPin now universally detects master PINs (1111 for owner, 1234 for cashier, etc.)
    const result = await unlockWithPin(inputPin, selectedStaff?.userId);
    setIsVerifying(false);

    if (result.success) {
      setPin('');
      // Guarantee standalone mode is marked active so login gate never re-triggers
      useAuthStore.setState({ isStandaloneMode: true });
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('aura_standalone_mode', 'true');
      }
      usePosStore.setState({ isLocked: false, activeTab: 'CHECKOUT' });

      const memberName = result.member?.fullName || selectedStaff?.fullName || 'Staff Member';
      const roleName = (result.member?.role || selectedStaff?.role || 'staff').toUpperCase();
      showBanner(`Welcome ${memberName}! Logged in as ${roleName}.`);
      if (onUnlock) onUnlock();
    } else {
      setPinError(result.error || 'Incorrect PIN. Try 1111 for Owner or 1234 for Cashier.');
      setPin('');
    }
  };

  // 1-Tap Instant Quick Login
  const handleQuickLogin = async (roleOrUserId: string) => {
    setIsVerifying(true);
    setPinError(null);

    const result = await quickUnlockStaff(roleOrUserId);
    setIsVerifying(false);

    if (result.success) {
      setPin('');
      useAuthStore.setState({ isStandaloneMode: true });
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('aura_standalone_mode', 'true');
      }
      usePosStore.setState({ isLocked: false, activeTab: 'CHECKOUT' });

      const memberName = result.member?.fullName || 'Staff Member';
      const roleName = (result.member?.role || 'staff').toUpperCase();
      showBanner(`Welcome ${memberName}! Logged in as ${roleName}.`);
      if (onUnlock) onUnlock();
    } else {
      setPinError(result.error || 'Failed to log in');
    }
  };

  // Emergency Lockout Recovery / Reset
  const handleResetLockout = async () => {
    await staffPinService.resetAllPinsAndLockout(businessId);
    const list = await staffPinService.getStaffList(businessId);
    setStaffList(list);
    const ownerMember = list.find((s) => s.role === 'owner') || list[0];
    setSelectedStaff(ownerMember);
    setPin('');
    setPinError(null);
    showBanner('Lockout reset! Enter 1111 for Owner or 1234 for Cashier.');
  };

  // Business Sign In
  const handleOwnerSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    const res = await signInWithEmail(email, password);
    if (res.success) {
      setViewMode('STAFF_PIN');
      showBanner('Business account connected successfully!');
    }
  };

  // Business Registration
  const handleOwnerRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    if (!user) {
      const signupRes = await signUpWithEmail(email, password, fullName);
      if (!signupRes.success) return;
      if (signupRes.needsConfirmation) return;
    }

    const bizRes = await createBusiness(bizName, bizType, bizGstin);
    if (bizRes.success) {
      setViewMode('STAFF_PIN');
      showBanner(`Business "${bizName}" created and active!`);
    }
  };

  // Activate Standalone Mode
  const handleActivateStandalone = () => {
    enableStandaloneMode();
    setViewMode('STAFF_PIN');
    showBanner('Standalone Offline Café Mode enabled!');
  };

  // Helper for Role Badges
  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'owner':
        return {
          label: 'Owner',
          icon: <Crown className="w-3.5 h-3.5 text-amber-500" />,
          bg: 'bg-amber-50 dark:bg-amber-950/80 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300',
        };
      case 'manager':
        return {
          label: 'Manager',
          icon: <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />,
          bg: 'bg-blue-50 dark:bg-blue-950/80 border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300',
        };
      case 'cashier':
        return {
          label: 'Cashier',
          icon: <Receipt className="w-3.5 h-3.5 text-teal-500" />,
          bg: 'bg-teal-50 dark:bg-teal-950/80 border-teal-300 dark:border-teal-800 text-teal-700 dark:text-teal-300',
        };
      case 'waiter':
        return {
          label: 'Waiter',
          icon: <UtensilsCrossed className="w-3.5 h-3.5 text-purple-500" />,
          bg: 'bg-purple-50 dark:bg-purple-950/80 border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300',
        };
      case 'kitchen':
        return {
          label: 'Kitchen / Barista',
          icon: <ChefHat className="w-3.5 h-3.5 text-orange-500" />,
          bg: 'bg-orange-50 dark:bg-orange-950/80 border-orange-300 dark:border-orange-800 text-orange-700 dark:text-orange-300',
        };
      case 'accountant':
        return {
          label: 'Accountant',
          icon: <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />,
          bg: 'bg-emerald-50 dark:bg-emerald-950/80 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300',
        };
    }
  };

  const getRolePin = (role: UserRole) => {
    switch (role) {
      case 'owner':
        return '1111';
      case 'cashier':
        return '1234';
      case 'waiter':
        return '2222';
      case 'kitchen':
        return '3333';
      case 'accountant':
        return '4444';
      default:
        return '1234';
    }
  };

  const keypadRows = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['C', '0', 'DEL'],
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-3 sm:p-6 select-none overflow-y-auto">
      {/* ========================================================
          VIEW 1: EVERYDAY STAFF QUICK PIN LOGIN (DEFAULT POS SCREEN)
         ======================================================== */}
      {viewMode === 'STAFF_PIN' ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-4xl w-full p-5 sm:p-8 flex flex-col animate-scaleUp">
          {/* Top Café Header & Mode Switch */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-100 dark:border-slate-800 gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-bold shadow-md shrink-0">
                <Coffee className="w-6 h-6" />
              </div>
              <div>
                <h1 className="font-extrabold text-lg sm:text-xl text-slate-900 dark:text-white tracking-tight">
                  {currentBusiness?.name || 'Aura Café & Roastery'}
                </h1>
                <p className="text-xs text-slate-500 flex items-center gap-2">
                  <span>Terminal #1</span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    {user ? 'Cloud Connected' : 'Local Standalone Mode'}
                  </span>
                </p>
              </div>
            </div>

            {/* Business Management Switch */}
            <button
              onClick={() => {
                clearError();
                setViewMode('BUSINESS_SETUP');
              }}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all border border-slate-200 dark:border-slate-700/80 self-start sm:self-center"
            >
              <Building2 className="w-4 h-4 text-slate-500" />
              <span>Business & Cloud Setup</span>
            </button>
          </div>

          {/* Quick Guidance Banner */}
          <div className="mt-4 px-4 py-2.5 rounded-2xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200/80 dark:border-teal-800/60 flex items-center justify-between text-xs text-teal-900 dark:text-teal-200">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
              <span className="font-medium">
                Type <strong>1111</strong> for Owner, <strong>1234</strong> for Cashier, or tap <strong>1-Tap Login</strong> on any staff card.
              </span>
            </div>
            <span className="hidden sm:inline text-[11px] font-semibold text-teal-600 dark:text-teal-400">
              Keyboard Enabled (0-9)
            </span>
          </div>

          {/* Main 2-Column POS Login Body */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-5 items-start">
            {/* Left Column: Staff Roster Grid with 1-Tap Login */}
            <div className="md:col-span-7 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" />
                  Staff Members & Roles
                </span>
                <span className="text-[11px] text-teal-600 dark:text-teal-400 font-semibold">
                  Tap card or click 1-Tap Login
                </span>
              </div>

              {isLoadingStaff ? (
                <div className="flex items-center justify-center py-12 text-slate-400 text-xs">
                  <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  Loading Staff Roster...
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {staffList.map((member) => {
                    const isSelected = selectedStaff?.userId === member.userId;
                    const badge = getRoleBadge(member.role);
                    const defaultPin = getRolePin(member.role);

                    return (
                      <div
                        key={member.userId}
                        onClick={() => {
                          setSelectedStaff(member);
                          setPin('');
                          setPinError(null);
                        }}
                        className={`p-3 rounded-2xl border text-left transition-all flex flex-col justify-between relative cursor-pointer ${
                          isSelected
                            ? 'bg-teal-50 dark:bg-teal-950/60 border-teal-500 ring-2 ring-teal-500/20 shadow-sm'
                            : 'bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-700/80'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs ${
                              isSelected
                                ? 'bg-teal-600 text-white'
                                : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600'
                            }`}
                          >
                            {member.fullName.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                                {member.fullName}
                              </h3>
                              {isSelected && (
                                <span className="w-2 h-2 rounded-full bg-teal-500 shrink-0" />
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span
                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold border ${badge.bg}`}
                              >
                                {badge.icon}
                                {badge.label}
                              </span>
                              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">
                                PIN: {defaultPin}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* 1-Tap Quick Login Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuickLogin(member.role);
                          }}
                          className="mt-2.5 w-full py-1.5 px-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-teal-600 hover:text-white dark:hover:bg-teal-600 text-teal-700 dark:text-teal-300 font-bold text-[11px] border border-teal-300 dark:border-teal-800 flex items-center justify-center gap-1.5 transition-all shadow-2xs"
                        >
                          <Unlock className="w-3 h-3" />
                          <span>1-Tap Login as {badge.label}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Roster Demo Pin Pills */}
              <div className="mt-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs">
                <span className="font-bold text-slate-600 dark:text-slate-300 block mb-1.5">
                  Demo Credentials Summary:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  <div
                    onClick={() => handleQuickLogin('owner')}
                    className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-amber-400 transition-colors"
                  >
                    <span className="text-slate-400 block text-[10px]">OWNER</span>
                    <strong className="text-amber-600 dark:text-amber-400">PIN 1111</strong>
                  </div>
                  <div
                    onClick={() => handleQuickLogin('cashier')}
                    className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-teal-400 transition-colors"
                  >
                    <span className="text-slate-400 block text-[10px]">CASHIER</span>
                    <strong className="text-teal-600 dark:text-teal-400">PIN 1234</strong>
                  </div>
                  <div
                    onClick={() => handleQuickLogin('waiter')}
                    className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-purple-400 transition-colors"
                  >
                    <span className="text-slate-400 block text-[10px]">WAITER</span>
                    <strong className="text-purple-600 dark:text-purple-400">PIN 2222</strong>
                  </div>
                  <div
                    onClick={() => handleQuickLogin('kitchen')}
                    className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-orange-400 transition-colors"
                  >
                    <span className="text-slate-400 block text-[10px]">KITCHEN</span>
                    <strong className="text-orange-600 dark:text-orange-400">PIN 3333</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: 4-Digit Numeric PIN Pad & Quick Chips */}
            <div className="md:col-span-5 flex flex-col items-center bg-slate-50 dark:bg-slate-800/50 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-700/80">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                Enter 4-Digit Staff PIN
              </span>

              {selectedStaff && (
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 text-center">
                  Active selection: <strong className="text-teal-600 dark:text-teal-400">{selectedStaff.fullName}</strong>
                  <span className="block text-[11px] text-slate-400">
                    (or enter any valid PIN like 1111)
                  </span>
                </div>
              )}

              {/* PIN Indicator Dots */}
              <div className="flex items-center gap-3 my-2">
                {[0, 1, 2, 3].map((idx) => (
                  <div
                    key={idx}
                    className={`w-4 h-4 rounded-full transition-all border ${
                      idx < pin.length
                        ? 'bg-teal-600 border-teal-600 scale-110 shadow-xs'
                        : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700'
                    }`}
                  />
                ))}
              </div>

              {/* Error & Lockout Message */}
              {pinError && (
                <div className="mt-2 text-xs font-bold text-rose-500 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 px-3 py-1.5 rounded-xl text-center animate-shake max-w-xs flex flex-col items-center gap-1.5">
                  <span>{pinError}</span>
                  <button
                    type="button"
                    onClick={handleResetLockout}
                    className="text-[11px] underline text-teal-600 dark:text-teal-400 hover:text-teal-700 font-bold"
                  >
                    Reset Lockout & PINs
                  </button>
                </div>
              )}

              {/* 3x4 Touch / Click Keypad */}
              <div className="grid grid-cols-3 gap-2.5 w-full max-w-[260px] mt-3">
                {keypadRows.flat().map((k) => (
                  <button
                    key={k}
                    type="button"
                    disabled={isVerifying}
                    onClick={() => {
                      if (k === 'C') handleClear();
                      else if (k === 'DEL') handleDelete();
                      else handleKeyClick(k);
                    }}
                    className="h-12 sm:h-13 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 active:bg-teal-100 dark:active:bg-teal-900 font-bold text-xl text-slate-900 dark:text-white flex items-center justify-center transition-all border border-slate-200 dark:border-slate-700 shadow-2xs disabled:opacity-50"
                  >
                    {k === 'DEL' ? (
                      <Delete className="w-5 h-5 text-slate-500" />
                    ) : k === 'C' ? (
                      <span className="text-rose-500 text-sm font-black">C</span>
                    ) : (
                      k
                    )}
                  </button>
                ))}
              </div>

              {/* Quick Login Chips below Keypad */}
              <div className="w-full mt-4 pt-3 border-t border-slate-200 dark:border-slate-700/60 flex flex-col items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Quick Unlock Chips:
                </span>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('owner')}
                    className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 text-[11px] font-bold hover:bg-amber-100 transition-colors shadow-2xs"
                  >
                    👑 Owner (1111)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('cashier')}
                    className="px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-300 dark:border-teal-800 text-[11px] font-bold hover:bg-teal-100 transition-colors shadow-2xs"
                  >
                    🧾 Cashier (1234)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickLogin('kitchen')}
                    className="px-2.5 py-1 rounded-lg bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border border-orange-300 dark:border-orange-800 text-[11px] font-bold hover:bg-orange-100 transition-colors shadow-2xs"
                  >
                    👨‍🍳 Kitchen (3333)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ========================================================
            VIEW 2: BUSINESS OWNER & CLOUD ACCOUNT SETUP (SEPARATE)
           ======================================================== */
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-lg w-full p-6 sm:p-7 flex flex-col animate-scaleUp">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setViewMode('STAFF_PIN')}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 px-2.5 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Staff Terminal</span>
            </button>
            <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center">
              <Store className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Business & Store Setup
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Connect your cloud business account or manage store terminal mode.
            </p>
          </div>

          {/* If already signed in, show status & option to switch/signout */}
          {user && currentBusiness ? (
            <div className="mt-5 p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-xs">
              <div className="flex items-center gap-2 font-bold text-teal-900 dark:text-teal-200 text-sm mb-1">
                <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                <span>Connected Business: {currentBusiness.name}</span>
              </div>
              <p className="text-slate-600 dark:text-slate-400">
                Logged in owner: <strong>{user.email}</strong>
              </p>
              <p className="text-slate-500 mt-1">
                Type: {currentBusiness.business_type.toUpperCase()} • Timezone: {currentBusiness.timezone}
              </p>

              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-teal-200 dark:border-teal-800/60">
                <button
                  type="button"
                  onClick={() => setViewMode('STAFF_PIN')}
                  className="flex-1 py-2.5 rounded-xl bg-teal-600 text-white font-bold text-xs hover:bg-teal-700 shadow-xs"
                >
                  Return to Staff Terminal
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await signOut();
                    setBizTab('SIGN_IN');
                  }}
                  className="px-3 py-2.5 rounded-xl border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 font-bold text-xs flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Disconnect</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Tab Selector */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl mt-5">
                <button
                  type="button"
                  onClick={() => setBizTab('SIGN_IN')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                    bizTab === 'SIGN_IN'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                  }`}
                >
                  Sign In Owner
                </button>
                <button
                  type="button"
                  onClick={() => setBizTab('REGISTER')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                    bizTab === 'REGISTER'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                  }`}
                >
                  New Business
                </button>
                <button
                  type="button"
                  onClick={() => setBizTab('STANDALONE')}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                    bizTab === 'STANDALONE'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
                  }`}
                >
                  Standalone
                </button>
              </div>

              {authError && (
                <div className="mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{authError}</span>
                </div>
              )}

              {/* Form 1: Sign In Owner */}
              {bizTab === 'SIGN_IN' && (
                <form onSubmit={handleOwnerSignIn} className="mt-5 flex flex-col gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Owner Email
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="owner@auracafe.com"
                        className="w-full h-11 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Password
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full h-11 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="mt-2 h-11 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {authLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <span>Sign In to Cloud Business</span>
                    )}
                  </button>
                </form>
              )}

              {/* Form 2: Register New Business */}
              {bizTab === 'REGISTER' && (
                <form onSubmit={handleOwnerRegister} className="mt-5 flex flex-col gap-3.5">
                  {!user && (
                    <>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Owner Full Name
                        </label>
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Alex Mercer"
                          className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Owner Email
                        </label>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="owner@mycafe.com"
                          className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Password
                        </label>
                        <input
                          type="password"
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
                        />
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Business / Café Name
                    </label>
                    <input
                      type="text"
                      required
                      value={bizName}
                      onChange={(e) => setBizName(e.target.value)}
                      placeholder="Blue Ridge Roastery"
                      className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Business Type
                    </label>
                    <select
                      value={bizType}
                      onChange={(e) => setBizType(e.target.value as BusinessType)}
                      className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
                    >
                      <option value="cafe">Café & Coffee Bar</option>
                      <option value="bakery">Bakery & Patisserie</option>
                      <option value="qsr">Quick Service Restaurant (QSR)</option>
                      <option value="restaurant">Fine Dining Restaurant</option>
                      <option value="food_truck">Food Truck</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      GSTIN / Tax ID (Optional)
                    </label>
                    <input
                      type="text"
                      value={bizGstin}
                      onChange={(e) => setBizGstin(e.target.value)}
                      placeholder="29AAAAA0000A1Z5"
                      className="w-full h-11 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="mt-2 h-11 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {authLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <span>Create Business & Owner</span>
                    )}
                  </button>
                </form>
              )}

              {/* Form 3: Standalone / Offline Mode */}
              {bizTab === 'STANDALONE' && (
                <div className="mt-5 p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs flex flex-col gap-3">
                  <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-sm">
                    <Store className="w-4 h-4 text-teal-600" />
                    <span>Run in Standalone Café Mode</span>
                  </div>
                  <p className="text-slate-500">
                    No Supabase database or cloud account needed. Uses high-performance local IndexedDB on this tablet or device with full menu, tables, KOT tickets, and receipt generation.
                  </p>
                  <button
                    type="button"
                    onClick={handleActivateStandalone}
                    className="mt-2 h-11 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Activate Standalone Mode (Instant)</span>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
