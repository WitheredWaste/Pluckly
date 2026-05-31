import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { eq, isNotNull, and } from "drizzle-orm";
import { db, categories, tools, toolCategories } from "@/db";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const allCategories = await db
    .select({ slug: categories.slug })
    .from(categories);
  return allCategories.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const [category] = await db
    .select()
    .from(categories)
    .where(eq(categories.slug, slug))
    .limit(1);

  if (!category) {
    return { title: "Category not found" };
  }

  return {
    title: `${category.name} tools`,
    description:
      category.description ?? `${category.name} tools reviewed for creators.`,
    openGraph: { url: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://pluckly.net"}/categories/${category.slug}` },
  };
}

export const revalidate = 60;

function formatPrice(cents: number | null): string {
  if (cents === null) return "Pricing varies";
  if (cents === 0) return "Free";
  const dollars = cents / 100;
  const display = dollars % 1 === 0 ? dollars.toString() : dollars.toFixed(2);
  return `From $${display}/mo`;
}

export default async function CategoryPage({ params }: PageProps) {
  const { slug } = await params;

  const [category] = await db
    .select()
    .from(categories)
    .where(eq(categories.slug, slug))
    .limit(1);

  if (!category) {
    notFound();
  }

  const toolsInCategory = await db
    .select({ tool: tools })
    .from(toolCategories)
    .innerJoin(tools, eq(toolCategories.toolId, tools.id))
    .where(
      and(
        eq(toolCategories.categoryId, category.id),
        isNotNull(tools.publishedAt)
      )
    );

  return (
    <article className="max-w-3xl mx-auto px-6 py-16">
      <Link
        href="/categories"
        className="text-sm text-muted hover:text-foreground transition-colors"
      >
        ← All categories
      </Link>

      <div className="mt-8">
        <div className="text-sm text-muted uppercase tracking-wide">
          Category
        </div>
        <h1 className="mt-2 font-serif text-5xl tracking-tight">
          {category.name}
        </h1>
        {category.description && (
          <p className="mt-4 text-lg text-muted">{category.description}</p>
        )}
      </div>

      <div className="mt-12 divide-y divide-border border-t border-border">
        {toolsInCategory.length === 0 ? (
          <p className="py-6 text-sm text-muted">
            No tools in this category yet.
          </p>
        ) : (
          toolsInCategory.map(({ tool }) => (
            <Link
              key={tool.id}
              href={`/tools/${tool.slug}`}
              className="block py-6 hover:bg-foreground/[0.02] transition-colors -mx-6 px-6"
            >
              <div className="flex items-baseline justify-between gap-4">
                <h2 className="font-serif text-xl">{tool.name}</h2>
                <span className="text-sm text-muted shrink-0">
                  {formatPrice(tool.startingPriceCents)}
                </span>
              </div>
              {tool.tagline && (
                <p className="mt-2 text-sm text-muted">{tool.tagline}</p>
              )}
            </Link>
          ))
        )}
      </div>
    </article>
  );
}
