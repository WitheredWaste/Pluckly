import { NextResponse } from "next/server";

type ContentBlock = { type: string; text?: string };

const VOICE_RULES = `
You are writing FAQs for Pluckly, a directory of tools for online creators.
Voice: direct, factual, present tense, Wirecutter meets Stratechery.
Write 4-6 question-and-answer pairs a real buyer would search.
Mix: pricing, free tier, alternatives, who it suits, and one honest limitation.
Questions natural and specific to the tool (use its name).
Answers 1-3 sentences, factual, same voice.
Forbidden words: leading, powerful, robust, seamless, cutting-edge, revolutionary, best-in-class.
No em-dashes. No exclamation marks. No "allows you to". Never call a tool "the best" or "#1".
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

  const userPrompt = `Write Pluckly FAQs for this tool.

Tool name: ${name}
Website: ${websiteUrl || "unknown"}
Rough price the user provided: ${roughPrice || "unknown"}
Has a free option: ${hasFreeOption ? "yes" : "no"}

Return ONLY a JSON object, no other text, no markdown fences, in exactly this shape:
{
  "faqs": [{ "q": "question text", "a": "answer text" }]
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
      return NextResponse.json({ error: "Claude did not return clean JSON. Try again." }, { status: 502 });
    }

    const faqsArr = Array.isArray(parsed.faqs) ? parsed.faqs : [];
    const faqs = JSON.stringify(
      faqsArr
        .filter((f: { q?: string; a?: string }) => f && f.q && f.a)
        .map((f: { q?: string; a?: string }) => ({ q: String(f.q).trim(), a: String(f.a).trim() }))
    );

    return NextResponse.json({ faqs });
  } catch {
    return NextResponse.json({ error: "Could not reach Claude." }, { status: 502 });
  }
}
