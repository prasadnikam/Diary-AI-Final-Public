import React, { useState, useEffect, useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import LoginPage from './components/LoginPage';
import RegisterPage from './components/RegisterPage';
import {
  BookOpen,
  Calendar,
  MessageSquare,
  Settings,
  PenLine,
  Layout,
  LogOut
} from 'lucide-react';
import { Diary } from './components/Diary';
import { StudyManager } from './components/StudyManager';
import { FriendChat } from './components/FriendChat';
import { HomeFeed } from './components/HomeFeed';
import { ContentConfig as ContentConfigPanel } from './components/ContentConfig';
import { JournalEntry, Task, FeedPost, FriendProfile, ContentGenerationConfig } from './types';
import api from './services/api';

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useContext(AuthContext)!;

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
};

function AppContent() {
  const [activeTab, setActiveTab] = useState('journal');
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>([]);
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<FriendProfile | null>(null);
  const [contentConfig, setContentConfig] = useState<ContentGenerationConfig | null>(null);

  const { logout } = useContext(AuthContext)!;

  const fetchData = async () => {
    try {
      const [entriesRes, tasksRes, postsRes, friendsRes, configRes] = await Promise.all([
        api.get('/journal-entries/'),
        api.get('/tasks/'),
        api.get('/feed-posts/'),
        api.get('/friend-profiles/'),
        api.get('/content-config/')
      ]);

      setEntries(entriesRes.data);
      setTasks(tasksRes.data);
      setFeedPosts(postsRes.data);
      setFriends(friendsRes.data);
      // Handle config which might be a list or object
      const configData = configRes.data;
      setContentConfig(Array.isArray(configData) ? configData[0] : configData);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handlers
  const handleAddEntry = async (entry: JournalEntry) => {
    try {
      await api.post('/journal-entries/', entry);
      fetchData();
      setActiveTab('journal');
    } catch (error) {
      console.error("Failed to add entry", error);
    }
  };

  const handleUpdateEntry = async (entry: JournalEntry) => {
    try {
      await api.put(`/journal-entries/${entry.id}/`, entry);
      fetchData();
    } catch (error) {
      console.error("Failed to update entry", error);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    try {
      await api.delete(`/journal-entries/${id}/`);
      fetchData();
    } catch (error) {
      console.error("Failed to delete entry", error);
    }
  };

  const handleAddPost = async (post: FeedPost) => {
    try {
      await api.post('/feed-posts/', post);
      fetchData();
    } catch (error) {
      console.error("Failed to add post", error);
    }
  };

  const handleLikePost = async (postId: string) => {
    // Optimistic update logic would go here, for now just refetch
    // In a real app, you'd toggle the like on the backend
    console.log("Like post", postId);
  };

  const handleAddFriend = async (friend: FriendProfile) => {
    try {
      await api.post('/friend-profiles/', friend);
      fetchData();
    } catch (error) {
      console.error("Failed to add friend", error);
    }
  };

  const handleUpdateConfig = async (newConfig: ContentGenerationConfig) => {
    try {
      // Assuming ID 1 for config
      await api.put('/content-config/1/', newConfig);
      setContentConfig(newConfig);
    } catch (error) {
      console.error("Failed to update config", error);
    }
  };

  const handleAddTask = async (task: Omit<Task, 'id'>) => {
    try {
      const res = await api.post('/tasks/', task);
      setTasks(prev => [...prev, res.data]);
    } catch (error) {
      console.error("Failed to add task", error);
    }
  };

  const handleToggleTask = async (id: string, completed: boolean) => {
    try {
      setTasks(prev => prev.map(t => t.id === id ? { ...t, completed } : t));
      await api.patch(`/tasks/${id}/`, { completed });
    } catch (error) {
      console.error("Failed to toggle task", error);
      fetchData();
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      setTasks(prev => prev.filter(t => t.id !== id));
      await api.delete(`/tasks/${id}/`);
    } catch (error) {
      console.error("Failed to delete task", error);
      fetchData();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar Navigation */}
      <nav className="hidden md:flex w-64 bg-white border-r border-gray-200 flex-shrink-0 fixed h-full z-10 flex-col">
        <div className="p-6 flex items-center space-x-3 border-b border-gray-100">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <BookOpen className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
            MindfulStudent
          </span>
        </div>

        <div className="p-4 space-y-2">
          <button
            onClick={() => setActiveTab('journal')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === 'journal'
              ? 'bg-indigo-50 text-indigo-700 font-medium shadow-sm'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
          >
            <PenLine className="h-5 w-5" />
            <span>Journal</span>
          </button>

          <button
            onClick={() => setActiveTab('tasks')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === 'tasks'
              ? 'bg-indigo-50 text-indigo-700 font-medium shadow-sm'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
          >
            <Calendar className="h-5 w-5" />
            <span>Tasks & Plans</span>
          </button>

          <button
            onClick={() => setActiveTab('friends')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === 'friends'
              ? 'bg-indigo-50 text-indigo-700 font-medium shadow-sm'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
          >
            <MessageSquare className="h-5 w-5" />
            <span>AI Friends</span>
          </button>

          <button
            onClick={() => setActiveTab('feed')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === 'feed'
              ? 'bg-indigo-50 text-indigo-700 font-medium shadow-sm'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
          >
            <Layout className="h-5 w-5" />
            <span>Social Feed</span>
          </button>

          <button
            onClick={() => setActiveTab('config')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${activeTab === 'config'
              ? 'bg-indigo-50 text-indigo-700 font-medium shadow-sm'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
          >
            <Settings className="h-5 w-5" />
            <span>Settings</span>
          </button>
        </div>

        <div className="absolute bottom-0 w-full p-4 border-t border-gray-100">
          <button
            onClick={logout}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-all duration-200"
          >
            <span>Logout</span>
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 ml-0 md:ml-64 p-4 md:p-6 pb-24 md:pb-8 h-screen overflow-hidden">
        <div className="h-full flex flex-col">
          <header className="mb-8 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {activeTab === 'journal' && 'My Journal'}
                {activeTab === 'tasks' && 'Study Planner'}
                {activeTab === 'friends' && 'AI Companions'}
                {activeTab === 'feed' && 'Community Feed'}
                {activeTab === 'config' && 'Configuration'}
              </h1>
              <p className="text-gray-500 mt-1">
                {activeTab === 'journal' && 'Capture your thoughts and feelings'}
                {activeTab === 'tasks' && 'Organize your academic goals'}
                {activeTab === 'friends' && 'Chat with personalized AI friends'}
                {activeTab === 'feed' && 'Share and explore moments'}
                {activeTab === 'config' && 'Customize your experience'}
              </p>
            </div>

            <div className="flex items-center space-x-4">
              <button onClick={logout} className="md:hidden text-gray-400 hover:text-red-500">
                <LogOut className="w-5 h-5" />
              </button>
              <div className="bg-white p-2 rounded-full shadow-sm border border-gray-100">
                <div className="h-8 w-8 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                  JS
                </div>
              </div>
            </div>
          </header>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex-1 overflow-hidden relative">
            {activeTab === 'journal' && (
              <Diary
                entries={entries}
                onAddEntry={handleAddEntry}
                onUpdateEntry={handleUpdateEntry}
                onDeleteEntry={handleDeleteEntry}
              />
            )}
            {activeTab === 'tasks' && (
              <StudyManager
                tasks={tasks}
                onAddTask={handleAddTask}
                onToggleTask={handleToggleTask}
                onDeleteTask={handleDeleteTask}
              />
            )}
            {activeTab === 'friends' && (
              <FriendChat
                friends={friends}
                onAddFriend={handleAddFriend}
                friendProfile={selectedFriend || friends[0]}
                setFriendProfile={setSelectedFriend}
                onAddEntry={handleAddEntry}
              />
            )}
            {activeTab === 'feed' && (
              <HomeFeed
                entries={entries}
                posts={feedPosts}
                contentConfig={contentConfig || {
                  artStyle: 'Abstract',
                  captionTone: 'Poetic',
                  includeAudio: false,
                  outputFormat: 'Image'
                }}
                onAddPost={handleAddPost}
                onLikePost={handleLikePost}
                onNavigateToConfig={() => setActiveTab('config')}
              />
            )}
            {activeTab === 'config' && contentConfig && (
              <ContentConfigPanel
                config={contentConfig}
                onUpdateConfig={handleUpdateConfig}
              />
            )}
          </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 w-full bg-white border-t border-gray-200 flex justify-around items-center p-3 z-50 safe-area-bottom shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <button
          onClick={() => setActiveTab('journal')}
          className={`flex flex-col items-center space-y-1 ${activeTab === 'journal' ? 'text-indigo-600' : 'text-gray-400'}`}
        >
          <PenLine className="h-6 w-6" />
          <span className="text-[10px] font-medium">Journal</span>
        </button>
        <button
          onClick={() => setActiveTab('tasks')}
          className={`flex flex-col items-center space-y-1 ${activeTab === 'tasks' ? 'text-indigo-600' : 'text-gray-400'}`}
        >
          <Calendar className="h-6 w-6" />
          <span className="text-[10px] font-medium">Plan</span>
        </button>
        <button
          onClick={() => setActiveTab('friends')}
          className={`flex flex-col items-center space-y-1 ${activeTab === 'friends' ? 'text-indigo-600' : 'text-gray-400'}`}
        >
          <MessageSquare className="h-6 w-6" />
          <span className="text-[10px] font-medium">Friends</span>
        </button>
        <button
          onClick={() => setActiveTab('feed')}
          className={`flex flex-col items-center space-y-1 ${activeTab === 'feed' ? 'text-indigo-600' : 'text-gray-400'}`}
        >
          <Layout className="h-6 w-6" />
          <span className="text-[10px] font-medium">Feed</span>
        </button>
        <button
          onClick={() => setActiveTab('config')}
          className={`flex flex-col items-center space-y-1 ${activeTab === 'config' ? 'text-indigo-600' : 'text-gray-400'}`}
        >
          <Settings className="h-6 w-6" />
          <span className="text-[10px] font-medium">Settings</span>
        </button>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <AppContent />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;