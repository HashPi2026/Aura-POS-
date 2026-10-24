import fs from 'fs';
import path from 'path';

export interface ProductItem {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  unit: string;
  taxRate: number;
  available: boolean;
  image?: string;
}

export interface TableItem {
  id: string;
  name: string;
  area: string;
  seats: number;
  status: 'AVAILABLE' | 'OCCUPIED' | 'BILLED';
  currentOrderId?: string;
  cartItems?: any[];
  guestCount?: number;
}

export interface StaffItem {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  role: 'owner' | 'cashier' | 'waiter' | 'kitchen' | 'accountant';
  pin: string;
  phone?: string;
  isActive: boolean;
}

export interface SaleItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  selectedOptions?: string[];
  notes?: string;
}

export interface SaleRecord {
  id: string;
  receiptNumber: string;
  timestamp: number;
  cashierName: string;
  counterName: string;
  orderType: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
  tableName?: string;
  items: SaleItem[];
  itemCount: number;
  subtotal: number;
  cgst: number;
  sgst: number;
  totalGst: number;
  roundOff: number;
  totalAmount: number;
  paymentMethod: 'CASH' | 'UPI' | 'CARD';
  amountTendered: number;
  changeDue: number;
  upiRef?: string;
  syncStatus: 'SYNCED' | 'SAVED_OFFLINE' | 'FAILED';
  syncedAt?: number;
}

export interface KotRecord {
  id: string;
  kotNumber: string;
  timestamp: number;
  tableName: string;
  orderType: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
  items: {
    productId: string;
    name: string;
    quantity: number;
    notes?: string;
    selectedOptions?: string[];
  }[];
  status: 'PREPARING' | 'READY' | 'SERVED';
  specialInstructions?: string;
}

export interface BusinessProfile {
  id: string;
  name: string;
  businessType: string;
  taxIdentifier: string;
  address: string;
  phone: string;
  ownerName?: string;
  ownerPhone?: string;
  ownerEmail?: string;
  currency: string;
  timezone: string;
  taxRate: number;
}

export interface PosDatabaseSchema {
  business: BusinessProfile;
  staff: StaffItem[];
  products: ProductItem[];
  tables: TableItem[];
  sales: SaleRecord[];
  kots: KotRecord[];
}

const DEFAULT_PRODUCTS: ProductItem[] = [
  {
    id: 'prod_cappuccino',
    name: 'Artisanal Cappuccino',
    category: 'Coffee & Espresso',
    price: 180,
    description: 'Double ristretto espresso, velvety textured whole milk, microfoam cocoa dusting',
    unit: 'Cup (250 ml)',
    taxRate: 5,
    available: true,
  },
  {
    id: 'prod_affogato',
    name: 'Affogato al Caffe',
    category: 'Coffee & Espresso',
    price: 190,
    description: 'Madagascar vanilla gelato topped with a freshly pulled double espresso shot',
    unit: 'Cup',
    taxRate: 5,
    available: true,
  },
  {
    id: 'prod_chai_pot',
    name: 'Desi Masala Chai Pot',
    category: 'Tea & Refreshers',
    price: 120,
    description: 'Slow-simmered Assam CTC tea leaves, fresh ginger, crushed green cardamom & cinnamon',
    unit: 'Pot (Serves 2)',
    taxRate: 5,
    available: true,
  },
  {
    id: 'prod_matcha_latte',
    name: 'Japanese Ceremonial Matcha Latte',
    category: 'Tea & Refreshers',
    price: 230,
    description: 'First-harvest Uji ceremonial matcha stone-ground and whisked with steamed oat milk',
    unit: 'Cup (250 ml)',
    taxRate: 5,
    available: true,
  },
  {
    id: 'prod_hibiscus_tea',
    name: 'Hibiscus Berry Iced Tea',
    category: 'Tea & Refreshers',
    price: 160,
    description: 'Cold-brewed organic Sudanese hibiscus flower calyces with mixed berry reduction',
    unit: 'Tall Glass',
    taxRate: 5,
    available: true,
  },
  {
    id: 'prod_sparkler',
    name: 'Peach & Jasmine Sparkler',
    category: 'Tea & Refreshers',
    price: 170,
    description: 'White peach compote, fragrant jasmine green tea infusion, sparkling soda',
    unit: 'Tall Glass',
    taxRate: 5,
    available: true,
  },
  {
    id: 'prod_mint_soda',
    name: 'Fresh Mint Lime Soda',
    category: 'Tea & Refreshers',
    price: 110,
    description: 'Hand-squeezed yellow lime juice, muddled fresh garden mint, pink rock salt',
    unit: 'Glass',
    taxRate: 5,
    available: true,
  },
  {
    id: 'prod_croissant',
    name: 'French Butter Croissant',
    category: 'Bakery & Pastry',
    price: 140,
    description: 'Traditional 32-layer laminated pastry made with pure Normandy butter',
    unit: '1 Piece',
    taxRate: 5,
    available: true,
  },
  {
    id: 'prod_pain_au_chocolat',
    name: 'Pain au Chocolat (Dark Belgian)',
    category: 'Bakery & Pastry',
    price: 165,
    description: 'Flaky buttery layers rolled around dual batons of 70% dark Belgian chocolate',
    unit: '1 Piece',
    taxRate: 5,
    available: true,
  },
  {
    id: 'prod_muffin',
    name: 'Blueberry Crumble Muffin',
    category: 'Bakery & Pastry',
    price: 130,
    description: 'Moist vanilla sour-cream muffin studded with wild blueberries',
    unit: '1 Piece',
    taxRate: 5,
    available: true,
  },
  {
    id: 'prod_cinnamon_swirl',
    name: 'Cinnamon Sugar Swirl Bun',
    category: 'Bakery & Pastry',
    price: 150,
    description: 'Rolled brioche dough filled with Vietnamese cinnamon, demerara sugar',
    unit: '1 Piece',
    taxRate: 5,
    available: true,
  },
  {
    id: 'prod_flat_white',
    name: 'Flat White (Double Ristretto)',
    category: 'Coffee & Espresso',
    price: 195,
    description: 'Short ristretto pull topped with a silky layer of micro-textured milk',
    unit: 'Cup (220 ml)',
    taxRate: 5,
    available: true,
  },
  {
    id: 'prod_biscotti',
    name: 'Almond Biscotti Pair',
    category: 'Bakery & Pastry',
    price: 90,
    description: 'Twice-baked Tuscan almond cantucci, perfect for dunking into espresso',
    unit: '2 Pieces',
    taxRate: 5,
    available: true,
  },
  {
    id: 'prod_avocado_toast',
    name: 'Avocado Toast on Sourdough',
    category: 'Cafe Bites',
    price: 260,
    description: 'Artisan country sourdough slice, hass avocado mash, cherry tomatoes, feta',
    unit: 'Plate',
    taxRate: 5,
    available: true,
  },
  {
    id: 'prod_mushroom_toast',
    name: 'Wild Mushroom & Truffle Melt',
    category: 'Cafe Bites',
    price: 280,
    description: 'Sauteed shiitake & button mushrooms, fontina cheese melt, black truffle butter',
    unit: 'Plate',
    taxRate: 5,
    available: true,
  },
];

