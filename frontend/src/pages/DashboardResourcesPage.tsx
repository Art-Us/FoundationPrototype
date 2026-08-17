import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import {
  Database,
  Plus,
  RefreshCw,
  Users,
  Droplets,
  Wrench,
  Package,
  Building,
  CheckCircle2,
  AlertTriangle,
  X,
  Send,
  Eye,
  Calendar,
  Layers,
  ArrowUp,
  ArrowDown,
  Filter,
} from 'lucide-react';

export type ResourceType = 'ludzie' | 'woda' | 'sprzet' | 'inne';
export type ResourceTimeframe = '24h' | '48h' | '72h' | 'tydzien';

interface ResourceItem {
  id: string;
  organizationId: string;
  type: ResourceType;
  subcategory?: string | null;
  quantity: number;
  timeframe: ResourceTimeframe;
  isActive: boolean;
  organization?: {
    id: string;
    name: string;
    type: 'samorzad' | 'sluzby' | 'ngo';
    municipalityId: string;
  };
  createdAt: string;
}

interface MatrixData {
  ludzie: Record<ResourceTimeframe, number>;
  woda: Record<ResourceTimeframe, number>;
  sprzet: Record<ResourceTimeframe, number>;
  inne: Record<ResourceTimeframe, number>;
}

const RESOURCE_TYPES_CONFIG: {
  key: ResourceType;
  label: string;
  shortName: string;
  description: string;
  unit: string;
  icon: React.ReactNode;
  color: string;
  bgChip: string;
  subcategoriesPreset: { name: string; desc: string }[];
}[] = [
  {
    key: 'ludzie',
    label: 'Ludzie (Personel / Wolontariusze)',
    shortName: 'Ludzie',
    description: 'Wykwalifikowana kadra ratownicza, psychologiczna, medyczna i wolontariat',
    unit: 'osób',
    icon: <Users className="h-4 w-4 text-purple-400" />,
    color: 'text-purple-400',
    bgChip: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
    subcategoriesPreset: [
      {
        name: 'Psycholodzy i wsparcie kryzysowe',
        desc: 'Interwencja kryzysowa, pomoc psychologiczna dla poszkodowanych i ratowników',
      },
      {
        name: 'Ratownicy medyczni i lekarze',
        desc: 'Pierwsza pomoc, triage medyczny, zabezpieczenie punktów medycznych',
      },
      {
        name: 'Strażacy OSP / Ratownicy techniczni',
        desc: 'Działania ratownicze, ewakuacja ludności, umacnianie wałów, obsługa pomp',
      },
      {
        name: 'Wolontariusze do segregacji i dystrybucji',
        desc: 'Sortowanie darów, wydawanie posiłków, logistyka magazynowa',
      },
      {
        name: 'Pracownicy administracyjno-terenowi',
        desc: 'Szacowanie strat, wydawanie zaświadczeń, koordynacja lokalna',
      },
      {
        name: 'Operatorzy ciężkiego sprzętu',
        desc: 'Kierowcy ciągników, operatorzy koparek, sprzętu załadunkowego',
      },
    ],
  },
  {
    key: 'woda',
    label: 'Woda Pitna (Zapas / Dystrybucja)',
    shortName: 'Woda',
    description: 'Zaopatrzenie w wodę zdatną do picia oraz mobilne punkty uzdatniania',
    unit: 'L (litrów)',
    icon: <Droplets className="h-4 w-4 text-cyan-400" />,
    color: 'text-cyan-400',
    bgChip: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20',
    subcategoriesPreset: [
      {
        name: 'Woda butelkowana (zgrzewki 5L)',
        desc: 'Gotowa do natychmiastowego wydania mieszkańcom i ewakuowanym',
      },
      {
        name: 'Woda butelkowana (zgrzewki 1.5L)',
        desc: 'Poręczne butelki dla patroli ratowniczych i punktów schronienia',
      },
      {
        name: 'Cysterny mobilne i zbiorniki DPX',
        desc: 'Mobilne punkty czerpalne wody dla całych osiedli lub wsi',
      },
      {
        name: 'Mobilne stacje uzdatniania wody',
        desc: 'Filtrowanie i dezynfekcja wody na miejscu katastrofy',
      },
    ],
  },
  {
    key: 'sprzet',
    label: 'Sprzęt (Pompy, Agregaty, Łodzie)',
    shortName: 'Sprzęt',
    description: 'Maszyny i urządzenia specjalistyczne wykorzystywane w akcjach ratowniczych',
    unit: 'szt.',
    icon: <Wrench className="h-4 w-4 text-amber-400" />,
    color: 'text-amber-400',
    bgChip: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
    subcategoriesPreset: [
      {
        name: 'Motopompy szlamowe wysokowydajne',
        desc: 'Odpompowywanie zalanych piwnic, obiektów użyteczności i pól',
      },
      {
        name: 'Agregaty prądotwórcze dużej mocy',
        desc: 'Zasilanie awaryjne szpitali, przepompowni i centrów dowodzenia',
      },
      {
        name: 'Łodzie płaskodenne i pontony ratownicze',
        desc: 'Ewakuacja odciętych mieszkańców i transport zaopatrzenia wodą',
      },
      {
        name: 'Drony poszukiwawcze z termowizją',
        desc: 'Monitoring z powietrza stanu rzek, wałów i lokalizacja poszkodowanych',
      },
      {
        name: 'Osuszacze budynków i nagrzewnice',
        desc: 'Usuwanie wilgoci z zalanych budynków mieszkalnych i szkół',
      },
    ],
  },
  {
    key: 'inne',
    label: 'Inne (Materiały, Logistyka, Medycyna)',
    shortName: 'Inne',
    description: 'Materiały przeciwpowodziowe, środki schronienia i medykamenty',
    unit: 'jedn.',
    icon: <Package className="h-4 w-4 text-emerald-400" />,
    color: 'text-emerald-400',
    bgChip: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
    subcategoriesPreset: [
      {
        name: 'Worki z piaskiem i rękawy przeciwpowodziowe',
        desc: 'Umacnianie i podwyższanie korony wałów przeciwpowodziowych',
      },
      {
        name: 'Łóżka polowe, koce termiczne i śpiwory',
        desc: 'Wyposażenie tymczasowych punktów noclegowych i hal schronienia',
      },
      {
        name: 'Pakiety pierwszej pomocy i leki OTC',
        desc: 'Bandaże, gazy, płyny odkażające, leki przeciwbólowe',
      },
      {
        name: 'Żywność długoterminowa i racje suchy prowiant',
        desc: 'Konserwy, batony energetyczne, posiłki samopodgrzewające',
      },
    ],
  },
];

