import { db } from "./index";
import { categories } from "./schema";
import { eq } from "drizzle-orm";

// Additive, idempotent. Safe to re-run — existing slugs are skipped.
// Run: npx tsx --env-file .env.local db/add-categories.ts
const NEW_CATEGORIES = [
  {
    slug: "course-platforms",
    name: "Course Platforms",
    description: "Tools for building, hosting, and selling online courses and cohort-based programs.",
  },
  {
    slug: "email-marketing",
    name: "Email Marketing",
    description: "Newsletter and email platforms for building an audience and sending campaigns.",
  },
  {
    slug: "live-streaming",
    name: "Live Streaming",
    description: "Software for broadcasting live video to YouTube, Twitch, and multistream destinations.",
  },
];

async function run() {
  for (const c of NEW_CATEGORIES) {
    const existing = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.slug, c.slug));

    if (existing.length) {
      console.log(`• skip (exists): ${c.slug}`);
      continue;
    }

    await db.insert(categories).values({
      slug: c.slug,
      name: c.name,
      description: c.description,
    });
    console.log(`✓ ${c.name}`);
  }
  console.log("\nDone.");
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
