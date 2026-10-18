import { openDB, DBSchema, IDBPDatabase } from 'idb';

export type OrderType = 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number; // in INR
  barcode: string;
  stock: number;
  unit: string;
  isVeg?: boolean;
}

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  unit: string;
  barcode: string;
  category: string;
  isVeg?: boolean;
  customNotes?: string;
}

export interface RestaurantTable {
  id: string;
  name: string; // e.g. Table 1, Bar B-1, Patio P-2
  area: 'Indoor Lounge' | 'Coffee Bar' | 'Outdoor Garden Patio';
  capacity: number;
  status: 'VACANT' | 'OCCUPIED' | 'BILLED';
  currentOrderId?: string;
  cartItems?: CartItem[];
  seatedAt?: number;
  guestCount?: number;
  serverName?: string;
}

export interface KOTRecord {
  id: string;
  kotNumber: string; // e.g. BOT/KOT #104
  tableId?: string;
  tableName?: string;
  orderType: OrderType;
  timestamp: number;
  items: CartItem[];
  status: 'PREPARING' | 'READY' | 'SERVED';
  serverName: string;
  specialInstructions?: string;
}

export interface Sale {
  id: string;
  receiptNumber: string; // e.g. AUR-CAFE-2026-1042
  timestamp: number;
  cashierName: string;
  counterName: string;
  orderType: OrderType;
  tableName?: string;
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  cgst: number; // 2.5% for standalone restaurant/cafe in India or 9% standard
  sgst: number;
  totalGst: number; // 5% cafe GST or 18% standard
  roundOff: number;
  totalAmount: number;
  paymentMethod: 'CASH' | 'UPI' | 'CARD';
  amountTendered: number;
  changeDue: number;
  upiRef?: string;
  syncStatus: 'SAVED_OFFLINE' | 'SYNCING' | 'SYNCED' | 'FAILED';
  syncAttempts: number;
  lastSyncError?: string;
  syncedAt?: number;
}

interface PosDbSchema extends DBSchema {
  products: {
    key: string;
    value: Product;
    indexes: { 'by-category': string };
  };
  sales: {
    key: string;
    value: Sale;
    indexes: { 'by-timestamp': number; 'by-syncStatus': string };
  };
  draftCart: {
    key: string;
    value: CartItem[];
  };
  tables: {
    key: string;
    value: RestaurantTable;
  };
  kotList: {
    key: string;
    value: KOTRecord;
    indexes: { 'by-timestamp': number };
  };
  settings: {
    key: string;
    value: any;
  };
}

const DB_NAME = 'aura_cafe_db';
const DB_VERSION = 3;

let dbPromise: Promise<IDBPDatabase<PosDbSchema>> | null = null;

export function getDb(): Promise<IDBPDatabase<PosDbSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<PosDbSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('products')) {
          const productStore = db.createObjectStore('products', { keyPath: 'id' });
          productStore.createIndex('by-category', 'category');
        }

        if (!db.objectStoreNames.contains('sales')) {
          const saleStore = db.createObjectStore('sales', { keyPath: 'id' });
          saleStore.createIndex('by-timestamp', 'timestamp');
          saleStore.createIndex('by-syncStatus', 'syncStatus');
        }

        if (!db.objectStoreNames.contains('draftCart')) {
          db.createObjectStore('draftCart');
        }

        if (!db.objectStoreNames.contains('tables')) {
          db.createObjectStore('tables', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('kotList')) {
          const kotStore = db.createObjectStore('kotList', { keyPath: 'id' });
          kotStore.createIndex('by-timestamp', 'timestamp');
        }

        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings');
        }
      },
    });
  }
  return dbPromise;
}

