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

export default function ToolsList({ tools, categories, toolCategoryMap }: ToolsListProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

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
          className="flex-1 px-4 h-11 rounded-md border border-border bg-card text-foreground placeholder:text-muted focus:outline-none focus:border-accent transition-colors"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-4 h-11 rounded-md border border-border bg-card text-foreground focus:outline-none focus:border-accent transition-colors capitalize"
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
        {filtered.length} {filtered.length === 1 ? "tool" : "tools"}
      </p>

      {filtered.length === 0 ? (
        <p className="mt-8 text-muted">No tools match your search.</p>
      ) : (
        <div className="mt-2 divide-y divide-border border-t border-border">
          {filtered.map((tool) => (
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
      )}
    </div>
  );
}
