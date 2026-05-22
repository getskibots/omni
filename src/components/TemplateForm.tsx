import { useMemo, useState } from 'react';
import { Check, Sparkles, ChevronDown, ChevronRight, Lock, Plus, X } from 'lucide-react';
import { jacksonHole, renderTemplate, INDUSTRY_LABELS } from '../data/parent';
import type {
  ResortTemplate,
  KnowledgeGroup,
  KnowledgeUrl,
  KnowledgeNote,
} from '../data/parent';
import { BOILERPLATE_SECTIONS } from '../data/template-boilerplate';

export default function TemplateForm() {
  const [template, setTemplate] = useState<ResortTemplate>(jacksonHole.template);
  const [boilerplateOpen, setBoilerplateOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    () => new Set(template.knowledgeGroups.filter((g) => g.entries.some((e) => e.enabled)).map((g) => g.id)),
  );
  const rendered = useMemo(() => renderTemplate(template), [template]);

  const updateField = <K extends keyof ResortTemplate>(key: K, value: ResortTemplate[K]) => {
    setTemplate({ ...template, [key]: value });
  };

  const updateKnowledge = (
    groupId: string,
    entryKey: string,
    patch: Partial<KnowledgeUrl>,
  ) => {
    setTemplate({
      ...template,
      knowledgeGroups: template.knowledgeGroups.map((g) =>
        g.id !== groupId
          ? g
          : {
              ...g,
              entries: g.entries.map((e) => (e.key === entryKey ? { ...e, ...patch } : e)),
            },
      ),
    });
  };

  const addNote = (groupId: string, entryKey: string, note: KnowledgeNote) => {
    const group = template.knowledgeGroups.find((g) => g.id === groupId);
    const entry = group?.entries.find((e) => e.key === entryKey);
    const existing = entry?.notes ?? [];
    updateKnowledge(groupId, entryKey, { notes: [...existing, note] });
  };

  const removeNote = (groupId: string, entryKey: string, noteId: string) => {
    const group = template.knowledgeGroups.find((g) => g.id === groupId);
    const entry = group?.entries.find((e) => e.key === entryKey);
    const filtered = (entry?.notes ?? []).filter((n) => n.id !== noteId);
    updateKnowledge(groupId, entryKey, { notes: filtered });
  };

  const updateFlow = (key: string, enabled: boolean) => {
    setTemplate({
      ...template,
      flows: template.flows.map((f) => (f.key === key ? { ...f, enabled } : f)),
    });
  };

  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Sparkles className="h-3.5 w-3.5 text-botscrew-500" strokeWidth={1.75} />
        <span>
          GSB {INDUSTRY_LABELS[template.industry]} Template{' '}
          <span className="font-mono text-slate-600">{jacksonHole.templateVersion}</span> · updated{' '}
          {jacksonHole.templateUpdated}. Master updates propagate to every partner.
        </span>
      </div>

      <Section title="🏔️ Resort Identity">
        <div className="grid grid-cols-2 gap-3">
          <Field
            label="Resort Name"
            value={template.resortName}
            onChange={(v) => updateField('resortName', v)}
          />
          <Field
            label="Official URL"
            value={template.officialUrl}
            onChange={(v) => updateField('officialUrl', v)}
          />
          <Field
            label="Contact Email"
            value={template.contactEmail}
            onChange={(v) => updateField('contactEmail', v)}
          />
          <Field
            label="Contact Phone"
            value={template.contactPhone}
            onChange={(v) => updateField('contactPhone', v)}
          />
        </div>
      </Section>

      <BoilerplateSection
        open={boilerplateOpen}
        onToggle={() => setBoilerplateOpen(!boilerplateOpen)}
        template={template}
      />

      <Section
        title="⚡ Realtime Data Flows"
        subtitle="Enable the flows your bot should call for live data. Each flow corresponds to a tool the model can invoke mid-conversation."
      >
        <div className="grid grid-cols-2 gap-2">
          {template.flows.map((f) => (
            <label
              key={f.key}
              className="flex items-center gap-3 py-2 px-3 rounded-md border border-slate-200 bg-white cursor-pointer hover:bg-slate-50"
            >
              <Toggle checked={f.enabled} onChange={(v) => updateFlow(f.key, v)} />
              <code className="text-sm font-mono text-ink-900">{f.label}</code>
            </label>
          ))}
        </div>
      </Section>

      <div>
        <div className="text-sm font-semibold text-ink-900 mb-1">📚 Resort Knowledge Sections</div>
        <p className="text-xs text-slate-500 mb-3">
          Verified URLs by category. Click a header to expand. Disabled rows are skipped at assembly.
        </p>
        <div className="space-y-2">
          {template.knowledgeGroups.map((group) => (
            <KnowledgeGroupCard
              key={group.id}
              group={group}
              expanded={expandedGroups.has(group.id)}
              onToggle={() => toggleGroup(group.id)}
              onUpdate={(entryKey, patch) => updateKnowledge(group.id, entryKey, patch)}
              onAddNote={(entryKey, note) => addNote(group.id, entryKey, note)}
              onRemoveNote={(entryKey, noteId) => removeNote(group.id, entryKey, noteId)}
            />
          ))}
        </div>
      </div>

      <Section title="🎟 Multi-Pass Programs" subtitle="Partner passes accepted at this resort.">
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <Radio
              checked={template.multiPass.hasPartners}
              onChange={() =>
                setTemplate({
                  ...template,
                  multiPass: { ...template.multiPass, hasPartners: true },
                })
              }
              label="Has partnership passes"
            />
            <Radio
              checked={!template.multiPass.hasPartners}
              onChange={() =>
                setTemplate({
                  ...template,
                  multiPass: { ...template.multiPass, hasPartners: false, partners: [] },
                })
              }
              label="No partnership passes"
            />
          </div>
          {template.multiPass.hasPartners && (
            <div>
              <label className="block text-xs text-slate-500 mb-1">
                Configured partners (comma-separated)
              </label>
              <input
                type="text"
                value={template.multiPass.partners.join(', ')}
                onChange={(e) =>
                  setTemplate({
                    ...template,
                    multiPass: {
                      ...template.multiPass,
                      partners: e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    },
                  })
                }
                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-botscrew-400"
              />
            </div>
          )}
        </div>
      </Section>

      <div className="bg-slate-50 border border-slate-200 rounded-xl shadow-card">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-ink-900">Generated prompt</div>
            <p className="text-xs text-slate-500 mt-0.5">
              Auto-assembled from the form above. Concatenated with Custom Instructions at push.
            </p>
          </div>
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border border-slate-200 bg-white text-slate-600">
            {rendered.length.toLocaleString()} chars
          </span>
        </div>
        <pre className="p-4 text-xs font-mono text-ink-700 whitespace-pre-wrap leading-relaxed overflow-x-auto max-h-96 overflow-y-auto">
          {rendered}
        </pre>
      </div>
    </div>
  );
}

