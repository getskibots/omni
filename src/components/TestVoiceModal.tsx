import { useEffect, useRef, useState } from 'react';
import {
  X,
  Phone,
  Play,
  Square,
  Send,
  Mic,
  AlertTriangle,
  Info,
  Loader2,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import type { VoiceStack } from '../data/parent';
import {
  runVoiceTest,
  speakText,
  stopSpeaking,
  isApiKeyConfigured,
  detectVoiceViolations,
  type ChatMessage,
} from '../lib/voiceTest';

interface UiMessage {
  id: string;
  from: 'bot' | 'user';
  text: string;
  audioDuration?: string;
  violations?: string[];
}

const SEED: UiMessage[] = [
  {
    id: 'seed-1',
    from: 'bot',
    text: 'Welcome to Jackson Hole. How can we help today?',
    audioDuration: '00:04',
  },
];

function id(): string {
  return `m-${Math.random().toString(36).slice(2, 9)}`;
}

export default function TestVoiceModal({
  open,
  onClose,
  voiceStack,
  systemPrompt,
}: {
  open: boolean;
  onClose: () => void;
  voiceStack: VoiceStack;
  systemPrompt: string;
}) {
  const [messages, setMessages] = useState<UiMessage[]>(SEED);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [autoPlay, setAutoPlay] = useState(true);
  const apiConnected = isApiKeyConfigured();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      // Reset on open
      setMessages(SEED);
      setInput('');
      setError(null);
      setPending(false);
      setPlayingId(null);
    } else {
      stopSpeaking();
    }
  }, [open]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, pending]);

  const send = async () => {
    const text = input.trim();
    if (!text || pending) return;

    const userMsg: UiMessage = { id: id(), from: 'user', text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setPending(true);
    setError(null);

    try {
      const history: ChatMessage[] = [...messages, userMsg].map((m) => ({
        role: m.from === 'bot' ? 'assistant' : 'user',
        content: m.text,
      }));
      const reply = await runVoiceTest(systemPrompt, history, voiceStack);
      const botMsg: UiMessage = {
        id: id(),
        from: 'bot',
        text: reply,
        violations: detectVoiceViolations(reply),
      };
      setMessages((prev) => [...prev, botMsg]);
      if (autoPlay) {
        setPlayingId(botMsg.id);
        speakText(reply, voiceStack.voice);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Request failed');
    } finally {
      setPending(false);
    }
  };

  const togglePlay = (msg: UiMessage) => {
    if (playingId === msg.id) {
      stopSpeaking();
      setPlayingId(null);
    } else {
      stopSpeaking();
      setPlayingId(msg.id);
      speakText(msg.text, voiceStack.voice);
    }
  };

  // Stop "playing" indicator when SpeechSynthesis finishes
  useEffect(() => {
    if (!playingId) return;
    const interval = setInterval(() => {
      if (typeof window !== 'undefined' && !window.speechSynthesis?.speaking) {
        setPlayingId(null);
      }
    }, 250);
    return () => clearInterval(interval);
  }, [playingId]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-botscrew-50 text-botscrew-600 flex items-center justify-center">
              <Phone className="h-4 w-4" strokeWidth={1.75} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-ink-900">Test Voice AI</h2>
              <p className="text-xs text-slate-500">
                Iterate on the Voice prompt without placing a phone call.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-ink-900 rounded-md p-1 hover:bg-slate-100"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        {/* Settings strip */}
        <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-3 text-xs text-slate-600 flex-wrap">
          <span className="font-medium text-slate-700">Using:</span>
          <span>Parent + Voice override</span>
          <span className="text-slate-300">·</span>
          <span>
            Model: <code className="font-mono text-ink-900">{voiceStack.model}</code>
          </span>
          <span className="text-slate-300">·</span>
          <span>
            Voice: <code className="font-mono text-ink-900">{voiceStack.voice}</code>
          </span>
          <span className="text-slate-300">·</span>
          <span>
            STT: <code className="font-mono text-ink-900">{voiceStack.transcriptionModel}</code>
          </span>
          <span className="ml-auto inline-flex items-center gap-1.5">
            {apiConnected ? (
              <>
                <CheckCircle2 className="h-3 w-3 text-success" strokeWidth={2} />
                <span className="text-success font-medium">Live LLM</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3 w-3 text-slate-500" strokeWidth={2} />
                <span className="text-slate-500 font-medium">Mock</span>
              </>
            )}
          </span>
        </div>

        {/* Conversation */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-3 bg-slate-50/40">
          {messages.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              playing={playingId === m.id}
              onTogglePlay={() => togglePlay(m)}
            />
          ))}
          {pending && (
            <div className="flex justify-start">
              <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-2.5 inline-flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
                Thinking…
              </div>
            </div>
          )}
          {error && (
            <div className="bg-danger/10 border border-danger/30 text-danger text-xs rounded-md px-3 py-2">
              {error}
            </div>
          )}
        </div>

        {/* Mode notice */}
        {!apiConnected && (
          <div className="px-5 py-2.5 bg-warn/10 border-t border-warn/20 flex items-center gap-2 text-xs text-warn">
            <Info className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
            <span>
              Mock mode — set <code className="font-mono">VITE_OPENAI_API_KEY</code> in{' '}
              <code className="font-mono">.env.local</code> for live LLM responses. TTS uses your
              browser's voice (real <code className="font-mono">{voiceStack.voice}</code> ships with
              backend wiring).
            </span>
          </div>
        )}

        {/* Input */}
        <div className="px-5 py-3 border-t border-slate-200 flex items-center gap-2">
          <button
            disabled
            className="h-9 w-9 shrink-0 rounded-md border border-slate-200 text-slate-400 flex items-center justify-center"
            title="Hold to talk (coming with backend)"
          >
            <Mic className="h-4 w-4" strokeWidth={1.75} />
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            disabled={pending}
            placeholder={
              pending ? 'Waiting on response…' : 'Type a question (try: snow report, tickets, lessons)'
            }
            className="flex-1 text-sm px-3 py-2 border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-botscrew-400 disabled:opacity-50"
          />
          <label className="inline-flex items-center gap-1.5 text-xs text-slate-500 select-none cursor-pointer">
            <input
              type="checkbox"
              checked={autoPlay}
              onChange={(e) => setAutoPlay(e.target.checked)}
              className="rounded border-slate-300"
            />
            Auto-play
          </label>
          <button
            onClick={send}
            disabled={!input.trim() || pending}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-botscrew-500 hover:bg-botscrew-600 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-3.5 w-3.5" strokeWidth={2} /> Send
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  playing,
  onTogglePlay,
}: {
  message: UiMessage;
  playing: boolean;
  onTogglePlay: () => void;
}) {
  const isBot = message.from === 'bot';
  return (
    <div className={`flex ${isBot ? 'justify-start' : 'justify-end'}`}>
      <div className="max-w-[78%] space-y-1">
        <div
          className={`rounded-2xl px-4 py-2.5 ${
            isBot
              ? 'bg-white border border-slate-200 text-ink-900 rounded-bl-sm'
              : 'bg-botscrew-500 text-white rounded-br-sm'
          }`}
        >
          <div className="text-sm leading-relaxed whitespace-pre-wrap">{message.text}</div>
          {isBot && (
            <div className="mt-2 flex items-center gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={onTogglePlay}
                className="h-6 w-6 rounded-full bg-botscrew-500 text-white flex items-center justify-center hover:bg-botscrew-600"
                title={playing ? 'Stop' : 'Play'}
              >
                {playing ? (
                  <Square className="h-2.5 w-2.5 fill-current" strokeWidth={0} />
                ) : (
                  <Play className="h-3 w-3 fill-current" strokeWidth={0} />
                )}
              </button>
              <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-botscrew-500 rounded-full transition-all ${
                    playing ? 'w-full duration-[8000ms]' : 'w-0'
                  }`}
                />
              </div>
              <span className="text-[10px] font-mono text-slate-500">
                {playing ? 'speaking…' : 'tap to play'}
              </span>
            </div>
          )}
        </div>
        {message.violations && message.violations.length > 0 && (
          <div className="space-y-1">
            {message.violations.map((v, i) => (
              <div
                key={i}
                className="inline-flex items-start gap-1.5 text-[11px] text-warn bg-warn/10 border border-warn/30 rounded-md px-2 py-1"
              >
                <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" strokeWidth={2} />
                <span>{v}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