// Pure Cafe, Roastery & Bakery Menu Catalog
export const INITIAL_CAFE_PRODUCTS: Product[] = [
  // --- ESPRESSO & SPECIALTY COFFEE ---
  {
    id: 'cafe_1',
    name: 'Artisanal Cappuccino',
    category: 'Coffee & Espresso',
    price: 180.0,
    barcode: 'CF001',
    stock: 99,
    unit: 'Cup (250 ml)',
    isVeg: true,
  },
  {
    id: 'cafe_2',
    name: 'Flat White (Double Ristretto)',
    category: 'Coffee & Espresso',
    price: 195.0,
    barcode: 'CF002',
    stock: 99,
    unit: 'Cup (220 ml)',
    isVeg: true,
  },
  {
    id: 'cafe_3',
    name: 'Classic Americano',
    category: 'Coffee & Espresso',
    price: 150.0,
    barcode: 'CF003',
    stock: 99,
    unit: 'Mug (300 ml)',
    isVeg: true,
  },
  {
    id: 'cafe_4',
    name: 'Iced Caramel Macchiato',
    category: 'Coffee & Espresso',
    price: 220.0,
    barcode: 'CF004',
    stock: 99,
    unit: 'Glass (350 ml)',
    isVeg: true,
  },
  {
    id: 'cafe_5',
    name: 'Spanish Latte (Condensed Milk)',
    category: 'Coffee & Espresso',
    price: 220.0,
    barcode: 'CF005',
    stock: 99,
    unit: 'Cup (250 ml)',
    isVeg: true,
  },
  {
    id: 'cafe_6',
    name: 'Cold Brew Tonic & Citrus',
    category: 'Coffee & Espresso',
    price: 210.0,
    barcode: 'CF006',
    stock: 99,
    unit: 'Glass (300 ml)',
    isVeg: true,
  },
  {
    id: 'cafe_7',
    name: 'Single Origin Espresso (Doppio)',
    category: 'Coffee & Espresso',
    price: 130.0,
    barcode: 'CF007',
    stock: 99,
    unit: 'Shot (60 ml)',
    isVeg: true,
  },
  {
    id: 'cafe_8',
    name: 'Dark Chocolate Mocha',
    category: 'Coffee & Espresso',
    price: 210.0,
    barcode: 'CF008',
    stock: 99,
    unit: 'Mug (300 ml)',
    isVeg: true,
  },
  {
    id: 'cafe_9',
    name: 'Pour-Over V60 (Chikmagalur Estate)',
    category: 'Coffee & Espresso',
    price: 230.0,
    barcode: 'CF009',
    stock: 99,
    unit: 'Carafe (280 ml)',
    isVeg: true,
  },
  {
    id: 'cafe_10',
    name: 'Affogato al Caffe',
    category: 'Coffee & Espresso',
    price: 190.0,
    barcode: 'CF010',
    stock: 99,
    unit: 'Cup',
    isVeg: true,
  },

  // --- TEA & REFRESHERS ---
  {
    id: 'cafe_11',
    name: 'Desi Masala Chai Pot',
    category: 'Tea & Refreshers',
    price: 120.0,
    barcode: 'CF011',
    stock: 99,
    unit: 'Pot (Serves 2)',
    isVeg: true,
  },
  {
    id: 'cafe_12',
    name: 'Japanese Ceremonial Matcha Latte',
    category: 'Tea & Refreshers',
    price: 230.0,
    barcode: 'CF012',
    stock: 99,
    unit: 'Cup (250 ml)',
    isVeg: true,
  },
  {
    id: 'cafe_13',
    name: 'Hibiscus Berry Iced Tea',
    category: 'Tea & Refreshers',
    price: 160.0,
    barcode: 'CF013',
    stock: 99,
    unit: 'Tall Glass',
    isVeg: true,
  },
  {
    id: 'cafe_14',
    name: 'Peach & Jasmine Sparkler',
    category: 'Tea & Refreshers',
    price: 170.0,
    barcode: 'CF014',
    stock: 99,
    unit: 'Tall Glass',
    isVeg: true,
  },
  {
    id: 'cafe_15',
    name: 'Fresh Mint Lime Soda',
    category: 'Tea & Refreshers',
    price: 110.0,
    barcode: 'CF015',
    stock: 99,
    unit: 'Glass',
    isVeg: true,
  },

  // --- BAKERY & PASTRY ---
  {
    id: 'cafe_16',
    name: 'French Butter Croissant',
    category: 'Bakery & Pastry',
    price: 140.0,
    barcode: 'CF016',
    stock: 30,
    unit: '1 Piece',
    isVeg: true,
  },
  {
    id: 'cafe_17',
    name: 'Pain au Chocolat (Dark Belgian)',
    category: 'Bakery & Pastry',
    price: 165.0,
    barcode: 'CF017',
    stock: 25,
    unit: '1 Piece',
    isVeg: true,
  },
  {
    id: 'cafe_18',
    name: 'Blueberry Crumble Muffin',
    category: 'Bakery & Pastry',
    price: 130.0,
    barcode: 'CF018',
    stock: 20,
    unit: '1 Piece',
    isVeg: true,
  },
  {
    id: 'cafe_19',
    name: 'Cinnamon Sugar Swirl Bun',
    category: 'Bakery & Pastry',
    price: 150.0,
    barcode: 'CF019',
    stock: 18,
    unit: '1 Piece',
    isVeg: true,
  },
  {
    id: 'cafe_20',
    name: 'Almond Biscotti Pair',
    category: 'Bakery & Pastry',
    price: 90.0,
    barcode: 'CF020',
    stock: 40,
    unit: '2 Pieces',
    isVeg: true,
  },

  // --- CAFE BITES & TOASTS ---
  {
    id: 'cafe_21',
    name: 'Avocado Toast on Sourdough',
    category: 'Cafe Bites',
    price: 260.0,
    barcode: 'CF021',
    stock: 35,
    unit: 'Plate',
    isVeg: true,
  },
  {
    id: 'cafe_22',
    name: 'Wild Mushroom & Truffle Melt',
    category: 'Cafe Bites',
    price: 280.0,
    barcode: 'CF022',
    stock: 25,
    unit: 'Plate',
    isVeg: true,
  },
  {
    id: 'cafe_23',
    name: 'Pesto Mozzarella Grilled Panini',
    category: 'Cafe Bites',
    price: 240.0,
    barcode: 'CF023',
    stock: 30,
    unit: 'Plate',
    isVeg: true,
  },
  {
    id: 'cafe_24',
    name: 'Paneer Makhani Brioche Roll',
    category: 'Cafe Bites',
    price: 220.0,
    barcode: 'CF024',
    stock: 25,
    unit: 'Plate',
    isVeg: true,
  },
  {
    id: 'cafe_25',
    name: 'Crispy Truffle Parmesan Fries',
    category: 'Cafe Bites',
    price: 210.0,
    barcode: 'CF025',
    stock: 50,
    unit: 'Basket',
    isVeg: true,
  },
  {
    id: 'cafe_26',
    name: 'Classic Belgian Waffles with Maple',
    category: 'Cafe Bites',
    price: 210.0,
    barcode: 'CF026',
    stock: 20,
    unit: 'Plate',
    isVeg: true,
  },

  // --- DESSERTS & SHAKES ---
  {
    id: 'cafe_27',
    name: 'Belgian Truffle Brownie & Gelato',
    category: 'Desserts & Shakes',
    price: 195.0,
    barcode: 'CF027',
    stock: 22,
    unit: 'Plate',
    isVeg: true,
  },
  {
    id: 'cafe_28',
    name: 'Lotus Biscoff Thickshake',
    category: 'Desserts & Shakes',
    price: 240.0,
    barcode: 'CF028',
    stock: 40,
    unit: '350 ml Jar',
    isVeg: true,
  },
  {
    id: 'cafe_29',
    name: 'Classic Espresso Tiramisu Cup',
    category: 'Desserts & Shakes',
    price: 220.0,
    barcode: 'CF029',
    stock: 18,
    unit: 'Cup',
    isVeg: true,
  },
  {
    id: 'cafe_30',
    name: 'Basque Burnt Cheesecake Slice',
    category: 'Desserts & Shakes',
    price: 250.0,
    barcode: 'CF030',
    stock: 15,
    unit: 'Slice',
    isVeg: true,
  },
];

