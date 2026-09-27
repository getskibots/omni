# OMNI Build Summary — Architectural Review

**Repo:** `getskibots/omni`
**Live:** https://omni-gules.vercel.app (Vercel) + https://getskibots.github.io/omni/ (legacy GH Pages)
**Local:** `C:\Users\Brandon\OneDrive - getskitickets.com\Documents\Get Ski Bots\dev\omni`
**Purpose:** Prototype admin dashboard for the new GetSkiBots AI assistant product. Replaces a single 17,500-char Botscrew instruction blob with a **parent + channel** layered architecture (Parent inherits into Chat / Voice / Email overrides).

This document was generated for external architectural review. **Secrets are not committed to source — API keys live in Vercel env vars (server-side) or browser localStorage (dev only).**

---

## 1. Stack & structure

### Framework + build

- **React 19.2** + **TypeScript ~6.0** + **Vite 8** (build: `tsc -b && vite build`)
- **Tailwind v3.4** + PostCSS + Autoprefixer
- **react-router-dom 7.15** with `HashRouter` (no server-side routing needed)
- Module type: `"module"` (ESM)

### Key dependencies (from `package.json`)

```json
{
  "dependencies": {
    "@dnd-kit/core": "^6.3.1",
    "@dnd-kit/sortable": "^10.0.0",
    "@dnd-kit/utilities": "^3.2.2",
    "@elevenlabs/client": "^1.8.1",
    "lucide-react": "^1.16.0",
    "react": "^19.2.6",
    "react-dom": "^19.2.6",
    "react-router-dom": "^7.15.1"
  },
  "devDependencies": {
    "@types/node": "^25.9.1",
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^6.0.1",
    "autoprefixer": "^10.5.0",
    "postcss": "^8.5.15",
    "tailwindcss": "^3.4.19",
    "typescript": "~6.0.2",
    "vite": "^8.0.12"
  }
}
```

### Full file tree

```
omni/
├── api/                                  ← Vercel serverless functions (server-side)
│   ├── elevenlabs-signed-url.ts          ← mints ElevenLabs WS URL (proxies xi-api-key)
│   ├── openai-chat.ts                    ← chat completions proxy
│   ├── openai-realtime-sdp.ts            ← WebRTC SDP exchange proxy (GA Realtime)
│   └── openai-tts.ts                     ← TTS audio proxy
├── src/
│   ├── App.tsx                           ← route map (HashRouter)
│   ├── main.tsx                          ← React root + HashRouter mount
│   ├── index.css                         ← Tailwind layers
│   ├── vite-env.d.ts
│   ├── assets/
│   │   └── logo.png                      ← Get Ski Bots logo (white-on-blue)
│   ├── components/
│   │   ├── AssembledPreviewModal.tsx     ← per-channel concat preview + copy
│   │   ├── DashboardShell.tsx            ← sidebar + topbar layout shell
│   │   ├── LayerIcon.tsx                 ← Crown/MessageCircle/Phone/Mail per layer
│   │   ├── Panel.tsx                     ← generic card with title+eyebrow+right
│   │   ├── Sidebar.tsx                   ← 10-item vertical nav
│   │   ├── TemplateForm.tsx              ← Preset form (Identity/Behavior/Boilerplate/Flows/Knowledge/MultiPass) w/ dnd-kit
│   │   ├── TestVoiceModal.tsx            ← channel-aware Test Chat/Voice AI modal
│   │   └── TopBar.tsx                    ← bot name + Test buttons + user chip
│   ├── data/
│   │   ├── conversations.ts              ← Support omni-inbox mock conversations
│   │   ├── parent.ts                     ← CORE DATA MODEL + Jackson Hole seed + renderTemplate()
│   │   └── template-boilerplate.ts       ← GSB-managed slim boilerplate sections
│   ├── lib/
│   │   ├── elevenLabsVoice.ts            ← ElevenLabs Conversational AI session wrapper
│   │   ├── proxyMode.ts                  ← USE_PROXY = import.meta.env.PROD
│   │   ├── realtimeVoice.ts              ← OpenAI Realtime GA WebRTC client
│   │   └── voiceTest.ts                  ← chat completions + TTS + violation linter + LS key
│   └── pages/
│       ├── Knowledge.tsx                 ← Instructions layered editor (the main work surface)
│       ├── Placeholder.tsx               ← "Coming soon" page for unfinished routes
│       ├── SettingsChannels.tsx          ← Read-only channel wiring summary cards
│       ├── Support.tsx                   ← omni-inbox (chat/voice/email conversations)
│       └── Widget.tsx                    ← static embed-code page
├── .github/workflows/deploy.yml          ← GH Pages auto-deploy (legacy, still active)
├── .gitignore                            ← ignores node_modules, dist, .env*, .claude/, *.tsbuildinfo
├── index.html
├── package.json
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json / tsconfig.app.json / tsconfig.node.json
└── vite.config.ts                        ← base: '/omni/' only when GITHUB_ACTIONS=true
```

### Routing — every route → page component

`src/App.tsx`:

```tsx
<Routes>
  <Route path="/" element={<Navigate to="/knowledge" replace />} />
  <Route path="/knowledge"         element={<Knowledge />} />
  <Route path="/analytics"         element={<Placeholder title="Analytics" />} />
  <Route path="/support"           element={<Support />} />
  <Route path="/ai-edits"          element={<Placeholder title="AI Edits" />} />
  <Route path="/flows"             element={<Placeholder title="Flows" />} />
  <Route path="/actions"           element={<Placeholder title="Actions" />} />
  <Route path="/triggers"          element={<Placeholder title="Triggers" />} />
  <Route path="/widget"            element={<Widget />} />
  <Route path="/settings"          element={<Navigate to="/settings/channels" replace />} />
  <Route path="/settings/channels" element={<SettingsChannels />} />
  <Route path="/help"              element={<Placeholder title="Help" />} />
  <Route path="*"                  element={<Navigate to="/knowledge" replace />} />
</Routes>
```

10 sidebar items in `src/components/Sidebar.tsx`: Analytics · Knowledge · AI Edits · Flows · Actions · Triggers · Support · Widget · Settings · Help.

**Pages that have real implementations:** Knowledge, Support, Widget, SettingsChannels (4 of 10).
**Pages that are `<Placeholder title="…" />` stubs:** Analytics, AI Edits, Flows, Actions, Triggers, Help (6 of 10).

---

## 2. Data model — the core

The entire resort/parent/channel model lives in **`src/data/parent.ts`** (~1000 lines). One file holds the types, the renderTemplate assembler, the boilerplate variable substitution, and the Jackson Hole seed.

### 2.1 Type definitions (verbatim)

