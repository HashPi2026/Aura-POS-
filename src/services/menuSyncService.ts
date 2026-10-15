import { supabase, isSupabaseConfigured, logCloud, logCloudError } from '../lib/supabase';
import { Product, RestaurantTable, KOTRecord, getDb, INITIAL_CAFE_PRODUCTS, INITIAL_CAFE_TABLES } from '../db/indexedDb';
import { useAuthStore } from '../store/useAuthStore';

export interface MenuSyncResult {
  success: boolean;
  productCount: number;
  tableCount: number;
  kotCount: number;
  error?: string;
}

export interface MenuOutboxItem {
  id: string; // mutation UUID
  entityType: 'PRODUCT' | 'TABLE';
  action: 'UPSERT' | 'SOFT_DELETE';
  business_id: string;
  data: any;
  timestamp: number;
  retryCount: number;
}

const OUTBOX_STORAGE_KEY = 'aura_menu_outbox';

class MenuSyncService {
  private isPulling = false;
  private isFlushingOutbox = false;

  /**
   * Pulls categories, products, dining_tables, and active kitchen_tickets from Supabase.
   * Server wins on conflict using updated_at. Caches data in IndexedDB scoped strictly per business.
   */
  public async pullMenuAndTables(businessId: string): Promise<MenuSyncResult> {
    if (!businessId || !isSupabaseConfigured()) {
      return { success: false, productCount: 0, tableCount: 0, kotCount: 0, error: 'Not configured or no business' };
    }

    if (this.isPulling) {
      return { success: false, productCount: 0, tableCount: 0, kotCount: 0, error: 'Pull already in progress' };
    }

    this.isPulling = true;
    logCloud(`Pulling menu catalog and tables for business: ${businessId}...`);

    try {
      const db = await getDb();

      // 1. Fetch remote products
      const { data: remoteProducts, error: prodErr } = await supabase
        .from('products')
        .select('*')
        .eq('business_id', businessId);

      if (prodErr) {
        logCloudError('Failed to fetch remote products:', prodErr);
      } else if (remoteProducts) {
        // Merge into IndexedDB (server wins on updated_at)
        const localProds = await db.getAll('products');
        const localMap = new Map<string, Product>();
        for (const lp of localProds) {
          if (lp.business_id === businessId) {
            localMap.set(lp.id, lp);
          }
        }

        for (const rp of remoteProducts) {
          const localItem = localMap.get(rp.id);
          const remoteUpdatedAt = rp.updated_at ? new Date(rp.updated_at).getTime() : 0;
          const localUpdatedAt = localItem?.updatedAt || 0;

          // If remote is newer or item is new locally, update local cache
          if (!localItem || remoteUpdatedAt >= localUpdatedAt) {
            const mappedProduct: Product = {
              id: rp.id,
              business_id: rp.business_id,
              name: rp.name,
              category: rp.category_id || 'Specials',
              price: Number(rp.price),
              costPrice: rp.cost_price ? Number(rp.cost_price) : undefined,
              taxRate: Number(rp.tax_rate ?? 5),
              stock: Number(rp.stock_quantity ?? 50),
              isAvailable: Boolean(rp.is_available),
              isVeg: Boolean(rp.is_veg),
              trackInventory: Boolean(rp.track_inventory),
              updatedAt: remoteUpdatedAt || Date.now(),
            };
            await db.put('products', mappedProduct);
          }
        }
      }

      // 2. Fetch remote dining tables
      const { data: remoteTables, error: tableErr } = await supabase
        .from('dining_tables')
        .select('*')
        .eq('business_id', businessId)
        .order('sort_order', { ascending: true });

      if (tableErr) {
        logCloudError('Failed to fetch remote dining tables:', tableErr);
      } else if (remoteTables) {
        for (const rt of remoteTables) {
          const mappedTable: RestaurantTable = {
            id: rt.id,
            business_id: rt.business_id,
            name: rt.name,
            area: rt.area || 'Main Dining',
            seats: rt.seats || 4,
            status: 'AVAILABLE',
            updatedAt: rt.updated_at ? new Date(rt.updated_at).getTime() : Date.now(),
          };
          await db.put('tables', mappedTable);
        }
      }

      // 3. Fetch remote open kitchen tickets (PREPARING or READY)
      const { data: remoteTickets, error: ticketErr } = await supabase
        .from('kitchen_tickets')
        .select('*')
        .eq('business_id', businessId)
        .neq('status', 'SERVED')
        .neq('status', 'CANCELLED')
        .order('created_at', { ascending: true });

      if (ticketErr) {
        logCloudError('Failed to fetch remote kitchen tickets:', ticketErr);
      } else if (remoteTickets) {
        for (const rk of remoteTickets) {
          const mappedKot: KOTRecord = {
            id: rk.id,
            business_id: rk.business_id,
            sale_id: rk.sale_or_order_ref,
            receipt_number: rk.sale_or_order_ref,
            table_name: rk.table_name || undefined,
            order_type: (rk.order_type as any) || 'DINE_IN',
            status: rk.status as any,
            items: Array.isArray(rk.items) ? (rk.items as any) : [],
            notes: rk.notes || undefined,
            timestamp: rk.created_at ? new Date(rk.created_at).getTime() : Date.now(),
          };
          await db.put('kotList', mappedKot);
        }
      }

      logCloud('Menu, tables, and KOT tickets successfully synced from cloud.');
      return {
        success: true,
        productCount: remoteProducts?.length || 0,
        tableCount: remoteTables?.length || 0,
        kotCount: remoteTickets?.length || 0,
      };
    } catch (err: any) {
      logCloudError('Error pulling menu and tables:', err);
      return { success: false, productCount: 0, tableCount: 0, kotCount: 0, error: err.message };
    } finally {
      this.isPulling = false;
    }
  }