const DEFAULT_TABLES: TableItem[] = [
  { id: 'T1', name: 'Table 1', area: 'Indoor AC (Ground)', seats: 2, status: 'AVAILABLE' },
  { id: 'T2', name: 'Table 2', area: 'Indoor AC (Ground)', seats: 4, status: 'AVAILABLE' },
  { id: 'T3', name: 'Table 3', area: 'Indoor AC (Ground)', seats: 4, status: 'AVAILABLE' },
  { id: 'T4', name: 'Table 4 (Booth)', area: 'Indoor AC (Ground)', seats: 6, status: 'AVAILABLE' },
  { id: 'T5', name: 'Patio P1', area: 'Alfresco Garden', seats: 2, status: 'AVAILABLE' },
  { id: 'T6', name: 'Patio P2', area: 'Alfresco Garden', seats: 4, status: 'AVAILABLE' },
  { id: 'T7', name: 'Bar Counter B1', area: 'Espresso Roastery Bar', seats: 1, status: 'AVAILABLE' },
  { id: 'T8', name: 'Bar Counter B2', area: 'Espresso Roastery Bar', seats: 1, status: 'AVAILABLE' },
];

const DEFAULT_STAFF: StaffItem[] = [
  { id: '22222222-2222-2222-2222-222222222222', userId: '22222222-2222-2222-2222-222222222222', fullName: 'Rahul Patel', email: 'spicecafe@gmail.com', role: 'owner', pin: '1111', isActive: true },
  { id: '22222222-2222-2222-2222-222222222223', userId: '22222222-2222-2222-2222-222222222223', fullName: 'Priya Cashier', email: 'priya.cashier@spicecafe.com', role: 'cashier', pin: '1234', isActive: true },
  { id: '22222222-2222-2222-2222-222222222224', userId: '22222222-2222-2222-2222-222222222224', fullName: 'Vikram Server', email: 'vikram.waiter@spicecafe.com', role: 'waiter', pin: '2222', isActive: true },
  { id: '22222222-2222-2222-2222-222222222225', userId: '22222222-2222-2222-2222-222222222225', fullName: 'Chef Anand', email: 'chef.anand@spicecafe.com', role: 'kitchen', pin: '3333', isActive: true },
];

const DEFAULT_BUSINESS: BusinessProfile = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Spice Cafe',
  businessType: 'cafe',
  taxIdentifier: '29AABCS1234F1Z8',
  address: 'Sharthi Residency, Kumbhariya Gam, Surat, 395010',
  phone: '+91 80 2520 8900',
  currency: 'INR',
  timezone: 'Asia/Kolkata',
  taxRate: 5.0,
};

class PosDatabase {
  private data: PosDatabaseSchema;
  private filePath: string;

