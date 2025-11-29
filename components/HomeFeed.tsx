
import React, { useState, useRef, useEffect } from 'react';
import { JournalEntry, FeedPost, Mood, ContentGenerationConfig } from '../types';
import { generateFeedPostFromEntry } from '../services/geminiService';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Heart, MessageCircle, Share2, Sparkles, Loader2, Activity, Pause, Play, Settings2, Video } from 'lucide-react';

interface HomeFeedProps {
  entries: JournalEntry[];
  posts: FeedPost[];
  contentConfig: ContentGenerationConfig;
  onAddPost: (post: FeedPost) => void;
  onLikePost: (postId: string) => void;
  onNavigateToConfig: () => void;
}

// --- Audio Helper Component ---
const AudioPlayer: React.FC<{ audioData: string }> = ({ audioData }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const startedAtRef = useRef<number>(0);
  const pausedAtRef = useRef<number>(0);

  // Decode helper
  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  const decodeAudioData = async (data: Uint8Array, ctx: AudioContext) => {
    const dataInt16 = new Int16Array(data.buffer);
    const numChannels = 1;
    const sampleRate = 24000;
    const frameCount = dataInt16.length / numChannels;

    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        // Convert Int16 to Float32 [-1.0, 1.0]
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  };

  const play = async () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }

      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const bytes = decode(audioData);
      const audioBuffer = await decodeAudioData(bytes, ctx);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      source.onended = () => setIsPlaying(false);

      sourceRef.current = source;
      source.start(0, pausedAtRef.current);
      startedAtRef.current = ctx.currentTime - pausedAtRef.current;
      setIsPlaying(true);
    } catch (e) {
      console.error("Playback error", e);
      setIsPlaying(false);
    }
  };

  const stop = () => {
    if (sourceRef.current) {
      sourceRef.current.stop();
      sourceRef.current.disconnect();
      if (audioContextRef.current) {
        pausedAtRef.current = audioContextRef.current.currentTime - startedAtRef.current;
      }
      setIsPlaying(false);
    }
  };

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (sourceRef.current) {
        try { sourceRef.current.stop(); } catch (e) { }
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  return (
    <button
      onClick={isPlaying ? stop : play}
      className={`absolute bottom-4 right-4 p-3 rounded-full backdrop-blur-md transition-all duration-300 flex items-center gap-2 ${isPlaying ? 'bg-primary-500/90 text-white shadow-lg shadow-primary-500/40' : 'bg-white/90 text-slate-800 hover:bg-white shadow-md'
        }`}
    >
      {isPlaying ? (
        <>
          <Pause className="w-5 h-5 fill-current" />
          <span className="text-xs font-bold pr-1">Listening...</span>
          {/* Equalizer animation */}
          <div className="flex items-center gap-0.5 h-3">
            <div className="w-0.5 bg-white h-full animate-[pulse_0.5s_ease-in-out_infinite]"></div>
            <div className="w-0.5 bg-white h-2/3 animate-[pulse_0.7s_ease-in-out_infinite]"></div>
            <div className="w-0.5 bg-white h-full animate-[pulse_0.6s_ease-in-out_infinite]"></div>
          </div>
        </>
      ) : (
        <>
          <Play className="w-5 h-5 ml-0.5 fill-current" />
          <span className="text-xs font-bold pr-1">Listen to Story</span>
        </>
      )}
    </button>
  );
};

