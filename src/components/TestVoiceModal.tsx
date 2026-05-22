import { useState } from 'react';
import { X, Phone, Play, Send, Mic, AlertTriangle, Info } from 'lucide-react';
import type { VoiceStack } from '../data/parent';

interface MockMessage {
  from: 'bot' | 'user';
  text: string;
  audioDuration?: string;
  violations?: string[];
}

const MOCK_CONVERSATION: MockMessage[] = [
  {
    from: 'bot',
    text: 'Welcome to Jackson Hole. How can we help today?',
    audioDuration: '00:04',
  },
  { from: 'user', text: "What's the snow report?" },
  {
    from: 'bot',
    text: 'We got two inches in the last twenty-four hours, eighty-eight inch base, one hundred ten trails and thirteen lifts open. Anything else?',
    audioDuration: '00:08',
  },
  { from: 'user', text: 'How much for a lift ticket?' },
  {
    from: 'bot',
    text: 'Ticket prices vary by date. Want me to text you the link to book online, or have someone call you back with current pricing?',
    audioDuration: '00:07',
  },
];

const MOCK_VIOLATION: MockMessage = {
  from: 'bot',
  text: 'You can check our website at jacksonhole.com/mountain-report for the latest snow conditions and weather forecast for this weekend.',
  audioDuration: '00:09',
  violations: [
    'URL spoken aloud — should offer to text or email the link',
    '"Check our website" — caller dialed because they didn\'t want to use the website',
  ],
};

export default function TestVoiceModal({
  open,
  onClose,
  voiceStack,
}: {
  open: boolean;
  onClose: () => void;
  voiceStack: VoiceStack;
}) {
  const [input, setInput] = useState('');
  const [showViolation, setShowViolation] = useState(false);

  if (!open) return null;

  const messages: MockMessage[] = showViolation
    ? [...MOCK_CONVERSATION, MOCK_VIOLATION]
    : MOCK_CONVERSATION;

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
        <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-4 text-xs text-slate-600 flex-wrap">
          <span className="font-medium text-slate-700">Using:</span>
          <span>
            Parent + Voice override
          </span>
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
        </div>

        {/* Conversation */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-slate-50/40">
          {messages.map((m, i) => (
            <MessageBubble key={i} message={m} />
          ))}
          <div className="pt-2">
            <button
              onClick={() => setShowViolation(!showViolation)}
              className="text-xs text-slate-400 hover:text-slate-600 italic"
            >
              {showViolation
                ? '↩ hide rule-violation example'
                : '▸ show example with voice-rule violations'}
            </button>
          </div>
        </div>

        {/* Coming-soon notice */}
        <div className="px-5 py-2.5 bg-warn/10 border-t border-warn/20 flex items-center gap-2 text-xs text-warn">
          <Info className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
          <span>
            Prototype — wired to mock conversation. Real-time voice + TTS playback (
            <code className="font-mono">{voiceStack.voice}</code>) and live LLM responses come when
            the backend lands.
          </span>
        </div>

        {/* Input */}
        <div className="px-5 py-3 border-t border-slate-200 flex items-center gap-2">
          <button
            disabled
            className="h-9 w-9 shrink-0 rounded-md border border-slate-200 text-slate-400 flex items-center justify-center"
            title="Hold to talk (coming soon)"
          >
            <Mic className="h-4 w-4" strokeWidth={1.75} />
          </button>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a question…"
            className="flex-1 text-sm px-3 py-2 border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-botscrew-400"
          />
          <button
            disabled={!input.trim()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-botscrew-500 hover:bg-botscrew-600 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-3.5 w-3.5" strokeWidth={2} /> Send
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: MockMessage }) {
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
          <div className="text-sm leading-relaxed">{message.text}</div>
          {message.audioDuration && (
            <div className="mt-2 flex items-center gap-2 pt-2 border-t border-slate-100">
              <button className="h-6 w-6 rounded-full bg-botscrew-500 text-white flex items-center justify-center hover:bg-botscrew-600">
                <Play className="h-3 w-3 fill-current" strokeWidth={0} />
              </button>
              <div className="flex-1 h-1 bg-slate-100 rounded-full">
                <div className="h-full bg-botscrew-500 rounded-full w-0" />
              </div>
              <span className="text-[10px] font-mono text-slate-500">{message.audioDuration}</span>
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
