import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin,
  AlertTriangle,
  Building,
  Calendar,
  Ban,
  Layers,
  Flame,
  Boxes,
  FileText,
  ArrowRight,
} from 'lucide-react';

export type MapDisplayMode = 'category' | 'severity' | 'resource_urgency';

export interface AlertHistoryEvent {
  id: string;
  action: 'created' | 'deactivated' | 'reactivated' | 'updated';
  timestamp: string;
  userName?: string;
  organizationName?: string;
  details?: string;
}

export interface ResourceAllocationRecord {
  id: string;
  resourceId?: string;
  organizationId: string;
  organizationName: string;
  userId: string;
  userName: string;
  quantity: number;
  allocatedAt: string;
  note?: string;
}

export interface NeededResourceItem {
  id: string;
  resourceType: 'ludzie' | 'woda' | 'sprzet' | 'inne' | string;
  name: string;
  quantityNeeded: number;
  quantityAllocated: number;
  unit: string;
  urgency?: 'niski' | 'średni' | 'wysoki' | 'krytyczny';
  allocations?: ResourceAllocationRecord[];
}

export interface PostChatMessage {
  id: string;
  authorId: string;
  authorName: string;
  organizationName?: string;
  role?: string;
  content: string;
  createdAt: string;
}

export interface AlertPostItem {
  id: string;
  authorId: string;
  authorName: string;
  organizationName?: string;
  role?: string;
  title: string;
  content: string;
  postType?: 'raport_terenowy' | 'komunikat_sztabowy' | 'logistyka' | 'ogolne' | string;
  createdAt: string;
  messages: PostChatMessage[];
}

export interface AlertMapItem {
  id: string;
  title?: string | null;
  content: string;
  category: string;
  severity?: 'krytyczny' | 'wysoki' | 'średni' | 'niski';
  isActive: boolean;
  locationName?: string | null;
  county?: string | null;
  voivodeship?: string | null;
  lat?: number | null;
  lng?: number | null;
  history?: AlertHistoryEvent[] | null;
  neededResources?: NeededResourceItem[] | null;
  posts?: AlertPostItem[] | null;
  authorId?: string;
  municipalityId?: string;
  author?: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
    organization?: {
      id: string;
      name: string;
      type: string;
    };
  };
  municipality?: {
    id: string;
    name: string;
  };
  createdAt: string;
}

interface AlertsMapProps {
  alerts: AlertMapItem[];
  height?: string;
  onDeactivate?: (alertId: string) => void;
  canDeactivate?: (alert: AlertMapItem) => boolean;
  actionLoadingId?: string | null;
  focusedAlertId?: string | null;
  focusKey?: number;
  defaultMode?: MapDisplayMode;
  mode?: MapDisplayMode;
  onModeChange?: (mode: MapDisplayMode) => void;
  availableModes?: MapDisplayMode[];
  showNeededResourcesInPopup?: boolean;
  onNavigateToCard?: (alert: AlertMapItem) => void;
}

// Domyślne współrzędne dla znanych gmin w rejonie
const MUNICIPALITY_COORDINATES: Record<string, [number, number]> = {
  'Gmina Kłodzko': [50.4380, 16.6548],
  'Kłodzko': [50.4380, 16.6548],
  'Gmina Nysa': [50.4738, 17.3344],
  'Nysa': [50.4738, 17.3344],
  'Gmina Lądek-Zdrój': [50.3478, 16.8778],
  'Lądek-Zdrój': [50.3478, 16.8778],
  'Gmina Głuchołazy': [50.3150, 17.3828],
  'Głuchołazy': [50.3150, 17.3828],
  'Gmina Stronie Śląskie': [50.2965, 16.8762],
  'Gmina Bystrzyca Kłodzka': [50.2977, 16.6521],
};

const DEFAULT_CENTER: [number, number] = [50.4380, 16.6548];

// Punktacja krytyczności zdarzenia do sortowania
export const getAlertSeverityScore = (severity?: string): number => {
  switch (severity) {
    case 'krytyczny':
      return 4;
    case 'wysoki':
      return 3;
    case 'średni':
      return 2;
    case 'niski':
      return 1;
    default:
      return 3;
  }
};

