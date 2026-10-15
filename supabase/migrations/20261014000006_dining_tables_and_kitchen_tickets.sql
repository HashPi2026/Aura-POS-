-- Migration: 20261014000006_dining_tables_and_kitchen_tickets.sql
-- Adds dining_tables, kitchen_tickets, updated_at triggers, granular RLS policies, and Realtime publication

-- 1. Helper trigger function for automatic updated_at timestamping
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- 2. Dining Tables Table
CREATE TABLE IF NOT EXISTS public.dining_tables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
    name VARCHAR(100) NOT NULL,
    area VARCHAR(100) DEFAULT 'Main Dining',
    seats INTEGER NOT NULL DEFAULT 4,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_business_table_name UNIQUE (business_id, name)
);

CREATE INDEX IF NOT EXISTS idx_dining_tables_business_id ON public.dining_tables(business_id);
CREATE INDEX IF NOT EXISTS idx_dining_tables_is_active ON public.dining_tables(is_active);

-- 3. Kitchen Tickets (KOT) Table
CREATE TABLE IF NOT EXISTS public.kitchen_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    location_id UUID REFERENCES public.locations(id) ON DELETE SET NULL,
    sale_or_order_ref VARCHAR(100) NOT NULL,
    table_name VARCHAR(100),
    order_type VARCHAR(50) NOT NULL DEFAULT 'DINE_IN',
    status VARCHAR(50) NOT NULL DEFAULT 'PREPARING' CHECK (status IN ('PREPARING', 'READY', 'SERVED', 'CANCELLED')),
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kitchen_tickets_business_id ON public.kitchen_tickets(business_id);
CREATE INDEX IF NOT EXISTS idx_kitchen_tickets_status ON public.kitchen_tickets(status);
CREATE INDEX IF NOT EXISTS idx_kitchen_tickets_created_at ON public.kitchen_tickets(created_at);

-- 4. Automatic updated_at triggers
DROP TRIGGER IF EXISTS trigger_dining_tables_updated_at ON public.dining_tables;
CREATE TRIGGER trigger_dining_tables_updated_at
BEFORE UPDATE ON public.dining_tables
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_kitchen_tickets_updated_at ON public.kitchen_tickets;
CREATE TRIGGER trigger_kitchen_tickets_updated_at
BEFORE UPDATE ON public.kitchen_tickets
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_products_updated_at ON public.products;
CREATE TRIGGER trigger_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_product_categories_updated_at ON public.product_categories;
CREATE TRIGGER trigger_product_categories_updated_at
BEFORE UPDATE ON public.product_categories
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5. Row Level Security on new tables
ALTER TABLE public.dining_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kitchen_tickets ENABLE ROW LEVEL SECURITY;

-- Dining Tables RLS Policies
DROP POLICY IF EXISTS "Members can view dining tables" ON public.dining_tables;
CREATE POLICY "Members can view dining tables"
ON public.dining_tables FOR SELECT
TO authenticated
USING (public.is_business_member(business_id, auth.uid()));

DROP POLICY IF EXISTS "Managers and owners can insert dining tables" ON public.dining_tables;
CREATE POLICY "Managers and owners can insert dining tables"
ON public.dining_tables FOR INSERT
TO authenticated
WITH CHECK (
    public.has_permission(business_id, auth.uid(), 'menu.edit') OR
    public.is_manager_or_owner(business_id, auth.uid())
);

DROP POLICY IF EXISTS "Managers and owners can update dining tables" ON public.dining_tables;
CREATE POLICY "Managers and owners can update dining tables"
ON public.dining_tables FOR UPDATE
TO authenticated
USING (
    public.has_permission(business_id, auth.uid(), 'menu.edit') OR
    public.is_manager_or_owner(business_id, auth.uid())
)
WITH CHECK (
    public.has_permission(business_id, auth.uid(), 'menu.edit') OR
    public.is_manager_or_owner(business_id, auth.uid())
);

DROP POLICY IF EXISTS "Managers and owners can delete dining tables" ON public.dining_tables;
CREATE POLICY "Managers and owners can delete dining tables"
ON public.dining_tables FOR DELETE
TO authenticated
USING (
    public.has_permission(business_id, auth.uid(), 'menu.edit') OR
    public.is_manager_or_owner(business_id, auth.uid())
);

-- Kitchen Tickets RLS Policies
DROP POLICY IF EXISTS "Members can view kitchen tickets" ON public.kitchen_tickets;
CREATE POLICY "Members can view kitchen tickets"
ON public.kitchen_tickets FOR SELECT
TO authenticated
USING (public.is_business_member(business_id, auth.uid()));

DROP POLICY IF EXISTS "Waiters and cashiers can create kitchen tickets" ON public.kitchen_tickets;
CREATE POLICY "Waiters and cashiers can create kitchen tickets"
ON public.kitchen_tickets FOR INSERT
TO authenticated
WITH CHECK (
    public.is_business_member(business_id, auth.uid()) AND (
        public.has_permission(business_id, auth.uid(), 'order.send_kitchen') OR
        public.has_permission(business_id, auth.uid(), 'order.create') OR
        public.is_manager_or_owner(business_id, auth.uid())
    )
);

DROP POLICY IF EXISTS "Kitchen staff and managers can update kitchen ticket status" ON public.kitchen_tickets;
CREATE POLICY "Kitchen staff and managers can update kitchen ticket status"
ON public.kitchen_tickets FOR UPDATE
TO authenticated
USING (
    public.is_business_member(business_id, auth.uid()) AND (
        public.has_permission(business_id, auth.uid(), 'kitchen.update') OR
        public.is_manager_or_owner(business_id, auth.uid())
    )
)
WITH CHECK (
    public.is_business_member(business_id, auth.uid()) AND (
        public.has_permission(business_id, auth.uid(), 'kitchen.update') OR
        public.is_manager_or_owner(business_id, auth.uid())
    )
);

DROP POLICY IF EXISTS "Managers and owners can delete kitchen tickets" ON public.kitchen_tickets;
CREATE POLICY "Managers and owners can delete kitchen tickets"
ON public.kitchen_tickets FOR DELETE
TO authenticated
USING (public.is_manager_or_owner(business_id, auth.uid()));

-- 6. Grant device enrollment RPC with idempotent conflict resolution
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
    
    -- Verify user belongs to business and has permissions
    IF v_user_id IS NOT NULL THEN
        IF NOT public.has_permission(p_business_id, v_user_id, 'device.manage') AND
           NOT public.is_manager_or_owner(p_business_id, v_user_id) THEN
            RAISE EXCEPTION 'Insufficient permissions to enroll terminal device.';
        END IF;
    ELSE
        RAISE EXCEPTION 'User must be authenticated to enroll device.';
    END IF;

    -- Stable identifier
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
        location_id = COALESCE(EXCLUDED.location_id, devices.location_id),
        last_synced_at = NOW(),
        is_active = TRUE
    RETURNING id INTO v_device_id;

    RETURN v_device_id;
END;
$$;

-- 7. Enable Realtime Publications for kitchen_tickets, dining_tables, products, and sales
DO $$
BEGIN
    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.kitchen_tickets;
    EXCEPTION WHEN duplicate_object THEN
        -- table already in publication
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.dining_tables;
    EXCEPTION WHEN duplicate_object THEN
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
    EXCEPTION WHEN duplicate_object THEN
    END;

    BEGIN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.product_categories;
    EXCEPTION WHEN duplicate_object THEN
    END;
END $$;
