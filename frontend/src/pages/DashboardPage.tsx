import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { ShieldCheck, Bell, Database, Users, ArrowRight, Building2 } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      {/* Baner powitalny w stylu Metoxi */}
      <div className="rounded-3xl bg-white p-6 sm:p-8 border border-slate-200/80 shadow-xs relative overflow-hidden">
        <div className="relative z-10 max-w-2xl space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Konto Aktywne & Zweryfikowane</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Witaj, {user?.firstName} {user?.lastName}!
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">
            Jesteś zalogowany jako <span className="text-indigo-700 font-bold uppercase">{user?.role}</span> w jednostce{' '}
            <strong className="text-slate-800">{user?.organization?.name || 'Służby Ratunkowe'}</strong>. Masz pełny dostęp do systemu koordynacji kryzysowej, zarządzania zasobami i publikacji alertów.
          </p>
        </div>
      </div>

      {/* Skróty do modułów */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Link
          to="/dashboard/alerts"
          className="group rounded-3xl bg-white p-6 border border-slate-200/80 hover:border-indigo-300 hover:shadow-md transition duration-200 shadow-xs flex flex-col justify-between"
        >
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600 mb-4 group-hover:scale-110 transition shadow-xs">
              <Bell className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition flex items-center justify-between">
              <span>Zarządzaj Alertami</span>
              <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition text-indigo-600" />
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Publikuj nowe ostrzeżenia kryzysowe z geolokalizacją, monitoruj i wznawiaj komunikaty z archiwum.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-xs font-bold text-indigo-600">
            Przejdź do alertów →
          </div>
        </Link>

        <Link
          to="/dashboard/resources"
          className="group rounded-3xl bg-white p-6 border border-slate-200/80 hover:border-indigo-300 hover:shadow-md transition duration-200 shadow-xs flex flex-col justify-between"
        >
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 mb-4 group-hover:scale-110 transition shadow-xs">
              <Database className="h-6 w-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition flex items-center justify-between">
              <span>Matryca Zasobów</span>
              <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition text-indigo-600" />
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Monitoruj dostępność personelu, wody, sprzętu i materiałów w horyzontach czasowych (24h, 48h, 72h, Tydzień).
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-xs font-bold text-indigo-600">
            Otwórz matrycę →
          </div>
        </Link>

        {user?.role === 'admin' ? (
          <Link
            to="/dashboard/admin"
            className="group rounded-3xl bg-white p-6 border border-slate-200/80 hover:border-indigo-300 hover:shadow-md transition duration-200 shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 mb-4 group-hover:scale-110 transition shadow-xs">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition flex items-center justify-between">
                <span>Weryfikacja Kont</span>
                <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition text-indigo-600" />
              </h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Panel administratora: przeglądaj oczekujące rejestracje służb i aktywuj nowe konta.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-xs font-bold text-amber-600">
              Zarządzaj wnioskami →
            </div>
          </Link>
        ) : (
          <div className="rounded-3xl bg-white p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 mb-4 shadow-xs">
                <Building2 className="h-6 w-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Twoja Organizacja</h3>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                Status zweryfikowany. Twoje zgłoszenia są powiązane z jednostką: <strong>{user?.organization?.name}</strong>.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-xs font-semibold text-slate-400">
              Autoryzacja aktywna
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
