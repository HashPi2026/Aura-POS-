export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type BusinessType = 'retail' | 'cafe' | 'restaurant' | 'hotel';
export type UserRole = 'owner' | 'manager' | 'cashier' | 'accountant';
export type PaymentMethod = 'CASH' | 'UPI' | 'CARD' | 'OTHER';
export type OrderType = 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';

export interface Database {
  public: {
    Tables: {
      businesses: {
        Row: {
          id: string;
          name: string;
          business_type: BusinessType;
          currency: string;
          timezone: string;
          tax_identifier: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          business_type: BusinessType;
          currency?: string;
          timezone?: string;
          tax_identifier?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          business_type?: BusinessType;
          currency?: string;
          timezone?: string;
          tax_identifier?: string | null;
          updated_at?: string;
        };
      };
      business_members: {
        Row: {
          id: string;
          business_id: string;
          user_id: string;
          role: UserRole;
          full_name: string;
          pin_hash: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          user_id: string;
          role: UserRole;
          full_name: string;
          pin_hash?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          user_id?: string;
          role?: UserRole;
          full_name?: string;
          pin_hash?: string | null;
          is_active?: boolean;
          updated_at?: string;
        };
      };
      locations: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          address: string | null;
          phone: string | null;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          name: string;
          address?: string | null;
          phone?: string | null;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          address?: string | null;
          phone?: string | null;
          is_default?: boolean;
          updated_at?: string;
        };
      };
      devices: {
        Row: {
          id: string;
          business_id: string;
          location_id: string | null;
          device_identifier: string;
          name: string;
          device_type: 'web_pos' | 'android_pos' | 'tablet_pos' | 'kitchen_kds';
          is_active: boolean;
          last_synced_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          location_id?: string | null;
          device_identifier: string;
          name: string;
          device_type?: 'web_pos' | 'android_pos' | 'tablet_pos' | 'kitchen_kds';
          is_active?: boolean;
          last_synced_at?: string | null;
          created_at?: string;
        };
      };
      products: {
        Row: {
          id: string;
          business_id: string;
          category_id: string | null;
          name: string;
          sku: string | null;
          barcode: string | null;
          price: number;
          cost_price: number | null;
          tax_rate: number;
          unit: string;
          is_veg: boolean | null;
          track_inventory: boolean;
          stock_quantity: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          category_id?: string | null;
          name: string;
          sku?: string | null;
          barcode?: string | null;
          price: number;
          cost_price?: number | null;
          tax_rate?: number;
          unit?: string;
          is_veg?: boolean | null;
          track_inventory?: boolean;
          stock_quantity?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      sales: {
        Row: {
          id: string;
          business_id: string;
          location_id: string | null;
          device_id: string | null;
          cashier_id: string | null;
          cashier_name: string;
          receipt_number: string;
          order_type: OrderType;
          table_name: string | null;
          subtotal: number;
          tax_amount: number;
          discount_amount: number;
          round_off: number;
          total_amount: number;
          status: 'COMPLETED' | 'VOIDED' | 'REFUNDED' | 'PARTIALLY_REFUNDED';
          notes: string | null;
          client_timestamp: string;
          completed_at: string;
          created_at: string;
        };
      };
      expenses: {
        Row: {
          id: string;
          business_id: string;
          location_id: string | null;
          category: string;
          amount: number;
          vendor: string | null;
          payment_method: string;
          expense_date: string;
          receipt_url: string | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
        };
      };
      inventory_movements: {
        Row: {
          id: string;
          business_id: string;
          product_id: string;
          location_id: string | null;
          movement_type: 'SALE' | 'PURCHASE' | 'ADJUSTMENT' | 'WASTAGE' | 'RETURN';
          quantity_change: number;
          reference_id: string | null;
          notes: string | null;
          created_by: string | null;
          created_at: string;
        };
      };
    };
    Functions: {
      sync_sale: {
        Args: {
          p_sale: Json;
        };
        Returns: {
          success: boolean;
          sale_id?: string;
          receipt_number?: string;
          synced_at?: string;
          duplicate?: boolean;
          message?: string;
          error?: string;
          error_code?: string;
        };
      };
    };
  };
}
