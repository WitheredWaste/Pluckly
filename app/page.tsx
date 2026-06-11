import { JsonLd } from "@/components/json-ld";
import Link from "next/link";
import { desc, isNotNull, sql } from "drizzle-orm";
import { db, tools, categories } from "@/db";

export const metadata = {
  title: "Pluckly — Independent tool reviews and comparisons",
  description: "Pluckly reviews and compares software and tools so you can choose well. Independent, with no paid placements and nothing ranked for sale.",
};

export const revalidate = 3600;

function formatPrice(cents: number | null): string {
  if (cents === null) return "Pricing varies";
  if (cents === 0) return "Free";
  const dollars = cents / 100;
  const display = dollars % 1 === 0 ? dollars.toString() : dollars.toFixed(2);
  return `$${display}/mo`;
}

function faviconFromUrl(websiteUrl: string | null): string | null {
  if (!websiteUrl) return null;
  try {
    const u = new URL(websiteUrl.includes("://") ? websiteUrl : `https://${websiteUrl}`);
    return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=128`;
  } catch {
    return null;
  }
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
          "description": "Independent reviews and comparisons of software and tools.",
          "potentialAction": {
            "@type": "SearchAction",
            "target": `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://pluckly.net"}/tools?q={search_term_string}`,
            "query-input": "required name=search_term_string",
          },
        }}
      />
      <section>
        <h1 className="font-serif text-4xl sm:text-5xl tracking-tight leading-tight">
          Find the right tool, faster.
        </h1>
        <p className="mt-6 text-lg text-muted max-w-2xl leading-relaxed">
          Pluckly reviews and compares tools so you can choose well without the
          guesswork. Independent, with no paid placements and nothing ranked for
          sale.
        </p>
      </section>

      <section className="mt-20">
        <div className="flex items-baseline justify-between">
          <h2 className="font-serif text-2xl">Recently reviewed</h2>
          <Link
            href="/tools"
            className="text-sm text-muted hover:text-foreground transition-colors"
          >
            All <span className="mono">{counts.toolCount}</span> tools &rarr;
          </Link>
        </div>
        <div className="mt-8 rounded-lg border border-border overflow-hidden bg-card">
          {recentTools.map((tool, i) => {
            const favicon = tool.logoUrl || faviconFromUrl(tool.websiteUrl);
            const price = formatPrice(tool.startingPriceCents);
            return (
              <Link
                key={tool.id}
                href={`/tools/${tool.slug}`}
                className={`group flex items-center gap-4 px-5 py-4 hover:bg-accent/[0.04] transition-colors ${
                  i !== recentTools.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <span className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 overflow-hidden">
                  {favicon ? (
                    <img src={favicon} alt="" className="w-6 h-6 object-contain" />
                  ) : (
                    <span className="text-accent font-medium text-base leading-none">
                      {tool.name.charAt(0)}
                    </span>
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-serif text-lg truncate">{tool.name}</h3>
                  {tool.tagline && (
                    <p className="mt-1 text-sm text-muted truncate">{tool.tagline}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  {price !== "Pricing varies" && (
                    <div className="mono text-sm text-foreground">{price}</div>
                  )}
                  <div className="text-xs text-accent opacity-0 group-hover:opacity-100 transition-opacity">
                    View &rarr;
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mt-20">
        <h2 className="font-serif text-2xl">Browse by category</h2>
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {allCategories.map((category) => (
            <Link
              key={category.id}
              href={`/categories/${category.slug}`}
              className="rounded-lg border border-border bg-card px-4 py-3 text-sm hover:border-accent hover:bg-accent/[0.04] transition-colors"
            >
              {category.name}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