  /**
   * Seeds sample cafe menu rows directly into Supabase (not just locally)
   * for a brand new business.
   */
  public async loadSampleCafeMenu(businessId: string): Promise<{ success: boolean; count: number; error?: string }> {
    if (!businessId || !isSupabaseConfigured()) {
      return { success: false, count: 0, error: 'Cloud not configured or no business selected.' };
    }

    logCloud(`Seeding initial sample cafe menu into Supabase for business: ${businessId}...`);

    try {
      const db = await getDb();

      // 1. Prepare products for Supabase
      const rows = INITIAL_CAFE_PRODUCTS.map((p) => ({
        id: p.id,
        business_id: businessId,
        name: p.name,
        price: p.price,
        tax_rate: p.taxRate,
        stock_quantity: p.stock,
        is_available: p.isAvailable,
        is_veg: p.isVeg,
        track_inventory: p.trackInventory,
        unit: 'serving',
      }));

      const { error: upsertErr } = await supabase
        .from('products')
        .upsert(rows as any, { onConflict: 'id' });

      if (upsertErr) {
        logCloudError('Failed to upsert sample products to Supabase:', upsertErr);
        return { success: false, count: 0, error: upsertErr.message };
      }

      // Also seed default dining tables
      const tableRows = INITIAL_CAFE_TABLES.map((t, idx) => ({
        id: t.id,
        business_id: businessId,
        name: t.name,
        area: t.area,
        seats: t.seats,
        sort_order: idx + 1,
        is_active: true,
      }));

      await supabase.from('dining_tables').upsert(tableRows as any, { onConflict: 'id' });

      // Cache locally into IndexedDB
      for (const p of INITIAL_CAFE_PRODUCTS) {
        await db.put('products', { ...p, business_id: businessId, updatedAt: Date.now() });
      }
      for (const t of INITIAL_CAFE_TABLES) {
        await db.put('tables', { ...t, business_id: businessId, updatedAt: Date.now() });
      }

      logCloud(`Seeded ${rows.length} sample products and tables to Supabase.`);
      return { success: true, count: rows.length };
    } catch (err: any) {
      logCloudError('Unexpected error seeding sample menu:', err);
      return { success: false, count: 0, error: err.message };
    }
  }

  /**
   * Enqueues a product or table mutation into the durable outbox and attempts immediate flush.
   */
  public async queueMutation(
    entityType: 'PRODUCT' | 'TABLE',
    action: 'UPSERT' | 'SOFT_DELETE',
    businessId: string,
    data: any
  ): Promise<void> {
    const item: MenuOutboxItem = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `mut_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      entityType,
      action,
      business_id: businessId,
      data,
      timestamp: Date.now(),
      retryCount: 0,
    };

    const outbox = this.getOutbox();
    outbox.push(item);
    this.saveOutbox(outbox);

    // Flush immediately in background if online
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      this.flushOutbox().catch(() => {});
    }
  }

  /**
   * Flushes durable outbox to Supabase.
   */
  public async flushOutbox(): Promise<{ processed: number; failed: number }> {
    if (this.isFlushingOutbox || !isSupabaseConfigured()) {
      return { processed: 0, failed: 0 };
    }

    const outbox = this.getOutbox();
    if (outbox.length === 0) return { processed: 0, failed: 0 };

    this.isFlushingOutbox = true;
    let processed = 0;
    let failed = 0;
    const remaining: MenuOutboxItem[] = [];

    try {
      for (const item of outbox) {
        try {
          if (item.entityType === 'PRODUCT') {
            const p = item.data as Product;
            const row = {
              id: p.id,
              business_id: item.business_id,
              name: p.name,
              price: p.price,
              cost_price: p.costPrice || null,
              tax_rate: p.taxRate,
              stock_quantity: p.stock,
              is_available: item.action === 'SOFT_DELETE' ? false : p.isAvailable,
              is_veg: p.isVeg,
              track_inventory: p.trackInventory,
              unit: 'serving',
            };

            const { error } = await supabase.from('products').upsert(row as any, { onConflict: 'id' });
            if (error) throw error;
            processed++;
          } else if (item.entityType === 'TABLE') {
            const t = item.data as RestaurantTable;
            const row = {
              id: t.id,
              business_id: item.business_id,
              name: t.name,
              area: t.area,
              seats: t.seats,
              is_active: item.action === 'SOFT_DELETE' ? false : true,
            };

            const { error } = await supabase.from('dining_tables').upsert(row as any, { onConflict: 'id' });
            if (error) throw error;
            processed++;
          }
        } catch (err) {
          logCloudError(`Failed to flush outbox mutation ${item.id}:`, err);
          item.retryCount++;
          if (item.retryCount < 5) {
            remaining.push(item);
          }
          failed++;
        }
      }

      this.saveOutbox(remaining);
    } finally {
      this.isFlushingOutbox = false;
    }

    return { processed, failed };
  }

  private getOutbox(): MenuOutboxItem[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const raw = localStorage.getItem(OUTBOX_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (_) {
      return [];
    }
  }

  private saveOutbox(items: MenuOutboxItem[]): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(OUTBOX_STORAGE_KEY, JSON.stringify(items));
    } catch (_) {}
  }
}

export const menuSyncService = new MenuSyncService();
