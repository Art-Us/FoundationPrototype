import React, { useState, useEffect, useMemo, useRef } from 'react';
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

type AlertTimeframe = '24h' | '48h' | '72h' | 'tydzien' | 'miesiac' | 'rok' | 'wszystkie' | 'custom';
type AlertSortOption = 'date-desc' | 'date-asc' | 'name-asc' | 'name-desc' | 'duration-desc' | 'duration-asc';
type ArchiveTimeframe = AlertTimeframe;
type ArchiveSortOption = AlertSortOption;

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

  // Stan fokusu na konkretnym alercie na mapie
  const [focusedAlertId, setFocusedAlertId] = useState<string | null>(null);
  const [focusKey, setFocusKey] = useState<number>(0);
  const mapSectionRef = useRef<HTMLDivElement>(null);

  const handleFocusOnMap = (alert: AlertMapItem) => {
    setShowMap(true);
    setFocusedAlertId(alert.id);
    setFocusKey((k) => k + 1);
    setTimeout(() => {
      mapSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 80);
  };

  // Filtry, wyszukiwanie i sortowanie dla AKTYWNYCH komunikatów
  const [activeSearchQuery, setActiveSearchQuery] = useState('');
  const [activeTimeframe, setActiveTimeframe] = useState<AlertTimeframe>('wszystkie');
  const [activeCustomStartDate, setActiveCustomStartDate] = useState('');
  const [activeCustomEndDate, setActiveCustomEndDate] = useState('');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');
  const [activeOrgFilter, setActiveOrgFilter] = useState<string>('all');
  const [activeSort, setActiveSort] = useState<AlertSortOption>('date-desc');

  // Filtry, wyszukiwanie i sortowanie dla ARCHIWUM komunikatów
  const [archiveSearchQuery, setArchiveSearchQuery] = useState('');
  const [archiveTimeframe, setArchiveTimeframe] = useState<AlertTimeframe>('24h');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [archiveCategoryFilter, setArchiveCategoryFilter] = useState<string>('all');
  const [archiveOrgFilter, setArchiveOrgFilter] = useState<string>('all');
  const [archiveSort, setArchiveSort] = useState<AlertSortOption>('date-desc');

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
        showToast('Alert został pomyślnie opublikowany!');
      }
    } catch (error: any) {
      console.error('Błąd dodawania alertu:', error);
      showToast(
        error.response?.data?.message || 'Nie udało się opublikować alertu.',
        'error'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Obsługa odwołania alertu (dezaktywacja)
  const handleDeactivate = async (alertId: string) => {
    setActionLoadingId(alertId);
    try {
      const res = await api.patch(`/alerts/${alertId}/deactivate`, {
        details: 'Odwołanie komunikatu z poziomu panelu operacyjnego',
      });
      if (res.data.success && res.data.data) {
        setAlerts((prev) =>
          prev.map((a) => (a.id === alertId ? res.data.data : a))
        );
        showToast('Alert został pomyślnie odwołany i przeniesiony do archiwum.');
      }
    } catch (error: any) {
      console.error('Błąd dezaktywacji alertu:', error);
      showToast(
        error.response?.data?.message || 'Nie udało się odwołać alertu.',
        'error'
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  // 3. Obsługa wznowienia alertu (reaktywacja)
  const handleReactivate = async (alertId: string) => {
    setActionLoadingId(alertId);
    try {
      const res = await api.patch(`/alerts/${alertId}/reactivate`, {
        details: 'Wznowienie komunikatu z archiwum',
      });
      if (res.data.success && res.data.data) {
        setAlerts((prev) =>
          prev.map((a) => (a.id === alertId ? res.data.data : a))
        );
        showToast('Komunikat został wznowiony i powrócił na tablicę aktywną!');
      }
    } catch (error: any) {
      console.error('Błąd reaktywacji alertu:', error);
      showToast(
        error.response?.data?.message || 'Nie udało się wznowić alertu.',
        'error'
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  // 4. Obsługa otwierania modalu edycji
  const openEditModal = (alert: AlertMapItem) => {
    setEditingAlert(alert);
    setEditContent(alert.content);
    setEditCategory(alert.category);
    setEditLocationName(alert.locationName || '');
    setEditCounty(alert.county || '');
    setEditVoivodeship(alert.voivodeship || '');
    setEditLat(alert.lat !== undefined && alert.lat !== null ? alert.lat.toString() : '');
    setEditLng(alert.lng !== undefined && alert.lng !== null ? alert.lng.toString() : '');
  };

  // 5. Zapisywanie edycji alertu
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

  // Unikalne organizacje do filtrów aktywnych
  const availableActiveOrgs = useMemo(() => {
    const map = new Map<string, string>();
    alerts
      .filter((a) => a.isActive)
      .forEach((a) => {
        if (a.author?.organization?.name) {
          map.set(a.author.organization.name, a.author.organization.name);
        }
      });
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b, 'pl'));
  }, [alerts]);

  // Unikalne organizacje do filtrów archiwum
  const availableArchiveOrgs = useMemo(() => {
    const map = new Map<string, string>();
    alerts
      .filter((a) => !a.isActive)
      .forEach((a) => {
        if (a.author?.organization?.name) {
          map.set(a.author.organization.name, a.author.organization.name);
        }
      });
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b, 'pl'));
  }, [alerts]);

  // Aktywne alerty z oddzielnym filtrowaniem, wyszukiwaniem i sortowaniem
  const activeAlerts = useMemo(() => {
    const rawActive = alerts.filter((a) => a.isActive);
    const now = Date.now();
    const oneHour = 3600 * 1000;
    const oneDay = 24 * oneHour;

    return rawActive
      .filter((alert) => {
        const alertTime = new Date(alert.createdAt).getTime();

        if (activeTimeframe === '24h') {
          if (now - alertTime > oneDay) return false;
        } else if (activeTimeframe === '48h') {
          if (now - alertTime > 2 * oneDay) return false;
        } else if (activeTimeframe === '72h') {
          if (now - alertTime > 3 * oneDay) return false;
        } else if (activeTimeframe === 'tydzien') {
          if (now - alertTime > 7 * oneDay) return false;
        } else if (activeTimeframe === 'miesiac') {
          if (now - alertTime > 30 * oneDay) return false;
        } else if (activeTimeframe === 'rok') {
          if (now - alertTime > 365 * oneDay) return false;
        } else if (activeTimeframe === 'custom') {
          if (activeCustomStartDate) {
            const startMs = new Date(activeCustomStartDate).getTime();
            if (alertTime < startMs) return false;
          }
          if (activeCustomEndDate) {
            const endMs = new Date(activeCustomEndDate).getTime() + oneDay;
            if (alertTime > endMs) return false;
          }
        }

        if (
          activeCategoryFilter !== 'all' &&
          alert.category !== activeCategoryFilter
        ) {
          return false;
        }

        if (
          activeOrgFilter !== 'all' &&
          alert.author?.organization?.name !== activeOrgFilter
        ) {
          return false;
        }

        if (activeSearchQuery.trim()) {
          const q = activeSearchQuery.toLowerCase().trim();
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
        if (activeSort === 'date-desc') {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        if (activeSort === 'date-asc') {
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        }
        if (activeSort === 'name-asc') {
          const nameA = a.locationName || a.municipality?.name || a.content;
          const nameB = b.locationName || b.municipality?.name || b.content;
          return nameA.localeCompare(nameB, 'pl');
        }
        if (activeSort === 'name-desc') {
          const nameA = a.locationName || a.municipality?.name || a.content;
          const nameB = b.locationName || b.municipality?.name || b.content;
          return nameB.localeCompare(nameA, 'pl');
        }
        if (activeSort === 'duration-desc') {
          const durA = calculateAlertDurations(a).totalActiveMs;
          const durB = calculateAlertDurations(b).totalActiveMs;
          return durB - durA;
        }
        if (activeSort === 'duration-asc') {
          const durA = calculateAlertDurations(a).totalActiveMs;
          const durB = calculateAlertDurations(b).totalActiveMs;
          return durA - durB;
        }
        return 0;
      });
  }, [
    alerts,
    activeSearchQuery,
    activeTimeframe,
    activeCustomStartDate,
    activeCustomEndDate,
    activeCategoryFilter,
    activeOrgFilter,
    activeSort,
  ]);

  // Zarchiwizowane alerty z filtrowaniem czasowym
  const archivedAlerts = useMemo(() => {
    const rawArchived = alerts.filter((a) => !a.isActive);
    const now = Date.now();
    const oneHour = 3600 * 1000;
    const oneDay = 24 * oneHour;

    return rawArchived
      .filter((alert) => {
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

        if (
          archiveCategoryFilter !== 'all' &&
          alert.category !== archiveCategoryFilter
        ) {
          return false;
        }

        if (
          archiveOrgFilter !== 'all' &&
          alert.author?.organization?.name !== archiveOrgFilter
        ) {
          return false;
        }

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
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce-short">
          <div
            className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl backdrop-blur-xl border text-sm font-semibold text-white ${
              toast.type === 'success'
                ? 'bg-emerald-600 border-emerald-500 shadow-emerald-600/30'
                : 'bg-red-600 border-red-500 shadow-red-600/30'
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
          <div className="flex items-center gap-2 text-indigo-600 font-semibold text-xs tracking-wider uppercase mb-1">
            <Radio className="h-4 w-4 text-red-500 animate-pulse" />
            <span>Panel Operacyjny • Zarządzanie, Historia i Archiwum Zdarzeń</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Alerty i Ostrzeżenia Kryzysowe
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Wskazuj punkty na mapie (z auto-wykrywaniem miejscowości), wznawiaj komunikaty, przeglądaj oś czasu i filtruj archiwum
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowMap(!showMap)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold border transition shadow-xs ${
              showMap
                ? 'bg-indigo-600 border-indigo-600 text-white'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <MapIcon className="h-4 w-4" />
            <span>{showMap ? 'Ukryj Mapę' : 'Pokaż Mapę'}</span>
          </button>

          <button
            onClick={fetchAlerts}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 shadow-xs transition"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Odśwież</span>
          </button>
        </div>
      </div>

      {/* Interaktywna Mapa Leaflet */}
      {showMap && (
        <section
          ref={mapSectionRef}
          className="rounded-3xl bg-white p-5 border border-slate-200/80 shadow-xs space-y-3 scroll-mt-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <MapPin className="h-4 w-4 text-red-500" />
              <span>Lokalizacja aktywnych zdarzeń na mapie ({activeAlerts.length})</span>
            </div>
            <span className="text-xs text-slate-400 hidden sm:inline">
              Kliknij pinezkę lub „Pokaż na mapie” na karcie, aby zobaczyć szczegóły
            </span>
          </div>

          <AlertsMap
            alerts={activeAlerts}
            height="380px"
            onDeactivate={handleDeactivate}
            canDeactivate={canManageAlert}
            actionLoadingId={actionLoadingId}
            focusedAlertId={focusedAlertId}
            focusKey={focusKey}
          />
        </section>
      )}

      {/* 1. Formularz dodawania alertu */}
      <div className="rounded-3xl bg-white p-6 sm:p-8 shadow-xs border border-slate-200/80">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
            <BellRing className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Opublikuj nowy komunikat kryzysowy</h2>
            <p className="text-xs text-slate-500">
              Kliknij punkt na mapie – nazwa miejscowości, powiat i województwo zostaną wykryte automatycznie!
            </p>
          </div>
        </div>

        <form onSubmit={handleCreateAlert} className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Lewa strona: Kategoria, Treść i Wykryta Lokalizacja */}
            <div className="lg:col-span-7 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Kategoria zdarzenia
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 border border-slate-200 py-2.5 px-3.5 text-slate-900 text-xs sm:text-sm font-medium focus:bg-white focus:border-indigo-500 focus:outline-none transition"
                >
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Treść komunikatu
                </label>
                <textarea
                  required
                  rows={3}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Wprowadź szczegółowe informacje operacyjne (zalecenia dla mieszkańców, wyznaczone objazdy, punkty pomocy)..."
                  className="w-full rounded-xl bg-slate-50 border border-slate-200 p-3 text-slate-900 placeholder-slate-400 text-xs sm:text-sm focus:bg-white focus:border-indigo-500 focus:outline-none transition resize-none"
                ></textarea>
              </div>

              {/* Pola administracyjne */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Miasto / Wieś / Dzielnica
                  </label>
                  <input
                    type="text"
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                    placeholder="np. Warszawa, Kłodzko"
                    className="w-full rounded-xl bg-slate-50 border border-slate-200 py-2 px-3 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Powiat
                  </label>
                  <input
                    type="text"
                    value={county}
                    onChange={(e) => setCounty(e.target.value)}
                    placeholder="np. powiat kłodzki"
                    className="w-full rounded-xl bg-slate-50 border border-slate-200 py-2 px-3 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Województwo
                  </label>
                  <input
                    type="text"
                    value={voivodeship}
                    onChange={(e) => setVoivodeship(e.target.value)}
                    placeholder="np. dolnośląskie, mazowieckie"
                    className="w-full rounded-xl bg-slate-50 border border-slate-200 py-2 px-3 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Szerokość geograficzna (Lat)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    placeholder="np. 50.4380"
                    className="w-full rounded-xl bg-slate-50 border border-slate-200 py-1.5 px-3 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-indigo-500 focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Długość geograficzna (Lng)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    placeholder="np. 16.6548"
                    className="w-full rounded-xl bg-slate-50 border border-slate-200 py-1.5 px-3 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-indigo-500 focus:outline-none font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Prawa strona: Interaktywny Wybór Punktu na Mapie */}
            <div className="lg:col-span-5 space-y-3 flex flex-col justify-between">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-indigo-600" />
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
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-6 py-3 text-xs font-bold text-white shadow-sm shadow-indigo-600/25 disabled:opacity-50 transition transform active:scale-95"
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
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Aktywne Komunikaty ({activeAlerts.length})
            </h2>
          </div>
          <span className="text-xs text-red-700 font-semibold bg-red-50 px-3 py-1 rounded-full border border-red-200">
            Na żywo na tablicy
          </span>
        </div>

        {/* Panel Zaawansowanych Filtrów Aktywnych Komunikatów */}
        <div className="rounded-3xl bg-white p-5 border border-slate-200/80 shadow-xs space-y-4">
          {/* Horyzonty Czasowe dla Aktywnych */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-red-500" />
              <span>Zakres Czasowy Aktywnych:</span>
            </label>

            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { key: 'wszystkie', label: 'Wszystkie aktywne' },
                { key: '24h', label: 'Ostatnie 24h' },
                { key: '48h', label: '48h' },
                { key: '72h', label: '72h' },
                { key: 'tydzien', label: 'Tydzień' },
                { key: 'miesiac', label: 'Miesiąc' },
                { key: 'rok', label: 'Rok' },
                { key: 'custom', label: '📅 Własny zakres' },
              ].map((tf) => (
                <button
                  key={tf.key}
                  type="button"
                  onClick={() => setActiveTimeframe(tf.key as AlertTimeframe)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    activeTimeframe === tf.key
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>

            {/* Własny zakres dat dla aktywnych */}
            {activeTimeframe === 'custom' && (
              <div className="flex items-center gap-3 pt-2 flex-wrap text-xs bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <span className="text-slate-600 font-semibold">Od:</span>
                <input
                  type="date"
                  value={activeCustomStartDate}
                  onChange={(e) => setActiveCustomStartDate(e.target.value)}
                  className="rounded-lg bg-white border border-slate-300 py-1 px-2.5 text-slate-900 font-semibold"
                />
                <span className="text-slate-600 font-semibold">Do:</span>
                <input
                  type="date"
                  value={activeCustomEndDate}
                  onChange={(e) => setActiveCustomEndDate(e.target.value)}
                  className="rounded-lg bg-white border border-slate-300 py-1 px-2.5 text-slate-900 font-semibold"
                />
              </div>
            )}
          </div>

          {/* Wyszukiwanie po całym tekście i selektory dla aktywnych */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-3 border-t border-slate-100">
            <div className="md:col-span-5 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={activeSearchQuery}
                onChange={(e) => setActiveSearchQuery(e.target.value)}
                placeholder="Szukaj wśród aktywnych po treści, miejscu, autorze, organizacji..."
                className="w-full rounded-xl bg-slate-50 border border-slate-200 py-2.5 pl-10 pr-10 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-red-500 focus:outline-none"
              />
              {activeSearchQuery && (
                <button
                  onClick={() => setActiveSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Filtr Kategorii */}
            <div className="md:col-span-2">
              <select
                value={activeCategoryFilter}
                onChange={(e) => setActiveCategoryFilter(e.target.value)}
                className="w-full rounded-xl bg-slate-50 border border-slate-200 py-2.5 px-3 text-xs text-slate-800 font-semibold focus:bg-white focus:border-red-500 focus:outline-none"
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
                value={activeOrgFilter}
                onChange={(e) => setActiveOrgFilter(e.target.value)}
                className="w-full rounded-xl bg-slate-50 border border-slate-200 py-2.5 px-3 text-xs text-slate-800 font-semibold focus:bg-white focus:border-red-500 focus:outline-none"
              >
                <option value="all">Wszystkie organizacje</option>
                {availableActiveOrgs.map((org) => (
                  <option key={org} value={org}>
                    {org}
                  </option>
                ))}
              </select>
            </div>

            {/* Sortowanie */}
            <div className="md:col-span-3">
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
                <ArrowUpDown className="h-3.5 w-3.5 text-red-500 shrink-0" />
                <select
                  value={activeSort}
                  onChange={(e) => setActiveSort(e.target.value as AlertSortOption)}
                  className="bg-transparent text-xs text-slate-800 font-semibold focus:outline-none w-full"
                >
                  <option value="date-desc">Data: Od najnowszych</option>
                  <option value="date-asc">Data: Od najstarszych</option>
                  <option value="name-asc">Lokalizacja: A - Z</option>
                  <option value="name-desc">Lokalizacja: Z - A</option>
                  <option value="duration-desc">Czas aktywności: Najdłuższy</option>
                  <option value="duration-asc">Czas aktywności: Najkrótszy</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="py-12 text-center text-slate-400">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-red-500 border-t-transparent mb-2"></div>
            <p className="text-xs">Ładowanie alertów...</p>
          </div>
        ) : activeAlerts.length === 0 ? (
          <div className="rounded-3xl bg-white p-8 text-center border border-slate-200/80 shadow-xs">
            <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-2 opacity-80" />
            <p className="text-slate-800 font-semibold text-sm">
              {activeSearchQuery || activeCategoryFilter !== 'all' || activeOrgFilter !== 'all' || activeTimeframe !== 'wszystkie'
                ? 'Brak aktywnych ostrzeżeń spełniających wybrane kryteria'
                : 'Brak aktywnych ostrzeżeń w Twojej gminie'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {activeSearchQuery || activeCategoryFilter !== 'all' || activeOrgFilter !== 'all' || activeTimeframe !== 'wszystkie'
                ? 'Spróbuj zmienić parametry filtrów lub wyczyścić wyszukiwanie.'
                : 'Użyj powyższego formularza, aby opublikować nowy alert.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {activeAlerts.map((alert) => {
              const { totalActiveMs } = calculateAlertDurations(alert);

              return (
                <div
                  key={alert.id}
                  className="rounded-3xl bg-white p-6 shadow-xs border border-red-200 hover:border-red-400 hover:shadow-md transition duration-200 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold uppercase tracking-wider">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {alert.category}
                      </span>

                      {/* Badge lokalizacji */}
                      <button
                        type="button"
                        onClick={() => handleFocusOnMap(alert)}
                        className="inline-flex items-center gap-1 text-xs text-slate-700 bg-slate-100 hover:bg-slate-200/80 px-3 py-1 rounded-xl font-medium border border-slate-200/60 transition cursor-pointer"
                        title="Pokaż tę lokalizację na mapie"
                      >
                        <MapPin className="h-3.5 w-3.5 text-red-500 shrink-0" />
                        <span>
                          {alert.locationName ? (
                            <>
                              <strong>{alert.locationName}</strong>
                              {alert.voivodeship && (
                                <span className="text-slate-500 text-[11px] ml-1 font-normal">
                                  (woj. {alert.voivodeship})
                                </span>
                              )}
                            </>
                          ) : (
                            alert.municipality?.name || 'Lokalizacja'
                          )}
                        </span>
                      </button>
                    </div>

                    <p className="text-sm sm:text-base text-slate-900 font-semibold leading-relaxed">
                      {alert.content}
                    </p>

                    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-slate-500 pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-1">
                        <Building className="h-3.5 w-3.5 text-slate-400" />
                        <span>{alert.author?.organization?.name || 'Organizacja'}</span>
                      </div>

                      <div className="flex items-center gap-1.5 text-indigo-700 font-mono font-semibold">
                        <Clock className="h-3.5 w-3.5 text-indigo-600" />
                        <span>Czas trwania: {formatDuration(totalActiveMs)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Przyciski Akcji */}
                  <div className="flex flex-wrap items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => handleFocusOnMap(alert)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold border border-indigo-200/60 shadow-2xs hover:shadow-xs transition shrink-0 cursor-pointer active:scale-95"
                      title="Zlokalizuj to zdarzenie na mapie"
                    >
                      <MapPin className="h-3.5 w-3.5 text-indigo-600" />
                      <span>Na mapie</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedHistoryAlert(alert)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-semibold transition"
                      title="Pokaż historię i oś czasu"
                    >
                      <History className="h-3.5 w-3.5 text-indigo-600" />
                      <span>Historia</span>
                    </button>

                    {canManageAlert(alert) && (
                      <>
                        <button
                          type="button"
                          onClick={() => openEditModal(alert)}
                          className="flex items-center gap-1 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-700 text-xs font-semibold transition shrink-0"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          <span>Edytuj</span>
                        </button>

                        <button
                          onClick={() => handleDeactivate(alert.id)}
                          disabled={actionLoadingId === alert.id}
                          className="flex-1 min-w-[110px] flex items-center justify-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-2 px-3 shadow-xs tracking-wider uppercase transition transform active:scale-[0.98] disabled:opacity-50"
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
      {/* 3. SEKCJA ZARCHIWIZOWANYCH KOMUNIKATÓW                                  */}
      {/* ========================================================================= */}
      <section className="space-y-6 pt-6 border-t border-slate-200/80">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200/80 pb-3">
          <div className="flex items-center gap-2.5 text-slate-500">
            <Archive className="h-5 w-5 text-slate-400" />
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Archiwum Komunikatów i Raporty Historyczne ({archivedAlerts.length})
            </h2>
          </div>
          <span className="text-xs text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
            Wyszukiwanie i Oś Czasu
          </span>
        </div>

        {/* Panel Zaawansowanych Filtrów Archiwum */}
        <div className="rounded-3xl bg-white p-5 border border-slate-200/80 shadow-xs space-y-4">
          {/* Horyzonty Czasowe */}
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-indigo-600" />
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
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>

            {/* Własny zakres dat */}
            {archiveTimeframe === 'custom' && (
              <div className="flex items-center gap-3 pt-2 flex-wrap text-xs bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <span className="text-slate-600 font-semibold">Od:</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="rounded-lg bg-white border border-slate-300 py-1 px-2.5 text-slate-900 font-semibold"
                />
                <span className="text-slate-600 font-semibold">Do:</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="rounded-lg bg-white border border-slate-300 py-1 px-2.5 text-slate-900 font-semibold"
                />
              </div>
            )}
          </div>

          {/* Wyszukiwanie po całym tekście i selektory */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-3 border-t border-slate-100">
            <div className="md:col-span-5 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={archiveSearchQuery}
                onChange={(e) => setArchiveSearchQuery(e.target.value)}
                placeholder="Szukaj w archiwum po treści, miejscu, autorze, organizacji..."
                className="w-full rounded-xl bg-slate-50 border border-slate-200 py-2.5 pl-10 pr-10 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-indigo-500 focus:outline-none"
              />
              {archiveSearchQuery && (
                <button
                  onClick={() => setArchiveSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
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
                className="w-full rounded-xl bg-slate-50 border border-slate-200 py-2.5 px-3 text-xs text-slate-800 font-semibold focus:bg-white focus:border-indigo-500 focus:outline-none"
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
                className="w-full rounded-xl bg-slate-50 border border-slate-200 py-2.5 px-3 text-xs text-slate-800 font-semibold focus:bg-white focus:border-indigo-500 focus:outline-none"
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
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5">
                <ArrowUpDown className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                <select
                  value={archiveSort}
                  onChange={(e) => setArchiveSort(e.target.value as ArchiveSortOption)}
                  className="bg-transparent text-xs text-slate-800 font-semibold focus:outline-none w-full"
                >
                  <option value="date-desc">Data: Od najnowszych</option>
                  <option value="date-asc">Data: Od najstarszych</option>
                  <option value="name-asc">Lokalizacja: A-Z</option>
                  <option value="name-desc">Lokalizacja: Z-A</option>
                  <option value="duration-desc">Czas trwania: Od najdłuższego</option>
                  <option value="duration-asc">Czas trwania: Od najkrótszego</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Lista Zarchiwizowanych Alertów */}
        {archivedAlerts.length === 0 ? (
          <div className="rounded-3xl bg-white p-10 text-center border border-slate-200/80 shadow-xs space-y-2">
            <Archive className="h-8 w-8 text-slate-300 mx-auto" />
            <p className="text-sm text-slate-800 font-semibold">Brak zarchiwizowanych komunikatów w wybranym przedziale</p>
            <p className="text-xs text-slate-400">Zmień zakres czasu (np. Tydzień, Miesiąc, Wszystkie) lub zresetuj filtry wyszukiwania.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {archivedAlerts.map((alert) => {
              const { totalActiveMs, firstEventDate, lastEventDate, totalEventsCount } =
                calculateAlertDurations(alert);

              return (
                <div
                  key={alert.id}
                  className="rounded-3xl bg-white p-6 border border-slate-200/80 hover:border-slate-300 hover:shadow-md transition duration-200 space-y-3.5 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="rounded-xl bg-slate-100 px-2.5 py-1 text-xs text-slate-700 font-bold uppercase tracking-wider">
                        {alert.category}
                      </span>
                      <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200 flex items-center gap-1">
                        <span>✓ Zarchiwizowany</span>
                      </span>
                    </div>

                    <p className="text-sm sm:text-base text-slate-800 font-medium leading-relaxed">
                      {alert.content}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                      <span className="flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-lg">
                        <MapPin className="h-3.5 w-3.5 text-red-500" />
                        <span>
                          <strong>{alert.locationName || alert.municipality?.name || 'Gmina'}</strong>
                          {alert.voivodeship && ` (woj. ${alert.voivodeship})`}
                        </span>
                      </span>
                      <span className="flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-lg text-slate-500">
                        <Building className="h-3.5 w-3.5 text-slate-400" />
                        <span>{alert.author?.organization?.name || 'Organizacja'}</span>
                      </span>
                    </div>

                    {/* Metryki czasowe */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs font-mono">
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 space-y-0.5">
                        <span className="text-[10px] text-slate-500 font-sans block">Łączny czas aktywności:</span>
                        <span className="text-xs font-extrabold text-indigo-700">
                          {formatDuration(totalActiveMs)}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/60 space-y-0.5">
                        <span className="text-[10px] text-slate-500 font-sans block">Okres zdarzenia:</span>
                        <span className="text-[11px] font-bold text-slate-700">
                          {new Date(firstEventDate).toLocaleDateString('pl-PL')} ➔{' '}
                          {new Date(lastEventDate).toLocaleDateString('pl-PL')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Przyciski: HISTORIA, EDYTUJ i WZNÓW KOMUNIKAT */}
                  <div className="flex items-center gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setSelectedHistoryAlert(alert)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
                      title="Zobacz pełną oś czasu i cykle wznowień"
                    >
                      <History className="h-3.5 w-3.5 text-indigo-600" />
                      <span>Historia ({totalEventsCount})</span>
                    </button>

                    {canManageAlert(alert) && (
                      <>
                        <button
                          type="button"
                          onClick={() => openEditModal(alert)}
                          className="flex items-center gap-1 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          <span>Edytuj</span>
                        </button>

                        <button
                          onClick={() => handleReactivate(alert.id)}
                          disabled={actionLoadingId === alert.id}
                          className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-3 shadow-xs transition transform active:scale-95 disabled:opacity-50"
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
      {/* MODAL EDYCJI ALERTU Z MAPĄ                                               */}
      {/* ========================================================================= */}
      {editingAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-xl rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                  <Pencil className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Edytuj Komunikat Kryzysowy</h3>
                  <p className="text-xs text-slate-500">
                    Zaktualizuj treść, kategorię lub przesuń punkt zdarzenia na mapie
                  </p>
                </div>
              </div>
              <button
                onClick={() => setEditingAlert(null)}
                className="rounded-xl p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Kategoria
                </label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 border border-slate-200 py-2 px-3 text-slate-900 text-xs focus:bg-white focus:border-indigo-500 focus:outline-none"
                >
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Treść komunikatu
                </label>
                <textarea
                  required
                  rows={3}
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 border border-slate-200 p-3 text-slate-900 text-xs focus:bg-white focus:border-indigo-500 focus:outline-none resize-none"
                ></textarea>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                    Miasto / Wieś
                  </label>
                  <input
                    type="text"
                    value={editLocationName}
                    onChange={(e) => setEditLocationName(e.target.value)}
                    placeholder="np. Warszawa"
                    className="w-full rounded-xl bg-slate-50 border border-slate-200 py-1.5 px-2.5 text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                    Powiat
                  </label>
                  <input
                    type="text"
                    value={editCounty}
                    onChange={(e) => setEditCounty(e.target.value)}
                    placeholder="np. kłodzki"
                    className="w-full rounded-xl bg-slate-50 border border-slate-200 py-1.5 px-2.5 text-xs text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 mb-1">
                    Województwo
                  </label>
                  <input
                    type="text"
                    value={editVoivodeship}
                    onChange={(e) => setEditVoivodeship(e.target.value)}
                    placeholder="np. mazowieckie"
                    className="w-full rounded-xl bg-slate-50 border border-slate-200 py-1.5 px-2.5 text-xs text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-indigo-600" />
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
                  <label className="block text-[11px] text-slate-500 mb-1">Lat</label>
                  <input
                    type="number"
                    step="any"
                    value={editLat}
                    onChange={(e) => setEditLat(e.target.value)}
                    placeholder="np. 50.4380"
                    className="w-full rounded-xl bg-slate-50 border border-slate-200 py-1.5 px-3 text-xs text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Lng</label>
                  <input
                    type="number"
                    step="any"
                    value={editLng}
                    onChange={(e) => setEditLng(e.target.value)}
                    placeholder="np. 16.6548"
                    className="w-full rounded-xl bg-slate-50 border border-slate-200 py-1.5 px-3 text-xs text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingAlert(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit || !editContent.trim()}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm shadow-indigo-600/25 transition disabled:opacity-50"
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

export default DashboardAlertsPage;
