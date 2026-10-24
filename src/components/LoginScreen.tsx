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
  Check,
  ExternalLink,
  MapPin,
  Phone,
  User,
  FileText,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { usePosStore } from '../store/usePosStore';
import { staffPinService, StaffPinMember, DEFAULT_ROLE_PINS } from '../services/staffPinService';
import { UserRole, BusinessType } from '../types/database';
import { restApi } from '../api/restClient';
import { KwikioAppIcon } from './KwikioLogo';

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
    clearError,
  } = useAuthStore();

  const { isLocked, unlockWithPin, showBanner } = usePosStore();

  // Mode: 'STAFF_PIN' (everyday POS terminal with active business) or 'BUSINESS_SETUP' (owner login / registration)
  const [viewMode, setViewMode] = useState<'STAFF_PIN' | 'BUSINESS_SETUP'>(
    user ? 'STAFF_PIN' : 'BUSINESS_SETUP'
  );

  // Business Setup Tabs: Strictly Sign In and New Store Registration (Admin database & offline tabs removed)
  const [bizTab, setBizTab] = useState<'SIGN_IN' | 'REGISTER'>('SIGN_IN');
  const [showSwitchForm, setShowSwitchForm] = useState(false);

  // Staff PIN State
  const [staffList, setStaffList] = useState<StaffPinMember[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<StaffPinMember | null>(null);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isLoadingStaff, setIsLoadingStaff] = useState(true);
  const [mobileTab, setMobileTab] = useState<'PIN' | 'ROSTER'>('PIN');

  // Business Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [bizName, setBizName] = useState('');
  const [bizType, setBizType] = useState<BusinessType>('cafe');
  const [bizAddress, setBizAddress] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [bizGstin, setBizGstin] = useState('');

  // Auto-sync owner info with current user if signed in, or force business setup if unauthenticated
  useEffect(() => {
    if (user) {
      if (!ownerName) setOwnerName(user.fullName || '');
      if (!ownerEmail) setOwnerEmail(user.email || '');
    } else {
      setViewMode('BUSINESS_SETUP');
    }
  }, [user]);

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

    const nextPin = pin.length >= 4 ? num : pin + num;
    setPin(nextPin);

    if (nextPin.length === 4) {
      await submitPin(nextPin);
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

    try {
      // unlockWithPin universally detects master PINs (1111 for owner, 1234 for cashier, etc.)
      const result = await unlockWithPin(inputPin, selectedStaff?.userId);

      if (result.success) {
        setPin('');
        useAuthStore.setState({ isStandaloneMode: true });
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('aura_standalone_mode', 'true');
        }
        usePosStore.setState({ isLocked: false, activeTab: result.member?.role === 'kitchen' ? 'KOT' : 'CHECKOUT' });
        usePosStore.getState().refreshCatalogFromCloud();

        const memberName = result.member?.fullName || selectedStaff?.fullName || 'Staff Member';
        const roleName = (result.member?.role || selectedStaff?.role || 'staff').toUpperCase();
        showBanner(`Welcome ${memberName}! Logged in as ${roleName}.`);
        if (onUnlock) onUnlock();
      } else {
        setPinError(result.error || 'Incorrect PIN. Try 1111 for Owner or 1234 for Cashier.');
        setPin('');
      }
    } catch (err: any) {
      setPinError(err.message || 'Verification error');
      setPin('');
    } finally {
      setIsVerifying(false);
    }
  };


  // Emergency Lockout Recovery / Reset
  const handleResetLockout = async () => {
    setIsVerifying(false);
    await staffPinService.resetAllPinsAndLockout(businessId);
    const list = await staffPinService.getStaffList(businessId);
    setStaffList(list);
    const ownerMember = list.find((s) => s.role === 'owner') || list[0];
    setSelectedStaff(ownerMember);
    setPin('');
    setPinError(null);
  };

  // Business Sign In
  const handleOwnerSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    const res = await signInWithEmail(email, password);
    if (res.success) {
      useAuthStore.setState({ isStandaloneMode: true });
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('aura_standalone_mode', 'true');
      }
      usePosStore.setState({ isLocked: false, activeTab: 'CHECKOUT' });
      usePosStore.getState().refreshCatalogFromCloud();
      showBanner(`Welcome ${email}! Account authenticated and POS terminal unlocked.`);
      if (onUnlock) onUnlock();
    }
  };

  // 1-Tap Unlock for Connected Owner
  const handleUnlockAsConnectedOwner = () => {
    const ownerDisplayName = user?.fullName || currentBusiness?.ownerName || 'Store Owner';
    usePosStore.setState({
      isLocked: false,
      activeTab: 'CHECKOUT',
      cashierName: ownerDisplayName,
    });
    usePosStore.getState().refreshCatalogFromCloud();
    showBanner(`Welcome ${ownerDisplayName}! POS terminal unlocked.`);
    if (onUnlock) onUnlock();
  };

  // Helper to prefill Spice Cafe real credentials
  const handleFillSpiceCafe = () => {
    setEmail('spicecafe@gmail.com');
    setPassword('Spicecafe@123');
    clearError();
  };

  // Business Registration
  const handleOwnerRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    const targetBizName = bizName.trim();
    if (!targetBizName) {
      showBanner('Please provide a business or café name');
      return;
    }

    const targetAddress = bizAddress.trim();
    const targetOwnerName = ownerName.trim() || fullName.trim() || 'Store Owner';
    const targetOwnerPhone = ownerPhone.trim();
    const targetOwnerEmail = (ownerEmail || email).trim().toLowerCase();

    if (!targetOwnerEmail) {
      showBanner('Please provide owner email address');
      return;
    }

    if (!regPassword || regPassword.length < 6) {
      showBanner('Please provide an owner password (minimum 6 characters)');
      return;
    }

    const bizRes = await createBusiness(
      targetBizName,
      bizType,
      bizGstin.trim(),
      targetAddress,
      targetOwnerName,
      targetOwnerPhone,
      targetOwnerEmail,
      regPassword
    );

    if (bizRes.success) {
      useAuthStore.setState({ isStandaloneMode: true });
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('aura_standalone_mode', 'true');
      }
      usePosStore.setState({ isLocked: false, activeTab: 'CHECKOUT' });
      usePosStore.getState().refreshCatalogFromCloud();
      showBanner(`Business "${targetBizName}" registered in Supabase & POS terminal unlocked!`);
      if (onUnlock) onUnlock();
    }
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
              <KwikioAppIcon size={48} />
              <div>
                <h1 className="font-extrabold text-lg sm:text-xl text-slate-900 dark:text-white tracking-tight">
                  {currentBusiness?.name || 'Kwikio POS Terminal'}
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
          <div className="mt-4 px-3 sm:px-4 py-2 sm:py-2.5 rounded-2xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200/80 dark:border-teal-800/60 flex items-center justify-between text-xs text-teal-900 dark:text-teal-200">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" />
              <span className="font-medium text-[11px] sm:text-xs">
                Type <strong>1111</strong> for Owner, <strong>1234</strong> for Cashier, or tap <strong>1-Tap Login</strong>.
              </span>
            </div>
            <span className="hidden sm:inline text-[11px] font-semibold text-teal-600 dark:text-teal-400">
              Keyboard Enabled (0-9)
            </span>
          </div>

          {/* Mobile View Mode Switcher (Pinned at top on phones) */}
          <div className="flex md:hidden items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl mt-3 border border-slate-200 dark:border-slate-700/80">
            <button
              type="button"
              onClick={() => setMobileTab('PIN')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                mobileTab === 'PIN'
                  ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <span>🔢 Quick PIN Pad</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileTab('ROSTER')}
              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
                mobileTab === 'ROSTER'
                  ? 'bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <span>👥 1-Tap Staff ({staffList.length})</span>
            </button>
          </div>

          {/* Main 2-Column POS Login Body */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 sm:gap-6 mt-4 sm:mt-5 items-start">
            {/* Left Column: Staff Roster Grid with 1-Tap Login */}
            <div className={`md:col-span-7 flex flex-col ${mobileTab === 'PIN' ? 'hidden md:flex' : 'flex'}`}>
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

                        {isSelected && (
                          <div className="mt-2 pt-1.5 border-t border-teal-200 dark:border-teal-900 text-[10px] text-teal-700 dark:text-teal-300 font-bold flex items-center justify-center gap-1">
                            <Check className="w-3 h-3 text-teal-600" />
                            <span>Selected • Enter PIN on keypad</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Roster Demo Pin Pills */}
              <div className="mt-4 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs">
                <span className="font-bold text-slate-600 dark:text-slate-300 block mb-1.5">
                  Default Staff PIN Reference:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
                  <div
                    onClick={() => {
                      const member = staffList.find((s) => s.role === 'owner');
                      if (member) {
                        setSelectedStaff(member);
                        setPin('');
                        setPinError(null);
                      }
                    }}
                    className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-amber-400 transition-colors"
                  >
                    <span className="text-slate-400 block text-[10px]">OWNER</span>
                    <strong className="text-amber-600 dark:text-amber-400">PIN 1111</strong>
                  </div>
                  <div
                    onClick={() => {
                      const member = staffList.find((s) => s.role === 'cashier');
                      if (member) {
                        setSelectedStaff(member);
                        setPin('');
                        setPinError(null);
                      }
                    }}
                    className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-teal-400 transition-colors"
                  >
                    <span className="text-slate-400 block text-[10px]">CASHIER</span>
                    <strong className="text-teal-600 dark:text-teal-400">PIN 1234</strong>
                  </div>
                  <div
                    onClick={() => {
                      const member = staffList.find((s) => s.role === 'waiter');
                      if (member) {
                        setSelectedStaff(member);
                        setPin('');
                        setPinError(null);
                      }
                    }}
                    className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-purple-400 transition-colors"
                  >
                    <span className="text-slate-400 block text-[10px]">WAITER</span>
                    <strong className="text-purple-600 dark:text-purple-400">PIN 2222</strong>
                  </div>
                  <div
                    onClick={() => {
                      const member = staffList.find((s) => s.role === 'kitchen');
                      if (member) {
                        setSelectedStaff(member);
                        setPin('');
                        setPinError(null);
                      }
                    }}
                    className="p-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 cursor-pointer hover:border-orange-400 transition-colors"
                  >
                    <span className="text-slate-400 block text-[10px]">KITCHEN</span>
                    <strong className="text-orange-600 dark:text-orange-400">PIN 3333</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: 4-Digit Numeric PIN Pad */}
            <div className="col-span-12 md:col-span-5 flex flex-col items-center bg-slate-50 dark:bg-slate-800/50 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-700/80 w-full">
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
                    disabled={isVerifying && pin.length >= 4}
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

              {/* Keypad Security Caption */}
              <div className="w-full mt-4 pt-3 border-t border-slate-200 dark:border-slate-700/60 flex flex-col items-center">
                <span className="text-[11px] text-slate-400 font-medium">
                  Enter your assigned 4-digit PIN to authenticate
                </span>
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
            {user ? (
              <button
                onClick={() => setViewMode('STAFF_PIN')}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 px-2.5 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Staff Terminal</span>
              </button>
            ) : (
              <div className="flex items-center gap-2.5">
                <KwikioAppIcon size={34} />
                <div>
                  <span className="font-extrabold text-sm text-slate-900 dark:text-white block leading-tight">
                    Kwikio POS
                  </span>
                  <span className="text-[10px] text-teal-600 dark:text-teal-400 font-bold uppercase tracking-wider">
                    SaaS Cloud Terminal
                  </span>
                </div>
              </div>
            )}
            <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Store className="w-5 h-5" />
            </div>
          </div>

          <div className="mt-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {user ? 'Store & Business Management' : 'Sign In or Register Store'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {user
                ? 'Manage active business session or switch owner account.'
                : 'Sign in with your store credentials or create a new business to begin.'}
            </p>
          </div>

          {/* Tab Selector: Strictly Sign In & Register */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl mt-5">
            <button
              type="button"
              onClick={() => {
                clearError();
                setBizTab('SIGN_IN');
              }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                bizTab === 'SIGN_IN'
                  ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                clearError();
                setBizTab('REGISTER');
              }}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                bizTab === 'REGISTER'
                  ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              New Store / Register
            </button>
          </div>

          {authError && (
            <div className="mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          {/* TAB 1: OWNER SIGN IN & ACTIVE ACCOUNT */}
          {bizTab === 'SIGN_IN' && (
            <div className="mt-4 flex flex-col gap-3.5">
              {user && currentBusiness && !showSwitchForm ? (
                <div className="p-4 rounded-2xl bg-teal-50/80 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-xs flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                      {currentBusiness.name || 'Spice Cafe'}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200 font-bold text-[10px]">
                      Active Account
                    </span>
                  </div>

                  <p className="text-slate-700 dark:text-slate-300">
                    Owner: <strong>{user.fullName || currentBusiness.ownerName || 'Store Owner'}</strong> ({user.email})
                  </p>
                  <p className="text-slate-500 text-[11px]">
                    Type: {(currentBusiness.business_type || (currentBusiness as any).businessType || 'cafe').toUpperCase()} • Currency: {currentBusiness.currency || 'INR'} • Timezone: {currentBusiness.timezone || 'Asia/Kolkata'}
                  </p>

                  <div className="mt-2 pt-2 border-t border-teal-200 dark:border-teal-800/60 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={handleUnlockAsConnectedOwner}
                      className="w-full py-2.5 rounded-xl bg-teal-600 text-white font-bold text-xs hover:bg-teal-700 shadow-xs flex items-center justify-center gap-2"
                    >
                      <Unlock className="w-4 h-4" />
                      <span>Unlock POS Terminal as {user.fullName || currentBusiness.ownerName || 'Store Owner'} (Owner)</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowSwitchForm(true)}
                        className="flex-1 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs"
                      >
                        Sign in with Password
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          await signOut();
                          setShowSwitchForm(true);
                        }}
                        className="px-3 py-2 rounded-xl border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 font-bold text-xs flex items-center gap-1"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleOwnerSignIn} className="flex flex-col gap-3">
                  {/* Quick Fill Credentials Helper */}
                  <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs flex items-center justify-between gap-2">
                    <div>
                      <div className="font-bold text-amber-900 dark:text-amber-200">
                        Spice Cafe Real Credentials:
                      </div>
                      <div className="text-[11px] text-amber-700 dark:text-amber-300">
                        spicecafe@gmail.com • Spicecafe@123
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleFillSpiceCafe}
                      className="px-2.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] shadow-2xs shrink-0"
                    >
                      Fill Credentials
                    </button>
                  </div>

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
                        placeholder="spicecafe@gmail.com"
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
                        type={showSignInPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Spicecafe@123"
                        className="w-full h-11 pl-9 pr-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSignInPassword(!showSignInPassword)}
                        className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        title={showSignInPassword ? 'Hide password' : 'Show password'}
                      >
                        {showSignInPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="mt-1 h-11 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {authLoading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Unlock className="w-4 h-4" />
                        <span>Sign In & Unlock POS Terminal</span>
                      </>
                    )}
                  </button>

                  {user && showSwitchForm && (
                    <button
                      type="button"
                      onClick={() => setShowSwitchForm(false)}
                      className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline font-medium self-center"
                    >
                      Cancel & Return to Active Account
                    </button>
                  )}
                </form>
              )}
            </div>
          )}

          {/* TAB 2: REGISTER NEW STORE / BUSINESS */}
          {bizTab === 'REGISTER' && (
            <form onSubmit={handleOwnerRegister} className="mt-4 flex flex-col gap-3.5">
              {/* SECTION A: STORE / BUSINESS DETAILS */}
              <div className="flex flex-col gap-2.5 p-3 sm:p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <Store className="w-4 h-4 text-teal-600" />
                  <span>Store & Location Details</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Business / Café Name *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={bizName}
                      onChange={(e) => setBizName(e.target.value)}
                      placeholder="e.g. Spice Cafe & Roastery"
                      className="w-full h-10 px-3 pl-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                    />
                    <Store className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Business Type
                    </label>
                    <div className="relative">
                      <select
                        value={bizType}
                        onChange={(e) => setBizType(e.target.value as BusinessType)}
                        className="w-full h-10 px-3 pl-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                      >
                        <option value="cafe">Café & Coffee Bar</option>
                        <option value="bakery">Bakery & Patisserie</option>
                        <option value="qsr">Quick Service Restaurant (QSR)</option>
                        <option value="restaurant">Fine Dining Restaurant</option>
                        <option value="food_truck">Food Truck</option>
                      </select>
                      <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      GSTIN / Tax ID (Optional)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={bizGstin}
                        onChange={(e) => setBizGstin(e.target.value)}
                        placeholder="29AABCS1234F1Z8"
                        className="w-full h-10 px-3 pl-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white uppercase focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                      />
                      <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Store / Café Address *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={bizAddress}
                      onChange={(e) => setBizAddress(e.target.value)}
                      placeholder="e.g. Shop 4, 100ft Road, Indiranagar, Bengaluru, Karnataka"
                      className="w-full h-10 px-3 pl-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                    />
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  </div>
                </div>
              </div>

              {/* SECTION B: OWNER & CONTACT DETAILS */}
              <div className="flex flex-col gap-2.5 p-3 sm:p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <User className="w-4 h-4 text-teal-600" />
                  <span>Owner Contact Details</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Owner Full Name *
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        required
                        value={ownerName || fullName}
                        onChange={(e) => {
                          setOwnerName(e.target.value);
                          setFullName(e.target.value);
                        }}
                        placeholder="e.g. Jay Mistry"
                        className="w-full h-10 px-3 pl-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                      />
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Owner Phone / Mobile *
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        required
                        value={ownerPhone}
                        onChange={(e) => setOwnerPhone(e.target.value)}
                        placeholder="e.g. +91 98765 43210"
                        className="w-full h-10 px-3 pl-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                      />
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Owner Email Address *
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        required
                        value={ownerEmail || email}
                        onChange={(e) => {
                          setOwnerEmail(e.target.value);
                          setEmail(e.target.value);
                        }}
                        placeholder="e.g. owner@mycafe.com"
                        className="w-full h-10 px-3 pl-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                      />
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                        Owner Account Password *
                      </label>
                      <span className="text-[10px] text-teal-600 dark:text-teal-400 font-medium">Min 6 chars</span>
                    </div>
                    <div className="relative">
                      <input
                        type={showRegPassword ? 'text' : 'password'}
                        required
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="e.g. CafeOwner@2025"
                        className="w-full h-10 px-3 pl-9 pr-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                      />
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5 rounded-md"
                        title={showRegPassword ? 'Hide password' : 'Show password'}
                      >
                        {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="mt-1 h-11 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {authLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <span>Create Business & Unlock Terminal</span>
                )}
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
