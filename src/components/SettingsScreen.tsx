import React, { useState } from 'react';
import {
  Printer,
  Wifi,
  WifiOff,
  AlertTriangle,
  Store,
  Lock,
  Moon,
  Sun,
  ShieldCheck,
  Coffee,
  UtensilsCrossed,
  Check,
  Package,
  ArrowRight,
  Smartphone,
  Download,
  ExternalLink,
  Cloud,
  UserCheck,
  Users,
  Plus,
  KeyRound,
  UserPlus,
  Trash2,
  QrCode,
  Copy,
  Share2,
  Tablet,
  Monitor,
  Activity,
  Server,
  CheckCircle2,
  XCircle,
  RefreshCw,
  AlertCircle,
  Cpu,
} from 'lucide-react';
import { usePosStore } from '../store/usePosStore';
import { useAuthStore } from '../store/useAuthStore';
import { ThemeSelector } from './ThemeSelector';
import { AuthModal } from './AuthModal';
import { BusinessType } from '../db/indexedDb';
import { staffPinService, StaffPinMember } from '../services/staffPinService';
import { UserRole } from '../types/database';
import { ThermalPrinterModal } from './ThermalPrinterModal';
import { isSupabaseConfigured, getSupabaseHostname, supabase, logCloud, logCloudError } from '../lib/supabase';
import { getEnrolledDeviceId, enrollDevice } from '../services/deviceEnrollmentService';
import { backgroundSyncService, SyncStatusInfo } from '../services/BackgroundSyncService';
import { formatDateTime } from '../utils/format';

