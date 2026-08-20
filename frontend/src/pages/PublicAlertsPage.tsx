import React, { useState, useEffect, useMemo, useRef } from 'react';
import api from '../services/api';
import {
  AlertsMap,
  AlertMapItem,
  MapDisplayMode,
  getSeverityBadgeInfo,
  getAlertSeverityScore,
} from '../components/AlertsMap';
import {
  MapPin,
  Building,
  AlertTriangle,
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
  ArrowUpDown,
} from 'lucide-react';

type ViewMode = 'split' | 'grid' | 'map';
type PublicSortOption =
  | 'date-desc'
  | 'date-asc'
  | 'severity-desc'
  | 'severity-asc';

export const PublicAlertsPage: React.FC = () => {
  const [alerts, setAlerts] = useState<AlertMapItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedVoivodeship, setSelectedVoivodeship] = useState<string>('all');
  const [selectedCountyOrCity, setSelectedCountyOrCity] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [sortBy, setSortBy] = useState<PublicSortOption>('date-desc');
  const [mapMode, setMapMode] = useState<MapDisplayMode>('severity');

  // Stan fokusu na konkretnym alercie na mapie
  const [focusedAlertId, setFocusedAlertId] = useState<string | null>(null);
  const [focusKey, setFocusKey] = useState<number>(0);
  const mapSectionRef = useRef<HTMLDivElement>(null);

  const handleFocusOnMap = (alert: AlertMapItem) => {
    // Jeśli widok to same karty ('grid'), przełączamy na widok dzielony ('split'), aby mapa była widoczna
    if (viewMode === 'grid') {
      setViewMode('split');
    }
    setFocusedAlertId(alert.id);
    setFocusKey((k) => k + 1);

    // Płynne przewinięcie do sekcji mapy
    setTimeout(() => {
      mapSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 80);
  };

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

  // Unikalne kategorie i województwa do filtrów
  const categories = useMemo(() => {
    const set = new Set(alerts.map((a) => a.category).filter(Boolean));
    return Array.from(set);
  }, [alerts]);

  const voivodeships = useMemo(() => {
    const set = new Set(alerts.map((a) => a.voivodeship).filter(Boolean) as string[]);
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pl'));
  }, [alerts]);

  // Powiaty i miasta dostępne wyłącznie w wybranym województwie
  const availableCountiesAndCities = useMemo(() => {
    if (selectedVoivodeship === 'all') return [];

    const set = new Set<string>();
    alerts
      .filter(
        (a) =>
          a.voivodeship &&
          a.voivodeship.toLowerCase() === selectedVoivodeship.toLowerCase()
      )
      .forEach((a) => {
        if (a.county) set.add(a.county);
        if (a.locationName) set.add(a.locationName);
      });

    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pl'));
  }, [alerts, selectedVoivodeship]);

  const handleVoivodeshipChange = (voivodeship: string) => {
    setSelectedVoivodeship(voivodeship);
    setSelectedCountyOrCity('all'); // Automatyczny reset powiatu/miasta po zmianie województwa
  };

  // Różnopoziomowe filtrowanie i sortowanie (Krytyczność zdarzenia / Krytyczność żądań / Data)
  const filteredAlerts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    const filtered = alerts.filter((alert) => {
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

      // 3. Filtr powiatu / miasta
      if (selectedVoivodeship !== 'all' && selectedCountyOrCity !== 'all') {
        const matchesCounty = alert.county?.toLowerCase() === selectedCountyOrCity.toLowerCase();
        const matchesLocation = alert.locationName?.toLowerCase() === selectedCountyOrCity.toLowerCase();

        if (!matchesCounty && !matchesLocation) {
          return false;
        }
      }

      // 4. Wyszukiwanie pełnotekstowe
      if (!q) return true;

      const matchTitle = alert.title ? alert.title.toLowerCase().includes(q) : false;
      const matchContent = alert.content.toLowerCase().includes(q);
      const matchCategory = alert.category.toLowerCase().includes(q);
      const matchLocation = alert.locationName?.toLowerCase().includes(q);
      const matchCounty = alert.county?.toLowerCase().includes(q);
      const matchVoivodeship = alert.voivodeship?.toLowerCase().includes(q);
      const matchMunicipality = alert.municipality?.name.toLowerCase().includes(q);
      const matchOrg = alert.author?.organization?.name.toLowerCase().includes(q);

      return (
        matchTitle ||
        matchContent ||
        matchCategory ||
        matchLocation ||
        matchCounty ||
        matchVoivodeship ||
        matchMunicipality ||
        matchOrg
      );
    });

    // Sortowanie
    return [...filtered].sort((a, b) => {
      if (sortBy === 'severity-desc') {
        const scoreA = getAlertSeverityScore(a.severity);
        const scoreB = getAlertSeverityScore(b.severity);
        if (scoreB !== scoreA) return scoreB - scoreA;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }

      if (sortBy === 'severity-asc') {
        const scoreA = getAlertSeverityScore(a.severity);
        const scoreB = getAlertSeverityScore(b.severity);
        if (scoreA !== scoreB) return scoreA - scoreB;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }

      if (sortBy === 'date-asc') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }

      // date-desc
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [
    alerts,
    searchQuery,
    selectedCategory,
    selectedVoivodeship,
    selectedCountyOrCity,
    sortBy,
  ]);

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
        bg: 'bg-cyan-50 text-cyan-700 border-cyan-200',
        icon: <Waves className="h-3.5 w-3.5 text-cyan-600" />,
      };
    }
    if (lower.includes('drog') || lower.includes('transport') || lower.includes('most')) {
      return {
        bg: 'bg-amber-50 text-amber-700 border-amber-200',
        icon: <Truck className="h-3.5 w-3.5 text-amber-600" />,
      };
    }
    if (lower.includes('human') || lower.includes('pomoc') || lower.includes('dary')) {
      return {
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        icon: <HeartHandshake className="h-3.5 w-3.5 text-emerald-600" />,
      };
    }
    if (lower.includes('pożar') || lower.includes('ogień') || lower.includes('dym')) {
      return {
        bg: 'bg-red-50 text-red-700 border-red-200',
        icon: <AlertOctagon className="h-3.5 w-3.5 text-red-600" />,
      };
    }
    return {
      bg: 'bg-purple-50 text-purple-700 border-purple-200',
      icon: <AlertTriangle className="h-3.5 w-3.5 text-purple-600" />,
    };
  };

  const handleNavigateToCard = (alert: AlertMapItem) => {
    if (viewMode === 'map') {
      setViewMode('split');
    }
    setTimeout(() => {
      const el = document.getElementById(`alert-card-${alert.id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-4', 'ring-indigo-400', 'transition-all');
        setTimeout(() => {
          el.classList.remove('ring-4', 'ring-indigo-400');
        }, 2500);
      }
    }, 100);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Hero Banner */}
      <section className="relative overflow-hidden rounded-3xl bg-white p-6 sm:p-8 border border-slate-200/80 shadow-xs">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Ostrzeżenia i Komunikaty Ratunkowe
            </h1>

            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              Oficjalne meldunki operacyjne publikowane w czasie rzeczywistym przez samorządy,
              straż pożarną i służby ratownicze. Przeglądaj na mapie według krytyczności lub kategorii zdarzeń.
            </p>
          </div>

          {/* Telefon alarmowy */}
          <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0">
            <div className="rounded-2xl bg-gradient-to-br from-red-50 to-rose-50/70 p-4 border border-red-100 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-600 text-white shadow-sm shadow-red-600/30">
                  <PhoneCall className="h-5 w-5" />
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-red-700 uppercase tracking-wider">
                    Telefon Alarmowy
                  </span>
                  <a
                    href="tel:112"
                    className="text-lg font-black text-slate-900 hover:text-red-600 transition"
                  >
                    112 / 998
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Pasek Wyszukiwania, Filtrów i Sortowania */}
      <section className="rounded-3xl bg-white p-5 border border-slate-200/80 shadow-xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Pole wyszukiwania */}
          <div className="md:col-span-6 relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Wpisz województwo, powiat, gminę, miasto lub treść..."
              className="w-full rounded-xl bg-slate-50 border border-slate-200/80 py-2.5 pl-10 pr-10 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Filtr Województwa */}
          <div className="md:col-span-3">
            <select
              value={selectedVoivodeship}
              onChange={(e) => handleVoivodeshipChange(e.target.value)}
              className="w-full rounded-xl bg-slate-50 border border-slate-200/80 py-2.5 px-3 text-xs sm:text-sm text-slate-700 font-semibold focus:bg-white focus:border-indigo-500 focus:outline-none cursor-pointer transition"
            >
              <option value="all">Wszystkie województwa ({voivodeships.length})</option>
              {voivodeships.map((v) => (
                <option key={v} value={v}>
                  woj. {v}
                </option>
              ))}
            </select>
          </div>

          {/* Filtr Powiatu i Miasta */}
          <div className="md:col-span-3">
            <select
              value={selectedCountyOrCity}
              disabled={selectedVoivodeship === 'all'}
              onChange={(e) => setSelectedCountyOrCity(e.target.value)}
              className={`w-full rounded-xl border py-2.5 px-3 text-xs sm:text-sm font-semibold transition focus:outline-none ${
                selectedVoivodeship === 'all'
                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                  : 'bg-slate-50 border-slate-200/80 text-slate-700 focus:bg-white focus:border-indigo-500 cursor-pointer'
              }`}
            >
              {selectedVoivodeship === 'all' ? (
                <option value="all">Najpierw wybierz województwo</option>
              ) : (
                <>
                  <option value="all">
                    Wszystkie powiaty i miasta ({availableCountiesAndCities.length})
                  </option>
                  {availableCountiesAndCities.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>
        </div>

        {/* Pasek przełączania widoku, chipy kategorii i sortowanie */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pt-3 border-t border-slate-100">
          {/* Przełącznik widoku */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0">
            <button
              onClick={() => setViewMode('split')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                viewMode === 'split'
                  ? 'bg-white text-indigo-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Columns className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Podzielony</span>
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
              <span>Karty</span>
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

          {/* Sortowanie i odświeżanie */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200/80 rounded-xl px-2.5 py-1.5 text-xs">
              <ArrowUpDown className="h-3.5 w-3.5 text-slate-500 shrink-0" />
              <span className="text-slate-500 hidden sm:inline">Sortuj:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as PublicSortOption)}
                className="bg-transparent font-bold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="date-desc">Najnowsze</option>
                <option value="date-asc">Najstarsze</option>
                <option value="severity-desc">🚨 Krytyczność (najwyższa)</option>
                <option value="severity-asc">🟢 Krytyczność (najniższa)</option>
              </select>
            </div>
          </div>
        </div>

        {searchQuery && (
          <div className="text-xs text-indigo-700 flex items-center gap-1.5 pt-1">
            <Compass className="h-3.5 w-3.5 text-indigo-600" />
            <span>
              Wyniki dla „<strong>{searchQuery}</strong>”: Znaleziono{' '}
              <strong>{filteredAlerts.length}</strong> komunikatów
            </span>
          </div>
        )}
      </section>

      {/* 3. Główna Zawartość: Mapa i Lista Alertów */}
      {error ? (
        <div className="rounded-3xl bg-red-50 p-8 text-center border border-red-100 max-w-lg mx-auto space-y-4">
          <AlertOctagon className="h-10 w-10 text-red-500 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">Błąd pobierania komunikatów</h3>
          <p className="text-xs text-red-600">{error}</p>
          <button
            onClick={fetchAlerts}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition shadow-sm"
          >
            Spróbuj ponownie
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Widok Mapy (gdy 'split' lub 'map') */}
          {(viewMode === 'split' || viewMode === 'map') && (
            <section
              ref={mapSectionRef}
              className="rounded-3xl bg-white p-4 sm:p-5 border border-slate-200/80 shadow-xs space-y-3 scroll-mt-6"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <MapPin className="h-4 w-4 text-red-500" />
                  <span>Mapa Ostrzeżeń Kryzysowych ({filteredAlerts.length})</span>
                </div>
                <span className="text-xs text-slate-400 hidden sm:inline">
                  Przełączaj tryb mapy (Kategorie / Krytyczność zdarzenia)
                </span>
              </div>

              <AlertsMap
                alerts={filteredAlerts}
                height={viewMode === 'map' ? '600px' : '440px'}
                focusedAlertId={focusedAlertId}
                focusKey={focusKey}
                mode={mapMode}
                onModeChange={setMapMode}
                availableModes={['category', 'severity']}
                showNeededResourcesInPopup={false}
                onNavigateToCard={handleNavigateToCard}
              />
            </section>
          )}

          {/* Widok Kart (gdy 'split' lub 'grid') */}
          {(viewMode === 'split' || viewMode === 'grid') && (
            <section className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                <span className="text-sm font-bold text-slate-900">
                  Lista aktywnych komunikatów ({filteredAlerts.length})
                </span>
                <span className="text-xs text-slate-500">
                  Sortowanie: <strong className="text-slate-700">{
                    sortBy === 'date-desc' ? 'Najnowsze' :
                    sortBy === 'date-asc' ? 'Najstarsze' :
                    sortBy === 'severity-desc' ? 'Krytyczność zdarzenia (najwyższa)' :
                    'Krytyczność zdarzenia (najniższa)'
                  }</strong>
                </span>
              </div>

              {isLoading ? (
                <div className="py-16 text-center text-slate-400">
                  <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent mb-2"></div>
                  <p className="text-xs">Ładowanie komunikatów...</p>
                </div>
              ) : filteredAlerts.length === 0 ? (
                <div className="rounded-3xl bg-white p-12 text-center border border-slate-200/80 shadow-xs max-w-md mx-auto space-y-4">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                    <ShieldCheck className="h-7 w-7" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Brak aktywnych ostrzeżeń</h3>
                    <p className="text-xs text-slate-500 mt-1">
                      {searchQuery || selectedCategory !== 'all' || selectedCountyOrCity !== 'all' || selectedVoivodeship !== 'all'
                        ? 'Żaden alert nie pasuje do wybranych kryteriów wyszukiwania.'
                        : 'Wszystkie jednostki ratunkowe raportują brak bezpośrednich zagrożeń kryzysowych.'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {filteredAlerts.map((alert) => {
                    const categoryBadge = getCategoryBadge(alert.category);
                    const severityInfo = getSeverityBadgeInfo(alert.severity);
                    const orgName = alert.author?.organization?.name || 'Służby Ratunkowe';
                    const orgType = alert.author?.organization?.type;
                    const authorName = alert.author
                      ? `${alert.author.firstName} ${alert.author.lastName}`
                      : null;

                    return (
                      <article
                        key={alert.id}
                        id={`alert-card-${alert.id}`}
                        className="group relative flex flex-col justify-between rounded-3xl bg-white p-6 shadow-xs border border-slate-200/80 hover:border-indigo-300 hover:shadow-md transition duration-200"
                      >
                        {/* Górna belka karty: Badge Krytyczności, Kategoria & Rozbudowana Lokalizacja */}
                        <div className="space-y-3.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {/* Badge Krytyczności Zdarzenia */}
                              <span
                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-extrabold border uppercase tracking-wider ${severityInfo.badgeClass}`}
                              >
                                <span className={`h-2 w-2 rounded-full ${severityInfo.dotClass}`}></span>
                                <span>{severityInfo.label}</span>
                              </span>

                              {/* Kategoria */}
                              <span
                                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border tracking-wide uppercase ${categoryBadge.bg}`}
                              >
                                {categoryBadge.icon}
                                <span>{alert.category}</span>
                              </span>
                            </div>

                            {/* Rozbudowany badge lokalizacji (Miasto, Powiat, Województwo) */}
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

                          {/* Tytuł i Treść alertu */}
                          <div className="space-y-1.5">
                            {alert.title && (
                              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 leading-snug tracking-tight">
                                {alert.title}
                              </h3>
                            )}
                            <p className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed">
                              {alert.content}
                            </p>
                          </div>
                        </div>

                        {/* Dolna belka karty: Organizacja, Przycisk przejścia do mapy & Czas */}
                        <div className="mt-5 pt-3.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
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

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleFocusOnMap(alert)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold transition border border-indigo-200/60 shadow-2xs hover:shadow-xs cursor-pointer active:scale-95"
                              title="Zlokalizuj to zdarzenie na mapie"
                            >
                              <MapPin className="h-3.5 w-3.5 text-indigo-600" />
                              <span>Pokaż na mapie</span>
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

export default PublicAlertsPage;
