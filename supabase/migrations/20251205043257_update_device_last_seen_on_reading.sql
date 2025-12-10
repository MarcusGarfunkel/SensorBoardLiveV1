/*
  # Update device last_seen on new readings

  1. Changes
    - Creates a trigger function to update device.last_seen when a new reading is inserted
    - Automatically updates the device's last_seen timestamp to match the reading's timestamp
  
  2. Purpose
    - Keeps device last_seen accurate without requiring manual updates
    - Ensures the UI displays correct "last seen" times
*/

-- Function to update device last_seen when a reading is inserted
CREATE OR REPLACE FUNCTION update_device_last_seen()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE devices
  SET last_seen = NEW.timestamp
  WHERE id = (
    SELECT device_id FROM sensors WHERE id = NEW.sensor_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call the function
DROP TRIGGER IF EXISTS trigger_update_device_last_seen ON readings;
CREATE TRIGGER trigger_update_device_last_seen
  AFTER INSERT ON readings
  FOR EACH ROW
  EXECUTE FUNCTION update_device_last_seen();
