export enum View {
  HOME = 'HOME',
  DASHBOARD = 'DASHBOARD',
  DIARY = 'DIARY',
  STUDY = 'STUDY',
  TRAVEL = 'TRAVEL',
  FRIEND_CHAT = 'FRIEND_CHAT',
  CONTENT_CONFIG = 'CONTENT_CONFIG',
  SETTINGS = 'SETTINGS'
}

export enum Mood {
  GREAT = 'GREAT',
  GOOD = 'GOOD',
  NEUTRAL = 'NEUTRAL',
  STRESSED = 'STRESSED',
  BAD = 'BAD'
}

export interface Attachment {
  id: string;
  type: 'image' | 'pdf';
  url: string; // Base64 data URL
  name: string;
}

export interface JournalEntry {
  id: string;
  date: string; // ISO string
  content: string;
  mood: Mood;
  aiReflection?: string;
  tags: string[];
  attachments: Attachment[];
  type?: 'text' | 'conversation'; // Distinguish normal entries from chats
  includeInFeed?: boolean; // Whether to include in AI feed generation
}

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  subject?: string;
}

export interface StudySession {
  id: string;
  subject: string;
  durationMinutes: number;
  date: string;
}

export interface AnalysisResult {
  sentiment: string;
  summary: string;
  advice: string;
  tags: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isError?: boolean;
}

export interface FeedPost {
  id: string;
  entryId: string;
  imageUrl?: string;
  videoUrl?: string; // New field for animated stories
  caption: string;
  likes: number;
  isLiked: boolean;
  timestamp: string;
  moodTag: Mood;
  audioData?: string; // Base64 PCM audio data
}

export interface ContentGenerationConfig {
  artStyle: string;
  captionTone: string;
  includeAudio: boolean;
  outputFormat: 'IMAGE' | 'VIDEO'; // New field
}

export interface Place {
  title: string;
  uri: string;
  address?: string;
  rating?: string;
}

export interface Trip {
  id: string;
  destination: string;
  description: string;
  places: Place[];
  status: 'PLANNED' | 'DREAM';
  imageUrl?: string;
}

export interface FriendProfile {
  name: string;
  personality: string;
  context: string; // Shared memories, relationship details
  voiceName: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr';
  avatarUrl?: string;
}