export const SettingsScreen: React.FC = () => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showPrinterModal, setShowPrinterModal] = useState(false);
  const { user, currentBusiness, currentRole, isConfigured } = useAuthStore();
  const {
    storeName,
    storeAddress,
    storeGstin,
    counterName,
    cashierName,
    printerConnected,
    printerModel,
    togglePrinter,
    printReceipt,
    isOnline,
    toggleOnline,
    simulateServerFailure,
    toggleServerFailure,
    isDarkMode,
    toggleDarkMode,
    lockTerminal,
    showBanner,
    setActiveTab,
    triggerInstallPrompt,
  } = usePosStore();

  // Multi-Tenant Staff Management State
  const [staffList, setStaffList] = useState<StaffPinMember[]>([]);
  const [showAddStaffModal, setShowAddStaffModal] = useState(false);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<UserRole>('cashier');
  const [newStaffPin, setNewStaffPin] = useState('');
  const [isCreatingStaff, setIsCreatingStaff] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Phase 1 Cloud Status & Diagnostics State
  const [enrolledDeviceId, setEnrolledDeviceId] = useState<string | null>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<{
    success: boolean;
    message: string;
    code?: string;
    details?: string;
  } | null>(null);
  const [isEnrollingDevice, setIsEnrollingDevice] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatusInfo>(() => backgroundSyncService.getStatus());

  React.useEffect(() => {
    return backgroundSyncService.subscribe((status) => {
      setSyncStatus(status);
    });
  }, []);

  React.useEffect(() => {
    if (currentBusiness?.id) {
      getEnrolledDeviceId(currentBusiness.id).then((id) => setEnrolledDeviceId(id));
    } else {
      setEnrolledDeviceId(null);
    }
  }, [currentBusiness?.id]);

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setConnectionTestResult(null);
    logCloud('Initiating connection diagnostic test...');

    try {
      if (!isSupabaseConfigured()) {
        setConnectionTestResult({
          success: false,
          message: 'Cloud is not configured. VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are missing.',
          code: 'CLOUD_NOT_CONFIGURED',
        });
        setIsTestingConnection(false);
        return;
      }

      // 1. Read session
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) {
        logCloudError('Connection diagnostic auth session error:', sessionErr);
        setConnectionTestResult({
          success: false,
          message: `Session check failed: ${sessionErr.message}`,
          code: sessionErr.name || 'SESSION_ERROR',
        });
        setIsTestingConnection(false);
        return;
      }

      const startTime = Date.now();
      // 2. Harmless query limited to 1 row
      const { data, error, status } = await supabase.from('businesses').select('id, name').limit(1);
      const latency = Date.now() - startTime;

      if (error) {
        logCloudError('Connection diagnostic database select error:', error);
        setConnectionTestResult({
          success: false,
          message: error.message || 'Database query failed.',
          code: error.code || String(status),
          details: `Latency: ${latency}ms • Auth User: ${sessionData?.session?.user.email || 'None'}`,
        });
      } else {
        logCloud(`Connection diagnostic succeeded. Latency: ${latency}ms.`);
        setConnectionTestResult({
          success: true,
          message: `Connected successfully! Ping latency: ${latency}ms. Accessible records: ${data ? data.length : 0}.`,
          details: `Host: ${getSupabaseHostname()} • Session: ${sessionData?.session?.user.email || 'Active'}`,
        });
      }
    } catch (err: any) {
      logCloudError('Unexpected exception during connection test:', err);
      setConnectionTestResult({
        success: false,
        message: err.message || 'Network exception encountered during test.',
        code: 'NETWORK_ERROR',
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleEnrollTerminal = async () => {
    if (!currentBusiness?.id) {
      showBanner('Please select or create an active business tenant first.');
      return;
    }
    setIsEnrollingDevice(true);
    const res = await enrollDevice(currentBusiness.id, undefined, counterName || 'Counter Terminal 1');
    setIsEnrollingDevice(false);
    if (res.success && res.deviceId) {
      setEnrolledDeviceId(res.deviceId);
      showBanner(`Terminal successfully enrolled! Device UUID: ${res.deviceId.slice(0, 8)}...`);
    } else {
      showBanner(`Terminal enrollment failed: ${res.error}`);
    }
  };

  const liveAppUrl = typeof window !== 'undefined' && window.location.href
    ? (window.location.origin.includes('localhost')
        ? window.location.origin
        : 'https://ais-pre-ji3fw7pbjdyz6ephhubu3h-672731157117.asia-southeast1.run.app')
    : 'https://ais-pre-ji3fw7pbjdyz6ephhubu3h-672731157117.asia-southeast1.run.app';

  const businessId = currentBusiness?.id || '00000000-0000-0000-0000-000000000001';

  const loadStaff = async () => {
    const list = await staffPinService.getStaffList(businessId);
    setStaffList(list);
  };

  React.useEffect(() => {
    loadStaff();
  }, [businessId]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(liveAppUrl);
      setCopiedLink(true);
      showBanner('Link copied! Open on phone, tablet, or secondary counter.');
      setTimeout(() => setCopiedLink(false), 3000);
    } catch (_) {
      showBanner(liveAppUrl);
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim()) {
      showBanner('Please provide staff member name');
      return;
    }
    if (newStaffPin.length < 4 || newStaffPin.length > 6) {
      showBanner('PIN must be 4 to 6 digits');
      return;
    }

    setIsCreatingStaff(true);
    const res = await staffPinService.createStaffProfile(
      businessId,
      newStaffName.trim(),
      newStaffRole,
      newStaffPin
    );
    setIsCreatingStaff(false);

    if (res.success) {
      showBanner(`Staff profile for "${newStaffName}" created!`);
      setNewStaffName('');
      setNewStaffPin('');
      setShowAddStaffModal(false);
      await loadStaff();
    } else {
      showBanner(res.error || 'Could not create staff profile');
    }
  };

  const handleDeleteStaff = async (memberId: string, name: string) => {
    if (!confirm(`Are you sure you want to remove staff member "${name}"?`)) {
      return;
    }
    const res = await staffPinService.deleteStaffProfile(businessId, memberId);
    if (res.success) {
      showBanner(`Staff profile "${name}" removed.`);
      await loadStaff();
    } else {
      showBanner(res.error || 'Could not delete staff member');
    }
  };

  const handleTestPrint = () => {
    if (!printerConnected) {
      showBanner('Printer is disconnected! Enable printer toggle first.');
      return;
    }
    showBanner('Sending alignment test slip to Bluetooth printer (Aura-BT58P)...');
    try {
      window.print();
    } catch (_) {}
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 lg:p-6 bg-slate-100 dark:bg-slate-950 flex flex-col gap-5 max-w-4xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Coffee className="w-6 h-6 text-brand" />
            <span>Cafe Terminal & Hardware Setup</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {storeName} • {counterName} ({storeAddress})
          </p>
        </div>
      </div>

      {/* 0A. Menu & Products Manager Shortcut */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-light text-brand flex items-center justify-center shrink-0">
            <Coffee className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Cafe Menu, Roasts & Prices
            </h3>
            <p className="text-xs text-slate-500">
              Add new coffees, tea infusions, bakery pastries, sandwiches, and manage prices.
            </p>
          </div>
        </div>

        <button
          onClick={() => setActiveTab('PRODUCTS')}
          className="h-10 px-4 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all active:scale-[0.98] shrink-0"
        >
          <span>Open Cafe Menu</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* 0B. Supabase Cloud Status & Diagnostics Panel (Owner / Manager) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isSupabaseConfigured() && user
                ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                : 'bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400'
            }`}>
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Cloud Status & Diagnostics
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  isSupabaseConfigured()
                    ? (user ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300')
                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                }`}>
                  {isSupabaseConfigured() ? (user ? 'Configured • Online' : 'Configured • Sign-in Required') : 'Cloud Not Configured (Local-Only)'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {currentBusiness
                  ? `Active Tenant: ${currentBusiness.name} • Role: ${(currentRole || 'cashier').toUpperCase()}`
                  : 'Multi-tenant cloud persistence, staff roles, and automatic real-time outbox sync.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <button
              onClick={handleTestConnection}
              disabled={isTestingConnection}
              className="h-9 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-teal-600 dark:text-teal-400 ${isTestingConnection ? 'animate-spin' : ''}`} />
              <span>{isTestingConnection ? 'Testing...' : 'Test Connection'}</span>
            </button>

            <button
              onClick={() => setShowAuthModal(true)}
              className="h-9 px-3.5 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all active:scale-[0.98] shrink-0"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>{user ? 'Manage Account' : 'Sign In'}</span>
            </button>
          </div>
        </div>

        {/* Test Connection Result Banner */}
        {connectionTestResult && (
          <div className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 transition-all ${
            connectionTestResult.success
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
          }`}>
            {connectionTestResult.success ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <div className="font-bold flex items-center gap-2">
                <span>{connectionTestResult.success ? 'Connection Healthy' : `Connection Error [${connectionTestResult.code || 'FAIL'}]`}</span>
              </div>
              <p className="mt-0.5">{connectionTestResult.message}</p>
              {connectionTestResult.details && (
                <p className="text-[11px] opacity-75 mt-0.5 font-mono">{connectionTestResult.details}</p>
              )}
            </div>
          </div>
        )}

        {/* Diagnostics Data Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
          {/* 1. Configured */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Supabase Config</span>
            <span className={`font-semibold mt-0.5 inline-flex items-center gap-1.5 ${isSupabaseConfigured() ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isSupabaseConfigured() ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              {isSupabaseConfigured() ? 'Configured (Live)' : 'Not Configured (Local)'}
            </span>
          </div>

          {/* 2. Project Hostname (never the key) */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Project Hostname</span>
            <span className="font-mono text-slate-800 dark:text-slate-200 truncate block mt-0.5" title={getSupabaseHostname()}>
              {getSupabaseHostname()}
            </span>
          </div>

          {/* 3. Signed-in User */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Signed-In User</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block mt-0.5" title={user?.email || 'None'}>
              {user ? user.email : 'Not signed in'}
            </span>
          </div>

          {/* 4. Active Business Tenant */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Active Business</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block mt-0.5">
              {currentBusiness ? `${currentBusiness.name} (${currentBusiness.id.slice(0, 8)}...)` : storeName}
            </span>
          </div>

          {/* 5. Role */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Staff Role</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 uppercase truncate block mt-0.5">
              {currentRole || 'Cashier (Local)'}
            </span>
          </div>

          {/* 6. Enrolled Device */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 flex flex-col justify-between">
            <div>
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Enrolled Device UUID</span>
              <span className="font-mono text-[11px] text-slate-800 dark:text-slate-200 truncate block mt-0.5" title={enrolledDeviceId || 'Not enrolled'}>
                {enrolledDeviceId ? `${enrolledDeviceId.slice(0, 13)}...` : 'Not enrolled'}
              </span>
            </div>
            {!enrolledDeviceId && currentBusiness && (
              <button
                onClick={handleEnrollTerminal}
                disabled={isEnrollingDevice}
                className="mt-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-teal-600 hover:bg-teal-700 text-white self-start transition-all"
              >
                {isEnrollingDevice ? 'Enrolling...' : 'Enroll This Terminal'}
              </button>
            )}
          </div>

          {/* 7. Last Successful Sync Time */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Last Successful Sync</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block mt-0.5">
              {syncStatus.lastSyncedAt ? formatDateTime(syncStatus.lastSyncedAt) : 'Never'}
            </span>
          </div>

          {/* 8. Queued Items & Last Error */}
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-bold uppercase">Queued Items</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${unsyncedCount > 0 ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white'}`}>
                {unsyncedCount}
              </span>
            </div>
            <span className="text-[11px] text-slate-500 truncate block mt-1" title={syncStatus.lastError || 'No errors'}>
              Error: {syncStatus.lastError ? syncStatus.lastError : 'None'}
            </span>
          </div>
        </div>
      </div>

      {/* 0B2. Owner Staff Profile Management (Create Profile for Staff) */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Staff Profiles & PIN Management
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300">
                  {staffList.length} Active Staff
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Owner-managed staff profiles isolated strictly to {currentBusiness?.name || 'this cafe'}.
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowAddStaffModal(true)}
            className="h-10 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all active:scale-[0.98] shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create Staff Profile</span>
          </button>
        </div>

        {/* Staff Table / Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
          {staffList.map((member) => (
            <div
              key={member.id || member.userId}
              className="p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold text-xs shrink-0">
                  {member.fullName.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                    {member.fullName}
                  </h4>
                  <span className="text-[10px] uppercase font-bold text-teal-600 dark:text-teal-400 block mt-0.5">
                    {member.role}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                  {member.defaultPin ? `PIN: ${member.defaultPin}` : 'PIN set'}
                </span>
                {member.role !== 'owner' && (
                  <button
                    type="button"
                    onClick={() => handleDeleteStaff(member.id || member.userId, member.fullName)}
                    title={`Remove ${member.fullName}`}
                    className="w-7 h-7 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 flex items-center justify-center transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {staffList.length <= 1 && (
          <div className="p-3.5 rounded-xl bg-teal-50/50 dark:bg-teal-950/30 border border-teal-200/60 dark:border-teal-800/50 text-xs text-teal-800 dark:text-teal-300 flex items-center justify-between">
            <span>
              <strong>Owner Profile active.</strong> Tap <strong>Create Staff Profile</strong> to add employee profiles (Cashier, Waiter, Kitchen) for this business.
            </span>
          </div>
        )}
      </div>

      {/* Add Staff Modal */}
      {showAddStaffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 select-none">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 animate-scaleUp flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-teal-600" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Create Staff Profile
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddStaffModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="flex flex-col gap-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Staff Member Name
                </label>
                <input
                  type="text"
                  required
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  placeholder="e.g. Rahul Verma"
                  className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Assign Staff Role
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {(['cashier', 'waiter', 'kitchen', 'accountant', 'manager'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setNewStaffRole(r)}
                      className={`py-2 px-2.5 rounded-xl border font-bold capitalize flex items-center justify-center transition-all ${
                        newStaffRole === r
                          ? 'bg-teal-600 text-white border-teal-600 shadow-2xs'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Login PIN (4 to 6 Digits)
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    required
                    value={newStaffPin}
                    onChange={(e) => setNewStaffPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g. 5566"
                    className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono font-bold text-slate-900 dark:text-white"
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Staff member uses this PIN to quickly unlock the POS terminal.
                </span>
              </div>

              <div className="flex items-center gap-2 mt-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddStaffModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingStaff}
                  className="flex-1 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-all disabled:opacity-50"
                >
                  {isCreatingStaff ? 'Saving...' : 'Save Staff Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 0C. Counter Color Theme Selector */}
      <ThemeSelector />

      {/* 1. Bluetooth Thermal Printer Configuration */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                printerConnected
                  ? 'bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-400'
                  : 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400'
              }`}
            >
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Bluetooth Thermal Printer
              </h3>
              <p className="text-xs text-slate-500">{printerModel}</p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={printerConnected}
              onChange={togglePrinter}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
          </label>
        </div>

        <div
          className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs ${
            printerConnected
              ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200'
          }`}
        >
          <div>
            <span className="font-bold">
              {printerConnected ? 'Paired & Connected' : 'Disconnected'}
            </span>
            <span className="ml-1 text-[11px] opacity-80">
              {printerConnected
                ? '• 58mm roll • 203 DPI • ESC/POS emulation'
                : '• Sales still record locally on device without interrupting checkout'}
            </span>
          </div>

          {printerConnected && (
            <button
              onClick={handleTestPrint}
              className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-colors shadow-2xs"
            >
              Test print
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={() => setShowPrinterModal(true)}
            className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-2xs"
          >
            <Printer className="w-4 h-4" />
            <span>Open Printer Setup Guide (Bluetooth / USB / WiFi)</span>
          </button>
          <span className="text-[11px] text-slate-500">
            Supports PT-210, MPT-II, TVS, Epson & network KOT printers
          </span>
        </div>
      </div>

      {/* 2. Offline & Server Failure Simulation */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col gap-4">
        <h3 className="font-bold text-base text-slate-900 dark:text-white">
          Offline & Resilience Simulation
        </h3>

        {/* Network Toggle */}
        <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            {isOnline ? (
              <Wifi className="w-5 h-5 text-emerald-600" />
            ) : (
              <WifiOff className="w-5 h-5 text-amber-600" />
            )}
            <div>
              <div className="font-bold text-sm text-slate-900 dark:text-white">
                Terminal Online Status
              </div>
              <div className="text-xs text-slate-500">
                {isOnline
                  ? 'Terminal has active network connection (Live sync enabled)'
                  : 'Simulating offline shop mode (Sales queue up on tablet)'}
              </div>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isOnline}
              onChange={toggleOnline}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
          </label>
        </div>

        {/* Cloud Error 503 Toggle (DEV mode only) */}
        {import.meta.env.DEV && (
          <div className="flex items-center justify-between py-2 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <AlertTriangle
                className={`w-5 h-5 ${simulateServerFailure ? 'text-amber-600' : 'text-slate-400'}`}
              />
              <div>
                <div className="font-bold text-sm text-slate-900 dark:text-white">
                  Simulate Cloud Server Failure (HTTP 503)
                </div>
                <div className="text-xs text-slate-500">
                  Reject sync to test retries, exponential backoff, and non-blocking sales
                </div>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={simulateServerFailure}
                onChange={toggleServerFailure}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
            </label>
          </div>
        )}
      </div>

      {/* 2A. Run on Other Devices (Phone, Tablet, Desktop) with Instant Link & QR Code */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-400 flex items-center justify-center shrink-0">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Run on Other Devices (Phone, Tablet, Desktop)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300">
                  Universal Web Link
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Open this POS terminal simultaneously on your phone, iPad, tablet, or PC browser.
              </p>
            </div>
          </div>

          <button
            onClick={handleCopyLink}
            className="h-10 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-2 shadow-2xs transition-all active:scale-[0.98] shrink-0 self-start sm:self-auto"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-200" /> : <Copy className="w-4 h-4" />}
            <span>{copiedLink ? 'Link Copied!' : 'Copy Device Link'}</span>
          </button>
        </div>

        {/* URL Box and QR Code Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 items-center">
          <div className="md:col-span-2 flex flex-col gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Direct URL for Any Device
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={liveAppUrl}
                  className="flex-1 h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono font-semibold text-slate-800 dark:text-slate-200 select-all"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="h-10 px-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 flex items-center gap-1.5 transition-colors shrink-0"
                >
                  <Copy className="w-3.5 h-3.5 text-teal-600" />
                  <span>Copy</span>
                </button>
              </div>
            </div>

            {/* Device role usage */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
              <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 flex flex-col items-center gap-1">
                <Smartphone className="w-4 h-4 text-teal-600" />
                <span className="font-bold text-[11px] text-slate-800 dark:text-slate-200">Phone</span>
                <span className="text-[10px] text-slate-400">Waiters & Tables</span>
              </div>
              <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 flex flex-col items-center gap-1">
                <Tablet className="w-4 h-4 text-emerald-600" />
                <span className="font-bold text-[11px] text-slate-800 dark:text-slate-200">Tablet / iPad</span>
                <span className="text-[10px] text-slate-400">Cashier Counter</span>
              </div>
              <div className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 flex flex-col items-center gap-1">
                <Monitor className="w-4 h-4 text-indigo-600" />
                <span className="font-bold text-[11px] text-slate-800 dark:text-slate-200">Desktop / PC</span>
                <span className="text-[10px] text-slate-400">Kitchen & Reports</span>
              </div>
            </div>
          </div>

          {/* QR Code for instant phone scan */}
          <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center gap-2">
            <div className="p-2 bg-white rounded-lg shadow-2xs border border-slate-100 inline-block">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&margin=4&data=${encodeURIComponent(liveAppUrl)}`}
                alt="Scan to open Aura POS on Phone or Tablet"
                className="w-28 h-28 object-contain"
              />
            </div>
            <div className="text-[11px] text-slate-500 flex items-center justify-center gap-1">
              <QrCode className="w-3.5 h-3.5 text-teal-600" />
              <span>Point Camera to Open</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2B. Android App (.APK) & PWA Installation Guide */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Android App & Tablet Installation (.APK)
              </h3>
              <p className="text-xs text-slate-500">
                Install as a full-screen, offline-first kiosk app on Android tablets, phones, or POS terminals.
              </p>
            </div>
          </div>

          <button
            onClick={triggerInstallPrompt}
            className="h-10 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-2 shadow-2xs transition-all active:scale-[0.98] shrink-0 self-start sm:self-auto"
          >
            <Download className="w-4 h-4" />
            <span>Install on this Device</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs mt-1">
          {/* Method 1 */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 flex flex-col gap-2">
            <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[11px] font-bold">1</span>
              <span>Direct Android WebAPK (Recommended)</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              No need to sideload loose files! Android automatically generates and installs an official WebAPK with a native app icon:
            </p>
            <ol className="list-decimal pl-4 space-y-1.5 text-slate-700 dark:text-slate-300 font-medium">
              <li>Open this URL in <strong>Google Chrome</strong> on your Android tablet or phone.</li>
              <li>Tap the <strong>3 dots menu (⋮)</strong> at top right.</li>
              <li>Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.</li>
              <li>Launches full-screen with no browser URL bar, works completely offline, and connects directly to Bluetooth 58mm printers.</li>
            </ol>
          </div>

          {/* Method 2 */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 flex flex-col gap-2">
            <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-brand text-white flex items-center justify-center text-[11px] font-bold">2</span>
              <span>Standalone .APK Export & Build</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              If you require a standalone <code>.apk</code> installer for sideloading or MDM enterprise deployment:
            </p>
            <ul className="list-disc pl-4 space-y-1.5 text-slate-700 dark:text-slate-300">
              <li>In AI Studio: Open the top menu ➔ select <strong>"Export ZIP"</strong> to download the full project.</li>
              <li>Package into an APK instantly using <strong>PWABuilder.com</strong> (enter the live app URL).</li>
              <li>Or run <code>npx @bubblewrap/cli build</code> to generate a signed Android APK package.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 3. Store & Legal Registration Info */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col gap-3">
        <div className="flex items-center gap-2 mb-1">
          <Store className="w-5 h-5 text-teal-700 dark:text-teal-400" />
          <h3 className="font-bold text-base text-slate-900 dark:text-white">Store & Tax Profile</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 flex justify-between">
            <span className="text-slate-500">Store Name:</span>
            <span className="font-bold text-slate-900 dark:text-white">{storeName}</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 flex justify-between">
            <span className="text-slate-500">GSTIN:</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white">{storeGstin}</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 flex justify-between">
            <span className="text-slate-500">Terminal & Counter:</span>
            <span className="font-bold text-slate-900 dark:text-white">
              {counterName} (Terminal #01)
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 flex justify-between">
            <span className="text-slate-500">Cashier:</span>
            <span className="font-bold text-slate-900 dark:text-white">{cashierName}</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 flex justify-between">
            <span className="text-slate-500">GST Rate Applied:</span>
            <span className="font-bold text-slate-900 dark:text-white">
              5% Cafe GST (2.5% CGST + 2.5% SGST)
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70 flex justify-between">
            <span className="text-slate-500">Currency & Format:</span>
            <span className="font-bold text-slate-900 dark:text-white">
              INR (₹) Lakhs/Crores grouping
            </span>
          </div>
        </div>
      </div>

      {/* 4. Controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleDarkMode}
          className="flex-1 h-12 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-2xs"
        >
          {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          <span>{isDarkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'}</span>
        </button>

        <button
          onClick={lockTerminal}
          className="flex-1 h-12 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors shadow-2xs"
        >
          <Lock className="w-4 h-4 text-slate-500" />
          <span>Lock Cashier Terminal</span>
        </button>
      </div>

      {/* Cloud Authentication & Multi-Tenant Onboarding Modal */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />

      {/* Thermal POS Printer Setup Modal */}
      <ThermalPrinterModal isOpen={showPrinterModal} onClose={() => setShowPrinterModal(false)} />
    </div>
  );
};
