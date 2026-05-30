import { JsonLd } from "@/components/json-ld";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import {
  db,
  tools,
  toolCategories,
  categories,
  toolCreatorTypes,
  creatorTypes,
} from "@/db";

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

  if (!tool) {
    return { title: "Tool not found" };
  }

  return {
    title: `${tool.name} review`,
    description: tool.tagline ?? `Review of ${tool.name} for creators.`,
    openGraph: { url: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://pluckly.net"}/tools/${tool.slug}` },
  };
}

export const revalidate = 60;

function formatPrice(cents: number | null): string {
  if (cents === null) return "Pricing varies";
  if (cents === 0) return "Free";
  return `From $${(cents / 100).toFixed(0)}/mo`;
}

function freeStatus(hasFreeTier: boolean, hasFreeTrial: boolean): string {
  if (hasFreeTier) return "Free tier available";
  if (hasFreeTrial) return "Free trial available";
  return "Paid only";
}

function toLines(value: string | null): string[] {
  if (!value) return [];
  return value
    .split("\n")
    .map((l) => l.replace(/^[-*•\s]+/, "").trim())
    .filter(Boolean);
}

export default async function ToolPage({ params }: PageProps) {
  const { slug } = await params;

  const [tool] = await db
    .select()
    .from(tools)
    .where(eq(tools.slug, slug))
    .limit(1);

  if (!tool) {
    notFound();
  }

  const toolCats = await db
    .select({ category: categories })
    .from(toolCategories)
    .innerJoin(categories, eq(toolCategories.categoryId, categories.id))
    .where(eq(toolCategories.toolId, tool.id));

  const toolCreators = await db
    .select({ creatorType: creatorTypes })
    .from(toolCreatorTypes)
    .innerJoin(
      creatorTypes,
      eq(toolCreatorTypes.creatorTypeId, creatorTypes.id)
    )
    .where(eq(toolCreatorTypes.toolId, tool.id));

  const features = toLines(tool.features);
  const pros = toLines(tool.pros);
  const cons = toLines(tool.cons);
  const useCases = toLines(tool.useCases);

  return (
    <article className="max-w-3xl mx-auto px-6 py-16">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "SoftwareApplication",
          "name": tool.name,
          "description": tool.description ?? "",
          "applicationCategory": "WebApplication",
          "operatingSystem": "Web",
          "url": tool.websiteUrl ?? "",
          "offers": {
            "@type": "Offer",
            "price": tool.startingPriceCents ? (tool.startingPriceCents / 100).toString() : "0",
            "priceCurrency": "USD",
          },
        }}
      />
      <Link
        href="/tools"
        className="text-sm text-muted hover:text-foreground transition-colors"
      >
        ← All tools
      </Link>

      <div className="mt-8">
        <div className="text-sm text-muted uppercase tracking-wide">
          Tool review
        </div>
        <h1 className="mt-2 font-serif text-5xl tracking-tight">{tool.name}</h1>
        {tool.tagline && (
          <p className="mt-4 text-lg text-muted">{tool.tagline}</p>
        )}
      </div>

      <div className="mt-10 flex flex-wrap items-start gap-x-10 gap-y-4 pb-10 border-b border-border">
        <div>
          <div className="text-xs text-muted uppercase tracking-wide">
            Starting price
          </div>
          <div className="mt-1 text-sm">
            {formatPrice(tool.startingPriceCents)}
          </div>
        </div>
        {tool.foundedYear && (
          <div>
            <div className="text-xs text-muted uppercase tracking-wide">
              Founded
            </div>
            <div className="mt-1 text-sm">{tool.foundedYear}</div>
          </div>
        )}
        <div>
          <div className="text-xs text-muted uppercase tracking-wide">
            Pricing model
          </div>
          <div className="mt-1 text-sm capitalize">{tool.pricingModel}</div>
        </div>
        <div>
          <div className="text-xs text-muted uppercase tracking-wide">
            Free option
          </div>
          <div className="mt-1 text-sm">
            {freeStatus(tool.hasFreeTier, tool.hasFreeTrial)}
          </div>
        </div>
        {tool.websiteUrl && (
          <div className="ml-auto">
            <a
              href={tool.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm border border-border px-4 h-9 inline-flex items-center hover:bg-foreground/5 transition-colors"
            >
              Visit website
            </a>
          </div>
        )}
      </div>

      {tool.description && (
        <section className="mt-12">
          <h2 className="font-serif text-2xl">What it is</h2>
          <p className="mt-4 text-foreground/90 leading-relaxed">
            {tool.description}
          </p>
        </section>
      )}

      {features.length > 0 && (
        <section className="mt-12">
          <h2 className="font-serif text-2xl">Key features</h2>
          <ul className="mt-4 space-y-2">
            {features.map((f, i) => (
              <li key={i} className="flex gap-3 text-foreground/90 leading-relaxed">
                <span className="text-accent mt-1">–</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(pros.length > 0 || cons.length > 0) && (
        <section className="mt-12">
          <h2 className="font-serif text-2xl">Pros and cons</h2>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-8">
            {pros.length > 0 && (
              <div>
                <h3 className="text-sm uppercase tracking-wide text-muted">Pros</h3>
                <ul className="mt-3 space-y-2">
                  {pros.map((p, i) => (
                    <li key={i} className="flex gap-2 text-foreground/90 leading-relaxed">
                      <span className="text-accent mt-1">+</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {cons.length > 0 && (
              <div>
                <h3 className="text-sm uppercase tracking-wide text-muted">Cons</h3>
                <ul className="mt-3 space-y-2">
                  {cons.map((c, i) => (
                    <li key={i} className="flex gap-2 text-foreground/90 leading-relaxed">
                      <span className="text-muted mt-1">–</span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {useCases.length > 0 && (
        <section className="mt-12">
          <h2 className="font-serif text-2xl">Who it&apos;s for</h2>
          <ul className="mt-4 space-y-2">
            {useCases.map((u, i) => (
              <li key={i} className="flex gap-3 text-foreground/90 leading-relaxed">
                <span className="text-accent mt-1">–</span>
                <span>{u}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {toolCats.length > 0 && (
        <section className="mt-12">
          <h2 className="font-serif text-2xl">Categories</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {toolCats.map(({ category }) => (
              <Link
                key={category.id}
                href={`/categories/${category.slug}`}
                className="text-sm border border-border px-3 py-1 hover:bg-foreground/5 transition-colors"
              >
                {category.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {toolCreators.length > 0 && (
        <section className="mt-12">
          <h2 className="font-serif text-2xl">Good for</h2>
          <p className="mt-4 text-foreground/90">
            {toolCreators.map((tc, i) => (
              <span key={tc.creatorType.id}>
                {i > 0 && ", "}
                {tc.creatorType.name}s
              </span>
            ))}
          </p>
        </section>
      )}

      <section className="mt-16 border-t border-border pt-12">
        <h2 className="font-serif text-2xl">Looking at alternatives?</h2>
        <p className="mt-4">
          <Link
            href={`/alternatives/${tool.slug}`}
            className="text-accent hover:underline"
          >
            See alternatives to {tool.name} →
          </Link>
        </p>
      </section>
    </article>
  );
}
