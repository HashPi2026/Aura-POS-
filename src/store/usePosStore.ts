import { create } from 'zustand';
import {
  Product,
  CartItem,
  Sale,
  RestaurantTable,
  KOTRecord,
  OrderType,
  initDb,
  getProducts,
  addOrUpdateProduct,
  deleteProduct,
  resetToDefaultProducts,
  getTables,
  resetAllTables,
  saveTable,
  saveKOT,
  updateKOTStatus,
  deleteKOT,
  clearServedKOTs,
  getAllKOTs,
  saveDraftCart,
  loadDraftCart,
  clearDraftCart,
  saveSale,
  getAllSales,
  getUnsyncedSales,
  updateSaleSyncStatus,
} from '../db/indexedDb';
import { mockServer } from '../api/mockServer';
import { ColorTheme } from '../utils/themePresets';

export interface CartTotals {
  subtotal: number;
  cgst: number;
  sgst: number;
  totalGst: number;
  roundOff: number;
  totalAmount: number;
  totalItems: number;
}

export type ScreenTab = 'CHECKOUT' | 'TABLES' | 'KOT' | 'PRODUCTS' | 'QUEUE' | 'HISTORY' | 'SETTINGS';
export type PrintStatus = 'IDLE' | 'PRINTING' | 'SUCCESS' | 'DISCONNECTED_ERROR';

interface PosState {
  // Cafe Session
  orderType: OrderType;
  selectedTable: RestaurantTable | null;
  tables: RestaurantTable[];
  kots: KOTRecord[];
  activeKotModal: KOTRecord | null;

  isLocked: boolean;
  cashierName: string;
  counterName: string;
  storeName: string;
  storeAddress: string;
  storeGstin: string;

  // Navigation & Theme
  activeTab: ScreenTab;
  isDarkMode: boolean;
  colorTheme: ColorTheme;

  // Products & Filter
  products: Product[];
  selectedCategory: string;
  searchQuery: string;

  // Cart
  cart: CartItem[];
  lastRemovedItem: CartItem | null;

  // Network & Sync
  isOnline: boolean;
  isSyncing: boolean;
  unsyncedCount: number;
  simulateServerFailure: boolean;

  // Bluetooth Thermal Printer
  printerConnected: boolean;
  printerModel: string;
  printStatus: PrintStatus;

  // Sales History
  sales: Sale[];

  // Payment & Receipt Modals
  showPaymentModal: boolean;
  selectedPaymentMethod: 'CASH' | 'UPI' | 'CARD';
  amountTendered: number;
  completedSale: Sale | null;
  showReceiptModal: boolean;

  // Banner / Toast
  bannerMessage: string | null;

  // PWA / Android APK Installation
  canInstall: boolean;
  setCanInstall: (val: boolean) => void;
  triggerInstallPrompt: () => Promise<void>;

  // Actions
  initialize: () => Promise<void>;
  setOrderType: (type: OrderType) => void;
  selectTable: (table: RestaurantTable | null) => void;
  occupyTable: (tableId: string, guestCount: number) => Promise<void>;
  vacateTable: (tableId: string) => Promise<void>;
  resetFloorPlan: () => Promise<void>;
  sendKOT: (specialInstructions?: string) => Promise<void>;
  updateKotStatus: (id: string, status: 'PREPARING' | 'READY' | 'SERVED') => Promise<void>;
  deleteKotTicket: (id: string) => Promise<void>;
  clearServedKotTickets: () => Promise<void>;
  closeKotModal: () => void;
  setItemNotes: (productId: string, notes: string) => void;

  setActiveTab: (tab: ScreenTab) => void;
  toggleDarkMode: () => void;
  setColorTheme: (theme: ColorTheme) => void;
  unlockWithPin: (pin: string) => boolean;
  lockTerminal: () => void;
  setCategory: (category: string) => void;
  setSearchQuery: (query: string) => void;

  saveProduct: (product: Product) => Promise<void>;
  removeProduct: (productId: string) => Promise<void>;
  resetDemoCatalog: () => Promise<void>;

  // Cart actions
  addToCart: (product: Product, notes?: string) => void;
  decrementQuantity: (productId: string) => void;
  removeFromCart: (productId: string) => void;
  undoRemove: () => void;
  clearCart: () => void;
  syncTableCart: (updatedCart: CartItem[]) => Promise<void>;
  getTotals: () => CartTotals;

