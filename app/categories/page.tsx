import type { Metadata } from "next";
import Link from "next/link";
import { sql, eq } from "drizzle-orm";
import { db, categories, toolCategories } from "@/db";

export const metadata: Metadata = {
  title: "Categories",
  description: "Browse creator tool categories.",
  openGraph: { url: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://pluckly.net"}/categories` },
};

export const revalidate = 60;

export default async function CategoriesIndexPage() {
  const cats = await db
    .select({
      id: categories.id,
      slug: categories.slug,
      name: categories.name,
      description: categories.description,
      toolCount: sql<number>`count(${toolCategories.toolId})::int`,
    })
    .from(categories)
    .leftJoin(toolCategories, eq(toolCategories.categoryId, categories.id))
    .groupBy(categories.id)
    .orderBy(categories.name);

  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <div className="text-sm text-muted uppercase tracking-wide">Directory</div>
      <h1 className="mt-2 font-serif text-4xl tracking-tight">Categories</h1>
      <p className="mt-4 text-muted">Tools grouped by what they do.</p>

      <div className="mt-12 divide-y divide-border border-t border-border">
        {cats.map((cat) => (
          <Link
            key={cat.id}
            href={`/categories/${cat.slug}`}
            className="block py-6 hover:bg-foreground/[0.02] transition-colors -mx-6 px-6"
          >
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="font-serif text-xl">{cat.name}</h2>
              <span className="text-sm text-muted shrink-0">
                {cat.toolCount} {cat.toolCount === 1 ? "tool" : "tools"}
              </span>
            </div>
            {cat.description && (
              <p className="mt-2 text-sm text-muted">{cat.description}</p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
