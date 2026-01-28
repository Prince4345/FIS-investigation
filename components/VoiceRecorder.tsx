import React, { useState, useEffect, useRef } from 'react';

interface VoiceRecorderProps {
    onTranscriptionComplete: (text: string) => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onTranscriptionComplete }) => {
    const [status, setStatus] = useState<'idle' | 'recording' | 'paused'>('idle');
    const [transcript, setTranscript] = useState('');
    const [error, setError] = useState<string | null>(null);
    const recognitionRef = useRef<any>(null);
    const ignoreEndEvent = useRef(false);

    // Initialize on mount
    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

        if (SpeechRecognition) {
            const recog = new SpeechRecognition();
            recog.continuous = true;
            recog.interimResults = true;
            recog.lang = 'en-US';

            recog.onstart = () => {
                setStatus('recording');
                setError(null);
            };

            recog.onend = () => {
                if (ignoreEndEvent.current) {
                    ignoreEndEvent.current = false;
                    return;
                }
                setStatus('idle');
            };

            recog.onerror = (event: any) => {
                if (event.error === 'not-allowed') {
                    setError("Mic Access Denied");
                    setStatus('idle');
                } else if (event.error === 'no-speech') {
                    // Ignore
                } else {
                    console.error("Rec Error:", event.error);
                    setError("Error");
                    setStatus('idle');
                }
            };

            recog.onresult = (event: any) => {
                let liveText = '';
                for (let i = 0; i < event.results.length; ++i) {
                    liveText += event.results[i][0].transcript;
                }
                // Append to existing if we paused/resumed? 
                // Actually, the 'liveText' from a continuous session usually accumulates if we don't stop.
                // If we stop (pause), the session ends.
                // So when we resume, we need to append NEW text to OLD text.
                // But simplified: We'll just let the parent handle the accumulation if we wanted, 
                // BUT `SpeechRecognition` resets transcript on new start.
                // So we need to manage full transcript here.

                // For this component, let's just pass the live stream. 
                // To support true Pause/Resume where text appends, we'd need to store `previousTranscript`.
                // Let's implement that for a good UX.

                // However, the parent `setNewWitness` simply overwrites `statement`.
                // So we should pass `previous + live`.
            };

            // Re-implementing onresult to handle "Pause" logic properly (appending)
            recog.onresult = (event: any) => {
                let interim = '';
                let final = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) {
                        final += event.results[i][0].transcript;
                    } else {
                        interim += event.results[i][0].transcript;
                    }
                }

                // We don't easily get the "full session" if we stop/start.
                // So we will rely on the Parent's state for the "Saved" text,
                // and we just emit the *new* segments.
                // Wait, if we use `onTranscriptionComplete`, we usually expect the full text.
                // Updating the parent's state constantly is fine. 
                // If we Pause, we stop. When we Resume, we start a new session.
                // The new session has empty transcript.
                // If we send just the new text, the parent (which does `prev => ... statement: text`) 
                // might overwrite the old text if we are not careful.
                // Actually, in CaseDetail: `onTranscriptionComplete={(text) => setNewWitness(prev => ({ ...prev, statement: text }))}`
                // This overwrites.
                // So we must accumulate locally.
            };

            recognitionRef.current = recog;
        } else {
            setError("Not Supported");
        }
    }, [onTranscriptionComplete]);

    // Better strategy for Pause/Resume with overwrite-parent behavior:
    // We maintain `accumulatedText` state.
    const [accumulatedText, setAccumulatedText] = useState('');

    useEffect(() => {
        if (!recognitionRef.current) return;

        recognitionRef.current.onresult = (event: any) => {
            let sessionText = '';
            for (let i = 0; i < event.results.length; ++i) {
                sessionText += event.results[i][0].transcript;
            }
            const fullText = accumulatedText + (accumulatedText && sessionText ? ' ' : '') + sessionText;
            onTranscriptionComplete(fullText);
        };
    }, [accumulatedText, onTranscriptionComplete]);


    const handleStart = () => {
        if (!recognitionRef.current) return;
        setAccumulatedText(''); // Fresh start
        onTranscriptionComplete('');
        recognitionRef.current.start();
    };

    const handleResume = () => {
        if (!recognitionRef.current) return;
        // Don't clear accumulated
        recognitionRef.current.start();
    };

    const handlePause = () => {
        if (!recognitionRef.current) return;
        ignoreEndEvent.current = true; // Don't set to idle via callback, we manage state
        recognitionRef.current.stop();
        setStatus('paused');

        // When we stop, we should bake the current session into accumulated
        // But onresult fires before stop? 
        // Actually, simpler: capture the last emitted fullText as the new accumulated base.
        // We can do this by using the `onTranscriptionComplete` callback? No.
        // Let's rely on the fact that `onresult` runs layout.

        // Wait, if we stop, `onresult` might not fire one last time with "final".
        // Let's safe-guard:
        setAccumulatedText(prev => prev); // (This is a no-op, just logic placeholder)
        // Actually, we need to know what the *current* session text was to freeze it.
        // This is getting complex for a simple "Pause".
        // Alternative: Just let "Pause" be "Stop" visually, but "Resume" appends.
    };

    // Simpler "Append Mode" Implementation
    // We will just read the current text from the parent? No, props call back.
    // We'll use a ref to track current session text.

    const stopRecording = () => {
        if (!recognitionRef.current) return;
        recognitionRef.current.stop();
        setStatus('idle');
        // Finalize?
        setAccumulatedText(''); // Reset for next time (or keep? usually stop means done)
    };

    // ----------------------------------------------------------------------------------
    // Simplified Logic for Robustness
    // ----------------------------------------------------------------------------------
    // We will use a wrapper around the start/stop.

    const startSession = () => {
        if (!recognitionRef.current) return;
        setAccumulatedText('');
        setError(null);
        try { recognitionRef.current.start(); } catch (e) { }
    };

    const pauseSession = () => {
        // Stop the mic, but keep the state as 'paused'
        // We need to save the text we have so far.
        // The `accumulatedText` implies "text before this session".
        // We need to update `accumulatedText` with the total text.
        // But we don't have access to the "current session text" easily inside this function scope 
        // without another state.

        // HACK: We will trigger a soft stop.
        if (!recognitionRef.current) return;
        recognitionRef.current.stop();
        setStatus('paused');
    };

    const resumeSession = () => {
        if (!recognitionRef.current) return;
        try { recognitionRef.current.start(); } catch (e) { }
    };

    const stopSession = () => {
        if (!recognitionRef.current) return;
        recognitionRef.current.stop();
        setStatus('idle');
        setAccumulatedText('');
    };

    // We need to hook `onresult` to update `accumulatedText` when we pause/stop?
    // Actually, let's just use `onend` to "commit" the session text to `accumulated`.

    useEffect(() => {
        if (!recognitionRef.current) return;

        // tracked mutable var for current session
        let currentSessionText = '';

        recognitionRef.current.onresult = (event: any) => {
            currentSessionText = '';
            for (let i = 0; i < event.results.length; ++i) {
                currentSessionText += event.results[i][0].transcript;
            }
            const full = accumulatedText + (accumulatedText && currentSessionText ? ' ' : '') + currentSessionText;
            onTranscriptionComplete(full);
        };

        recognitionRef.current.onend = () => {
            if (status === 'paused') {
                // If we paused, commit the text
                setAccumulatedText(prev => prev + (prev && currentSessionText ? ' ' : '') + currentSessionText);
            } else if (status === 'recording') {
                // unexpected stop (silence/error) -> treat as paused or idle?
                // Let's treat as idle/done.
                setStatus('idle');
                setAccumulatedText('');
            }
            // If explicit stop (idle), we already cleared.
        };

    }, [accumulatedText, status, onTranscriptionComplete]);


    if (error === "Not Supported") return null;

    return (
        <div className="w-full space-y-3">
            <div className={`w-full relative group overflow-hidden rounded-2xl p-4 transition-all duration-300 border-2 select-none ${status === 'recording'
                    ? 'bg-emerald-500/10 border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                    : status === 'paused'
                        ? 'bg-amber-500/10 border-amber-500 text-amber-500'
                        : 'bg-slate-900 border-white/10 text-slate-400'
                }`}>

                <div className="flex items-center justify-between relative z-10 px-2">
                    {/* Status Info */}
                    <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${status === 'recording' ? 'bg-emerald-500 animate-pulse text-white' :
                                status === 'paused' ? 'bg-amber-500 text-white' :
                                    'bg-slate-800 text-slate-500'
                            }`}>
                            <i className={`fas ${status === 'recording' ? 'fa-microphone' : status === 'paused' ? 'fa-pause' : 'fa-microphone-alt'} text-xs`}></i>
                        </div>

                        <div>
                            <div className={`text-xs font-black uppercase tracking-widest ${status === 'recording' ? 'text-emerald-400' :
                                    status === 'paused' ? 'text-amber-400' : 'text-slate-300'
                                }`}>
                                {status === 'recording' ? 'Receiving Audio...' : status === 'paused' ? 'Session Paused' : error || 'Ready to Record'}
                            </div>
                        </div>
                    </div>

                    {/* Waveform */}
                    <div className="flex items-center gap-[3px] h-8">
                        {[...Array(12)].map((_, i) => (
                            <div
                                key={i}
                                className={`w-1 rounded-full bg-current duration-300 transition-all ${status === 'recording' ? 'animate-whatsapp-wave bg-emerald-500' :
                                        status === 'paused' ? 'bg-amber-500 h-2' :
                                            'bg-slate-700 h-1'
                                    }`}
                                style={{
                                    animationDelay: `${i * 0.1}s`,
                                    height: status === 'paused' ? '30%' : undefined
                                }}
                            />
                        ))}
                    </div>
                </div>

                {/* Controls Bar */}
                <div className="mt-4 flex items-center gap-2 pt-4 border-t border-white/5">
                    {status === 'idle' ? (
                        <button
                            type="button"
                            onClick={startSession}
                            className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all active:scale-95"
                        >
                            Start Recording
                        </button>
                    ) : (
                        <>
                            {status === 'recording' ? (
                                <button
                                    type="button"
                                    onClick={pauseSession}
                                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-amber-400 border border-amber-500/30 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all active:scale-95"
                                >
                                    Pause
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={resumeSession}
                                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all active:scale-95"
                                >
                                    Resume
                                </button>
                            )}

                            <button
                                type="button"
                                onClick={stopSession}
                                className="flex-1 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/30 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all active:scale-95"
                            >
                                Stop
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
