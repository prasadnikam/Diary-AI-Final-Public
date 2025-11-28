
import React, { useState, useRef, useEffect } from 'react';
import { JournalEntry, Mood, Attachment } from '../types';
import { analyzeJournalEntry } from '../services/geminiService';
import { Sparkles, Save, Calendar, Smile, Frown, Meh, ThumbsUp, AlertCircle, Loader2, Search, X, Paperclip, Image as ImageIcon, FileText, Trash2, Plus, ChevronLeft, ArrowLeft } from 'lucide-react';

interface DiaryProps {
  entries: JournalEntry[];
  onAddEntry: (entry: JournalEntry) => void;
}

interface MoodIconProps {
  mood: Mood;
  active: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md';
}

const MoodIcon: React.FC<MoodIconProps> = ({ mood, active, onClick, size = 'md' }) => {
  const icons = {
    [Mood.GREAT]: ThumbsUp,
    [Mood.GOOD]: Smile,
    [Mood.NEUTRAL]: Meh,
    [Mood.STRESSED]: AlertCircle,
    [Mood.BAD]: Frown
  };
  const Icon = icons[mood];
  
  const colors = {
    [Mood.GREAT]: active ? 'text-emerald-600 bg-emerald-100 ring-2 ring-emerald-500 ring-offset-2' : 'text-emerald-400 hover:bg-emerald-50',
    [Mood.GOOD]: active ? 'text-blue-600 bg-blue-100 ring-2 ring-blue-500 ring-offset-2' : 'text-blue-400 hover:bg-blue-50',
    [Mood.NEUTRAL]: active ? 'text-slate-600 bg-slate-100 ring-2 ring-slate-500 ring-offset-2' : 'text-slate-400 hover:bg-slate-50',
    [Mood.STRESSED]: active ? 'text-orange-600 bg-orange-100 ring-2 ring-orange-500 ring-offset-2' : 'text-orange-400 hover:bg-orange-50',
    [Mood.BAD]: active ? 'text-red-600 bg-red-100 ring-2 ring-red-500 ring-offset-2' : 'text-red-400 hover:bg-red-50',
  };

  const sizeClasses = size === 'sm' ? 'p-1.5' : 'p-3';
  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-6 h-6';

  return (
    <button 
      onClick={onClick}
      disabled={!onClick}
      className={`rounded-xl transition-all duration-200 ${colors[mood]} ${sizeClasses}`}
      title={mood}
    >
      <Icon className={iconSize} />
    </button>
  );
};

