import { useMemo, useState } from 'react';
import { jacksonHole } from '../data/parent';
import type { LayerId } from '../data/parent';

type LayerTab = 'instructions' | 'text-edits' | 'files' | 'website';

export default function Knowledge() {
  const [activeTab, setActiveTab] = useState<LayerTab>('instructions');

  return (
    <div className="px-8 py-6 max-w-6xl mx-auto">
      <header className="mb-5">
        <h1 className="text-2xl font-semibold text-ink-900">Knowledge</h1>
        <p className="text-sm text-slate-500 mt-1">
          Everything the bot is and knows. Instructions, text, files, and crawls.
        </p>
      </header>

      <div className="border-b border-slate-200 flex items-center gap-1 mb-6">
        <Tab id="instructions" active={activeTab} onClick={setActiveTab}>Instructions</Tab>
        <Tab id="text-edits" active={activeTab} onClick={setActiveTab}>Text Edits</Tab>
        <Tab id="files" active={activeTab} onClick={setActiveTab}>Files</Tab>
        <Tab id="website" active={activeTab} onClick={setActiveTab}>Website</Tab>
      </div>

      {activeTab === 'instructions' && <Instructions />}
      {activeTab === 'text-edits' && <TabPlaceholder label="Text Edits" count={jacksonHole.knowledge.textEdits} />}
      {activeTab === 'files' && <TabPlaceholder label="Files" count={jacksonHole.knowledge.files} />}
      {activeTab === 'website' && (
        <TabPlaceholder
          label="Website"
          count={jacksonHole.knowledge.websites.count}
          extra={`Last sync ${jacksonHole.knowledge.websites.lastSync}`}
        />
      )}
    </div>
  );
}

function Instructions() {
  const [parentPrompt, setParentPrompt] = useState(jacksonHole.systemRolePrompt);
  const [model, setModel] = useState(jacksonHole.defaultModel);
  const [chatPrompt, setChatPrompt] = useState(jacksonHole.channels[0].overridePrompt);
  const [voicePrompt, setVoicePrompt] = useState(jacksonHole.channels[1].overridePrompt);
  const [emailPrompt, setEmailPrompt] = useState(jacksonHole.channels[2].overridePrompt);
  const [activeLayer, setActiveLayer] = useState<LayerId>('parent');

  const layers = useMemo(
    () => ({
      parent: parentPrompt,
      chat: chatPrompt,
      voice: voicePrompt,
      email: emailPrompt,
    }),
    [parentPrompt, chatPrompt, voicePrompt, emailPrompt],
  );

  const setLayerValue = (id: LayerId, value: string) => {
    if (id === 'parent') setParentPrompt(value);
    if (id === 'chat') setChatPrompt(value);
    if (id === 'voice') setVoicePrompt(value);
    if (id === 'email') setEmailPrompt(value);
  };

  const activeValue = layers[activeLayer];
  const limit = activeLayer === 'parent' ? jacksonHole.systemRoleLimit : 3000;
  const activeMeta = layerMeta(activeLayer);

  return (
    <div className="grid grid-cols-[260px_minmax(0,1fr)] gap-6">
      <LayerStack
        layers={layers}
        active={activeLayer}
        onSelect={setActiveLayer}
        parentLimit={jacksonHole.systemRoleLimit}
      />

      <div className="space-y-4 min-w-0">
        <div className="flex items-end justify-between gap-3 pb-2">
          <div>
            <div className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
              Editing layer
            </div>
            <h2 className="text-lg font-semibold text-ink-900 flex items-center gap-2">
              <span>{activeMeta.icon}</span>
              <span>{activeMeta.title}</span>
              {activeLayer !== 'parent' && (
                <span className="text-xs font-normal text-slate-400 font-mono">
                  {jacksonHole.channels.find((c) => c.id === activeLayer)?.botscrewBotId ?? '—'}
                </span>
              )}
            </h2>
            <p className="text-sm text-slate-500 mt-1">{activeMeta.subtitle}</p>
          </div>
          {activeLayer === 'parent' && (
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-500">Default model</label>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="text-sm border border-slate-200 rounded-md px-2 py-1 bg-white"
              >
                <option value="gpt-5.2">gpt-5.2</option>
                <option value="gpt-5.1">gpt-5.1</option>
                <option value="claude-opus-4-7">claude-opus-4-7</option>
                <option value="claude-sonnet-4-6">claude-sonnet-4-6</option>
              </select>
            </div>
          )}
        </div>

        {activeLayer === 'email' && layers.email === '' ? (
          <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-8 text-center">
            <div className="text-3xl mb-2">✉️</div>
            <div className="text-sm text-slate-600 mb-4">
              Email isn't connected yet. Connect an inbound address in Settings to start writing
              email-specific instructions.
            </div>
            <button className="text-sm font-medium text-botscrew-500 hover:text-botscrew-600">
              Go to Settings → Channels →
            </button>
          </div>
        ) : (
          <>
            <textarea
              value={activeValue}
              onChange={(e) => setLayerValue(activeLayer, e.target.value)}
              className="w-full min-h-[340px] text-sm font-mono text-ink-900 bg-slate-50 border border-slate-200 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-botscrew-400"
              placeholder={activeMeta.placeholder}
            />
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">{activeMeta.hint}</span>
              <span
                className={
                  activeValue.length > limit ? 'text-danger font-semibold' : 'text-slate-500'
                }
              >
                {activeValue.length.toLocaleString()} / {limit.toLocaleString()}
              </span>
            </div>
          </>
        )}

        <AssembledPreviews layers={layers} />

        <footer className="flex items-center justify-end gap-3 pt-2">
          <button className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-ink-900">
            Reset
          </button>
          <button className="px-4 py-2 text-sm font-medium border border-slate-300 rounded-md hover:bg-slate-50">
            Preview assembled
          </button>
          <button className="px-4 py-2 text-sm font-medium bg-action-500 hover:bg-action-600 text-white rounded-md">
            Save layer
          </button>
        </footer>
      </div>
    </div>
  );
}