```ts
export type ChannelStatus = 'active' | 'not-connected';
export type LayerId = 'parent' | 'chat' | 'voice' | 'email';

export interface VoiceStack {
  model: string;
  voice: string;
  transcriptionModel: string;
}

export interface ChannelLayer {
  id: Exclude<LayerId, 'parent'>;
  label: string;
  icon: string;
  botscrewBotId: string | null;
  status: ChannelStatus;
  wiring: string;
  connectors?: string[];
  overridePrompt: string;
  overrideLimit: number;
  welcomeMessage?: string;
  voiceStack?: VoiceStack;
}

export interface CustomVoice {
  id: string;          // local UI id, e.g. 'pre-autumn'
  name: string;        // display name in the dropdown
  voiceId: string;     // ElevenLabs voice_id (~20 alphanumeric)
  gender: 'female' | 'male';
  prebaked?: boolean;  // true = ships with omni
  accent?: string;     // e.g. "Kiwi" — surfaced as a small badge / suffix
}

export type KnowledgeNoteType = 'rule' | 'critical' | 'script' | 'faq';
export interface KnowledgeNote {
  id: string;
  type: KnowledgeNoteType;
  text: string;
}
export interface KnowledgeUrl {
  key: string;
  label: string;
  url: string;
  enabled: boolean;
  notes?: KnowledgeNote[];
}
export interface KnowledgeGroup {
  id: string;
  emoji: string;
  label: string;
  entries: KnowledgeUrl[];
}

export interface BehaviorSection {
  id: string;
  emoji: string;
  title: string;
  body: string;          // free-form, supports {{Resort Name}} etc.
}

export interface RealtimeFlow {
  key: string;
  label: string;
  enabled: boolean;
}

export type Industry =
  | 'ski-resort' | 'lodging' | 'transportation' | 'ski-rentals'
  | 'dmo' | 'tour-operator' | 'waterpark' | 'help-desk' | 'vacation-rental';

// Today's schema is ski-resort-shaped. When the second vertical lands,
// industry-specific shapes will diverge here.
export interface ResortTemplate {
  industry: Industry;
  resortName: string;
  officialUrl: string;
  contactEmail: string;
  contactPhone: string;
  behaviorSections: BehaviorSection[];
  knowledgeGroups: KnowledgeGroup[];
  flows: RealtimeFlow[];
  multiPass: { hasPartners: boolean; partners: string[] };
  usesEcommerceDoc: boolean;
}

export interface ParentSummary {
  id: string;
  name: string;
  defaultModel: string;
  systemRolePrompt: string;       // the "Custom Instructions" textarea on Parent
  systemRoleLimit: number;         // 12,500 chars
  template: ResortTemplate;
  templateVersion: string;
  templateUpdated: string;
  knowledge: {
    textEdits: number;
    files: number;
    websites: { count: number; lastSync: string };
  };
  channels: ChannelLayer[];
}
```

### 2.2 Budget allocation (locked)

| Layer | Field | Limit |
|---|---|---|
| Parent | `systemRoleLimit` | **12,500 chars** |
| Chat / Voice / Email | `overrideLimit` on each `ChannelLayer` | **2,500 chars each** |

Total **20,000 chars** ship per channel = assembled Parent (12,500) + channel override (2,500). Limits are display-only (warning badges); nothing actually truncates today.

### 2.3 IDs and their formats

| Field | Format | Example |
|---|---|---|
| `ParentSummary.id` | short slug | `'jh'` |
| `KnowledgeGroup.id` | slug or `group-xxxxxxx` for added groups | `'tickets'`, `'group-abc1234'` |
| `KnowledgeUrl.key` | slug or `entry-xxxxxxx` for added entries | `'lift-tickets'`, `'entry-xyz5678'` |
| `KnowledgeNote.id` | `n-xxxxxxx` or static (`'n1'`, `'rt1'`) | `'n1'`, `'n-abc1234'` |
| `BehaviorSection.id` | slug | `'purpose'`, `'role'`, `'behavior-pillars'`, `'time-awareness'`, `'prequalifying'` |
| `ChannelLayer.botscrewBotId` | **`bs_NNNN`** | `'bs_8721'` (chat), `'bs_9034'` (voice), `null` (email) |
| `CustomVoice.id` | `pre-{name}` | `'pre-autumn'`, `'pre-brandon'` |
| `CustomVoice.voiceId` | **ElevenLabs voice_id, ~20 alphanumeric, no prefix** | `'ihescI8y0lnM6ikMAyGZ'`, `'LpnwrzbZy984kxCzwufi'` |
| ElevenLabs agent_id | **`agent_*`** | `'agent_4801ks9kyskcfgetyq0krbqj10cm'` (Jackson Hole, default) |

### 2.4 Channels — how each is represented

The Jackson Hole seed has three channels in `jacksonHole.channels[]`:

```ts
channels: [
  {
    id: 'chat',
    label: 'Chat',
    icon: '💬',
    botscrewBotId: 'bs_8721',
    status: 'active',
    wiring: 'Connectors: Web · Facebook · WhatsApp · SMS',
    connectors: ['Web', 'Facebook', 'WhatsApp', 'SMS'],
    overridePrompt: CHAT_OVERRIDE,      // ~2,500-char string literal
    overrideLimit: 2500,
  },
  {
    id: 'voice',
    label: 'Voice',
    icon: '📞',
    botscrewBotId: 'bs_9034',
    status: 'active',
    wiring: 'Twilio: +1 307·284·5392',
    overridePrompt: VOICE_OVERRIDE,
    overrideLimit: 2500,
    welcomeMessage: 'Welcome to Jackson Hole! How can we help you today?',
    voiceStack: {
      model: 'voice-realtime-2.0',     // GSB label; actual API uses 'gpt-realtime'
      voice: 'ash',                     // OpenAI voice; ElevenLabs voice_ids also valid
      transcriptionModel: 'whisper-1',
    },
  },
  {
    id: 'email',
    label: 'Email',
    icon: '✉️',
    botscrewBotId: null,
    status: 'not-connected',
    wiring: 'Connect an inbound address to enable email replies.',
    overridePrompt: EMAIL_OVERRIDE,
    overrideLimit: 2500,
  },
]
```

**Chat** has connectors (Web/FB/WhatsApp/SMS) — all four are jammed into one Bot ID today (matches production Botscrew topology). **Voice** has a Twilio phone number + a `voiceStack`. **Email** is stubbed with `botscrewBotId: null` and `status: 'not-connected'` — the override prompt exists and is editable, but won't ship until email is wired up.

### 2.5 Knowledge representation

Knowledge is **17 groups** for Jackson Hole, each with editable entries. Each entry can have **typed notes** (critical/rule/script/faq) that render inline in the assembled prompt with colored prefixes. Excerpt of the seed:

