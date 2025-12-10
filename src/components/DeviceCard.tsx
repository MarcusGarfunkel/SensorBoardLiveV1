import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useSimulator } from '../contexts/SimulatorContext';
import type { Device, SensorWithLatest } from '../types/database';
import { Activity, Copy, Key, Trash2, ChevronDown, ChevronUp, Plus, Play } from 'lucide-react';
import { AddSensorModal } from './AddSensorModal';
import { SensorHistoryModal } from './SensorHistoryModal';

interface DeviceCardProps {
  device: Device;
  onUpdate: () => void;
}

export function DeviceCard({ device, onUpdate }: DeviceCardProps) {
  const [sensors, setSensors] = useState<SensorWithLatest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showApiKey, setShowApiKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [showAddSensor, setShowAddSensor] = useState(false);
  const [selectedSensor, setSelectedSensor] = useState<SensorWithLatest | null>(null);
  const [localDevice, setLocalDevice] = useState(device);
  const sensorIdsRef = useRef<Set<string>>(new Set());
  const { simulators } = useSimulator();

  const runningSensors = sensors.filter(sensor =>
    Array.from(simulators.values()).some(sim => sim.sensorId === sensor.id && sim.isRunning)
  );

  useEffect(() => {
    setLocalDevice(device);
  }, [device]);

  useEffect(() => {
    console.log(`[DeviceCard ${device.name}] Setting up subscriptions`);
    loadSensors();
    loadDeviceInfo();

    const channel = supabase
      .channel(`device-all-${device.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'devices',
          filter: `id=eq.${device.id}`,
        },
        (payload) => {
          console.log(`[DeviceCard ${device.name}] 🔄 Device UPDATE detected:`, payload.new);
          loadDeviceInfo();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'readings',
        },
        (payload) => {
          const sensorId = payload.new.sensor_id;
          console.log(`[DeviceCard ${device.name}] 📊 Reading INSERT detected for sensor:`, sensorId);
          console.log(`[DeviceCard ${device.name}] Sensor IDs we care about:`, Array.from(sensorIdsRef.current));
          if (sensorIdsRef.current.has(sensorId)) {
            console.log(`[DeviceCard ${device.name}] ✅ Sensor matches! Reloading sensors...`);
            loadSensors();
          } else {
            console.log(`[DeviceCard ${device.name}] ❌ Sensor doesn't match our device`);
          }
        }
      )
      .subscribe((status, err) => {
        console.log(`[DeviceCard ${device.name}] Subscription status:`, status, err);
      });

    return () => {
      console.log(`[DeviceCard ${device.name}] Cleaning up subscriptions`);
      supabase.removeChannel(channel);
    };
  }, [device.id]);

  const loadDeviceInfo = async () => {
    try {
      console.log(`[DeviceCard ${device.name}] 🔍 Loading device info...`);
      const { data, error } = await supabase
        .from('devices')
        .select('*')
        .eq('id', device.id)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        console.log(`[DeviceCard ${device.name}] ✅ Device info loaded. Last seen:`, data.last_seen);
        setLocalDevice(data);
      }
    } catch (error) {
      console.error(`[DeviceCard ${device.name}] Error loading device info:`, error);
    }
  };

  const loadSensors = async () => {
    try {
      console.log(`[DeviceCard ${device.name}] 🔍 Loading sensors...`);
      const { data: sensorsData, error } = await supabase
        .from('sensors')
        .select('*')
        .eq('device_id', device.id);

      if (error) throw error;

      sensorIdsRef.current.clear();
      (sensorsData || []).forEach(sensor => {
        sensorIdsRef.current.add(sensor.id);
      });
      console.log(`[DeviceCard ${device.name}] 📝 Tracking ${sensorIdsRef.current.size} sensor IDs:`, Array.from(sensorIdsRef.current));

      const sensorsWithReadings = await Promise.all(
        (sensorsData || []).map(async (sensor) => {
          const { data: reading } = await supabase
            .from('readings')
            .select('*')
            .eq('sensor_id', sensor.id)
            .order('timestamp', { ascending: false })
            .limit(1)
            .maybeSingle();

          return {
            ...sensor,
            latest_reading: reading || undefined,
          };
        })
      );

      console.log(`[DeviceCard ${device.name}] ✅ Loaded ${sensorsWithReadings.length} sensors with latest readings`);
      sensorsWithReadings.forEach(s => {
        if (s.latest_reading) {
          console.log(`  - ${s.name}: ${s.latest_reading.value} (${s.latest_reading.timestamp})`);
        }
      });

      setSensors(sensorsWithReadings);
    } catch (error) {
      console.error(`[DeviceCard ${device.name}] Error loading sensors:`, error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete device "${device.name}"? This will remove all associated sensors and readings.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('devices')
        .delete()
        .eq('id', device.id);

      if (error) throw error;
      onUpdate();
    } catch (error) {
      console.error('Error deleting device:', error);
      alert('Failed to delete device');
    }
  };

  const copyApiKey = () => {
    navigator.clipboard.writeText(device.api_key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSensorAdded = () => {
    setShowAddSensor(false);
    loadSensors();
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6 hover:border-slate-600 transition-all">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-bold text-white mb-1">{device.name}</h3>
          {device.description && (
            <p className="text-slate-400 text-sm">{device.description}</p>
          )}
        </div>
        <button
          onClick={handleDelete}
          className="text-slate-400 hover:text-red-400 transition-colors"
          title="Delete device"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {runningSensors.length > 0 && (
        <div className="mb-4 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-green-400">
            <Play className="w-4 h-4 animate-pulse" />
            <span>
              {runningSensors.length} sensor{runningSensors.length !== 1 ? 's' : ''} simulating
            </span>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 text-sm text-slate-400 mb-4">
        <Activity className="w-4 h-4" />
        <span>Last seen: {formatTimestamp(localDevice.last_seen)}</span>
      </div>

      {loading ? (
        <div className="text-slate-400 text-sm">Loading sensors...</div>
      ) : (
        <>
          {sensors.length === 0 ? (
            <div className="text-slate-400 text-sm mb-4">No sensors configured</div>
          ) : (
        <div className="space-y-2 mb-4">
          {sensors.slice(0, expanded ? undefined : 3).map((sensor) => (
            <button
              key={sensor.id}
              onClick={() => setSelectedSensor(sensor)}
              className="w-full bg-slate-900/50 hover:bg-slate-900/80 rounded-lg p-3 flex justify-between items-center transition-all cursor-pointer border border-transparent hover:border-slate-600"
            >
              <div className="text-left">
                <div className="text-white font-medium capitalize">{sensor.name}</div>
                <div className="text-slate-400 text-xs">{sensor.type}</div>
              </div>
              {sensor.latest_reading ? (
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-400">
                    {sensor.latest_reading.value.toFixed(1)}
                  </div>
                  <div className="text-slate-400 text-xs">{sensor.unit || 'units'}</div>
                </div>
              ) : (
                <div className="text-slate-500 text-sm">No data</div>
              )}
            </button>
          ))}
          {sensors.length > 3 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-full py-2 text-sm text-slate-400 hover:text-white transition-colors flex items-center justify-center gap-1"
            >
              {expanded ? (
                <>Show less <ChevronUp className="w-4 h-4" /></>
              ) : (
                <>Show {sensors.length - 3} more <ChevronDown className="w-4 h-4" /></>
              )}
            </button>
          )}
        </div>
          )}

          <button
            onClick={() => setShowAddSensor(true)}
            className="w-full py-2 mb-4 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Sensor
          </button>
        </>
      )}

      <div className="border-t border-slate-700 pt-4">
        <button
          onClick={() => setShowApiKey(!showApiKey)}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors mb-2"
        >
          <Key className="w-4 h-4" />
          {showApiKey ? 'Hide' : 'Show'} API Key
        </button>
        {showApiKey && (
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-slate-900/50 px-3 py-2 rounded text-xs text-slate-300 font-mono overflow-x-auto">
              {device.api_key}
            </code>
            <button
              onClick={copyApiKey}
              className="p-2 bg-slate-700 hover:bg-slate-600 rounded transition-colors"
              title="Copy API key"
            >
              {copied ? (
                <span className="text-green-400 text-xs">✓</span>
              ) : (
                <Copy className="w-4 h-4 text-slate-300" />
              )}
            </button>
          </div>
        )}
      </div>

      {showAddSensor && (
        <AddSensorModal
          deviceId={device.id}
          onClose={() => setShowAddSensor(false)}
          onSuccess={handleSensorAdded}
        />
      )}

      {selectedSensor && (
        <SensorHistoryModal
          sensorId={selectedSensor.id}
          sensorName={selectedSensor.name}
          sensorUnit={selectedSensor.unit || 'units'}
          onClose={() => setSelectedSensor(null)}
        />
      )}
    </div>
  );
}
