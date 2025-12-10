import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useSimulator } from '../contexts/SimulatorContext';
import { Play, Pause, ArrowLeft, Activity } from 'lucide-react';
import type { Device } from '../types/database';

interface Sensor {
  id: string;
  device_id: string;
  name: string;
  type: string;
  unit: string;
}

export function SensorSimulator({ onBack }: { onBack: () => void }) {
  const [devices, setDevices] = useState<Device[]>([]);
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const { startSimulator, stopSimulator, isRunning, getSimulator } = useSimulator();

  useEffect(() => {
    loadDevices();
  }, []);

  useEffect(() => {
    if (selectedDevice) {
      loadSensors(selectedDevice);
    } else {
      setSensors([]);
    }
  }, [selectedDevice]);

  const loadDevices = async () => {
    try {
      const { data, error } = await supabase
        .from('devices')
        .select('*')
        .order('name');

      if (error) throw error;
      setDevices(data || []);
    } catch (error) {
      console.error('Error loading devices:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSensors = async (deviceId: string) => {
    try {
      const { data, error } = await supabase
        .from('sensors')
        .select('*')
        .eq('device_id', deviceId)
        .order('name');

      if (error) throw error;
      setSensors(data || []);
    } catch (error) {
      console.error('Error loading sensors:', error);
    }
  };

  const toggleSimulator = (deviceId: string, sensor: Sensor) => {
    if (isRunning(sensor.id)) {
      stopSimulator(sensor.id);
    } else {
      startSimulator(deviceId, sensor.id, sensor.name, sensor.type, sensor.unit);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>
          <div className="flex items-center gap-3">
            <Activity className="w-8 h-8 text-blue-500" />
            <div>
              <h1 className="text-4xl font-bold text-white">Sensor Simulator</h1>
              <p className="text-slate-400 mt-1">Generate realistic test data for your sensors</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-6 mb-6">
          <label htmlFor="device-select" className="block text-sm font-medium text-slate-300 mb-2">
            Select Device
          </label>
          <select
            id="device-select"
            value={selectedDevice}
            onChange={(e) => setSelectedDevice(e.target.value)}
            className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Choose a device...</option>
            {devices.map((device) => (
              <option key={device.id} value={device.id}>
                {device.name}
              </option>
            ))}
          </select>
        </div>

        {selectedDevice && sensors.length === 0 && (
          <div className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-2xl p-12 text-center">
            <h2 className="text-xl font-bold text-white mb-2">No sensors found</h2>
            <p className="text-slate-400">This device doesn't have any sensors configured yet.</p>
          </div>
        )}

        {selectedDevice && sensors.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white mb-4">Available Sensors</h2>
            {sensors.map((sensor) => {
              const running = isRunning(sensor.id);
              const sim = getSimulator(sensor.id);

              return (
                <div
                  key={sensor.id}
                  className="bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl p-6"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-1">{sensor.name}</h3>
                      <div className="flex items-center gap-4 text-sm text-slate-400">
                        <span>Type: {sensor.type}</span>
                        <span>Unit: {sensor.unit}</span>
                        {running && sim && (
                          <span className="text-blue-400">
                            Current: {sim.currentValue.toFixed(2)} {sensor.unit}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => toggleSimulator(selectedDevice, sensor)}
                      className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all ${
                        running
                          ? 'bg-red-600 hover:bg-red-700 text-white'
                          : 'bg-green-600 hover:bg-green-700 text-white'
                      }`}
                    >
                      {running ? (
                        <>
                          <Pause className="w-5 h-5" />
                          Stop
                        </>
                      ) : (
                        <>
                          <Play className="w-5 h-5" />
                          Start
                        </>
                      )}
                    </button>
                  </div>
                  {running && (
                    <div className="mt-4 pt-4 border-t border-slate-600">
                      <div className="flex items-center gap-2 text-sm text-green-400">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        Sending data every 5 seconds
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
