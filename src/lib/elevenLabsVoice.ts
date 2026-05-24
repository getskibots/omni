/**
 * ElevenLabs Conversational AI client wrapper.
 *
 * Auth flow:
 *   - Production (Vercel) → calls /api/elevenlabs-signed-url. Browser sends
 *     agent_id only; the proxy holds ELEVENLABS_API_KEY and mints the WS URL.
 *   - Local dev (vite dev) → calls api.elevenlabs.io directly with a key from
 *     localStorage (paste flow).
 *
 * Then in both modes:
 *   - Open a Conversation session with the signed URL + per-call overrides
 *     (system prompt, voice_id, first message).
 *   - Mic/audio/transcripts handled by the SDK; we surface events via handlers.
 */

import { Conversation } from '@elevenlabs/client';
import { USE_PROXY } from './proxyMode';
import { DEFAULT_ELEVENLABS_AGENT_ID } from '../data/parent';

export type ElevenLabsConnectionState = 'idle' | 'connecting' | 'connected' | 'error';

export interface ElevenLabsHandlers {
  onState: (state: ElevenLabsConnectionState) => void;
  onUserTranscript: (text: string) => void;
  onBotMessage: (text: string) => void;
  onError: (message: string) => void;
}

export interface ElevenLabsSession {
  stop: () => Promise<void>;
}

const LS_API_KEY = 'omni.elevenlabs_api_key';
const LS_AGENT_ID = 'omni.elevenlabs_agent_id';

export function getElevenLabsApiKey(): string {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(LS_API_KEY) ?? '';
}

export function setElevenLabsApiKey(key: string): void {
  if (typeof window === 'undefined') return;
  if (key.trim()) window.localStorage.setItem(LS_API_KEY, key.trim());
  else window.localStorage.removeItem(LS_API_KEY);
}

export function getElevenLabsAgentId(): string {
  // Per-resort config — falls back to the JH default baked into parent.ts so
  // the user never has to paste it. localStorage override wins if present
  // (lets you test a different agent without rebuilding).
  if (typeof window === 'undefined') return DEFAULT_ELEVENLABS_AGENT_ID;
  const stored = window.localStorage.getItem(LS_AGENT_ID);
  return stored && stored.trim() ? stored : DEFAULT_ELEVENLABS_AGENT_ID;
}

export function setElevenLabsAgentId(id: string): void {
  if (typeof window === 'undefined') return;
  if (id.trim()) window.localStorage.setItem(LS_AGENT_ID, id.trim());
  else window.localStorage.removeItem(LS_AGENT_ID);
}

export function isElevenLabsConfigured(): boolean {
  // In production, the API key lives server-side on Vercel — browser only needs agent_id.
  // In local dev, both must be in localStorage.
  if (USE_PROXY) return Boolean(getElevenLabsAgentId());
  return Boolean(getElevenLabsApiKey() && getElevenLabsAgentId());
}

export function clearElevenLabsCreds(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(LS_API_KEY);
  window.localStorage.removeItem(LS_AGENT_ID);
}

async function fetchSignedUrl(apiKey: string, agentId: string): Promise<string> {
  // Production: proxy keeps the API key server-side. Browser sends agent_id only.
  const url = USE_PROXY
    ? `/api/elevenlabs-signed-url?agent_id=${encodeURIComponent(agentId)}`
    : `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${encodeURIComponent(
        agentId,
      )}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: USE_PROXY ? {} : { 'xi-api-key': apiKey },
  });

  if (!res.ok) {
    const errText = await res.text();
    let detail = errText.slice(0, 500);
    try {
      const parsed = JSON.parse(errText);
      detail = parsed?.detail?.message ?? parsed?.detail ?? parsed?.message ?? detail;
      if (typeof detail !== 'string') detail = JSON.stringify(detail).slice(0, 300);
    } catch {
      /* not JSON */
    }
    throw new Error(`ElevenLabs ${res.status}: ${detail}`);
  }

  const data = await res.json();
  if (!data?.signed_url) throw new Error('No signed_url in response');
  return data.signed_url as string;
}

export async function startElevenLabsSession({
  voiceId,
  systemPrompt,
  firstMessage,
  handlers,
}: {
  voiceId: string;
  systemPrompt: string;
  firstMessage?: string;
  handlers: ElevenLabsHandlers;
}): Promise<ElevenLabsSession> {
  const apiKey = getElevenLabsApiKey();
  const agentId = getElevenLabsAgentId();
  if (!agentId) {
    throw new Error('ElevenLabs agent ID required');
  }
  if (!USE_PROXY && !apiKey) {
    throw new Error('ElevenLabs API key required in dev mode (proxy supplies it in production).');
  }

  handlers.onState('connecting');

  let signedUrl: string;
  try {
    signedUrl = await fetchSignedUrl(apiKey, agentId);
  } catch (e) {
    handlers.onError(e instanceof Error ? e.message : 'Failed to mint signed URL');
    handlers.onState('error');
    throw e;
  }

  try {
    const conversation = await Conversation.startSession({
      signedUrl,
      overrides: {
        agent: {
          prompt: { prompt: systemPrompt },
          ...(firstMessage && firstMessage.trim()
            ? { firstMessage: firstMessage.trim() }
            : {}),
        },
        tts: {
          voiceId,
        },
      },
      onConnect: () => {
        console.log('[elevenlabs] connected');
        handlers.onState('connected');
      },
      onDisconnect: () => {
        console.log('[elevenlabs] disconnected');
        handlers.onState('idle');
      },
      onMessage: (payload: { source?: string; message?: string }) => {
        console.log('[elevenlabs] message', payload);
        const { source, message } = payload;
        if (!message) return;
        if (source === 'user') {
          handlers.onUserTranscript(message);
        } else if (source === 'ai') {
          handlers.onBotMessage(message);
        }
      },
      onError: (msg: string) => {
        console.warn('[elevenlabs] error', msg);
        handlers.onError(msg);
        handlers.onState('error');
      },
    } as Parameters<typeof Conversation.startSession>[0]);

    return {
      stop: async () => {
        try {
          await conversation.endSession();
        } catch {
          /* noop */
        }
      },
    };
  } catch (e) {
    handlers.onError(e instanceof Error ? e.message : 'ElevenLabs session failed');
    handlers.onState('error');
    throw e;
  }
}
