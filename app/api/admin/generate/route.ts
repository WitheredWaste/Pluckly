import { NextResponse } from "next/server";

const VOICE_RULES = `
You are writing for Pluckly, a directory of tools for online creators.
Voice: direct, factual, present tense, Wirecutter meets Stratechery.
- Tagline: 6-10 words, declarative.
- Description: 2-4 sentences, 50-90 words. Cover what it does, who uses it, and one honest observation.
Forbidden words: leading, powerful, robust, seamless, cutting-edge, revolutionary, best-in-class.
No em-dashes. No exclamation marks. No "allows you to".
Never call a tool "the best" or "#1".
`;

export async function POST(request: Request) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  const sentPassword = request.headers.get("x-admin-password");
  if (!adminPassword || sentPassword !== adminPassword) {
    return NextResponse.json({ error: "Wrong password." }, { status: 401 });
  }

  const body = await request.json();
  const { name, websiteUrl, roughPrice, hasFreeOption, categories } = body;

  if (!name) {
    return NextResponse.json({ error: "Tool name is required." }, { status: 400 });
  }

  const userPrompt = `Write Pluckly content for this tool.

Tool name: ${name}
Website: ${websiteUrl || "unknown"}
Rough price the user provided: ${roughPrice || "unknown"}
Has a free option: ${hasFreeOption ? "yes" : "no"}
Categories it fits: ${(categories || []).join(", ") || "unknown"}

Return ONLY a JSON object, no other text, no markdown fences, in exactly this shape:
{
  "tagline": "...",
  "description": "...",
  "suggestedSlug": "lowercase-hyphenated-version-of-name",
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
        max_tokens: 1000,
        system: VOICE_RULES,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });

    const data = await apiResponse.json();

    if (!apiResponse.ok) {
      const msg = data?.error?.message || "Claude API error.";
      return NextResponse.json({ error: msg }, { status: 502 });
    }

    const rawText = (data.content || [])
      .filter((b: { type: string }) => b.type === "text")
      .map((b: { text: string }) => b.text)
      .join("")
      .trim();

    const cleaned = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: "Claude did not return clean JSON. Try Generate again." },
        { status: 502 }
      );
    }

    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({ error: "Could not reach Claude." }, { status: 502 });
  }
}
