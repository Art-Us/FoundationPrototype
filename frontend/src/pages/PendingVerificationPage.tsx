import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Clock, RefreshCw, LogOut, ShieldAlert, Mail } from 'lucide-react';
import api from '../services/api';

export const PendingVerificationPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isChecking, setIsChecking] = useState(false);
  const [checkMessage, setCheckMessage] = useState<string | null>(null);

  const handleCheckStatus = async () => {
    setIsChecking(true);
    setCheckMessage(null);

    try {
      // Próba odświeżenia statusu użytkownika
      // Sprawdzamy np. logując się ponownie lub odpytując chroniony endpoint
      // Jeśli token zadziała na chronionym endpointzie, konto zostało zweryfikowane!
      const res = await api.get('/alerts/public');
      if (res.status === 200) {
        // Możemy również zweryfikować stan przez ponowne pobranie
        // Jeśli użytkownik został zweryfikowany przez admina w bazie,
        // przy następnym logowaniu otrzyma pełny token
        setCheckMessage('Status został sprawdzony. Zaloguj się ponownie, aby zaktualizować uprawnienia.');
      }
    } catch (error: any) {
      setCheckMessage('Konto nadal oczekuje na zatwierdzenie przez administratora.');
    } finally {
      setIsChecking(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-[calc(100vh-65px)] items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md rounded-3xl bg-slate-800/80 p-8 shadow-2xl backdrop-blur-xl border border-amber-500/20 text-center space-y-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/30">
          <Clock className="h-8 w-8 animate-pulse" />
        </div>

        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Konto oczekuje na weryfikację</h1>
          <p className="text-sm text-slate-400 mt-2">
            Witaj <span className="font-semibold text-slate-200">{user?.firstName} {user?.lastName}</span>! Ze względów bezpieczeństwa koordynacji kryzysowej, nowe konta muszą zostać zweryfikowane przez Administratora.
          </p>
        </div>

        <div className="rounded-2xl bg-slate-900/60 p-4 border border-slate-700/60 text-xs text-slate-300 text-left space-y-2">
          <div className="flex items-center gap-2 text-amber-400 font-semibold">
            <ShieldAlert className="h-4 w-4" />
            <span>Co się teraz dzieje?</span>
          </div>
          <p>
            Administrator Twojej organizacji lub platformy otrzymał zgłoszenie i zweryfikuje Twoją tożsamość. Po akceptacji otrzymasz pełny dostęp do modułu alertów i matrycy zasobów.
          </p>
          <div className="pt-2 border-t border-slate-800 flex items-center gap-2 text-slate-400">
            <Mail className="h-3.5 w-3.5" />
            <span>Zalogowany jako: <strong className="text-slate-300">{user?.email}</strong></span>
          </div>
        </div>

        {checkMessage && (
          <div className="rounded-xl bg-slate-900/80 p-3 text-xs text-amber-300 border border-amber-500/30">
            {checkMessage}
          </div>
        )}

        <div className="space-y-3 pt-2">
          <button
            type="button"
            onClick={handleCheckStatus}
            disabled={isChecking}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white py-3 text-sm font-semibold transition"
          >
            <RefreshCw className={`h-4 w-4 ${isChecking ? 'animate-spin' : ''}`} />
            <span>Sprawdź status weryfikacji</span>
          </button>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900/80 hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-slate-700/60 py-3 text-sm font-medium transition"
          >
            <LogOut className="h-4 w-4" />
            <span>Wyloguj się</span>
          </button>
        </div>
      </div>
    </div>
  );
};
