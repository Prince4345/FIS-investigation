import React, { useState, useEffect, useRef } from 'react';
import { User, signOut, updateProfile } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, storage } from '../firebase';

interface SettingsProps {
    user: User | null;
    onBack: () => void;
    onLogout: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ user, onBack, onLogout }) => {
    const [displayName, setDisplayName] = useState(user?.displayName || '');
    const [isEditing, setIsEditing] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'indigo');
    const [reducedMotion, setReducedMotion] = useState(localStorage.getItem('reducedMotion') === 'true');

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        localStorage.setItem('theme', theme);
        document.documentElement.dataset.theme = theme;
    }, [theme]);

    useEffect(() => {
        localStorage.setItem('reducedMotion', String(reducedMotion));
        if (reducedMotion) {
            document.documentElement.classList.add('reduce-motion');
        } else {
            document.documentElement.classList.remove('reduce-motion');
        }
    }, [reducedMotion]);

    const handleSaveProfile = async () => {
        if (!auth.currentUser) return;
        try {
            await updateProfile(auth.currentUser, {
                displayName: displayName
            });
            setIsEditing(false);
        } catch (error) {
            console.error("Error updating profile:", error);
            alert("Failed to update profile name.");
        }
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0] && auth.currentUser) {
            const file = e.target.files[0];
            setUploading(true);
            try {
                const storageRef = ref(storage, `profile_photos/${auth.currentUser.uid}/${Date.now()}`);
                await uploadBytes(storageRef, file);
                const photoURL = await getDownloadURL(storageRef);

                await updateProfile(auth.currentUser, { photoURL });
                // Force refresh or let React state update via Auth listener in App
                setUploading(false);
                alert("Profile photo updated!");
            } catch (error) {
                console.error("Error uploading photo:", error);
                setUploading(false);
                alert("Failed to upload photo.");
            }
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-8 animate-fade-in-up">
            {/* Header */}
            <div className="flex items-center gap-4 mb-10">
                <button
                    onClick={onBack}
                    className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
                >
                    <i className="fas fa-arrow-left"></i>
                </button>
                <h1 className="text-3xl font-black text-white tracking-tighter">SYSTEM CONFIGURATION</h1>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* User Profile Card */}
                <div className="md:col-span-1">
                    <div className="glass rounded-3xl p-6 flex flex-col items-center text-center border-t border-white/10 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                        <div className="relative mb-4 group/img cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                            <div className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.3)] relative">
                                {uploading ? (
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                        <div className="w-6 h-6 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
                                    </div>
                                ) : null}
                                {user?.photoURL ? (
                                    <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-slate-800 flex items-center justify-center text-3xl text-indigo-400">
                                        <i className="fas fa-user-shield"></i>
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity">
                                    <i className="fas fa-camera text-white"></i>
                                </div>
                            </div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleFileChange}
                            />
                            <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-slate-900 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-900">
                                ONLINE
                            </div>
                        </div>

                        {isEditing ? (
                            <div className="flex items-center gap-2 mb-2 w-full">
                                <input
                                    type="text"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white w-full focus:outline-none focus:border-indigo-500"
                                />
                                <button onClick={handleSaveProfile} className="text-emerald-500 hover:text-emerald-400"><i className="fas fa-check"></i></button>
                                <button onClick={() => setIsEditing(false)} className="text-red-500 hover:text-red-400"><i className="fas fa-times"></i></button>
                            </div>
                        ) : (
                            <h2 className="text-xl font-bold text-white mb-1 flex items-center gap-2 justify-center">
                                {user?.displayName || 'Unknown Agent'}
                                <button onClick={() => setIsEditing(true)} className="text-slate-500 hover:text-indigo-400 text-xs"><i className="fas fa-pen"></i></button>
                            </h2>
                        )}

                        <p className="text-xs text-slate-400 font-mono bg-slate-950/50 px-3 py-1 rounded-full mb-6">
                            {user?.email || 'No credentials'}
                        </p>

                        <button
                            onClick={onLogout}
                            className="w-full py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 text-xs font-bold uppercase tracking-widest border border-red-500/20 transition-all flex items-center justify-center gap-2 group/btn"
                        >
                            <i className="fas fa-power-off group-hover/btn:animate-pulse"></i>
                            Terminating Session
                        </button>
                    </div>
                </div>

                {/* Preferences */}
                <div className="md:col-span-2 space-y-6">

                    {/* Interface Settings */}
                    <div className="glass rounded-3xl p-8 border-l-4 border-l-indigo-500">
                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
                            <span className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400"><i className="fas fa-swatchbook"></i></span>
                            INTERFACE PREFERENCES
                        </h3>

                        <div className="space-y-6">
                            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/50 border border-white/5">
                                <div>
                                    <h4 className="text-sm font-bold text-slate-200">System Theme</h4>
                                    <p className="text-xs text-slate-500 mt-1">Select the primary accent color for the interface.</p>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => setTheme('indigo')} className={`w-8 h-8 rounded-full bg-indigo-500 border-2 ${theme === 'indigo' ? 'border-white scale-110' : 'border-transparent opacity-50'} transition-all`}></button>
                                    <button onClick={() => setTheme('emerald')} className={`w-8 h-8 rounded-full bg-emerald-500 border-2 ${theme === 'emerald' ? 'border-white scale-110' : 'border-transparent opacity-50'} transition-all`}></button>
                                    <button onClick={() => setTheme('rose')} className={`w-8 h-8 rounded-full bg-rose-500 border-2 ${theme === 'rose' ? 'border-white scale-110' : 'border-transparent opacity-50'} transition-all`}></button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/50 border border-white/5">
                                <div>
                                    <h4 className="text-sm font-bold text-slate-200">Reduced Motion</h4>
                                    <p className="text-xs text-slate-500 mt-1">Minimize animations for faster performance.</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                        type="checkbox"
                                        className="sr-only peer"
                                        checked={reducedMotion}
                                        onChange={(e) => setReducedMotion(e.target.checked)}
                                    />
                                    <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* System Info */}
                    <div className="glass rounded-3xl p-8">
                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-3">
                            <span className="p-2 rounded-lg bg-slate-500/20 text-slate-400"><i className="fas fa-server"></i></span>
                            SYSTEM STATUS
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-2xl bg-slate-900/50 border border-white/5">
                                <div className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mb-1">Version</div>
                                <div className="text-sm font-bold text-white">v4.8.2 (Stable)</div>
                            </div>
                            <div className="p-4 rounded-2xl bg-slate-900/50 border border-white/5">
                                <div className="text-[10px] text-slate-500 font-mono uppercase tracking-widest mb-1">Server Latency</div>
                                <div className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                    24ms
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};
