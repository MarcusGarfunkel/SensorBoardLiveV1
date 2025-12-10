import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey, x-device-key',
};

interface SensorReading {
  sensor_name: string;
  value: number;
}

interface IngestPayload {
  device_key: string;
  readings: SensorReading[];
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const payload: IngestPayload = await req.json();
    const { device_key, readings } = payload;

    if (!device_key || !readings || !Array.isArray(readings)) {
      return new Response(
        JSON.stringify({ error: 'Invalid payload. Expected device_key and readings array.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { data: device, error: deviceError } = await supabase
      .from('devices')
      .select('id, user_id')
      .eq('api_key', device_key)
      .maybeSingle();

    if (deviceError || !device) {
      return new Response(
        JSON.stringify({ error: 'Invalid device key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const insertedReadings = [];

    for (const reading of readings) {
      const { sensor_name, value } = reading;

      if (!sensor_name || value === undefined || value === null) {
        continue;
      }

      let { data: sensor } = await supabase
        .from('sensors')
        .select('id')
        .eq('device_id', device.id)
        .eq('name', sensor_name)
        .maybeSingle();

      if (!sensor) {
        const { data: newSensor, error: sensorError } = await supabase
          .from('sensors')
          .insert({
            device_id: device.id,
            name: sensor_name,
            type: sensor_name,
            unit: '',
          })
          .select('id')
          .single();

        if (sensorError) {
          console.error('Error creating sensor:', sensorError);
          continue;
        }

        sensor = newSensor;
      }

      const { data: readingData, error: readingError } = await supabase
        .from('readings')
        .insert({
          sensor_id: sensor.id,
          value: value,
          timestamp: new Date().toISOString(),
        })
        .select()
        .single();

      if (readingError) {
        console.error('Error inserting reading:', readingError);
      } else {
        insertedReadings.push(readingData);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        device_id: device.id,
        readings_inserted: insertedReadings.length,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('Ingest error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});