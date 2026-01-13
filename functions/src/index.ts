import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

interface OpenAIProxyRequest {
  apiKey: string;
  messages: unknown[];
  tools?: unknown[];
  stream?: boolean;
}

// Non-streaming proxy for OpenAI
export const openaiProxy = functions.https.onCall(
  async (data: OpenAIProxyRequest, context) => {
    const { apiKey, messages, tools } = data;

    if (!apiKey || !messages) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing required fields: apiKey and messages"
      );
    }

    // Verify user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated"
      );
    }

    try {
      const response = await fetch(OPENAI_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages,
          ...(tools && { tools }),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new functions.https.HttpsError(
          "internal",
          error.error?.message || "OpenAI API error"
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      throw new functions.https.HttpsError(
        "internal",
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }
);

// Streaming proxy for OpenAI using HTTP endpoint
export const openaiStreamProxy = functions.https.onRequest(
  async (req, res) => {
    // Handle CORS
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    if (req.method !== "POST") {
      res.status(405).send("Method not allowed");
      return;
    }

    const { apiKey, messages, tools } = req.body as OpenAIProxyRequest;

    if (!apiKey || !messages) {
      res.status(400).json({ error: "Missing required fields: apiKey and messages" });
      return;
    }

    // Verify Firebase ID token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      res.status(401).json({ error: "Missing or invalid authorization header" });
      return;
    }

    const idToken = authHeader.split("Bearer ")[1];
    try {
      await admin.auth().verifyIdToken(idToken);
    } catch {
      res.status(401).json({ error: "Invalid ID token" });
      return;
    }

    try {
      const response = await fetch(OPENAI_API_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages,
          ...(tools && { tools }),
          stream: true,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        res.status(response.status).json({
          error: error.error?.message || "OpenAI API error",
        });
        return;
      }

      // Set up SSE headers
      res.set("Content-Type", "text/event-stream");
      res.set("Cache-Control", "no-cache");
      res.set("Connection", "keep-alive");

      // Stream the response
      const reader = response.body?.getReader();
      if (!reader) {
        res.status(500).json({ error: "No response body" });
        return;
      }

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(decoder.decode(value, { stream: true }));
      }

      res.end();
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);
