import React, { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin,
  AlertTriangle,
  Building,
  Calendar,
  Ban,
} from 'lucide-react';

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
  content: string;
  category: string;
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

// Generator ikon HTML DivIcon dla Leaflet z animowanym pulsem
const createCrisisIcon = (category: string, isActive: boolean) => {
  const lower = category.toLowerCase();
  let color = '#ef4444'; // Czerwony domyślny
  let pulseColor = 'rgba(239, 68, 68, 0.4)';

  if (lower.includes('hydro') || lower.includes('powód') || lower.includes('woda')) {
    color = '#06b6d4'; // Cyan
    pulseColor = 'rgba(6, 182, 212, 0.4)';
  } else if (lower.includes('drog') || lower.includes('most') || lower.includes('objazd')) {
    color = '#f59e0b'; // Amber
    pulseColor = 'rgba(245, 158, 11, 0.4)';
  } else if (lower.includes('pomoc') || lower.includes('humanitar')) {
    color = '#10b981'; // Emerald
    pulseColor = 'rgba(16, 185, 129, 0.4)';
  }

  if (!isActive) {
    color = '#64748b'; // Slate dla nieaktywnych
    pulseColor = 'transparent';
  }

  const html = `
    <div class="relative flex items-center justify-center" style="width: 36px; height: 36px;">
      ${
        isActive
          ? `<span class="animate-ping absolute inline-flex h-8 w-8 rounded-full" style="background-color: ${pulseColor};"></span>`
          : ''
      }
      <div class="relative flex items-center justify-center rounded-full shadow-2xl text-white font-bold" style="width: 30px; height: 30px; background-color: ${color}; border: 2.5px solid #ffffff; box-shadow: 0 0 15px ${pulseColor};">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
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
}) => {
  const markerRefs = useRef<Record<string, L.Marker>>({});

  // Przeliczenie współrzędnych dla alertów
  const alertMarkers = useMemo(() => {
    return alerts
      .map((alert, index) => {
        let lat = alert.lat;
        let lng = alert.lng;

        // Jeśli alert nie ma współrzędnych, przypisujemy ze znanej gminy (z lekkim losowym przesunięciem, aby markery się nie nakładały)
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
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={10}
        scrollWheelZoom={true}
        style={{ height, width: '100%' }}
        className="z-10"
      >
        {/* Dark Mode CartoDB TileLayer */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        {/* Automatyczne dopasowanie widoku do markerów (gdy brak celowego skupienia) */}
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

          return (
            <Marker
              key={alert.id}
              position={position}
              icon={createCrisisIcon(alert.category, alert.isActive)}
              ref={(ref) => {
                if (ref) {
                  markerRefs.current[alert.id] = ref;
                }
              }}
            >
              <Popup className="crisis-leaflet-popup">
                <div className="p-1 max-w-xs sm:max-w-sm space-y-3 font-sans">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-800">
                      {alert.category}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-red-500 shrink-0" />
                      <span className="truncate max-w-[150px]">
                        {alert.locationName
                          ? `${alert.locationName}${alert.voivodeship ? ` (${alert.voivodeship})` : ''}`
                          : alert.municipality?.name || 'Lokalizacja'}
                      </span>
                    </span>
                  </div>

                  <p className="text-sm font-semibold text-slate-900 leading-snug">
                    {alert.content}
                  </p>

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

                  {Array.isArray(alert.neededResources) && alert.neededResources.length > 0 && (
                    <div className="pt-1.5 border-t border-slate-100">
                      <div className="text-[10px] font-bold uppercase text-amber-700 mb-1 flex items-center gap-1">
                        <span>Zapotrzebowanie na zasoby:</span>
                      </div>
                      <div className="space-y-1">
                        {alert.neededResources.map((nr) => (
                          <div
                            key={nr.id}
                            className="flex items-center justify-between text-[11px] bg-amber-50/70 border border-amber-200/60 rounded-lg px-2 py-0.5"
                          >
                            <span className="font-semibold text-slate-800 truncate">{nr.name}</span>
                            <span className="font-mono text-slate-600 shrink-0 ml-1">
                              {nr.quantityAllocated} / {nr.quantityNeeded} {nr.unit}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {isAllowedToDeactivate && onDeactivate && (
                    <button
                      type="button"
                      onClick={() => onDeactivate(alert.id)}
                      disabled={actionLoadingId === alert.id}
                      className="w-full mt-2 flex items-center justify-center gap-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-2 px-3 shadow transition"
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

      {/* Nakładka legendy mapy */}
      <div className="absolute bottom-4 left-4 z-20 rounded-2xl bg-slate-900/90 p-3 shadow-2xl backdrop-blur-md border border-slate-700/80 text-xs text-slate-300 pointer-events-auto space-y-1.5 hidden sm:block">
        <div className="font-bold text-white flex items-center gap-1.5 pb-1 border-b border-slate-800">
          <AlertTriangle className="h-3.5 w-3.5 text-brand-400" />
          <span>Legenda Zdarzeń ({alerts.length})</span>
        </div>
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
      </div>
    </div>
  );
};

export default AlertsMap;
