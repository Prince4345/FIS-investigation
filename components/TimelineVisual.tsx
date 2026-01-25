
import React from 'react';
import { TimelineEvent, TimeConfidence } from '../types';

interface TimelineVisualProps {
  events: TimelineEvent[];
  onDeleteEvent?: (id: string) => void;
}

export const TimelineVisual: React.FC<TimelineVisualProps> = ({ events, onDeleteEvent }) => {
  const getConfidenceColor = (conf: TimeConfidence) => {
    switch (conf) {
      case TimeConfidence.EXACT: return 'bg-emerald-500';
      case TimeConfidence.ESTIMATED: return 'bg-amber-500';
      case TimeConfidence.UNKNOWN: return 'bg-rose-500';
      default: return 'bg-slate-500';
    }
  };

  const sortedEvents = [...events].sort((a, b) => a.time.localeCompare(b.time));

  return (
    <div className="relative pl-8 border-l-2 border-slate-700 space-y-8">
      {sortedEvents.length === 0 ? (
        <p className="text-slate-500 italic">No events recorded yet.</p>
      ) : (
        sortedEvents.map((event) => (
          <div key={event.id} id={event.id} className="relative transition-all duration-500 rounded-xl group/event">
            <div className={`absolute -left-[41px] top-1 w-4 h-4 rounded-full border-4 border-slate-900 ${getConfidenceColor(event.timeConfidence)}`}></div>

            <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700 shadow-sm group-hover/event:border-indigo-500/30 transition-all relative overflow-hidden">
              <button
                onClick={() => onDeleteEvent?.(event.id)}
                className="absolute top-4 right-4 w-8 h-8 rounded-xl bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white flex items-center justify-center transition-all border border-rose-500/20 opacity-0 group-hover/event:opacity-100 z-10"
                title="Purge Event"
              >
                <i className="fas fa-trash-alt text-[10px]"></i>
              </button>

              <div className="flex justify-between items-start mb-2 pr-10">
                <h4 className="font-bold text-indigo-400 text-lg">{event.title}</h4>
                <span className="text-xs font-mono text-slate-500 bg-slate-900 px-3 py-1 rounded-lg border border-white/5">{event.time}</span>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed font-light">{event.description}</p>

              <div className="mt-4 flex items-center gap-3">
                <span className="text-[10px] uppercase tracking-widest text-slate-500 font-black">Confidence</span>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[9px] uppercase font-black px-2 py-0.5 rounded-md border ${event.timeConfidence === TimeConfidence.EXACT ? 'text-emerald-400 border-emerald-400/20 bg-emerald-400/5' :
                      event.timeConfidence === TimeConfidence.ESTIMATED ? 'text-amber-400 border-amber-400/20 bg-amber-400/5' :
                        'text-rose-400 border-rose-400/20 bg-rose-400/5'
                    }`}>
                    {event.timeConfidence}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};
