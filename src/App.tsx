import React, { useState, useEffect, useRef } from 'react';
import { auth, loginWithGoogle, logout, loginWithEmail, registerWithEmail, sendPasswordResetEmail } from './lib/firebase';
import { useUserProfile, useShoppingList, useShoppingHistory, addShoppingItem, updateItemQuantity, toggleItemCompleted, clearCompletedItems, createFamily, joinFamily, useJoinedFamilies, leaveFamily, deleteFamily, useFamily, updateFamily, useUserInvitations, acceptInvitation, declineInvitation, inviteUser } from './lib/hooks';
import { CATEGORIES, ShoppingItem, Family, UserProfile, guessCategory } from './types';
import { 
  Apple, Milk, Beef, Croissant, Wine, Package, Sparkles, ShoppingBag, 
  Plus, Check, Trash2, LogOut, Loader2, Sparkles as SparklesIcon, 
  CheckCircle2, ChevronLeft, Lock, LogIn, MoreVertical, Edit2, 
  KeyRound, X, User, Bell, MailOpen, Layers, Users, ShieldAlert, ArrowRight, Share2 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const iconMap: Record<string, React.ReactNode> = {
  Apple: <Apple size={18} />,
  Milk: <Milk size={18} />,
  Beef: <Beef size={18} />,
  Croissant: <Croissant size={18} />,
  Wine: <Wine size={18} />,
  Package: <Package size={18} />,
  Sparkles: <Sparkles size={18} />,
  ShoppingBag: <ShoppingBag size={18} />
};

export default function App() {
  const [user, setUser] = useState(auth.currentUser);
  const [authLoading, setAuthLoading] = useState(true);
  const { profile, loading: profileLoading, updateProfile } = useUserProfile(user?.uid);
  const [forceSetup, setForceSetup] = useState(true);

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

  // If the user does not have a group, or is forced into setup/switch mode
  if (!profile?.familyId || forceSetup) {
    return (
      <FamilySetupView 
        userId={user.uid} 
        profile={profile} 
        onClose={() => setForceSetup(false)} 
        updateProfile={updateProfile} 
      />
    );
  }

  return (
    <ShoppingListView 
      familyId={profile.familyId} 
      userId={user.uid} 
      onChangeFamily={() => setForceSetup(true)}
    />
  );
}

function ListoLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const isLg = size === "lg";
  const isSm = size === "sm";
  
  return (
    <div className="flex items-center gap-2 select-none">
      <div 
        className={cn(
          "font-display font-black tracking-tighter flex items-baseline text-white",
          isLg ? "text-5xl" : isSm ? "text-xl" : "text-3xl"
        )}
      >
        L
        <span className="relative inline-flex mx-[1px] text-brand-neon">
          ı
          <svg 
            className={cn(
              "absolute text-brand-neon fill-current rotate-[15deg] transition-transform hover:rotate-[30deg]",
              isLg ? "-top-[4px] w-[18px] h-[18px]" : isSm ? "-top-[1px] w-[8px] h-[8px]" : "-top-[2px] w-[13px] h-[13px]"
            )} 
            viewBox="0 0 24 24"
          >
            <path d="M21 3C21 3 13 3 7 9C2 14 2 21 2 21C2 21 11 21 16 16C21 11 21 3 21 3Z" />
          </svg>
        </span>
        sto
      </div>
    </div>
  );
}

function LoadingView() {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-brand-dark relative overflow-hidden">
      {/* Glow Ambient Blobs */}
      <div className="absolute top-1/4 left-1/4 w-80 h-80 bg-brand-green/35 rounded-full filter blur-[100px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-brand-neon/15 filter blur-[100px] rounded-full" />
      
      <div className="z-10 flex flex-col items-center gap-4">
        <ListoLogo size="lg" />
        <div className="flex items-center gap-2 text-brand-neon/80 font-mono text-xs tracking-wider uppercase mt-4">
          <Loader2 className="animate-spin text-brand-neon" size={18} />
          <span>Sincronizzazione...</span>
        </div>
      </div>
    </div>
  );
}

