import { GoogleGenAI, Type } from "@google/genai";
import { Contact, Interaction, ChatMessage, ToolDefinition, ToolCall } from "../types";
import { LLMService, LLMCompletionOptions, LLMStreamChunk, registerLLMService } from "./llmService";

const envApiKey = import.meta.env.VITE_GEMINI_API_KEY;

// Only initialize if API key is available (for legacy usage)
const ai = envApiKey ? new GoogleGenAI({ apiKey: envApiKey }) : null;

export const isGeminiAvailable = () => !!ai;

// Legacy functions for backward compatibility
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

// New LLMService implementation for chat interface
function formatMessagesForGemini(messages: ChatMessage[], systemPrompt?: string): unknown[] {
  const formatted: unknown[] = [];

  // Add system instruction as first user message if provided
  if (systemPrompt) {
    formatted.push({
      role: 'user',
      parts: [{ text: `System Instructions: ${systemPrompt}` }]
    });
    formatted.push({
      role: 'model',
      parts: [{ text: 'I understand. I will follow these instructions.' }]
    });
  }

  for (const msg of messages) {
    if (msg.role === 'user') {
      formatted.push({
        role: 'user',
        parts: [{ text: msg.content }]
      });
    } else if (msg.role === 'assistant') {
      // Check if this message has function calls
      if (msg.toolCalls && msg.toolCalls.length > 0) {
        const parts: unknown[] = [];
        if (msg.content) {
          parts.push({ text: msg.content });
        }
        // Add function calls as parts
        for (const tc of msg.toolCalls) {
          parts.push({
            functionCall: {
              name: tc.name,
              args: tc.arguments
            }
          });
        }
        formatted.push({ role: 'model', parts });
      } else {
        formatted.push({
          role: 'model',
          parts: [{ text: msg.content || '' }]
        });
      }
    } else if (msg.role === 'tool' && msg.toolResults) {
      // Format tool results as function responses for Gemini
      const parts: unknown[] = [];
      for (const result of msg.toolResults) {
        parts.push({
          functionResponse: {
            name: result.name,
            response: result.result
          }
        });
      }
      formatted.push({ role: 'user', parts });
    }
  }

  return formatted;
}

function convertToGeminiTools(tools: ToolDefinition[]): unknown[] {
  return [{
    functionDeclarations: tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: {
        type: 'OBJECT',
        properties: Object.fromEntries(
          Object.entries(tool.parameters.properties).map(([key, value]) => [
            key,
            {
              type: value.type.toUpperCase(),
              description: value.description,
              ...(value.enum && { enum: value.enum }),
              ...(value.items && { items: { type: value.items.type.toUpperCase() } })
            }
          ])
        ),
        required: tool.parameters.required || []
      }
    }))
  }];
}

export function createGeminiService(apiKey: string): LLMService {
  const client = new GoogleGenAI({ apiKey });

  return {
    isAvailable: () => true,

    async complete(options: LLMCompletionOptions): Promise<ChatMessage> {
      const contents = formatMessagesForGemini(options.messages, options.systemPrompt);

      const response = await client.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: contents as any,
        ...(options.tools && { tools: convertToGeminiTools(options.tools) as any })
      });

      const text = response.text || '';
      const functionCalls = (response as any).functionCalls;

      const toolCalls: ToolCall[] = functionCalls?.map((fc: any, index: number) => ({
        id: `call_${Date.now()}_${index}`,
        name: fc.name,
        arguments: fc.args || {}
      })) || [];

      return {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: text,
        timestamp: new Date(),
        ...(toolCalls.length > 0 && { toolCalls })
      };
    },

    async *stream(options: LLMCompletionOptions): AsyncGenerator<LLMStreamChunk> {
      try {
        const contents = formatMessagesForGemini(options.messages, options.systemPrompt);

        const response = await client.models.generateContentStream({
          model: 'gemini-2.0-flash',
          contents: contents as any,
          ...(options.tools && { tools: convertToGeminiTools(options.tools) as any })
        });

        for await (const chunk of response) {
          const text = chunk.text;
          if (text) {
            yield { type: 'text', content: text };
          }

          const functionCalls = (chunk as any).functionCalls;
          if (functionCalls) {
            for (const fc of functionCalls) {
              yield {
                type: 'tool_call',
                toolCall: {
                  id: `call_${Date.now()}`,
                  name: fc.name,
                  arguments: fc.args || {}
                }
              };
            }
          }
        }

        yield { type: 'done' };
      } catch (error) {
        yield {
          type: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  };
}

// Register Gemini service factory
registerLLMService('gemini', createGeminiService);
