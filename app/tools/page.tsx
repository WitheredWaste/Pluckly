import type { Metadata } from "next";
import { desc, isNotNull, eq } from "drizzle-orm";
import { db, tools, categories, toolCategories } from "@/db";
import ToolsList from "./tools-list";

export const metadata: Metadata = {
  title: "Tools",
  description: "Software and AI tools reviewed for content creators.",
  openGraph: { url: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://pluckly.net"}/tools` },
};

export const revalidate = 3600;

export default async function ToolsIndexPage() {
  const allTools = await db
    .select()
    .from(tools)
    .where(isNotNull(tools.publishedAt))
    .orderBy(desc(tools.publishedAt));

  const allCategories = await db
    .select({ slug: categories.slug, name: categories.name })
    .from(categories)
    .orderBy(categories.name);

  const catRows = await db
    .select({ toolId: toolCategories.toolId, slug: categories.slug })
    .from(toolCategories)
    .innerJoin(categories, eq(toolCategories.categoryId, categories.id));

  const toolCategoryMap: Record<number, string[]> = {};
  for (const row of catRows) {
    if (!toolCategoryMap[row.toolId]) toolCategoryMap[row.toolId] = [];
    toolCategoryMap[row.toolId].push(row.slug);
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <div className="text-sm text-muted uppercase tracking-wide">Directory</div>
      <h1 className="mt-2 font-serif text-4xl tracking-tight">Tools</h1>
      <p className="mt-4 text-muted">
        {allTools.length} {allTools.length === 1 ? "tool" : "tools"} reviewed for content creators, with more added weekly.
      </p>
      <ToolsList
        tools={allTools}
        categories={allCategories}
        toolCategoryMap={toolCategoryMap}
      />
    </div>
  );
}
