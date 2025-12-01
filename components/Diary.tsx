import React, { useState, useRef, useEffect } from 'react';
import { JournalEntry, Mood, Attachment, ComicStory, ComicTone } from '@/types';
import { analyzeJournalEntry } from '@/services/geminiService';
import { generateCompleteComicStory } from '@/services/comicService';
import api from '@/services/api';
import { AudioRecorder } from './AudioRecorder';
import { ComicCarousel } from './ComicCarousel';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import ImageExtension from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import '../tiptap.css';
import { Sparkles, Save, Calendar, Smile, Frown, Meh, ThumbsUp, AlertCircle, Loader2, Search, X, Paperclip, Image as ImageIcon, FileText, Trash2, Plus, ChevronLeft, ArrowLeft, PenLine, Bold, Italic, List, Underline, ListOrdered, Heart, Zap, Mic, BookOpen } from 'lucide-react';

interface DiaryProps {
  entries: JournalEntry[];
  onAddEntry: (entry: JournalEntry) => void;
  onUpdateEntry: (entry: JournalEntry) => void;
  onDeleteEntry: (id: string) => void;
}

interface MoodIconProps {
  mood: Mood;
  active: boolean;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

const MoodIcon: React.FC<MoodIconProps & { showLabel?: boolean }> = ({ mood, active, onClick, size = 'md', showLabel = false }) => {
  const icons = {
    [Mood.GREAT]: ThumbsUp,
    [Mood.GOOD]: Smile,
    [Mood.NEUTRAL]: Meh,
    [Mood.STRESSED]: AlertCircle,
    [Mood.BAD]: Frown
  };
  const Icon = icons[mood];

  const colors = {
    [Mood.GREAT]: active ? 'bg-emerald-400 text-white shadow-emerald-200' : 'bg-emerald-100 text-emerald-400',
    [Mood.GOOD]: active ? 'bg-blue-400 text-white shadow-blue-200' : 'bg-blue-100 text-blue-400',
    [Mood.NEUTRAL]: active ? 'bg-slate-400 text-white shadow-slate-200' : 'bg-slate-100 text-slate-400',
    [Mood.STRESSED]: active ? 'bg-orange-400 text-white shadow-orange-200' : 'bg-orange-100 text-orange-400',
    [Mood.BAD]: active ? 'bg-red-400 text-white shadow-red-200' : 'bg-red-100 text-red-400',
  };

  const sizeClasses = {
    sm: 'w-8 h-8 p-1.5',
    md: 'w-10 h-10 p-2',
    lg: 'w-12 h-12 p-2.5'
  };

  const buttonContent = (
    <div className={`rounded-full transition-all duration-200 ${colors[mood]} ${sizeClasses[size]} flex items-center justify-center ${active ? 'shadow-lg scale-110' : 'hover:scale-105'}`}>
      <Icon className="w-full h-full" strokeWidth={2.5} />
    </div>
  );

  if (!onClick) {
    return buttonContent;
  }

  return (
    <button onClick={onClick} className="flex flex-col items-center gap-2 group">
      {buttonContent}
      {showLabel && (
        <span className={`text-[10px] font-bold tracking-wider uppercase transition-colors ${active ? 'text-slate-800' : 'text-slate-300 group-hover:text-slate-400'}`}>
          {mood}
        </span>
      )}
    </button>
  );
};

export const Diary: React.FC<DiaryProps> = ({ entries, onAddEntry, onUpdateEntry, onDeleteEntry }) => {
  const [viewMode, setViewMode] = useState<'compose' | 'view'>('compose');
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list');

  const [content, setContent] = useState('');
  const [selectedMood, setSelectedMood] = useState<Mood>(Mood.NEUTRAL);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{ sentiment: string; reflection: string; tags: string[] } | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [includeInFeed, setIncludeInFeed] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);

