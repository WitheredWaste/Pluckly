import { NextResponse } from "next/server";
import { db } from "@/db/index";
import { tools, categories, toolCategories } from "@/db/schema";
import { eq } from "drizzle-orm";

type CatRow = { id: number; slug: string };

export async function POST(request: Request) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  const sentPassword = request.headers.get("x-admin-password");
  if (!adminPassword || sentPassword !== adminPassword) {
    return NextResponse.json({ error: "Wrong password." }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Bad request data." }, { status: 400 });
  }

  const { slug } = body;
  if (!slug) {
    return NextResponse.json({ error: "Slug is required." }, { status: 400 });
  }

  const [tool] = await db.select().from(tools).where(eq(tools.slug, slug));
  if (!tool) {
    return NextResponse.json({ error: "Tool not found." }, { status: 404 });
  }

  const links = await db
    .select({ categoryId: toolCategories.categoryId })
    .from(toolCategories)
    .where(eq(toolCategories.toolId, tool.id));
  const allCats: CatRow[] = await db.select({ id: categories.id, slug: categories.slug }).from(categories);
  const linkedIds = new Set(links.map((l: { categoryId: number }) => l.categoryId));
  const catSlugs = allCats.filter((c: CatRow) => linkedIds.has(c.id)).map((c: CatRow) => c.slug);

  return NextResponse.json({
    tool: {
      name: tool.name,
      slug: tool.slug,
      tagline: tool.tagline || "",
      description: tool.description || "",
      websiteUrl: tool.websiteUrl || "",
      logoUrl: tool.logoUrl || "",
      startingPriceDollars: tool.startingPriceCents == null ? "" : String(tool.startingPriceCents / 100),
      pricingModel: tool.pricingModel || "",
      currency: tool.currency || "USD",
      hasFreeOption: !!tool.hasFreeTier,
      categories: catSlugs.join(", "),
      pros: tool.pros || "",
      cons: tool.cons || "",
      features: tool.features || "",
      useCases: tool.useCases || "",
      isPublished: !!tool.publishedAt,
    },
  });
}
