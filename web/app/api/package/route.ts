import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import * as z from "zod/v4";
import { NextRequest, NextResponse } from "next/server";
import {
  checkTranscript,
  suiteSystem,
  fullDescription,
  saveSuite,
  type Suite,
} from "../../../lib/suite";

export const runtime = "nodejs";
export const maxDuration = 300;

const SuiteSchema = z.object({
  title: z.string().describe("Working title for the library record"),
  slug: z
    .string()
    .describe("kebab-case filename slug, short, from the working title"),
  format: z
    .string()
    .describe("e.g. single-point explainer, ranking, call footage, story"),
  lane: z.enum([
    "broad_money",
    "re_ranking",
    "green_red",
    "owner_education",
    "rapport",
    "tax",
    "behind_the_business",
  ]),
  argument: z
    .array(z.string())
    .min(3)
    .max(8)
    .describe("What the clip actually says, bullet by bullet"),
  ytTitles: z.array(z.string()).min(7).max(7),
  bestTitle: z.string().describe("Must be one of ytTitles, verbatim"),
  bestTitleWhy: z.string().describe("One sentence"),
  ytDescription: z
    .string()
    .describe(
      "2-4 plain paragraphs in Brandon's voice, ending with the exact subscribe line. Nothing after it."
    ),
  igCaptions: z.array(z.string()).min(4).max(5),
  bestCaption: z.string().describe("Must be one of igCaptions, verbatim"),
  bestCaptionWhy: z.string(),
  xPosts: z.array(z.string()).min(8).max(8),
  bestPost: z.string().describe("Must be one of xPosts, verbatim"),
  bestPostWhy: z.string(),
  coldOpen: z
    .string()
    .describe("The exact moment or line the clip should open on, and why"),
  editNotes: z
    .array(z.string())
    .min(1)
    .describe("Garbles to fix, names to bleep, caveats, sequencing"),
});

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      {
        error:
          "No API key. Add ANTHROPIC_API_KEY to web/.env.local, then restart the dev server.",
      },
      { status: 503 }
    );
  }

  const { transcript = "", note = "", force = false } = await req
    .json()
    .catch(() => ({}));

  const text = String(transcript).trim();
  if (text.split(/\s+/).length < 30) {
    return NextResponse.json(
      { error: "That's too short to be a clip transcript. Paste the whole thing." },
      { status: 400 }
    );
  }

  // The repeat check runs before any tokens are spent. A same-clip hit stops
  // the run unless Roger explicitly overrides (reposts are sometimes deliberate).
  const matches = checkTranscript(text);
  const blocking = matches.filter((m) => m.verdict === "same clip");
  if (blocking.length && !force) {
    return NextResponse.json({ blocked: true, matches }, { status: 409 });
  }

  const client = new Anthropic();
  const ask = [
    `Here is the transcript of a clip Brandon filmed. Build the full posting package.`,
    note ? `Context from Roger: ${note}` : "",
    matches.length
      ? `Heads up, the repeat checker found overlap with: ${matches
          .map((m) => `"${m.label}" (${m.score})`)
          .join(", ")}. Package THIS clip, but differentiate titles and captions from those.`
      : "",
    `\n---\n${text}`,
  ]
    .filter(Boolean)
    .join("\n");

  const response = await client.messages.parse({
    model: "claude-opus-5-5",
    max_tokens: 12000,
    thinking: { type: "adaptive" },
    // One stable block, cached across packaging runs; the transcript rides in
    // the user message so it never busts the cache.
    system: [
      { type: "text", text: suiteSystem(), cache_control: { type: "ephemeral" } },
    ],
    messages: [{ role: "user", content: ask }],
    output_config: { format: zodOutputFormat(SuiteSchema) },
  });

  const suite = response.parsed_output as Suite | null;
  if (!suite) {
    return NextResponse.json(
      { error: "The model returned something that did not match the schema." },
      { status: 502 }
    );
  }

  const saved = saveSuite(suite, text);

  return NextResponse.json({
    suite,
    description: fullDescription(suite),
    saved,
    matches,
    usage: {
      input: response.usage.input_tokens,
      cached: response.usage.cache_read_input_tokens ?? 0,
      output: response.usage.output_tokens,
    },
  });
}
