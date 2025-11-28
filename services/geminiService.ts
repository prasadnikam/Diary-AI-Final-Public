import { GoogleGenAI, Type, Schema, Chat, Modality, VideoGenerationReferenceImage, VideoGenerationReferenceType } from "@google/genai";
import { Task, JournalEntry, FeedPost, ContentGenerationConfig, Place, Trip, FriendProfile } from "../types";

// --- DYNAMIC CLIENT HELPER ---
// This replaces the static 'const ai = ...' initialization
const getGenAI = () => {
  // 1. Try Local Storage (User Settings)
  const localKey = localStorage.getItem('GEMINI_API_KEY');
  // 2. Fallback to Environment Variable (Dev)
  const apiKey = localKey || process.env.API_KEY;

  if (!apiKey) {
    throw new Error("API Key missing. Please go to Settings and enter your Gemini API Key.");
  }

  return new GoogleGenAI({ apiKey });
};

// Constants
const modelId = 'gemini-2.5-flash';
const imageModelId = 'gemini-2.5-flash-image';
const ttsModelId = 'gemini-2.5-flash-preview-tts';
const videoModelId = 'veo-3.1-generate-preview';
const fastVideoModelId = 'veo-3.1-fast-generate-preview';

// Helper to convert File to Base64
export const fileToGenerativePart = async (file: File): Promise<{data: string, mimeType: string}> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        const base64String = reader.result.split(',')[1];
        resolve({
          data: base64String,
          mimeType: file.type
        });
      } else {
        reject(new Error("Failed to read file"));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

export const analyzeJournalEntry = async (text: string) => {
  if (!text || text.length < 10) return null;

  const prompt = `Analyze this journal entry. Provide a brief supportive reflection, a sentiment summary, and suggested tags.
  Entry: "${text}"`;

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      sentiment: { type: Type.STRING, description: "One word sentiment (e.g., Happy, Anxious, Reflective)" },
      reflection: { type: Type.STRING, description: "A 2-3 sentence supportive or philosophical reflection on the entry." },
      tags: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3-5 relevant generic tags" }
    },
    required: ["sentiment", "reflection", "tags"]
  };

  try {
    // Get client dynamically
    const ai = getGenAI(); 
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        systemInstruction: "You are an empathetic, wise, and supportive AI companion for a student's diary app."
      }
    });

    const jsonText = response.text;
    if (!jsonText) return null;
    return JSON.parse(jsonText);
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    // Don't throw if it's just a missing key, let UI handle null
    if (error instanceof Error && error.message.includes("API Key")) {
        alert(error.message);
        return null;
    }
    throw error;
  }
};

export const generateStudyPlan = async (goal: string, timeAvailable: string, file?: File): Promise<Task[]> => {
  let prompt = `Create a concrete list of study tasks for the following goal: "${goal}". Time available: ${timeAvailable}.`;
  
  const contents: any[] = [];
  
  if (file) {
    try {
      const filePart = await fileToGenerativePart(file);
      contents.push({
        inlineData: {
          mimeType: filePart.mimeType,
          data: filePart.data
        }
      });
      prompt += " Use the attached document as the primary source material for the study tasks.";
    } catch (e) {
      console.error("Error processing file for plan", e);
    }
  }

  contents.push({ text: prompt });

  const schema: Schema = {
    type: Type.OBJECT,
    properties: {
      tasks: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            priority: { type: Type.STRING, enum: ["HIGH", "MEDIUM", "LOW"] },
            subject: { type: Type.STRING }
          },
          required: ["title", "priority", "subject"]
        }
      }
    }
  };

  try {
    const ai = getGenAI();
    const response = await ai.models.generateContent({
      model: modelId,
      contents: { parts: contents },
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
        systemInstruction: "You are a master study planner. Break down goals into actionable, bite-sized tasks. If a document is provided, base the tasks specifically on its content."
      }
    });

    const jsonText = response.text;
    if (!jsonText) return [];
    
    const data = JSON.parse(jsonText);
    return data.tasks.map((t: any, idx: number) => ({
      id: `generated-${Date.now()}-${idx}`,
      title: t.title,
      priority: t.priority,
      subject: t.subject,
      completed: false
    }));
  } catch (error) {
    console.error("Gemini Plan Error:", error);
    if (error instanceof Error && error.message.includes("API Key")) {
        alert(error.message);
    }
    return [];
  }
};

