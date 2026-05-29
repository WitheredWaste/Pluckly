import { db } from "./index";
import { tools } from "./schema";
import { isNull } from "drizzle-orm";

async function run() {
  const res = await db
    .update(tools)
    .set({ publishedAt: new Date() })
    .where(isNull(tools.publishedAt))
    .returning({ slug: tools.slug });
  console.log("Published:", res.map((t) => t.slug).join(", ") || "(none)");
  process.exit(0);
}

run().catch((e) => { console.error(e); process.exit(1); });
