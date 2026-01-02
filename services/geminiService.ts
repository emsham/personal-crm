
import { GoogleGenAI, Type } from "@google/genai";
import { Contact, Interaction } from "../types";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

// Only initialize if API key is available
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

export const isGeminiAvailable = () => !!ai;

export const generateFollowUpEmail = async (contact: Contact, context: string) => {
  if (!ai) {
    return "AI features unavailable. Add VITE_GEMINI_API_KEY to your .env file to enable.";
  }

  const prompt = `
    Draft a professional but friendly follow-up email for a contact in my CRM.

    Contact: ${contact.firstName} ${contact.lastName} (${contact.position} at ${contact.company})
    CRM Notes: ${contact.notes}
    Additional Context: ${context}

    Keep it concise and relationship-focused.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("AI Error:", error);
    return "Error generating content. Please try again.";
  }
};

export const analyzeRelationship = async (contact: Contact, interactions: Interaction[]) => {
  if (!ai) {
    return null;
  }

  const interactionSummary = interactions
    .map(i => `- ${i.date}: ${i.type} - ${i.notes}`)
    .join('\n');

  const prompt = `
    Analyze my relationship with this contact based on the following details and provide a brief status summary and 2-3 specific "next steps" to strengthen the relationship.

    Contact: ${contact.firstName} ${contact.lastName} (${contact.position} at ${contact.company})
    Interactions:
    ${interactionSummary}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            nextSteps: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            healthScore: { type: Type.NUMBER, description: "Relationship health from 1-10" }
          },
          required: ["summary", "nextSteps", "healthScore"]
        }
      }
    });
    const text = response.text;
    return JSON.parse(text || '{}');
  } catch (error) {
    console.error("AI Error:", error);
    return null;
  }
};
