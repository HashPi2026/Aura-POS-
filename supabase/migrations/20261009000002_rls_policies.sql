-- ====================================================================
-- Migration: 20261009000002_rls_policies.sql
-- Description: Zero-Trust Row Level Security (RLS) & Multi-Tenant Isolation
-- ====================================================================

-- Enable RLS on all core tables
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------------------
-- Security Helper Functions (SECURITY DEFINER)
-- --------------------------------------------------------------------

-- Check if current authenticated user is an active member of a business
CREATE OR REPLACE FUNCTION is_business_member(p_business_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM business_members
        WHERE business_id = p_business_id
          AND user_id = auth.uid()
          AND is_active = TRUE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Get user's role in a specific business
CREATE OR REPLACE FUNCTION get_user_role(p_business_id UUID)
RETURNS VARCHAR AS $$
DECLARE
    v_role VARCHAR;
BEGIN
    SELECT role INTO v_role
    FROM business_members
    WHERE business_id = p_business_id
      AND user_id = auth.uid()
      AND is_active = TRUE;
    RETURN v_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Check if user is owner or manager
CREATE OR REPLACE FUNCTION is_manager_or_owner(p_business_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_role VARCHAR;
BEGIN
    v_role := get_user_role(p_business_id);
    RETURN v_role IN ('owner', 'manager');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- --------------------------------------------------------------------
-- Policies: Businesses
-- --------------------------------------------------------------------
CREATE POLICY "Users can view businesses they belong to"
ON businesses FOR SELECT
USING (is_business_member(id));

CREATE POLICY "Authenticated users can create a new business"
ON businesses FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Owners can update their business"
ON businesses FOR UPDATE
USING (get_user_role(id) = 'owner');

-- --------------------------------------------------------------------
-- Policies: Business Members
-- --------------------------------------------------------------------
CREATE POLICY "Members can view staff in their business"
ON business_members FOR SELECT
USING (is_business_member(business_id));

CREATE POLICY "Managers and owners can manage staff"
ON business_members FOR ALL
USING (is_manager_or_owner(business_id))
WITH CHECK (is_manager_or_owner(business_id));

-- Self onboarding: First user creating a business can add themselves as owner
CREATE POLICY "Users can self-enroll as owner when creating business"
ON business_members FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() AND role = 'owner');

-- --------------------------------------------------------------------
-- Policies: Locations & Devices
-- --------------------------------------------------------------------
CREATE POLICY "Members can view locations"
ON locations FOR SELECT
USING (is_business_member(business_id));

CREATE POLICY "Managers and owners can modify locations"
ON locations FOR ALL
USING (is_manager_or_owner(business_id))
WITH CHECK (is_manager_or_owner(business_id));

CREATE POLICY "Members can view enrolled devices"
ON devices FOR SELECT
USING (is_business_member(business_id));

CREATE POLICY "Managers and owners can enroll devices"
ON devices FOR ALL
USING (is_manager_or_owner(business_id))
WITH CHECK (is_manager_or_owner(business_id));

-- --------------------------------------------------------------------
-- Policies: Products & Categories
-- --------------------------------------------------------------------
CREATE POLICY "Members can view categories"
ON product_categories FOR SELECT
USING (is_business_member(business_id));

CREATE POLICY "Managers and owners can manage categories"
ON product_categories FOR ALL
USING (is_manager_or_owner(business_id))
WITH CHECK (is_manager_or_owner(business_id));

CREATE POLICY "Members can view products"
ON products FOR SELECT
USING (is_business_member(business_id));

CREATE POLICY "Managers and owners can manage products"
ON products FOR ALL
USING (is_manager_or_owner(business_id))
WITH CHECK (is_manager_or_owner(business_id));

-- --------------------------------------------------------------------
-- Policies: Sales & Sale Items
-- --------------------------------------------------------------------
CREATE POLICY "Members can view sales of their business"
ON sales FOR SELECT
USING (is_business_member(business_id));

CREATE POLICY "Staff can create sales for their business"
ON sales FOR INSERT
WITH CHECK (is_business_member(business_id));

CREATE POLICY "Members can view sale items"
ON sale_items FOR SELECT
USING (EXISTS (SELECT 1 FROM sales WHERE sales.id = sale_items.sale_id AND is_business_member(sales.business_id)));

CREATE POLICY "Staff can insert sale items"
ON sale_items FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM sales WHERE sales.id = sale_items.sale_id AND is_business_member(sales.business_id)));

