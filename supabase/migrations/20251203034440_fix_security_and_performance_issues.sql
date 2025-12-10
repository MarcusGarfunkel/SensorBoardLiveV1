/*
  # Fix Security and Performance Issues

  ## Overview
  Addresses Supabase security advisor warnings:
  - Adds missing indexes on foreign keys for query performance
  - Optimizes RLS policies by caching auth.uid() calls
  - Fixes function search_path mutability
  - Note: Leaked password protection is enabled via Supabase dashboard settings

  ## Changes

  ### 1. Foreign Key Indexes
  - Added index on devices.user_id for faster lookups and joins
  
  ### 2. RLS Policy Optimization
  - Wrapped all auth.uid() calls with (select auth.uid()) to cache the result
  - This prevents re-evaluation for each row, significantly improving performance at scale
  - Applied to all policies on devices, sensors, and readings tables

  ### 3. Function Search Path
  - Updated update_device_last_seen() function to immutable search_path

  ## Performance Impact
  - Reduces function call overhead in RLS policies
  - Improves join performance on user_id foreign keys
  - Scales better as data volume grows
*/

-- Add missing foreign key index on devices.user_id
CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices(user_id);

-- Drop trigger first, then function
DROP TRIGGER IF EXISTS trigger_update_device_last_seen ON readings;

-- Drop and recreate devices RLS policies with optimized auth.uid() calls
DROP POLICY IF EXISTS "Users can view own devices" ON devices;
CREATE POLICY "Users can view own devices"
  ON devices FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert own devices" ON devices;
CREATE POLICY "Users can insert own devices"
  ON devices FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own devices" ON devices;
CREATE POLICY "Users can update own devices"
  ON devices FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete own devices" ON devices;
CREATE POLICY "Users can delete own devices"
  ON devices FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Drop and recreate sensors RLS policies with optimized auth.uid() calls
DROP POLICY IF EXISTS "Users can view sensors of own devices" ON sensors;
CREATE POLICY "Users can view sensors of own devices"
  ON sensors FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM devices
      WHERE devices.id = sensors.device_id
      AND devices.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert sensors for own devices" ON sensors;
CREATE POLICY "Users can insert sensors for own devices"
  ON sensors FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM devices
      WHERE devices.id = sensors.device_id
      AND devices.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update sensors of own devices" ON sensors;
CREATE POLICY "Users can update sensors of own devices"
  ON sensors FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM devices
      WHERE devices.id = sensors.device_id
      AND devices.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM devices
      WHERE devices.id = sensors.device_id
      AND devices.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete sensors of own devices" ON sensors;
CREATE POLICY "Users can delete sensors of own devices"
  ON sensors FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM devices
      WHERE devices.id = sensors.device_id
      AND devices.user_id = (SELECT auth.uid())
    )
  );

-- Drop and recreate readings RLS policies with optimized auth.uid() calls
DROP POLICY IF EXISTS "Users can view readings of own devices" ON readings;
CREATE POLICY "Users can view readings of own devices"
  ON readings FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sensors
      JOIN devices ON devices.id = sensors.device_id
      WHERE sensors.id = readings.sensor_id
      AND devices.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can insert readings for own devices" ON readings;
CREATE POLICY "Users can insert readings for own devices"
  ON readings FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sensors
      JOIN devices ON devices.id = sensors.device_id
      WHERE sensors.id = readings.sensor_id
      AND devices.user_id = (SELECT auth.uid())
    )
  );

-- Recreate function with proper settings
CREATE OR REPLACE FUNCTION update_device_last_seen()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
BEGIN
  UPDATE devices
  SET last_seen = NEW.timestamp
  WHERE id = (SELECT device_id FROM sensors WHERE id = NEW.sensor_id);
  RETURN NEW;
END;
$$;

-- Recreate trigger with updated function
CREATE TRIGGER trigger_update_device_last_seen
  AFTER INSERT ON readings
  FOR EACH ROW
  EXECUTE FUNCTION update_device_last_seen();
