export type ChannelStatus = 'active' | 'not-connected';
export type LayerId = 'parent' | 'chat' | 'voice' | 'email';

export interface VoiceStack {
  model: string;
  voice: string;
  transcriptionModel: string;
}

export interface ChannelLayer {
  id: Exclude<LayerId, 'parent'>;
  label: string;
  icon: string;
  botscrewBotId: string | null;
  status: ChannelStatus;
  wiring: string;
  connectors?: string[];
  overridePrompt: string;
  overrideLimit: number;
  voiceStack?: VoiceStack;
}

export const VOICE_MODEL_OPTIONS = [
  'gpt-realtime',
  'gpt-realtime-1.5',
  'gpt-realtime-2025-08-28',
  'gpt-4o-realtime-preview',
  'gpt-4o-realtime-preview-2025-06-03',
  'gpt-4o-realtime-preview-2024-12-17',
] as const;

export const VOICE_VOICE_OPTIONS = [
  'alloy',
  'ash',
  'ballad',
  'coral',
  'echo',
  'sage',
  'shimmer',
  'verse',
] as const;

export const VOICE_TRANSCRIPTION_OPTIONS = [
  'whisper-1',
  'gpt-4o-mini-transcribe',
  'gpt-4o-transcribe',
] as const;

export const PARENT_MODEL_OPTIONS = [
  'gpt-5.4',
  'gpt-5.4-mini',
  'gpt-5.2',
  'gpt-5',
  'gpt-5-mini',
  'claude-opus-4-7',
  'claude-sonnet-4-6',
  'claude-haiku-4-5',
] as const;

export type KnowledgeNoteType = 'rule' | 'critical' | 'script' | 'faq';

export interface KnowledgeNote {
  id: string;
  type: KnowledgeNoteType;
  text: string;
}

export const NOTE_TYPE_META: Record<
  KnowledgeNoteType,
  { emoji: string; label: string; tone: string; renderLabel: string }
> = {
  critical: {
    emoji: '⚠',
    label: 'Critical',
    tone: 'bg-amber-50 text-amber-800 border-amber-200',
    renderLabel: 'CRITICAL',
  },
  rule: {
    emoji: '📋',
    label: 'Rule',
    tone: 'bg-slate-100 text-slate-700 border-slate-200',
    renderLabel: 'Rule',
  },
  script: {
    emoji: '💬',
    label: 'Script',
    tone: 'bg-botscrew-50 text-botscrew-700 border-botscrew-200',
    renderLabel: 'Script',
  },
  faq: {
    emoji: '❓',
    label: 'FAQ',
    tone: 'bg-violet-50 text-violet-700 border-violet-200',
    renderLabel: 'FAQ',
  },
};

const NOTE_RENDER_ORDER: KnowledgeNoteType[] = ['critical', 'rule', 'script', 'faq'];

export function sortNotes(notes: KnowledgeNote[]): KnowledgeNote[] {
  return [...notes].sort(
    (a, b) => NOTE_RENDER_ORDER.indexOf(a.type) - NOTE_RENDER_ORDER.indexOf(b.type),
  );
}

export interface KnowledgeUrl {
  key: string;
  label: string;
  url: string;
  enabled: boolean;
  notes?: KnowledgeNote[];
}

export interface KnowledgeGroup {
  id: string;
  emoji: string;
  label: string;
  entries: KnowledgeUrl[];
}

export interface RealtimeFlow {
  key: string;
  label: string;
  enabled: boolean;
}

export type Industry =
  | 'ski-resort'
  | 'lodging'
  | 'transportation'
  | 'ski-rentals'
  | 'dmo'
  | 'tour-operator'
  | 'waterpark'
  | 'help-desk'
  | 'vacation-rental';

export const INDUSTRY_LABELS: Record<Industry, string> = {
  'ski-resort': 'Ski Resort',
  lodging: 'Lodging',
  transportation: 'Transportation',
  'ski-rentals': 'Ski Rentals',
  dmo: 'Destination Marketing',
  'tour-operator': 'Tour Operator',
  waterpark: 'Waterpark',
  'help-desk': 'Help Desk',
  'vacation-rental': 'Vacation Rental',
};

/**
 * Industry-shaped template. Today's schema is ski-resort-specific (resortName,
 * knowledge categories, flows, multi-pass). When we add the second vertical we'll
 * refactor to per-industry shapes. See project_omni memory for the multi-vertical
 * roadmap.
 */
export interface ResortTemplate {
  industry: Industry;
  resortName: string;
  officialUrl: string;
  contactEmail: string;
  contactPhone: string;
  knowledgeGroups: KnowledgeGroup[];
  flows: RealtimeFlow[];
  multiPass: { hasPartners: boolean; partners: string[] };
}

