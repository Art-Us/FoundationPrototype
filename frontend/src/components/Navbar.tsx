import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Menu,
  Search,
  LogOut,
  Shield,
  MapPin,
  LogIn,
  UserPlus,
  ChevronDown,
} from 'lucide-react';

interface NavbarProps {
  onToggleSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setIsProfileMenuOpen(false);
    navigate('/login');
  };

  const getInitials = (firstName?: string, lastName?: string) => {
    if (!firstName && !lastName) return 'U';
    return `${(firstName || '')[0] || ''}${(lastName || '')[0] || ''}`.toUpperCase();
  };

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

      {/* Prawa strona: Gmina, Powiadomienia, Profil użytkownika */}
      <div className="flex items-center gap-2.5 sm:gap-3.5">
        {/* Wskaźnik gminy dla zalogowanego */}
        {user?.organization && (
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100/90 text-slate-700 border border-slate-200/70 text-xs font-semibold">
            <MapPin className="h-3.5 w-3.5 text-indigo-600" />
            <span className="truncate max-w-[140px]">
              {user.organization.name}
            </span>
          </div>
        )}

        {/* Profil / Logowanie */}
        {user ? (
          <div className="relative">
            <button
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="flex items-center gap-2.5 p-1 sm:px-2.5 sm:py-1.5 rounded-xl hover:bg-slate-100 transition border border-transparent hover:border-slate-200"
            >
              {/* Avatar z inicjałami */}
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white font-bold text-xs shadow-xs">
                {getInitials(user.firstName, user.lastName)}
              </div>

              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-bold text-slate-800 leading-none truncate max-w-[110px]">
                  {user.firstName} {user.lastName}
                </span>
                <span className="text-[10px] font-semibold text-indigo-600 capitalize">
                  {user.role}
                </span>
              </div>

              <ChevronDown className="h-3.5 w-3.5 text-slate-400 hidden sm:block" />
            </button>

            {/* Dropdown Menu użytkownika */}
            {isProfileMenuOpen && (
              <>
                <div
                  onClick={() => setIsProfileMenuOpen(false)}
                  className="fixed inset-0 z-40"
                />
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white p-2 shadow-xl border border-slate-100 z-50 animate-fade-in space-y-1">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-900">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60 uppercase">
                        <Shield className="h-3 w-3" />
                        {user.role}
                      </span>
                      {user.isVerified && (
                        <span className="text-[10px] font-semibold text-emerald-600">
                          ✓ Zweryfikowany
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 transition text-left"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Wyloguj się</span>
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
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