// Punktacja pilności zapotrzebowań zasobów do sortowania
export const getAlertResourceUrgencyScore = (alert: AlertMapItem): number => {
  const needs = alert.neededResources;
  if (!needs || !Array.isArray(needs) || needs.length === 0) {
    return 0;
  }
  const unfulfilled = needs.filter((nr) => (nr.quantityAllocated || 0) < (nr.quantityNeeded || 1));
  if (unfulfilled.length === 0) {
    return 0.5; // Wszystkie zaspokojone
  }
  if (unfulfilled.some((nr) => nr.urgency === 'krytyczny')) return 4;
  if (unfulfilled.some((nr) => nr.urgency === 'wysoki')) return 3;
  if (unfulfilled.some((nr) => nr.urgency === 'średni')) return 2;
  return 1; // Niski
};

// Obliczenie poziomu pilności zapotrzebowań zasobów
export const getHighestResourceUrgency = (
  neededResources?: NeededResourceItem[] | null
): 'brak_potrzeb' | 'zaspokojone' | 'niski' | 'średni' | 'wysoki' | 'krytyczny' => {
  if (!neededResources || !Array.isArray(neededResources) || neededResources.length === 0) {
    return 'brak_potrzeb';
  }

  const unfulfilled = neededResources.filter(
    (nr) => (nr.quantityAllocated || 0) < (nr.quantityNeeded || 1)
  );

  if (unfulfilled.length === 0) {
    return 'zaspokojone';
  }

  if (unfulfilled.some((nr) => nr.urgency === 'krytyczny')) return 'krytyczny';
  if (unfulfilled.some((nr) => nr.urgency === 'wysoki')) return 'wysoki';
  if (unfulfilled.some((nr) => nr.urgency === 'średni')) return 'średni';
  return 'niski';
};

// Generator ikon HTML DivIcon dla Leaflet z dynamicznym trybem wizualizacji
const createCrisisIcon = (alert: AlertMapItem, mode: MapDisplayMode) => {
  let color = '#ef4444';
  let pulseColor = 'rgba(239, 68, 68, 0.4)';
  const iconSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  `;

  if (mode === 'category') {
    const lower = (alert.category || '').toLowerCase();
    if (lower.includes('hydro') || lower.includes('powód') || lower.includes('woda')) {
      color = '#06b6d4'; // Cyan
      pulseColor = 'rgba(6, 182, 212, 0.4)';
    } else if (lower.includes('drog') || lower.includes('most') || lower.includes('objazd')) {
      color = '#f59e0b'; // Amber
      pulseColor = 'rgba(245, 158, 11, 0.4)';
    } else if (lower.includes('pomoc') || lower.includes('humanitar')) {
      color = '#10b981'; // Emerald
      pulseColor = 'rgba(16, 185, 129, 0.4)';
    } else {
      color = '#ef4444'; // Red
      pulseColor = 'rgba(239, 68, 68, 0.4)';
    }
  } else if (mode === 'severity') {
    const sev = alert.severity || 'wysoki';
    switch (sev) {
      case 'krytyczny':
        color = '#ef4444'; // Czerwony
        pulseColor = 'rgba(239, 68, 68, 0.5)';
        break;
      case 'wysoki':
        color = '#f97316'; // Pomarańczowy
        pulseColor = 'rgba(249, 115, 22, 0.45)';
        break;
      case 'średni':
        color = '#eab308'; // Żółty
        pulseColor = 'rgba(234, 179, 8, 0.45)';
        break;
      case 'niski':
      default:
        color = '#22c55e'; // Zielony
        pulseColor = 'rgba(34, 197, 94, 0.45)';
        break;
    }
  } else if (mode === 'resource_urgency') {
    const resUrgency = getHighestResourceUrgency(alert.neededResources);
    switch (resUrgency) {
      case 'krytyczny':
        color = '#ef4444'; // Czerwony - krytyczne braki
        pulseColor = 'rgba(239, 68, 68, 0.5)';
        break;
      case 'wysoki':
        color = '#f97316'; // Pomarańczowy - wysokie braki
        pulseColor = 'rgba(249, 115, 22, 0.45)';
        break;
      case 'średni':
        color = '#eab308'; // Żółty - średnie braki
        pulseColor = 'rgba(234, 179, 8, 0.45)';
        break;
      case 'niski':
        color = '#84cc16'; // Limonkowy - niskie braki
        pulseColor = 'rgba(132, 204, 22, 0.45)';
        break;
      case 'zaspokojone':
        color = '#10b981'; // Szmaragdowy - zaspokojone
        pulseColor = 'rgba(16, 185, 129, 0.35)';
        break;
      case 'brak_potrzeb':
      default:
        color = '#64748b'; // Slate - brak zapotrzebowań
        pulseColor = 'transparent';
        break;
    }
  }

  const html = `
    <div class="relative flex items-center justify-center" style="width: 36px; height: 36px;">
      <span class="animate-ping absolute inline-flex h-8 w-8 rounded-full" style="background-color: ${pulseColor};"></span>
      <div class="relative flex items-center justify-center rounded-full shadow-2xl text-white font-bold transition-all duration-300" style="width: 30px; height: 30px; background-color: ${color}; border: 2.5px solid #ffffff; box-shadow: 0 0 15px ${pulseColor};">
        ${iconSvg}
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-crisis-pin',
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -18],
  });
};