-- --------------------------------------------------------------------
-- Policies: Payments
-- --------------------------------------------------------------------
CREATE POLICY "Members can view payments"
ON payments FOR SELECT
USING (is_business_member(business_id));

CREATE POLICY "Staff can insert payments"
ON payments FOR INSERT
WITH CHECK (is_business_member(business_id));

-- --------------------------------------------------------------------
-- Policies: Refunds
-- --------------------------------------------------------------------
CREATE POLICY "Members can view refunds"
ON refunds FOR SELECT
USING (is_business_member(business_id));

CREATE POLICY "Managers and owners can authorize refunds"
ON refunds FOR INSERT
WITH CHECK (is_manager_or_owner(business_id));

-- --------------------------------------------------------------------
-- Policies: Expenses (Cashiers cannot view expenses)
-- --------------------------------------------------------------------
CREATE POLICY "Managers, owners, and accountants can view expenses"
ON expenses FOR SELECT
USING (get_user_role(business_id) IN ('owner', 'manager', 'accountant'));

CREATE POLICY "Managers and owners can record expenses"
ON expenses FOR INSERT
WITH CHECK (get_user_role(business_id) IN ('owner', 'manager', 'accountant'));

-- --------------------------------------------------------------------
-- Policies: Inventory Movements
-- --------------------------------------------------------------------
CREATE POLICY "Members can view inventory movements"
ON inventory_movements FOR SELECT
USING (is_business_member(business_id));

CREATE POLICY "Staff can record inventory movements"
ON inventory_movements FOR INSERT
WITH CHECK (is_business_member(business_id));

-- --------------------------------------------------------------------
-- Policies: Suppliers & Purchase Orders
-- --------------------------------------------------------------------
CREATE POLICY "Members can view suppliers"
ON suppliers FOR SELECT
USING (is_business_member(business_id));

CREATE POLICY "Managers and owners can manage suppliers"
ON suppliers FOR ALL
USING (is_manager_or_owner(business_id))
WITH CHECK (is_manager_or_owner(business_id));

CREATE POLICY "Members can view purchase orders"
ON purchase_orders FOR SELECT
USING (is_business_member(business_id));

CREATE POLICY "Managers and owners can manage purchase orders"
ON purchase_orders FOR ALL
USING (is_manager_or_owner(business_id))
WITH CHECK (is_manager_or_owner(business_id));

CREATE POLICY "Members can view purchase order items"
ON purchase_order_items FOR SELECT
USING (EXISTS (SELECT 1 FROM purchase_orders WHERE purchase_orders.id = purchase_order_items.purchase_order_id AND is_business_member(purchase_orders.business_id)));

CREATE POLICY "Managers and owners can manage purchase order items"
ON purchase_order_items FOR ALL
USING (EXISTS (SELECT 1 FROM purchase_orders WHERE purchase_orders.id = purchase_order_items.purchase_order_id AND is_manager_or_owner(purchase_orders.business_id)))
WITH CHECK (EXISTS (SELECT 1 FROM purchase_orders WHERE purchase_orders.id = purchase_order_items.purchase_order_id AND is_manager_or_owner(purchase_orders.business_id)));

-- --------------------------------------------------------------------
-- Policies: Sync Events & Audit Logs
-- --------------------------------------------------------------------
CREATE POLICY "Managers and owners can view audit logs"
ON audit_logs FOR SELECT
USING (is_manager_or_owner(business_id));

CREATE POLICY "Staff can record audit events"
ON audit_logs FOR INSERT
WITH CHECK (is_business_member(business_id));

CREATE POLICY "Managers and owners can view sync events"
ON sync_events FOR SELECT
USING (is_manager_or_owner(business_id));

CREATE POLICY "Staff can record sync events"
ON sync_events FOR INSERT
WITH CHECK (is_business_member(business_id));
