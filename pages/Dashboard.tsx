import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { CrimeCase, CaseStatus } from '../types';

interface DashboardProps {
  user: User;
  onSelectCase: (id: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ user, onSelectCase }) => {
  const [cases, setCases] = useState<CrimeCase[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCase, setNewCase] = useState({ title: '', summary: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'cases'),
      where('createdBy', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as CrimeCase[];
      // Client-side sort by createdAt desc
      data.sort((a, b) => b.createdAt - a.createdAt);
      setCases(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user.uid]);

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCase.title.trim()) return;

    try {
      await addDoc(collection(db, 'cases'), {
        title: newCase.title.toUpperCase(),
        summary: newCase.summary,
        status: CaseStatus.OPEN,
        createdBy: user.uid,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        evidenceCount: 0,
        witnessCount: 0
      });
      setNewCase({ title: '', summary: '' });
      setIsModalOpen(false);
    } catch (err) {
      console.error("Error creating case:", err);
      alert("Failed to create case file. Connectivity issue?");
    }
  };

  const handleDeleteCase = async (id: string) => {
    if (!window.confirm("CRITICAL: This will permanently purge the dossier and all associated forensic data from the server. Proceed?")) return;
    try {
      await deleteDoc(doc(db, 'cases', id));
    } catch (err) {
      console.error("Error deleting case:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full min-h-[500px]">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="p-10 max-w-7xl mx-auto scanline relative min-h-full">
      <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-16">
        <div>
          <h2 className="text-5xl font-extrabold text-white tracking-tighter mb-4">Active Investigations</h2>
          <div className="flex gap-4">
            <div className="glass px-4 py-2 rounded-xl flex items-center gap-3">
              <span className="text-indigo-400 font-mono text-xl font-bold">{cases.length}</span>
              <span className="text-xs text-slate-500 uppercase tracking-widest font-bold">Total Cases</span>
            </div>
            <div className="glass px-4 py-2 rounded-xl flex items-center gap-3">
              <span className="text-emerald-400 font-mono text-xl font-bold">
                {cases.filter(c => c.status === CaseStatus.OPEN).length}
              </span>
              <span className="text-xs text-slate-500 uppercase tracking-widest font-bold">Open Active</span>
            </div>
          </div>
        </div>
        <div className="flex gap-4">

          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-3 shadow-[0_0_30px_rgba(79,70,229,0.3)] transition-all transform hover:-translate-y-1 active:scale-95"
          >
            <i className="fas fa-folder-plus text-xl"></i>
            Register New Dossier
          </button>
        </div>
      </div>

      {cases.length === 0 ? (
        <div className="glass rounded-[3rem] p-24 text-center border-dashed border-2 border-slate-800 animate-fade-in">
          <div className="w-24 h-24 bg-slate-900 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner">
            <i className="fas fa-briefcase text-slate-700 text-4xl"></i>
          </div>
          <h3 className="text-3xl font-bold text-slate-200 mb-4">No Investigations Registered</h3>
          <p className="text-slate-500 max-w-sm mx-auto mb-10 text-lg">Your forensic workstation is currently idle. Initialize a new dossier to begin analysis.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => setIsModalOpen(true)}
              className="text-indigo-400 font-bold hover:text-white transition-colors flex items-center justify-center gap-2 uppercase tracking-widest text-sm bg-indigo-500/10 px-6 py-3 rounded-xl border border-indigo-500/20"
            >
              <i className="fas fa-plus"></i> Create First Case File
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-fade-in">
          {cases.map((c) => (
            <div
              key={c.id}
              onClick={() => onSelectCase(c.id)}
              className="glass rounded-[2.5rem] p-8 cursor-pointer glow-border transition-all group overflow-hidden relative border border-white/5 hover:border-white/10 hover:translate-y-[-4px]"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
                <i className="fas fa-fingerprint text-8xl -mr-10 -mt-10"></i>
              </div>

              <div className="flex justify-between items-start mb-8 relative z-10">
                <div className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border ${c.status === CaseStatus.OPEN ? 'text-emerald-400 border-emerald-400/20 bg-emerald-400/5' :
                  c.status === CaseStatus.IN_PROGRESS ? 'text-indigo-400 border-indigo-400/20 bg-indigo-400/5' :
                    c.status === CaseStatus.ON_HOLD ? 'text-amber-400 border-amber-400/20 bg-amber-400/5' :
                      c.status === CaseStatus.RESOLVED ? 'text-slate-400 border-slate-400/20 bg-slate-400/5' :
                        'text-rose-400 border-rose-400/20 bg-rose-400/5'
                  }`}>
                  {c.status}
                </div>
                <div className="flex items-center gap-3">
                  <div className="font-mono text-xs text-slate-500">REF_{c.id.slice(0, 6).toUpperCase()}</div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteCase(c.id);
                    }}
                    className="w-10 h-10 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white flex items-center justify-center transition-all border border-rose-500/20 active:scale-90 z-20"
                    title="Purge Dossier"
                  >
                    <i className="fas fa-trash-alt text-xs"></i>
                  </button>
                </div>
              </div>

              <h3 className="text-2xl font-bold mb-4 text-white group-hover:text-indigo-400 transition-colors leading-tight relative z-10">{c.title}</h3>
              <p className="text-slate-400 text-sm line-clamp-3 mb-10 leading-relaxed font-light relative z-10">
                {c.summary || 'No operational summary provided. Manual entry required.'}
              </p>

              <div className="grid grid-cols-2 gap-4 mt-auto relative z-10">
                <div className="bg-slate-950/50 p-3 rounded-2xl border border-white/5">
                  <span className="block text-[10px] text-slate-500 uppercase font-bold mb-1">Evidence logs</span>
                  <span className="text-lg font-bold text-white">{c.evidenceCount || 0}</span>
                </div>
                <div className="bg-slate-950/50 p-3 rounded-2xl border border-white/5">
                  <span className="block text-[10px] text-slate-500 uppercase font-bold mb-1">Statements</span>
                  <span className="text-lg font-bold text-white">{c.witnessCount || 0}</span>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between relative z-10">
                <span className="text-xs text-indigo-400 font-mono">AUTHORIZED ACCESS</span>
                <i className="fas fa-arrow-right text-slate-700 group-hover:text-indigo-500 transition-colors"></i>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Case Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-md">
          <div className="glass w-full max-w-xl rounded-[3rem] p-12 border-indigo-500/20 shadow-[0_0_100px_rgba(79,70,229,0.2)] animate-fade-in">
            <div className="flex justify-between items-center mb-10">
              <div>
                <h3 className="text-3xl font-extrabold text-white tracking-tighter">New Case File</h3>
                <p className="text-xs text-indigo-400 font-mono uppercase tracking-widest mt-1">Registering Forensic Artifacts</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-slate-500 hover:text-white transition-colors">
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>

            <form onSubmit={handleCreateCase} className="space-y-8">
              <div>
                <label className="block text-xs text-slate-500 uppercase font-black tracking-widest mb-3 ml-2">Operation Code / Title</label>
                <input
                  type="text"
                  placeholder="e.g. PROJECT RED WOLF"
                  value={newCase.title}
                  onChange={(e) => setNewCase({ ...newCase, title: e.target.value.toUpperCase() })}
                  className="w-full bg-slate-950 border border-white/10 rounded-2xl px-6 py-4 text-white font-bold placeholder:text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  required
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 uppercase font-black tracking-widest mb-3 ml-2">Primary Incident Context</label>
                <textarea
                  placeholder="Summarize the core investigative parameters..."
                  rows={4}
                  value={newCase.summary}
                  onChange={(e) => setNewCase({ ...newCase, summary: e.target.value })}
                  className="w-full bg-slate-950 border border-white/10 rounded-2xl px-6 py-4 text-white font-light placeholder:text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-lg py-5 rounded-2xl shadow-xl transition-all active:scale-95"
              >
                Initialize Dossier
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Quick Log Modal */}

    </div>
  );
};
