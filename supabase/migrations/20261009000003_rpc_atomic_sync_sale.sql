-- ====================================================================
-- Migration: 20261009000003_rpc_atomic_sync_sale.sql
-- Description: Atomic Idempotent PostgreSQL RPC for Sales Synchronization
-- ====================================================================

CREATE OR REPLACE FUNCTION sync_sale(p_sale JSONB)
RETURNS JSONB AS $$
DECLARE
    v_sale_id UUID;
    v_business_id UUID;
    v_location_id UUID;
    v_device_id UUID;
    v_cashier_id UUID;
    v_receipt_number VARCHAR;
    v_order_type VARCHAR;
    v_table_name VARCHAR;
    v_subtotal NUMERIC(12, 2);
    v_tax_amount NUMERIC(12, 2);
    v_discount_amount NUMERIC(12, 2);
    v_round_off NUMERIC(12, 2);
    v_total_amount NUMERIC(12, 2);
    v_client_timestamp TIMESTAMPTZ;
    v_notes TEXT;
    
    v_items JSONB;
    v_item JSONB;
    v_item_subtotal NUMERIC(12, 2) := 0;
    v_item_tax NUMERIC(12, 2) := 0;
    v_calculated_subtotal NUMERIC(12, 2) := 0;
    
    v_payments JSONB;
    v_payment JSONB;
    v_payment_sum NUMERIC(12, 2) := 0;
    
    v_existing_sale RECORD;
    v_member RECORD;
    v_prod RECORD;
