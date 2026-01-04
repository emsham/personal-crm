import { LLMProvider } from '../contexts/LLMSettingsContext';
import { Contact, Task, Interaction } from '../types';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIServiceOptions {
  provider: LLMProvider;
  apiKey: string;
}

function buildSystemPrompt(contacts: Contact[], tasks: Task[]): string {
  const contactsSummary = contacts.slice(0, 20).map(c =>
    `- ${c.firstName} ${c.lastName} (${c.position || 'No position'} at ${c.company || 'No company'}) - Status: ${c.status}${c.tags.length > 0 ? ` - Tags: ${c.tags.join(', ')}` : ''}`
  ).join('\n');

  const tasksSummary = tasks.filter(t => !t.completed).slice(0, 10).map(t =>
    `- ${t.title} (Priority: ${t.priority}${t.dueDate ? `, Due: ${t.dueDate}` : ''})`
  ).join('\n');

  return `You are Nexus AI, a helpful CRM assistant. You help users manage their professional relationships and tasks.

Current CRM Data:

CONTACTS (${contacts.length} total):
${contactsSummary || 'No contacts yet'}

PENDING TASKS (${tasks.filter(t => !t.completed).length} total):
${tasksSummary || 'No pending tasks'}

Quick Stats:
- Active contacts: ${contacts.filter(c => c.status === 'active').length}
- Contacts needing attention: ${contacts.filter(c => c.status === 'drifting').length}
- Pending tasks: ${tasks.filter(t => !t.completed).length}
- Overdue tasks: ${tasks.filter(t => !t.completed && t.dueDate && new Date(t.dueDate) < new Date()).length}

Help the user with questions about their network, suggest follow-ups, and provide insights. Be concise and helpful.`;
}

async function callOpenAI(
  apiKey: string,
  messages: ChatMessage[]
): Promise<string> {
  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'OpenAI API error');
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || 'No response';
}

async function callGemini(
  apiKey: string,
  messages: ChatMessage[]
): Promise<string> {
  // Convert messages to Gemini format
  const contents = [];

  // Add system instruction context
  const systemMsg = messages.find(m => m.role === 'system');
  if (systemMsg) {
    contents.push({
      role: 'user',
      parts: [{ text: `Context: ${systemMsg.content}` }]
    });
    contents.push({
      role: 'model',
      parts: [{ text: 'I understand. I\'m ready to help with your CRM.' }]
    });
  }

  // Add conversation messages
  for (const msg of messages) {
    if (msg.role === 'user') {
      contents.push({
        role: 'user',
        parts: [{ text: msg.content }]
      });
    } else if (msg.role === 'assistant') {
      contents.push({
        role: 'model',
        parts: [{ text: msg.content }]
      });
    }
  }

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents,
      generationConfig: {
        maxOutputTokens: 1000,
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

export async function sendAIMessage(
  userMessage: string,
  conversationHistory: ChatMessage[],
  options: AIServiceOptions,
  contacts: Contact[],
  tasks: Task[]
): Promise<string> {
  const systemPrompt = buildSystemPrompt(contacts, tasks);

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory,
    { role: 'user', content: userMessage },
  ];

  if (options.provider === 'openai') {
    return callOpenAI(options.apiKey, messages);
  } else {
    return callGemini(options.apiKey, messages);
  }
}

export function getSuggestions(): { text: string; icon: string }[] {
  return [
    { text: "Who needs my attention?", icon: "wave" },
    { text: "Show my high priority tasks", icon: "target" },
    { text: "Give me a CRM overview", icon: "chart" },
    { text: "Suggest follow-ups", icon: "message" },
  ];
}
