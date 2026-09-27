/**
 * Vercel serverless proxy → the probe-voice /sms endpoint (Twilio SMS send),
 * holding PROBE_VOICE_TOKEN server-side. Used to text a guest the link the AI
 * offered on the call.
 *
 *   POST /api/outbound-sms  { to, body, from? }  → { sid, from, status }
 *
 * Sender: the droplet decides (TWILIO_SMS_FROM = verified toll-free later; a
 * local number for testing now). `from` optionally overrides per message.
 *
 * NOTE: US delivery requires a verified sender (toll-free verification or 10DLC).
 * Until that clears, carriers filter/block; the plumbing is ready regardless.
 */
type Req = { method?: string; body?: { to?: string; body?: string; from?: string } }
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
    res.status(503).json({ error: 'SMS not configured (PROBE_VOICE_TOKEN missing).' })
    return
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' })
    return
  }
  const b = req.body ?? {}
  if (!b.to || !b.body) {
    res.status(400).json({ error: 'to and body required' })
    return
  }
  try {
    const r = await fetch(`${base}/sms`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ to: b.to, body: b.body, from: b.from }),
    })
    const text = await r.text()
    res.status(r.status)
    res.setHeader('content-type', r.headers.get('content-type') || 'application/json')
    res.send(text)
  } catch (e) {
    res.status(502).json({ error: `Could not reach the voice service: ${e instanceof Error ? e.message : 'unknown'}` })
  }
}
