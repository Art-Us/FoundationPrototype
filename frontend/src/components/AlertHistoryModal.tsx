import React from 'react';
import { AlertMapItem } from './AlertsMap';
import {
  History,
  X,
  Clock,
  Calendar,
  Building,
  User,
  CheckCircle2,
  PlayCircle,
  PauseCircle,
  Edit3,
  Timer,
} from 'lucide-react';

interface AlertHistoryModalProps {
  alert: AlertMapItem | null;
  onClose: () => void;
}

// Funkcja pomocnicza do formatowania czasu trwania
export const formatDuration = (ms: number): string => {
  if (ms <= 0) return '0 min';
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    const remHours = hours % 24;
    return `${days}d ${remHours}h`;
  }
  if (hours > 0) {
    const remMinutes = minutes % 60;
    return `${hours}h ${remMinutes}min`;
  }
  return `${minutes} min`;
};

export const calculateAlertDurations = (alert: AlertMapItem) => {
  const events = Array.isArray(alert.history) && alert.history.length > 0
    ? [...alert.history].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      )
    : [
        {
          id: 'initial',
          action: 'created' as const,
          timestamp: alert.createdAt,
          userName: alert.author ? `${alert.author.firstName} ${alert.author.lastName}` : undefined,
          organizationName: alert.author?.organization?.name,
          details: 'Utworzenie alertu',
        },
      ];

  let totalActiveMs = 0;
  let activeStartTime: number | null = null;
  const episodes: {
    type: 'active' | 'paused';
    startTime: string;
    endTime: string | null;
    durationMs: number;
    description: string;
  }[] = [];

  let lastDeactivatedTime: number | null = null;

  events.forEach((evt) => {
    const eventTime = new Date(evt.timestamp).getTime();

    if (evt.action === 'created' || evt.action === 'reactivated') {
      // Jeśli przed reaktywacją był stan odwołany, zarejestruj czas pauzy
      if (lastDeactivatedTime !== null) {
        const pauseMs = eventTime - lastDeactivatedTime;
        episodes.push({
          type: 'paused',
          startTime: new Date(lastDeactivatedTime).toISOString(),
          endTime: evt.timestamp,
          durationMs: pauseMs,
          description: 'Okres wstrzymania (w archiwum)',
        });
        lastDeactivatedTime = null;
      }
      activeStartTime = eventTime;
    } else if (evt.action === 'deactivated') {
      if (activeStartTime !== null) {
        const activeMs = eventTime - activeStartTime;
        totalActiveMs += activeMs;
        episodes.push({
          type: 'active',
          startTime: new Date(activeStartTime).toISOString(),
          endTime: evt.timestamp,
          durationMs: activeMs,
          description: 'Aktywny epizod kryzysowy',
        });
        activeStartTime = null;
      }
      lastDeactivatedTime = eventTime;
    }
  });

  // Jeśli alert jest nadal aktywny (nie zakończony)
  if (activeStartTime !== null) {
    const ongoingMs = Date.now() - activeStartTime;
    totalActiveMs += ongoingMs;
    episodes.push({
      type: 'active',
      startTime: new Date(activeStartTime).toISOString(),
      endTime: null,
      durationMs: ongoingMs,
      description: 'Trwający epizod (nadal aktywny)',
    });
  }

  // Pierwsza i ostatnia data
  const firstEventDate = events[0]?.timestamp || alert.createdAt;
  const lastEventDate = events[events.length - 1]?.timestamp || alert.createdAt;

  return {
    events,
    episodes,
    totalActiveMs,
    firstEventDate,
    lastEventDate,
    totalEventsCount: events.length,
  };
};

