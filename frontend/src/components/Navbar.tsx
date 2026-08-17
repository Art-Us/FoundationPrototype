import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, User as UserIcon, LogOut, Bell, LayoutDashboard, ShieldAlert, Database } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-600 to-teal-400 text-white shadow-lg shadow-brand-500/20 group-hover:scale-105 transition transform">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-white flex items-center gap-1.5">
              Fundacja <span className="text-brand-500">Q</span>
            </span>
            <span className="block text-[10px] text-slate-400 uppercase tracking-widest font-semibold">
              Koordynacja Kryzysowa
            </span>
          </div>
        </Link>

        {/* Nawigacja */}
        <nav className="flex items-center gap-2 sm:gap-4">
          <Link
            to="/"
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 rounded-lg transition"
          >
            <Bell className="h-4 w-4 text-brand-500" />
            <span>Alerty</span>
          </Link>

          {isAuthenticated && user?.isVerified && (
            <>
              <Link
                to="/dashboard"
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 rounded-lg transition"
              >
                <LayoutDashboard className="h-4 w-4 text-teal-400" />
                <span>Pulpit</span>
              </Link>
              <Link
                to="/dashboard/alerts"
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 rounded-lg transition"
              >
                <Bell className="h-4 w-4 text-red-400" />
                <span className="hidden sm:inline">Alerty</span>
              </Link>
              <Link
                to="/dashboard/resources"
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800/60 rounded-lg transition"
              >
                <Database className="h-4 w-4 text-cyan-400" />
                <span className="hidden sm:inline">Zasoby</span>
              </Link>
            </>
          )}

          {isAuthenticated && user?.role === 'admin' && (
            <Link
              to="/admin"
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-lg transition border border-amber-500/20"
            >
              <ShieldAlert className="h-4 w-4" />
              <span>Panel Admina</span>
            </Link>
          )}

          <div className="h-6 w-px bg-slate-800 mx-1 hidden sm:block"></div>

          {isAuthenticated && user ? (
            <div className="flex items-center gap-3">
              <div className="hidden md:flex flex-col text-right">
                <span className="text-sm font-semibold text-white">
                  {user.firstName} {user.lastName}
                </span>
                <span className="text-xs text-brand-400 capitalize flex items-center justify-end gap-1">
                  <span className={`inline-block w-1.5 h-1.5 rounded-full ${user.isVerified ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                  {user.role} {user.isVerified ? '' : '(oczekuje)'}
                </span>
              </div>
              <button
                onClick={handleLogout}
                title="Wyloguj się"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-300 hover:text-red-400 text-sm font-medium transition border border-slate-700/50"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Wyloguj</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-200 hover:text-white hover:bg-slate-800/80 rounded-xl transition"
              >
                <UserIcon className="h-4 w-4" />
                <span>Logowanie</span>
              </Link>
              <Link
                to="/register"
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-500 shadow-md shadow-brand-500/20 rounded-xl transition"
              >
                <span>Rejestracja</span>
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
};
