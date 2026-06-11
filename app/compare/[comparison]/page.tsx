import { JsonLd } from "@/components/json-ld";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { eq, inArray } from "drizzle-orm";
import { db, tools, categories, toolCategories } from "@/db";

interface PageProps {
  params: Promise<{ comparison: string }>;
}

function parseComparison(comparison: string): [string, string] | null {
  const parts = comparison.split("-vs-");
  if (parts.length !== 2) return null;
  if (!parts[0] || !parts[1]) return null;
  return [parts[0], parts[1]];
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { comparison } = await params;
  const parsed = parseComparison(comparison);
  if (!parsed) return { title: "Comparison not found" };

  const [slug1, slug2] = parsed;
  const found = await db
    .select()
    .from(tools)
    .where(inArray(tools.slug, [slug1, slug2]));

  const tool1 = found.find((t) => t.slug === slug1);
  const tool2 = found.find((t) => t.slug === slug2);

  if (!tool1 || !tool2) return { title: "Comparison not found" };

  const [a, b] = [slug1, slug2].sort();

  return {
    title: `${tool1.name} vs ${tool2.name}`,
    description: `Side-by-side comparison of ${tool1.name} and ${tool2.name}. Pricing, features, and who each is for.`,
    alternates: {
      canonical: `/compare/${a}-vs-${b}`,
    },
    openGraph: { url: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://pluckly.net"}/compare/${a}-vs-${b}` },
  };
}

export const revalidate = 3600;

function formatPrice(cents: number | null): string {
  if (cents === null) return "Pricing varies";
  if (cents === 0) return "Free";
  const dollars = cents / 100;
  const display = dollars % 1 === 0 ? dollars.toString() : dollars.toFixed(2);
  return `${display}/mo`;
}

function freeStatus(hasFreeTier: boolean, hasFreeTrial: boolean): string {
  if (hasFreeTier) return "Free tier";
  if (hasFreeTrial) return "Free trial";
  return "Paid only";
}

function topItems(text: string | null, n: number): string[] {
  if (!text) return [];
  return text.split("\n").map((x) => x.trim()).filter(Boolean).slice(0, n);
}

function fmtDate(d: Date | null): string {
  if (!d) return "";
  try { return new Date(d).toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "numeric" }); }
  catch { return ""; }
}

