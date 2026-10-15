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
import { KotTicketModal } from './components/KotTicketModal';
import { LoginScreen } from './components/LoginScreen';
import { MobileBottomNav } from './components/MobileBottomNav';
import { usePosStore } from './store/usePosStore';
import { useAuthStore } from './store/useAuthStore';
import { realtimeSyncService } from './services/RealtimeSyncService';
import { Info, WifiOff, Coffee } from 'lucide-react';

export const App: React.FC = () => {
  const { initialize, activeTab, bannerMessage, dismissBanner, isLocked, reloadBusinessData } = usePosStore();
  const { initAuth, user, isConfigured, isLoading, isStandaloneMode, currentBusiness } = useAuthStore();
  const currentBusinessId = currentBusiness?.id;

  useEffect(() => {
    initialize();
    initAuth();
    realtimeSyncService.start();
    return () => {
      realtimeSyncService.stop();
    };
  }, [initialize, initAuth]);

  useEffect(() => {
    if (currentBusinessId) {
      reloadBusinessData(currentBusinessId);
    }
  }, [currentBusinessId, reloadBusinessData]);

  // Loading Splash Screen while checking session
  if (isLoading) {
    return (
      <div className="flex h-[100dvh] w-screen items-center justify-center bg-slate-900 text-white select-none">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-600 flex items-center justify-center shadow-lg animate-pulse">
            <Coffee className="w-6 h-6 text-white" />
          </div>
          <div className="flex items-center gap-2 mt-2">
            <div className="w-3 h-3 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-semibold text-slate-400">Initializing Aura POS Terminal...</span>
          </div>
        </div>
      </div>
    );
  }

  // Clear 2-Tier Login Gate:
  // If terminal is locked for staff, OR if cloud auth is unauthenticated and not yet in standalone mode
  const showLoginGate = isLocked || (!user && !isStandaloneMode);

  if (showLoginGate) {
    return (
      <LoginScreen
        onUnlock={() => {
          useAuthStore.setState({ isStandaloneMode: true });
          if (typeof localStorage !== 'undefined') {
            localStorage.setItem('aura_standalone_mode', 'true');
          }
          usePosStore.setState({ isLocked: false, activeTab: 'CHECKOUT' });
        }}
      />
    );
  }

  const isOfflineBanner = bannerMessage?.toLowerCase().includes('saved on this device');

  return (
    <div className="flex flex-col h-[100dvh] min-h-[100dvh] max-h-[100dvh] w-screen overflow-hidden bg-slate-100 dark:bg-slate-950 font-sans">
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
      <KotTicketModal />
    </div>
  );
};

export default App;
