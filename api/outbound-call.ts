/**
 * Vercel serverless proxy → the GSB probe-voice engine (the same droplet service
 * faqit uses to place live outbound Voice AI calls). Keeps PROBE_VOICE_TOKEN
 * server-side; the browser never sees it.
 *
 *   POST /api/outbound-call          place ONE call  → { jobId, callSid, to }
 *   GET  /api/outbound-call?jobId=…  poll transcript → { status, transcript, … }
 *
 * Env:
 *   PROBE_VOICE_URL    default https://voice-probe.getskibots.com
 *   PROBE_VOICE_TOKEN  shared bearer secret the droplet checks (REQUIRED)
 */

type Req = {
  method?: string
  query?: { jobId?: string }
  body?: {
    phone?: string
    instructions?: string
    firstMessage?: string
    voiceEngine?: string
    guestVoice?: string
    elevenVoiceId?: string
    resort?: string
  }
}
type Res = {
  status: (code: number) => Res
  setHeader: (name: string, value: string) => void
  json: (body: unknown) => void
  send: (body: string) => void
}

export default async function handler(req: Req, res: Res): Promise<void> {
  const base = (process.env.PROBE_VOICE_URL || 'https://voice-probe.getskibots.com').replace(/\/$/, '')
  const token = process.env.PROBE_VOICE_TOKEN
  if (!token) {
    res.status(503).json({ error: 'Outbound calling not configured (PROBE_VOICE_TOKEN missing).' })
    return
  }
  const auth = { authorization: `Bearer ${token}` }

  // Poll a placed call.
  if (req.method === 'GET') {
    const jobId = String(req.query?.jobId || '')
    if (!jobId) {
      res.status(400).json({ error: 'jobId required' })
      return
    }
    try {
      const r = await fetch(`${base}/result/${encodeURIComponent(jobId)}`, { headers: auth })
      const text = await r.text()
      res.status(r.status)
      res.setHeader('content-type', r.headers.get('content-type') || 'application/json')
      res.send(text)
    } catch (e) {
      res.status(502).json({ error: `Could not reach the voice service: ${e instanceof Error ? e.message : 'unknown'}` })
    }
    return
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' })
    return
  }

  const b = req.body ?? {}
  if (!b.phone || !b.instructions) {
    res.status(400).json({ error: 'phone and instructions required' })
    return
  }

  // Converse/agent mode: the assembled script brief drives a free-form call.
  const payload = {
    dialTarget: String(b.phone),
    instructions: String(b.instructions),
    firstMessage: b.firstMessage ? String(b.firstMessage) : undefined,
    voiceEngine: b.voiceEngine === 'elevenlabs' ? 'elevenlabs' : 'openai',
    guestVoice: b.guestVoice ? String(b.guestVoice) : undefined,
    elevenVoiceId: b.elevenVoiceId ? String(b.elevenVoiceId) : undefined,
    resort: b.resort ? String(b.resort) : undefined,
  }

  try {
    const r = await fetch(`${base}/call`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...auth },
      body: JSON.stringify(payload),
    })
    const text = await r.text()
    res.status(r.status)
    res.setHeader('content-type', r.headers.get('content-type') || 'application/json')
    res.send(text)
  } catch (e) {
    res.status(502).json({ error: `Could not reach the voice service: ${e instanceof Error ? e.message : 'unknown'}` })
  }
}
