import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  BellRing,
  Database,
  ShieldCheck,
  Radio,
  ChevronRight,
  ShieldAlert,
  LogOut,
  Layers,
  History,
  Sun,
  Moon,
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onCloseMobile }) => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
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
      ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100 font-bold dark:bg-indigo-950/70 dark:text-indigo-300 dark:border-indigo-800/80'
      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800/60'
    }`;

  return (
    <>
      {/* Tło przyciemniające na urządzeniach mobilnych */}
      {isOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between transition-all duration-300 ease-in-out lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        {/* Górna część: Logo i Marka */}
        <div className="flex flex-col flex-1 min-h-0">
          <div className="h-16 flex items-center px-6 border-b border-slate-100 dark:border-slate-800/80 gap-3 shrink-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-md shadow-indigo-500/25">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                Fundacja Q
              </span>
              <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                System Koordynacji Kryzysowej
              </span>
            </div>
          </div>

          {/* Lista nawigacyjna */}
          <div className="p-4 space-y-6 overflow-y-auto flex-1">
            {/* SEKCJA 1: Tablica Publiczna */}
            <div className="space-y-1">
              <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Główne
              </div>
              <NavLink to="/" end onClick={onCloseMobile} className={navLinkClasses}>
                <div className="flex items-center gap-3">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/50 transition">
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
                <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Panel Operacyjny
                </div>

                <NavLink
                  to="/dashboard/operational"
                  onClick={onCloseMobile}
                  className={navLinkClasses}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/60 transition">
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
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 group-hover:bg-red-100 dark:group-hover:bg-red-900/60 transition">
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
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 group-hover:bg-teal-100 dark:group-hover:bg-teal-900/60 transition">
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
                <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Administracja
                </div>

                <NavLink
                  to="/dashboard/admin"
                  end
                  onClick={onCloseMobile}
                  className={navLinkClasses}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 group-hover:bg-amber-100 dark:group-hover:bg-amber-900/60 transition">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <span>Weryfikacja Służb</span>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </NavLink>

                <NavLink
                  to="/dashboard/admin/logs"
                  end
                  onClick={onCloseMobile}
                  className={navLinkClasses}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/60 transition">
                      <History className="h-4 w-4" />
                    </div>
                    <span>Dziennik i Logi Zdarzeń</span>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                </NavLink>
              </div>
            )}
          </div>
        </div>

        {/* Dolna część sidebaru: Przełącznik Dark Mode oraz Karta Użytkownika */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/90 shrink-0 space-y-2">
          {/* Przełącznik Motywu */}
          <button
            type="button"
            onClick={toggleTheme}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 hover:border-indigo-300 dark:hover:border-indigo-600 shadow-xs transition"
          >
            <div className="flex items-center gap-2">
              {isDark ? (
                <Moon className="h-4 w-4 text-indigo-400" />
              ) : (
                <Sun className="h-4 w-4 text-amber-500" />
              )}
              <span>{isDark ? 'Tryb Ciemny' : 'Tryb Jasny'}</span>
            </div>
            <div className={`w-8 h-4.5 flex items-center rounded-full p-0.5 transition-colors duration-200 ${isDark ? 'bg-indigo-600 justify-end' : 'bg-slate-300 justify-start'}`}>
              <div className="w-3.5 h-3.5 rounded-full bg-white shadow-sm" />
            </div>
          </button>

          {/* Karta Użytkownika */}
          {user && (
            <div className="flex items-center justify-between gap-2 p-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                {/* Avatar z inicjałami (np. PA) */}
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-bold text-xs shadow-xs">
                  {getInitials(user.firstName, user.lastName)}
                </div>

                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate leading-tight">
                    {user.firstName} {user.lastName}
                  </span>
                  <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 capitalize truncate">
                    {user.role}
                  </span>
                </div>
              </div>

              {/* Przycisk wylogowania */}
              <button
                type="button"
                onClick={handleLogout}
                className="p-1.5 rounded-lg text-slate-400 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 transition shrink-0"
                title="Wyloguj się"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;

