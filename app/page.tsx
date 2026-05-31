import { JsonLd } from "@/components/json-ld";
import Link from "next/link";
import { desc, isNotNull, sql } from "drizzle-orm";
import { db, tools, categories } from "@/db";

export const metadata = {
  title: "Best Tools for Content Creators",
  description: "Find, compare, and choose the best tools for YouTubers, podcasters, newsletter writers, streamers, and course creators.",
};

export const revalidate = 60;

function formatPrice(cents: number | null): string {
  if (cents === null) return "Pricing varies";
  if (cents === 0) return "Free";
  const dollars = cents / 100;
  const display = dollars % 1 === 0 ? dollars.toString() : dollars.toFixed(2);
  return `From $${display}/mo`;
}

export default async function Home() {
  const recentTools = await db
    .select()
    .from(tools)
    .where(isNotNull(tools.publishedAt))
    .orderBy(desc(tools.publishedAt))
    .limit(6);

  const allCategories = await db
    .select()
    .from(categories)
    .orderBy(categories.name);

  const [counts] = await db
    .select({
      toolCount: sql<number>`count(*)::int`,
    })
    .from(tools)
    .where(isNotNull(tools.publishedAt));

  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          "name": "Pluckly",
          "url": process.env.NEXT_PUBLIC_SITE_URL ?? "https://pluckly.net",
          "description": "Find, compare, and choose the best tools for content creators.",
          "potentialAction": {
            "@type": "SearchAction",
            "target": `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://pluckly.net"}/tools?q={search_term_string}`,
            "query-input": "required name=search_term_string",
          },
        }}
      />
      <section>
        <h1 className="font-serif text-5xl sm:text-6xl tracking-tight leading-tight">
          Tools for creators, tested and compared.
        </h1>
        <p className="mt-6 text-lg text-muted max-w-2xl">
          Pluckly is an independent review site covering software and AI tools
          for YouTubers, podcasters, newsletter writers, and other online creators.
          No sponsored placements, no rankings for sale.
        </p>
      </section>

      <section className="mt-20">
        <div className="flex items-baseline justify-between">
          <h2 className="font-serif text-2xl">Recently reviewed</h2>
          <Link
            href="/tools"
            className="text-sm text-muted hover:text-foreground transition-colors"
          >
            All {counts.toolCount} tools →
          </Link>
        </div>
        <div className="mt-8 divide-y divide-border border-t border-border">
          {recentTools.map((tool) => (
            <Link
              key={tool.id}
              href={`/tools/${tool.slug}`}
              className="block py-6 hover:bg-foreground/[0.02] transition-colors -mx-6 px-6"
            >
              <div className="flex items-baseline justify-between gap-4">
                <h3 className="font-serif text-xl">{tool.name}</h3>
                <span className="text-sm text-muted shrink-0">
                  {formatPrice(tool.startingPriceCents)}
                </span>
              </div>
              {tool.tagline && (
                <p className="mt-2 text-sm text-muted">{tool.tagline}</p>
              )}
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-20">
        <h2 className="font-serif text-2xl">Browse by category</h2>
        <div className="mt-8 grid sm:grid-cols-2 gap-x-8 gap-y-4">
          {allCategories.map((category) => (
            <Link
              key={category.id}
              href={`/categories/${category.slug}`}
              className="text-base hover:text-accent transition-colors"
            >
              {category.name} →
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