export const createStudyChat = async (file?: File): Promise<Chat> => {
  const ai = getGenAI();
  const history = [];

  // If a file is provided, prime the chat with it
  if (file) {
    const filePart = await fileToGenerativePart(file);
    history.push({
      role: 'user',
      parts: [
        { 
          inlineData: { 
            mimeType: filePart.mimeType, 
            data: filePart.data 
          } 
        },
        { text: "I have uploaded this document. Please help me study it. Answer my questions and help me understand the key concepts." }
      ]
    });
    history.push({
      role: 'model',
      parts: [{ text: "I've analyzed the document. I'm ready to help you study! What would you like to know?" }]
    });
  }

  return ai.chats.create({
    model: modelId,
    history: history,
    config: {
      systemInstruction: "You are a helpful and knowledgeable study tutor. When a document is provided, answer questions based strictly on that document. Be concise, encouraging, and clear."
    }
  });
};

export const createFriendChat = async (friend: FriendProfile): Promise<Chat> => {
  const ai = getGenAI();
  return ai.chats.create({
    model: modelId,
    config: {
      systemInstruction: `You are ${friend.name}.
      Personality: ${friend.personality}
      Context/Shared Memory: ${friend.context}
      
      Act exactly like this person. Be conversational, empathetic, and stay in character. 
      Keep responses relatively short and natural like a text message, unless asked for deep advice.`
    }
  });
};

