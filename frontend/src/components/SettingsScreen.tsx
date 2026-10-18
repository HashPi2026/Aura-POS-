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
} from 'lucide-react';
import { usePosStore } from '../store/usePosStore';
import { useAuthStore } from '../store/useAuthStore';
import { ThemeSelector } from './ThemeSelector';
import { AuthModal } from './AuthModal';
import { BusinessType } from '../db/indexedDb';

export const SettingsScreen: React.FC = () => {
  const [showAuthModal, setShowAuthModal] = useState(false);
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

      {/* 0B. Supabase Cloud Database & Multi-Tenant Onboarding */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isConfigured && user
                ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                : 'bg-sky-50 dark:bg-sky-950 text-sky-600 dark:text-sky-400'
            }`}>
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Cloud Backend & Multi-Tenant Setup
                </h3>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  isConfigured
                    ? (user ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300')
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                }`}>
                  {isConfigured ? (user ? 'Connected' : 'Sign-in Required') : 'Local Offline Mode'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {currentBusiness
                  ? `Active Tenant: ${currentBusiness.name} • Role: ${currentRole?.toUpperCase() || 'STAFF'}`
                  : 'Manage multiple businesses, staff roles, and synchronized cloud sales.'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowAuthModal(true)}
            className="h-10 px-4 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-bold flex items-center gap-2 shadow-2xs transition-all active:scale-[0.98] shrink-0 self-start sm:self-auto"
          >
            <UserCheck className="w-4 h-4" />
            <span>{user ? 'Manage Staff & Businesses' : 'Connect / Sign In'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Authentication</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block mt-0.5">
              {user ? user.email : 'Not logged in (Offline cashier)'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Business Tenant</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block mt-0.5">
              {currentBusiness ? `${currentBusiness.name} (${currentBusiness.business_type})` : storeName}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/70">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Staff Role & Permissions</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block mt-0.5">
              {currentRole ? `Role: ${currentRole}` : 'Cashier (Local)'}
            </span>
          </div>
        </div>
      </div>

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

        {/* Cloud Error 503 Toggle */}
        <div className="flex items-center justify-between py-2">
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
    </div>
  );
};
