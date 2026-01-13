import { ChatMessage, ToolDefinition, ToolCall } from "../types";
import { LLMService, LLMCompletionOptions, LLMStreamChunk, registerLLMService } from "./llmService";
import { getFunctions, httpsCallable } from "firebase/functions";
import { auth } from "./firebase";

// Get the Firebase Functions region - update this if you deploy to a different region
const functions = getFunctions(undefined, 'us-central1');

// Get the project ID from Firebase config for the streaming endpoint URL
const getStreamProxyUrl = (): string => {
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  return `https://us-central1-${projectId}.cloudfunctions.net/openaiStreamProxy`;
};

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: {
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }[];
  tool_call_id?: string;
}

function formatMessagesForOpenAI(messages: ChatMessage[], systemPrompt?: string): OpenAIMessage[] {
  const formatted: OpenAIMessage[] = [];

  if (systemPrompt) {
    formatted.push({ role: 'system', content: systemPrompt });
  }

  // First pass: identify which tool calls have responses
  const toolCallsWithResponses = new Set<string>();
  for (const msg of messages) {
    if (msg.role === 'tool' && msg.toolResults) {
      for (const result of msg.toolResults) {
        toolCallsWithResponses.add(result.toolCallId);
      }
    }
  }

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];

    if (msg.role === 'user') {
      formatted.push({ role: 'user', content: msg.content });
    } else if (msg.role === 'assistant') {
      // Check if this message has tool calls
      if (msg.toolCalls && msg.toolCalls.length > 0) {
        // Filter to only include tool calls that have responses
        const validToolCalls = msg.toolCalls.filter(tc => toolCallsWithResponses.has(tc.id));

        if (validToolCalls.length === 0) {
          // No valid tool calls - just include as text message without tool_calls
          // This handles broken/incomplete tool call sequences
          if (msg.content) {
            formatted.push({ role: 'assistant', content: msg.content });
          }
          continue;
        }

        const assistantMsg: OpenAIMessage = { role: 'assistant', content: msg.content || null };
        assistantMsg.tool_calls = validToolCalls.map(tc => ({
          id: tc.id,
          type: 'function' as const,
          function: {
            name: tc.name,
            arguments: JSON.stringify(tc.arguments)
          }
        }));
        formatted.push(assistantMsg);
      } else {
        formatted.push({ role: 'assistant', content: msg.content || null });
      }
    } else if (msg.role === 'tool' && msg.toolResults) {
      for (const result of msg.toolResults) {
        // OpenAI tool messages only need role, content, and tool_call_id
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

function convertToOpenAITools(tools: ToolDefinition[]): unknown[] {
  return tools.map(tool => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }
  }));
}

export function createOpenAIService(apiKey: string): LLMService {
  const openaiProxy = httpsCallable<{
    apiKey: string;
    messages: OpenAIMessage[];
    tools?: unknown[];
  }, { choices: Array<{ message: { content: string | null; tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }> } }> }>(functions, 'openaiProxy');

  return {
    isAvailable: () => true,

    async complete(options: LLMCompletionOptions): Promise<ChatMessage> {
      const result = await openaiProxy({
        apiKey,
        messages: formatMessagesForOpenAI(options.messages, options.systemPrompt),
        ...(options.tools && { tools: convertToOpenAITools(options.tools) }),
      });

      const data = result.data;
      const choice = data.choices[0];
      const message = choice.message;

      const toolCalls: ToolCall[] = message.tool_calls?.map((tc: any) => ({
        id: tc.id,
        name: tc.function.name,
        arguments: JSON.parse(tc.function.arguments || '{}')
      })) || [];

      return {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: message.content || '',
        timestamp: new Date(),
        ...(toolCalls.length > 0 && { toolCalls })
      };
    },

    async *stream(options: LLMCompletionOptions): AsyncGenerator<LLMStreamChunk> {
      try {
        const formattedMessages = formatMessagesForOpenAI(options.messages, options.systemPrompt);

        // Get the Firebase ID token for authentication
        const user = auth.currentUser;
        if (!user) {
          yield { type: 'error', error: 'User not authenticated' };
          return;
        }
        const idToken = await user.getIdToken();

        const response = await fetch(getStreamProxyUrl(), {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            apiKey,
            messages: formattedMessages,
            ...(options.tools && { tools: convertToOpenAITools(options.tools) }),
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          yield { type: 'error', error: error.error?.message || 'OpenAI API error' };
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          yield { type: 'error', error: 'No response body' };
          return;
        }

        const decoder = new TextDecoder();
        let buffer = '';
        const toolCallBuffers: Map<number, { id: string; name: string; arguments: string }> = new Map();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                // Emit completed tool calls
                for (const tc of toolCallBuffers.values()) {
                  try {
                    yield {
                      type: 'tool_call',
                      toolCall: {
                        id: tc.id,
                        name: tc.name,
                        arguments: JSON.parse(tc.arguments || '{}')
                      }
                    };
                  } catch {
                    // Invalid JSON in arguments
                  }
                }
                yield { type: 'done' };
                return;
              }

              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta;

                if (delta?.content) {
                  yield { type: 'text', content: delta.content };
                }

                if (delta?.tool_calls) {
                  for (const tc of delta.tool_calls) {
                    const index = tc.index;
                    if (!toolCallBuffers.has(index)) {
                      toolCallBuffers.set(index, { id: tc.id || '', name: '', arguments: '' });
                    }
                    const tcBuffer = toolCallBuffers.get(index)!;
                    if (tc.id) tcBuffer.id = tc.id;
                    if (tc.function?.name) tcBuffer.name = tc.function.name;
                    if (tc.function?.arguments) tcBuffer.arguments += tc.function.arguments;
                  }
                }
              } catch {
                // Skip invalid JSON
              }
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

// Register OpenAI service factory
registerLLMService('openai', createOpenAIService);
