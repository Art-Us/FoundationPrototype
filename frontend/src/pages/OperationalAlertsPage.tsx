import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { AlertsMap, AlertMapItem, NeededResourceItem } from '../components/AlertsMap';
import {
  MapPin,
  Building,
  AlertTriangle,
  RefreshCw,
  Search,
  User,
  ShieldCheck,
  Calendar,
  Waves,
  Truck,
  HeartHandshake,
  AlertOctagon,
  Map as MapIcon,
  LayoutGrid,
  Columns,
  X,
  PackageCheck,
  Layers,
  CheckCircle2,
  Info,
  ChevronDown,
  ChevronUp,
  Plus,
  Pencil,
  Trash2,
  MessageSquare,
} from 'lucide-react';

type ViewMode = 'split' | 'grid' | 'map';
type ResourceFilter = 'all' | 'needs_help' | 'fulfilled' | 'with_demands';

interface OrgResourceItem {
  id: string;
  type: string;
  subcategory?: string | null;
  quantity: number;
  timeframe: string;
  organization?: {
    id: string;
    name: string;
    type: string;
  };
}

export const OperationalAlertsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [alerts, setAlerts] = useState<AlertMapItem[]>([]);
  const [orgResources, setOrgResources] = useState<OrgResourceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtry
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedVoivodeship, setSelectedVoivodeship] = useState<string>('all');
  const [selectedCountyOrCity, setSelectedCountyOrCity] = useState<string>('all');
  const [resourceFilter, setResourceFilter] = useState<ResourceFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('split');

  // Skupienie na mapie
  const [focusedAlertId, setFocusedAlertId] = useState<string | null>(null);
  const [focusKey, setFocusKey] = useState<number>(0);
  const mapSectionRef = useRef<HTMLDivElement>(null);

  // Modal przydziału zasobów
  const [allocatingAlert, setAllocatingAlert] = useState<AlertMapItem | null>(null);
  const [allocatingResource, setAllocatingResource] = useState<NeededResourceItem | null>(null);
  const [selectedOrgResourceId, setSelectedOrgResourceId] = useState<string>('');
  const [allocateQuantity, setAllocateQuantity] = useState<number>(1);
  const [allocationNote, setAllocationNote] = useState<string>('');
  const [isSubmittingAlloc, setIsSubmittingAlloc] = useState(false);
  const [expandedAllocAlerts, setExpandedAllocAlerts] = useState<Record<string, boolean>>({});

  // Modal dodawania nowego zapotrzebowania do alertu
  const [addingDemandAlert, setAddingDemandAlert] = useState<AlertMapItem | null>(null);
  const [newDemandType, setNewDemandType] = useState<'woda' | 'sprzet' | 'ludzie' | 'inne'>('woda');
  const [newDemandName, setNewDemandName] = useState('Woda butelkowana 1.5L');
  const [newDemandQuantity, setNewDemandQuantity] = useState<number>(100);
  const [newDemandUnit, setNewDemandUnit] = useState('szt.');
  const [newDemandUrgency, setNewDemandUrgency] = useState<'niski' | 'średni' | 'wysoki' | 'krytyczny'>('wysoki');
  const [isSubmittingNewDemand, setIsSubmittingNewDemand] = useState(false);

  // Toast
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

  const fetchOperationalData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [alertsRes, orgRes] = await Promise.all([
        api.get('/alerts/operational'),
        api.get('/resources/my-organization').catch(() => ({ data: { resources: [] } })),
      ]);

      if (alertsRes.data.success && Array.isArray(alertsRes.data.data)) {
        setAlerts(alertsRes.data.data);
      }
      if (orgRes.data?.resources && Array.isArray(orgRes.data.resources)) {
        setOrgResources(orgRes.data.resources);
      }
    } catch (err: any) {
      console.error('Błąd pobierania danych operacyjnych:', err);
      setError(
        err.response?.data?.message ||
          'Nie udało się pobrać danych operacyjnych. Sprawdź połączenie.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOperationalData();
  }, []);

  const handleFocusOnMap = (alert: AlertMapItem) => {
    if (viewMode === 'grid') {
      setViewMode('split');
    }
    setFocusedAlertId(alert.id);
    setFocusKey((k) => k + 1);

    setTimeout(() => {
      mapSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 80);
  };

  const toggleAllocationsHistory = (key: string) => {
    setExpandedAllocAlerts((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Otwarcie modalu alokacji
  const openAllocationModal = (alert: AlertMapItem, needed: NeededResourceItem) => {
    setAllocatingAlert(alert);
    setAllocatingResource(needed);
    const remaining = Math.max(1, needed.quantityNeeded - (needed.quantityAllocated || 0));
    setAllocateQuantity(remaining);
    setAllocationNote('');

    // Domyślny wybór zasobu z organizacji pasującego typem
    const matched = orgResources.find(
      (r) => r.type.toLowerCase() === needed.resourceType.toLowerCase() && r.quantity > 0
    );
    setSelectedOrgResourceId(matched ? matched.id : orgResources[0]?.id || '');
  };

  // Zatwierdzenie przydziału zasobów
  const handleSubmitAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allocatingAlert || !allocatingResource || allocateQuantity <= 0) return;

    setIsSubmittingAlloc(true);
    try {
      const res = await api.post(`/alerts/${allocatingAlert.id}/allocate-resource`, {
        neededResourceId: allocatingResource.id,
        quantity: allocateQuantity,
        resourceId: selectedOrgResourceId || undefined,
        note: allocationNote.trim() || undefined,
      });

      if (res.data.success && res.data.data) {
        setAlerts((prev) =>
          prev.map((a) => (a.id === allocatingAlert.id ? res.data.data : a))
        );
        showToast(
          res.data.message || 'Zasoby zostały pomyślnie przekazane na miejsce zdarzenia!'
        );

        // Odśwież zasoby organizacji
        api
          .get('/resources/my-organization')
          .then((r) => setOrgResources(r.data.resources || []))
          .catch(() => {});

        setAllocatingAlert(null);
        setAllocatingResource(null);
      }
    } catch (err: any) {
      console.error('Błąd przydziału zasobów:', err);
      showToast(
        err.response?.data?.message || 'Nie udało się przydzielić zasobów.',
        'error'
      );
    } finally {
      setIsSubmittingAlloc(false);
    }
  };

  // Otwarcie modalu zgłaszania nowego zapotrzebowania
  const openAddDemandModal = (alert: AlertMapItem) => {
    setAddingDemandAlert(alert);
    setNewDemandType('woda');
    setNewDemandName('Woda butelkowana 1.5L');
    setNewDemandQuantity(100);
    setNewDemandUnit('szt.');
    setNewDemandUrgency('wysoki');
  };

  // Zatwierdzenie nowego zapotrzebowania
  const handleSubmitNewDemand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addingDemandAlert || !newDemandName.trim() || newDemandQuantity <= 0) return;

    setIsSubmittingNewDemand(true);
    try {
      const currentNeeded = Array.isArray(addingDemandAlert.neededResources)
        ? [...addingDemandAlert.neededResources]
        : [];

      const newDemandItem: NeededResourceItem = {
        id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        resourceType: newDemandType,
        name: newDemandName.trim(),
        quantityNeeded: newDemandQuantity,
        quantityAllocated: 0,
        unit: newDemandUnit.trim() || 'szt.',
        urgency: newDemandUrgency,
        allocations: [],
      };

      const updatedNeeded = [...currentNeeded, newDemandItem];

      const res = await api.put(`/alerts/${addingDemandAlert.id}`, {
        neededResources: updatedNeeded,
      });

      if (res.data.success && res.data.data) {
        setAlerts((prev) =>
          prev.map((a) => (a.id === addingDemandAlert.id ? res.data.data : a))
        );
        showToast('Nowe zapotrzebowanie zostało pomyślnie dodane do alertu!');
        setAddingDemandAlert(null);
      }
    } catch (err: any) {
      console.error('Błąd dodawania zapotrzebowania:', err);
      showToast(
        err.response?.data?.message || 'Nie udało się dodać zapotrzebowania.',
        'error'
      );
    } finally {
      setIsSubmittingNewDemand(false);
    }
  };

  // Modal całościowego zarządzania / edycji zapotrzebowań alertu
  const [managingDemandsAlert, setManagingDemandsAlert] = useState<AlertMapItem | null>(null);
  const [draftDemandsList, setDraftDemandsList] = useState<NeededResourceItem[]>([]);
  const [isSavingDraftDemands, setIsSavingDraftDemands] = useState(false);

  const openManageDemandsModal = (alert: AlertMapItem) => {
    setManagingDemandsAlert(alert);
    setDraftDemandsList(
      Array.isArray(alert.neededResources)
        ? JSON.parse(JSON.stringify(alert.neededResources))
        : []
    );
  };

  const addDraftDemandRow = () => {
    setDraftDemandsList((prev) => [
      ...prev,
      {
        id: `req-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        resourceType: 'woda',
        name: 'Woda butelkowana 1.5L',
        quantityNeeded: 100,
        quantityAllocated: 0,
        unit: 'szt.',
        urgency: 'wysoki',
        allocations: [],
      },
    ]);
  };

  const updateDraftDemandRow = (id: string, field: keyof NeededResourceItem, value: any) => {
    setDraftDemandsList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const removeDraftDemandRow = (id: string) => {
    setDraftDemandsList((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSaveDraftDemands = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!managingDemandsAlert) return;

    setIsSavingDraftDemands(true);
    try {
      const sanitized = draftDemandsList.map((nr) => ({
        ...nr,
        name: nr.name.trim() || 'Zasób ratunkowy',
        quantityNeeded: Math.max(1, Number(nr.quantityNeeded) || 1),
        quantityAllocated: Number(nr.quantityAllocated) || 0,
        unit: (nr.unit || 'szt.').trim(),
      }));

      const res = await api.put(`/alerts/${managingDemandsAlert.id}`, {
        neededResources: sanitized,
      });

      if (res.data.success && res.data.data) {
        setAlerts((prev) =>
          prev.map((a) => (a.id === managingDemandsAlert.id ? res.data.data : a))
        );
        showToast('Zapotrzebowanie alertu zostało pomyślnie zaktualizowane!');
        setManagingDemandsAlert(null);
      }
    } catch (err: any) {
      showToast(
        err.response?.data?.message || 'Nie udało się zaktualizować zapotrzebowania.',
        'error'
      );
    } finally {
      setIsSavingDraftDemands(false);
    }
  };

  // Unikalne kategorie
  const categories = useMemo(() => {
    const cats = new Set<string>();
    alerts.forEach((a) => {
      if (a.category) cats.add(a.category);
    });
    return Array.from(cats);
  }, [alerts]);

  // Unikalne województwa
  const availableVoivodeships = useMemo(() => {
    const set = new Set<string>();
    alerts.forEach((a) => {
      if (a.voivodeship && a.voivodeship.trim().length > 0) {
        set.add(a.voivodeship.trim().toLowerCase());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pl'));
  }, [alerts]);

  // Powiaty i miasta dla wybranego województwa
  const availableCountiesAndCities = useMemo(() => {
    if (selectedVoivodeship === 'all') return [];

    const set = new Set<string>();
    alerts.forEach((a) => {
      const vMatch =
        a.voivodeship && a.voivodeship.toLowerCase() === selectedVoivodeship.toLowerCase();
      if (vMatch) {
        if (a.county && a.county.trim().length > 0) set.add(a.county.trim());
        if (a.locationName && a.locationName.trim().length > 0) set.add(a.locationName.trim());
      }
    });

    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pl'));
  }, [alerts, selectedVoivodeship]);

  // Filtrowanie alertów
  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      // 1. Kategoria
      if (selectedCategory !== 'all' && alert.category !== selectedCategory) {
        return false;
      }

      // 2. Województwo
      if (selectedVoivodeship !== 'all') {
        const vMatches =
          alert.voivodeship &&
          alert.voivodeship.toLowerCase() === selectedVoivodeship.toLowerCase();
        if (!vMatches) return false;

        // 3. Powiat lub Miasto
        if (selectedCountyOrCity !== 'all') {
          const countyMatches =
            alert.county &&
            alert.county.toLowerCase() === selectedCountyOrCity.toLowerCase();
          const cityMatches =
            alert.locationName &&
            alert.locationName.toLowerCase() === selectedCountyOrCity.toLowerCase();

          if (!countyMatches && !cityMatches) return false;
        }
      }

      // 4. Filtr stanu zapotrzebowania
      const needed = Array.isArray(alert.neededResources) ? alert.neededResources : [];
      if (resourceFilter === 'with_demands') {
        if (needed.length === 0) return false;
      } else if (resourceFilter === 'needs_help') {
        if (needed.length === 0) return false;
        const hasUnfulfilled = needed.some(
          (nr) => (nr.quantityAllocated || 0) < nr.quantityNeeded
        );
        if (!hasUnfulfilled) return false;
      } else if (resourceFilter === 'fulfilled') {
        if (needed.length === 0) return false;
        const allFulfilled = needed.every(
          (nr) => (nr.quantityAllocated || 0) >= nr.quantityNeeded
        );
        if (!allFulfilled) return false;
      }

      // 5. Wyszukiwarka pełnotekstowa
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
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
        const matchResource = needed.some((nr) =>
          nr.name.toLowerCase().includes(q) || nr.resourceType.toLowerCase().includes(q)
        );

        return (
          matchContent ||
          matchCategory ||
          matchLocation ||
          matchCounty ||
          matchVoivodeship ||
          matchMunicipality ||
          matchOrg ||
          matchAuthor ||
          matchResource
        );
      }

      return true;
    });
  }, [
    alerts,
    selectedCategory,
    selectedVoivodeship,
    selectedCountyOrCity,
    resourceFilter,
    searchQuery,
  ]);

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

  const getCategoryBadge = (cat: string) => {
    const lower = cat.toLowerCase();
    if (lower.includes('hydro') || lower.includes('powód') || lower.includes('woda')) {
      return {
        bg: 'bg-cyan-50 text-cyan-700 border-cyan-200',
        icon: <Waves className="h-3.5 w-3.5" />,
      };
    }
    if (lower.includes('drog') || lower.includes('most') || lower.includes('objazd')) {
      return {
        bg: 'bg-amber-50 text-amber-700 border-amber-200',
        icon: <Truck className="h-3.5 w-3.5" />,
      };
    }
    if (lower.includes('pomoc') || lower.includes('humanitar')) {
      return {
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        icon: <HeartHandshake className="h-3.5 w-3.5" />,
      };
    }
    return {
      bg: 'bg-rose-50 text-rose-700 border-rose-200',
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
    };
  };

  const getUrgencyBadge = (urgency?: string) => {
    switch (urgency) {
      case 'krytyczny':
        return 'bg-red-100 text-red-800 border-red-300 font-extrabold animate-pulse';
      case 'wysoki':
        return 'bg-amber-100 text-amber-800 border-amber-300 font-bold';
      case 'średni':
        return 'bg-blue-50 text-blue-700 border-blue-200 font-semibold';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200 font-medium';
    }
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
              <CheckCircle2 className="h-5 w-5 shrink-0" />
            ) : (
              <AlertTriangle className="h-5 w-5 shrink-0" />
            )}
            <span>{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-2 hover:opacity-75 transition">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modal Alokacji Zasobów */}
      {allocatingAlert && allocatingResource && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-5 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-indigo-600 font-bold">
                <PackageCheck className="h-5 w-5" />
                <h3 className="text-base font-extrabold text-slate-900">
                  Dyspozycja i Przydział Zasobów
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAllocatingAlert(null);
                  setAllocatingResource(null);
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Informacje o alercie i zapotrzebowaniu */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="font-semibold">Miejsce zdarzenia:</span>
                <span className="font-bold text-slate-900">
                  {allocatingAlert.locationName ||
                    allocatingAlert.municipality?.name ||
                    'Lokalizacja zdarzenia'}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-500">
                <span className="font-semibold">Potrzebny zasób:</span>
                <span className="font-bold text-indigo-700">{allocatingResource.name}</span>
              </div>
              <div className="flex items-center justify-between text-slate-500">
                <span className="font-semibold">Stan realizacji:</span>
                <span className="font-mono font-bold text-slate-800">
                  {allocatingResource.quantityAllocated || 0} / {allocatingResource.quantityNeeded}{' '}
                  {allocatingResource.unit} (Brakuje:{' '}
                  {Math.max(
                    0,
                    allocatingResource.quantityNeeded -
                      (allocatingResource.quantityAllocated || 0)
                  )}{' '}
                  {allocatingResource.unit})
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmitAllocation} className="space-y-4">
              {/* Baner informacyjny o przydziale częściowym */}
              <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-3 text-xs text-amber-900 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <Info className="h-4 w-4 text-amber-700 shrink-0" />
                  <span>Elastyczny przydział częściowy</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-snug">
                  Nie musisz zamykać całej potrzeby na raz! Przydziel tyle zasobów, ile Twoja jednostka może zadysponować (np. 50 z 500). Pozostałą brakującą część dołożą inne służby.
                </p>
              </div>

              {/* Wybór zasobu z magazynu organizacji */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Zasób z magazynu Twojej jednostki:</span>
                  <span className="text-[10px] text-indigo-600 font-semibold lowercase">
                    {user?.organization?.name || 'Twoja organizacja'}
                  </span>
                </label>

                {orgResources.length === 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                    <p className="font-semibold">Brak zarejestrowanych zasobów w magazynie</p>
                    <p className="text-[11px] text-amber-700 mt-0.5">
                      Możesz zadeklarować przydział bezpośredni wpisując ilość poniżej.
                    </p>
                  </div>
                ) : (
                  <select
                    value={selectedOrgResourceId}
                    onChange={(e) => setSelectedOrgResourceId(e.target.value)}
                    className="w-full rounded-xl bg-slate-50 border border-slate-200 py-2.5 px-3 text-xs font-semibold text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none"
                  >
                    {orgResources.map((res) => (
                      <option key={res.id} value={res.id}>
                        {res.subcategory || res.type.toUpperCase()} • Dostępne w magazynie: {res.quantity} szt. ({res.timeframe})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Ilość do przekazania z szybkimi przyciskami */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Ilość do przekazania ({allocatingResource.unit}):
                  </label>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Brakuje:{' '}
                    <strong className="text-amber-800">
                      {Math.max(
                        0,
                        allocatingResource.quantityNeeded -
                          (allocatingResource.quantityAllocated || 0)
                      )}{' '}
                      {allocatingResource.unit}
                    </strong>
                  </span>
                </div>

                <input
                  type="number"
                  min="1"
                  required
                  value={allocateQuantity}
                  onChange={(e) => setAllocateQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full rounded-xl bg-slate-50 border border-slate-200 py-2.5 px-3.5 text-sm font-bold text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none"
                />

                {/* Szybkie przyciski ilości */}
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  {[10, 25, 50, 100].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setAllocateQuantity(num)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition"
                    >
                      {num} {allocatingResource.unit}
                    </button>
                  ))}
                  {(() => {
                    const selRes = orgResources.find((r) => r.id === selectedOrgResourceId);
                    const remaining = Math.max(
                      1,
                      allocatingResource.quantityNeeded -
                        (allocatingResource.quantityAllocated || 0)
                    );
                    return (
                      <>
                        {selRes && selRes.quantity > 0 && (
                          <button
                            type="button"
                            onClick={() => setAllocateQuantity(selRes.quantity)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold border border-indigo-200/60 transition"
                          >
                            Maks. magazyn ({selRes.quantity})
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setAllocateQuantity(remaining)}
                          className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-bold border border-amber-200/60 transition"
                        >
                          Całość brakujących ({remaining})
                        </button>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Podgląd stanu na żywo */}
              <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 text-[11px] space-y-1 text-slate-600">
                <div className="flex items-center justify-between">
                  <span>Nowy stan realizacji alertu:</span>
                  <strong className="text-emerald-700 font-mono">
                    {Math.min(
                      allocatingResource.quantityNeeded,
                      (allocatingResource.quantityAllocated || 0) + allocateQuantity
                    )}{' '}
                    / {allocatingResource.quantityNeeded} {allocatingResource.unit} (
                    {Math.min(
                      100,
                      Math.round(
                        (((allocatingResource.quantityAllocated || 0) + allocateQuantity) /
                          allocatingResource.quantityNeeded) *
                          100
                      )
                    )}
                    %)
                  </strong>
                </div>
              </div>

              {/* Notatka operacyjna */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Notatka dyspozytorska / Transport (Opcjonalnie):
                </label>
                <input
                  type="text"
                  value={allocationNote}
                  onChange={(e) => setAllocationNote(e.target.value)}
                  placeholder="np. Wysłano 1 wóz kwatermistrzowski z remizy w Kłodzku"
                  className="w-full rounded-xl bg-slate-50 border border-slate-200 py-2 px-3 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setAllocatingAlert(null);
                    setAllocatingResource(null);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAlloc}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition disabled:opacity-50"
                >
                  {isSubmittingAlloc ? (
                    <>
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Przydzielanie...</span>
                    </>
                  ) : (
                    <>
                      <PackageCheck className="h-4 w-4" />
                      <span>Zatwierdź i Przydziel ({allocateQuantity} {allocatingResource.unit})</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Zarządzania Zapotrzebowaniem Alertu (Edycja/Usuwanie/Dodawanie potrzeb) */}
      {managingDemandsAlert && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 space-y-5 animate-scale-up max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-indigo-600 font-bold">
                <Pencil className="h-5 w-5" />
                <h3 className="text-base font-extrabold text-slate-900">
                  Zarządzaj i Edytuj Zapotrzebowanie Alertu
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setManagingDemandsAlert(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/80 text-xs text-slate-600">
              <span className="font-semibold text-slate-500">Dotyczy zdarzenia: </span>
              <strong className="text-slate-900">
                {managingDemandsAlert.locationName ||
                  managingDemandsAlert.municipality?.name ||
                  'Lokalizacja'}
              </strong>
              <p className="mt-1 text-slate-700 italic line-clamp-2">„{managingDemandsAlert.content}”</p>
            </div>

            <form onSubmit={handleSaveDraftDemands} className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Lista zapytań o wsparcie ({draftDemandsList.length}):
                </span>
                <button
                  type="button"
                  onClick={addDraftDemandRow}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold border border-amber-200 transition"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>+ Dodaj nową pozycję</span>
                </button>
              </div>

              {draftDemandsList.length === 0 ? (
                <div className="rounded-2xl bg-slate-50 p-6 border border-dashed border-slate-200 text-center text-xs text-slate-400">
                  Brak zapotrzebowania dla tego alertu. Kliknij „+ Dodaj nową pozycję”.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {draftDemandsList.map((nr) => (
                    <div
                      key={nr.id}
                      className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                        <div className="sm:col-span-3">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">
                            Typ
                          </label>
                          <select
                            value={nr.resourceType}
                            onChange={(e) =>
                              updateDraftDemandRow(nr.id, 'resourceType', e.target.value)
                            }
                            className="w-full rounded-lg bg-white border border-slate-300 py-1.5 px-2 text-xs font-semibold text-slate-800"
                          >
                            <option value="woda">💧 Woda / Żywność</option>
                            <option value="sprzet">🛠️ Sprzęt / Pompy</option>
                            <option value="ludzie">👷 Ludzie / Ratownicy</option>
                            <option value="inne">📦 Inne zasoby</option>
                          </select>
                        </div>

                        <div className="sm:col-span-4">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">
                            Nazwa / Opis
                          </label>
                          <input
                            type="text"
                            required
                            value={nr.name}
                            onChange={(e) => updateDraftDemandRow(nr.id, 'name', e.target.value)}
                            placeholder="Nazwa zasobu"
                            className="w-full rounded-lg bg-white border border-slate-300 py-1.5 px-2 text-xs text-slate-900"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">
                            Potrzebna ilość
                          </label>
                          <input
                            type="number"
                            min="1"
                            required
                            value={nr.quantityNeeded}
                            onChange={(e) =>
                              updateDraftDemandRow(
                                nr.id,
                                'quantityNeeded',
                                Math.max(1, parseInt(e.target.value) || 1)
                              )
                            }
                            className="w-full rounded-lg bg-white border border-slate-300 py-1.5 px-2 text-xs font-bold text-slate-900"
                          />
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase mb-0.5">
                            Pilność
                          </label>
                          <select
                            value={nr.urgency}
                            onChange={(e) => updateDraftDemandRow(nr.id, 'urgency', e.target.value)}
                            className="w-full rounded-lg bg-white border border-slate-300 py-1.5 px-2 text-xs font-semibold text-slate-800"
                          >
                            <option value="niski">Niski</option>
                            <option value="średni">Średni</option>
                            <option value="wysoki">Wysoki</option>
                            <option value="krytyczny">Krytyczny</option>
                          </select>
                        </div>

                        <div className="sm:col-span-1 flex justify-end pt-3 sm:pt-0">
                          <button
                            type="button"
                            onClick={() => removeDraftDemandRow(nr.id)}
                            className="text-slate-400 hover:text-red-600 p-1.5 rounded-lg transition"
                            title="Usuń tę potrzebę"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Informacja o zrealizowanych już jednostkach */}
                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1.5 border-t border-slate-200/60">
                        <span>
                          Dotychczas zrealizowano:{' '}
                          <strong className="text-emerald-700 font-mono font-bold">
                            {nr.quantityAllocated || 0} / {nr.quantityNeeded} {nr.unit || 'szt.'}
                          </strong>
                        </span>
                        {nr.allocations && nr.allocations.length > 0 && (
                          <span className="text-indigo-600 font-semibold">
                            Liczba dostawców: {nr.allocations.length}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setManagingDemandsAlert(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  disabled={isSavingDraftDemands}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition disabled:opacity-50"
                >
                  {isSavingDraftDemands ? (
                    <>
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Zapisywanie...</span>
                    </>
                  ) : (
                    <>
                      <Pencil className="h-4 w-4" />
                      <span>Zapisz zmiany w zapotrzebowaniu</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Zgłaszania Nowego Zapotrzebowania do Alertu */}
      {addingDemandAlert && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-5 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-amber-600 font-bold">
                <Plus className="h-5 w-5" />
                <h3 className="text-base font-extrabold text-slate-900">
                  Zgłoś Zapotrzebowanie do Alertu
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAddingDemandAlert(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200/80 text-xs text-slate-600">
              <span className="font-semibold text-slate-500">Dotyczy zdarzenia: </span>
              <strong className="text-slate-900">
                {addingDemandAlert.locationName ||
                  addingDemandAlert.municipality?.name ||
                  'Lokalizacja'}
              </strong>
              <p className="mt-1 text-slate-700 italic line-clamp-2">„{addingDemandAlert.content}”</p>
            </div>

            <form onSubmit={handleSubmitNewDemand} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Typ zasobu */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Typ zasobu
                  </label>
                  <select
                    value={newDemandType}
                    onChange={(e) => setNewDemandType(e.target.value as any)}
                    className="w-full rounded-xl bg-slate-50 border border-slate-200 py-2 px-3 text-xs font-semibold text-slate-900 focus:bg-white focus:border-amber-500 focus:outline-none"
                  >
                    <option value="woda">💧 Woda / Prowiant</option>
                    <option value="sprzet">🛠️ Sprzęt / Pompy</option>
                    <option value="ludzie">👷 Ludzie / Ratownicy</option>
                    <option value="inne">📦 Inne zasoby</option>
                  </select>
                </div>

                {/* Pilność */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Priorytet / Pilność
                  </label>
                  <select
                    value={newDemandUrgency}
                    onChange={(e) => setNewDemandUrgency(e.target.value as any)}
                    className="w-full rounded-xl bg-slate-50 border border-slate-200 py-2 px-3 text-xs font-semibold text-slate-900 focus:bg-white focus:border-amber-500 focus:outline-none"
                  >
                    <option value="niski">Niski</option>
                    <option value="średni">Średni</option>
                    <option value="wysoki">Wysoki</option>
                    <option value="krytyczny">🚨 Krytyczny</option>
                  </select>
                </div>
              </div>

              {/* Nazwa zasobu */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                  Nazwa / Opis potrzebnego zasobu
                </label>
                <input
                  type="text"
                  required
                  value={newDemandName}
                  onChange={(e) => setNewDemandName(e.target.value)}
                  placeholder="np. Agregat prądotwórczy 5kW, Pompy szlamowe, Worki z piaskiem"
                  className="w-full rounded-xl bg-slate-50 border border-slate-200 py-2.5 px-3 text-xs font-semibold text-slate-900 focus:bg-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              {/* Ilość i jednostka */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Potrzebna ilość
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newDemandQuantity}
                    onChange={(e) =>
                      setNewDemandQuantity(Math.max(1, parseInt(e.target.value) || 1))
                    }
                    className="w-full rounded-xl bg-slate-50 border border-slate-200 py-2 px-3 text-xs font-bold text-slate-900 focus:bg-white focus:border-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                    Jednostka
                  </label>
                  <input
                    type="text"
                    value={newDemandUnit}
                    onChange={(e) => setNewDemandUnit(e.target.value)}
                    placeholder="szt."
                    className="w-full rounded-xl bg-slate-50 border border-slate-200 py-2 px-3 text-xs font-semibold text-slate-900 focus:bg-white focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAddingDemandAlert(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNewDemand}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-600/25 transition disabled:opacity-50"
                >
                  {isSubmittingNewDemand ? (
                    <>
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Zapisywanie...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      <span>Dodaj zapotrzebowanie</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 1. Nagłówek Sekcji Operacyjnej */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 font-semibold text-xs tracking-wider uppercase mb-1">
            <Layers className="h-4 w-4 text-indigo-600" />
            <span>Centrum Operacyjne Służb • Koordynacja i Dyspozycja Zasobów</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Komunikaty i Dyspozytornia Zasobów
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Przeglądaj aktywne zdarzenia, weryfikuj zapotrzebowanie na sprzęt i przydzielaj zasoby swojej jednostki na miejsce akcji.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchOperationalData}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 shadow-xs transition"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Odśwież dane</span>
          </button>
        </div>
      </div>

      {/* 2. Pasek Filtrów i Wyszukiwania */}
      <section className="rounded-3xl bg-white p-5 border border-slate-200/80 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          {/* Wyszukiwarka */}
          <div className="lg:col-span-4 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Szukaj po treści, miejscu, sprzęcie, organizacji..."
              className="w-full rounded-xl bg-slate-50 border border-slate-200 py-2.5 pl-10 pr-10 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-indigo-500 focus:outline-none transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filtr Województwa */}
          <div className="lg:col-span-2">
            <select
              value={selectedVoivodeship}
              onChange={(e) => {
                setSelectedVoivodeship(e.target.value);
                setSelectedCountyOrCity('all');
              }}
              className="w-full rounded-xl bg-slate-50 border border-slate-200 py-2.5 px-3 text-xs text-slate-800 font-semibold focus:bg-white focus:border-indigo-500 focus:outline-none capitalize"
            >
              <option value="all">Wszystkie województwa</option>
              {availableVoivodeships.map((v) => (
                <option key={v} value={v} className="capitalize">
                  Woj. {v}
                </option>
              ))}
            </select>
          </div>

          {/* Filtr Powiatu / Miasta */}
          <div className="lg:col-span-3">
            <select
              value={selectedCountyOrCity}
              disabled={selectedVoivodeship === 'all'}
              onChange={(e) => setSelectedCountyOrCity(e.target.value)}
              className="w-full rounded-xl bg-slate-50 border border-slate-200 py-2.5 px-3 text-xs text-slate-800 font-semibold focus:bg-white focus:border-indigo-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="all">
                {selectedVoivodeship === 'all'
                  ? 'Najpierw wybierz województwo'
                  : 'Wszystkie powiaty i miasta'}
              </option>
              {availableCountiesAndCities.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          {/* Filtr Stanu Zapotrzebowania */}
          <div className="lg:col-span-3">
            <select
              value={resourceFilter}
              onChange={(e) => setResourceFilter(e.target.value as ResourceFilter)}
              className="w-full rounded-xl bg-slate-50 border border-slate-200 py-2.5 px-3 text-xs text-slate-800 font-semibold focus:bg-white focus:border-indigo-500 focus:outline-none"
            >
              <option value="all">Wszystkie statusy zapotrzebowania</option>
              <option value="needs_help">🚨 Wymagające wsparcia (Niezaspokojone)</option>
              <option value="fulfilled">✅ Zabezpieczone w 100%</option>
              <option value="with_demands">📦 Posiadające jakiekolwiek zapotrzebowanie</option>
            </select>
          </div>
        </div>

        {/* Dolna belka filtrów: Przełączniki widoku & Kategorie */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
          {/* Przełączniki widoku */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('split')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === 'split'
                  ? 'bg-white text-indigo-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Columns className="h-3.5 w-3.5" />
              <span>Podzielony</span>
            </button>
            <button
              onClick={() => setViewMode('map')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === 'map'
                  ? 'bg-white text-indigo-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MapIcon className="h-3.5 w-3.5" />
              <span>Mapa</span>
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === 'grid'
                  ? 'bg-white text-indigo-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Karty ({filteredAlerts.length})</span>
            </button>
          </div>

          {/* Chipy kategorii */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`rounded-xl px-3 py-1.5 font-bold transition shrink-0 ${
                selectedCategory === 'all'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              Wszystkie ({alerts.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-xl px-2.5 py-1.5 font-semibold transition shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                }`}
              >
                {cat.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Główna Zawartość */}
      {error ? (
        <div className="rounded-3xl bg-red-50 p-8 text-center border border-red-100 max-w-lg mx-auto space-y-4">
          <AlertOctagon className="h-10 w-10 text-red-500 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">Błąd pobierania komunikatów</h3>
          <p className="text-xs text-red-600">{error}</p>
          <button
            onClick={fetchOperationalData}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition shadow-sm"
          >
            Spróbuj ponownie
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Widok Mapy */}
          {(viewMode === 'split' || viewMode === 'map') && (
            <section
              ref={mapSectionRef}
              className="rounded-3xl bg-white p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-3 scroll-mt-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <MapPin className="h-4 w-4 text-red-500" />
                  <span>Mapa Ostrzeżeń i Zapotrzebowania ({filteredAlerts.length})</span>
                </div>
                <span className="text-xs text-slate-400 hidden sm:inline">
                  Kliknij punkt na mapie lub „Pokaż na mapie” na karcie
                </span>
              </div>

              <AlertsMap
                alerts={filteredAlerts}
                height={viewMode === 'map' ? '600px' : '440px'}
                focusedAlertId={focusedAlertId}
                focusKey={focusKey}
              />
            </section>
          )}

          {/* Widok Kart */}
          {(viewMode === 'split' || viewMode === 'grid') && (
            <section className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                <span className="text-sm font-bold text-slate-900">
                  Lista aktywnych zdarzeń operacyjnych ({filteredAlerts.length})
                </span>
                <span className="text-xs text-slate-500">
                  Magazyn Twojej jednostki:{' '}
                  <strong className="text-indigo-700">
                    {orgResources.reduce((acc, r) => acc + r.quantity, 0)} szt. zasobów
                  </strong>
                </span>
              </div>

              {filteredAlerts.length === 0 ? (
                <div className="rounded-3xl bg-white p-12 text-center border border-slate-200/80 shadow-xs max-w-md mx-auto space-y-4">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                    <ShieldCheck className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Brak aktywnych ostrzeżeń</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Żaden komunikat nie pasuje do wybranych filtrów operacyjnych.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {filteredAlerts.map((alert) => {
                    const categoryBadge = getCategoryBadge(alert.category);
                    const orgName = alert.author?.organization?.name || 'Służby Ratunkowe';
                    const orgType = alert.author?.organization?.type;
                    const authorName = alert.author
                      ? `${alert.author.firstName} ${alert.author.lastName}`
                      : null;
                    const needed = Array.isArray(alert.neededResources)
                      ? alert.neededResources
                      : [];

                    return (
                      <article
                        key={alert.id}
                        className="group relative flex flex-col justify-between rounded-3xl bg-white p-6 shadow-xs border border-slate-200/80 hover:border-indigo-300 hover:shadow-md transition duration-200 space-y-4"
                      >
                        <div className="space-y-3.5">
                          {/* Górna belka: Kategoria & Lokalizacja */}
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border tracking-wide uppercase ${categoryBadge.bg}`}
                            >
                              {categoryBadge.icon}
                              <span>{alert.category}</span>
                            </span>

                            <button
                              type="button"
                              onClick={() => handleFocusOnMap(alert)}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-800 text-xs font-semibold border border-slate-200/60 transition cursor-pointer"
                              title="Pokaż tę lokalizację na mapie"
                            >
                              <MapPin className="h-3.5 w-3.5 shrink-0 text-red-500" />
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

                          {/* Treść alertu */}
                          <p className="text-sm sm:text-base text-slate-800 font-semibold leading-relaxed">
                            {alert.content}
                          </p>

                          {/* Sekcja Zapotrzebowania na Zasoby */}
                          {needed.length > 0 ? (
                            <div className="rounded-2xl bg-amber-50/70 border border-amber-200/80 p-3.5 space-y-3">
                              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-amber-900 border-b border-amber-200/60 pb-2">
                                <span className="flex items-center gap-1.5">
                                  <PackageCheck className="h-4 w-4 text-amber-700" />
                                  <span>Zapotrzebowanie na zasoby ({needed.length})</span>
                                </span>

                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => openManageDemandsModal(alert)}
                                    className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 transition shadow-2xs cursor-pointer active:scale-95"
                                    title="Zarządzaj i edytuj listę potrzeb tego alertu"
                                  >
                                    <Pencil className="h-3 w-3 text-indigo-600" />
                                    <span>Zarządzaj / Edytuj</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => openAddDemandModal(alert)}
                                    className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-200/80 hover:bg-amber-300 text-amber-950 text-xs font-bold transition shadow-2xs cursor-pointer active:scale-95"
                                    title="Dodaj nową potrzebę do tego alertu"
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                    <span>+ Dodaj</span>
                                  </button>
                                </div>
                              </div>

                              <div className="space-y-3">
                                {needed.map((nr) => {
                                  const allocCount = nr.quantityAllocated || 0;
                                  const pct = Math.min(
                                    100,
                                    Math.round((allocCount / nr.quantityNeeded) * 100)
                                  );
                                  const isFulfilled = allocCount >= nr.quantityNeeded;
                                  const hasAllocations =
                                    Array.isArray(nr.allocations) && nr.allocations.length > 0;
                                  const historyKey = `${alert.id}-${nr.id}`;
                                  const isExpanded = !!expandedAllocAlerts[historyKey];

                                  return (
                                    <div
                                      key={nr.id}
                                      className="rounded-xl bg-white p-3 border border-amber-200/70 shadow-2xs space-y-2"
                                    >
                                      <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div className="flex items-center gap-2">
                                          <span className="font-bold text-xs text-slate-900">
                                            {nr.name}
                                          </span>
                                          <span
                                            className={`text-[10px] uppercase px-1.5 py-0.2 rounded border ${getUrgencyBadge(
                                              nr.urgency
                                            )}`}
                                          >
                                            {nr.urgency || 'Wysoki'}
                                          </span>
                                        </div>

                                        <button
                                          type="button"
                                          onClick={() => openAllocationModal(alert, nr)}
                                          className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer active:scale-95 ${
                                            isFulfilled
                                              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                              : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                                          }`}
                                        >
                                          <PackageCheck className="h-3.5 w-3.5" />
                                          <span>
                                            {isFulfilled ? '+ Dodaj więcej' : 'Przydziel zasoby'}
                                          </span>
                                        </button>
                                      </div>

                                      {/* Pasek postępu */}
                                      <div className="space-y-1">
                                        <div className="flex items-center justify-between text-[11px]">
                                          <span className="text-slate-500 font-medium">
                                            {isFulfilled ? (
                                              <span className="text-emerald-700 font-bold flex items-center gap-1">
                                                <CheckCircle2 className="h-3 w-3 inline" />
                                                Zabezpieczone w 100%
                                              </span>
                                            ) : (
                                              <span>
                                                Pozostało do zebrania:{' '}
                                                <strong className="text-amber-800">
                                                  {nr.quantityNeeded - allocCount} {nr.unit}
                                                </strong>
                                              </span>
                                            )}
                                          </span>
                                          <span className="font-mono font-bold text-slate-800">
                                            {allocCount} / {nr.quantityNeeded} {nr.unit} ({pct}%)
                                          </span>
                                        </div>

                                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200/60">
                                          <div
                                            className={`h-2 rounded-full transition-all duration-300 ${
                                              pct >= 100
                                                ? 'bg-emerald-500'
                                                : pct > 0
                                                ? 'bg-amber-500'
                                                : 'bg-slate-300'
                                            }`}
                                            style={{ width: `${pct}%` }}
                                          />
                                        </div>
                                      </div>

                                      {/* Historia przekazań jednostek */}
                                      {hasAllocations && (
                                        <div className="pt-1">
                                          <button
                                            type="button"
                                            onClick={() => toggleAllocationsHistory(historyKey)}
                                            className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition"
                                          >
                                            {isExpanded ? (
                                              <>
                                                <ChevronUp className="h-3 w-3" />
                                                <span>Ukryj historię przydziałów ({nr.allocations?.length})</span>
                                              </>
                                            ) : (
                                              <>
                                                <ChevronDown className="h-3 w-3" />
                                                <span>Pokaż kto przekazał ({nr.allocations?.length})</span>
                                              </>
                                            )}
                                          </button>

                                          {isExpanded && (
                                            <div className="mt-2 space-y-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200/70 text-[11px]">
                                              {nr.allocations?.map((alloc) => (
                                                <div
                                                  key={alloc.id}
                                                  className="flex items-center justify-between gap-2 border-b border-slate-200/60 pb-1 last:border-0 last:pb-0"
                                                >
                                                  <div>
                                                    <span className="font-bold text-slate-800">
                                                      {alloc.organizationName}
                                                    </span>
                                                    <span className="text-slate-400 ml-1">
                                                      ({alloc.userName})
                                                    </span>
                                                    {alloc.note && (
                                                      <span className="block text-slate-500 italic text-[10px]">
                                                        „{alloc.note}”
                                                      </span>
                                                    )}
                                                  </div>
                                                  <div className="text-right shrink-0">
                                                    <span className="font-mono font-bold text-emerald-700">
                                                      +{alloc.quantity} {nr.unit}
                                                    </span>
                                                    <span className="block text-[10px] text-slate-400">
                                                      {formatDate(alloc.allocatedAt)}
                                                    </span>
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            <div className="rounded-2xl bg-slate-50 p-3.5 border border-slate-200/70 text-xs text-slate-500 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <Info className="h-4 w-4 text-slate-400 shrink-0" />
                                <span>Brak zgłoszonego zapotrzebowania na sprzęt lub wsparcie.</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => openAddDemandModal(alert)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold border border-amber-200 transition cursor-pointer self-start sm:self-auto"
                              >
                                <Plus className="h-3.5 w-3.5" />
                                <span>Zgłoś zapotrzebowanie</span>
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Dolna belka: Autor, Przycisk na mapie & Czas */}
                        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-indigo-600">
                              <Building className="h-3.5 w-3.5" />
                            </div>
                            <div>
                              <div className="font-bold text-slate-800 flex items-center gap-1.5">
                                <span>{orgName}</span>
                                {orgType && (
                                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                                    {orgType}
                                  </span>
                                )}
                              </div>
                              {authorName && (
                                <div className="text-[11px] text-slate-400 flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  <span>{authorName}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => navigate(`/dashboard/operational/alerts/${alert.id}`)}
                              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-2xs hover:shadow-xs cursor-pointer active:scale-95"
                              title="Przejdź do wpisów, forum i szczegółów tego alertu"
                            >
                              <MessageSquare className="h-3.5 w-3.5 text-indigo-400" />
                              <span>Wpisy i Forum ({Array.isArray(alert.posts) ? alert.posts.length : 0})</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleFocusOnMap(alert)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition border border-indigo-200/60 shadow-2xs hover:shadow-xs cursor-pointer active:scale-95"
                              title="Zlokalizuj to zdarzenie na mapie"
                            >
                              <MapPin className="h-3.5 w-3.5 text-indigo-600" />
                              <span>Na mapie</span>
                            </button>

                            <div className="flex items-center gap-1.5 text-slate-500 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-100 font-mono text-[11px]">
                              <Calendar className="h-3.5 w-3.5 text-slate-400" />
                              <time dateTime={alert.createdAt}>{formatDate(alert.createdAt)}</time>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
};

export default OperationalAlertsPage;
