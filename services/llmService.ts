import { ChatMessage, ToolDefinition, ToolCall, LLMProvider } from '../types';

export interface LLMStreamChunk {
  type: 'text' | 'tool_call' | 'done' | 'error';
  content?: string;
  toolCall?: ToolCall;
  error?: string;
}

export interface LLMCompletionOptions {
  messages: ChatMessage[];
  tools?: ToolDefinition[];
  systemPrompt?: string;
}

export interface LLMService {
  isAvailable(): boolean;
  complete(options: LLMCompletionOptions): Promise<ChatMessage>;
  stream(options: LLMCompletionOptions): AsyncGenerator<LLMStreamChunk>;
}

export interface LLMServiceFactory {
  (apiKey: string): LLMService;
}

// Registry of LLM service factories
const serviceFactories: Record<LLMProvider, LLMServiceFactory | null> = {
  gemini: null,
  openai: null,
};

export function registerLLMService(provider: LLMProvider, factory: LLMServiceFactory): void {
  serviceFactories[provider] = factory;
}

export function createLLMService(provider: LLMProvider, apiKey: string): LLMService | null {
  const factory = serviceFactories[provider];
  if (!factory) {
    console.warn(`LLM provider "${provider}" is not registered`);
    return null;
  }
  return factory(apiKey);
}

export function isProviderRegistered(provider: LLMProvider): boolean {
  return serviceFactories[provider] !== null;
}

// Helper to format messages for different providers
export function formatMessagesForProvider(
  messages: ChatMessage[],
  provider: LLMProvider
): unknown[] {
  return messages.map(msg => {
    if (provider === 'openai') {
      return {
        role: msg.role,
        content: msg.content,
        ...(msg.toolCalls && { tool_calls: msg.toolCalls.map(tc => ({
          id: tc.id,
          type: 'function',
          function: { name: tc.name, arguments: JSON.stringify(tc.arguments) }
        })) }),
        ...(msg.role === 'tool' && msg.toolResults && {
          tool_call_id: msg.toolResults[0]?.toolCallId,
          content: JSON.stringify(msg.toolResults[0]?.result)
        })
      };
    } else {
      // Gemini format
      return {
        role: msg.role === 'assistant' ? 'model' : msg.role,
        parts: [{ text: msg.content }]
      };
    }
  });
}

// Helper to convert tool definitions to provider format
export function formatToolsForProvider(
  tools: ToolDefinition[],
  provider: LLMProvider
): unknown[] {
  if (provider === 'openai') {
    return tools.map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      }
    }));
  } else {
    // Gemini format
    return tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters
    }));
  }
}
