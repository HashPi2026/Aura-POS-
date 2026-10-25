import React, { useState, useEffect } from 'react';
import {
  Coffee,
  Building2,
  Store,
  AlertCircle,
  CheckCircle2,
  Mail,
  KeyRound,
  LogOut,
  RefreshCw,
  Sparkles,
  Unlock,
  MapPin,
  Phone,
  User,
  FileText,
  Eye,
  EyeOff,
  ShieldCheck,
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { usePosStore } from '../store/usePosStore';
import { BusinessType } from '../types/database';
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
    signOut,
    createBusiness,
    clearError,
  } = useAuthStore();

  const { showBanner } = usePosStore();

  // Tabs: 'SIGN_IN' (default) or 'REGISTER' (new store)
  const [activeTab, setActiveTab] = useState<'SIGN_IN' | 'REGISTER'>('SIGN_IN');
  const [showSwitchForm, setShowSwitchForm] = useState(false);

  // Sign In Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showSignInPassword, setShowSignInPassword] = useState(false);

  // Business Registration Form State
  const [bizName, setBizName] = useState('');
  const [bizType, setBizType] = useState<BusinessType>('cafe');
  const [bizAddress, setBizAddress] = useState('');
  const [bizGstin, setBizGstin] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Sync owner info with current user if already logged in
  useEffect(() => {
    if (user) {
      if (!ownerName) setOwnerName(user.fullName || '');
      if (!ownerEmail) setOwnerEmail(user.email || '');
    }
  }, [user]);

  // Handle Sign In with Email or Employee Username + Password
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    const cleanInput = email.trim();
    if (!cleanInput) {
      showBanner('Please enter your email or employee username.');
      return;
    }

    if (!password) {
      showBanner('Please enter your password.');
      return;
    }

    const res = await signInWithEmail(cleanInput, password);
    if (res.success) {
      useAuthStore.setState({ isStandaloneMode: true });
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('aura_standalone_mode', 'true');
      }
      usePosStore.setState({ isLocked: false, activeTab: 'CHECKOUT' });
      usePosStore.getState().refreshProducts();

      const displayName = useAuthStore.getState().user?.fullName || cleanInput;
      showBanner(`Welcome ${displayName}! POS terminal unlocked.`);
      if (onUnlock) onUnlock();
    }
  };

  // Quick Unlock for already-connected user
  const handleEnterPos = () => {
    const displayName = user?.fullName || currentBusiness?.ownerName || 'Store User';
    usePosStore.setState({
      isLocked: false,
      activeTab: 'CHECKOUT',
      cashierName: displayName,
    });
    usePosStore.getState().refreshProducts();
    showBanner(`Welcome ${displayName}! Opening POS terminal...`);
    if (onUnlock) onUnlock();
  };

  // Pre-fill quick credentials
  const handleFillCafeCoffee = () => {
    setEmail('cafecoffee@gmail.com');
    setPassword('cafecoffee@2026');
    clearError();
  };

  const handleFillSpiceCafe = () => {
    setEmail('spicecafe@gmail.com');
    setPassword('Spicecafe@123');
    clearError();
  };

  // Handle New Business Registration
  const handleRegisterBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    const targetBizName = bizName.trim();
    if (!targetBizName) {
      showBanner('Please provide a business or store name');
      return;
    }

    const targetAddress = bizAddress.trim();
    const targetOwnerName = ownerName.trim() || 'Store Owner';
    const targetOwnerPhone = ownerPhone.trim();
    const targetOwnerEmail = (ownerEmail || email).trim().toLowerCase();

    if (!targetOwnerEmail) {
      showBanner('Please provide an email address');
      return;
    }

    if (!regPassword || regPassword.length < 6) {
      showBanner('Please provide a password (minimum 6 characters)');
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
      usePosStore.getState().refreshProducts();
      showBanner(`Store "${targetBizName}" registered successfully & POS launched!`);
      if (onUnlock) onUnlock();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-3 sm:p-6 select-none overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-xl w-full p-5 sm:p-8 flex flex-col animate-scaleUp my-auto">
        
        {/* Brand Header */}
        <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
          <KwikioAppIcon size={46} />
          <div className="flex-1">
            <h1 className="font-extrabold text-lg sm:text-xl text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <span>Kwikio POS Terminal</span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200">
                Cloud Synced
              </span>
            </h1>
            <p className="text-xs text-slate-500">
              Offline-First Architecture • Supabase Cloud & IndexedDB Local Storage
            </p>
          </div>
        </div>

        {/* Tab Switcher: Sign In vs New Store / Register */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl mt-4 border border-slate-200 dark:border-slate-700/80">
          <button
            type="button"
            onClick={() => {
              setActiveTab('SIGN_IN');
              clearError();
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'SIGN_IN'
                ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('REGISTER');
              clearError();
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'REGISTER'
                ? 'bg-white dark:bg-slate-900 text-teal-700 dark:text-teal-300 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            New Store / Register
          </button>
        </div>

        {/* Error Alert */}
        {authError && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{authError}</span>
          </div>
        )}

        {/* ========================================================
            TAB 1: SIGN IN (EMAIL OR EMPLOYEE USERNAME + PASSWORD)
           ======================================================== */}
        {activeTab === 'SIGN_IN' && (
          <div className="mt-4 flex flex-col gap-3.5">
            {/* If user is already authenticated and has active business */}
            {user && currentBusiness && !showSwitchForm ? (
              <div className="p-4 rounded-2xl bg-teal-50/80 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-xs flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-sm text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                    {currentBusiness.name || 'Store Terminal'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200 font-bold text-[10px]">
                    Active Session
                  </span>
                </div>

                <div className="space-y-0.5 text-slate-700 dark:text-slate-300">
                  <p>
                    Logged in as: <strong>{user.fullName || 'User'}</strong> ({user.email})
                  </p>
                  <p className="text-slate-500 text-[11px]">
                    Role: <span className="font-semibold uppercase text-teal-700 dark:text-teal-300">{user.role || 'owner'}</span> • Business ID: <code className="font-mono text-[10px]">{currentBusiness.id}</code>
                  </p>
                </div>

                <div className="mt-2 pt-2 border-t border-teal-200 dark:border-teal-800/60 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={handleEnterPos}
                    className="w-full py-2.5 rounded-xl bg-teal-600 text-white font-bold text-xs hover:bg-teal-700 shadow-xs flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
                  >
                    <Unlock className="w-4 h-4" />
                    <span>Enter POS Terminal (Main Screen)</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowSwitchForm(true)}
                      className="flex-1 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors"
                    >
                      Sign In with Another Account
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        await signOut();
                        setShowSwitchForm(true);
                      }}
                      className="px-3 py-2 rounded-xl border border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 font-bold text-xs flex items-center gap-1 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSignIn} className="flex flex-col gap-3">
                {/* Quick Credentials Helpers for fast testing */}
                <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs flex flex-col gap-2">
                  <div className="font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>Quick Sign-In Credentials:</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleFillCafeCoffee}
                      className="px-2.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] shadow-2xs transition-colors"
                    >
                      Fill cafecoffee@gmail.com
                    </button>
                    <button
                      type="button"
                      onClick={handleFillSpiceCafe}
                      className="px-2.5 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold text-[11px] transition-colors"
                    >
                      Fill spicecafe@gmail.com
                    </button>
                  </div>
                </div>

                {/* Email or Employee Username Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Email or Employee Username
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                    <input
                      type="text"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. cafecoffee@gmail.com or cashier1"
                      className="w-full h-11 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>

                {/* Password Input */}
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
                      placeholder="Enter account password"
                      className="w-full h-11 pl-9 pr-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
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
                  className="mt-1 h-11 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.99]"
                >
                  {authLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Unlock className="w-4 h-4" />
                      <span>Sign In & Open POS Terminal</span>
                    </>
                  )}
                </button>

                {user && showSwitchForm && (
                  <button
                    type="button"
                    onClick={() => setShowSwitchForm(false)}
                    className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline font-medium self-center mt-1"
                  >
                    Cancel & Return to Active Account
                  </button>
                )}
              </form>
            )}
          </div>
        )}

        {/* ========================================================
            TAB 2: REGISTER NEW STORE / BUSINESS
           ======================================================== */}
        {activeTab === 'REGISTER' && (
          <form onSubmit={handleRegisterBusiness} className="mt-4 flex flex-col gap-3.5">
            {/* Store & Location Details */}
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
                    placeholder="e.g. Cafe Coffee"
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
                      placeholder="24AABCS1234F1Z8"
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
                    placeholder="e.g. Ring Road, Surat, Gujarat"
                    className="w-full h-10 px-3 pl-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                  />
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
              </div>
            </div>

            {/* Owner Contact Details */}
            <div className="flex flex-col gap-2.5 p-3 sm:p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                <User className="w-4 h-4 text-teal-600" />
                <span>Owner Contact & Login</span>
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
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      placeholder="e.g. Cafe Owner"
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
                      placeholder="e.g. cafecoffee@gmail.com"
                      className="w-full h-10 px-3 pl-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                    />
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Account Password *
                    </label>
                    <span className="text-[10px] text-teal-600 dark:text-teal-400 font-medium">Min 6 chars</span>
                  </div>
                  <div className="relative">
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Enter password"
                      className="w-full h-10 px-3 pl-9 pr-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-teal-500"
                    />
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
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
              className="mt-1 h-11 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.99]"
            >
              {authLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Store className="w-4 h-4" />
                  <span>Register Store & Open POS Terminal</span>
                </>
              )}
            </button>
          </form>
        )}

      </div>
    </div>
  );
};