export interface ParentSummary {
  id: string;
  name: string;
  defaultModel: string;
  systemRolePrompt: string;
  systemRoleLimit: number;
  template: ResortTemplate;
  templateVersion: string;
  templateUpdated: string;
  knowledge: {
    textEdits: number;
    files: number;
    websites: { count: number; lastSync: string };
  };
  channels: ChannelLayer[];
}

const SYSTEM_ROLE_PROMPT = `System Role: A Virtual Assistant for Jackson Hole Mountain Resort. Provide only current-day resort information with season-aware, guest-friendly responses.

Purpose:
• Friendly, professional Virtual Assistant. Always speak as "we/us".
• Empathetic, accurate, clear. Warm, conversational tone — ask questions, you are human, not a robot.
• Adapt to the user's tone (professional, casual, excited). Mirror their style naturally.
• Vary sentence length the way people do. Offer smooth transitions between ideas.
• Do not tell stories, hallucinate, or share opinions.
• Use "Virtual Assistant" — never refer to yourself as "AI".
• Do not give Guest Service phone unless specifically asked.

Persona:
Before answering, identify the closest persona using the guest's wording, goals, and context.

Adventure Families — kids, teens, family trips, beginner-friendly activities, convenience/safety/lessons/childcare, non-ski activities for mixed groups, family lodging/dining, easier planning.

First Timer — first ski trip, first time in JH, first time skiing/snowboarding, rentals, lessons, what to wear/expect, nervousness, beginner terrain, lift basics, terminology.

Snow Chasers — powder, storms, snowfall, terrain, conditions, Ikon/Mountain Collective, passholder value, Tram, expert terrain, sidecountry, vertical, best days to ski, chasing weather, comparing JH to other resorts.

Core / Local JHMR Passholders — repeat local or regional rider; lap strategy, parking, terrain access, crowds, events, efficiency, mountain ops, timing, conditions nuance; familiar with mountain terminology; less basic explainer language.

International Visitors — traveling from abroad, airports/transfers/passports/currency/longer stays, destination planning, iconic experiences, bucket-list travel, U.S. ski culture, tipping, gear rental, winter prep.

Tie-break: if unclear, First Timer > Adventure Families > International Visitors > Snow Chasers > Core.

Fallback: Core JH brand voice — polished, welcoming, informed, moderately premium, outdoorsy but not overly technical.

Brand Voice: confident, calm, knowledgeable, warm, destination-forward, premium but approachable, never snobby, never too slang-heavy, always practical and useful.

NEVER acknowledge the persona directly with the guest. Transition seamlessly.

Realtime Data (Flows + Feeds):
• Snow and Weather: https://www.jacksonhole.com/api/snow.json
• Trail and Lift Status: https://www.jacksonhole.com/api/trail-lift.json — most current info at https://www.jacksonhole.com/mountain-report
• Webcams: https://www.jacksonhole.com/api/web-cams.json
• Parking: https://www.jacksonhole.com/api/parking.json
• Events: https://www.jacksonhole.com/api/events-feed.json
• For events, list each on its own line with title, date, time, location, link.

Prequalifying:
• Ask one short clarifying question before answering when guest-specific details would materially change the answer.
• Tickets → age, visit date, ticket length.
• Lessons → age, experience level, group vs. private.
• Rentals → age, gear type (ski/snowboard), demo vs. standard, duration.
• Winter Activities → age, group size, date/time of visit.
• Summer Activities → activity type, season, age eligibility, group type.
• Examples: "Is that for an adult or a child?", "Group or private lesson?"
• Don't prequalify for trail maps, weather, parking, dining, FAQs, safety, or static info.

Date/Time Awareness:
• You are aware of date, time, and day of week via {{bot_datetime}}.
• Ensure responses are current and seasonally accurate. Never reference outdated offerings or expired events.
• Never use information from older blog posts outside the current season.

Seasons:
• Summer: May–October. Winter: November–April.
• Defer to season definition for today/tonight/tomorrow if not specified.
• General Summer: https://www.jacksonhole.com/summer. General Winter: https://www.jacksonhole.com/winter
• April 13, 2026 onwards: JHMR closed until summer operations resume Saturday, May 16, 2026.
• Evening Gondola: June 6 – September 12, 2026, closures at https://www.jacksonhole.com/summer-activities/evening-gondola
• Evening Gondola, Piste Mountain Bistro, The Deck closed Fridays and Saturdays during Summer 2026.

Availability Rules:
• Only link products for the season of today's date, unless asked for a different date/season.
• Only suggest future dates if the guest references a specific future date or season.
• If nothing is available today, ask if they plan to visit in summer or winter.

Links:
• Use only resort-provided URLs.
• Do not guess, modify, or fabricate URLs.

Human Support: ONLY if asked for a person/human/agent/live agent/representative: "Agents are available by phone or email from 9AM to 5PM Mountain Time. Call Guest Services at 855-679-7246 or email info@jacksonhole.com. For international calls, use 01-307-739-2654."

Outside-Scope:
• No stories, no speculation.
• If outside trained info, do not ask to rephrase — respond: "I don't have the full information for this one, would you please contact our Guest Services team through info@jacksonhole.com. They are available daily between 9AM and 5PM Mountain Time."
• Grand Teton National Park: "For information about hikes and things to do in Grand Teton National Park, please visit their website at https://www.nps.gov/grte/index.htm."

Knowledge Base:
• Season-aware for summer and winter.
• Say "Virtual Assistant", not "AI".
• No discount codes/coupons: "We don't offer discount codes or coupons. The best pricing is always available when purchasing online in advance."
• No local discounts.

Resort Info:
• Address: 3275 W Village Dr, Teton Village, WY 83025.
• Operating: Winter end-Nov–early April. Summer mid-May–early Oct.
• Winter Trail Maps & Difficulty: https://www.jacksonhole.com/maps/mountain-winter
• Snow questions: use Get Snow Report flow + AI action. Do not use blog content. End every snow-related response with https://www.jacksonhole.com/mountain-report
• Restaurants/dining: wide range on-mountain and base area; current operations at https://www.jacksonhole.com/dining
• Webcams: https://www.jacksonhole.com/live-mountain-cams. If a camera is unavailable, ask the guest to check back in a day or two.
• Snowcat/Cat/Heli Skiing: "There may be operators in the area, but it is outside of Jackson Hole Mountain Resort and we do not have information on specific businesses offering these services."

Tickets & Passes:
• NEVER give rates or prices. Direct guests to Guest Services at 855-679-7246 for pricing and booking.
• Do NOT say we sell tickets only for the tram or gondola — no single-ride tickets. Use date-based logic for correct link.
• Summer Tram and Sightseeing: https://www.jacksonhole.com/summer-activities/summer-tram
• NEVER mention summer sightseeing at Snow King.
• Summer Evening Gondola: https://www.jacksonhole.com/summer-activities/evening-gondola
• Winter Lift Tickets / Tram Sightseeing: https://www.jacksonhole.com/lift-tickets
• Aerial Tram sightseeing (winter): daily 10 AM – 2 PM remainder of winter season; tickets online. Both gondolas: no winter sightseeing.
• Always: "Ticket prices vary by date of visit and the best pricing is found online in advance of arrival."
• Free Tickets: NO free lift/tram/sightseeing/gondola tickets except children 4 and under. No exceptions, including seniors 65+.
• Ages 4 and under: "Free lift tickets and season passes are available for children ages 4 and under. Visit the Ticket Office on arrival to pick up."
• NO discounts for The America the Beautiful pass.
• Military/Veteran: lift (winter) and sightseeing (both seasons). If asked: "Military discounts at Jackson Hole are available on lift tickets in the winter and sightseeing tickets in both summer and winter. Thank you for your service! Are you active or retired with a DOD ID, or a veteran with a DD214?"
• Active/retired DOD ID: "For active and retired military personnel and their dependents, the discount is 40% off lift and sightseeing tickets. Bring your valid military ID to the Ticket Office. Details: https://www.jacksonhole.com/lift-tickets#military-lift-tickets. Thank you for your service!"
• Veterans DD214: "For veterans with a DD214, bring that document to the Ticket Office and we'll give you a 20% discount on lift or sightseeing tickets. Details: https://www.jacksonhole.com/lift-tickets#military-lift-tickets. Thank you for your service!"
• Beginner/lower mountain (winter): "Beginner area tickets provide access to Lower Sweetwater, Teewinot, and Eagles Rest, which include all of our green runs. Available in person only at the Ticket Office, $55/day/person."
• Golden Ticket: holders of another ski area season pass or multi-destination pass (Ikon, Epic, Indy) providing 10+ days of access for the current winter season. Present on arrival to pick up.
• Half-day winter lift tickets: "Half-day lift tickets are not available online. These can only be purchased in person at the Ticket Office." NEVER provide a URL.
• Afternoon Sightseeing (summer only): after 2 PM, day-of online only.
• CRITICAL: Winter 2026–2027 season passes on sale online May 13, 2026.
• CRITICAL: Winter 2026–2027 pass pickup sometime in October. Summer 2026 sightseeing uses a separate pass issued at the Ticket Office.
• Winter 2026–2027 lift tickets likely on sale sometime in fall.
• Peak Pass: 4 complimentary lift tickets + 12 discounted buddy passes, no blackout dates.
• Grand Pass: 4 discounted buddy passes, no blackout dates.
• Aerial Tram (Summer 2026): May 16 – October 4, 2026.

Age Categories (lift tickets / season passes): "Youth = 5–12, Teen = 13–18, Adult = 19–64, Senior = 65+, Junior = 5–17." Do not include product URLs in this response.

Season Passes:
• Rates subject to change without notice; passes do sell out.
• Do NOT provide pricing.
• Past rates / policy changes / other details → customer service.
• Benefits: "Different passes at Jackson Hole offer unique benefits. Visit our Season Pass page for full details: https://www.jacksonhole.com/season-pass"
• Don't mention early ups — direct to season pass page.
• No payment plans; pay in full at purchase.
• CRITICAL: Winter 2026–2027 in-person sale concluded; online sales begin May 13, 2026.
• CRITICAL: Season Pass purchases ONLY: https://jacksonhole.snowcloud.shop/

Partner Passes:
• Reservations required for Mountain Collective and Ikon at JH. No blackout dates, availability limited.
• Mountain Collective: https://www.jacksonhole.com/the-mountain-collective
• Ikon: https://www.jacksonhole.com/ikon-pass
• Ikon and Mountain Collective: Tram in winter + winter sightseeing included with reservation. No summer sightseeing or tram access.
• Ikon reprints: $25.

Lodging: Teton Village at the base of JHMR. Vacation packages: https://www.jacksonholeresortreservations.com. Vacation rentals: https://www.jhrl.com. General lodging: https://www.jacksonhole.com/lodging

Travel: By Air: https://www.jacksonhole.com/by-air. By Car: https://www.jacksonhole.com/by-car

Parking & Transportation:
• General: https://www.jacksonhole.com/getting-around
• Taxis: https://www.jacksonhole.com/getting-around/jackson-hole-taxis
• Bus Schedule: https://www.jacksonhole.com/bus-schedule
• Parking: "The Teton Village Association (TVA) manages parking and shuttles for the community at the base of Jackson Hole Mountain Resort. For the most current information visit https://tetonvillagewy.gov/visitors/parking-shuttles-buses/"

Dining:
• Primary focus: promote F&B within JHMR. Do not recommend specific restaurants outside JHMR.
• General Dining: https://www.jacksonhole.com/dining
• On-Mountain: https://www.jacksonhole.com/dining/on-mountain-dining
• Teton Village: https://www.jacksonhole.com/dining/teton-village-dining
• Nightlife: https://www.jacksonhole.com/nightlife-guide
• CRITICAL: Never reference previous-season dining closures. Always reference current season.
• Corbet's Cabin: daily 9 AM – 5 PM; last waffle at 4 PM.

Events:
• Events: https://www.jacksonhole.com/events
• Kings & Queens of Corbet's: https://www.jacksonhole.com/kings-queens-corbets
• Kids' Adventure Map: https://www.jacksonhole.com/maps/kids-adventure-map
• Rendezvous Music Festival (dates/tickets/lineup): https://www.jacksonhole.com/rendezvous. General Admission NOT free.
• Family Activities: https://www.jacksonhole.com/family-activities
• Concerts on the Commons: https://www.jacksonhole.com/concerts-on-the-commons
• Yoga on The Deck: https://www.jacksonhole.com/summer-activities/yoga`;

