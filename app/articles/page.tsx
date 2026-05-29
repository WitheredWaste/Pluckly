import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Articles",
  description:
    "Guides, comparisons, and deep dives on tools and workflows for online creators.",
  openGraph: {
    url: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://pluckly.net"}/articles`,
  },
};

export default function ArticlesPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      <div className="text-sm text-muted uppercase tracking-wide">Articles</div>
      <h1 className="mt-2 font-serif text-5xl tracking-tight">
        Guides and deep dives
      </h1>
      <p className="mt-6 text-lg text-muted">
        In-depth guides on tools, workflows, and strategies for online creators.
        New articles added regularly.
      </p>
      <div className="mt-16 border-t border-border pt-12">
        <p className="text-muted text-sm">
          No articles yet. Check back soon, or browse{" "}
          <a href="/tools" className="text-accent hover:underline">
            tool reviews
          </a>{" "}
          and{" "}
          <a href="/compare" className="text-accent hover:underline">
            comparisons
          </a>{" "}
          in the meantime.
        </p>
      </div>
    </div>
  );
}
