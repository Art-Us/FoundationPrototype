import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { AlertsMap, AlertMapItem } from '../components/AlertsMap';
import { LocationPickerMap, LocationDetails } from '../components/LocationPickerMap';
import {
  AlertHistoryModal,
  calculateAlertDurations,
  formatDuration,
} from '../components/AlertHistoryModal';
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
  RotateCcw,
  Pencil,
  Save,
  Search,
  History,
  Calendar,
  ArrowUpDown,
} from 'lucide-react';

const CATEGORY_OPTIONS = [
  'Ostrzeżenie hydrologiczne',
  'Komunikat drogowy',
  'Pomoc humanitarna',
  'Zagrożenie pożarowe',
  'Awaria infrastruktury',
  'Informacja ogólna',
];

type ArchiveTimeframe = '24h' | '48h' | '72h' | 'tydzien' | 'miesiac' | 'rok' | 'wszystkie' | 'custom';
type ArchiveSortOption = 'date-desc' | 'date-asc' | 'name-asc' | 'name-desc' | 'duration-desc' | 'duration-asc';

export const DashboardAlertsPage: React.FC = () => {
  const { user } = useAuth();

  const [alerts, setAlerts] = useState<AlertMapItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Formularz tworzenia alertu
  const [content, setContent] = useState('');
  const [category, setCategory] = useState(CATEGORY_OPTIONS[0]);
  const [locationName, setLocationName] = useState('');
  const [county, setCounty] = useState('');
  const [voivodeship, setVoivodeship] = useState('');
  const [lat, setLat] = useState<string>('');
  const [lng, setLng] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [showMap, setShowMap] = useState(true);

  // =========================================================================
  // FILTRY I WYSZUKIWANIE W ARCHIWUM
  // =========================================================================
  const [archiveSearchQuery, setArchiveSearchQuery] = useState('');
  const [archiveTimeframe, setArchiveTimeframe] = useState<ArchiveTimeframe>('24h');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [archiveCategoryFilter, setArchiveCategoryFilter] = useState<string>('all');
  const [archiveOrgFilter, setArchiveOrgFilter] = useState<string>('all');
  const [archiveSort, setArchiveSort] = useState<ArchiveSortOption>('date-desc');

  // Modal historii cyklu życia
  const [selectedHistoryAlert, setSelectedHistoryAlert] = useState<AlertMapItem | null>(null);

  // Modal edycji alertu
  const [editingAlert, setEditingAlert] = useState<AlertMapItem | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editLocationName, setEditLocationName] = useState('');
  const [editCounty, setEditCounty] = useState('');
  const [editVoivodeship, setEditVoivodeship] = useState('');
  const [editLat, setEditLat] = useState<string>('');
  const [editLng, setEditLng] = useState<string>('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

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
        locationName: locationName.trim() || undefined,
        county: county.trim() || undefined,
        voivodeship: voivodeship.trim() || undefined,
      };

      if (lat && lng) {
        payload.lat = parseFloat(lat);
        payload.lng = parseFloat(lng);
      }

      const res = await api.post('/alerts', payload);

      if (res.data.success && res.data.data) {
        setAlerts((prev) => [res.data.data, ...prev]);
        setContent('');
        setLocationName('');
        setCounty('');
        setVoivodeship('');
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

  // 2. Obsługa odwoływania komunikatu
  const handleDeactivate = async (alertId: string) => {
    const previousAlerts = [...alerts];

    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, isActive: false } : a))
    );
    setActionLoadingId(alertId);

    try {
      const res = await api.patch(`/alerts/${alertId}/deactivate`);
      if (res.data.success && res.data.data) {
        setAlerts((prev) =>
          prev.map((a) => (a.id === alertId ? res.data.data : a))
        );
        showToast('Komunikat został pomyślnie odwołany i przeniesiony do archiwum.');
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

  // 3. Ponowne alertowanie (Wznowienie z archiwum)
  const handleReactivate = async (alertId: string) => {
    const previousAlerts = [...alerts];

    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, isActive: true } : a))
    );
    setActionLoadingId(alertId);

    try {
      const res = await api.patch(`/alerts/${alertId}/reactivate`);
      if (res.data.success && res.data.data) {
        setAlerts((prev) =>
          prev.map((a) => (a.id === alertId ? res.data.data : a))
        );
        showToast('Komunikat został pomyślnie wznowiony i ponownie opublikowany!');
      } else {
        setAlerts(previousAlerts);
        showToast('Nie udało się wznowić alertu.', 'error');
      }
    } catch (error: any) {
      setAlerts(previousAlerts);
      showToast(
        error.response?.data?.message || 'Wystąpił błąd podczas wznawiania komunikatu.',
        'error'
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  // 4. Otwarcie modalu edycji
  const openEditModal = (alert: AlertMapItem) => {
    setEditingAlert(alert);
    setEditContent(alert.content);
    setEditCategory(alert.category);
    setEditLocationName(alert.locationName || '');
    setEditCounty(alert.county || '');
    setEditVoivodeship(alert.voivodeship || '');
    setEditLat(alert.lat !== null && alert.lat !== undefined ? String(alert.lat) : '');
    setEditLng(alert.lng !== null && alert.lng !== undefined ? String(alert.lng) : '');
  };

  // 5. Zapisanie edycji alertu
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAlert || !editContent.trim()) return;

    setIsSavingEdit(true);
    try {
      const payload: any = {
        content: editContent.trim(),
        category: editCategory,
        locationName: editLocationName.trim() || null,
        county: editCounty.trim() || null,
        voivodeship: editVoivodeship.trim() || null,
        lat: editLat ? parseFloat(editLat) : null,
        lng: editLng ? parseFloat(editLng) : null,
      };

      const res = await api.put(`/alerts/${editingAlert.id}`, payload);
      if (res.data.success && res.data.data) {
        setAlerts((prev) =>
          prev.map((a) => (a.id === editingAlert.id ? res.data.data : a))
        );
        showToast('Komunikat został pomyślnie zaktualizowany!');
        setEditingAlert(null);
      }
    } catch (error: any) {
      showToast(
        error.response?.data?.message || 'Wystąpił błąd podczas zapisywania zmian.',
        'error'
      );
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Unikalne organizacje i kategorie do filtrów archiwum
  const availableArchiveOrgs = useMemo(() => {
    const map = new Map<string, string>();
    alerts
      .filter((a) => !a.isActive)
      .forEach((a) => {
        if (a.author?.organization?.name) {
          map.set(a.author.organization.name, a.author.organization.name);
        }
      });
    return Array.from(map.values()).sort();
  }, [alerts]);

  // Aktywne alerty
  const activeAlerts = useMemo(() => {
    return alerts.filter((a) => a.isActive);
  }, [alerts]);

  // Zarchiwizowane alerty z zaawansowanym filtrowaniem i horyzontami czasowymi
  const archivedAlerts = useMemo(() => {
    const rawArchived = alerts.filter((a) => !a.isActive);
    const now = Date.now();
    const oneHour = 3600 * 1000;
    const oneDay = 24 * oneHour;

    return rawArchived
      .filter((alert) => {
        // 1. Filtr horyzontu czasowego (Data utworzenia lub ostatniego zdarzenia)
        const alertTime = new Date(alert.createdAt).getTime();

        if (archiveTimeframe === '24h') {
          if (now - alertTime > oneDay) return false;
        } else if (archiveTimeframe === '48h') {
          if (now - alertTime > 2 * oneDay) return false;
        } else if (archiveTimeframe === '72h') {
          if (now - alertTime > 3 * oneDay) return false;
        } else if (archiveTimeframe === 'tydzien') {
          if (now - alertTime > 7 * oneDay) return false;
        } else if (archiveTimeframe === 'miesiac') {
          if (now - alertTime > 30 * oneDay) return false;
        } else if (archiveTimeframe === 'rok') {
          if (now - alertTime > 365 * oneDay) return false;
        } else if (archiveTimeframe === 'custom') {
          if (customStartDate) {
            const startMs = new Date(customStartDate).getTime();
            if (alertTime < startMs) return false;
          }
          if (customEndDate) {
            const endMs = new Date(customEndDate).getTime() + oneDay;
            if (alertTime > endMs) return false;
          }
        }

        // 2. Filtr kategorii
        if (
          archiveCategoryFilter !== 'all' &&
          alert.category !== archiveCategoryFilter
        ) {
          return false;
        }

        // 3. Filtr organizacji
        if (
          archiveOrgFilter !== 'all' &&
          alert.author?.organization?.name !== archiveOrgFilter
        ) {
          return false;
        }

        // 4. Wyszukiwanie pełnotekstowe po całym tekście na kartce
        if (archiveSearchQuery.trim()) {
          const q = archiveSearchQuery.toLowerCase().trim();
          const matchContent = alert.content.toLowerCase().includes(q);
          const matchCategory = alert.category.toLowerCase().includes(q);
          const matchLocation = alert.locationName?.toLowerCase().includes(q);
          const matchCounty = alert.county?.toLowerCase().includes(q);
          const matchVoivodeship = alert.voivodeship?.toLowerCase().includes(q);
          const matchMunicipality = alert.municipality?.name.toLowerCase().includes(q);
          const matchOrg = alert.author?.organization?.name.toLowerCase().includes(q);
          const matchAuthor = alert.author
            ? `${alert.author.firstName} ${alert.author.lastName}`.toLowerCase().includes(q)
            : false;

          return (
            matchContent ||
            matchCategory ||
            matchLocation ||
            matchCounty ||
            matchVoivodeship ||
            matchMunicipality ||
            matchOrg ||
            matchAuthor
          );
        }

        return true;
      })
      .sort((a, b) => {
        if (archiveSort === 'date-desc') {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        if (archiveSort === 'date-asc') {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }
        if (archiveSort === 'name-asc') {
          const nameA = a.locationName || a.municipality?.name || a.content;
          const nameB = b.locationName || b.municipality?.name || b.content;
          return nameA.localeCompare(nameB, 'pl');
        }
        if (archiveSort === 'name-desc') {
          const nameA = a.locationName || a.municipality?.name || a.content;
          const nameB = b.locationName || b.municipality?.name || b.content;
          return nameB.localeCompare(nameA, 'pl');
        }
        if (archiveSort === 'duration-desc') {
          const durA = calculateAlertDurations(a).totalActiveMs;
          const durB = calculateAlertDurations(b).totalActiveMs;
          return durB - durA;
        }
        if (archiveSort === 'duration-asc') {
          const durA = calculateAlertDurations(a).totalActiveMs;
          const durB = calculateAlertDurations(b).totalActiveMs;
          return durA - durB;
        }
        return 0;
      });
  }, [
    alerts,
    archiveSearchQuery,
    archiveTimeframe,
    customStartDate,
    customEndDate,
    archiveCategoryFilter,
    archiveOrgFilter,
    archiveSort,
  ]);

  const canManageAlert = (alert: AlertMapItem) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (alert.authorId === user.id) return true;
    if (alert.author?.organization?.id && user.organizationId) {
      return alert.author.organization.id === user.organizationId;
    }
    return true;
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

      {/* Modal Historii Alertu */}
      <AlertHistoryModal
        alert={selectedHistoryAlert}
        onClose={() => setSelectedHistoryAlert(null)}
      />

      {/* Nagłówek sekcji */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-brand-400 font-semibold text-xs tracking-wider uppercase mb-1">
            <Radio className="h-4 w-4 text-red-400 animate-pulse" />
            <span>Panel Operacyjny • Zarządzanie, Historia i Archiwum Zdarzeń</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Alerty i Ostrzeżenia Kryzysowe
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Publikuj ostrzeżenia, wznawiaj komunikaty, przeglądaj historię czasową oraz przeszukuj archiwum według zakresów
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

      {/* Interaktywna Mapa Leaflet dla aktywnych alertów */}
      {showMap && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <MapPin className="h-4 w-4 text-red-400" />
              <span>Lokalizacja aktywnych zdarzeń na mapie ({activeAlerts.length})</span>
            </div>
            <span className="text-xs text-slate-400 hidden sm:inline">
              Kliknij pinezkę, aby zobaczyć szczegóły lub odwołać komunikat
            </span>
          </div>

          <AlertsMap
            alerts={activeAlerts}
            height="380px"
            onDeactivate={handleDeactivate}
            canDeactivate={canManageAlert}
            actionLoadingId={actionLoadingId}
          />
        </section>
      )}

      {/* 1. Formularz dodawania alertu z automatycznym Reverse Geocoding */}
      <div className="rounded-3xl bg-slate-800/90 p-6 sm:p-8 shadow-2xl backdrop-blur-xl border border-slate-700/70">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
            <BellRing className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Opublikuj nowy komunikat kryzysowy</h2>
            <p className="text-xs text-slate-400">
              Kliknij punkt na mapie – nazwa miejscowości, powiat i województwo zostaną wykryte automatycznie!
            </p>
          </div>
        </div>

        <form onSubmit={handleCreateAlert} className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Lewa strona: Kategoria, Treść i Wykryta Lokalizacja */}
            <div className="lg:col-span-7 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Kategoria zdarzenia
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl bg-slate-900/90 border border-slate-700 py-2.5 px-3.5 text-white text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition"
                >
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt} value={opt} className="bg-slate-900 text-white">
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Treść komunikatu
                </label>
                <textarea
                  required
                  rows={3}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Wprowadź szczegółowe informacje operacyjne (zalecenia dla mieszkańców, wyznaczone objazdy, punkty pomocy)..."
                  className="w-full rounded-xl bg-slate-900/90 border border-slate-700 p-3 text-white placeholder-slate-500 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition resize-none"
                ></textarea>
              </div>

              {/* Pola administracyjne (Miejscowość, Powiat, Województwo) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Miasto / Wieś / Dzielnica
                  </label>
                  <input
                    type="text"
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                    placeholder="np. Warszawa, Kłodzko"
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 py-2 px-3 text-xs text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Powiat
                  </label>
                  <input
                    type="text"
                    value={county}
                    onChange={(e) => setCounty(e.target.value)}
                    placeholder="np. powiat kłodzki"
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 py-2 px-3 text-xs text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Województwo
                  </label>
                  <input
                    type="text"
                    value={voivodeship}
                    onChange={(e) => setVoivodeship(e.target.value)}
                    placeholder="np. dolnośląskie, mazowieckie"
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 py-2 px-3 text-xs text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Szerokość geograficzna (Lat)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    placeholder="np. 50.4380"
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 py-1.5 px-3 text-xs text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Długość geograficzna (Lng)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    placeholder="np. 16.6548"
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 py-1.5 px-3 text-xs text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Prawa strona: Interaktywny Wybór Punktu na Mapie */}
            <div className="lg:col-span-5 space-y-3 flex flex-col justify-between">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-brand-400" />
                  <span>Wskaż punkt zdarzenia (kliknij na mapie)</span>
                </label>
                <LocationPickerMap
                  lat={lat ? parseFloat(lat) : null}
                  lng={lng ? parseFloat(lng) : null}
                  height="220px"
                  onChange={(newLat, newLng, details?: LocationDetails) => {
                    setLat(String(newLat));
                    setLng(String(newLng));
                    if (details) {
                      if (details.locationName) setLocationName(details.locationName);
                      if (details.county) setCounty(details.county);
                      if (details.voivodeship) setVoivodeship(details.voivodeship);
                    }
                  }}
                />
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={isSubmitting || !content.trim()}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-teal-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-brand-500/25 hover:from-brand-500 hover:to-teal-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 disabled:opacity-50 transition transform active:scale-95"
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
            </div>
          </div>
        </form>
      </div>

      {/* ========================================================================= */}
      {/* 2. SEKCJA AKTYWNYCH KOMUNIKATÓW                                         */}
      {/* ========================================================================= */}
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
            Na żywo na tablicy
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
            {activeAlerts.map((alert) => {
              const { totalActiveMs } = calculateAlertDurations(alert);

              return (
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

                      {/* Badge lokalizacji */}
                      <span className="flex items-center gap-1 text-xs text-slate-200 bg-slate-900/90 px-3 py-1 rounded-xl border border-slate-700 font-medium">
                        <MapPin className="h-3.5 w-3.5 text-brand-400 shrink-0" />
                        <span>
                          {alert.locationName ? (
                            <>
                              <strong>{alert.locationName}</strong>
                              {alert.voivodeship && (
                                <span className="text-slate-400 text-[11px] ml-1">
                                  (woj. {alert.voivodeship})
                                </span>
                              )}
                            </>
                          ) : (
                            alert.municipality?.name || 'Lokalizacja'
                          )}
                        </span>
                      </span>
                    </div>

                    <p className="text-base text-slate-100 font-semibold leading-relaxed">
                      {alert.content}
                    </p>

                    {/* Informacje czasowe i organizacja */}
                    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-slate-400 pt-2 border-t border-slate-700/50">
                      <div className="flex items-center gap-1">
                        <Building className="h-3.5 w-3.5 text-slate-500" />
                        <span>{alert.author?.organization?.name || 'Organizacja'}</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-brand-300 font-mono font-semibold">
                        <Clock className="h-3.5 w-3.5 text-brand-400" />
                        <span>Czas trwania: {formatDuration(totalActiveMs)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Przyciski Akcji dla Aktywnego Alertu */}
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setSelectedHistoryAlert(alert)}
                      className="flex items-center gap-1 px-3 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-750 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition"
                      title="Pokaż historię i oś czasu"
                    >
                      <History className="h-3.5 w-3.5 text-brand-400" />
                      <span className="hidden sm:inline">Historia</span>
                    </button>

                    {canManageAlert(alert) && (
                      <>
                        <button
                          type="button"
                          onClick={() => openEditModal(alert)}
                          className="flex items-center gap-1 px-3 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold transition shrink-0"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          <span>Edytuj</span>
                        </button>

                        <button
                          onClick={() => handleDeactivate(alert.id)}
                          disabled={actionLoadingId === alert.id}
                          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold text-xs py-2.5 px-3 shadow-lg shadow-red-600/30 border border-red-400/30 tracking-wider uppercase transition transform active:scale-[0.98] disabled:opacity-50"
                        >
                          {actionLoadingId === alert.id ? (
                            <>
                              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                              <span>Odwoływanie...</span>
                            </>
                          ) : (
                            <>
                              <Ban className="h-3.5 w-3.5" />
                              <span>ODWOŁAJ</span>
                            </>
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* 3. SEKCJA ZARCHIWIZOWANYCH KOMUNIKATÓW Z PEŁNYM WYSZUKIWANIEM I HISTORIĄ */}
      {/* ========================================================================= */}
      <section className="space-y-6 pt-6 border-t border-slate-800">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5 text-slate-400">
            <Archive className="h-5 w-5 text-slate-400" />
            <h2 className="text-xl font-bold text-white tracking-tight">
              Archiwum Komunikatów i Raporty Historyczne ({archivedAlerts.length})
            </h2>
          </div>
          <span className="text-xs text-slate-400 bg-slate-900/80 px-3 py-1 rounded-full border border-slate-700">
            Wyszukiwanie i Oś Czasu
          </span>
        </div>

        {/* Panel Zaawansowanych Filtrów Archiwum */}
        <div className="rounded-3xl bg-slate-800/90 p-5 sm:p-6 border border-slate-700/80 shadow-xl space-y-4">
          {/* 1. Horyzonty Czasowe (24h, 48h, 72h, Tydzień, Miesiąc, Rok, Własny zakres) */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-teal-400" />
              <span>Zakres Czasowy Archiwum:</span>
            </label>

            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { key: '24h', label: 'Ostatnie 24h' },
                { key: '48h', label: '48h' },
                { key: '72h', label: '72h' },
                { key: 'tydzien', label: 'Tydzień' },
                { key: 'miesiac', label: 'Miesiąc' },
                { key: 'rok', label: 'Rok' },
                { key: 'wszystkie', label: 'Wszystkie' },
                { key: 'custom', label: '📅 Własny zakres' },
              ].map((tf) => (
                <button
                  key={tf.key}
                  type="button"
                  onClick={() => setArchiveTimeframe(tf.key as ArchiveTimeframe)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    archiveTimeframe === tf.key
                      ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30 ring-1 ring-brand-400'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-700/80'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>

            {/* Własny zakres dat */}
            {archiveTimeframe === 'custom' && (
              <div className="flex items-center gap-3 pt-2 flex-wrap animate-fade-in text-xs bg-slate-900/80 p-3 rounded-xl border border-slate-700">
                <span className="text-slate-400 font-semibold">Od:</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="rounded-lg bg-slate-850 border border-slate-700 py-1 px-2.5 text-white"
                />
                <span className="text-slate-400 font-semibold">Do:</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="rounded-lg bg-slate-850 border border-slate-700 py-1 px-2.5 text-white"
                />
              </div>
            )}
          </div>

          {/* 2. Wyszukiwanie po całym tekście na kartce oraz selektory */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2 border-t border-slate-700/60">
            {/* Wyszukiwarka po całej treści/kartce */}
            <div className="md:col-span-5 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={archiveSearchQuery}
                onChange={(e) => setArchiveSearchQuery(e.target.value)}
                placeholder="Szukaj w archiwum po treści, miejscu, autorze, organizacji..."
                className="w-full rounded-xl bg-slate-900 border border-slate-700 py-2.5 pl-10 pr-10 text-xs text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none"
              />
              {archiveSearchQuery && (
                <button
                  onClick={() => setArchiveSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Filtr Kategorii */}
            <div className="md:col-span-2">
              <select
                value={archiveCategoryFilter}
                onChange={(e) => setArchiveCategoryFilter(e.target.value)}
                className="w-full rounded-xl bg-slate-900 border border-slate-700 py-2.5 px-3 text-xs text-white focus:border-brand-500 focus:outline-none"
              >
                <option value="all">Wszystkie typy</option>
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtr Organizacji */}
            <div className="md:col-span-2">
              <select
                value={archiveOrgFilter}
                onChange={(e) => setArchiveOrgFilter(e.target.value)}
                className="w-full rounded-xl bg-slate-900 border border-slate-700 py-2.5 px-3 text-xs text-white focus:border-brand-500 focus:outline-none"
              >
                <option value="all">Wszystkie organizacje</option>
                {availableArchiveOrgs.map((org) => (
                  <option key={org} value={org}>
                    {org}
                  </option>
                ))}
              </select>
            </div>

            {/* Sortowanie */}
            <div className="md:col-span-3">
              <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5">
                <ArrowUpDown className="h-3.5 w-3.5 text-brand-400 shrink-0" />
                <select
                  value={archiveSort}
                  onChange={(e) => setArchiveSort(e.target.value as ArchiveSortOption)}
                  className="bg-transparent text-xs text-white focus:outline-none w-full font-semibold"
                >
                  <option value="date-desc" className="bg-slate-900">Data: Od najnowszych</option>
                  <option value="date-asc" className="bg-slate-900">Data: Od najstarszych</option>
                  <option value="name-asc" className="bg-slate-900">Lokalizacja / Treść: A-Z</option>
                  <option value="name-desc" className="bg-slate-900">Lokalizacja / Treść: Z-A</option>
                  <option value="duration-desc" className="bg-slate-900">Czas trwania: Od najdłuższego</option>
                  <option value="duration-asc" className="bg-slate-900">Czas trwania: Od najkrótszego</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Lista Zarchiwizowanych Alertów */}
        {archivedAlerts.length === 0 ? (
          <div className="rounded-3xl bg-slate-800/30 p-10 text-center border border-slate-800 space-y-2">
            <Archive className="h-8 w-8 text-slate-600 mx-auto" />
            <p className="text-sm text-slate-300 font-medium">Brak zarchiwizowanych komunikatów w wybranym przedziale</p>
            <p className="text-xs text-slate-500">Zmień zakres czasu (np. Tydzień, Miesiąc, Wszystkie) lub zresetuj filtry wyszukiwania.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {archivedAlerts.map((alert) => {
              const { totalActiveMs, firstEventDate, lastEventDate, totalEventsCount } =
                calculateAlertDurations(alert);

              return (
                <div
                  key={alert.id}
                  className="rounded-3xl bg-slate-850/80 p-6 border border-slate-750 hover:border-slate-600 transition space-y-4 flex flex-col justify-between shadow-lg backdrop-blur-md"
                >
                  <div className="space-y-3">
                    {/* Belka górna: Kategoria i Status */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-xl bg-slate-900 border border-slate-700/80 px-2.5 py-1 text-xs text-slate-300 font-bold uppercase tracking-wider">
                        {alert.category}
                      </span>
                      <span className="text-[11px] text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-0.5 rounded-lg border border-emerald-500/20 flex items-center gap-1">
                        <span>✓ Zarchiwizowany</span>
                      </span>
                    </div>

                    {/* Treść */}
                    <p className="text-sm sm:text-base text-slate-200 font-medium leading-relaxed">
                      {alert.content}
                    </p>

                    {/* Dane geolokalizacyjne i organizacja */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                      <span className="flex items-center gap-1 bg-slate-900/90 px-2.5 py-1 rounded-lg border border-slate-700">
                        <MapPin className="h-3.5 w-3.5 text-brand-400" />
                        <span>
                          <strong>{alert.locationName || alert.municipality?.name || 'Gmina'}</strong>
                          {alert.voivodeship && ` (woj. ${alert.voivodeship})`}
                        </span>
                      </span>
                      <span className="flex items-center gap-1 bg-slate-900/90 px-2.5 py-1 rounded-lg border border-slate-700 text-slate-400">
                        <Building className="h-3.5 w-3.5 text-slate-500" />
                        <span>{alert.author?.organization?.name || 'Organizacja'}</span>
                      </span>
                    </div>

                    {/* Kafelki metryk czasowych cyklu życia */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-xs font-mono">
                      <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-750 space-y-0.5">
                        <span className="text-[10px] text-slate-400 font-sans block">Łączny czas aktywności:</span>
                        <span className="text-xs font-extrabold text-brand-400">
                          {formatDuration(totalActiveMs)}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-750 space-y-0.5">
                        <span className="text-[10px] text-slate-400 font-sans block">Okres zdarzenia:</span>
                        <span className="text-[11px] font-bold text-slate-300">
                          {new Date(firstEventDate).toLocaleDateString('pl-PL')} ➔{' '}
                          {new Date(lastEventDate).toLocaleDateString('pl-PL')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Przyciski: HISTORIA, EDYTUJ i WZNÓW KOMUNIKAT */}
                  <div className="flex items-center gap-2 pt-3 border-t border-slate-800">
                    <button
                      type="button"
                      onClick={() => setSelectedHistoryAlert(alert)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-750 text-slate-300 hover:text-white text-xs font-bold border border-slate-700 transition"
                      title="Zobacz pełną oś czasu i cykle wznowień"
                    >
                      <History className="h-3.5 w-3.5 text-brand-400" />
                      <span>Historia ({totalEventsCount})</span>
                    </button>

                    {canManageAlert(alert) && (
                      <>
                        <button
                          type="button"
                          onClick={() => openEditModal(alert)}
                          className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          <span>Edytuj</span>
                        </button>

                        <button
                          onClick={() => handleReactivate(alert.id)}
                          disabled={actionLoadingId === alert.id}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs py-2 px-3 shadow-md shadow-emerald-600/20 transition transform active:scale-95 disabled:opacity-50"
                        >
                          {actionLoadingId === alert.id ? (
                            <>
                              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                              <span>Wznawianie...</span>
                            </>
                          ) : (
                            <>
                              <RotateCcw className="h-3.5 w-3.5" />
                              <span>WZNÓW KOMUNIKAT</span>
                            </>
                          )}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* MODAL EDYCJI ALERTU Z MAPĄ I GEOLOKALIZACJĄ                               */}
      {/* ========================================================================= */}
      {editingAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-xl rounded-3xl bg-slate-850 p-6 sm:p-8 shadow-2xl border border-slate-700 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-700 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
                  <Pencil className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Edytuj Komunikat Kryzysowy</h3>
                  <p className="text-xs text-slate-400">
                    Zaktualizuj treść, kategorię lub przesuń punkt zdarzenia na mapie
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingAlert(null)}
                className="rounded-xl p-2 text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Kategoria
                </label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 py-2 px-3 text-white text-xs focus:border-brand-500 focus:outline-none"
                >
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Treść komunikatu
                </label>
                <textarea
                  required
                  rows={3}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full rounded-xl bg-slate-900 border border-slate-700 p-3 text-white text-xs focus:border-brand-500 focus:outline-none resize-none"
                ></textarea>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                    Miasto / Wieś
                  </label>
                  <input
                    type="text"
                    value={editLocationName}
                    onChange={(e) => setEditLocationName(e.target.value)}
                    placeholder="np. Warszawa"
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 py-1.5 px-2.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                    Powiat
                  </label>
                  <input
                    type="text"
                    value={editCounty}
                    onChange={(e) => setEditCounty(e.target.value)}
                    placeholder="np. kłodzki"
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 py-1.5 px-2.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                    Województwo
                  </label>
                  <input
                    type="text"
                    value={editVoivodeship}
                    onChange={(e) => setEditVoivodeship(e.target.value)}
                    placeholder="np. mazowieckie"
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 py-1.5 px-2.5 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-brand-400" />
                  <span>Zmień lokalizację punktu na mapie</span>
                </label>
                <LocationPickerMap
                  lat={editLat ? parseFloat(editLat) : null}
                  lng={editLng ? parseFloat(editLng) : null}
                  height="160px"
                  onChange={(newLat, newLng, details?: LocationDetails) => {
                    setEditLat(String(newLat));
                    setEditLng(String(newLng));
                    if (details) {
                      if (details.locationName) setEditLocationName(details.locationName);
                      if (details.county) setEditCounty(details.county);
                      if (details.voivodeship) setEditVoivodeship(details.voivodeship);
                    }
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Lat</label>
                  <input
                    type="number"
                    step="any"
                    value={editLat}
                    onChange={(e) => setEditLat(e.target.value)}
                    placeholder="np. 50.4380"
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 py-1.5 px-3 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Lng</label>
                  <input
                    type="number"
                    step="any"
                    value={editLng}
                    onChange={(e) => setEditLng(e.target.value)}
                    placeholder="np. 16.6548"
                    className="w-full rounded-xl bg-slate-900 border border-slate-700 py-1.5 px-3 text-xs text-white"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setEditingAlert(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit || !editContent.trim()}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-teal-500 hover:from-brand-500 hover:to-teal-400 text-white text-xs font-bold shadow-lg shadow-brand-500/25 transition disabled:opacity-50"
                >
                  {isSavingEdit ? (
                    <>
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      <span>Zapisywanie...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-3.5 w-3.5" />
                      <span>Zapisz zmiany</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