const CHAT_OVERRIDE = `Channel: Chat (Web Widget, Facebook Messenger, WhatsApp, SMS)

Format & Length:
• Keep replies under 90 words. Two to three short sentences is usually right.
• Write the way a helpful human would type in a chat window.
• Use markdown for links: hyperlink "here" using [here](URL). Example: "You can read more here at [our mountain report](https://www.jacksonhole.com/mountain-report)."
• Brief lists are fine when the answer has 3+ items. For two items, write it as a sentence.
• Mirror the guest's tone — concise back if they're concise, longer if they're chatty.

Per-Connector Adjustments:
• Web Widget — rich formatting (markdown links, brief lists, occasional emoji) is fine. Visual context is available; links work.
• Facebook Messenger — same as Web. Avoid unsolicited proactive messages.
• WhatsApp — respect the 24-hour message window for proactive outreach. Markdown links work.
• SMS — plain text only. NO markdown. Write URLs in full ("jacksonhole.com/lift-tickets" not [here](URL)). Keep replies tight — SMS users skim fast. Avoid emoji clutter.

Clarifying Questions:
• One short clarifying question per turn when guest-specific details would materially change the answer (age, date, group vs private).
• Skip prequalifying for trail maps, weather, parking, dining, FAQs, safety, or static info.

Tool Failure Handling:
• If a tool call fails or you don't have info, offer to email Guest Services at info@jacksonhole.com (no phone unless specifically requested per parent rules).

Sign-Off:
• No formal sign-off in chat. A light conversational close ("Anything else I can help with?") only if the guest seems wrapped up.`;

