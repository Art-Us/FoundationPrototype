import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Menu,
  Search,
  MapPin,
  LogIn,
  UserPlus,
} from 'lucide-react';

interface NavbarProps {
  onToggleSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs px-4 sm:px-6 flex items-center justify-between">
      {/* Lewa strona: Hamburger i wyszukiwarka */}
      <div className="flex items-center gap-3 sm:gap-4 flex-1 max-w-xl">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition lg:hidden"
          title="Przełącz menu boczne"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Pole wyszukiwania w nagłówku */}
        <div className="relative w-full max-w-xs sm:max-w-sm hidden sm:block">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Szukaj alertów, zasobów, jednostek..."
            className="w-full rounded-xl bg-slate-100/80 border border-transparent py-2 pl-9 pr-4 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:border-indigo-500/50 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 transition"
          />
        </div>
      </div>

      {/* Prawa strona: Gmina i przyciski akcji dla niezalogowanego */}
      <div className="flex items-center gap-2.5 sm:gap-3.5">
        {/* Wskaźnik gminy dla zalogowanego */}
        {user?.organization && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100/90 text-slate-700 border border-slate-200/70 text-xs font-semibold">
            <MapPin className="h-3.5 w-3.5 text-indigo-600" />
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
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition"
            >
              <LogIn className="h-3.5 w-3.5 text-indigo-600" />
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
