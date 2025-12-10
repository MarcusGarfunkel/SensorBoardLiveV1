import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { X, TrendingUp } from 'lucide-react';
import type { Reading } from '../types/database';

interface SensorHistoryModalProps {
  sensorId: string;
  sensorName: string;
  sensorUnit: string;
  onClose: () => void;
}

export function SensorHistoryModal({ sensorId, sensorName, sensorUnit, onClose }: SensorHistoryModalProps) {
  const [readings, setReadings] = useState<Reading[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadReadings();
  }, [sensorId]);

  const loadReadings = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('readings')
        .select('*')
        .eq('sensor_id', sensorId)
        .order('timestamp', { ascending: false })
        .limit(100);

      if (fetchError) throw fetchError;
      setReadings(data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load readings');
    } finally {
      setLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const calculateStats = () => {
    if (readings.length === 0) return null;

    const values = readings.map(r => r.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;

    return { min, max, avg };
  };

  const stats = calculateStats();

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-3xl max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white capitalize">{sensorName}</h2>
            <p className="text-slate-400 text-sm">Reading History</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {loading ? (
          <div className="text-slate-400 text-center py-8">Loading readings...</div>
        ) : error ? (
          <div className="text-red-400 text-center py-8">{error}</div>
        ) : readings.length === 0 ? (
          <div className="text-slate-400 text-center py-8">No readings yet</div>
        ) : (
          <>
            {stats && (
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-slate-900/50 rounded-lg p-4">
                  <div className="text-slate-400 text-xs mb-1">Average</div>
                  <div className="text-2xl font-bold text-blue-400">
                    {stats.avg.toFixed(1)}
                    <span className="text-sm text-slate-400 ml-1">{sensorUnit}</span>
                  </div>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-4">
                  <div className="text-slate-400 text-xs mb-1">Minimum</div>
                  <div className="text-2xl font-bold text-green-400">
                    {stats.min.toFixed(1)}
                    <span className="text-sm text-slate-400 ml-1">{sensorUnit}</span>
                  </div>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-4">
                  <div className="text-slate-400 text-xs mb-1">Maximum</div>
                  <div className="text-2xl font-bold text-orange-400">
                    {stats.max.toFixed(1)}
                    <span className="text-sm text-slate-400 ml-1">{sensorUnit}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 text-sm text-slate-400 mb-3">
              <TrendingUp className="w-4 h-4" />
              <span>Showing {readings.length} most recent readings</span>
            </div>

            <div className="overflow-y-auto flex-1 -mx-6 px-6">
              <table className="w-full">
                <thead className="sticky top-0 bg-slate-800">
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Value</th>
                    <th className="text-left py-3 px-4 text-slate-400 font-medium text-sm">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {readings.map((reading) => (
                    <tr key={reading.id} className="border-b border-slate-700/50 hover:bg-slate-700/30">
                      <td className="py-3 px-4">
                        <span className="text-white font-medium">
                          {reading.value.toFixed(2)}
                        </span>
                        <span className="text-slate-400 text-sm ml-2">{sensorUnit}</span>
                      </td>
                      <td className="py-3 px-4 text-slate-300 text-sm">
                        {formatTimestamp(reading.timestamp)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="mt-4 pt-4 border-t border-slate-700">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