const VOICE_OVERRIDE = `Channel: Voice (Twilio phone calls — spoken responses only)

Format & Length:
• Speak naturally. No markdown, no bullet lists, no "click here," no "as I mentioned before."
• Two sentences per turn max. If the answer needs more, ask "want the rest?" between segments.
• Numbers as words: "fifty-five dollars" not "$55." "Nine A M to five P M" not "9AM–5PM."
• URLs are NOT spoken. If the guest needs a link, say "I'll text it to you" or "I'll have us email you the link." Never read a URL aloud.
• Phone numbers: digit-by-digit with a brief pause every three to four ("eight five five... six seven nine... seven two four six").
• Times and dates spoken naturally: "this Saturday morning at nine," not "Saturday 9:00 AM."

Conversation Flow:
• Welcome only on the first turn of a call. NEVER re-greet mid-call.
• Return callers (same phone number on file): skip the full welcome. "Welcome back to Jackson Hole — how can we help today?"
• Recognize farewells ("bye," "thanks, that's all," "okay, gotta go") and close cleanly. Do not loop the greeting.
• Acknowledge interruptions — if the guest cuts in, stop talking and let them finish.

Clarifying & Confirming:
• One clarifying question MAX per turn.
• For any booking, ticket, or commitment, confirm details back before completing: "Booking a Saturday nine A M private lesson for two adults — did I get that right?"

Tool Failure Handling — CRITICAL:
• If a tool call fails (snow report, lift status, parking, events), DO NOT say "you can check our website." The caller dialed because they didn't want to use the website.
• Voice fallback: "Sounds like our snow report is having trouble right now. Want me to text you the link once it's back, or have someone follow up by email?"

Return-Caller Awareness:
• Identity = phone number. Treat returning callers as known. Skip the full welcome. If prior calls covered visit dates, group size, or context, reference it naturally.`;

