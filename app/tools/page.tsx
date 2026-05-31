import type { Metadata } from "next";
import Link from "next/link";
import { desc, isNotNull } from "drizzle-orm";
import { db, tools } from "@/db";

export const metadata: Metadata = {
  title: "Tools",
  description: "Software and AI tools reviewed for content creators.",
  openGraph: { url: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://pluckly.net"}/tools` },
};

export const revalidate = 60;

function formatPrice(cents: number | null): string {
  if (cents === null) return "";
  if (cents === 0) return "Free";
  const dollars = cents / 100;
  const display = dollars % 1 === 0 ? dollars.toString() : dollars.toFixed(2);
  return `From $${display}/mo`;
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

export default async function ToolsIndexPage() {
  const allTools = await db
    .select()
    .from(tools)
    .where(isNotNull(tools.publishedAt))
    .orderBy(desc(tools.publishedAt));

  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      <div className="text-sm text-muted uppercase tracking-wide">Directory</div>
      <h1 className="mt-2 font-serif text-4xl tracking-tight">Tools</h1>
      <p className="mt-4 text-muted">
        {allTools.length} {allTools.length === 1 ? "tool" : "tools"} reviewed for content creators, with more added weekly.
      </p>

      <div className="mt-12 divide-y divide-border border-t border-border">
        {allTools.map((tool) => (
          <Link
            key={tool.id}
            href={`/tools/${tool.slug}`}
            className="block py-6 hover:bg-foreground/[0.02] transition-colors -mx-6 px-6"
          >
            <div className="flex items-baseline justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                {(tool.logoUrl || faviconFromUrl(tool.websiteUrl)) && (
                  <img
                    src={tool.logoUrl || faviconFromUrl(tool.websiteUrl) || ""}
                    alt=""
                    className="w-6 h-6 rounded border border-border bg-card object-contain shrink-0"
                  />
                )}
                <h2 className="font-serif text-xl truncate">{tool.name}</h2>
              </div>
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
    </div>
  );
}