export const generateStoryAudio = async (text: string, mood: string): Promise<string | undefined> => {
  try {
    const ai = getGenAI();
    const prompt = `Retell the following diary entry as a short, first-person audio story. Match the tone to the mood: ${mood}. Keep it under 45 seconds. Entry: "${text}"`;
    
    const response = await ai.models.generateContent({
      model: ttsModelId,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  } catch (e) {
    console.error("TTS Generation Error", e);
    return undefined;
  }
};

export const generateFeedPostFromEntry = async (entry: JournalEntry, config: ContentGenerationConfig): Promise<FeedPost | null> => {
  try {
    const ai = getGenAI();
    let caption = "";
    
    // 1. Generate Caption & Prompts first
    const promptResponse = await ai.models.generateContent({
      model: modelId,
      contents: `Analyze this diary entry.
      User Preferences:
      - Art Style: ${config.artStyle}
      - Tone: ${config.captionTone}
      - Format: ${config.outputFormat}

      Create a prompt that reflects the mood and content.
      If format is VIDEO, write a prompt for a cinematic video scene.
      If format is IMAGE, write a prompt for an AI image generator.
      Also write a short, instagram-style caption in the requested tone.
      
      Entry: "${entry.content}"
      Mood: ${entry.mood}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            visualPrompt: { type: Type.STRING },
            caption: { type: Type.STRING }
          },
          required: ["visualPrompt", "caption"]
        }
      }
    });
    const promptData = JSON.parse(promptResponse.text || "{}");
    const visualPrompt = promptData.visualPrompt;
    caption = promptData.caption;

    if (!visualPrompt) return null;

    let imageUrl = '';
    let videoUrl = '';

    // 2. Generate Visuals (Image or Video)
    if (config.outputFormat === 'VIDEO') {
        // We use the same dynamic key logic for video
        // Note: 'videoAi' variable in original code is redundant if we use getGenAI()
        const videoAi = getGenAI();
        
        // ... (rest of video logic remains similar, just use videoAi) ...
        const referenceImages: VideoGenerationReferenceImage[] = [];
        const imageAttachments = entry.attachments.filter(a => a.type === 'image').slice(0, 3);
        
        for (const att of imageAttachments) {
            const base64Data = att.url.split(',')[1];
            const mimeType = att.url.split(';')[0].split(':')[1];
            referenceImages.push({
                image: { imageBytes: base64Data, mimeType: mimeType },
                referenceType: VideoGenerationReferenceType.ASSET
            });
        }

        let operation;
        if (referenceImages.length > 0) {
            operation = await videoAi.models.generateVideos({
                model: videoModelId,
                prompt: visualPrompt + " Animate the characters and environment from the reference images to match the story.",
                config: {
                    referenceImages: referenceImages,
                    numberOfVideos: 1,
                    resolution: '720p',
                    aspectRatio: '16:9'
                }
            });
        } else {
             operation = await videoAi.models.generateVideos({
                model: fastVideoModelId,
                prompt: visualPrompt,
                config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' }
             });
        }

        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 5000));
            operation = await videoAi.operations.getVideosOperation({operation: operation});
        }

        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (downloadLink) {
             // We need to fetch with the API Key
             // Important: getGenAI doesn't expose the key string directly easily, so we re-fetch it
             const currentKey = localStorage.getItem('GEMINI_API_KEY') || process.env.API_KEY;
             const videoRes = await fetch(`${downloadLink}&key=${currentKey}`);
             const blob = await videoRes.blob();
             videoUrl = URL.createObjectURL(blob);
        }

    } else {
        // IMAGE GENERATION (Standard)
        const parts: any[] = [];
        let finalPrompt = visualPrompt + ", high quality, digital art, 4k";

        if (config.artStyle === "Comic Book") {
             finalPrompt += ", comic book style, graphic novel aesthetic, detailed linework, vibrant colors, multi-panel layout";
        }

        const imageAttachments = entry.attachments.filter(a => a.type === 'image').slice(0, 3);
        for (const att of imageAttachments) {
             parts.push({
                 inlineData: {
                     mimeType: att.url.split(';')[0].split(':')[1],
                     data: att.url.split(',')[1]
                 }
             });
        }
        
        if (imageAttachments.length > 0) {
             finalPrompt += " Use the attached images as character references and visual style guides for the generation.";
        }

        parts.push({ text: finalPrompt });

        const imageResponse = await ai.models.generateContent({
            model: imageModelId,
            contents: { parts },
            config: {
              imageConfig: {
                aspectRatio: config.artStyle === "Comic Book" ? "16:9" : "1:1"
              }
            }
        });

        for (const part of imageResponse.candidates?.[0]?.content?.parts || []) {
          if (part.inlineData) {
            imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            break;
          }
        }
    }

    // 3. Generate Audio (Optional)
    const audioPromise = config.includeAudio 
      ? generateStoryAudio(entry.content, entry.mood) 
      : Promise.resolve(undefined);

    const audioData = await audioPromise;

    if (!imageUrl && !videoUrl) return null;

    return {
      id: `post-${Date.now()}`,
      entryId: entry.id,
      imageUrl,
      videoUrl,
      caption: caption,
      likes: 0,
      isLiked: false,
      timestamp: new Date().toISOString(),
      moodTag: entry.mood,
      audioData 
    };

  } catch (e) {
    console.error("Feed Generation Error", e);
    if (e instanceof Error && e.message.includes("API Key")) {
        alert(e.message);
    }
    return null;
  }
};

// --- Travel Features ---

export const extractTravelIntent = async (entries: JournalEntry[]): Promise<string[]> => {
  if (entries.length === 0) return [];
  const text = entries.slice(-3).map(e => e.content).join("\n");
  const prompt = `Analyze these diary entries and identify any travel intents... (rest of prompt) ... Entries: "${text}"`;

  try {
     const ai = getGenAI();
     const response = await ai.models.generateContent({
       model: modelId,
       contents: prompt,
       config: {
         responseMimeType: "application/json",
         responseSchema: {
           type: Type.OBJECT,
           properties: {
             destinations: { type: Type.ARRAY, items: { type: Type.STRING } }
           },
           required: ["destinations"]
         }
       }
     });
     
     const data = JSON.parse(response.text || "{}");
     return data.destinations || [];
  } catch (e) {
    console.error("Travel Intent Error", e);
    return [];
  }
};

export const getTravelRecommendations = async (destination: string): Promise<Trip | null> => {
  try {
    const ai = getGenAI();
    // Parallel Request: Get Content + Get Image
    const textPromise = ai.models.generateContent({
      model: modelId,
      contents: `Plan a travel itinerary for ${destination}. 
      Provide a structured Markdown description of the vibe, best time to visit, and a day-by-day highlight.
      Then, use the Google Maps tool to find 4-5 specific top-rated places to visit (attractions, restaurants, etc).`,
      config: {
        tools: [{ googleMaps: {} }]
      }
    });

    const imagePromise = ai.models.generateContent({
        model: imageModelId,
        contents: {
            parts: [{ text: `A cinematic, high-quality travel photography shot of ${destination}, golden hour, wide angle, 4k, travel magazine style, breathtaking view` }]
        },
        config: { imageConfig: { aspectRatio: "16:9" } } 
    });

    const [textResponse, imageResponse] = await Promise.all([textPromise, imagePromise]);

    const places: Place[] = [];
    const groundingChunks = textResponse.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    for (const chunk of groundingChunks) {
        if (chunk.web) {
             places.push({
                 title: chunk.web.title || "Unknown Place",
                 uri: chunk.web.uri || "#",
             });
        }
    }
    
    let imageUrl = '';
    for (const part of imageResponse.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        break;
      }
    }
    
    return {
      id: `trip-${Date.now()}`,
      destination: destination,
      description: textResponse.text || `A trip plan for ${destination}`,
      places: places,
      status: 'PLANNED',
      imageUrl: imageUrl
    };

  } catch (e) {
    console.error("Travel Rec Error", e);
    return null;
  }
};