// Helper badge krytyczności
export const getSeverityBadgeInfo = (severity?: string) => {
  switch (severity) {
    case 'krytyczny':
      return {
        label: 'Krytyczny',
        badgeClass: 'bg-red-100 text-red-800 border-red-200',
        dotClass: 'bg-red-500',
        color: '#ef4444',
      };
    case 'wysoki':
      return {
        label: 'Wysoki',
        badgeClass: 'bg-orange-100 text-orange-800 border-orange-200',
        dotClass: 'bg-orange-500',
        color: '#f97316',
      };
    case 'średni':
      return {
        label: 'Średni',
        badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
        dotClass: 'bg-amber-500',
        color: '#eab308',
      };
    case 'niski':
      return {
        label: 'Niski',
        badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        dotClass: 'bg-emerald-500',
        color: '#22c55e',
      };
    default:
      return {
        label: 'Wysoki',
        badgeClass: 'bg-orange-100 text-orange-800 border-orange-200',
        dotClass: 'bg-orange-500',
        color: '#f97316',
      };
  }
};

// Komponent automatycznie dopasowujący widok mapy do wszystkich markerów
const FitBoundsToMarkers: React.FC<{
  positions: [number, number][];
}> = ({ positions }) => {
  const map = useMap();

  useEffect(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
    }
  }, [positions, map]);

  return null;
};

