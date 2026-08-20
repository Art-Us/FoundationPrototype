import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import {
  Database,
  Plus,
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
  Layers3,
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
  iconBg: string;
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
    icon: <Users className="h-5 w-5 text-purple-600" />,
    iconBg: 'bg-purple-50 text-purple-600',
    color: 'text-purple-600',
    bgChip: 'bg-purple-50 text-purple-700 border-purple-200',
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
    icon: <Droplets className="h-5 w-5 text-cyan-600" />,
    iconBg: 'bg-cyan-50 text-cyan-600',
    color: 'text-cyan-600',
    bgChip: 'bg-cyan-50 text-cyan-700 border-cyan-200',
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
    icon: <Wrench className="h-5 w-5 text-amber-600" />,
    iconBg: 'bg-amber-50 text-amber-600',
    color: 'text-amber-600',
    bgChip: 'bg-amber-50 text-amber-700 border-amber-200',
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
    icon: <Package className="h-5 w-5 text-emerald-600" />,
    iconBg: 'bg-emerald-50 text-emerald-600',
    color: 'text-emerald-600',
    bgChip: 'bg-emerald-50 text-emerald-700 border-emerald-200',
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
}[] = [
  {
    key: '24h',
    label: '24h',
    subLabel: 'Natychmiastowe',
  },
  {
    key: '48h',
    label: '48h',
    subLabel: 'Krótkoterminowe',
  },
  {
    key: '72h',
    label: '72h',
    subLabel: 'Średnioterminowe',
  },
  {
    key: 'tydzien',
    label: 'Tydzień',
    subLabel: 'Długoterminowe',
  },
];

type CategoryFilter = 'all' | ResourceType;
type SubSortField = 'name' | 'quantity' | 'owner';
type SubSortDirection = 'asc' | 'desc';

