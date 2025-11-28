import React, { useState, useEffect } from 'react';
import { Save, Key, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';

export const Settings: React.FC = () => {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saved'>('idle');

  useEffect(() => {
    // Load existing key on mount
    const savedKey = localStorage.getItem('GEMINI_API_KEY');
    if (savedKey) setApiKey(savedKey);
  }, []);

  const handleSave = () => {
    if (!apiKey.trim()) {
      alert("Please enter a valid API Key");
      return;
    }
    localStorage.setItem('GEMINI_API_KEY', apiKey.trim());
    setStatus('saved');
    
    // Reset status after 2 seconds
    setTimeout(() => setStatus('idle'), 2000);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 md:p-12 animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Settings</h1>
        <p className="text-slate-500">Manage your application preferences and connections.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">Gemini API Configuration</h3>
            <p className="text-xs text-slate-500">Connect your own Google AI Studio key</p>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">
              API Key
            </label>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setStatus('idle');
                }}
                placeholder="AIzaSy..."
                className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-mono text-sm"
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Your key is stored locally in your browser and used directly to communicate with Google's servers. 
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline ml-1">
                Get a key here.
              </a>
            </p>
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={handleSave}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-white transition-all ${
                status === 'saved' 
                  ? 'bg-emerald-500 hover:bg-emerald-600' 
                  : 'bg-slate-900 hover:bg-slate-800 shadow-lg shadow-slate-900/20'
              }`}
            >
              {status === 'saved' ? (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Saved
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Save Configuration
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper icon component if CheckCircle2 is missing in imports
const CheckCircle2 = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);