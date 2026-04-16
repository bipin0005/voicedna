import { GoogleGenAI, Type } from "@google/genai";
import { StyleProfile } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function analyzeStyle(texts: string[]): Promise<StyleProfile> {
  const combinedText = texts.join("\n\n---\n\n");
  
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview", // Using a stable model for analysis
    contents: [
      {
        role: "user",
        parts: [{
          text: `Perform a deep forensic analysis of the following writing samples to create a unique "Voice DNA" profile. 

          ANALYZE THE FOLLOWING DIMENSIONS:
          1. Sentence Structure: Do they use fragments? Run-ons? Complex subordinating clauses? What is the average sentence length?
          2. Vocabulary Level: Is it academic, colloquial, punchy, or flowery? Are there specific words they over-use?
          3. Tone/Mood: Is it cynical, optimistic, authoritative, or gentle?
          4. Transition Words: How do they move between ideas? (e.g., "But here's the thing," "Consequently," "So,")
          5. Quirks/Signature Phrasing: Any unique idioms, punctuation habits (like frequent em-dashes), or rhetorical questions?
          6. Burstiness: Scale 0-1. (0 = all sentences are the same length, 1 = extreme variation between short and long sentences).
          7. Perplexity: Scale 0-1. (0 = highly predictable/cliché, 1 = highly original/uncommon word choices).

          Output the result as a structured JSON object:
          {
            "sentenceStructure": "Detailed description of syntax patterns",
            "vocabularyLevel": "Description of word choice habits",
            "tone": "Primary and secondary emotional tones",
            "transitionWords": ["word1", "word2", ...],
            "quirks": ["quirk1", "quirk2", ...],
            "burstiness": number,
            "perplexity": number
          }

          SAMPLES TO ANALYZE:
          "${combinedText}"`
        }]
      }
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          sentenceStructure: { type: Type.STRING },
          vocabularyLevel: { type: Type.STRING },
          tone: { type: Type.STRING },
          transitionWords: { type: Type.ARRAY, items: { type: Type.STRING } },
          quirks: { type: Type.ARRAY, items: { type: Type.STRING } },
          burstiness: { type: Type.NUMBER },
          perplexity: { type: Type.NUMBER }
        },
        required: ["sentenceStructure", "vocabularyLevel", "tone", "transitionWords", "quirks", "burstiness", "perplexity"]
      }
    }
  });

  const result = JSON.parse(response.text);
  return {
    ...result,
    id: crypto.randomUUID(),
    name: "My Voice DNA",
    createdAt: Date.now()
  };
}

export async function humanizeText(text: string, profile: StyleProfile): Promise<string> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [
      {
        role: "user",
        parts: [{
          text: `REWRITE the following text using the provided Style Profile. 

          USER STYLE PROFILE:
          - Sentence Structure: ${profile.sentenceStructure}
          - Vocabulary Level: ${profile.vocabularyLevel}
          - Tone: ${profile.tone}
          - Signature Transition Words: ${profile.transitionWords.join(", ")}
          - Unique Phrasing/Quirks: ${profile.quirks.join(", ")}
          - Burstiness Score: ${profile.burstiness} (0=uniform, 1=highly varied sentence lengths)
          - Perplexity Score: ${profile.perplexity} (0=predictable, 1=creative/uncommon word choices)

          INSTRUCTIONS:
          1. Do NOT simply edit the original text. REWRITE it completely in the user's voice.
          2. If the user has high burstiness, mix very short sentences with long, complex ones.
          3. Use the signature transition words and quirks naturally.
          4. Ensure the output feels like a human wrote it, not an AI.
          5. The output MUST be significantly different from the input in terms of rhythm and word choice, while preserving the original meaning.

          TEXT TO REWRITE:
          "${text}"`
        }]
      }
    ],
    config: {
      systemInstruction: "You are a world-class ghostwriter and style mimic. Your goal is to take AI-generated text and transform it so it perfectly matches a specific human's writing style profile. You prioritize rhythm, personality, and human-like 'imperfections' or quirks over robotic clarity.",
      temperature: 0.9,
    }
  });

  return response.text;
}
