const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

interface Env {
  ALLOWED_ORIGINS: string;
}

interface OpenAIRequest {
  apiKey: string;
  messages: unknown[];
  tools?: unknown[];
  stream?: boolean;
}

function getCorsHeaders(request: Request, env: Env): HeadersInit {
  const origin = request.headers.get("Origin") || "";
  const allowedOrigins = env.ALLOWED_ORIGINS.split(",").map((o) => o.trim());

  // Check if origin is allowed
  const isAllowed = allowedOrigins.some(
    (allowed) => origin === allowed || allowed === "*"
  );

  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : allowedOrigins[0],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

function isOriginAllowed(request: Request, env: Env): boolean {
  const origin = request.headers.get("Origin") || "";
  const allowedOrigins = env.ALLOWED_ORIGINS.split(",").map((o) => o.trim());
  return allowedOrigins.some(
    (allowed) => origin === allowed || allowed === "*"
  );
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const corsHeaders = getCorsHeaders(request, env);

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Only allow POST
    if (request.method !== "POST") {
      return new Response("Method not allowed", {
        status: 405,
        headers: corsHeaders,
      });
    }

    // Verify origin
    if (!isOriginAllowed(request, env)) {
      return new Response("Origin not allowed", {
        status: 403,
        headers: corsHeaders,
      });
    }

    try {
      const body: OpenAIRequest = await request.json();
      const { apiKey, messages, tools, stream } = body;

      if (!apiKey || !messages) {
        return new Response(
          JSON.stringify({ error: "Missing required fields: apiKey and messages" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Forward request to OpenAI
      const openaiResponse = await fetch(OPENAI_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages,
          ...(tools && { tools }),
          ...(stream && { stream: true }),
        }),
      });

      if (!openaiResponse.ok) {
        const error = await openaiResponse.text();
        return new Response(error, {
          status: openaiResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // For streaming responses, pipe through directly
      if (stream) {
        return new Response(openaiResponse.body, {
          headers: {
            ...corsHeaders,
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        });
      }

      // For non-streaming, return JSON response
      const data = await openaiResponse.json();
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return new Response(JSON.stringify({ error: message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  },
};
