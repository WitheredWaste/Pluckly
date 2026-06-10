import { NextResponse } from "next/server";
import { isAuthed } from "../_auth";
import { db } from "@/db/index";
import { categories } from "@/db/schema";

type ContentBlock = { type: string; text?: string };

const VOICE_RULES = `
You are writing for Pluckly, a directory of tools for online creators.
Voice: direct, factual, present tense, Wirecutter meets Stratechery.
- Tagline: 6-10 words, declarative.
- Description: 2-4 sentences, 50-90 words. Cover what it does, who uses it, and one honest observation.
- Pros, cons, features, useCases: each is a list. Each item is a short phrase or one sentence, no leading bullet characters.
Forbidden words: leading, powerful, robust, seamless, cutting-edge, revolutionary, best-in-class.
Never use em-dashes or en-dashes (the long dash characters). Use commas, colons, or separate sentences instead. This applies even when source material uses them. No exclamation marks. No "allows you to".
Never call a tool "the best" or "#1". Be honest in cons; real tools have real weaknesses.
- FAQs: write 4-6 question-and-answer pairs a real buyer would search. Mix pricing, free tier, alternatives, who it suits, and one honest limitation. Questions natural and specific to this tool (use its name). Answers 1-3 sentences, factual, same voice. No "allows you to", no em-dashes, no exclamation marks.
`;

export const maxDuration = 60;

export async function POST(request: Request) {
  if (!(await isAuthed(request))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json();
  const { name, websiteUrl, roughPrice, hasFreeOption, useSearch } = body;

  if (!name) {
    return NextResponse.json({ error: "Tool name is required." }, { status: 400 });
  }

  let validSlugs: string[] = [];
  try {
    const rows = await db.select({ slug: categories.slug }).from(categories);
    validSlugs = rows.map((r: { slug: string }) => r.slug);
  } catch {
    validSlugs = [];
  }

  const searchNote = useSearch
    ? `First, search the web for the current official pricing and latest features of this tool (today is ${new Date().toISOString().slice(0, 10)}). Prioritise the official product site over third-party sources. If pricing is unclear, say so in priceNote rather than guessing.\n\n`
    : "";
  const userPrompt = searchNote + `Write Pluckly content for this tool.

Tool name: ${name}
Website: ${websiteUrl || "unknown"}
Rough price the user provided: ${roughPrice || "unknown"}
Has a free option: ${hasFreeOption ? "yes" : "no"}

Choose the most relevant categories for this tool from EXACTLY this list of valid slugs (do not invent new ones):
${validSlugs.join(", ") || "none available"}

For pros, cons, features, and useCases: provide up to 6-8 items each where genuinely useful (fewer is fine if padding would be filler). Each item a short phrase or single sentence.

Return ONLY a JSON object, no other text, no markdown fences, in exactly this shape:
{
  "tagline": "...",
  "description": "...",
  "suggestedSlug": "lowercase-hyphenated-version-of-name",
  "suggestedCategories": ["slug-one", "slug-two"],
  "suggestedPricingModel": "one of: freemium, subscription, free, one-time, paid",
  "suggestedCurrency": "one of: USD, EUR, GBP (the currency this tool actually prices in)",
  "pros": ["...", "..."],
  "cons": ["...", "..."],
  "features": ["...", "..."],
  "useCases": ["...", "..."],
  "faqs": [{ "q": "question text", "a": "answer text" }],
  "priceNote": "A short reminder of what price figure to verify before publishing."
}`;

  try {
    const apiResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY || "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: useSearch ? 3800 : 3000,
        system: VOICE_RULES,
        messages: [{ role: "user", content: userPrompt }],
        ...(useSearch ? { tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 2 }] } : {}),
      }),
    });

    const data = await apiResponse.json();

    if (!apiResponse.ok) {
      const msg = (data && data.error && data.error.message) || "Claude API error.";
      return NextResponse.json({ error: msg }, { status: 502 });
    }

    const rawText = ((data.content || []) as ContentBlock[])
      .filter((b: ContentBlock) => b.type === "text")
      .map((b: ContentBlock) => b.text || "")
      .join("")
      .trim();

    const cleaned = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const first = cleaned.indexOf("{");
      const last = cleaned.lastIndexOf("}");
      if (first !== -1 && last !== -1 && last > first) {
        try { parsed = JSON.parse(cleaned.slice(first, last + 1)); }
        catch { return NextResponse.json({ error: "Claude did not return clean JSON. Try Generate again." }, { status: 502 }); }
      } else {
        return NextResponse.json({ error: "Claude did not return clean JSON. Try Generate again." }, { status: 502 });
      }
    }

    if (Array.isArray(parsed.suggestedCategories) && validSlugs.length) {
      parsed.suggestedCategories = parsed.suggestedCategories.filter((s: string) => validSlugs.includes(s));
    }

    const stripDashes = (v: string): string =>
      v
        .replace(/\s+[\u2014\u2013]\s+/g, ", ")
        .replace(/[\u2014\u2013]/g, "-");

    const toLines = (v: unknown): string =>
      Array.isArray(v) ? v.map((x) => stripDashes(String(x).trim())).filter(Boolean).join("\n") : "";
    if (typeof parsed.tagline === "string") parsed.tagline = stripDashes(parsed.tagline);
    if (typeof parsed.description === "string") parsed.description = stripDashes(parsed.description);
    parsed.pros = toLines(parsed.pros);
    parsed.cons = toLines(parsed.cons);
    parsed.features = toLines(parsed.features);
    parsed.useCases = toLines(parsed.useCases);
    parsed.faqs = Array.isArray(parsed.faqs)
      ? JSON.stringify(
          parsed.faqs
            .filter((f: { q?: string; a?: string }) => f && f.q && f.a)
            .map((f: { q: string; a: string }) => ({ q: stripDashes(String(f.q).trim()), a: stripDashes(String(f.a).trim()) }))
        )
      : "";

    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: "Could not reach Claude." }, { status: 502 });
  }
}
