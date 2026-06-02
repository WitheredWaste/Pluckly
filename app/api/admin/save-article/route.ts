import { NextResponse } from "next/server";
import { isAuthed } from "../_auth";
import { db } from "@/db/index";
import { articles } from "@/db/schema";
import { eq } from "drizzle-orm";

function cleanText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.trim();
  return t === "" ? null : t;
}

function slugify(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function listToCsv(value: unknown): string | null {
  if (Array.isArray(value)) {
    const items = value.map((x) => String(x).trim()).filter(Boolean);
    return items.length ? items.join(",") : null;
  }
  if (typeof value === "string") {
    const items = value.split(",").map((x) => x.trim()).filter(Boolean);
    return items.length ? items.join(",") : null;
  }
  return null;
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

  const title = cleanText(body?.title);
  const slug = slugify(body?.slug || body?.title);
  if (!title || !slug) {
    return NextResponse.json({ error: "Title is required." }, { status: 400 });
  }

  const { mode } = body;

  const fields = {
    title,
    subtitle: cleanText(body?.subtitle),
    excerpt: cleanText(body?.excerpt),
    metaDescription: cleanText(body?.metaDescription),
    body: cleanText(body?.body),
    heroImageUrl: cleanText(body?.heroImageUrl),
    relatedToolSlugs: listToCsv(body?.relatedToolSlugs),
    relatedArticleSlugs: listToCsv(body?.relatedArticleSlugs),
    generationMode: cleanText(body?.generationMode),
  };

  try {
    const existing = await db.select({ id: articles.id }).from(articles).where(eq(articles.slug, slug));

    if (existing.length) {
      await db.update(articles).set({
        ...fields,
        ...(mode === "publish" ? { publishedAt: new Date() } : {}),
        updatedAt: new Date(),
      }).where(eq(articles.id, existing[0].id));
      return NextResponse.json({ ok: true, mode, slug, wasUpdate: true });
    }

    await db.insert(articles).values({
      slug,
      ...fields,
      publishedAt: mode === "publish" ? new Date() : null,
    });
    return NextResponse.json({ ok: true, mode, slug, wasUpdate: false });
  } catch {
    return NextResponse.json({ error: "Could not save the article. Try again." }, { status: 500 });
  }
}
