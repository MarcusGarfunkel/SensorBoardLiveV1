# SensorBoard Live - Quick Start Guide

## What You Built

A real-time IoT sensor monitoring dashboard that:
- Accepts data from ESP32/Arduino/Pico boards
- Displays live sensor readings
- Stores historical data
- Updates in real-time via WebSockets

## Setup Steps

### 1. Configure Environment Variables

Create a `.env` file in the project root:

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Get these values from your Supabase project dashboard at https://supabase.com/dashboard

### 2. Install Dependencies

```bash
npm install
```

### 3. Run the Application

```bash
npm run dev
```

### 4. Create an Account

1. Open the app in your browser
2. Click "Sign Up"
3. Enter your email and password
4. Sign in

### 5. Add a Device

1. Click "Add Device"
2. Give it a name (e.g., "Garage Sensor")
3. Click "Add Device"
4. Click "Show API Key" to reveal the device's unique key

### 6. Program Your Microcontroller

Use the `ESP32_EXAMPLE.ino` file as a template:

1. Install ArduinoJson library in Arduino IDE
2. Update WiFi credentials
3. Update `serverUrl` with your Supabase URL + `/functions/v1/ingest`
4. Update `deviceKey` with the API key from step 5
5. Upload to your board

### 7. Watch Live Data

Once your board is sending data, you'll see:
- Real-time sensor values updating automatically
- "Last seen" timestamp updating
- New sensors appearing automatically

## API Endpoint

Your ingestion endpoint is:
```
POST https://YOUR_SUPABASE_URL/functions/v1/ingest
```

Payload format:
```json
{
  "device_key": "your_device_api_key",
  "readings": [
    { "sensor_name": "temp", "value": 23.5 },
    { "sensor_name": "humidity", "value": 45.2 }
  ]
}
```

## Architecture

- **Frontend**: React + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Real-time**: Supabase Realtime (WebSocket subscriptions)
- **Auth**: Supabase Auth (email/password)

## Next Steps

1. Add actual sensor libraries to your microcontroller code
2. Customize sensor types and units in the dashboard
3. Build charts for historical data visualization
4. Add threshold alerts via n8n
5. Create public dashboard sharing

## Troubleshooting

**Device not showing data?**
- Check WiFi connection on microcontroller
- Verify API key is correct
- Check Serial Monitor for error messages
- Verify Supabase URL is correct

**Real-time updates not working?**
- Check browser console for WebSocket errors
- Ensure Supabase Realtime is enabled in your project

## Learn More

- Database schema: Check the migration file in Supabase
- Edge Function: `supabase/functions/ingest/index.ts`
- Frontend components: `src/components/`
