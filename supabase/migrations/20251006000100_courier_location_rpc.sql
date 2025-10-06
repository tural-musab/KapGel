-- Migration: Courier Location RPC Function
-- Created: 2025-10-06
-- Description: Implements insert_courier_location() RPC function with validation

-- =============================================================================
-- COURIER LOCATION INSERT RPC FUNCTION
-- =============================================================================

CREATE OR REPLACE FUNCTION insert_courier_location(
  _courier_id uuid,
  _lat double precision,
  _lng double precision,
  _order_id uuid DEFAULT NULL,
  _accuracy double precision DEFAULT NULL,
  _heading double precision DEFAULT NULL,
  _speed double precision DEFAULT NULL,
  _is_manual boolean DEFAULT false
) RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_location_id bigint;
  v_shift_status text;
  v_user_id uuid;
  v_result json;
BEGIN
  -- Get authenticated user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = '42501';
  END IF;

  -- T024-3: Coordinate validation
  IF _lat < -90.0 OR _lat > 90.0 THEN
    RAISE EXCEPTION 'Invalid coordinates: Latitude must be between -90 and 90'
      USING ERRCODE = 'P0001', 
            HINT = 'INVALID_COORDINATES';
  END IF;

  IF _lng < -180.0 OR _lng > 180.0 THEN
    RAISE EXCEPTION 'Invalid coordinates: Longitude must be between -180 and 180'
      USING ERRCODE = 'P0001',
            HINT = 'INVALID_COORDINATES';
  END IF;

  -- Validate optional parameters
  IF _heading IS NOT NULL AND (_heading < 0.0 OR _heading > 360.0) THEN
    RAISE EXCEPTION 'Invalid coordinates: Heading must be between 0 and 360'
      USING ERRCODE = 'P0001',
            HINT = 'INVALID_COORDINATES';
  END IF;

  IF _accuracy IS NOT NULL AND _accuracy < 0.0 THEN
    RAISE EXCEPTION 'Invalid coordinates: Accuracy must be non-negative'
      USING ERRCODE = 'P0001',
            HINT = 'INVALID_COORDINATES';
  END IF;

  IF _speed IS NOT NULL AND _speed < 0.0 THEN
    RAISE EXCEPTION 'Invalid coordinates: Speed must be non-negative'
      USING ERRCODE = 'P0001',
            HINT = 'INVALID_COORDINATES';
  END IF;

  -- T024-4: Check courier exists and is online
  SELECT shift_status INTO v_shift_status
  FROM couriers
  WHERE id = _courier_id
    AND user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Courier not found'
      USING ERRCODE = 'P0002',
            HINT = 'COURIER_NOT_FOUND';
  END IF;

  IF v_shift_status != 'online' THEN
    RAISE EXCEPTION 'Courier not on active shift'
      USING ERRCODE = '42501',
            HINT = 'COURIER_OFFLINE';
  END IF;

  -- Validate order_id if provided
  IF _order_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM orders 
      WHERE id = _order_id 
        AND courier_id = _courier_id
    ) THEN
      RAISE EXCEPTION 'Order not found or not assigned to this courier'
        USING ERRCODE = 'P0002';
    END IF;
  END IF;

  -- Insert location
  INSERT INTO courier_locations (
    courier_id,
    order_id,
    position,
    accuracy,
    heading,
    speed,
    is_manual,
    updated_at
  ) VALUES (
    _courier_id,
    _order_id,
    ST_GeogFromText('POINT(' || _lng || ' ' || _lat || ')'),
    _accuracy,
    _heading,
    _speed,
    _is_manual,
    now()
  )
  RETURNING id INTO v_location_id;

  -- Build response JSON
  SELECT json_build_object(
    'id', v_location_id,
    'courier_id', _courier_id,
    'order_id', _order_id,
    'lat', _lat,
    'lng', _lng,
    'accuracy', _accuracy,
    'heading', _heading,
    'speed', _speed,
    'timestamp', now()
  ) INTO v_result;

  RETURN v_result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION insert_courier_location TO authenticated;

-- Add comment
COMMENT ON FUNCTION insert_courier_location IS 
  'Inserts courier GPS location with validation. Requires courier to be online.';