function BoilerplateSection({
  open,
  onToggle,
  template,
}: {
  open: boolean;
  onToggle: () => void;
  template: ResortTemplate;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-card overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-slate-50"
      >
        <div className="flex items-center gap-2">
          {open ? (
            <ChevronDown className="h-4 w-4 text-slate-400" strokeWidth={2} />
          ) : (
            <ChevronRight className="h-4 w-4 text-slate-400" strokeWidth={2} />
          )}
          <span className="text-sm font-semibold text-ink-900">Template Boilerplate</span>
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 ml-2">
            <Lock className="h-3 w-3" strokeWidth={2} />
            GSB-managed · {BOILERPLATE_SECTIONS.length} sections
          </span>
        </div>
        <span className="text-xs text-slate-400">
          {open ? 'Collapse' : 'Expand to view canonical sections'}
        </span>
      </button>
      {open && (
        <div className="border-t border-slate-100 divide-y divide-slate-100">
          {BOILERPLATE_SECTIONS.map((section) => (
            <div key={section.title} className="px-4 py-3">
              <div className="text-sm font-semibold text-ink-900 mb-1.5">
                <span className="mr-1.5">{section.emoji}</span>
                {section.title}
              </div>
              <pre className="text-xs font-mono text-slate-600 whitespace-pre-wrap leading-relaxed">
                {section.body(template)}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function KnowledgeGroupCard({
  group,
  expanded,
  onToggle,
  onUpdate,
  onAddNote,
  onRemoveNote,
}: {
  group: KnowledgeGroup;
  expanded: boolean;
  onToggle: () => void;
  onUpdate: (entryKey: string, patch: Partial<KnowledgeUrl>) => void;
  onAddNote: (entryKey: string, note: KnowledgeNote) => void;
  onRemoveNote: (entryKey: string, noteId: string) => void;
}) {
  const enabledCount = group.entries.filter((e) => e.enabled).length;
  const totalNotes = group.entries.reduce((sum, e) => sum + (e.notes?.length ?? 0), 0);
  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full text-left px-4 py-2.5 flex items-center justify-between hover:bg-slate-50"
      >
        <div className="flex items-center gap-2">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-slate-400" strokeWidth={2} />
          ) : (
            <ChevronRight className="h-4 w-4 text-slate-400" strokeWidth={2} />
          )}
          <span className="text-sm font-semibold text-ink-900">
            <span className="mr-1.5">{group.emoji}</span>
            {group.label}
          </span>
        </div>
        <span className="text-xs text-slate-500">
          {enabledCount} of {group.entries.length} enabled
          {totalNotes > 0 && <span className="ml-2 text-slate-400">· {totalNotes} notes</span>}
        </span>
      </button>
      {expanded && (
        <div className="border-t border-slate-100 p-3 space-y-3">
          {group.entries.map((e) => (
            <EntryRow
              key={e.key}
              entry={e}
              onUpdate={(patch) => onUpdate(e.key, patch)}
              onAddNote={(note) => onAddNote(e.key, note)}
              onRemoveNote={(noteId) => onRemoveNote(e.key, noteId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function EntryRow({
  entry,
  onUpdate,
  onAddNote,
  onRemoveNote,
}: {
  entry: KnowledgeUrl;
  onUpdate: (patch: Partial<KnowledgeUrl>) => void;
  onAddNote: (note: KnowledgeNote) => void;
  onRemoveNote: (noteId: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-[24px_180px_minmax(0,1fr)] items-center gap-3">
        <Toggle checked={entry.enabled} onChange={(v) => onUpdate({ enabled: v })} />
        <span className={`text-sm ${entry.enabled ? 'text-ink-900' : 'text-slate-400'}`}>
          {entry.label}
        </span>
        <input
          type="text"
          value={entry.url}
          onChange={(ev) => onUpdate({ url: ev.target.value })}
          disabled={!entry.enabled}
          placeholder={entry.enabled ? 'https://…' : ''}
          className={`text-sm font-mono px-2 py-1 rounded-md border ${
            entry.enabled
              ? 'border-slate-200 bg-white text-ink-900'
              : 'border-slate-100 bg-slate-50 text-slate-400'
          } focus:outline-none focus:ring-2 focus:ring-botscrew-400`}
        />
      </div>

      {entry.enabled && (
        <div className="ml-[36px] space-y-1.5">
          {entry.notes &&
            entry.notes.length > 0 &&
            entry.notes.map((n) => (
              <NotePill key={n.id} note={n} onRemove={() => onRemoveNote(n.id)} />
            ))}
          {adding ? (
            <NoteEditor
              onSave={(note) => {
                onAddNote(note);
                setAdding(false);
              }}
              onCancel={() => setAdding(false)}
            />
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-botscrew-600 px-1.5 py-0.5"
            >
              <Plus className="h-3 w-3" strokeWidth={2} /> Add note
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function NotePill({ note, onRemove }: { note: KnowledgeNote; onRemove: () => void }) {
  return (
    <div className="group flex items-start gap-2 text-sm text-slate-700 leading-relaxed">
      <span className="text-slate-400 mt-0.5 select-none">•</span>
      <span className="flex-1">{note.text}</span>
      <button
        onClick={onRemove}
        className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition mt-0.5"
        title="Remove note"
      >
        <X className="h-3.5 w-3.5" strokeWidth={2} />
      </button>
    </div>
  );
}

function NoteEditor({
  onSave,
  onCancel,
}: {
  onSave: (note: KnowledgeNote) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState('');
  const save = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSave({ id: `n-${Math.random().toString(36).slice(2, 9)}`, type: 'rule', text: trimmed });
  };
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-md p-2.5 space-y-2">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        autoFocus
        placeholder="Add a policy, rule, or scripted answer the bot should use for this topic…"
        className="w-full min-h-[56px] text-sm px-2 py-1.5 border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-botscrew-400"
      />
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={onCancel}
          className="px-2.5 py-1 text-xs text-slate-500 hover:text-ink-900"
        >
          Cancel
        </button>
        <button
          onClick={save}
          disabled={!text.trim()}
          className="px-3 py-1 text-xs font-medium bg-action-500 hover:bg-action-600 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Save note
        </button>
      </div>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-card">
      <div className="px-4 py-3 border-b border-slate-100">
        <div className="text-sm font-semibold text-ink-900">{title}</div>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs text-slate-500 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full text-sm px-3 py-2 border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-botscrew-400"
      />
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`h-5 w-5 rounded border flex items-center justify-center transition ${
        checked
          ? 'bg-botscrew-500 border-botscrew-500 text-white'
          : 'bg-white border-slate-300 hover:border-slate-400'
      }`}
    >
      {checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
    </button>
  );
}

function Radio({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: () => void;
  label: string;
}) {
  return (
    <button onClick={onChange} className="flex items-center gap-2 text-sm text-ink-900">
      <span
        className={`h-4 w-4 rounded-full border flex items-center justify-center ${
          checked ? 'border-botscrew-500' : 'border-slate-300'
        }`}
      >
        {checked && <span className="h-2 w-2 rounded-full bg-botscrew-500" />}
      </span>
      {label}
    </button>
  );
}
