import { MessageSquare, Code2 } from 'lucide-react';

export default function Widget() {
  return (
    <div className="px-8 py-8 max-w-5xl">
      <header className="mb-6">
        <h1 className="text-3xl font-bold text-ink-900">Widget</h1>
        <p className="text-sm text-slate-500 mt-1">
          Web chat widget appearance, welcome message, and embed code. The Widget is the Web
          connector of the Chat channel.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-4">
        <section className="bg-white border border-slate-200 rounded-xl shadow-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare className="h-4 w-4 text-botscrew-500" strokeWidth={1.75} />
            <h2 className="text-sm font-semibold text-ink-900">Appearance & Behavior</h2>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Colors, position, welcome message, business hours, persona greeting.
          </p>
          <div className="text-xs text-slate-400 italic">Configuration UI coming soon.</div>
        </section>

        <section className="bg-white border border-slate-200 rounded-xl shadow-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Code2 className="h-4 w-4 text-botscrew-500" strokeWidth={1.75} />
            <h2 className="text-sm font-semibold text-ink-900">Embed Code</h2>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Drop-in snippet for the resort's website. Domain restrictions configurable below.
          </p>
          <pre className="text-[11px] font-mono bg-slate-50 border border-slate-200 rounded-md p-3 text-slate-700 overflow-x-auto">
{`<script>
  (function(w,d,s,o){
    w.GSB = w.GSB || [];
    var j = d.createElement(s);
    j.async = 1;
    j.src = 'https://cdn.getskibots.com/widget.js';
    j.dataset.botId = 'bs_8721';
    d.head.appendChild(j);
  })(window, document, 'script');
</script>`}
          </pre>
        </section>
      </div>

      <div className="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600">
        <div className="font-semibold text-ink-900 mb-1">Where this sits in the architecture</div>
        Widget is a shortcut to the <strong>Web connector</strong> under{' '}
        <a href="#/settings/channels" className="text-botscrew-500 hover:underline">
          Settings → Channels → Chat
        </a>
        . Facebook, WhatsApp, and SMS connectors have their own config under that same channel.
        Voice and Email each have their own channel config pages.
      </div>
    </div>
  );
}
