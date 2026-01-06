import { LLMProvider } from '../contexts/LLMSettingsContext';
import { Contact, Task } from '../types';
import {
  LLMStreamChunk,
  ToolCall,
  ToolDefinition,
  ChatMessage as SharedChatMessage,
  CRMData
} from '../shared/ai/types';
import { CRM_TOOLS } from '../shared/ai/toolDefinitions';
import { buildSystemPrompt } from '../shared/ai/systemPrompt';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  toolCalls?: ToolCall[];
  toolResults?: { toolCallId: string; name: string; result: unknown }[];
}

export interface AIServiceOptions {
  provider: LLMProvider;
  apiKey: string;
}

export interface StreamCallbacks {
  onText: (text: string) => void;
  onToolCall: (toolCall: ToolCall) => void;
  onDone: () => void;
  onError: (error: string) => void;
}

// Format messages for OpenAI API
function formatMessagesForOpenAI(
  messages: ChatMessage[],
  systemPrompt: string
): any[] {
  const formatted: any[] = [{ role: 'system', content: systemPrompt }];

  // First pass: identify which tool calls have responses
  const toolCallsWithResponses = new Set<string>();
  for (const msg of messages) {
    if (msg.role === 'tool' && msg.toolResults) {
      for (const result of msg.toolResults) {
        toolCallsWithResponses.add(result.toolCallId);
      }
    }
  }

  for (const msg of messages) {
    if (msg.role === 'user') {
      formatted.push({ role: 'user', content: msg.content });
    } else if (msg.role === 'assistant') {
      if (msg.toolCalls && msg.toolCalls.length > 0) {
        const validToolCalls = msg.toolCalls.filter(tc => toolCallsWithResponses.has(tc.id));
        if (validToolCalls.length === 0) {
          if (msg.content) {
            formatted.push({ role: 'assistant', content: msg.content });
          }
          continue;
        }
        formatted.push({
          role: 'assistant',
          content: msg.content || null,
          tool_calls: validToolCalls.map(tc => ({
            id: tc.id,
            type: 'function',
            function: {
              name: tc.name,
              arguments: JSON.stringify(tc.arguments)
            }
          }))
        });
      } else {
        formatted.push({ role: 'assistant', content: msg.content || null });
      }
    } else if (msg.role === 'tool' && msg.toolResults) {
      for (const result of msg.toolResults) {
        formatted.push({
          role: 'tool',
          content: typeof result.result === 'string' ? result.result : JSON.stringify(result.result),
          tool_call_id: result.toolCallId
        });
      }
    }
  }

  return formatted;
}

// Format messages for Gemini API
function formatMessagesForGemini(
  messages: ChatMessage[],
  systemPrompt: string
): any[] {
  const formatted: any[] = [];

  // Add system instruction as first exchange
  formatted.push({
    role: 'user',
    parts: [{ text: `System Instructions: ${systemPrompt}` }]
  });
  formatted.push({
    role: 'model',
    parts: [{ text: 'I understand. I will follow these instructions.' }]
  });

  for (const msg of messages) {
    if (msg.role === 'user') {
      formatted.push({
        role: 'user',
        parts: [{ text: msg.content }]
      });
    } else if (msg.role === 'assistant') {
      if (msg.toolCalls && msg.toolCalls.length > 0) {
        const parts: any[] = [];
        if (msg.content) {
          parts.push({ text: msg.content });
        }
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
      const parts: any[] = [];
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

// Convert tool definitions to OpenAI format
function convertToOpenAITools(tools: ToolDefinition[]): any[] {
  return tools.map(tool => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }
  }));
}

// Convert tool definitions to Gemini format
function convertToGeminiTools(tools: ToolDefinition[]): any[] {
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
              type: (value.type as string).toUpperCase(),
              description: value.description,
              ...(value.enum && { enum: value.enum }),
              ...(value.items && { items: { type: (value.items.type as string).toUpperCase() } })
            }
          ])
        ),
        required: tool.parameters.required || []
      }
    }))
  }];
}

