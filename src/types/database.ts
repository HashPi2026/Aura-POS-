export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type BusinessType = 'retail' | 'cafe' | 'restaurant' | 'hotel';
export type UserRole = 'owner' | 'manager' | 'cashier' | 'waiter' | 'kitchen' | 'accountant';
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
          address: string | null;
          phone: string | null;
          owner_name: string | null;
          owner_phone: string | null;
          owner_email: string | null;
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
          address?: string | null;
          phone?: string | null;
          owner_name?: string | null;
          owner_phone?: string | null;
          owner_email?: string | null;
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
          address?: string | null;
          phone?: string | null;
          owner_name?: string | null;
          owner_phone?: string | null;
          owner_email?: string | null;
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
      role_permissions: {
        Row: {
          role: UserRole;
          permission: string;
        };
        Insert: {
          role: UserRole;
          permission: string;
        };
        Update: {
          role?: UserRole;
          permission?: string;
        };
      };
      staff_pins: {
        Row: {
          id: string;
          business_id: string;
          user_id: string;
          pin_hash: string;
          failed_attempts: number;
          locked_until: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          user_id: string;
          pin_hash: string;
          failed_attempts?: number;
          locked_until?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          user_id?: string;
          pin_hash?: string;
          failed_attempts?: number;
          locked_until?: string | null;
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
          stock_quantity: number;
          track_inventory: boolean;
          is_available: boolean;
          is_veg: boolean;
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
          stock_quantity?: number;
          track_inventory?: boolean;
          is_available?: boolean;
          is_veg?: boolean;
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
          status: 'COMPLETED' | 'CANCELLED' | 'REFUNDED';
          notes: string | null;
          client_timestamp: string;
          created_at: string;
          updated_at: string;
        };
      };
      sale_items: {
        Row: {
          id: string;
          sale_id: string;
          product_id: string | null;
          product_name: string;
          quantity: number;
          unit_price: number;
          tax_rate: number;
          tax_amount: number;
          discount_amount: number;
          total_amount: number;
          notes: string | null;
          created_at: string;
        };
      };
      payments: {
        Row: {
          id: string;
          sale_id: string;
          business_id: string;
          payment_method: PaymentMethod;
          amount: number;
          tendered_amount: number;
          change_due: number;
          reference_id: string | null;
          status: 'PENDING' | 'VERIFIED' | 'FAILED' | 'REFUNDED';
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
          recalculated_subtotal?: number;
          recalculated_tax?: number;
          recalculated_total?: number;
          duplicate?: boolean;
          message?: string;
          error?: string;
          error_code?: string;
        };
      };
      create_business_and_owner: {
        Args: {
          p_name: string;
          p_business_type: string;
          p_tax_identifier?: string | null;
          p_owner_name: string;
        };
        Returns: {
          success: boolean;
          business?: Json;
          business_id?: string;
          location_id?: string;
          error?: string;
        };
      };
      verify_staff_pin: {
        Args: {
          p_business_id: string;
          p_user_id: string;
          p_pin: string;
        };
        Returns: {
          success: boolean;
          locked?: boolean;
          attempts_left?: number;
          error?: string;
          error_code?: string;
          member?: {
            id: string;
            user_id: string;
            role: UserRole;
            full_name: string;
          };
        };
      };
      set_staff_pin: {
        Args: {
          p_business_id: string;
          p_user_id: string;
          p_pin: string;
        };
        Returns: {
          success: boolean;
          error?: string;
        };
      };
      has_permission: {
        Args: {
          p_business_id: string;
          p_permission: string;
        };
        Returns: boolean;
      };
    };
  };
}