// Cafe Floor Plan: Indoor Lounge, Coffee Bar, Outdoor Garden Patio
export const INITIAL_CAFE_TABLES: RestaurantTable[] = [
  // Indoor Lounge
  { id: 'tbl_1', name: 'Table 1', area: 'Indoor Lounge', capacity: 2, status: 'VACANT', cartItems: [] },
  { id: 'tbl_2', name: 'Table 2', area: 'Indoor Lounge', capacity: 4, status: 'VACANT', cartItems: [] },
  { id: 'tbl_3', name: 'Table 3', area: 'Indoor Lounge', capacity: 4, status: 'VACANT', cartItems: [] },
  { id: 'tbl_4', name: 'Table 4', area: 'Indoor Lounge', capacity: 6, status: 'VACANT', cartItems: [] },

  // Coffee Bar Stools
  { id: 'tbl_5', name: 'Bar Stool B-1', area: 'Coffee Bar', capacity: 1, status: 'VACANT', cartItems: [] },
  { id: 'tbl_6', name: 'Bar Stool B-2', area: 'Coffee Bar', capacity: 1, status: 'VACANT', cartItems: [] },
  { id: 'tbl_7', name: 'Bar Stool B-3', area: 'Coffee Bar', capacity: 1, status: 'VACANT', cartItems: [] },
  { id: 'tbl_8', name: 'Bar Stool B-4', area: 'Coffee Bar', capacity: 1, status: 'VACANT', cartItems: [] },

  // Outdoor Garden Patio
  { id: 'tbl_9', name: 'Patio P-1', area: 'Outdoor Garden Patio', capacity: 2, status: 'VACANT', cartItems: [] },
  { id: 'tbl_10', name: 'Patio P-2', area: 'Outdoor Garden Patio', capacity: 4, status: 'VACANT', cartItems: [] },
  { id: 'tbl_11', name: 'Patio P-3', area: 'Outdoor Garden Patio', capacity: 4, status: 'VACANT', cartItems: [] },
  { id: 'tbl_12', name: 'Patio P-4', area: 'Outdoor Garden Patio', capacity: 6, status: 'VACANT', cartItems: [] },
];

