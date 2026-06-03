import { NextResponse } from "next/server";
import { isAuthed } from "../_auth";
import { db } from "@/db/index";
import { tools, categories } from "@/db/schema";

type ContentBlock = { type: string; text?: string };

const VOICE_RULES = `
You are writing for Pluckly, a directory of tools for online creators.
Voice: direct, factual, present tense. Wirecutter meets Stratechery.
Forbidden words: leading, powerful, robust, seamless, cutting-edge, revolutionary, best-in-class.
No em-dashes. No exclamation marks. No "allows you to". Never call anything "the best" or "#1".
Be honest about tradeoffs and limitations. Write original analysis, never reword another source.
Articles should be useful enough that a reader landing directly is satisfied.
`;

async function callClaude(opts: { system: string; userPrompt: string; useSearch: boolean; maxTokens: number }) {
  const tools_arr = opts.useSearch
    ? [{ type: "web_search_20250305", name: "web_search", max_uses: 2 }]
    : undefined;
  const apiResponse = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY || "",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: opts.maxTokens,
      system: opts.system,
      messages: [{ role: "user", content: opts.userPrompt }],
      ...(tools_arr ? { tools: tools_arr } : {}),
    }),
  });
  const data = await apiResponse.json();
  return { ok: apiResponse.ok, data };
}

function extractText(data: { content?: ContentBlock[] }): string {
  return ((data.content || []) as ContentBlock[])
    .filter((b) => b.type === "text")
    .map((b) => b.text || "")
    .join("")
    .trim();
}

function parseJson(raw: string) {
  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const first = cleaned.indexOf("{");
    const last = cleaned.lastIndexOf("}");
    if (first !== -1 && last !== -1 && last > first) {
      return JSON.parse(cleaned.slice(first, last + 1));
    }
    throw new Error("No JSON object found in response.");
  }
}

export async function POST(request: Request) {
  if (!(await isAuthed(request))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad request data." }, { status: 400 });
  }

  const action = body?.action;

  let toolList: { slug: string; name: string }[] = [];
  let catList: { slug: string; name: string }[] = [];
  try {
    toolList = await db.select({ slug: tools.slug, name: tools.name }).from(tools);
    catList = await db.select({ slug: categories.slug, name: categories.name }).from(categories);
  } catch {
    toolList = [];
    catList = [];
  }
  const toolNames = toolList.map((t) => t.name).join(", ") || "none";
  const catNames = catList.map((c) => c.name).join(", ") || "none";

  // ACTION 1: suggest newsworthy topics, cross-referenced against coverage
  if (action === "suggest") {
    const userPrompt = `Research the most current, genuinely recent news in the online-creator tools space (tool launches, major updates, new AI models, pricing changes, platform shifts). Search reputable sources. Today is ${new Date().toISOString().slice(0, 10)}.

Pluckly already has tool pages for: ${toolNames}
Pluckly has these categories: ${catNames}

Suggest 5 article topics. For each, judge:
- recency: what is NEW and roughly when (only suggest things that are actually recent or rising in search interest).
- coverage: "fresh-news" if it is new developments about a tool/topic we already cover (good: the article links to our existing page), "partial" if the category fits but we lack the specific tools, "new-territory" if we cover neither.
IMPORTANT: A tool already being covered is a REASON to cover its news, not to skip it. Only treat a topic as redundant if the SPECIFIC evergreen angle would duplicate an existing page (e.g. another generic overview). New developments are always fair game.
- seoRationale: one short line on search/traffic potential.

Return ONLY a raw JSON object and nothing else. Do not write any text before or after it. Do not summarize your research. Begin immediately with an opening brace and end with a closing brace. Use exactly this shape:
{
  "topics": [
    { "title": "proposed article title", "recency": "what is new and when", "coverage": "fresh-news | partial | new-territory", "seoRationale": "one line" }
  ]
}`;

    try {
      const { ok, data } = await callClaude({ system: VOICE_RULES, userPrompt, useSearch: true, maxTokens: 1500 });
      if (!ok) {
        const msg = (data && data.error && data.error.message) || "Claude API error.";
        return NextResponse.json({ error: msg }, { status: 502 });
      }
      const parsed = parseJson(extractText(data));
      const topics = Array.isArray(parsed.topics) ? parsed.topics : [];
      return NextResponse.json({ topics });
    } catch (e) {
      return NextResponse.json({ error: "Suggest failed: " + (e instanceof Error ? e.message : String(e)) }, { status: 502 });
    }
  }

  // ACTION 2: write a full article from a chosen topic or a user brief
  if (action === "write") {
    const topic = typeof body.topic === "string" ? body.topic.trim() : "";
    const useSearch = body.useSearch !== false; // default true; mode 2 can pass false
    if (!topic) {
      return NextResponse.json({ error: "A topic or brief is required." }, { status: 400 });
    }

    const userPrompt = `Write a Pluckly article on this topic/brief:
"${topic}"

${useSearch ? `Research current facts from reputable sources first. Today is ${new Date().toISOString().slice(0, 10)}.` : ""}

Pluckly has tool pages for these tools (use the EXACT names; suggest internal links only to tools in this list): ${toolNames}

Write a magazine-quality, SEO-strong article. Structure: an engaging title, a one-sentence subtitle, a short excerpt (1-2 sentences for listings), a meta description (<=155 chars), and a body in clean Markdown with H2 subheadings and short scannable paragraphs. Open with a direct answer to the core question before the detail. Where you mention a tool we cover, note it so we can link it.

Return ONLY a JSON object, no markdown fences, in exactly this shape:
{
  "title": "...",
  "subtitle": "...",
  "excerpt": "...",
  "metaDescription": "...",
  "suggestedSlug": "lowercase-hyphenated-title",
  "body": "full article in Markdown",
  "relatedToolSlugs": ["slug-of-tool-we-cover-and-mention"]
}`;

    try {
      const { ok, data } = await callClaude({ system: VOICE_RULES, userPrompt, useSearch, maxTokens: 5000 });
      if (!ok) {
        const msg = (data && data.error && data.error.message) || "Claude API error.";
        return NextResponse.json({ error: msg }, { status: 502 });
      }
      const parsed = parseJson(extractText(data));
      const validToolSlugs = new Set(toolList.map((t) => t.slug));
      if (Array.isArray(parsed.relatedToolSlugs)) {
        parsed.relatedToolSlugs = parsed.relatedToolSlugs.filter((s: string) => validToolSlugs.has(s));
      } else {
        parsed.relatedToolSlugs = [];
      }
      return NextResponse.json(parsed);
    } catch {
      return NextResponse.json({ error: "Could not generate the article. Try again." }, { status: 502 });
    }
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
