import { useState } from 'react';
import { X, Copy, Check, MessageCircle, Phone, Mail } from 'lucide-react';

type PreviewChannel = 'chat' | 'voice' | 'email';

interface Props {
  open: boolean;
  onClose: () => void;
  assembledParent: string;
  chatOverride: string;
  voiceOverride: string;
  emailOverride: string;
  chatBotId?: string;
  voiceBotId?: string;
  emailBotId?: string;
  emailConnected?: boolean;
}

export default function AssembledPreviewModal({
  open,
  onClose,
  assembledParent,
  chatOverride,
  voiceOverride,
  emailOverride,
  chatBotId,
  voiceBotId,
  emailBotId,
  emailConnected = false,
}: Props) {
  const [active, setActive] = useState<PreviewChannel>('chat');
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const override =
    active === 'chat' ? chatOverride : active === 'voice' ? voiceOverride : emailOverride;
  const assembled = `${assembledParent}\n\n---\n\n${override}`.trim();
  const botId = active === 'chat' ? chatBotId : active === 'voice' ? voiceBotId : emailBotId;
  const connected = active === 'email' ? emailConnected : true;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(assembled);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* noop */
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-ink-900">Assembled per channel</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              What each Botscrew Bot actually sees: Parent (Preset + Custom Instructions) +
              channel override, concatenated as it ships.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-ink-900 rounded-md p-1 hover:bg-slate-100"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        {/* Channel tabs */}
        <div className="px-5 border-b border-slate-200 flex items-center gap-1">
          <Tab
            id="chat"
            active={active}
            onClick={setActive}
            icon={<MessageCircle className="h-3.5 w-3.5" strokeWidth={1.75} />}
            label="Chat"
            botId={chatBotId}
          />
          <Tab
            id="voice"
            active={active}
            onClick={setActive}
            icon={<Phone className="h-3.5 w-3.5" strokeWidth={1.75} />}
            label="Voice"
            botId={voiceBotId}
          />
          <Tab
            id="email"
            active={active}
            onClick={setActive}
            icon={<Mail className="h-3.5 w-3.5" strokeWidth={1.75} />}
            label="Email"
            botId={emailBotId}
            disabled={!emailConnected}
          />
        </div>

        {/* Status strip */}
        <div className="px-5 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-3">
            <span>
              <strong className="text-ink-900">{assembled.length.toLocaleString()}</strong> chars
              ship to this Bot
            </span>
            <span className="text-slate-300">·</span>
            <span>Parent: {assembledParent.length.toLocaleString()}</span>
            <span className="text-slate-300">·</span>
            <span>Override: {override.length.toLocaleString()}</span>
            {botId && (
              <>
                <span className="text-slate-300">·</span>
                <code className="font-mono text-slate-500">{botId}</code>
              </>
            )}
          </div>
          <button
            onClick={copy}
            className="inline-flex items-center gap-1.5 text-botscrew-500 hover:text-botscrew-600 font-medium"
            title="Copy assembled prompt"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5" strokeWidth={2} /> Copied
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" strokeWidth={2} /> Copy
              </>
            )}
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto bg-slate-50/40">
          {!connected ? (
            <div className="p-8 text-center text-sm text-slate-500">
              Email isn't connected yet. The Email override is editable but won't ship until you
              connect an inbound address in Settings → Channels.
            </div>
          ) : (
            <pre className="p-5 text-xs font-mono text-ink-900 whitespace-pre-wrap leading-relaxed">
              {assembled}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

function Tab({
  id,
  active,
  onClick,
  icon,
  label,
  botId,
  disabled,
}: {
  id: PreviewChannel;
  active: PreviewChannel;
  onClick: (id: PreviewChannel) => void;
  icon: React.ReactNode;
  label: string;
  botId?: string;
  disabled?: boolean;
}) {
  const isActive = active === id;
  return (
    <button
      onClick={() => !disabled && onClick(id)}
      disabled={disabled}
      className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition flex items-center gap-1.5 ${
        isActive
          ? 'border-botscrew-500 text-botscrew-500'
          : disabled
            ? 'border-transparent text-slate-300 cursor-not-allowed'
            : 'border-transparent text-slate-500 hover:text-ink-900'
      }`}
    >
      {icon}
      {label}
      {botId && <code className="font-mono text-[10px] text-slate-400 ml-1">{botId}</code>}
    </button>
  );
}
