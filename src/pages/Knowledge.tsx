import { useEffect, useMemo, useState } from 'react';
import {
  jacksonHole,
  renderTemplate,
  PARENT_MODEL_OPTIONS,
  VOICE_MODEL_OPTIONS,
  VOICE_VOICE_OPTIONS,
  VOICE_TRANSCRIPTION_OPTIONS,
  isOpenAIVoice,
  loadCustomVoices,
  saveCustomVoices,
} from '../data/parent';
import type { LayerId, VoiceStack, ResortTemplate, CustomVoice } from '../data/parent';
import { LayerIcon } from '../components/LayerIcon';
import TemplateForm from '../components/TemplateForm';
import TestVoiceModal from '../components/TestVoiceModal';
import AssembledPreviewModal from '../components/AssembledPreviewModal';
import { ChevronsRight, Phone, MessageCircle, X, Check, KeyRound } from 'lucide-react';
import {
  isElevenLabsConfigured,
  getElevenLabsApiKey,
  getElevenLabsAgentId,
  setElevenLabsApiKey,
  setElevenLabsAgentId,
  clearElevenLabsCreds,
} from '../lib/elevenLabsVoice';

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

const STORAGE_KEY = `omni.parent.${jacksonHole.id}`;

interface PersistedState {
  template: ResortTemplate;
  parentPrompt: string;
  chatPrompt: string;
  voicePrompt: string;
  voiceWelcome: string;
  emailPrompt: string;
  voiceStack: VoiceStack;
  model: string;
  savedAt: number;
}

function loadFromStorage(): Partial<PersistedState> | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PersistedState;
  } catch {
    return null;
  }
}

