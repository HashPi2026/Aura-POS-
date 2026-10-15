-- ====================================================================
-- Migration: 20261014000004_roles_and_onboarding.sql
-- Description: Strict Role-Based Access Control, Secure Onboarding RPC,
--              Staff PINs with Lockout, Granular Permissions, and
--              Hardened Server-Side Tax & Payment Validation in sync_sale.
-- ====================================================================

-- Ensure pgcrypto is enabled for PIN hashing (Blowfish crypt)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- --------------------------------------------------------------------
-- 1. Expand Roles on business_members
-- --------------------------------------------------------------------
ALTER TABLE business_members DROP CONSTRAINT IF EXISTS business_members_role_check;
ALTER TABLE business_members ADD CONSTRAINT business_members_role_check
    CHECK (role IN ('owner', 'manager', 'cashier', 'waiter', 'kitchen', 'accountant'));

-- --------------------------------------------------------------------
-- 2. Remove Unsafe RLS Policies and Enforce Hierarchy
-- --------------------------------------------------------------------
-- Remove open self-enrollment and unconstrained insert policies
DROP POLICY IF EXISTS "Users can self-enroll as owner when creating business" ON business_members;
DROP POLICY IF EXISTS "Authenticated users can create a new business" ON businesses;
DROP POLICY IF EXISTS "Managers and owners can manage staff" ON business_members;

-- Secure Replacement Policies for business_members:
-- Owners have full management authority over staff
CREATE POLICY "Owners can manage all staff"
ON business_members FOR ALL
TO authenticated
USING (get_user_role(business_id) = 'owner')
WITH CHECK (get_user_role(business_id) = 'owner');

-- Managers can manage non-owner staff, but CANNOT create/promote owners, and CANNOT alter their own role
CREATE POLICY "Managers can manage non-owner staff"
ON business_members FOR ALL
TO authenticated
USING (
    get_user_role(business_id) = 'manager'
    AND role != 'owner'
    AND user_id != auth.uid()
)
WITH CHECK (
    get_user_role(business_id) = 'manager'
    AND role != 'owner'
    AND user_id != auth.uid()
);

