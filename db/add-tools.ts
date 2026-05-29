import { db } from "./index";
import { tools, categories, creatorTypes, toolCategories, toolCreatorTypes } from "./schema";
import { eq } from "drizzle-orm";
import pipelineData from "./pipeline/tools.json";

type PipelineTool = {
  name: string;
  slug: string;
  tagline: string;
  description: string;
  websiteUrl: string;
  affiliateUrl?: string;
  foundedYear?: number;
  pricingModel: string;
  startingPriceCents?: number;
  hasFreeOption: boolean;
  isOpenSource: boolean;
  categories: string[];
  creatorTypes: string[];
};

async function run() {
  const allCats = await db.select().from(categories);
  const allCTs  = await db.select().from(creatorTypes);

  for (const t of pipelineData as PipelineTool[]) {
    const existing = await db.select({ id: tools.id }).from(tools).where(eq(tools.slug, t.slug));
    if (existing.length) { console.log(`• skip (exists): ${t.slug}`); continue; }

    const [row] = await db.insert(tools).values({
      publishedAt: new Date(),
      name: t.name, slug: t.slug, tagline: t.tagline,
      description: t.description, websiteUrl: t.websiteUrl,
      affiliateUrl: t.affiliateUrl ?? null,
      foundedYear: t.foundedYear ?? null,
      pricingModel: t.pricingModel,
      startingPriceCents: t.startingPriceCents ?? null,
      hasFreeOption: t.hasFreeOption,
      isOpenSource: t.isOpenSource,
    }).returning({ id: tools.id });

    for (const slug of t.categories) {
      const cat = allCats.find(c => c.slug === slug);
      if (cat) await db.insert(toolCategories).values({ toolId: row.id, categoryId: cat.id });
      else console.log(`  ⚠ unknown category: ${slug}`);
    }
    for (const slug of t.creatorTypes) {
      const ct = allCTs.find(c => c.slug === slug);
      if (ct) await db.insert(toolCreatorTypes).values({ toolId: row.id, creatorTypeId: ct.id });
      else console.log(`  ⚠ unknown creator type: ${slug}`);
    }
    console.log(`✓ ${t.name}`);
  }
  console.log("\nDone.");
  process.exit(0);
}

run().catch(e => { console.error(e); process.exit(1); });
