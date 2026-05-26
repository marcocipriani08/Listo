import React, { useState, useEffect, useRef } from 'react';
import { auth, loginWithGoogle, logout } from './lib/firebase';
import { useUserProfile, useShoppingList, useShoppingHistory, addShoppingItem, updateItemQuantity, toggleItemCompleted, clearCompletedItems, createFamily, joinFamily, useJoinedFamilies, leaveFamily, deleteFamily, useFamily, updateFamily } from './lib/hooks';
import { CATEGORIES, ShoppingItem, Family, UserProfile } from './types';
import { Apple, Milk, Beef, Croissant, Wine, Package, Sparkles, ShoppingBag, Plus, Check, Trash2, LogOut, Loader2, Sparkles as SparklesIcon, CheckCircle2, ChevronLeft, Lock, LogIn, MoreVertical, Edit2, KeyRound, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const iconMap: Record<string, React.ReactNode> = {
  Apple: <Apple size={20} />,
  Milk: <Milk size={20} />,
  Beef: <Beef size={20} />,
  Croissant: <Croissant size={20} />,
  Wine: <Wine size={20} />,
  Package: <Package size={20} />,
  Sparkles: <Sparkles size={20} />,
  ShoppingBag: <ShoppingBag size={20} />
};

export default function App() {
  const [user, setUser] = useState(auth.currentUser);
  const [authLoading, setAuthLoading] = useState(true);
  const { profile, loading: profileLoading, updateProfile } = useUserProfile(user?.uid);
  const [forceSetup, setForceSetup] = useState(false);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  if (authLoading) {
    return <LoadingView />;
  }

  if (!user) {
    return <LoginView />;
  }

  if (profileLoading) {
    return <LoadingView />;
  }

  if (!profile?.familyId || forceSetup) {
    return <FamilySetupView 
              userId={user.uid} 
              profile={profile} 
              onClose={() => setForceSetup(false)} 
              updateProfile={updateProfile} 
           />;
  }

  return <ShoppingListView 
            familyId={profile.familyId} 
            userId={user.uid} 
            onChangeFamily={() => setForceSetup(true)}
         />;
}

function LoginView() {
  const [loading, setLoading] = useState(false);
  const handleLogin = async () => {
    setLoading(true);
    try {
      await loginWithGoogle();
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-slate-50 p-4 font-sans">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden p-8 text-center flex flex-col items-center">
        <div className="mb-6 scale-125 origin-center pt-4">
           <ListoLogo />
        </div>
        <p className="text-slate-500 mb-8 font-medium">Liste della spesa condivise e sincronizzate in tempo reale.</p>
        <button 
          onClick={handleLogin} 
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-slate-900 text-white rounded-2xl py-4 px-6 font-bold text-lg hover:bg-slate-800 focus:outline-none focus:ring-4 focus:ring-slate-200 transition-all active:scale-95 disabled:opacity-70 disabled:scale-100"
        >
          {loading ? <Loader2 size={24} className="animate-spin" /> : 'Accedi con Google'}
        </button>
      </motion.div>
    </div>
  );
}

function ListoLogo() {
  return (
    <div className="flex items-center gap-3 select-none">
      <div className="text-[2rem] font-bold tracking-tighter text-emerald-600 flex items-baseline font-sans">
        L
        <span className="relative inline-flex mx-[1px]">
          ı
          <svg className="absolute -top-[1px] right-0 w-[12px] h-[12px] text-emerald-500 fill-current translate-x-[25%] -translate-y-[15%] rotate-[25deg]" viewBox="0 0 24 24">
            <path d="M21 3C21 3 13 3 7 9C2 14 2 21 2 21C2 21 11 21 16 16C21 11 21 3 21 3Z" />
          </svg>
        </span>
        sto
      </div>
    </div>
  );
}

function FamilySetupView({ userId, profile, onClose, updateProfile }: { userId: string, profile: UserProfile | null, onClose: () => void, updateProfile: (data: Partial<UserProfile>) => void }) {
  const [code, setCode] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [name, setName] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeForm, setActiveForm] = useState<'create' | 'join' | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [confirmModals, setConfirmModals] = useState<{ type: 'leave' | 'delete', fam: Family } | null>(null);
  
  const { families: joinedFamilies, loading: familiesLoading } = useJoinedFamilies(profile?.joinedFamilies);

  const handleJoin = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError('');
    try {
      const success = await joinFamily(userId, code.trim().toUpperCase(), joinPassword);
      if (!success) setError('Codice famiglia non trovato.');
      else { setCode(''); setJoinPassword(''); setIsDrawerOpen(false); setActiveForm(null); if(profile?.familyId) onClose(); }
    } catch (err: any) {
      setError(err.message || 'Errore durante la connessione.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setError('');
    try {
      await createFamily(userId, name.trim(), createPassword);
      setName(''); setCreatePassword(''); setIsDrawerOpen(false); setActiveForm(null); if(profile?.familyId) onClose();
    } catch (err: any) {
      setError(err.message || 'Errore durante la creazione.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteOrLeave = (e: React.MouseEvent, fam: Family) => {
    e.stopPropagation();
    setConfirmModals({ type: fam.ownerId === userId ? 'delete' : 'leave', fam });
  };

  const confirmDeleteOrLeave = async () => {
    if (!confirmModals) return;
    const { fam, type } = confirmModals;
    setLoading(true);
    try {
      if (type === 'delete') {
        await deleteFamily(userId, fam.id);
      } else {
        await leaveFamily(userId, fam.id);
      }
      if (profile?.familyId === fam.id) {
         await updateProfile({ familyId: undefined });
      }
      setConfirmModals(null);
    } catch (err: any) {
       setError(err.message || "Errore sconosciuto.");
    } finally {
       setLoading(false);
    }
  };

  const switchFamily = async (familyId: string) => {
    if (profile?.familyId === familyId) {
      onClose();
      return;
    }
    setLoading(true);
    await updateProfile({ familyId });
    onClose();
    setLoading(false);
  };

  return (
    <div className="min-h-[100dvh] bg-slate-50 flex flex-col font-sans">
      <header className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-200 p-4 lg:px-8 flex items-center justify-center z-10 shadow-sm shrink-0">
        <div className="w-full max-w-4xl flex justify-between items-center">
            <ListoLogo />
            <button 
               onClick={() => { setIsDrawerOpen(true); setActiveForm('join'); }}
               className="bg-emerald-500 text-white rounded-full px-4 py-2 font-bold text-sm shadow-sm hover:bg-emerald-600 active:scale-95 transition-all flex items-center gap-2"
            >
              <Plus size={16} /> Aggiungi
            </button>
        </div>
      </header>

      <main className="flex-1 p-6 lg:py-12 overflow-y-auto">
        <div className="w-full max-w-xl mx-auto space-y-8">
          
          <div className="space-y-4">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">I Miei Gruppi</h2>
            
            {familiesLoading ? (
                 <div className="flex justify-center p-4"><Loader2 className="animate-spin text-emerald-500" /></div>
            ) : (!joinedFamilies || joinedFamilies.length === 0) ? (
                 <p className="text-slate-500 text-sm text-center py-4 bg-white rounded-2xl border border-slate-100">Non sei ancora in nessun gruppo.</p>
            ) : (
              <div className="space-y-3">
                 {joinedFamilies.map(fam => (
                   <motion.div 
                     key={fam.id} 
                     whileHover={{ y: -2, scale: 1.01 }}
                     whileTap={{ scale: 0.98 }}
                     className="w-full text-left p-4 rounded-2xl flex flex-col border-2 transition-all cursor-pointer group shadow-sm hover:shadow-md bg-white border-slate-100 hover:border-emerald-500 hover:bg-emerald-50/50"
                     onClick={() => switchFamily(fam.id)}
                   >
                     <div className="flex items-center justify-between">
                         <div>
                           <h3 className="font-bold text-lg text-slate-800 transition-colors group-hover:text-emerald-700">{fam.name}</h3>
                           <p className="text-xs text-slate-500 font-mono mt-1 transition-colors group-hover:text-emerald-600/70">ID: {fam.id}</p>
                         </div>
                         <div className="flex items-center gap-3">
                             <button
                               onClick={(e) => handleDeleteOrLeave(e, fam)}
                               className="text-slate-400 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-red-50"
                               title={fam.ownerId === userId ? "Elimina gruppo" : "Abbandona gruppo"}
                             >
                                <Trash2 size={18} />
                             </button>
                         </div>
                     </div>
                   </motion.div>
                 ))}
              </div>
            )}
          </div>

          <button onClick={() => logout()} className="text-slate-500 w-full text-center py-4 font-bold text-sm hover:text-slate-900 transition-colors mt-8">
            Esci dall'account
          </button>
        </div>
      </main>

      <AnimatePresence>
         {isDrawerOpen && (
            <>
               <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  exit={{ opacity: 0 }} 
                  onClick={() => setIsDrawerOpen(false)}
                  className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40" 
               />
               <motion.div 
                  initial={{ x: '100%' }} 
                  animate={{ x: 0 }} 
                  exit={{ x: '100%' }}
                  transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                  className="fixed top-0 right-0 h-[100dvh] w-full max-w-sm sm:max-w-md bg-slate-50 shadow-2xl z-50 flex flex-col overflow-hidden"
               >
                  <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between shrink-0">
                     <h2 className="text-lg font-bold text-slate-800">Aggiungi gruppo</h2>
                     <button onClick={() => setIsDrawerOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors">
                        <X size={18} />
                     </button>
                  </div>

                  <div className="flex p-4 gap-2 bg-white border-b border-slate-100 shrink-0">
                     <button
                        onClick={() => { setActiveForm('join'); setError(''); }}
                        className={cn("flex-1 py-2 rounded-lg font-bold text-sm transition-all", 
                           activeForm === 'join' 
                             ? "bg-emerald-50 text-emerald-700" 
                             : "text-slate-500 hover:bg-slate-50"
                        )}
                     >
                        Unisciti
                     </button>
                     <button
                        onClick={() => { setActiveForm('create'); setError(''); }}
                        className={cn("flex-1 py-2 rounded-lg font-bold text-sm transition-all", 
                           activeForm === 'create' 
                             ? "bg-indigo-50 text-indigo-700" 
                             : "text-slate-500 hover:bg-slate-50"
                        )}
                     >
                        Crea Nuovo
                     </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-5 pt-3">
                     <AnimatePresence mode="wait">
                        {activeForm === 'join' && (
                           <motion.div key="join" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                              <div className="flex items-center gap-3 mb-1">
                                 <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 shrink-0">
                                    <LogIn size={16} />
                                 </div>
                                 <h3 className="font-bold text-xl text-slate-800">Hai un codice?</h3>
                              </div>
                              <p className="text-slate-500 text-sm mb-4 leading-snug">Inserisci l'ID del gruppo e la password se richiesta per unirti.</p>
                              
                              <div className="space-y-3">
                                <input 
                                  type="text" 
                                  placeholder="Codice ID (Es. A1B2C3)" 
                                  value={code} 
                                  onChange={e => setCode(e.target.value)}
                                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-mono uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium shadow-sm"
                                />
                                <input 
                                  type="password" 
                                  placeholder="Password (opzionale)" 
                                  value={joinPassword} 
                                  onChange={e => setJoinPassword(e.target.value)}
                                  className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-medium shadow-sm"
                                />
                                <button 
                                  onClick={handleJoin} 
                                  disabled={loading || !code.trim()}
                                  className="w-full bg-emerald-500 text-white px-6 py-3.5 rounded-xl font-bold disabled:opacity-50 active:scale-95 transition-all shadow-sm flex items-center justify-center gap-2"
                                >
                                  {loading && <Loader2 size={18} className="animate-spin" />}
                                  Entra nel gruppo
                                </button>
                              </div>
                              {error && <p className="text-red-500 text-sm font-medium">{error}</p>}
                           </motion.div>
                        )}
                        
                        {activeForm === 'create' && (
                           <motion.div key="create" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                              <div className="flex items-center gap-3 mb-1">
                                 <div className="w-8 h-8 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 shrink-0">
                                    <Plus size={16} />
                                 </div>
                                 <h3 className="font-bold text-xl text-slate-800">Crea un gruppo</h3>
                              </div>
                              <p className="text-slate-500 text-sm mb-4 leading-snug">Crea una nuova lista per la tua famiglia o per i tuoi coinquilini.</p>
                              
                              <div className="space-y-3">
                                <input 
                                  type="text" 
                                  placeholder="Nome del gruppo" 
                                  value={name} 
                                  onChange={e => setName(e.target.value)}
                                  className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium shadow-sm"
                                />
                                <input 
                                  type="password" 
                                  placeholder="Password di accesso (opzionale)" 
                                  value={createPassword} 
                                  onChange={e => setCreatePassword(e.target.value)}
                                  className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium shadow-sm"
                                />
                                <button 
                                  onClick={handleCreate} 
                                  disabled={loading || !name.trim()}
                                  className="w-full bg-indigo-600 text-white px-6 py-3.5 rounded-xl font-bold disabled:opacity-50 active:scale-95 transition-all shadow-sm flex items-center justify-center gap-2"
                                >
                                  {loading && <Loader2 size={18} className="animate-spin" />}
                                  Crea nuovo gruppo
                                </button>
                              </div>
                              {error && <p className="text-red-500 text-sm font-medium">{error}</p>}
                           </motion.div>
                        )}
                     </AnimatePresence>
                  </div>
               </motion.div>
            </>
         )}
      </AnimatePresence>

      <AnimatePresence>
         {confirmModals && (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
               <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl space-y-4">
                  <h3 className="font-bold text-lg text-slate-800">
                     {confirmModals.type === 'delete' ? 'Elimina gruppo' : 'Abbandona gruppo'}
                  </h3>
                  <p className="text-slate-500 text-sm">
                     Sei sicuro di voler {confirmModals.type === 'delete' ? 'eliminare definitivamente' : 'abbandonare'} <strong>{confirmModals.fam.name}</strong>? {confirmModals.type === 'delete' && 'Questa azione non può essere annullata.'}
                  </p>
                  <div className="pt-2 flex gap-3">
                     <button
                        onClick={() => setConfirmModals(null)}
                        className="flex-1 py-3 px-4 rounded-xl font-bold bg-slate-100 text-slate-700 hover:bg-slate-200"
                        disabled={loading}
                     >
                        Annulla
                     </button>
                     <button
                        onClick={confirmDeleteOrLeave}
                        className="flex-1 py-3 px-4 rounded-xl font-bold bg-red-500 text-white active:scale-95 transition-transform"
                        disabled={loading}
                     >
                        {loading ? 'Attendere...' : 'Conferma'}
                     </button>
                  </div>
               </motion.div>
            </div>
         )}
      </AnimatePresence>
    </div>
  );
}

function LoadingView() {
  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-slate-50">
      <Loader2 className="animate-spin text-emerald-500" size={32} />
    </div>
  );
}

function ShoppingListView({ familyId, userId, onChangeFamily }: { familyId: string, userId: string, onChangeFamily: () => void }) {
  const family = useFamily(familyId);
  const { items, loading } = useShoppingList(familyId);
  const history = useShoppingHistory(familyId);
  const [input, setInput] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [modalType, setModalType] = useState<'rename' | 'password' | null>(null);
  const [renameInput, setRenameInput] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const touchStartX = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const distance = touchEndX - touchStartX.current;
    
    // threshold: start near the left edge (< 40px) and swipe right at least 80px
    if (touchStartX.current < 40 && distance > 80) {
       onChangeFamily();
    }
    
    touchStartX.current = null;
  };

  // handle rename open
  const handleRename = async () => {
    if (!renameInput.trim() || !family) return;
    setIsUpdating(true);
    try {
      await updateFamily(family.id, renameInput.trim());
      setModalType(null);
    } catch (error) {
      console.error(error);
    } finally {
      setIsUpdating(false);
    }
  };

  const completedItems = items.filter(i => i.completed);
  const activeItems = items.filter(i => !i.completed);
  const progress = items.length === 0 ? 0 : Math.round((completedItems.length / items.length) * 100);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const title = input.trim();
    setInput('');
    setShowHistory(false);
    await addShoppingItem(familyId, title, userId);
  };

  const handleSuggestAdd = async (title: string) => {
    setInput('');
    setShowHistory(false);
    // don't add if already active
    if (!activeItems.find(i => i.title.toLowerCase() === title.toLowerCase())) {
        await addShoppingItem(familyId, title, userId);
    }
  };

  const matchingHistory = input.trim() ? history.filter(h => h.title.toLowerCase().includes(input.toLowerCase())) : history.slice(0, 5);

  return (
    <div 
      className="h-[100dvh] bg-slate-200 lg:bg-slate-100 flex flex-col font-sans sm:py-6 lg:py-10 overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="flex-1 flex flex-col w-full sm:max-w-md md:max-w-2xl lg:max-w-3xl mx-auto shadow-2xl bg-[#F8FAFC] sm:rounded-[40px] md:rounded-3xl relative overflow-hidden ring-0 sm:ring-8 md:ring-4 lg:ring-1 ring-slate-800 sm:ring-slate-800 lg:ring-slate-200/50">
        
        {/* Header (Status bar style) */}
        <header className="px-5 pt-6 pb-4 flex justify-between items-start z-50 relative shrink-0">
          <div className="flex flex-col flex-1 truncate pr-4">
            <div className="flex items-center gap-2">
               <h1 className="text-2xl font-bold tracking-tight text-slate-900 truncate">{family ? family.name : 'Spesa in Famiglia'}</h1>
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              {family && (
                 <span className="text-xs font-mono font-semibold text-slate-500 tracking-wider">ID: {family.id}</span>
              )}
            </div>
          </div>
          <div className="relative pt-1 shrink-0">
             <button onClick={() => setMenuOpen(!menuOpen)} className="w-10 h-10 rounded-full flex items-center justify-center text-slate-700 bg-white border-2 border-slate-200 hover:text-slate-900 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm active:scale-95">
                <MoreVertical size={22} strokeWidth={2.5} />
             </button>
             {menuOpen && (
                <>
                   <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                   <div className="absolute right-0 top-10 w-48 bg-white rounded-2xl shadow-xl shadow-slate-900/10 border border-slate-100 z-50 overflow-hidden py-1">
                      <button 
                         onClick={() => { setMenuOpen(false); setRenameInput(family?.name || ''); setModalType('rename'); }} 
                         className="w-full text-left px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                      >
                         <Edit2 size={14} className="text-slate-400" /> Rinomina gruppo
                      </button>
                      <button 
                         onClick={() => { setMenuOpen(false); setModalType('password'); }} 
                         className="w-full text-left px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                      >
                         <KeyRound size={14} className="text-slate-400" /> Mostra password
                      </button>
                   </div>
                </>
             )}
          </div>
        </header>

        {/* Progress */}
        <div className="px-5 pb-2 shrink-0 z-10 relative border-b border-slate-100">
           <div className="flex justify-between items-end mb-3">
              <div>
                 <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Progresso</p>
                 <p className="text-xl font-black text-slate-900">{completedItems.length} <span className="text-slate-300">/</span> {items.length}</p>
              </div>
              {!loading && items.length > 0 && activeItems.length > 0 && (
                <button
                   onClick={() => activeItems.forEach(i => toggleItemCompleted(familyId, i.id, true))}
                   className="text-[11px] font-bold text-emerald-600 uppercase tracking-widest px-3 py-1.5 mb-0.5 bg-emerald-50 hover:bg-emerald-100 hover:text-emerald-700 rounded-xl active:scale-95 transition-all shadow-sm flex items-center gap-1.5"
                >
                   <CheckCircle2 size={14} />
                   Seleziona Tutto
                </button>
              )}
           </div>
           <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className="h-full bg-emerald-500 rounded-full"
                  transition={{ duration: 0.5, ease: "easeOut" }}
              />
           </div>
        </div>

        {/* Scrollable List */}
        <div className="flex-1 overflow-y-auto px-5 pt-3 pb-6 hide-scrollbar relative z-0">
          {loading && <div className="text-center py-10"><Loader2 className="animate-spin text-slate-300 mx-auto" size={24} /></div>}
          
          {!loading && items.length === 0 && (
            <div className="text-center py-20 px-6">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                <SparklesIcon size={32} />
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-1">La lista è vuota</h3>
              <p className="text-slate-500 text-sm">Aggiungi prodotti qui sotto.</p>
            </div>
          )}

          {activeItems.length > 0 && (
            <div className="mb-6 space-y-2">
              <AnimatePresence initial={false}>
                {activeItems.map(item => (
                  <ItemRow key={item.id} item={item} familyId={familyId} />
                ))}
              </AnimatePresence>
            </div>
          )}

          {completedItems.length > 0 && (
            <div className="mb-6">
              <h3 className="text-[11px] font-bold text-slate-400 tracking-wider uppercase mb-3 px-1 flex items-center gap-1.5">
                <CheckCircle2 size={14} />
                Presi
              </h3>
              <div className="space-y-2">
                 <AnimatePresence initial={false}>
                    {completedItems.map(item => (
                      <ItemRow key={item.id} item={item} familyId={familyId} isCompleted />
                    ))}
                 </AnimatePresence>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Fixed Area */}
        <div className="p-5 bg-white border-t border-slate-100 shrink-0 z-10 relative flex flex-col gap-4">
          <form onSubmit={handleAdd} className="relative z-10 flex flex-col">
            <div className="relative flex items-center gap-2">
              <button 
                type="button"
                onClick={onChangeFamily} 
                className="w-[52px] h-[52px] rounded-2xl border-2 border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all shadow-sm active:scale-95 shrink-0" 
                title="I Miei Gruppi"
              >
                 <ChevronLeft size={24} strokeWidth={2.5} />
              </button>
              <div className="relative flex-1 flex items-center">
                <input 
                type="text" 
                value={input}
                onChange={e => {
                  setInput(e.target.value);
                  setShowHistory(true);
                }}
                onFocus={() => setShowHistory(true)}
                onBlur={() => setTimeout(() => setShowHistory(false), 200)}
                placeholder="Cosa serve a casa?"
                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-3.5 pl-4 pr-12 text-sm font-medium text-slate-900 focus:outline-none focus:border-emerald-500 shadow-sm transition-all"
              />
              <button 
                type="submit" 
                disabled={!input.trim()}
                className="absolute right-2 bg-emerald-500 text-white w-9 h-9 rounded-xl flex items-center justify-center font-bold hover:bg-emerald-600 disabled:opacity-50 disabled:active:scale-100 active:scale-90 transition-all"
              >
                 <Plus size={20} strokeWidth={3} />
              </button>
              </div>
            </div>

            <AnimatePresence>
              {(showHistory || input) && matchingHistory.length > 0 && (
                <motion.div 
                    initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden absolute bottom-[100%] w-full mb-2 bg-white rounded-xl shadow-lg border border-slate-100 z-50 p-2"
                >
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">Suggerimenti</p>
                  <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
                    {matchingHistory.slice(0, 8).map(h => {
                       const alreadyActive = activeItems.find(i => i.title.toLowerCase() === h.title.toLowerCase());
                       return (
                         <button
                           key={h.id} type="button"
                           onClick={() => handleSuggestAdd(h.title)}
                           disabled={!!alreadyActive}
                           className={cn("whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-colors shadow-sm",
                              alreadyActive ? "bg-slate-100 text-slate-400" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 active:scale-95")}
                         >
                           + {h.title} {alreadyActive && '✓'}
                         </button>
                       )
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </form>

          <button 
            disabled={completedItems.length === 0}
            onClick={() => clearCompletedItems(familyId, completedItems.map(i => i.id))}
            className={cn("w-full font-bold py-4 rounded-2xl shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100",
              completedItems.length > 0 ? "bg-emerald-500 text-white hover:bg-emerald-600" : "bg-slate-900 text-slate-200"
            )}
          >
            {completedItems.length > 0 ? `Rimuovi ${completedItems.length} ${completedItems.length === 1 ? 'acquistato' : 'acquistati'}` : "Spesa in corso"}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {modalType === 'rename' && (
           <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl space-y-4">
                 <h3 className="font-bold text-lg text-slate-800">Rinomina gruppo</h3>
                 <input 
                    type="text"
                    value={renameInput}
                    onChange={(e) => setRenameInput(e.target.value)}
                    placeholder="Nome del gruppo"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all font-sans"
                 />
                 <div className="pt-2 flex gap-3">
                    <button
                       onClick={() => setModalType(null)}
                       className="flex-1 py-3 px-4 rounded-xl font-bold bg-slate-100 text-slate-700 hover:bg-slate-200"
                       disabled={isUpdating}
                    >
                       Annulla
                    </button>
                    <button
                       onClick={handleRename}
                       className="flex-1 py-3 px-4 rounded-xl font-bold bg-emerald-500 text-white hover:bg-emerald-600 active:scale-95 transition-all"
                       disabled={isUpdating || !renameInput.trim()}
                    >
                       {isUpdating ? 'Attendere...' : 'Salva'}
                    </button>
                 </div>
              </motion.div>
           </div>
        )}
        {modalType === 'password' && (
           <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl space-y-4 text-center">
                 <h3 className="font-bold text-lg text-slate-800">Password del gruppo</h3>
                 <p className="text-slate-500 text-sm">Questa è la password usata per proteggere l'accesso.</p>
                 <div className="bg-slate-100 p-4 rounded-2xl font-mono text-xl font-bold text-slate-800 select-all">
                    {family?.password ? family.password : <span className="text-slate-400 italic font-sans text-sm">Nessuna password impostata</span>}
                 </div>
                 <div className="pt-2">
                    <button
                       onClick={() => setModalType(null)}
                       className="w-full py-3 px-4 rounded-xl font-bold bg-slate-900 text-white hover:bg-slate-800 active:scale-95 transition-all"
                    >
                       Chiudi
                    </button>
                 </div>
              </motion.div>
           </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ItemRow({ item, familyId, isCompleted = false, key }: { item: ShoppingItem, familyId: string, isCompleted?: boolean, key?: React.Key }) {
  
  const handleToggle = () => toggleItemCompleted(familyId, item.id, !item.completed);
  const inc = () => updateItemQuantity(familyId, item.id, item.quantity + 1);
  const dec = () => updateItemQuantity(familyId, item.id, item.quantity - 1);

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
    >
       <div className={cn("p-3 rounded-2xl flex items-center gap-3 transition-colors", 
          isCompleted ? "bg-slate-50 opacity-70" : "bg-white shadow-sm border border-slate-50")}>
          <button 
             onClick={handleToggle}
             className={cn("w-[22px] h-[22px] shrink-0 rounded-[6px] flex items-center justify-center border-2 transition-all active:scale-90",
               item.completed ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 bg-white"
             )}
          >
             {item.completed && <Check size={14} strokeWidth={4} />}
          </button>
          
          <div className="flex-1 flex flex-col min-w-0 justify-center cursor-pointer" onClick={handleToggle}>
             <span className={cn("text-sm font-semibold truncate transition-all", 
               item.completed ? "line-through opacity-50 text-slate-500" : "text-slate-800"
             )}>
                {item.title}
             </span>
          </div>

          {!item.completed ? (
             <div className="flex items-center bg-slate-50 rounded-lg px-2 py-1 gap-3 shrink-0">
               <button onClick={dec} className="text-slate-400 font-bold active:scale-75 transition-transform flex items-center justify-center w-4 h-4">
                  {item.quantity === 1 ? <Trash2 size={12} className="text-slate-400" /> : "-"}
               </button>
               <span className="text-xs font-bold w-4 text-center text-slate-800 min-w-4">{item.quantity}</span>
               <button onClick={inc} className="text-slate-600 font-bold active:scale-75 transition-transform flex items-center justify-center w-4 h-4">
                  +
               </button>
             </div>
          ) : (
             <div className="text-xs font-bold text-slate-400 mr-2 flex-shrink-0">
               x{item.quantity}
             </div>
          )}
       </div>
    </motion.div>
  );
}