const TIMEFRAMES_CONFIG: {
  key: ResourceTimeframe;
  label: string;
  subLabel: string;
  headerBg: string;
}[] = [
  {
    key: '24h',
    label: '24h',
    subLabel: 'Natychmiastowe',
    headerBg: 'bg-red-500/10 text-red-300 border-red-500/20',
  },
  {
    key: '48h',
    label: '48h',
    subLabel: 'Krótkoterminowe',
    headerBg: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  },
  {
    key: '72h',
    label: '72h',
    subLabel: 'Średnioterminowe',
    headerBg: 'bg-teal-500/10 text-teal-300 border-teal-500/20',
  },
  {
    key: 'tydzien',
    label: 'Tydzień',
    subLabel: 'Długoterminowe',
    headerBg: 'bg-blue-500/10 text-blue-300 border-blue-500/20',
  },
];

type CategoryFilter = 'all' | ResourceType;
type SubSortField = 'name' | 'quantity' | 'owner';
type SubSortDirection = 'asc' | 'desc';

export const DashboardResourcesPage: React.FC = () => {
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filtrowanie według kategorii: 'all' (Główna tabela jak dawniej) lub 'ludzie' / 'woda' / 'sprzet' / 'inne'
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all');

  // Filtrowanie według posiadacza (Organizacji): 'all' lub ID konkretnej organizacji
  const [selectedOrganizationFilter, setSelectedOrganizationFilter] = useState<string>('all');

  // Sortowanie podkategorii w widoku szczegółowym
  const [subSortField, setSubSortField] = useState<SubSortField>('name');
  const [subSortDirection, setSubSortDirection] = useState<SubSortDirection>('asc');

  // Modal zgłaszania zasobu
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formType, setFormType] = useState<ResourceType>('ludzie');
  const [formSubcategory, setFormSubcategory] = useState<string>('');
  const [customSubcategory, setCustomSubcategory] = useState<string>('');
  const [formQuantity, setFormQuantity] = useState<string>('');
  const [formTimeframe, setFormTimeframe] = useState<ResourceTimeframe>('24h');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal szczegółów komórki
  const [selectedCell, setSelectedCell] = useState<{
    type: ResourceType;
    subcategory?: string | null;
    timeframe: ResourceTimeframe;
  } | null>(null);

  // Toast powiadomień
  const [toast, setToast] = useState<{
    id: number;
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToast({ id, type, message });
    setTimeout(() => {
      setToast((curr) => (curr?.id === id ? null : curr));
    }, 4500);
  };

  const fetchResources = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/resources/my-municipality');
      if (res.data.success) {
        setResources(res.data.resources || []);
      }
    } catch (error: any) {
      console.error('Błąd pobierania matrycy zasobów:', error);
      showToast(
        error.response?.data?.message || 'Nie udało się pobrać matrycy zasobów.',
        'error'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, []);

  // Lista unikalnych organizacji do dropdownu filtra posiadacza
  const availableOrganizations = useMemo(() => {
    const map = new Map<string, { id: string; name: string; type?: string }>();
    resources.forEach((r) => {
      if (r.organization) {
        map.set(r.organization.id, {
          id: r.organization.id,
          name: r.organization.name,
          type: r.organization.type,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'pl'));
  }, [resources]);

  // Zasoby przefiltrowane według wybranego posiadacza (Organizacji)
  const filteredByOrgResources = useMemo(() => {
    if (selectedOrganizationFilter === 'all') return resources;
    return resources.filter((r) => r.organizationId === selectedOrganizationFilter);
  }, [resources, selectedOrganizationFilter]);

  // Obliczenie macierzy z przefiltrowanych zasobów dla tabeli głównej
  const effectiveMatrix = useMemo(() => {
    const mat: MatrixData = {
      ludzie: { '24h': 0, '48h': 0, '72h': 0, tydzien: 0 },
      woda: { '24h': 0, '48h': 0, '72h': 0, tydzien: 0 },
      sprzet: { '24h': 0, '48h': 0, '72h': 0, tydzien: 0 },
      inne: { '24h': 0, '48h': 0, '72h': 0, tydzien: 0 },
    };

    filteredByOrgResources.forEach((res) => {
      if (mat[res.type] && mat[res.type][res.timeframe] !== undefined) {
        mat[res.type][res.timeframe] += res.quantity;
      }
    });

    return mat;
  }, [filteredByOrgResources]);

  // Obsługa zgłaszania zasobów (POST /api/resources)
  const handleCreateResource = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(formQuantity, 10);
    if (isNaN(qty) || qty <= 0) {
      showToast('Wprowadź prawidłową dodatnią ilość zasobu.', 'error');
      return;
    }

    const finalSubcategory =
      formSubcategory === '__custom__'
        ? customSubcategory.trim()
        : formSubcategory || undefined;

    setIsSubmitting(true);
    try {
      const res = await api.post('/resources', {
        type: formType,
        subcategory: finalSubcategory,
        quantity: qty,
        timeframe: formTimeframe,
      });

      if (res.data.success) {
        showToast('Zasób został pomyślnie zgłoszony i dodany do matrycy!');
        setIsModalOpen(false);
        setFormQuantity('');
        setCustomSubcategory('');
        fetchResources();
      }
    } catch (error: any) {
      showToast(
        error.response?.data?.message || 'Wystąpił błąd podczas dodawania zasobu.',
        'error'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Obliczenie listy podkategorii wraz z wyjaśnieniem, sumami i posiadaczami dla wybranej kategorii i organizacji
  const subcategoryListForSelected = useMemo(() => {
    if (selectedCategory === 'all') return [];

    const currentCfg = RESOURCE_TYPES_CONFIG.find((c) => c.key === selectedCategory);
    if (!currentCfg) return [];

    // Mapowanie zgłoszeń z uwzględnieniem filtra posiadacza
    const categoryResources = filteredByOrgResources.filter(
      (r) => r.type === selectedCategory
    );

    const subMap = new Map<
      string,
      {
        name: string;
        description: string;
        quantities: Record<ResourceTimeframe, number>;
        owners: { name: string; type: string; quantity: number; timeframe: string }[];
        total: number;
      }
    >();

    // 1. Inicjalizacja domyślnych podkategorii
    currentCfg.subcategoriesPreset.forEach((preset) => {
      subMap.set(preset.name, {
        name: preset.name,
        description: preset.desc,
        quantities: { '24h': 0, '48h': 0, '72h': 0, tydzien: 0 },
        owners: [],
        total: 0,
      });
    });

    // 2. Dodanie rzeczywistych danych z bazy
    categoryResources.forEach((res) => {
      const subName = res.subcategory || 'Standardowe / Niesklasyfikowane';
      if (!subMap.has(subName)) {
        subMap.set(subName, {
          name: subName,
          description: 'Zasoby zadeklarowane przez jednostkę operacyjną',
          quantities: { '24h': 0, '48h': 0, '72h': 0, tydzien: 0 },
          owners: [],
          total: 0,
        });
      }

      const entry = subMap.get(subName)!;
      if (entry.quantities[res.timeframe] !== undefined) {
        entry.quantities[res.timeframe] += res.quantity;
      }
      entry.total += res.quantity;

      if (res.organization?.name) {
        entry.owners.push({
          name: res.organization.name,
          type: res.organization.type || '',
          quantity: res.quantity,
          timeframe: res.timeframe,
        });
      }
    });

    let list = Array.from(subMap.values());

    // Sortowanie podkategorii
    list.sort((a, b) => {
      let cmp = 0;
      if (subSortField === 'name') {
        cmp = a.name.localeCompare(b.name, 'pl');
      } else if (subSortField === 'quantity') {
        cmp = a.total - b.total;
      } else if (subSortField === 'owner') {
        const ownerA = a.owners[0]?.name || '';
        const ownerB = b.owners[0]?.name || '';
        cmp = ownerA.localeCompare(ownerB, 'pl');
      }
      return subSortDirection === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [selectedCategory, filteredByOrgResources, subSortField, subSortDirection]);

  // Zasoby przefiltrowane dla klikniętej komórki (drill-down modal)
  const cellDetailResources = useMemo(() => {
    if (!selectedCell) return [];
    return filteredByOrgResources.filter((r) => {
      const matchType = r.type === selectedCell.type;
      const matchTime = r.timeframe === selectedCell.timeframe;
      if (selectedCell.subcategory) {
        const sub = r.subcategory || 'Standardowe / Niesklasyfikowane';
        return matchType && matchTime && sub === selectedCell.subcategory;
      }
      return matchType && matchTime;
    });
  }, [selectedCell, filteredByOrgResources]);

  // Sumy ogólne do kafelków KPI (zależne od filtra posiadacza)
  const totalStats = useMemo(() => {
    let people = 0;
    let water = 0;
    let equipment = 0;
    let other = 0;

    Object.values(effectiveMatrix.ludzie || {}).forEach((v) => (people += v));
    Object.values(effectiveMatrix.woda || {}).forEach((v) => (water += v));
    Object.values(effectiveMatrix.sprzet || {}).forEach((v) => (equipment += v));
    Object.values(effectiveMatrix.inne || {}).forEach((v) => (other += v));

    return { people, water, equipment, other };
  }, [effectiveMatrix]);

  const activeConfig =
    selectedCategory !== 'all'
      ? RESOURCE_TYPES_CONFIG.find((c) => c.key === selectedCategory)
      : null;

  const selectedOrgName =
    selectedOrganizationFilter !== 'all'
      ? availableOrganizations.find((o) => o.id === selectedOrganizationFilter)?.name
      : null;

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
              <CheckCircle2 className="h-5 w-5 shrink-0" />
            ) : (
              <AlertTriangle className="h-5 w-5 shrink-0" />
            )}
            <span>{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-2 hover:opacity-75">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Nagłówek i przyciski akcji */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-teal-400 font-semibold text-xs tracking-wider uppercase mb-1">
            <Database className="h-4 w-4" />
            <span>Matryca Logistyczna • Dostępność i Filtrowanie Posiadaczy</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Matryca Zasobów Ratunkowych
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {selectedOrgName
              ? `Wyświetlanie zasobów należących wyłącznie do: ${selectedOrgName}`
              : 'Zagregowana dostępność zasobów według horyzontu czasowego (24h, 48h, 72h, Tydzień)'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchResources}
            disabled={isLoading}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700/60 transition shadow-sm"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Odśwież</span>
          </button>

          <button
            onClick={() => {
              setFormSubcategory(RESOURCE_TYPES_CONFIG[0].subcategoriesPreset[0].name);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-teal-500 hover:from-brand-500 hover:to-teal-400 text-white text-xs font-bold shadow-lg shadow-brand-500/25 border border-brand-400/30 transition transform active:scale-95"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            <span>Zgłoś zasoby</span>
          </button>
        </div>
      </div>

      {/* Kafelki KPI podsumowania */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-slate-800/80 p-5 border border-purple-500/20 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase mb-2">
            <span>Ludzie (Łącznie)</span>
            <Users className="h-4 w-4 text-purple-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white">
            {totalStats.people.toLocaleString('pl-PL')}{' '}
            <span className="text-xs font-normal text-purple-300">osób</span>
          </div>
        </div>

        <div className="rounded-2xl bg-slate-800/80 p-5 border border-cyan-500/20 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase mb-2">
            <span>Woda Pitna</span>
            <Droplets className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white">
            {totalStats.water.toLocaleString('pl-PL')}{' '}
            <span className="text-xs font-normal text-cyan-300">L</span>
          </div>
        </div>

        <div className="rounded-2xl bg-slate-800/80 p-5 border border-amber-500/20 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase mb-2">
            <span>Sprzęt Ratunkowy</span>
            <Wrench className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white">
            {totalStats.equipment.toLocaleString('pl-PL')}{' '}
            <span className="text-xs font-normal text-amber-300">szt.</span>
          </div>
        </div>

        <div className="rounded-2xl bg-slate-800/80 p-5 border border-emerald-500/20 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase mb-2">
            <span>Inne Materiały</span>
            <Package className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white">
            {totalStats.other.toLocaleString('pl-PL')}{' '}
            <span className="text-xs font-normal text-emerald-300">jedn.</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PASEK FILTROWANIA KATEGORII ORAZ POSIADACZA ZASOBÓW (ORGANIZACJI)        */}
      {/* ========================================================================= */}
      <div className="rounded-2xl bg-slate-800/80 p-3.5 border border-slate-700/70 shadow-lg flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Filtry Kategorii */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-400 flex items-center gap-1 mr-1">
            <Filter className="h-3.5 w-3.5 text-brand-400" />
            <span>Kategoria:</span>
          </span>

          <button
            onClick={() => setSelectedCategory('all')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              selectedCategory === 'all'
                ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30 ring-1 ring-brand-400'
                : 'bg-slate-900/90 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Wszystkie</span>
          </button>

          {RESOURCE_TYPES_CONFIG.map((cfg) => (
            <button
              key={cfg.key}
              onClick={() => setSelectedCategory(cfg.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                selectedCategory === cfg.key
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30 ring-1 ring-brand-400'
                  : 'bg-slate-900/90 text-slate-300 hover:text-white hover:bg-slate-700 border border-slate-700'
              }`}
            >
              {cfg.icon}
              <span>{cfg.shortName}</span>
            </button>
          ))}
        </div>

        {/* Filtr Posiadacza (Organizacji) */}
        <div className="flex items-center gap-2.5 shrink-0">
          <span className="text-xs font-bold text-slate-400 flex items-center gap-1">
            <Building className="h-3.5 w-3.5 text-teal-400" />
            <span>Posiadacz zasobu:</span>
          </span>

          <select
            value={selectedOrganizationFilter}
            onChange={(e) => setSelectedOrganizationFilter(e.target.value)}
            className="rounded-xl bg-slate-900 border border-slate-700 py-1.5 px-3 text-xs text-white focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 max-w-[220px] sm:max-w-[280px] font-semibold"
          >
            <option value="all">Wszystkie organizacje ({availableOrganizations.length})</option>
            {availableOrganizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name} {org.type ? `(${org.type.toUpperCase()})` : ''}
              </option>
            ))}
          </select>

          {selectedOrganizationFilter !== 'all' && (
            <button
              onClick={() => setSelectedOrganizationFilter('all')}
              title="Wyczyść filtr organizacji"
              className="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. WIDOK GŁÓWNY: CZYSTA TABELA OGÓLNA (ALL)                             */}
      {/* ========================================================================= */}
      {selectedCategory === 'all' && (
        <div className="rounded-3xl bg-slate-800/90 shadow-2xl backdrop-blur-xl border border-slate-700/80 overflow-hidden">
          <div className="border-b border-slate-700/80 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-slate-850">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-brand-400" />
              <h2 className="text-base font-bold text-white">
                Tabela Dostępności Zasobów według Horyzontu Czasowego
              </h2>
            </div>
            <span className="text-xs text-slate-400 flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5 text-slate-400" />
              <span>Kliknij w komórkę, aby zobaczyć deklarujące jednostki</span>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left font-mono">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-900/90 text-xs uppercase tracking-wider text-slate-400 font-sans">
                  <th className="py-4 px-6 font-bold w-1/3 border-r border-slate-800">
                    Typ Zasobu
                  </th>
                  {TIMEFRAMES_CONFIG.map((tf) => (
                    <th
                      key={tf.key}
                      className="py-4 px-4 text-center font-bold border-r border-slate-800 last:border-r-0"
                    >
                      <div className="flex flex-col items-center">
                        <span className="text-base font-black text-white">{tf.label}</span>
                        <span className="text-[10px] text-slate-400 font-normal tracking-normal">
                          {tf.subLabel}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800 text-sm font-sans">
                {RESOURCE_TYPES_CONFIG.map((resType) => (
                  <tr
                    key={resType.key}
                    className="hover:bg-slate-700/30 transition duration-150 group"
                  >
                    {/* Typ zasobu */}
                    <td className="py-4 px-6 border-r border-slate-800/80 bg-slate-850/40">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 border border-slate-700 group-hover:scale-105 transition">
                          {resType.icon}
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm">
                            {resType.label}
                          </div>
                          <div className="text-xs text-slate-400 font-mono">
                            Jednostka: {resType.unit}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Komórki 24h, 48h, 72h, Tydzień */}
                    {TIMEFRAMES_CONFIG.map((tf) => {
                      const quantity = effectiveMatrix[resType.key]?.[tf.key] || 0;
                      const isSelected =
                        selectedCell?.type === resType.key &&
                        selectedCell?.timeframe === tf.key;

                      return (
                        <td
                          key={tf.key}
                          onClick={() =>
                            setSelectedCell({ type: resType.key, timeframe: tf.key })
                          }
                          className={`p-3 text-center border-r border-slate-800/80 last:border-r-0 cursor-pointer transition select-none ${
                            isSelected
                              ? 'bg-brand-500/20 ring-2 ring-inset ring-brand-500'
                              : 'hover:bg-slate-750'
                          }`}
                        >
                          {isLoading ? (
                            <div className="h-8 w-16 mx-auto bg-slate-700 rounded-lg animate-pulse"></div>
                          ) : quantity > 0 ? (
                            <div
                              className={`inline-flex flex-col items-center justify-center min-w-[5.5rem] py-2 px-3 rounded-xl border font-mono font-bold text-base transition transform group-hover:scale-105 ${resType.bgChip}`}
                            >
                              <span>{quantity.toLocaleString('pl-PL')}</span>
                              <span className="text-[10px] font-sans font-normal opacity-80">
                                {resType.unit}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-600 font-mono text-lg font-light">-</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. WIDOK FILTROWANY: TYLKO WYBRANA KATEGORIA ZE SZCZEGÓŁOWYM WYJAŚNIENIEM */}
      {/* ========================================================================= */}
      {selectedCategory !== 'all' && activeConfig && (
        <div className="rounded-3xl bg-slate-800/90 shadow-2xl backdrop-blur-xl border border-slate-700/80 overflow-hidden space-y-4 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-700">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 border border-slate-700">
                  {activeConfig.icon}
                </div>
                <h2 className="text-lg font-bold text-white">
                  Szczegółowe Zestawienie Specjalizacji: {activeConfig.label}
                </h2>
              </div>
              <p className="text-xs text-slate-400">
                {activeConfig.description} • Jednostka miary: <strong>{activeConfig.unit}</strong>
              </p>
            </div>

            {/* Sortowanie wewnątrz wybranej kategorii */}
            <div className="flex items-center gap-2 bg-slate-900 p-1.5 rounded-xl border border-slate-700 text-xs">
              <span className="text-slate-400 font-semibold pl-2">Sortuj po:</span>
              <button
                onClick={() => {
                  if (subSortField === 'name') {
                    setSubSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
                  } else {
                    setSubSortField('name');
                    setSubSortDirection('asc');
                  }
                }}
                className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 ${
                  subSortField === 'name' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>Nazwa</span>
                {subSortField === 'name' && (subSortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
              </button>

              <button
                onClick={() => {
                  if (subSortField === 'quantity') {
                    setSubSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
                  } else {
                    setSubSortField('quantity');
                    setSubSortDirection('desc');
                  }
                }}
                className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 ${
                  subSortField === 'quantity' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>Ilość</span>
                {subSortField === 'quantity' && (subSortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
              </button>

              <button
                onClick={() => {
                  if (subSortField === 'owner') {
                    setSubSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
                  } else {
                    setSubSortField('owner');
                    setSubSortDirection('asc');
                  }
                }}
                className={`px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1 ${
                  subSortField === 'owner' ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>Posiadacz</span>
                {subSortField === 'owner' && (subSortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-sans text-sm">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-900/90 text-xs uppercase tracking-wider text-slate-400 font-semibold">
                  <th className="py-3.5 px-4 w-1/3">Rodzaj / Specjalizacja i Wyjaśnienie</th>
                  <th className="py-3.5 px-3 text-center">24h</th>
                  <th className="py-3.5 px-3 text-center">48h</th>
                  <th className="py-3.5 px-3 text-center">72h</th>
                  <th className="py-3.5 px-3 text-center">Tydzień</th>
                  <th className="py-3.5 px-4 text-right">Zgłaszający Posiadacze</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-700/60">
                {subcategoryListForSelected.map((item) => {
                  return (
                    <tr
                      key={item.name}
                      className="hover:bg-slate-750/40 transition duration-150 group"
                    >
                      {/* Nazwa i Wyjaśnienie podkategorii */}
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <div className="font-bold text-white text-sm group-hover:text-brand-400 transition">
                            {item.name}
                          </div>
                          <div className="text-xs text-slate-400 leading-relaxed">
                            {item.description}
                          </div>
                        </div>
                      </td>

                      {/* Komórki 24h, 48h, 72h, Tydzień dla danej podkategorii */}
                      {TIMEFRAMES_CONFIG.map((tf) => {
                        const subQty = item.quantities[tf.key];
                        return (
                          <td
                            key={tf.key}
                            onClick={() =>
                              setSelectedCell({
                                type: selectedCategory as ResourceType,
                                subcategory: item.name,
                                timeframe: tf.key,
                              })
                            }
                            className="py-3 px-3 text-center cursor-pointer hover:bg-slate-700/40 transition select-none font-mono"
                          >
                            {subQty > 0 ? (
                              <span className="inline-block px-2.5 py-1 rounded-lg bg-slate-900 text-brand-300 font-bold border border-slate-700 text-xs hover:border-brand-500">
                                {subQty.toLocaleString('pl-PL')} {activeConfig.unit}
                              </span>
                            ) : (
                              <span className="text-slate-700 text-xs font-light">-</span>
                            )}
                          </td>
                        );
                      })}

                      {/* Zgłaszający Posiadacze (Organizacja) */}
                      <td className="py-4 px-4 text-right">
                        {item.owners.length === 0 ? (
                          <span className="text-xs text-slate-500 italic">Brak deklaracji</span>
                        ) : (
                          <div className="flex flex-col items-end gap-1">
                            {Array.from(new Set(item.owners.map((o) => o.name))).map((ownerName) => (
                              <span
                                key={ownerName}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-900 text-slate-200 border border-slate-700"
                              >
                                <Building className="h-3 w-3 text-brand-400" />
                                <span>{ownerName}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. MODAL / SZCZEGÓŁY WYBRANEJ KOMÓRKI MATRYCY                           */}
      {/* ========================================================================= */}
      {selectedCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-xl rounded-3xl bg-slate-850 p-6 sm:p-8 shadow-2xl border border-slate-700 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-700 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
                  <Database className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    Szczegóły zgłoszeń:{' '}
                    {RESOURCE_TYPES_CONFIG.find((c) => c.key === selectedCell.type)?.label}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {selectedCell.subcategory && (
                      <span className="text-brand-300 font-semibold mr-2">
                        [{selectedCell.subcategory}]
                      </span>
                    )}
                    Horyzont: <strong className="text-brand-400">{selectedCell.timeframe.toUpperCase()}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCell(null)}
                className="rounded-xl p-2 text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {cellDetailResources.length === 0 ? (
              <div className="py-8 text-center text-slate-400 space-y-2">
                <Package className="h-8 w-8 text-slate-600 mx-auto" />
                <p className="text-sm">Brak aktywnych zgłoszeń dla tego przedziału czasowego.</p>
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-700/60 pr-1">
                {cellDetailResources.map((item) => (
                  <div key={item.id} className="py-3.5 flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-brand-400 shrink-0" />
                        <span className="font-bold text-white text-sm">
                          {item.organization?.name || 'Organizacja'}
                        </span>
                        {item.organization?.type && (
                          <span className="text-[10px] font-bold uppercase bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">
                            {item.organization.type}
                          </span>
                        )}
                      </div>
                      {item.subcategory && (
                        <div className="text-xs text-teal-300 font-medium">
                          Specjalizacja: {item.subcategory}
                        </div>
                      )}
                      <div className="text-xs text-slate-400 flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>Zgłoszono: {new Date(item.createdAt).toLocaleString('pl-PL')}</span>
                      </div>
                    </div>

                    <div className="text-right font-mono font-bold text-base text-brand-400 bg-brand-500/10 px-3 py-1.5 rounded-xl border border-brand-500/20 shrink-0">
                      +{item.quantity.toLocaleString('pl-PL')}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedCell(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold transition"
              >
                Zamknij
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MODAL / DIALOG FORMULARZA "ZGŁOŚ ZASOBY"                              */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-slate-850 p-6 sm:p-8 shadow-2xl border border-slate-700 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-700 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
                  <Plus className="h-6 w-6 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Zgłoś Zasoby do Matrycy</h3>
                  <p className="text-xs text-slate-400">
                    Wprowadź szczegółowe informacje o dostępnym personelu lub sprzęcie
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl p-2 text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateResource} className="space-y-4">
              {/* Wybór typu zasobu */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Główna kategoria zasobu
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {RESOURCE_TYPES_CONFIG.map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => {
                        setFormType(t.key);
                        setFormSubcategory(t.subcategoriesPreset[0]?.name || '');
                      }}
                      className={`flex items-center gap-2.5 p-3 rounded-xl border text-left text-xs font-bold transition ${
                        formType === t.key
                          ? 'bg-brand-600/20 border-brand-500 text-white ring-1 ring-brand-500'
                          : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      {t.icon}
                      <span className="truncate">{t.label.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Wybór / Wpisanie podkategorii (Pogłębianie) */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Rodzaj / Specjalizacja (np. Psycholog, Motopompy)
                </label>
                <select
                  value={formSubcategory}
                  onChange={(e) => setFormSubcategory(e.target.value)}
                  className="w-full rounded-xl bg-slate-900/90 border border-slate-700 py-2.5 px-3 text-white text-xs focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition mb-2"
                >
                  {RESOURCE_TYPES_CONFIG.find((t) => t.key === formType)?.subcategoriesPreset.map(
                    (sub) => (
                      <option key={sub.name} value={sub.name}>
                        {sub.name}
                      </option>
                    )
                  )}
                  <option value="__custom__">➕ Wpisz inną / własną specjalizację...</option>
                </select>

                {formSubcategory === '__custom__' && (
                  <input
                    type="text"
                    required
                    value={customSubcategory}
                    onChange={(e) => setCustomSubcategory(e.target.value)}
                    placeholder="Wpisz nazwę specjalizacji lub sprzętu (np. Psychoterapeuci traumy)..."
                    className="w-full rounded-xl bg-slate-900/90 border border-brand-500/50 py-2 px-3 text-white placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/30 transition"
                  />
                )}
              </div>

              {/* Ilość */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Ilość ({RESOURCE_TYPES_CONFIG.find((t) => t.key === formType)?.unit})
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formQuantity}
                  onChange={(e) => setFormQuantity(e.target.value)}
                  placeholder="np. 15"
                  className="w-full rounded-xl bg-slate-900/90 border border-slate-700 py-2.5 px-4 text-white placeholder-slate-500 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition font-mono font-bold"
                />
              </div>

              {/* Horyzont czasowy */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Czas dostarczenia / gotowości
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {TIMEFRAMES_CONFIG.map((tf) => (
                    <button
                      key={tf.key}
                      type="button"
                      onClick={() => setFormTimeframe(tf.key)}
                      className={`py-2 px-1.5 rounded-xl border text-center text-xs font-bold transition ${
                        formTimeframe === tf.key
                          ? 'bg-brand-600 border-brand-500 text-white ring-1 ring-brand-500 shadow-md shadow-brand-600/20'
                          : 'bg-slate-900/80 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div>{tf.label}</div>
                      <div className="text-[9px] font-normal opacity-75">{tf.subLabel}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !formQuantity}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-teal-500 hover:from-brand-500 hover:to-teal-400 text-white text-xs font-bold shadow-lg shadow-brand-500/25 transition disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      <span>Dodawanie...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-3.5 w-3.5" />
                      <span>Zgłoś do matrycy</span>
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