function Instructions() {
  const voiceChannel = jacksonHole.channels[1];
  const persisted = loadFromStorage();
  const [parentPrompt, setParentPrompt] = useState(
    persisted?.parentPrompt ?? jacksonHole.systemRolePrompt,
  );
  const [model, setModel] = useState(persisted?.model ?? jacksonHole.defaultModel);
  const [chatPrompt, setChatPrompt] = useState(
    persisted?.chatPrompt ?? jacksonHole.channels[0].overridePrompt,
  );
  const [voicePrompt, setVoicePrompt] = useState(
    persisted?.voicePrompt ?? voiceChannel.overridePrompt,
  );
  const [voiceWelcome, setVoiceWelcome] = useState(
    persisted?.voiceWelcome ?? voiceChannel.welcomeMessage ?? '',
  );
  const [emailPrompt, setEmailPrompt] = useState(
    persisted?.emailPrompt ?? jacksonHole.channels[2].overridePrompt,
  );
  const [voiceStack, setVoiceStack] = useState<VoiceStack>(
    persisted?.voiceStack ??
      voiceChannel.voiceStack ??
      { model: 'gpt-realtime', voice: 'ash', transcriptionModel: 'whisper-1' },
  );
  const [activeLayer, setActiveLayer] = useState<LayerId>('parent');
  const [parentSubTab, setParentSubTab] = useState<'template' | 'customization'>('template');
  const [testChannel, setTestChannel] = useState<'chat' | 'voice' | null>(null);
  const [template, setTemplate] = useState<ResortTemplate>(
    persisted?.template ?? jacksonHole.template,
  );
  const [savedAt, setSavedAt] = useState<number | null>(persisted?.savedAt ?? null);
  const [savedFlash, setSavedFlash] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [customVoices, setCustomVoices] = useState<CustomVoice[]>(() => loadCustomVoices());

  const addCustomVoice = (name: string, voiceId: string) => {
    const newVoice: CustomVoice = {
      id: `cv-${Math.random().toString(36).slice(2, 9)}`,
      name: name.trim(),
      voiceId: voiceId.trim(),
    };
    const next = [...customVoices, newVoice];
    setCustomVoices(next);
    saveCustomVoices(next);
    return newVoice;
  };

  const removeCustomVoice = (id: string) => {
    const next = customVoices.filter((v) => v.id !== id);
    setCustomVoices(next);
    saveCustomVoices(next);
  };

  const save = () => {
    const data: PersistedState = {
      template,
      parentPrompt,
      chatPrompt,
      voicePrompt,
      voiceWelcome,
      emailPrompt,
      voiceStack,
      model,
      savedAt: Date.now(),
    };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setSavedAt(data.savedAt);
      setSavedFlash(true);
    } catch (e) {
      console.error('Save failed', e);
    }
  };

  useEffect(() => {
    if (!savedFlash) return;
    const t = setTimeout(() => setSavedFlash(false), 1800);
    return () => clearTimeout(t);
  }, [savedFlash]);

  // Full assembled Parent prompt = Preset (rendered) + Custom Instructions.
  const assembledParent = useMemo(
    () => `${renderTemplate(template)}\n\n${parentPrompt}`,
    [template, parentPrompt],
  );

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
        onTestVoice={() => setTestChannel('voice')}
        onTestChat={() => setTestChannel('chat')}
        customVoices={customVoices}
        onAddCustomVoice={addCustomVoice}
        onRemoveCustomVoice={removeCustomVoice}
      />

      <TestVoiceModal
        open={testChannel !== null}
        onClose={() => setTestChannel(null)}
        channel={testChannel ?? 'voice'}
        voiceStack={voiceStack}
        chatModel={model}
        welcomeMessage={testChannel === 'voice' ? voiceWelcome : undefined}
        systemPrompt={
          testChannel === 'chat'
            ? `${assembledParent}\n\n---\n\n${chatPrompt}`
            : `${assembledParent}\n\n---\n\n${voicePrompt}${
                voiceWelcome.trim()
                  ? `\n\nOpen every call with exactly this greeting before anything else: "${voiceWelcome.trim()}"`
                  : ''
              }`
        }
      />

      <AssembledPreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        assembledParent={assembledParent}
        chatOverride={chatPrompt}
        voiceOverride={voicePrompt}
        emailOverride={emailPrompt}
        chatBotId={jacksonHole.channels[0].botscrewBotId ?? undefined}
        voiceBotId={jacksonHole.channels[1].botscrewBotId ?? undefined}
        emailBotId={jacksonHole.channels[2].botscrewBotId ?? undefined}
        emailConnected={jacksonHole.channels[2].status === 'active'}
      />

      <div>
        <h3 className="text-base font-semibold text-ink-900 flex items-center gap-2">
          <LayerIcon id={activeLayer} className="h-4 w-4 text-slate-600" />
          <span>{activeMeta.title}</span>
        </h3>
        <p className="text-sm text-slate-500 mt-1">{activeMeta.subtitle}</p>
      </div>

      {activeLayer === 'voice' && (
        <div className="bg-white border border-slate-200 rounded-xl shadow-card">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">👋</span>
              <div>
                <div className="text-sm font-semibold text-ink-900">Welcome message</div>
                <p className="text-xs text-slate-500">
                  First thing the bot says when a call connects. Sent as ElevenLabs
                  <code className="mx-1 font-mono">firstMessage</code> override · injected into the
                  OpenAI Realtime prompt as the opening line.
                </p>
              </div>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {voiceWelcome.length} chars
            </span>
          </div>
          <div className="p-4">
            <input
              type="text"
              value={voiceWelcome}
              onChange={(e) => setVoiceWelcome(e.target.value)}
              placeholder="Welcome to Jackson Hole! How can we help today?"
              className="w-full text-sm px-3 py-2 border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-botscrew-400"
            />
            <p className="text-[11px] text-slate-400 mt-1.5">
              Leave empty to let the bot wait for the caller to speak first.
            </p>
          </div>
        </div>
      )}

      {activeLayer === 'parent' ? (
        <>
          <div className="border-b border-slate-200 flex items-center gap-1">
            <SubTab
              id="template"
              active={parentSubTab}
              onClick={setParentSubTab}
              label="Preset"
            />
            <SubTab
              id="customization"
              active={parentSubTab}
              onClick={setParentSubTab}
              label="Custom Instructions"
            />
          </div>
          {parentSubTab === 'template' ? (
            <TemplateForm template={template} onChange={setTemplate} />
          ) : (
            <EditorCard
              value={parentPrompt}
              onChange={setParentPrompt}
              limit={limit}
              hint="Partner-specific rules and scripts not covered by the preset (e.g. Peak Pass blackouts, military discount scripts, persona definitions)."
              placeholder=""
            />
          )}
        </>
      ) : activeLayer === 'email' && activeChannel?.status === 'not-connected' ? (
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

      <footer className="flex items-center justify-between pt-2">
        <button
          onClick={() => {
            if (
              confirm(
                'Discard local edits and restore the GSB defaults for this resort? (Wipes saved Preset, Custom Instructions, and channel overrides on this device.)',
              )
            ) {
              try {
                window.localStorage.removeItem(STORAGE_KEY);
              } catch {
                /* noop */
              }
              window.location.reload();
            }
          }}
          className="text-sm font-medium text-botscrew-500 hover:text-botscrew-600"
        >
          Reset to default
        </button>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          {savedFlash ? (
            <span className="inline-flex items-center gap-1 text-success font-medium">
              ✓ Saved
            </span>
          ) : savedAt ? (
            <span>Last saved {new Date(savedAt).toLocaleTimeString()}</span>
          ) : null}
          <button
            onClick={() => setPreviewOpen(true)}
            className="px-4 py-2 text-sm font-medium border border-slate-300 rounded-md hover:bg-slate-50"
          >
            Preview assembled
          </button>
          <button
            onClick={save}
            className="px-4 py-2 text-sm font-medium bg-action-500 hover:bg-action-600 text-white rounded-md"
          >
            Save changes
          </button>
        </div>
      </footer>
    </div>
  );
}

