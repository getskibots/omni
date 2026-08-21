import { useMemo, useRef, useState } from 'react'
import {
  Users,
  MessageSquareQuote,
  Rocket,
  BarChart3,
  Upload,
  Download,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react'
import {
  loadLists,
  saveLists,
  newId,
  parseCsv,
  buildContacts,
  guessColumns,
  validCount,
  type OutreachList,
  type ColumnMap,
} from '../lib/outreach'
import OutreachMessageStep from '../components/OutreachMessageStep'

// The active resort/account. Hardcoded for the prototype; comes from the account
// context when Outreach productionizes.
const RESORT = 'Jackson Hole'

// The Outreach spine — the mental model borrowed from every marketing tool:
// Audience → Message → Launch → Results. Slice 1 ships the Audience step; the
// rest are visible so the shape of the product reads immediately.
type StepId = 'audience' | 'message' | 'launch' | 'results'
const STEPS: {
  id: StepId
  label: string
  Icon: typeof Users
  emoji?: string
  hint: string
  live: boolean
}[] = [
  { id: 'audience', label: 'Audience', Icon: Users, hint: 'Who to call', live: true },
  { id: 'message', label: 'Message', Icon: MessageSquareQuote, hint: 'Script + voice', live: false },
  // Ski slang: "launch it / send it" — a skier flying off a jump.
  { id: 'launch', label: 'Launch It', Icon: Rocket, emoji: '⛷️', hint: 'Review + dial', live: false },
  { id: 'results', label: 'Results', Icon: BarChart3, hint: 'Transcripts + outcomes', live: false },
]

export default function Outreach() {
  const [step, setStep] = useState<StepId>('audience')

  return (
    <div className="px-8 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-ink-900">Outreach</h1>
        <p className="text-sm text-slate-500 mt-1">
          Reach guests first — outbound Voice AI campaigns from your own numbers, grounded in the
          same brain as your inbound bot.
        </p>
      </header>

      <StepSpine active={step} onSelect={setStep} />

      <div className="mt-6 max-w-5xl">
        {step === 'audience' && <AudienceStep />}
        {step === 'message' && <OutreachMessageStep resortName={RESORT} />}
        {(step === 'launch' || step === 'results') && (
          <ComingNext step={STEPS.find((s) => s.id === step)!} />
        )}
      </div>
    </div>
  )
}

function StepSpine({ active, onSelect }: { active: StepId; onSelect: (s: StepId) => void }) {
  return (
    <div className="flex items-stretch gap-2">
      {STEPS.map((s, i) => {
        const isActive = active === s.id
        return (
          <button
            key={s.id}
            onClick={() => onSelect(s.id)}
            className={`flex-1 text-left rounded-xl border px-4 py-3 transition ${
              isActive
                ? 'border-botscrew-400 bg-botscrew-50 ring-1 ring-botscrew-400'
                : 'border-slate-200 bg-white hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                  isActive ? 'bg-botscrew-500 text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {i + 1}
              </span>
              {s.emoji ? (
                <span className="text-base leading-none">{s.emoji}</span>
              ) : (
                <s.Icon className={`h-4 w-4 ${isActive ? 'text-botscrew-600' : 'text-slate-500'}`} />
              )}
              <span className="text-sm font-semibold text-ink-900">{s.label}</span>
              {!s.live && (
                <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Next
                </span>
              )}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 pl-8">{s.hint}</div>
          </button>
        )
      })}
    </div>
  )
}

function ComingNext({ step }: { step: (typeof STEPS)[number] }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-card p-10 text-center">
      {step.emoji ? (
        <div className="text-4xl leading-none">{step.emoji}</div>
      ) : (
        <step.Icon className="h-8 w-8 text-slate-300 mx-auto" />
      )}
      <div className="text-lg font-semibold text-ink-900 mt-3">{step.label} — coming next</div>
      <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
        {step.id === 'message' &&
          'Compose the call script (talking-points style), pick the voice, and attach knowledge the AI can draw on.'}
        {step.id === 'launch' &&
          'Review the audience, caller numbers, and pace — test-call yourself, then start dialing.'}
        {step.id === 'results' &&
          'Watch each call land live: status, transcript, and outcome per contact.'}
      </p>
    </div>
  )
}

// ── Audience step ─────────────────────────────────────────────────────────────
function AudienceStep() {
  const [lists, setLists] = useState<OutreachList[]>(() => loadLists())
  const [importing, setImporting] = useState(false)

  const persist = (next: OutreachList[]) => {
    setLists(next)
    saveLists(next)
  }

  const remove = (id: string) => {
    if (!confirm('Delete this audience? This only removes it from this device.')) return
    persist(lists.filter((l) => l.id !== id))
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-ink-900">Audiences</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Upload a CSV of <span className="font-medium">consented</span> contacts. Later you'll be
            able to connect a live data source via API.
          </p>
        </div>
        {!importing && (
          <button
            onClick={() => setImporting(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-action-500 hover:bg-action-600 text-white rounded-md shadow-sm"
          >
            <Upload className="h-4 w-4" strokeWidth={2} />
            Import CSV
          </button>
        )}
      </div>

      {importing && (
        <ImportCard
          onCancel={() => setImporting(false)}
          onSave={(list) => {
            persist([list, ...lists])
            setImporting(false)
          }}
        />
      )}

      {!importing && lists.length === 0 && (
        <div className="bg-white border border-dashed border-slate-300 rounded-xl p-12 text-center">
          <Users className="h-8 w-8 text-slate-300 mx-auto" />
          <div className="text-base font-semibold text-ink-900 mt-3">No audiences yet</div>
          <p className="text-sm text-slate-500 mt-1">
            Import a CSV to create your first list of contacts to call.
          </p>
          <button
            onClick={() => setImporting(true)}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-action-500 hover:bg-action-600 text-white rounded-md"
          >
            <Upload className="h-4 w-4" strokeWidth={2} />
            Import CSV
          </button>
        </div>
      )}

      {!importing && lists.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {lists.map((l) => (
            <ListCard key={l.id} list={l} onDelete={() => remove(l.id)} />
          ))}
        </div>
      )}
    </div>
  )
}

function ListCard({ list, onDelete }: { list: OutreachList; onDelete: () => void }) {
  const valid = validCount(list)
  const invalid = list.contacts.length - valid
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-card p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-base font-semibold text-ink-900 truncate">{list.name}</div>
          <div className="text-xs text-slate-500 mt-0.5">
            {new Date(list.createdAt).toLocaleDateString()} · {list.source.toUpperCase()}
          </div>
        </div>
        <button
          onClick={onDelete}
          className="text-slate-400 hover:text-danger transition p-1"
          title="Delete audience"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-3 flex items-baseline gap-4">
        <div>
          <div className="text-2xl font-semibold text-ink-900 tabular-nums">{valid}</div>
          <div className="text-[11px] text-slate-500">callable</div>
        </div>
        {invalid > 0 && (
          <div>
            <div className="text-2xl font-semibold text-warn tabular-nums">{invalid}</div>
            <div className="text-[11px] text-slate-500">need review</div>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-start gap-1.5 text-[11px] text-slate-500 border-t border-slate-100 pt-2.5">
        <ShieldCheck className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" />
        <span>
          Consent: <span className="text-slate-700">{list.consentSource || 'attested'}</span>
        </span>
      </div>
    </div>
  )
}

// ── CSV import flow ───────────────────────────────────────────────────────────
// A starter CSV (headers + example rows) so resorts know the exact format —
// name + phone + email, then extra columns that become {{merge_fields}}.
function downloadTemplate() {
  const csv = [
    'first_name,phone,email,arrival_date,resort,pass_type',
    'Jane Skier,970-555-1212,jane@example.com,Dec 5,Mt Quinnski,Freedom Pass',
    'Bob Rider,(303) 867-5309,bob@example.com,Dec 6,Mt Quinnski,Day Ticket',
  ].join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  const a = document.createElement('a')
  a.href = url
  a.download = 'outreach-template.csv'
  a.click()
  URL.revokeObjectURL(url)
}

function ImportCard({
  onCancel,
  onSave,
}: {
  onCancel: () => void
  onSave: (list: OutreachList) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [parsed, setParsed] = useState<{ fileName: string; headers: string[]; rows: string[][] } | null>(
    null,
  )
  const [map, setMap] = useState<ColumnMap>({ name: '', phone: '', email: '' })
  const [listName, setListName] = useState('')
  const [consent, setConsent] = useState(false)
  const [consentSource, setConsentSource] = useState('')
  const [error, setError] = useState('')

  const onFile = async (f?: File) => {
    if (!f) return
    setError('')
    try {
      const text = await f.text()
      const { headers, rows } = parseCsv(text)
      if (!headers.length || !rows.length) {
        setError('That file has no rows I can read. Is it a CSV with a header row?')
        return
      }
      setParsed({ fileName: f.name, headers, rows })
      setMap(guessColumns(headers))
      setListName(f.name.replace(/\.csv$/i, ''))
    } catch {
      setError('Could not read that file.')
    }
  }

  const contacts = useMemo(
    () => (parsed ? buildContacts(parsed.headers, parsed.rows, map) : []),
    [parsed, map],
  )
  const validN = contacts.filter((c) => c.phoneValid).length
  const preview = contacts.slice(0, 5)
  const extraFields = parsed
    ? parsed.headers.filter((h) => h && h !== map.name && h !== map.phone && h !== map.email)
    : []

  const canSave = !!parsed && !!map.phone && validN > 0 && consent && listName.trim().length > 0

  const save = () => {
    if (!parsed || !canSave) return
    onSave({
      id: newId(),
      name: listName.trim(),
      source: 'csv',
      consentSource: consentSource.trim(),
      consentAt: Date.now(),
      createdAt: Date.now(),
      contacts,
    })
  }

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-card">
      <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
        <div className="text-sm font-semibold text-ink-900">Import contacts</div>
        <button onClick={onCancel} className="text-sm text-slate-500 hover:text-ink-900">
          Cancel
        </button>
      </div>

      <div className="p-5 space-y-5">
        {/* Step: pick file */}
        {!parsed ? (
          <div>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full border-2 border-dashed border-slate-300 rounded-xl py-12 text-center hover:border-botscrew-400 hover:bg-slate-50 transition"
            >
              <Upload className="h-7 w-7 text-slate-400 mx-auto" />
              <div className="text-sm font-medium text-ink-900 mt-2">Choose a CSV file</div>
              <div className="text-xs text-slate-500 mt-1">
                A header row plus name + phone columns. Extra columns become merge fields.
              </div>
            </button>
            <div className="mt-3 flex items-center justify-center">
              <button
                onClick={downloadTemplate}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-botscrew-500 hover:text-botscrew-600"
              >
                <Download className="h-3.5 w-3.5" strokeWidth={2} />
                Download a CSV template
              </button>
            </div>
            {error && <p className="text-sm text-danger mt-3">{error}</p>}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between text-sm">
              <div className="text-slate-600">
                <span className="font-medium text-ink-900">{parsed.fileName}</span> ·{' '}
                {parsed.rows.length} rows
              </div>
              <button
                onClick={() => {
                  setParsed(null)
                  setError('')
                }}
                className="text-botscrew-500 hover:text-botscrew-600 font-medium"
              >
                Choose different file
              </button>
            </div>

            {/* Column mapping */}
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">
                Map columns
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <MapSelect
                  label="Name"
                  headers={parsed.headers}
                  value={map.name}
                  onChange={(v) => setMap({ ...map, name: v })}
                />
                <MapSelect
                  label="Phone *"
                  headers={parsed.headers}
                  value={map.phone}
                  onChange={(v) => setMap({ ...map, phone: v })}
                />
                <MapSelect
                  label="Email"
                  headers={parsed.headers}
                  value={map.email}
                  onChange={(v) => setMap({ ...map, email: v })}
                />
              </div>
              {extraFields.length > 0 && (
                <div className="text-[11px] text-slate-500 mt-2">
                  Merge fields for personalization:{' '}
                  {extraFields.map((h) => (
                    <code
                      key={h}
                      className="font-mono bg-slate-100 text-ink-700 rounded px-1 py-0.5 mr-1"
                    >{`{{${h}}}`}</code>
                  ))}
                </div>
              )}
            </div>

            {/* Preview */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Preview
                </div>
                <div className="text-xs text-slate-500">
                  <span className="text-success font-medium">{validN} callable</span>
                  {contacts.length - validN > 0 && (
                    <span className="text-warn font-medium">
                      {' '}
                      · {contacts.length - validN} need review
                    </span>
                  )}
                </div>
              </div>
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="text-left font-medium px-3 py-2">Name</th>
                      <th className="text-left font-medium px-3 py-2">Phone</th>
                      <th className="text-left font-medium px-3 py-2">Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((c) => (
                      <tr key={c.id} className="border-t border-slate-100">
                        <td className="px-3 py-2 text-ink-900">{c.name || '—'}</td>
                        <td className="px-3 py-2">
                          {c.phoneValid ? (
                            <span className="text-ink-900 tabular-nums">{c.phone}</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-warn">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              {c.phone || 'missing'}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-slate-500">{c.email || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!map.phone && (
                <p className="text-xs text-warn mt-2">Map a phone column to continue.</p>
              )}
            </div>

            {/* Consent — required */}
            <div className="bg-botscrew-50 border border-botscrew-100 rounded-lg p-4">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-botscrew-500"
                />
                <span className="text-sm text-ink-900">
                  I confirm these contacts have <span className="font-semibold">opted in</span> to
                  receive calls from us.
                </span>
              </label>
              <input
                type="text"
                value={consentSource}
                onChange={(e) => setConsentSource(e.target.value)}
                placeholder="How/where did they opt in? (e.g. booking checkbox, waiver form)"
                className="mt-3 w-full text-sm px-3 py-2 border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-botscrew-400"
              />
            </div>

            {/* Name + save */}
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <label className="block text-sm text-slate-600 mb-1.5">Audience name</label>
                <input
                  type="text"
                  value={listName}
                  onChange={(e) => setListName(e.target.value)}
                  placeholder="e.g. Nov arrivals — booked"
                  className="w-full text-sm px-3 py-2 border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-botscrew-400"
                />
              </div>
              <button
                onClick={save}
                disabled={!canSave}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md text-white shadow-sm disabled:opacity-40 disabled:cursor-not-allowed bg-action-500 hover:bg-action-600"
              >
                <CheckCircle2 className="h-4 w-4" strokeWidth={2} />
                Save audience
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function MapSelect({
  label,
  headers,
  value,
  onChange,
}: {
  label: string
  headers: string[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="block text-sm text-slate-600 mb-1.5">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full text-sm border border-slate-200 rounded-md px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-botscrew-400"
      >
        <option value="">— none —</option>
        {headers.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
    </div>
  )
}
