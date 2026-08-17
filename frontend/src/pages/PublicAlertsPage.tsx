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
  Compass,
  X,
} from 'lucide-react';

type ViewMode = 'split' | 'grid' | 'map';

export const PublicAlertsPage: React.FC = () => {
  const [alerts, setAlerts] = useState<AlertMapItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedVoivodeship, setSelectedVoivodeship] = useState<string>('all');
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

  // Unikalne kategorie, województwa i gminy do filtrów
  const categories = useMemo(() => {
    const set = new Set(alerts.map((a) => a.category).filter(Boolean));
    return Array.from(set);
  }, [alerts]);

  const voivodeships = useMemo(() => {
    const set = new Set(alerts.map((a) => a.voivodeship).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [alerts]);

  const municipalities = useMemo(() => {
    const set = new Set(alerts.map((a) => a.municipality?.name).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [alerts]);

  // Różnopoziomowe filtrowanie (Województwo -> Powiat -> Gmina -> Miasto/Wieś -> Treść)
  const filteredAlerts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    return alerts.filter((alert) => {
      // 1. Filtr kategorii
      if (selectedCategory !== 'all' && alert.category !== selectedCategory) {
        return false;
      }

      // 2. Filtr województwa
      if (
        selectedVoivodeship !== 'all' &&
        alert.voivodeship?.toLowerCase() !== selectedVoivodeship.toLowerCase()
      ) {
        return false;
      }

      // 3. Filtr gminy
      if (
        selectedMunicipality !== 'all' &&
        alert.municipality?.name !== selectedMunicipality
      ) {
        return false;
      }

      // 4. Wyszukiwanie pełnotekstowe po wszystkich poziomach
      if (!q) return true;

      const matchContent = alert.content.toLowerCase().includes(q);
      const matchCategory = alert.category.toLowerCase().includes(q);
      const matchLocation = alert.locationName?.toLowerCase().includes(q);
      const matchCounty = alert.county?.toLowerCase().includes(q);
      const matchVoivodeship = alert.voivodeship?.toLowerCase().includes(q);
      const matchMunicipality = alert.municipality?.name.toLowerCase().includes(q);
      const matchOrg = alert.author?.organization?.name.toLowerCase().includes(q);

      return (
        matchContent ||
        matchCategory ||
        matchLocation ||
        matchCounty ||
        matchVoivodeship ||
        matchMunicipality ||
        matchOrg
      );
    });
  }, [alerts, searchQuery, selectedCategory, selectedVoivodeship, selectedMunicipality]);

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
        bg: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
        icon: <Waves className="h-3.5 w-3.5" />,
      };
    }
    if (lower.includes('drog') || lower.includes('transport') || lower.includes('most')) {
      return {
        bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
        icon: <Truck className="h-3.5 w-3.5" />,
      };
    }
    if (lower.includes('human') || lower.includes('pomoc') || lower.includes('dary')) {
      return {
        bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
        icon: <HeartHandshake className="h-3.5 w-3.5" />,
      };
    }
    if (lower.includes('pożar') || lower.includes('ogień') || lower.includes('dym')) {
      return {
        bg: 'bg-red-500/10 text-red-400 border-red-500/30',
        icon: <AlertOctagon className="h-3.5 w-3.5" />,
      };
    }
    return {
      bg: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
    };
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] space-y-8 pb-16">
      {/* 1. Header / Hero Sekcja z animacją */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-850 to-brand-950/40 p-6 sm:p-10 border border-slate-800 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 h-64 w-64 rounded-full bg-brand-500/10 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/3 -mb-12 h-48 w-48 rounded-full bg-red-500/10 blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-red-500/15 px-3 py-1 text-xs font-bold text-red-400 border border-red-500/30">
              <span className="h-2 w-2 rounded-full bg-red-400 animate-ping"></span>
              <Radio className="h-3.5 w-3.5" />
              <span>Transmisja na żywo • Kryzysowy Kanał Informacyjny</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-none">
              Ostrzeżenia i Komunikaty Ratunkowe
            </h1>

            <p className="text-sm sm:text-base text-slate-300 font-normal leading-relaxed">
              Oficjalne meldunki operacyjne publikowane w czasie rzeczywistym przez samorządy,
              straż pożarną oraz organizacje ratownicze. Wyszukuj komunikaty według województwa, powiatu, gminy lub miasta.
            </p>
          </div>

          {/* Szybki telefon alarmowy */}
          <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0">
            <div className="rounded-2xl bg-slate-800/90 p-4 border border-slate-700/80 shadow-lg backdrop-blur-md">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/20 text-red-400">
                  <PhoneCall className="h-5 w-5 animate-pulse" />
                </div>
                <div>
                  <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Telefon Alarmowy
                  </span>
                  <a
                    href="tel:112"
                    className="text-xl font-extrabold text-white hover:text-red-400 transition"
                  >
                    112 / 998
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Pasek Różnopoziomowego Wyszukiwania i Filtrów */}
      <section className="rounded-2xl bg-slate-800/80 p-4 sm:p-5 border border-slate-700/80 shadow-xl backdrop-blur-xl space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Główne pole wyszukiwarki wielopoziomowej */}
          <div className="md:col-span-6 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Wpisz województwo, powiat, gminę, miasto lub treść (np. dolnośląskie, Warszawa, Kłodzko)..."
              className="w-full rounded-xl bg-slate-900/90 border border-slate-700 py-2.5 pl-10 pr-10 text-xs sm:text-sm text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filtr Województwa */}
          <div className="md:col-span-3">
            <select
              value={selectedVoivodeship}
              onChange={(e) => setSelectedVoivodeship(e.target.value)}
              className="w-full rounded-xl bg-slate-900 border border-slate-700 py-2.5 px-3 text-xs sm:text-sm text-white focus:border-brand-500 focus:outline-none"
            >
              <option value="all">Wszystkie województwa ({voivodeships.length})</option>
              {voivodeships.map((v) => (
                <option key={v} value={v}>
                  woj. {v}
                </option>
              ))}
            </select>
          </div>

          {/* Filtr Gminy */}
          <div className="md:col-span-3">
            <select
              value={selectedMunicipality}
              onChange={(e) => setSelectedMunicipality(e.target.value)}
              className="w-full rounded-xl bg-slate-900 border border-slate-700 py-2.5 px-3 text-xs sm:text-sm text-white focus:border-brand-500 focus:outline-none"
            >
              <option value="all">Wszystkie gminy ({municipalities.length})</option>
              {municipalities.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Pasek przełączania widoku i chipy kategorii */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2 border-t border-slate-700/60">
          {/* Przełącznik widoku: Podzielony, Mapa, Karty */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-700/70 shrink-0">
            <button
              onClick={() => setViewMode('split')}
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

          {/* Chipy kategorii */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`rounded-lg px-2.5 py-1 font-semibold transition shrink-0 ${
                selectedCategory === 'all'
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-700'
              }`}
            >
              Wszystkie ({alerts.length})
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`rounded-lg px-2.5 py-1 font-semibold transition shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-700'
                }`}
              >
                {cat.split(' ')[0]}
              </button>
            ))}
          </div>

          <button
            onClick={fetchAlerts}
            disabled={isLoading}
            className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-700/80 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-600/40 transition shadow-sm shrink-0"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Odśwież</span>
          </button>
        </div>

        {searchQuery && (
          <div className="text-xs text-brand-300 flex items-center gap-1.5 pt-1">
            <Compass className="h-3.5 w-3.5 text-teal-400" />
            <span>
              Wyniki dla „<strong>{searchQuery}</strong>”: Znaleziono{' '}
              <strong>{filteredAlerts.length}</strong> komunikatów
            </span>
          </div>
        )}
      </section>

      {/* 3. Główna Zawartość: Mapa i Lista Alertów */}
      {error ? (
        <div className="rounded-3xl bg-red-500/10 p-8 text-center border border-red-500/30 max-w-lg mx-auto space-y-4">
          <AlertOctagon className="h-10 w-10 text-red-400 mx-auto" />
          <h3 className="text-lg font-bold text-white">Błąd pobierania komunikatów</h3>
          <p className="text-xs text-red-300">{error}</p>
          <button
            onClick={fetchAlerts}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition"
          >
            Spróbuj ponownie
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Widok Mapy (gdy 'split' lub 'map') */}
          {(viewMode === 'split' || viewMode === 'map') && (
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-bold text-white">
                  <MapPin className="h-4 w-4 text-red-400" />
                  <span>Mapa Ostrzeżeń Kryzysowych ({filteredAlerts.length})</span>
                </div>
                <span className="text-xs text-slate-400 hidden sm:inline">
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
                      {searchQuery || selectedCategory !== 'all' || selectedMunicipality !== 'all' || selectedVoivodeship !== 'all'
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
                    const authorName = alert.author
                      ? `${alert.author.firstName} ${alert.author.lastName}`
                      : null;

                    return (
                      <article
                        key={alert.id}
                        className="group relative flex flex-col justify-between rounded-3xl bg-slate-800/85 p-6 sm:p-7 shadow-xl backdrop-blur-xl border border-slate-700/60 hover:border-brand-500/50 hover:shadow-2xl hover:shadow-brand-500/5 transition duration-300"
                      >
                        {/* Górna belka karty: Kategoria & Rozbudowana Lokalizacja */}
                        <div className="space-y-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            {/* Kategoria */}
                            <span
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border tracking-wide uppercase ${categoryBadge.bg}`}
                            >
                              {categoryBadge.icon}
                              <span>{alert.category}</span>
                            </span>

                            {/* Rozbudowany badge lokalizacji (Miasto, Powiat, Województwo) */}
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs font-semibold">
                              <MapPin className="h-3.5 w-3.5 shrink-0 text-brand-400" />
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

                          {/* Treść alertu */}
                          <p className="text-base sm:text-lg text-slate-100 font-medium leading-relaxed">
                            {alert.content}
                          </p>
                        </div>

                        {/* Dolna belka karty: Organizacja & Czas */}
                        <div className="mt-6 pt-4 border-t border-slate-700/60 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
                          <div className="flex items-center gap-2">
                            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-900 border border-slate-700 text-brand-400">
                              <Building className="h-3.5 w-3.5" />
                            </div>
                            <div>
                              <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                                <span>{orgName}</span>
                                {orgType && (
                                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                                    {orgType}
                                  </span>
                                )}
                              </div>
                              {authorName && (
                                <div className="text-[11px] text-slate-500 flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  <span>{authorName}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 text-slate-400 bg-slate-900/60 px-2.5 py-1 rounded-lg border border-slate-800">
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
