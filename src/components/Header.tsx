import React, { useState } from 'react';
import {
  RefreshCw,
  Printer,
  ShoppingBag,
  History,
  Settings,
  Moon,
  Sun,
  Lock,
  Wifi,
  WifiOff,
  Coffee,
  UtensilsCrossed,
  ChefHat,
  Package,
  Download,
  ShieldCheck,
  User,
} from 'lucide-react';
import { usePosStore } from '../store/usePosStore';
import { useAuthStore } from '../store/useAuthStore';
import { can } from '../utils/permissions';
import { AuthModal } from './AuthModal';

export const Header: React.FC = () => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { user, currentBusiness, currentRole } = useAuthStore();
  const {
    activeTab,
    setActiveTab,
    isOnline,
    isSyncing,
    unsyncedCount,
    toggleOnline,
    printerConnected,
    togglePrinter,
    isDarkMode,
    toggleDarkMode,
    cashierName,
    counterName,
    lockTerminal,
    triggerInstallPrompt,
    canInstall,
  } = usePosStore();

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-2.5 sm:px-4 py-1.5 sm:py-2 shadow-xs sticky top-0 z-30 select-none shrink-0">
      <div className="flex items-center justify-between gap-2 sm:gap-4 max-w-7xl mx-auto w-full">
        {/* Brand & Logged-In Business */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-brand text-white flex items-center justify-center font-black shadow-xs shrink-0">
            <Coffee className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-bold text-xs sm:text-sm tracking-tight text-slate-900 dark:text-white">
                Aura POS
              </span>
              <span
                title="Active Logged-in Business"
                className="px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-bold bg-brand-light text-brand border border-brand-light/80 flex items-center gap-1 shadow-2xs"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                <span className="max-w-[140px] sm:max-w-[200px] truncate">
                  {currentBusiness?.name || (usePosStore.getState().storeName) || 'Spice Cafe'}
                </span>
              </span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 hidden xs:block">
              Specialty Coffee, Bakery & Bites • POS
            </p>
          </div>
        </div>

        {/* Center: Persistent Connection Status & Printer Status */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Connection Chip */}
          <button
            onClick={toggleOnline}
            title="Click to toggle Online/Offline simulation"
            className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-semibold transition-all border shadow-2xs ${
              isSyncing
                ? 'bg-sky-50 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border-sky-300 dark:border-sky-800'
                : !isOnline
                ? 'bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800 hover:bg-amber-100'
                : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100'
            }`}
          >
            {isSyncing ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-600 dark:text-sky-400" />
                <span className="hidden sm:inline">Syncing...</span>
              </>
            ) : !isOnline ? (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span className="hidden xs:inline">Offline</span>
              </>
            ) : (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="hidden xs:inline">Online</span>
              </>
            )}

            {unsyncedCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white shadow-2xs">
                {unsyncedCount}
              </span>
            )}
          </button>

          {/* Bluetooth Thermal Printer Chip (Visible on tablet/desktop) */}
          <button
            onClick={togglePrinter}
            title="Click to toggle Printer connection"
            className={`hidden sm:flex items-center gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-medium transition-all border ${
              printerConnected
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                : 'bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
            }`}
          >
            <Printer
              className={`w-3.5 h-3.5 ${
                printerConnected ? 'text-teal-600 dark:text-teal-400' : 'text-amber-600 dark:text-amber-400'
              }`}
            />
            <span className="hidden xl:inline">
              {printerConnected ? 'BT 58mm Printer' : 'Printer Off'}
            </span>
          </button>
        </div>

        {/* Right: Desktop/Tablet Navigation Tabs, Theme Toggle, Cashier Profile */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Desktop/Tablet Navigation Tabs (Filtered by Active Role Permissions) */}
          <nav className="hidden md:flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
            {can('order.create') && (
              <button
                onClick={() => setActiveTab('CHECKOUT')}
                className={`flex items-center gap-1.5 px-2 lg:px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  activeTab === 'CHECKOUT'
                    ? 'bg-brand text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Order</span>
              </button>
            )}

            {can('order.create') && (
              <button
                onClick={() => setActiveTab('TABLES')}
                className={`flex items-center gap-1.5 px-2 lg:px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  activeTab === 'TABLES'
                    ? 'bg-brand text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                <UtensilsCrossed className="w-3.5 h-3.5" />
                <span>Tables</span>
              </button>
            )}

            {(can('kitchen.update') || can('order.send_kitchen')) && (
              <button
                onClick={() => setActiveTab('KOT')}
                className={`flex items-center gap-1.5 px-2 lg:px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  activeTab === 'KOT'
                    ? 'bg-brand text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                <ChefHat className="w-3.5 h-3.5" />
                <span>Barista KOT</span>
              </button>
            )}

            {can('menu.edit') && (
              <button
                onClick={() => setActiveTab('PRODUCTS')}
                className={`flex items-center gap-1.5 px-2 lg:px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  activeTab === 'PRODUCTS'
                    ? 'bg-brand text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                <span>Menu</span>
              </button>
            )}

            {(can('report.view') || can('bill.take')) && (
              <button
                onClick={() => setActiveTab('QUEUE')}
                className={`flex items-center gap-1.5 px-2 lg:px-2.5 py-1 rounded-md text-xs font-semibold transition-all relative ${
                  activeTab === 'QUEUE'
                    ? 'bg-brand text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>Queue</span>
                {unsyncedCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                    {unsyncedCount}
                  </span>
                )}
              </button>
            )}

            {can('report.view') && (
              <button
                onClick={() => setActiveTab('HISTORY')}
                className={`flex items-center gap-1.5 px-2 lg:px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  activeTab === 'HISTORY'
                    ? 'bg-brand text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>History</span>
              </button>
            )}

            {(can('staff.manage') || can('device.manage')) && (
              <button
                onClick={() => setActiveTab('SETTINGS')}
                className={`flex items-center gap-1.5 px-2 lg:px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                  activeTab === 'SETTINGS'
                    ? 'bg-brand text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Settings</span>
              </button>
            )}
          </nav>

          {/* Install App / Android APK Button (Visible on desktop/tablet) */}
          <button
            onClick={triggerInstallPrompt}
            title="Install Aura Cafe as Android / Desktop Standalone App"
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-all shadow-2xs shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">Install App</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleDarkMode}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Toggle Light/Dark Theme"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Active Staff Member Profile & Quick Switch Chip */}
          <button
            onClick={lockTerminal}
            title="Active Staff Member • Click to Switch Staff or Lock"
            className="flex items-center gap-1.5 sm:gap-2 pl-1.5 sm:pl-2 pr-2 sm:pr-2.5 py-1 sm:py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-900 dark:text-teal-200 hover:bg-teal-100 dark:hover:bg-teal-900/60 transition-colors border border-teal-200 dark:border-teal-800/80 shadow-2xs"
          >
            <div className="w-6 h-6 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold text-xs">
              {cashierName.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col text-left hidden sm:flex">
              <span className="text-xs font-bold leading-tight">
                {cashierName}
              </span>
              <span className="text-[10px] text-teal-600 dark:text-teal-400 uppercase font-semibold leading-tight">
                {currentRole || 'Staff'} • Switch PIN
              </span>
            </div>
            <Lock className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 ml-1" />
          </button>

          {/* Business & Cloud Settings Button */}
          <button
            onClick={() => setShowAuthModal(true)}
            title="Business Setup & Cloud Authentication"
            className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-700/80"
          >
            <ShieldCheck className="w-4 h-4 text-slate-500" />
          </button>
        </div>
      </div>

      {/* Cloud Authentication & Multi-Tenant Onboarding Modal */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </header>
  );
};
