import { useRef, useState } from 'react'
import { Plus, ChevronLeft, Sparkles, CheckCircle2, Phone, Tag, ShieldCheck, AlertTriangle } from 'lucide-react'
import { PURPOSES, type Purpose } from '../data/outreachPurposes'
import { loadOmniKnowledge } from '../lib/omniKnowledge'
import TestVoiceModal from './TestVoiceModal'
import {
  loadScripts,
  saveScripts,
  newId,
  emptySections,
  mergeFields,
  assembleBrief,
  fillSections,
  type OutreachScript,
  type ScriptSections,
} from '../lib/outreach'
import {
  OPENAI_VOICES_FEMALE,
  OPENAI_VOICES_MALE,
  VOICE_MODEL_OPTIONS,
  VOICE_TRANSCRIPTION_OPTIONS,
  loadCustomVoices,
  type CustomVoice,
} from '../data/parent'

type SectionKey = keyof ScriptSections

// The call "flow" as talking-point sections (Option A). Order = call order.
const SECTION_DEFS: { key: SectionKey; label: string; hint: string; placeholder: string; rows: number }[] = [
  { key: 'goal', label: 'Goal', hint: 'The one thing this call is for.', placeholder: 'Confirm their booked trip and offer to add lift tickets', rows: 2 },
  { key: 'opening', label: 'Opening line', hint: 'First thing the AI says on pickup — personalize with {{merge fields}}.', placeholder: "Hi {{name}}, it's the Mt Quinnski team — your trip's on {{arrival_date}}, got a quick sec?", rows: 2 },
  { key: 'points', label: 'Talking points', hint: 'Facts and offers to work into the conversation.', placeholder: 'Parking fills by 9am · free town shuttle · kids under 5 ski free', rows: 3 },
  { key: 'knowledge', label: 'Knowledge', hint: 'What it can answer questions from. It also draws on your resort’s Omni knowledge.', placeholder: 'Refund policy, lesson times, rental pricing…', rows: 2 },
  { key: 'ask', label: 'The ask', hint: 'The call-to-action — the point of the call.', placeholder: 'Offer to text a pre-book link that saves 15%', rows: 2 },
  { key: 'guardrails', label: 'Guardrails & opt-out', hint: "Don'ts + how to handle “remove me.”", placeholder: '', rows: 3 },
  { key: 'voicemail', label: 'Voicemail', hint: 'What to do if no one answers.', placeholder: 'Leave a 15-sec friendly message mentioning the pre-book link', rows: 2 },
]

const voiceLabel = (voice: string, custom: CustomVoice[]) =>
  custom.find((c) => c.voiceId === voice)?.name || voice

