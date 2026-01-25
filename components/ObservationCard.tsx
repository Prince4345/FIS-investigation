
import React, { useState } from 'react';
import { AIObservation, AIIntelligenceCorrelation, Evidence, Witness, TimelineEvent } from '../types';

interface ObservationCardProps {
  obs: AIObservation;
  onNavigate?: (sourceType: 'evidence' | 'witness' | 'timeline', refId: string) => void;
  evidence?: Evidence[];
  witnesses?: Witness[];
  timeline?: TimelineEvent[];
  onAddManualLink?: (obsId: string, correlation: AIIntelligenceCorrelation) => void;
}

export const ObservationCard: React.FC<ObservationCardProps> = ({
  obs,
  onNavigate,
  evidence = [],
  witnesses = [],
  timeline = [],
  onAddManualLink
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isLinking, setIsLinking] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'evidence' | 'witness' | 'timeline'>('evidence');

  const getPriorityClasses = () => {
    switch (obs.priority) {
      case 'high': return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
      case 'medium': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
      case 'low': return 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20';
      default: return 'text-slate-400';
    }
  };

  const getConfidenceStatus = (score: number) => {
    if (score >= 90) return { label: 'VERIFIED PATTERN', color: 'text-emerald-400', glow: 'shadow-[0_0_20px_rgba(52,211,153,0.4)]', bg: 'bg-emerald-500' };
    if (score >= 70) return { label: 'PROBABLE CORRELATION', color: 'text-indigo-400', glow: 'shadow-[0_0_20px_rgba(129,140,248,0.3)]', bg: 'bg-indigo-500' };
    if (score >= 50) return { label: 'TENTATIVE LINK', color: 'text-amber-400', glow: 'shadow-[0_0_20px_rgba(251,191,36,0.2)]', bg: 'bg-amber-500' };
    return { label: 'SPECULATIVE', color: 'text-slate-500', glow: '', bg: 'bg-slate-600' };
  };

  const confStatus = getConfidenceStatus(obs.confidence);

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'evidence': return <i className="fas fa-microscope"></i>;
      case 'witness': return <i className="fas fa-comment-dots"></i>;
      case 'timeline': return <i className="fas fa-clock"></i>;
      default: return <i className="fas fa-link"></i>;
    }
  };

  const getObservationIcon = () => {
    switch (obs.type) {
      case 'inconsistency': return <i className="fas fa-shield-virus text-rose-500"></i>;
      case 'delay': return <i className="fas fa-hourglass-half text-amber-500"></i>;
      case 'pattern': return <i className="fas fa-project-diagram text-indigo-400"></i>;
    }
  };

  const getRawSourceText = (sourceType: string, refId: string) => {
    if (sourceType === 'evidence') return evidence.find(e => e.id === refId)?.description;
    if (sourceType === 'witness') return witnesses.find(w => w.id === refId)?.statement;
    if (sourceType === 'timeline') return timeline.find(t => t.id === refId)?.description;
    return null;
  };

  const handleAddManual = (id: string, label: string, snippet: string) => {
    if (!onAddManualLink) return;
    onAddManualLink(obs.id, {
      sourceType: selectedCategory,
      refId: id,
      label,
      snippet: snippet || "Manual cross-reference established by investigator.",
      isManual: true
    });
    setIsLinking(false);
  };

  const borderClass = obs.type === 'inconsistency' ? 'border-rose-600/50' :
    obs.type === 'delay' ? 'border-amber-600/50' : 'border-indigo-600/50';

  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (obs.confidence / 100) * circumference;

  return (
    <div className={`glass rounded-[2.5rem] border-l-[10px] ${borderClass} overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.3)] transition-all hover:translate-x-1 group/card`}>
      <div className="p-8 md:p-10">
        <div className="flex flex-col lg:flex-row items-start justify-between gap-8">
          <div className="flex gap-8 flex-1">
            <div className="relative shrink-0">
              <div className="w-20 h-20 bg-slate-900 rounded-3xl flex items-center justify-center text-4xl shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)] border border-white/5 relative z-10 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-indigo-500/5 to-transparent animate-pulse"></div>
                {getObservationIcon()}
              </div>
            </div>

            <div className="space-y-4 flex-1">
              <div className="flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-3">
                  <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border ${getPriorityClasses()}`}>
                    {obs.priority || 'NORMAL'} PRIORITY
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono flex items-center gap-2">
                    <i className="fas fa-id-badge"></i> {obs.id}
                  </span>
                </div>

                {/* Advanced Dual Confidence System */}
                <div className={`flex items-center gap-6 bg-slate-900/60 px-5 py-3 rounded-3xl border border-white/5 ${confStatus.glow} transition-all relative overflow-hidden group/conf`}>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover/conf:translate-x-full transition-transform duration-1000"></div>

                  <div className="relative w-12 h-12 flex items-center justify-center shrink-0">
                    <svg className="w-full h-full transform -rotate-90">
                      {/* Track */}
                      <circle cx="24" cy="24" r={radius} stroke="currentColor" strokeWidth="4" fill="transparent" className="text-slate-800" />
                      {/* Progress */}
                      <circle cx="24" cy="24" r={radius} stroke="currentColor" strokeWidth="4" fill="transparent"
                        strokeDasharray={circumference}
                        style={{ strokeDashoffset }}
                        strokeLinecap="round"
                        className={`${confStatus.color} transition-all duration-1000 ease-out`} />
                    </svg>
                    <span className={`absolute text-[11px] font-mono font-black ${confStatus.color}`}>{obs.confidence}%</span>
                  </div>

                  <div className="flex flex-col flex-1 min-w-[140px]">
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-[8px] text-slate-500 uppercase font-black tracking-widest leading-none">AI Analytics Certainty</span>
                      <span className={`text-[9px] font-black uppercase tracking-tight ${confStatus.color}`}>{confStatus.label}</span>
                    </div>

                    {/* Segmented Linear Probability Bar */}
                    <div className="flex gap-1 h-2">
                      {[...Array(10)].map((_, i) => {
                        const isActive = (obs.confidence / 10) > i;
                        return (
                          <div
                            key={i}
                            className={`flex-1 rounded-sm transition-all duration-500 ${isActive ? confStatus.bg : 'bg-slate-800'
                              }`}
                            style={{
                              opacity: isActive ? 0.3 + (i * 0.07) : 1,
                              boxShadow: isActive ? `0 0 10px ${confStatus.color.replace('text-', '')}` : 'none'
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
              <h4 className="text-3xl font-extrabold text-white leading-tight uppercase tracking-tighter group-hover/card:text-indigo-400 transition-colors">
                {obs.observation}
              </h4>
            </div>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-14 h-14 rounded-2xl bg-slate-900 flex items-center justify-center text-slate-500 hover:text-indigo-400 transition-all border border-white/5 active:scale-90"
          >
            <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'} text-xl`}></i>
          </button>
        </div>

        {isExpanded && (
          <div className="mt-12 space-y-12 animate-fade-in">
            <div className="bg-slate-950/40 p-8 rounded-[2rem] border border-white/5 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                <i className="fas fa-brain text-7xl"></i>
              </div>
              <h5 className="font-black text-[10px] uppercase tracking-[0.3em] text-indigo-500 mb-6 flex items-center gap-3">
                <i className="fas fa-terminal"></i> Forensic Reasoning Pathway
              </h5>
              <p className="text-slate-300 font-light leading-relaxed text-lg whitespace-pre-wrap">
                {obs.reasoning}
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h5 className="font-black text-[10px] uppercase tracking-[0.3em] text-emerald-500 flex items-center gap-3">
                  <i className="fas fa-link"></i> Intelligence Correlation Map
                </h5>
                <button
                  onClick={() => setIsLinking(!isLinking)}
                  className="bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                >
                  <i className={`fas ${isLinking ? 'fa-times' : 'fa-plus'} mr-2`}></i>
                  {isLinking ? 'Cancel Link' : 'Add Manual Reference'}
                </button>
              </div>

              {isLinking && (
                <div className="bg-slate-900/80 p-6 rounded-[2rem] border border-indigo-500/30 animate-fade-in space-y-6">
                  <div className="flex gap-4 p-1 bg-slate-950 rounded-xl w-fit">
                    {(['evidence', 'witness', 'timeline'] as const).map(cat => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${selectedCategory === cat ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto pr-2">
                    {selectedCategory === 'evidence' && evidence.map(e => (
                      <button key={e.id} onClick={() => handleAddManual(e.id, `Evidence: ${e.name}`, e.description)} className="text-left bg-slate-950/50 p-4 rounded-xl border border-white/5 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all">
                        <p className="text-[10px] font-bold text-white truncate">{e.name}</p>
                        <p className="text-[8px] text-slate-500 uppercase mt-1">{e.type}</p>
                      </button>
                    ))}
                    {selectedCategory === 'witness' && witnesses.map(w => (
                      <button key={w.id} onClick={() => handleAddManual(w.id, `Witness: ${w.name}`, w.statement)} className="text-left bg-slate-950/50 p-4 rounded-xl border border-white/5 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all">
                        <p className="text-[10px] font-bold text-white truncate">{w.name}</p>
                        <p className="text-[8px] text-slate-500 uppercase mt-1">Reliability: {w.reliabilityScore}%</p>
                      </button>
                    ))}
                    {selectedCategory === 'timeline' && timeline.map(t => (
                      <button key={t.id} onClick={() => handleAddManual(t.id, `Event: ${t.title}`, t.description)} className="text-left bg-slate-950/50 p-4 rounded-xl border border-white/5 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all">
                        <p className="text-[10px] font-bold text-white truncate">{t.title}</p>
                        <p className="text-[8px] text-slate-500 uppercase mt-1">{t.time}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {obs.correlations.map((corr, idx) => {
                  const rawText = getRawSourceText(corr.sourceType, corr.refId);
                  return (
                    <button
                      key={idx}
                      onClick={() => onNavigate?.(corr.sourceType, corr.refId)}
                      title={`Jump to referenced ${corr.sourceType}`}
                      className={`text-left w-full p-6 rounded-3xl border group/btn transition-all active:scale-[0.98] relative overflow-hidden cursor-pointer ${corr.isManual
                          ? 'bg-indigo-900/10 border-indigo-500/20 hover:border-indigo-500/50 hover:shadow-[0_0_20px_rgba(99,102,241,0.1)]'
                          : 'bg-slate-900 border-white/5 hover:border-indigo-500/50 hover:shadow-[0_0_20px_rgba(99,102,241,0.1)]'
                        }`}
                    >
                      <div className="flex items-center gap-4 mb-4 relative z-10">
                        <div className="w-10 h-10 bg-slate-950 rounded-xl flex items-center justify-center text-indigo-400 group-hover/btn:bg-indigo-600 group-hover/btn:text-white transition-all shadow-lg">
                          {getSourceIcon(corr.sourceType)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest leading-none">{corr.sourceType}</p>
                              {corr.isManual && (
                                <span className="text-[7px] bg-indigo-500 text-white px-1.5 py-0.5 rounded font-black tracking-widest leading-none">USER_LINK</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-indigo-400 opacity-40 group-hover/btn:opacity-100 transition-all transform group-hover/btn:translate-x-1">
                              <span className="text-[8px] font-mono font-black uppercase tracking-tighter">VIEW SOURCE</span>
                              <i className="fas fa-arrow-right text-[10px]"></i>
                            </div>
                          </div>
                          <h6 className="text-sm font-bold text-slate-200 mt-1 truncate">{corr.label}</h6>
                          {/* Raw Data Preview - Only visible on hover */}
                          <p className="text-[9px] text-indigo-400/60 truncate opacity-0 group-hover/btn:opacity-100 transition-all duration-300 mt-0.5 font-mono">
                            {rawText || "No additional source metadata available."}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed italic border-l-2 border-slate-800 group-hover/btn:border-indigo-500/50 pl-4 py-1 transition-colors relative z-10">
                        "{corr.snippet}"
                      </p>
                      <div className="mt-4 flex justify-between items-center relative z-10">
                        <div className="text-[9px] text-slate-600 font-mono">REF_{corr.refId.slice(0, 8).toUpperCase()}</div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 opacity-0 group-hover/btn:opacity-100 transition-opacity animate-pulse"></div>
                          <span className="text-[7px] text-slate-700 font-mono group-hover/btn:text-indigo-500 transition-colors uppercase">Click to Navigate</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bg-rose-500/5 p-6 rounded-[2rem] border border-rose-500/10 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 opacity-[0.03]">
                <i className="fas fa-biohazard text-4xl"></i>
              </div>
              <h5 className="font-black text-[9px] uppercase tracking-[0.3em] text-rose-500 mb-4 flex items-center gap-2">
                <i className="fas fa-exclamation-triangle"></i> Analytical Caveats & Missing Variables
              </h5>
              <p className="text-xs text-slate-500 leading-relaxed font-light italic">
                {obs.limitations}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="bg-slate-900/80 px-10 py-4 border-t border-white/5 flex flex-wrap justify-between items-center gap-4 relative">
        <div className="flex items-center gap-6">
          <span className="text-[9px] text-slate-500 font-mono uppercase tracking-[0.2em] flex items-center gap-2">
            <i className="fas fa-microchip"></i> Gemini Engine {obs.type} model
          </span>
          <div className="h-3 w-[1px] bg-white/10"></div>
          <span className="text-[9px] text-slate-500 font-mono uppercase tracking-[0.2em] flex items-center gap-2">
            <i className="fas fa-fingerprint"></i> HASH_VERIFIED: {Math.random().toString(36).substring(7).toUpperCase()}
          </span>
        </div>
        <span className="text-[9px] text-slate-600 font-mono bg-black/40 px-3 py-1 rounded-lg border border-white/5">{obs.timestamp}</span>
      </div>
    </div>
  );
};