function LayerStack({
  layers,
  active,
  onSelect,
  parentLimit,
}: {
  layers: Record<LayerId, string>;
  active: LayerId;
  onSelect: (id: LayerId) => void;
  parentLimit: number;
}) {
  return (
    <aside className="space-y-1">
      <div className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase mb-2 px-2">
        Layers
      </div>
      <LayerRow
        id="parent"
        active={active}
        onSelect={onSelect}
        icon="●"
        title="Parent · System Role"
        meta={`${layers.parent.length.toLocaleString()} / ${parentLimit.toLocaleString()}`}
        status="root"
      />
      <div className="pl-3 space-y-1 border-l border-slate-200 ml-3 mt-1">
        {jacksonHole.channels.map((c) => {
          const override = layers[c.id];
          const isEmpty = override.length === 0;
          const assembled = layers.parent.length + override.length;
          return (
            <LayerRow
              key={c.id}
              id={c.id}
              active={active}
              onSelect={onSelect}
              icon={c.icon}
              title={c.label}
              meta={
                c.status === 'not-connected'
                  ? 'not connected'
                  : isEmpty
                    ? 'no override'
                    : `+${override.length.toLocaleString()}  →  ${assembled.toLocaleString()}`
              }
              status={c.status === 'not-connected' ? 'disabled' : 'channel'}
              botId={c.botscrewBotId}
            />
          );
        })}
      </div>
    </aside>
  );
}