export default function OutreachMessageStep({ resortName }: { resortName: string }) {
  const [scripts, setScripts] = useState<OutreachScript[]>(() => loadScripts())
  const [editing, setEditing] = useState<OutreachScript | 'new' | null>(null)
  const custom = loadCustomVoices()

  const persist = (next: OutreachScript[]) => {
    setScripts(next)
    saveScripts(next)
  }

  if (editing) {
    return (
      <ScriptComposer
        resortName={resortName}
        initial={editing === 'new' ? null : editing}
        onCancel={() => setEditing(null)}
        onSave={(script) => {
          const exists = scripts.some((s) => s.id === script.id)
          persist(exists ? scripts.map((s) => (s.id === script.id ? script : s)) : [script, ...scripts])
          setEditing(null)
        }}
      />
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-ink-900">Scripts</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Brief the Voice AI in plain language — it navigates the call from your talking points.
          </p>
        </div>
        <button
          onClick={() => setEditing('new')}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-action-500 hover:bg-action-600 text-white rounded-md shadow-sm"
        >
          <Plus className="h-4 w-4" strokeWidth={2} />
          New script
        </button>
      </div>

      {scripts.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-xl p-12 text-center">
          <Phone className="h-8 w-8 text-slate-300 mx-auto" />
          <div className="text-base font-semibold text-ink-900 mt-3">No scripts yet</div>
          <p className="text-sm text-slate-500 mt-1">
            Write a call script from a few talking points — or let AI draft it from your goal.
          </p>
          <button
            onClick={() => setEditing('new')}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-action-500 hover:bg-action-600 text-white rounded-md"
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
            New script
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {scripts.map((s) => (
            <button
              key={s.id}
              onClick={() => setEditing(s)}
              className="text-left bg-white border border-slate-200 rounded-xl shadow-card p-4 hover:border-botscrew-400 transition"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="text-base font-semibold text-ink-900 truncate">{s.name}</div>
                <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 shrink-0">
                  <Phone className="h-3 w-3" />
                  {voiceLabel(s.voice, custom)}
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                {s.sections.goal || s.sections.opening || 'No goal set'}
              </p>
              <div className="text-[11px] text-slate-400 mt-2">
                Updated {new Date(s.updatedAt).toLocaleDateString()}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── The composer ──────────────────────────────────────────────────────────────
function ScriptComposer({
  resortName,
  initial,
  onCancel,
  onSave,
}: {
  resortName: string
  initial: OutreachScript | null
  onCancel: () => void
  onSave: (s: OutreachScript) => void
}) {
  const custom = loadCustomVoices()
  const [name, setName] = useState(initial?.name ?? '')
  const [sections, setSections] = useState<ScriptSections>(initial?.sections ?? emptySections())
  const [voice, setVoice] = useState(initial?.voice ?? OPENAI_VOICES_MALE[1]) // "ash"
  const [purposeKey, setPurposeKey] = useState(initial?.purpose ?? '')
  const [useOmni, setUseOmni] = useState(initial?.useOmniKnowledge ?? true)
  const [linkUrl, setLinkUrl] = useState(initial?.linkUrl ?? '')
  const [textLink, setTextLink] = useState(initial?.textLink ?? false)
  const [drafting, setDrafting] = useState(false)
  const [draftErr, setDraftErr] = useState('')
  const [testOpen, setTestOpen] = useState(false)
  const fields = mergeFields()
  const omni = loadOmniKnowledge()
  const selectedPurpose = PURPOSES.find((p) => p.key === purposeKey)

  // Apply a purpose "play": seed the sections + suggested voice. {{resort}} is
  // swapped for the account name now; other tokens fill per contact at call time.
  const applyPurpose = (p: Purpose) => {
    const hasContent = [
      sections.goal,
      sections.opening,
      sections.points,
      sections.ask,
      sections.knowledge,
      sections.voicemail,
    ].some((v) => v.trim())
    if (hasContent && !window.confirm(`Replace the current script with the "${p.label}" template?`)) return
    const wr = (t: string) => t.split('{{resort}}').join(resortName)
    setSections({
      goal: wr(p.seed.goal),
      opening: wr(p.seed.opening),
      points: wr(p.seed.points),
      knowledge: wr(p.seed.knowledge),
      ask: wr(p.seed.ask),
      guardrails: wr(p.seed.guardrails),
      voicemail: wr(p.seed.voicemail),
    })
    setVoice(p.voice)
    setPurposeKey(p.key)
    if (!name.trim()) setName(p.label)
  }

  // Track the focused section field so a merge chip inserts at the cursor.
  const activeEl = useRef<HTMLTextAreaElement | null>(null)
  const activeKey = useRef<SectionKey | null>(null)

  const setSection = (key: SectionKey, value: string) => setSections((s) => ({ ...s, [key]: value }))

  const insertMerge = (field: string) => {
    const token = `{{${field}}}`
    const el = activeEl.current
    const key = activeKey.current
    if (el && key) {
      const start = el.selectionStart ?? el.value.length
      const end = el.selectionEnd ?? el.value.length
      const cur = sections[key]
      setSection(key, cur.slice(0, start) + token + cur.slice(end))
      requestAnimationFrame(() => {
        el.focus()
        const pos = start + token.length
        el.setSelectionRange(pos, pos)
      })
    } else {
      // No field focused — default to the opening line.
      setSection('opening', (sections.opening + ' ' + token).trim())
    }
  }

  const draft = async () => {
    if (!sections.goal.trim()) {
      setDraftErr('Add a goal first — that’s what the AI drafts from.')
      return
    }
    setDrafting(true)
    setDraftErr('')
    try {
      const drafted = await draftScript(sections.goal, resortName, fields)
      setSections((s) => ({ ...s, ...drafted }))
    } catch (e) {
      setDraftErr(e instanceof Error ? e.message : 'Draft failed. You can still write it by hand.')
    } finally {
      setDrafting(false)
    }
  }

  const canSave = name.trim().length > 0 && sections.goal.trim().length > 0
  const save = () => {
    if (!canSave) return
    const now = Date.now()
    onSave({
      id: initial?.id ?? newId(),
      name: name.trim(),
      sections,
      voice,
      purpose: purposeKey || undefined,
      useOmniKnowledge: useOmni,
      linkUrl: linkUrl.trim() || undefined,
      textLink: textLink && !!linkUrl.trim(),
      createdAt: initial?.createdAt ?? now,
      updatedAt: now,
    })
  }

  // Assemble a test brief from the current draft (placeholder contact) so you can
  // talk to the script in-browser before saving or dialing.
  const testFilled = fillSections(sections, { name: 'there', fields: {} })
  const testSystemPrompt = assembleBrief(testFilled, resortName, useOmni ? omni?.text : undefined)
  const testVoiceStack = {
    model: VOICE_MODEL_OPTIONS[0],
    voice,
    transcriptionModel: VOICE_TRANSCRIPTION_OPTIONS[0],
  }
  const canTest = testFilled.goal.trim().length > 0 || testFilled.opening.trim().length > 0

  return (
    <div className="space-y-5">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={onCancel}
          className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-ink-900"
        >
          <ChevronLeft className="h-4 w-4" />
          Scripts
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTestOpen(true)}
            disabled={!canTest}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md border border-botscrew-300 text-botscrew-600 hover:bg-botscrew-50 disabled:opacity-40 disabled:cursor-not-allowed"
            title="Talk to this script in your browser (mic)"
          >
            <Phone className="h-4 w-4" strokeWidth={2} />
            Test in browser
          </button>
          <button
            onClick={save}
            disabled={!canSave}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md text-white shadow-sm disabled:opacity-40 disabled:cursor-not-allowed bg-action-500 hover:bg-action-600"
          >
            <CheckCircle2 className="h-4 w-4" strokeWidth={2} />
            Save script
          </button>
        </div>
      </div>

      {/* Purpose picker — start from a play */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-card p-4">
        <div className="text-sm font-semibold text-ink-900 mb-2">Start from a purpose</div>
        <div className="flex flex-wrap gap-2">
          {PURPOSES.map((p) => {
            const active = purposeKey === p.key
            return (
              <button
                key={p.key}
                onClick={() => applyPurpose(p)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition ${
                  active
                    ? 'border-botscrew-400 bg-botscrew-50 text-botscrew-700 font-medium'
                    : 'border-slate-200 bg-white text-ink-900 hover:bg-slate-50'
                }`}
              >
                <span>{p.emoji}</span>
                {p.label}
              </button>
            )
          })}
        </div>
        {selectedPurpose && (
          <div className="mt-3 flex flex-wrap items-center gap-3 text-xs">
            {selectedPurpose.consent === 'consented' ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-success/10 text-success px-2 py-0.5 font-medium">
                <ShieldCheck className="h-3.5 w-3.5" /> Consented audience
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-warn/10 text-warn px-2 py-0.5 font-medium">
                <AlertTriangle className="h-3.5 w-3.5" /> Requires an opted-in list
              </span>
            )}
            <span className="text-slate-500">
              Suggested voice: <span className="text-ink-900 font-medium">{selectedPurpose.voice}</span>
            </span>
          </div>
        )}
      </div>

      {/* Name + voice + AI draft toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-card p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_220px] gap-4">
          <div>
            <label className="block text-sm text-slate-600 mb-1.5">Script name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Pre-arrival — booked guests"
              className="w-full text-sm px-3 py-2 border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-botscrew-400"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1.5">Voice</label>
            <select
              value={voice}
              onChange={(e) => setVoice(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-botscrew-400"
            >
              <optgroup label="Built-in · Female">
                {OPENAI_VOICES_FEMALE.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Built-in · Male">
                {OPENAI_VOICES_MALE.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </optgroup>
              {custom.length > 0 && (
                <optgroup label="Custom voices">
                  {custom.map((cv) => (
                    <option key={cv.id} value={cv.voiceId}>
                      {cv.name}
                      {cv.accent ? ` (${cv.accent})` : ''}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          <button
            onClick={draft}
            disabled={drafting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-botscrew-500 hover:bg-botscrew-600 text-white rounded-md disabled:opacity-50"
            title="Draft the sections from your goal"
          >
            <Sparkles className="h-3.5 w-3.5" strokeWidth={2} />
            {drafting ? 'Drafting…' : 'Draft with AI'}
          </button>
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
            <Tag className="h-3 w-3" /> Merge fields — click to insert:
          </span>
          {fields.map((f) => (
            <button
              key={f}
              onMouseDown={(e) => {
                e.preventDefault()
                insertMerge(f)
              }}
              className="font-mono text-[11px] bg-slate-100 hover:bg-botscrew-50 text-ink-700 rounded px-1.5 py-0.5 border border-slate-200"
            >{`{{${f}}}`}</button>
          ))}
        </div>
        {draftErr && <p className="text-xs text-danger">{draftErr}</p>}

        <label className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 cursor-pointer">
          <input
            type="checkbox"
            checked={useOmni}
            onChange={(e) => setUseOmni(e.target.checked)}
            className="h-4 w-4 accent-botscrew-500"
          />
          <span className="text-sm text-ink-900">
            Use my <span className="font-medium">Omni Knowledge</span> — answer from the same brain as
            your inbound bot
          </span>
          {omni ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-success font-medium">
              ● connected · ~{omni.chars.toLocaleString()} chars
            </span>
          ) : (
            <span className="text-[11px] text-slate-400">nothing saved on the Knowledge page yet</span>
          )}
        </label>

        <div className="border-t border-slate-100 pt-3 space-y-2">
          <label className="block text-sm text-slate-600">
            Link to text guests <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <input
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://book.jacksonhole.com/…"
            className="w-full text-sm px-3 py-2 border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-botscrew-400"
          />
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={textLink}
              onChange={(e) => setTextLink(e.target.checked)}
              disabled={!linkUrl.trim()}
              className="h-4 w-4 accent-botscrew-500 disabled:opacity-40"
            />
            <span className="text-sm text-ink-900">Auto-text this link after an answered call</span>
          </label>
          <p className="text-[11px] text-slate-400">
            Every text includes “Reply STOP to opt out.” US delivery needs a verified sender
            (toll-free / 10DLC).
          </p>
        </div>
      </div>

      {/* The sections */}
      <div className="space-y-4">
        {SECTION_DEFS.map((def, i) => (
          <div key={def.key} className="bg-white border border-slate-200 rounded-xl shadow-card">
            <div className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-2">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-500">
                {i + 1}
              </span>
              <span className="text-sm font-semibold text-ink-900">{def.label}</span>
              <span className="text-xs text-slate-400">— {def.hint}</span>
            </div>
            <div className="p-3">
              <textarea
                data-section={def.key}
                rows={def.rows}
                value={sections[def.key]}
                placeholder={def.placeholder}
                onFocus={(e) => {
                  activeEl.current = e.target
                  activeKey.current = def.key
                }}
                onChange={(e) => setSection(def.key, e.target.value)}
                className="w-full text-sm text-ink-900 bg-slate-50 border border-slate-200 rounded-md p-2.5 focus:outline-none focus:ring-2 focus:ring-botscrew-400 resize-y"
              />
            </div>
          </div>
        ))}
      </div>

      <TestVoiceModal
        open={testOpen}
        onClose={() => setTestOpen(false)}
        channel="voice"
        systemPrompt={testSystemPrompt}
        voiceStack={testVoiceStack}
        welcomeMessage={testFilled.opening}
      />
    </div>
  )
}

// Ask Omni's chat proxy to draft the talking-point sections from the goal.
async function draftScript(
  goal: string,
  resortName: string,
  fields: string[],
): Promise<Partial<ScriptSections>> {
  const sys = `You write concise OUTBOUND phone-call briefs for ${resortName}'s Voice AI to run — talking points, NOT a word-for-word script. The AI improvises a natural call from them. Keep each section short and spoken-sounding. Personalize with merge tokens where natural (available: ${fields
    .map((f) => `{{${f}}}`)
    .join(', ')}). Respond with ONLY a JSON object with these string keys: "opening" (the first line on pickup), "points" (facts/offers, • separated), "ask" (the call-to-action), "guardrails" (don'ts + how to handle "remove me"), "voicemail" (what to leave if no answer). No prose, no code fences.`
  const user = `Goal of the call: ${goal}`
  const r = await fetch('/api/openai-chat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.7,
      max_tokens: 700,
      messages: [
        { role: 'system', content: sys },
        { role: 'user', content: user },
      ],
    }),
  })
  if (!r.ok) throw new Error(`Draft needs the deployed preview (chat API returned ${r.status}).`)
  const data = await r.json()
  const content: string = data?.choices?.[0]?.message?.content ?? ''
  const json = JSON.parse(content.replace(/```json|```/g, '').trim())
  // Only carry over keys the model actually returned as strings — never write
  // undefined into a controlled field.
  const out: Partial<ScriptSections> = {}
  for (const k of ['opening', 'points', 'ask', 'guardrails', 'voicemail'] as const) {
    if (typeof json[k] === 'string') out[k] = json[k]
  }
  return out
}