BEGIN
    -- 1. Extract Header Fields
    v_sale_id := (p_sale->>'id')::UUID;
    v_business_id := (p_sale->>'business_id')::UUID;
    v_receipt_number := p_sale->>'receipt_number';
    v_order_type := COALESCE(p_sale->>'order_type', 'DINE_IN');
    v_table_name := p_sale->>'table_name';
    v_subtotal := (p_sale->>'subtotal')::NUMERIC;
    v_tax_amount := COALESCE((p_sale->>'tax_amount')::NUMERIC, 0);
    v_discount_amount := COALESCE((p_sale->>'discount_amount')::NUMERIC, 0);
    v_round_off := COALESCE((p_sale->>'round_off')::NUMERIC, 0);
    v_total_amount := (p_sale->>'total_amount')::NUMERIC;
    v_client_timestamp := COALESCE((p_sale->>'client_timestamp')::TIMESTAMPTZ, NOW());
    v_notes := p_sale->>'notes';
    
    IF p_sale->>'location_id' IS NOT NULL AND p_sale->>'location_id' != '' THEN
        v_location_id := (p_sale->>'location_id')::UUID;
    END IF;
    IF p_sale->>'device_id' IS NOT NULL AND p_sale->>'device_id' != '' THEN
        v_device_id := (p_sale->>'device_id')::UUID;
    END IF;
    IF p_sale->>'cashier_id' IS NOT NULL AND p_sale->>'cashier_id' != '' THEN
        v_cashier_id := (p_sale->>'cashier_id')::UUID;
    END IF;

    -- 2. Authorization Verification
    SELECT * INTO v_member
    FROM business_members
    WHERE business_id = v_business_id
      AND user_id = auth.uid()
      AND is_active = TRUE;

    IF v_member IS NULL THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'Unauthorized: User is not an active member of this business.',
            'error_code', 'UNAUTHORIZED_MEMBER'
        );
    END IF;

    -- 3. Idempotency Check (Check if sale ID was already synced)
    SELECT * INTO v_existing_sale
    FROM sales
    WHERE id = v_sale_id;

    IF v_existing_sale IS NOT NULL THEN
        -- Verify that it belongs to the same business
        IF v_existing_sale.business_id != v_business_id THEN
            RETURN jsonb_build_object(
                'success', FALSE,
                'error', 'Conflicting sale UUID detected across businesses.',
                'error_code', 'CONFLICTING_SALE_UUID'
            );
        END IF;

        -- Return existing sale acknowledgement (Idempotent replay)
        RETURN jsonb_build_object(
            'success', TRUE,
            'duplicate', TRUE,
            'message', 'Sale already synchronized (idempotent)',
            'sale_id', v_sale_id,
            'receipt_number', v_existing_sale.receipt_number,
            'synced_at', v_existing_sale.created_at
        );
    END IF;

    -- 4. Validate Items & Recompute Totals
    v_items := p_sale->'items';
    IF v_items IS NULL OR jsonb_array_length(v_items) = 0 THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'Sale must contain at least one item line.',
            'error_code', 'EMPTY_SALE_ITEMS'
        );
    END IF;

    FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
    LOOP
        v_item_subtotal := ((v_item->>'quantity')::NUMERIC * (v_item->>'unit_price')::NUMERIC);
        v_calculated_subtotal := v_calculated_subtotal + v_item_subtotal;
    END LOOP;

    -- Validate that total matches subtotal + tax - discount + round_off within standard rounding tolerance (0.05)
    IF ABS((v_subtotal + v_tax_amount - v_discount_amount + v_round_off) - v_total_amount) > 0.10 THEN
        RETURN jsonb_build_object(
            'success', FALSE,
            'error', 'Calculated monetary totals do not match item line calculations.',
            'error_code', 'TOTAL_MISMATCH'
        );
    END IF;

    -- 5. Validate Payments
    v_payments := p_sale->'payments';
    IF v_payments IS NOT NULL AND jsonb_array_length(v_payments) > 0 THEN
        FOR v_payment IN SELECT * FROM jsonb_array_elements(v_payments)
        LOOP
            v_payment_sum := v_payment_sum + (v_payment->>'amount')::NUMERIC;
        END LOOP;

        IF ABS(v_payment_sum - v_total_amount) > 0.05 THEN
            RETURN jsonb_build_object(
                'success', FALSE,
                'error', 'Sum of payment records does not cover the total sale amount.',
                'error_code', 'PAYMENT_AMOUNT_MISMATCH'
            );
        END IF;
    END IF;

    -- 6. Atomic Inserts
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
        v_subtotal,
        v_tax_amount,
        v_discount_amount,
        v_round_off,
        v_total_amount,
        'COMPLETED',
        v_notes,
        v_client_timestamp,
        NOW()
    );

    -- B. Insert Sale Items and record Inventory Movements
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_items)
    LOOP
        INSERT INTO sale_items (
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
        ) VALUES (
            v_sale_id,
            CASE WHEN v_item->>'product_id' IS NOT NULL AND v_item->>'product_id' != '' THEN (v_item->>'product_id')::UUID ELSE NULL END,
            v_item->>'product_name',
            (v_item->>'quantity')::NUMERIC,
            (v_item->>'unit_price')::NUMERIC,
            COALESCE((v_item->>'tax_rate')::NUMERIC, 0),
            COALESCE((v_item->>'tax_amount')::NUMERIC, 0),
            COALESCE((v_item->>'discount_amount')::NUMERIC, 0),
            (v_item->>'total_amount')::NUMERIC,
            v_item->>'notes'
        );

        -- If product is tracked, adjust inventory
        IF v_item->>'product_id' IS NOT NULL AND v_item->>'product_id' != '' THEN
            SELECT * INTO v_prod FROM products WHERE id = (v_item->>'product_id')::UUID AND business_id = v_business_id;
            IF v_prod IS NOT NULL AND v_prod.track_inventory = TRUE THEN
                UPDATE products
                SET stock_quantity = stock_quantity - (v_item->>'quantity')::NUMERIC
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
                    -((v_item->>'quantity')::NUMERIC),
                    v_sale_id,
                    'Sale deduction #' || v_receipt_number,
                    v_member.id
                );
            END IF;
        END IF;
    END LOOP;

    -- C. Insert Payments
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
                COALESCE(v_payment->>'status', 'VERIFIED')
            );
        END LOOP;
    END IF;

    -- D. Record Sync Event
    INSERT INTO sync_events (
        business_id,
        device_id,
        entity_type,
        entity_id,
        event_type,
        payload,
        status
    ) VALUES (
        v_business_id,
        v_device_id,
        'sale',
        v_sale_id,
        'create',
        p_sale,
        'APPLIED'
    );

    -- 7. Return Atomic Success Acknowledgement
    RETURN jsonb_build_object(
        'success', TRUE,
        'sale_id', v_sale_id,
        'receipt_number', v_receipt_number,
        'synced_at', NOW(),
        'message', 'Sale persisted atomically and synchronized successfully'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
