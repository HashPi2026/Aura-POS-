-- ====================================================================
-- Migration: 20261022000001_add_address_and_owner_contact_to_businesses.sql
-- Description: Adds address and owner contact details (owner_name, owner_phone, owner_email)
--              to businesses table, and updates create_business_and_owner onboarding RPC.
-- ====================================================================

-- 1. Alter businesses table to include address and owner contact information
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS owner_name VARCHAR(255);
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS owner_phone VARCHAR(50);
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS owner_email VARCHAR(255);

-- 2. Update create_business_and_owner RPC with address and owner contact parameters
CREATE OR REPLACE FUNCTION create_business_and_owner(
    p_name VARCHAR,
    p_business_type VARCHAR,
    p_tax_identifier VARCHAR,
    p_owner_name VARCHAR,
    p_address TEXT DEFAULT NULL,
    p_owner_phone VARCHAR DEFAULT NULL,
    p_owner_email VARCHAR DEFAULT NULL
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
    v_clean_address TEXT;
    v_clean_phone VARCHAR;
    v_clean_email VARCHAR;
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

    v_clean_address := NULLIF(TRIM(COALESCE(p_address, '')), '');
    v_clean_phone := NULLIF(TRIM(COALESCE(p_owner_phone, '')), '');
    v_clean_email := NULLIF(TRIM(COALESCE(p_owner_email, '')), '');

    -- 1. Create Business Record
    INSERT INTO businesses (
        name,
        business_type,
        tax_identifier,
        address,
        phone,
        owner_name,
        owner_phone,
        owner_email,
        currency,
        timezone,
        is_active
    ) VALUES (
        v_clean_name,
        COALESCE(NULLIF(p_business_type, ''), 'cafe'),
        NULLIF(TRIM(p_tax_identifier), ''),
        v_clean_address,
        v_clean_phone,
        v_clean_owner,
        v_clean_phone,
        v_clean_email,
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
