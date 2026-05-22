import { useEffect, useRef, useState } from 'react';
import {
  X,
  Phone,
  MessageCircle,
  Play,
  Square,
  Send,
  AlertTriangle,
  Info,
  Loader2,
  CheckCircle2,
  Sparkles,
  PhoneOff,
} from 'lucide-react';
import type { VoiceStack } from '../data/parent';
import {
  runChannelTest,
  speakText,
  stopSpeaking,
  isSpeaking,
  isApiKeyConfigured,
  setApiKey,
  clearApiKey,
  detectViolations,
  type ChatMessage,
  type TestChannel,
} from '../lib/voiceTest';
import {
  startRealtimeSession,
  type ConnectionState,
  type RealtimeSession,
} from '../lib/realtimeVoice';

interface UiMessage {
  id: string;
  from: 'bot' | 'user';
  text: string;
  violations?: string[];
}

const SEEDS: Record<TestChannel, UiMessage> = {
  voice: {
    id: 'seed-voice',
    from: 'bot',
    text: 'Click "Start call" to begin a realtime voice conversation. Speak naturally — the bot will respond by voice.',
  },
  chat: {
    id: 'seed-chat',
    from: 'bot',
    text: 'Welcome to Jackson Hole! How can I help you today?',
  },
};

function id(): string {
  return `m-${Math.random().toString(36).slice(2, 9)}`;
}

function getApiKeyFromStorage(): string {
  if (typeof window === 'undefined') return '';
  return window.localStorage?.getItem('omni.openai_api_key') ?? '';
}

interface Props {
  open: boolean;
  onClose: () => void;
  channel: TestChannel;
  systemPrompt: string;
  voiceStack: VoiceStack;
  chatModel?: string;
}

