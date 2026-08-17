import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { AlertsMap, AlertMapItem } from '../components/AlertsMap';
import { LocationPickerMap, LocationDetails } from '../components/LocationPickerMap';
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
  Compass,
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

  // Wyszukiwarka i filtry wielopoziomowe (Województwo, Powiat, Gmina, Miejscowość, Treść)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

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

  // 1. Obsługa dodawania nowego alertu z danymi geolokalizacyjnymi
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
      if (res.data.success) {
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

  // 3. Ponowne alertowanie (Reaktywacja alertu)
  const handleReactivate = async (alertId: string) => {
    const previousAlerts = [...alerts];

    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, isActive: true } : a))
    );
    setActionLoadingId(alertId);

    try {
      const res = await api.patch(`/alerts/${alertId}/reactivate`);
      if (res.data.success) {
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

  // 5. Zapisanie edycji alertu (PUT /api/alerts/:id)
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

  // 6. Różnopoziomowe filtrowanie (Województwo -> Powiat -> Gmina -> Miejscowość -> Treść)
  const filteredAlerts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return alerts.filter((alert) => {
      // Filtr kategorii
      if (selectedCategoryFilter !== 'all' && alert.category !== selectedCategoryFilter) {
        return false;
      }

      // Wyszukiwanie wielopoziomowe
      if (!q) return true;

      const matchContent = alert.content.toLowerCase().includes(q);
      const matchCategory = alert.category.toLowerCase().includes(q);
      const matchMunicipality = alert.municipality?.name.toLowerCase().includes(q);
      const matchLocation = alert.locationName?.toLowerCase().includes(q);
      const matchCounty = alert.county?.toLowerCase().includes(q);
      const matchVoivodeship = alert.voivodeship?.toLowerCase().includes(q);
      const matchOrg = alert.author?.organization?.name.toLowerCase().includes(q);

      return (
        matchContent ||
        matchCategory ||
        matchMunicipality ||
        matchLocation ||
        matchCounty ||
        matchVoivodeship ||
        matchOrg
      );
    });
  }, [alerts, searchQuery, selectedCategoryFilter]);

  // Podział na aktywne i zarchiwizowane
  const activeAlerts = filteredAlerts.filter((a) => a.isActive);
  const archivedAlerts = filteredAlerts.filter((a) => !a.isActive);

  const canManageAlert = (alert: AlertMapItem) => {
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
            <span>Panel Operacyjny • Zarządzanie, Wznawianie i Geolokalizacja</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Alerty i Ostrzeżenia Kryzysowe
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Wskazuj punkty na mapie (z auto-wykrywaniem miejscowości), edytuj, wznawiaj i przeszukuj po województwach, powiatach i miastach
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

      {/* Interaktywna Mapa Leaflet */}
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
                      if (details.locationName) {
                        setLocationName(details.locationName);
                      }
                      if (details.county) {
                        setCounty(details.county);
                      }
                      if (details.voivodeship) {
                        setVoivodeship(details.voivodeship);
                      }
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
      {/* 2. PASEK RÓŻNOPOZIOMOWEGO WYSZUKIWANIA I FILTROWANIA                    */}
      {/* ========================================================================= */}
      <div className="rounded-2xl bg-slate-800/80 p-4 border border-slate-700/80 shadow-lg space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Wyszukiwarka tekstowa (Województwo, Powiat, Gmina, Miasto) */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Wpisz województwo, powiat, gminę, miasto lub treść (np. dolnośląskie, Warszawa, Kłodzko)..."
              className="w-full rounded-xl bg-slate-900/90 border border-slate-700 py-2.5 pl-10 pr-10 text-xs text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Szybkie filtry kategorii */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setSelectedCategoryFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                selectedCategoryFilter === 'all'
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-700'
              }`}
            >
              Wszystkie ({alerts.length})
            </button>
            {CATEGORY_OPTIONS.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategoryFilter(cat)}
                className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition truncate max-w-[130px] ${
                  selectedCategoryFilter === cat
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-700'
                }`}
              >
                {cat.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        {searchQuery && (
          <div className="text-xs text-brand-300 flex items-center gap-1.5 pt-1">
            <Compass className="h-3.5 w-3.5 text-teal-400" />
            <span>
              Wyniki wyszukiwania dla „<strong>{searchQuery}</strong>”: Znaleziono{' '}
              <strong>{filteredAlerts.length}</strong> komunikatów
            </span>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. LISTA ALERTÓW: AKTYWNE I ZARCHIWIZOWANE                               */}
      {/* ========================================================================= */}
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
              Na żywo na mapie
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
              <p className="text-slate-300 font-medium">Brak aktywnych ostrzeżeń spełniających kryteria</p>
              <p className="text-xs text-slate-500 mt-1">Zmień frazę wyszukiwania lub opublikuj nowy alert.</p>
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

                      {/* Rozbudowany badge lokalizacji (Miasto / Gmina / Powiat / Województwo) */}
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

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400 pt-2 border-t border-slate-700/50">
                      <div className="flex items-center gap-1">
                        <Building className="h-3.5 w-3.5 text-slate-500" />
                        <span>{alert.author?.organization?.name || 'Organizacja'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5 text-slate-500" />
                        <time>{formatDate(alert.createdAt)}</time>
                      </div>
                      {alert.county && (
                        <div className="text-[11px] text-slate-500">
                          {alert.county}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Przyciski Akcji dla Aktywnego Alertu: Edytuj i ODWOŁAJ */}
                  {canManageAlert(alert) && (
                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(alert)}
                        className="flex items-center justify-center gap-1.5 px-4 py-3 rounded-2xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold transition shrink-0"
                      >
                        <Pencil className="h-4 w-4" />
                        <span>Edytuj</span>
                      </button>

                      <button
                        onClick={() => handleDeactivate(alert.id)}
                        disabled={actionLoadingId === alert.id}
                        className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold text-sm py-3 px-4 shadow-lg shadow-red-600/30 hover:shadow-red-600/50 border border-red-400/30 tracking-wider uppercase transition transform active:scale-[0.98] disabled:opacity-50"
                      >
                        {actionLoadingId === alert.id ? (
                          <>
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                            <span>Odwoływanie...</span>
                          </>
                        ) : (
                          <>
                            <Ban className="h-4 w-4" />
                            <span>ODWOŁAJ KOMUNIKAT</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* SEKCJA: Zarchiwizowane Komunikaty z opcją WZNOWIENIA i EDYCJI */}
        <section className="space-y-4 pt-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2.5 text-slate-400">
              <Archive className="h-5 w-5 text-slate-500" />
              <h2 className="text-xl font-bold text-slate-300 tracking-tight">
                Zarchiwizowane ({archivedAlerts.length})
              </h2>
            </div>
            <span className="text-xs text-slate-400 bg-slate-900/60 px-3 py-1 rounded-full border border-slate-700/50">
              Historia
            </span>
          </div>

          {archivedAlerts.length === 0 ? (
            <div className="rounded-2xl bg-slate-800/20 p-6 text-center border border-slate-800 text-xs text-slate-500">
              Brak zarchiwizowanych alertów spełniających kryteria.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {archivedAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="rounded-2xl bg-slate-850/50 p-5 border border-slate-800 opacity-80 hover:opacity-100 transition space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="rounded-lg bg-slate-800 px-2.5 py-1 text-xs text-slate-400 font-medium">
                        {alert.category}
                      </span>
                      <span className="text-[11px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        ✓ Zarchiwizowany
                      </span>
                    </div>

                    <p className="text-sm text-slate-300 leading-snug">{alert.content}</p>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
                      <span>
                        {alert.locationName || alert.municipality?.name} •{' '}
                        {alert.author?.organization?.name || 'Organizacja'}
                      </span>
                      <time>{formatDate(alert.createdAt)}</time>
                    </div>
                  </div>

                  {/* Przyciski: WZNÓW KOMUNIKAT oraz Edytuj */}
                  {canManageAlert(alert) && (
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-800/60">
                      <button
                        type="button"
                        onClick={() => openEditModal(alert)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
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
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

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
