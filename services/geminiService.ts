import { Task, JournalEntry, FeedPost, ContentGenerationConfig, FriendProfile } from "../types";

const API_BASE_URL = 'http://localhost:8000/api'; // Check your port (8000 or 3000 depending on proxy)

// Helper to get headers
const getHeaders = () => {
  const apiKey = localStorage.getItem('GEMINI_API_KEY');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (apiKey) {
    headers['X-Gemini-API-Key'] = apiKey;
  }
  return headers;
};

export const analyzeJournalEntry = async (text: string) => {
  const response = await fetch(`${API_BASE_URL}/analyze_journal_entry/`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ text })
  });
  if (!response.ok) {
     if (response.status === 401) throw new Error("Please set your API Key in Settings.");
     throw new Error("Analysis failed");
  }
  return response.json();
};

export const generateStudyPlan = async (goal: string, timeAvailable: string): Promise<Task[]> => {
  const response = await fetch(`${API_BASE_URL}/generate_study_plan/`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ goal, time: timeAvailable })
  });
  
  if (!response.ok) {
     if (response.status === 401) throw new Error("Please set your API Key in Settings.");
     return [];
  }
  
  const data = await response.json();
  // Ensure we map the response to valid Tasks
  return (data.tasks || data).map((t: any, idx: number) => ({
    id: `task-${Date.now()}-${idx}`,
    title: t.title,
    priority: t.priority,
    subject: t.subject,
    completed: false
  }));
};

export const generateFeedPostFromEntry = async (entry: JournalEntry, config: ContentGenerationConfig): Promise<FeedPost | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/generate_feed_post_from_entry/`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ 
        content: entry.content, 
        mood: entry.mood,
        config 
      })
    });

    if (!response.ok) {
        if (response.status === 401) throw new Error("Please set your API Key in Settings.");
        throw new Error("Feed generation failed");
    }

    const data = await response.json();
    
    return {
      id: `post-${Date.now()}`,
      entryId: entry.id,
      imageUrl: "https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?q=80&w=600&auto=format&fit=crop", // Placeholder for now
      caption: data.caption,
      likes: 0,
      isLiked: false,
      timestamp: new Date().toISOString(),
      moodTag: entry.mood
    };
  } catch (e) {
    console.error(e);
    if (e instanceof Error && e.message.includes("API Key")) alert(e.message);
    return null;
  }
};

// Chat Class Wrapper
class BackendChatSession {
  private history: any[] = [];
  private systemInstruction: string;

  constructor(systemInstruction: string) {
    this.systemInstruction = systemInstruction;
  }

  async sendMessage(params: { message: string }) {
    const response = await fetch(`${API_BASE_URL}/chat_response/`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        history: this.history,
        message: params.message,
        systemInstruction: this.systemInstruction
      })
    });

    if (!response.ok) {
       if (response.status === 401) throw new Error("Please set your API Key in Settings.");
       throw new Error("Chat failed");
    }
    
    const data = await response.json();
    
    this.history.push({ role: 'user', parts: [{ text: params.message }] });
    this.history.push({ role: 'model', parts: [{ text: data.text }] });
    
    return { text: data.text };
  }
}

export const createFriendChat = async (friend: FriendProfile) => {
  return new BackendChatSession(`You are ${friend.name}. ${friend.personality}`);
};

export const createStudyChat = async () => {
  return new BackendChatSession("You are a helpful study tutor.");
};

// Placeholder for travel - add similar view if needed
export const extractTravelIntent = async (entries: any[]) => [];
export const getTravelRecommendations = async (dest: string) => null;