export const DashboardResourcesPage: React.FC = () => {
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filtrowanie według kategorii: 'all' lub 'ludzie' / 'woda' / 'sprzet' / 'inne'
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all');

  // Filtrowanie według posiadacza (Organizacji)
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

  // Lista unikalnych organizacji do filtra
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

  // Zasoby przefiltrowane po organizacji
  const filteredByOrgResources = useMemo(() => {
    if (selectedOrganizationFilter === 'all') return resources;
    return resources.filter((r) => r.organizationId === selectedOrganizationFilter);
  }, [resources, selectedOrganizationFilter]);

  // Obliczenie macierzy z przefiltrowanych zasobów
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

  // Zgłaszanie zasobów
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

  // Podkategorie wybranej kategorii
  const subcategoryListForSelected = useMemo(() => {
    if (selectedCategory === 'all') return [];

    const currentCfg = RESOURCE_TYPES_CONFIG.find((c) => c.key === selectedCategory);
    if (!currentCfg) return [];

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

    // 1. Domyślne podkategorie
    currentCfg.subcategoriesPreset.forEach((preset) => {
      subMap.set(preset.name, {
        name: preset.name,
        description: preset.desc,
        quantities: { '24h': 0, '48h': 0, '72h': 0, tydzien: 0 },
        owners: [],
        total: 0,
      });
    });

    // 2. Dane rzeczywiste
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

  // Szczegóły klikniętej komórki
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

  // Sumy ogólne do kafelków KPI
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
            <button onClick={() => setToast(null)} className="ml-2 hover:opacity-75">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Nagłówek i przyciski akcji */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 font-semibold text-xs tracking-wider uppercase mb-1">
            <Database className="h-4 w-4" />
            <span>Matryca Logistyczna • Dostępność i Filtrowanie Posiadaczy</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Matryca Zasobów Ratunkowych
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {selectedOrgName
              ? `Wyświetlanie zasobów należących wyłącznie do: ${selectedOrgName}`
              : 'Dostępność zasobów w horyzontach czasowych (24h, 48h, 72h, Tydzień)'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setFormSubcategory(RESOURCE_TYPES_CONFIG[0].subcategoriesPreset[0].name);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm shadow-indigo-600/25 transition transform active:scale-95"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            <span>Zgłoś zasoby</span>
          </button>
        </div>
      </div>

      {/* Kafelki KPI w stylu Metoxi (Pastelowe okrągłe kontenery ikon) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Ludzie */}
        <div className="rounded-3xl bg-white p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Ludzie (Łącznie)
            </span>
            <div className="text-2xl font-black text-slate-900">
              {totalStats.people.toLocaleString('pl-PL')}{' '}
              <span className="text-xs font-normal text-slate-500">osób</span>
            </div>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 shadow-xs shrink-0">
            <Users className="h-6 w-6" />
          </div>
        </div>

        {/* Woda */}
        <div className="rounded-3xl bg-white p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Woda Pitna
            </span>
            <div className="text-2xl font-black text-slate-900">
              {totalStats.water.toLocaleString('pl-PL')}{' '}
              <span className="text-xs font-normal text-slate-500">L</span>
            </div>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-600 shadow-xs shrink-0">
            <Droplets className="h-6 w-6" />
          </div>
        </div>

        {/* Sprzęt */}
        <div className="rounded-3xl bg-white p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Sprzęt Ratunkowy
            </span>
            <div className="text-2xl font-black text-slate-900">
              {totalStats.equipment.toLocaleString('pl-PL')}{' '}
              <span className="text-xs font-normal text-slate-500">szt.</span>
            </div>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 shadow-xs shrink-0">
            <Wrench className="h-6 w-6" />
          </div>
        </div>

        {/* Inne */}
        <div className="rounded-3xl bg-white p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Inne Materiały
            </span>
            <div className="text-2xl font-black text-slate-900">
              {totalStats.other.toLocaleString('pl-PL')}{' '}
              <span className="text-xs font-normal text-slate-500">jedn.</span>
            </div>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 shadow-xs shrink-0">
            <Package className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Pasek filtrowania kategorii oraz posiadacza zasobów */}
      <div className="rounded-3xl bg-white p-4 border border-slate-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Filtry Kategorii */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-400 flex items-center gap-1 mr-1">
            <Filter className="h-3.5 w-3.5 text-indigo-600" />
            <span>Kategoria:</span>
          </span>

          <button
            onClick={() => setSelectedCategory('all')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
              selectedCategory === 'all'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            <span>Wszystkie</span>
          </button>

          {RESOURCE_TYPES_CONFIG.map((cfg) => (
            <button
              key={cfg.key}
              onClick={() => setSelectedCategory(cfg.key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition ${
                selectedCategory === cfg.key
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70'
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
            <Building className="h-3.5 w-3.5 text-teal-600" />
            <span>Posiadacz zasobu:</span>
          </span>

          <select
            value={selectedOrganizationFilter}
            onChange={(e) => setSelectedOrganizationFilter(e.target.value)}
            className="rounded-xl bg-slate-50 border border-slate-200 py-2 px-3 text-xs text-slate-800 focus:bg-white focus:border-indigo-500 focus:outline-none max-w-[220px] sm:max-w-[280px] font-semibold"
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
              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition"
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
        <div className="rounded-3xl bg-white shadow-xs border border-slate-200/80 overflow-hidden">
          <div className="border-b border-slate-100 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 bg-slate-50/50">
            <div className="flex items-center gap-2">
              <Layers3 className="h-5 w-5 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900">
                Tabela Dostępności Zasobów według Horyzontu Czasowego
              </h2>
            </div>
            <span className="text-xs text-slate-400 flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5 text-slate-400" />
              <span>Kliknij w komórkę, aby zobaczyć zadeklarowane jednostki</span>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                  <th className="py-3.5 px-6 w-1/3 border-r border-slate-100">
                    Typ Zasobu
                  </th>
                  {TIMEFRAMES_CONFIG.map((tf) => (
                    <th
                      key={tf.key}
                      className="py-3.5 px-4 text-center font-bold border-r border-slate-100 last:border-r-0"
                    >
                      <div className="flex flex-col items-center">
                        <span className="text-sm font-black text-slate-900">{tf.label}</span>
                        <span className="text-[10px] text-slate-400 font-normal tracking-normal">
                          {tf.subLabel}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-sm">
                {RESOURCE_TYPES_CONFIG.map((resType) => (
                  <tr
                    key={resType.key}
                    className="hover:bg-slate-50/60 transition duration-150 group"
                  >
                    {/* Typ zasobu */}
                    <td className="py-4 px-6 border-r border-slate-100 bg-slate-50/30">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-2xl ${resType.iconBg} shadow-xs`}>
                          {resType.icon}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm">
                            {resType.label}
                          </div>
                          <div className="text-xs text-slate-400">
                            Jednostka miary: <strong>{resType.unit}</strong>
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
                          className={`p-3 text-center border-r border-slate-100 last:border-r-0 cursor-pointer transition select-none ${
                            isSelected
                              ? 'bg-indigo-50 ring-2 ring-inset ring-indigo-500'
                              : 'hover:bg-slate-50'
                          }`}
                        >
                          {isLoading ? (
                            <div className="h-8 w-16 mx-auto bg-slate-100 rounded-xl animate-pulse"></div>
                          ) : quantity > 0 ? (
                            <div
                              className={`inline-flex flex-col items-center justify-center min-w-[5.5rem] py-2 px-3 rounded-2xl border font-mono font-bold text-sm transition transform group-hover:scale-105 ${resType.bgChip}`}
                            >
                              <span>{quantity.toLocaleString('pl-PL')}</span>
                              <span className="text-[10px] font-sans font-normal opacity-80">
                                {resType.unit}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-300 font-mono text-base font-light">-</span>
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
        <div className="rounded-3xl bg-white shadow-xs border border-slate-200/80 overflow-hidden space-y-4 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${activeConfig.iconBg}`}>
                  {activeConfig.icon}
                </div>
                <h2 className="text-base font-bold text-slate-900">
                  Szczegółowe Zestawienie Specjalizacji: {activeConfig.label}
                </h2>
              </div>
              <p className="text-xs text-slate-500">
                {activeConfig.description} • Jednostka: <strong>{activeConfig.unit}</strong>
              </p>
            </div>

            {/* Sortowanie wewnątrz wybranej kategorii */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs">
              <span className="text-slate-500 font-semibold pl-2">Sortuj po:</span>
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
                  subSortField === 'name' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
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
                  subSortField === 'quantity' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
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
                  subSortField === 'owner' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Posiadacz</span>
                {subSortField === 'owner' && (subSortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                  <th className="py-3 px-4 w-1/3">Rodzaj / Specjalizacja i Wyjaśnienie</th>
                  <th className="py-3 px-3 text-center">24h</th>
                  <th className="py-3 px-3 text-center">48h</th>
                  <th className="py-3 px-3 text-center">72h</th>
                  <th className="py-3 px-3 text-center">Tydzień</th>
                  <th className="py-3 px-4 text-right">Zgłaszający Posiadacze</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {subcategoryListForSelected.map((item) => {
                  return (
                    <tr
                      key={item.name}
                      className="hover:bg-slate-50/60 transition duration-150 group"
                    >
                      {/* Nazwa i Wyjaśnienie podkategorii */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <div className="font-bold text-slate-900 text-sm group-hover:text-indigo-600 transition">
                            {item.name}
                          </div>
                          <div className="text-xs text-slate-500 leading-relaxed">
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
                            className="py-3 px-3 text-center cursor-pointer hover:bg-indigo-50/40 transition select-none font-mono"
                          >
                            {subQty > 0 ? (
                              <span className="inline-block px-2.5 py-1 rounded-xl bg-slate-100 text-indigo-700 font-bold border border-slate-200 text-xs hover:border-indigo-500">
                                {subQty.toLocaleString('pl-PL')} {activeConfig.unit}
                              </span>
                            ) : (
                              <span className="text-slate-300 text-xs font-light">-</span>
                            )}
                          </td>
                        );
                      })}

                      {/* Posiadacze */}
                      <td className="py-3.5 px-4 text-right">
                        {item.owners.length === 0 ? (
                          <span className="text-xs text-slate-400 italic">Brak deklaracji</span>
                        ) : (
                          <div className="flex flex-col items-end gap-1">
                            {Array.from(new Set(item.owners.map((o) => o.name))).map((ownerName) => (
                              <span
                                key={ownerName}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200"
                              >
                                <Building className="h-3 w-3 text-indigo-600" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-xl rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                  <Database className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Szczegóły zgłoszeń:{' '}
                    {RESOURCE_TYPES_CONFIG.find((c) => c.key === selectedCell.type)?.label}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {selectedCell.subcategory && (
                      <span className="text-indigo-600 font-semibold mr-2">
                        [{selectedCell.subcategory}]
                      </span>
                    )}
                    Horyzont: <strong className="text-indigo-700">{selectedCell.timeframe.toUpperCase()}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCell(null)}
                className="rounded-xl p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {cellDetailResources.length === 0 ? (
              <div className="py-8 text-center text-slate-400 space-y-2">
                <Package className="h-8 w-8 text-slate-300 mx-auto" />
                <p className="text-xs">Brak aktywnych zgłoszeń dla tego przedziału czasowego.</p>
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 pr-1">
                {cellDetailResources.map((item) => (
                  <div key={item.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-indigo-600 shrink-0" />
                        <span className="font-bold text-slate-900 text-xs sm:text-sm">
                          {item.organization?.name || 'Organizacja'}
                        </span>
                        {item.organization?.type && (
                          <span className="text-[10px] font-bold uppercase bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                            {item.organization.type}
                          </span>
                        )}
                      </div>
                      {item.subcategory && (
                        <div className="text-xs text-teal-700 font-medium">
                          Specjalizacja: {item.subcategory}
                        </div>
                      )}
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(item.createdAt).toLocaleString('pl-PL')}</span>
                      </div>
                    </div>

                    <div className="text-right font-mono font-bold text-sm text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100 shrink-0">
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
                className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
                  <Plus className="h-6 w-6 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Zgłoś Zasoby do Matrycy</h3>
                  <p className="text-xs text-slate-500">
                    Wprowadź szczegółowe informacje o dostępnym personelu lub sprzęcie
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="rounded-xl p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateResource} className="space-y-4">
              {/* Wybór typu zasobu */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
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
                      className={`flex items-center gap-2.5 p-3 rounded-2xl border text-left text-xs font-bold transition ${
                        formType === t.key
                          ? 'bg-indigo-50 border-indigo-300 text-indigo-900 ring-1 ring-indigo-500'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {t.icon}
                      <span className="truncate">{t.label.split(' ')[0]}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Wybór podkategorii */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Rodzaj / Specjalizacja
                </label>
                <select
                  value={formSubcategory}
                  onChange={(e) => setFormSubcategory(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 border border-slate-200 py-2.5 px-3 text-slate-900 text-xs focus:bg-white focus:border-indigo-500 focus:outline-none transition mb-2 font-medium"
                >
                  {RESOURCE_TYPES_CONFIG.find((t) => t.key === formType)?.subcategoriesPreset.map(
                    (sub) => (
                      <option key={sub.name} value={sub.name}>
                        {sub.name}
                      </option>
                    )
                  )}
                  <option value="__custom__">➕ Wpisz własną specjalizację...</option>
                </select>

                {formSubcategory === '__custom__' && (
                  <input
                    type="text"
                    required
                    value={customSubcategory}
                    onChange={(e) => setCustomSubcategory(e.target.value)}
                    placeholder="Wpisz nazwę specjalizacji lub sprzętu..."
                    className="w-full rounded-xl bg-slate-50 border border-indigo-300 py-2 px-3 text-slate-900 placeholder-slate-400 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition"
                  />
                )}
              </div>

              {/* Ilość */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                  Ilość ({RESOURCE_TYPES_CONFIG.find((t) => t.key === formType)?.unit})
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formQuantity}
                  onChange={(e) => setFormQuantity(e.target.value)}
                  placeholder="np. 15"
                  className="w-full rounded-xl bg-slate-50 border border-slate-200 py-2.5 px-4 text-slate-900 placeholder-slate-400 text-sm focus:bg-white focus:border-indigo-500 focus:outline-none transition font-mono font-bold"
                />
              </div>

              {/* Horyzont czasowy */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
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
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <div>{tf.label}</div>
                      <div className="text-[9px] font-normal opacity-80">{tf.subLabel}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !formQuantity}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm shadow-indigo-600/25 transition disabled:opacity-50"
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

export default DashboardResourcesPage;