  // Payment & Sales
  openPaymentModal: () => void;
  closePaymentModal: () => void;
  setPaymentMethod: (method: 'CASH' | 'UPI' | 'CARD') => void;
  setAmountTendered: (amount: number) => void;
  completeSale: () => Promise<void>;

  // Receipt & Printer
  closeReceiptModal: () => void;
  viewReceipt: (sale: Sale) => void;
  togglePrinter: () => void;
  printReceipt: () => void;

  // Network & Sync Actions
  toggleOnline: () => void;
  toggleServerFailure: () => void;
  drainSyncQueue: () => Promise<void>;
  retrySingleSale: (saleId: string) => Promise<void>;
  showBanner: (msg: string) => void;
  dismissBanner: () => void;
}

let deferredInstallPrompt: any = null;

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    try {
      usePosStore.getState().setCanInstall(true);
    } catch (_) {}
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    try {
      usePosStore.getState().setCanInstall(false);
      usePosStore.getState().showBanner('Aura Cafe installed successfully!');
    } catch (_) {}
  });
}

export const usePosStore = create<PosState>((set, get) => ({
  orderType: 'DINE_IN',
  selectedTable: null,
  tables: [],
  kots: [],
  activeKotModal: null,

  isLocked: false,
  cashierName: 'Barista Ramesh',
  counterName: 'Espresso Bar 1',
  storeName: 'Aura Cafe & Roastery',
  storeAddress: '12th Main, Indiranagar Coffee Street, Bengaluru',
  storeGstin: '29AAAAA0000A1Z5',

  activeTab: 'CHECKOUT',
  isDarkMode: false,
  colorTheme: 'teal',

  products: [],
  selectedCategory: 'All',
  searchQuery: '',

  cart: [],
  lastRemovedItem: null,

  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  isSyncing: false,
  unsyncedCount: 0,
  simulateServerFailure: false,

  printerConnected: true,
  printerModel: 'Aura-BT58P Thermal (58mm)',
  printStatus: 'IDLE',

  sales: [],

  showPaymentModal: false,
  selectedPaymentMethod: 'CASH',
  amountTendered: 0,
  completedSale: null,
  showReceiptModal: false,

  bannerMessage: null,

  canInstall: false,
  setCanInstall: (val: boolean) => set({ canInstall: val }),
  triggerInstallPrompt: async () => {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      const choice = await deferredInstallPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        get().showBanner('Installing Aura Cafe app on this device...');
      }
      deferredInstallPrompt = null;
      set({ canInstall: false });
    } else {
      get().showBanner('To install on Android: Tap Chrome menu (⋮) -> "Install app" or "Add to Home screen"');
    }
  },

  initialize: async () => {
    await initDb();
    const products = await getProducts();
    const tables = await getTables();
    const kots = await getAllKOTs();
    const draftCart = await loadDraftCart();
    const sales = await getAllSales();
    const unsynced = await getUnsyncedSales();

    // Dark mode preference
    const savedTheme = localStorage.getItem('aura_theme');
    const isDark = savedTheme === 'dark';
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    // Color theme preference
    const savedColorTheme = (localStorage.getItem('aura_color_theme') as ColorTheme) || 'teal';
    document.documentElement.setAttribute('data-theme', savedColorTheme);

    set({
      products,
      tables,
      kots,
      cart: draftCart,
      sales,
      unsyncedCount: unsynced.length,
      isDarkMode: isDark,
      colorTheme: savedColorTheme,
    });

    window.addEventListener('online', () => {
      set({ isOnline: true });
      get().drainSyncQueue();
    });
    window.addEventListener('offline', () => {
      set({ isOnline: false });
    });
  },

  setOrderType: (type: OrderType) => {
    if (type !== 'DINE_IN') {
      set({ orderType: type, selectedTable: null });
    } else {
      set({ orderType: type });
    }
  },

  selectTable: async (newTable: RestaurantTable | null) => {
    const { selectedTable, cart, tables } = get();

    // 1. If currently on a different table, save current cart to that table
    if (selectedTable && selectedTable.id !== newTable?.id) {
      const updatedTables = tables.map((t) =>
        t.id === selectedTable.id
          ? {
              ...t,
              status: cart.length > 0 ? ('OCCUPIED' as const) : t.status,
              cartItems: [...cart],
              seatedAt: t.seatedAt || (cart.length > 0 ? Date.now() : undefined),
            }
          : t
      );
      const target = updatedTables.find((t) => t.id === selectedTable.id);
      if (target) await saveTable(target);
      set({ tables: updatedTables });
    }

    // 2. Open newTable with its own isolated cart
    if (newTable) {
      const currentNewTable = get().tables.find((t) => t.id === newTable.id) || newTable;
      const tableCart =
        currentNewTable.cartItems && currentNewTable.cartItems.length > 0
          ? [...currentNewTable.cartItems]
          : [];

      set({
        selectedTable: currentNewTable,
        cart: tableCart,
        lastRemovedItem: null,
        activeTab: 'CHECKOUT',
        orderType: 'DINE_IN',
      });
      await saveDraftCart(tableCart);

      if (tableCart.length > 0) {
        get().showBanner(`Loaded active order for ${currentNewTable.name} (${tableCart.length} items)`);
      } else {
        get().showBanner(`Selected ${currentNewTable.name} (Ready for order)`);
      }
    } else {
      set({ selectedTable: null, cart: [], lastRemovedItem: null });
      await saveDraftCart([]);
    }
  },

  occupyTable: async (tableId: string, guestCount: number) => {
    const { tables } = get();
    const updated = tables.map((t) =>
      t.id === tableId
        ? {
            ...t,
            status: 'OCCUPIED' as const,
            seatedAt: Date.now(),
            guestCount,
            serverName: get().cashierName.split(' ')[1] || 'Barista',
            cartItems: [], // Fresh table starts with 0 items
          }
        : t
    );
    const target = updated.find((t) => t.id === tableId);
    if (target) await saveTable(target);
    set({ tables: updated, selectedTable: target || null, cart: [], lastRemovedItem: null });
    await saveDraftCart([]);
  },

  vacateTable: async (tableId: string) => {
    const { tables, selectedTable } = get();
    const updated = tables.map((t) =>
      t.id === tableId
        ? {
            ...t,
            status: 'VACANT' as const,
            currentOrderId: undefined,
            cartItems: [],
            seatedAt: undefined,
            guestCount: undefined,
          }
        : t
    );
    const target = updated.find((t) => t.id === tableId);
    if (target) await saveTable(target);
    const isCurrent = selectedTable?.id === tableId;
    set({
      tables: updated,
      selectedTable: isCurrent ? null : selectedTable,
      cart: isCurrent ? [] : get().cart,
      lastRemovedItem: null,
    });
    if (isCurrent) await saveDraftCart([]);
    get().showBanner('Table cleared and marked vacant');
  },

  resetFloorPlan: async () => {
    const tables = await resetAllTables();
    set({ tables, selectedTable: null, cart: [], lastRemovedItem: null });
    await clearDraftCart();
    get().showBanner('Reset all cafe tables & cleared all table orders!');
  },

  sendKOT: async (specialInstructions?: string) => {
    const { cart, selectedTable, orderType, cashierName, kots, tables, printerConnected } = get();
    if (cart.length === 0) return;

    const kotNumber = `KOT #${101 + kots.length}`;
    const newKot: KOTRecord = {
      id: `kot_${Date.now()}`,
      kotNumber,
      tableId: selectedTable?.id,
      tableName: selectedTable?.name || (orderType === 'TAKEAWAY' ? 'Takeaway Counter' : 'Online Delivery'),
      orderType,
      timestamp: Date.now(),
      items: [...cart],
      status: 'PREPARING',
      serverName: cashierName,
      specialInstructions: specialInstructions || undefined,
    };

    await saveKOT(newKot);

    if (selectedTable) {
      const updatedTables = tables.map((t) =>
        t.id === selectedTable.id
          ? { ...t, status: 'OCCUPIED' as const, cartItems: [...cart], seatedAt: t.seatedAt || Date.now() }
          : t
      );
      const target = updatedTables.find((t) => t.id === selectedTable.id);
      if (target) await saveTable(target);
      set({ tables: updatedTables });
    }

    set({
      kots: [newKot, ...kots],
      activeKotModal: newKot,
    });

    if (printerConnected) {
      get().showBanner(`${kotNumber} printed to Barista & Kitchen!`);
    } else {
      get().showBanner(`${kotNumber} sent to Kitchen line`);
    }
  },

  updateKotStatus: async (id, status) => {
    await updateKOTStatus(id, status);
    const { kots } = get();
    const updated = kots.map((k) => (k.id === id ? { ...k, status } : k));
    set({ kots: updated });
    const target = updated.find((k) => k.id === id);
    get().showBanner(`${target?.kotNumber || 'KOT'} status updated to ${status}`);
  },

  deleteKotTicket: async (id) => {
    await deleteKOT(id);
    const { kots } = get();
    set({ kots: kots.filter((k) => k.id !== id) });
    get().showBanner('KOT ticket removed');
  },

  clearServedKotTickets: async () => {
    const remaining = await clearServedKOTs();
    set({ kots: remaining });
    get().showBanner('Cleared all served KOT tickets');
  },

  closeKotModal: () => set({ activeKotModal: null }),

  setItemNotes: (productId: string, notes: string) => {
    const { cart } = get();
    const updated = cart.map((item) =>
      item.productId === productId ? { ...item, customNotes: notes } : item
    );
    set({ cart: updated });
    saveDraftCart(updated);
  },

  setActiveTab: (tab) => set({ activeTab: tab }),

  toggleDarkMode: () => {
    const nextDark = !get().isDarkMode;
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('aura_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('aura_theme', 'light');
    }
    set({ isDarkMode: nextDark });
  },

  setColorTheme: (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('aura_color_theme', theme);
    set({ colorTheme: theme });
  },

  unlockWithPin: (pin) => {
    if (pin === '1234' || pin.length === 4) {
      set({ isLocked: false });
      return true;
    }
    return false;
  },

  lockTerminal: () => set({ isLocked: true }),

  setCategory: (category) => set({ selectedCategory: category }),
  setSearchQuery: (query) => set({ searchQuery: query }),

  saveProduct: async (product) => {
    await addOrUpdateProduct(product);
    const products = await getProducts();
    set({ products });
    get().showBanner(`Item "${product.name}" saved!`);
  },

  removeProduct: async (productId) => {
    await deleteProduct(productId);
    const products = await getProducts();
    set({ products });
    get().showBanner('Item removed from menu');
  },

  resetDemoCatalog: async () => {
    const products = await resetToDefaultProducts();
    set({ products, selectedCategory: 'All', searchQuery: '' });
    get().showBanner('Reset all 30 Cafe & Roastery menu items!');
  },

  syncTableCart: async (updatedCart: CartItem[]) => {
    const { selectedTable, tables } = get();
    if (selectedTable) {
      const updatedTables = tables.map((t) =>
        t.id === selectedTable.id
          ? {
              ...t,
              status: updatedCart.length > 0 ? ('OCCUPIED' as const) : t.status,
              cartItems: [...updatedCart],
              seatedAt: t.seatedAt || (updatedCart.length > 0 ? Date.now() : undefined),
            }
          : t
      );
      const target = updatedTables.find((t) => t.id === selectedTable.id);
      if (target) await saveTable(target);
      set({ tables: updatedTables, selectedTable: target || null });
    }
  },

  addToCart: (product, notes) => {
    const { cart } = get();
    const existingIndex = cart.findIndex(
      (item) => item.productId === product.id && item.customNotes === notes
    );

    let updatedCart: CartItem[];
    if (existingIndex > -1) {
      updatedCart = cart.map((item, idx) =>
        idx === existingIndex ? { ...item, quantity: item.quantity + 1 } : item
      );
    } else {
      const newItem: CartItem = {
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
        unit: product.unit,
        barcode: product.barcode,
        category: product.category,
        isVeg: product.isVeg,
        customNotes: notes,
      };
      updatedCart = [...cart, newItem];
    }

    set({ cart: updatedCart, lastRemovedItem: null });
    saveDraftCart(updatedCart);
    get().syncTableCart(updatedCart);
  },

  decrementQuantity: (productId) => {
    const { cart } = get();
    const existing = cart.find((item) => item.productId === productId);
    if (!existing) return;

    let updatedCart: CartItem[];
    if (existing.quantity > 1) {
      updatedCart = cart.map((item) =>
        item.productId === productId ? { ...item, quantity: item.quantity - 1 } : item
      );
      set({ cart: updatedCart });
      saveDraftCart(updatedCart);
      get().syncTableCart(updatedCart);
    } else {
      get().removeFromCart(productId);
    }
  },

  removeFromCart: (productId) => {
    const { cart } = get();
    const removedItem = cart.find((item) => item.productId === productId);
    const updatedCart = cart.filter((item) => item.productId !== productId);
    set({ cart: updatedCart, lastRemovedItem: removedItem || null });
    saveDraftCart(updatedCart);
    get().syncTableCart(updatedCart);
  },

  undoRemove: () => {
    const { lastRemovedItem, cart } = get();
    if (!lastRemovedItem) return;
    const updatedCart = [...cart, lastRemovedItem];
    set({ cart: updatedCart, lastRemovedItem: null });
    saveDraftCart(updatedCart);
    get().syncTableCart(updatedCart);
  },

  clearCart: async () => {
    const { selectedTable, tables } = get();
    if (selectedTable) {
      const updatedTables = tables.map((t) =>
        t.id === selectedTable.id ? { ...t, cartItems: [] } : t
      );
      const target = updatedTables.find((t) => t.id === selectedTable.id);
      if (target) await saveTable(target);
      set({ tables: updatedTables, selectedTable: target || null });
    }
    set({ cart: [], lastRemovedItem: null });
    await clearDraftCart();
    get().showBanner('Order cleared');
  },

  getTotals: () => {
    const { cart } = get();
    const totalItems = cart.reduce((acc, it) => acc + it.quantity, 0);
    const subtotal = cart.reduce((acc, it) => acc + it.price * it.quantity, 0);

    // Standard Cafe GST in India: 2.5% CGST + 2.5% SGST = 5% Total GST
    const cgst = Math.round(subtotal * 0.025 * 100) / 100;
    const sgst = Math.round(subtotal * 0.025 * 100) / 100;
    const totalGst = Math.round((cgst + sgst) * 100) / 100;

    const rawTotal = subtotal + totalGst;
    const roundedTotal = Math.round(rawTotal);
    const roundOff = Math.round((roundedTotal - rawTotal) * 100) / 100;

    return {
      subtotal,
      cgst,
      sgst,
      totalGst,
      roundOff,
      totalAmount: roundedTotal,
      totalItems,
    };
  },

  openPaymentModal: () => {
    const totals = get().getTotals();
    set({
      showPaymentModal: true,
      amountTendered: totals.totalAmount,
    });
  },

  closePaymentModal: () => set({ showPaymentModal: false }),
  setPaymentMethod: (method) => set({ selectedPaymentMethod: method }),
  setAmountTendered: (amount) => set({ amountTendered: amount }),

  completeSale: async () => {
    const state = get();
    const totals = state.getTotals();
    if (state.cart.length === 0) return;

    const receiptNum = `AUR-CF-${new Date().getFullYear()}-${1000 + state.sales.length + 1}`;
    const newSale: Sale = {
      id: crypto.randomUUID ? crypto.randomUUID() : `sale_${Date.now()}_${Math.random()}`,
      receiptNumber: receiptNum,
      timestamp: Date.now(),
      cashierName: state.cashierName,
      counterName: state.counterName,
      orderType: state.orderType,
      tableName: state.selectedTable?.name,
      items: [...state.cart],
      itemCount: totals.totalItems,
      subtotal: totals.subtotal,
      cgst: totals.cgst,
      sgst: totals.sgst,
      totalGst: totals.totalGst,
      roundOff: totals.roundOff,
      totalAmount: totals.totalAmount,
      paymentMethod: state.selectedPaymentMethod,
      amountTendered: state.amountTendered,
      changeDue: Math.max(0, state.amountTendered - totals.totalAmount),
      upiRef: state.selectedPaymentMethod === 'UPI' ? `UPI${Date.now().toString().slice(-8)}` : undefined,
      syncStatus: 'SAVED_OFFLINE',
      syncAttempts: 0,
    };

    if (state.selectedTable) {
      await state.vacateTable(state.selectedTable.id);
    }

    await saveSale(newSale);

    const updatedSales = [newSale, ...state.sales];
    const unsynced = await getUnsyncedSales();

    set({
      sales: updatedSales,
      cart: [],
      unsyncedCount: unsynced.length,
      showPaymentModal: false,
      completedSale: newSale,
      showReceiptModal: true,
      lastRemovedItem: null,
    });

    if (state.printerConnected) {
      get().printReceipt();
    }

    if (!state.isOnline) {
      get().showBanner(`Cafe Sale ${receiptNum} saved offline. Will sync when online.`);
    } else {
      get().drainSyncQueue();
    }
  },

  closeReceiptModal: () => set({ showReceiptModal: false, completedSale: null }),
  viewReceipt: (sale) => set({ completedSale: sale, showReceiptModal: true }),

  togglePrinter: () => {
    const next = !get().printerConnected;
    set({ printerConnected: next });
    get().showBanner(next ? 'Bluetooth Thermal Printer connected (58mm)' : 'Printer disconnected');
  },

  printReceipt: () => {
    const { printerConnected } = get();
    if (!printerConnected) {
      set({ printStatus: 'DISCONNECTED_ERROR' });
      return;
    }
    set({ printStatus: 'PRINTING' });
    setTimeout(() => {
      set({ printStatus: 'SUCCESS' });
      try {
        window.print();
      } catch (_) {}
    }, 700);
  },

  toggleOnline: () => {
    const next = !get().isOnline;
    set({ isOnline: next });
    if (next) {
      get().showBanner('Connection restored. Running sync queue...');
      get().drainSyncQueue();
    } else {
      get().showBanner('Simulating Offline Mode. Orders store in local IndexedDB.');
    }
  },

  toggleServerFailure: () => {
    const next = !get().simulateServerFailure;
    set({ simulateServerFailure: next });
    mockServer.setSimulateError(next);
    get().showBanner(next ? 'Server failure simulation ENABLED' : 'Server failure simulation DISABLED');
  },

  drainSyncQueue: async () => {
    const { isSyncing, isOnline, unsyncedCount } = get();
    if (isSyncing || !isOnline || unsyncedCount === 0) return;

    set({ isSyncing: true });
    try {
      const unsynced = await getUnsyncedSales();
      for (const sale of unsynced) {
        await updateSaleSyncStatus(sale.id, 'SYNCING');
        try {
          const res = await mockServer.syncSale(sale);
          if (res.success) {
            await updateSaleSyncStatus(sale.id, 'SYNCED');
          } else {
            await updateSaleSyncStatus(sale.id, 'FAILED', res.error || 'Server error');
            break;
          }
        } catch (err: any) {
          await updateSaleSyncStatus(sale.id, 'FAILED', err.message || 'Network failure');
          break;
        }
      }
    } finally {
      const remaining = await getUnsyncedSales();
      const updatedSales = await getAllSales();
      set({
        unsyncedCount: remaining.length,
        sales: updatedSales,
        isSyncing: false,
      });
    }
  },

  retrySingleSale: async (saleId: string) => {
    const { isOnline } = get();
    if (!isOnline) {
      get().showBanner('Cannot sync while offline. Reconnect to retry.');
      return;
    }
    const sale = get().sales.find((s) => s.id === saleId);
    if (!sale) return;

    await updateSaleSyncStatus(sale.id, 'SYNCING');
    try {
      const res = await mockServer.syncSale(sale);
      if (res.success) {
        await updateSaleSyncStatus(sale.id, 'SYNCED');
        get().showBanner(`Receipt ${sale.receiptNumber} synced!`);
      } else {
        await updateSaleSyncStatus(sale.id, 'FAILED', res.error || 'Server error');
        get().showBanner(`Sync failed: ${res.error}`);
      }
    } catch (err: any) {
      await updateSaleSyncStatus(sale.id, 'FAILED', err.message);
      get().showBanner(`Sync failed: ${err.message}`);
    } finally {
      const remaining = await getUnsyncedSales();
      const updatedSales = await getAllSales();
      set({ unsyncedCount: remaining.length, sales: updatedSales });
    }
  },

  showBanner: (msg: string) => {
    set({ bannerMessage: msg });
    setTimeout(() => {
      if (get().bannerMessage === msg) {
        set({ bannerMessage: null });
      }
    }, 4500);
  },

  dismissBanner: () => set({ bannerMessage: null }),
}));
