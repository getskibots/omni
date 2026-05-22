import { useMemo, useState } from 'react';
import {
  jacksonHole,
  PARENT_MODEL_OPTIONS,
  VOICE_MODEL_OPTIONS,
  VOICE_VOICE_OPTIONS,
  VOICE_TRANSCRIPTION_OPTIONS,
} from '../data/parent';
import type { LayerId, VoiceStack } from '../data/parent';

type KnowledgeSection = 'instructions' | 'text-edits' | 'files' | 'website';

const sections: { id: KnowledgeSection; label: string }[] = [
  { id: 'instructions', label: 'Instructions' },
  { id: 'text-edits', label: 'Text Edits' },
  { id: 'files', label: 'Files' },
  { id: 'website', label: 'Website' },
];

export default function Knowledge() {
  const [activeSection, setActiveSection] = useState<KnowledgeSection>('instructions');

  return (
    <div className="px-8 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-ink-900">Knowledge</h1>
      </header>

      <div className="grid grid-cols-[220px_minmax(0,1fr)] gap-8 items-start">
        <KnowledgeLayersRail active={activeSection} onSelect={setActiveSection} />

        <div className="max-w-4xl">
          {activeSection === 'instructions' && <Instructions />}
          {activeSection === 'text-edits' && (
            <SectionPlaceholder
              label="Text Edits"
              count={jacksonHole.knowledge.textEdits}
              cta="Manage Text Edits"
            />
          )}
          {activeSection === 'files' && (
            <SectionPlaceholder
              label="Files"
              count={jacksonHole.knowledge.files}
              cta="Manage Files"
            />
          )}
          {activeSection === 'website' && (
            <SectionPlaceholder
              label="Website"
              count={jacksonHole.knowledge.websites.count}
              extra={`Last sync ${jacksonHole.knowledge.websites.lastSync}`}
              cta="Manage Website Crawls"
            />
          )}
        </div>
      </div>
    </div>
  );
}

function KnowledgeLayersRail({
  active,
  onSelect,
}: {
  active: KnowledgeSection;
  onSelect: (id: KnowledgeSection) => void;
}) {
  return (
    <aside>
      <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold mb-2 px-1">
        Knowledge Layers
      </div>
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-card">
        {sections.map((s, i) => {
          const isActive = active === s.id;
          return (
            <button
              key={s.id}
              onClick={() => onSelect(s.id)}
              className={`w-full text-left px-4 py-3.5 text-sm font-medium transition border-b border-slate-100 last:border-b-0 ${
                isActive
                  ? 'bg-botscrew-500 text-white'
                  : 'bg-white text-ink-900 hover:bg-slate-50'
              } ${i === 0 ? '' : ''}`}
            >
              {s.label}
            </button>
          );
        })}
      </div>
    </aside>
  );
}

function Instructions() {
  const voiceChannel = jacksonHole.channels[1];
  const [parentPrompt, setParentPrompt] = useState(jacksonHole.systemRolePrompt);
  const [model, setModel] = useState(jacksonHole.defaultModel);
  const [chatPrompt, setChatPrompt] = useState(jacksonHole.channels[0].overridePrompt);
  const [voicePrompt, setVoicePrompt] = useState(voiceChannel.overridePrompt);
  const [emailPrompt, setEmailPrompt] = useState(jacksonHole.channels[2].overridePrompt);
  const [voiceStack, setVoiceStack] = useState<VoiceStack>(
    voiceChannel.voiceStack ?? { model: 'gpt-realtime', voice: 'ash', transcriptionModel: 'whisper-1' },
  );
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
  const limit =
    activeLayer === 'parent'
      ? jacksonHole.systemRoleLimit
      : jacksonHole.channels.find((c) => c.id === activeLayer)?.overrideLimit ?? 2500;
  const activeMeta = layerMeta(activeLayer);
  const activeChannel = jacksonHole.channels.find((c) => c.id === activeLayer);

  return (
    <div className="space-y-5">
      <header>
        <h2 className="text-xl font-semibold text-ink-900">Instructions</h2>
        <p className="text-sm text-slate-500 mt-1">
          Custom instructions configure the agent's personality, response style, and behavior.
          Channel layers extend the parent with channel-specific rules.
        </p>
      </header>

      <LayerPicker layers={layers} active={activeLayer} onSelect={setActiveLayer} />

      <ModelRow
        activeLayer={activeLayer}
        parentModel={model}
        onParentModel={setModel}
        voiceStack={voiceStack}
        onVoiceStack={setVoiceStack}
      />

      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
            Editing layer
          </div>
          <h3 className="text-base font-semibold text-ink-900 mt-0.5 flex items-center gap-2">
            <span>{activeMeta.icon}</span>
            <span>{activeMeta.title}</span>
            {activeChannel?.botscrewBotId && (
              <span className="text-xs font-normal text-slate-400 font-mono">
                {activeChannel.botscrewBotId}
              </span>
            )}
          </h3>
          <p className="text-sm text-slate-500 mt-0.5">{activeMeta.subtitle}</p>
        </div>
      </div>

      {activeLayer === 'email' && activeChannel?.status === 'not-connected' ? (
        <EmailNotConnectedNotice
          value={activeValue}
          onChange={(v) => setLayerValue('email', v)}
          limit={limit}
        />
      ) : (
        <EditorCard
          value={activeValue}
          onChange={(v) => setLayerValue(activeLayer, v)}
          limit={limit}
          hint={activeMeta.hint}
          placeholder={activeMeta.placeholder}
        />
      )}

      <AssembledPreviews layers={layers} />

      <footer className="flex items-center justify-between pt-2">
        <button className="text-sm font-medium text-botscrew-500 hover:text-botscrew-600">
          Reset to default
        </button>
        <div className="flex items-center gap-3">
          <button className="px-4 py-2 text-sm font-medium border border-slate-300 rounded-md hover:bg-slate-50">
            Preview assembled
          </button>
          <button className="px-4 py-2 text-sm font-medium bg-action-500 hover:bg-action-600 text-white rounded-md">
            Save changes
          </button>
        </div>
      </footer>
    </div>
  );
}

