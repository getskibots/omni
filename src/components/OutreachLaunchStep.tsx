import { useMemo, useRef, useState } from 'react'
import {
  Play,
  Square,
  Phone,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  ShieldCheck,
} from 'lucide-react'
import { isOpenAIVoice } from '../data/parent'
import {
  loadLists,
  loadScripts,
  loadRuns,
  saveRuns,
  newId,
  fillMerge,
  assembleBrief,
  validCount,
  type OutreachList,
  type OutreachScript,
  type OutreachContact,
  type OutreachRun,
  type OutreachCall,
  type CallStatus,
  type ScriptSections,
} from '../lib/outreach'

const POLL_MS = 3000
const CALL_DEADLINE_MS = 6 * 60 * 1000
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function voiceParams(voice: string): { engine: 'openai' | 'elevenlabs'; guestVoice?: string; elevenVoiceId?: string } {
  return isOpenAIVoice(voice)
    ? { engine: 'openai', guestVoice: voice }
    : { engine: 'elevenlabs', elevenVoiceId: voice }
}

function fillSections(s: ScriptSections, contact: Pick<OutreachContact, 'name' | 'fields'>): ScriptSections {
  const f = (t: string) => fillMerge(t, contact)
  return {
    goal: f(s.goal),
    opening: f(s.opening),
    points: f(s.points),
    knowledge: f(s.knowledge),
    ask: f(s.ask),
    guardrails: f(s.guardrails),
    voicemail: f(s.voicemail),
  }
}

// Place one call via the Omni proxy → probe-voice engine.
async function placeCall(
  script: OutreachScript,
  contact: Pick<OutreachContact, 'name' | 'fields'>,
  phone: string,
  resort: string,
): Promise<{ jobId?: string; callSid?: string; error?: string; capped?: boolean }> {
  const filled = fillSections(script.sections, contact)
  const brief = assembleBrief(filled, resort)
  const vp = voiceParams(script.voice)
  const r = await fetch('/api/outbound-call', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      phone,
      instructions: brief,
      firstMessage: filled.opening,
      voiceEngine: vp.engine,
      guestVoice: vp.guestVoice,
      elevenVoiceId: vp.elevenVoiceId,
      resort,
    }),
  })
  const j = await r.json().catch(() => ({}))
  return { jobId: j.jobId, callSid: j.callSid, error: j.error, capped: r.status === 429 }
}

async function pollUntilDone(jobId: string, onTick?: (snap: any) => void): Promise<any> {
  const deadline = Date.now() + CALL_DEADLINE_MS
  let last: any = {}
  while (Date.now() < deadline) {
    await sleep(POLL_MS)
    try {
      const r = await fetch(`/api/outbound-call?jobId=${encodeURIComponent(jobId)}`)
      last = await r.json().catch(() => ({}))
      onTick?.(last)
      if (last.status === 'done' || last.status === 'error') break
    } catch {
      /* transient — keep polling */
    }
  }
  return last
}