-- --------------------------------------------------------------------
-- 3. Atomic Secure Business & Owner Onboarding RPC
-- --------------------------------------------------------------------
-- Derives identity strictly from auth.uid() - no client user_id spoofing
CREATE OR REPLACE FUNCTION create_business_and_owner(
    p_name VARCHAR,
    p_business_type VARCHAR,
    p_tax_identifier VARCHAR,
    p_owner_name VARCHAR
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_biz_id UUID;
    v_loc_id UUID;
    v_business RECORD;
    v_clean_name VARCHAR;
    v_clean_owner VARCHAR;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Unauthorized: Must be authenticated with Supabase to create a business.';
    END IF;

    v_clean_name := TRIM(COALESCE(p_name, ''));
    IF LENGTH(v_clean_name) < 2 THEN
        RAISE EXCEPTION 'Business name must be at least 2 characters.';
    END IF;

    v_clean_owner := TRIM(COALESCE(p_owner_name, ''));
    IF LENGTH(v_clean_owner) = 0 THEN
        v_clean_owner := 'Owner';
    END IF;

    -- 1. Create Business Record
    INSERT INTO businesses (
        name,
        business_type,
        tax_identifier,
        currency,
        timezone,
        is_active
    ) VALUES (
        v_clean_name,
        COALESCE(NULLIF(p_business_type, ''), 'cafe'),
        NULLIF(TRIM(p_tax_identifier), ''),
        'INR',
        'Asia/Kolkata',
        TRUE
    ) RETURNING * INTO v_business;

    v_biz_id := v_business.id;

    -- 2. Create Owner Membership
    INSERT INTO business_members (
        business_id,
        user_id,
        role,
        full_name,
        is_active
    ) VALUES (
        v_biz_id,
        v_user_id,
        'owner',
        v_clean_owner,
        TRUE
    );

    -- 3. Create Default Outlet / Location
    INSERT INTO locations (
        business_id,
        name,
        is_default
    ) VALUES (
        v_biz_id,
        'Main Outlet',
        TRUE
    ) RETURNING id INTO v_loc_id;

    RETURN jsonb_build_object(
        'success', TRUE,
        'business', row_to_json(v_business),
        'business_id', v_biz_id,
        'location_id', v_loc_id
    );
END;
$$;

-- --------------------------------------------------------------------
-- 4. Role Permissions Matrix & has_permission Helper
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS role_permissions (
    role VARCHAR(50) NOT NULL,
    permission VARCHAR(100) NOT NULL,
    PRIMARY KEY (role, permission)
);

ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read role permissions"
ON role_permissions FOR SELECT
TO authenticated
USING (true);

-- Seed granular permission matrix
DELETE FROM role_permissions;
INSERT INTO role_permissions (role, permission) VALUES
    -- Owner: Full access
    ('owner', 'order.create'),
    ('owner', 'order.send_kitchen'),
    ('owner', 'kitchen.update'),
    ('owner', 'bill.take'),
    ('owner', 'discount.apply'),
    ('owner', 'order.void'),
    ('owner', 'refund.create'),
    ('owner', 'menu.edit'),
    ('owner', 'report.view'),
    ('owner', 'expense.manage'),
    ('owner', 'staff.manage'),
    ('owner', 'device.manage'),

    -- Manager: All operational permissions
    ('manager', 'order.create'),
    ('manager', 'order.send_kitchen'),
    ('manager', 'kitchen.update'),
    ('manager', 'bill.take'),
    ('manager', 'discount.apply'),
    ('manager', 'order.void'),
    ('manager', 'refund.create'),
    ('manager', 'menu.edit'),
    ('manager', 'report.view'),
    ('manager', 'expense.manage'),
    ('manager', 'staff.manage'),
    ('manager', 'device.manage'),

    -- Cashier: Front-of-house billing and orders
    ('cashier', 'order.create'),
    ('cashier', 'order.send_kitchen'),
    ('cashier', 'kitchen.update'),
    ('cashier', 'bill.take'),
    ('cashier', 'discount.apply'),

    -- Waiter: Table service only
    ('waiter', 'order.create'),
    ('waiter', 'order.send_kitchen'),

    -- Kitchen: Display and status updates only
    ('kitchen', 'kitchen.update'),

    -- Accountant: Back-office financials only
    ('accountant', 'report.view'),
    ('accountant', 'expense.manage');

-- Permission check function for RLS & RPCs
CREATE OR REPLACE FUNCTION has_permission(p_business_id UUID, p_permission VARCHAR)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
    v_role VARCHAR;
BEGIN
    SELECT role INTO v_role
    FROM business_members
    WHERE business_id = p_business_id
      AND user_id = auth.uid()
      AND is_active = TRUE;

    IF v_role IS NULL THEN
        RETURN FALSE;
    END IF;

    RETURN EXISTS (
        SELECT 1 FROM role_permissions
        WHERE role = v_role AND permission = p_permission
    );
END;
$$;

-- --------------------------------------------------------------------
-- 5. Staff PIN Table & verify_staff_pin RPC with Lockout
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS staff_pins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    pin_hash TEXT NOT NULL,
    failed_attempts INT NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_staff_pin_business_user UNIQUE (business_id, user_id)
);

ALTER TABLE staff_pins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners and managers can manage staff PINs"
ON staff_pins FOR ALL
TO authenticated
USING (has_permission(business_id, 'staff.manage'))
WITH CHECK (has_permission(business_id, 'staff.manage'));