export default function TestVoiceModal({
  open,
  onClose,
  channel,
  systemPrompt,
  voiceStack,
  chatModel,
}: Props) {
  const [messages, setMessages] = useState<UiMessage[]>([SEEDS[channel]]);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [autoPlay, setAutoPlay] = useState(channel === 'voice');
  const [apiConnected, setApiConnected] = useState(isApiKeyConfigured());
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [rtState, setRtState] = useState<ConnectionState>('idle');
  const rtSessionRef = useRef<RealtimeSession | null>(null);
  const botMsgIdRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isVoice = channel === 'voice';
  const ChannelIcon = isVoice ? Phone : MessageCircle;
  const title = isVoice ? 'Test Voice AI' : 'Test Chat AI';
  const subtitle = isVoice
    ? 'Realtime voice — speak and the bot responds.'
    : 'Iterate on the Chat prompt without opening the widget.';

  const saveKey = () => {
    if (!keyInput.trim()) return;
    setApiKey(keyInput);
    setKeyInput('');
    setShowKeyInput(false);
    setApiConnected(true);
  };

  const forgetKey = () => {
    clearApiKey();
    setApiConnected(false);
  };

  // Reset on open/close
  useEffect(() => {
    if (open) {
      setMessages([SEEDS[channel]]);
      setInput('');
      setError(null);
      setPending(false);
      setPlayingId(null);
      setAutoPlay(channel === 'voice');
      setRtState('idle');
    } else {
      stopSpeaking();
      stopRealtime();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, channel]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, pending]);

  // ─── Chat-mode send (text + LLM) ──────────────────────────────────────────
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
      const reply = await runChannelTest(systemPrompt, history, channel, voiceStack);
      const botMsg: UiMessage = {
        id: id(),
        from: 'bot',
        text: reply,
        violations: detectViolations(reply, channel),
      };
      setMessages((prev) => [...prev, botMsg]);
      if (isVoice && autoPlay) {
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

  useEffect(() => {
    if (!playingId) return;
    const interval = setInterval(() => {
      if (!isSpeaking()) setPlayingId(null);
    }, 250);
    return () => clearInterval(interval);
  }, [playingId]);

  // ─── Voice-mode realtime session ──────────────────────────────────────────
  const startRealtime = async () => {
    if (!apiConnected) {
      setShowKeyInput(true);
      return;
    }
    setError(null);
    setMessages([
      {
        id: id(),
        from: 'bot',
        text: 'Connecting… allow microphone access if prompted.',
      },
    ]);
    botMsgIdRef.current = null;

    try {
      const apiKey = getApiKeyFromStorage();
      const session = await startRealtimeSession({
        apiKey,
        systemPrompt,
        voice: voiceStack.voice,
        handlers: {
          onState: (s) => setRtState(s),
          onUserTranscript: (text) => {
            setMessages((prev) => [...prev, { id: id(), from: 'user', text }]);
          },
          onBotTranscriptDelta: (delta) => {
            setMessages((prev) => {
              const currentBotId = botMsgIdRef.current;
              const last = prev[prev.length - 1];
              if (currentBotId && last?.id === currentBotId) {
                return [
                  ...prev.slice(0, -1),
                  { ...last, text: last.text + delta },
                ];
              }
              const newId = id();
              botMsgIdRef.current = newId;
              return [...prev, { id: newId, from: 'bot', text: delta }];
            });
          },
          onBotTranscriptDone: (fullText) => {
            setMessages((prev) => {
              const currentBotId = botMsgIdRef.current;
              if (!currentBotId) return prev;
              return prev.map((m) =>
                m.id === currentBotId
                  ? { ...m, text: fullText, violations: detectViolations(fullText, 'voice') }
                  : m,
              );
            });
            botMsgIdRef.current = null;
          },
          onError: (msg) => {
            setError(msg);
            setRtState('error');
          },
        },
      });
      rtSessionRef.current = session;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start realtime session');
      setRtState('error');
    }
  };

  const stopRealtime = () => {
    rtSessionRef.current?.stop();
    rtSessionRef.current = null;
    setRtState('idle');
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-full bg-botscrew-50 text-botscrew-600 flex items-center justify-center">
              <ChannelIcon className="h-4 w-4" strokeWidth={1.75} />
            </div>
            <div>
              <h2 className="text-base font-semibold text-ink-900">{title}</h2>
              <p className="text-xs text-slate-500">{subtitle}</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopRealtime();
              onClose();
            }}
            className="text-slate-400 hover:text-ink-900 rounded-md p-1 hover:bg-slate-100"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        {/* Settings strip */}
        <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-3 text-xs text-slate-600 flex-wrap">
          <span className="font-medium text-slate-700">Using:</span>
          <span>Parent + {isVoice ? 'Voice' : 'Chat'} override</span>
          <span className="text-slate-300">·</span>
          <span>
            Model:{' '}
            <code className="font-mono text-ink-900">
              {isVoice ? voiceStack.model : (chatModel ?? 'gpt-5.5')}
            </code>
          </span>
          {isVoice && (
            <>
              <span className="text-slate-300">·</span>
              <span>
                Voice: <code className="font-mono text-ink-900">{voiceStack.voice}</code>
              </span>
            </>
          )}
          <span className="ml-auto inline-flex items-center gap-1.5">
            {apiConnected ? (
              <>
                <CheckCircle2 className="h-3 w-3 text-success" strokeWidth={2} />
                <span className="text-success font-medium">Live LLM</span>
                <button
                  onClick={forgetKey}
                  className="ml-1 text-[10px] text-slate-400 hover:text-danger underline"
                  title="Remove the key from this browser"
                >
                  forget key
                </button>
              </>
            ) : (
              <>
                <Sparkles className="h-3 w-3 text-slate-500" strokeWidth={2} />
                <span className="text-slate-500 font-medium">Mock</span>
                <button
                  onClick={() => setShowKeyInput(true)}
                  className="ml-1 text-[10px] text-botscrew-500 hover:underline font-medium"
                >
                  use real LLM →
                </button>
              </>
            )}
          </span>
        </div>

        {showKeyInput && !apiConnected && (
          <div className="px-5 py-3 bg-botscrew-50 border-b border-botscrew-200 space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs text-ink-900 font-semibold">Paste OpenAI API key</div>
              <button
                onClick={() => setShowKeyInput(false)}
                className="text-slate-400 hover:text-ink-900 text-xs"
              >
                cancel
              </button>
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed">
              Stored in this browser's localStorage only — never sent anywhere except OpenAI, never
              committed.
            </p>
            <div className="flex gap-2">
              <input
                type="password"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    saveKey();
                  }
                }}
                autoFocus
                placeholder="sk-proj-…"
                className="flex-1 text-sm font-mono px-2 py-1.5 border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-botscrew-400"
              />
              <button
                onClick={saveKey}
                disabled={!keyInput.trim()}
                className="px-3 py-1.5 text-xs font-medium bg-botscrew-500 hover:bg-botscrew-600 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save & connect
              </button>
            </div>
          </div>
        )}

        {/* Conversation */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-3 bg-slate-50/40 min-h-[280px]">
          {messages.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              isVoice={isVoice && rtState === 'idle'}
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

        {/* Voice realtime controls — replaces text input when voice mode */}
        {isVoice ? (
          <div className="px-5 py-4 border-t border-slate-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <RealtimeStatusDot state={rtState} />
              {rtState === 'idle' && <span>Not connected</span>}
              {rtState === 'connecting' && <span>Connecting…</span>}
              {rtState === 'connected' && (
                <span className="text-success font-medium">Live · mic open · speak naturally</span>
              )}
              {rtState === 'error' && <span className="text-danger">Connection error</span>}
            </div>
            {rtState === 'idle' || rtState === 'error' ? (
              <button
                onClick={startRealtime}
                disabled={!apiConnected}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-success hover:bg-success/90 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                title={apiConnected ? 'Start a realtime voice session' : 'Connect API key first'}
              >
                <Phone className="h-4 w-4" strokeWidth={2} />
                Start call
              </button>
            ) : rtState === 'connecting' ? (
              <button
                disabled
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-slate-400 text-white rounded-md"
              >
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
                Connecting
              </button>
            ) : (
              <button
                onClick={stopRealtime}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-danger hover:bg-danger/90 text-white rounded-md"
              >
                <PhoneOff className="h-4 w-4" strokeWidth={2} />
                End call
              </button>
            )}
          </div>
        ) : (
          <div className="px-5 py-3 border-t border-slate-200 flex items-center gap-2">
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
                pending ? 'Waiting on response…' : 'Type a message (try: lift tickets, lessons)'
              }
              className="flex-1 text-sm px-3 py-2 border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-botscrew-400 disabled:opacity-50"
            />
            <button
              onClick={send}
              disabled={!input.trim() || pending}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-botscrew-500 hover:bg-botscrew-600 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="h-3.5 w-3.5" strokeWidth={2} /> Send
            </button>
          </div>
        )}

        {/* Mode notice (only for voice mock, or chat mock) */}
        {!apiConnected && !showKeyInput && (
          <div className="px-5 py-2.5 bg-warn/10 border-t border-warn/20 flex items-center gap-2 text-xs text-warn">
            <Info className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
            <span>
              Mock mode — click{' '}
              <button
                onClick={() => setShowKeyInput(true)}
                className="font-semibold underline hover:text-ink-900"
              >
                "use real LLM →"
              </button>{' '}
              to paste your key and connect.{' '}
              {isVoice && 'Realtime voice requires a real key.'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function RealtimeStatusDot({ state }: { state: ConnectionState }) {
  if (state === 'connected') {
    return (
      <span className="relative inline-flex">
        <span className="h-2 w-2 rounded-full bg-success" />
        <span className="absolute inset-0 h-2 w-2 rounded-full bg-success animate-ping opacity-75" />
      </span>
    );
  }
  if (state === 'connecting') {
    return <Loader2 className="h-3 w-3 animate-spin text-slate-400" strokeWidth={2} />;
  }
  if (state === 'error') {
    return <span className="h-2 w-2 rounded-full bg-danger" />;
  }
  return <span className="h-2 w-2 rounded-full bg-slate-300" />;
}

function MessageBubble({
  message,
  isVoice,
  playing,
  onTogglePlay,
}: {
  message: UiMessage;
  isVoice: boolean;
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
          {isBot && isVoice && (
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