export default function OutreachLaunchStep({ resortName }: { resortName: string }) {
  const lists = useMemo(() => loadLists(), [])
  const scripts = useMemo(() => loadScripts(), [])
  const [audienceId, setAudienceId] = useState(lists[0]?.id ?? '')
  const [scriptId, setScriptId] = useState(scripts[0]?.id ?? '')
  const [testPhone, setTestPhone] = useState('')
  const [testing, setTesting] = useState(false)
  const [testNote, setTestNote] = useState('')
  const [run, setRun] = useState<OutreachRun | null>(null)
  const [launching, setLaunching] = useState(false)
  const runRef = useRef<OutreachRun | null>(null)
  const cancelRef = useRef(false)

  const audience = lists.find((l) => l.id === audienceId) || null
  const script = scripts.find((s) => s.id === scriptId) || null
  const callable = audience ? audience.contacts.filter((c) => c.phoneValid) : []

  const missing = !audience || !script
  if (lists.length === 0 || scripts.length === 0) {
    return (
      <div className="bg-white border border-dashed border-slate-300 rounded-xl p-12 text-center">
        <AlertTriangle className="h-8 w-8 text-slate-300 mx-auto" />
        <div className="text-base font-semibold text-ink-900 mt-3">
          {lists.length === 0 ? 'Add an audience first' : 'Write a script first'}
        </div>
        <p className="text-sm text-slate-500 mt-1">
          Launch needs {lists.length === 0 ? 'contacts (Audience step)' : 'a call script (Message step)'} before you can dial.
        </p>
      </div>
    )
  }

  const persist = (r: OutreachRun) => {
    const others = loadRuns().filter((x) => x.id !== r.id)
    saveRuns([r, ...others])
  }

  const testCall = async () => {
    if (!script || !testPhone.trim()) return
    setTesting(true)
    setTestNote('Dialing your number…')
    try {
      const placed = await placeCall(script, { name: '', fields: {} }, testPhone.trim(), resortName)
      if (!placed.jobId) {
        setTestNote(placed.error || 'Could not place the test call.')
        setTesting(false)
        return
      }
      setTestNote('Ringing — pick up! Listening for the transcript…')
      const final = await pollUntilDone(placed.jobId)
      const turns = Array.isArray(final.transcript) ? final.transcript.length : 0
      setTestNote(`Test call ${final.status === 'error' ? 'failed' : 'complete'} — ${turns} turns${final.endedReason ? ` (${final.endedReason})` : ''}.`)
    } catch (e) {
      setTestNote(e instanceof Error ? e.message : 'Test call failed.')
    } finally {
      setTesting(false)
    }
  }

  const launch = async () => {
    if (!audience || !script || !callable.length) return
    cancelRef.current = false
    const r: OutreachRun = {
      id: newId(),
      name: `${audience.name} × ${script.name}`,
      audienceId: audience.id,
      scriptId: script.id,
      startedAt: Date.now(),
      calls: callable.map<OutreachCall>((c) => ({ contactId: c.id, name: c.name, phone: c.phone, status: 'queued' })),
    }
    runRef.current = r
    setRun({ ...r })
    setLaunching(true)
    persist(r)
    const flush = () => setRun({ ...runRef.current! })

    for (let i = 0; i < callable.length; i++) {
      if (cancelRef.current) break
      const c = callable[i]
      const call = r.calls[i]
      call.status = 'dialing'
      flush()
      try {
        const placed = await placeCall(script, c, c.phone, resortName)
        if (!placed.jobId) {
          call.status = 'failed'
          call.error = placed.error || 'could not place call'
          flush()
          if (placed.capped) {
            for (let k = i + 1; k < r.calls.length; k++) {
              r.calls[k].status = 'skipped'
              r.calls[k].error = 'hourly call cap reached'
            }
            flush()
            break
          }
          continue
        }
        call.jobId = placed.jobId
        call.callSid = placed.callSid
        call.status = 'live'
        flush()
        const final = await pollUntilDone(placed.jobId, (snap) => {
          if (Array.isArray(snap.transcript)) call.transcript = snap.transcript
          flush()
        })
        call.status = final.status === 'error' ? 'failed' : 'done'
        call.transcript = Array.isArray(final.transcript) ? final.transcript : call.transcript
        call.outcome = final.endedReason || (final.status === 'error' ? final.error : 'completed')
        call.error = final.status === 'error' ? final.error : undefined
        flush()
        persist(r)
      } catch (e) {
        call.status = 'failed'
        call.error = e instanceof Error ? e.message : 'call failed'
        flush()
      }
    }
    setLaunching(false)
    persist(r)
  }

  return (
    <div className="space-y-5">
      {/* Setup */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-card p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-600 mb-1.5">Audience</label>
            <select
              value={audienceId}
              onChange={(e) => setAudienceId(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-botscrew-400"
            >
              {lists.map((l: OutreachList) => (
                <option key={l.id} value={l.id}>
                  {l.name} ({validCount(l)} callable)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1.5">Script</label>
            <select
              value={scriptId}
              onChange={(e) => setScriptId(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-botscrew-400"
            >
              {scripts.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {s.voice}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Review */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-slate-100 pt-3 text-sm">
          <div>
            <span className="text-2xl font-semibold text-ink-900 tabular-nums">{callable.length}</span>{' '}
            <span className="text-slate-500">callable contacts</span>
          </div>
          <div className="text-slate-500">
            Voice: <span className="text-ink-900 font-medium">{script?.voice}</span>
          </div>
          <div className="inline-flex items-center gap-1.5 text-slate-500">
            <ShieldCheck className="h-4 w-4 text-success" />
            Rotates your caller numbers · hourly cap protects spend
          </div>
        </div>
      </div>

      {/* Test call */}
      <div className="bg-botscrew-50 border border-botscrew-100 rounded-xl p-4">
        <div className="text-sm font-semibold text-ink-900 mb-2">Test-call yourself first</div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[220px]">
            <label className="block text-xs text-slate-500 mb-1">Your number</label>
            <input
              type="tel"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="+1 970 555 0100"
              className="w-full text-sm px-3 py-2 border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-botscrew-400"
            />
          </div>
          <button
            onClick={testCall}
            disabled={testing || missing || !testPhone.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-botscrew-500 hover:bg-botscrew-600 text-white rounded-md disabled:opacity-40"
          >
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Phone className="h-4 w-4" />}
            {testing ? 'Calling…' : 'Test call'}
          </button>
        </div>
        {testNote && <p className="text-xs text-slate-600 mt-2">{testNote}</p>}
      </div>

      {/* Launch */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-500">
          Ready to dial <span className="font-semibold text-ink-900">{callable.length}</span> contacts.
        </div>
        {launching ? (
          <button
            onClick={() => {
              cancelRef.current = true
            }}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 text-sm font-semibold bg-danger hover:opacity-90 text-white rounded-md shadow-sm"
          >
            <Square className="h-4 w-4" strokeWidth={2} />
            Stop
          </button>
        ) : (
          <button
            onClick={launch}
            disabled={missing || callable.length === 0}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-action-500 hover:bg-action-600 text-white rounded-md shadow-sm disabled:opacity-40"
          >
            <Play className="h-4 w-4" strokeWidth={2} />
            Launch It ⛷️
          </button>
        )}
      </div>

      {/* Live results */}
      {run && <CallsTable run={run} />}
    </div>
  )
}

// ── Shared results table (also used by the Results step) ──────────────────────
const STATUS_META: Record<CallStatus, { label: string; cls: string; Icon: typeof CheckCircle2 }> = {
  queued: { label: 'Queued', cls: 'text-slate-500 bg-slate-100', Icon: ChevronRight },
  dialing: { label: 'Dialing', cls: 'text-botscrew-600 bg-botscrew-50', Icon: Loader2 },
  live: { label: 'Live', cls: 'text-botscrew-700 bg-botscrew-100', Icon: Loader2 },
  done: { label: 'Done', cls: 'text-success bg-success/10', Icon: CheckCircle2 },
  failed: { label: 'Failed', cls: 'text-danger bg-danger/10', Icon: XCircle },
  skipped: { label: 'Skipped', cls: 'text-warn bg-warn/10', Icon: AlertTriangle },
}

export function CallsTable({ run }: { run: OutreachRun }) {
  const [open, setOpen] = useState<string | null>(null)
  const done = run.calls.filter((c) => c.status === 'done').length
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-card overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div className="text-sm font-semibold text-ink-900">{run.name}</div>
        <div className="text-xs text-slate-500 tabular-nums">
          {done}/{run.calls.length} done
        </div>
      </div>
      <div className="divide-y divide-slate-100">
        {run.calls.map((c) => {
          const meta = STATUS_META[c.status]
          const spinning = c.status === 'dialing' || c.status === 'live'
          const isOpen = open === c.contactId
          const hasTranscript = (c.transcript?.length ?? 0) > 0
          return (
            <div key={c.contactId}>
              <button
                onClick={() => hasTranscript && setOpen(isOpen ? null : c.contactId)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left ${hasTranscript ? 'hover:bg-slate-50' : 'cursor-default'}`}
              >
                {hasTranscript ? (
                  isOpen ? (
                    <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                  )
                ) : (
                  <span className="w-4 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-ink-900 truncate">{c.name || c.phone}</div>
                  <div className="text-[11px] text-slate-400 tabular-nums">{c.phone}</div>
                </div>
                {c.outcome && <span className="text-xs text-slate-500 hidden sm:block">{c.outcome}</span>}
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.cls}`}>
                  <meta.Icon className={`h-3 w-3 ${spinning ? 'animate-spin' : ''}`} />
                  {meta.label}
                </span>
              </button>
              {isOpen && hasTranscript && (
                <div className="px-4 pb-3 pl-11 space-y-1.5">
                  {c.transcript!.map((t, i) => (
                    <div key={i} className="text-sm">
                      <span className={`font-medium ${t.role === 'guest' ? 'text-botscrew-600' : 'text-ink-900'}`}>
                        {t.role === 'guest' ? 'AI' : 'Them'}:
                      </span>{' '}
                      <span className="text-slate-700">{t.text}</span>
                    </div>
                  ))}
                  {c.error && <div className="text-xs text-danger">{c.error}</div>}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
