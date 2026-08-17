import React, { useState, useEffect, useMemo } from 'react';
import api from '../services/api';
import {
  ShieldCheck,
  UserCheck,
  UserX,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  Building,
  Mail,
  Phone,
  Calendar,
  X,
  AlertCircle,
} from 'lucide-react';

interface PendingUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  organizationId: string;
  isVerified: boolean;
  organization?: {
    id: string;
    name: string;
    type: 'samorzad' | 'sluzby' | 'ngo';
    municipalityId?: string;
  };
  createdAt: string;
}

export const AdminDashboardPage: React.FC = () => {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Dialog potwierdzenia odrzucenia
  const [rejectDialogUser, setRejectDialogUser] = useState<PendingUser | null>(null);

  // Toast
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

  const fetchPendingUsers = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/admin/users/pending');
      if (res.data.success && Array.isArray(res.data.data)) {
        setPendingUsers(res.data.data);
      }
    } catch (error: any) {
      console.error('Błąd pobierania użytkowników:', error);
      showToast(
        error.response?.data?.message || 'Nie udało się pobrać listy oczekujących użytkowników.',
        'error'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  // 1. Zatwierdzenie użytkownika
  const handleVerify = async (user: PendingUser) => {
    setActionLoadingId(user.id);
    try {
      const res = await api.patch(`/admin/users/${user.id}/verify`);
      if (res.data.success) {
        setPendingUsers((prev) => prev.filter((u) => u.id !== user.id));
        showToast(`Użytkownik ${user.firstName} ${user.lastName} został pomyślnie zweryfikowany!`);
      }
    } catch (error: any) {
      showToast(
        error.response?.data?.message || 'Wystąpił błąd podczas weryfikacji konta.',
        'error'
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  // 2. Odrzucenie wniosku
  const handleRejectConfirm = async () => {
    if (!rejectDialogUser) return;
    const userToReject = rejectDialogUser;
    setActionLoadingId(userToReject.id);
    setRejectDialogUser(null);

    try {
      const res = await api.delete(`/admin/users/${userToReject.id}/reject`);
      if (res.data.success) {
        setPendingUsers((prev) => prev.filter((u) => u.id !== userToReject.id));
        showToast(
          `Wniosek użytkownika ${userToReject.firstName} ${userToReject.lastName} został odrzucony.`
        );
      }
    } catch (error: any) {
      showToast(
        error.response?.data?.message || 'Wystąpił błąd podczas odrzucania wniosku.',
        'error'
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filtrowanie listy
  const filteredUsers = useMemo(() => {
    return pendingUsers.filter((u) => {
      const fullText = `${u.firstName} ${u.lastName} ${u.email} ${u.phone} ${
        u.organization?.name || ''
      } ${u.role}`.toLowerCase();
      return fullText.includes(searchQuery.toLowerCase());
    });
  }, [pendingUsers, searchQuery]);

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

  const getOrgBadge = (type?: string) => {
    switch (type) {
      case 'sluzby':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'samorzad':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'ngo':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      default:
        return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  };

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

      {/* Nagłówek panelu */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 text-amber-400 font-semibold text-xs tracking-wider uppercase mb-1">
            <ShieldCheck className="h-4 w-4" />
            <span>Panel Administracyjny • Bezpieczeństwo i Uprawnienia</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Weryfikacja Nowych Użytkowników
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Weryfikuj tożsamość personelu ratunkowego przed przyznaniem dostępu do panelu operacyjnego
          </p>
        </div>

        <button
          onClick={fetchPendingUsers}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold border border-slate-700/60 transition shadow-sm w-fit"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Odśwież wnioski</span>
        </button>
      </div>

      {/* Kafelki podsumowań */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-slate-800/80 p-5 border border-amber-500/30 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase mb-2">
            <span>Oczekujące na decyzję</span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">{pendingUsers.length}</div>
          <p className="text-[11px] text-amber-400/80 mt-1 font-medium">Wymaga weryfikacji tożsamości</p>
        </div>

        <div className="rounded-2xl bg-slate-800/80 p-5 border border-slate-700/60 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase mb-2">
            <span>Rola w systemie</span>
            <ShieldCheck className="h-4 w-4 text-brand-400" />
          </div>
          <div className="text-xl font-bold text-white">Administrator Główny</div>
          <p className="text-[11px] text-slate-400 mt-1">Pełne uprawnienia decyzyjne</p>
        </div>

        <div className="rounded-2xl bg-slate-800/80 p-5 border border-slate-700/60 shadow-xl backdrop-blur-md">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase mb-2">
            <span>Standard Bezpieczeństwa</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-white">Dwustopniowa Autoryzacja</div>
          <p className="text-[11px] text-emerald-400/80 mt-1">Weryfikacja organizacji i roli</p>
        </div>
      </div>

      {/* Wyszukiwarka */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Szukaj po nazwisku, emailu, telefonie lub organizacji..."
          className="w-full rounded-2xl bg-slate-800/90 border border-slate-700 py-3 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition"
        />
      </div>

      {/* Tabela Użytkowników Oczekujących na Weryfikację */}
      <div className="rounded-3xl bg-slate-800/90 shadow-2xl backdrop-blur-xl border border-slate-700/70 overflow-hidden">
        <div className="border-b border-slate-700 px-6 py-4 flex items-center justify-between bg-slate-850">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-400" />
            <h2 className="text-base font-bold text-white">
              Wnioski Rejestracyjne ({filteredUsers.length})
            </h2>
          </div>
          <span className="text-xs text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 font-semibold">
            Status: isVerified = false
          </span>
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-slate-400">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent mb-3"></div>
            <p className="text-sm">Pobieranie wniosków...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <p className="text-base font-bold text-white">Brak oczekujących wniosków</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Wszyscy zarejestrowani użytkownicy posiadają zweryfikowane konta.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-900/80 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                  <th className="py-3.5 px-6">Użytkownik</th>
                  <th className="py-3.5 px-4">Kontakt</th>
                  <th className="py-3.5 px-4">Organizacja</th>
                  <th className="py-3.5 px-4">Rola</th>
                  <th className="py-3.5 px-4">Data Zgłoszenia</th>
                  <th className="py-3.5 px-6 text-right">Decyzja</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-700/60 text-sm">
                {filteredUsers.map((pUser) => {
                  const isActionLoading = actionLoadingId === pUser.id;

                  return (
                    <tr
                      key={pUser.id}
                      className="hover:bg-slate-750/50 transition duration-150"
                    >
                      {/* Użytkownik */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500/20 to-brand-500/20 text-amber-300 font-bold border border-amber-500/30">
                            {pUser.firstName[0]}
                            {pUser.lastName[0]}
                          </div>
                          <div>
                            <div className="font-bold text-white text-sm">
                              {pUser.firstName} {pUser.lastName}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              ID: {pUser.id.slice(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Kontakt */}
                      <td className="py-4 px-4">
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                            <Mail className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                            <span>{pUser.email}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-400">
                            <Phone className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                            <span>{pUser.phone}</span>
                          </div>
                        </div>
                      </td>

                      {/* Organizacja */}
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                            <Building className="h-3.5 w-3.5 text-brand-400 shrink-0" />
                            <span>{pUser.organization?.name || 'Organizacja nieznana'}</span>
                          </div>
                          {pUser.organization?.type && (
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getOrgBadge(
                                pUser.organization.type
                              )}`}
                            >
                              {pUser.organization.type}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Rola */}
                      <td className="py-4 px-4">
                        <span className="inline-block px-2.5 py-1 rounded-lg bg-slate-900 text-xs font-semibold text-slate-300 border border-slate-700 capitalize">
                          {pUser.role}
                        </span>
                      </td>

                      {/* Data Zgłoszenia */}
                      <td className="py-4 px-4 text-xs text-slate-400 font-mono">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-slate-500" />
                          <span>{formatDate(pUser.createdAt)}</span>
                        </div>
                      </td>

                      {/* Przyciski: Zatwierdź i Odrzuć */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleVerify(pUser)}
                            disabled={isActionLoading}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 border border-emerald-400/30 transition transform active:scale-95 disabled:opacity-50"
                          >
                            {isActionLoading ? (
                              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                            ) : (
                              <UserCheck className="h-3.5 w-3.5" />
                            )}
                            <span>Zatwierdź</span>
                          </button>

                          <button
                            onClick={() => setRejectDialogUser(pUser)}
                            disabled={isActionLoading}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white font-bold text-xs border border-red-500/30 transition transform active:scale-95 disabled:opacity-50"
                          >
                            <UserX className="h-3.5 w-3.5" />
                            <span>Odrzuć</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dialog Potwierdzenia Odrzucenia */}
      {rejectDialogUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-slate-850 p-6 shadow-2xl border border-red-500/40 space-y-5">
            <div className="flex items-center gap-3 text-red-400">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Odrzucić wniosek?</h3>
                <p className="text-xs text-slate-400">Tej operacji nie można cofnąć</p>
              </div>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">
              Czy na pewno chcesz odrzucić zgłoszenie użytkownika{' '}
              <strong className="text-white font-semibold">
                {rejectDialogUser.firstName} {rejectDialogUser.lastName}
              </strong>{' '}
              ({rejectDialogUser.email})? Konto zostanie usunięte z kolejki weryfikacyjnej.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-700">
              <button
                type="button"
                onClick={() => setRejectDialogUser(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Anuluj
              </button>
              <button
                type="button"
                onClick={handleRejectConfirm}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-600/30 transition"
              >
                <UserX className="h-4 w-4" />
                <span>Tak, odrzuć wniosek</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