export const Diary: React.FC<DiaryProps> = ({ entries, onAddEntry }) => {
  // Mode: 'compose' or 'view'
  const [viewMode, setViewMode] = useState<'compose' | 'view'>('compose');
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  
  // Mobile View State: 'list' is default, 'detail' shows the main content
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list');

  // Compose State
  const [content, setContent] = useState('');
  const [selectedMood, setSelectedMood] = useState<Mood>(Mood.NEUTRAL);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{ sentiment: string; reflection: string; tags: string[] } | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    if (!content.trim() && attachments.length === 0) return;

    const newEntry: JournalEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      content,
      mood: selectedMood,
      aiReflection: analysisResult?.reflection,
      tags: analysisResult?.tags || [],
      attachments
    };

    onAddEntry(newEntry);
    
    // Reset form
    setContent('');
    setAnalysisResult(null);
    setSelectedMood(Mood.NEUTRAL);
    setAttachments([]);
    setMobileView('list'); // Go back to list on mobile
  };

  const handleAnalyze = async () => {
    if (!content.trim()) return;
    setIsAnalyzing(true);
    try {
      const result = await analyzeJournalEntry(content);
      if (result) setAnalysisResult(result);
    } catch (e) {
      console.error("Analysis failed", e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      Array.from(e.target.files).forEach((file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === 'string') {
            const type = file.type.startsWith('image/') ? 'image' : 'pdf';
            setAttachments(prev => [...prev, {
              id: Math.random().toString(36).substr(2, 9),
              type,
              url: reader.result as string,
              name: file.name
            }]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const handleEntryClick = (entry: JournalEntry) => {
    setSelectedEntry(entry);
    setViewMode('view');
    setMobileView('detail');
  };

  const handleCreateNew = () => {
    setSelectedEntry(null);
    setViewMode('compose');
    setMobileView('detail');
  };
  
  const handleBackToList = () => {
    setMobileView('list');
  };

  const filteredEntries = entries
    .slice()
    .reverse()
    .filter(entry => 
      entry.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="h-[calc(100vh-6rem)] md:h-[calc(100vh-2rem)] flex gap-6 overflow-hidden">
      
      {/* Sidebar List - Hidden on mobile if viewing detail */}
      <div className={`${mobileView === 'list' ? 'flex' : 'hidden md:flex'} w-full md:w-80 md:min-w-[20rem] lg:w-96 flex-col bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden z-20`}>
        <div className="p-5 border-b border-slate-100 bg-white z-10">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-slate-800 font-serif">Journal</h2>
            <button 
              onClick={handleCreateNew}
              className="p-2 bg-slate-900 text-white rounded-full hover:bg-slate-700 transition-colors shadow-md"
              title="New Entry"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search memories..."
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-200 transition-all"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filteredEntries.map(entry => (
            <button
              key={entry.id}
              onClick={() => handleEntryClick(entry)}
              className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 group relative overflow-hidden ${
                selectedEntry?.id === entry.id 
                  ? 'bg-slate-50 border-slate-300 shadow-sm' 
                  : 'bg-white border-transparent hover:bg-slate-50 hover:border-slate-100'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                  {new Date(entry.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </span>
                <MoodIcon mood={entry.mood} active={false} size="sm" />
              </div>
              
              <p className="text-sm text-slate-700 font-serif line-clamp-2 leading-relaxed mb-2 opacity-90">
                {entry.content}
              </p>
              
              <div className="flex items-center gap-2">
                {entry.attachments.length > 0 && (
                  <span className="flex items-center text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                    <Paperclip className="w-3 h-3 mr-1" />
                    {entry.attachments.length}
                  </span>
                )}
                {entry.tags.length > 0 && (
                   <span className="text-[10px] text-slate-400">#{entry.tags[0]}</span>
                )}
              </div>
            </button>
          ))}
          
          {filteredEntries.length === 0 && (
             <div className="text-center py-12 text-slate-400">
               <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
                 <Search className="w-6 h-6 opacity-20" />
               </div>
               <p className="text-sm">No entries found.</p>
             </div>
          )}
        </div>
      </div>

      {/* Main Content Area - Hidden on mobile if listing */}
      <div className={`${mobileView === 'detail' ? 'flex' : 'hidden md:flex'} flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex-col relative`}>
        
        {viewMode === 'compose' ? (
          /* --- COMPOSE MODE --- */
          <>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="max-w-3xl mx-auto p-4 md:p-12">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                   <div className="flex items-center gap-3">
                     <button onClick={handleBackToList} className="md:hidden p-2 bg-slate-100 rounded-full text-slate-600">
                        <ArrowLeft className="w-5 h-5" />
                     </button>
                     <div className="flex items-center text-slate-400 text-sm font-medium">
                       <Calendar className="w-4 h-4 mr-2" />
                       {formatDate(new Date().toISOString())}
                     </div>
                   </div>
                   <div className="flex gap-2 bg-slate-50 p-1.5 rounded-2xl overflow-x-auto">
                     {Object.values(Mood).map((m) => (
                        <MoodIcon 
                          key={m} 
                          mood={m as Mood} 
                          active={selectedMood === m} 
                          onClick={() => setSelectedMood(m as Mood)} 
                        />
                      ))}
                   </div>
                </div>

                {/* Editor */}
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Dear Diary..."
                  className="w-full h-[40vh] resize-none focus:outline-none font-serif text-lg md:text-2xl leading-loose text-slate-800 placeholder:text-slate-200 placeholder:italic bg-transparent"
                  autoFocus
                />

                {/* Attachments Preview */}
                {attachments.length > 0 && (
                  <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in">
                    {attachments.map(att => (
                      <div key={att.id} className="relative group aspect-square rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                        {att.type === 'image' ? (
                          <img src={att.url} alt="attachment" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                        ) : (
                          <div className="w-full h-full bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
                            <FileText className="w-8 h-8 text-slate-400 mb-2" />
                            <span className="text-xs text-slate-600 truncate w-full">{att.name}</span>
                          </div>
                        )}
                        <button 
                          onClick={() => removeAttachment(att.id)}
                          className="absolute top-2 right-2 p-1.5 bg-white/90 text-red-500 rounded-full opacity-100 md:opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* AI Analysis Result */}
                {analysisResult && (
                  <div className="mt-8 bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-2xl border border-indigo-100/50 animate-slide-up">
                    <div className="flex items-center gap-3 mb-3">
                      <Sparkles className="w-5 h-5 text-indigo-500" />
                      <h3 className="font-bold text-indigo-900 text-sm uppercase tracking-wider">Reflections</h3>
                    </div>
                    <p className="text-slate-700 font-serif italic text-lg leading-relaxed mb-4">
                      "{analysisResult.reflection}"
                    </p>
                    <div className="flex gap-2">
                       {analysisResult.tags.map(t => (
                         <span key={t} className="text-xs font-medium text-indigo-600 bg-white/60 px-2 py-1 rounded-md border border-indigo-100">#{t}</span>
                       ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Toolbar */}
            <div className="p-4 md:p-6 border-t border-slate-100 bg-white/80 backdrop-blur-sm sticky bottom-0 z-10">
              <div className="max-w-3xl mx-auto flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                   <input 
                      type="file" 
                      multiple 
                      ref={fileInputRef} 
                      className="hidden" 
                      onChange={handleFileSelect}
                      accept="image/*,application/pdf"
                    />
                   <button 
                     onClick={() => fileInputRef.current?.click()}
                     className="flex items-center px-4 py-2 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded-xl transition-all whitespace-nowrap"
                   >
                     <ImageIcon className="w-5 h-5 mr-2" />
                     <span className="font-medium">Add Media</span>
                   </button>
                   <button
                     onClick={handleAnalyze}
                     disabled={isAnalyzing || !content}
                     className="flex items-center px-4 py-2 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all disabled:opacity-50 whitespace-nowrap"
                   >
                     {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Sparkles className="w-5 h-5 mr-2" />}
                     <span className="font-medium">AI Insight</span>
                   </button>
                </div>

                <button
                  onClick={handleSave}
                  disabled={!content && attachments.length === 0}
                  className="w-full md:w-auto bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20 active:scale-95 disabled:opacity-50 disabled:shadow-none flex items-center justify-center"
                >
                  <Save className="w-5 h-5 mr-2" />
                  Save Entry
                </button>
              </div>
            </div>
          </>
        ) : selectedEntry ? (
          /* --- VIEW MODE --- */
          <>
             <div className="flex-1 overflow-y-auto custom-scrollbar">
                {/* Hero / Header */}
                <div className="bg-slate-50 border-b border-slate-100 p-6 md:p-12 relative">
                   <div className="absolute top-6 left-6 flex gap-2">
                       <button 
                         onClick={handleBackToList} 
                         className="md:hidden p-2 text-slate-400 hover:text-slate-800 hover:bg-white rounded-full transition-all"
                       >
                         <ArrowLeft className="w-6 h-6" />
                       </button>
                       <button 
                         onClick={() => { setViewMode('compose'); setMobileView('detail'); setSelectedEntry(null); }} 
                         className="hidden md:block p-2 text-slate-400 hover:text-slate-800 hover:bg-white rounded-full transition-all"
                       >
                         <Plus className="w-6 h-6" />
                       </button>
                   </div>

                   <div className="max-w-3xl mx-auto mt-6">
                      <div className="flex items-center gap-4 mb-4">
                        <MoodIcon mood={selectedEntry.mood} active={true} size="md" />
                        <div className="h-8 w-px bg-slate-300"></div>
                        <span className="text-slate-500 font-medium">
                          {formatDate(selectedEntry.date)}
                        </span>
                      </div>
                      
                      {selectedEntry.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-6">
                          {selectedEntry.tags.map(tag => (
                            <span key={tag} className="text-sm text-slate-500 bg-white border border-slate-200 px-3 py-1 rounded-full">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                   </div>
                </div>

                {/* Content Body */}
                <div className="max-w-3xl mx-auto p-6 md:p-12">
                   <div className="prose prose-lg prose-slate max-w-none font-serif leading-loose text-slate-800 whitespace-pre-wrap">
                     {selectedEntry.content}
                   </div>

                   {/* Gallery */}
                   {selectedEntry.attachments.length > 0 && (
                     <div className="mt-12">
                        <h3 className="font-sans font-bold text-slate-900 text-sm uppercase tracking-wider mb-4 flex items-center">
                          <Paperclip className="w-4 h-4 mr-2" /> Attachments
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           {selectedEntry.attachments.map(att => (
                             <div key={att.id} className="rounded-2xl overflow-hidden border border-slate-100 shadow-sm bg-slate-50">
                               {att.type === 'image' ? (
                                 <img src={att.url} alt="Memory" className="w-full h-auto" />
                               ) : (
                                 <div className="p-8 flex items-center gap-4">
                                   <div className="p-4 bg-white rounded-xl shadow-sm text-red-500">
                                      <FileText className="w-8 h-8" />
                                   </div>
                                   <div>
                                      <p className="font-medium text-slate-700 truncate max-w-[200px]">{att.name}</p>
                                      <span className="text-xs text-slate-400">PDF Document</span>
                                   </div>
                                 </div>
                               )}
                             </div>
                           ))}
                        </div>
                     </div>
                   )}

                   {/* AI Reflection Box */}
                   {selectedEntry.aiReflection && (
                     <div className="mt-12 p-8 bg-indigo-50/50 rounded-3xl border border-indigo-100 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                           <Sparkles className="w-32 h-32 text-indigo-600" />
                        </div>
                        <div className="relative z-10">
                           <div className="flex items-center gap-2 mb-4 text-indigo-600">
                              <Sparkles className="w-5 h-5" />
                              <span className="font-bold text-sm uppercase tracking-wider">AI Insight</span>
                           </div>
                           <p className="text-lg font-serif italic text-slate-700 leading-relaxed">
                             "{selectedEntry.aiReflection}"
                           </p>
                        </div>
                     </div>
                   )}
                </div>
             </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400">
             <p className="hidden md:block">Select an entry to view</p>
             <p className="md:hidden">Tap an entry to view details</p>
          </div>
        )}

      </div>
    </div>
  );
};
