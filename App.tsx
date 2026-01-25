
import React, { useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  User
} from 'firebase/auth';
import { auth, googleProvider } from './firebase';

import { Dashboard } from './pages/Dashboard';
import { Login } from './pages/Login';
import { CaseDetail } from './pages/CaseDetail';
import { Settings } from './pages/Settings';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [currentView, setCurrentView] = useState<'dashboard' | 'case' | 'settings'>('dashboard');
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'indigo';
    document.documentElement.dataset.theme = savedTheme;

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    setCurrentView('dashboard');
    setSelectedCaseId(null);
  };

  const navigateToCase = (id: string) => {
    setSelectedCaseId(id);
    setCurrentView('case');
  };

  const navigateToDashboard = () => {
    setSelectedCaseId(null);
    setCurrentView('dashboard');
  };

  const navigateToSettings = () => {
    setCurrentView('settings');
  };
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-950 text-white scanline">
        <div className="flex flex-col items-center z-10">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-6 shadow-[0_0_30px_rgba(99,102,241,0.4)]"></div>
          <p className="text-indigo-400 font-mono tracking-[0.3em] uppercase font-bold animate-pulse">Initializing Forensic Core...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-200 selection:bg-indigo-500/30 font-inter">
      <header className="glass border-b border-white/5 px-8 py-5 flex items-center justify-between sticky top-0 z-50 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center gap-5 cursor-pointer group" onClick={navigateToDashboard}>
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(79,70,229,0.4)] group-hover:scale-110 transition-transform duration-300">
            <i className="fas fa-shield-halved text-white text-2xl"></i>
          </div>
          <div>
            <h1 className="font-extrabold text-xl tracking-tighter text-white group-hover:text-indigo-400 transition-colors">F.I.E. SYSTEM</h1>
            <p className="text-[10px] text-indigo-400 tracking-[0.3em] font-mono uppercase">Online Workstation v4.0.2</p>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <button
            onClick={navigateToSettings}
            className="w-10 h-10 rounded-full bg-slate-900 border border-white/5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-all hover:scale-105"
            title="Settings"
          >
            <i className="fas fa-cog"></i>
          </button>


          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-slate-100">{user.displayName || 'Investigator'}</p>
              <div className="flex items-center justify-end gap-1.5 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                <p className="text-[9px] text-emerald-500 font-mono uppercase font-bold">Encrypted Connection</p>
              </div>
            </div>
            <div className="relative group/avatar">
              <img
                src={user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`}
                alt="Avatar"
                className="w-11 h-11 rounded-2xl border-2 border-indigo-500/20 bg-slate-800 p-0.5"
              />
              <button
                onClick={handleLogout}
                className="absolute -bottom-2 -right-2 w-6 h-6 bg-slate-900 rounded-full border border-white/10 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:border-rose-500/50 transition-all shadow-lg text-[10px]"
                title="Logout"
              >
                <i className="fas fa-power-off"></i>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-x-hidden relative">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay"></div>
        {currentView === 'dashboard' ? (
          <Dashboard
            user={user}
            onSelectCase={navigateToCase}
          />
        ) : currentView === 'settings' ? (
          <Settings
            user={user}
            onBack={navigateToDashboard}
            onLogout={handleLogout}
          />
        ) : (
          <CaseDetail
            caseId={selectedCaseId!}
            user={user}

            onBack={navigateToDashboard}
          />
        )}
      </main>

      <footer className="bg-slate-950 border-t border-white/5 py-6 px-8 flex flex-col sm:flex-row gap-4 justify-between items-center relative z-10">
        <p className="text-[10px] text-slate-600 font-mono uppercase tracking-[0.2em]">&copy; 2024 Forensic Insight Engine • Cloud Instance 0x82A</p>
        <div className="flex gap-6">
          <span className="text-[9px] text-slate-500 flex items-center gap-2"><i className="fas fa-circle text-[6px] text-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]"></i> Firebase Backend Active</span>
          <span className="text-[9px] text-slate-500 flex items-center gap-2"><i className="fas fa-circle text-[6px] text-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.4)]"></i> Gemini AI Ready</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
