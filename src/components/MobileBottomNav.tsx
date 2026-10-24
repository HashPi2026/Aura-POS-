import React, { useState } from 'react';
import {
  ShoppingBag,
  UtensilsCrossed,
  ChefHat,
  Menu,
  X,
  History,
  RefreshCw,
  Coffee,
  Settings,
  Lock,
  Moon,
  Sun,
  Wifi,
  WifiOff,
  ChevronRight,
} from 'lucide-react';
import { usePosStore, ScreenTab } from '../store/usePosStore';
import { useAuthStore } from '../store/useAuthStore';
import { can } from '../utils/permissions';
import { KwikioAppIcon } from './KwikioLogo';

export const MobileBottomNav: React.FC = () => {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const {
    activeTab,
    setActiveTab,
    unsyncedCount,
    isOnline,
    toggleOnline,
    isDarkMode,
    toggleDarkMode,
    cashierName,
    lockTerminal,
  } = usePosStore();
  const { currentRole, currentBusiness } = useAuthStore();

  const isMoreActive = ['QUEUE', 'HISTORY', 'PRODUCTS', 'SETTINGS'].includes(activeTab);

  const handleSelectTab = (tab: ScreenTab) => {
    setActiveTab(tab);
    setIsMoreOpen(false);
  };

  const moreItems: {
    tab: ScreenTab;
    label: string;
    sublabel: string;
    icon: React.ReactNode;
    badge?: number;
    allowed: boolean;
  }[] = [
    {
      tab: 'HISTORY',
      label: 'Sales & Reports',
      sublabel: 'Z-Report, charts & invoices',
      icon: <History className="w-5 h-5 text-brand" />,
      allowed: can('report.view'),
    },
    {
      tab: 'QUEUE',
      label: 'Sync Queue',
      sublabel: unsyncedCount > 0 ? `${unsyncedCount} pending upload` : 'All synced to cloud',
      icon: <RefreshCw className="w-5 h-5 text-sky-600" />,
      badge: unsyncedCount > 0 ? unsyncedCount : undefined,
      allowed: can('report.view') || can('bill.take'),
    },
    {
      tab: 'PRODUCTS',
      label: 'Menu & Prices',
      sublabel: 'Add & edit cafe catalog',
      icon: <Coffee className="w-5 h-5 text-amber-600" />,
      allowed: can('menu.edit'),
    },
    {
      tab: 'SETTINGS',
      label: 'Terminal Settings',
      sublabel: 'Hardware, printer & receipt info',
      icon: <Settings className="w-5 h-5 text-slate-600 dark:text-slate-300" />,
      allowed: can('staff.manage') || can('device.manage'),
    },
  ];

  const visibleMoreItems = moreItems.filter((i) => i.allowed);

  return (
    <>
      {/* 4-Item Primary Bottom Navigation Bar */}
      <nav className="md:hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-3 py-1 flex items-center justify-around z-30 select-none pb-safe shrink-0 sticky bottom-0 shadow-lg">
        {/* 1. Order / Catalog */}
        {can('order.create') && (
          <button
            onClick={() => handleSelectTab('CHECKOUT')}
            className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all min-h-[48px] ${
              activeTab === 'CHECKOUT'
                ? 'text-brand font-bold bg-brand/10 dark:bg-brand/20'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
            }`}
          >
            <ShoppingBag className="w-5 h-5" />
            <span className="text-[11px] mt-0.5 tracking-tight">Order</span>
          </button>
        )}

        {/* 2. Tables */}
        {can('order.create') && (
          <button
            onClick={() => handleSelectTab('TABLES')}
            className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all min-h-[48px] ${
              activeTab === 'TABLES'
                ? 'text-brand font-bold bg-brand/10 dark:bg-brand/20'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
            }`}
          >
            <UtensilsCrossed className="w-5 h-5" />
            <span className="text-[11px] mt-0.5 tracking-tight">Tables</span>
          </button>
        )}

        {/* 3. Barista KOT */}
        {(can('kitchen.update') || can('order.send_kitchen')) && (
          <button
            onClick={() => handleSelectTab('KOT')}
            className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all min-h-[48px] ${
              activeTab === 'KOT'
                ? 'text-brand font-bold bg-brand/10 dark:bg-brand/20'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
            }`}
          >
            <ChefHat className="w-5 h-5" />
            <span className="text-[11px] mt-0.5 tracking-tight">Kitchen</span>
          </button>
        )}

        {/* 4. More Drawer Trigger */}
        <button
          onClick={() => setIsMoreOpen(true)}
          className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-all relative min-h-[48px] ${
            isMoreActive || isMoreOpen
              ? 'text-brand font-bold bg-brand/10 dark:bg-brand/20'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
          }`}
        >
          <div className="relative">
            <Menu className="w-5 h-5" />
            {unsyncedCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-white dark:ring-slate-900" />
            )}
          </div>
          <span className="text-[11px] mt-0.5 tracking-tight">More</span>
        </button>
      </nav>

      {/* Slide-Up "More" Sheet Modal */}
      {isMoreOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end animate-fadeIn">
          {/* Backdrop Click */}
          <div className="flex-1" onClick={() => setIsMoreOpen(false)} />

          <div className="bg-white dark:bg-slate-900 rounded-t-3xl max-h-[85vh] flex flex-col p-4 shadow-2xl border-t border-slate-200 dark:border-slate-800 animate-slideUp pb-safe">
            {/* Sheet Handle & Header */}
            <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-3" />
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <KwikioAppIcon size={26} />
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    Kwikio POS Menu
                  </h3>
                  <p className="text-[10px] text-slate-500">
                    {currentBusiness?.name || 'Spice Cafe'} • Terminal Actions
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsMoreOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Menu Items List */}
            <div className="flex flex-col gap-2 py-3 overflow-y-auto">
              {visibleMoreItems.map((item) => {
                const isSelected = activeTab === item.tab;
                return (
                  <button
                    key={item.tab}
                    onClick={() => handleSelectTab(item.tab)}
                    className={`flex items-center justify-between p-3 rounded-2xl transition-all text-left border ${
                      isSelected
                        ? 'bg-brand/10 dark:bg-brand/20 border-brand/40 text-brand'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200/60 dark:border-slate-700/60 text-slate-900 dark:text-white hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-white dark:bg-slate-700 shadow-2xs flex items-center justify-center shrink-0">
                        {item.icon}
                      </div>
                      <div>
                        <div className="font-bold text-xs sm:text-sm flex items-center gap-2">
                          <span>{item.label}</span>
                          {item.badge !== undefined && (
                            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {item.sublabel}
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>
                );
              })}
            </div>

            {/* Quick Staff & System Utilities */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-2.5">
              {/* Active Cashier & Lock Switch */}
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200/80 dark:border-teal-800/60">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-teal-600 text-white flex items-center justify-center font-bold text-xs">
                    {cashierName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-teal-950 dark:text-teal-200 block">
                      {cashierName}
                    </span>
                    <span className="text-[10px] text-teal-700 dark:text-teal-400 uppercase font-semibold">
                      {currentRole || 'Staff Cashier'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsMoreOpen(false);
                    lockTerminal();
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-bold flex items-center gap-1 shadow-2xs hover:bg-teal-700 transition-colors"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>Lock Terminal</span>
                </button>
              </div>

              {/* Utility Toggles: Online & Dark Mode */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={toggleOnline}
                  className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                    isOnline
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                      : 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                  }`}
                >
                  {isOnline ? (
                    <>
                      <Wifi className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>Online Mode</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      <span>Offline Mode</span>
                    </>
                  )}
                </button>

                <button
                  onClick={toggleDarkMode}
                  className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 transition-all"
                >
                  {isDarkMode ? (
                    <>
                      <Sun className="w-3.5 h-3.5 text-amber-400" />
                      <span>Light Theme</span>
                    </>
                  ) : (
                    <>
                      <Moon className="w-3.5 h-3.5 text-slate-500" />
                      <span>Dark Theme</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MobileBottomNav;