function LayerRow({
  id,
  active,
  onSelect,
  icon,
  title,
  meta,
  status,
  botId,
}: {
  id: LayerId;
  active: LayerId;
  onSelect: (id: LayerId) => void;
  icon: string;
  title: string;
  meta: string;
  status: 'root' | 'channel' | 'disabled';
  botId?: string | null;
}) {
  const isActive = active === id;
  const dim = status === 'disabled';
  return (
    <button
      onClick={() => onSelect(id)}
      className={`w-full text-left rounded-md px-3 py-2 transition border ${
        isActive
          ? 'bg-botscrew-50 border-botscrew-400 text-ink-900'
          : 'bg-white border-transparent hover:bg-slate-50 ' + (dim ? 'opacity-60' : '')
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="text-sm leading-none w-4 text-center">{icon}</span>
        <span className={`text-sm font-medium ${isActive ? 'text-ink-900' : 'text-ink-900'}`}>
          {title}
        </span>
      </div>
      <div className="mt-1 ml-6 text-[11px] text-slate-500 flex items-center gap-2">
        {botId && <span className="font-mono">{botId}</span>}
        <span>{meta}</span>
      </div>
    </button>
  );
}

function AssembledPreviews({ layers }: { layers: Record<LayerId, string> }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
      <div className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase mb-3">
        Assembled per channel
      </div>
      <div className="space-y-2">
        {jacksonHole.channels.map((c) => {
          const override = layers[c.id];
          const assembled = layers.parent.length + override.length;
          const isEmail = c.id === 'email';
          const empty = c.status === 'not-connected';
          return (
            <div key={c.id} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span>{c.icon}</span>
                <span className="font-medium text-ink-900">{c.label}</span>
                {c.botscrewBotId && (
                  <span className="text-xs font-mono text-slate-400">{c.botscrewBotId}</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className={empty ? 'text-slate-400 italic' : 'text-slate-600'}>
                  {empty
                    ? 'not configured'
                    : `${assembled.toLocaleString()} chars`}
                </span>
                {!empty && !isEmail && (
                  <button className="text-xs font-medium text-botscrew-500 hover:text-botscrew-600">
                    View →
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Tab({
  id,
  active,
  onClick,
  children,
}: {
  id: LayerTab;
  active: LayerTab;
  onClick: (id: LayerTab) => void;
  children: React.ReactNode;
}) {
  const isActive = active === id;
  return (
    <button
      onClick={() => onClick(id)}
      className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
        isActive
          ? 'border-botscrew-500 text-botscrew-500'
          : 'border-transparent text-slate-500 hover:text-ink-900'
      }`}
    >
      {children}
    </button>
  );
}

function TabPlaceholder({
  label,
  count,
  extra,
}: {
  label: string;
  count: number;
  extra?: string;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-8 text-center">
      <div className="text-3xl font-semibold text-ink-900">{count}</div>
      <div className="text-sm text-slate-500 mt-1">{label}</div>
      {extra && <div className="text-xs text-slate-400 mt-2">{extra}</div>}
      <button className="mt-4 text-sm font-medium text-botscrew-500 hover:text-botscrew-600">
        Manage {label} →
      </button>
    </div>
  );
}

function layerMeta(id: LayerId) {
  switch (id) {
    case 'parent':
      return {
        title: 'Parent · System Role',
        subtitle: 'Identity, personas, and policies. Inherited by every channel.',
        icon: '●',
        hint: 'Channel-specific rules (length, formatting, fallback) belong on each channel layer.',
        placeholder: '',
      };
    case 'chat':
      return {
        title: 'Chat',
        subtitle: 'Web, Facebook, WhatsApp, SMS. Short-form messaging.',
        icon: '💬',
        hint: 'Override appended to the Parent prompt when Chat handles a message.',
        placeholder: 'Add chat-specific rules…',
      };
    case 'voice':
      return {
        title: 'Voice',
        subtitle: 'Phone calls via Twilio. Spoken responses.',
        icon: '📞',
        hint: 'Override appended to the Parent prompt when Voice handles a call.',
        placeholder: 'Add voice-specific rules…',
      };
    case 'email':
      return {
        title: 'Email',
        subtitle: 'Inbound + outbound email. Long-form, threaded.',
        icon: '✉️',
        hint: 'Override appended to the Parent prompt when Email handles a message.',
        placeholder: 'Add email-specific rules…',
      };
  }
}
