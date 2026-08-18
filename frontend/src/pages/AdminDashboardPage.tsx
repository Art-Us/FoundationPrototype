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
        return 'bg-red-50 text-red-700 border-red-200';
      case 'samorzad':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'ngo':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

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
            <button onClick={() => setToast(null)} className="ml-2 hover:opacity-75">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Nagłówek panelu */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 text-amber-600 font-semibold text-xs tracking-wider uppercase mb-1">
            <ShieldCheck className="h-4 w-4" />
            <span>Panel Administracyjny • Bezpieczeństwo i Uprawnienia</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Weryfikacja Nowych Służb i Użytkowników
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Weryfikuj tożsamość personelu ratunkowego przed przyznaniem dostępu do panelu operacyjnego
          </p>
        </div>

        <button
          onClick={fetchPendingUsers}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 shadow-xs transition w-fit"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Odśwież wnioski</span>
        </button>
      </div>

      {/* Kafelki podsumowań w stylu Metoxi */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-3xl bg-white p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Oczekujące na decyzję
            </span>
            <div className="text-2xl font-black text-amber-600">
              {pendingUsers.length}{' '}
              <span className="text-xs font-normal text-slate-500">wniosków</span>
            </div>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 shadow-xs shrink-0">
            <Clock className="h-6 w-6" />
          </div>
        </div>

        <div className="rounded-3xl bg-white p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Rola Użytkownika
            </span>
            <div className="text-lg font-black text-slate-900">Administrator Główny</div>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-xs shrink-0">
            <ShieldCheck className="h-6 w-6" />
          </div>
        </div>

        <div className="rounded-3xl bg-white p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Standard Bezpieczeństwa
            </span>
            <div className="text-lg font-black text-slate-900">Weryfikacja Roli i Gminy</div>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 shadow-xs shrink-0">
            <CheckCircle2 className="h-6 w-6" />
          </div>
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
          className="w-full rounded-2xl bg-white border border-slate-200 py-3 pl-10 pr-4 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 shadow-xs transition"
        />
      </div>

      {/* Tabela Użytkowników Oczekujących na Weryfikację */}
      <div className="rounded-3xl bg-white shadow-xs border border-slate-200/80 overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-500" />
            <h2 className="text-sm font-bold text-slate-900">
              Wnioski Rejestracyjne ({filteredUsers.length})
            </h2>
          </div>
          <span className="text-xs text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200 font-semibold">
            Status: isVerified = false
          </span>
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-slate-400">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent mb-3"></div>
            <p className="text-xs">Pobieranie wniosków...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <p className="text-base font-bold text-slate-900">Brak oczekujących wniosków</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Wszyscy zarejestrowani użytkownicy posiadają zweryfikowane konta.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-[11px] uppercase tracking-wider text-slate-500 font-semibold">
                  <th className="py-3.5 px-6">Użytkownik</th>
                  <th className="py-3.5 px-4">Kontakt</th>
                  <th className="py-3.5 px-4">Organizacja</th>
                  <th className="py-3.5 px-4">Rola</th>
                  <th className="py-3.5 px-4">Data Zgłoszenia</th>
                  <th className="py-3.5 px-6 text-right">Decyzja</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredUsers.map((pUser) => {
                  const isActionLoading = actionLoadingId === pUser.id;

                  return (
                    <tr
                      key={pUser.id}
                      className="hover:bg-slate-50/60 transition duration-150"
                    >
                      {/* Użytkownik */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-700 font-bold border border-amber-200">
                            {pUser.firstName[0]}
                            {pUser.lastName[0]}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-sm">
                              {pUser.firstName} {pUser.lastName}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              ID: {pUser.id.slice(0, 8)}...
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Kontakt */}
                      <td className="py-4 px-4">
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                            <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span>{pUser.email}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span>{pUser.phone}</span>
                          </div>
                        </div>
                      </td>

                      {/* Organizacja */}
                      <td className="py-4 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                            <Building className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
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
                        <span className="inline-block px-2.5 py-1 rounded-xl bg-slate-100 text-xs font-semibold text-slate-700 border border-slate-200 capitalize">
                          {pUser.role}
                        </span>
                      </td>

                      {/* Data Zgłoszenia */}
                      <td className="py-4 px-4 text-xs text-slate-500 font-mono">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          <span>{formatDate(pUser.createdAt)}</span>
                        </div>
                      </td>

                      {/* Przyciski: Zatwierdź i Odrzuć */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleVerify(pUser)}
                            disabled={isActionLoading}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition transform active:scale-95 disabled:opacity-50"
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
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs border border-red-200 transition transform active:scale-95 disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center gap-3 text-red-600">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-red-50 border border-red-200">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Odrzucić wniosek?</h3>
                <p className="text-xs text-slate-500">Tej operacji nie można cofnąć</p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Czy na pewno chcesz odrzucić zgłoszenie użytkownika{' '}
              <strong className="text-slate-900 font-semibold">
                {rejectDialogUser.firstName} {rejectDialogUser.lastName}
              </strong>{' '}
              ({rejectDialogUser.email})? Konto zostanie usunięte z kolejki weryfikacyjnej.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRejectDialogUser(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
              >
                Anuluj
              </button>
              <button
                type="button"
                onClick={handleRejectConfirm}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-xs transition"
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

export default AdminDashboardPage;
