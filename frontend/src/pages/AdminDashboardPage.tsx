import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { User } from '../types';
import { ShieldCheck, UserCheck, Clock, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchPendingUsers = async () => {
    setIsLoading(true);
    setStatusMessage(null);
    try {
      const res = await api.get('/admin/users/pending');
      if (res.data.success && Array.isArray(res.data.data)) {
        setPendingUsers(res.data.data);
      }
    } catch (error: any) {
      console.error('Błąd pobierania użytkowników:', error);
      setStatusMessage({
        type: 'error',
        text: 'Nie udało się pobrać listy niezweryfikowanych użytkowników.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const handleVerifyUser = async (userId: string, userName: string) => {
    setActionLoadingId(userId);
    setStatusMessage(null);

    try {
      const res = await api.patch(`/admin/users/${userId}/verify`);
      if (res.data.success) {
        setStatusMessage({
          type: 'success',
          text: `Użytkownik ${userName} został pomyślnie zweryfikowany.`,
        });
        // Usunięcie użytkownika z listy oczekujących
        setPendingUsers((prev) => prev.filter((u) => u.id !== userId));
      }
    } catch (error: any) {
      setStatusMessage({
        type: 'error',
        text: error.response?.data?.message || 'Wystąpił błąd podczas weryfikacji użytkownika.',
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Nagłówek */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2.5 text-amber-400 font-semibold text-xs tracking-wider uppercase mb-1">
            <ShieldCheck className="h-4 w-4" />
            <span>Panel Administracyjny</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Weryfikacja Użytkowników
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Zarządzaj zgłoszeniami rejestracyjnymi i aktywuj dostęp dla personelu ratunkowego
          </p>
        </div>

        <button
          onClick={fetchPendingUsers}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold border border-slate-700/60 transition shadow-sm w-fit"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Odśwież listę</span>
        </button>
      </div>

      {statusMessage && (
        <div
          className={`mb-6 flex items-start gap-3 rounded-2xl p-4 border text-sm ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-red-500/10 border-red-500/30 text-red-300'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
          )}
          <span className="font-medium">{statusMessage.text}</span>
        </div>
      )}

      {/* Lista oczekujących */}
      <div className="rounded-3xl bg-slate-800/80 shadow-2xl backdrop-blur-xl border border-slate-700/60 overflow-hidden">
        <div className="border-b border-slate-700/60 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-400" />
            <h2 className="text-base font-bold text-white">
              Oczekujące wnioski ({pendingUsers.length})
            </h2>
          </div>
          <span className="text-xs text-slate-400 bg-slate-900/60 px-3 py-1 rounded-full border border-slate-700/50">
            Wymaga autoryzacji
          </span>
        </div>

        {isLoading ? (
          <div className="py-16 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent mb-3"></div>
            <p className="text-sm text-slate-400">Pobieranie wniosków...</p>
          </div>
        ) : pendingUsers.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <p className="text-base font-semibold text-white">Wszystkie konta są zweryfikowane!</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Brak nowych zgłoszeń rejestracyjnych oczekujących na zatwierdzenie.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-700/50">
            {pendingUsers.map((pUser) => (
              <div
                key={pUser.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-6 gap-4 hover:bg-slate-700/20 transition"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-white">
                      {pUser.firstName} {pUser.lastName}
                    </span>
                    <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-400 border border-amber-500/20 capitalize">
                      {pUser.role}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                    <span>📧 {pUser.email}</span>
                    <span>📞 {pUser.phone}</span>
                    {pUser.organizationId && (
                      <span className="text-slate-300">
                        🏢 ID Organizacji: <code className="bg-slate-900 px-1.5 py-0.5 rounded">{pUser.organizationId}</code>
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleVerifyUser(pUser.id, `${pUser.firstName} ${pUser.lastName}`)}
                  disabled={actionLoadingId === pUser.id}
                  className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 hover:from-emerald-500 hover:to-teal-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 disabled:opacity-50 transition transform active:scale-95 shrink-0"
                >
                  {actionLoadingId === pUser.id ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      <span>Weryfikowanie...</span>
                    </>
                  ) : (
                    <>
                      <UserCheck className="h-4 w-4" />
                      <span>Zweryfikuj i Aktywuj</span>
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