function SubTab({
  id,
  active,
  onClick,
  label,
}: {
  id: 'template' | 'customization';
  active: 'template' | 'customization';
  onClick: (id: 'template' | 'customization') => void;
  label: string;
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
      {label}
    </button>
  );
}

function ModelRow({
  activeLayer,
  parentModel,
  onParentModel,
  voiceStack,
  onVoiceStack,
  onTestVoice,
  onTestChat,
  customVoices,
  onAddCustomVoice,
  onRemoveCustomVoice,
}: {
  activeLayer: LayerId;
  parentModel: string;
  onParentModel: (v: string) => void;
  voiceStack: VoiceStack;
  onVoiceStack: (v: VoiceStack) => void;
  onTestVoice: () => void;
  onTestChat: () => void;
  customVoices: CustomVoice[];
  onAddCustomVoice: (name: string, voiceId: string) => CustomVoice;
  onRemoveCustomVoice: (id: string) => void;
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
      <VoiceModelRow
        voiceStack={voiceStack}
        onVoiceStack={onVoiceStack}
        onTestVoice={onTestVoice}
        parentModel={parentModel}
        customVoices={customVoices}
        onAddCustomVoice={onAddCustomVoice}
        onRemoveCustomVoice={onRemoveCustomVoice}
      />
    );
  }

  if (activeLayer === 'chat') {
    return (
      <div className="flex items-end justify-between gap-4">
        <div className="text-xs text-slate-500">
          <span className="font-medium text-slate-700">Model:</span> inherits Parent (
          <code className="font-mono text-ink-900">{parentModel}</code>) ·{' '}
          <button className="text-botscrew-500 hover:underline">Override</button>
        </div>
        <button
          onClick={onTestChat}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-botscrew-500 hover:bg-botscrew-600 text-white rounded-md whitespace-nowrap shadow-sm"
          title="Test the chat prompt without opening the widget"
        >
          <MessageCircle className="h-3.5 w-3.5" strokeWidth={2} />
          Test Chat AI
        </button>
      </div>
    );
  }

  // email: not connected yet
  return null;
}

