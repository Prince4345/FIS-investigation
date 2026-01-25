
import React, { useState, useEffect } from 'react';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';

interface LoginProps {
  onLogin: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {


  return (
    <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row">
      <div className="flex-1 hidden md:flex items-center justify-center p-12 bg-indigo-900 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-indigo-500 to-indigo-900"></div>
        <div className="relative z-10 max-w-lg text-center">
          <div className="w-24 h-24 bg-white bg-opacity-10 backdrop-blur-md rounded-3xl flex items-center justify-center mx-auto mb-8 border border-white border-opacity-20">
            <i className="fas fa-fingerprint text-white text-5xl"></i>
          </div>
          <h1 className="text-4xl font-bold text-white mb-4">Forensic Insight Engine</h1>
          <p className="text-indigo-200 text-lg leading-relaxed">
            The next generation of explainable AI for forensic evidence analysis. Securely manage cases, analyze witnesses, and uncover patterns.
          </p>
        </div>
      </div>

      <div className="w-full md:w-[500px] flex items-center justify-center p-8 bg-slate-900 border-l border-slate-800">
        <div className="w-full max-w-sm">
          <div className="md:hidden text-center mb-10">
            <i className="fas fa-fingerprint text-indigo-500 text-5xl mb-4"></i>
            <h2 className="text-2xl font-bold">Crime Case Analyzer</h2>
          </div>

          <h2 className="text-2xl font-bold mb-2">Access Portal</h2>
          <p className="text-slate-500 text-sm mb-8 font-mono uppercase tracking-wider">Authentication Required</p>



          <div className="space-y-4">
            <button
              onClick={onLogin}
              className="w-full flex items-center justify-center gap-3 bg-white text-slate-900 font-bold py-3 rounded-xl hover:bg-slate-200 transition-colors shadow-lg"
            >
              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
              Sign in with Google
            </button>



          </div>

          <div className="mt-12 text-center">
            <p className="text-slate-600 text-[10px] uppercase font-bold tracking-widest leading-loose">
              Educational Prototype v1.0.0<br />
              Powered by Google Gemini & Firebase
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
