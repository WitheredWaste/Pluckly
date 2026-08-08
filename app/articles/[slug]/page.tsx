import { JsonLd } from "@/components/json-ld";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { db, articles, tools } from "@/db";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const rows = await db.select({ slug: articles.slug }).from(articles);
  return rows.map((a: { slug: string }) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const [article] = await db.select().from(articles).where(eq(articles.slug, slug)).limit(1);
  if (!article || !article.publishedAt) {
    return { title: "Article not found" };
  }
  return {
    title: article.title,
    description: article.metaDescription ?? article.excerpt ?? article.subtitle ?? article.title,
    openGraph: {
      url: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://pluckly.net"}/articles/${article.slug}`,
      type: "article",
    },
  };
}

export const dynamic = 'force-dynamic';

// Minimal, safe Markdown -> HTML for the subset our articles use.
function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function inline(s: string, toolSlugs: Set<string>): string {
  let out = escapeHtml(s);
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  out = out.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, text, target) => {
    const t = String(target).trim();
    if (/^https?:/i.test(t)) return '<a href="' + t + '">' + text + '</a>';
    const slug = t.replace(/^\/?(tools\/)?/, "");
    if (toolSlugs.has(slug)) return '<a href="/tools/' + slug + '">' + text + '</a>';
    return text;
  });
  return out;
}

function renderMarkdown(md: string, toolSlugs: Set<string>): string {
  const lines = md.split("\n");
  const html: string[] = [];
  let inList = false;
  const closeList = () => { if (inList) { html.push("</ul>"); inList = false; } };
  for (const raw of lines) {
    const line = raw.trim();
    if (line === "") { closeList(); continue; }
    if (line === "---") { closeList(); html.push("<hr />"); continue; }
    if (line.startsWith("### ")) { closeList(); html.push(`<h3>${inline(line.slice(4), toolSlugs)}</h3>`); continue; }
    if (line.startsWith("## ")) { closeList(); html.push(`<h2>${inline(line.slice(3), toolSlugs)}</h2>`); continue; }
    if (line.startsWith("# ")) { closeList(); html.push(`<h2>${inline(line.slice(2), toolSlugs)}</h2>`); continue; }
    if (line.startsWith("- ") || line.startsWith("* ")) {
      if (!inList) { html.push("<ul>"); inList = true; }
      html.push(`<li>${inline(line.slice(2), toolSlugs)}</li>`);
      continue;
    }
    closeList();
    html.push(`<p>${inline(line, toolSlugs)}</p>`);
  }
  closeList();
  return html.join("\n");
}

export default async function ArticlePage({ params }: PageProps) {
  const { slug } = await params;
  const [article] = await db.select().from(articles).where(eq(articles.slug, slug)).limit(1);
  if (!article || !article.publishedAt) {
    notFound();
  }

  const relatedSlugs = (article.relatedToolSlugs || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const allTools = await db.select({ slug: tools.slug, name: tools.name }).from(tools);
  const toolSlugSet = new Set(allTools.map((t: { slug: string }) => t.slug));
  const related = relatedSlugs.length
    ? allTools.filter((t: { slug: string }) => relatedSlugs.includes(t.slug))
    : [];

  const bodyHtml = renderMarkdown(article.body || "", toolSlugSet);

  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: article.title,
          description: article.metaDescription ?? article.excerpt ?? "",
          datePublished: article.publishedAt?.toISOString?.() ?? undefined,
          dateModified: article.updatedAt?.toISOString?.() ?? undefined,
        }}
      />
      <div className="text-sm text-muted uppercase tracking-wide">
        <Link href="/articles" className="hover:underline">Articles</Link>
      </div>
      <h1 className="mt-2 font-serif text-4xl tracking-tight leading-tight">{article.title}</h1>
      {article.subtitle && <p className="mt-4 text-xl text-muted leading-relaxed">{article.subtitle}</p>}

      <article
        className="article-body mt-12"
        dangerouslySetInnerHTML={{ __html: bodyHtml }}
      />

      {related.length > 0 && (
        <div className="mt-16 border-t border-border pt-8">
          <h2 className="font-serif text-2xl tracking-tight">Tools mentioned</h2>
          <ul className="mt-4 grid gap-2">
            {related.map((t) => (
              <li key={t.slug}>
                <Link href={`/tools/${t.slug}`} className="text-accent hover:underline">{t.name}</Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