  constructor() {
    const dataDir = path.resolve(process.cwd(), 'backend', 'data');
    if (!fs.existsSync(dataDir)) {
      try {
        fs.mkdirSync(dataDir, { recursive: true });
      } catch (_) {}
    }
    this.filePath = path.join(dataDir, 'aura_pos_db.json');

    this.data = {
      business: { ...DEFAULT_BUSINESS },
      staff: [...DEFAULT_STAFF],
      products: [...DEFAULT_PRODUCTS],
      tables: [...DEFAULT_TABLES],
      sales: [],
      kots: [],
    };

    this.loadFromDisk();
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed.business) this.data.business = parsed.business;
        if (Array.isArray(parsed.staff) && parsed.staff.length > 0) this.data.staff = parsed.staff;
        if (Array.isArray(parsed.products) && parsed.products.length > 0) this.data.products = parsed.products;
        if (Array.isArray(parsed.tables) && parsed.tables.length > 0) this.data.tables = parsed.tables;
        if (Array.isArray(parsed.sales)) this.data.sales = parsed.sales;
        if (Array.isArray(parsed.kots)) this.data.kots = parsed.kots;
      } else {
        this.saveToDisk();
      }
    } catch (err) {
      console.warn('Could not load database file, using in-memory defaults:', err);
    }
  }

  private saveToDisk() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to persist database to disk:', err);
    }
  }

  // Business
  public getBusiness(): BusinessProfile {
    return { ...this.data.business };
  }

  public updateBusiness(updates: Partial<BusinessProfile>): BusinessProfile {
    this.data.business = { ...this.data.business, ...updates };
    this.saveToDisk();
    return this.getBusiness();
  }

  // Staff
  public getStaff(): StaffItem[] {
    return [...this.data.staff];
  }

  public findStaffByPin(pin: string): StaffItem | undefined {
    return this.data.staff.find((s) => s.pin === pin && s.isActive);
  }

  public findStaffByEmail(email: string): StaffItem | undefined {
    return this.data.staff.find((s) => s.email.toLowerCase() === email.toLowerCase());
  }

  public updateStaffPin(userId: string, newPin: string): boolean {
    const member = this.data.staff.find((s) => s.userId === userId || s.id === userId);
    if (!member) return false;
    member.pin = newPin;
    this.saveToDisk();
    return true;
  }

  // Products
  public getProducts(): ProductItem[] {
    return [...this.data.products];
  }

  public addOrUpdateProduct(product: ProductItem): ProductItem {
    const idx = this.data.products.findIndex((p) => p.id === product.id);
    if (idx >= 0) {
      this.data.products[idx] = { ...this.data.products[idx], ...product };
    } else {
      this.data.products.push(product);
    }
    this.saveToDisk();
    return product;
  }

  public deleteProduct(id: string): boolean {
    const before = this.data.products.length;
    this.data.products = this.data.products.filter((p) => p.id !== id);
    if (this.data.products.length !== before) {
      this.saveToDisk();
      return true;
    }
    return false;
  }

  // Tables
  public getTables(): TableItem[] {
    return [...this.data.tables];
  }

  public updateTable(table: TableItem): TableItem {
    const idx = this.data.tables.findIndex((t) => t.id === table.id);
    if (idx >= 0) {
      this.data.tables[idx] = { ...this.data.tables[idx], ...table };
    } else {
      this.data.tables.push(table);
    }
    this.saveToDisk();
    return table;
  }

  public resetTables(): TableItem[] {
    this.data.tables = [...DEFAULT_TABLES];
    this.saveToDisk();
    return this.getTables();
  }

  // Sales
  public getSales(): SaleRecord[] {
    return [...this.data.sales].sort((a, b) => b.timestamp - a.timestamp);
  }

  public recordSale(sale: SaleRecord): { sale: SaleRecord; isDuplicate: boolean } {
    const existing = this.data.sales.find(
      (s) => s.id === sale.id || s.receiptNumber === sale.receiptNumber
    );

    if (existing) {
      return { sale: existing, isDuplicate: true };
    }

    const syncedRecord: SaleRecord = {
      ...sale,
      syncStatus: 'SYNCED',
      syncedAt: Date.now(),
    };

    this.data.sales.unshift(syncedRecord);
    this.saveToDisk();
    return { sale: syncedRecord, isDuplicate: false };
  }

  // KOT
  public getKots(): KotRecord[] {
    return [...this.data.kots];
  }

  public addKot(kot: KotRecord): KotRecord {
    this.data.kots.unshift(kot);
    this.saveToDisk();
    return kot;
  }

  public updateKotStatus(id: string, status: 'PREPARING' | 'READY' | 'SERVED'): boolean {
    const target = this.data.kots.find((k) => k.id === id);
    if (!target) return false;
    target.status = status;
    this.saveToDisk();
    return true;
  }

  public deleteKot(id: string): boolean {
    const len = this.data.kots.length;
    this.data.kots = this.data.kots.filter((k) => k.id !== id);
    if (this.data.kots.length !== len) {
      this.saveToDisk();
      return true;
    }
    return false;
  }
}

export const db = new PosDatabase();
