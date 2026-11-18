import dotenv from 'dotenv';

dotenv.config();

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_GROQ_MODEL = 'openai/gpt-oss-120b';
const DEFAULT_TIMEOUT_MS = parseInt(process.env.GROQ_TIMEOUT_MS || '12000', 10);

export function isGroqConfigured() {
  return Boolean(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim());
}

/**
 * Single-turn chat completion on Groq (OpenAI-compatible API).
 * Returns { text, model }. Throws on HTTP errors or timeout.
 */
export async function groqGenerate(options) {
  const configured = (process.env.GROQ_MODEL || '').trim() || DEFAULT_GROQ_MODEL;
  try {
    return await callGroq(configured, options);
  } catch (error) {
    // Groq retires models; if GROQ_MODEL no longer exists, retry once with the default.
    if (error?.status === 404 && configured !== DEFAULT_GROQ_MODEL) {
      console.warn(`Groq model "${configured}" is unavailable; falling back to ${DEFAULT_GROQ_MODEL}.`);
      return callGroq(DEFAULT_GROQ_MODEL, options);
    }
    throw error;
  }
}

async function callGroq(model, { prompt, systemInstruction, temperature = 0, maxTokens = 2048, responseFormat = null, timeoutMs = DEFAULT_TIMEOUT_MS }) {
  const apiKey = (process.env.GROQ_API_KEY || '').trim();
  if (!apiKey) {
    throw new Error('GROQ_API_KEY is not configured in backend environment variables.');
  }
  const messages = [];
  if (systemInstruction) messages.push({ role: 'system', content: systemInstruction });
  messages.push({ role: 'user', content: String(prompt || '') });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        // gpt-oss models reason before answering; keep that short for a plain translation.
        ...(model.startsWith('openai/gpt-oss') ? { reasoning_effort: 'low' } : {}),
        // e.g. { type: 'json_object' } to force a JSON reply.
        ...(responseFormat ? { response_format: responseFormat } : {}),
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      let detail = '';
      try {
        const payload = await response.json();
        detail = payload?.error?.message || '';
      } catch {
        // Ignore JSON parse failures.
      }
      const error = new Error(`Groq API error ${response.status}${detail ? `: ${detail}` : ''}`);
      error.status = response.status;
      throw error;
    }

    const payload = await response.json();
    const text = String(payload?.choices?.[0]?.message?.content || '').trim();
    return { text, model };
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error(`Groq API call timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
