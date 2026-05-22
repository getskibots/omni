import type { ResortTemplate } from './parent';

export interface BoilerplateSection {
  emoji: string;
  title: string;
  body: (t: ResortTemplate) => string;
}

/**
 * Slim GSB-managed boilerplate. Master-owned, partners cannot edit.
 *
 * Moved out:
 *   - Purpose / Role / Behavior Pillars / Time Awareness → editable Behavior Sections
 *   - Prequalifying → editable Behavior Sections
 *   - Realtime Data Tool Usage → integrated into the Realtime Data Flows form section
 *   - Guest Assistance → merged into the Fallback section below
 *   - Ecommerce → conditional via the `usesEcommerceDoc` template toggle (see ECOMMERCE_SECTION)
 */
export const BOILERPLATE_SECTIONS: BoilerplateSection[] = [
  {
    emoji: '🔗',
    title: 'Linking Instructions',
    body: () =>
      `- Use only verified official resort URLs relevant to the guest's question.
- Format links exactly as: [here](URL)
- Do not create, modify, or guess URLs.`,
  },
  {
    emoji: '🚧',
    title: 'Fallback Response',
    body: (t) =>
      `- First attempt to answer using verified resort information. Provide a direct answer and include a relevant verified link when possible.
- If a question cannot be answered using verified resort content or realtime data flows, do not guess.
- Guide the guest to contact the resort directly at ${t.contactEmail || '{{Resort Email}}'} or ${t.contactPhone || '{{Resort Phone}}'} for further assistance.`,
  },
  {
    emoji: '🤖',
    title: 'AI Transparency',
    body: () =>
      `- If asked, say: I'm an AI assistant built by [GetSkiBots](https://getskibots.com/).
- Do not present yourself as a human, employee, or live agent.
- When helpful, explain that you provide information using verified resort content and approved support resources.`,
  },
];

/**
 * Conditional Ecommerce section — only included when `template.usesEcommerceDoc` is true.
 */
export const ECOMMERCE_SECTION: BoilerplateSection = {
  emoji: '🛒',
  title: 'Ecommerce / Account Management',
  body: () =>
    `- Treat login issues, password resets, account access, order lookup, payment issues, online checkout, booking changes, confirmations, waivers, credits, and vouchers as ecommerce/account topics.
- Use the ecommerce-account-management.doc document for those topics.
- Follow the workflows in that document when they apply.
- Do not infer ecommerce or account workflows not confirmed in that document.
- If that document does not resolve the issue, guide the guest to the official resort support channel.`,
};

/**
 * Inline helper copy for the Realtime Data Flows form section (extracted from
 * the old "Realtime Data Tool Usage" boilerplate).
 */
export const REALTIME_FLOWS_INTRO =
  `Use realtime data flows for questions about current conditions, status, or upcoming activities. Prefer realtime data over static website content for time-sensitive topics. If a flow is unavailable, fall back to verified resort content; never guess.`;
