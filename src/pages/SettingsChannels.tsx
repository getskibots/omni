import { jacksonHole } from '../data/parent';

export default function SettingsChannels() {
  return (
    <div className="px-8 py-6 max-w-5xl mx-auto">
      <header className="mb-6">
        <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
          Settings
        </div>
        <h1 className="text-2xl font-semibold text-ink-900 mt-1">Channels</h1>
        <p className="text-sm text-slate-500 mt-1">
          Wire up where the bot lives. Edit channel instructions in{' '}
          <a href="#/knowledge" className="text-botscrew-500 hover:underline">
            Knowledge → Instructions
          </a>
          .
        </p>
      </header>

      <div className="space-y-4">
        {jacksonHole.channels.map((c) => (
          <div
            key={c.id}
            className="bg-white rounded-xl border border-slate-200 shadow-card overflow-hidden"
          >
            <div className="px-5 py-4 flex items-center justify-between border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="text-2xl">{c.icon}</div>
                <div>
                  <div className="font-semibold text-ink-900">{c.label}</div>
                  <div className="text-xs text-slate-500 font-mono mt-0.5">
                    {c.botscrewBotId ?? '—'}
                  </div>
                </div>
              </div>
              {c.status === 'active' ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" /> Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-300" /> Not connected
                </span>
              )}
            </div>
            <div className="px-5 py-4 space-y-3">
              <div className="text-sm text-slate-600">{c.wiring}</div>
              {c.connectors && (
                <div className="flex flex-wrap gap-2">
                  {c.connectors.map((conn) => (
                    <span
                      key={conn}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-botscrew-50 text-botscrew-700 border border-botscrew-100"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-botscrew-500" />
                      {conn}
                    </span>
                  ))}
                </div>
              )}
              <div className="pt-1">
                <button className="text-sm font-medium text-botscrew-500 hover:text-botscrew-600">
                  {c.status === 'active' ? 'Configure wiring' : 'Connect'} →
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
