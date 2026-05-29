import { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description:
    "Pluckly is an independent review site for creator tools. No sponsored placements, no rankings for sale.",
  openGraph: { url: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://pluckly.net"}/about` },
};

export default function AboutPage() {
  return (
    <article className="max-w-2xl mx-auto px-6 py-16">
      <div className="text-sm text-muted uppercase tracking-wide">About</div>
      <h1 className="mt-2 font-serif text-5xl tracking-tight">About Pluckly</h1>

      <div className="mt-10 text-foreground/90 leading-relaxed space-y-6">
        <p>
          Pluckly is an independent review and comparison site for software tools used by
          online creators — YouTubers, podcasters, newsletter writers, streamers, and
          course creators.
        </p>
        <p>
          Every tool on this site is researched and written about on its merits. We do
          not accept payment for placement, reviews, or rankings. If a tool appears here,
          it is because it is worth knowing about.
        </p>

        <h2 className="font-serif text-2xl mt-10 text-foreground">How we make money</h2>
        <p>
          Pluckly uses affiliate links. When you click through to a tool and sign up for
          a paid plan, we may earn a commission at no extra cost to you. This is how
          independent review sites stay independent. Affiliate relationships never
          influence which tools we cover or how we describe them.
        </p>

        <h2 className="font-serif text-2xl mt-10 text-foreground">How tools are selected</h2>
        <p>
          Tools are added based on relevance to the creator audience, market presence,
          and genuine search demand from people trying to solve a real problem. We do not
          list tools to pad a database.
        </p>

        <h2 className="font-serif text-2xl mt-10 text-foreground">Editorial process</h2>
        <p>
          Each tool page includes a factual summary, pricing, and category data sourced
          from the tool's own website and documentation. Comparison pages are generated
          from that structured data. We update entries when pricing or features change
          significantly.
        </p>
      </div>
    </article>
  );
}
