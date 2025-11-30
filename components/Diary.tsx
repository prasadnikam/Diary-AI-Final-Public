import React, { useState, useRef, useEffect } from 'react';
import { JournalEntry, Mood, Attachment } from '@/types';
import { analyzeJournalEntry } from '@/services/geminiService';
import api from '@/services/api';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import ImageExtension from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import '../tiptap.css';
import { Sparkles, Save, Calendar, Smile, Frown, Meh, ThumbsUp, AlertCircle, Loader2, Search, X, Paperclip, Image as ImageIcon, FileText, Trash2, Plus, ChevronLeft, ArrowLeft, PenLine, Bold, Italic, List, Underline, ListOrdered, Heart, Zap } from 'lucide-react';

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
    [Mood.GREAT]: active
      ? 'bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-lg shadow-emerald-500/50 scale-110'
      : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:scale-105',
    [Mood.GOOD]: active
      ? 'bg-gradient-to-br from-blue-400 to-cyan-500 text-white shadow-lg shadow-blue-500/50 scale-110'
      : 'bg-blue-50 text-blue-600 hover:bg-blue-100 hover:scale-105',
    [Mood.NEUTRAL]: active
      ? 'bg-gradient-to-br from-slate-400 to-slate-500 text-white shadow-lg shadow-slate-500/50 scale-110'
      : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:scale-105',
    [Mood.STRESSED]: active
      ? 'bg-gradient-to-br from-orange-400 to-amber-500 text-white shadow-lg shadow-orange-500/50 scale-110'
      : 'bg-orange-50 text-orange-600 hover:bg-orange-100 hover:scale-105',
    [Mood.BAD]: active
      ? 'bg-gradient-to-br from-red-400 to-rose-500 text-white shadow-lg shadow-red-500/50 scale-110'
      : 'bg-red-50 text-red-600 hover:bg-red-100 hover:scale-105',
  };

  const sizeClasses = {
    sm: 'p-2 min-w-[36px] min-h-[36px]',
    md: 'p-3 min-w-[48px] min-h-[48px]',
    lg: 'p-4 min-w-[56px] min-h-[56px]'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  if (!onClick) {
    return (
      <div className={`rounded-2xl transition-all duration-300 ${colors[mood]} ${sizeClasses[size]} flex items-center justify-center`} title={mood}>
        <Icon className={iconSizes[size]} />
      </div>
    )
  }

  return (
    <button
      onClick={onClick}
      className={`rounded-2xl transition-all duration-300 ${colors[mood]} ${sizeClasses[size]} flex items-center justify-center active:scale-95`}
      title={mood}
    >
      <Icon className={iconSizes[size]} />
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

  const fileInputRef = useRef<HTMLInputElement>(null);

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
    <div className="h-full flex gap-0 md:gap-6 overflow-hidden">

      {/* Sidebar List - Modern Card Design */}
      <div className={`${mobileView === 'list' ? 'flex' : 'hidden md:flex'} w-full md:w-80 md:min-w-[20rem] lg:w-96 flex-col bg-gradient-to-br from-white to-slate-50 rounded-3xl border border-slate-200/60 shadow-xl shadow-slate-200/50 overflow-hidden z-20`}>
        {/* Header with gradient */}
        <div className="p-6 border-b border-slate-200/60 bg-gradient-to-r from-purple-50 via-pink-50 to-indigo-50 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5"></div>
          <div className="relative z-10">
            <div className="flex justify-between items-center mb-5">
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Journal</h2>
                <p className="text-xs text-slate-500 mt-1">{entries.length} {entries.length === 1 ? 'entry' : 'entries'}</p>
              </div>
              <button
                onClick={handleCreateNew}
                className="p-3 bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-2xl hover:shadow-lg hover:shadow-purple-500/50 transition-all duration-300 active:scale-95 min-w-[48px] min-h-[48px] flex items-center justify-center"
                title="New Entry"
              >
                <Plus className="w-6 h-6" />
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search your thoughts..."
                className="w-full pl-11 pr-4 py-3 bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-300 transition-all shadow-sm"
              />
            </div>
          </div>
        </div>

        {/* Entry List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredEntries.map(entry => (
            <div
              key={entry.id}
              onClick={() => handleEntryClick(entry)}
              role="button"
              tabIndex={0}
              className={`w-full text-left p-4 rounded-2xl border transition-all duration-300 group relative overflow-hidden cursor-pointer ${selectedEntry?.id === entry.id
                ? 'bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200 shadow-md shadow-purple-200/50 scale-[1.02]'
                : 'bg-white border-slate-200/60 hover:bg-gradient-to-br hover:from-slate-50 hover:to-purple-50/30 hover:border-purple-200/50 hover:shadow-md hover:scale-[1.01]'
                }`}
            >
              {/* Gradient accent bar */}
              {selectedEntry?.id === entry.id && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-500 to-pink-500 rounded-l-2xl"></div>
              )}

              <div className="flex justify-between items-start mb-3">
                <div>
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                    {getRelativeTime(entry.date)}
                  </span>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {new Date(entry.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
                <MoodIcon mood={entry.mood} active={selectedEntry?.id === entry.id} size="sm" />
              </div>

              <div
                className="text-sm text-slate-700 font-serif line-clamp-2 leading-relaxed mb-3 prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: entry.content }}
              />

              <div className="flex items-center gap-2 flex-wrap">
                {entry.attachments.length > 0 && (
                  <span className="flex items-center text-[10px] bg-purple-100 text-purple-600 px-2 py-1 rounded-lg font-medium">
                    <Paperclip className="w-3 h-3 mr-1" />
                    {entry.attachments.length}
                  </span>
                )}
                {entry.tags.slice(0, 2).map(tag => (
                  <span key={tag} className="text-[10px] bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700 px-2 py-1 rounded-lg font-medium">
                    #{tag}
                  </span>
                ))}
                {entry.tags.length > 2 && (
                  <span className="text-[10px] text-slate-400">+{entry.tags.length - 2}</span>
                )}
              </div>
            </div>
          ))}

          {filteredEntries.length === 0 && (
            <div className="text-center py-16 text-slate-400">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-purple-300" />
              </div>
              <p className="text-sm font-medium">No entries found</p>
              <p className="text-xs mt-1">Try a different search term</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className={`${mobileView === 'detail' ? 'flex' : 'hidden md:flex'} flex-1 bg-white rounded-3xl border border-slate-200/60 shadow-xl shadow-slate-200/50 overflow-hidden flex-col relative`}>

        {viewMode === 'compose' ? (
          /* --- COMPOSE MODE --- */
          <>
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-3xl mx-auto p-6 md:p-12 animate-fade-in">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleBackToList}
                      className="md:hidden p-3 bg-slate-100 rounded-2xl text-slate-600 hover:bg-slate-200 transition-all active:scale-95 min-w-[48px] min-h-[48px] flex items-center justify-center"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex items-center text-slate-500 text-sm font-medium">
                      <Calendar className="w-4 h-4 mr-2" />
                      {isEditing ? 'Editing Entry' : formatDate(new Date().toISOString())}
                    </div>
                  </div>
                </div>

                {/* Mood Selector - Enhanced */}
                <div className="mb-8 p-6 bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 rounded-3xl border border-purple-200/50">
                  <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center">
                    <Heart className="w-4 h-4 mr-2 text-pink-500" />
                    How are you feeling?
                  </h3>
                  <div className="flex gap-3 justify-center flex-wrap">
                    {Object.values(Mood).map((m) => (
                      <MoodIcon
                        key={m}
                        mood={m as Mood}
                        active={selectedMood === m}
                        onClick={() => setSelectedMood(m as Mood)}
                        size="lg"
                      />
                    ))}
                  </div>
                </div>

                {/* Editor */}
                <div className="mb-8">
                  {/* Toolbar */}
                  <div className="flex flex-wrap gap-2 p-3 bg-gradient-to-r from-slate-50 to-purple-50/30 border border-slate-200/60 rounded-t-2xl">
                    <button
                      onClick={() => editor?.chain().focus().toggleBold().run()}
                      className={`p-2.5 rounded-xl transition-all duration-200 min-w-[40px] min-h-[40px] flex items-center justify-center ${editor?.isActive('bold')
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'bg-white text-slate-600 hover:bg-purple-100 hover:text-purple-600'
                        }`}
                      type="button"
                    >
                      <Bold className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => editor?.chain().focus().toggleItalic().run()}
                      className={`p-2.5 rounded-xl transition-all duration-200 min-w-[40px] min-h-[40px] flex items-center justify-center ${editor?.isActive('italic')
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'bg-white text-slate-600 hover:bg-purple-100 hover:text-purple-600'
                        }`}
                      type="button"
                    >
                      <Italic className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => editor?.chain().focus().toggleStrike().run()}
                      className={`p-2.5 rounded-xl transition-all duration-200 min-w-[40px] min-h-[40px] flex items-center justify-center ${editor?.isActive('strike')
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'bg-white text-slate-600 hover:bg-purple-100 hover:text-purple-600'
                        }`}
                      type="button"
                    >
                      <Underline className="w-4 h-4" />
                    </button>
                    <div className="w-px h-10 bg-slate-300 mx-1" />
                    <button
                      onClick={() => editor?.chain().focus().toggleBulletList().run()}
                      className={`p-2.5 rounded-xl transition-all duration-200 min-w-[40px] min-h-[40px] flex items-center justify-center ${editor?.isActive('bulletList')
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'bg-white text-slate-600 hover:bg-purple-100 hover:text-purple-600'
                        }`}
                      type="button"
                    >
                      <List className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                      className={`p-2.5 rounded-xl transition-all duration-200 min-w-[40px] min-h-[40px] flex items-center justify-center ${editor?.isActive('orderedList')
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'bg-white text-slate-600 hover:bg-purple-100 hover:text-purple-600'
                        }`}
                      type="button"
                    >
                      <ListOrdered className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Editor Content */}
                  <EditorContent
                    editor={editor}
                    className="prose prose-lg max-w-none font-serif p-6 border border-t-0 border-slate-200/60 rounded-b-2xl min-h-[40vh] focus:outline-none bg-white shadow-inner"
                  />
                </div>

                {/* Attachments Preview */}
                {attachments.length > 0 && (
                  <div className="mt-8 animate-slide-up">
                    <h3 className="text-sm font-bold text-slate-700 mb-4 flex items-center">
                      <Paperclip className="w-4 h-4 mr-2 text-purple-500" />
                      Attachments ({attachments.length})
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {attachments.map(att => (
                        <div key={att.id} className="relative group aspect-square rounded-2xl overflow-hidden border-2 border-slate-200 shadow-md hover:shadow-xl transition-all duration-300">
                          {att.type === 'image' ? (
                            <img src={att.url} alt="attachment" className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-300" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-red-50 to-orange-50 flex flex-col items-center justify-center p-4 text-center">
                              <FileText className="w-10 h-10 text-red-500 mb-2" />
                              <span className="text-xs text-slate-600 truncate w-full font-medium">{att.name}</span>
                            </div>
                          )}
                          <button
                            onClick={() => removeAttachment(att.id)}
                            className="absolute top-2 right-2 p-2 bg-white/95 text-red-500 rounded-xl opacity-100 md:opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50 shadow-lg active:scale-95 min-w-[36px] min-h-[36px] flex items-center justify-center"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Analysis Result */}
                {analysisResult && (
                  <div className="mt-8 relative overflow-hidden rounded-3xl animate-slide-up">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 opacity-10"></div>
                    <div className="relative p-8 bg-gradient-to-br from-indigo-50/80 via-purple-50/80 to-pink-50/80 backdrop-blur-sm border-2 border-purple-200/50">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl">
                          <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="font-bold text-transparent bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-sm uppercase tracking-wider">AI Reflections</h3>
                      </div>
                      <p className="text-slate-700 font-serif italic text-lg leading-relaxed mb-5">
                        "{analysisResult.reflection}"
                      </p>
                      <div className="flex gap-2 flex-wrap">
                        {analysisResult.tags.map(t => (
                          <span key={t} className="text-xs font-semibold text-purple-700 bg-white/80 px-3 py-2 rounded-xl border border-purple-200/50 shadow-sm">
                            #{t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Toolbar - Enhanced */}
            <div className="p-4 md:p-6 border-t border-slate-200/60 bg-gradient-to-r from-white via-purple-50/20 to-pink-50/20 backdrop-blur-sm sticky bottom-0 z-10">
              <div className="max-w-3xl mx-auto flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="flex gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
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
                    className="flex items-center px-5 py-3 text-slate-600 bg-white hover:bg-purple-50 hover:text-purple-600 border border-slate-200 rounded-2xl transition-all duration-300 whitespace-nowrap shadow-sm hover:shadow-md active:scale-95 min-h-[48px]"
                  >
                    <ImageIcon className="w-5 h-5 mr-2" />
                    <span className="font-semibold">Add Media</span>
                  </button>
                  <button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing || !content}
                    className="flex items-center px-5 py-3 text-purple-600 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap shadow-sm hover:shadow-md active:scale-95 min-h-[48px]"
                  >
                    {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Zap className="w-5 h-5 mr-2" />}
                    <span className="font-semibold">AI Insight</span>
                  </button>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                  <label className="flex items-center gap-3 cursor-pointer group" title="Allow AI to generate stories from this entry">
                    <div
                      className={`w-12 h-7 rounded-full p-1 transition-all duration-300 ${includeInFeed
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 shadow-md shadow-purple-500/50'
                        : 'bg-slate-300'
                        }`}
                      onClick={() => setIncludeInFeed(!includeInFeed)}
                    >
                      <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-300 ${includeInFeed ? 'translate-x-5' : 'translate-x-0'}`} />
                    </div>
                    <span className={`text-sm font-semibold ${includeInFeed ? 'text-purple-600' : 'text-slate-400'}`}>
                      Magic Feed
                    </span>
                  </label>

                  <button
                    onClick={handleSave}
                    disabled={!content && attachments.length === 0}
                    className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-8 py-3 rounded-2xl font-bold hover:shadow-lg hover:shadow-purple-500/50 transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:shadow-none disabled:cursor-not-allowed flex items-center justify-center min-h-[48px] min-w-[140px]"
                  >
                    <Save className="w-5 h-5 mr-2" />
                    Save Entry
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
    </div>
  );
};