```ts
knowledgeGroups: [
  {
    id: 'resort-info',
    emoji: '🏔️',
    label: 'Resort Info by Category',
    entries: [
      { key: 'hours',         label: 'Hours of operation',      url: '', enabled: true },
      { key: 'trail-maps',    label: 'Trail Maps & Slope Difficulty',
        url: 'https://www.jacksonhole.com/maps/mountain-winter', enabled: true },
      { key: 'snow-reports',  label: 'Snow Reports & Weather',
        url: 'https://www.jacksonhole.com/mountain-report',      enabled: true },
      // … more
    ],
  },
  {
    id: 'tickets',
    emoji: '🎫',
    label: 'Tickets',
    entries: [
      {
        key: 'lift-tickets',
        label: 'Lift Tickets',
        url: 'https://www.jacksonhole.com/lift-tickets',
        enabled: true,
        notes: [
          { id: 'n1', type: 'critical',
            text: 'Never quote rates or prices. Direct guests to 855-679-7246 for pricing.' },
          { id: 'n2', type: 'rule',
            text: 'No single-ride tram or gondola tickets. Use date-based logic for the correct link.' },
          { id: 'n3', type: 'script',
            text: 'Ticket prices vary by date of visit and the best pricing is found online in advance of arrival.' },
        ],
      },
      // …
    ],
  },
  // 15 more groups: season-passes, lessons, rentals, refund-policies,
  // winter-activities, tubing, summer-activities, lodging, dining,
  // guest-services, parking-transit, events, pet-service-animals,
  // packing-gear, other
]
```

**Realtime flows** (separate from knowledge) are tool calls the bot can make for live data:

```ts
flows: [
  { key: 'get_snow_report',    label: 'get_snow_report',    enabled: true  },
  { key: 'get_lift_status',    label: 'get_lift_status',    enabled: true  },
  { key: 'get_terrain_status', label: 'get_terrain_status', enabled: false },
  { key: 'get_weather',        label: 'get_weather',        enabled: true  },
  { key: 'get_parking',        label: 'get_parking',        enabled: true  },
  { key: 'get_events',         label: 'get_events',         enabled: true  },
]
```

### 2.6 Prebaked custom voices (GSB-curated ElevenLabs library)

```ts
export const PREBAKED_CUSTOM_VOICES: CustomVoice[] = [
  // Female
  { id: 'pre-autumn', name: 'Autumn', voiceId: 'ihescI8y0lnM6ikMAyGZ', gender: 'female', prebaked: true },
  { id: 'pre-sierra', name: 'Sierra', voiceId: '0xibdd3BNglACBXTeQoJ',  gender: 'female', prebaked: true },
  { id: 'pre-sonny',  name: 'Sonny',  voiceId: 'HhwfzJctzawQF7G6zlbo', gender: 'female', prebaked: true },
  { id: 'pre-winter', name: 'Winter', voiceId: 'p1ZXM5QbQ5JtHpWB7n5M', gender: 'female', prebaked: true },
  // Male
  { id: 'pre-forest', name: 'Forest', voiceId: '2u5AAMHdRp6fmmqDm2kq', gender: 'male', prebaked: true },
  { id: 'pre-hawk',   name: 'Hawk',   voiceId: '2J5a0tOuiJLPoVd4xC8w', gender: 'male', prebaked: true },
  { id: 'pre-river',  name: 'River',  voiceId: '9tGUFJVKv4fLO52eYj4h', gender: 'male', prebaked: true, accent: 'Kiwi' },
  { id: 'pre-stone',  name: 'Stone',  voiceId: 'xUaP8oqnE6ERbbFQObbz', gender: 'male', prebaked: true },
  { id: 'pre-brandon',name: 'Brandon',voiceId: 'LpnwrzbZy984kxCzwufi', gender: 'male', prebaked: true },
];

export const DEFAULT_ELEVENLABS_AGENT_ID = 'agent_4801ks9kyskcfgetyq0krbqj10cm';
```