// ── Voice model row with provider-aware dropdowns + custom voices ──────────
function VoiceModelRow({
  voiceStack,
  onVoiceStack,
  onTestVoice,
  parentModel,
  customVoices,
  onAddCustomVoice,
  onRemoveCustomVoice,
}: {
  voiceStack: VoiceStack;
  onVoiceStack: (v: VoiceStack) => void;
  onTestVoice: () => void;
  parentModel: string;
  customVoices: CustomVoice[];
  onAddCustomVoice: (name: string, voiceId: string) => CustomVoice;
  onRemoveCustomVoice: (id: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftVoiceId, setDraftVoiceId] = useState('');

  const isOpenAI = isOpenAIVoice(voiceStack.voice);

  const saveDraft = () => {
    const name = draftName.trim();
    const id = draftVoiceId.trim();
    if (!name || !id) return;
    const added = onAddCustomVoice(name, id);
    setDraftName('');
    setDraftVoiceId('');
    setAdding(false);
    // Auto-select the newly added voice
    onVoiceStack({ ...voiceStack, voice: added.voiceId, model: parentModel });
  };

  const switchToOpenAI = () => {
    onVoiceStack({
      ...voiceStack,
      voice: VOICE_VOICE_OPTIONS[0],
      model: VOICE_MODEL_OPTIONS[0],
    });
  };

  const switchToCustom = () => {
    if (customVoices.length > 0) {
      onVoiceStack({
        ...voiceStack,
        voice: customVoices[0].voiceId,
        model: parentModel,
      });
    } else {
      // No custom voices yet → open the Add modal directly
      setAdding(true);
    }
  };

  return (
    <div className="space-y-3">
      {/* Provider tab strip */}
      <div className="border-b border-slate-200 flex items-center gap-1 -mb-px">
        <ProviderTab
          active={isOpenAI}
          onClick={() => !isOpenAI && switchToOpenAI()}
          label="OpenAI Realtime"
          subLabel="built-in voices"
        />
        <ProviderTab
          active={!isOpenAI}
          onClick={() => isOpenAI && switchToCustom()}
          label="Custom (ElevenLabs)"
          subLabel={
            customVoices.length > 0
              ? `${customVoices.length} voice${customVoices.length === 1 ? '' : 's'}`
              : 'add a voice'
          }
        />
      </div>

      {isOpenAI ? (
        <div className="grid grid-cols-[1fr_1fr_1fr_auto] gap-4 items-end pt-2">
          <FieldDropdown
            label="Realtime Model"
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
            label="Transcription"
            value={voiceStack.transcriptionModel}
            onChange={(v) => onVoiceStack({ ...voiceStack, transcriptionModel: v })}
            options={[...VOICE_TRANSCRIPTION_OPTIONS]}
          />
          <button
            onClick={onTestVoice}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-botscrew-500 hover:bg-botscrew-600 text-white rounded-md whitespace-nowrap shadow-sm"
            title="Test using OpenAI Realtime"
          >
            <Phone className="h-3.5 w-3.5" strokeWidth={2} />
            Test Voice AI
          </button>
        </div>
      ) : (
        <div className="space-y-2 pt-2">
          <div className="grid grid-cols-[1fr_auto_auto] gap-3 items-end">
            <div>
              <label className="block text-sm text-slate-600 mb-1.5">Custom voice</label>
              <select
                value={voiceStack.voice}
                onChange={(e) => onVoiceStack({ ...voiceStack, voice: e.target.value })}
                className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-botscrew-400"
              >
                {customVoices.length === 0 ? (
                  <option value="">— no custom voices yet —</option>
                ) : (
                  customVoices.map((cv) => (
                    <option key={cv.id} value={cv.voiceId}>
                      {cv.name}
                    </option>
                  ))
                )}
              </select>
            </div>
            <button
              onClick={() => setAdding(true)}
              className="px-3 py-2 text-sm font-medium border border-slate-300 rounded-md hover:bg-slate-50 whitespace-nowrap"
              title="Add a new ElevenLabs custom voice"
            >
              + Add custom voice
            </button>
            <button
              onClick={onTestVoice}
              disabled={customVoices.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-botscrew-500 hover:bg-botscrew-600 text-white rounded-md whitespace-nowrap shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              title="Test using ElevenLabs Conversational AI"
            >
              <Phone className="h-3.5 w-3.5" strokeWidth={2} />
              Test Voice AI
            </button>
          </div>

          <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-md px-3 py-2 flex items-start gap-2">
            <span>ⓘ</span>
            <div className="flex-1">
              <strong className="text-ink-900">LLM is set on the ElevenLabs agent.</strong> Edit
              the agent in{' '}
              <a
                href="https://elevenlabs.io/app/conversational-ai"
                target="_blank"
                rel="noreferrer"
                className="text-botscrew-500 hover:underline"
              >
                ElevenLabs → Conversational AI
              </a>{' '}
              to change which LLM powers responses. Transcription is handled internally — no
              separate STT model.
            </div>
          </div>

          {customVoices.length > 0 && (
            <div className="text-[11px] text-slate-400">
              Active voice_id: <code className="font-mono text-slate-600">{voiceStack.voice}</code>{' '}
              ·{' '}
              <button
                onClick={() => {
                  const found = customVoices.find((cv) => cv.voiceId === voiceStack.voice);
                  if (found && confirm(`Remove "${found.name}"?`)) {
                    onRemoveCustomVoice(found.id);
                    const remaining = customVoices.filter((cv) => cv.id !== found.id);
                    if (remaining.length > 0) {
                      onVoiceStack({ ...voiceStack, voice: remaining[0].voiceId });
                    } else {
                      switchToOpenAI();
                    }
                  }
                }}
                className="text-slate-500 hover:text-danger underline"
              >
                remove this custom voice
              </button>
            </div>
          )}
        </div>
      )}

      {adding && (
        <AddCustomVoiceModal
          onClose={() => {
            setAdding(false);
            setDraftName('');
            setDraftVoiceId('');
          }}
          name={draftName}
          voiceId={draftVoiceId}
          onNameChange={setDraftName}
          onVoiceIdChange={setDraftVoiceId}
          onSave={saveDraft}
        />
      )}
    </div>
  );
}

function ProviderTab({
  active,
  onClick,
  label,
  subLabel,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  subLabel?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2.5 text-sm font-medium border-b-2 transition flex items-baseline gap-2 ${
        active
          ? 'border-botscrew-500 text-botscrew-500'
          : 'border-transparent text-slate-500 hover:text-ink-900'
      }`}
    >
      <span>{label}</span>
      {subLabel && (
        <span className={`text-[11px] ${active ? 'text-botscrew-400' : 'text-slate-400'}`}>
          {subLabel}
        </span>
      )}
    </button>
  );
}

function AddCustomVoiceModal({
  onClose,
  name,
  voiceId,
  onNameChange,
  onVoiceIdChange,
  onSave,
}: {
  onClose: () => void;
  name: string;
  voiceId: string;
  onNameChange: (v: string) => void;
  onVoiceIdChange: (v: string) => void;
  onSave: () => void;
}) {
  const [apiKey, setApiKeyDraft] = useState(getElevenLabsApiKey());
  const [agentId, setAgentIdDraft] = useState(getElevenLabsAgentId());
  const [showCredsEdit, setShowCredsEdit] = useState(!isElevenLabsConfigured());
  const connected = isElevenLabsConfigured() && !showCredsEdit;

  const credsValid = apiKey.trim() && agentId.trim();
  const canSave = name.trim() && voiceId.trim() && (connected || credsValid);

  const handleSave = () => {
    if (showCredsEdit && credsValid) {
      setElevenLabsApiKey(apiKey);
      setElevenLabsAgentId(agentId);
    }
    onSave();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col overflow-hidden max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-ink-900">Add custom voice</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              ElevenLabs voice. All values stored in this browser's localStorage only.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-ink-900 rounded-md p-1 hover:bg-slate-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Connection section */}
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/60">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <KeyRound className="h-3.5 w-3.5 text-slate-500" strokeWidth={1.75} />
                <span className="text-xs font-semibold text-ink-900 uppercase tracking-wider">
                  ElevenLabs Connection
                </span>
                {connected && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-success font-medium">
                    <Check className="h-3 w-3" strokeWidth={2.5} /> connected
                  </span>
                )}
              </div>
              {connected ? (
                <button
                  onClick={() => setShowCredsEdit(true)}
                  className="text-[11px] text-botscrew-500 hover:underline font-medium"
                >
                  edit
                </button>
              ) : isElevenLabsConfigured() ? (
                <button
                  onClick={() => setShowCredsEdit(false)}
                  className="text-[11px] text-slate-500 hover:text-ink-900"
                >
                  cancel edit
                </button>
              ) : null}
            </div>

            {showCredsEdit ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1 font-medium">
                    API Key
                  </label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKeyDraft(e.target.value)}
                    placeholder="sk_..."
                    className="w-full text-sm font-mono px-3 py-2 border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-botscrew-400"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    From{' '}
                    <a
                      href="https://elevenlabs.io/app/settings/api-keys"
                      target="_blank"
                      rel="noreferrer"
                      className="text-botscrew-500 hover:underline"
                    >
                      Settings → API Keys
                    </a>
                    .
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-500 mb-1 font-medium">
                    Agent ID
                  </label>
                  <input
                    type="text"
                    value={agentId}
                    onChange={(e) => setAgentIdDraft(e.target.value)}
                    placeholder="paste agent_id"
                    className="w-full text-sm font-mono px-3 py-2 border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-botscrew-400"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    From{' '}
                    <a
                      href="https://elevenlabs.io/app/conversational-ai"
                      target="_blank"
                      rel="noreferrer"
                      className="text-botscrew-500 hover:underline"
                    >
                      Conversational AI → Agents
                    </a>
                    . The agent must have "Allow overrides" enabled.
                  </p>
                </div>

                {isElevenLabsConfigured() && (
                  <button
                    onClick={() => {
                      if (confirm('Disconnect ElevenLabs from this browser?')) {
                        clearElevenLabsCreds();
                        setApiKeyDraft('');
                        setAgentIdDraft('');
                      }
                    }}
                    className="text-[11px] text-slate-500 hover:text-danger underline"
                  >
                    forget current creds
                  </button>
                )}
              </div>
            ) : (
              <div className="text-[11px] text-slate-500">
                API key + Agent ID saved. <em>Click "edit" above to change them.</em>
              </div>
            )}
          </div>

          {/* Voice section */}
          <div className="px-5 py-4 space-y-4">
            <div className="text-xs font-semibold text-ink-900 uppercase tracking-wider">
              Voice
            </div>

            <div>
              <label className="block text-xs text-slate-500 mb-1.5 font-medium">
                Display name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder="JH Brand Voice"
                autoFocus
                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-botscrew-400"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                How it appears in the Voice dropdown.
              </p>
            </div>

            <div>
              <label className="block text-xs text-slate-500 mb-1.5 font-medium">
                voice_id
              </label>
              <input
                type="text"
                value={voiceId}
                onChange={(e) => onVoiceIdChange(e.target.value)}
                placeholder="e.g. pNInz6obpgDQGcFmaJgB"
                className="w-full text-sm font-mono px-3 py-2 border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-botscrew-400"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                From{' '}
                <a
                  href="https://elevenlabs.io/app/voice-library"
                  target="_blank"
                  rel="noreferrer"
                  className="text-botscrew-500 hover:underline"
                >
                  Voice Library
                </a>{' '}
                — click a voice → copy ID. (Adam default:{' '}
                <code className="font-mono">pNInz6obpgDQGcFmaJgB</code>)
              </p>
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-slate-200 flex items-center justify-between gap-2 bg-slate-50">
          <div className="text-[11px] text-slate-500">
            {!connected && !credsValid
              ? '⚠ ElevenLabs connection needed before saving'
              : connected
                ? '✓ Ready to save'
                : '✓ Will save voice + connect ElevenLabs'}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-ink-900"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!canSave}
              className="px-4 py-1.5 text-sm font-medium bg-action-500 hover:bg-action-600 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {connected ? 'Add voice' : 'Save voice + connect'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
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
        label="Parent"
      />
      <div
        className="flex items-center justify-center px-1"
        aria-label="inherits to"
        title="Parent inherits to all channels"
      >
        <ChevronsRight strokeWidth={1.75} className="h-4 w-4 text-slate-300" />
      </div>
      {jacksonHole.channels.map((c) => (
        <LayerPill
          key={c.id}
          id={c.id}
          active={active}
          onSelect={onSelect}
          label={c.label}
          notConnected={c.status === 'not-connected'}
        />
      ))}
    </div>
  );
}

function LayerPill({
  id,
  active,
  onSelect,
  label,
  notConnected,
}: {
  id: LayerId;
  active: LayerId;
  onSelect: (id: LayerId) => void;
  label: string;
  notConnected?: boolean;
}) {
  const isActive = active === id;
  return (
    <button
      onClick={() => onSelect(id)}
      className={`flex-1 text-left rounded-md px-3 py-3 transition ${
        isActive
          ? 'bg-botscrew-50 ring-2 ring-botscrew-400 text-ink-900'
          : 'hover:bg-slate-50 text-ink-900'
      }`}
    >
      <div className="flex items-center gap-2">
        <LayerIcon
          id={id}
          className={`h-4 w-4 shrink-0 ${isActive ? 'text-botscrew-600' : 'text-slate-500'}`}
        />
        <span className="text-sm font-medium truncate">{label}</span>
        {notConnected && (
          <span className="ml-auto text-[11px] text-slate-400 italic">not connected</span>
        )}
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
        title: 'Parent',
        subtitle:
          'Identity, purpose, role, knowledge base, guardrails, fallbacks, and more. Inherited by every channel.',
        hint: 'Channel-specific rules (length, formatting, fallback) live on each channel layer below — not here.',
        placeholder: '',
      };
    case 'chat':
      return {
        title: 'Chat',
        subtitle: 'Web, Facebook, WhatsApp, SMS. Short-form messaging — appended to the Parent.',
        hint: 'This override is appended to the Parent when Chat handles a message.',
        placeholder: 'Add chat-specific rules…',
      };
    case 'voice':
      return {
        title: 'Voice',
        subtitle: 'Voice specific instructions, welcome message and more.',
        hint: 'This override is appended to the Parent when Voice handles a call.',
        placeholder: 'Add voice-specific rules…',
      };
    case 'email':
      return {
        title: 'Email',
        subtitle: 'Inbound + outbound email. Long-form, threaded — appended to the Parent.',
        hint: 'This override is appended to the Parent when Email handles a message.',
        placeholder: 'Add email-specific rules…',
      };
  }
}
