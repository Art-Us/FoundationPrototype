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
  Eye,
  Layers,
  ArrowUpDown,
  Filter,
  Layers3,
  RotateCcw,
  Clock,
  ListFilter,
  Table as TableIcon,
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
  badgeBg: string;
}[] = [
  {
    key: '24h',
    label: '24h',
    subLabel: 'Natychmiastowe',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  {
    key: '48h',
    label: '48h',
    subLabel: 'Krótkoterminowe',
    badgeBg: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  {
    key: '72h',
    label: '72h',
    subLabel: 'Średnioterminowe',
    badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  {
    key: 'tydzien',
    label: 'Tydzień',
    subLabel: 'Długoterminowe',
    badgeBg: 'bg-purple-50 text-purple-700 border-purple-200',
  },
];

type CategoryFilter = 'all' | ResourceType;
type SubSortField = 'name' | 'quantity' | 'owner';
type SubSortDirection = 'asc' | 'desc';
type ResourcesViewMode = 'table' | 'cards';

export const DashboardResourcesPage: React.FC = () => {
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filtrowanie według kategorii i organizacji
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all');
  const [selectedOrganizationFilter, setSelectedOrganizationFilter] = useState<string>('all');
  const [activeViewMode, setActiveViewMode] = useState<ResourcesViewMode>('table');

  // Sortowanie podkategorii
  const [subSortField, setSubSortField] = useState<SubSortField>('quantity');
  const [subSortDirection, setSubSortDirection] = useState<SubSortDirection>('desc');

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

  // Sumy ogólne i natychmiastowe (24h) do kafelków KPI
  const totalStats = useMemo(() => {
    let people = 0;
    let water = 0;
    let equipment = 0;
    let other = 0;

    let people24h = effectiveMatrix.ludzie['24h'] || 0;
    let water24h = effectiveMatrix.woda['24h'] || 0;
    let equipment24h = effectiveMatrix.sprzet['24h'] || 0;
    let other24h = effectiveMatrix.inne['24h'] || 0;

    Object.values(effectiveMatrix.ludzie || {}).forEach((v) => (people += v));
    Object.values(effectiveMatrix.woda || {}).forEach((v) => (water += v));
    Object.values(effectiveMatrix.sprzet || {}).forEach((v) => (equipment += v));
    Object.values(effectiveMatrix.inne || {}).forEach((v) => (other += v));

    return {
      people,
      water,
      equipment,
      other,
      people24h,
      water24h,
      equipment24h,
      other24h,
    };
  }, [effectiveMatrix]);

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
            <button
              onClick={() => setToast(null)}
              className="ml-2 hover:opacity-75 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. HERO NAGŁÓWEK & PRZYCISKI AKCJI                                       */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 font-semibold text-xs tracking-wider uppercase mb-1">
            <Database className="h-4 w-4" />
            <span>Matryca Logistyczna • Gotowość Operacyjna Służb i Organizacji</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Matryca Zasobów Ratunkowych
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {selectedOrgName
              ? `Wyświetlanie zasobów zadeklarowanych przez: ${selectedOrgName}`
              : 'Dostępność zasobów ratowniczych w horyzontach czasowych (24h, 48h, 72h, Tydzień).'}
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={fetchResources}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-indigo-600 hover:bg-slate-50 text-xs font-bold shadow-2xs transition active:scale-95 cursor-pointer disabled:opacity-50"
            title="Odśwież stan matrycy zasobów"
          >
            <RotateCcw className={`h-4 w-4 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
            <span className="hidden sm:inline">Odśwież</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setFormSubcategory(RESOURCE_TYPES_CONFIG[0].subcategoriesPreset[0].name);
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition transform active:scale-95 cursor-pointer"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            <span>Zgłoś nowe zasoby</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. KAFELKI KPI PODSUMOWANIA (LUDZIE, WODA, SPRZĘT, INNE)                 */}
      {/* ========================================================================= */}
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
            <div className="text-[11px] font-semibold text-purple-700 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>W 24h: {totalStats.people24h} osób</span>
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
            <div className="text-[11px] font-semibold text-cyan-700 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>W 24h: {totalStats.water24h} L</span>
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
            <div className="text-[11px] font-semibold text-amber-700 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>W 24h: {totalStats.equipment24h} szt.</span>
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
            <div className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>W 24h: {totalStats.other24h} jedn.</span>
            </div>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 shadow-xs shrink-0">
            <Package className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. LOGICZNY PASEK STEROWANIA I FILTRÓW                                   */}
      {/* ========================================================================= */}
      <div className="rounded-3xl bg-white p-5 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Segment Kategorii */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1 mr-1">
              <Filter className="h-3.5 w-3.5 text-indigo-600" />
              <span>Kategoria:</span>
            </span>

            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
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
                type="button"
                onClick={() => setSelectedCategory(cfg.key)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
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

          {/* Wybór Posiadacza Zasobów (Organizacji) & Widok */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-1.5">
              <Building className="h-3.5 w-3.5 text-teal-600 shrink-0" />
              <span className="text-xs text-slate-500 font-medium hidden sm:inline">Posiadacz:</span>
              <select
                value={selectedOrganizationFilter}
                onChange={(e) => setSelectedOrganizationFilter(e.target.value)}
                className="bg-transparent text-xs text-slate-800 focus:outline-none max-w-[200px] sm:max-w-[260px] font-bold cursor-pointer"
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
                  type="button"
                  onClick={() => setSelectedOrganizationFilter('all')}
                  title="Wyczyść filtr organizacji"
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>

            {/* Przełącznik Widoku Tabela vs Karty (gdy wybrana konkretna kategoria) */}
            {selectedCategory !== 'all' && (
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setActiveViewMode('table')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    activeViewMode === 'table'
                      ? 'bg-white text-indigo-700 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <TableIcon className="h-3.5 w-3.5" />
                  <span>Macierz</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveViewMode('cards')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    activeViewMode === 'cards'
                      ? 'bg-white text-indigo-700 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ListFilter className="h-3.5 w-3.5" />
                  <span>Katalog ({subcategoryListForSelected.length})</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. GŁÓWNA TABELA MATRYCY CZASOWEJ (WIDOK WSZYSTKIE LUB TABELA)          */}
      {/* ========================================================================= */}
      {(selectedCategory === 'all' || activeViewMode === 'table') && (
        <div className="rounded-3xl bg-white shadow-xs border border-slate-200/80 overflow-hidden space-y-0">
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
                {RESOURCE_TYPES_CONFIG.filter(
                  (resType) => selectedCategory === 'all' || selectedCategory === resType.key
                ).map((resType) => (
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
      {/* 5. WIDOK KATALOGU PODKATEGORII (GDY WYBRANA KATEGORIA + WIDOK KART)      */}
      {/* ========================================================================= */}
      {selectedCategory !== 'all' && activeConfig && activeViewMode === 'cards' && (
        <div className="rounded-3xl bg-white shadow-xs border border-slate-200/80 p-6 space-y-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${activeConfig.iconBg}`}>
                  {activeConfig.icon}
                </div>
                <h3 className="text-base font-extrabold text-slate-900">
                  {activeConfig.label}
                </h3>
              </div>
              <p className="text-xs text-slate-500">{activeConfig.description}</p>
            </div>

            {/* Sortowanie podkategorii */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-slate-400 font-medium">Sortuj wg:</span>
              <div className="flex items-center bg-slate-50 border border-slate-200/80 rounded-xl px-3 py-1.5 text-xs">
                <select
                  value={subSortField}
                  onChange={(e) => setSubSortField(e.target.value as SubSortField)}
                  className="bg-transparent font-bold text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="quantity">Łączna ilość</option>
                  <option value="name">Nazwa podkategorii</option>
                  <option value="owner">Nazwa organizacji</option>
                </select>
                <button
                  type="button"
                  onClick={() =>
                    setSubSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
                  }
                  className="ml-2 text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer"
                  title="Zmień kierunek sortowania"
                >
                  <ArrowUpDown className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {subcategoryListForSelected.map((sub) => (
              <div
                key={sub.name}
                className="rounded-2xl bg-slate-50/70 border border-slate-200/80 p-4 space-y-3 hover:border-indigo-200 transition shadow-2xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 leading-snug">
                      {sub.name}
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      {sub.description}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-lg font-black text-slate-900 font-mono">
                      {sub.total.toLocaleString('pl-PL')}
                    </span>
                    <span className="block text-[10px] text-slate-400">
                      {activeConfig.unit}
                    </span>
                  </div>
                </div>

                {/* Horyzonty czasowe */}
                <div className="grid grid-cols-4 gap-1.5 text-center text-xs">
                  {TIMEFRAMES_CONFIG.map((tf) => {
                    const q = sub.quantities[tf.key] || 0;
                    return (
                      <div
                        key={tf.key}
                        onClick={() =>
                          setSelectedCell({
                            type: selectedCategory,
                            subcategory: sub.name,
                            timeframe: tf.key,
                          })
                        }
                        className={`p-2 rounded-xl border transition cursor-pointer select-none ${
                          q > 0
                            ? `${tf.badgeBg} font-bold shadow-2xs hover:scale-105`
                            : 'bg-white text-slate-300 border-slate-100'
                        }`}
                      >
                        <span className="block text-[10px] uppercase text-slate-400 font-normal">
                          {tf.label}
                        </span>
                        <span className="font-mono text-xs">{q > 0 ? q : '-'}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Lista jednostek posiadających ten zasób */}
                {sub.owners.length > 0 && (
                  <div className="pt-2 border-t border-slate-200/60 text-[11px] space-y-1">
                    <span className="font-bold text-slate-600 block">
                      Zadeklarowane przez jednostki ({sub.owners.length}):
                    </span>
                    <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                      {sub.owners.map((owner, idx) => (
                        <div
                          key={`${owner.name}-${idx}`}
                          className="flex items-center justify-between text-slate-700 bg-white px-2 py-1 rounded-lg border border-slate-200/60"
                        >
                          <span className="truncate max-w-[200px] font-medium">
                            {owner.name}
                          </span>
                          <span className="font-mono font-bold text-indigo-700">
                            {owner.quantity} {activeConfig.unit} ({owner.timeframe})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. MODAL SZCZEGÓŁÓW KOMÓRKI MATRYCY                                      */}
      {/* ========================================================================= */}
      {selectedCell && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-5 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-indigo-600 font-bold">
                <Layers className="h-5 w-5" />
                <h3 className="text-base font-extrabold text-slate-900">
                  Szczegóły Dostępności Zasobów
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCell(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Kategoria:</span>
                <span className="font-bold text-indigo-700 uppercase">
                  {selectedCell.type}
                </span>
              </div>
              {selectedCell.subcategory && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Podkategoria:</span>
                  <span className="font-bold text-slate-900">
                    {selectedCell.subcategory}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-slate-500 font-medium">Horyzont czasowy:</span>
                <span className="font-bold px-2 py-0.5 rounded-lg bg-indigo-100 text-indigo-800">
                  {selectedCell.timeframe} (
                  {
                    TIMEFRAMES_CONFIG.find((t) => t.key === selectedCell.timeframe)
                      ?.subLabel
                  }
                  )
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                <span className="text-slate-500 font-medium">Łączna dostępna ilość:</span>
                <span className="font-mono font-black text-base text-slate-900">
                  {cellDetailResources
                    .reduce((acc, r) => acc + r.quantity, 0)
                    .toLocaleString('pl-PL')}{' '}
                  {
                    RESOURCE_TYPES_CONFIG.find((c) => c.key === selectedCell.type)?.unit
                  }
                </span>
              </div>
            </div>

            {/* Lista jednostek zgłaszających */}
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                Zadeklarowane przez jednostki ({cellDetailResources.length}):
              </span>

              {cellDetailResources.length === 0 ? (
                <div className="p-4 bg-slate-50 rounded-xl text-center text-xs text-slate-400">
                  Brak zgłoszonych jednostek dla tej komórki w wybranym filtrze.
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {cellDetailResources.map((res) => (
                    <div
                      key={res.id}
                      className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-900 block">
                          {res.organization?.name || 'Organizacja'}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {res.subcategory || 'Standardowe'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-sm text-emerald-700">
                          {res.quantity.toLocaleString('pl-PL')}{' '}
                          {
                            RESOURCE_TYPES_CONFIG.find((c) => c.key === res.type)?.unit
                          }
                        </span>
                        <span className="block text-[10px] text-slate-400">
                          Gotowość: {res.timeframe}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedCell(null)}
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition cursor-pointer"
              >
                Zamknij
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. MODAL ZGŁASZANIA NOWEGO ZASOBU                                         */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 sm:p-7 space-y-5 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-indigo-600 font-bold">
                <Plus className="h-5 w-5 stroke-[3]" />
                <h3 className="text-base font-extrabold text-slate-900">
                  Zgłoś Nowy Zasób do Matrycy
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateResource} className="space-y-4">
              {/* Krok 1: Wybór Kategorii */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  1. Wybierz Kategorię Zasobu:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {RESOURCE_TYPES_CONFIG.map((cfg) => {
                    const isSelected = formType === cfg.key;
                    return (
                      <button
                        key={cfg.key}
                        type="button"
                        onClick={() => {
                          setFormType(cfg.key);
                          setFormSubcategory(cfg.subcategoriesPreset[0]?.name || '');
                        }}
                        className={`flex items-center gap-2.5 p-3 rounded-2xl border text-left transition cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-400/40 text-indigo-950 font-bold'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        <div className={`flex h-8 w-8 items-center justify-center rounded-xl ${cfg.iconBg} shrink-0`}>
                          {cfg.icon}
                        </div>
                        <span className="text-xs">{cfg.shortName}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Krok 2: Podkategoria */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  2. Wybierz Podkategorię / Nazwę:
                </label>
                <select
                  value={formSubcategory}
                  onChange={(e) => setFormSubcategory(e.target.value)}
                  className="w-full rounded-xl bg-slate-50 border border-slate-200 py-2.5 px-3 text-xs font-semibold text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none cursor-pointer"
                >
                  {RESOURCE_TYPES_CONFIG.find((c) => c.key === formType)?.subcategoriesPreset.map(
                    (sub) => (
                      <option key={sub.name} value={sub.name}>
                        {sub.name}
                      </option>
                    )
                  )}
                  <option value="__custom__">➕ Własna nazwa zasobu...</option>
                </select>

                {formSubcategory === '__custom__' && (
                  <input
                    type="text"
                    required
                    value={customSubcategory}
                    onChange={(e) => setCustomSubcategory(e.target.value)}
                    placeholder="Wprowadź precyzyjną nazwę zasobu..."
                    className="w-full mt-2 rounded-xl bg-white border border-slate-300 py-2 px-3 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none"
                  />
                )}
              </div>

              {/* Krok 3: Ilość i Jednostka */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  3. Ilość (Jednostka:{' '}
                  <strong>{RESOURCE_TYPES_CONFIG.find((c) => c.key === formType)?.unit}</strong>):
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formQuantity}
                  onChange={(e) => setFormQuantity(e.target.value)}
                  placeholder="np. 50"
                  className="w-full rounded-xl bg-slate-50 border border-slate-200 py-2.5 px-3 text-sm font-bold text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {/* Krok 4: Horyzont Czasowy Gotowości */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  4. Horyzont czasowy gotowości do dyspozycji:
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {TIMEFRAMES_CONFIG.map((tf) => {
                    const isSelected = formTimeframe === tf.key;
                    return (
                      <button
                        key={tf.key}
                        type="button"
                        onClick={() => setFormTimeframe(tf.key)}
                        className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        <span className="block text-xs font-black">{tf.label}</span>
                        <span className="block text-[9px] opacity-80">{tf.subLabel}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !formQuantity}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Zgłaszanie...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 stroke-[3]" />
                      <span>Zgłoś zasób do matrycy</span>
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