`loadCustomVoices()` returns only the prebaked list. `loadUserCustomVoices()` reads `localStorage['omni.custom_voices']` for user-added voices (currently the UI doesn't expose adding them — vestige of a removed feature).

### 2.7 OpenAI voice catalogs

```ts
export const VOICE_MODEL_OPTIONS = [
  'voice-realtime-2.0', 'voice-realtime-1.5', 'voice-realtime-1.0',
  'gpt-4o-realtime-preview',
  'gpt-4o-realtime-preview-2025-06-03', 'gpt-4o-realtime-preview-2024-12-17',
] as const;

export const VOICE_VOICE_OPTIONS = [
  'alloy','ash','ballad','coral','echo','sage','shimmer','verse',
] as const;
export const OPENAI_VOICES_FEMALE = ['coral','sage','shimmer'] as const;
export const OPENAI_VOICES_MALE   = ['alloy','ash','ballad','echo','verse'] as const;

export const VOICE_TRANSCRIPTION_OPTIONS = [
  'whisper-1','gpt-4o-mini-transcribe','gpt-4o-transcribe',
] as const;

export const PARENT_MODEL_OPTIONS = [
  'gpt-5.5','gpt-5.5-mini','gpt-5.4','gpt-5.4-mini','gpt-5.2','gpt-5','gpt-5-mini',
  'gpt-4.1','gpt-4.1-mini',
  'claude-opus-4-7','claude-sonnet-4-6','claude-haiku-4-5',
] as const;

export function isOpenAIVoice(voice: string): boolean {
  return (VOICE_VOICE_OPTIONS as readonly string[]).includes(voice);
}
```

`isOpenAIVoice()` is the **provider switch** — when the selected voice matches an OpenAI name, omni routes through the OpenAI Realtime client. Otherwise (anything that looks like an ElevenLabs `voice_id`) it routes through ElevenLabs Conversational AI.

### 2.8 Note metadata (rendering tones for the 4 note types)

```ts
export const NOTE_TYPE_META: Record<KnowledgeNoteType, {
  emoji: string; label: string; tone: string; renderLabel: string;
}> = {
  critical: { emoji: '⚠',  label: 'Critical', tone: 'bg-amber-50 text-amber-800 border-amber-200',
              renderLabel: 'CRITICAL' },
  rule:     { emoji: '📋', label: 'Rule',     tone: 'bg-slate-100 text-slate-700 border-slate-200',
              renderLabel: 'Rule' },
  script:   { emoji: '💬', label: 'Script',   tone: 'bg-botscrew-50 text-botscrew-700 border-botscrew-200',
              renderLabel: 'Script' },
  faq:      { emoji: '❓', label: 'FAQ',      tone: 'bg-violet-50 text-violet-700 border-violet-200',
              renderLabel: 'FAQ' },
};
```

---

## 3. Each page — what it does + what data it touches

### 3.1 `Knowledge.tsx` — the main work surface

This is where 90% of the editing happens. Layout:

- Left rail: **Knowledge Layers** (4 sections: Instructions / Text Edits / Files / Website).
  - Only `Instructions` is real. The other three are `<SectionPlaceholder>` cards showing a count from `jacksonHole.knowledge.{textEdits|files|websites}` and a CTA button that does nothing.
- Right pane: depends on the selected section.

**Instructions** sub-route renders:

1. **`<LayerPicker>`** — pill row: `[👑 Parent]` ⇢ `[💬 Chat]` `[📞 Voice]` `[✉️ Mail]`. `ChevronsRight` between Parent and the channels is the inheritance arrow.
2. **`<ModelRow>`** — per-layer model selector:
   - Parent: single `Default model` dropdown (`PARENT_MODEL_OPTIONS`).
   - Voice: provider tab strip (Built-in voices vs. Custom voices) + Model/Voice/Transcription dropdowns + **Test Voice AI** button.
   - Chat: read-only "inherits Parent (gpt-X)" pill + Override link (unwired) + **Test Chat AI** button.
   - Email: returns `null` (no model row).
3. **`<TestVoiceModal>`** mounted; opened by the Test button.
4. **`<AssembledPreviewModal>`** mounted; opened by the footer "Preview assembled" button.
5. Voice-only: a **👋 Welcome message** card above the editor.
6. The editor area:
   - **Parent** has two sub-tabs:
     - **Preset** — renders `<TemplateForm template={template} onChange={setTemplate} />`
     - **Custom Instructions** — renders `<EditorCard>` for the freeform `parentPrompt` textarea
   - **Chat / Voice** — `<EditorCard>` for the override prompt.
   - **Email when not-connected** — `<EmailNotConnectedNotice>` (banner + editor below).
7. Footer:
   - "Reset to default" — confirms, removes `localStorage[STORAGE_KEY]`, reloads.
   - "Preview assembled" → opens the modal.
   - "Save changes" → writes a `PersistedState` blob to localStorage.

**State managed locally + persisted to `localStorage[omni.parent.jh]`:**

```ts
interface PersistedState {
  template: ResortTemplate;
  parentPrompt: string;     // Custom Instructions textarea
  chatPrompt: string;       // chat override
  voicePrompt: string;      // voice override
  voiceWelcome: string;     // voice welcome message (👋 field)
  emailPrompt: string;      // email override (editable, not yet shipped)
  voiceStack: VoiceStack;
  model: string;            // parent default model
  savedAt: number;
}
```

**Assembled Parent** (lifted to this component, fed into the test modal):

```ts
const assembledParent = useMemo(
  () => `${renderTemplate(template)}\n\n${parentPrompt}`,
  [template, parentPrompt],
);
```

Test modal's `systemPrompt` prop wires up the channel-specific concat:

```tsx
systemPrompt={
  testChannel === 'chat'
    ? `${assembledParent}\n\n---\n\n${chatPrompt}`
    : `${assembledParent}\n\n---\n\n${voicePrompt}${
        voiceWelcome.trim()
          ? `\n\nOpen every call with exactly this greeting before anything else: "${voiceWelcome.trim()}"`
          : ''
      }`
}
```

For voice: ElevenLabs receives `voiceWelcome` separately as `agent.firstMessage`; OpenAI Realtime gets the greeting injected into the system prompt (since Realtime has no separate first-message field).

### 3.2 `Support.tsx` — omni-inbox

Three-section layout:

1. **Header** — title, "Last 7/30/Custom" range pills (read-only), Export button (unwired), channel filter chips (All/Chat/Voice/Email with counts), "Needs attention" toggle, search input.
2. **List pane** (360px) — `<ConversationRow>` per conversation: channel badge + connector, identity, time, subject (email), preview, attention pills, unread count.
3. **Detail pane** — `<ConversationPane>` showing channel badge + identity + subject + duration, "Related on other channels" links via `linkedConversationIds`, then messages.

Reads exclusively from `src/data/conversations.ts` (static mock array — 8 conversations covering all channels + connectors + attention flags). No persistence, no network calls.

`MessageBubble` styles by channel (chat = bubbles, email = whitespace-pre-wrap for paragraph layout). `AudioPlaceholder` is a non-functional play UI shown above voice conversation messages.

### 3.3 `SettingsChannels.tsx` — channel wiring summary

Read-only cards from `jacksonHole.channels[]`. Each card shows:
- LayerIcon + channel label + `botscrewBotId` (or `—` for null)
- Status pill: `Active` (green) or `Not connected` (slate)
- `wiring` string ("Connectors: Web · Facebook · WhatsApp · SMS" / "Twilio: +1 307·284·5392" / "Connect an inbound address…")
- Connector chips for Chat
- "Configure wiring →" / "Connect →" button (unwired — just a link styled button)

### 3.4 `Widget.tsx`

Static page with two cards:
- **Appearance & Behavior** — "Configuration UI coming soon."
- **Embed Code** — hardcoded `<script>` snippet showing `data-bot-id="bs_8721"` (the chat Bot ID).

Plus a footer note explaining the architecture: "Widget is a shortcut to the Web connector under Settings → Channels → Chat."

### 3.5 `Placeholder.tsx`

```tsx
export default function Placeholder({ title }: Props) {
  return (
    <div className="px-8 py-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold text-ink-900">{title}</h1>
      <p className="text-sm text-slate-500 mt-2">Coming soon.</p>
    </div>
  );
}
```

Used for **6 routes**: Analytics, AI Edits, Flows, Actions, Triggers, Help.

---

## 4. The assembler / prompt logic

### 4.1 Variable substitution

```ts
export function substituteVariables(text: string, t: ResortTemplate): string {
  return text
    .replace(/\{\{Resort Name\}\}/g,  t.resortName  || '{{Resort Name}}')
    .replace(/\{\{Resort URL\}\}/g,   t.officialUrl || '{{Resort URL}}')
    .replace(/\{\{Resort Email\}\}/g, t.contactEmail|| '{{Resort Email}}')
    .replace(/\{\{Resort Phone\}\}/g, t.contactPhone|| '{{Resort Phone}}');
}
```

Only 4 variables get substituted at assembly time. `{{bot_datetime}}` is intentionally left literal — Botscrew (the current runtime) substitutes that at request time.

### 4.2 `renderTemplate()` — turns the `ResortTemplate` form into the Preset string

```ts
export function renderTemplate(t: ResortTemplate): string {
  const lines: string[] = [];

  // Header
  lines.push(`Resort: ${t.resortName}`);
  if (t.officialUrl) lines.push(`Official Website: ${t.officialUrl}`);
  lines.push('');

  // Editable behavior sections (Purpose, Role, Behavior Pillars, Time Awareness, Prequalifying)
  t.behaviorSections.forEach((section) => {
    lines.push(`${section.emoji} ${section.title}`);
    lines.push(substituteVariables(section.body, t));
    lines.push('');
  });

  // Realtime Data Flows — intro + enabled flow list
  const enabledFlows = t.flows.filter((f) => f.enabled);
  if (enabledFlows.length > 0) {
    lines.push('⚡ Realtime Data Flows');
    lines.push(REALTIME_FLOWS_INTRO);
    enabledFlows.forEach((f) => {
      lines.push(`- Use ${f.label} for the matching topic.`);
    });
    lines.push('');
  }

  // GSB-managed boilerplate sections (Linking, Fallback, AI Transparency)
  BOILERPLATE_SECTIONS.forEach((section) => {
    lines.push(`${section.emoji} ${section.title}`);
    lines.push(section.body(t));
    lines.push('');
  });

  // Conditional Ecommerce section
  if (t.usesEcommerceDoc) {
    lines.push(`${ECOMMERCE_SECTION.emoji} ${ECOMMERCE_SECTION.title}`);
    lines.push(ECOMMERCE_SECTION.body(t));
    lines.push('');
  }

  // Resort Knowledge Sections
  lines.push('📚 Resort Knowledge Sections');
  lines.push(
    'Use the following knowledge categories when answering guest questions. Each item contains a verified link to the relevant page on the official resort website.',
  );
  lines.push('');

  t.knowledgeGroups.forEach((group) => {
    const enabled = group.entries.filter((e) => e.enabled);
    if (enabled.length === 0) return;
    lines.push(`${group.emoji} ${group.label}:`);
    enabled.forEach((e) => {
      lines.push(`- ${e.label}: ${e.url ? `[here](${e.url})` : 'see Custom Instructions'}`);
      if (e.notes && e.notes.length > 0) {
        sortNotes(e.notes).forEach((n) => {
          const meta = NOTE_TYPE_META[n.type];
          // Quote scripts so the bot knows to use verbatim phrasing
          const text = n.type === 'script' ? `"${n.text}"` : n.text;
          lines.push(`  ${meta.emoji} ${meta.renderLabel}: ${text}`);
        });
      }
    });
    lines.push('');
  });

  // Multi-Pass
  lines.push('🎟 Pass Programs');
  if (t.multiPass.hasPartners && t.multiPass.partners.length > 0) {
    lines.push(`Multi-Resort Access: ${t.multiPass.partners.join(', ')}`);
  } else {
    lines.push('Multi-Resort Access: No pass partners available');
  }

  return lines.join('\n');
}
```

Note-rendering ordering:

```ts
const NOTE_RENDER_ORDER: KnowledgeNoteType[] = ['critical', 'rule', 'script', 'faq'];
export function sortNotes(notes: KnowledgeNote[]): KnowledgeNote[] {
  return [...notes].sort(
    (a, b) => NOTE_RENDER_ORDER.indexOf(a.type) - NOTE_RENDER_ORDER.indexOf(b.type),
  );
}
```

### 4.3 The slim boilerplate — `src/data/template-boilerplate.ts`

```ts
export interface BoilerplateSection {
  emoji: string;
  title: string;
  body: (t: ResortTemplate) => string;
}

export const BOILERPLATE_SECTIONS: BoilerplateSection[] = [
  {
    emoji: '🔗',
    title: 'Linking Instructions',
    body: () =>
      `- Use only verified official resort URLs relevant to the guest's question.
- Format links exactly as: [here](URL)
- Do not create, modify, or guess URLs.`,
  },
  {
    emoji: '🚧',
    title: 'Fallback Response',
    body: (t) =>
      `- First attempt to answer using verified resort information. Provide a direct answer and include a relevant verified link when possible.
- If a question cannot be answered using verified resort content or realtime data flows, do not guess.
- Guide the guest to contact the resort directly at ${t.contactEmail || '{{Resort Email}}'} or ${t.contactPhone || '{{Resort Phone}}'} for further assistance.`,
  },
  {
    emoji: '🤖',
    title: 'AI Transparency',
    body: () =>
      `- If asked, say: I'm an AI assistant built by [GetSkiBots](https://getskibots.com/).
- Do not present yourself as a human, employee, or live agent.
- When helpful, explain that you provide information using verified resort content and approved support resources.`,
  },
];

export const ECOMMERCE_SECTION: BoilerplateSection = {
  emoji: '🛒',
  title: 'Ecommerce / Account Management',
  body: () => `…  (login/password/order/etc. → use ecommerce-account-management.doc)`,
};

export const REALTIME_FLOWS_INTRO =
  `Use realtime data flows for questions about current conditions, status, or upcoming activities. Prefer realtime data over static website content for time-sensitive topics. If a flow is unavailable, fall back to verified resort content; never guess.`;
```

These are functions of the template so they can interpolate dynamic fields (notably contact email/phone in Fallback). They are **GSB-owned, locked, partner-cannot-edit** — Brandon flips them centrally for the whole platform.

### 4.4 Final composition (per-channel system prompt)

Defined in `Knowledge.tsx`:

```ts
// "Assembled Parent" = rendered Preset + freeform Custom Instructions
assembledParent = renderTemplate(template) + '\n\n' + parentPrompt

// "System prompt" shipped to a channel = Parent + separator + channel override
systemPrompt    = assembledParent + '\n\n---\n\n' + channelOverride
```

Where `channelOverride` is one of `chatPrompt`, `voicePrompt`, or `emailPrompt`. For voice with a welcome message present, a synthetic line is appended for OpenAI Realtime callers:

```ts
voiceWelcome.trim()
  ? `\n\nOpen every call with exactly this greeting before anything else: "${voiceWelcome.trim()}"`
  : ''
```

(ElevenLabs gets the welcome message via the structured `agent.firstMessage` override instead — see §5.)

### 4.5 The Jackson Hole `SYSTEM_ROLE_PROMPT` (the default Custom Instructions seed)

A ~5,000-char literal string in `parent.ts` that pre-populates `parentPrompt`. Excerpt:

> `System Role: A Virtual Assistant for Jackson Hole Mountain Resort. Provide only current-day resort information with season-aware, guest-friendly responses.`
> `Purpose: Friendly, professional Virtual Assistant…`
> `Persona: Adventure Families / First Timer / Snow Chasers / Core / International Visitors…`
> `Realtime Data: Snow https://… / Trail Status https://… / Webcams https://…`
> `Prequalifying: Tickets → age, visit date, ticket length…`
> `Tickets & Passes: NEVER give rates or prices…`
> `Season Passes: …`
> `Partner Passes: Mountain Collective / Ikon…`
> `Lodging / Travel / Parking / Dining / Events…`

This is the **legacy 17,500-char Botscrew blob slimmed and structured** — the entire goal of omni is to move content out of this freeform string and into the Preset form's structured fields, so the freeform Custom Instructions textarea can shrink to just the partner-specific quirks the form can't capture.

### 4.6 Channel override strings

`CHAT_OVERRIDE`, `VOICE_OVERRIDE`, `EMAIL_OVERRIDE` are all ~2,500-char literals in `parent.ts`. They're channel-specific rules — formatting, length, fallback, per-connector quirks.

Chat (excerpt):
> `Keep replies under 90 words. Two to three short sentences is usually right.`
> `Use markdown for links: hyperlink "here" using [here](URL).`
> `Per-Connector Adjustments: Web Widget / FB Messenger / WhatsApp / SMS…`
> `Tool Failure Handling: offer to email Guest Services at info@jacksonhole.com.`

Voice (excerpt):
> `Speak naturally. No markdown, no bullet lists, no "click here".`
> `Two sentences per turn max.`
> `URLs are NOT spoken. If the guest needs a link, say "I'll text it to you"…`
> `Tool Failure Handling — CRITICAL: DO NOT say "you can check our website."`

Email (excerpt):
> `Write like email, not chat. Body paragraphs, not bullets-for-everything.`
> `Subject Line: match descriptive inbound subjects, generate one if generic.`
> `Threading: don't re-introduce yourself on Re: emails.`

---

## 5. Voice — the most external-services-heavy area

### 5.1 The provider switch

In Voice mode, omni dispatches to one of two providers based on the selected voice:

```ts
// src/components/TestVoiceModal.tsx
const usesElevenLabs = isVoice && !isOpenAIVoice(voiceStack.voice);
```

- If `voice ∈ {alloy, ash, ballad, coral, echo, sage, shimmer, verse}` → **OpenAI Realtime** (WebRTC GA flow)
- Otherwise (anything that looks like an ElevenLabs `voice_id`) → **ElevenLabs Conversational AI**

### 5.2 OpenAI Realtime — `src/lib/realtimeVoice.ts`

GA flow (the beta `/v1/realtime/sessions` ephemeral-key flow is deprecated). Documented signature:

```ts
const REALTIME_MODEL = 'gpt-realtime';   // stable alias; UI label voice-realtime-2.0 maps here

export async function startRealtimeSession({ apiKey, systemPrompt, voice, handlers }) {
  // 1) Open RTCPeerConnection, attach mic track, create data channel 'oai-events'
  const pc = new RTCPeerConnection();
  // … create audio element for bot voice output (pc.ontrack)
  micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  micStream.getTracks().forEach((t) => pc.addTrack(t, micStream));
  const dc = pc.createDataChannel('oai-events');

  // 2) On data channel open, send session.update with the NESTED GA shape:
  dc.onopen = () => {
    dc.send(JSON.stringify({
      type: 'session.update',
      session: {
        type: 'realtime',
        instructions: systemPrompt,
        audio: {
          output: { voice },                                    // ← NESTED, not session.voice
          input: { transcription: { model: 'whisper-1' } },
        },
      },
    }));
  };

  // 3) Negotiate via raw SDP — Content-Type: application/sdp
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  // PRODUCTION: route through the Vercel proxy (key stays server-side)
  // LOCAL DEV: hit api.openai.com directly with the localStorage key
  const sdpResponse = USE_PROXY
    ? await fetch('/api/openai-realtime-sdp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/sdp' },
        body: offer.sdp,
      })
    : await fetch(
        `https://api.openai.com/v1/realtime/calls?model=${encodeURIComponent(REALTIME_MODEL)}&session.type=realtime`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/sdp',
          },
          body: offer.sdp,
        },
      );

  const answerSdp = await sdpResponse.text();
  await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp });
}
```

Handles these data-channel events:
- `conversation.item.input_audio_transcription.completed` → user transcript
- `response.audio_transcript.delta` → streaming bot transcript
- `response.audio_transcript.done` → final bot transcript (runs voice linter)
- `error` → surfaces to `handlers.onError`

**GA call signature gotchas** (documented in source comments):
- URL must use literal `session.type=realtime` — bracket notation `session[type]` gets URL-encoded and rejected
- Body is raw SDP, `Content-Type: application/sdp`
- The session config goes in the data-channel `session.update`, not the URL/body
- `audio.output.voice` is **nested** — flat `session.voice` is the dead beta shape
- No `OpenAI-Beta` header (GA doesn't want it)

### 5.3 ElevenLabs Conversational AI — `src/lib/elevenLabsVoice.ts`

```ts
import { Conversation } from '@elevenlabs/client';
import { USE_PROXY } from './proxyMode';
import { DEFAULT_ELEVENLABS_AGENT_ID } from '../data/parent';

