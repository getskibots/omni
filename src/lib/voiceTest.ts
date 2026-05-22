import type { VoiceStack } from '../data/parent';

export type TestChannel = 'chat' | 'voice';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const LS_KEY = 'omni.openai_api_key';
const ENV_KEY = import.meta.env.VITE_OPENAI_API_KEY as string | undefined;

/** localStorage first (per-browser, set via the modal), env var as fallback (set via .env.local). */
function getApiKey(): string | undefined {
  if (typeof window !== 'undefined') {
    const fromStorage = window.localStorage?.getItem(LS_KEY);
    if (fromStorage && fromStorage.trim()) return fromStorage.trim();
  }
  if (ENV_KEY && ENV_KEY.trim()) return ENV_KEY.trim();
  return undefined;
}

export function setApiKey(key: string): void {
  if (typeof window === 'undefined') return;
  if (key.trim()) {
    window.localStorage.setItem(LS_KEY, key.trim());
  } else {
    window.localStorage.removeItem(LS_KEY);
  }
}

export function clearApiKey(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(LS_KEY);
}

export function isApiKeyConfigured(): boolean {
  return Boolean(getApiKey());
}

/**
 * Channel-aware violation linter. Catches the most common rule breaks for the
 * given channel. Runs locally — no API call.
 */
export function detectViolations(text: string, channel: TestChannel): string[] {
  const violations: string[] = [];

  if (channel === 'voice') {
    if (/https?:\/\/|www\.|\.com\b|\.org\b/i.test(text)) {
      violations.push('URL spoken aloud — should offer to text or email the link');
    }
    if (/check (?:our|the) website|visit (?:our|the) website|go to (?:our|the) website/i.test(text)) {
      violations.push('"Check the website" — caller dialed because they didn\'t want to use the website');
    }
    if (/\[.+?\]\(.+?\)/.test(text)) {
      violations.push('Markdown link syntax — not spoken cleanly');
    }
    if (/click (?:here|the)/i.test(text)) {
      violations.push('"Click here" — there\'s nothing to click on a phone call');
    }
    const sentences = text.split(/[.!?]+\s+/).filter((s) => s.trim().length > 5);
    if (sentences.length > 2) {
      violations.push(`${sentences.length} sentences — voice rule is max 2 per turn`);
    }
    if (/^\s*[-•*]\s/m.test(text)) {
      violations.push('Bullet list — not spoken cleanly');
    }
  }

  if (channel === 'chat') {
    const wordCount = text.trim().split(/\s+/).length;
    if (wordCount > 90) {
      violations.push(`${wordCount} words — Chat rule is under 90 words`);
    }
    // Plain URL without markdown formatting (Web/FB/WhatsApp prefer markdown links)
    const hasPlainUrl = /(?:^|\s)(https?:\/\/\S+)/.test(text);
    const hasMarkdownLink = /\[.+?\]\(.+?\)/.test(text);
    if (hasPlainUrl && !hasMarkdownLink) {
      violations.push('Plain URL — Chat layer says format links as [here](URL)');
    }
  }

  return violations;
}

/** Backwards-compat alias for the older helper name. */
export const detectVoiceViolations = (text: string) => detectViolations(text, 'voice');

/**
 * Channel-specific smart mock used when no API key is configured.
 */
function mockResponse(history: ChatMessage[], channel: TestChannel): string {
  const lastUser =
    [...history].reverse().find((m) => m.role === 'user')?.content.toLowerCase() ?? '';

  if (channel === 'voice') {
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

  // Chat responses — longer, markdown allowed
  if (/snow|condition|powder/.test(lastUser)) {
    return "Latest from the mountain: 2 inches in the last 24 hours, 88-inch base, 110 trails and 13 lifts open. Conditions are variable today — full report [here](https://www.jacksonhole.com/mountain-report).";
  }
  if (/ticket|price|cost|how much/.test(lastUser)) {
    return "Ticket prices vary by date of visit, and the best pricing is online in advance. Browse and book [here](https://www.jacksonhole.com/lift-tickets). Want me to flag anything specific — military discount, beginner area, or group rates?";
  }
  if (/lesson/.test(lastUser)) {
    return "We offer adult and kids lessons, both group and private. Group lessons are great for first-timers; private lessons let you tailor pace. Is this for an adult or a child?";
  }
  if (/lodging|stay|hotel/.test(lastUser)) {
    return "We've got a range of lodging right at Teton Village — vacation rentals and full packages. Browse options [here](https://www.jacksonhole.com/lodging). Are you flexible on dates or have a specific window in mind?";
  }
  if (/dining|restaurant|food|eat/.test(lastUser)) {
    return "Plenty of on-mountain and base-area dining. Full options [here](https://www.jacksonhole.com/dining). Looking for something on-mountain or in the village?";
  }
  if (/parking/.test(lastUser)) {
    return "Parking at Teton Village is run by the TVA. Current status and shuttle info [here](https://tetonvillagewy.gov/visitors/parking-shuttles-buses/). Lots can fill on powder days — want tips on timing?";
  }
  if (/event|concert/.test(lastUser)) {
    return "Upcoming events and resort activities [here](https://www.jacksonhole.com/events). Anything specific you're hoping to catch?";
  }
  if (/military|veteran|discount/.test(lastUser)) {
    return "Yes — military discounts on lift and sightseeing tickets. Are you active/retired with a DOD ID, or a veteran with a DD214? The discount differs by category.";
  }
  if (/bye|thanks|that's all|goodbye/.test(lastUser)) {
    return "You're welcome! Have a great trip 🙌";
  }
  return "I can help with tickets, passes, lessons, rentals, lodging, dining, and events. What are you trying to plan?";
}

/**
 * Calls the LLM with the assembled channel prompt + conversation history.
 * Falls back to a keyword-matched smart mock when no API key is configured.
 */
export async function runChannelTest(
  systemPrompt: string,
  history: ChatMessage[],
  channel: TestChannel,
  voiceStack?: VoiceStack,
): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) {
    await new Promise((r) => setTimeout(r, 600 + Math.random() * 400));
    return mockResponse(history, channel);
  }

  // For text-based iteration, both channels use a chat-completions model.
  // Voice's actual realtime model only runs over WebRTC in production.
  const model = 'gpt-4o-mini';

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'system', content: systemPrompt }, ...history],
      max_tokens: channel === 'voice' ? 160 : 280,
      temperature: 0.6,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error ${res.status}: ${err.slice(0, 200)}`);
  }

  const data = await res.json();
  void voiceStack; // voiceStack reserved for future per-voice-model dispatch
  return (data.choices?.[0]?.message?.content ?? '').trim();
}

/** Backwards-compat alias for the older helper name. */
export const runVoiceTest = (
  systemPrompt: string,
  history: ChatMessage[],
  voiceStack: VoiceStack,
): Promise<string> => runChannelTest(systemPrompt, history, 'voice', voiceStack);

/**
 * Speaks the text using the browser's SpeechSynthesis API. Voice quality varies
 * by browser/OS; real ash/alloy fidelity requires OpenAI TTS (backend).
 */
export function speakText(text: string, voiceName: string): void {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices();
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
