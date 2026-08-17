import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Bell, MapPin, Building, AlertTriangle, RefreshCw } from 'lucide-react';

interface AlertItem {
  id: string;
  content: string;
  category: string;
  isActive: boolean;
  author?: {
    firstName: string;
    lastName: string;
    role: string;
    organization?: {
      name: string;
      type: string;
    };
  };
  municipality?: {
    name: string;
  };
  createdAt: string;
}

export const PublicAlertsPage: React.FC = () => {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get('/alerts/public');
      if (res.data.success && Array.isArray(res.data.data)) {
        setAlerts(res.data.data);
      }
    } catch (err: any) {
      console.error('Błąd pobierania alertów:', err);
      setError('Nie udało się pobrać publicznych alertów. Upewnij się, że backend jest aktywny.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Hero Section */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-500/10 text-brand-400 text-xs font-semibold border border-brand-500/20">
          <Bell className="h-3.5 w-3.5" />
          <span>System Informowania Mieszkańców i Służb</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Aktywne Ostrzeżenia i Komunikaty
        </h1>
        <p className="text-slate-400 text-sm sm:text-base">
          Bieżące informacje o zagrożeniach powodziowych, pogodowych, drogowych oraz punktach pomocy humanitarnej
        </p>
      </div>

      {/* Kontrolki */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <span className="text-sm font-semibold text-slate-300">
          Aktualnie aktywne komunikaty ({alerts.length})
        </span>
        <button
          onClick={fetchAlerts}
          disabled={isLoading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700/60 transition shadow-sm"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Odśwież</span>
        </button>
      </div>

      {error && (
        <div className="rounded-2xl bg-red-500/10 p-4 border border-red-500/20 text-red-300 text-sm text-center">
          {error}
        </div>
      )}

      {/* Lista alertów */}
      {isLoading ? (
        <div className="py-20 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent mb-3"></div>
          <p className="text-sm text-slate-400">Pobieranie aktywnych alertów...</p>
        </div>
      ) : alerts.length === 0 ? (
        <div className="rounded-3xl bg-slate-800/40 p-12 text-center border border-slate-700/40 max-w-lg mx-auto space-y-3">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
            ✓
          </div>
          <h3 className="text-lg font-bold text-white">Brak aktywnych zagrożeń</h3>
          <p className="text-xs text-slate-400">
            Wszystkie gminy raportują stabilną sytuację. Nowe alerty pojawią się natychmiast po opublikowaniu przez koordynatorów.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="rounded-3xl bg-slate-800/80 p-6 shadow-xl backdrop-blur-xl border border-slate-700/60 flex flex-col justify-between hover:border-brand-500/40 transition space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 text-xs font-semibold border border-amber-500/20">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    {alert.category}
                  </span>
                  {alert.municipality && (
                    <span className="flex items-center gap-1 text-xs text-brand-400 font-medium bg-brand-500/10 px-2.5 py-1 rounded-lg border border-brand-500/20">
                      <MapPin className="h-3.5 w-3.5" />
                      {alert.municipality.name}
                    </span>
                  )}
                </div>

                <p className="text-base text-slate-100 font-medium leading-relaxed">
                  {alert.content}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-700/60 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Building className="h-3.5 w-3.5 text-slate-500" />
                  <span>
                    {alert.author?.organization?.name || 'Służby Ratunkowe'}
                  </span>
                </div>
                <span>
                  {new Date(alert.createdAt).toLocaleString('pl-PL', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
