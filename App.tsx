import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Diary } from './components/Diary';
import { StudyManager } from './components/StudyManager';
import { HomeFeed } from './components/HomeFeed';
import { ContentConfig } from './components/ContentConfig';
import { TravelPlanner } from './components/TravelPlanner';
import { FriendChat } from './components/FriendChat';
import { View, JournalEntry, Task, Mood, FeedPost, ContentGenerationConfig, FriendProfile } from './types';
import { api } from './services/api';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.HOME);

  // State
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([]);
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  
  const [contentConfig, setContentConfig] = useState<ContentGenerationConfig>({
    artStyle: "Abstract & Dreamy",
    captionTone: "Reflective & Poetic",
    includeAudio: true,
    outputFormat: 'IMAGE'
  });

  const [friendProfile, setFriendProfile] = useState<FriendProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initial Data Fetch
  useEffect(() => {
    const loadData = async () => {
      try {
        const [fetchedEntries, fetchedTasks, fetchedPosts, fetchedFriends, fetchedConfig] = await Promise.all([
          api.getEntries(),
          api.getTasks(),
          api.getPosts(),
          api.getFriends(),
          api.getConfig()
        ]);

        setEntries(fetchedEntries);
        setTasks(fetchedTasks);
        setFeedPosts(fetchedPosts);
        setFriends(fetchedFriends);
        // If config doesn't exist yet, backend might return a default or error
        if (fetchedConfig) setContentConfig(fetchedConfig);
      } catch (error) {
        console.error("Failed to load data from backend:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  // --- Handlers that sync with Backend ---

  const handleAddEntry = async (entry: JournalEntry) => {
    try {
      // Remove ID as backend generates it, or pass it if you want to keep client ID
      // For now we assume we send the object without ID, or ID is ignored by DRF if not in fields
      const { id, ...data } = entry;
      const savedEntry = await api.createEntry(data as JournalEntry);
      setEntries(prev => [...prev, savedEntry]);
    } catch (e) {
      console.error("Failed to save entry", e);
    }
  };

  const handleAddPost = async (post: FeedPost) => {
    try {
      const { id, ...data } = post;
      const savedPost = await api.createPost(data as FeedPost);
      setFeedPosts(prev => [...prev, savedPost]);
    } catch (e) {
      console.error("Failed to save post", e);
    }
  };

  const handleAddFriend = async (friend: FriendProfile) => {
    try {
      // Assuming friend doesn't have ID yet
      const savedFriend = await api.createFriend(friend);
      setFriends(prev => [...prev, savedFriend]);
    } catch (e) {
      console.error("Failed to add friend", e);
    }
  };

  const handleLikePost = async (postId: string) => {
    const post = feedPosts.find(p => p.id === postId);
    if (!post) return;

    const newIsLiked = !post.isLiked;
    const newLikes = newIsLiked ? post.likes + 1 : post.likes - 1;

    // Optimistic Update
    setFeedPosts(prev => prev.map(p => p.id === postId ? { ...p, isLiked: newIsLiked, likes: newLikes } : p));

    try {
      await api.likePost(postId, newIsLiked, newLikes);
    } catch (e) {
      console.error("Failed to like post", e);
      // Revert if failed
      setFeedPosts(prev => prev.map(p => p.id === postId ? post : p));
    }
  };

  const handleUpdateConfig = async (newConfig: ContentGenerationConfig) => {
    setContentConfig(newConfig); // Optimistic
    try {
      await api.updateConfig(newConfig);
    } catch (e) {
      console.error("Failed to update config", e);
    }
  };

  // --- Task Handlers for StudyManager ---

  const handleAddTask = async (task: Omit<Task, 'id'>) => {
    try {
      const savedTask = await api.createTask(task);
      setTasks(prev => [...prev, savedTask]);
    } catch (e) {
      console.error("Failed to add task", e);
    }
  };

  const handleToggleTask = async (id: string, completed: boolean) => {
    // Optimistic
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed } : t));
    try {
      await api.updateTask(id, { completed });
    } catch (e) {
       console.error("Failed to toggle task", e);
    }
  };

  const handleDeleteTask = async (id: string) => {
    // Optimistic
    setTasks(prev => prev.filter(t => t.id !== id));
    try {
      await api.deleteTask(id);
    } catch (e) {
      console.error("Failed to delete task", e);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400">
        Loading Mindful Student...
      </div>
    );
  }

  const renderView = () => {
    switch (currentView) {
      case View.HOME:
        return (
          <HomeFeed 
            entries={entries} 
            posts={feedPosts} 
            contentConfig={contentConfig}
            onAddPost={handleAddPost} 
            onLikePost={handleLikePost} 
            onNavigateToConfig={() => setCurrentView(View.CONTENT_CONFIG)}
          />
        );
      case View.DASHBOARD:
        return <Dashboard entries={entries} tasks={tasks} userName="Student" />;
      case View.DIARY:
        return <Diary entries={entries} onAddEntry={handleAddEntry} />;
      case View.STUDY:
        // Updated to pass handlers instead of setter
        return (
          <StudyManager 
            tasks={tasks} 
            onAddTask={handleAddTask} 
            onToggleTask={handleToggleTask} 
            onDeleteTask={handleDeleteTask}
          />
        );
      case View.TRAVEL:
        return <TravelPlanner entries={entries} />;
      case View.FRIEND_CHAT:
        return (
          <FriendChat 
            friendProfile={friendProfile} 
            setFriendProfile={setFriendProfile} 
            onAddEntry={handleAddEntry} 
            friends={friends}
            onAddFriend={handleAddFriend}
          />
        );
      case View.CONTENT_CONFIG:
        return (
          <ContentConfig 
            config={contentConfig} 
            onUpdateConfig={handleUpdateConfig} 
          />
        );
      case View.SETTINGS:
        return (
          <div className="flex items-center justify-center h-full text-slate-400">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-600 mb-2">Settings</h2>
              <p>Data is now synced with your secure backend database.</p>
            </div>
          </div>
        );
      default:
        return <Dashboard entries={entries} tasks={tasks} userName="Student" />;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-primary-100 selection:text-primary-900">
      <Sidebar currentView={currentView} onNavigate={setCurrentView} />
      
      <main className="flex-1 ml-0 md:ml-20 lg:ml-64 p-4 lg:p-8 transition-all duration-300 mb-20 md:mb-0">
        <div className="max-w-7xl mx-auto h-full">
           {renderView()}
        </div>
      </main>
    </div>
  );
};

export default App;