import { config } from "dotenv";
config({ path: ".env.local" });

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.POSTGRES_URL;
if (!connectionString) {
  throw new Error("POSTGRES_URL is not set.");
}

const client = postgres(connectionString, { prepare: false });
const db = drizzle(client, { schema });
const { categories, creatorTypes, tools, toolCategories, toolCreatorTypes } = schema;

async function seed() {
  console.log("Seeding categories...");
  await db.insert(categories).values([
    { slug: "video-editing", name: "Video editing", description: "Tools for cutting, editing, and producing video content." },
    { slug: "transcription", name: "Transcription", description: "Convert audio and video to text." },
    { slug: "ai-writing", name: "AI writing", description: "AI-assisted writing, scriptwriting, and content generation." },
    { slug: "scheduling", name: "Scheduling", description: "Plan and publish content across platforms." },
    { slug: "thumbnails-visuals", name: "Thumbnails and visuals", description: "Design tools for thumbnails, graphics, and visual assets." },
    { slug: "analytics", name: "Analytics", description: "Track performance, growth, and audience data." },
    { slug: "hosting", name: "Hosting", description: "Hosting platforms for podcasts, video, and newsletters." },
    { slug: "monetization", name: "Monetization", description: "Tools for selling products, accepting payments, and growing revenue." },
  ]).onConflictDoNothing();

  console.log("Seeding creator types...");
  await db.insert(creatorTypes).values([
    { slug: "youtuber", name: "YouTuber", description: "Long-form and short-form YouTube creators." },
    { slug: "podcaster", name: "Podcaster", description: "Audio and video podcasters." },
    { slug: "newsletter-writer", name: "Newsletter writer", description: "Writers building email-based audiences." },
    { slug: "streamer", name: "Streamer", description: "Live streamers on Twitch, YouTube, and Kick." },
    { slug: "course-creator", name: "Course creator", description: "Educators selling online courses and cohort-based programs." },
  ]).onConflictDoNothing();

  console.log("Seeding tools...");
  await db.insert(tools).values([
    {
      slug: "descript",
      name: "Descript",
      tagline: "Edit video and audio by editing the transcript.",
      description: "Descript treats audio and video like a text document. Edit by deleting words, splice clips with copy and paste, and use AI features to remove filler words, clone voices, and clean up backgrounds. Popular with podcasters and YouTubers.",
      websiteUrl: "https://www.descript.com",
      foundedYear: 2017,
      pricingModel: "freemium",
      startingPriceCents: 1500,
      hasFreeTier: true,
      hasFreeTrial: true,
      publishedAt: new Date(),
    },
    {
      slug: "riverside",
      name: "Riverside",
      tagline: "Studio-quality remote recording.",
      description: "Browser-based recording for podcasts and video interviews. Records each guest locally for broadcast-quality audio and video, even on poor connections. Built-in editor and AI clip generator.",
      websiteUrl: "https://riverside.fm",
      foundedYear: 2020,
      pricingModel: "freemium",
      startingPriceCents: 1500,
      hasFreeTier: true,
      hasFreeTrial: false,
      publishedAt: new Date(),
    },
    {
      slug: "captions",
      name: "Captions",
      tagline: "AI captions and short-form video editing.",
      description: "AI-first video editor focused on short-form content for TikTok, Reels, and Shorts. Automatic captions, eye-contact correction, AI avatars, and one-tap video creation from a script.",
      websiteUrl: "https://www.captions.ai",
      foundedYear: 2021,
      pricingModel: "subscription",
      startingPriceCents: 1000,
      hasFreeTier: false,
      hasFreeTrial: true,
      publishedAt: new Date(),
    },
    {
      slug: "opus-clip",
      name: "Opus Clip",
      tagline: "Turn long videos into viral short clips.",
      description: "AI tool that finds the most engaging moments in long videos and turns them into vertical clips for TikTok, Reels, and Shorts. Adds dynamic captions and scores clips by predicted virality.",
      websiteUrl: "https://www.opus.pro",
      foundedYear: 2022,
      pricingModel: "freemium",
      startingPriceCents: 1900,
      hasFreeTier: true,
      hasFreeTrial: false,
      publishedAt: new Date(),
    },
    {
      slug: "convertkit",
      name: "ConvertKit",
      tagline: "Email and audience tools built for creators.",
      description: "Newsletter platform with landing pages, automated email sequences, paid newsletters, and a creator marketplace. Strong choice for selling digital products to a subscriber base. Now rebranded as Kit.",
      websiteUrl: "https://convertkit.com",
      foundedYear: 2013,
      pricingModel: "freemium",
      startingPriceCents: 900,
      hasFreeTier: true,
      hasFreeTrial: false,
      publishedAt: new Date(),
    },
    {
      slug: "beehiiv",
      name: "Beehiiv",
      tagline: "The newsletter platform built for growth.",
      description: "Newsletter platform with built-in growth tools: paid recommendation network, ad marketplace, native referral programs, and built-in monetisation. Founded by ex-Morning Brew operators.",
      websiteUrl: "https://www.beehiiv.com",
      foundedYear: 2021,
      pricingModel: "freemium",
      startingPriceCents: 4200,
      hasFreeTier: true,
      hasFreeTrial: false,
      publishedAt: new Date(),
    },
    {
      slug: "elevenlabs",
      name: "ElevenLabs",
      tagline: "Realistic AI voice generation and cloning.",
      description: "AI text-to-speech with the most natural voices on the market. Clone your own voice in minutes from a short audio sample. Used for audiobooks, voiceovers, dubbing, and podcast narration.",
      websiteUrl: "https://elevenlabs.io",
      foundedYear: 2022,
      pricingModel: "freemium",
      startingPriceCents: 500,
      hasFreeTier: true,
      hasFreeTrial: false,
      publishedAt: new Date(),
    },
    {
      slug: "castmagic",
      name: "Castmagic",
      tagline: "AI content repurposing for podcasters.",
      description: "Upload audio or video and Castmagic generates transcripts, show notes, social posts, blog drafts, and clips automatically. Built specifically for podcasters who want to repurpose episodes into content.",
      websiteUrl: "https://www.castmagic.io",
      foundedYear: 2022,
      pricingModel: "subscription",
      startingPriceCents: 3400,
      hasFreeTier: false,
      hasFreeTrial: true,
      publishedAt: new Date(),
    },
    {
      slug: "obs-studio",
      name: "OBS Studio",
      tagline: "Free, open-source streaming and recording.",
      description: "The de facto standard for live streaming and screen recording. Free, open-source, and powerful, with a steep learning curve. Used by virtually every serious Twitch and YouTube streamer.",
      websiteUrl: "https://obsproject.com",
      foundedYear: 2012,
      pricingModel: "free",
      startingPriceCents: 0,
      hasFreeTier: true,
      hasFreeTrial: false,
      publishedAt: new Date(),
    },
    {
      slug: "notion",
      name: "Notion",
      tagline: "Docs, wikis, and databases in one workspace.",
      description: "Flexible workspace used by creators for content calendars, knowledge bases, course materials, and project management. Templates marketplace makes it especially popular for creator workflows.",
      websiteUrl: "https://www.notion.so",
      foundedYear: 2016,
      pricingModel: "freemium",
      startingPriceCents: 800,
      hasFreeTier: true,
      hasFreeTrial: false,
      publishedAt: new Date(),
    },
  ]).onConflictDoNothing();

  console.log("Linking tools to categories and creator types...");

  const allCategories = await db.select().from(categories);
  const allCreatorTypes = await db.select().from(creatorTypes);
  const allTools = await db.select().from(tools);

  const catMap = new Map(allCategories.map((c) => [c.slug, c.id]));
  const ctMap = new Map(allCreatorTypes.map((c) => [c.slug, c.id]));
  const toolMap = new Map(allTools.map((t) => [t.slug, t.id]));

  const toolCategoryLinks = [
    ["descript", ["video-editing", "transcription"]],
    ["riverside", ["video-editing", "hosting"]],
    ["captions", ["video-editing", "ai-writing"]],
    ["opus-clip", ["video-editing", "ai-writing"]],
    ["convertkit", ["hosting", "monetization"]],
    ["beehiiv", ["hosting", "monetization", "analytics"]],
    ["elevenlabs", ["ai-writing"]],
    ["castmagic", ["transcription", "ai-writing"]],
    ["obs-studio", ["video-editing"]],
    ["notion", ["scheduling"]],
  ] as const;

  const tcRows = toolCategoryLinks.flatMap(([toolSlug, catSlugs]) =>
    catSlugs.map((catSlug) => ({
      toolId: toolMap.get(toolSlug)!,
      categoryId: catMap.get(catSlug)!,
    }))
  );

  await db.insert(toolCategories).values(tcRows).onConflictDoNothing();

  const toolCreatorTypeLinks = [
    ["descript", ["youtuber", "podcaster"]],
    ["riverside", ["podcaster", "youtuber"]],
    ["captions", ["youtuber"]],
    ["opus-clip", ["youtuber", "podcaster"]],
    ["convertkit", ["newsletter-writer", "course-creator"]],
    ["beehiiv", ["newsletter-writer"]],
    ["elevenlabs", ["podcaster", "youtuber", "course-creator"]],
    ["castmagic", ["podcaster"]],
    ["obs-studio", ["streamer", "youtuber"]],
    ["notion", ["youtuber", "podcaster", "newsletter-writer", "streamer", "course-creator"]],
  ] as const;

  const tctRows = toolCreatorTypeLinks.flatMap(([toolSlug, ctSlugs]) =>
    ctSlugs.map((ctSlug) => ({
      toolId: toolMap.get(toolSlug)!,
      creatorTypeId: ctMap.get(ctSlug)!,
    }))
  );

  await db.insert(toolCreatorTypes).values(tctRows).onConflictDoNothing();

  console.log("Seed complete.");
  await client.end();
}

seed().catch(async (err) => {
  console.error("Seed failed:", err);
  await client.end();
  process.exit(1);
});
