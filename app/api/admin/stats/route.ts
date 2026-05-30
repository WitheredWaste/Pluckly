import { NextResponse } from "next/server";
import { db } from "@/db/index";
import { tools, categories, toolCategories } from "@/db/schema";

type ToolStatRow = { publishedAt: Date | null; priceCheckedAt: Date | null };
type CatRow = { id: number; name: string; slug: string };
type LinkRow = { categoryId: number };

export async function POST(request: Request) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  const sentPassword = request.headers.get("x-admin-password");
  if (!adminPassword || sentPassword !== adminPassword) {
    return NextResponse.json({ error: "Wrong password." }, { status: 401 });
  }

  const allTools: ToolStatRow[] = await db
    .select({ publishedAt: tools.publishedAt, priceCheckedAt: tools.priceCheckedAt })
    .from(tools);

  const total = allTools.length;
  const published = allTools.filter((t: ToolStatRow) => !!t.publishedAt).length;
  const drafts = total - published;

  const now = Date.now();
  const stale = allTools.filter((t: ToolStatRow) => {
    if (!t.priceCheckedAt) return true;
    const days = (now - new Date(t.priceCheckedAt).getTime()) / (1000 * 60 * 60 * 24);
    return days >= 90;
  }).length;

  const allCats: CatRow[] = await db
    .select({ id: categories.id, name: categories.name, slug: categories.slug })
    .from(categories);
  const links: LinkRow[] = await db.select({ categoryId: toolCategories.categoryId }).from(toolCategories);

  const counts = new Map<number, number>();
  for (const l of links) {
    counts.set(l.categoryId, (counts.get(l.categoryId) || 0) + 1);
  }
  const byCategory = allCats
    .map((c: CatRow) => ({ name: c.name, slug: c.slug, count: counts.get(c.id) || 0 }))
    .sort((a, b) => a.count - b.count);

  return NextResponse.json({ total, published, drafts, stale, byCategory });
}
