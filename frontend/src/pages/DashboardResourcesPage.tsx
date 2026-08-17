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
} from 'lucide-react';

export type ResourceType = 'ludzie' | 'woda' | 'sprzet' | 'inne';
export type ResourceTimeframe = '24h' | '48h' | '72h' | 'tydzien';

interface ResourceItem {
  id: string;
  organizationId: string;
  type: ResourceType;
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
  unit: string;
  icon: React.ReactNode;
  color: string;
  bgChip: string;
}[] = [
  {
    key: 'ludzie',
    label: 'Ludzie (Personel / Wolontariusze)',
    unit: 'osób',
    icon: <Users className="h-4 w-4 text-purple-400" />,
    color: 'text-purple-400',
    bgChip: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
  },
  {
    key: 'woda',
    label: 'Woda Pitna (Zapas / Dystrybucja)',
    unit: 'L (litrów)',
    icon: <Droplets className="h-4 w-4 text-cyan-400" />,
    color: 'text-cyan-400',
    bgChip: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20',
  },
  {
    key: 'sprzet',
    label: 'Sprzęt (Pompy, Agregaty, Łodzie)',
    unit: 'szt.',
    icon: <Wrench className="h-4 w-4 text-amber-400" />,
    color: 'text-amber-400',
    bgChip: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  },
  {
    key: 'inne',
    label: 'Inne (Worki, Pakiety Medyczne, Koce)',
    unit: 'jedn.',
    icon: <Package className="h-4 w-4 text-emerald-400" />,
    color: 'text-emerald-400',
    bgChip: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
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

export const DashboardResourcesPage: React.FC = () => {
  const [matrix, setMatrix] = useState<MatrixData | null>(null);
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal zgłaszania zasobu
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formType, setFormType] = useState<ResourceType>('ludzie');
  const [formQuantity, setFormQuantity] = useState<string>('');
  const [formTimeframe, setFormTimeframe] = useState<ResourceTimeframe>('24h');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Modal szczegółów komórki
  const [selectedCell, setSelectedCell] = useState<{
    type: ResourceType;
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
        setMatrix(res.data.matrix);
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

  // Obsługa zgłaszania zasobów (POST /api/resources)
  const handleCreateResource = async (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(formQuantity, 10);
    if (isNaN(qty) || qty <= 0) {
      showToast('Wprowadź prawidłową dodatnią ilość zasobu.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.post('/resources', {
        type: formType,
        quantity: qty,
        timeframe: formTimeframe,
      });

      if (res.data.success) {
        showToast('Zasób został pomyślnie zgłoszony i dodany do matrycy!');
        setIsModalOpen(false);
        setFormQuantity('');
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

  // Zasoby przefiltrowane dla klikniętej komórki
  const cellDetailResources = useMemo(() => {
    if (!selectedCell) return [];
    return resources.filter(
      (r) => r.type === selectedCell.type && r.timeframe === selectedCell.timeframe
    );
  }, [selectedCell, resources]);

  // Sumy ogólne do kafelków KPI
  const totalStats = useMemo(() => {
    let people = 0;
    let water = 0;
    let equipment = 0;
    let other = 0;

    if (matrix) {
      Object.values(matrix.ludzie || {}).forEach((v) => (people += v));
      Object.values(matrix.woda || {}).forEach((v) => (water += v));
      Object.values(matrix.sprzet || {}).forEach((v) => (equipment += v));
      Object.values(matrix.inne || {}).forEach((v) => (other += v));
    }

    return { people, water, equipment, other };
  }, [matrix]);

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

      {/* Nagłówek i przycisk Zgłoś zasoby */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-teal-400 font-semibold text-xs tracking-wider uppercase mb-1">
            <Database className="h-4 w-4" />
            <span>Matryca Logistyczna • Zapotrzebowanie i Dostępność</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Matryca Zasobów Ratunkowych
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Przeglądaj zadeklarowane zasoby w horyzontach czasowych (kliknij w dowolną komórkę, aby zobaczyć szczegóły)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchResources}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold border border-slate-700/60 transition shadow-sm"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Odśwież</span>
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-teal-500 hover:from-brand-500 hover:to-teal-400 text-white text-sm font-bold shadow-lg shadow-brand-500/25 border border-brand-400/30 transition transform active:scale-95"
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

      {/* 1. GĘSTA TABELA MATRYCY ZASOBÓW (STYL EXCEL / DENSE MATRIX) */}
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
            <span>Kliknij komórkę, aby wyświetlić deklarujące jednostki</span>
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
                  {/* Nagłówek wiersza (Typ zasobu) */}
                  <td className="py-4 px-6 border-r border-slate-800/80 bg-slate-850/40">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 border border-slate-700 group-hover:scale-105 transition">
                        {resType.icon}
                      </div>
                      <div>
                        <div className="font-bold text-white text-sm">{resType.label}</div>
                        <div className="text-xs text-slate-400 font-mono">Jednostka: {resType.unit}</div>
                      </div>
                    </div>
                  </td>

                  {/* Komórki horyzontów czasowych */}
                  {TIMEFRAMES_CONFIG.map((tf) => {
                    const quantity = matrix ? matrix[resType.key]?.[tf.key] || 0 : 0;
                    const isSelected =
                      selectedCell?.type === resType.key && selectedCell?.timeframe === tf.key;

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

      {/* 2. MODAL / SZCZEGÓŁY WYBRANEJ KOMÓRKI MATRYCY */}
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
                    Szczegóły zgłoszeń: {RESOURCE_TYPES_CONFIG.find((c) => c.key === selectedCell.type)?.label}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Horyzont czasowy: <strong className="text-brand-400">{selectedCell.timeframe.toUpperCase()}</strong>
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

      {/* 3. MODAL / DIALOG FORMULARZA "ZGŁOŚ ZASOBY" */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-lg rounded-3xl bg-slate-850 p-6 sm:p-8 shadow-2xl border border-slate-700 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-700 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
                  <Plus className="h-6 w-6 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Zgłoś Zasoby do Matrycy</h3>
                  <p className="text-xs text-slate-400">
                    Wprowadź ilość zasobów, którymi dysponuje Twoja jednostka
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
                  Typ zasobu
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {RESOURCE_TYPES_CONFIG.map((t) => (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => setFormType(t.key)}
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
                  placeholder="np. 50"
                  className="w-full rounded-xl bg-slate-900/90 border border-slate-700 py-3 px-4 text-white placeholder-slate-500 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition font-mono font-bold"
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
                      className={`py-2.5 px-2 rounded-xl border text-center text-xs font-bold transition ${
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
                  className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition"
                >
                  Anuluj
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !formQuantity}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-teal-500 hover:from-brand-500 hover:to-teal-400 text-white text-sm font-bold shadow-lg shadow-brand-500/25 transition disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      <span>Dodawanie...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
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