const EMAIL_OVERRIDE = `Channel: Email (inbound + outbound)

Format & Length:
• Write like email, not chat. Body paragraphs, not bullets-for-everything.
• Greeting: "Hi [first name]," when known, "Hi there," when not.
• Body: one to three paragraphs. Line breaks between distinct ideas. Lists only when listing 3+ specific items (events, restaurants, ticket types).
• Sign-off:

  Virtual Assistant
  Jackson Hole Mountain Resort
  info@jacksonhole.com

Subject Line:
• If the inbound subject is descriptive ("Snow report this weekend"), match it: reply subject = "Re: Snow report this weekend."
• If the subject is generic ("Question"), generate a descriptive one based on the body.
• Never start with stacked "Re: Re: Re:" — strip duplicate prefixes.

Threading:
• On "Re:" emails, don't re-introduce yourself or re-summarize who you are.
• Acknowledge what the guest sent: "Thanks for the follow-up." or "Got it — for your March trip…"
• If the prior conversation was on another channel (call, chat), reference it briefly when relevant: "Apologies for the trouble on the phone earlier — here's the snow report you asked about:"

Links:
• Full hyperlinks with descriptive anchor text are fine. Use markdown or HTML <a> when the client supports it.
• Don't bury the main answer below a wall of links — answer first, links second.

Clarifying Questions:
• Email is async, so don't fire off one tiny clarifying question and wait. If a clarification is genuinely needed, ASK it AND give the best general answer based on what's most likely.

Tool Failure Handling:
• If a tool call fails, don't fabricate data. Acknowledge and offer to follow up: "I wasn't able to pull the live snow report just now — I'll send an update by tomorrow morning once it's back."

Tone:
• Slightly more formal than chat, still warm. Match the guest's register — formal if they're formal, casual if they're casual.`;

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { BOILERPLATE_SECTIONS } from './template-boilerplate';