export const HomeFeed: React.FC<HomeFeedProps> = ({ entries, posts, contentConfig, onAddPost, onLikePost, onNavigateToConfig }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<string>("");

  // --- Graph Logic ---
  const moodScore = {
    [Mood.GREAT]: 5,
    [Mood.GOOD]: 4,
    [Mood.NEUTRAL]: 3,
    [Mood.STRESSED]: 2,
    [Mood.BAD]: 1
  };

  const chartData = entries
    .slice(0, 10)
    .reverse()
    .map(e => ({
      date: new Date(e.date).toLocaleDateString('en-US', { weekday: 'short' }),
      score: moodScore[e.mood] || 3
    }));

  const handleGenerateContent = async () => {
    // Pick the most recent entry
    // Pick the most recent entry that is allowed for feed
    const latestEntry = entries.filter(e => e.includeInFeed !== false)[entries.length - 1];
    if (!latestEntry) return;

    // Check for Paid API Key if Video Mode
    if (contentConfig.outputFormat === 'VIDEO') {
      try {
        const hasKey = await (window as any).aistudio.hasSelectedApiKey();
        if (!hasKey) {
          const success = await (window as any).aistudio.openSelectKey();
          if (!success) return; // User cancelled or failed
        }
      } catch (e) {
        console.warn("AI Studio window helper not available", e);
        // Fallthrough in case we're in dev mode without the wrapper
      }
    }

    setIsGenerating(true);
    setGenerationStep(contentConfig.outputFormat === 'VIDEO' ? "Animating with Veo (this may take a minute)..." : "Generating...");

    try {
      const newPost = await generateFeedPostFromEntry(latestEntry, contentConfig);
      if (newPost) {
        onAddPost(newPost);
      }
    } catch (e) {
      console.error("Generation failed", e);
    } finally {
      setIsGenerating(false);
      setGenerationStep("");
    }
  };

  return (
    <div className="flex flex-col xl:grid xl:grid-cols-3 gap-8 min-h-[calc(100vh-2rem)] pb-20 md:pb-0">

      {/* Feed Section (Left/Center) */}
      <div className="xl:col-span-2 flex flex-col overflow-hidden rounded-2xl">
        <div className="flex items-center justify-between mb-6 px-2">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Your Creative Feed</h1>
            <p className="text-slate-500 text-sm">AI-generated art & stories based on your journey.</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onNavigateToConfig}
              className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl transition-colors"
              title="Configure Content Generation"
            >
              <Settings2 className="w-5 h-5" />
            </button>
            <button
              onClick={handleGenerateContent}
              disabled={isGenerating || entries.length === 0}
              className="flex items-center gap-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white px-4 py-2 rounded-xl shadow-lg shadow-purple-500/20 hover:opacity-90 transition-all disabled:opacity-50"
            >
              {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span className="hidden md:inline">{isGenerating ? generationStep || "Working..." : contentConfig.outputFormat === 'VIDEO' ? "Create Animated Story" : "Create Magic Post"}</span>
              <span className="md:hidden">{isGenerating ? "..." : "Create"}</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-0 md:pr-2 space-y-8 pb-10 custom-scrollbar">
          {posts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
              <Sparkles className="w-12 h-12 mb-3 opacity-20" />
              <p>No content yet. Write a diary entry and click "Create Magic Post"!</p>
            </div>
          ) : (
            posts.slice().reverse().map(post => (
              <div key={post.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-fade-in-up">
                {/* Header */}
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs">
                      ME
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-800">Mindful Student</h4>
                      <p className="text-xs text-slate-400">{new Date(post.timestamp).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="px-2 py-1 bg-slate-50 rounded text-xs font-medium text-slate-500">
                    {post.moodTag}
                  </div>
                </div>

                {/* Media Container */}
                <div className="relative bg-slate-100">
                  {post.videoUrl ? (
                    <div className="aspect-video relative group">
                      <video
                        src={post.videoUrl}
                        controls
                        className="w-full h-full object-cover"
                        poster={post.imageUrl || undefined}
                        playsInline
                      />
                      {/* Optional badge for video posts */}
                      <div className="absolute top-4 right-4 bg-black/50 backdrop-blur-md text-white px-2 py-1 rounded text-xs font-bold flex items-center gap-1 pointer-events-none">
                        <Video className="w-3 h-3" /> Animated
                      </div>
                    </div>
                  ) : (
                    <div className="aspect-square relative group">
                      <img src={post.imageUrl} alt="Generated mood art" className="w-full h-full object-cover" />
                      {post.audioData && <AudioPlayer audioData={post.audioData} />}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="p-4">
                  <div className="flex items-center gap-4 mb-3">
                    <button
                      onClick={() => onLikePost(post.id)}
                      className={`transition-transform active:scale-125 ${post.isLiked ? 'text-red-500' : 'text-slate-800 hover:text-slate-600'}`}
                    >
                      <Heart className={`w-7 h-7 ${post.isLiked ? 'fill-current' : ''}`} />
                    </button>
                    <button className="text-slate-800 hover:text-slate-600">
                      <MessageCircle className="w-7 h-7" />
                    </button>
                    <button className="text-slate-800 hover:text-slate-600 ml-auto">
                      <Share2 className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="font-bold text-sm text-slate-800 mb-1">
                    {post.likes} likes
                  </div>

                  <p className="text-sm text-slate-700 leading-relaxed">
                    <span className="font-bold mr-2">mindful_student</span>
                    {post.caption}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Analytics Sidebar (Right) - Stack below on mobile */}
      <div className="flex flex-col gap-6">

        {/* Mood Graph Widget */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-800 text-lg flex items-center">
              <Activity className="w-5 h-5 mr-2 text-primary-500" />
              Mood Flow
            </h3>
          </div>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorMoodHome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} dy={10} interval="preserveStartEnd" />
                <YAxis hide domain={[0, 6]} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  cursor={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="#8b5cf6"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorMoodHome)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Configuration Summary */}
        <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl p-6 text-white shadow-lg">
          <h3 className="font-bold text-lg mb-2">Active Config</h3>
          <div className="space-y-2 text-sm opacity-90">
            <div className="flex justify-between">
              <span>Format:</span>
              <span className="font-bold flex items-center gap-1">
                {contentConfig.outputFormat === 'VIDEO' ? <Video className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
                {contentConfig.outputFormat === 'VIDEO' ? 'Animated Story' : 'Static Image'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Art Style:</span>
              <span className="font-bold">{contentConfig.artStyle}</span>
            </div>
            <div className="flex justify-between">
              <span>Tone:</span>
              <span className="font-bold">{contentConfig.captionTone}</span>
            </div>
            <div className="flex justify-between">
              <span>Audio:</span>
              <span className="font-bold">{contentConfig.includeAudio ? "On" : "Off"}</span>
            </div>
          </div>
          <button
            onClick={onNavigateToConfig}
            className="mt-4 w-full py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-bold transition-colors"
          >
            Change Settings
          </button>
        </div>

        {contentConfig.outputFormat === 'VIDEO' && (
          <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100">
            <div className="flex items-start gap-3">
              <Video className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-amber-800 text-sm">Veo Active</h4>
                <p className="text-xs text-amber-700 mt-1">
                  You are creating animated stories. Attach photos to your diary entry to see them come to life!
                </p>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
