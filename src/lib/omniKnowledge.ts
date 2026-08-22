/**
 * Bridge to the resort's Omni "brain" for the prototype.
 *
 * In the prototype, the inbound bot's knowledge = what's saved on the Knowledge
 * page (the assembled Parent: rendered preset + custom instructions), persisted
 * to localStorage under `omni.parent.<id>`. This reads that so Outreach can feed
 * the SAME knowledge into an outbound call — "one brain, two directions."
 *
 * Production swaps this for the real Botscrew/Odin knowledge API + Supabase; the
 * callers only depend on loadOmniKnowledge(), so that swap won't touch the UI.
 */
import { jacksonHole, renderTemplate } from '../data/parent'

// Cap what we inject into the call brief. Raised so a resort's full assembled
// Parent (instructions + preset) carries over — ~20k chars ≈ ~5k tokens, well
// within a realtime session's system-prompt budget. A knowledge base larger than
// this is the signal to move to retrieval (production), not a bigger prompt.
const CAP = 20000

export interface OmniKnowledge {
  text: string // (capped) knowledge to inject into the call brief
  chars: number // full length, for the "connected · ~N chars" indicator
}

export function loadOmniKnowledge(): OmniKnowledge | null {
  try {
    const raw =
      typeof window !== 'undefined'
        ? window.localStorage.getItem(`omni.parent.${jacksonHole.id}`)
        : null
    const p = raw ? JSON.parse(raw) : null
    const template = p?.template ?? jacksonHole.template
    const parentPrompt = p?.parentPrompt ?? jacksonHole.systemRolePrompt ?? ''
    const assembled = `${renderTemplate(template)}\n\n${parentPrompt}`.trim()
    if (!assembled) return null
    return { text: assembled.slice(0, CAP), chars: assembled.length }
  } catch {
    return null
  }
}