const LS_API_KEY  = 'omni.elevenlabs_api_key';
const LS_AGENT_ID = 'omni.elevenlabs_agent_id';

export function isElevenLabsConfigured(): boolean {
  // In production, the API key lives server-side on Vercel — browser only needs agent_id.
  // In local dev, both must be in localStorage.
  if (USE_PROXY) return Boolean(getElevenLabsAgentId());
  return Boolean(getElevenLabsApiKey() && getElevenLabsAgentId());
}

export function getElevenLabsAgentId(): string {
  if (typeof window === 'undefined') return DEFAULT_ELEVENLABS_AGENT_ID;
  const stored = window.localStorage.getItem(LS_AGENT_ID);
  return stored && stored.trim() ? stored : DEFAULT_ELEVENLABS_AGENT_ID;
}

async function fetchSignedUrl(apiKey: string, agentId: string): Promise<string> {
  const url = USE_PROXY
    ? `/api/elevenlabs-signed-url?agent_id=${encodeURIComponent(agentId)}`
    : `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${encodeURIComponent(agentId)}`;

  const res = await fetch(url, {
    method: 'GET',
    headers: USE_PROXY ? {} : { 'xi-api-key': apiKey },
  });
  // … parses { signed_url } from response
}

export async function startElevenLabsSession({ voiceId, systemPrompt, firstMessage, handlers }) {
  const signedUrl = await fetchSignedUrl(apiKey, agentId);

  const conversation = await Conversation.startSession({
    signedUrl,
    overrides: {
      agent: {
        prompt: { prompt: systemPrompt },
        ...(firstMessage?.trim() ? { firstMessage: firstMessage.trim() } : {}),
      },
      tts: { voiceId },
    },
    onConnect, onDisconnect,
    onMessage: ({ source, message }) => {
      if (source === 'user') handlers.onUserTranscript(message);
      else if (source === 'ai') handlers.onBotMessage(message);
    },
    onError,
  });

  return { stop: async () => { try { await conversation.endSession(); } catch {} } };
}
```

**Three IDs are involved** (documented in source):

| Field | Format | Where to find |
|---|---|---|
| API Key | `sk_…` ~50 chars | Settings → API Keys (held server-side in prod) |
| Agent ID | `agent_…` (~40 char alphanumeric after the prefix) | Conversational AI → Agents URL bar |
| voice_id | ~20 alphanumeric, no prefix | Voice Library → click voice |

**Per-call overrides ONLY work if the agent in ElevenLabs has the Security tab toggles enabled**: Override system prompt + Override voice + Override first message. Otherwise the call still connects but uses the agent's baseline defaults (silent failure). Agent must also be **Published**, not Draft (Draft agents return 404).

### 5.4 The proxy switch — `src/lib/proxyMode.ts`

```ts
/**
 * Production builds (Vercel deploy) → proxy. No key paste needed.
 * Local dev (vite dev)              → direct call with localStorage key (fallback).
 */
