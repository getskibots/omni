import type { VoiceStack } from '../data/parent';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const OPENAI_KEY = import.meta.env.VITE_OPENAI_API_KEY as string | undefined;

export function isApiKeyConfigured(): boolean {
  return Boolean(OPENAI_KEY && OPENAI_KEY.trim());
}

/**
 * Voice-rule linter. Returns human-readable violation strings for a bot response.
 * Catches the most common voice mistakes (URLs spoken, "check the website", too long,
 * markdown). Runs locally — no API call.
 */
export function detectVoiceViolations(text: string): string[] {
  const violations: string[] = [];

  // URL spoken aloud
  if (/https?:\/\/|www\.|\.com\b|\.org\b/i.test(text)) {
    violations.push('URL spoken aloud — should offer to text or email the link');
  }

  // "Check our website" / "visit our website" / "go to our website"
  if (/check (?:our|the) website|visit (?:our|the) website|go to (?:our|the) website/i.test(text)) {
    violations.push('"Check the website" — caller dialed because they didn\'t want to use the website');
  }

  // Markdown link syntax
  if (/\[.+?\]\(.+?\)/.test(text)) {
    violations.push('Markdown link syntax — not spoken cleanly');
  }

  // "Click here" or "click the link"
  if (/click (?:here|the)/i.test(text)) {
    violations.push('"Click here" — there\'s nothing to click on a phone call');
  }

  // Sentence count (rough)
  const sentences = text.split(/[.!?]+\s+/).filter((s) => s.trim().length > 5);
  if (sentences.length > 2) {
    violations.push(`${sentences.length} sentences — voice rule is max 2 per turn`);
  }

  // Bullet lists
  if (/^\s*[-•*]\s/m.test(text)) {
    violations.push('Bullet list — not spoken cleanly');
  }

  return violations;
}

/**
 * Smart mock used when no API key is configured (production prototype).
 * Keyword-matches the last user message to a voice-appropriate response.
 */
function mockResponse(history: ChatMessage[]): string {
  const lastUser = [...history].reverse().find((m) => m.role === 'user')?.content.toLowerCase() ?? '';

  if (/snow|condition|powder/.test(lastUser)) {
    return 'We got two inches in the last twenty-four hours, eighty-eight inch base. One hundred ten trails and thirteen lifts open. Anything else?';
  }
  if (/ticket|price|cost|how much/.test(lastUser)) {
    return 'Ticket prices vary by date. Want me to text you the link to book online, or have someone call you back with current pricing?';
  }
  if (/lesson|ski school|instructor/.test(lastUser)) {
    return 'We have group and private lessons for kids and adults. Is this for an adult or a child?';
  }
  if (/rental|gear|equipment/.test(lastUser)) {
    return 'We rent skis, snowboards, and demos. Skis or snowboard, and for how many days?';
  }
  if (/parking|park|where to park/.test(lastUser)) {
    return 'Parking at Teton Village is managed by the TVA. Want me to text you the link with current lot status?';
  }
  if (/lift|chairlift|gondola|tram/.test(lastUser)) {
    return 'All major lifts are spinning today. Want the full lift list, or are you asking about a specific one?';
  }
  if (/weather|forecast|temperature/.test(lastUser)) {
    return "It's twenty-eight degrees at the base with light snow. Highs near thirty today. Powder day vibes.";
  }
  if (/event|concert|festival/.test(lastUser)) {
    return 'We\'ve got a few events coming up. Are you asking about something specific, or want the next few highlights?';
  }
  if (/military|veteran|discount/.test(lastUser)) {
    return 'Yes, we offer military discounts on lift and sightseeing tickets. Are you active or retired with a DOD ID, or a veteran with a DD214?';
  }
  if (/bye|thanks|that's all|goodbye|gotta go/.test(lastUser)) {
    return "You're welcome. Have a great day and take care.";
  }
  if (/help|talk to someone|human|agent/.test(lastUser)) {
    return 'Sure thing. Our guest services team is available from nine to five Mountain Time. Want me to text you the number, or transfer you now?';
  }

  return "I can help with snow reports, tickets, lessons, rentals, and parking. What are you trying to plan?";
}

/**
 * Calls the LLM with the assembled voice prompt + conversation history.
 * Falls back to a keyword-matched smart mock when no API key is configured.
 */
export async function runVoiceTest(
  systemPrompt: string,
  history: ChatMessage[],
  voiceStack: VoiceStack,
): Promise<string> {
  if (!isApiKeyConfigured()) {
    // Simulate latency for realistic feel
    await new Promise((r) => setTimeout(r, 600 + Math.random() * 400));
    return mockResponse(history);
  }

  // Realtime models aren't accessible via the text completions API.
  // For text-based iteration testing, fall back to gpt-4o-mini.
  const model = voiceStack.model.startsWith('gpt-realtime') ? 'gpt-4o-mini' : 'gpt-4o-mini';

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: systemPrompt }, ...history],
      max_tokens: 200,
      temperature: 0.6,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  return (data.choices?.[0]?.message?.content ?? '').trim();
}

/**
 * Speaks the text using the browser's SpeechSynthesis API. Voice quality varies
 * by browser/OS; real `ash`/`alloy`/etc. fidelity requires OpenAI TTS (backend).
 */
export function speakText(text: string, voiceName: string): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices();
  // Loose mapping — pick something natural-sounding when available
  const preferred =
    voices.find((v) => v.name.toLowerCase().includes(voiceName.toLowerCase())) ??
    voices.find((v) => /Google US English|Samantha|Microsoft Aria|Karen|Daniel/.test(v.name)) ??
    voices.find((v) => v.lang.startsWith('en-US')) ??
    voices[0];
  if (preferred) u.voice = preferred;
  u.rate = 1.05;
  u.pitch = 1.0;
  window.speechSynthesis.speak(u);
}

export function stopSpeaking(): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
}
