import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  BellRing,
  Database,
  ShieldCheck,
  Radio,
  ChevronRight,
  ShieldAlert,
  LogOut,
  Layers,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onCloseMobile }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';
  const isVerified = user?.isVerified === true;

  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName && !lastName) return 'U';
    return `${(firstName || '')[0] || ''}${(lastName || '')[0] || ''}`.toUpperCase();
  };

  const handleLogout = () => {
    logout();
    if (onCloseMobile) onCloseMobile();
    navigate('/login');
  };

  const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
    `group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${isActive
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
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-white border-r border-slate-200/80 shadow-sm flex flex-col justify-between transition-transform duration-300 ease-in-out lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        {/* Górna część: Logo i Marka */}
        <div className="flex flex-col flex-1 min-h-0">
          <div className="h-16 flex items-center px-6 border-b border-slate-100 gap-3 shrink-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-md shadow-indigo-500/25">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-base tracking-tight text-slate-900 flex items-center gap-1.5">
                Fundacja Q
              </span>
              <span className="text-[10px] font-medium text-slate-400">
                System Koordynacji Kryzysowej
              </span>
            </div>
          </div>

          {/* Lista nawigacyjna */}
          <div className="p-4 space-y-6 overflow-y-auto flex-1">
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
                  to="/dashboard/operational"
                  onClick={onCloseMobile}
                  className={navLinkClasses}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100 transition">
                      <Layers className="h-4 w-4" />
                    </div>
                    <span>Dyspozytornia i Zasoby</span>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </NavLink>

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
          </div>
        </div>

        {/* Dolna część sidebaru: Karta Użytkownika / Administratora */}
        {user && (
          <div className="p-3 border-t border-slate-100 bg-slate-50/70 shrink-0">
            <div className="flex items-center justify-between gap-2 p-2.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                {/* Avatar z inicjałami (np. PA) */}
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-bold text-xs shadow-xs">
                  {getInitials(user.firstName, user.lastName)}
                </div>

                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-slate-800 truncate leading-tight">
                    {user.firstName} {user.lastName}
                  </span>
                  <span className="text-[10px] font-semibold text-indigo-600 capitalize truncate">
                    {user.role}
                  </span>
                </div>
              </div>

              {/* Przycisk wylogowania */}
              <button
                type="button"
                onClick={handleLogout}
                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition shrink-0 cursor-pointer"
                title="Wyloguj się"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};

export default Sidebar;
