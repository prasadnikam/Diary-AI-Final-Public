import React, { useState, useRef, useEffect } from 'react';
import { JournalEntry, Mood, Attachment } from '@/types';
import { analyzeJournalEntry } from '@/services/geminiService';
import api from '@/services/api';
import { VoiceRecorder } from './VoiceRecorder';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import ImageExtension from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import '../tiptap.css';
import {
    Sparkles, Save, Calendar, Smile, Frown, Meh, ThumbsUp, AlertCircle,
    Loader2, Search, X, Paperclip, Image as ImageIcon, FileText, Trash2,
    Plus, PenLine, Bold, Italic, List, Underline, ListOrdered, ArrowLeft,
    Heart, Zap, Cloud, Sun, Moon
} from 'lucide-react';

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
        [Mood.GREAT]: { Icon: ThumbsUp, color: 'emerald', emoji: '🎉' },
        [Mood.GOOD]: { Icon: Smile, color: 'blue', emoji: '😊' },
        [Mood.NEUTRAL]: { Icon: Meh, color: 'slate', emoji: '😐' },
        [Mood.STRESSED]: { Icon: AlertCircle, color: 'orange', emoji: '😰' },
        [Mood.BAD]: { Icon: Frown, color: 'red', emoji: '😢' }
    };

    const { Icon, color, emoji } = icons[mood];

    const sizeClasses = {
        sm: 'p-2 text-sm',
        md: 'p-3',
        lg: 'p-4 text-lg'
    };

    const colorClasses = active
        ? `bg-${color}-500 text-white shadow-lg shadow-${color}-500/50 scale-110`
        : `bg-${color}-50 text-${color}-600 hover:bg-${color}-100 hover:shadow-md`;

    if (!onClick) {
        return (
            <div className={`rounded-2xl transition-all duration-300 ${sizeClasses[size]} ${colorClasses}`}>
                <span className="text-2xl">{emoji}</span>
            </div>
        );
    }

    return (
        <button
            onClick={onClick}
            className={`rounded-2xl transition-all duration-300 transform hover:scale-105 ${sizeClasses[size]} ${colorClasses}`}
            title={mood}
        >
            <span className="text-2xl">{emoji}</span>
        </button>
    );
};

