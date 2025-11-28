
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

// Mock Data for initial state
const MOCK_ENTRIES: JournalEntry[] = [
  {
    id: '1',
    date: new Date(Date.now() - 86400000 * 2).toISOString(),
    content: "Felt really productive today. Managed to finish the first chapter of Biology. Although, I'm a bit worried about the upcoming math test.",
    mood: Mood.GOOD,
    tags: ['biology', 'productive', 'math-anxiety'],
    attachments: [],
    type: 'text'
  },
  {
    id: '2',
    date: new Date(Date.now() - 86400000).toISOString(),
    content: "Had a rough start. Couldn't focus in the morning. Took a walk and felt better.",
    mood: Mood.NEUTRAL,
    tags: ['distracted', 'walk', 'recovery'],
    attachments: [],
    type: 'text'
  }
];

const MOCK_TASKS: Task[] = [
  { id: '1', title: 'Read Chapter 4 of History', completed: false, priority: 'HIGH', subject: 'History' },
  { id: '2', title: 'Complete Calculus Worksheet', completed: true, priority: 'MEDIUM', subject: 'Math' },
  { id: '3', title: 'Outline English Essay', completed: false, priority: 'LOW', subject: 'English' },
];

const MOCK_FRIENDS: FriendProfile[] = [
  {
    name: "Jessica",
    personality: "Supportive and cheerful listener",
    context: "Childhood friend, loves hiking",
    voiceName: "Kore",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jessica"
  },
  {
    name: "Professor Albus",
    personality: "Wise, philosophical, and calm",
    context: "Academic mentor",
    voiceName: "Fenrir",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Albus"
  }
];

const DEFAULT_CONTENT_CONFIG: ContentGenerationConfig = {
  artStyle: "Abstract & Dreamy",
  captionTone: "Reflective & Poetic",
  includeAudio: true,
  outputFormat: 'IMAGE'
};

const STORAGE_KEYS = {
  ENTRIES: 'mindful_entries',
  TASKS: 'mindful_tasks',
  POSTS: 'mindful_posts',
  CONFIG: 'mindful_config',
  FRIENDS: 'mindful_friends'
};

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.HOME);

  // Persistent State: Entries
  const [entries, setEntries] = useState<JournalEntry[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ENTRIES);
    return saved ? JSON.parse(saved) : MOCK_ENTRIES;
  });

  // Persistent State: Tasks
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.TASKS);
    return saved ? JSON.parse(saved) : MOCK_TASKS;
  });

  // Persistent State: Feed Posts
  const [feedPosts, setFeedPosts] = useState<FeedPost[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.POSTS);
    return saved ? JSON.parse(saved) : [];
  });

  // Persistent State: Settings
  const [contentConfig, setContentConfig] = useState<ContentGenerationConfig>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CONFIG);
    return saved ? JSON.parse(saved) : DEFAULT_CONTENT_CONFIG;
  });

  // Persistent State: Friends
  const [friends, setFriends] = useState<FriendProfile[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.FRIENDS);
    return saved ? JSON.parse(saved) : MOCK_FRIENDS;
  });

  const [friendProfile, setFriendProfile] = useState<FriendProfile | null>(null);

  // Save to LocalStorage on changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ENTRIES, JSON.stringify(entries));
  }, [entries]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(feedPosts));
  }, [feedPosts]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(contentConfig));
  }, [contentConfig]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.FRIENDS, JSON.stringify(friends));
  }, [friends]);

  const handleAddEntry = (entry: JournalEntry) => {
    setEntries(prev => [...prev, entry]);
  };

  const handleAddPost = (post: FeedPost) => {
    setFeedPosts(prev => [...prev, post]);
  };

  const handleAddFriend = (friend: FriendProfile) => {
    setFriends(prev => [...prev, friend]);
  };

  const handleLikePost = (postId: string) => {
    setFeedPosts(prev => prev.map(post => {
      if (post.id === postId) {
        return {
          ...post,
          isLiked: !post.isLiked,
          likes: post.isLiked ? post.likes - 1 : post.likes + 1
        };
      }
      return post;
    }));
  };

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
        return <StudyManager tasks={tasks} setTasks={setTasks} />;
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
            onUpdateConfig={setContentConfig} 
          />
        );
      case View.SETTINGS:
        return (
          <div className="flex items-center justify-center h-full text-slate-400">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-600 mb-2">Settings</h2>
              <p>Data is currently auto-saved to your browser's local storage.</p>
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
