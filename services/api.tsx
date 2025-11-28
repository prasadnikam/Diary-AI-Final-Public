import { JournalEntry, Task, FeedPost, ContentGenerationConfig, FriendProfile } from '../types';

const API_URL = 'http://localhost:8000/api';

// Helper to handle responses
const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || response.statusText);
  }
  return response.json();
};

export const api = {
  // --- Entries ---
  getEntries: async (): Promise<JournalEntry[]> => {
    const res = await fetch(`${API_URL}/entries/`);
    return handleResponse(res);
  },
  createEntry: async (entry: Omit<JournalEntry, 'id'>): Promise<JournalEntry> => {
    const res = await fetch(`${API_URL}/entries/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    });
    return handleResponse(res);
  },

  // --- Tasks ---
  getTasks: async (): Promise<Task[]> => {
    const res = await fetch(`${API_URL}/tasks/`);
    return handleResponse(res);
  },
  createTask: async (task: Omit<Task, 'id'>): Promise<Task> => {
    const res = await fetch(`${API_URL}/tasks/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(task),
    });
    return handleResponse(res);
  },
  updateTask: async (id: string, updates: Partial<Task>): Promise<Task> => {
    const res = await fetch(`${API_URL}/tasks/${id}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return handleResponse(res);
  },
  deleteTask: async (id: string): Promise<void> => {
    const res = await fetch(`${API_URL}/tasks/${id}/`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error("Failed to delete");
  },

  // --- Feed Posts ---
  getPosts: async (): Promise<FeedPost[]> => {
    const res = await fetch(`${API_URL}/posts/`);
    return handleResponse(res);
  },
  createPost: async (post: Omit<FeedPost, 'id'>): Promise<FeedPost> => {
    const res = await fetch(`${API_URL}/posts/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(post),
    });
    return handleResponse(res);
  },
  likePost: async (id: string, isLiked: boolean, likes: number): Promise<FeedPost> => {
    const res = await fetch(`${API_URL}/posts/${id}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isLiked, likes }),
    });
    return handleResponse(res);
  },

  // --- Friends ---
  getFriends: async (): Promise<FriendProfile[]> => {
    const res = await fetch(`${API_URL}/friends/`);
    return handleResponse(res);
  },
  createFriend: async (friend: Omit<FriendProfile, 'id'>): Promise<FriendProfile> => {
    const res = await fetch(`${API_URL}/friends/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(friend),
    });
    return handleResponse(res);
  },

  // --- Config ---
  getConfig: async (): Promise<ContentGenerationConfig> => {
    const res = await fetch(`${API_URL}/config/`);
    return handleResponse(res);
  },
  updateConfig: async (config: ContentGenerationConfig): Promise<ContentGenerationConfig> => {
    // We assume ID 1 for the singleton config
    const res = await fetch(`${API_URL}/config/1/`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    return handleResponse(res);
  }
};