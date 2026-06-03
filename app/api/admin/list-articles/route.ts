import { NextResponse } from "next/server";
import { isAuthed } from "../_auth";
import { db } from "@/db/index";
import { articles } from "@/db/schema";
import { desc } from "drizzle-orm";

export async function POST(request: Request) {
  if (!(await isAuthed(request))) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  try {
    const rows = await db
      .select({
        slug: articles.slug,
        title: articles.title,
        publishedAt: articles.publishedAt,
        updatedAt: articles.updatedAt,
      })
      .from(articles)
      .orderBy(desc(articles.updatedAt));
    return NextResponse.json({ articles: rows });
  } catch {
    return NextResponse.json({ error: "Could not load articles." }, { status: 500 });
  }
}
