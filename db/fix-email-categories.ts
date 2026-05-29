import { db } from "./index";
import { tools, categories, toolCategories } from "./schema";
import { eq, and } from "drizzle-orm";

// One-time fix: move ConvertKit + Beehiiv from "hosting" to "email-marketing".
// Safe to re-run.
// Run: npx tsx --env-file .env.local db/fix-email-categories.ts
const TOOL_SLUGS = ["convertkit", "beehiiv"];
const FROM_CATEGORY = "hosting";
const TO_CATEGORY = "email-marketing";

async function run() {
  const [fromCat] = await db.select().from(categories).where(eq(categories.slug, FROM_CATEGORY));
  const [toCat] = await db.select().from(categories).where(eq(categories.slug, TO_CATEGORY));

  if (!toCat) {
    console.log(`⚠ category "${TO_CATEGORY}" not found — run db:add-categories first.`);
    process.exit(1);
  }

  for (const slug of TOOL_SLUGS) {
    const [tool] = await db.select().from(tools).where(eq(tools.slug, slug));
    if (!tool) {
      console.log(`• skip (tool not found): ${slug}`);
      continue;
    }

    // Remove the old "hosting" link, if present.
    if (fromCat) {
      await db.delete(toolCategories).where(
        and(eq(toolCategories.toolId, tool.id), eq(toolCategories.categoryId, fromCat.id))
      );
    }

    // Add the new "email-marketing" link, only if it isn't already there.
    const existing = await db.select().from(toolCategories).where(
      and(eq(toolCategories.toolId, tool.id), eq(toolCategories.categoryId, toCat.id))
    );
    if (existing.length) {
      console.log(`• already in ${TO_CATEGORY}: ${slug}`);
    } else {
      await db.insert(toolCategories).values({ toolId: tool.id, categoryId: toCat.id });
      console.log(`✓ moved ${slug} → ${TO_CATEGORY}`);
    }
  }
  console.log("\nDone.");
  process.exit(0);
}

run().catch((e) => { console.error(e); process.exit(1); });
