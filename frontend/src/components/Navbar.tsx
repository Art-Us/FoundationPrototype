import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  Menu,
  Search,
  MapPin,
  LogIn,
  UserPlus,
  Sun,
  Moon,
} from 'lucide-react';

interface NavbarProps {
  onToggleSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const { user } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800 shadow-xs px-4 sm:px-6 flex items-center justify-between transition-colors">
      {/* Lewa strona: Hamburger i wyszukiwarka */}
      <div className="flex items-center gap-3 sm:gap-4 flex-1 max-w-xl">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition lg:hidden"
          title="Przełącz menu boczne"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Pole wyszukiwania w nagłówku */}
        <div className="relative w-full max-w-xs sm:max-w-sm hidden sm:block">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Szukaj alertów, zasobów, jednostek..."
            className="w-full rounded-xl bg-slate-100/80 dark:bg-slate-800 border border-transparent dark:border-slate-700/60 py-2 pl-9 pr-4 text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-slate-850 focus:border-indigo-500/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition"
          />
        </div>
      </div>

      {/* Prawa strona: Gmina i przyciski akcji dla niezalogowanego */}
      <div className="flex items-center gap-2.5 sm:gap-3.5">
        {/* Przycisk szybkiego przełączania motywu */}
        <button
          type="button"
          onClick={toggleTheme}
          className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          title={isDark ? 'Przełącz na tryb jasny' : 'Przełącz na tryb ciemny'}
        >
          {isDark ? (
            <Sun className="h-4 w-4 text-amber-400" />
          ) : (
            <Moon className="h-4 w-4 text-slate-600" />
          )}
        </button>

        {/* Wskaźnik gminy dla zalogowanego */}
        {user?.organization && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100/90 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/70 dark:border-slate-700 text-xs font-semibold">
            <MapPin className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
            <span className="truncate max-w-[180px]">
              {user.organization.name}
            </span>
          </div>
        )}

        {/* Logowanie / Rejestracja dla niezalogowanych */}
        {!user && (
          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <LogIn className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Logowanie</span>
            </Link>

            <Link
              to="/register"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/25 transition"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>Rejestracja</span>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
};

export default Navbar;

