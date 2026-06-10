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
  return `${symbol}${display}/mo`;
}

function freeStatus(hasFreeTier: boolean, hasFreeTrial: boolean): string {
  if (hasFreeTier) return "Free tier available";
  if (hasFreeTrial) return "Free trial available";
  return "Paid only";
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

type Faq = { q: string; a: string };

function parseFaqs(value: string | null): Faq[] {
  if (!value) return [];
  try {
    const arr = JSON.parse(value) as { q?: string; a?: string }[];
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((f) => f && typeof f.q === "string" && typeof f.a === "string" && f.q.trim() && f.a.trim())
      .map((f) => ({ q: String(f.q).trim(), a: String(f.a).trim() }));
  } catch {
    return [];
  }
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
  const faqs = parseFaqs(tool.faqs);

  const initial = (tool.name?.[0] ?? "?").toUpperCase();
  const logoSrc = tool.logoUrl || faviconFromUrl(tool.websiteUrl);
  const bottomLine = (tool.verdict && tool.verdict.trim()) || tool.tagline || "";

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
          {logoSrc ? (
            <img
              src={logoSrc}
              alt={`${tool.name} logo`}
              className="w-12 h-12 rounded-md border border-border bg-card object-contain p-1 shrink-0"
            />
          ) : (
            <div className="w-12 h-12 rounded-md border border-border bg-card flex items-center justify-center font-serif text-xl text-accent shrink-0">
              {initial}
            </div>
          )}
          <h1 className="font-serif text-3xl sm:text-4xl tracking-tight break-words min-w-0">{tool.name}</h1>
        </div>
        {tool.websiteUrl && (
            <a
              href={tool.affiliateUrl || tool.websiteUrl || "#"}
              target="_blank"
              rel={tool.affiliateUrl ? "noopener noreferrer sponsored" : "noopener noreferrer"}
              className="mt-5 w-full sm:w-auto justify-center text-sm font-medium bg-accent text-white px-5 h-11 inline-flex items-center rounded-lg hover:bg-accent-hover transition-colors"
          >
            Visit site &#8599;
          </a>
        )}
        {bottomLine && (
          <div className="mt-6 rounded-lg border border-border bg-card border-l-[3px] border-l-accent p-4">
            <div className="mono text-[11px] uppercase tracking-wider text-accent">The bottom line</div>
            <p className="mt-1.5 text-foreground leading-relaxed">{bottomLine}</p>
          </div>
        )}
      </div>

      <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-lg bg-card border border-border px-4 py-3">
          <div className="text-xs text-muted">Starting price</div>
          <div className="mt-1 mono text-sm font-medium">
            {formatPrice(tool.startingPriceCents, tool.currency)}
          </div>
        </div>
        {tool.foundedYear && (
          <div className="rounded-lg bg-card border border-border px-4 py-3">
            <div className="text-xs text-muted">Founded</div>
            <div className="mt-1 mono text-sm font-medium">{tool.foundedYear}</div>
          </div>
        )}
        <div className="rounded-lg bg-card border border-border px-4 py-3">
          <div className="text-xs text-muted">Pricing model</div>
          <div className="mt-1 text-sm font-medium capitalize">{tool.pricingModel}</div>
        </div>
        <div className="rounded-lg bg-card border border-border px-4 py-3">
          <div className="text-xs text-muted">Free option</div>
          <div className="mt-1 text-sm font-medium">
            {freeStatus(tool.hasFreeTier, tool.hasFreeTrial)}
          </div>
        </div>
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
              <div className="rounded-lg border border-pros-border bg-pros-bg p-5">
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
              <div className="rounded-lg border border-cons-border bg-cons-bg p-5">
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
                className="text-sm border border-border px-3 py-1.5 rounded-lg hover:bg-accent/[0.06] hover:border-accent transition-colors"
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

      {faqs.length > 0 && (
        <section className="mt-16 border-t border-border pt-12">
          <JsonLd
            data={{
              "@context": "https://schema.org",
              "@type": "FAQPage",
              "mainEntity": faqs.map((f) => ({
                "@type": "Question",
                "name": f.q,
                "acceptedAnswer": { "@type": "Answer", "text": f.a },
              })),
            }}
          />
          <h2 className="font-serif text-2xl">Frequently asked questions</h2>
          <div className="mt-6 space-y-6">
            {faqs.map((f, idx) => (
              <div key={idx} className="rounded-lg border border-border bg-foreground/[0.02] p-5">
                <h3 className="font-medium text-foreground">{f.q}</h3>
                <p className="mt-2 text-foreground/90">{f.a}</p>
              </div>
            ))}
          </div>
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
