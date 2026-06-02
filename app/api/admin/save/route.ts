import { NextResponse } from "next/server";
import { isAuthed } from "../_auth";
import { db } from "@/db/index";
import { tools, categories, toolCategories } from "@/db/schema";
import { eq } from "drizzle-orm";

type CategoryRow = { id: number; slug: string };

function toCentsFromDollars(value: unknown): number | null {
  if (value === "" || value == null) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

const ALLOWED_CURRENCIES = ["USD", "EUR", "GBP"];
const ALLOWED_PRICING = ["freemium", "subscription", "free", "one-time", "paid"];

function cleanEnum(value: unknown, allowed: string[], fallback: string | null): string | null {
  if (typeof value === "string" && allowed.includes(value)) return value;
  return fallback;
}

function cleanText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t === "" ? null : t;
}

function faqsTextToJson(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (text === "") return null;
  const blocks = text.split(/\n\s*\n/);
  const pairs: { q: string; a: string }[] = [];
  for (const block of blocks) {
    const lines = block.split("\n");
    let q = "";
    let a = "";
    for (const line of lines) {
      const qm = line.match(/^\s*Q:\s*(.*)$/i);
      const am = line.match(/^\s*A:\s*(.*)$/i);
      if (qm) q = qm[1].trim();
      else if (am) a = am[1].trim();
      else if (a) a += " " + line.trim();
      else if (q) q += " " + line.trim();
    }
    if (q && a) pairs.push({ q, a });
  }
  return pairs.length ? JSON.stringify(pairs) : null;
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

  const { name, slug, tagline, description, websiteUrl, logoUrl, affiliateUrl, startingPriceDollars, hasFreeOption, categorySlugs, mode, pros, cons, features, useCases, faqs, pricingModel, currency } = body;

  if (!name || !slug) {
    return NextResponse.json({ error: "Name and slug are required." }, { status: 400 });
  }

  try {
    const existing = await db.select({ id: tools.id }).from(tools).where(eq(tools.slug, slug));
    let toolId: number;
    let wasUpdate = false;
    const fields = {
      name,
      tagline: cleanText(tagline),
      description: cleanText(description),
      websiteUrl: cleanText(websiteUrl),
      affiliateUrl: cleanText(affiliateUrl),
      logoUrl: cleanText(logoUrl),
      startingPriceCents: toCentsFromDollars(startingPriceDollars),
      pricingModel: cleanEnum(pricingModel, ALLOWED_PRICING, null),
      currency: cleanEnum(currency, ALLOWED_CURRENCIES, "USD"),
      hasFreeTier: !!hasFreeOption,
      pros: cleanText(pros),
      cons: cleanText(cons),
      features: cleanText(features),
      useCases: cleanText(useCases),
      faqs: faqsTextToJson(faqs),
      priceCheckedAt: new Date(),
    };

    if (existing.length) {
      toolId = existing[0].id;
      wasUpdate = true;
      await db.update(tools).set({
        ...fields,
        ...(mode === "publish" ? { publishedAt: new Date() } : {}),
        updatedAt: new Date(),
      }).where(eq(tools.id, toolId));
      await db.delete(toolCategories).where(eq(toolCategories.toolId, toolId));
    } else {
      const [row] = await db.insert(tools).values({
        slug,
        ...fields,
        publishedAt: mode === "publish" ? new Date() : null,
      }).returning({ id: tools.id });
      toolId = row.id;
    }

    const allCats: CategoryRow[] = await db.select().from(categories);
    const unknown: string[] = [];
    for (const cslug of (categorySlugs || []) as string[]) {
      const cat = allCats.find((c: CategoryRow) => c.slug === cslug);
      if (cat) {
        await db.insert(toolCategories).values({ toolId, categoryId: cat.id });
      } else {
        unknown.push(cslug);
      }
    }

    return NextResponse.json({ ok: true, mode, slug, wasUpdate, unknownCategories: unknown });
  } catch {
    return NextResponse.json({ error: "Could not save to the database. Try again." }, { status: 500 });
  }
}
