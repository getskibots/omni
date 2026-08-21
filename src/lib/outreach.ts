/**
 * Outreach data layer (v1) — audiences + contacts for outbound campaigns.
 *
 * Persistence matches the rest of the Omni prototype: localStorage. Every page
 * talks ONLY to these functions, so when we productionize (Supabase Postgres +
 * Storage for files, plus the later "connect your data via API" source) we swap
 * this one seam and the UI never changes.
 */

export type ListSource = 'csv' | 'api'

export interface OutreachContact {
  id: string
  name: string
  phone: string // best-effort E.164
  phoneValid: boolean
  email?: string
  fields: Record<string, string> // extra CSV columns → personalization merge fields
}

export interface OutreachList {
  id: string
  name: string
  source: ListSource
  consentSource: string // how/where these contacts opted in (compliance)
  consentAt: number
  createdAt: number
  contacts: OutreachContact[]
}

const LISTS_KEY = 'omni.outreach.lists'

export function loadLists(): OutreachList[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(LISTS_KEY)
    return raw ? (JSON.parse(raw) as OutreachList[]) : []
  } catch {
    return []
  }
}

export function saveLists(lists: OutreachList[]): void {
  try {
    window.localStorage.setItem(LISTS_KEY, JSON.stringify(lists))
  } catch {
    /* quota exceeded — real storage lands with Supabase */
  }
}

export function newId(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return Math.random().toString(36).slice(2) + Date.now().toString(36)
  }
}

// ── CSV parsing (RFC-4180-ish: quoted fields, embedded commas + newlines) ─────
export function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const s = text.replace(/^﻿/, '') // strip BOM
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false
  let i = 0
  while (i < s.length) {
    const c = s[i]
    if (inQuotes) {
      if (c === '"') {
        if (s[i + 1] === '"') {
          cell += '"'
          i += 2
          continue
        }
        inQuotes = false
        i++
        continue
      }
      cell += c
      i++
      continue
    }
    if (c === '"') {
      inQuotes = true
      i++
      continue
    }
    if (c === ',') {
      row.push(cell)
      cell = ''
      i++
      continue
    }
    if (c === '\r') {
      i++
      continue
    }
    if (c === '\n') {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
      i++
      continue
    }
    cell += c
    i++
  }
  if (cell.length || row.length) {
    row.push(cell)
    rows.push(row)
  }
  const nonEmpty = rows.filter((r) => r.some((v) => v.trim() !== ''))
  const headers = (nonEmpty.shift() || []).map((h) => h.trim())
  return { headers, rows: nonEmpty }
}

// ── Phone → E.164 (US default) ────────────────────────────────────────────────
export function normalizePhone(raw: string): { e164: string; valid: boolean } {
  const trimmed = String(raw || '').trim()
  const hasPlus = trimmed.startsWith('+')
  const digits = trimmed.replace(/\D/g, '')
  if (hasPlus) return { e164: '+' + digits, valid: digits.length >= 8 && digits.length <= 15 }
  if (digits.length === 10) return { e164: '+1' + digits, valid: true }
  if (digits.length === 11 && digits.startsWith('1')) return { e164: '+' + digits, valid: true }
  return { e164: digits ? '+' + digits : '', valid: false }
}

export interface ColumnMap {
  name: string
  phone: string
  email: string
} // header names; '' = not mapped

// Guess which header is name / phone / email from common labels.
export function guessColumns(headers: string[]): ColumnMap {
  const find = (res: RegExp[]) =>
    headers.find((h) => res.some((re) => re.test(h.toLowerCase()))) || ''
  return {
    name: find([/^name$/, /full.?name/, /first.?name/, /contact/, /guest/]),
    phone: find([/phone/, /mobile/, /cell/, /number/, /tel/]),
    email: find([/e-?mail/]),
  }
}

// Turn parsed rows into contacts. Everything not mapped to name/phone/email
// becomes a personalization merge field (e.g. {{arrival_date}}).
export function buildContacts(headers: string[], rows: string[][], map: ColumnMap): OutreachContact[] {
  const nameI = headers.indexOf(map.name)
  const phoneI = headers.indexOf(map.phone)
  const emailI = headers.indexOf(map.email)
  const extra = headers.filter((h) => h && h !== map.name && h !== map.phone && h !== map.email)
  return rows
    .map((r) => {
      const { e164, valid } = normalizePhone(phoneI >= 0 ? r[phoneI] || '' : '')
      const fields: Record<string, string> = {}
      for (const h of extra) {
        const v = (r[headers.indexOf(h)] || '').trim()
        if (v) fields[h] = v
      }
      return {
        id: newId(),
        name: (nameI >= 0 ? r[nameI] || '' : '').trim(),
        phone: e164,
        phoneValid: valid,
        email: emailI >= 0 ? (r[emailI] || '').trim() || undefined : undefined,
        fields,
      }
    })
    .filter((c) => c.phone || c.name)
}

export const validCount = (list: OutreachList) => list.contacts.filter((c) => c.phoneValid).length

// ── Scripts (the call "flow" — Option A: talking-point sections) ──────────────
// Not a branching flowchart: a brief the Voice AI navigates. These sections
// assemble into the single agent instruction the probe-voice engine runs
// (opening → on-pickup greeting; the rest → its guidance).
export interface ScriptSections {
  goal: string // the one thing this call is for
  opening: string // first line on pickup (personalized with {{merge_fields}})
  points: string // facts/offers to work in
  knowledge: string // what it can answer from (plus the resort's Omni knowledge)
  ask: string // the call-to-action
  guardrails: string // don'ts + opt-out handling
  voicemail: string // what to do if no answer
}

export interface OutreachScript {
  id: string
  name: string
  sections: ScriptSections
  voice: string // OpenAI voice name (e.g. "ash") or a custom voice_id
  createdAt: number
  updatedAt: number
}

const SCRIPTS_KEY = 'omni.outreach.scripts'

export function loadScripts(): OutreachScript[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(SCRIPTS_KEY)
    return raw ? (JSON.parse(raw) as OutreachScript[]) : []
  } catch {
    return []
  }
}

export function saveScripts(scripts: OutreachScript[]): void {
  try {
    window.localStorage.setItem(SCRIPTS_KEY, JSON.stringify(scripts))
  } catch {
    /* quota — real storage lands with Supabase */
  }
}

// A sensible opt-out/compliance default so no script ships with empty guardrails.
export const DEFAULT_GUARDRAILS =
  "If they ask to stop or be removed, apologize warmly and confirm we'll take them off the list. Never invent prices, dates, or availability — if you're unsure, offer to follow up. Keep it brief, friendly, and never pushy."

export function emptySections(): ScriptSections {
  return {
    goal: '',
    opening: '',
    points: '',
    knowledge: '',
    ask: '',
    guardrails: DEFAULT_GUARDRAILS,
    voicemail: '',
  }
}

// Merge fields available for personalization = "name" + every extra column seen
// across saved audiences. Slice 3 fills these per contact at call time.
export function mergeFields(): string[] {
  const keys = new Set<string>(['name'])
  for (const l of loadLists()) for (const c of l.contacts) for (const k of Object.keys(c.fields)) keys.add(k)
  return [...keys]
}
