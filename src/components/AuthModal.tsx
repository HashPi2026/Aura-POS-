import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Store,
  Mail,
  Lock,
  User as UserIcon,
  Building2,
  Coffee,
  ShoppingBag,
  Hotel,
  UtensilsCrossed,
  LogOut,
  AlertCircle,
  X,
  PlusCircle,
  CheckCircle2,
  MailCheck,
  ArrowLeft,
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { BusinessType } from '../types/database';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  isAuthGate?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, isAuthGate = false }) => {
  const {
    user,
    currentBusiness,
    userBusinesses,
    currentRole,
    isConfigured,
    isLoading,
    authError,
    pendingEmailConfirmation,
    needsOnboarding,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    createBusiness,
    selectBusiness,
    clearError,
    clearPendingConfirmation,
  } = useAuthStore();

  const [mode, setMode] = useState<'LOGIN' | 'SIGNUP' | 'NEW_BUSINESS'>('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  // New Business Form
  const [bizName, setBizName] = useState('');
  const [bizType, setBizType] = useState<BusinessType>('cafe');
  const [bizGstin, setBizGstin] = useState('');

  useEffect(() => {
    if (user && needsOnboarding) {
      setMode('NEW_BUSINESS');
    }
  }, [user, needsOnboarding]);

  if (!isOpen) return null;

  const handleSubmitAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    if (mode === 'LOGIN') {
      const res = await signInWithEmail(email, password);
      if (res.success) {
        if (!isAuthGate) {
          onClose();
        }
      }
    } else if (mode === 'SIGNUP') {
      const res = await signUpWithEmail(email, password, fullName);
      if (res.success) {
        if (res.needsConfirmation) {
          // Stays on modal, renders the "Check your email" confirmation screen!
        } else {
          setMode('NEW_BUSINESS');
        }
      }
    }
  };

  const handleCreateBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    if (!user) {
      useAuthStore.setState({
        authError: 'Please sign in with your verified owner account first to create a business.',
      });
      setMode('LOGIN');
      return;
    }

    const res = await createBusiness(bizName, bizType, bizGstin);
    if (res.success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 select-none">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-7 flex flex-col border border-slate-200 dark:border-slate-800 animate-scaleUp">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-brand text-white flex items-center justify-center font-bold shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base text-slate-900 dark:text-white">
                {user ? (needsOnboarding ? 'Create Your Business' : 'Business & Staff Profile') : 'Aura POS Cloud Authentication'}
              </h2>
              <p className="text-xs text-slate-500">
                {user ? `Logged in as ${user.email}` : 'Secure Supabase Auth & Multi-Tenant Access'}
              </p>
            </div>
          </div>

          {!isAuthGate && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Configuration Notice if .env is missing */}
        {!isConfigured && (
          <div className="mt-4 p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-xs flex gap-2.5 items-start text-amber-900 dark:text-amber-200">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <strong>Supabase Project Unconfigured:</strong>
              <p className="mt-0.5 text-[11px] text-amber-800 dark:text-amber-300">
                Missing <code>VITE_SUPABASE_URL</code> or <code>VITE_SUPABASE_ANON_KEY</code>. The POS terminal is running in local offline mode.
              </p>
            </div>
          </div>
        )}

        {authError && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
            {authError}
          </div>
        )}

        {/* 1. Email Confirmation Screen (When Supabase sends confirmation link) */}
        {pendingEmailConfirmation ? (
          <div className="mt-5 flex flex-col items-center text-center p-4 rounded-2xl bg-teal-50/60 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800">
            <div className="w-12 h-12 rounded-full bg-teal-100 dark:bg-teal-900/60 text-brand flex items-center justify-center mb-3">
              <MailCheck className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Check your email to confirm your account
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
              We sent a verification link to <strong className="font-semibold text-slate-900 dark:text-white">{pendingEmailConfirmation}</strong>.
            </p>
            <p className="text-[11px] text-slate-500 mt-2">
              Please click the link in your email to activate your account. Once confirmed, sign in to create your café business.
            </p>

            <button
              onClick={() => {
                clearPendingConfirmation();
                setMode('LOGIN');
              }}
              className="mt-5 w-full py-2.5 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sign In</span>
            </button>
          </div>
        ) : user && !needsOnboarding && mode !== 'NEW_BUSINESS' ? (
          /* 2. Logged-in Staff & Business Switcher */
          <div className="mt-5 flex flex-col gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Current Tenant</span>
                <h3 className="font-bold text-base text-slate-900 dark:text-white mt-0.5">
                  {currentBusiness?.name || 'No Business Selected'}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold capitalize bg-teal-100 dark:bg-teal-900/60 text-brand">
                    Role: {currentRole || 'Member'}
                  </span>
                  <span className="text-[11px] text-slate-500 capitalize">
                    {currentBusiness?.business_type || 'cafe'}
                  </span>
                </div>
              </div>
              <Store className="w-7 h-7 text-slate-400" />
            </div>

            {/* Business List */}
            {userBusinesses.length > 1 && (
              <div>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">Switch Business</span>
                <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto">
                  {userBusinesses.map((biz) => (
                    <button
                      key={biz.id}
                      onClick={() => selectBusiness(biz.id)}
                      className={`p-2.5 rounded-xl border text-left text-xs font-bold flex items-center justify-between transition-colors ${
                        currentBusiness?.id === biz.id
                          ? 'bg-brand/10 border-brand text-brand'
                          : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <span>{biz.name}</span>
                      {currentBusiness?.id === biz.id && <CheckCircle2 className="w-4 h-4 text-brand" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setMode('NEW_BUSINESS')}
                className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 flex items-center justify-center gap-1.5"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Add Business</span>
              </button>
              <button
                onClick={signOut}
                className="py-2 px-3 rounded-xl border border-rose-200 dark:border-rose-900/50 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        ) : mode === 'NEW_BUSINESS' ? (
          /* 3. New Business Onboarding */
          <form onSubmit={handleCreateBusiness} className="mt-5 flex flex-col gap-3.5">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Create New Business Account
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Sets up your café menu, register floor plan, and fiscal settings.
              </p>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 mb-1 block">Business Name</label>
              <div className="relative">
                <Building2 className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Spice Cafe"
                  value={bizName}
                  onChange={(e) => setBizName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-brand"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 mb-1 block">Business Category</label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {(['cafe', 'restaurant', 'retail', 'hotel'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setBizType(type)}
                    className={`py-2 px-3 rounded-xl border font-bold capitalize flex items-center justify-center gap-1.5 transition-all ${
                      bizType === type
                        ? 'bg-brand text-white border-brand shadow-xs'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {type === 'cafe' && <Coffee className="w-3.5 h-3.5" />}
                    {type === 'restaurant' && <UtensilsCrossed className="w-3.5 h-3.5" />}
                    {type === 'retail' && <ShoppingBag className="w-3.5 h-3.5" />}
                    {type === 'hotel' && <Hotel className="w-3.5 h-3.5" />}
                    <span>{type}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 mb-1 block">GSTIN / Tax ID (Optional)</label>
              <input
                type="text"
                placeholder="29AAAAA0000A1Z5"
                value={bizGstin}
                onChange={(e) => setBizGstin(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono font-medium text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-brand"
              />
            </div>

            <div className="flex items-center gap-2 mt-2">
              {user && !needsOnboarding && (
                <button
                  type="button"
                  onClick={() => setMode('LOGIN')}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                >
                  Back
                </button>
              )}
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 py-2.5 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-bold shadow-xs transition-all disabled:opacity-50"
              >
                {isLoading ? 'Creating...' : 'Create Business'}
              </button>
            </div>
          </form>
        ) : (
          /* 4. Login / Signup Form */
          <form onSubmit={handleSubmitAuth} className="mt-5 flex flex-col gap-3.5">
            {mode === 'SIGNUP' && (
              <div>
                <label className="text-[11px] font-bold text-slate-500 mb-1 block">Full Name</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="Owner / Cashier Name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-brand"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="text-[11px] font-bold text-slate-500 mb-1 block">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="email"
                  required
                  placeholder="owner@cafe.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-brand"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-500 mb-1 block">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-medium text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-brand"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 w-full py-2.5 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-bold shadow-xs transition-all disabled:opacity-50"
            >
              {isLoading ? 'Processing...' : mode === 'LOGIN' ? 'Sign In' : 'Sign Up as Owner'}
            </button>

            <div className="flex items-center justify-between text-xs pt-1">
              {mode === 'LOGIN' ? (
                <>
                  <span className="text-slate-500">Need a new business account?</span>
                  <button
                    type="button"
                    onClick={() => {
                      clearError();
                      setMode('SIGNUP');
                    }}
                    className="font-bold text-brand hover:underline"
                  >
                    Create Account
                  </button>
                </>
              ) : (
                <>
                  <span className="text-slate-500">Already registered?</span>
                  <button
                    type="button"
                    onClick={() => {
                      clearError();
                      setMode('LOGIN');
                    }}
                    className="font-bold text-brand hover:underline"
                  >
                    Sign In
                  </button>
                </>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