// Non-streaming OpenAI call with tool support (React Native compatible)
export async function streamOpenAI(
  apiKey: string,
  messages: ChatMessage[],
  systemPrompt: string,
  callbacks: StreamCallbacks,
  signal?: AbortSignal
): Promise<void> {
  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: formatMessagesForOpenAI(messages, systemPrompt),
        tools: convertToOpenAITools(CRM_TOOLS),
        max_tokens: 2000,
      }),
      signal,
    });

    if (!response.ok) {
      const error = await response.json();
      callbacks.onError(error.error?.message || 'OpenAI API error');
      return;
    }

    const data = await response.json();
    const choice = data.choices?.[0];
    const message = choice?.message;

    if (!message) {
      callbacks.onError('No response from OpenAI');
      return;
    }

    // Emit text content
    if (message.content) {
      callbacks.onText(message.content);
    }

    // Emit tool calls
    if (message.tool_calls && message.tool_calls.length > 0) {
      for (const tc of message.tool_calls) {
        try {
          callbacks.onToolCall({
            id: tc.id,
            name: tc.function.name,
            arguments: JSON.parse(tc.function.arguments || '{}')
          });
        } catch {
          // Invalid JSON in arguments
        }
      }
    }

    callbacks.onDone();
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      callbacks.onDone();
    } else {
      callbacks.onError(error instanceof Error ? error.message : 'Unknown error');
    }
  }
}

// Non-streaming Gemini call with tool support (React Native compatible)
export async function streamGemini(
  apiKey: string,
  messages: ChatMessage[],
  systemPrompt: string,
  callbacks: StreamCallbacks,
  signal?: AbortSignal
): Promise<void> {
  try {
    // Use non-streaming endpoint for React Native compatibility
    // API key passed in header (not URL) for security - prevents logging in network traces
    const response = await fetch(`${GEMINI_API_URL}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: formatMessagesForGemini(messages, systemPrompt),
        tools: convertToGeminiTools(CRM_TOOLS),
        generationConfig: {
          maxOutputTokens: 2000,
        },
      }),
      signal,
    });

    if (!response.ok) {
      const error = await response.json();
      callbacks.onError(error.error?.message || 'Gemini API error');
      return;
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    const parts = candidate?.content?.parts || [];

    if (parts.length === 0) {
      callbacks.onError('No response from Gemini');
      return;
    }

    // Process all parts (text and function calls)
    for (const part of parts) {
      if (part.text) {
        callbacks.onText(part.text);
      }
      if (part.functionCall) {
        callbacks.onToolCall({
          id: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: part.functionCall.name,
          arguments: part.functionCall.args || {}
        });
      }
    }

    callbacks.onDone();
  } catch (error) {
    if ((error as Error).name === 'AbortError') {
      callbacks.onDone();
    } else {
      callbacks.onError(error instanceof Error ? error.message : 'Unknown error');
    }
  }
}

// Non-streaming fallback for compatibility
export async function sendAIMessage(
  userMessage: string,
  conversationHistory: ChatMessage[],
  options: AIServiceOptions,
  contacts: Contact[],
  tasks: Task[]
): Promise<string> {
  const crmData: CRMData = {
    contacts: contacts as any,
    interactions: [],
    tasks: tasks as any,
  };
  const systemPrompt = buildSystemPrompt(crmData);

  const messages: ChatMessage[] = [
    ...conversationHistory,
    { role: 'user', content: userMessage },
  ];

  if (options.provider === 'openai') {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${options.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: formatMessagesForOpenAI(messages, systemPrompt),
        tools: convertToOpenAITools(CRM_TOOLS),
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'OpenAI API error');
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || 'No response';
  } else {
    // API key passed in header (not URL) for security - prevents logging in network traces
    const response = await fetch(`${GEMINI_API_URL}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': options.apiKey,
      },
      body: JSON.stringify({
        contents: formatMessagesForGemini(messages, systemPrompt),
        tools: convertToGeminiTools(CRM_TOOLS),
        generationConfig: {
          maxOutputTokens: 2000,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Gemini API error');
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response';
  }
}

// Build system prompt for CRM context
export function buildCRMSystemPrompt(contacts: Contact[], tasks: Task[]): string {
  const crmData: CRMData = {
    contacts: contacts as any,
    interactions: [],
    tasks: tasks as any,
  };
  return buildSystemPrompt(crmData);
}

// Export tools for use in chat
export { CRM_TOOLS };

export function getSuggestions(): { text: string; icon: string }[] {
  return [
    { text: "Who needs my attention?", icon: "account-alert" },
    { text: "Show my high priority tasks", icon: "flag" },
    { text: "Give me a CRM overview", icon: "chart-line" },
    { text: "Suggest follow-ups", icon: "message-text" },
  ];
}