// Komponent dynamicznie przenoszący widok mapy i otwierający dymek wskazanego alertu
const FocusOnAlertController: React.FC<{
  alertMarkers: { alert: AlertMapItem; position: [number, number] }[];
  focusedAlertId?: string | null;
  focusKey?: number;
  markerRefs: React.MutableRefObject<Record<string, L.Marker>>;
}> = ({ alertMarkers, focusedAlertId, focusKey, markerRefs }) => {
  const map = useMap();

  useEffect(() => {
    if (!focusedAlertId) return;

    const found = alertMarkers.find((m) => m.alert.id === focusedAlertId);
    if (found) {
      map.flyTo(found.position, 14, { duration: 1.1 });
      const timer = setTimeout(() => {
        const marker = markerRefs.current[focusedAlertId];
        if (marker) {
          marker.openPopup();
        }
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [focusedAlertId, focusKey, alertMarkers, map, markerRefs]);

  return null;
};

export const AlertsMap: React.FC<AlertsMapProps> = ({
  alerts,
  height = '500px',
  onDeactivate,
  canDeactivate,
  actionLoadingId,
  focusedAlertId,
  focusKey,
  defaultMode = 'severity',
  mode: controlledMode,
  onModeChange,
  availableModes = ['category', 'severity', 'resource_urgency'],
  showNeededResourcesInPopup = true,
  onNavigateToCard,
}) => {
  const navigate = useNavigate();
  const initialMode = availableModes.includes(defaultMode) ? defaultMode : availableModes[0] || 'severity';
  const [internalMode, setInternalMode] = useState<MapDisplayMode>(initialMode);
  const activeMode = controlledMode !== undefined ? controlledMode : internalMode;

  const handleModeChange = (newMode: MapDisplayMode) => {
    setInternalMode(newMode);
    if (onModeChange) {
      onModeChange(newMode);
    }
  };

  const handleGoToCard = (targetAlert: AlertMapItem) => {
    if (onNavigateToCard) {
      onNavigateToCard(targetAlert);
      return;
    }

    const cardElement = document.getElementById(`alert-card-${targetAlert.id}`);
    if (cardElement) {
      cardElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      cardElement.classList.add('ring-4', 'ring-indigo-400', 'transition-all');
      setTimeout(() => {
        cardElement.classList.remove('ring-4', 'ring-indigo-400');
      }, 2500);
      return;
    }

    navigate(`/dashboard/alerts/${targetAlert.id}`);
  };

  const markerRefs = useRef<Record<string, L.Marker>>({});

  // Przeliczenie współrzędnych dla alertów
  const alertMarkers = useMemo(() => {
    return alerts
      .map((alert, index) => {
        let lat = alert.lat;
        let lng = alert.lng;

        if (!lat || !lng) {
          const munName = alert.municipality?.name || '';
          const baseCoords = MUNICIPALITY_COORDINATES[munName] || DEFAULT_CENTER;
          const jitter = (index * 0.003) % 0.015;
          lat = baseCoords[0] + (index % 2 === 0 ? jitter : -jitter);
          lng = baseCoords[1] + (index % 3 === 0 ? jitter : -jitter);
        }

        return {
          alert,
          position: [lat, lng] as [number, number],
        };
      })
      .filter((item) => item.position[0] && item.position[1]);
  }, [alerts]);

  const positions = useMemo(
    () => alertMarkers.map((m) => m.position),
    [alertMarkers]
  );

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
    <div className="relative w-full rounded-3xl overflow-hidden shadow-2xl border border-slate-700/70 bg-slate-900">
      {/* Przełącznik trybów mapy (Górny panel nawigacyjny) */}
      {availableModes.length > 1 && (
        <div className="absolute top-3 right-3 z-20 rounded-2xl bg-slate-900/90 p-1.5 shadow-2xl backdrop-blur-md border border-slate-700/80 text-xs pointer-events-auto flex items-center gap-1">
          {availableModes.includes('category') && (
            <button
              type="button"
              onClick={() => handleModeChange('category')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition text-xs cursor-pointer ${activeMode === 'category'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
              title="Widok według kategorii zdarzenia"
            >
              <Layers className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Kategorie</span>
            </button>
          )}

          {availableModes.includes('severity') && (
            <button
              type="button"
              onClick={() => handleModeChange('severity')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition text-xs cursor-pointer ${activeMode === 'severity'
                ? 'bg-red-600 text-white shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
              title="Widok według krytyczności zdarzenia (🔴 Czerwony / 🟠 Pomarańczowy / 🟡 Żółty / 🟢 Zielony)"
            >
              <Flame className="h-3.5 w-3.5" />
              <span>Krytyczność Zdarzenia</span>
            </button>
          )}

          {availableModes.includes('resource_urgency') && (
            <button
              type="button"
              onClick={() => handleModeChange('resource_urgency')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition text-xs cursor-pointer ${activeMode === 'resource_urgency'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
              title="Widok według posiadania krytycznych żądań zasobowych"
            >
              <Boxes className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Krytyczność Żądań Zasobów</span>
              <span className="sm:hidden">Zasoby</span>
            </button>
          )}
        </div>
      )}

      <MapContainer
        center={DEFAULT_CENTER}
        zoom={10}
        scrollWheelZoom={true}
        style={{ height, width: '100%' }}
        className="z-10"
      >
        {/* CartoDB TileLayer */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        {/* Automatyczne dopasowanie widoku do markerów */}
        {!focusedAlertId && <FitBoundsToMarkers positions={positions} />}

        {/* Kontroler dynamicznego przelotu do wskazanego alertu */}
        <FocusOnAlertController
          alertMarkers={alertMarkers}
          focusedAlertId={focusedAlertId}
          focusKey={focusKey}
          markerRefs={markerRefs}
        />

        {/* Renderowanie markerów alertów */}
        {alertMarkers.map(({ alert, position }) => {
          const isAllowedToDeactivate =
            canDeactivate && alert.isActive && canDeactivate(alert);

          const severityInfo = getSeverityBadgeInfo(alert.severity);
          const resourceUrgency = getHighestResourceUrgency(alert.neededResources);

          return (
            <Marker
              key={`${alert.id}-${activeMode}`}
              position={position}
              icon={createCrisisIcon(alert, activeMode)}
              ref={(ref) => {
                if (ref) {
                  markerRefs.current[alert.id] = ref;
                }
              }}
            >
              <Popup className="crisis-leaflet-popup">
                <div className="p-1 max-w-xs sm:max-w-sm space-y-3 font-sans">
                  {/* Nagłówek popupu z krytycznością i kategorią */}
                  <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-slate-200 pb-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${severityInfo.badgeClass}`}
                      >
                        <span
                          className={`h-2 w-2 rounded-full ${severityInfo.dotClass}`}
                        ></span>
                        <span>{severityInfo.label}</span>
                      </span>

                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                        {alert.category}
                      </span>
                    </div>

                    <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-red-500 shrink-0" />
                      <span className="truncate max-w-[140px]">
                        {alert.locationName
                          ? `${alert.locationName}${alert.voivodeship ? ` (${alert.voivodeship})` : ''}`
                          : alert.municipality?.name || 'Lokalizacja'}
                      </span>
                    </span>
                  </div>

                  {/* Nazwa/Tytuł i Treść komunikatu */}
                  <div className="space-y-1">
                    {alert.title && (
                      <h4 className="text-sm font-extrabold text-slate-900 leading-tight">
                        {alert.title}
                      </h4>
                    )}
                    <p className="text-xs sm:text-sm font-medium text-slate-700 leading-snug">
                      {alert.content}
                    </p>
                  </div>

                  {/* Szczegóły jednostki i czasu */}
                  <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
                    <div className="flex items-center gap-1">
                      <Building className="h-3 w-3 text-slate-400" />
                      <span>{alert.author?.organization?.name || 'Służby'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-slate-400" />
                      <time>{formatDate(alert.createdAt)}</time>
                    </div>
                  </div>

                  {/* Zapotrzebowanie na zasoby (jeśli tryb i konfiguracja na to zezwalają) */}
                  {showNeededResourcesInPopup && availableModes.includes('resource_urgency') && (
                    Array.isArray(alert.neededResources) && alert.neededResources.length > 0 ? (
                      <div className="pt-1.5 border-t border-slate-100">
                        <div className="text-[10px] font-bold uppercase text-amber-700 mb-1 flex items-center justify-between">
                          <span>Zapotrzebowanie na zasoby:</span>
                          {resourceUrgency === 'krytyczny' && (
                            <span className="px-1.5 py-0.2 rounded bg-red-100 text-red-700 text-[9px] font-black uppercase">
                              Pilne żądania
                            </span>
                          )}
                        </div>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {alert.neededResources.map((nr) => (
                            <div
                              key={nr.id}
                              className="flex items-center justify-between text-[11px] bg-amber-50/70 border border-amber-200/60 rounded-lg px-2 py-1"
                            >
                              <div className="flex items-center gap-1 truncate pr-1">
                                <span
                                  className={`h-1.5 w-1.5 rounded-full shrink-0 ${nr.urgency === 'krytyczny'
                                    ? 'bg-red-500'
                                    : nr.urgency === 'wysoki'
                                      ? 'bg-orange-500'
                                      : nr.urgency === 'średni'
                                        ? 'bg-amber-500'
                                        : 'bg-emerald-500'
                                    }`}
                                ></span>
                                <span className="font-semibold text-slate-800 truncate">
                                  {nr.name}
                                </span>
                              </div>
                              <span className="font-mono text-slate-600 shrink-0 ml-1 text-[10px] font-bold">
                                {nr.quantityAllocated} / {nr.quantityNeeded} {nr.unit}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="pt-1.5 border-t border-slate-100 text-[11px] text-slate-400 italic">
                        Brak otwartych żądań zasobów
                      </div>
                    )
                  )}

                  {/* Przycisk przekierowania do kartki zdarzenia */}
                  <button
                    type="button"
                    onClick={() => handleGoToCard(alert)}
                    className="w-full mt-2.5 flex items-center justify-center gap-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs py-2 px-3 border border-indigo-200/80 transition shadow-2xs hover:shadow-xs cursor-pointer active:scale-95"
                    title="Przejdź do kartki tego zdarzenia"
                  >
                    <FileText className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                    <span>Przejdź do kartki zdarzenia</span>
                    <ArrowRight className="h-3.5 w-3.5 text-indigo-500 shrink-0 ml-0.5" />
                  </button>

                  {isAllowedToDeactivate && onDeactivate && (
                    <button
                      type="button"
                      onClick={() => onDeactivate(alert.id)}
                      disabled={actionLoadingId === alert.id}
                      className="w-full mt-1.5 flex items-center justify-center gap-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-2 px-3 shadow transition cursor-pointer"
                    >
                      <Ban className="h-3.5 w-3.5" />
                      <span>ODWOŁAJ KOMUNIKAT</span>
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      {/* Dynamiczna Nakładka Legendy Mapy */}
      <div className="absolute bottom-4 left-4 z-20 rounded-2xl bg-slate-900/90 p-3 shadow-2xl backdrop-blur-md border border-slate-700/80 text-xs text-slate-300 pointer-events-auto space-y-1.5 hidden sm:block max-w-xs">
        <div className="font-bold text-white flex items-center gap-1.5 pb-1 border-b border-slate-800">
          <AlertTriangle className="h-3.5 w-3.5 text-brand-400" />
          <span>
            {activeMode === 'category' && `Legenda: Kategorie (${alerts.length})`}
            {activeMode === 'severity' && `Legenda: Krytyczność Zdarzenia (${alerts.length})`}
            {activeMode === 'resource_urgency' && `Legenda: Krytyczność Żądań (${alerts.length})`}
          </span>
        </div>

        {activeMode === 'category' && (
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-cyan-400"></span>
              <span>Hydrologiczne</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400"></span>
              <span>Drogowe / Mosty</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400"></span>
              <span>Pomoc Humanitarna</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400"></span>
              <span>Inne / Pożary</span>
            </div>
          </div>
        )}

        {activeMode === 'severity' && (
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500 shadow-sm shadow-red-500/50"></span>
              <span className="font-bold text-red-400">Krytyczny</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-orange-500 shadow-sm shadow-orange-500/50"></span>
              <span className="font-bold text-orange-400">Wysoki</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-yellow-500 shadow-sm shadow-yellow-500/50"></span>
              <span className="font-bold text-yellow-400">Średni</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-green-500 shadow-sm shadow-green-500/50"></span>
              <span className="font-bold text-green-400">Niski</span>
            </div>
          </div>
        )}

        {activeMode === 'resource_urgency' && (
          <div className="space-y-1 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-500"></span>
              <span className="font-semibold text-red-300">Posiada krytyczne żądania</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-orange-500"></span>
              <span className="font-semibold text-orange-300">Posiada wysokie żądania</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-yellow-500"></span>
              <span className="font-semibold text-yellow-300">Średnie / niskie żądania</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
              <span className="font-semibold text-emerald-300">Wszystkie żądania zaspokojone</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-500"></span>
              <span className="font-semibold text-slate-400">Brak zgłoszonych żądań</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AlertsMap;