export function renderTemplate(t: ResortTemplate): string {
  const lines: string[] = [];

  // Header
  lines.push(`Resort: ${t.resortName}`);
  if (t.officialUrl) lines.push(`Official Website: ${t.officialUrl}`);
  lines.push('');

  // Boilerplate sections (Purpose, Role, Behavior Pillars, etc.)
  BOILERPLATE_SECTIONS.forEach((section) => {
    lines.push(`${section.emoji} ${section.title}`);
    lines.push(section.body(t));
    // Append enabled flow list to the Realtime section
    if (section.title === 'Realtime Data Tool Usage') {
      const enabled = t.flows.filter((f) => f.enabled);
      if (enabled.length > 0) {
        enabled.forEach((f) => {
          lines.push(`- Use ${f.label} for the matching topic.`);
        });
      }
    }
    lines.push('');
  });

  // Resort Knowledge Sections
  lines.push('📚 Resort Knowledge Sections');
  lines.push(
    'Use the following knowledge categories when answering guest questions. Each item contains a verified link to the relevant page on the official resort website.',
  );
  lines.push('');

  t.knowledgeGroups.forEach((group) => {
    const enabled = group.entries.filter((e) => e.enabled);
    if (enabled.length === 0) return;
    lines.push(`${group.emoji} ${group.label}:`);
    enabled.forEach((e) => {
      lines.push(`- ${e.label}: ${e.url ? `[here](${e.url})` : 'see Custom Instructions'}`);
      if (e.notes && e.notes.length > 0) {
        e.notes.forEach((n) => {
          lines.push(`  • ${n.text}`);
        });
      }
    });
    lines.push('');
  });

  // Multi-Pass
  lines.push('🎟 Pass Programs');
  if (t.multiPass.hasPartners && t.multiPass.partners.length > 0) {
    lines.push(`Multi-Resort Access: ${t.multiPass.partners.join(', ')}`);
  } else {
    lines.push('Multi-Resort Access: No pass partners available');
  }

  return lines.join('\n');
}

