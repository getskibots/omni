import { useMemo, useState } from 'react'
import { BarChart3 } from 'lucide-react'
import { loadRuns, type OutreachRun } from '../lib/outreach'
import { CallsTable } from './OutreachLaunchStep'

export default function OutreachResultsStep() {
  const runs = useMemo(() => loadRuns(), [])
  const [selected, setSelected] = useState<OutreachRun | null>(runs[0] ?? null)

  if (runs.length === 0) {
    return (
      <div className="bg-white border border-dashed border-slate-300 rounded-xl p-12 text-center">
        <BarChart3 className="h-8 w-8 text-slate-300 mx-auto" />
        <div className="text-base font-semibold text-ink-900 mt-3">No runs yet</div>
        <p className="text-sm text-slate-500 mt-1">
          Launch a campaign and its calls — transcripts and outcomes — show up here.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-[240px_minmax(0,1fr)] gap-5 items-start">
      <div className="space-y-2">
        <div className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold px-1">Runs</div>
        {runs.map((r) => {
          const done = r.calls.filter((c) => c.status === 'done').length
          const isActive = selected?.id === r.id
          return (
            <button
              key={r.id}
              onClick={() => setSelected(r)}
              className={`w-full text-left rounded-lg border px-3 py-2.5 transition ${
                isActive ? 'border-botscrew-400 bg-botscrew-50' : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <div className="text-sm font-medium text-ink-900 truncate">{r.name}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {new Date(r.startedAt).toLocaleString()} · {done}/{r.calls.length} done
              </div>
            </button>
          )
        })}
      </div>
      <div>{selected && <CallsTable run={selected} />}</div>
    </div>
  )
}
