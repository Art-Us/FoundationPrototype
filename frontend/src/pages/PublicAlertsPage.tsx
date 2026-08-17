import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import { AlertsMap, AlertMapItem } from '../components/AlertsMap';
import {
  Radio,
  MapPin,
  Building,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  PhoneCall,
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
} from 'lucide-react';

type ViewMode = 'split' | 'grid' | 'map';

export const PublicAlertsPage: React.FC = () => {
  const [alerts, setAlerts] = useState<AlertMapItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedMunicipality, setSelectedMunicipality] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('split');

  const fetchAlerts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get('/alerts/public');
      if (res.data.success && Array.isArray(res.data.data)) {
        setAlerts(res.data.data);
      }
    } catch (err: any) {
      console.error('Błąd podczas pobierania publicznych alertów:', err);
      setError(
        err.response?.data?.message ||
          'Nie udało się połączyć z serwerem komunikatów. Sprawdź połączenie sieciowe.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  // Unikalne kategorie i gminy do filtrów
  const categories = useMemo(() => {
    const set = new Set(alerts.map((a) => a.category).filter(Boolean));
    return Array.from(set);
  }, [alerts]);

  const municipalities = useMemo(() => {
    const set = new Set(alerts.map((a) => a.municipality?.name).filter(Boolean) as string[]);
    return Array.from(set);
  }, [alerts]);

  // Filtrowanie alertów
  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      const matchesSearch =
        alert.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        alert.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (alert.municipality?.name &&
          alert.municipality.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (alert.author?.organization?.name &&
          alert.author.organization.name.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory =
        selectedCategory === 'all' || alert.category === selectedCategory;

      const matchesMunicipality =
        selectedMunicipality === 'all' ||
        alert.municipality?.name === selectedMunicipality;

      return matchesSearch && matchesCategory && matchesMunicipality;
    });
  }, [alerts, searchQuery, selectedCategory, selectedMunicipality]);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('pl-PL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const getCategoryBadge = (category: string) => {
    const lower = category.toLowerCase();
    if (lower.includes('hydro') || lower.includes('powód') || lower.includes('woda')) {
      return {
        bg: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400',
        icon: <Waves className="h-3.5 w-3.5" />,
      };
    }
    if (lower.includes('drog') || lower.includes('most') || lower.includes('objazd')) {
      return {
        bg: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
        icon: <Truck className="h-3.5 w-3.5" />,
      };
    }
    if (lower.includes('pomoc') || lower.includes('humanitar') || lower.includes('zbiórka')) {
      return {
        bg: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400',
        icon: <HeartHandshake className="h-3.5 w-3.5" />,
      };
    }
    return {
      bg: 'bg-red-500/10 border-red-500/30 text-red-400',
      icon: <AlertOctagon className="h-3.5 w-3.5" />,
    };
  };

  const getOrgTypeBadge = (type?: string) => {
    switch (type) {
      case 'sluzby':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'samorzad':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'ngo':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      default:
        return 'bg-slate-700/50 text-slate-300 border-slate-600/30';
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6 sm:space-y-8">
      {/* 1. Header: Kryzysowy Kanał Informacyjny */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-slate-800/90 via-slate-900/90 to-slate-900 p-6 sm:p-10 border border-slate-700/60 shadow-2xl backdrop-blur-xl">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-brand-500/10 blur-3xl pointer-events-none"></div>
        <div className="absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-red-500/10 blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            {/* Live Indicator */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-wider shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              <Radio className="h-3.5 w-3.5 animate-pulse" />
              <span>Transmisja na żywo</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight leading-tight">
              Kryzysowy Kanał Informacyjny
            </h1>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Oficjalna interaktywna mapa i tablica ostrzeżeń, komunikatów operacyjnych oraz punktów pomocy publikowanych przez służby ratunkowe (PSP, OSP, Samorządy, NGO).
            </p>
          </div>

          {/* Numery Alarmowe */}
          <div className="rounded-2xl bg-slate-900/80 p-4 border border-slate-700/80 shadow-lg shrink-0 flex flex-col gap-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              <PhoneCall className="h-4 w-4 text-brand-400" />
              <span>Służby Ratunkowe</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <a
                href="tel:112"
                className="flex-1 text-center py-2 px-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-sm transition transform active:scale-95 shadow-md shadow-red-600/30"
              >
                112
              </a>
              <a
                href="tel:998"
                className="flex-1 text-center py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs border border-slate-700 transition"
              >
                998 (Straż)
              </a>
              <a
                href="tel:999"
                className="flex-1 text-center py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs border border-slate-700 transition"
              >
                999 (Pogot.)
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Pasek wyszukiwania, filtrów oraz przełącznika widoków */}
      <section className="rounded-2xl bg-slate-800/60 p-4 border border-slate-700/50 backdrop-blur-md space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Wyszukiwarka */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Szukaj w komunikatach, gminach, organizacjach..."
              className="w-full rounded-xl bg-slate-900/90 border border-slate-700/80 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition"
            />
          </div>

          {/* Filtr Gmin */}
          {municipalities.length > 0 && (
            <div className="md:w-48">
              <select
                value={selectedMunicipality}
                onChange={(e) => setSelectedMunicipality(e.target.value)}
                className="w-full rounded-xl bg-slate-900/90 border border-slate-700/80 py-2.5 px-3 text-sm text-white focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition"
              >
                <option value="all">Wszystkie gminy ({municipalities.length})</option>
                {municipalities.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Przełącznik widoku (Mapa / Lista / Dzielony) */}
          <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-700/80 shrink-0">
            <button
              onClick={() => setViewMode('split')}
              title="Widok łączony (Mapa + Lista)"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === 'split'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Columns className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Podzielony</span>
            </button>

            <button
              onClick={() => setViewMode('map')}
              title="Widok Mapy Leaflet"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === 'map'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <MapIcon className="h-3.5 w-3.5" />
              <span>Mapa</span>
            </button>

            <button
              onClick={() => setViewMode('grid')}
              title="Widok Kart"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === 'grid'
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Karty</span>
            </button>
          </div>

          {/* Przycisk odświeżenia */}
          <button
            onClick={fetchAlerts}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-700/80 hover:bg-slate-700 text-slate-200 text-sm font-semibold border border-slate-600/40 transition shadow-sm shrink-0"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Odśwież</span>
          </button>
        </div>

        {/* Chipy kategorii */}
        {categories.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
            <span className="text-slate-400 shrink-0 flex items-center gap-1 font-medium">
              <Filter className="h-3.5 w-3.5" /> Kategoria:
            </span>
            <button
              onClick={() => setSelectedCategory('all')}
              className={`rounded-lg px-3 py-1.5 font-medium transition shrink-0 ${
                selectedCategory === 'all'
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-700/60'
              }`}
            >
              Wszystkie ({alerts.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-lg px-3 py-1.5 font-medium transition shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                    : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-700/60'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* 3. Obsługa błędów sieci */}
      {error && (
        <div className="rounded-3xl bg-red-500/10 p-6 sm:p-8 border border-red-500/30 text-center space-y-4 shadow-xl">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/20 text-red-400 ring-1 ring-red-500/40">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white mb-1">Błąd połączenia z serwerem</h3>
            <p className="text-sm text-red-300 max-w-md mx-auto">{error}</p>
          </div>
          <button
            onClick={fetchAlerts}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition shadow-lg shadow-red-600/20"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Spróbuj ponownie</span>
          </button>
        </div>
      )}

      {/* 4. Szkielety ładowania (Skeletons) */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="rounded-3xl bg-slate-800/60 p-6 border border-slate-700/50 shadow-xl space-y-5 animate-pulse"
            >
              <div className="flex items-center justify-between">
                <div className="h-6 w-32 rounded-lg bg-slate-700"></div>
                <div className="h-6 w-28 rounded-lg bg-slate-700"></div>
              </div>
              <div className="space-y-2.5">
                <div className="h-4 w-full rounded bg-slate-700"></div>
                <div className="h-4 w-5/6 rounded bg-slate-700"></div>
                <div className="h-4 w-4/6 rounded bg-slate-700"></div>
              </div>
              <div className="pt-4 border-t border-slate-700/50 flex items-center justify-between">
                <div className="h-4 w-40 rounded bg-slate-700"></div>
                <div className="h-4 w-24 rounded bg-slate-700"></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 5. Główna treść z Mapą Leaflet i/lub Kartami */}
      {!isLoading && !error && (
        <div className="space-y-6">
          {/* Widok Mapy (gdy 'split' lub 'map') */}
          {(viewMode === 'split' || viewMode === 'map') && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <MapIcon className="h-4 w-4 text-brand-400" />
                  <span>Interaktywna Mapa Zagrożeń Leaflet JS</span>
                </div>
                <span className="text-xs text-slate-400">
                  Kliknij punkt na mapie, aby zobaczyć szczegóły
                </span>
              </div>

              <AlertsMap
                alerts={filteredAlerts}
                height={viewMode === 'map' ? '600px' : '440px'}
              />
            </section>
          )}

          {/* Widok Kart (gdy 'split' lub 'grid') */}
          {(viewMode === 'split' || viewMode === 'grid') && (
            <section className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-sm font-bold text-white">
                  Lista aktywnych komunikatów ({filteredAlerts.length})
                </span>
              </div>

              {filteredAlerts.length === 0 ? (
                <div className="rounded-3xl bg-slate-800/40 p-12 text-center border border-slate-700/40 max-w-md mx-auto space-y-4">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/30">
                    <ShieldCheck className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Brak aktywnych ostrzeżeń</h3>
                    <p className="text-xs sm:text-sm text-slate-400 mt-1">
                      {searchQuery || selectedCategory !== 'all' || selectedMunicipality !== 'all'
                        ? 'Żaden alert nie pasuje do wybranych kryteriów wyszukiwania.'
                        : 'Wszystkie jednostki ratunkowe raportują brak bezpośrednich zagrożeń kryzysowych.'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredAlerts.map((alert) => {
                    const categoryBadge = getCategoryBadge(alert.category);
                    const orgName = alert.author?.organization?.name || 'Służby Ratunkowe';
                    const orgType = alert.author?.organization?.type;
                    const municipalityName = alert.municipality?.name || 'Gmina nieokreślona';
                    const authorName = alert.author
                      ? `${alert.author.firstName} ${alert.author.lastName}`
                      : null;

                    return (
                      <article
                        key={alert.id}
                        className="group relative flex flex-col justify-between rounded-3xl bg-slate-800/85 p-6 sm:p-7 shadow-xl backdrop-blur-xl border border-slate-700/60 hover:border-brand-500/50 hover:shadow-2xl hover:shadow-brand-500/5 transition duration-300"
                      >
                        {/* Górna belka karty: Kategoria & Gmina */}
                        <div className="space-y-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            {/* Kategoria */}
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border tracking-wide uppercase ${categoryBadge.bg}`}
                            >
                              {categoryBadge.icon}
                              <span>{alert.category}</span>
                            </span>

                            {/* Gmina */}
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-semibold">
                              <MapPin className="h-3.5 w-3.5 shrink-0" />
                              <span>{municipalityName}</span>
                            </span>
                          </div>

                          {/* Treść alertu */}
                          <p className="text-base sm:text-lg text-slate-100 font-medium leading-relaxed">
                            {alert.content}
                          </p>
                        </div>

                        {/* Dolna belka karty: Organizacja, Autor, Data */}
                        <div className="mt-6 pt-4 border-t border-slate-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-400">
                          {/* Organizacja & Autor */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
                              <Building className="h-3.5 w-3.5 text-brand-400 shrink-0" />
                              <span>{orgName}</span>
                            </div>

                            {orgType && (
                              <span
                                className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase border ${getOrgTypeBadge(
                                  orgType
                                )}`}
                              >
                                {orgType}
                              </span>
                            )}

                            {authorName && (
                              <span className="hidden lg:inline-flex items-center gap-1 text-slate-400 text-[11px]">
                                • <User className="h-3 w-3" /> {authorName}
                              </span>
                            )}
                          </div>

                          {/* Data dodania */}
                          <div className="flex items-center gap-1.5 text-slate-400 shrink-0 font-medium">
                            <Calendar className="h-3.5 w-3.5 text-slate-500" />
                            <time dateTime={alert.createdAt}>{formatDate(alert.createdAt)}</time>
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