  // Comic Story States
  const [showComicToneModal, setShowComicToneModal] = useState(false);
  const [isGeneratingComic, setIsGeneratingComic] = useState(false);
  const [comicProgress, setComicProgress] = useState({ progress: 0, message: '' });
  const [generatedComic, setGeneratedComic] = useState<ComicStory | null>(null);
  const [showComicCarousel, setShowComicCarousel] = useState(false);
  const [entryComics, setEntryComics] = useState<Map<string, ComicStory>>(new Map());

  const fileInputRef = useRef<HTMLInputElement>(null);

  const getToneFromMood = (mood: Mood): ComicTone => {
    switch (mood) {
      case Mood.GREAT: return ComicTone.ANIME;
      case Mood.GOOD: return ComicTone.WITTY;
      case Mood.NEUTRAL: return ComicTone.MINIMALIST;
      case Mood.STRESSED: return ComicTone.NOIR;
      case Mood.BAD: return ComicTone.SERIOUS;
      default: return ComicTone.MINIMALIST;
    }
  };

  const handleSave = async () => {
    if (!content.trim() && attachments.length === 0) return;

    const entryData: JournalEntry = {
      id: isEditing && selectedEntry ? selectedEntry.id : Date.now().toString(),
      date: isEditing && selectedEntry ? selectedEntry.date : new Date().toISOString(),
      content,
      mood: selectedMood,
      aiReflection: analysisResult?.reflection,
      tags: analysisResult?.tags || [],
      attachments,
      includeInFeed
    };

    if (isEditing && selectedEntry) {
      onUpdateEntry(entryData);
      setIsEditing(false);
      setSelectedEntry(entryData);
      setViewMode('view');
    } else {
      onAddEntry(entryData);
      setContent('');
      setAnalysisResult(null);
      setSelectedMood(Mood.NEUTRAL);
      setAttachments([]);
      setIncludeInFeed(true);
      setMobileView('list');
    }

    // Automatically generate comic if included in feed
    if (includeInFeed) {
      const tone = getToneFromMood(selectedMood);
      // Run in background
      generateComic(entryData, tone).catch(err => console.error("Auto-comic generation failed", err));
    }
  };

  const handleEdit = () => {
    if (!selectedEntry) return;
    setContent(selectedEntry.content);
    setSelectedMood(selectedEntry.mood);
    setAttachments(selectedEntry.attachments);
    setIncludeInFeed(selectedEntry.includeInFeed ?? true);
    setIsEditing(true);
    setViewMode('compose');
  };

  const handleDelete = () => {
    if (!selectedEntry) return;
    if (window.confirm('Are you sure you want to delete this entry?')) {
      onDeleteEntry(selectedEntry.id);
      setSelectedEntry(null);
      setViewMode('compose');
      setMobileView('list');
    }
  };

  const [isProcessingEntities, setIsProcessingEntities] = useState(false);

  const generateComic = async (entry: JournalEntry, tone: ComicTone, isManual: boolean = false) => {
    const apiKey = localStorage.getItem('GEMINI_API_KEY');
    if (!apiKey) {
      if (isManual) alert('⚠️ API Key Required\n\nPlease set your Gemini API key in Settings before generating comics.');
      return;
    }

    if (isManual) setShowComicToneModal(false);
    setIsGeneratingComic(true);

    try {
      const comic = await generateCompleteComicStory(
        entry,
        tone,
        (progress, message) => {
          setComicProgress({ progress, message });
        }
      );

      setGeneratedComic(comic);
      setEntryComics(prev => new Map(prev).set(entry.id, comic));

      // Create a feed post for the comic
      try {
        await api.post('/feed-items/', {
          sourceType: 'COMIC',
          sourceId: entry.id,
          content: `Created a ${tone} comic story from my journal entry`,
          metaData: {
            comicId: comic.id,
            tone: tone,
            panelCount: comic.panels.length,
            comicStory: comic // Store full comic data for persistence
          }
        });
      } catch (feedError) {
        console.error('Failed to create feed post for comic:', feedError);
      }

      // Show the comic only if manually triggered
      if (isManual) {
        setShowComicCarousel(true);
        alert('✨ Comic story generated successfully!');
      } else {
        // For auto-generation, maybe just a subtle notification or nothing
        console.log('Auto-generated comic successfully');
      }
    } catch (error) {
      console.error('Comic generation failed:', error);
      if (isManual) alert('❌ Failed to generate comic story. Please try again.');
    } finally {
      setIsGeneratingComic(false);
      setComicProgress({ progress: 0, message: '' });
    }
  };

