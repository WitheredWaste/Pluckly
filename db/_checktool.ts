import { db } from "./index";
import { tools } from "./schema";
import { eq } from "drizzle-orm";

async function run() {
  const r = await db.select().from(tools).where(eq(tools.slug, "zzz-pipeline-test-tool"));
  const t = r[0];
  if (!t) { console.log("NOT FOUND"); process.exit(0); }
  console.log("publishedAt (should be null):", t.publishedAt);
  console.log("currency (should be EUR):", t.currency);
  console.log("faqs (should be JSON string):", t.faqs);
  process.exit(0);
}
run().catch((e) => { console.error(e); process.exit(1); });
