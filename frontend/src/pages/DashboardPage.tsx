import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { ShieldCheck, Bell, Database, Users, ArrowRight } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Baner powitalny */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-800 via-slate-850 to-brand-950/40 p-8 border border-slate-700/60 shadow-2xl backdrop-blur-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/20 mb-3">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Konto Aktywne & Zweryfikowane</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Witaj, {user?.firstName} {user?.lastName}!
          </h1>
          <p className="text-slate-400 text-sm mt-2">
            Jesteś zalogowany jako <span className="text-brand-400 font-semibold uppercase">{user?.role}</span>. Masz pełny dostęp do systemu koordynacji kryzysowej, zarządzania zasobami i publikacji alertów.
          </p>
        </div>
      </div>

      {/* Skróty do modułów */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          to="/"
          className="group rounded-2xl bg-slate-800/80 p-6 border border-slate-700/60 hover:border-brand-500/50 hover:bg-slate-800 transition shadow-xl"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400 mb-4 group-hover:scale-110 transition">
            <Bell className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-white group-hover:text-brand-400 transition flex items-center justify-between">
            <span>Centrum Alertów</span>
            <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition" />
          </h3>
          <p className="text-xs text-slate-400 mt-2">
            Przeglądaj aktywne ostrzeżenia i komunikaty kryzysowe dla poszczególnych gmin.
          </p>
        </Link>

        <div className="rounded-2xl bg-slate-800/80 p-6 border border-slate-700/60 shadow-xl">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-500/10 text-teal-400 mb-4">
            <Database className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-white">Matryca Zasobów</h3>
          <p className="text-xs text-slate-400 mt-2">
            Monitoruj dostępność personelu, wody, sprzętu i materiałów w horyzontach czasowych.
          </p>
        </div>

        {user?.role === 'admin' ? (
          <Link
            to="/admin"
            className="group rounded-2xl bg-slate-800/80 p-6 border border-amber-500/30 hover:border-amber-500/60 hover:bg-slate-800 transition shadow-xl"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 mb-4 group-hover:scale-110 transition">
              <Users className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-white group-hover:text-amber-400 transition flex items-center justify-between">
              <span>Weryfikacja Kont</span>
              <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition" />
            </h3>
            <p className="text-xs text-slate-400 mt-2">
              Panel administratora: przeglądaj oczekujące rejestracje i aktywuj konta.
            </p>
          </Link>
        ) : (
          <div className="rounded-2xl bg-slate-800/80 p-6 border border-slate-700/60 shadow-xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 mb-4">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Twoja Organizacja</h3>
            <p className="text-xs text-slate-400 mt-2">
              Status zweryfikowany. Twoje zgłoszenia są powiązane z Twoją jednostką.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
