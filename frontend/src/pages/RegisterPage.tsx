import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { Organization, UserRole } from '../types';
import {
  UserPlus,
  Mail,
  Lock,
  Phone,
  Building2,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [organizationId, setOrganizationId] = useState('');
  const [role, setRole] = useState<UserRole>('czlonek');

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const { register } = useAuth();
  const navigate = useNavigate();

  // Pobranie listy organizacji z publicznego endpointu API
  useEffect(() => {
    const fetchOrganizations = async () => {
      try {
        const response = await api.get('/organizations');
        if (response.data.success && Array.isArray(response.data.data)) {
          setOrganizations(response.data.data);
          if (response.data.data.length > 0) {
            setOrganizationId(response.data.data[0].id);
          }
        }
      } catch (error) {
        console.error('Błąd podczas pobierania organizacji:', error);
        setErrorMessage('Nie udało się pobrać listy organizacji. Upewnij się, że backend jest uruchomiony.');
      } finally {
        setIsLoadingOrgs(false);
      }
    };

    fetchOrganizations();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!organizationId) {
      setErrorMessage('Wybierz organizację, do której należysz.');
      return;
    }

    setIsSubmitting(true);

    const result = await register({
      firstName,
      lastName,
      email,
      password,
      phone,
      organizationId,
      role,
    });

    setIsSubmitting(false);

    if (result.success) {
      setSuccessMessage(
        result.message ||
          'Konto zostało utworzone! Twoje zgłoszenie oczekuje na weryfikację przez administratora.'
      );
    } else {
      setErrorMessage(result.message || 'Wystąpił błąd podczas rejestracji.');
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-65px)] items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-lg space-y-6">
        <div className="rounded-3xl bg-slate-800/80 p-8 shadow-2xl backdrop-blur-xl border border-slate-700/60">
          <div className="text-center mb-6">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-500/10 text-teal-400 mb-4 ring-1 ring-teal-500/30">
              <UserPlus className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Dołącz do platformy</h1>
            <p className="text-sm text-slate-400 mt-1">
              Zarejestruj swoje konto członka organizacji ratunkowej lub samorządowej
            </p>
          </div>

          {/* Komunikat o sukcesie */}
          {successMessage ? (
            <div className="rounded-2xl bg-emerald-500/10 p-6 border border-emerald-500/30 text-center space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-1">Rejestracja zakończona</h3>
                <p className="text-sm text-emerald-200">{successMessage}</p>
              </div>
              <div className="p-3 bg-slate-900/60 rounded-xl text-xs text-slate-300 text-left border border-slate-700/50 flex items-start gap-2">
                <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  Administrator otrzymał powiadomienie o Twojej rejestracji. Po zaakceptowaniu konta uzyskasz pełny dostęp do systemu.
                </span>
              </div>
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white py-3 text-sm font-semibold transition"
              >
                <span>Przejdź do logowania</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              {errorMessage && (
                <div className="mb-6 flex items-start gap-3 rounded-xl bg-red-500/10 p-4 border border-red-500/20 text-red-300 text-sm">
                  <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
                  <div className="flex-1 font-medium">{errorMessage}</div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      Imię
                    </label>
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Jan"
                      className="w-full rounded-xl bg-slate-900/80 border border-slate-700 py-2.5 px-3.5 text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-sm transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      Nazwisko
                    </label>
                    <input
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Kowalski"
                      className="w-full rounded-xl bg-slate-900/80 border border-slate-700 py-2.5 px-3.5 text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-sm transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Adres E-mail
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="jan.kowalski@osp.pl"
                      className="w-full rounded-xl bg-slate-900/80 border border-slate-700 py-2.5 pl-10 pr-3.5 text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-sm transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      Hasło
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Min. 6 znaków"
                        className="w-full rounded-xl bg-slate-900/80 border border-slate-700 py-2.5 pl-10 pr-3.5 text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-sm transition"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                      Telefon kontaktowy
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+48 500 100 200"
                        className="w-full rounded-xl bg-slate-900/80 border border-slate-700 py-2.5 pl-10 pr-3.5 text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-sm transition"
                      />
                    </div>
                  </div>
                </div>

                {/* Wybór organizacji */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Organizacja / Jednostka
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <select
                      value={organizationId}
                      onChange={(e) => setOrganizationId(e.target.value)}
                      disabled={isLoadingOrgs}
                      required
                      className="w-full appearance-none rounded-xl bg-slate-900/80 border border-slate-700 py-2.5 pl-10 pr-8 text-white focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-sm transition"
                    >
                      {isLoadingOrgs ? (
                        <option value="">Ładowanie organizacji...</option>
                      ) : organizations.length === 0 ? (
                        <option value="">Brak dostępnych organizacji</option>
                      ) : (
                        organizations.map((org) => (
                          <option key={org.id} value={org.id} className="bg-slate-900 text-white">
                            {org.name} ({org.type.toUpperCase()}) {org.municipality ? `– ${org.municipality.name}` : ''}
                          </option>
                        ))
                      )}
                    </select>
                    <div className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                      ▼
                    </div>
                  </div>
                </div>

                {/* Rola w systemie */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Wnioskowana rola
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['czlonek', 'koordynator', 'admin'] as UserRole[]).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRole(r)}
                        className={`rounded-xl py-2 px-3 text-xs font-semibold capitalize border transition ${
                          role === r
                            ? 'bg-brand-600/20 border-brand-500 text-brand-400 ring-1 ring-brand-500'
                            : 'bg-slate-900/60 border-slate-700 text-slate-400 hover:text-white'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || isLoadingOrgs}
                  className="w-full mt-4 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-brand-500 py-3.5 text-sm font-semibold text-white shadow-lg shadow-teal-500/25 hover:from-teal-500 hover:to-brand-400 focus:outline-none focus:ring-2 focus:ring-teal-500/40 disabled:opacity-50 transition transform active:scale-[0.99]"
                >
                  {isSubmitting ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      <span>Rejestrowanie...</span>
                    </>
                  ) : (
                    <>
                      <span>Wyślij zgłoszenie rejestracji</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 text-center text-sm text-slate-400">
                Masz już konto?{' '}
                <Link to="/login" className="font-semibold text-brand-400 hover:text-brand-300 underline underline-offset-4">
                  Zaloguj się
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
