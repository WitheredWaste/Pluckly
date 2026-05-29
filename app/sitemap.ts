import type { MetadataRoute } from "next";
import { isNotNull } from "drizzle-orm";
import { db, tools, categories } from "@/db";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://pluckly.net";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/tools`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/categories`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/articles`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.6 },
  ];

  const publishedTools = await db
    .select()
    .from(tools)
    .where(isNotNull(tools.publishedAt));

  const toolPages: MetadataRoute.Sitemap = publishedTools.map((tool) => ({
    url: `${baseUrl}/tools/${tool.slug}`,
    lastModified: tool.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const alternativePages: MetadataRoute.Sitemap = publishedTools.map((tool) => ({
    url: `${baseUrl}/alternatives/${tool.slug}`,
    lastModified: tool.updatedAt,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const allCategories = await db.select().from(categories);
  const categoryPages: MetadataRoute.Sitemap = allCategories.map((cat) => ({
    url: `${baseUrl}/categories/${cat.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const sorted = [...publishedTools].sort((a, b) => a.slug.localeCompare(b.slug));
  const comparisonPages: MetadataRoute.Sitemap = [];
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      comparisonPages.push({
        url: `${baseUrl}/compare/${sorted[i].slug}-vs-${sorted[j].slug}`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  }

  return [
    ...staticPages,
    ...toolPages,
    ...alternativePages,
    ...categoryPages,
    ...comparisonPages,
  ];
}
