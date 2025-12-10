import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { SimulatorProvider } from './contexts/SimulatorContext';
import { Auth } from './components/Auth';
import { Dashboard } from './components/Dashboard';
import { SensorSimulator } from './components/SensorSimulator';

function AppContent() {
  const { user, loading } = useAuth();
  const [showSimulator, setShowSimulator] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) return <Auth />;

  if (showSimulator) {
    return <SensorSimulator onBack={() => setShowSimulator(false)} />;
  }

  return <Dashboard onOpenSimulator={() => setShowSimulator(true)} />;
}

function App() {
  return (
    <AuthProvider>
      <SimulatorProvider>
        <AppContent />
      </SimulatorProvider>
    </AuthProvider>
  );
}

export default App;
