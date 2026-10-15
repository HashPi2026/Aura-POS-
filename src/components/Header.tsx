import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  Printer,
  Bluetooth,
  Usb,
  AlertCircle,
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
  Share2,
  QrCode,
  Copy,
  Check,
  X,
  MoreVertical,
} from 'lucide-react';
import { usePosStore } from '../store/usePosStore';
import { useAuthStore } from '../store/useAuthStore';
import { can } from '../utils/permissions';
import { AuthModal } from './AuthModal';
import { ThermalPrinterModal } from './ThermalPrinterModal';
import { printerManager, PrinterState } from '../utils/printerManager';

export const Header: React.FC = () => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showPrinterModal, setShowPrinterModal] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [printerState, setPrinterState] = useState<PrinterState>(printerManager.getState());

  useEffect(() => {
    const unsubscribe = printerManager.subscribe((state) => {
      setPrinterState(state);
    });
    return unsubscribe;
  }, []);

  const liveAppUrl = typeof window !== 'undefined' && window.location.href
    ? (window.location.origin.includes('localhost')
        ? window.location.origin
        : 'https://ais-pre-ji3fw7pbjdyz6ephhubu3h-672731157117.asia-southeast1.run.app')
    : 'https://ais-pre-ji3fw7pbjdyz6ephhubu3h-672731157117.asia-southeast1.run.app';

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(liveAppUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3000);
    } catch (_) {}
  };
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
    <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 sm:px-4 py-2 sm:py-2.5 shadow-xs sticky top-0 z-30 select-none">
      <div className="flex items-center justify-between gap-2 sm:gap-4 max-w-7xl mx-auto w-full">
        {/* Brand & Counter */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-brand text-white flex items-center justify-center font-black shadow-xs shrink-0">
            <Coffee className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-bold text-sm sm:text-base tracking-tight text-slate-900 dark:text-white truncate max-w-[160px] sm:max-w-xs">
                {currentBusiness?.name || 'Aura Cafe & Roastery'}
              </span>
              <span className="px-1.5 sm:px-2 py-0.5 rounded text-[10px] sm:text-xs font-semibold bg-brand-light text-brand border border-brand-light">
                {counterName}
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400 hidden xs:block capitalize">
              {currentBusiness ? `${currentBusiness.business_type} • Cloud POS` : 'Specialty Coffee, Bakery & Bites • POS'}
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

          {/* Thermal Printer Connection Status Indicator */}
          <button
            onClick={() => setShowPrinterModal(true)}
            data-testid="printer-connection-indicator"
            aria-label="Thermal Printer Connection Status"
            title={
              printerState.status === 'CONNECTED'
                ? `Connected: ${printerState.deviceName || 'Thermal Printer'} (${printerState.type} • ${printerState.paperWidth}) - Click to configure`
                : printerState.status === 'CONNECTING'
                ? 'Connecting to ESC/POS thermal printer...'
                : printerState.status === 'ERROR'
                ? `Printer Error: ${printerState.error || 'Check printer connection'}. Click to configure.`
                : 'Thermal Printer Disconnected. Click to pair Bluetooth or USB printer.'
            }
            className={`flex items-center gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-semibold transition-all border shadow-2xs select-none ${
              printerState.status === 'CONNECTED'
                ? printerState.type === 'BLUETOOTH'
                  ? 'bg-sky-50 dark:bg-sky-950/70 text-sky-800 dark:text-sky-300 border-sky-300 dark:border-sky-800 hover:bg-sky-100'
                  : printerState.type === 'USB'
                  ? 'bg-teal-50 dark:bg-teal-950/70 text-teal-800 dark:text-teal-300 border-teal-300 dark:border-teal-800 hover:bg-teal-100'
                  : 'bg-emerald-50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100'
                : printerState.status === 'CONNECTING'
                ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800'
                : printerState.status === 'ERROR'
                ? 'bg-rose-50 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-800 hover:bg-rose-100'
                : 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800 hover:bg-amber-100'
            }`}
          >
            {printerState.status === 'CONNECTED' ? (
              <>
                {printerState.type === 'BLUETOOTH' ? (
                  <Bluetooth className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                ) : printerState.type === 'USB' ? (
                  <Usb className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                ) : (
                  <Printer className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                )}
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span className="hidden xl:inline truncate max-w-[120px]">
                  {printerState.deviceName || `${printerState.type} Printer`}
                </span>
                <span className="xl:hidden">
                  {printerState.type === 'BLUETOOTH' ? 'BT' : printerState.type === 'USB' ? 'USB' : 'Printer'}
                </span>
              </>
            ) : printerState.status === 'CONNECTING' ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600 shrink-0" />
                <span>Pairing...</span>
              </>
            ) : printerState.status === 'ERROR' ? (
              <>
                <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span className="hidden sm:inline">Printer Err</span>
              </>
            ) : (
              <>
                <Printer className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                <span className="hidden xl:inline">Printer Off</span>
                <span className="xl:hidden">Off</span>
              </>
            )}
          </button>
        </div>

        {/* Right: Desktop/Tablet Navigation Tabs, Theme Toggle, Cashier Profile */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Desktop/Tablet Navigation Tabs (Filtered by Active Role Permissions) */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            {can('order.create') && (
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
            )}

            {can('order.create') && (
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
            )}

            {(can('kitchen.update') || can('order.send_kitchen')) && (
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
            )}

            {can('menu.edit') && (
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
            )}

            {(can('report.view') || can('bill.take')) && (
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
            )}

            {can('report.view') && (
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
            )}

            {(can('staff.manage') || can('device.manage')) && (
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
            )}
          </nav>

          {/* Install App / Android APK Button (Visible on tablet/desktop, in menu on mobile) */}
          <button
            onClick={triggerInstallPrompt}
            title="Install Aura Cafe as Android / Desktop Standalone App"
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-all shadow-2xs shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">Install App</span>
          </button>

          {/* Open on Phone / Tablet Link & QR */}
          <button
            onClick={() => setShowShareModal(true)}
            title="Open POS Terminal on Phone, Tablet or Desktop"
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-teal-50 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 border border-teal-300 dark:border-teal-800 hover:bg-teal-100 dark:hover:bg-teal-900/50 transition-all shadow-2xs shrink-0"
          >
            <Share2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
            <span className="hidden sm:inline">Open on Devices</span>
          </button>

          {/* Theme Toggle (Desktop) */}
          <button
            onClick={toggleDarkMode}
            className="hidden sm:flex w-8 h-8 rounded-lg items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
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

          {/* Business & Cloud Settings Button (Desktop) */}
          <button
            onClick={() => setShowAuthModal(true)}
            title="Business Setup & Cloud Authentication"
            className="hidden sm:flex w-8 h-8 rounded-xl items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-700/80"
          >
            <ShieldCheck className="w-4 h-4 text-slate-500" />
          </button>

          {/* Mobile Quick More Menu */}
          <div className="relative sm:hidden">
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-700/80"
              title="More Options"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMobileMenu && (
              <div className="absolute right-0 top-10 w-52 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 py-1.5 z-50 animate-scaleUp">
                <button
                  onClick={() => {
                    setShowPrinterModal(true);
                    setShowMobileMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-left font-medium"
                >
                  <Printer className="w-4 h-4 text-teal-600" />
                  <span>Printer Setup (BT / USB / WiFi)</span>
                </button>
                <button
                  onClick={() => {
                    triggerInstallPrompt();
                    setShowMobileMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-left font-medium"
                >
                  <Download className="w-4 h-4 text-emerald-600" />
                  <span>Install App on Device</span>
                </button>
                <button
                  onClick={() => {
                    setShowShareModal(true);
                    setShowMobileMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-left font-medium"
                >
                  <Share2 className="w-4 h-4 text-teal-600" />
                  <span>Open on Other Devices / QR</span>
                </button>
                <button
                  onClick={() => {
                    toggleDarkMode();
                    setShowMobileMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-left font-medium"
                >
                  {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-500" />}
                  <span>{isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}</span>
                </button>
                <button
                  onClick={() => {
                    setShowAuthModal(true);
                    setShowMobileMenu(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-left font-medium border-t border-slate-100 dark:border-slate-800 mt-1 pt-2"
                >
                  <ShieldCheck className="w-4 h-4 text-slate-500" />
                  <span>Cloud & Business Settings</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Thermal POS Printer Setup Modal */}
      <ThermalPrinterModal isOpen={showPrinterModal} onClose={() => setShowPrinterModal(false)} />

      {/* Cloud Authentication & Multi-Tenant Onboarding Modal */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />

      {/* Multi-Device QR & Link Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 select-none">
          <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 animate-scaleUp flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300 flex items-center justify-center">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Run POS on Any Device
                  </h3>
                  <p className="text-[11px] text-slate-500">Phone • Tablet • Desktop • iPad</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* QR Code */}
            <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 gap-3 text-center">
              <div className="p-2.5 bg-white rounded-xl shadow-xs border border-slate-100 inline-block">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&margin=4&data=${encodeURIComponent(liveAppUrl)}`}
                  alt="Scan QR code to open Aura POS"
                  className="w-36 h-36 object-contain"
                />
              </div>
              <div>
                <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block flex items-center justify-center gap-1">
                  <QrCode className="w-3.5 h-3.5 text-teal-600" />
                  Scan with Camera to Open
                </span>
                <span className="text-[11px] text-slate-500">
                  Instantly launches on any Android, iPhone, iPad, or tablet
                </span>
              </div>
            </div>

            {/* Direct URL with Copy Button */}
            <div>
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
                Direct Browser URL
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={liveAppUrl}
                  className="flex-1 h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs font-mono font-semibold text-slate-800 dark:text-slate-200 select-all truncate"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="h-10 px-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs shrink-0"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-200" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowShareModal(false)}
              className="w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