  const handleGenerateComic = (tone: ComicTone) => {
    if (selectedEntry) {
      generateComic(selectedEntry, tone, true);
    }
  };

  const handleProcessEntities = async () => {
    if (!selectedEntry) return;

    // Check if API key is set
    const apiKey = localStorage.getItem('GEMINI_API_KEY');
    if (!apiKey) {
      alert('⚠️ API Key Required\n\nPlease set your Gemini API key in Settings before generating memories.');
      return;
    }

    setIsProcessingEntities(true);

    try {
      const response = await api.post(`/journal-entries/${selectedEntry.id}/process_entities/`);
      console.log('Entity processing response:', response.data);

      // Show success message with details
      const { message, entities } = response.data;
      if (entities && (entities.people > 0 || entities.events > 0 || entities.feelings > 0)) {
        const details = [];
        if (entities.people > 0) details.push(`${entities.people} ${entities.people === 1 ? 'person' : 'people'}`);
        if (entities.events > 0) details.push(`${entities.events} ${entities.events === 1 ? 'event' : 'events'}`);
        if (entities.feelings > 0) details.push(`${entities.feelings} ${entities.feelings === 1 ? 'feeling' : 'feelings'}`);

        alert(`✨ ${message || 'Memories generated successfully!'}\n\nExtracted: ${details.join(', ')}\n\nCheck the Memories tab to view them.`);
      } else {
        alert(`ℹ️ ${message || 'No entities found'}\n\n${response.data.details || 'Try writing about people you met, events you experienced, or feelings you had.'}`);
      }
    } catch (error: any) {
      console.error("Failed to process entities", error);

      // Handle different error types
      if (error.response?.status === 401) {
        const errorMsg = error.response?.data?.error || 'API key is missing or invalid';
        const details = error.response?.data?.details || 'Please set your Gemini API key in Settings.';
        alert(`🔑 Authentication Error\n\n${errorMsg}\n\n${details}`);
      } else if (error.response?.status === 400) {
        const errorMsg = error.response?.data?.error || 'Invalid request';
        const details = error.response?.data?.details || 'Please check your entry content.';
        alert(`⚠️ ${errorMsg}\n\n${details}`);
      } else if (error.response?.data?.error) {
        const errorMsg = error.response.data.error;
        const details = error.response.data.details || '';
        alert(`❌ Failed to generate memories\n\n${errorMsg}\n\n${details}\n\nPlease try again or check the console for more details.`);
      } else {
        alert(`❌ Failed to generate memories\n\nAn unexpected error occurred. Please check:\n1. Your API key is set in Settings\n2. You have an active internet connection\n3. The backend server is running\n\nError: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setIsProcessingEntities(false);
    }
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

  const handleAudioTranscription = (text: string) => {
    // Append transcribed text to editor
    const newContent = content + ` <p>${text}</p>`;
    setContent(newContent);
    editor?.commands.setContent(newContent);
    setShowAudioRecorder(false);
  };

  const handleAudioSaved = (audioData: { url: string; name: string; duration: number }) => {
    setAttachments(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      type: 'audio',
      url: audioData.url,
      name: audioData.name,
      duration: audioData.duration
    }]);
  };

  const handleTranscribeAttachment = async (attachment: Attachment) => {
    if (attachment.type !== 'audio' || !attachment.url) return;

    const apiKey = localStorage.getItem('GEMINI_API_KEY');
    if (!apiKey) {
      alert("⚠️ API Key Missing\n\nPlease set your Gemini API key in Settings to use audio transcription.");
      return;
    }

    setIsAnalyzing(true); // Reuse analyzing state for loading indicator
    try {
      const response = await api.post('/transcribe/', {
        audio_data: attachment.url
      }, {
        headers: {
          'X-Gemini-API-Key': apiKey
        }
      });

      if (response.data.text) {
        // Append transcribed text to editor
        const newContent = content + ` <p>${response.data.text}</p>`;
        setContent(newContent);
        editor?.commands.setContent(newContent);
        alert("Transcription successful! Text added to entry.");
      }
    } catch (error) {
      console.error("Transcription failed", error);
      alert("Transcription failed. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
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
    setIsEditing(false);
    setContent('');
    setAttachments([]);
    setSelectedMood(Mood.NEUTRAL);
    setIncludeInFeed(true);
    setAnalysisResult(null);
    setViewMode('compose');
    setMobileView('detail');
  };

  const handleBackToList = () => {
    setMobileView('list');
  };

  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: 'What\'s on your mind today? ✨'
      }),
      ImageExtension,
      Link.configure({
        openOnClick: false,
      }),
    ],
    content: content,
    onUpdate: ({ editor }) => {
      setContent(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  return (
    <div className="h-full flex gap-0 md:gap-6 overflow-hidden p-4 md:p-6">

      {/* Sidebar List - Redesigned */}
      <div className={`${mobileView === 'list' ? 'flex' : 'hidden md:flex'} w-full md:w-[340px] flex-col bg-white rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden z-20`}>
        {/* Header */}
        <div className="p-8 pb-4">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">My Journal</h2>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">{entries.length} MEMORIES</p>
            </div>
            <button
              onClick={handleCreateNew}
              className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative group">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search memories..."
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>
        </div>

        {/* Entry List */}
        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-4">
          {filteredEntries.map(entry => {
            const moodColors = {
              [Mood.GREAT]: 'border-emerald-400',
              [Mood.GOOD]: 'border-blue-400',
              [Mood.NEUTRAL]: 'border-slate-400',
              [Mood.STRESSED]: 'border-orange-400',
              [Mood.BAD]: 'border-red-400',
            };

            return (
              <div
                key={entry.id}
                onClick={() => handleEntryClick(entry)}
                className={`w-full text-left p-5 rounded-3xl border-l-4 transition-all duration-200 cursor-pointer group hover:shadow-md ${selectedEntry?.id === entry.id
                  ? `bg-white shadow-lg ${moodColors[entry.mood]} ring-1 ring-slate-100`
                  : `bg-white border-transparent hover:bg-slate-50 ${moodColors[entry.mood]}`
                  }`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2 py-1 bg-slate-100 rounded-lg text-[10px] font-bold text-slate-600 uppercase tracking-wide">
                    {getRelativeTime(entry.date)}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {new Date(entry.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div
                  className="text-sm text-slate-600 font-serif line-clamp-2 leading-relaxed mb-3"
                  dangerouslySetInnerHTML={{ __html: entry.content }}
                />

                <div className="flex items-center gap-2 flex-wrap">
                  {entry.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="text-[10px] bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full font-semibold">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Main Content Area - Redesigned */}
      <div className={`${mobileView === 'detail' ? 'flex' : 'hidden md:flex'} flex-1 bg-white rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden flex-col relative`}>

        {viewMode === 'compose' ? (
          /* --- COMPOSE MODE --- */
          <>
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-4xl mx-auto p-8 md:p-12">
                {/* Header Row: Date & Mood */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
                  <div>
                    <div className="flex items-center gap-3 text-slate-400 font-bold text-xs uppercase tracking-widest mb-1">
                      <Calendar className="w-4 h-4" />
                      {new Date().toLocaleDateString('en-US', { weekday: 'long' })}
                    </div>
                    <h1 className="text-4xl md:text-5xl font-serif font-medium text-slate-900">
                      {new Date().getDate()} {new Date().toLocaleDateString('en-US', { month: 'long' })}
                    </h1>
                  </div>

                  {/* Mood Selector */}
                  <div className="bg-slate-50 p-2 rounded-[24px] flex gap-2">
                    {Object.values(Mood).map((m) => (
                      <MoodIcon
                        key={m}
                        mood={m as Mood}
                        active={selectedMood === m}
                        onClick={() => setSelectedMood(m as Mood)}
                        size="lg"
                        showLabel={true}
                      />
                    ))}
                  </div>
                </div>

                {/* Editor Area */}
                <div className="min-h-[50vh]">
                  <EditorContent
                    editor={editor}
                    className="prose prose-xl prose-slate max-w-none font-serif placeholder:text-slate-300 focus:outline-none"
                  />
                </div>

                {/* Attachments Preview */}
                {attachments.length > 0 && (
                  <div className="mt-8 border-t border-slate-100 pt-8">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Attachments</h3>
                    <div className="flex gap-4 overflow-x-auto pb-2">
                      {attachments.map(att => (
                        <div key={att.id} className="relative group min-w-[100px] w-[100px] aspect-square rounded-2xl overflow-hidden border border-slate-200">
                          {att.type === 'image' ? (
                            <img src={att.url} alt="attachment" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-slate-50 flex flex-col items-center justify-center p-2">
                              {att.type === 'audio' ? <Mic className="w-6 h-6 text-slate-400" /> : <FileText className="w-6 h-6 text-slate-400" />}
                            </div>
                          )}
                          <button onClick={() => removeAttachment(att.id)} className="absolute top-1 right-1 p-1 bg-white rounded-full text-red-500 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Toolbar */}
            <div className="p-6 border-t border-slate-100 bg-white sticky bottom-0 z-10">
              <div className="max-w-4xl mx-auto flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input type="file" multiple ref={fileInputRef} className="hidden" onChange={handleFileSelect} accept="image/*,application/pdf" />
                  <button onClick={() => fileInputRef.current?.click()} className="p-3 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors">
                    <ImageIcon className="w-6 h-6" />
                  </button>
                  <button onClick={() => setShowAudioRecorder(true)} className="p-3 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors">
                    <Mic className="w-6 h-6" />
                  </button>
                </div>

                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer group" title="Add to Social Feed">
                    <div
                      className={`w-10 h-6 rounded-full p-1 transition-all duration-300 ${includeInFeed
                        ? 'bg-indigo-500'
                        : 'bg-slate-200'
                        }`}
                      onClick={() => setIncludeInFeed(!includeInFeed)}
                    >
                      <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ${includeInFeed ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                    <span className={`text-xs font-bold uppercase tracking-wider ${includeInFeed ? 'text-indigo-500' : 'text-slate-400'}`}>
                      Feed
                    </span>
                  </label>

                  <button
                    onClick={handleSave}
                    disabled={!content && attachments.length === 0}
                    className="bg-indigo-500 hover:bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:shadow-none"
                  >
                    <Save className="w-5 h-5" />
                    Save
                  </button>
                </div>
              </div>
            </div>
          </>

        ) : selectedEntry ? (
          /* --- VIEW MODE --- */
          <>
            <div className="flex-1 overflow-y-auto animate-fade-in">
              {/* Hero / Header */}
              <div className="bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 border-b border-purple-200/50 p-6 md:p-12 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5"></div>

                <div className="absolute top-6 left-6 flex gap-2 z-10">
                  <button
                    onClick={handleBackToList}
                    className="md:hidden p-3 text-slate-600 bg-white/80 backdrop-blur-sm hover:bg-white rounded-2xl transition-all shadow-md active:scale-95 min-w-[48px] min-h-[48px] flex items-center justify-center"
                  >
                    <ArrowLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={() => { setViewMode('compose'); setMobileView('detail'); setSelectedEntry(null); setIsEditing(false); setContent(''); setAttachments([]); setAnalysisResult(null); }}
                    className="hidden md:flex p-3 text-slate-600 bg-white/80 backdrop-blur-sm hover:bg-white rounded-2xl transition-all shadow-md active:scale-95 min-w-[48px] min-h-[48px] items-center justify-center"
                  >
                    <Plus className="w-6 h-6" />
                  </button>
                </div>

                <div className="absolute top-6 right-6 flex gap-2 z-10">
                  <button
                    onClick={handleEdit}
                    className="p-3 text-purple-600 bg-purple-100/80 backdrop-blur-sm hover:bg-purple-200 rounded-2xl transition-all shadow-md active:scale-95 min-w-[48px] min-h-[48px] flex items-center justify-center"
                    title="Edit Entry"
                  >
                    <PenLine className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleDelete}
                    className="p-3 text-red-600 bg-red-100/80 backdrop-blur-sm hover:bg-red-200 rounded-2xl transition-all shadow-md active:scale-95 min-w-[48px] min-h-[48px] flex items-center justify-center"
                    title="Delete Entry"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setShowComicToneModal(true)}
                    disabled={isGeneratingComic}
                    className="p-3 text-pink-600 bg-pink-100/80 backdrop-blur-sm hover:bg-pink-200 rounded-2xl transition-all shadow-md active:scale-95 min-w-[48px] min-h-[48px] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Generate Comic Story"
                  >
                    {isGeneratingComic ? <Loader2 className="w-5 h-5 animate-spin" /> : <BookOpen className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={handleProcessEntities}
                    disabled={isProcessingEntities}
                    className="p-3 text-indigo-600 bg-indigo-100/80 backdrop-blur-sm hover:bg-indigo-200 rounded-2xl transition-all shadow-md active:scale-95 min-w-[48px] min-h-[48px] flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Generate Memories"
                  >
                    {isProcessingEntities ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                  </button>
                </div>

                <div className="max-w-3xl mx-auto mt-6 relative z-10">
                  <div className="flex items-center gap-5 mb-5">
                    <MoodIcon mood={selectedEntry.mood} active={true} size="lg" />
                    <div className="h-12 w-px bg-purple-300"></div>
                    <div>
                      <span className="text-slate-600 font-semibold text-lg block">
                        {getRelativeTime(selectedEntry.date)}
                      </span>
                      <span className="text-slate-500 text-sm">
                        {formatDate(selectedEntry.date)}
                      </span>
                    </div>
                  </div>

                  {selectedEntry.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {selectedEntry.tags.map(tag => (
                        <span key={tag} className="text-sm text-purple-700 bg-white/80 backdrop-blur-sm border border-purple-200 px-4 py-2 rounded-xl font-semibold shadow-sm">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Content Body */}
              <div className="max-w-4xl mx-auto p-6 md:p-12">
                <div
                  className="prose prose-lg prose-slate max-w-none font-serif leading-loose text-slate-800"
                  dangerouslySetInnerHTML={{ __html: selectedEntry.content }}
                />

                {/* Gallery */}
                {selectedEntry.attachments.length > 0 && (
                  <div className="mt-12">
                    <h3 className="font-sans font-bold text-slate-900 text-sm uppercase tracking-wider mb-5 flex items-center">
                      <div className="p-2 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl mr-3">
                        <Paperclip className="w-4 h-4 text-white" />
                      </div>
                      Attachments
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {selectedEntry.attachments.map(att => (
                        <div key={att.id} className="rounded-3xl overflow-hidden border-2 border-slate-200 shadow-lg bg-slate-50 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                          {att.type === 'image' ? (
                            <img src={att.url} alt="Memory" className="w-full h-auto" />
                          ) : (
                            <div className="p-8 flex items-center gap-4">
                              <div className="p-4 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl shadow-md text-white">
                                <FileText className="w-8 h-8" />
                              </div>
                              <div>
                                <p className="font-semibold text-slate-700 truncate max-w-[200px]">{att.name}</p>
                                <span className="text-xs text-slate-500 font-medium">PDF Document</span>
                              </div>
                            </div>
                          )}
                          {att.type === 'audio' && (
                            <div className="p-6 flex items-center gap-4">
                              <div className="p-4 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-2xl shadow-md text-white">
                                <Mic className="w-8 h-8" />
                              </div>
                              <div className="flex-1">
                                <p className="font-semibold text-slate-700 truncate max-w-[200px]">{att.name}</p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs text-slate-500 font-medium">Audio Recording</span>
                                  {att.duration && <span className="text-xs text-slate-400">• {Math.floor(att.duration / 60)}:{(att.duration % 60).toString().padStart(2, '0')}</span>}
                                </div>
                                <audio controls src={att.url} className="w-full mt-3 h-8" />
                                <button
                                  onClick={() => handleTranscribeAttachment(att)}
                                  className="mt-2 text-xs text-purple-600 font-medium hover:underline flex items-center"
                                >
                                  <Sparkles className="w-3 h-3 mr-1" />
                                  Transcribe Audio
                                </button>
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
                  <div className="mt-12 relative overflow-hidden rounded-3xl">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 opacity-10"></div>
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                      <Sparkles className="w-40 h-40 text-purple-600" />
                    </div>
                    <div className="relative z-10 p-10 bg-gradient-to-br from-indigo-50/80 via-purple-50/80 to-pink-50/80 backdrop-blur-sm border-2 border-purple-200/50">
                      <div className="flex items-center gap-3 mb-5">
                        <div className="p-2 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl">
                          <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-bold text-transparent bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-sm uppercase tracking-wider">AI Insight</span>
                      </div>
                      <p className="text-xl font-serif italic text-slate-700 leading-relaxed">
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
            <div className="text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <PenLine className="w-10 h-10 text-purple-300" />
              </div>
              <p className="text-lg font-medium">Select an entry to view</p>
              <p className="text-sm mt-1">or create a new one</p>
            </div>
          </div>
        )}

      </div>

      {/* Comic Tone Selection Modal */}
      {showComicToneModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 animate-in fade-in zoom-in duration-200">
            <h3 className="text-2xl font-bold text-slate-900 mb-2">Choose Comic Style</h3>
            <p className="text-slate-600 text-sm mb-6">Select the tone for your 6-panel comic story</p>

            <div className="space-y-3">
              {Object.values(ComicTone).map((tone) => {
                const toneDescriptions = {
                  [ComicTone.WITTY]: { emoji: '😄', desc: 'Humorous and playful' },
                  [ComicTone.SERIOUS]: { emoji: '🎭', desc: 'Dramatic and emotional' },
                  [ComicTone.NOIR]: { emoji: '🌙', desc: 'Dark and mysterious' },
                  [ComicTone.ANIME]: { emoji: '⚡', desc: 'Dynamic and expressive' },
                  [ComicTone.MINIMALIST]: { emoji: '✨', desc: 'Clean and simple' }
                };
                const info = toneDescriptions[tone];

                return (
                  <button
                    key={tone}
                    onClick={() => handleGenerateComic(tone)}
                    className="w-full p-4 rounded-2xl border-2 border-slate-200 hover:border-purple-500 hover:bg-purple-50 transition-all text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{info.emoji}</span>
                      <div>
                        <p className="font-bold text-slate-900 group-hover:text-purple-600">{tone}</p>
                        <p className="text-sm text-slate-500">{info.desc}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setShowComicToneModal(false)}
              className="mt-6 w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Comic Generation Progress Modal */}
      {isGeneratingComic && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8">
            <div className="text-center">
              <Loader2 className="w-16 h-16 text-purple-500 animate-spin mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-900 mb-2">Creating Your Comic Story</h3>
              <p className="text-slate-600 mb-4">{comicProgress.message}</p>

              {/* Progress Bar */}
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                  style={{ width: `${comicProgress.progress}%` }}
                />
              </div>
              <p className="text-sm text-slate-500 mt-2">{Math.round(comicProgress.progress)}%</p>
            </div>
          </div>
        </div>
      )}

      {/* Comic Carousel Viewer */}
      {showComicCarousel && generatedComic && (
        <ComicCarousel
          comicStory={generatedComic}
          onClose={() => setShowComicCarousel(false)}
        />
      )}

      {showAudioRecorder && (
        <AudioRecorder
          onTranscriptionComplete={handleAudioTranscription}
          onAudioSaved={handleAudioSaved}
          onCancel={() => setShowAudioRecorder(false)}
        />
      )}
    </div>
  );
};