import type { ScriptSections } from '../lib/outreach'

/**
 * Outreach "plays" — purpose presets that seed the script composer. Each is a
 * strong starting point (not a lock): pick one, it fills the 7 sections + a
 * suggested voice, then "Draft with AI" personalizes it to the resort. {{resort}}
 * is swapped for the account name on apply; {{name}}/{{arrival_date}}/etc. stay
 * as merge tokens filled per contact at call time.
 */
export interface Purpose {
  key: string
  label: string
  emoji: string
  consent: 'consented' | 'opt-in'
  voice: string // suggested built-in voice
  seed: ScriptSections
}

export const PURPOSES: Purpose[] = [
  {
    key: 'pre-arrival',
    label: 'Pre-Arrival Prep',
    emoji: '🎿',
    consent: 'consented',
    voice: 'shimmer',
    seed: {
      goal: 'Make sure the guest is set for their upcoming trip and offer to add lift tickets, lessons, or rentals before they arrive.',
      opening:
        "Hi {{name}}, it's the {{resort}} guest team — your trip's coming up on {{arrival_date}}! Do you have a quick minute?",
      points:
        'Parking fills up by 9am — carpool or grab the free town shuttle.\nPre-booking lift tickets online saves time and money vs. the ticket window.\nLessons and rentals book out fast on weekends.',
      knowledge:
        'Lift ticket & pass options, lesson times and pricing, rental packages, parking/shuttle info, mountain hours.',
      ask: 'Offer to text a link to pre-book lift tickets (plus lessons/rentals if interested) so they arrive all set.',
      guardrails:
        "This is a helpful heads-up, not a hard sell — keep it warm and low-pressure. If they ask to be removed, apologize and confirm we'll take them off. Never invent prices or dates; if unsure, offer to follow up.",
      voicemail:
        'Leave a friendly 15-second message: their trip is coming up, and they can pre-book tickets and lessons at the link we texted to save time — we look forward to seeing them.',
    },
  },
  {
    key: 'win-back',
    label: 'Win-Back',
    emoji: '👋',
    consent: 'opt-in',
    voice: 'coral',
    seed: {
      goal: "Re-engage a guest who hasn't been back this season and invite them to return with a comeback offer.",
      opening: "Hi {{name}}, this is {{resort}} — we've missed you on the mountain! Got a sec?",
      points:
        "What's new and improved this season.\nTheir favorite runs are in great shape.\nA special comeback offer for returning guests.",
      knowledge: 'Current pass/ticket deals, what’s new this season, returning-guest offers.',
      ask: 'Invite them back and offer to text a returning-guest deal or a discounted day.',
      guardrails:
        "If they're not interested or ask to be removed, thank them warmly and mark do-not-call immediately. Never guilt-trip. Keep it light and short.",
      voicemail:
        "Leave a warm 15-second message: we've missed them, there's a returning-guest offer waiting, and they can grab it at the link we texted.",
    },
  },
  {
    key: 'recovery',
    label: 'Booking Recovery',
    emoji: '🧾',
    consent: 'consented',
    voice: 'sage',
    seed: {
      goal: "Help a guest finish a booking they started but didn't complete, and clear whatever blocked them.",
      opening:
        'Hi {{name}}, this is {{resort}} — I saw you were booking a trip with us and wanted to help you wrap it up. Is now okay?',
      points:
        'Their selection is still available but may not stay that way.\nCommon snags are dates, group size, or payment.\nIt only takes a couple of minutes to finish.',
      knowledge: 'Booking/checkout flow, availability, refund/change policy, payment options.',
      ask: 'Offer to text a link to complete the booking, and answer any question holding them back.',
      guardrails:
        "Be helpful, never pushy. If they've changed their mind, thank them and offer to help another time. Never quote prices you're unsure of.",
      voicemail:
        'Leave a brief message: their booking is still saved, they can finish it at the link we texted, and we’re happy to help with any questions.',
    },
  },
  {
    key: 'upsell',
    label: 'Upsell / Add-On',
    emoji: '✨',
    consent: 'consented',
    voice: 'coral',
    seed: {
      goal: 'Enhance an already-booked trip with a relevant add-on — lessons, better rentals, a lodging upgrade, or dining.',
      opening:
        "Hi {{name}}, it's {{resort}} — excited for your trip on {{arrival_date}}! I've got a couple ways to make it even better, got a minute?",
      points:
        'Lessons level up first-timers fast and are great for kids.\nPremium rentals ride noticeably better than base gear.\nSlopeside dining and lodging upgrades book out early.',
      knowledge: 'Lesson programs & pricing, rental tiers, lodging upgrade options, dining reservations.',
      ask: 'Recommend the one or two add-ons that best fit them and offer to text a link to add it to their trip.',
      guardrails:
        'Match the suggestion to their trip — one or two ideas max, never a laundry list. If not interested, no problem; wrap up warmly.',
      voicemail:
        'Leave a short message: a couple of add-ons could make their trip even better, and they can explore them at the link we texted.',
    },
  },
  {
    key: 'review',
    label: 'Post-Visit / Review',
    emoji: '⭐',
    consent: 'consented',
    voice: 'sage',
    seed: {
      goal: 'Thank a guest for visiting, learn how their trip went, and invite a review — catching any unhappy guest for service recovery.',
      opening:
        "Hi {{name}}, it's {{resort}} — thanks so much for visiting! Do you have a quick minute to tell me how your trip went?",
      points:
        'Genuinely listen to how it went before anything else.\nIf it was great: invite a quick online review.\nIf it wasn’t: apologize, get the details, and offer to make it right.',
      knowledge: 'Review links, guest-services contact, refund/make-good policy.',
      ask: 'If they had a good time, offer to text a link to leave a quick review. If they didn’t, capture what went wrong and route them to guest services.',
      guardrails:
        'Lead with gratitude, not the ask. Never argue with a complaint — apologize and escalate. Only ask for a review from clearly happy guests.',
      voicemail:
        'Leave a warm thank-you: we appreciated having them, and if they have a moment we’d love their feedback at the link we texted.',
    },
  },
]
