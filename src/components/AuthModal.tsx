import React, { useState } from 'react';
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
} from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { BusinessType } from '../types/database';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const {
    user,
    currentBusiness,
    userBusinesses,
    currentRole,
    isConfigured,
    isLoading,
    authError,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    createBusiness,
    selectBusiness,
    clearError,
  } = useAuthStore();

  const [mode, setMode] = useState<'LOGIN' | 'SIGNUP' | 'NEW_BUSINESS'>('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  
  // New Business Form
  const [bizName, setBizName] = useState('');
  const [bizType, setBizType] = useState<BusinessType>('cafe');
  const [bizGstin, setBizGstin] = useState('');

  if (!isOpen) return null;

  const handleSubmitAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    if (mode === 'LOGIN') {
      const res = await signInWithEmail(email, password);
      if (res.success) {
        onClose();
      }
    } else if (mode === 'SIGNUP') {
      const res = await signUpWithEmail(email, password, fullName);
      if (res.success) {
        setMode('NEW_BUSINESS');
      }
    }
  };

  const handleCreateBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
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
                {user ? 'Business & Staff Profile' : 'Aura POS Cloud Authentication'}
              </h2>
              <p className="text-xs text-slate-500">
                {user ? `Logged in as ${user.email}` : 'Secure Supabase Auth & Multi-Tenant Access'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Configuration Notice if .env is missing */}
        {!isConfigured && (
          <div className="mt-4 p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-xs flex gap-2.5 items-start text-amber-900 dark:text-amber-200">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <strong>Supabase Project Pending:</strong>
              <p className="mt-0.5 text-[11px] text-amber-800 dark:text-amber-300">
                To connect your live cloud database, set <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> in <code>.env</code>. The POS will run in reliable offline-first local mode in the meantime.
              </p>
            </div>
          </div>
        )}

        {authError && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
            {authError}
          </div>
        )}

        {/* 1. Logged In User State: Multi-Business Switching & Status */}
        {user ? (
          <div className="mt-5 flex flex-col gap-4">
            {/* Active Business Badge */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Business</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-light text-brand uppercase">
                  Role: {currentRole || 'Staff'}
                </span>
              </div>

              {currentBusiness ? (
                <div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                    <Store className="w-4 h-4 text-brand" />
                    <span>{currentBusiness.name}</span>
                  </h3>
                  <p className="text-xs text-slate-500 capitalize">
                    {currentBusiness.business_type} • Currency: {currentBusiness.currency}
                    {currentBusiness.tax_identifier && ` • GSTIN: ${currentBusiness.tax_identifier}`}
                  </p>
                </div>
              ) : (
                <div className="text-xs text-amber-600 dark:text-amber-400">
                  No active business selected. Create or join one below.
                </div>
              )}
            </div>

            {/* Business Switcher */}
            {userBusinesses.length > 1 && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                  Switch Business:
                </label>
                <div className="grid grid-cols-1 gap-2 max-h-36 overflow-y-auto pr-1">
                  {userBusinesses.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => selectBusiness(b.id)}
                      className={`p-2.5 rounded-xl border text-left text-xs font-semibold flex items-center justify-between transition-all ${
                        currentBusiness?.id === b.id
                          ? 'border-brand bg-brand/5 text-brand dark:text-white'
                          : 'border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <span className="truncate">{b.name}</span>
                      {currentBusiness?.id === b.id && <CheckCircle2 className="w-4 h-4 text-brand" />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Actions: Add Business / Sign Out */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setMode('NEW_BUSINESS')}
                className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center gap-1.5"
              >
                <PlusCircle className="w-3.5 h-3.5 text-brand" />
                <span>Add Business</span>
              </button>

              <button
                onClick={signOut}
                className="py-2.5 px-4 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/50 text-xs font-bold text-rose-700 dark:text-rose-300 hover:bg-rose-100 flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        ) : mode === 'NEW_BUSINESS' ? (
          /* 2. New Business Onboarding */
          <form onSubmit={handleCreateBusiness} className="mt-5 flex flex-col gap-3.5">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Create New Business Account
            </h3>

            <div>
              <label className="text-[11px] font-bold text-slate-500 mb-1 block">Business Name</label>
              <div className="relative">
                <Building2 className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Aura Coffee Roasters"
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
              <button
                type="button"
                onClick={() => setMode('LOGIN')}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
              >
                Back
              </button>
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
          /* 3. Login / Signup Form */
          <form onSubmit={handleSubmitAuth} className="mt-5 flex flex-col gap-3.5">
            {mode === 'SIGNUP' && (
              <div>
                <label className="text-[11px] font-bold text-slate-500 mb-1 block">Full Name</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="Barista / Manager Name"
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
                  placeholder="owner@auracafe.com"
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
              disabled={isLoading || !isConfigured}
              className="mt-2 py-2.5 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-bold shadow-xs transition-all disabled:opacity-50"
            >
              {isLoading
                ? 'Authenticating...'
                : mode === 'LOGIN'
                ? 'Sign In to Business'
                : 'Create Account & Continue'}
            </button>

            <div className="text-center pt-2 text-xs text-slate-500">
              {mode === 'LOGIN' ? (
                <>
                  New business owner?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      clearError();
                      setMode('SIGNUP');
                    }}
                    className="font-bold text-brand hover:underline"
                  >
                    Sign Up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
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