CREATE POLICY "Staff can view their own PIN status"
ON staff_pins FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- RPC: Set or update staff PIN
CREATE OR REPLACE FUNCTION set_staff_pin(
    p_business_id UUID,
    p_user_id UUID,
    p_pin VARCHAR
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only owners/managers can set staff PINs, or user setting their own
    IF NOT has_permission(p_business_id, 'staff.manage') AND p_user_id != auth.uid() THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Permission denied');
    END IF;

    IF LENGTH(p_pin) < 4 OR LENGTH(p_pin) > 6 THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'PIN must be between 4 and 6 digits');
    END IF;

    INSERT INTO staff_pins (business_id, user_id, pin_hash, failed_attempts, locked_until)
    VALUES (p_business_id, p_user_id, crypt(p_pin, gen_salt('bf')), 0, NULL)
    ON CONFLICT (business_id, user_id)
    DO UPDATE SET
        pin_hash = crypt(p_pin, gen_salt('bf')),
        failed_attempts = 0,
        locked_until = NULL,
        updated_at = NOW();

    RETURN jsonb_build_object('success', TRUE);
END;
$$;

-- RPC: Verify staff PIN with lockout after 5 consecutive failures
CREATE OR REPLACE FUNCTION verify_staff_pin(
    p_business_id UUID,
    p_user_id UUID,
    p_pin VARCHAR
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_record RECORD;
    v_member RECORD;
    v_now TIMESTAMPTZ := NOW();
    v_remaining_attempts INT;
BEGIN
    -- Find staff PIN record
    SELECT * INTO v_record
    FROM staff_pins
    WHERE business_id = p_business_id
      AND user_id = p_user_id;

    IF v_record IS NULL THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'No PIN configured for this staff member',
            'error_code', 'NO_PIN'
        );
    END IF;

    -- Check lockout
    IF v_record.locked_until IS NOT NULL AND v_record.locked_until > v_now THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'locked', TRUE,
            'error', 'PIN is temporarily locked due to too many failed attempts. Try again in ' ||
                     CEIL(EXTRACT(EPOCH FROM (v_record.locked_until - v_now)) / 60)::TEXT || ' minutes.',
            'error_code', 'PIN_LOCKED'
        );
    END IF;

    -- Verify hash using pgcrypto crypt
    IF v_record.pin_hash = crypt(p_pin, v_record.pin_hash) THEN
        -- Successful verification: Reset lockout counters
        UPDATE staff_pins
        SET failed_attempts = 0,
            locked_until = NULL,
            updated_at = v_now
        WHERE id = v_record.id;

        -- Return authenticated member details
        SELECT id, user_id, role, full_name INTO v_member
        FROM business_members
        WHERE business_id = p_business_id
          AND user_id = p_user_id
          AND is_active = TRUE;

        RETURN jsonb_build_object(
            'success', TRUE,
            'member', row_to_json(v_member)
        );
    ELSE
        -- Failed verification: Increment counter
        UPDATE staff_pins
        SET failed_attempts = v_record.failed_attempts + 1,
            locked_until = CASE
                WHEN v_record.failed_attempts + 1 >= 5 THEN v_now + INTERVAL '15 minutes'
                ELSE NULL
            END,
            updated_at = v_now
        WHERE id = v_record.id;

        v_remaining_attempts := GREATEST(0, 5 - (v_record.failed_attempts + 1));

        RETURN jsonb_build_object(
            'success', FALSE,
            'locked', (v_record.failed_attempts + 1 >= 5),
            'attempts_left', v_remaining_attempts,
            'error', CASE
                WHEN v_record.failed_attempts + 1 >= 5 THEN 'PIN locked for 15 minutes after 5 failed attempts.'
                ELSE 'Incorrect PIN. ' || v_remaining_attempts::TEXT || ' attempts remaining.'
            END,
            'error_code', 'INVALID_PIN'
        );
    END IF;
END;
$$;

