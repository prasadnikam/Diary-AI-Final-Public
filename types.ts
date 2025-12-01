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
  type: 'image' | 'pdf' | 'audio';
  url: string; // Base64 data URL
  name: string;
  duration?: number; // Duration in seconds for audio
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

// --- New Feed Types ---

export interface FeedItem {
  id: string;
  sourceType: 'DIARY' | 'MEMORY' | 'SYSTEM' | 'COMIC';
  sourceId?: string;
  content: string;
  metaData?: any;
  createdAt: string;
  likes: number;
  isLiked: boolean;
  comicStory?: ComicStory; // For COMIC type items
}

export interface FeedSettings {
  id: string;
  showDiaryEntries: boolean;
  showMemories: boolean;
  showSystemContent: boolean;
}

// --- Entity Types ---

export interface Entity {
  id: string;
  name: string;
  type: 'PERSON' | 'EVENT' | 'FEELING';
  accumulated_context: string;
  media_url?: string;
  relationship?: string; // For people
  created_at: string;
  updated_at: string;
}

export interface EntityInteraction {
  id: string;
  entity_id: string;
  date: string;
  snippet: string;
  sentiment: number; // 0-1 scale
  journal_entry_id: string;
}

// --- Comic Story Types ---

export enum ComicTone {
  WITTY = 'WITTY',
  SERIOUS = 'SERIOUS',
  NOIR = 'NOIR',
  ANIME = 'ANIME',
  MINIMALIST = 'MINIMALIST'
}

export interface ComicPanel {
  panel_index: number; // 1-6
  narrative_caption: string; // The story text for this panel
  image_generation_prompt: string; // Detailed visual description
  image_url?: string; // Generated image URL (populated after generation)
}

export interface ComicStory {
  id: string;
  journal_entry_id: string;
  tone: ComicTone;
  panels: ComicPanel[];
  created_at: string;
  status: 'GENERATING' | 'COMPLETED' | 'FAILED';
}