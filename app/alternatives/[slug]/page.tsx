import { JsonLd } from "@/components/json-ld";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { eq, isNotNull, and, ne, inArray } from "drizzle-orm";
import { db, tools, toolCategories } from "@/db";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const allTools = await db.select({ slug: tools.slug }).from(tools);
  return allTools.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const [tool] = await db
    .select()
    .from(tools)
    .where(eq(tools.slug, slug))
    .limit(1);

  if (!tool) return { title: "Tool not found" };

  return {
    title: `Alternatives to ${tool.name}`,
    description: `Best alternatives to ${tool.name} for content creators. Compare features, pricing, and use cases.`,
    openGraph: { url: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://pluckly.net"}/alternatives/${tool.slug}` },
  };
}

export const revalidate = 60;

function formatPrice(cents: number | null): string {
  if (cents === null) return "Pricing varies";
  if (cents === 0) return "Free";
  return `From $${(cents / 100).toFixed(0)}/mo`;
}

export default async function AlternativesPage({ params }: PageProps) {
  const { slug } = await params;

  const [tool] = await db
    .select()
    .from(tools)
    .where(eq(tools.slug, slug))
    .limit(1);

  if (!tool) notFound();

  const toolCats = await db
    .select({ categoryId: toolCategories.categoryId })
    .from(toolCategories)
    .where(eq(toolCategories.toolId, tool.id));

  const categoryIds = toolCats.map((tc) => tc.categoryId);

  const alternatives =
    categoryIds.length === 0
      ? []
      : await db
          .selectDistinct({ tool: tools })
          .from(tools)
          .innerJoin(toolCategories, eq(toolCategories.toolId, tools.id))
          .where(
            and(
              inArray(toolCategories.categoryId, categoryIds),
              ne(tools.id, tool.id),
              isNotNull(tools.publishedAt)
            )
          );

  return (
    <article className="max-w-3xl mx-auto px-6 py-16">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ItemList",
          "name": `Best Alternatives to ${tool.name}`,
          "description": `Top ${tool.name} alternatives for content creators, compared by features and pricing.`,
          "itemListElement": alternatives.map((alt, i) => ({
            "@type": "ListItem",
            "position": i + 1,
            "name": alt.tool.name,
            "url": `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://pluckly.net"}/tools/${alt.tool.slug}`,
          })),
        }}
      />
      <Link
        href={`/tools/${tool.slug}`}
        className="text-sm text-muted hover:text-foreground transition-colors"
      >
        ← Back to {tool.name}
      </Link>

      <div className="mt-8">
        <div className="text-sm text-muted uppercase tracking-wide">
          Alternatives
        </div>
        <h1 className="mt-2 font-serif text-5xl tracking-tight">
          Alternatives to {tool.name}
        </h1>
        <p className="mt-4 text-lg text-muted">
          {alternatives.length}{" "}
          {alternatives.length === 1 ? "tool" : "tools"} that serve a similar
          purpose to {tool.name}.
        </p>
      </div>

      <div className="mt-12 divide-y divide-border border-t border-border">
        {alternatives.length === 0 ? (
          <p className="py-6 text-sm text-muted">
            No alternatives available yet.
          </p>
        ) : (
          alternatives.map(({ tool: alt }) => (
            <div
              key={alt.id}
              className="py-6 -mx-6 px-6 hover:bg-foreground/[0.02] transition-colors"
            >
              <Link href={`/tools/${alt.slug}`} className="block">
                <div className="flex items-baseline justify-between gap-4">
                  <h2 className="font-serif text-xl">{alt.name}</h2>
                  <span className="text-sm text-muted shrink-0">
                    {formatPrice(alt.startingPriceCents)}
                  </span>
                </div>
                {alt.tagline && (
                  <p className="mt-2 text-sm text-muted">{alt.tagline}</p>
                )}
              </Link>
              <div className="mt-3">
                <Link
                  href={`/compare/${tool.slug}-vs-${alt.slug}`}
                  className="text-xs text-accent hover:underline"
                >
                  Compare {tool.name} vs {alt.name} →
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </article>
  );
}
