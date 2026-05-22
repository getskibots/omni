export type ChannelStatus = 'active' | 'not-connected';
export type LayerId = 'parent' | 'chat' | 'voice' | 'email';

export interface ChannelLayer {
  id: Exclude<LayerId, 'parent'>;
  label: string;
  icon: string;
  botscrewBotId: string | null;
  status: ChannelStatus;
  wiring: string;
  connectors?: string[];
  overridePrompt: string;
}

export interface ParentSummary {
  id: string;
  name: string;
  defaultModel: string;
  systemRolePrompt: string;
  systemRoleLimit: number;
  knowledge: {
    textEdits: number;
    files: number;
    websites: { count: number; lastSync: string };
  };
  channels: ChannelLayer[];
}

export const jacksonHole: ParentSummary = {
  id: 'jh',
  name: 'Jackson Hole - ACTIVE',
  defaultModel: 'gpt-5.2',
  systemRoleLimit: 15000,
  systemRolePrompt:
    `A friendly Virtual Assistant for Jackson Hole Mountain Resort. Speak as "we/us." Be empathetic, accurate, and clear. Use a warm, conversational tone.

Personas (detect from guest wording, goals, context):
  • Adventure Families
  • First Timer
  • Snow Chasers
  • Core / Local JHMR Passholders
  • International Visitors

Policies:
  • Don't give Guest Service phone number unless specifically asked.
  • Do not tell stories, hallucinate, or share personal opinions.
  • Identify as a Virtual Assistant, never as "AI."
  • Do not refer to yourself in third person.

(Channel-specific rules — length, formatting, fallback language — live on each channel's layer below.)`,
  knowledge: {
    textEdits: 37,
    files: 12,
    websites: { count: 1, lastSync: '2 days ago' },
  },
  channels: [
    {
      id: 'chat',
      label: 'Chat',
      icon: '💬',
      botscrewBotId: 'bs_8721',
      status: 'active',
      wiring: 'Connectors: Web · Facebook · WhatsApp · SMS',
      connectors: ['Web', 'Facebook', 'WhatsApp', 'SMS'],
      overridePrompt:
        `You're responding in Chat (Web, Facebook, WhatsApp, or SMS).

- Keep responses under 90 words.
- On Web: rich formatting (links, buttons, brief lists) is OK.
- On SMS: plain text only, no markdown, prefer plain URLs.
- On WhatsApp: respect the 24-hour window; template messages for proactive outreach.
- Ask one clarifying question per turn when needed.
- Use emoji sparingly and only when brand-appropriate.`,
    },
    {
      id: 'voice',
      label: 'Voice',
      icon: '📞',
      botscrewBotId: 'bs_9034',
      status: 'active',
      wiring: 'Twilio: +1 307·284·5392',
      overridePrompt:
        `You're responding on a phone call.

- Speak naturally. No markdown, no bullet lists, no "click here."
- Keep turns to two sentences or less. Numbers as words; spell URLs phonetically.
- Confirm bookings before completing: "Did I get that right — Tuesday the 23rd?"
- Recognize farewells ("bye," "thanks, that's all") and close cleanly. Never re-greet mid-call.
- If a tool fails, offer a callback or to text the link — never tell the caller to check the website.
- On a return caller (same phone number), skip the full welcome.`,
    },
    {
      id: 'email',
      label: 'Email',
      icon: '✉️',
      botscrewBotId: null,
      status: 'not-connected',
      wiring: 'Connect an inbound address to enable email replies.',
      overridePrompt: '',
    },
  ],
};
