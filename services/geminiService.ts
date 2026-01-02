
import { GoogleGenAI, Type } from "@google/genai";
import { Contact, Interaction } from "../types";

// Always initialize with process.env.API_KEY directly.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateFollowUpEmail = async (contact: Contact, context: string) => {
  const prompt = `
    Draft a professional but friendly follow-up email for a contact in my CRM.
    
    Contact: ${contact.firstName} ${contact.lastName} (${contact.position} at ${contact.company})
    CRM Notes: ${contact.notes}
    Additional Context: ${context}
    
    Keep it concise and relationship-focused.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    // The .text property directly returns the generated string.
    return response.text;
  } catch (error) {
    console.error("AI Error:", error);
    return "Error generating content. Please try again.";
  }
};

export const analyzeRelationship = async (contact: Contact, interactions: Interaction[]) => {
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
      // Using gemini-3-pro-preview for complex reasoning task of relationship analysis.
      model: 'gemini-3-pro-preview',
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
    // The simplest and most direct way to get the generated text content is by accessing the .text property.
    const text = response.text;
    return JSON.parse(text || '{}');
  } catch (error) {
    console.error("AI Error:", error);
    return null;
  }
};
