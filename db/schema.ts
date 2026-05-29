import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  primaryKey,
} from "drizzle-orm/pg-core";

// Tool categories: Video Editing, Transcription, AI Writing, etc.
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Types of creators: YouTuber, Podcaster, Newsletter Writer, Streamer, etc.
export const creatorTypes = pgTable("creator_types", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Master record per tool.
export const tools = pgTable("tools", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  tagline: text("tagline"),
  description: text("description"),
  websiteUrl: text("website_url"),
  affiliateUrl: text("affiliate_url"),
  logoUrl: text("logo_url"),
  foundedYear: integer("founded_year"),
  pricingModel: text("pricing_model"),
  startingPriceCents: integer("starting_price_cents"),
  hasFreeTier: boolean("has_free_tier").default(false).notNull(),
  hasFreeTrial: boolean("has_free_trial").default(false).notNull(),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Many-to-many: which categories a tool belongs to.
export const toolCategories = pgTable(
  "tool_categories",
  {
    toolId: integer("tool_id")
      .references(() => tools.id, { onDelete: "cascade" })
      .notNull(),
    categoryId: integer("category_id")
      .references(() => categories.id, { onDelete: "cascade" })
      .notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.toolId, table.categoryId] }),
  })
);

// Many-to-many: which creator types a tool serves.
export const toolCreatorTypes = pgTable(
  "tool_creator_types",
  {
    toolId: integer("tool_id")
      .references(() => tools.id, { onDelete: "cascade" })
      .notNull(),
    creatorTypeId: integer("creator_type_id")
      .references(() => creatorTypes.id, { onDelete: "cascade" })
      .notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.toolId, table.creatorTypeId] }),
  })
);
