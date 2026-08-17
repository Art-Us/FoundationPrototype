import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, LogIn, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    const result = await login(email, password);
    setIsSubmitting(false);

    if (result.success) {
      // Sprawdzenie zapisanego użytkownika
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const userObj = JSON.parse(storedUser);
        if (!userObj.isVerified) {
          navigate('/pending');
          return;
        }
        if (userObj.role === 'admin') {
          navigate('/admin');
          return;
        }
      }
      navigate(from, { replace: true });
    } else {
      setErrorMessage(result.message || 'Błędny email lub hasło.');
    }
  };

  // Funkcja pomocnicza do szybkiego testowania kont
  const fillCredentials = (testEmail: string, testPass: string) => {
    setEmail(testEmail);
    setPassword(testPass);
    setErrorMessage('');
  };

  return (
    <div className="flex min-h-[calc(100vh-65px)] items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md space-y-6">
        {/* Karta formularza */}
        <div className="rounded-3xl bg-slate-800/80 p-8 shadow-2xl backdrop-blur-xl border border-slate-700/60">
          <div className="text-center mb-8">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-500 mb-4 ring-1 ring-brand-500/30">
              <LogIn className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Logowanie do systemu</h1>
            <p className="text-sm text-slate-400 mt-1">
              Wprowadź swoje dane, aby uzyskać dostęp do panelu koordynacji
            </p>
          </div>

          {errorMessage && (
            <div className="mb-6 flex items-start gap-3 rounded-xl bg-red-500/10 p-4 border border-red-500/20 text-red-300 text-sm">
              <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Adres E-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="twoj.email@organizacja.pl"
                  className="w-full rounded-xl bg-slate-900/80 border border-slate-700 py-3 pl-11 pr-4 text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-sm transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Hasło
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl bg-slate-900/80 border border-slate-700 py-3 pl-11 pr-4 text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-sm transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-teal-500 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 hover:from-brand-500 hover:to-teal-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 disabled:opacity-50 transition transform active:scale-[0.99]"
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                  <span>Logowanie...</span>
                </>
              ) : (
                <>
                  <span>Zaloguj się</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-400">
            Nie masz jeszcze konta?{' '}
            <Link to="/register" className="font-semibold text-brand-400 hover:text-brand-300 underline underline-offset-4">
              Zarejestruj się
            </Link>
          </div>
        </div>

        {/* Panel szybkiego testowania kont demo */}
        <div className="rounded-2xl bg-slate-800/40 p-5 border border-slate-700/40 text-xs">
          <div className="flex items-center gap-2 text-slate-300 font-semibold mb-3">
            <ShieldCheck className="h-4 w-4 text-brand-400" />
            <span>Konta testowe (kliknij, aby wypełnić):</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => fillCredentials('admin@fundacjaq.pl', 'admin123')}
              className="rounded-lg bg-slate-800/80 hover:bg-slate-700/80 p-2 text-left border border-slate-700/60 transition"
            >
              <div className="font-semibold text-amber-400">👑 Admin</div>
              <div className="text-slate-400 truncate">admin@fundacjaq.pl</div>
            </button>

            <button
              type="button"
              onClick={() => fillCredentials('koordynator.klodzko@samorzad.pl', 'koord123')}
              className="rounded-lg bg-slate-800/80 hover:bg-slate-700/80 p-2 text-left border border-slate-700/60 transition"
            >
              <div className="font-semibold text-teal-400">🎯 Koordynator</div>
              <div className="text-slate-400 truncate">koordynator.klodzko...</div>
            </button>

            <button
              type="button"
              onClick={() => fillCredentials('jan.strazak@osp.pl', 'haslo123')}
              className="rounded-lg bg-slate-800/80 hover:bg-slate-700/80 p-2 text-left border border-slate-700/60 transition"
            >
              <div className="font-semibold text-emerald-400">🚒 Członek (OSP)</div>
              <div className="text-slate-400 truncate">jan.strazak@osp.pl</div>
            </button>

            <button
              type="button"
              onClick={() => fillCredentials('anna.nowak@ngo.pl', 'haslo123')}
              className="rounded-lg bg-slate-800/80 hover:bg-slate-700/80 p-2 text-left border border-slate-700/60 transition"
            >
              <div className="font-semibold text-purple-400">⏳ Niezweryfikowany</div>
              <div className="text-slate-400 truncate">anna.nowak@ngo.pl</div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