export const USE_PROXY: boolean = import.meta.env.PROD;
```

`import.meta.env.PROD` is `true` in `vite build` output (what Vercel ships) and `false` in `vite dev`. The four lib files all branch on `USE_PROXY`:

- `realtimeVoice.ts` — `/api/openai-realtime-sdp` vs. direct OpenAI
- `voiceTest.ts` `runChannelTest()` — `/api/openai-chat` vs. direct OpenAI
- `voiceTest.ts` `speakText()` — `/api/openai-tts` vs. direct OpenAI
- `elevenLabsVoice.ts` `fetchSignedUrl()` — `/api/elevenlabs-signed-url` vs. direct ElevenLabs

`isApiKeyConfigured()` returns `true` unconditionally in `USE_PROXY` mode so the UI hides the "use real LLM →" paste flow.

### 5.5 The `/api` directory — Vercel serverless functions

Four Node.js-style handlers picked up automatically by Vercel from `/api/*.ts`.

**`api/openai-realtime-sdp.ts`**
- POST, `Content-Type: application/sdp`, body = raw SDP offer
- Reads `process.env.OPENAI_API_KEY` (server-side)
- Forwards to `https://api.openai.com/v1/realtime/calls?model=gpt-realtime&session.type=realtime`
- Returns OpenAI's SDP answer as `Content-Type: application/sdp`
- Hardcodes model `'gpt-realtime'` and `session.type=realtime`

**`api/openai-chat.ts`**
- POST, JSON body `{ model?, messages, max_tokens?, temperature? }`
- Forwards to `https://api.openai.com/v1/chat/completions` with `process.env.OPENAI_API_KEY`
- Returns the OpenAI JSON response verbatim
- Defaults: `model=gpt-4o-mini`, `max_tokens=280`, `temperature=0.6`

**`api/openai-tts.ts`**
- POST, JSON body `{ text, voice }`
- Forwards to `https://api.openai.com/v1/audio/speech` with `process.env.OPENAI_API_KEY`, `model=gpt-4o-mini-tts`, `response_format=mp3`
- Returns the MP3 binary with `Content-Type: audio/mpeg`

**`api/elevenlabs-signed-url.ts`**
- GET or POST, takes `agent_id` from query or body
- Forwards to `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=…` with `xi-api-key: process.env.ELEVENLABS_API_KEY`
- Returns `{ signed_url }` JSON

All four are tiny (~50–100 lines each), defensive (validate inputs, return useful upstream error detail), and use loose Node `req`/`res` types to avoid pulling in `@vercel/node` as a dependency.

### 5.6 Voice-rule linter — `src/lib/voiceTest.ts::detectViolations()`

Runs locally on each bot transcript. Channel-aware:

- **Voice rules**: URL spoken aloud · "check the website" · markdown link syntax · "click here" · >2 sentences · bullet list
- **Chat rules**: >90 words · plain URL without markdown formatting

Violations surface as red pills under the offending message in the test modal.

---

## 6. External services & env vars

### 6.1 Every fetch / API call by file

| File | Direction | Endpoint |
|---|---|---|
| `src/lib/realtimeVoice.ts` | Browser→Vercel (prod) | `POST /api/openai-realtime-sdp` |
| `src/lib/realtimeVoice.ts` | Browser→OpenAI (dev) | `POST https://api.openai.com/v1/realtime/calls?model=gpt-realtime&session.type=realtime` |
| `src/lib/voiceTest.ts::runChannelTest` | Browser→Vercel (prod) | `POST /api/openai-chat` |
| `src/lib/voiceTest.ts::runChannelTest` | Browser→OpenAI (dev) | `POST https://api.openai.com/v1/chat/completions` |
| `src/lib/voiceTest.ts::speakText` | Browser→Vercel (prod) | `POST /api/openai-tts` |
| `src/lib/voiceTest.ts::speakText` | Browser→OpenAI (dev) | `POST https://api.openai.com/v1/audio/speech` |
| `src/lib/elevenLabsVoice.ts::fetchSignedUrl` | Browser→Vercel (prod) | `GET /api/elevenlabs-signed-url?agent_id=…` |
| `src/lib/elevenLabsVoice.ts::fetchSignedUrl` | Browser→ElevenLabs (dev) | `GET https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=…` |
| `src/lib/elevenLabsVoice.ts` (after signed URL) | Browser→ElevenLabs | WebSocket via `@elevenlabs/client` `Conversation.startSession({ signedUrl, … })` |
| `api/openai-realtime-sdp.ts` | Vercel→OpenAI | `POST https://api.openai.com/v1/realtime/calls?model=gpt-realtime&session.type=realtime` |
| `api/openai-chat.ts` | Vercel→OpenAI | `POST https://api.openai.com/v1/chat/completions` |
| `api/openai-tts.ts` | Vercel→OpenAI | `POST https://api.openai.com/v1/audio/speech` |
| `api/elevenlabs-signed-url.ts` | Vercel→ElevenLabs | `GET https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=…` |

No other network I/O. No backend persistence — all "Save changes" writes land in `localStorage[omni.parent.jh]`.

### 6.2 Env vars referenced (names only — values are [REDACTED] / not committed)

**Server-side (Vercel project settings → Environment Variables):**
- `OPENAI_API_KEY` — read by `api/openai-realtime-sdp.ts`, `api/openai-chat.ts`, `api/openai-tts.ts`
- `ELEVENLABS_API_KEY` — read by `api/elevenlabs-signed-url.ts`

**Client-side (Vite, baked into bundle at build time — local dev only):**
- `VITE_OPENAI_API_KEY` — fallback read in `src/lib/voiceTest.ts::getApiKey()` if localStorage empty. Should NEVER be set on a public deploy.

**Build-time:**
- `GITHUB_ACTIONS` — read by `vite.config.ts` to set `base: '/omni/'` when GH Pages workflow runs. Vercel doesn't set this so its build uses `base: '/'`.

**Browser-only (localStorage, in `window.localStorage`):**
- `omni.openai_api_key` — paste-flow OpenAI key (dev fallback only — UI hidden in prod)
- `omni.elevenlabs_api_key` — paste-flow ElevenLabs key (dev fallback only)
- `omni.elevenlabs_agent_id` — override of `DEFAULT_ELEVENLABS_AGENT_ID` (per-resort config, not a secret)
- `omni.parent.jh` — the full `PersistedState` blob (Save changes)
- `omni.custom_voices` — user-added voices (UI vestige — not currently exposed)

### 6.3 References to specific vendors

| Vendor | Where it appears |
|---|---|
| **Botscrew** | `botscrewBotId` field on `ChannelLayer` (`bs_8721` chat, `bs_9034` voice). Tailwind palette tokens are named `botscrew-50…900` throughout the UI. `AssembledPreviewModal` shows "What each Botscrew Bot actually sees". Embed code on `Widget.tsx` uses `data-bot-id="bs_8721"`. **The Botscrew runtime itself is a black box — omni doesn't call any Botscrew API. The IDs are display-only today; production save→push integration is unbuilt.** |
| **Odin AI** | Not referenced in code. Per project memory, Odin powers Botscrew's orchestration layer (discovered via Botscrew admin network traffic, gated through Botscrew contract — not direct). Strategic info for future architecture, not implemented anywhere. |
| **OpenAI** | Voice realtime (`/v1/realtime/calls`, GA), chat completions (`/v1/chat/completions`), TTS (`/v1/audio/speech`). All three via the proxy. Model identifier `gpt-realtime` hardcoded in `realtimeVoice.ts` + the API route. UI labels `voice-realtime-2.0` etc. are GSB display names, not real API model IDs. |
| **ElevenLabs** | `@elevenlabs/client` SDK in deps. `Conversation.startSession` for WebSocket conversational AI. `get_signed_url` for minting WS URLs. 9 prebaked custom voices live in `PREBAKED_CUSTOM_VOICES` with their voice_ids. |
| **Twilio** | Mentioned only in `wiring` string (`'Twilio: +1 307·284·5392'`) and prompt body text. No Twilio SDK, no Twilio API calls — omni is purely an admin surface, not a phone bridge today. |
| **Vercel** | Hosting + serverless. `/api/*.ts` routes are Vercel-convention. `import.meta.env.PROD` gates the proxy. No Vercel SDK in deps (handlers use loose types to avoid `@vercel/node`). |

---

## 7. Gaps & TODOs

### 7.1 Stubbed pages (6 of 10 routes)

Routes that render `<Placeholder title="…" />` ("Coming soon."):
- `/analytics`
- `/ai-edits`
- `/flows`
- `/actions`
- `/triggers`
- `/help`

### 7.2 Unwired buttons / partial implementations

- **`Knowledge.tsx`** — `<SectionPlaceholder>` cards for Text Edits / Files / Website show a count from `jacksonHole.knowledge.{textEdits|files|websites}` and a CTA button (`Manage Text Edits →` etc.) that does nothing.
- **`Knowledge.tsx`** Chat ModelRow — "Override" button is a styled `<button>` with no onClick; never opens an override picker.
- **`SettingsChannels.tsx`** — `Configure wiring →` / `Connect →` buttons are styled but unwired.
- **`Widget.tsx`** — "Appearance & Behavior" card literally reads "Configuration UI coming soon."
- **`Support.tsx`** — "Last 7/30/Custom" range pills are static UI (no actual filtering). "Export chats" button unwired. `<AudioPlaceholder>` is a non-functional play UI (no audio source even though `audioDuration` exists on `Message`).
- **`TopBar.tsx`** — Top-bar "Test AI chat" / "Test widget" buttons are unwired (the Test buttons inside Knowledge.tsx are the real entry points).

### 7.3 Email channel is structurally present but not connected

- `jacksonHole.channels[2]` has `botscrewBotId: null`, `status: 'not-connected'`.
- `EMAIL_OVERRIDE` string exists and is editable in the UI (Knowledge → Email → `<EmailNotConnectedNotice>` shows a banner above the editor).
- `AssembledPreviewModal` Email tab is disabled when `emailConnected=false`.
- No inbound email plumbing, no SES/IMAP wiring.

### 7.4 No persistence beyond localStorage

- "Save changes" writes to `localStorage[omni.parent.jh]`.
- "Reset to default" wipes that key + reloads.
- There is no backend, no Postgres, no cross-device sync. Per project memory: the production architecture plan calls for `POST /api/resort/:id/config` + `GET /api/resort/:id/config` endpoints (probably Supabase + a tiny backend), but none of that exists yet.

### 7.5 Save → Botscrew push is missing

- omni today is **editor-only** for chat. There's no API call that pushes the assembled prompt to a Botscrew Bot. Per the project memory, this is gated on Botscrew exposing an API.
- The voice path is similarly "preview-only" — the Vercel proxy lets you test the assembled prompt via OpenAI or ElevenLabs, but doesn't push it anywhere that real Twilio voice traffic would hit.

### 7.6 Custom voice add UI was removed

- `loadUserCustomVoices()` / `saveCustomVoices()` still exist in `parent.ts` for reading/writing `localStorage[omni.custom_voices]`, but the UI for adding a user voice was deleted earlier (only the 9 prebaked voices show in the dropdown). This is intentional ("ship with curated GSB voices") but the read/write helpers are now dead code.

### 7.7 Multi-vertical hooks are present but unused

- `Industry` type has 9 values: ski-resort, lodging, transportation, ski-rentals, dmo, tour-operator, waterpark, help-desk, vacation-rental.
- `INDUSTRY_LABELS` map exists for display.
- TemplateForm shows the eyebrow `GSB {INDUSTRY_LABELS[industry]} Preset v2.4`.
- But there's only one shape (`ResortTemplate`) and only one seed (`jacksonHole`). The codebase says (in a comment): *"Today's schema is ski-resort-specific. When we add the second vertical we'll refactor to per-industry shapes."*

### 7.8 Voice channel switching mid-call

- If the user changes the Voice dropdown during an active call, no `session.update` is resent. The new voice only takes effect on the next call.

### 7.9 Welcome-message hack for OpenAI Realtime

- Voice mode injects the welcome message into the system prompt as `Open every call with exactly this greeting before anything else: "<message>"`. This is a workaround — Realtime has no separate `firstMessage` like ElevenLabs does.

### 7.10 Bot-ID model is one-per-channel, but production migration is one-Bot-ID-per-existing-bot

The architecture assumes a Parent with three channel children (one Bot ID per channel). Per project memory, the actual migration from the existing 100+ demos and 30 partners is **metadata-only** — each existing Botscrew Bot ID becomes the "Chat channel" of a newly-created parent. That migration step has no UI today.

### 7.11 Legacy GH Pages workflow still active

`.github/workflows/deploy.yml` still auto-deploys to `getskibots.github.io/omni/` on every push. Vercel does too. Both URLs are live. Eventually one should be retired (probably GH Pages, since the proxy routes only work on Vercel).

### 7.12 The `'omni'` storage namespace is single-tenant

All localStorage keys are scoped to `'omni.*'` with no resort prefix beyond `omni.parent.jh`. If you ever load a different resort in the same browser, you'd need a resort-id discriminator. Not a problem now because only Jackson Hole exists.

### 7.13 Vendor-name scrubbing was applied to UI but kept in source

User-visible strings say "Built-in voices" / "Custom voices" instead of "OpenAI" / "ElevenLabs". But internal symbol names (`OPENAI_VOICES_FEMALE`, `isOpenAIVoice`, `startElevenLabsSession`, `elevenLabsVoice.ts`, etc.) still reference vendors. Intentional: developer-facing identifiers stay accurate; user-facing labels are vendor-neutral.

---

## Quick-reference: where to look for what

| Question | File |
|---|---|
| What types describe a resort? | `src/data/parent.ts` (interfaces near top) |
| What's the Jackson Hole seed data? | `src/data/parent.ts` (`jacksonHole = { … }` at bottom) |
| How does the Preset → string assembly work? | `src/data/parent.ts::renderTemplate()` |
| Where are variables substituted? | `src/data/parent.ts::substituteVariables()` |
| What's the GSB-managed boilerplate? | `src/data/template-boilerplate.ts` |
| How does Voice testing work? | `src/components/TestVoiceModal.tsx` → `src/lib/realtimeVoice.ts` or `src/lib/elevenLabsVoice.ts` |
| What does the Vercel proxy do? | `api/*.ts` (4 files) |
| Where does production vs. dev branch? | `src/lib/proxyMode.ts` (single `USE_PROXY` constant) |
| Where does Save / Reset persist state? | `src/pages/Knowledge.tsx` → `localStorage[omni.parent.jh]` |
| Which routes are real vs. placeholders? | `src/App.tsx` (any `<Placeholder title="…" />` is a stub) |
| How is "the bot" represented? | `src/data/parent.ts::ParentSummary` with `channels: ChannelLayer[]` (Bot ID per channel) |

---

**End of summary.** Generated automatically from the current `main` branch state. Not auto-updated — regenerate if the repo evolves.
