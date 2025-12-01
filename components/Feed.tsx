import React, { useState, useEffect } from 'react';
import { FeedItem, FeedSettings, ComicStory } from '../types';
import { Heart, MessageCircle, Repeat, Share, Settings, Sparkles, BookOpen } from 'lucide-react';
import api from '../services/api';
import { ComicCarousel } from './ComicCarousel';

interface FeedProps {
    // apiBaseUrl is no longer needed as we use the api instance
}

const Feed: React.FC<FeedProps> = () => {
    const [items, setItems] = useState<FeedItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [settings, setSettings] = useState<FeedSettings | null>(null);
    const [selectedComic, setSelectedComic] = useState<ComicStory | null>(null);

    useEffect(() => {
        fetchFeed();
        fetchSettings();
    }, []);

    const fetchFeed = async () => {
        try {
            const response = await api.get('/feed-items/');
            setItems(response.data);
        } catch (error) {
            console.error("Error fetching feed:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchSettings = async () => {
        try {
            const response = await api.get('/feed-settings/');
            setSettings(response.data);
        } catch (error) {
            console.error("Error fetching settings:", error);
        }
    };

    const toggleSetting = async (key: keyof FeedSettings) => {
        if (!settings) return;

        const newSettings = { ...settings, [key]: !settings[key] };
        setSettings(newSettings);

        try {
            await api.post('/feed-settings/', newSettings);
            fetchFeed(); // Refresh feed after settings change
        } catch (error) {
            console.error("Error updating settings:", error);
        }
    };

    const handleLike = async (id: string) => {
        try {
            await api.post(`/feed-items/${id}/like/`);
            setItems(items.map(item =>
                item.id === id ? { ...item, likes: item.likes + 1, isLiked: true } : item
            ));
        } catch (error) {
            console.error("Error liking item:", error);
        }
    };

    const generateSystemContent = async () => {
        setLoading(true);
        try {
            await api.post('/feed-items/generate_system_content/');
            fetchFeed();
        } catch (error: any) {
            console.error("Error generating content:", error);
            if (error.response && error.response.status === 403) {
                alert("Your Gemini API Key has been blocked because it was leaked. Please generate a new key in Settings.");
            } else {
                alert("Failed to generate content. Please check the console for details.");
            }
        } finally {
            setLoading(false);
        }
    };

    if (loading && items.length === 0) {
        return <div className="p-8 text-center text-gray-500">Loading feed...</div>;
    }

    return (
        <div className="max-w-xl mx-auto border-x border-gray-200 min-h-screen bg-white">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-200 px-4 py-3 flex justify-between items-center">
                <h2 className="text-xl font-bold text-gray-900">Home</h2>
                <div className="flex gap-2">
                    <button
                        onClick={generateSystemContent}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                        title="Generate new content"
                    >
                        <Sparkles size={20} className="text-blue-500" />
                    </button>
                    <button
                        onClick={() => setSettingsOpen(!settingsOpen)}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <Settings size={20} className="text-gray-600" />
                    </button>
                </div>
            </div>

            {/* Settings Panel */}
            {settingsOpen && settings && (
                <div className="bg-gray-50 border-b border-gray-200 p-4 animate-in slide-in-from-top-2">
                    <h3 className="font-semibold mb-3 text-gray-700">Feed Preferences</h3>
                    <div className="space-y-2">
                        <label className="flex items-center justify-between p-2 bg-white rounded border border-gray-200">
                            <span className="text-sm text-gray-700">Show Diary Entries</span>
                            <input
                                type="checkbox"
                                checked={settings.showDiaryEntries}
                                onChange={() => toggleSetting('showDiaryEntries')}
                                className="accent-blue-500"
                            />
                        </label>
                        <label className="flex items-center justify-between p-2 bg-white rounded border border-gray-200">
                            <span className="text-sm text-gray-700">Show Memories</span>
                            <input
                                type="checkbox"
                                checked={settings.showMemories}
                                onChange={() => toggleSetting('showMemories')}
                                className="accent-blue-500"
                            />
                        </label>
                        <label className="flex items-center justify-between p-2 bg-white rounded border border-gray-200">
                            <span className="text-sm text-gray-700">Show AI Insights</span>
                            <input
                                type="checkbox"
                                checked={settings.showSystemContent}
                                onChange={() => toggleSetting('showSystemContent')}
                                className="accent-blue-500"
                            />
                        </label>
                    </div>
                </div>
            )}

            {/* Feed Items */}
            <div className="divide-y divide-gray-200">
                {items.map((item) => (
                    <FeedItemCard
                        key={item.id}
                        item={item}
                        onLike={() => handleLike(item.id)}
                        onComicClick={(comic) => setSelectedComic(comic)}
                    />
                ))}

                {items.length === 0 && (
                    <div className="p-8 text-center text-gray-500">
                        No posts yet. Start writing in your diary!
                    </div>
                )}
            </div>

            {/* Comic Carousel Viewer */}
            {selectedComic && (
                <ComicCarousel
                    comicStory={selectedComic}
                    onClose={() => setSelectedComic(null)}
                />
            )}
        </div>
    );
};

const FeedItemCard: React.FC<{ item: FeedItem; onLike: () => void; onComicClick?: (comic: ComicStory) => void }> = ({ item, onLike, onComicClick }) => {
    const getAvatar = () => {
        if (item.sourceType === 'DIARY') return 'https://api.dicebear.com/7.x/notionists/svg?seed=Diary';
        if (item.sourceType === 'MEMORY') return 'https://api.dicebear.com/7.x/notionists/svg?seed=Memory';
        if (item.sourceType === 'COMIC') return 'https://api.dicebear.com/7.x/notionists/svg?seed=Comic';
        return 'https://api.dicebear.com/7.x/bottts/svg?seed=AI';
    };

    const getName = () => {
        if (item.sourceType === 'DIARY') return 'My Diary';
        if (item.sourceType === 'MEMORY') return 'Memory Lane';
        if (item.sourceType === 'COMIC') return 'Comic Story';
        return 'AI Assistant';
    };

    const getHandle = () => {
        if (item.sourceType === 'DIARY') return '@mydiary';
        if (item.sourceType === 'MEMORY') return '@memories';
        if (item.sourceType === 'COMIC') return '@comics';
        return '@system';
    };

    const handleComicClick = async () => {
        if (item.sourceType === 'COMIC' && item.metaData?.comicId) {
            // Fetch the full comic story from backend
            try {
                const response = await api.get(`/comic-stories/${item.metaData.comicId}/`);
                if (response.data && onComicClick) {
                    onComicClick(response.data);
                }
            } catch (error) {
                console.error('Failed to fetch comic story:', error);
                // Fallback: use embedded comic if available
                if (item.comicStory && onComicClick) {
                    onComicClick(item.comicStory);
                }
            }
        }
    };

    return (
        <div className="p-4 hover:bg-gray-50 transition-colors cursor-pointer">
            <div className="flex gap-3">
                <img
                    src={getAvatar()}
                    alt="Avatar"
                    className="w-10 h-10 rounded-full bg-gray-200"
                />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 text-sm">
                        <span className="font-bold text-gray-900">{getName()}</span>
                        <span className="text-gray-500">{getHandle()}</span>
                        <span className="text-gray-500">·</span>
                        <span className="text-gray-500 hover:underline">
                            {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                    </div>

                    <div className="mt-1 text-gray-900 text-[15px] leading-normal whitespace-pre-wrap">
                        {item.content}
                    </div>

                    {/* Comic Preview */}
                    {item.sourceType === 'COMIC' && item.comicStory && (
                        <button
                            onClick={handleComicClick}
                            className="mt-3 relative w-full max-w-sm aspect-[4/5] rounded-2xl overflow-hidden group"
                        >
                            <img
                                src={item.comicStory.panels[0]?.image_url || 'https://placehold.co/400x500/6366f1/white?text=Comic'}
                                alt="Comic preview"
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="absolute bottom-0 left-0 right-0 p-4">
                                    <div className="flex items-center gap-2 text-white">
                                        <BookOpen className="w-5 h-5" />
                                        <span className="font-bold">View Comic Story</span>
                                    </div>
                                    <p className="text-white/80 text-sm mt-1">
                                        {item.comicStory.panels.length} panels • {item.comicStory.tone}
                                    </p>
                                </div>
                            </div>
                            <div className="absolute top-3 right-3 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full text-white text-xs font-bold shadow-lg">
                                COMIC
                            </div>
                        </button>
                    )}

                    {/* Context/Metadata Pill */}
                    {item.metaData && (
                        <div className="mt-2 flex flex-wrap gap-2">
                            {item.sourceType === 'DIARY' && item.metaData.mood && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                    Mood: {item.metaData.mood}
                                </span>
                            )}
                            {item.sourceType === 'MEMORY' && item.metaData.entity_name && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                    {item.metaData.entity_name}
                                </span>
                            )}
                            {item.sourceType === 'COMIC' && item.metaData.tone && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-pink-100 text-pink-800">
                                    {item.metaData.tone} Style
                                </span>
                            )}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-between mt-3 max-w-md text-gray-500">
                        <button className="group flex items-center gap-2 hover:text-blue-500 transition-colors">
                            <div className="p-2 rounded-full group-hover:bg-blue-50 transition-colors">
                                <MessageCircle size={18} />
                            </div>
                            <span className="text-xs">0</span>
                        </button>
                        <button className="group flex items-center gap-2 hover:text-green-500 transition-colors">
                            <div className="p-2 rounded-full group-hover:bg-green-50 transition-colors">
                                <Repeat size={18} />
                            </div>
                            <span className="text-xs">0</span>
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onLike(); }}
                            className={`group flex items-center gap-2 hover:text-pink-500 transition-colors ${item.isLiked ? 'text-pink-500' : ''}`}
                        >
                            <div className="p-2 rounded-full group-hover:bg-pink-50 transition-colors">
                                <Heart size={18} fill={item.isLiked ? "currentColor" : "none"} />
                            </div>
                            <span className="text-xs">{item.likes}</span>
                        </button>
                        <button className="group flex items-center gap-2 hover:text-blue-500 transition-colors">
                            <div className="p-2 rounded-full group-hover:bg-blue-50 transition-colors">
                                <Share size={18} />
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Feed;