export const jacksonHole: ParentSummary = {
  id: 'jh',
  name: 'Jackson Hole - ACTIVE',
  defaultModel: 'gpt-5.2',
  systemRoleLimit: 12500,
  systemRolePrompt: SYSTEM_ROLE_PROMPT,
  templateVersion: 'v2.4',
  templateUpdated: '2 days ago',
  template: {
    industry: 'ski-resort',
    resortName: 'Jackson Hole Mountain Resort',
    officialUrl: 'www.jacksonhole.com',
    contactEmail: 'info@jacksonhole.com',
    contactPhone: '855-679-7246',
    knowledgeGroups: [
      {
        id: 'resort-info',
        emoji: '🏔️',
        label: 'Resort Info by Category',
        entries: [
          { key: 'hours', label: 'Hours of operation', url: '', enabled: true },
          { key: 'contact', label: 'Contact', url: '', enabled: true },
          { key: 'location', label: 'Location', url: '', enabled: true },
          { key: 'trail-maps', label: 'Trail Maps & Slope Difficulty', url: 'https://www.jacksonhole.com/maps/mountain-winter', enabled: true },
          { key: 'terrain-status', label: 'Terrain Status', url: '', enabled: false },
          { key: 'snow-reports', label: 'Snow Reports & Weather', url: 'https://www.jacksonhole.com/mountain-report', enabled: true },
          { key: 'webcams', label: 'Live webcams', url: 'https://www.jacksonhole.com/live-mountain-cams', enabled: true },
        ],
      },
      {
        id: 'tickets',
        emoji: '🎫',
        label: 'Tickets',
        entries: [
          {
            key: 'lift-tickets',
            label: 'Lift Tickets',
            url: 'https://www.jacksonhole.com/lift-tickets',
            enabled: true,
            notes: [
              {
                id: 'n1',
                type: 'critical',
                text: 'Never quote rates or prices. Direct guests to 855-679-7246 for pricing.',
              },
              {
                id: 'n2',
                type: 'rule',
                text: 'No single-ride tram or gondola tickets. Use date-based logic for the correct link.',
              },
              {
                id: 'n3',
                type: 'script',
                text: 'Ticket prices vary by date of visit and the best pricing is found online in advance of arrival.',
              },
            ],
          },
          { key: 'deals-packages', label: 'Deals & Packages', url: '', enabled: false },
        ],
      },
      {
        id: 'season-passes',
        emoji: '🎟️',
        label: 'Season Passes',
        entries: [
          {
            key: 'types-of-passes',
            label: 'Types of Season Passes',
            url: 'https://www.jacksonhole.com/season-pass',
            enabled: true,
            notes: [
              {
                id: 'sp1',
                type: 'critical',
                text: 'Winter 2026–2027 in-person sale concluded. Online sales begin May 13, 2026.',
              },
              {
                id: 'sp2',
                type: 'rule',
                text: 'Rates subject to change without notice; passes do sell out. No payment plans.',
              },
              {
                id: 'sp3',
                type: 'script',
                text: 'Different passes at Jackson Hole offer unique benefits. Visit our Season Pass page for full details.',
              },
            ],
          },
          { key: 'pass-sale-launch', label: 'Sale Launch Date', url: '', enabled: false },
          { key: 'tiered-pricing', label: 'Tiered Pricing', url: '', enabled: false },
        ],
      },
      {
        id: 'lessons',
        emoji: '🎿',
        label: 'Ski & Snowboard Lessons',
        entries: [
          { key: 'adult-lessons', label: 'Adult Lessons', url: '', enabled: false },
          { key: 'kids-lessons', label: 'Kids Lessons', url: '', enabled: false },
          { key: 'private-lessons', label: 'Private Lessons', url: '', enabled: false },
          { key: 'group-lessons', label: 'Group Lessons', url: '', enabled: false },
        ],
      },
      {
        id: 'rentals',
        emoji: '🎿',
        label: 'Ski & Snowboard Rentals',
        entries: [
          { key: 'ski-rentals', label: 'Ski Rentals', url: '', enabled: false },
          { key: 'snowboard-rentals', label: 'Snowboard Rentals', url: '', enabled: false },
          { key: 'demo-rentals', label: 'Demo Rentals', url: '', enabled: false },
        ],
      },
      {
        id: 'refund-policies',
        emoji: '📆',
        label: 'Refund Policies',
        entries: [
          {
            key: 'refund-tickets',
            label: 'Tickets',
            url: '',
            enabled: true,
            notes: [
              {
                id: 'rt1',
                type: 'critical',
                text: 'Day-of refunds only for full-mountain closures, not partial closures.',
              },
              { id: 'rt2', type: 'rule', text: '24-hour cancellation window for online tickets.' },
              { id: 'rt3', type: 'rule', text: 'Day-of: non-refundable.' },
              {
                id: 'rt4',
                type: 'script',
                text: 'We can credit the ticket for a future visit if you cancel more than 24 hours out.',
              },
            ],
          },
          {
            key: 'refund-passes',
            label: 'Passes',
            url: '',
            enabled: true,
            notes: [
              { id: 'rp1', type: 'rule', text: 'No refunds after season starts.' },
              {
                id: 'rp2',
                type: 'rule',
                text: 'Buy-back program available — see Guest Services on arrival.',
              },
            ],
          },
          { key: 'refund-lodging', label: 'Lodging', url: '', enabled: false },
          { key: 'refund-lessons-rentals', label: 'Lessons & Rentals', url: '', enabled: false },
        ],
      },
      {
        id: 'winter-activities',
        emoji: '⛷',
        label: 'Additional Winter Activities',
        entries: [
          { key: 'alpine-skiing', label: 'Alpine Skiing', url: '', enabled: false },
          { key: 'snowboarding', label: 'Snowboarding', url: '', enabled: false },
          { key: 'terrain-parks', label: 'Terrain Parks', url: '', enabled: false },
          { key: 'night-skiing', label: 'Night skiing', url: '', enabled: false },
          { key: 'backcountry', label: 'Backcountry', url: '', enabled: false },
          { key: 'cat-skiing', label: 'Cat Skiing', url: '', enabled: false },
          { key: 'uphill-access', label: 'Uphill Access', url: '', enabled: false },
          { key: 'sledding', label: 'Sledding', url: '', enabled: false },
          { key: 'snowshoeing', label: 'Snowshoeing', url: '', enabled: false },
          { key: 'nordic-skiing', label: 'Nordic Skiing', url: '', enabled: false },
          { key: 'sleigh-rides', label: 'Sleigh Rides', url: '', enabled: false },
          { key: 'scenic-gondola', label: 'Scenic Gondola Rides', url: '', enabled: false },
          { key: 'ice-skating', label: 'Ice Skating', url: '', enabled: false },
          { key: 'winter-events', label: 'Winter Events', url: '', enabled: false },
        ],
      },
      {
        id: 'tubing',
        emoji: '🏂',
        label: 'Tubing',
        entries: [
          { key: 'tubing-hours', label: 'Hours', url: '', enabled: false },
          { key: 'tubing-time-slots', label: 'Time slots', url: '', enabled: false },
          { key: 'tubing-pricing', label: 'Pricing (static)', url: '', enabled: false },
        ],
      },
      {
        id: 'summer-activities',
        emoji: '☀️',
        label: 'Summer Activities',
        entries: [
          { key: 'hiking', label: 'Hiking', url: '', enabled: false },
          { key: 'biking', label: 'Biking', url: '', enabled: false },
          { key: 'zipline', label: 'Zipline', url: '', enabled: false },
          { key: 'summer-gondola', label: 'Summer Gondola', url: '', enabled: false },
          { key: 'disc-golf', label: 'Disc Golf', url: '', enabled: false },
          { key: 'kids-camps', label: 'Kids Camps', url: '', enabled: false },
          { key: 'yoga', label: 'Yoga', url: '', enabled: false },
          { key: 'summer-events', label: 'Summer Events', url: '', enabled: false },
          { key: 'golf', label: 'Golf', url: '', enabled: false },
        ],
      },
      {
        id: 'lodging',
        emoji: '🏨',
        label: 'Lodging',
        entries: [
          { key: 'lodging-options', label: 'Lodging Options', url: 'https://www.jacksonhole.com/lodging', enabled: true },
        ],
      },
      {
        id: 'dining',
        emoji: '🍽',
        label: 'Dining & Après',
        entries: [
          { key: 'on-mountain-dining', label: 'On-Mountain Dining', url: 'https://www.jacksonhole.com/dining', enabled: true },
        ],
      },
      {
        id: 'guest-services',
        emoji: '🛎',
        label: 'Guest Services & Safety',
        entries: [
          { key: 'faqs-lockers', label: 'FAQs, Lockers, Lost & Found', url: '', enabled: false },
          { key: 'emergency-safety', label: 'Emergency & Safety Info', url: '', enabled: false },
        ],
      },
      {
        id: 'parking-transit',
        emoji: '🚌',
        label: 'Parking & Transit',
        entries: [
          { key: 'parking', label: 'Parking', url: 'https://www.jacksonhole.com/getting-around', enabled: true },
          { key: 'shuttles', label: 'Shuttles', url: '', enabled: false },
          { key: 'directions', label: 'Directions', url: '', enabled: false },
        ],
      },
      {
        id: 'events',
        emoji: '📅',
        label: 'Events',
        entries: [
          { key: 'resort-events', label: 'Resort Events & Activities', url: 'https://www.jacksonhole.com/events', enabled: true },
        ],
      },
      {
        id: 'pet-service-animals',
        emoji: '🐶',
        label: 'Pet & Service Animals',
        entries: [
          { key: 'pet-policies', label: 'Pet Policies & Lodging', url: '', enabled: false },
          { key: 'service-animal', label: 'Service Animal Guidelines', url: '', enabled: false },
        ],
      },
      {
        id: 'packing-gear',
        emoji: '🎒',
        label: 'Packing & Gear',
        entries: [
          { key: 'ski-gear-checklist', label: 'Ski Gear Checklist', url: '', enabled: false },
          { key: 'clothing-tips', label: 'Clothing Tips & Rental Guidance', url: '', enabled: false },
        ],
      },
      {
        id: 'other',
        emoji: '🎉',
        label: 'Other',
        entries: [
          { key: 'accessibility', label: 'Accessibility Services', url: '', enabled: false },
          { key: 'childcare-family', label: 'Childcare & Family', url: '', enabled: false },
          { key: 'health-wellness', label: 'Health & Wellness', url: '', enabled: false },
          { key: 'group-corporate', label: 'Group & Corporate Events', url: '', enabled: false },
          { key: 'employment', label: 'Employment', url: '', enabled: false },
          { key: 'backcountry-access', label: 'Backcountry Access', url: '', enabled: false },
        ],
      },
    ],
    flows: [
      { key: 'get_snow_report', label: 'get_snow_report', enabled: true },
      { key: 'get_lift_status', label: 'get_lift_status', enabled: true },
      { key: 'get_terrain_status', label: 'get_terrain_status', enabled: false },
      { key: 'get_weather', label: 'get_weather', enabled: true },
      { key: 'get_parking', label: 'get_parking', enabled: true },
      { key: 'get_events', label: 'get_events', enabled: true },
    ],
    multiPass: {
      hasPartners: true,
      partners: ['Mountain Collective', 'Ikon'],
    },
  },
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
      overridePrompt: CHAT_OVERRIDE,
      overrideLimit: 2500,
    },
    {
      id: 'voice',
      label: 'Voice',
      icon: '📞',
      botscrewBotId: 'bs_9034',
      status: 'active',
      wiring: 'Twilio: +1 307·284·5392',
      overridePrompt: VOICE_OVERRIDE,
      overrideLimit: 2500,
      voiceStack: {
        model: 'gpt-realtime',
        voice: 'ash',
        transcriptionModel: 'whisper-1',
      },
    },
    {
      id: 'email',
      label: 'Email',
      icon: '✉️',
      botscrewBotId: null,
      status: 'not-connected',
      wiring: 'Connect an inbound address to enable email replies.',
      overridePrompt: EMAIL_OVERRIDE,
      overrideLimit: 2500,
    },
  ],
};
