import fs from "fs";
import path from "path";

/**
 * The second brain, assembled for the model.
 *
 * The markdown files stay the source of truth for voice and strategy. This reads
 * them at request time so editing voice-guide.md changes the app's behavior with
 * no deploy.
 */

const ROOT = path.join(process.cwd(), "..");

function read(rel: string): string {
  try {
    return fs.readFileSync(path.join(ROOT, rel), "utf8");
  } catch {
    return "";
  }
}

export function voiceGuide() {
  return read("second-brain/voice-guide.md");
}

export function playbook() {
  return read("second-brain/data/performance-playbook.md");
}

/** The rules Roger set. These are not negotiable and they go in every request. */
export const IDEATION_RULES = `
HOW TO PROPOSE IDEAS

- Topics and bullet points only. Never write a script. Brandon riffs; a script makes him read.
- Order the bullets by broad appeal first and contrarian potential second.
- The FIRST bullet doubles as the video's cold open, so it must be the most arguable item.
- Give him room for opinions people will naturally disagree with. Never manufacture controversy.
- Items must be recognizable to someone outside commercial real estate wherever possible.
  Tenant rankings using brands everyone knows did 274K, 268K and 200K views.
  The same format using industry terms did 2-3K. This is the single biggest driver of reach.
- North star is raw reach. Judge an idea on whether people will watch and argue, not on leads.

LANE CEILINGS, measured on 259 posted videos
- Broad money and career rankings: 27K to 1.9M. The only lane that produces millions.
- Real estate rankings with recognizable items: 10K to 275K.
- Green flag / red flag: 11K to 17K. Reliable, capped.
- Owner education and niche CRE: 1.4K to 3.5K. Useful for clients, never for reach.

SATURATED - do not propose more of these without a genuinely new mechanism
- Tenant retention (7+ videos, all 1.4K-3.3K)
- "Old school CRE marketing doesn't work" (10 videos, all 2.6K-3.3K)
- Broker accountability and overpromising (9 videos)
- Vacancy causes (6 videos)
- Passive income myths (5 videos)

WHAT IS WORKING AND UNDERUSED
- Insider numbers. Real figures nobody else will publish. One clip walked a building from
  $9M to $3.2M over twelve years using real operating statements. That is the template.
- Recognizable brands and places: Dollar General, gas stations, Chick-fil-A, Buc-ee's.
- Verdicts that cost him something. He rates real estate a 3 for the next 20 years while
  selling real estate. That is why his grades read as analysis instead of salesmanship.
`.trim();

export type GenerateContext = {
  postedTitles: string[];
  ideaTitles: string[];
  topPerformers: { title: string; views: number }[];
};

/**
 * The prompt is split in two so caching survives between runs.
 * The stable half (voice, rules, posted titles) only changes when the sheet
 * syncs. The volatile half (the backlog) changes on every generation, because
 * each run saves its accepted ideas back - so it lives outside the cache
 * breakpoint instead of invalidating it.
 */
export function stableSystem(ctx: GenerateContext): string {
  const posted = ctx.postedTitles.map((t) => `- ${t}`).join("\n");
  const top = ctx.topPerformers
    .map((p) => `- ${p.title}: ${p.views.toLocaleString()} views`)
    .join("\n");

  return `You generate video ideas for Brandon Avedikian, a Houston commercial real estate
broker and founder of Aspire Commercial. You know his voice, his data, and everything
he has already made.

${IDEATION_RULES}

HIS VOICE
${voiceGuide()}

TOP PERFORMERS, for pattern matching
${top}

ALREADY POSTED - ${ctx.postedTitles.length} videos. Never propose any of these again,
and never propose a near-variant of one.
${posted}`;
}

export function volatileSystem(ctx: GenerateContext): string {
  const ideas = ctx.ideaTitles.map((t) => `- ${t}`).join("\n");
  return `ALREADY IN THE BACKLOG - ${ctx.ideaTitles.length} ideas, filmed or planned.
Never propose any of these or a near-variant either.
${ideas}

Every idea you return must be genuinely absent from both lists. If you are unsure
whether something is a repeat, it is - propose something else instead.`;
}
