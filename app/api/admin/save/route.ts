import { NextResponse } from "next/server";
import { db } from "@/db/index";
import { tools, categories, toolCategories } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  const sentPassword = request.headers.get("x-admin-password");
  if (!adminPassword || sentPassword !== adminPassword) {
    return NextResponse.json({ error: "Wrong password." }, { status: 401 });
  }

  const body = await request.json();
  const {
    name,
    slug,
    tagline,
    description,
    websiteUrl,
    startingPriceCents,
    hasFreeOption,
    categorySlugs,
    mode,
  } = body;

  if (!name || !slug) {
    return NextResponse.json({ error: "Name and slug are required." }, { status: 400 });
  }

  const existing = await db.select({ id: tools.id }).from(tools).where(eq(tools.slug, slug));
  if (existing.length) {
    return NextResponse.json(
      { error: `A tool with slug "${slug}" already exists.` },
      { status: 409 }
    );
  }

  const [row] = await db
    .insert(tools)
    .values({
      name,
      slug,
      tagline: tagline || null,
      description: description || null,
      websiteUrl: websiteUrl || null,
      startingPriceCents:
        startingPriceCents === "" || startingPriceCents == null
          ? null
          : Number(startingPriceCents),
      hasFreeTier: !!hasFreeOption,
      publishedAt: mode === "publish" ? new Date() : null,
      priceCheckedAt: new Date(),
    })
    .returning({ id: tools.id });

  const allCats = await db.select().from(categories);
  const unknown: string[] = [];
  for (const cslug of categorySlugs || []) {
    const cat = allCats.find((c) => c.slug === cslug);
    if (cat) {
      await db.insert(toolCategories).values({ toolId: row.id, categoryId: cat.id });
    } else {
      unknown.push(cslug);
    }
  }

  return NextResponse.json({
    ok: true,
    mode,
    slug,
    unknownCategories: unknown,
  });
}
