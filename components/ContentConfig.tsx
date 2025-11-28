
import React from 'react';
import { ContentGenerationConfig } from '../types';
import { Palette, MessageSquareQuote, Mic, Sparkles, Map, Video, Image as ImageIcon } from 'lucide-react';

interface ContentConfigProps {
  config: ContentGenerationConfig;
  onUpdateConfig: (config: ContentGenerationConfig) => void;
}

export const ContentConfig: React.FC<ContentConfigProps> = ({ config, onUpdateConfig }) => {
  
  const styles = [
    "Abstract & Dreamy",
    "Watercolor & Pastel",
    "Cyberpunk & Neon",
    "Minimalist & Line Art",
    "Studio Ghibli Style",
    "Oil Painting",
    "Cinematic Realistic",
    "Comic Book",
    "Travel Map"
  ];

  const tones = [
    "Reflective & Poetic",
    "Witty & Humorous",
    "Motivational & Bold",
    "Casual & Friendly",
    "Cryptic & Mysterious"
  ];

  const handleToggleAudio = () => {
    onUpdateConfig({ ...config, includeAudio: !config.includeAudio });
  };

  const handleStyleChange = (style: string) => {
    onUpdateConfig({ ...config, artStyle: style });
  };

  const handleToneChange = (tone: string) => {
    onUpdateConfig({ ...config, captionTone: tone });
  };

  return (
    <div className="max-w-4xl mx-auto p-4 animate-fade-in pb-20 overflow-y-auto h-full custom-scrollbar">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Content Magic Tools</h1>
        <p className="text-slate-500">Customize how your diary entries are transformed into creative content.</p>
      </div>

      <div className="space-y-6">
        
        {/* Output Format Section - New Feature */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
           <div className="flex items-center gap-3 mb-6">
             <div className="p-3 bg-indigo-100 text-indigo-600 rounded-xl">
               <Video className="w-6 h-6" />
             </div>
             <div>
               <h3 className="font-bold text-slate-800">Format & Media</h3>
               <p className="text-xs text-slate-400">Choose your storytelling medium</p>
             </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                onClick={() => onUpdateConfig({ ...config, outputFormat: 'IMAGE' })}
                className={`p-4 rounded-xl border flex flex-col items-center gap-3 transition-all ${
                   config.outputFormat === 'IMAGE'
                     ? 'bg-indigo-50 border-indigo-500 text-indigo-700 ring-1 ring-indigo-500'
                     : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-200 hover:bg-slate-50'
                }`}
              >
                 <ImageIcon className="w-8 h-8" />
                 <span className="font-bold text-sm">Static Image</span>
              </button>
              
              <button
                onClick={() => onUpdateConfig({ ...config, outputFormat: 'VIDEO' })}
                className={`p-4 rounded-xl border flex flex-col items-center gap-3 transition-all ${
                   config.outputFormat === 'VIDEO'
                     ? 'bg-indigo-50 border-indigo-500 text-indigo-700 ring-1 ring-indigo-500'
                     : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-200 hover:bg-slate-50'
                }`}
              >
                 <Video className="w-8 h-8" />
                 <div className="text-center">
                    <span className="font-bold text-sm block">Animated Story</span>
                    <span className="text-[10px] text-opacity-70">(Using Veo)</span>
                 </div>
              </button>
           </div>
           
           {config.outputFormat === 'VIDEO' && (
             <div className="mt-4 p-3 bg-amber-50 text-amber-700 rounded-xl text-xs flex gap-2 items-start border border-amber-100">
               <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
               <p>
                 <strong>Magic Feature:</strong> If your diary entry has photos attached, Veo will animate the characters/people from them into the video!
                 <br/><span className="opacity-70 mt-1 block">Note: Video generation requires a paid API key and may take 1-2 minutes.</span>
               </p>
             </div>
           )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Art Style Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-purple-100 text-purple-600 rounded-xl">
                <Palette className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">Visual Aesthetic</h3>
                <p className="text-xs text-slate-400">How should your memories look?</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              {styles.map((style) => (
                <button
                  key={style}
                  onClick={() => handleStyleChange(style)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    config.artStyle === style
                      ? 'border-purple-500 bg-purple-50 text-purple-700 shadow-sm ring-1 ring-purple-500'
                      : 'border-slate-200 hover:border-purple-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {style === "Travel Map" && <Map className="w-4 h-4 text-emerald-500" />}
                      {style === "Comic Book" && <MessageSquareQuote className="w-4 h-4 text-amber-500" />}
                      <span className="font-medium text-sm">{style}</span>
                    </div>
                    {config.artStyle === style && <Sparkles className="w-4 h-4" />}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            {/* Tone Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 bg-pink-100 text-pink-600 rounded-xl">
                  <MessageSquareQuote className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">Caption Voice</h3>
                  <p className="text-xs text-slate-400">What's the vibe of the text?</p>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {tones.map((tone) => (
                  <button
                    key={tone}
                    onClick={() => handleToneChange(tone)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                      config.captionTone === tone
                        ? 'bg-pink-500 text-white shadow-md shadow-pink-200'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {tone}
                  </button>
                ))}
              </div>
            </div>

            {/* Audio Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-emerald-100 text-emerald-600 rounded-xl">
                    <Mic className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">Audio Storytelling</h3>
                    <p className="text-xs text-slate-400">Generate a spoken narrative?</p>
                  </div>
                </div>
                
                <button
                  onClick={handleToggleAudio}
                  className={`w-14 h-8 rounded-full transition-colors flex items-center px-1 ${
                    config.includeAudio ? 'bg-emerald-500' : 'bg-slate-200'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full bg-white shadow-sm transition-transform ${
                    config.includeAudio ? 'translate-x-6' : 'translate-x-0'
                  }`} />
                </button>
              </div>
              
              {config.includeAudio && (
                <div className="mt-4 p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                  <p className="text-xs text-emerald-700">
                    <span className="font-bold">Note:</span> Your diary entry will be transformed into a 45-second first-person story.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-8 text-center text-slate-400 text-sm">
        Changes are saved automatically and will apply to your next generation.
      </div>
    </div>
  );
};
