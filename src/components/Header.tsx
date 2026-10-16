import React from 'react';
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
} from 'lucide-react';
import { usePosStore } from '../store/usePosStore';

export const Header: React.FC = () => {
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
  } = usePosStore();

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 sm:px-4 py-2 sm:py-2.5 shadow-xs sticky top-0 z-30 select-none">
      <div className="flex items-center justify-between gap-2 sm:gap-4 max-w-7xl mx-auto w-full">
        {/* Brand & Counter */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-brand text-white flex items-center justify-center font-black shadow-xs shrink-0">
            <Coffee className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-bold text-sm sm:text-base tracking-tight text-slate-900 dark:text-white">
                Aura Cafe & Roastery
              </span>
              <span className="px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs font-semibold bg-brand-light text-brand border border-brand-light">
                {counterName}
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 hidden xs:block">
              Specialty Coffee, Bakery & Bites • POS
            </p>
          </div>
        </div>

        {/* Center: Persistent Connection Status & Printer Status */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Connection Chip */}
          <button
            onClick={toggleOnline}
            title="Click to toggle Online/Offline simulation"
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-semibold transition-all border shadow-2xs ${
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
                <span>Offline</span>
              </>
            ) : (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Online</span>
              </>
            )}

            {unsyncedCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white shadow-2xs">
                {unsyncedCount}
              </span>
            )}
          </button>

          {/* Bluetooth Thermal Printer Chip */}
          <button
            onClick={togglePrinter}
            title="Click to toggle Printer connection"
            className={`flex items-center gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-medium transition-all border ${
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
          {/* Desktop/Tablet Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('CHECKOUT')}
              className={`flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'CHECKOUT'
                  ? 'bg-brand text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Order</span>
            </button>

            <button
              onClick={() => setActiveTab('TABLES')}
              className={`flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'TABLES'
                  ? 'bg-brand text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              <UtensilsCrossed className="w-3.5 h-3.5" />
              <span>Tables</span>
            </button>

            <button
              onClick={() => setActiveTab('KOT')}
              className={`flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'KOT'
                  ? 'bg-brand text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              <ChefHat className="w-3.5 h-3.5" />
              <span>Barista KOT</span>
            </button>

            <button
              onClick={() => setActiveTab('PRODUCTS')}
              className={`flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'PRODUCTS'
                  ? 'bg-brand text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Menu</span>
            </button>

            <button
              onClick={() => setActiveTab('QUEUE')}
              className={`flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all relative ${
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

            <button
              onClick={() => setActiveTab('HISTORY')}
              className={`flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'HISTORY'
                  ? 'bg-brand text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>History</span>
            </button>

            <button
              onClick={() => setActiveTab('SETTINGS')}
              className={`flex items-center gap-1.5 px-2.5 lg:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'SETTINGS'
                  ? 'bg-brand text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Settings</span>
            </button>
          </nav>

          {/* Theme Toggle */}
          <button
            onClick={toggleDarkMode}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Toggle Light/Dark Theme"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Cashier Barista Lock */}
          <button
            onClick={lockTerminal}
            title="Lock Barista Terminal"
            className="flex items-center gap-1.5 sm:gap-2 pl-1.5 sm:pl-2 pr-2 sm:pr-2.5 py-1 sm:py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors border border-slate-200 dark:border-slate-700"
          >
            <div className="w-5 h-5 rounded-full bg-brand-light text-brand flex items-center justify-center font-bold text-[10px]">
              ☕
            </div>
            <span className="text-xs font-semibold hidden sm:inline">{cashierName}</span>
            <Lock className="w-3 h-3 text-slate-400" />
          </button>
        </div>
      </div>
    </header>
  );
};
