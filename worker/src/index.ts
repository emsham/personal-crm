/**
 * Cloudflare Worker to proxy OpenAI API requests
 * This bypasses CORS restrictions by making the API call server-side
 */

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// Allowed origins for CORS
const ALLOWED_ORIGINS = [
  'https://tethru.com',
  'https://www.tethru.com',
  'http://localhost:5173',  // Vite dev server
  'http://localhost:3000',
];

interface RequestBody {
  apiKey: string;
  model?: string;
  messages: unknown[];
  tools?: unknown[];
  stream?: boolean;
  max_tokens?: number;
}

function getCorsHeaders(origin: string | null): HeadersInit {
  const allowedOrigin = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export default {
  async fetch(request: Request): Promise<Response> {
    const origin = request.headers.get('Origin');
    const corsHeaders = getCorsHeaders(origin);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Only allow POST requests
    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    try {
      const body: RequestBody = await request.json();
      const { apiKey, model, messages, tools, stream, max_tokens } = body;

      // Validate required fields
      if (!apiKey) {
        return new Response(JSON.stringify({ error: 'API key is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!messages || !Array.isArray(messages)) {
        return new Response(JSON.stringify({ error: 'Messages array is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Build OpenAI request body
      const openaiBody: Record<string, unknown> = {
        model: model || 'gpt-4o-mini',
        messages,
      };

      if (tools && Array.isArray(tools) && tools.length > 0) {
        openaiBody.tools = tools;
      }

      if (stream) {
        openaiBody.stream = true;
      }

      if (max_tokens) {
        openaiBody.max_tokens = max_tokens;
      }

      // Make request to OpenAI
      const openaiResponse = await fetch(OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(openaiBody),
      });

      // For streaming responses, pipe through directly
      if (stream && openaiResponse.body) {
        return new Response(openaiResponse.body, {
          status: openaiResponse.status,
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        });
      }

      // For non-streaming, return JSON response
      const data = await openaiResponse.json();
      return new Response(JSON.stringify(data), {
        status: openaiResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return new Response(JSON.stringify({ error: message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
};
