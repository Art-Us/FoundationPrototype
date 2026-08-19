import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  AlertsMap,
  AlertMapItem,
  NeededResourceItem,
  getSeverityBadgeInfo,
} from '../components/AlertsMap';
import {
  ArrowLeft,
  MapPin,
  Building,
  AlertTriangle,
  User,
  Waves,
  Truck,
  HeartHandshake,
  PackageCheck,
  CheckCircle2,
  Send,
  Plus,
  MessageSquare,
  MessagesSquare,
  MessageCircle,
  FileText,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface OrgResourceItem {
  id: string;
  type: string;
  subcategory?: string | null;
  quantity: number;
  timeframe: string;
}

export const AlertDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [alert, setAlert] = useState<AlertMapItem | null>(null);
  const [orgResources, setOrgResources] = useState<OrgResourceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Formularz nowego wpisu/posta
  const [showNewPostForm, setShowNewPostForm] = useState(false);
  const [postTitle, setPostTitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postType, setPostType] = useState<'raport_terenowy' | 'komunikat_sztabowy' | 'logistyka' | 'ogolne'>('raport_terenowy');
  const [isSubmittingPost, setIsSubmittingPost] = useState(false);

  // Wiadomości czatu w poszczególnych wpisach (klucz: postId, wartość: tekst wpisywanej wiadomości)
  const [chatInputs, setChatInputs] = useState<Record<string, string>>({});
  const [isSubmittingChat, setIsSubmittingChat] = useState<Record<string, boolean>>({});
  const [expandedChats, setExpandedChats] = useState<Record<string, boolean>>({});

  const toggleChat = (postId: string) => {
    setExpandedChats((prev) => ({
      ...prev,
      [postId]: !prev[postId],
    }));
  };

  // Modal Alokacji zasobów
  const [allocatingResource, setAllocatingResource] = useState<NeededResourceItem | null>(null);
  const [selectedOrgResourceId, setSelectedOrgResourceId] = useState<string>('');
  const [allocateQuantity, setAllocateQuantity] = useState<number>(1);
  const [allocationNote, setAllocationNote] = useState<string>('');
  const [isSubmittingAlloc, setIsSubmittingAlloc] = useState(false);

  // Toast
  const [toast, setToast] = useState<{
    id: number;
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const toastId = Date.now();
    setToast({ id: toastId, type, message });
    setTimeout(() => {
      setToast((current) => (current?.id === toastId ? null : current));
    }, 4500);
  };

  const fetchAlertDetails = async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const [alertRes, orgRes] = await Promise.all([
        api.get(`/alerts/${id}`),
        api.get('/resources/my-organization').catch(() => ({ data: { resources: [] } })),
      ]);

      if (alertRes.data.success && alertRes.data.data) {
        setAlert(alertRes.data.data);
      }
      if (orgRes.data?.resources && Array.isArray(orgRes.data.resources)) {
        setOrgResources(orgRes.data.resources);
      }
    } catch (err: any) {
      console.error('Błąd pobierania szczegółów alertu:', err);
      setError(
        err.response?.data?.message || 'Nie udało się pobrać szczegółów tego komunikatu.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAlertDetails();
  }, [id]);

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString('pl-PL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  // Dodawanie nowego wpisu operacyjnego
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alert || !postContent.trim()) return;

    setIsSubmittingPost(true);
    try {
      const res = await api.post(`/alerts/${alert.id}/posts`, {
        title: postTitle.trim() || 'Wpis operacyjny',
        content: postContent.trim(),
        postType,
      });

      if (res.data.success && res.data.data) {
        setAlert(res.data.data);
        setPostTitle('');
        setPostContent('');
        setShowNewPostForm(false);
        showToast('Nowy wpis został pomyślnie opublikowany na forum komunikatu!');
      }
    } catch (err: any) {
      showToast(
        err.response?.data?.message || 'Wystąpił błąd podczas dodawania wpisu.',
        'error'
      );
    } finally {
      setIsSubmittingPost(false);
    }
  };

  // Wysyłanie wiadomości na czacie pod danym wpisem
  const handleSendChatMessage = async (postId: string, e: React.FormEvent) => {
    e.preventDefault();
    const msgText = (chatInputs[postId] || '').trim();
    if (!alert || !msgText) return;

    setIsSubmittingChat((prev) => ({ ...prev, [postId]: true }));
    try {
      const res = await api.post(`/alerts/${alert.id}/posts/${postId}/messages`, {
        content: msgText,
      });

      if (res.data.success && res.data.data) {
        setAlert(res.data.data);
        setChatInputs((prev) => ({ ...prev, [postId]: '' }));
        setExpandedChats((prev) => ({ ...prev, [postId]: true }));
      }
    } catch (err: any) {
      showToast(
        err.response?.data?.message || 'Nie udało się wysłać wiadomości.',
        'error'
      );
    } finally {
      setIsSubmittingChat((prev) => ({ ...prev, [postId]: false }));
    }
  };

  // Otwarcie modalu alokacji z dopasowaniem kategorii i automatycznym wyliczeniem ilości
  const openAllocationModal = (needed: NeededResourceItem) => {
    setAllocatingResource(needed);
    setAllocationNote('');

    const remainingNeeded = Math.max(
      1,
      needed.quantityNeeded - (needed.quantityAllocated || 0)
    );

    // Filtrujemy zasoby organizacji tylko do tej samej kategorii co zapotrzebowanie
    const matchingResources = orgResources.filter(
      (r) => r.type.toLowerCase() === needed.resourceType.toLowerCase() && r.quantity > 0
    );

    if (matchingResources.length > 0) {
      const selected = matchingResources[0];
      setSelectedOrgResourceId(selected.id);
      // Jeśli posiadamy więcej niż jest wymagane -> ustawia dokładnie remainingNeeded
      // Jeśli posiadamy mniej -> ustawia selected.quantity (maksimum ile posiadamy)
      const autoQty = Math.min(remainingNeeded, selected.quantity);
      setAllocateQuantity(autoQty);
    } else {
      setSelectedOrgResourceId('');
      setAllocateQuantity(0);
    }
  };

  // Zmiana wybranego zasobu w modalu alokacji
  const handleSelectOrgResource = (resourceId: string) => {
    setSelectedOrgResourceId(resourceId);
    if (!allocatingResource) return;

    const res = orgResources.find((r) => r.id === resourceId);
    const remainingNeeded = Math.max(
      1,
      allocatingResource.quantityNeeded - (allocatingResource.quantityAllocated || 0)
    );

    if (res && res.quantity > 0) {
      const autoQty = Math.min(remainingNeeded, res.quantity);
      setAllocateQuantity(autoQty);
    } else {
      setAllocateQuantity(0);
    }
  };

  // Zatwierdzenie przydziału zasobów
  const handleSubmitAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alert || !allocatingResource) return;

    const remainingNeeded = Math.max(
      0,
      allocatingResource.quantityNeeded - (allocatingResource.quantityAllocated || 0)
    );
    const selectedRes = orgResources.find((r) => r.id === selectedOrgResourceId);

    if (!selectedRes) {
      showToast('Wybierz zasób z magazynu Twojej jednostki.', 'error');
      return;
    }

    if (selectedRes.type.toLowerCase() !== allocatingResource.resourceType.toLowerCase()) {
      showToast(
        `Kategoria zasobu (${selectedRes.type}) nie zgadza się z kategorią zapotrzebowania (${allocatingResource.resourceType}).`,
        'error'
      );
      return;
    }

    const maxAllowed = Math.min(remainingNeeded, selectedRes.quantity);

    if (allocateQuantity <= 0) {
      showToast('Podaj dodatnią ilość zasobów do przekazania.', 'error');
      return;
    }

    if (allocateQuantity > maxAllowed) {
      showToast(
        `Nie można przydzielić więcej niż dopuszczalne ${maxAllowed} ${allocatingResource.unit} (wymagane: ${remainingNeeded}, dostępne w magazynie: ${selectedRes.quantity}).`,
        'error'
      );
      return;
    }

    setIsSubmittingAlloc(true);
    try {
      const res = await api.post(`/alerts/${alert.id}/allocate-resource`, {
        neededResourceId: allocatingResource.id,
        quantity: allocateQuantity,
        resourceId: selectedOrgResourceId || undefined,
        note: allocationNote.trim() || undefined,
      });

      if (res.data.success && res.data.data) {
        setAlert(res.data.data);
        showToast(
          res.data.message || 'Zasoby zostały pomyślnie przekazane na miejsce zdarzenia!'
        );

        api
          .get('/resources/my-organization')
          .then((r) => setOrgResources(r.data.resources || []))
          .catch(() => {});

        setAllocatingResource(null);
      }
    } catch (err: any) {
      showToast(
        err.response?.data?.message || 'Nie udało się przydzielić zasobów.',
        'error'
      );
    } finally {
      setIsSubmittingAlloc(false);
    }
  };

  const getCategoryBadge = (cat: string) => {
    const lower = cat.toLowerCase();
    if (lower.includes('hydro') || lower.includes('powód') || lower.includes('woda')) {
      return {
        bg: 'bg-cyan-50 text-cyan-700 border-cyan-200',
        icon: <Waves className="h-4 w-4" />,
      };
    }
    if (lower.includes('drog') || lower.includes('most') || lower.includes('objazd')) {
      return {
        bg: 'bg-amber-50 text-amber-700 border-amber-200',
        icon: <Truck className="h-4 w-4" />,
      };
    }
    if (lower.includes('pomoc') || lower.includes('humanitar')) {
      return {
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        icon: <HeartHandshake className="h-4 w-4" />,
      };
    }
    return {
      bg: 'bg-rose-50 text-rose-700 border-rose-200',
      icon: <AlertTriangle className="h-4 w-4" />,
    };
  };

  const getPostTypeBadge = (pType?: string) => {
    switch (pType) {
      case 'raport_terenowy':
        return {
          label: 'Raport z terenu',
          bg: 'bg-blue-50 text-blue-700 border-blue-200',
        };
      case 'komunikat_sztabowy':
        return {
          label: 'Komunikat sztabowy',
          bg: 'bg-purple-50 text-purple-700 border-purple-200',
        };
      case 'logistyka':
        return {
          label: 'Logistyka i Transport',
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
        };
      default:
        return {
          label: 'Wpis ogólny',
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
        };
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-3">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-indigo-600 border-t-transparent" />
        <p className="text-xs text-slate-500 font-semibold">Ładowanie szczegółów komunikatu...</p>
      </div>
    );
  }

  if (error || !alert) {
    return (
      <div className="max-w-xl mx-auto rounded-3xl bg-white p-8 border border-slate-200 text-center space-y-4">
        <AlertTriangle className="h-10 w-10 text-red-500 mx-auto" />
        <h2 className="text-lg font-bold text-slate-900">Nie znaleziono komunikatu</h2>
        <p className="text-xs text-slate-500">{error || 'Wskazany komunikat nie istnieje.'}</p>
        <button
          onClick={() => navigate('/dashboard/operational')}
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition"
        >
          Wróć do Dyspozytorni
        </button>
      </div>
    );
  }

  const categoryBadge = getCategoryBadge(alert.category);
  const posts = Array.isArray(alert.posts) ? alert.posts : [];
  const needed = Array.isArray(alert.neededResources) ? alert.neededResources : [];

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce-short">
          <div
            className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl backdrop-blur-xl border text-sm font-semibold text-white ${
              toast.type === 'success'
                ? 'bg-emerald-600 border-emerald-500 shadow-emerald-600/30'
                : 'bg-red-600 border-red-500 shadow-red-600/30'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 shrink-0" />
            ) : (
              <AlertTriangle className="h-5 w-5 shrink-0" />
            )}
            <span>{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-2 hover:opacity-75 transition">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modal Alokacji Zasobów */}
      {allocatingResource && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-5 animate-scale-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-indigo-600 font-bold">
                <PackageCheck className="h-5 w-5" />
                <h3 className="text-base font-extrabold text-slate-900">
                  Dyspozycja i Przydział Zasobów
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAllocatingResource(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-500">
                <span className="font-semibold">Potrzebny zasób:</span>
                <span className="font-bold text-indigo-700">{allocatingResource.name}</span>
              </div>
              <div className="flex items-center justify-between text-slate-500">
                <span className="font-semibold">Stan realizacji:</span>
                <span className="font-mono font-bold text-slate-800">
                  {allocatingResource.quantityAllocated || 0} / {allocatingResource.quantityNeeded}{' '}
                  {allocatingResource.unit} (Brakuje:{' '}
                  {Math.max(
                    0,
                    allocatingResource.quantityNeeded -
                      (allocatingResource.quantityAllocated || 0)
                  )}{' '}
                  {allocatingResource.unit})
                </span>
              </div>
            </div>

            {(() => {
              const matchingCategoryResources = orgResources.filter(
                (r) =>
                  r.type.toLowerCase() === allocatingResource.resourceType.toLowerCase() &&
                  r.quantity > 0
              );
              const selectedOrgResource = orgResources.find((r) => r.id === selectedOrgResourceId);
              const remainingNeeded = Math.max(
                0,
                allocatingResource.quantityNeeded -
                  (allocatingResource.quantityAllocated || 0)
              );
              const maxAllowed = selectedOrgResource
                ? Math.min(remainingNeeded, selectedOrgResource.quantity)
                : remainingNeeded;
              const hasNoMatching = matchingCategoryResources.length === 0;

              return (
                <form onSubmit={handleSubmitAllocation} className="space-y-4">
                  {/* Informacja o wymaganej kategorii */}
                  <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3 text-xs text-slate-700 flex items-center justify-between">
                    <span className="font-semibold text-slate-500">Wymagana kategoria zasobu:</span>
                    <span className="font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                      {allocatingResource.resourceType}
                    </span>
                  </div>

                  {/* Wybór zasobu z magazynu organizacji */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                      <span>Zasób z magazynu Twojej jednostki:</span>
                      <span className="text-[10px] text-indigo-600 font-semibold lowercase">
                        {user?.organization?.name || 'Twoja organizacja'}
                      </span>
                    </label>

                    {hasNoMatching ? (
                      <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-800 space-y-1">
                        <p className="font-bold flex items-center gap-1.5">
                          <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                          <span>Brak dostępnych zasobów w kategorii „{allocatingResource.resourceType.toUpperCase()}”</span>
                        </p>
                        <p className="text-[11px] text-red-700">
                          Twoja jednostka nie posiada w magazynie wolnych zasobów z kategorii <strong>{allocatingResource.resourceType}</strong>. Nie można przydzielić zasobów z innej kategorii.
                        </p>
                      </div>
                    ) : (
                      <select
                        value={selectedOrgResourceId}
                        onChange={(e) => handleSelectOrgResource(e.target.value)}
                        className="w-full rounded-xl bg-slate-50 border border-slate-200 py-2.5 px-3 text-xs font-semibold text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none"
                      >
                        {matchingCategoryResources.map((res) => (
                          <option key={res.id} value={res.id}>
                            {res.subcategory || res.type.toUpperCase()} • Dostępne w magazynie: {res.quantity} szt. ({res.timeframe})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {!hasNoMatching && (
                    <>
                      {/* Ilość do przekazania z szybkimi przyciskami */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                            Ilość do przekazania ({allocatingResource.unit}):
                          </label>
                          <span className="text-[11px] text-slate-500 font-medium">
                            Brakuje:{' '}
                            <strong className="text-amber-800">
                              {remainingNeeded} {allocatingResource.unit}
                            </strong>
                            {selectedOrgResource && (
                              <span className="ml-1.5 text-slate-400">
                                (W magazynie: <strong>{selectedOrgResource.quantity}</strong>)
                              </span>
                            )}
                          </span>
                        </div>

                        <input
                          type="number"
                          min="1"
                          max={maxAllowed}
                          required
                          value={allocateQuantity || ''}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setAllocateQuantity(Math.min(maxAllowed, Math.max(1, val)));
                          }}
                          className="w-full rounded-xl bg-slate-50 border border-slate-200 py-2.5 px-3.5 text-sm font-bold text-slate-900 focus:bg-white focus:border-indigo-500 focus:outline-none"
                        />

                        {/* Szybkie przyciski ilości */}
                        <div className="flex flex-wrap items-center gap-1.5 mt-2">
                          {[10, 25, 50, 100]
                            .filter((num) => num < maxAllowed)
                            .map((num) => (
                              <button
                                key={num}
                                type="button"
                                onClick={() => setAllocateQuantity(num)}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition"
                              >
                                {num} {allocatingResource.unit}
                              </button>
                            ))}
                          <button
                            type="button"
                            onClick={() => setAllocateQuantity(maxAllowed)}
                            className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold border border-indigo-200/60 transition"
                          >
                            Maks. dozwolony przydział ({maxAllowed})
                          </button>
                        </div>
                      </div>

                      {/* Podgląd stanu na żywo */}
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 text-[11px] space-y-1 text-slate-600">
                        <div className="flex items-center justify-between">
                          <span>Nowy stan realizacji alertu:</span>
                          <strong className="text-emerald-700 font-mono">
                            {Math.min(
                              allocatingResource.quantityNeeded,
                              (allocatingResource.quantityAllocated || 0) + allocateQuantity
                            )}{' '}
                            / {allocatingResource.quantityNeeded} {allocatingResource.unit} (
                            {Math.min(
                              100,
                              Math.round(
                                (((allocatingResource.quantityAllocated || 0) + allocateQuantity) /
                                  allocatingResource.quantityNeeded) *
                                  100
                              )
                            )}
                            %)
                          </strong>
                        </div>
                      </div>

                      {/* Notatka operacyjna */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                          Notatka dyspozytorska / Transport (Opcjonalnie):
                        </label>
                        <input
                          type="text"
                          value={allocationNote}
                          onChange={(e) => setAllocationNote(e.target.value)}
                          placeholder="np. Wysłano 1 wóz kwatermistrzowski z remizy w Kłodzku"
                          className="w-full rounded-xl bg-slate-50 border border-slate-200 py-2 px-3 text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                    </>
                  )}

                  <div className="pt-2 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setAllocatingResource(null)}
                      className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                    >
                      Anuluj
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmittingAlloc || hasNoMatching || allocateQuantity <= 0}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmittingAlloc ? (
                        <>
                          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                          <span>Przydzielanie...</span>
                        </>
                      ) : (
                        <>
                          <PackageCheck className="h-4 w-4" />
                          <span>Zatwierdź i Przydziel ({allocateQuantity} {allocatingResource.unit})</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              );
            })()}
          </div>
        </div>
      )}

      {/* 1. Belka nawigacji i powrotu */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => navigate('/dashboard/operational')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-200 shadow-2xs transition self-start cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Powrót do Dyspozytorni</span>
        </button>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span
            className={`px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-wider border ${
              alert.isActive
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}
          >
            {alert.isActive ? '● Komunikat Aktywny' : 'Odwołany / Archiwum'}
          </span>
        </div>
      </div>

      {/* 2. Główna Karta Szczegółów Zdarzenia i Mapa */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Lewa Kolumna: Dane alertu & Zapotrzebowanie */}
        <div className="lg:col-span-7 space-y-6">
          <section className="rounded-3xl bg-white p-6 sm:p-7 border border-slate-200/80 shadow-xs space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {/* Badge Krytyczności */}
                {(() => {
                  const severityInfo = getSeverityBadgeInfo(alert.severity);
                  return (
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-extrabold border uppercase tracking-wider ${severityInfo.badgeClass}`}
                    >
                      <span className={`h-2 w-2 rounded-full ${severityInfo.dotClass}`}></span>
                      <span>{severityInfo.label}</span>
                    </span>
                  );
                })()}

                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border tracking-wide uppercase ${categoryBadge.bg}`}
                >
                  {categoryBadge.icon}
                  <span>{alert.category}</span>
                </span>
              </div>

              <span className="inline-flex items-center gap-1.5 text-xs text-slate-700 bg-slate-100 px-3 py-1 rounded-xl font-semibold border border-slate-200/60">
                <MapPin className="h-3.5 w-3.5 text-red-500 shrink-0" />
                <span>
                  {alert.locationName ? (
                    <>
                      <strong>{alert.locationName}</strong>
                      {alert.county && <span className="text-slate-500 ml-1">({alert.county})</span>}
                      {alert.voivodeship && (
                        <span className="text-slate-400 ml-1">woj. {alert.voivodeship}</span>
                      )}
                    </>
                  ) : (
                    alert.municipality?.name || 'Lokalizacja'
                  )}
                </span>
              </span>
            </div>

            <div className="space-y-2">
              {alert.title && (
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
                  {alert.title}
                </h1>
              )}
              <div>
                <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Treść operacyjna komunikatu
                </h2>
                <p className="text-base sm:text-lg text-slate-800 font-semibold leading-relaxed">
                  {alert.content}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-xs text-slate-600">
              <div className="flex items-center gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <Building className="h-4 w-4 text-indigo-600 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">Organizacja</span>
                  <span className="font-bold text-slate-800">
                    {alert.author?.organization?.name || 'Służby Ratunkowe'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <User className="h-4 w-4 text-indigo-600 shrink-0" />
                <div>
                  <span className="text-[10px] text-slate-400 block font-semibold">Autor komunikatu</span>
                  <span className="font-bold text-slate-800">
                    {alert.author
                      ? `${alert.author.firstName} ${alert.author.lastName} (${alert.author.role})`
                      : 'Koordynator'}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* Sekcja Zapotrzebowania na Zasoby */}
          <section className="rounded-3xl bg-white p-6 sm:p-7 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                <PackageCheck className="h-5 w-5 text-amber-600" />
                <span>Zapotrzebowanie na Zasoby ({needed.length})</span>
              </div>
            </div>

            {needed.length === 0 ? (
              <div className="p-4 bg-slate-50 border border-slate-200/70 rounded-2xl text-xs text-slate-500 text-center">
                Brak zgłoszonego zapotrzebowania na sprzęt lub wsparcie w tym alercie.
              </div>
            ) : (
              <div className="space-y-3">
                {needed.map((nr) => {
                  const allocCount = nr.quantityAllocated || 0;
                  const pct = Math.min(100, Math.round((allocCount / nr.quantityNeeded) * 100));
                  const isFulfilled = allocCount >= nr.quantityNeeded;

                  return (
                    <div
                      key={nr.id}
                      className="rounded-2xl bg-amber-50/60 p-4 border border-amber-200/80 space-y-2.5"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="font-bold text-sm text-slate-900">{nr.name}</span>
                          <span className="text-xs text-slate-500 ml-2 font-mono">
                            Typ: {nr.resourceType.toUpperCase()}
                          </span>
                        </div>

                        {!isFulfilled && (
                          <button
                            type="button"
                            onClick={() => openAllocationModal(nr)}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer active:scale-95 bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20"
                          >
                            <PackageCheck className="h-3.5 w-3.5" />
                            <span>Przydziel zasoby</span>
                          </button>
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-600 font-medium">
                            {isFulfilled ? (
                              <span className="text-emerald-700 font-bold flex items-center gap-1">
                                <CheckCircle2 className="h-3.5 w-3.5 inline" />
                                Zabezpieczone w 100%
                              </span>
                            ) : (
                              <span>
                                Brakuje:{' '}
                                <strong className="text-amber-900">
                                  {nr.quantityNeeded - allocCount} {nr.unit}
                                </strong>
                              </span>
                            )}
                          </span>
                          <span className="font-mono font-bold text-slate-800">
                            {allocCount} / {nr.quantityNeeded} {nr.unit} ({pct}%)
                          </span>
                        </div>

                        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${
                              pct >= 100
                                ? 'bg-emerald-500'
                                : pct > 0
                                ? 'bg-amber-500'
                                : 'bg-slate-300'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>

                      {/* Lista dostawców */}
                      {nr.allocations && nr.allocations.length > 0 && (
                        <div className="pt-2 border-t border-amber-200/60 text-[11px] space-y-1">
                          <span className="font-bold text-slate-700 block">
                            Dostarczone jednostki ({nr.allocations.length}):
                          </span>
                          {nr.allocations.map((alloc) => (
                            <div
                              key={alloc.id}
                              className="flex items-center justify-between bg-white/80 px-2.5 py-1 rounded-lg border border-amber-100"
                            >
                              <span>
                                <strong>{alloc.organizationName}</strong> ({alloc.userName})
                                {alloc.note && <span className="italic text-slate-500 ml-1">„{alloc.note}”</span>}
                              </span>
                              <span className="font-mono font-bold text-emerald-700">
                                +{alloc.quantity} {nr.unit} ({formatDate(alloc.allocatedAt)})
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Prawa Kolumna: Mapa Lokalizacji */}
        <div className="lg:col-span-5 space-y-6">
          <section className="rounded-3xl bg-white p-5 border border-slate-200/80 shadow-xs space-y-3 sticky top-6">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-red-500" />
                <span>Punkt Zdarzenia na Mapie</span>
              </span>
              <span className="font-mono text-slate-500">
                {alert.lat && alert.lng
                  ? `${alert.lat.toFixed(4)}, ${alert.lng.toFixed(4)}`
                  : 'Współrzędne gminy'}
              </span>
            </div>

            <AlertsMap alerts={[alert]} height="320px" focusedAlertId={alert.id} />
          </section>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. SEKCJA WPISÓW I FORUM KOMUNIKATU (Dziennik zdarzenia & Czat wątkowy)  */}
      {/* ========================================================================= */}
      <section className="rounded-3xl bg-white p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2 text-indigo-600 font-bold text-xs uppercase tracking-wider mb-1">
              <MessagesSquare className="h-4 w-4" />
              <span>Dziennik Operacyjny & Forum Komunikatu</span>
            </div>
            <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Wpisy i Komunikacja Służb ({posts.length})
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Twórz wpisy z raportami z miejsca akcji i rozmawiaj z innymi jednostkami na dedykowanym czacie pod każdym wpisem.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowNewPostForm((prev) => !prev)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm shadow-indigo-600/25 transition cursor-pointer self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            <span>{showNewPostForm ? 'Anuluj dodawanie' : 'Stwórz nowy wpis'}</span>
          </button>
        </div>

        {/* Formularz tworzenia nowego wpisu */}
        {showNewPostForm && (
          <form
            onSubmit={handleCreatePost}
            className="rounded-3xl bg-slate-50 p-5 sm:p-6 border border-indigo-200/70 space-y-4 animate-fade-in"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileText className="h-4 w-4 text-indigo-600" />
                <span>Nowy Wpis do Alertu</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowNewPostForm(false)}
                className="text-slate-400 hover:text-slate-600 text-xs"
              >
                Zamknij
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Tytuł wpisu
                </label>
                <input
                  type="text"
                  required
                  value={postTitle}
                  onChange={(e) => setPostTitle(e.target.value)}
                  placeholder="np. Raport z przelewania wału przeciwpowodziowego, Odprawa o 14:00"
                  className="w-full rounded-xl bg-white border border-slate-200 py-2.5 px-3.5 text-xs text-slate-900 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Rodzaj wpisu
                </label>
                <select
                  value={postType}
                  onChange={(e) => setPostType(e.target.value as any)}
                  className="w-full rounded-xl bg-white border border-slate-200 py-2.5 px-3 text-xs font-semibold text-slate-900 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="raport_terenowy">📋 Raport z terenu</option>
                  <option value="komunikat_sztabowy">🏢 Komunikat sztabowy</option>
                  <option value="logistyka">🚛 Logistyka i Transport</option>
                  <option value="ogolne">💬 Wpis ogólny</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Treść wpisu / Szczegóły sytuacji
              </label>
              <textarea
                required
                rows={4}
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                placeholder="Opisz dokładnie sytuację, wyznaczone zadania, stan wałów, potrzebny sprzęt lub ustalenia sztabowe..."
                className="w-full rounded-xl bg-white border border-slate-200 p-3 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none resize-none"
              ></textarea>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowNewPostForm(false)}
                className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold transition"
              >
                Anuluj
              </button>
              <button
                type="submit"
                disabled={isSubmittingPost || !postContent.trim()}
                className="flex items-center gap-2 px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/25 transition disabled:opacity-50"
              >
                {isSubmittingPost ? (
                  <>
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>Publikowanie...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    <span>Opublikuj wpis</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Lista wpisów operacyjnych */}
        {posts.length === 0 ? (
          <div className="rounded-3xl bg-slate-50 p-10 text-center border border-dashed border-slate-200 space-y-3">
            <MessageSquare className="h-8 w-8 text-slate-400 mx-auto" />
            <h4 className="text-sm font-bold text-slate-800">Brak wpisów dla tego alertu</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Nikt jeszcze nie stworzył wpisu operacyjnego. Kliknij przycisk powyżej, aby dodać pierwszy raport z miejsca zdarzenia.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {posts.map((post) => {
              const typeBadge = getPostTypeBadge(post.postType);
              const messages = Array.isArray(post.messages) ? post.messages : [];

              return (
                <article
                  key={post.id}
                  className="rounded-3xl bg-white border border-slate-200 p-5 sm:p-6 shadow-xs hover:border-slate-300 transition space-y-4"
                >
                  {/* Nagłówek posta */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-lg text-xs font-bold border ${typeBadge.bg}`}>
                        {typeBadge.label}
                      </span>
                      <h4 className="text-sm sm:text-base font-bold text-slate-900">
                        {post.title}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="font-semibold text-slate-700">{post.organizationName}</span>
                      <span>•</span>
                      <span>{post.authorName}</span>
                      <span>•</span>
                      <time className="text-slate-400 font-mono text-[11px]">{formatDate(post.createdAt)}</time>
                    </div>
                  </div>

                  {/* Treść posta */}
                  <p className="text-xs sm:text-sm text-slate-800 leading-relaxed font-medium whitespace-pre-line">
                    {post.content}
                  </p>

                  {/* Przycisk otwierania/zwijania czatu dyskusyjnego */}
                  {(() => {
                    const isChatOpen = !!expandedChats[post.id];
                    return (
                      <div className="space-y-3 pt-2 border-t border-slate-100">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => toggleChat(post.id)}
                            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer shadow-2xs active:scale-95 ${
                              isChatOpen
                                ? 'bg-indigo-600 text-white shadow-indigo-600/25'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900'
                            }`}
                          >
                            <MessageCircle className="h-4 w-4" />
                            <span>
                              {isChatOpen
                                ? 'Zwiń czat dyskusyjny'
                                : messages.length === 0
                                ? 'Otwórz czat (0 wiadomości)'
                                : `Pokaż czat (${messages.length} ${
                                    messages.length === 1
                                      ? 'wiadomość'
                                      : messages.length >= 2 && messages.length <= 4
                                      ? 'wiadomości'
                                      : 'wiadomości'
                                  })`}
                            </span>
                            {isChatOpen ? (
                              <ChevronUp className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                            )}
                          </button>

                          {messages.length > 0 && !isChatOpen && (
                            <span className="text-[11px] text-slate-500 font-medium">
                              Ostatnia wiadomość:{' '}
                              <strong className="text-slate-700 font-mono">
                                {formatDate(messages[messages.length - 1].createdAt)}
                              </strong>
                            </span>
                          )}
                        </div>

                        {/* Rozwijany Wątek Czatu pod wpisem */}
                        {isChatOpen && (
                          <div className="rounded-2xl bg-slate-50 p-4 border border-indigo-200/60 space-y-3 animate-fade-in">
                            <div className="flex items-center justify-between text-xs font-bold text-slate-700 border-b border-slate-200/60 pb-2">
                              <span className="flex items-center gap-1.5 text-indigo-700">
                                <MessageCircle className="h-4 w-4 text-indigo-600" />
                                <span>Czat i Dyskusja Służb ({messages.length})</span>
                              </span>
                              <span className="text-[10px] text-slate-400 font-normal">
                                Wiadomości widoczne dla zalogowanych pracowników
                              </span>
                            </div>

                            {/* Wiadomości */}
                            {messages.length === 0 ? (
                              <p className="text-xs text-slate-400 italic py-2 text-center bg-white rounded-xl border border-dashed border-slate-200">
                                Brak wiadomości. Bądź pierwszy i napisz komentarz lub zapytanie.
                              </p>
                            ) : (
                              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                                {messages.map((msg) => (
                                  <div
                                    key={msg.id}
                                    className="bg-white p-3 rounded-xl border border-slate-200/70 shadow-2xs space-y-1"
                                  >
                                    <div className="flex items-center justify-between text-[11px]">
                                      <div className="flex items-center gap-1.5">
                                        <span className="font-bold text-slate-800">{msg.authorName}</span>
                                        <span className="text-slate-500 text-[10px]">
                                          ({msg.organizationName || 'Służby'})
                                        </span>
                                      </div>
                                      <span className="text-slate-400 font-mono text-[10px]">
                                        {formatDate(msg.createdAt)}
                                      </span>
                                    </div>
                                    <p className="text-xs text-slate-800 font-medium leading-relaxed">{msg.content}</p>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Formularz nowej wiadomości */}
                            <form
                              onSubmit={(e) => handleSendChatMessage(post.id, e)}
                              className="flex items-center gap-2 pt-1"
                            >
                              <input
                                type="text"
                                required
                                value={chatInputs[post.id] || ''}
                                onChange={(e) =>
                                  setChatInputs((prev) => ({ ...prev, [post.id]: e.target.value }))
                                }
                                placeholder="Napisz wiadomość na czacie tego wpisu..."
                                className="flex-1 rounded-xl bg-white border border-slate-200 py-2 px-3 text-xs text-slate-900 placeholder-slate-400 focus:border-indigo-500 focus:outline-none"
                              />
                              <button
                                type="submit"
                                disabled={isSubmittingChat[post.id] || !(chatInputs[post.id] || '').trim()}
                                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition shadow-xs disabled:opacity-50 cursor-pointer"
                              >
                                <Send className="h-3.5 w-3.5" />
                                <span>Wyślij</span>
                              </button>
                            </form>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default AlertDetailsPage;