-- --------------------------------------------------------------------
-- 6. Enforce Production Email Confirmation Requirement
-- --------------------------------------------------------------------
-- Drop auto-confirm trigger so email confirmation stays ON in production.
DROP TRIGGER IF EXISTS trg_auto_confirm_user ON auth.users;
DROP FUNCTION IF EXISTS public.handle_auto_confirm_user();
-- NOTE: In production Supabase projects, email confirmation MUST remain enabled
-- in Authentication > Providers > Email to prevent fraudulent or dummy account generation.

-- --------------------------------------------------------------------
-- 7. Hardened sync_sale RPC (Server Tax Recomputation & Pending Payment)
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION sync_sale(p_sale JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_sale_id UUID;
    v_business_id UUID;
    v_location_id UUID;
    v_device_id UUID;
    v_receipt_number VARCHAR;
    v_order_type VARCHAR;
    v_table_name VARCHAR;
    v_round_off NUMERIC(12, 2);
    v_client_timestamp TIMESTAMPTZ;
    v_notes TEXT;

    -- Server-recomputed financial figures
    v_server_subtotal NUMERIC(12, 2) := 0;
    v_server_tax NUMERIC(12, 2) := 0;
    v_server_discount NUMERIC(12, 2) := 0;
    v_server_total NUMERIC(12, 2) := 0;

    v_items JSONB;
    v_item JSONB;
    v_line_qty NUMERIC(12, 3);
    v_line_unit_price NUMERIC(12, 2);
    v_line_tax_rate NUMERIC(5, 2);
    v_line_subtotal NUMERIC(12, 2);
    v_line_tax NUMERIC(12, 2);
    v_line_discount NUMERIC(12, 2);
    v_line_total NUMERIC(12, 2);

    v_payments JSONB;
    v_payment JSONB;
    v_payment_sum NUMERIC(12, 2) := 0;

    v_existing_sale RECORD;
    v_member RECORD;
    v_prod RECORD;
BEGIN
    -- 1. Extract Required Identifiers
    v_sale_id := (p_sale->>'id')::UUID;
    IF v_sale_id IS NULL THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'Sale UUID (id) is required.');
    END IF;

    -- Mandatory business_id
    IF p_sale->>'business_id' IS NULL OR p_sale->>'business_id' = '' THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'business_id is strictly required.');
    END IF;
    v_business_id := (p_sale->>'business_id')::UUID;

    v_receipt_number := p_sale->>'receipt_number';
    IF v_receipt_number IS NULL OR TRIM(v_receipt_number) = '' THEN
        RETURN jsonb_build_object('success', FALSE, 'error', 'receipt_number is required.');
    END IF;

    -- 2. Authorization & Permission Check (caller must be active staff with bill.take permission)
    SELECT * INTO v_member
    FROM business_members
    WHERE business_id = v_business_id
      AND user_id = auth.uid()
      AND is_active = TRUE;

    IF v_member IS NULL THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'Unauthorized: User is not an active staff member of this business.',
            'error_code', 'NOT_BUSINESS_MEMBER'
        );
    END IF;

    IF NOT has_permission(v_business_id, 'bill.take') AND NOT has_permission(v_business_id, 'order.create') THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'Unauthorized: Role does not possess billing/order permissions.',
            'error_code', 'PERMISSION_DENIED'
        );
    END IF;

    -- 3. Idempotency Check: Replay detection
    SELECT * INTO v_existing_sale FROM sales WHERE id = v_sale_id;
    IF v_existing_sale IS NOT NULL THEN
        IF v_existing_sale.business_id != v_business_id THEN
            RETURN jsonb_build_object(
                'success', FALSE,
                'error', 'Sale UUID conflict: ID belongs to another business.',
                'error_code', 'CROSS_TENANT_CONFLICT'
            );
        END IF;

        RETURN jsonb_build_object(
            'success', TRUE,
            'duplicate', TRUE,
            'message', 'Sale already synchronized.',
            'sale_id', v_sale_id,
            'receipt_number', v_existing_sale.receipt_number
        );
    END IF;

    -- 4. Parse Header Fields
    v_order_type := COALESCE(p_sale->>'order_type', 'DINE_IN');
    v_table_name := p_sale->>'table_name';
    v_round_off := COALESCE((p_sale->>'round_off')::NUMERIC, 0);
    v_client_timestamp := COALESCE((p_sale->>'client_timestamp')::TIMESTAMPTZ, NOW());
    v_notes := p_sale->>'notes';

    IF p_sale->>'location_id' IS NOT NULL AND p_sale->>'location_id' != '' THEN
        v_location_id := (p_sale->>'location_id')::UUID;
    ELSE
        SELECT id INTO v_location_id FROM locations WHERE business_id = v_business_id AND is_default = TRUE LIMIT 1;
    END IF;

    IF p_sale->>'device_id' IS NOT NULL AND p_sale->>'device_id' != '' THEN
        v_device_id := (p_sale->>'device_id')::UUID;
    END IF;

    -- 5. SERVER-SIDE RECOMPUTATION OF TAX & TOTALS
    v_items := p_sale->'items';
    IF v_items IS NULL OR jsonb_array_length(v_items) = 0 THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'Sale must include at least one item.',
            'error_code', 'EMPTY_SALE_ITEMS'
        );
    END IF;

    FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
    LOOP
        v_line_qty := COALESCE((v_item->>'quantity')::NUMERIC, 1);
        v_line_unit_price := (v_item->>'unit_price')::NUMERIC;
        v_line_tax_rate := COALESCE((v_item->>'tax_rate')::NUMERIC, 5.0);
        v_line_discount := COALESCE((v_item->>'discount_amount')::NUMERIC, 0);

        -- Deterministic server calculation
        v_line_subtotal := ROUND(v_line_qty * v_line_unit_price, 2);
        v_line_tax := ROUND((v_line_subtotal - v_line_discount) * (v_line_tax_rate / 100.0), 2);
        v_line_total := v_line_subtotal - v_line_discount + v_line_tax;

        v_server_subtotal := v_server_subtotal + v_line_subtotal;
        v_server_discount := v_server_discount + v_line_discount;
        v_server_tax := v_server_tax + v_line_tax;
    END LOOP;

    -- Server computes final total with round off
    v_server_total := ROUND(v_server_subtotal - v_server_discount + v_server_tax + v_round_off, 2);

    -- 6. Payment Validation: Sum check
    v_payments := p_sale->'payments';
    IF v_payments IS NOT NULL AND jsonb_array_length(v_payments) > 0 THEN
        FOR v_payment IN SELECT * FROM jsonb_array_elements(v_payments)
        LOOP
            v_payment_sum := v_payment_sum + (v_payment->>'amount')::NUMERIC;
        END LOOP;

        IF ABS(v_payment_sum - v_server_total) > 0.05 THEN
            RETURN jsonb_build_object(
                'success', FALSE,
                'error', 'Payment sum (' || v_payment_sum || ') does not match server-calculated total (' || v_server_total || ').',
                'error_code', 'PAYMENT_MISMATCH'
            );
        END IF;
    END IF;

    -- 7. ATOMIC PERSISTENCE
    -- A. Insert Sale
    INSERT INTO sales (
        id,
        business_id,
        location_id,
        device_id,
        cashier_id,
        cashier_name,
        receipt_number,
        order_type,
        table_name,
        subtotal,
        tax_amount,
        discount_amount,
        round_off,
        total_amount,
        status,
        notes,
        client_timestamp,
        created_at
    ) VALUES (
        v_sale_id,
        v_business_id,
        v_location_id,
        v_device_id,
        v_member.id,
        COALESCE(p_sale->>'cashier_name', v_member.full_name),
        v_receipt_number,
        v_order_type,
        v_table_name,
        v_server_subtotal,
        v_server_tax,
        v_server_discount,
        v_round_off,
        v_server_total,
        'COMPLETED',
        v_notes,
        v_client_timestamp,
        NOW()
    );

    -- B. Insert Sale Items with Server Tax & Stock Movement
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
    LOOP
        v_line_qty := COALESCE((v_item->>'quantity')::NUMERIC, 1);
        v_line_unit_price := (v_item->>'unit_price')::NUMERIC;
        v_line_tax_rate := COALESCE((v_item->>'tax_rate')::NUMERIC, 5.0);
        v_line_discount := COALESCE((v_item->>'discount_amount')::NUMERIC, 0);
        v_line_subtotal := ROUND(v_line_qty * v_line_unit_price, 2);
        v_line_tax := ROUND((v_line_subtotal - v_line_discount) * (v_line_tax_rate / 100.0), 2);
        v_line_total := v_line_subtotal - v_line_discount + v_line_tax;

        INSERT INTO sale_items (
            sale_id,
            product_id,
            product_name,
            quantity,
            unit_price,
            tax_rate,
            tax_amount,
            discount_amount,
            total_amount
        ) VALUES (
            v_sale_id,
            CASE WHEN (v_item->>'product_id') ~ '^[0-9a-fA-F-]{36}$' THEN (v_item->>'product_id')::UUID ELSE NULL END,
            v_item->>'product_name',
            v_line_qty,
            v_line_unit_price,
            v_line_tax_rate,
            v_line_tax,
            v_line_discount,
            v_line_total
        );

        -- Stock deduction if product exists
        IF (v_item->>'product_id') ~ '^[0-9a-fA-F-]{36}$' THEN
            SELECT * INTO v_prod FROM products WHERE id = (v_item->>'product_id')::UUID AND business_id = v_business_id;
            IF v_prod IS NOT NULL AND v_prod.track_inventory = TRUE THEN
                UPDATE products
                SET stock_quantity = stock_quantity - v_line_qty
                WHERE id = v_prod.id;

                INSERT INTO inventory_movements (
                    business_id,
                    product_id,
                    location_id,
                    movement_type,
                    quantity_change,
                    reference_id,
                    notes,
                    created_by
                ) VALUES (
                    v_business_id,
                    v_prod.id,
                    v_location_id,
                    'SALE',
                    -v_line_qty,
                    v_sale_id,
                    'Sale deduction #' || v_receipt_number,
                    v_member.id
                );
            END IF;
        END IF;
    END LOOP;

    -- C. Insert Payments (Enforce PENDING status - Never accept client VERIFIED)
    IF v_payments IS NOT NULL AND jsonb_array_length(v_payments) > 0 THEN
        FOR v_payment IN SELECT * FROM jsonb_array_elements(v_payments)
        LOOP
            INSERT INTO payments (
                sale_id,
                business_id,
                payment_method,
                amount,
                tendered_amount,
                change_due,
                reference_id,
                status
            ) VALUES (
                v_sale_id,
                v_business_id,
                v_payment->>'payment_method',
                (v_payment->>'amount')::NUMERIC,
                COALESCE((v_payment->>'tendered_amount')::NUMERIC, (v_payment->>'amount')::NUMERIC),
                COALESCE((v_payment->>'change_due')::NUMERIC, 0),
                v_payment->>'reference_id',
                'PENDING' -- Enforced as PENDING until confirmed by server-side reconciliation
            );
        END LOOP;
    END IF;

    -- D. Log Sync Event
    INSERT INTO sync_events (
        business_id,
        device_id,
        event_type,
        payload
    ) VALUES (
        v_business_id,
        v_device_id,
        'SALE_SYNCED',
        jsonb_build_object(
            'sale_id', v_sale_id,
            'receipt_number', v_receipt_number,
            'recalculated_total', v_server_total
        )
    );

    RETURN jsonb_build_object(
        'success', TRUE,
        'duplicate', FALSE,
        'sale_id', v_sale_id,
        'receipt_number', v_receipt_number,
        'recalculated_subtotal', v_server_subtotal,
        'recalculated_tax', v_server_tax,
        'recalculated_total', v_server_total
    );
END;
$$;
