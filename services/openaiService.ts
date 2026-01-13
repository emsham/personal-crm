import { ChatMessage, ToolDefinition, ToolCall } from "../types";
import { LLMService, LLMCompletionOptions, LLMStreamChunk, registerLLMService } from "./llmService";

// Cloudflare Worker proxy URL - update this after deploying the worker
const PROXY_URL = import.meta.env.VITE_OPENAI_PROXY_URL || 'https://openai-proxy.YOUR_SUBDOMAIN.workers.dev';

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
  return {
    isAvailable: () => true,

    async complete(options: LLMCompletionOptions): Promise<ChatMessage> {
      const response = await fetch(PROXY_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey,
          messages: formatMessagesForOpenAI(options.messages, options.systemPrompt),
          ...(options.tools && { tools: convertToOpenAITools(options.tools) }),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'OpenAI API error');
      }

      const data = await response.json();
      const choice = data.choices[0];
      const message = choice.message;

      const toolCalls: ToolCall[] = message.tool_calls?.map((tc: { id: string; function: { name: string; arguments: string } }) => ({
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

        const response = await fetch(PROXY_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            apiKey,
            messages: formattedMessages,
            ...(options.tools && { tools: convertToOpenAITools(options.tools) }),
            stream: true,
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
