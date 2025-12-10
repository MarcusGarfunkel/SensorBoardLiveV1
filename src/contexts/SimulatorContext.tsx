import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

interface SimulatorState {
  deviceId: string;
  sensorId: string;
  sensorName: string;
  sensorType: string;
  sensorUnit: string;
  isRunning: boolean;
  intervalId: number | null;
  currentValue: number;
}

interface SimulatorContextType {
  simulators: Map<string, SimulatorState>;
  startSimulator: (deviceId: string, sensorId: string, name: string, type: string, unit: string) => void;
  stopSimulator: (sensorId: string) => void;
  isRunning: (sensorId: string) => boolean;
  getSimulator: (sensorId: string) => SimulatorState | undefined;
}

const SimulatorContext = createContext<SimulatorContextType | null>(null);

export function SimulatorProvider({ children }: { children: ReactNode }) {
  const [simulators, setSimulators] = useState<Map<string, SimulatorState>>(new Map());

  useEffect(() => {
    return () => {
      simulators.forEach(sim => {
        if (sim.intervalId) clearInterval(sim.intervalId);
      });
    };
  }, []);

  const generateValue = (type: string, previousValue?: number): number => {
    const baseValue = previousValue ?? (() => {
      switch (type.toLowerCase()) {
        case 'temperature':
          return 20 + Math.random() * 10;
        case 'humidity':
          return 40 + Math.random() * 40;
        case 'pressure':
          return 1000 + Math.random() * 50;
        case 'light':
          return Math.random() * 1000;
        case 'co2':
          return 400 + Math.random() * 600;
        case 'voltage':
          return 3.0 + Math.random() * 2.0;
        default:
          return Math.random() * 100;
      }
    })();

    const variation = (Math.random() - 0.5) * 2;
    return Math.max(0, baseValue + variation);
  };

  const sendReading = async (sensorId: string, value: number) => {
    try {
      const timestamp = new Date().toISOString();
      console.log(`[Simulator] 📤 Sending reading for sensor ${sensorId}:`, { value, timestamp });

      const { data, error } = await supabase
        .from('readings')
        .insert({
          sensor_id: sensorId,
          value: value,
          timestamp: timestamp
        })
        .select();

      if (error) {
        console.error('[Simulator] ❌ Error sending reading:', error);
      } else {
        console.log('[Simulator] ✅ Reading sent successfully:', data);
      }
    } catch (error) {
      console.error('[Simulator] ❌ Exception sending reading:', error);
    }
  };

  const startSimulator = (deviceId: string, sensorId: string, name: string, type: string, unit: string) => {
    if (simulators.get(sensorId)?.isRunning) {
      console.log(`[Simulator] ⚠️ Simulator already running for sensor ${sensorId}`);
      return;
    }

    console.log(`[Simulator] 🚀 Starting simulator for sensor ${sensorId} (${name})`);
    const initialValue = generateValue(type);
    sendReading(sensorId, initialValue);

    const intervalId = window.setInterval(() => {
      setSimulators(prev => {
        const current = prev.get(sensorId);
        if (!current) return prev;

        const newValue = generateValue(type, current.currentValue);
        console.log(`[Simulator] 🔄 Generating new reading for ${current.sensorName}:`, newValue);
        sendReading(sensorId, newValue);

        const updated = new Map(prev);
        updated.set(sensorId, { ...current, currentValue: newValue });
        return updated;
      });
    }, 5000);

    setSimulators(prev => {
      const updated = new Map(prev);
      updated.set(sensorId, {
        deviceId,
        sensorId,
        sensorName: name,
        sensorType: type,
        sensorUnit: unit,
        isRunning: true,
        intervalId,
        currentValue: initialValue
      });
      return updated;
    });
  };

  const stopSimulator = (sensorId: string) => {
    const sim = simulators.get(sensorId);
    console.log(`[Simulator] 🛑 Stopping simulator for sensor ${sensorId}`);
    if (sim?.intervalId) {
      clearInterval(sim.intervalId);
    }

    setSimulators(prev => {
      const updated = new Map(prev);
      updated.delete(sensorId);
      return updated;
    });
  };

  const isRunning = (sensorId: string): boolean => {
    return simulators.get(sensorId)?.isRunning || false;
  };

  const getSimulator = (sensorId: string): SimulatorState | undefined => {
    return simulators.get(sensorId);
  };

  return (
    <SimulatorContext.Provider value={{ simulators, startSimulator, stopSimulator, isRunning, getSimulator }}>
      {children}
    </SimulatorContext.Provider>
  );
}

export function useSimulator() {
  const context = useContext(SimulatorContext);
  if (!context) {
    throw new Error('useSimulator must be used within SimulatorProvider');
  }
  return context;
}