function ModelRow({
  activeLayer,
  parentModel,
  onParentModel,
  voiceStack,
  onVoiceStack,
}: {
  activeLayer: LayerId;
  parentModel: string;
  onParentModel: (v: string) => void;
  voiceStack: VoiceStack;
  onVoiceStack: (v: VoiceStack) => void;
}) {
  if (activeLayer === 'parent') {
    return (
      <div className="grid grid-cols-1 max-w-md">
        <FieldDropdown
          label="Default model"
          value={parentModel}
          onChange={onParentModel}
          options={[...PARENT_MODEL_OPTIONS]}
        />
      </div>
    );
  }

  if (activeLayer === 'voice') {
    return (
      <div className="grid grid-cols-3 gap-4">
        <FieldDropdown
          label="Model"
          value={voiceStack.model}
          onChange={(v) => onVoiceStack({ ...voiceStack, model: v })}
          options={[...VOICE_MODEL_OPTIONS]}
        />
        <FieldDropdown
          label="Voice"
          value={voiceStack.voice}
          onChange={(v) => onVoiceStack({ ...voiceStack, voice: v })}
          options={[...VOICE_VOICE_OPTIONS]}
        />
        <FieldDropdown
          label="Transcription Model"
          value={voiceStack.transcriptionModel}
          onChange={(v) => onVoiceStack({ ...voiceStack, transcriptionModel: v })}
          options={[...VOICE_TRANSCRIPTION_OPTIONS]}
        />
      </div>
    );
  }

  // chat / email: model row placeholder (inherit-with-override comes in next task)
  return null;
}

