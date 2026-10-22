import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import * as z from "zod/v4";
import { NextRequest, NextResponse } from "next/server";
import { postedTitles, existingIdeas, lanePerformance, saveIdeas } from "../../../lib/db";
import { systemPrompt } from "../../../lib/brain";
import { judge, type Corpus } from "../../../lib/dedupe";

export const runtime = "nodejs";
export const maxDuration = 300;

const IdeaSchema = z.object({
  title: z.string().describe("The video topic, as Brandon would say it out loud"),
  format: z
    .enum([
      "ranking",
      "rapid_fire",
      "green_red_flag",
      "qa",
      "explainer",
      "this_or_that",
      "overrated_underrated",
      "insider_numbers",
      "story",
    ])
    .describe("Which proven format this uses"),
  lane: z
    .enum(["broad_money", "re_ranking", "green_red", "owner_education", "rapport", "tax"])
    .describe("Audience lane, which sets the realistic view ceiling"),
  bullets: z
    .array(z.string())
    .min(4)
    .max(9)
    .describe(
      "The items to run through, ordered by broad appeal then contrarian potential. The first is the cold open."
    ),
  why: z.string().describe("One sentence on why this one earns a slot"),
});

const ResponseSchema = z.object({ ideas: z.array(IdeaSchema) });

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

  const { count = 10, lane, format, brief } = await req.json().catch(() => ({}));
  const asked = Math.min(Math.max(Number(count) || 10, 1), 30);

  // Ask for extra, because the dedupe pass will drop some.
  const target = Math.ceil(asked * 1.6);

  const posted = postedTitles();
  const existing = existingIdeas();
  const top = lanePerformance();

  const system = systemPrompt({
    postedTitles: posted,
    ideaTitles: existing.map((i) => i.title),
    topPerformers: top,
  });

  const ask = [
    `Give me ${target} new video ideas.`,
    lane ? `Lane: ${lane}.` : "Mix the lanes, weighted toward the ones that reach.",
    format ? `Format: ${format}.` : "Vary the formats.",
    brief ? `What I'm after: ${brief}` : "",
    `Each one needs 4 to 9 bullets. The first bullet is the cold open, so make it the most arguable item.`,
  ]
    .filter(Boolean)
    .join(" ");

  const client = new Anthropic();

  const response = await client.messages.parse({
    model: "claude-opus-5-5",
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    // The corpus is identical between requests, so cache it: repeat generations
    // read the cached prefix at a fraction of the input price.
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: ask }],
    output_config: { format: zodOutputFormat(ResponseSchema) },
  });

  const parsed = response.parsed_output;
  if (!parsed) {
    return NextResponse.json(
      { error: "The model returned something that did not match the schema." },
      { status: 502 }
    );
  }

  // Build the corpus once, then judge every idea against it.
  const corpus: Corpus = [
    ...posted.map((t) => ({ label: t, text: t, kind: "posted" as const })),
    ...existing.map((i) => ({
      label: i.title,
      text: `${i.title} ${i.body ?? ""}`,
      kind: "idea" as const,
    })),
  ];

  const kept: any[] = [];
  const dropped: any[] = [];

  for (const idea of parsed.ideas) {
    const verdict = judge(
      { title: idea.title, body: idea.bullets.join(" ") },
      corpus
    );
    const row = { ...idea, verdict };
    if (verdict.keep && kept.length < asked) kept.push(row);
    else dropped.push(row);
  }

  const batch = `generated ${new Date().toISOString().slice(0, 10)}`;
  saveIdeas(
    kept.map((k) => ({
      title: k.title,
      format: k.format,
      lane: k.lane,
      body: k.bullets.map((b: string) => `- ${b}`).join("\n") + `\n\nWhy: ${k.why}`,
    })),
    batch
  );

  return NextResponse.json({
    batch,
    asked,
    generated: parsed.ideas.length,
    kept,
    dropped,
    checkedAgainst: { posted: posted.length, backlog: existing.length },
    usage: {
      input: response.usage.input_tokens,
      cached: response.usage.cache_read_input_tokens ?? 0,
      output: response.usage.output_tokens,
    },
  });
}