export default async function ComparisonPage({ params }: PageProps) {
  const { comparison } = await params;
  const parsed = parseComparison(comparison);

  if (!parsed) notFound();

  const [slug1, slug2] = parsed;
  if (slug1 === slug2) notFound();

  const found = await db
    .select()
    .from(tools)
    .where(inArray(tools.slug, [slug1, slug2]));

  const tool1 = found.find((t) => t.slug === slug1);
  const tool2 = found.find((t) => t.slug === slug2);

  if (!tool1 || !tool2) notFound();

  const tool1Cats = await db
    .select({ category: categories })
    .from(toolCategories)
    .innerJoin(categories, eq(toolCategories.categoryId, categories.id))
    .where(eq(toolCategories.toolId, tool1.id));

  const tool2Cats = await db
    .select({ category: categories })
    .from(toolCategories)
    .innerJoin(categories, eq(toolCategories.categoryId, categories.id))
    .where(eq(toolCategories.toolId, tool2.id));

  const cats1 = tool1Cats.map(({ category }) => category.name);
  const cats2 = tool2Cats.map(({ category }) => category.name);
  const sharedCats = cats1.filter((c) => cats2.includes(c));
  const overlap = sharedCats.length > 0;

  const bestFor1 = cats1.length ? cats1.slice(0, 2).join(" and ").toLowerCase() : "its core use case";
  const bestFor2 = cats2.length ? cats2.slice(0, 2).join(" and ").toLowerCase() : "its core use case";

  const framing = overlap
    ? `${tool1.name} and ${tool2.name} both cover ${sharedCats.join(", ").toLowerCase()}, so this is a real either-or for some teams. The right pick depends on which one's wider feature set and pricing fit how you work.`
    : `${tool1.name} and ${tool2.name} solve different problems, so most people would not choose between them directly. The comparison below helps if you are weighing where to spend budget, or deciding whether you need both.`;

  const rows = [
    {
      label: "Starting price",
      v1: formatPrice(tool1.startingPriceCents),
      v2: formatPrice(tool2.startingPriceCents),
    },
    {
      label: "Founded",
      v1: tool1.foundedYear?.toString() ?? "—",
      v2: tool2.foundedYear?.toString() ?? "—",
    },
    {
      label: "Pricing model",
      v1: tool1.pricingModel ?? "—",
      v2: tool2.pricingModel ?? "—",
    },
    {
      label: "Free option",
      v1: freeStatus(tool1.hasFreeTier, tool1.hasFreeTrial),
      v2: freeStatus(tool2.hasFreeTier, tool2.hasFreeTrial),
    },
  ];

  return (
    <article className="max-w-4xl mx-auto px-6 py-16">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          "name": `${tool1.name} vs ${tool2.name}: Which is Better?`,
          "description": `Side-by-side comparison of ${tool1.name} and ${tool2.name}.`,
          "about": [
            { "@type": "SoftwareApplication", "name": tool1.name },
            { "@type": "SoftwareApplication", "name": tool2.name },
          ],
        }}
      />
      <div className="text-sm text-muted uppercase tracking-wide">
        Comparison
      </div>
      <h1 className="mt-2 font-serif text-4xl tracking-tight">
        {tool1.name} vs {tool2.name}
      </h1>
      <p className="mt-4 text-lg text-muted">
        Side-by-side comparison of {tool1.name} and {tool2.name}.
      </p>

      <div className="mt-12 rounded-lg border border-border overflow-hidden bg-card">
        <div className="grid grid-cols-3 gap-x-6 px-5 py-5 border-b border-border items-baseline">
          <div className="text-sm text-muted">Tool</div>
          <div>
            <Link
              href={`/tools/${tool1.slug}`}
              className="font-serif text-2xl hover:text-accent transition-colors block"
            >
              {tool1.name}
            </Link>
            {tool1.tagline && (
              <p className="mt-1 text-xs text-muted">{tool1.tagline}</p>
            )}
          </div>
          <div>
            <Link
              href={`/tools/${tool2.slug}`}
              className="font-serif text-2xl hover:text-accent transition-colors block"
            >
              {tool2.name}
            </Link>
            {tool2.tagline && (
              <p className="mt-1 text-xs text-muted">{tool2.tagline}</p>
            )}
          </div>
        </div>

        {rows.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-3 gap-x-6 px-5 py-4 border-b border-border items-baseline"
          >
            <div className="text-sm text-muted">{row.label}</div>
            <div className="mono text-sm">{row.v1}</div>
            <div className="mono text-sm">{row.v2}</div>
          </div>
        ))}

        <div className="grid grid-cols-3 gap-x-6 px-5 py-4 items-start">
          <div className="text-sm text-muted pt-1">Categories</div>
          <div className="flex flex-wrap gap-2">
            {tool1Cats.map(({ category }) => (
              <Link
                key={category.id}
                href={`/categories/${category.slug}`}
                className="mono text-xs border border-border px-2.5 py-1 rounded-lg hover:bg-accent/[0.06] hover:border-accent transition-colors"
              >
                {category.name}
              </Link>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {tool2Cats.map(({ category }) => (
              <Link
                key={category.id}
                href={`/categories/${category.slug}`}
                className="mono text-xs border border-border px-2.5 py-1 rounded-lg hover:bg-accent/[0.06] hover:border-accent transition-colors"
              >
                {category.name}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <section className="mt-16">
        <h2 className="font-serif text-2xl">What they are</h2>
        <div className="mt-6 grid grid-cols-2 gap-8">
          <div>
            <h3 className="font-serif text-lg">{tool1.name}</h3>
            <p className="mt-3 text-foreground/90 leading-relaxed text-sm">
              {tool1.description}
            </p>
          </div>
          <div>
            <h3 className="font-serif text-lg">{tool2.name}</h3>
            <p className="mt-3 text-foreground/90 leading-relaxed text-sm">
              {tool2.description}
            </p>
          </div>
        </div>
      </section>

      <section className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-6 best-for-grid">
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="text-xs uppercase tracking-wide text-muted">Choose</div>
          <div className="font-serif text-xl mt-1">{tool1.name}</div>
          <p className="mt-3 text-sm text-foreground/90 leading-relaxed">
            if you need {bestFor1}. {tool1.hasFreeTier ? "It has a usable free tier to start with." : "Starts at " + formatPrice(tool1.startingPriceCents).toLowerCase() + "."}
          </p>
          {/* t1pros */}
          {topItems(tool1.pros, 3).length > 0 && (
            <ul className="mt-4 space-y-1.5">
              {topItems(tool1.pros, 3).map((pro, i) => (
                <li key={i} className="text-sm text-foreground/80 flex gap-2"><span className="text-accent">+</span>{pro}</li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="text-xs uppercase tracking-wide text-muted">Choose</div>
          <div className="font-serif text-xl mt-1">{tool2.name}</div>
          <p className="mt-3 text-sm text-foreground/90 leading-relaxed">
            if you need {bestFor2}. {tool2.hasFreeTier ? "It has a usable free tier to start with." : "Starts at " + formatPrice(tool2.startingPriceCents).toLowerCase() + "."}
          </p>
          {topItems(tool2.pros, 3).length > 0 && (
            <ul className="mt-4 space-y-1.5">
              {topItems(tool2.pros, 3).map((pro, i) => (
                <li key={i} className="text-sm text-foreground/80 flex gap-2"><span className="text-accent">+</span>{pro}</li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="mt-12 border-t border-border pt-12">
        <h2 className="font-serif text-2xl">Which to choose</h2>
        <p className="mt-4 text-foreground/90 leading-relaxed">{framing}</p>
        <p className="mt-4 text-foreground/90 leading-relaxed">
          Read the full reviews for{" "}
          <Link href={`/tools/${tool1.slug}`} className="text-accent hover:underline">{tool1.name}</Link>{" "}
          and{" "}
          <Link href={`/tools/${tool2.slug}`} className="text-accent hover:underline">{tool2.name}</Link>.
        </p>
        {(tool1.priceCheckedAt || tool2.priceCheckedAt) && (
          <p className="mt-6 text-xs text-muted">
            Pricing checked {fmtDate(tool1.priceCheckedAt) || fmtDate(tool2.priceCheckedAt)}.
          </p>
        )}
      </section>
    </article>
  );
}
