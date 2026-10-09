import React, { useEffect } from 'react';
import { Header } from './components/Header';
import { CheckoutScreen } from './components/CheckoutScreen';
import { TableManagementScreen } from './components/TableManagementScreen';
import { KitchenKotScreen } from './components/KitchenKotScreen';
import { ProductManagementScreen } from './components/ProductManagementScreen';
import { SyncQueueScreen } from './components/SyncQueueScreen';
import { SalesHistoryScreen } from './components/SalesHistoryScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { PaymentModal } from './components/PaymentModal';
import { ReceiptModal } from './components/ReceiptModal';
import { LoginPinModal } from './components/LoginPinModal';
import { KotTicketModal } from './components/KotTicketModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { usePosStore } from './store/usePosStore';
import { useAuthStore } from './store/useAuthStore';
import { Info, WifiOff } from 'lucide-react';

export const App: React.FC = () => {
  const { initialize, activeTab, bannerMessage, dismissBanner } = usePosStore();
  const initAuth = useAuthStore((s) => s.initAuth);

  useEffect(() => {
    initialize();
    initAuth();
  }, [initialize, initAuth]);

  const isOfflineBanner = bannerMessage?.toLowerCase().includes('saved on this device');

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-100 dark:bg-slate-950 font-sans">
      {/* Top Persistent App Header */}
      <Header />

      {/* Main Tab Screen View */}
      <main className="flex-1 flex overflow-hidden relative">
        {activeTab === 'CHECKOUT' && <CheckoutScreen />}
        {activeTab === 'TABLES' && <TableManagementScreen />}
        {activeTab === 'KOT' && <KitchenKotScreen />}
        {activeTab === 'PRODUCTS' && <ProductManagementScreen />}
        {activeTab === 'QUEUE' && <SyncQueueScreen />}
        {activeTab === 'HISTORY' && <SalesHistoryScreen />}
        {activeTab === 'SETTINGS' && <SettingsScreen />}

        {/* Global Toast / Reassurance Banner */}
        {bannerMessage && (
          <div className="absolute bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-40 animate-slideUp max-w-[90vw]">
            <div
              className={`flex items-center gap-2.5 px-4 py-2.5 sm:py-3 rounded-2xl shadow-xl text-xs font-bold border transition-all ${
                isOfflineBanner
                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-800'
                  : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-900 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800'
              }`}
            >
              {isOfflineBanner ? (
                <WifiOff className="w-4 h-4 text-amber-600 shrink-0" />
              ) : (
                <Info className="w-4 h-4 text-emerald-600 shrink-0" />
              )}
              <span className="truncate">{bannerMessage}</span>
              <button
                onClick={dismissBanner}
                className="ml-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 text-sm font-bold"
              >
                ×
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation (Visible on mobile <768px) */}
      <MobileBottomNav />

      {/* Modals & Sheets */}
      <PaymentModal />
      <ReceiptModal />
      <LoginPinModal />
      <KotTicketModal />
    </div>
  );
};

export default App;
