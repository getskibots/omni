import { useMemo, useState } from 'react';
import {
  Check,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Lock,
  Plus,
  X,
  GripVertical,
  Trash2,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  jacksonHole,
  renderTemplate,
  INDUSTRY_LABELS,
  NOTE_TYPE_META,
  sortNotes,
} from '../data/parent';
import type {
  ResortTemplate,
  KnowledgeGroup,
  KnowledgeUrl,
  KnowledgeNote,
  KnowledgeNoteType,
} from '../data/parent';
import { BOILERPLATE_SECTIONS } from '../data/template-boilerplate';

function newId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function TemplateForm() {
  const [template, setTemplate] = useState<ResortTemplate>(jacksonHole.template);
  const [boilerplateOpen, setBoilerplateOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    () => new Set(template.knowledgeGroups.filter((g) => g.entries.some((e) => e.enabled)).map((g) => g.id)),
  );
  const [addingSection, setAddingSection] = useState(false);
  const rendered = useMemo(() => renderTemplate(template), [template]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const updateField = <K extends keyof ResortTemplate>(key: K, value: ResortTemplate[K]) => {
    setTemplate({ ...template, [key]: value });
  };

  const updateKnowledge = (groupId: string, entryKey: string, patch: Partial<KnowledgeUrl>) => {
    setTemplate({
      ...template,
      knowledgeGroups: template.knowledgeGroups.map((g) =>
        g.id !== groupId
          ? g
          : { ...g, entries: g.entries.map((e) => (e.key === entryKey ? { ...e, ...patch } : e)) },
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

  const handleGroupDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = template.knowledgeGroups.findIndex((g) => g.id === active.id);
    const newIndex = template.knowledgeGroups.findIndex((g) => g.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    setTemplate({
      ...template,
      knowledgeGroups: arrayMove(template.knowledgeGroups, oldIndex, newIndex),
    });
  };

  const reorderEntries = (groupId: string, oldIndex: number, newIndex: number) => {
    setTemplate({
      ...template,
      knowledgeGroups: template.knowledgeGroups.map((g) =>
        g.id !== groupId ? g : { ...g, entries: arrayMove(g.entries, oldIndex, newIndex) },
      ),
    });
  };

  const addEntry = (groupId: string, label: string, url: string) => {
    setTemplate({
      ...template,
      knowledgeGroups: template.knowledgeGroups.map((g) =>
        g.id !== groupId
          ? g
          : {
              ...g,
              entries: [
                ...g.entries,
                { key: newId('entry'), label, url, enabled: true, notes: [] },
              ],
            },
      ),
    });
  };

  const removeEntry = (groupId: string, entryKey: string) => {
    setTemplate({
      ...template,
      knowledgeGroups: template.knowledgeGroups.map((g) =>
        g.id !== groupId ? g : { ...g, entries: g.entries.filter((e) => e.key !== entryKey) },
      ),
    });
  };

  const addGroup = (emoji: string, label: string) => {
    const id = newId('group');
    setTemplate({
      ...template,
      knowledgeGroups: [...template.knowledgeGroups, { id, emoji, label, entries: [] }],
    });
    setExpandedGroups((prev) => new Set(prev).add(id));
  };

  const removeGroup = (groupId: string) => {
    setTemplate({
      ...template,
      knowledgeGroups: template.knowledgeGroups.filter((g) => g.id !== groupId),
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
          Drag sections and entries to reorder. Use <strong>+ Add entry</strong> for a new line in a
          group, or <strong>+ Add section</strong> below to create a new group.
        </p>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleGroupDragEnd}
        >
          <SortableContext
            items={template.knowledgeGroups.map((g) => g.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {template.knowledgeGroups.map((group) => (
                <SortableGroupCard
                  key={group.id}
                  group={group}
                  expanded={expandedGroups.has(group.id)}
                  onToggle={() => toggleGroup(group.id)}
                  onUpdate={(entryKey, patch) => updateKnowledge(group.id, entryKey, patch)}
                  onAddNote={(entryKey, note) => addNote(group.id, entryKey, note)}
                  onRemoveNote={(entryKey, noteId) => removeNote(group.id, entryKey, noteId)}
                  onReorderEntries={(oldIndex, newIndex) =>
                    reorderEntries(group.id, oldIndex, newIndex)
                  }
                  onAddEntry={(label, url) => addEntry(group.id, label, url)}
                  onRemoveEntry={(entryKey) => removeEntry(group.id, entryKey)}
                  onRemoveGroup={() => removeGroup(group.id)}
                  sensors={sensors}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <div className="mt-3">
          {addingSection ? (
            <NewSectionEditor
              onSave={(emoji, label) => {
                addGroup(emoji, label);
                setAddingSection(false);
              }}
              onCancel={() => setAddingSection(false)}
            />
          ) : (
            <button
              onClick={() => setAddingSection(true)}
              className="inline-flex items-center gap-1.5 text-sm text-botscrew-500 hover:text-botscrew-600 font-medium px-2 py-1.5"
            >
              <Plus className="h-4 w-4" strokeWidth={2} /> Add section
            </button>
          )}
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

function SortableGroupCard(props: {
  group: KnowledgeGroup;
  expanded: boolean;
  onToggle: () => void;
  onUpdate: (entryKey: string, patch: Partial<KnowledgeUrl>) => void;
  onAddNote: (entryKey: string, note: KnowledgeNote) => void;
  onRemoveNote: (entryKey: string, noteId: string) => void;
  onReorderEntries: (oldIndex: number, newIndex: number) => void;
  onAddEntry: (label: string, url: string) => void;
  onRemoveEntry: (entryKey: string) => void;
  onRemoveGroup: () => void;
  sensors: ReturnType<typeof useSensors>;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.group.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div ref={setNodeRef} style={style}>
      <KnowledgeGroupCard
        {...props}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
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
  onReorderEntries,
  onAddEntry,
  onRemoveEntry,
  onRemoveGroup,
  dragHandleProps,
  sensors,
}: {
  group: KnowledgeGroup;
  expanded: boolean;
  onToggle: () => void;
  onUpdate: (entryKey: string, patch: Partial<KnowledgeUrl>) => void;
  onAddNote: (entryKey: string, note: KnowledgeNote) => void;
  onRemoveNote: (entryKey: string, noteId: string) => void;
  onReorderEntries: (oldIndex: number, newIndex: number) => void;
  onAddEntry: (label: string, url: string) => void;
  onRemoveEntry: (entryKey: string) => void;
  onRemoveGroup: () => void;
  dragHandleProps: Record<string, unknown>;
  sensors: ReturnType<typeof useSensors>;
}) {
  const [addingEntry, setAddingEntry] = useState(false);
  const enabledCount = group.entries.filter((e) => e.enabled).length;
  const totalNotes = group.entries.reduce((sum, e) => sum + (e.notes?.length ?? 0), 0);

  const handleEntryDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = group.entries.findIndex((entry) => entry.key === active.id);
    const newIndex = group.entries.findIndex((entry) => entry.key === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onReorderEntries(oldIndex, newIndex);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className="flex items-center group/header">
        <button
          {...dragHandleProps}
          className="px-2 py-2.5 cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 opacity-0 group-hover/header:opacity-100 transition"
          title="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" strokeWidth={2} />
        </button>
        <button
          onClick={onToggle}
          className="flex-1 text-left py-2.5 pr-3 flex items-center justify-between hover:bg-slate-50"
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
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(`Delete the "${group.label}" section?`)) onRemoveGroup();
          }}
          className="px-2 py-2.5 text-slate-300 hover:text-danger opacity-0 group-hover/header:opacity-100 transition"
          title="Delete section"
        >
          <Trash2 className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>
      {expanded && (
        <div className="border-t border-slate-100 p-3 space-y-3">
          {group.entries.length > 0 && (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleEntryDragEnd}
            >
              <SortableContext
                items={group.entries.map((e) => e.key)}
                strategy={verticalListSortingStrategy}
              >
                {group.entries.map((e) => (
                  <SortableEntryRow
                    key={e.key}
                    entry={e}
                    onUpdate={(patch) => onUpdate(e.key, patch)}
                    onAddNote={(note) => onAddNote(e.key, note)}
                    onRemoveNote={(noteId) => onRemoveNote(e.key, noteId)}
                    onRemove={() => onRemoveEntry(e.key)}
                  />
                ))}
              </SortableContext>
            </DndContext>
          )}
          {addingEntry ? (
            <NewEntryEditor
              onSave={(label, url) => {
                onAddEntry(label, url);
                setAddingEntry(false);
              }}
              onCancel={() => setAddingEntry(false)}
            />
          ) : (
            <button
              onClick={() => setAddingEntry(true)}
              className="inline-flex items-center gap-1.5 text-xs text-botscrew-500 hover:text-botscrew-600 font-medium pl-1 py-0.5"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={2} /> Add entry
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function SortableEntryRow(props: {
  entry: KnowledgeUrl;
  onUpdate: (patch: Partial<KnowledgeUrl>) => void;
  onAddNote: (note: KnowledgeNote) => void;
  onRemoveNote: (noteId: string) => void;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.entry.key,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div ref={setNodeRef} style={style}>
      <EntryRow {...props} dragHandleProps={{ ...attributes, ...listeners }} />
    </div>
  );
}

function EntryRow({
  entry,
  onUpdate,
  onAddNote,
  onRemoveNote,
  onRemove,
  dragHandleProps,
}: {
  entry: KnowledgeUrl;
  onUpdate: (patch: Partial<KnowledgeUrl>) => void;
  onAddNote: (note: KnowledgeNote) => void;
  onRemoveNote: (noteId: string) => void;
  onRemove: () => void;
  dragHandleProps: Record<string, unknown>;
}) {
  const [adding, setAdding] = useState(false);
  return (
    <div className="group/row space-y-1.5">
      <div className="grid grid-cols-[16px_24px_180px_minmax(0,1fr)_24px] items-center gap-2">
        <button
          {...dragHandleProps}
          className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 opacity-0 group-hover/row:opacity-100 transition"
          title="Drag to reorder"
        >
          <GripVertical className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
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
        <button
          onClick={() => {
            if (confirm(`Delete "${entry.label}"?`)) onRemove();
          }}
          className="text-slate-300 hover:text-danger opacity-0 group-hover/row:opacity-100 transition"
          title="Delete entry"
        >
          <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </div>

      {entry.enabled && (
        <div className="ml-[58px] space-y-1.5">
          {entry.notes &&
            entry.notes.length > 0 &&
            sortNotes(entry.notes).map((n) => (
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

function NewEntryEditor({
  onSave,
  onCancel,
}: {
  onSave: (label: string, url: string) => void;
  onCancel: () => void;
}) {
  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');
  const save = () => {
    const l = label.trim();
    if (!l) return;
    onSave(l, url.trim());
  };
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-md p-2.5 space-y-2">
      <div className="grid grid-cols-[180px_minmax(0,1fr)] gap-2">
        <input
          type="text"
          autoFocus
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Label (e.g. Lift Tickets)"
          className="text-sm px-2 py-1.5 border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-botscrew-400"
        />
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://… (optional)"
          className="text-sm font-mono px-2 py-1.5 border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-botscrew-400"
        />
      </div>
      <div className="flex items-center justify-end gap-2">
        <button onClick={onCancel} className="px-2.5 py-1 text-xs text-slate-500 hover:text-ink-900">
          Cancel
        </button>
        <button
          onClick={save}
          disabled={!label.trim()}
          className="px-3 py-1 text-xs font-medium bg-action-500 hover:bg-action-600 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Add entry
        </button>
      </div>
    </div>
  );
}

function NewSectionEditor({
  onSave,
  onCancel,
}: {
  onSave: (emoji: string, label: string) => void;
  onCancel: () => void;
}) {
  const [emoji, setEmoji] = useState('📌');
  const [label, setLabel] = useState('');
  const save = () => {
    const l = label.trim();
    if (!l) return;
    onSave(emoji.trim() || '📌', l);
  };
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-md p-3 space-y-2 max-w-md">
      <div className="grid grid-cols-[64px_minmax(0,1fr)] gap-2">
        <div>
          <label className="block text-[11px] text-slate-500 mb-1">Emoji</label>
          <input
            type="text"
            value={emoji}
            onChange={(e) => setEmoji(e.target.value)}
            placeholder="📌"
            className="w-full text-center text-base px-2 py-1.5 border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-botscrew-400"
          />
        </div>
        <div>
          <label className="block text-[11px] text-slate-500 mb-1">Section name</label>
          <input
            type="text"
            autoFocus
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Equestrian Activities"
            className="w-full text-sm px-2 py-1.5 border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-botscrew-400"
          />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-slate-400">
          Use your OS emoji picker (⌘+Ctrl+Space / Win+.) for any icon.
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="px-2.5 py-1 text-xs text-slate-500 hover:text-ink-900"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={!label.trim()}
            className="px-3 py-1 text-xs font-medium bg-action-500 hover:bg-action-600 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add section
          </button>
        </div>
      </div>
    </div>
  );
}

function NotePill({ note, onRemove }: { note: KnowledgeNote; onRemove: () => void }) {
  const meta = NOTE_TYPE_META[note.type];
  return (
    <div
      className={`group flex items-start gap-2 px-2.5 py-1.5 rounded-md border text-xs ${meta.tone}`}
    >
      <span className="font-semibold whitespace-nowrap">
        <span className="mr-1">{meta.emoji}</span>
        {meta.renderLabel}:
      </span>
      <span className="flex-1 leading-relaxed">
        {note.type === 'script' ? <em>"{note.text}"</em> : note.text}
      </span>
      <button
        onClick={onRemove}
        className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition"
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
  const [type, setType] = useState<KnowledgeNoteType>('rule');
  const [text, setText] = useState('');
  const save = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onSave({ id: `n-${Math.random().toString(36).slice(2, 9)}`, type, text: trimmed });
  };
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-md p-2.5 space-y-2">
      <div className="flex items-center gap-2">
        <label className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
          Type
        </label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as KnowledgeNoteType)}
          className="text-xs border border-slate-200 rounded-md px-2 py-1 bg-white"
        >
          {(['critical', 'rule', 'script', 'faq'] as KnowledgeNoteType[]).map((t) => (
            <option key={t} value={t}>
              {NOTE_TYPE_META[t].emoji} {NOTE_TYPE_META[t].label}
            </option>
          ))}
        </select>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        autoFocus
        placeholder={
          type === 'critical'
            ? 'A high-priority rule the bot must surface…'
            : type === 'script'
              ? 'Exact phrasing the bot should use…'
              : type === 'faq'
                ? 'Q: …  /  A: …'
                : 'Policy rule the bot should cite…'
        }
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
