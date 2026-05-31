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
  return allTools.map((t: { slug: string }) => ({ slug: t.slug }));
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

const CURRENCY_SYMBOLS: Record<string, string> = { USD: "$", EUR: "€", GBP: "£" };

function formatPrice(cents: number | null, currency: string | null): string {
  if (cents === null) return "Pricing varies";
  if (cents === 0) return "Free";
  const symbol = CURRENCY_SYMBOLS[currency ?? "USD"] ?? "$";
  const dollars = cents / 100;
  const display = dollars % 1 === 0 ? dollars.toString() : dollars.toFixed(2);
  return `From ${symbol}${display}/mo`;
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
    .map((l) => l.replace(/^[-*•+\s]+/, "").trim())
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

  const initial = (tool.name?.[0] ?? "?").toUpperCase();

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
            "priceCurrency": tool.currency ?? "USD",
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
        <div className="text-sm text-accent uppercase tracking-wide">
          Tool review
        </div>
        <div className="mt-3 flex items-center gap-4">
          {tool.logoUrl ? (
            <img
              src={tool.logoUrl}
              alt={`${tool.name} logo`}
              className="w-12 h-12 rounded-md border border-border bg-card object-contain p-1"
            />
          ) : (
            <div className="w-12 h-12 rounded-md border border-border bg-card flex items-center justify-center font-serif text-xl text-accent">
              {initial}
            </div>
          )}
          <h1 className="font-serif text-5xl tracking-tight">{tool.name}</h1>
        </div>
        {tool.tagline && (
          <p className="mt-4 text-lg text-muted">{tool.tagline}</p>
        )}
        <div className="mt-5 h-0.5 w-10 bg-accent" />
      </div>

      <div className="mt-8 flex flex-wrap items-stretch gap-3">
        <div className="rounded-md border border-border bg-card px-4 py-3">
          <div className="text-xs text-muted uppercase tracking-wide">
            Starting price
          </div>
          <div className="mt-1 text-sm font-medium">
            {formatPrice(tool.startingPriceCents, tool.currency)}
          </div>
        </div>
        {tool.foundedYear && (
          <div className="rounded-md border border-border bg-card px-4 py-3">
            <div className="text-xs text-muted uppercase tracking-wide">
              Founded
            </div>
            <div className="mt-1 text-sm font-medium">{tool.foundedYear}</div>
          </div>
        )}
        <div className="rounded-md border border-border bg-card px-4 py-3">
          <div className="text-xs text-muted uppercase tracking-wide">
            Pricing model
          </div>
          <div className="mt-1 text-sm font-medium capitalize">{tool.pricingModel}</div>
        </div>
        <div className="rounded-md border border-border bg-card px-4 py-3">
          <div className="text-xs text-muted uppercase tracking-wide">
            Free option
          </div>
          <div className="mt-1 text-sm font-medium">
            {freeStatus(tool.hasFreeTier, tool.hasFreeTrial)}
          </div>
        </div>
        {tool.websiteUrl && (
          
            href={tool.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto self-center text-sm border border-accent text-accent px-5 h-10 inline-flex items-center rounded-md hover:bg-accent hover:text-background transition-colors"
          >
            Visit website
          </a>
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
                <span className="text-accent mt-1.5 text-xs">●</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(pros.length > 0 || cons.length > 0) && (
        <section className="mt-12">
          <h2 className="font-serif text-2xl">Pros and cons</h2>
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {pros.length > 0 && (
              <div className="rounded-md border border-pros-border bg-pros-bg p-4">
                <h3 className="text-xs uppercase tracking-wide font-medium text-pros-text">Pros</h3>
                <ul className="mt-3 space-y-2">
                  {pros.map((p, i) => (
                    <li key={i} className="flex gap-2 text-pros-text leading-relaxed text-sm">
                      <span className="mt-0.5">+</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {cons.length > 0 && (
              <div className="rounded-md border border-cons-border bg-cons-bg p-4">
                <h3 className="text-xs uppercase tracking-wide font-medium text-cons-text">Cons</h3>
                <ul className="mt-3 space-y-2">
                  {cons.map((c, i) => (
                    <li key={i} className="flex gap-2 text-cons-text leading-relaxed text-sm">
                      <span className="mt-0.5">–</span>
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
                <span className="text-accent mt-1.5 text-xs">●</span>
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
            {toolCats.map(({ category }: { category: { id: number; slug: string; name: string } }) => (
              <Link
                key={category.id}
                href={`/categories/${category.slug}`}
                className="text-sm border border-border px-3 py-1 rounded-md hover:bg-foreground/5 transition-colors"
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
            {toolCreators.map((tc: { creatorType: { id: number; name: string } }, i: number) => (
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