function LoginView() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await loginWithGoogle();
    } catch (e: any) {
      console.error(e);
      let message = "Errore durante l'accesso con Google. Se stai usando Safari o restrizioni cookie, prova con un altro browser.";
      if (e?.code === 'auth/unauthorized-domain' || (e?.message && e.message.includes('unauthorized-domain'))) {
        message = "Dominio non autorizzato su Firebase Console.";
      } else if (e?.message) {
        message = e.message;
      }
      setError(message);
    }
    setLoading(false);
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setError("Inserisci sia l'email che la password.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (mode === 'signin') {
        await loginWithEmail(email.trim(), password);
      } else {
        if (password.length < 6) {
          throw new Error("La password deve contenere almeno 6 caratteri.");
        }
        await registerWithEmail(email.trim(), password);
      }
    } catch (e: any) {
      console.error(e);
      let message = "Errore durante l'autenticazione.";
      if (e?.code === 'auth/operation-not-allowed' || (e?.message && e.message.includes('operation-not-allowed'))) {
        message = "Metodo di accesso e-mail/password non abilitato su Firebase Console.";
      } else if (e?.code === 'auth/user-not-found' || e?.code === 'auth/wrong-password' || e?.code === 'auth/invalid-credential') {
        message = "Email o password non corrette.";
      } else if (e?.code === 'auth/email-already-in-use') {
        message = "Questa email è già registrata.";
      } else if (e?.code === 'auth/invalid-email') {
        message = "Indirizzo email non valido.";
      } else if (e?.message) {
        message = e.message;
      }
      setError(message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-[100dvh] bg-brand-dark flex items-center justify-center p-4 relative overflow-hidden">
      {/* Interactive Backlight effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-brand-green/20 blur-[150px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-brand-neon/10 blur-[180px]" />
      
      <motion.div 
        initial={{ opacity: 0, y: 30 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="max-w-md w-full glass-panel-heavy rounded-3xl p-8 border border-white/5 flex flex-col items-center relative z-10 shadow-2xl"
      >
        <div className="mb-2 scale-110">
          <ListoLogo size="lg" />
        </div>
        <p className="text-slate-400 mb-8 text-center text-sm font-light mt-2 max-w-[280px] leading-relaxed">
          Liste della spesa sincronizzate in tempo reale con uno stile modernista.
        </p>

        {/* Tab Switcher */}
        <div className="w-full flex bg-brand-green/10 p-1 rounded-2xl mb-6 border border-white/5">
          <button
            onClick={() => { setMode('signin'); setError(null); }}
            className={cn(
              "flex-1 py-3 text-xs uppercase tracking-wider font-semibold rounded-xl transition-all cursor-pointer",
              mode === 'signin' 
                ? "bg-brand-green text-white shadow-md border border-brand-neon/25" 
                : "text-slate-400 hover:text-white"
            )}
          >
            Accedi
          </button>
          <button
            onClick={() => { setMode('signup'); setError(null); }}
            className={cn(
              "flex-1 py-3 text-xs uppercase tracking-wider font-semibold rounded-xl transition-all cursor-pointer",
              mode === 'signup' 
                ? "bg-brand-green text-white shadow-md border border-brand-neon/25" 
                : "text-slate-400 hover:text-white"
            )}
          >
            Registrati
          </button>
        </div>

        {/* Email Form */}
        <form onSubmit={handleEmailAuth} className="w-full space-y-5 mb-6">
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-[#00df82] px-1">Indirizzo Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="es. marco@gomez.com"
              required
              className="w-full bg-brand-dark/60 border border-brand-green/40 text-sm focus:border-brand-neon rounded-xl px-4 py-3.5 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-brand-neon/30 transition-all font-medium"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-[10px] font-bold uppercase tracking-widest text-[#00df82] px-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full bg-brand-dark/60 border border-brand-green/40 text-sm focus:border-brand-neon rounded-xl px-4 py-3.5 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-brand-neon/30 transition-all font-medium"
            />
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full glow-btn disabled:opacity-50 text-white rounded-xl py-4 font-bold text-sm tracking-wide active:scale-95 transition-all text-center flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : mode === 'signin' ? 'Accedi Ora' : 'Crea Nuovo Account'}
          </button>
        </form>

        {/* Separator */}
        <div className="w-full flex items-center justify-between gap-4 mb-6">
          <div className="h-[1px] bg-brand-green/25 flex-1"></div>
          <span className="text-[10px] font-mono tracking-[0.2em] text-slate-500 uppercase">oppure</span>
          <div className="h-[1px] bg-brand-green/25 flex-1"></div>
        </div>

        {/* Google sign-in */}
        <button 
          onClick={handleGoogleLogin} 
          disabled={loading}
          type="button"
          className="w-full flex items-center justify-center gap-3 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-xl py-4 px-6 font-bold text-sm transition-all active:scale-95 cursor-pointer shadow-md"
        >
          {loading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <>
              <svg className="w-5 h-5 bg-white rounded-full p-0.5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.61c-.29 1.5-1.14 2.77-2.4 3.61v3h3.81c2.23-2.05 3.52-5.07 3.52-8.46z"/>
                <path fill="#34A853" d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-3.81-3c-1.06.7-2.42 1.13-4.15 1.13-3.2 0-5.91-2.16-6.87-5.07H1.1v3.1A12 12 0 0 0 12 24z"/>
                <path fill="#FBBC05" d="M5.13 14.15A7.12 7.12 0 0 1 4.7 12c0-.75.13-1.48.36-2.19V6.7H1.1a12 12 0 0 0 0 10.6l4.03-3.15z"/>
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44A12 12 0 0 0 1.12 6.7l4.03 3.15C6.1 6.9 8.8 4.75 12 4.75z"/>
              </svg>
              <span>Accedi con Google</span>
            </>
          )}
        </button>

        {error && (
          <div className="w-full mt-6 p-4 rounded-xl bg-red-950/40 border border-red-500/30 text-left animate-fadeIn">
            <p className="font-bold mb-1 flex items-center gap-2 text-xs text-red-400">
              <ShieldAlert size={14} /> Stato Accesso
            </p>
            <p className="text-red-300 leading-relaxed text-xs opacity-90">{error}</p>
          </div>
        )}
      </motion.div>
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
  const [modalType, setModalType] = useState<'profile' | 'notifications' | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editProfileName, setEditProfileName] = useState(profile?.name || '');

  useEffect(() => {
    if (profile?.name) setEditProfileName(profile.name);
  }, [profile?.name]);
  
  const { families: joinedFamilies, loading: familiesLoading } = useJoinedFamilies(profile?.joinedFamilies);
  const { invitations } = useUserInvitations(auth.currentUser?.email);

  const handleJoin = async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError('');
    try {
      const success = await joinFamily(userId, code.trim().toLowerCase(), joinPassword.trim());
      if (!success) setError('CodiceID famiglia non trovato.');
      else { 
        setCode(''); 
        setJoinPassword(''); 
        setIsDrawerOpen(false); 
        setActiveForm(null); 
        if (profile?.familyId) onClose(); 
      }
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
      setName(''); 
      setCreatePassword(''); 
      setIsDrawerOpen(false); 
      setActiveForm(null); 
      if (profile?.familyId) onClose();
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
       setError(err.message || "Errore imprevisto.");
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
    <div className="min-h-[100dvh] bg-brand-dark flex flex-col font-sans text-white relative overflow-hidden">
      {/* Dynamic Glowing Nodes */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-brand-green/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-brand-neon/5 rounded-full blur-[150px] pointer-events-none" />

      <header className="sticky top-0 bg-brand-dark/75 backdrop-blur-xl border-b border-white/5 p-4 lg:px-8 flex items-center justify-center z-30 shrink-0">
        <div className="w-full max-w-4xl flex justify-between items-center">
          <ListoLogo />
          <div className="flex gap-2.5 items-center">
            <button 
              onClick={() => setModalType('profile')} 
              className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-300 bg-white/5 border border-white/10 hover:text-white hover:border-brand-neon hover:bg-white/10 transition-all shadow-md active:scale-95"
              title="Mio Profilo"
            >
              <User size={18} strokeWidth={2.5} />
            </button>
            <button 
              onClick={() => setModalType('notifications')} 
              className="relative w-10 h-10 rounded-xl flex items-center justify-center text-slate-300 bg-white/5 border border-white/10 hover:text-white hover:border-brand-neon hover:bg-white/10 transition-all shadow-md active:scale-95"
              title="Notifiche"
            >
              <Bell size={18} strokeWidth={2.5} />
              {invitations.length > 0 && (
                <span className="absolute top-[3px] right-[3px] w-2.5 h-2.5 bg-brand-neon rounded-full ring-2 ring-brand-dark"></span>
              )}
            </button>
            <button 
              onClick={() => { setIsDrawerOpen(true); setActiveForm('join'); }}
              className="glow-btn text-white rounded-xl px-4 py-2 text-xs uppercase tracking-wider font-bold shadow-md active:scale-95 transition-all flex items-center gap-1.5"
            >
              <Plus size={14} strokeWidth={3} /> Aggiungi
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 p-6 overflow-y-auto max-w-4xl w-full mx-auto relative z-10">
        <div className="space-y-8 mt-4">
          <div className="space-y-6">
            <div className="border-l-4 border-brand-neon pl-4 space-y-1">
              <h2 className="text-2xl font-display font-bold tracking-tight text-white">I Miei Gruppi</h2>
            </div>
            
            {familiesLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="animate-spin text-brand-neon" size={28} />
              </div>
            ) : (!joinedFamilies || joinedFamilies.length === 0) ? (
              <div className="text-center py-14 px-6 rounded-3xl bg-brand-green/5 border border-brand-green/20 flex flex-col items-center">
                <Users size={36} className="text-brand-green mb-3" />
                <p className="text-slate-300 text-sm font-medium">Non sei ancora in nessun gruppo.</p>
                <p className="text-slate-500 text-xs mt-1">Clicca su "Aggiungi" in alto per crearne uno o inserire un codice di invito.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {joinedFamilies.map(fam => {
                  const isActive = profile?.familyId === fam.id;
                  return (
                    <motion.div 
                      key={fam.id} 
                      whileHover={{ y: -3, scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      className={cn(
                        "w-full text-left p-5 rounded-2xl flex flex-col justify-between border transition-all cursor-pointer group shadow-lg relative overflow-hidden",
                        isActive 
                          ? "bg-brand-green/20 border-brand-neon/50" 
                          : "bg-brand-green/5 border-white/5 hover:border-brand-neon/20 hover:bg-brand-green/10"
                      )}
                      onClick={() => switchFamily(fam.id)}
                    >
                      {isActive && (
                        <div className="absolute top-0 right-0 bg-brand-neon text-brand-dark font-mono text-[9px] uppercase tracking-wider font-bold px-3 py-1 rounded-bl-xl shadow-sm">
                          Attivo
                        </div>
                      )}
                      
                      <div className="space-y-4">
                        <div>
                          <h3 className="font-display font-bold text-lg text-white group-hover:text-brand-neon transition-colors truncate">
                            {fam.name}
                          </h3>
                          <p className="text-xs text-brand-neon/90 font-mono mt-3 flex items-center gap-2">
                            <span>ID:</span> 
                            <span className="bg-brand-dark/50 px-2.5 py-1 rounded-lg tracking-wider font-bold border border-brand-neon/15">{fam.id}</span>
                          </p>
                        </div>
                        
                        <div className="flex items-center justify-end pt-2 border-t border-white/5">
                          <button
                            onClick={(e) => handleDeleteOrLeave(e, fam)}
                            className="text-slate-500 hover:text-red-400 transition-colors p-2 rounded-xl hover:bg-red-500/10 flex items-center gap-1.5 text-xs font-semibold"
                            title={fam.ownerId === userId ? "Elimina intero gruppo" : "Abbandona gruppo"}
                          >
                            <Trash2 size={14} />
                            <span>{fam.ownerId === userId ? "Elimina" : "Abbandona"}</span>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Floating Join/Create drawer */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              onClick={() => setIsDrawerOpen(false)}
              className="fixed inset-0 bg-brand-dark/80 backdrop-blur-md z-40" 
            />
            <motion.div 
              initial={{ x: '100%' }} 
              animate={{ x: 0 }} 
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              className="fixed top-0 right-0 h-[100dvh] w-full max-w-md bg-brand-dark border-l border-white/5 shadow-2xl z-50 flex flex-col overflow-hidden"
            >
              <div className="p-5 bg-brand-dark/60 border-b border-white/5 flex items-center justify-between shrink-0">
                <h2 className="text-lg font-display font-bold text-white flex items-center gap-2">
                  <Layers size={18} className="text-brand-neon" /> Aggiungi Gruppo Spesa
                </h2>
                <button 
                  onClick={() => setIsDrawerOpen(false)} 
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white transition-all"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="flex p-4 gap-2 bg-brand-dark border-b border-white/5 shrink-0">
                <button
                  onClick={() => { setActiveForm('join'); setError(''); }}
                  className={cn(
                    "flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer", 
                    activeForm === 'join' 
                      ? "bg-brand-green text-white border border-brand-neon/30" 
                      : "text-slate-400 hover:bg-white/5"
                  )}
                >
                  Unisciti
                </button>
                <button
                  onClick={() => { setActiveForm('create'); setError(''); }}
                  className={cn(
                    "flex-1 py-3 rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer", 
                    activeForm === 'create' 
                      ? "bg-brand-green text-white border border-brand-neon/30" 
                      : "text-slate-400 hover:bg-white/5"
                  )}
                >
                  Crea Nuovo
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <AnimatePresence mode="wait">
                  {activeForm === 'join' && (
                    <motion.div 
                      key="join" 
                      initial={{ opacity: 0, y: 15 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      exit={{ opacity: 0, y: -15 }} 
                      className="space-y-5"
                    >
                      <div className="space-y-1">
                        <h3 className="font-display font-bold text-lg text-white">Inserisci il Codice Gruppo</h3>
                        <p className="text-slate-400 text-xs">Unisciti inserendo l'ID univoco del gruppo spesa condiviso.</p>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-[#00df82] px-1">ID Gruppo</label>
                          <input 
                            type="text" 
                            placeholder="Ad esempio: a1b2c3d4" 
                            value={code} 
                            onChange={e => setCode(e.target.value)}
                            autoCapitalize="none"
                            autoCorrect="off"
                            spellCheck="false"
                            className="w-full bg-brand-dark border border-brand-green/35 text-sm uppercase rounded-xl px-4 py-3.5 focus:border-brand-neon focus:outline-none focus:ring-1 focus:ring-brand-neon/30 font-mono font-medium text-white shadow-inner placeholder:text-slate-700"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-[#00df82] px-1">Password d'Accesso (Opzionale)</label>
                          <input 
                            type="password" 
                            placeholder="Password se richiesta dal fondatore" 
                            value={joinPassword} 
                            onChange={e => setJoinPassword(e.target.value)}
                            className="w-full bg-brand-dark border border-brand-green/35 text-sm rounded-xl px-4 py-3.5 focus:border-brand-neon focus:outline-none focus:ring-1 focus:ring-brand-neon/30 font-medium text-white shadow-inner placeholder:text-slate-700"
                          />
                        </div>

                        <button 
                          onClick={handleJoin} 
                          disabled={loading || !code.trim()}
                          className="w-full glow-btn text-white py-4 rounded-xl font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
                        >
                          {loading && <Loader2 size={16} className="animate-spin" />}
                          Connettiti al Gruppo
                        </button>
                      </div>
                      {error && (
                        <div className="p-3.5 bg-red-950/40 border border-red-500/20 rounded-xl text-red-300 text-xs leading-relaxed">
                          {error}
                        </div>
                      )}
                    </motion.div>
                  )}
                  
                  {activeForm === 'create' && (
                    <motion.div 
                      key="create" 
                      initial={{ opacity: 0, y: 15 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      exit={{ opacity: 0, y: -15 }} 
                      className="space-y-5"
                    >
                      <div className="space-y-1">
                        <h3 className="font-display font-bold text-lg text-white">Fonda un Nuovo Gruppo</h3>
                        <p className="text-slate-400 text-xs">Crea una lista spesa e condividila istantaneamente con chi vuoi.</p>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-[#00df82] px-1">Nome Gruppo Spesa</label>
                          <input 
                            type="text" 
                            placeholder="Es. Spesa di Famiglia, Coinqui..." 
                            value={name} 
                            onChange={e => setName(e.target.value)}
                            className="w-full bg-brand-dark border border-brand-green/35 text-sm rounded-xl px-4 py-3.5 focus:border-brand-neon focus:outline-none focus:ring-1 focus:ring-brand-neon/30 font-medium text-white shadow-inner placeholder:text-slate-700"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-[#00df82] px-1">Imposta Password Segreta (Opzionale)</label>
                          <input 
                            type="password" 
                            placeholder="Per proteggere l'ingresso di estranei" 
                            value={createPassword} 
                            onChange={e => setCreatePassword(e.target.value)}
                            className="w-full bg-brand-dark border border-brand-green/35 text-sm rounded-xl px-4 py-3.5 focus:border-brand-neon focus:outline-none focus:ring-1 focus:ring-brand-neon/30 font-medium text-white shadow-inner placeholder:text-slate-700"
                          />
                        </div>

                        <button 
                          onClick={handleCreate} 
                          disabled={loading || !name.trim()}
                          className="w-full glow-btn text-white py-4 rounded-xl font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
                        >
                          {loading && <Loader2 size={16} className="animate-spin" />}
                          Crea e Genera ID
                        </button>
                      </div>
                      {error && (
                        <div className="p-3.5 bg-red-950/40 border border-red-500/20 rounded-xl text-red-300 text-xs leading-relaxed">
                          {error}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Group Elimination modals */}
      <AnimatePresence>
         {confirmModals && (
            <div className="fixed inset-0 bg-brand-dark/95 backdrop-blur-md z-50 flex items-center justify-center p-4">
               <motion.div 
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }} 
                exit={{ opacity: 0, scale: 0.95 }} 
                className="bg-brand-green/10 border border-brand-neon/30 rounded-3xl p-6 w-full max-w-sm text-center space-y-4 shadow-2xl relative"
               >
                  <div className="w-12 h-12 bg-red-500/10 text-red-400 border border-red-500/30 rounded-full flex items-center justify-center mx-auto">
                    <ShieldAlert size={22} />
                  </div>
                  <h3 className="font-display font-medium text-lg text-white">
                     {confirmModals.type === 'delete' ? 'Elimina gruppo' : 'Abbandona gruppo'}
                  </h3>
                  <p className="text-slate-300 text-xs leading-relaxed">
                     Sei sicuro di voler {confirmModals.type === 'delete' ? 'eliminare definitivamente' : 'abbandonare'} il gruppo <strong>{confirmModals.fam.name}</strong>? {confirmModals.type === 'delete' && 'Tutti i partecipanti perderanno l\'accesso della lista spesa definitivamente.'}
                  </p>
                  <div className="pt-2 flex gap-3">
                     <button
                        onClick={() => setConfirmModals(null)}
                        className="flex-1 py-3 text-xs uppercase tracking-wider rounded-xl font-bold bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
                        disabled={loading}
                     >
                        Annulla
                     </button>
                     <button
                        onClick={confirmDeleteOrLeave}
                        className="flex-1 py-3 text-xs uppercase tracking-wider rounded-xl font-bold bg-red-600 border border-red-500 text-white active:scale-95 hover:bg-red-700 transition-colors cursor-pointer shadow-lg"
                        disabled={loading}
                     >
                        {loading ? 'Operazione...' : 'Conferma'}
                     </button>
                  </div>
               </motion.div>
            </div>
         )}
      </AnimatePresence>

      {/* Profile & Notifications Modal windows */}
      <AnimatePresence>
        {modalType === 'profile' && (
           <div className="fixed inset-0 bg-brand-dark/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }} 
                exit={{ opacity: 0, scale: 0.95 }} 
                className="bg-brand-green/10 border border-brand-neon/20 rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-5"
              >
                 <div className="flex items-center justify-between border-b border-white/5 pb-3">
                   <h3 className="font-display font-bold text-lg text-white">Mio Profilo</h3>
                   <button onClick={() => setModalType(null)} className="text-slate-400 hover:text-white transition-colors">
                     <X size={18} />
                   </button>
                 </div>
                 
                 <div className="space-y-4 pt-1">
                    <div className="space-y-1.5">
                       <p className="text-[10px] font-bold text-brand-neon uppercase tracking-widest px-1">Il tuo Nome</p>
                       <div className="flex gap-2">
                          <input
                            type="text"
                            value={editProfileName}
                            onChange={(e) => setEditProfileName(e.target.value)}
                            placeholder="Inserisci nome..."
                            className="flex-1 bg-brand-dark border border-brand-green/30 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:border-brand-neon text-white"
                          />
                          <button
                            onClick={async () => {
                              try {
                                setIsUpdating(true);
                                await updateProfile({ name: editProfileName });
                              } catch (e: any) {
                                alert('Errore: ' + e.message);
                              } finally {
                                setIsUpdating(false);
                              }
                            }}
                            disabled={isUpdating || editProfileName === profile?.name}
                            className="bg-brand-green border border-brand-neon/30 text-white px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-wider disabled:opacity-50 hover:bg-brand-green/80 active:scale-95 cursor-pointer"
                          >
                            Salva
                          </button>
                       </div>
                    </div>
                    
                    <div className="bg-white/5 p-4 rounded-2xl space-y-1">
                       <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Mio Indirizzo Email</p>
                       <p className="font-mono text-xs text-slate-200 select-all font-semibold truncate">{auth.currentUser?.email}</p>
                    </div>
                    
                    <button
                       onClick={async () => {
                          try {
                            setIsUpdating(true);
                            await sendPasswordResetEmail(auth.currentUser?.email || '');
                            alert('Ti abbiamo inviato un\'email per reimpostare la password.');
                          } catch (e: any) {
                            alert('Errore: ' + e.message);
                          } finally {
                            setIsUpdating(false);
                          }
                       }}
                       disabled={isUpdating}
                       className="w-full py-3.5 px-4 flex items-center gap-2 justify-center rounded-xl font-bold border border-brand-neon/30 text-brand-neon hover:bg-brand-neon/10 transition-all text-xs uppercase tracking-wider cursor-pointer shadow-md"
                    >
                       <KeyRound size={14} />
                       Reimposta Password
                    </button>
                    
                    <div className="h-[1px] bg-white/5 w-full my-4" />
                    
                    <button
                       onClick={() => logout()}
                       className="w-full py-3.5 px-4 flex items-center gap-2 justify-center rounded-xl font-bold bg-red-600/10 border border-red-500/20 text-red-400 hover:bg-red-600/20 hover:text-red-300 transition-all text-xs uppercase tracking-wider cursor-pointer"
                    >
                       <LogOut size={14} />
                       Esci dall'Account
                    </button>
                 </div>
              </motion.div>
           </div>
        )}

        {modalType === 'notifications' && (
           <div className="fixed inset-0 bg-brand-dark/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }} 
                animate={{ opacity: 1, scale: 1 }} 
                exit={{ opacity: 0, scale: 0.95 }} 
                className="bg-brand-green/10 border border-brand-neon/20 rounded-3xl p-6 w-full max-w-md shadow-2xl max-h-[80vh] flex flex-col"
              >
                 <div className="flex items-center justify-between border-b border-white/5 pb-3">
                   <h3 className="font-display font-bold text-lg text-white">Notifiche e Inviti</h3>
                   <button onClick={() => setModalType(null)} className="text-slate-400 hover:text-white transition-colors">
                     <X size={18} />
                   </button>
                 </div>
                 
                 <div className="flex-1 overflow-y-auto space-y-3.5 py-4 hide-scrollbar">
                    {invitations.length === 0 ? (
                       <div className="text-center py-10 px-4 bg-brand-dark/40 rounded-2xl border border-brand-green/10">
                         <Bell className="text-brand-green/80 mx-auto mb-2" size={24} />
                         <p className="text-xs text-slate-400">Nessun invito in sospeso al momento.</p>
                       </div>
                    ) : (
                       invitations.map(inv => (
                          <div key={inv.id} className="bg-brand-green/10 border border-brand-neon/15 p-4 rounded-2xl flex flex-col gap-3.5 shadow-md">
                             <div className="flex items-start gap-3">
                                <div className="p-2 bg-brand-neon/10 rounded-lg text-brand-neon shrink-0">
                                  <MailOpen size={16} />
                                </div>
                                <div>
                                   <p className="text-xs text-slate-300">
                                      Hai ricevuto un invito da <span className="font-bold text-white font-mono">{inv.fromUserEmail}</span> per unirti al gruppo spesa: 
                                   </p>
                                   <p className="text-sm font-display font-black text-white mt-1.5 border-l-2 border-brand-neon pl-2">
                                     {inv.familyName}
                                   </p>
                                </div>
                             </div>
                             
                             <div className="flex gap-2">
                                <button
                                  onClick={async () => {
                                    try {
                                      setIsUpdating(true);
                                      await acceptInvitation(userId, inv.id, inv.familyId);
                                      alert('Invito accettato con successo!');
                                      setModalType(null);
                                    } catch(e: any) { alert(e.message); }
                                    finally { setIsUpdating(false); }
                                  }}
                                  disabled={isUpdating}
                                  className="flex-1 bg-brand-neon text-brand-dark font-bold py-2 rounded-xl text-xs uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all cursor-pointer shadow-md"
                                >
                                  Accetta
                                </button>
                                <button
                                  onClick={async () => {
                                    try {
                                      setIsUpdating(true);
                                      await declineInvitation(inv.id);
                                    } catch(e: any) { alert(e.message); }
                                    finally { setIsUpdating(false); }
                                  }}
                                  disabled={isUpdating}
                                  className="flex-1 bg-white/5 border border-white/10 text-slate-300 py-2 rounded-xl text-xs uppercase tracking-wider hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
                                >
                                  Rifiuta
                                </button>
                             </div>
                          </div>
                       ))
                    )}
                 </div>
              </motion.div>
           </div>
        )}
      </AnimatePresence>
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
  const [modalType, setModalType] = useState<'rename' | 'password' | 'profile' | 'invite' | 'confirmClear' | null>(null);
  const [renameInput, setRenameInput] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const touchStartX = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const distance = touchEndX - touchStartX.current;
    
    // threshold: start near left edge (< 40px) swipe right > 85px to switch group
    if (touchStartX.current < 45 && distance > 85) {
       onChangeFamily();
    }
    
    touchStartX.current = null;
  };

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
    if (!activeItems.find(i => i.title.toLowerCase() === title.toLowerCase())) {
        await addShoppingItem(familyId, title, userId);
    }
  };

  const matchingHistory = input.trim() 
    ? history.filter(h => h.title.toLowerCase().includes(input.toLowerCase())) 
    : history.slice(0, 5);

  return (
    <div 
      className="min-h-[100dvh] bg-brand-dark flex flex-col font-sans sm:py-6 overflow-hidden relative"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-1/4 left-1/4 w-[350px] h-[350px] bg-brand-green/20 rounded-full blur-[110px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-brand-neon/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Desktop/Mobile Centered Content Shell */}
      <div className="flex-1 flex flex-col w-full sm:max-w-md md:max-w-2xl lg:max-w-3xl mx-auto glass-panel-heavy sm:rounded-[36px] overflow-hidden relative z-10 border border-white/5 shadow-2xl">
        
        {/* Header */}
        <header className="px-6 py-5 flex justify-between items-center z-30 bg-brand-dark/40 border-b border-white/5 shrink-0">
          <div className="flex flex-col flex-1 truncate pr-3">
             <div className="flex items-center gap-2">
                <h1 className="text-xl font-display font-bold tracking-tight text-white truncate">
                  {family ? family.name : 'Listo'}
                </h1>
             </div>
             {family && (
                <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                   <span>ID Gruppo:</span> 
                   <span className="font-mono text-xs text-brand-neon tracking-wide font-black select-all px-1 bg-brand-dark/50 rounded">
                     {family.id}
                   </span>
                </div>
             )}
          </div>
          
          <div className="relative shrink-0 flex items-center gap-2">
             <button 
               onClick={onChangeFamily}
               className="h-10 px-3 cursor-pointer rounded-xl text-slate-300 hover:text-white border border-white/10 bg-white/5 text-xs font-bold uppercase tracking-wider flex items-center gap-1 transition-all active:scale-95"
               title="Indietro ai Gruppi"
             >
                <ChevronLeft size={16} /> <span className="hidden sm:inline">Gruppi</span>
             </button>
             
             <div className="relative">
               <button 
                 onClick={() => setMenuOpen(!menuOpen)} 
                 className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-300 bg-white/5 border border-white/10 hover:text-white hover:border-brand-neon hover:bg-white/10 transition-all shadow-md active:scale-95 cursor-pointer"
               >
                  <MoreVertical size={20} strokeWidth={2.5} />
               </button>
               
               {menuOpen && (
                  <>
                     <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                     <div className="absolute right-0 top-12 w-52 bg-brand-dark border border-brand-green/30 rounded-2xl shadow-2xl z-50 overflow-hidden py-1.5 animate-fadeIn">
                        <button 
                           onClick={() => { setMenuOpen(false); setRenameInput(family?.name || ''); setModalType('rename'); }} 
                           className="w-full text-left px-4 py-3 text-xs uppercase tracking-wider font-bold text-slate-300 hover:bg-white/5 hover:text-white flex items-center gap-2 transition-all cursor-pointer"
                        >
                           <Edit2 size={13} className="text-[#00df82]" /> Rinomina gruppo
                        </button>
                        <button 
                           onClick={() => { setMenuOpen(false); setModalType('invite'); }} 
                           className="w-full text-left px-4 py-3 text-xs uppercase tracking-wider font-bold text-slate-300 hover:bg-white/5 hover:text-white flex items-center gap-2 transition-all cursor-pointer"
                        >
                           <Share2 size={13} className="text-[#00df82]" /> Invita Membro
                        </button>
                        <button 
                           onClick={() => { setMenuOpen(false); setModalType('password'); }} 
                           className="w-full text-left px-4 py-3 text-xs uppercase tracking-wider font-bold text-slate-300 hover:bg-white/5 hover:text-white flex items-center gap-2 transition-all cursor-pointer"
                        >
                           <KeyRound size={13} className="text-[#00df82]" /> Mostra Password
                        </button>
                     </div>
                  </>
               )}
             </div>
          </div>
        </header>

        {/* Real-time statistics */}
        <div className="px-6 py-4 shrink-0 bg-brand-green/5 border-b border-white/5">
           <div className="flex justify-between items-center mb-2.5">
              <div>
                 <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Avanzamento acquisti</p>
                 <p className="text-lg font-display font-semibold text-white">
                   {completedItems.length} <span className="text-slate-500 font-light">/</span> {items.length} 
                   <span className="text-xs text-brand-neon font-mono ml-2">({progress}%)</span>
                 </p>
              </div>
              {!loading && items.length > 0 && activeItems.length > 0 && (
                <button
                   onClick={() => activeItems.forEach(i => toggleItemCompleted(familyId, i.id, true))}
                   className="text-[9px] font-bold text-brand-neon uppercase tracking-widest px-3 py-2 bg-brand-neon/10 hover:bg-brand-neon/20 hover:text-white rounded-lg active:scale-95 transition-all shadow-sm border border-brand-neon/20 flex items-center gap-1 cursor-pointer"
                >
                   <CheckCircle2 size={12} /> Seleziona Tutti
                </button>
              )}
           </div>
           
           {/* Custom styled glowing progress track */}
           <div className="w-full h-2 bg-brand-dark/60 rounded-full overflow-hidden border border-white/5 p-[1px]">
              <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className="h-full rounded-full glow-btn"
                  style={{ background: 'linear-gradient(90deg, #03624c 0%, #00df82 100%)' }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
              />
           </div>
        </div>

        {/* Shopping Items Listing Area */}
        <div className="flex-1 overflow-y-auto px-6 py-4 hide-scrollbar relative z-10 space-y-5">
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="animate-spin text-brand-neon" size={32} />
              <p className="text-xs text-slate-400 uppercase tracking-widest font-mono">Aggiornamento lista...</p>
            </div>
          )}
          
          {!loading && items.length === 0 && (
            <div className="text-center py-20 px-6 max-w-sm mx-auto flex flex-col items-center">
              <div className="w-16 h-16 bg-brand-green/10 border border-brand-neon/25 rounded-full flex items-center justify-center mb-4 text-brand-neon/90 shadow-lg p-3">
                <SparklesIcon size={28} />
              </div>
              <h3 className="text-lg font-display font-bold text-white mb-2">La tua Lista è Vuota</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Nessuno ha ancora inserito articoli. Scrivi cosa serve a casa nel box in basso per iniziare la spesa condivisa!
              </p>
            </div>
          )}

          {activeItems.length > 0 && (
            <div className="space-y-2.5">
              <p className="text-[10px] font-bold text-brand-neon uppercase tracking-widest mb-1.5 px-0.5">Articoli da Comprare</p>
              <AnimatePresence initial={false}>
                {activeItems.map(item => (
                  <ItemRow key={item.id} item={item} familyId={familyId} />
                ))}
              </AnimatePresence>
            </div>
          )}

          {completedItems.length > 0 && (
            <div className="pt-4 border-t border-white/5">
              <div className="flex justify-between items-center mb-3 px-0.5">
                <h3 className="text-[10px] font-bold text-slate-400 tracking-widest uppercase flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-brand-green" />
                  Elementi Acquistati
                </h3>
                <span className="text-[10px] font-mono text-slate-500">{completedItems.length} presi</span>
              </div>
              
              <div className="space-y-2.5">
                 <AnimatePresence initial={false}>
                    {completedItems.map(item => (
                      <ItemRow key={item.id} item={item} familyId={familyId} isCompleted />
                    ))}
                 </AnimatePresence>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions input area */}
        <div className="p-5 bg-brand-dark/90 border-t border-white/5 shrink-0 z-30 relative flex flex-col gap-4">
          <form onSubmit={handleAdd} className="relative z-25 flex flex-col w-full">
            <div className="relative flex items-center gap-2">
              <div className="relative flex-1 flex items-center">
                <input 
                  type="text" 
                  value={input}
                  onChange={e => {
                    setInput(e.target.value);
                    setShowHistory(true);
                  }}
                  onFocus={() => setShowHistory(true)}
                  onBlur={() => setTimeout(() => setShowHistory(false), 240)}
                  placeholder="Scrivi es. Latte, Mele, Pane..."
                  className="w-full bg-brand-green/10 border border-brand-green/40 focus:border-brand-neon rounded-2xl py-4.5 pl-4 pr-12 text-sm font-medium text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-neon/30 transition-all shadow-inner"
                />
                
                <button 
                  type="submit" 
                  disabled={!input.trim()}
                  className="absolute right-2 glow-btn text-white w-9.5 h-9.5 rounded-xl flex items-center justify-center font-bold disabled:opacity-40 disabled:scale-100 active:scale-95 cursor-pointer shadow-md"
                >
                   <Plus size={18} strokeWidth={3} />
                </button>
              </div>
            </div>

            {/* Smart Inline History Suggestions */}
            <AnimatePresence>
              {(showHistory || input) && matchingHistory.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: -5, height: 0 }} 
                  animate={{ opacity: 1, y: 0, height: 'auto' }} 
                  exit={{ opacity: 0, y: -5, height: 0 }}
                  className="overflow-hidden absolute bottom-[105%] w-full bg-brand-dark border border-brand-green/30 rounded-2xl shadow-2xl z-40 p-3 mb-1"
                >
                  <p className="text-[9px] font-bold text-brand-neon uppercase tracking-widest mb-2 px-1">Scegli dai Più Acquistati</p>
                  <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
                    {matchingHistory.slice(0, 8).map(h => {
                       const categoryId = guessCategory(h.title);
                       const matchedCat = CATEGORIES.find(c => c.id === categoryId);
                       const alreadyActive = activeItems.find(i => i.title.toLowerCase() === h.title.toLowerCase());
                       return (
                         <button
                           key={h.id} 
                           type="button"
                           onClick={() => handleSuggestAdd(h.title)}
                           disabled={!!alreadyActive}
                           className={cn(
                             "whitespace-nowrap px-3.5 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all border shadow-sm flex items-center gap-1.5 cursor-pointer",
                             alreadyActive 
                               ? "bg-white/5 border-white/5 text-slate-500" 
                               : "bg-brand-green/20 border-brand-neon/20 hover:border-brand-neon/50 text-white active:scale-95"
                           )}
                         >
                           <span>{matchedCat && iconMap[matchedCat.icon]} {h.title}</span>
                           {alreadyActive && <span className="text-brand-neon">✓</span>}
                         </button>
                       )
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </form>

          {/* Remove Purchased button */}
          <button 
            disabled={completedItems.length === 0}
            onClick={() => setModalType('confirmClear')}
            className={cn(
              "w-full rounded-2xl font-bold py-4 text-xs tracking-wider uppercase active:scale-95 transition-all disabled:opacity-35 disabled:active:scale-100 shadow-md cursor-pointer",
              completedItems.length > 0 
                ? "glow-btn text-white border-0" 
                : "bg-white/5 border border-white/10 text-slate-500"
            )}
          >
            {completedItems.length > 0 
              ? `Fai la spesa (${completedItems.length})` 
              : "Nessun elemento acquistato"}
          </button>
        </div>
      </div>

      {/* Internal Modals */}
      <AnimatePresence>
        {modalType === 'confirmClear' && (
           <div className="fixed inset-0 bg-brand-dark/95 backdrop-blur-md z-50 flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-brand-green/10 border border-brand-neon/25 rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4 text-center">
                 <div className="w-12 h-12 bg-brand-neon/10 text-brand-neon border border-brand-neon/20 rounded-full flex items-center justify-center mx-auto">
                    <Check size={22} strokeWidth={3} />
                 </div>
                 <h3 className="font-display font-medium text-lg text-white">Fai la Spesa</h3>
                 <p className="text-slate-300 text-xs leading-relaxed">
                    Sei sicuro di voler eliminare la spesa corrente? Gli elementi acquistati selezionati ({completedItems.length}) verranno rimossi e segnati come acquistati nella cronologia della lista.
                 </p>
                 <div className="pt-2 flex gap-3">
                    <button
                       onClick={() => setModalType(null)}
                       className="flex-1 py-3 text-xs uppercase tracking-wider rounded-xl font-bold bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 transition-colors cursor-pointer"
                       disabled={isUpdating}
                    >
                       Annulla
                    </button>
                    <button
                       onClick={async () => {
                          try {
                             setIsUpdating(true);
                             await clearCompletedItems(familyId, completedItems.map(i => i.id));
                             setModalType(null);
                          } catch (e: any) {
                             alert('Errore: ' + e.message);
                          } finally {
                             setIsUpdating(false);
                          }
                       }}
                       disabled={isUpdating}
                       className="flex-1 py-3 text-xs uppercase tracking-wider rounded-xl font-bold glow-btn text-white active:scale-95 transition-all cursor-pointer shadow-lg border-0"
                    >
                       {isUpdating ? 'PULIZIA...' : 'CONFERMA'}
                    </button>
                 </div>
              </motion.div>
           </div>
        )}

        {modalType === 'rename' && (
           <div className="fixed inset-0 bg-brand-dark/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-brand-green/10 border border-brand-neon/20 rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4">
                 <h3 className="font-display font-bold text-lg text-white">Rinomina Gruppo</h3>
                 
                 <div className="space-y-3">
                   <input 
                      type="text"
                      value={renameInput}
                      onChange={(e) => setRenameInput(e.target.value)}
                      placeholder="Nuovo nome gruppo..."
                      className="w-full bg-brand-dark border border-brand-green/30 rounded-xl px-4 py-3 text-sm font-medium focus:border-brand-neon text-white outline-none"
                   />
                   
                   <div className="pt-2 flex gap-3">
                      <button
                         onClick={() => setModalType(null)}
                         className="flex-1 py-3 text-xs uppercase tracking-wider rounded-xl font-bold bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 transition-colors"
                         disabled={isUpdating}
                      >
                         Annulla
                      </button>
                      <button
                         onClick={handleRename}
                         className="flex-1 py-3 text-xs uppercase tracking-wider rounded-xl font-bold bg-brand-neon text-brand-dark hover:brightness-110 active:scale-95 transition-all"
                         disabled={isUpdating || !renameInput.trim()}
                      >
                         {isUpdating ? 'Salvataggio...' : 'Salva'}
                      </button>
                   </div>
                 </div>
              </motion.div>
           </div>
        )}
        
        {modalType === 'password' && (
           <div className="fixed inset-0 bg-brand-dark/95 backdrop-blur-md z-50 flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-brand-green/10 border border-brand-neon/20 rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4 text-center">
                 <h3 className="font-display font-medium text-lg text-white">Password Del Gruppo</h3>
                 <p className="text-slate-400 text-xs">Usa questa password se vuoi proteggere l'ingresso di nuovi membri.</p>
                 <div className="bg-brand-dark/80 p-4 rounded-xl border border-brand-green/35 font-mono text-xl font-black text-brand-neon select-all shadow-inner tracking-widest">
                    {family?.password ? family.password : <span className="text-slate-500 italic font-sans text-xs">Libero (Nessuna Password)</span>}
                 </div>
                 <div className="pt-2">
                    <button
                       onClick={() => setModalType(null)}
                       className="w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider bg-white/5 hover:bg-white/10 text-white active:scale-95 transition-all border border-white/10 cursor-pointer"
                    >
                       Chiudi Finestra
                    </button>
                 </div>
              </motion.div>
           </div>
        )}
        
        {modalType === 'invite' && (
           <div className="fixed inset-0 bg-brand-dark/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-brand-green/10 border border-brand-neon/20 rounded-3xl p-6 w-full max-w-sm shadow-2xl space-y-4">
                 <h3 className="font-display font-bold text-lg text-white">Invia Invito</h3>
                 <p className="text-slate-300 text-xs leading-relaxed">Inserisci l'email del destinatario. Troverà la notifica non appena aprirà Listo!</p>
                 
                 <div className="space-y-4">
                   <input 
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="es. marco@gmail.com"
                      className="w-full bg-brand-dark border border-brand-green/30 rounded-xl px-4 py-3 text-sm font-medium focus:border-brand-neon text-white outline-none"
                   />
                   
                   <div className="flex gap-2 pt-2">
                      <button
                         onClick={() => { setModalType(null); setInviteEmail(''); }}
                         className="flex-1 py-3 text-xs uppercase tracking-wider rounded-xl font-bold bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 cursor-pointer"
                         disabled={isUpdating}
                      >
                         Annulla
                      </button>
                      <button
                         onClick={async () => {
                            if (!inviteEmail.trim() || !family) return;
                            try {
                               setIsUpdating(true);
                               await inviteUser(family.id, family.name, auth.currentUser?.email || '', inviteEmail.trim().toLowerCase());
                               setModalType(null);
                               setInviteEmail('');
                               alert('Invito inoltrato correttamente nella sezione notifiche!');
                            } catch (e: any) {
                               alert('Errore: ' + e.message);
                            } finally {
                               setIsUpdating(false);
                            }
                         }}
                         disabled={isUpdating || !inviteEmail.trim()}
                         className="glow-btn flex-1 py-3 flex items-center justify-center gap-1 text-xs uppercase tracking-wider text-white font-bold rounded-xl active:scale-95 cursor-pointer disabled:opacity-50"
                      >
                         {isUpdating ? <Loader2 size={14} className="animate-spin" /> : 'Invia Adesso'}
                      </button>
                   </div>
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

  const matchedCat = CATEGORIES.find(c => c.id === item.categoryId);

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.98, y: 5 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.18 }}
    >
       <div 
        className={cn(
          "p-3.5 rounded-2xl flex items-center justify-between gap-3 transition-all", 
          isCompleted 
            ? "bg-brand-green/5 border border-white/5 opacity-40 hover:opacity-60" 
            : "bg-brand-green/10 border border-brand-green/15"
        )}
       >
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            {/* Action checkbox button layout */}
            <button 
               onClick={handleToggle}
               className={cn(
                 "w-6 h-6 shrink-0 rounded-lg flex items-center justify-center border transition-all active:scale-90 cursor-pointer",
                 item.completed 
                   ? "bg-brand-neon border-brand-neon text-brand-dark" 
                   : "border-brand-neon/40 hover:border-brand-neon text-white"
               )}
            >
               {item.completed && <Check size={16} strokeWidth={4} />}
            </button>
            
            {/* Category visual badge representation */}
            {matchedCat && (
              <div 
                className={cn(
                  "p-2 rounded-xl text-brand-neon shrink-0 relative",
                  isCompleted ? "bg-white/5" : "bg-brand-neon/15"
                )}
                title={matchedCat.label}
              >
                {iconMap[matchedCat.icon] || <ShoppingBag size={18} />}
              </div>
            )}
            
            <div className="flex-1 min-w-0 cursor-pointer" onClick={handleToggle}>
               <p className={cn(
                 "text-sm font-semibold break-words whitespace-normal leading-snug transition-all text-white pr-1", 
                 item.completed && "line-through text-slate-500 font-light"
               )}>
                  {item.title}
               </p>
               {matchedCat && !isCompleted && (
                 <span className="text-[9px] text-slate-400 font-medium tracking-wide">
                   {matchedCat.label}
                 </span>
               )}
            </div>
          </div>

          <div className="shrink-0 flex items-center">
            {!item.completed ? (
               <div className="flex items-center bg-brand-dark/40 border border-brand-green/30 rounded-xl px-2.5 py-1 gap-3">
                 <button 
                  onClick={dec} 
                  className="text-slate-400 font-bold active:scale-75 transition-transform flex items-center justify-center w-5 h-5 text-sm cursor-pointer hover:text-white"
                  title={item.quantity === 1 ? "Elimina articolo" : "Riduci"}
                 >
                    {item.quantity === 1 ? <Trash2 size={12} className="text-red-400" /> : "-"}
                 </button>
                 <span className="text-xs font-mono font-bold w-4 text-center text-brand-neon min-w-4 select-none">
                   {item.quantity}
                 </span>
                 <button 
                  onClick={inc} 
                  className="text-slate-400 font-bold active:scale-75 transition-transform flex items-center justify-center w-5 h-5 text-sm cursor-pointer hover:text-white"
                  title="Aumenta"
                 >
                    +
                 </button>
               </div>
            ) : (
               <span className="text-xs font-mono font-bold text-slate-500 mr-2 bg-white/5 px-2 py-0.5 rounded-md">
                 x{item.quantity}
               </span>
            )}
          </div>
       </div>
    </motion.div>
  );
}
