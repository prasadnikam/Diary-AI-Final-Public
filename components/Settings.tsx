import React, { useState, useEffect } from 'react';
import { Save, Key, CheckCircle } from 'lucide-react';

export const Settings: React.FC = () => {
  const [apiKey, setApiKey] = useState('');
  const [status, setStatus] = useState<'idle' | 'saved'>('idle');

  useEffect(() => {
    const saved = localStorage.getItem('GEMINI_API_KEY');
    if (saved) setApiKey(saved);
  }, []);

  const handleSave = () => {
    if (apiKey.trim()) {
      localStorage.setItem('GEMINI_API_KEY', apiKey.trim());
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 2000);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 animate-fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
        <h2 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-2">
          <Key className="w-6 h-6 text-indigo-500" />
          API Configuration
        </h2>
        
        <div className="mb-6">
          <label className="block text-sm font-bold text-slate-700 uppercase tracking-wider mb-2">
            Gemini API Key
          </label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="AIzaSy..."
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
          <p className="text-xs text-slate-400 mt-2">
            Your key is used locally to authorize requests to your backend.
          </p>
        </div>

        <button
          onClick={handleSave}
          className={`px-6 py-3 rounded-xl font-bold text-white transition-all w-full md:w-auto flex justify-center items-center gap-2 ${
            status === 'saved' ? 'bg-emerald-500' : 'bg-slate-900 hover:bg-slate-800'
          }`}
        >
          {status === 'saved' ? <><CheckCircle className="w-5 h-5" /> Saved</> : "Save Settings"}
        </button>
      </div>
    </div>
  );
};