export async function initDb(): Promise<void> {
  const db = await getDb();

  const count = await db.count('products');
  if (count === 0 || count < INITIAL_CAFE_PRODUCTS.length) {
    const tx = db.transaction('products', 'readwrite');
    for (const prod of INITIAL_CAFE_PRODUCTS) {
      await tx.store.put(prod);
    }
    await tx.done;
  }

  const tableCount = await db.count('tables');
  if (tableCount === 0) {
    const tx = db.transaction('tables', 'readwrite');
    for (const tbl of INITIAL_CAFE_TABLES) {
      await tx.store.put(tbl);
    }
    await tx.done;
  }
}

export async function getProducts(): Promise<Product[]> {
  const db = await getDb();
  return db.getAll('products');
}

export async function addOrUpdateProduct(product: Product): Promise<void> {
  const db = await getDb();
  await db.put('products', product);
}

export async function deleteProduct(productId: string): Promise<void> {
  const db = await getDb();
  await db.delete('products', productId);
}

export async function resetToDefaultProducts(): Promise<Product[]> {
  const db = await getDb();
  const tx = db.transaction('products', 'readwrite');
  await tx.store.clear();
  for (const prod of INITIAL_CAFE_PRODUCTS) {
    await tx.store.put(prod);
  }
  await tx.done;
  return db.getAll('products');
}

export async function getTables(): Promise<RestaurantTable[]> {
  const db = await getDb();
  return db.getAll('tables');
}

export async function resetAllTables(): Promise<RestaurantTable[]> {
  const db = await getDb();
  const tx = db.transaction('tables', 'readwrite');
  await tx.store.clear();
  for (const tbl of INITIAL_CAFE_TABLES) {
    await tx.store.put(tbl);
  }
  await tx.done;
  return db.getAll('tables');
}

export async function saveTable(table: RestaurantTable): Promise<void> {
  const db = await getDb();
  await db.put('tables', table);
}

export async function saveKOT(kot: KOTRecord): Promise<void> {
  const db = await getDb();
  await db.put('kotList', kot);
}

export async function updateKOTStatus(
  id: string,
  status: 'PREPARING' | 'READY' | 'SERVED'
): Promise<void> {
  const db = await getDb();
  const kot = await db.get('kotList', id);
  if (kot) {
    kot.status = status;
    await db.put('kotList', kot);
  }
}

export async function deleteKOT(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('kotList', id);
}

export async function clearServedKOTs(): Promise<KOTRecord[]> {
  const db = await getDb();
  const allKots = await db.getAll('kotList');
  const tx = db.transaction('kotList', 'readwrite');
  for (const kot of allKots) {
    if (kot.status === 'SERVED') {
      await tx.store.delete(kot.id);
    }
  }
  await tx.done;
  const remaining = await db.getAllFromIndex('kotList', 'by-timestamp');
  return remaining.reverse();
}

export async function getAllKOTs(): Promise<KOTRecord[]> {
  const db = await getDb();
  const kots = await db.getAllFromIndex('kotList', 'by-timestamp');
  return kots.reverse();
}

// Draft cart persistence
export async function saveDraftCart(items: CartItem[]): Promise<void> {
  const db = await getDb();
  await db.put('draftCart', items, 'current_cart');
}

export async function loadDraftCart(): Promise<CartItem[]> {
  const db = await getDb();
  const cart = await db.get('draftCart', 'current_cart');
  return cart || [];
}

export async function clearDraftCart(): Promise<void> {
  const db = await getDb();
  await db.delete('draftCart', 'current_cart');
}

// Sales & Queue operations
export async function saveSale(sale: Sale): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(['sales', 'draftCart'], 'readwrite');
  await tx.objectStore('sales').put(sale);
  await tx.objectStore('draftCart').delete('current_cart');
  await tx.done;
}

export async function getAllSales(): Promise<Sale[]> {
  const db = await getDb();
  const sales = await db.getAllFromIndex('sales', 'by-timestamp');
  return sales.reverse();
}

export async function getUnsyncedSales(): Promise<Sale[]> {
  const db = await getDb();
  const all = await db.getAllFromIndex('sales', 'by-timestamp');
  return all.filter((s) => s.syncStatus !== 'SYNCED');
}

export async function updateSaleSyncStatus(
  id: string,
  status: 'SAVED_OFFLINE' | 'SYNCING' | 'SYNCED' | 'FAILED',
  error?: string
): Promise<void> {
  const db = await getDb();
  const sale = await db.get('sales', id);
  if (sale) {
    sale.syncStatus = status;
    sale.syncAttempts = (sale.syncAttempts || 0) + 1;
    if (error) {
      sale.lastSyncError = error;
    }
    if (status === 'SYNCED') {
      sale.syncedAt = Date.now();
      sale.lastSyncError = undefined;
    }
    await db.put('sales', sale);
  }
}
