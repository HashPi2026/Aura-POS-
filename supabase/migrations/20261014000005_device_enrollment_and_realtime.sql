-- Migration: 20261014000005_device_enrollment_and_realtime.sql
-- Enrolls POS hardware/browser terminals, secures search_path, and handles safe foreign key validation for sales

-- 1. Secure search_path on helper security definer functions
CREATE OR REPLACE FUNCTION public.is_business_member(p_business_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.business_members
        WHERE business_id = p_business_id
          AND user_id = p_user_id
          AND is_active = TRUE
    );
$$;

CREATE OR REPLACE FUNCTION public.get_user_role(p_business_id UUID, p_user_id UUID)
RETURNS public.app_role
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT role FROM public.business_members
    WHERE business_id = p_business_id
      AND user_id = p_user_id
      AND is_active = TRUE
    LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_manager_or_owner(p_business_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.business_members
        WHERE business_id = p_business_id
          AND user_id = p_user_id
          AND role IN ('owner', 'manager')
          AND is_active = TRUE
    );
$$;

-- 2. Device Enrollment RPC: Idempotent registration of POS hardware/browser terminal
CREATE OR REPLACE FUNCTION public.enroll_device(
    p_business_id UUID,
    p_location_id UUID DEFAULT NULL,
    p_name VARCHAR DEFAULT 'POS Counter Terminal',
    p_device_identifier VARCHAR DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_device_id UUID;
    v_identifier VARCHAR(255);
    v_loc_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    -- When authenticated, verify user has permission to enroll devices
    IF v_user_id IS NOT NULL THEN
        IF NOT public.has_permission(p_business_id, v_user_id, 'device.manage') AND
           NOT public.is_manager_or_owner(p_business_id, v_user_id) THEN
            RAISE EXCEPTION 'Insufficient permissions to enroll device';
        END IF;
    END IF;

    -- Ensure fallback identifier
    v_identifier := COALESCE(NULLIF(TRIM(p_device_identifier), ''), 'device_' || gen_random_uuid()::text);

    -- Ensure valid location or pick first location of business
    v_loc_id := p_location_id;
    IF v_loc_id IS NULL THEN
        SELECT id INTO v_loc_id FROM public.locations WHERE business_id = p_business_id LIMIT 1;
    END IF;

    -- Upsert device record idempotently
    INSERT INTO public.devices (
        business_id,
        location_id,
        device_identifier,
        name,
        device_type,
        is_active,
        last_synced_at
    )
    VALUES (
        p_business_id,
        v_loc_id,
        v_identifier,
        COALESCE(NULLIF(TRIM(p_name), ''), 'POS Counter Terminal'),
        'web_pos',
        TRUE,
        NOW()
    )
    ON CONFLICT (business_id, device_identifier)
    DO UPDATE SET
        name = EXCLUDED.name,
        last_synced_at = NOW(),
        is_active = TRUE
    RETURNING id INTO v_device_id;

    RETURN v_device_id;
END;
$$;

-- 3. Robust sync_sale RPC with safe device validation (no foreign key crash)
CREATE OR REPLACE FUNCTION public.sync_sale(p_sale JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_business_id UUID;
    v_sale_id UUID;
    v_device_id UUID;
    v_receipt_number VARCHAR(100);
    v_client_timestamp TIMESTAMPTZ;
    v_order_type VARCHAR(50);
    v_table_name VARCHAR(100);
    v_cashier_name VARCHAR(255);
    v_notes TEXT;
    
    v_server_subtotal NUMERIC(12, 2) := 0;
    v_server_tax NUMERIC(12, 2) := 0;
    v_server_discount NUMERIC(12, 2) := 0;
    v_server_round_off NUMERIC(12, 2) := 0;
    v_server_total NUMERIC(12, 2) := 0;

    v_item RECORD;
    v_payment RECORD;
    v_line_subtotal NUMERIC(12, 2);
    v_line_tax NUMERIC(12, 2);
    v_line_discount NUMERIC(12, 2);
    v_line_total NUMERIC(12, 2);
    v_unit_price NUMERIC(12, 2);
    v_tax_rate NUMERIC(6, 4);
    v_qty NUMERIC(12, 3);
BEGIN
    v_user_id := auth.uid();
    v_business_id := (p_sale->>'business_id')::UUID;
    v_sale_id := (p_sale->>'id')::UUID;
    v_receipt_number := TRIM(p_sale->>'receipt_number');
    v_client_timestamp := (p_sale->>'client_timestamp')::TIMESTAMPTZ;
    v_order_type := COALESCE(p_sale->>'order_type', 'DINE_IN');
    v_table_name := p_sale->>'table_name';
    v_cashier_name := COALESCE(p_sale->>'cashier_name', 'Counter Cashier');
    v_notes := p_sale->>'notes';

    -- Safe Device ID Resolution: Only use device_id if it exists in devices table
    IF p_sale->>'device_id' IS NOT NULL AND TRIM(p_sale->>'device_id') != '' THEN
        BEGIN
            v_device_id := (p_sale->>'device_id')::UUID;
            IF NOT EXISTS (SELECT 1 FROM public.devices WHERE id = v_device_id AND business_id = v_business_id) THEN
                v_device_id := NULL;
            END IF;
        EXCEPTION WHEN OTHERS THEN
            v_device_id := NULL;
        END;
    ELSE
        v_device_id := NULL;
    END IF;

    -- Idempotency check: Return success if sale already synced
    IF EXISTS (SELECT 1 FROM public.sales WHERE id = v_sale_id) THEN
        RETURN jsonb_build_object(
            'success', true,
            'message', 'Sale already synchronized (Idempotent)',
            'sale_id', v_sale_id,
            'duplicate', true
        );
    END IF;

    -- Compute line totals & taxes server-side
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_sale->'items') AS x(
        product_id UUID,
        product_name VARCHAR(255),
        quantity NUMERIC(12, 3),
        unit_price NUMERIC(12, 2),
        tax_rate NUMERIC(6, 4),
        tax_amount NUMERIC(12, 2),
        discount_amount NUMERIC(12, 2),
        total_amount NUMERIC(12, 2),
        notes TEXT
    ) LOOP
        v_qty := COALESCE(v_item.quantity, 1);
        v_unit_price := COALESCE(v_item.unit_price, 0);
        v_tax_rate := COALESCE(v_item.tax_rate, 5.0);

        v_line_subtotal := ROUND(v_unit_price * v_qty, 2);
        v_line_tax := ROUND(v_line_subtotal * (v_tax_rate / 100.0), 2);
        v_line_discount := 0;
        v_line_total := v_line_subtotal + v_line_tax;

        v_server_subtotal := v_server_subtotal + v_line_subtotal;
        v_server_tax := v_server_tax + v_line_tax;
    END LOOP;

    v_server_round_off := COALESCE((p_sale->>'round_off')::NUMERIC(12, 2), 0);
    v_server_total := v_server_subtotal + v_server_tax + v_server_round_off;

    -- Insert sale record
    INSERT INTO public.sales (
        id,
        business_id,
        device_id,
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
        completed_at,
        created_at
    )
    VALUES (
        v_sale_id,
        v_business_id,
        v_device_id,
        v_cashier_name,
        v_receipt_number,
        v_order_type,
        v_table_name,
        v_server_subtotal,
        v_server_tax,
        v_server_discount,
        v_server_round_off,
        v_server_total,
        'COMPLETED',
        v_notes,
        v_client_timestamp,
        NOW(),
        NOW()
    );

    -- Insert line items
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_sale->'items') AS x(
        product_id UUID,
        product_name VARCHAR(255),
        quantity NUMERIC(12, 3),
        unit_price NUMERIC(12, 2),
        tax_rate NUMERIC(6, 4),
        tax_amount NUMERIC(12, 2),
        discount_amount NUMERIC(12, 2),
        total_amount NUMERIC(12, 2),
        notes TEXT
    ) LOOP
        INSERT INTO public.sale_items (
            sale_id,
            product_id,
            product_name,
            quantity,
            unit_price,
            tax_rate,
            tax_amount,
            discount_amount,
            total_amount,
            notes
        )
        VALUES (
            v_sale_id,
            v_item.product_id,
            COALESCE(v_item.product_name, 'Custom Item'),
            COALESCE(v_item.quantity, 1),
            COALESCE(v_item.unit_price, 0),
            COALESCE(v_item.tax_rate, 5.0),
            COALESCE(v_item.tax_amount, 0),
            COALESCE(v_item.discount_amount, 0),
            COALESCE(v_item.total_amount, 0),
            v_item.notes
        );
    END LOOP;

    -- Insert payments
    FOR v_payment IN SELECT * FROM jsonb_to_recordset(p_sale->'payments') AS p(
        payment_method VARCHAR(50),
        amount NUMERIC(12, 2),
        tendered_amount NUMERIC(12, 2),
        change_due NUMERIC(12, 2),
        reference_id VARCHAR(255),
        status VARCHAR(50)
    ) LOOP
        INSERT INTO public.payments (
            sale_id,
            business_id,
            payment_method,
            amount,
            tendered_amount,
            change_due,
            status,
            reference_id
        )
        VALUES (
            v_sale_id,
            v_business_id,
            COALESCE(v_payment.payment_method, 'CASH'),
            COALESCE(v_payment.amount, v_server_total),
            COALESCE(v_payment.tendered_amount, v_server_total),
            COALESCE(v_payment.change_due, 0),
            'PENDING',
            v_payment.reference_id
        );
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'sale_id', v_sale_id,
        'receipt_number', v_receipt_number,
        'server_total', v_server_total
    );
END;
$$;