function FieldDropdown({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div>
      <label className="block text-sm text-slate-600 mb-1.5">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-botscrew-400"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

function LayerPicker({
  layers,
  active,
  onSelect,
}: {
  layers: Record<LayerId, string>;
  active: LayerId;
  onSelect: (id: LayerId) => void;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-2 flex items-stretch gap-1">
      <LayerPill
        id="parent"
        active={active}
        onSelect={onSelect}
        icon="●"
        label="Parent · System Role"
        meta={`${layers.parent.length.toLocaleString()} / ${jacksonHole.systemRoleLimit.toLocaleString()}`}
      />
      <div className="w-px bg-slate-200 mx-1" />
      {jacksonHole.channels.map((c) => {
        const override = layers[c.id];
        const isEmpty = override.length === 0;
        const notConnected = c.status === 'not-connected';
        const assembled = layers.parent.length + override.length;
        return (
          <LayerPill
            key={c.id}
            id={c.id}
            active={active}
            onSelect={onSelect}
            icon={c.icon}
            label={c.label}
            botId={c.botscrewBotId}
            meta={
              notConnected
                ? 'not connected'
                : isEmpty
                  ? 'no override'
                  : `+${override.length.toLocaleString()}  →  ${assembled.toLocaleString()}`
            }
            disabled={notConnected && isEmpty}
          />
        );
      })}
    </div>
  );
}

function LayerPill({
  id,
  active,
  onSelect,
  icon,
  label,
  meta,
  botId,
  disabled,
}: {
  id: LayerId;
  active: LayerId;
  onSelect: (id: LayerId) => void;
  icon: string;
  label: string;
  meta: string;
  botId?: string | null;
  disabled?: boolean;
}) {
  const isActive = active === id;
  return (
    <button
      onClick={() => onSelect(id)}
      disabled={disabled}
      className={`flex-1 text-left rounded-md px-3 py-2 transition ${
        isActive
          ? 'bg-botscrew-50 ring-2 ring-botscrew-400 text-ink-900'
          : disabled
            ? 'text-slate-400 cursor-not-allowed'
            : 'hover:bg-slate-50 text-ink-900'
      }`}
    >
      <div className="flex items-center gap-1.5">
        <span className="text-sm leading-none">{icon}</span>
        <span className="text-sm font-medium truncate">{label}</span>
      </div>
      <div className="mt-0.5 ml-5 text-[11px] text-slate-500 truncate">
        {botId && <span className="font-mono mr-1.5">{botId}</span>}
        {meta}
      </div>
    </button>
  );
}

function EditorCard({
  value,
  onChange,
  limit,
  hint,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  limit: number;
  hint: string;
  placeholder?: string;
}) {
  const overLimit = value.length > limit;
  const nearLimit = value.length > limit * 0.95 && !overLimit;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-card">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div className="text-sm font-semibold text-ink-900">Customize instructions</div>
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${
            overLimit
              ? 'bg-danger/10 text-danger border-danger/30'
              : nearLimit
                ? 'bg-warn/10 text-warn border-warn/30'
                : 'bg-slate-50 text-slate-600 border-slate-200'
          }`}
        >
          {value.length.toLocaleString()} / {limit.toLocaleString()}
        </span>
      </div>
      <div className="p-4">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full min-h-[420px] text-sm font-mono text-ink-900 bg-slate-50 border border-slate-200 rounded-md p-3 focus:outline-none focus:ring-2 focus:ring-botscrew-400"
        />
        <div className="text-xs text-slate-400 mt-2">{hint}</div>
      </div>
    </div>
  );
}

function EmailNotConnectedNotice({
  value,
  onChange,
  limit,
}: {
  value: string;
  onChange: (v: string) => void;
  limit: number;
}) {
  return (
    <div className="space-y-3">
      <div className="bg-warn/10 border border-warn/30 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <span className="text-xl">✉️</span>
          <div className="flex-1 text-sm text-slate-700">
            <div className="font-semibold text-ink-900 mb-1">Email isn't connected yet</div>
            <p className="text-slate-600">
              You can pre-write the Email layer here — it'll be pushed to the Email Bot the moment
              you connect an inbound address.
            </p>
            <button className="mt-2 text-sm font-medium text-botscrew-500 hover:text-botscrew-600">
              Connect in Settings → Channels →
            </button>
          </div>
        </div>
      </div>
      <EditorCard
        value={value}
        onChange={onChange}
        limit={limit}
        hint="This layer is editable now but will only ship to the Bot once Email is connected."
      />
    </div>
  );
}

function AssembledPreviews({ layers }: { layers: Record<LayerId, string> }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-card">
      <div className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase mb-3">
        Assembled per channel · what each Botscrew Bot actually sees
      </div>
      <div className="space-y-2">
        {jacksonHole.channels.map((c) => {
          const override = layers[c.id];
          const assembled = layers.parent.length + override.length;
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
                  {empty ? 'reserved · not yet shipped' : `${assembled.toLocaleString()} chars`}
                </span>
                {!empty && (
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

function SectionPlaceholder({
  label,
  count,
  extra,
  cta,
}: {
  label: string;
  count: number;
  extra?: string;
  cta: string;
}) {
  return (
    <div>
      <header className="mb-5">
        <h2 className="text-xl font-semibold text-ink-900">{label}</h2>
        <p className="text-sm text-slate-500 mt-1">
          {label === 'Text Edits' && 'Find-and-replace style overrides for specific phrases.'}
          {label === 'Files' && 'Documents the bot can reference when answering.'}
          {label === 'Website' && 'Crawled pages from your site that feed the bot\'s knowledge.'}
        </p>
      </header>
      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center shadow-card">
        <div className="text-4xl font-semibold text-ink-900">{count}</div>
        <div className="text-sm text-slate-500 mt-1">{label}</div>
        {extra && <div className="text-xs text-slate-400 mt-2">{extra}</div>}
        <button className="mt-4 text-sm font-medium text-botscrew-500 hover:text-botscrew-600">
          {cta} →
        </button>
      </div>
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
        hint: 'Channel-specific rules (length, formatting, fallback) live on each channel layer below — not here.',
        placeholder: '',
      };
    case 'chat':
      return {
        title: 'Chat',
        subtitle: 'Web, Facebook, WhatsApp, SMS. Short-form messaging — appended to the Parent.',
        icon: '💬',
        hint: 'This override is appended to the Parent when Chat handles a message.',
        placeholder: 'Add chat-specific rules…',
      };
    case 'voice':
      return {
        title: 'Voice',
        subtitle: 'Phone calls via Twilio. Spoken responses — appended to the Parent.',
        icon: '📞',
        hint: 'This override is appended to the Parent when Voice handles a call.',
        placeholder: 'Add voice-specific rules…',
      };
    case 'email':
      return {
        title: 'Email',
        subtitle: 'Inbound + outbound email. Long-form, threaded — appended to the Parent.',
        icon: '✉️',
        hint: 'This override is appended to the Parent when Email handles a message.',
        placeholder: 'Add email-specific rules…',
      };
  }
}