export const Diary: React.FC<DiaryProps> = ({ entries, onAddEntry, onUpdateEntry, onDeleteEntry }) => {
    const [viewMode, setViewMode] = useState<'timeline' | 'compose' | 'detail'>('timeline');
    const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
    const [content, setContent] = useState('');
    const [selectedMood, setSelectedMood] = useState<Mood>(Mood.NEUTRAL);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<{ sentiment: string; reflection: string; tags: string[] } | null>(null);
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    const [includeInFeed, setIncludeInFeed] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [showComposer, setShowComposer] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const editor = useEditor({
        extensions: [
            StarterKit,
            Placeholder.configure({ placeholder: 'What\'s on your mind today?' }),
            ImageExtension,
            Link.configure({ openOnClick: false }),
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

    const handleVoiceTranscript = (transcript: string) => {
        const currentContent = editor?.getText() || '';
        const newContent = currentContent + ' ' + transcript;
        editor?.commands.setContent(newContent);
        setContent(newContent);
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
            setSelectedEntry(entryData);
            setViewMode('detail');
        } else {
            onAddEntry(entryData);
            resetForm();
            setShowComposer(false);
            setViewMode('timeline');
        }
    };

    const resetForm = () => {
        setContent('');
        editor?.commands.clearContent();
        setAnalysisResult(null);
        setSelectedMood(Mood.NEUTRAL);
        setAttachments([]);
        setIncludeInFeed(true);
        setIsEditing(false);
    };

    const handleEdit = () => {
        if (!selectedEntry) return;
        setContent(selectedEntry.content);
        setSelectedMood(selectedEntry.mood);
        setAttachments(selectedEntry.attachments);
        setIncludeInFeed(selectedEntry.includeInFeed ?? true);
        setIsEditing(true);
        setShowComposer(true);
        setViewMode('compose');
    };

    const handleDelete = () => {
        if (!selectedEntry) return;
        if (window.confirm('Delete this memory forever?')) {
            onDeleteEntry(selectedEntry.id);
            setSelectedEntry(null);
            setViewMode('timeline');
        }
    };

    const handleProcessEntities = async () => {
        if (!selectedEntry) return;
        try {
            await api.post(`/journal-entries/${selectedEntry.id}/process_entities/`);
            alert('✨ Memories generated! Check the Memories tab.');
        } catch (error) {
            console.error("Failed to process entities", error);
            alert('Failed to generate memories.');
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

    const filteredEntries = entries
        .slice()
        .reverse()
        .filter(entry =>
            entry.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
            entry.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
        );

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) return 'Today';
        if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';

        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
        });
    };

    // Timeline View
    if (viewMode === 'timeline') {
        return (
            <div className="h-full flex flex-col bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
                {/* Header */}
                <div className="p-6 bg-white/80 backdrop-blur-md border-b border-white/20 sticky top-0 z-10">
                    <div className="max-w-4xl mx-auto">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                                    My Journal
                                </h1>
                                <p className="text-slate-500 text-sm mt-1">Your thoughts, your story</p>
                            </div>
                            <button
                                onClick={() => { setShowComposer(true); setViewMode('compose'); }}
                                className="p-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-full shadow-lg shadow-indigo-500/50 hover:shadow-xl hover:scale-110 transition-all duration-300"
                            >
                                <Plus className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Search */}
                        <div className="relative">
                            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search your memories..."
                                className="w-full pl-12 pr-4 py-3 bg-white/60 backdrop-blur-sm border border-white/40 rounded-2xl text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                            />
                        </div>
                    </div>
                </div>

                {/* Timeline */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="max-w-4xl mx-auto space-y-6">
                        {filteredEntries.map((entry, index) => {
                            const showDateSeparator = index === 0 ||
                                formatDate(entry.date) !== formatDate(filteredEntries[index - 1].date);

                            return (
                                <div key={entry.id}>
                                    {showDateSeparator && (
                                        <div className="flex items-center gap-4 mb-4">
                                            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300 to-transparent"></div>
                                            <span className="text-sm font-semibold text-slate-600 px-4 py-1 bg-white/60 backdrop-blur-sm rounded-full">
                                                {formatDate(entry.date)}
                                            </span>
                                            <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-300 to-transparent"></div>
                                        </div>
                                    )}

                                    <div
                                        onClick={() => { setSelectedEntry(entry); setViewMode('detail'); }}
                                        className="group relative bg-white/80 backdrop-blur-md rounded-3xl p-6 border border-white/40 shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 cursor-pointer overflow-hidden"
                                    >
                                        {/* Gradient overlay */}
                                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                                        <div className="relative z-10">
                                            {/* Header */}
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex items-center gap-3">
                                                    <MoodIcon mood={entry.mood} active={false} size="sm" />
                                                    <span className="text-xs text-slate-500 font-medium">
                                                        {new Date(entry.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                {entry.tags.length > 0 && (
                                                    <div className="flex gap-2">
                                                        {entry.tags.slice(0, 2).map(tag => (
                                                            <span key={tag} className="text-xs px-3 py-1 bg-indigo-100 text-indigo-600 rounded-full font-medium">
                                                                #{tag}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Content Preview */}
                                            <div
                                                className="prose prose-slate max-w-none mb-4 line-clamp-3"
                                                dangerouslySetInnerHTML={{ __html: entry.content }}
                                            />

                                            {/* Footer */}
                                            <div className="flex items-center justify-between">
                                                {entry.attachments.length > 0 && (
                                                    <div className="flex items-center gap-2 text-slate-500">
                                                        <Paperclip className="w-4 h-4" />
                                                        <span className="text-xs">{entry.attachments.length} attachment{entry.attachments.length > 1 ? 's' : ''}</span>
                                                    </div>
                                                )}
                                                {entry.aiReflection && (
                                                    <div className="flex items-center gap-2 text-indigo-500">
                                                        <Sparkles className="w-4 h-4" />
                                                        <span className="text-xs">AI Insight</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {filteredEntries.length === 0 && (
                            <div className="text-center py-20">
                                <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <PenLine className="w-10 h-10 text-indigo-400" />
                                </div>
                                <h3 className="text-xl font-semibold text-slate-700 mb-2">No entries yet</h3>
                                <p className="text-slate-500 mb-6">Start your journaling journey today</p>
                                <button
                                    onClick={() => { setShowComposer(true); setViewMode('compose'); }}
                                    className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-full font-medium shadow-lg shadow-indigo-500/50 hover:shadow-xl hover:scale-105 transition-all"
                                >
                                    Write Your First Entry
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Compose View - Continued in next message due to length
    return null; // Placeholder
};
