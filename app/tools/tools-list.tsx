"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

type Tool = {
  id: number;
  slug: string;
  name: string;
  tagline: string | null;
  startingPriceCents: number | null;
  logoUrl: string | null;
  websiteUrl: string | null;
};

type Category = {
  slug: string;
  name: string;
};

interface ToolsListProps {
  tools: Tool[];
  categories: Category[];
  toolCategoryMap: Record<number, string[]>;
}

function formatPrice(cents: number | null): string {
  if (cents === null) return "";
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

export default function ToolsList({ tools, categories, toolCategoryMap }: ToolsListProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  const categoryNames = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of categories) map[c.slug] = c.name;
    return map;
  }, [categories]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return tools.filter((tool) => {
      const matchesQuery =
        q === "" ||
        tool.name.toLowerCase().includes(q) ||
        (tool.tagline?.toLowerCase().includes(q) ?? false);
      const matchesCategory =
        category === "all" ||
        (toolCategoryMap[tool.id]?.includes(category) ?? false);
      return matchesQuery && matchesCategory;
    });
  }, [query, category, tools, toolCategoryMap]);

  return (
    <div className="mt-12">
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tools..."
          className="flex-1 px-4 h-11 rounded-lg border border-border bg-card text-foreground placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-4 h-11 rounded-lg border border-border bg-card text-foreground focus:outline-none focus:border-accent transition-colors capitalize"
        >
          <option value="all">All categories</option>
          {categories.map((cat) => (
            <option key={cat.slug} value={cat.slug}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      <p className="mt-6 text-sm text-muted">
        <span className="mono">{filtered.length}</span>{" "}
        {filtered.length === 1 ? "tool" : "tools"}
      </p>

      {filtered.length === 0 ? (
        <p className="mt-8 text-muted">No tools match your search.</p>
      ) : (
        <div className="mt-2 rounded-lg border border-border overflow-hidden bg-card">
          {filtered.map((tool, i) => {
            const favicon = tool.logoUrl || faviconFromUrl(tool.websiteUrl);
            const slugs = toolCategoryMap[tool.id] ?? [];
            const tags = slugs.slice(0, 2);
            const price = formatPrice(tool.startingPriceCents);
            return (
              <Link
                key={tool.id}
                href={`/tools/${tool.slug}`}
                className={`group flex items-center gap-4 px-5 py-4 hover:bg-accent/[0.04] transition-colors ${
                  i !== filtered.length - 1 ? "border-b border-border" : ""
                }`}
              >
                <span className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 overflow-hidden">
                  {favicon ? (
                    <img
                      src={favicon}
                      alt=""
                      className="w-6 h-6 object-contain"
                    />
                  ) : (
                    <span className="text-accent font-medium text-base leading-none">
                      {tool.name.charAt(0)}
                    </span>
                  )}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-serif text-lg truncate">{tool.name}</h2>
                    {price === "Free" && (
                      <span className="mono text-[11px] px-2 py-0.5 rounded bg-pros-bg text-pros-text">
                        free
                      </span>
                    )}
                    {tags.map((slug) => (
                      <span
                        key={slug}
                        className="mono text-[11px] px-2 py-0.5 rounded bg-accent/10 text-accent"
                      >
                        {slug}
                      </span>
                    ))}
                  </div>
                  {tool.tagline && (
                    <p className="mt-1 text-sm text-muted truncate">{tool.tagline}</p>
                  )}
                </div>

                <div className="text-right shrink-0">
                  {price && price !== "Free" && (
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
      )}
    </div>
  );
}