export const AlertHistoryModal: React.FC<AlertHistoryModalProps> = ({ alert, onClose }) => {
  if (!alert) return null;

  const { events, episodes, totalActiveMs, firstEventDate, lastEventDate } =
    calculateAlertDurations(alert);

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'created':
        return <PlayCircle className="h-4 w-4 text-emerald-400" />;
      case 'deactivated':
        return <PauseCircle className="h-4 w-4 text-red-400" />;
      case 'reactivated':
        return <PlayCircle className="h-4 w-4 text-cyan-400" />;
      case 'updated':
        return <Edit3 className="h-4 w-4 text-amber-400" />;
      default:
        return <Clock className="h-4 w-4 text-slate-400" />;
    }
  };

  const getActionName = (action: string) => {
    switch (action) {
      case 'created':
        return 'Utworzenie i publikacja';
      case 'deactivated':
        return 'Odwołanie komunikatu (Archiwum)';
      case 'reactivated':
        return 'Wznowienie komunikatu';
      case 'updated':
        return 'Aktualizacja parametrów';
      default:
        return 'Zdarzenie';
    }
  };

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'created':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      case 'deactivated':
        return 'bg-red-500/15 text-red-300 border-red-500/30';
      case 'reactivated':
        return 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30';
      case 'updated':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      default:
        return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-2xl rounded-3xl bg-slate-850 p-6 sm:p-8 shadow-2xl border border-slate-700 space-y-6 max-h-[90vh] overflow-y-auto">
        {/* Nagłówek modalu */}
        <div className="flex items-center justify-between border-b border-slate-700 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
              <History className="h-6 w-6 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Historia i Cykl Życia Alertu</h3>
              <p className="text-xs text-slate-400">
                Szczegółowy audyt zdarzeń, czasu aktywności i wznowień
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Karta alertu - podsumowanie */}
        <div className="rounded-2xl bg-slate-900/90 p-4 border border-slate-700/80 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-brand-400 uppercase tracking-wider">
              {alert.category}
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                alert.isActive
                  ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              {alert.isActive ? '● Aktywny' : '✓ Zarchiwizowany'}
            </span>
          </div>
          <p className="text-sm font-semibold text-slate-200">{alert.content}</p>
          <div className="text-xs text-slate-400 flex flex-wrap items-center gap-x-4 gap-y-1 pt-1">
            <span>
              Lokalizacja: <strong>{alert.locationName || alert.municipality?.name || 'Gmina'}</strong>
            </span>
            <span>
              Organizacja: <strong>{alert.author?.organization?.name || 'Służby'}</strong>
            </span>
          </div>
        </div>

        {/* Podsumowanie czasowe (Kluczowe metryki) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Sumaryczny czas aktywności */}
          <div className="rounded-2xl bg-slate-800/90 p-4 border border-brand-500/30 shadow-md">
            <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-1">
              <span>Łączny czas alertu</span>
              <Timer className="h-4 w-4 text-brand-400" />
            </div>
            <div className="text-xl font-extrabold text-white font-mono">
              {formatDuration(totalActiveMs)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Suma stanów aktywnych</div>
          </div>

          {/* Data rozpoczęcia */}
          <div className="rounded-2xl bg-slate-800/90 p-4 border border-slate-700 shadow-md">
            <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-1">
              <span>Pierwszy start</span>
              <Calendar className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-xs font-bold text-slate-200">
              {new Date(firstEventDate).toLocaleString('pl-PL', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Inicjalna publikacja</div>
          </div>

          {/* Ostatnia zmiana / koniec */}
          <div className="rounded-2xl bg-slate-800/90 p-4 border border-slate-700 shadow-md">
            <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-1">
              <span>Ostatnie zdarzenie</span>
              <Clock className="h-4 w-4 text-teal-400" />
            </div>
            <div className="text-xs font-bold text-slate-200">
              {new Date(lastEventDate).toLocaleString('pl-PL', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {alert.isActive ? 'Wciąż nadawany' : 'Ostatnie odwołanie'}
            </div>
          </div>
        </div>

        {/* Rozbicie na epizody czasowe */}
        {episodes.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Cykle i Odstępy Czasowe ({episodes.length})
            </h4>
            <div className="space-y-2">
              {episodes.map((ep, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-3 ${
                    ep.type === 'active'
                      ? 'bg-brand-500/10 border-brand-500/30 text-brand-200'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {ep.type === 'active' ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                    ) : (
                      <PauseCircle className="h-4 w-4 text-slate-500 shrink-0" />
                    )}
                    <div>
                      <div className="font-bold text-white">{ep.description}</div>
                      <div className="text-[11px] opacity-75">
                        {new Date(ep.startTime).toLocaleTimeString('pl-PL', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        ➔{' '}
                        {ep.endTime
                          ? new Date(ep.endTime).toLocaleTimeString('pl-PL', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Teraz (Trwa)'}
                      </div>
                    </div>
                  </div>
                  <div className="font-mono font-bold text-sm text-white shrink-0">
                    {formatDuration(ep.durationMs)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Oś czasu (Timeline zdarzeń) */}
        <div className="space-y-3 pt-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
            Dziennik Zdarzeń (Timeline)
          </h4>

          <div className="relative border-l-2 border-slate-700 ml-3.5 space-y-5 py-1">
            {events.map((evt, idx) => (
              <div key={evt.id || idx} className="relative pl-6 group">
                {/* Punkt na osi */}
                <div className="absolute -left-[9px] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-slate-900 border-2 border-brand-500 group-hover:scale-110 transition">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-400"></span>
                </div>

                <div className="rounded-xl bg-slate-900/80 p-3 border border-slate-700/60 space-y-1.5 hover:border-slate-600 transition">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold border ${getActionBadgeColor(
                        evt.action
                      )}`}
                    >
                      {getActionIcon(evt.action)}
                      <span>{getActionName(evt.action)}</span>
                    </span>

                    <span className="text-[11px] font-mono text-slate-400">
                      {new Date(evt.timestamp).toLocaleString('pl-PL', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                  </div>

                  {evt.details && (
                    <p className="text-xs text-slate-300 font-medium">{evt.details}</p>
                  )}

                  <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-0.5">
                    {evt.userName && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        <span>{evt.userName}</span>
                      </span>
                    )}
                    {evt.organizationName && (
                      <span className="flex items-center gap-1">
                        <Building className="h-3 w-3" />
                        <span>{evt.organizationName}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold transition"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
};

export default AlertHistoryModal;
