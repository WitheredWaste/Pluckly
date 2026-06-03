import { Metadata } from "next";
import Link from "next/link";
import { desc, isNotNull } from "drizzle-orm";
import { db, articles } from "@/db";

export const metadata: Metadata = {
  title: "Articles",
  description:
    "Guides, comparisons, and deep dives on tools and workflows for online creators.",
  openGraph: {
    url: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://pluckly.net"}/articles`,
  },
};

export const revalidate = 60;

export default async function ArticlesPage() {
  const published = await db
    .select({
      slug: articles.slug,
      title: articles.title,
      subtitle: articles.subtitle,
      excerpt: articles.excerpt,
    })
    .from(articles)
    .where(isNotNull(articles.publishedAt))
    .orderBy(desc(articles.publishedAt));

  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <div className="text-sm text-muted uppercase tracking-wide">Articles</div>
      <h1 className="mt-2 font-serif text-5xl tracking-tight">Guides and deep dives</h1>
      <p className="mt-6 text-lg text-muted">
        In-depth guides on tools, workflows, and strategies for online creators.
      </p>

      <div className="mt-16 border-t border-border pt-12">
        {published.length === 0 ? (
          <p className="text-muted text-sm">
            No articles yet. Check back soon, or browse{" "}
            <Link href="/tools" className="text-accent hover:underline">tool reviews</Link>{" "}
            and{" "}
            <Link href="/compare" className="text-accent hover:underline">comparisons</Link>{" "}
            in the meantime.
          </p>
        ) : (
          <div className="grid gap-10">
            {published.map((a) => (
              <Link key={a.slug} href={`/articles/${a.slug}`} className="group block">
                <h2 className="font-serif text-2xl tracking-tight group-hover:text-accent">{a.title}</h2>
                {a.subtitle && <p className="mt-2 text-muted">{a.subtitle}</p>}
                {a.excerpt && <p className="mt-2 text-sm text-muted leading-relaxed">{a.excerpt}</p>}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
