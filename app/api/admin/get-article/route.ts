import { NextResponse } from "next/server";
import { isAuthed } from "../_auth";
import { db } from "@/db/index";
import { articles } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  if (!(await isAuthed(request))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad request." }, { status: 400 });
  }
  const slug = typeof body?.slug === "string" ? body.slug : "";
  if (!slug) {
    return NextResponse.json({ error: "Slug required." }, { status: 400 });
  }
  const [a] = await db.select().from(articles).where(eq(articles.slug, slug)).limit(1);
  if (!a) {
    return NextResponse.json({ error: "Article not found." }, { status: 404 });
  }
  return NextResponse.json({
    article: {
      title: a.title || "",
      subtitle: a.subtitle || "",
      excerpt: a.excerpt || "",
      metaDescription: a.metaDescription || "",
      slug: a.slug,
      body: a.body || "",
      relatedToolSlugs: a.relatedToolSlugs || "",
      isPublished: !!a.publishedAt,
    },
  });
}
