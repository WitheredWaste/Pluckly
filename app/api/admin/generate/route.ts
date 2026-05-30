import { NextResponse } from "next/server";
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
No em-dashes. No exclamation marks. No "allows you to".
Never call a tool "the best" or "#1". Be honest in cons; real tools have real weaknesses.
`;

export async function POST(request: Request) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  const sentPassword = request.headers.get("x-admin-password");
  if (!adminPassword || sentPassword !== adminPassword) {
    return NextResponse.json({ error: "Wrong password." }, { status: 401 });
  }

  const body = await request.json();
  const { name, websiteUrl, roughPrice, hasFreeOption } = body;

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

  const userPrompt = `Write Pluckly content for this tool.

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
        max_tokens: 2000,
        system: VOICE_RULES,
        messages: [{ role: "user", content: userPrompt }],
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
      return NextResponse.json({ error: "Claude did not return clean JSON. Try Generate again." }, { status: 502 });
    }

    if (Array.isArray(parsed.suggestedCategories) && validSlugs.length) {
      parsed.suggestedCategories = parsed.suggestedCategories.filter((s: string) => validSlugs.includes(s));
    }

    const toLines = (v: unknown): string =>
      Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean).join("\n") : "";
    parsed.pros = toLines(parsed.pros);
    parsed.cons = toLines(parsed.cons);
    parsed.features = toLines(parsed.features);
    parsed.useCases = toLines(parsed.useCases);

    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: "Could not reach Claude." }, { status: 502 });
  }
}
