/*
  # Enable Realtime for Devices and Readings Tables

  1. Changes
    - Enables realtime publication for the `devices` table
    - Enables realtime publication for the `readings` table
  
  2. Purpose
    - Allows the frontend to receive realtime updates when:
      - New readings are inserted
      - Device last_seen timestamps are updated
    - This is required for the dashboard to display live sensor data
    
  3. Security
    - RLS policies still apply - users only receive events for data they have access to
*/

-- Enable realtime for devices table
ALTER PUBLICATION supabase_realtime ADD TABLE devices;

-- Enable realtime for readings table
ALTER PUBLICATION supabase_realtime ADD TABLE readings;
