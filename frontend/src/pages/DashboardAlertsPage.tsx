import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { AlertsMap, AlertMapItem } from '../components/AlertsMap';
import {
  BellRing,
  Send,
  Ban,
  CheckCircle2,
  AlertTriangle,
  Clock,
  MapPin,
  Building,
  RefreshCw,
  Archive,
  Radio,
  Check,
  X,
  Map as MapIcon,
} from 'lucide-react';

const CATEGORY_OPTIONS = [
  'Ostrzeżenie hydrologiczne',
  'Komunikat drogowy',
  'Pomoc humanitarna',
  'Zagrożenie pożarowe',
  'Awaria infrastruktury',
  'Informacja ogólna',
];

export const DashboardAlertsPage: React.FC = () => {
  const { user } = useAuth();

  const [alerts, setAlerts] = useState<AlertMapItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [content, setContent] = useState('');
  const [category, setCategory] = useState(CATEGORY_OPTIONS[0]);
  const [lat, setLat] = useState<string>('');
  const [lng, setLng] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(true);

  // System powiadomień Toast
  const [toast, setToast] = useState<{
    id: number;
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToast({ id, type, message });
    setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, 4500);
  };

  const fetchAlerts = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/alerts/my-municipality');
      if (res.data.success && Array.isArray(res.data.data)) {
        setAlerts(res.data.data);
      }
    } catch (error: any) {
      console.error('Błąd pobierania alertów gminy:', error);
      showToast(
        error.response?.data?.message || 'Nie udało się pobrać alertów dla Twojej gminy.',
        'error'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  // 1. Obsługa dodawania nowego alertu
  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);
    try {
      const payload: any = {
        content: content.trim(),
        category,
      };

      if (lat && lng) {
        payload.lat = parseFloat(lat);
        payload.lng = parseFloat(lng);
      }

      const res = await api.post('/alerts', payload);

      if (res.data.success && res.data.data) {
        setAlerts((prev) => [res.data.data, ...prev]);
        setContent('');
        setLat('');
        setLng('');
        showToast('Nowy komunikat kryzysowy został pomyślnie opublikowany!');
      }
    } catch (error: any) {
      showToast(
        error.response?.data?.message || 'Wystąpił błąd podczas publikowania alertu.',
        'error'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Obsługa odwoływania komunikatu (dezaktywacja z optymistyczną aktualizacją UI)
  const handleDeactivate = async (alertId: string) => {
    const previousAlerts = [...alerts];

    // Optymistyczna zmiana w UI: natychmiast zmieniamy isActive na false
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, isActive: false } : a))
    );
    setActionLoadingId(alertId);

    try {
      const res = await api.patch(`/alerts/${alertId}/deactivate`);
      if (res.data.success) {
        showToast('Komunikat został pomyślnie odwołany i zarchiwizowany.');
      } else {
        setAlerts(previousAlerts);
        showToast('Nie udało się odwołać alertu.', 'error');
      }
    } catch (error: any) {
      setAlerts(previousAlerts);
      showToast(
        error.response?.data?.message || 'Wystąpił błąd podczas odwoływania komunikatu.',
        'error'
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  // Podział na aktywne i zarchiwizowane
  const activeAlerts = alerts.filter((a) => a.isActive);
  const archivedAlerts = alerts.filter((a) => !a.isActive);

  const canDeactivateAlert = (alert: AlertMapItem) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (alert.authorId === user.id) return true;
    if (alert.author?.organization?.id && user.organizationId) {
      return alert.author.organization.id === user.organizationId;
    }
    return true;
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString('pl-PL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8 relative">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce-short">
          <div
            className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl backdrop-blur-xl border text-sm font-semibold text-white ${
              toast.type === 'success'
                ? 'bg-emerald-600/95 border-emerald-400/40 shadow-emerald-600/30'
                : 'bg-red-600/95 border-red-400/40 shadow-red-600/30'
            }`}
          >
            {toast.type === 'success' ? (
              <Check className="h-5 w-5 shrink-0" />
            ) : (
              <AlertTriangle className="h-5 w-5 shrink-0" />
            )}
            <span>{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="ml-2 hover:opacity-75 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Nagłówek sekcji */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-brand-400 font-semibold text-xs tracking-wider uppercase mb-1">
            <Radio className="h-4 w-4 text-red-400 animate-pulse" />
            <span>Panel Operacyjny • Zarządzanie Komunikatami</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Alerty i Ostrzeżenia Gminne
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Publikuj ostrzeżenia, monitoruj punkty na mapie Leaflet JS i odwołuj aktywne komunikaty
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowMap(!showMap)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold border transition shadow-sm ${
              showMap
                ? 'bg-brand-600 border-brand-500 text-white shadow-brand-600/20'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            <MapIcon className="h-4 w-4" />
            <span>{showMap ? 'Ukryj Mapę' : 'Pokaż Mapę'}</span>
          </button>

          <button
            onClick={fetchAlerts}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold border border-slate-700/60 transition shadow-sm"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Odśwież</span>
          </button>
        </div>
      </div>

      {/* Interaktywna Mapa Leaflet dla gminy */}
      {showMap && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <MapPin className="h-4 w-4 text-red-400" />
              <span>Lokalizacja aktywnych zdarzeń na mapie gminy</span>
            </div>
            <span className="text-xs text-slate-400">
              Możesz odwołać komunikat klikając bezpośrednio na pinezkę
            </span>
          </div>

          <AlertsMap
            alerts={activeAlerts}
            height="380px"
            onDeactivate={handleDeactivate}
            canDeactivate={canDeactivateAlert}
            actionLoadingId={actionLoadingId}
          />
        </section>
      )}

      {/* 1. Formularz dodawania alertu */}
      <div className="rounded-3xl bg-slate-800/90 p-6 sm:p-8 shadow-2xl backdrop-blur-xl border border-slate-700/70">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
            <BellRing className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Opublikuj nowy komunikat</h2>
            <p className="text-xs text-slate-400">
              Komunikat pojawi się natychmiast na publicznej tablicy i mapie Leaflet
            </p>
          </div>
        </div>

        <form onSubmit={handleCreateAlert} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Kategoria zdarzenia
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl bg-slate-900/90 border border-slate-700 py-3 px-4 text-white text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition"
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt} value={opt} className="bg-slate-900 text-white">
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Szerokość (Lat - opcjonalnie)
              </label>
              <input
                type="number"
                step="any"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="np. 50.4380"
                className="w-full rounded-xl bg-slate-900/90 border border-slate-700 py-3 px-4 text-white placeholder-slate-500 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition"
              />
            </div>

            <div className="sm:col-span-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Długość (Lng - opcjonalnie)
              </label>
              <input
                type="number"
                step="any"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                placeholder="np. 16.6548"
                className="w-full rounded-xl bg-slate-900/90 border border-slate-700 py-3 px-4 text-white placeholder-slate-500 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
              Treść komunikatu
            </label>
            <textarea
              required
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Wprowadź szczegółowe informacje (np. lokalizacja zagrożenia, zalecenia dla mieszkańców, godziny otwarcia punktu pomocy)..."
              className="w-full rounded-xl bg-slate-900/90 border border-slate-700 p-4 text-white placeholder-slate-500 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition resize-none"
            ></textarea>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting || !content.trim()}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-teal-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 hover:from-brand-500 hover:to-teal-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 disabled:opacity-50 transition transform active:scale-95"
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  <span>Publikowanie...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Opublikuj alert na mapie</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* 2. Lista Alertów: Pogrupowane na Aktywne i Zarchiwizowane */}
      <div className="space-y-8">
        {/* SEKCJA: Aktywne Komunikaty */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
              </span>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Aktywne Komunikaty ({activeAlerts.length})
              </h2>
            </div>
            <span className="text-xs text-red-400 font-semibold bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20">
              Wymagają uwagi
            </span>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-slate-400">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent mb-2"></div>
              <p className="text-sm">Ładowanie alertów...</p>
            </div>
          ) : activeAlerts.length === 0 ? (
            <div className="rounded-2xl bg-slate-800/40 p-8 text-center border border-slate-700/40">
              <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto mb-2 opacity-80" />
              <p className="text-slate-300 font-medium">Brak aktywnych ostrzeżeń w Twojej gminie</p>
              <p className="text-xs text-slate-500 mt-1">Użyj powyższego formularza, aby opublikować nowy alert.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {activeAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="rounded-3xl bg-slate-800/90 p-6 shadow-xl backdrop-blur-xl border border-red-500/30 flex flex-col justify-between space-y-5 hover:border-red-500/60 transition"
                >
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-wider">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {alert.category}
                      </span>
                      {alert.municipality && (
                        <span className="flex items-center gap-1 text-xs text-slate-300 bg-slate-900/80 px-2.5 py-1 rounded-lg border border-slate-700">
                          <MapPin className="h-3.5 w-3.5 text-brand-400" />
                          {alert.municipality.name}
                        </span>
                      )}
                    </div>

                    <p className="text-base text-slate-100 font-semibold leading-relaxed">
                      {alert.content}
                    </p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 pt-2">
                      <div className="flex items-center gap-1">
                        <Building className="h-3.5 w-3.5 text-slate-500" />
                        <span>{alert.author?.organization?.name || 'Organizacja'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-slate-500" />
                        <time>{formatDate(alert.createdAt)}</time>
                      </div>
                    </div>
                  </div>

                  {/* Duży czerwony przycisk ODWOŁAJ KOMUNIKAT */}
                  {canDeactivateAlert(alert) && (
                    <button
                      onClick={() => handleDeactivate(alert.id)}
                      disabled={actionLoadingId === alert.id}
                      className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold text-sm py-3.5 px-4 shadow-lg shadow-red-600/30 hover:shadow-red-600/50 border border-red-400/30 tracking-wider uppercase transition transform active:scale-[0.98] disabled:opacity-50"
                    >
                      {actionLoadingId === alert.id ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                          <span>Odwoływanie komunikatu...</span>
                        </>
                      ) : (
                        <>
                          <Ban className="h-5 w-5" />
                          <span>ODWOŁAJ KOMUNIKAT</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* SEKCJA: Zarchiwizowane Komunikaty */}
        <section className="space-y-4 pt-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5 text-slate-400">
              <Archive className="h-5 w-5 text-slate-500" />
              <h2 className="text-xl font-bold text-slate-300 tracking-tight">
                Zarchiwizowane ({archivedAlerts.length})
              </h2>
            </div>
            <span className="text-xs text-slate-400 bg-slate-900/60 px-3 py-1 rounded-full border border-slate-700/50">
              Nieaktywne
            </span>
          </div>

          {archivedAlerts.length === 0 ? (
            <div className="rounded-2xl bg-slate-800/20 p-6 text-center border border-slate-800 text-xs text-slate-500">
              Brak zarchiwizowanych alertów w historii.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {archivedAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="rounded-2xl bg-slate-850/50 p-5 border border-slate-850 opacity-75 hover:opacity-100 transition space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-lg bg-slate-800 px-2.5 py-1 text-xs text-slate-400 font-medium">
                      {alert.category}
                    </span>
                    <span className="text-[11px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      ✓ Odwołany
                    </span>
                  </div>

                  <p className="text-sm text-slate-300 line-clamp-2">{alert.content}</p>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
                    <span>{alert.author?.organization?.name || 'Organizacja'}</span>
                    <time>{formatDate(alert.createdAt)}</time>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
