import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  BellRing,
  Database,
  ShieldCheck,
  Radio,
  Building2,
  ChevronRight,
  ShieldAlert,
  Wifi,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onCloseMobile }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isVerified = user?.isVerified === true;

  const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
    `group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
      isActive
        ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100 font-bold'
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
    }`;

  return (
    <>
      {/* Tło przyciemniające na urządzeniach mobilnych */}
      {isOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-slate-200/80 shadow-sm flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Górna część: Logo i Marka */}
        <div className="flex flex-col">
          <div className="h-16 flex items-center px-6 border-b border-slate-100 gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-md shadow-indigo-500/25">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-base tracking-tight text-slate-900 flex items-center gap-1.5">
                Fundacja Q
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-200/60">
                  HUB
                </span>
              </span>
              <span className="text-[10px] font-medium text-slate-400">
                System Koordynacji Kryzysowej
              </span>
            </div>
          </div>

          {/* Lista nawigacyjna */}
          <div className="p-4 space-y-6 overflow-y-auto max-h-[calc(100vh-10rem)]">
            {/* SEKCJA 1: Tablica Publiczna */}
            <div className="space-y-1">
              <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Główne
              </div>
              <NavLink to="/" onClick={onCloseMobile} className={navLinkClasses}>
                <div className="flex items-center gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-600 group-hover:text-indigo-600 group-hover:bg-indigo-50 transition">
                    <Radio className="h-4 w-4" />
                  </div>
                  <span>Tablica Publiczna</span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </NavLink>
            </div>

            {/* SEKCJA 2: Panel Operacyjny (dla zalogowanych zweryfikowanych) */}
            {user && isVerified && (
              <div className="space-y-1">
                <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Panel Operacyjny
                </div>

                <NavLink
                  to="/dashboard/alerts"
                  onClick={onCloseMobile}
                  className={navLinkClasses}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 text-red-600 group-hover:bg-red-100 transition">
                      <BellRing className="h-4 w-4" />
                    </div>
                    <span>Alerty i Komunikaty</span>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </NavLink>

                <NavLink
                  to="/dashboard/resources"
                  onClick={onCloseMobile}
                  className={navLinkClasses}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50 text-teal-600 group-hover:bg-teal-100 transition">
                      <Database className="h-4 w-4" />
                    </div>
                    <span>Matryca Zasobów</span>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </NavLink>
              </div>
            )}

            {/* SEKCJA 3: Administracja (dla roli admin) */}
            {isAdmin && (
              <div className="space-y-1">
                <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Administracja
                </div>

                <NavLink
                  to="/dashboard/admin"
                  onClick={onCloseMobile}
                  className={navLinkClasses}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600 group-hover:bg-amber-100 transition">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <span>Weryfikacja Służb</span>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </NavLink>
              </div>
            )}

            {/* Wizytówka Organizacji Użytkownika */}
            {user?.organization && (
              <div className="pt-2">
                <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100/70 p-3.5 border border-slate-200/80 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white shadow-xs border border-slate-200/60 text-slate-700">
                      <Building2 className="h-3.5 w-3.5 text-indigo-600" />
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-slate-800 truncate">
                        {user.organization.name}
                      </span>
                      <span className="text-[10px] uppercase font-semibold text-slate-500">
                        Typ: {user.organization.type}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Dolna część sidebaru: Status systemu i PWA */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[11px] font-semibold text-slate-600">System Aktywny</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400">
              <Wifi className="h-3 w-3 text-emerald-500" />
              <span>v1.2 PWA</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
