import { GoogleGenAI, Type, Schema } from "@google/genai";
import { JournalEntry, ComicPanel, ComicStory, ComicTone } from "../types";

// Initialize Gemini
const getAI = () => {
    const apiKey = localStorage.getItem('GEMINI_API_KEY') || "AIzaSyAzsSzKmxEKA4y1lAYnKXpfJFxmj9HsGbY";
    return new GoogleGenAI({ apiKey });
};

const modelId = 'gemini-2.5-flash';
const imageModelId = 'gemini-2.5-flash-image';

/**
 * The AI Director: Analyzes journal entry and creates 6-panel comic story structure
 * This is the core "prompt engineering" logic for comic generation
 */
export const generateComicPanels = async (
    entry: JournalEntry,
    tone: ComicTone
): Promise<ComicPanel[]> => {
    const ai = getAI();

    // Extract metadata for context
    const mood = entry.mood;
    const tags = entry.tags.join(', ');
    const content = entry.content.replace(/<[^>]*>/g, ''); // Strip HTML

    // Tone-specific style instructions
    const toneInstructions = {
        [ComicTone.WITTY]: "Use humor, exaggeration, and playful visual metaphors. Think comic strip style with expressive characters.",
        [ComicTone.SERIOUS]: "Use realistic, cinematic visuals. Focus on emotional depth and dramatic lighting.",
        [ComicTone.NOIR]: "Black and white, high contrast, dramatic shadows, film noir aesthetic. Moody and atmospheric.",
        [ComicTone.ANIME]: "Anime/manga style with expressive eyes, dynamic poses, and vibrant colors. Include speed lines and emotion effects.",
        [ComicTone.MINIMALIST]: "Simple, clean lines, limited color palette, focus on essential elements. Geometric and abstract."
    };

    const systemPrompt = `You are a master comic book director and visual storyteller. Your job is to transform diary entries into compelling 6-panel comic stories.

CRITICAL RULES:
1. You MUST create EXACTLY 6 panels - no more, no less
2. Each panel must advance the narrative (Beginning → Rising Action → Climax → Resolution)
3. Maintain CHARACTER CONSISTENCY across all panels - describe the same protagonist appearance in every panel
4. Each image prompt must be HIGHLY DETAILED and VISUAL (not abstract)
5. Style: ${toneInstructions[tone]}
6. Keep narrative captions SHORT (1-2 sentences max per panel)

VISUAL CONSISTENCY GUIDELINES:
- Define the protagonist's appearance once and reference it in EVERY panel
- Use consistent clothing, hair color, distinctive features
- Maintain consistent art style and color palette
- Use consistent setting/environment when applicable`;

    const userPrompt = `Transform this diary entry into a 6-panel comic story.

DIARY ENTRY:
${content}

METADATA:
- Mood: ${mood}
- Tags: ${tags}
- Tone: ${tone}

Create a narrative arc with exactly 6 panels. For each panel provide:
1. panel_index (1-6)
2. narrative_caption: The story text (like a comic caption box)
3. image_generation_prompt: Extremely detailed visual description for AI image generation

Remember: Maintain visual consistency! Describe the same character in each panel.`;

    const schema: Schema = {
        type: Type.OBJECT,
        properties: {
            character_description: {
                type: Type.STRING,
                description: "A detailed description of the main character's appearance to maintain consistency across all panels"
            },
            panels: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        panel_index: {
                            type: Type.NUMBER,
                            description: "Panel number from 1 to 6"
                        },
                        narrative_caption: {
                            type: Type.STRING,
                            description: "The story text for this panel, like a comic caption"
                        },
                        image_generation_prompt: {
                            type: Type.STRING,
                            description: "Highly detailed visual description for image generation, including character appearance, setting, action, mood, and art style"
                        }
                    },
                    required: ["panel_index", "narrative_caption", "image_generation_prompt"]
                }
            }
        },
        required: ["character_description", "panels"]
    };

    try {
        const response = await ai.models.generateContent({
            model: modelId,
            contents: userPrompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
                systemInstruction: systemPrompt,
                temperature: 0.9, // Higher creativity for storytelling
            }
        });

        const jsonText = response.text;
        if (!jsonText) throw new Error("No response from Gemini");

        const data = JSON.parse(jsonText);

        // Validate we got exactly 6 panels
        if (!data.panels || data.panels.length !== 6) {
            throw new Error(`Expected 6 panels, got ${data.panels?.length || 0}`);
        }

        // Enhance each prompt with character consistency
        const characterDesc = data.character_description;
        const enhancedPanels: ComicPanel[] = data.panels.map((panel: any) => ({
            panel_index: panel.panel_index,
            narrative_caption: panel.narrative_caption,
            image_generation_prompt: `${panel.image_generation_prompt} [Character: ${characterDesc}] [Style: ${tone}]`
        }));

        return enhancedPanels;

    } catch (error) {
        console.error("Comic Panel Generation Error:", error);
        throw error;
    }
};

/**
 * Mock Image Generation Function
 * In production, this would call DALL-E 3, Stable Diffusion, or similar
 * For now, we'll use Gemini's image generation as a placeholder
 */
export const generateImageFromPrompt = async (prompt: string): Promise<string> => {
    const ai = getAI();

    try {
        const response = await ai.models.generateContent({
            model: imageModelId,
            contents: {
                parts: [{ text: prompt + ", high quality, detailed, professional comic art, 4k" }]
            },
            config: {
                imageConfig: {
                    aspectRatio: "4:5" // Instagram-style portrait
                }
            }
        });

        // Extract image data
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
            }
        }

        throw new Error("No image generated");

    } catch (error) {
        console.error("Image Generation Error:", error);
        // Return a placeholder image
        return `https://placehold.co/400x500/6366f1/white?text=Panel+${Math.random().toString().slice(2, 4)}`;
    }
};

/**
 * Generate complete comic story with images
 * This orchestrates the entire pipeline
 */
export const generateCompleteComicStory = async (
    entry: JournalEntry,
    tone: ComicTone,
    onProgress?: (progress: number, message: string) => void
): Promise<ComicStory> => {
    try {
        // Step 1: Generate panel structure (10%)
        onProgress?.(10, "Analyzing your story...");
        const panels = await generateComicPanels(entry, tone);

        // Step 2: Generate images for each panel (10% -> 90%)
        onProgress?.(20, "Creating comic panels...");

        const panelsWithImages: ComicPanel[] = [];
        for (let i = 0; i < panels.length; i++) {
            const panel = panels[i];
            const progress = 20 + ((i + 1) / panels.length) * 70; // 20% to 90%
            onProgress?.(progress, `Generating panel ${i + 1} of 6...`);

            const imageUrl = await generateImageFromPrompt(panel.image_generation_prompt);
            panelsWithImages.push({
                ...panel,
                image_url: imageUrl
            });
        }

        // Step 3: Create comic story object (100%)
        onProgress?.(100, "Comic story complete!");

        const comicStory: ComicStory = {
            id: `comic-${Date.now()}`,
            journal_entry_id: entry.id,
            tone,
            panels: panelsWithImages,
            created_at: new Date().toISOString(),
            status: 'COMPLETED'
        };

        return comicStory;

    } catch (error) {
        console.error("Complete Comic Generation Error:", error);
        throw error;
    }
};
