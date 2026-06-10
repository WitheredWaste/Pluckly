"use client";

import { useState, useEffect } from "react";
function faqsJsonToText(json: string): string {
  if (!json) return "";
  try {
    const arr = JSON.parse(json) as { q?: string; a?: string }[];
    if (!Array.isArray(arr)) return "";
    return arr
      .filter((f) => f && f.q && f.a)
      .map((f) => "Q: " + String(f.q).trim() + "\nA: " + String(f.a).trim())
      .join("\n\n");
  } catch {
    return "";
  }
}

type Draft = {
  name: string;
  websiteUrl: string;
  logoUrl: string;
  affiliateUrl: string;
  roughPrice: string;
  hasFreeOption: boolean;
  categories: string;
  tagline: string;
  verdict: string;
  description: string;
  slug: string;
  priceNote: string;
  startingPriceDollars: string;
  pricingModel: string;
  currency: string;
  pros: string;
  cons: string;
  faqs: string;
  features: string;
  useCases: string;
  status: string;
};

type ToolListItem = {
  name: string;
  slug: string;
  priceCheckedAt: string | null;
  publishedAt: string | null;
};

type Stats = {
  total: number;
  published: number;
  drafts: number;
  stale: number;
  byCategory: { name: string; slug: string; count: number }[];
};

const BLANK: Draft = {
  name: "",
  websiteUrl: "",
  logoUrl: "",
  affiliateUrl: "",
  roughPrice: "",
  hasFreeOption: false,
  categories: "",
  tagline: "",
  verdict: "",
  description: "",
  slug: "",
  priceNote: "",
  startingPriceDollars: "",
  pricingModel: "",
  currency: "USD",
  pros: "",
  cons: "",
  faqs: "",
  features: "",
  useCases: "",
  status: "",
};

type Section = "overview" | "add" | "drafts" | "all" | "articles";

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [section, setSection] = useState<Section>("overview");

  const [queue, setQueue] = useState<Draft[]>([{ ...BLANK }]);
  const [toolList, setToolList] = useState<ToolListItem[] | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loadingMsg, setLoadingMsg] = useState("");

  // --- articles feature ---
  type ArticleTopic = { title: string; recency: string; coverage: string; seoRationale: string };
  type ArticleDraft = {
    title: string; subtitle: string; excerpt: string; metaDescription: string;
    slug: string; body: string; relatedToolSlugs: string;
  };
  const BLANK_ARTICLE: ArticleDraft = { title: "", subtitle: "", excerpt: "", metaDescription: "", slug: "", body: "", relatedToolSlugs: "" };
  const [artTopicInput, setArtTopicInput] = useState("");
  const [artTopics, setArtTopics] = useState<ArticleTopic[] | null>(null);
  const [artDraft, setArtDraft] = useState<ArticleDraft>({ ...BLANK_ARTICLE });
  const [artStatus, setArtStatus] = useState("");

  async function suggestTopics() {
    setArtStatus("Researching latest creator-tool news...");
    setArtTopics(null);
    try {
      const res = await fetch("/api/admin/generate-article", {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ action: "suggest" }),
      });
      const data = await res.json();
      if (!res.ok) { setArtStatus(data.error || "Could not get suggestions."); return; }
      setArtTopics(Array.isArray(data.topics) ? data.topics : []);
      setArtStatus("");
    } catch { setArtStatus("Network error getting suggestions."); }
  }

  async function writeArticle(topic: string, useSearch: boolean) {
    if (!topic.trim()) { setArtStatus("Enter a topic first."); return; }
    setArtStatus("Writing article...");
    try {
      const res = await fetch("/api/admin/generate-article", {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ action: "write", topic, useSearch }),
      });
      const data = await res.json();
      if (!res.ok) { setArtStatus(data.error || "Could not write article."); return; }
      setArtDraft({
        title: data.title || "", subtitle: data.subtitle || "", excerpt: data.excerpt || "",
        metaDescription: data.metaDescription || "", slug: data.suggestedSlug || "",
        body: data.body || "",
        relatedToolSlugs: Array.isArray(data.relatedToolSlugs) ? data.relatedToolSlugs.join(", ") : "",
      });
      setArtStatus("Article ready. Review, then save as draft or publish.");
    } catch { setArtStatus("Network error writing article."); }
  }

  function updateArt(patch: Partial<ArticleDraft>) { setArtDraft((d) => ({ ...d, ...patch })); }

  async function saveArticle(mode: "draft" | "publish") {
    if (!artDraft.title.trim()) { setArtStatus("A title is required."); return; }
    setArtStatus(mode === "publish" ? "Publishing..." : "Saving draft...");
    try {
      const res = await fetch("/api/admin/save-article", {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ ...artDraft, relatedToolSlugs: artDraft.relatedToolSlugs, mode, generationMode: "admin" }),
      });
      const data = await res.json();
      if (!res.ok) { setArtStatus(data.error || "Could not save."); return; }
      setArtStatus(mode === "publish" ? "Published and live." : "Saved as draft.");
    } catch { setArtStatus("Network error saving."); }
  }

  // --- articles list ---
  type ArticleListItem = { slug: string; title: string; publishedAt: string | null; updatedAt: string | null };
  const [articleList, setArticleList] = useState<ArticleListItem[] | null>(null);

  async function loadArticles() {
    try {
      const res = await fetch("/api/admin/list-articles", { method: "POST", headers: authHeaders() });
      const data = await res.json();
      if (res.ok) setArticleList(Array.isArray(data.articles) ? data.articles : []);
    } catch { /* ignore */ }
  }

  async function loadArticleIntoEditor(slug: string) {
    setArtStatus("Loading article...");
    try {
      const res = await fetch("/api/admin/get-article", {
        method: "POST", headers: authHeaders(),
        body: JSON.stringify({ slug }),
      });
      const data = await res.json();
      if (!res.ok) { setArtStatus(data.error || "Could not load article."); return; }
      const a = data.article;
      setArtDraft({
        title: a.title || "", subtitle: a.subtitle || "", excerpt: a.excerpt || "",
        metaDescription: a.metaDescription || "", slug: a.slug || "",
        body: a.body || "", relatedToolSlugs: a.relatedToolSlugs || "",
      });
      setArtStatus(a.isPublished ? "Editing a published article." : "Editing a draft.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch { setArtStatus("Network error loading article."); }
  }


  function authHeaders() {
    return { "Content-Type": "application/json" };
  }
  async function doLogin() {
    setLoginError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        setUnlocked(true);
        setPassword("");
      } else {
        const data = await res.json().catch(() => ({}));
        setLoginError(data.error || "Wrong password.");
      }
    } catch {
      setLoginError("Network error. Try again.");
    }
  }
  async function doLogout() {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } catch {}
    setUnlocked(false);
  }
  useEffect(() => {
    let active = true;
    fetch("/api/admin/session", { method: "POST", headers: { "Content-Type": "application/json" } })
      .then((r) => r.json())
      .then((d) => { if (active && d.authed) setUnlocked(true); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  async function loadStats() {
    setLoadingMsg("Loading stats...");
    try {
      const res = await fetch("/api/admin/stats", { method: "POST", headers: authHeaders() });
      const data = await res.json();
      if (res.ok) setStats(data);
      else setLoadingMsg(data.error || "Could not load stats.");
    } catch {
      setLoadingMsg("Network error loading stats.");
    }
    setLoadingMsg("");
  }

  async function loadTools() {
    setLoadingMsg("Loading tools...");
    try {
      const res = await fetch("/api/admin/list", { method: "POST", headers: authHeaders() });
      const data = await res.json();
      if (res.ok) setToolList(data.tools || []);
      else setLoadingMsg(data.error || "Could not load tools.");
    } catch {
      setLoadingMsg("Network error loading tools.");
    }
    setLoadingMsg("");
  }

  async function loadToolIntoEditor(slug: string) {
    setLoadingMsg("Loading " + slug + "...");
    try {
      const res = await fetch("/api/admin/tool", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ slug }),
      });
      const data = await res.json();
      if (res.ok && data.tool) {
        const t = data.tool;
        const loaded: Draft = {
          name: t.name,
          websiteUrl: t.websiteUrl,
          logoUrl: t.logoUrl || "",
          affiliateUrl: t.affiliateUrl || "",
          roughPrice: "",
          hasFreeOption: t.hasFreeOption,
          categories: t.categories,
          tagline: t.tagline,
          verdict: t.verdict,
          description: t.description,
          slug: t.slug,
          priceNote: "",
          startingPriceDollars: t.startingPriceDollars,
          pricingModel: t.pricingModel || "",
          currency: t.currency || "USD",
          pros: t.pros || "",
          cons: t.cons || "",
          faqs: faqsJsonToText(t.faqs || ""),
          features: t.features || "",
          useCases: t.useCases || "",
          status: t.isPublished ? "Editing a published tool." : "Editing a draft.",
        };
        setQueue([loaded]);
        setSection("add");
      } else {
        setLoadingMsg(data.error || "Could not load tool.");
      }
    } catch {
      setLoadingMsg("Network error loading tool.");
    }
    setLoadingMsg("");
  }

  function daysSince(dateStr: string | null): number | null {
    if (!dateStr) return null;
    const ms = Date.now() - new Date(dateStr).getTime();
    return Math.floor(ms / (1000 * 60 * 60 * 24));
  }

  function update(i: number, patch: Partial<Draft>) {
    setQueue((q) => q.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));
  }

  function addRow() {
    setQueue((q) => [...q, { ...BLANK }]);
  }

  function removeRow(i: number) {
    setQueue((q) => q.filter((_, idx) => idx !== i));
  }

  async function generate(i: number, useSearch: boolean = false) {
    const d = queue[i];
    update(i, { status: useSearch ? "researching..." : "generating" });
    try {
      const res = await fetch("/api/admin/generate", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          name: d.name,
          websiteUrl: d.websiteUrl,
          roughPrice: d.roughPrice,
          hasFreeOption: d.hasFreeOption,
          useSearch,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        update(i, { status: data.error || "Error generating." });
        return;
      }
      const suggested = Array.isArray(data.suggestedCategories) ? data.suggestedCategories.join(", ") : d.categories;
      update(i, {
        tagline: data.tagline || "",
        verdict: data.verdict || "",
        description: data.description || "",
        slug: data.suggestedSlug || "",
        priceNote: data.priceNote || "",
        categories: d.categories.trim() ? d.categories : suggested,
        pricingModel: data.suggestedPricingModel || d.pricingModel,
        currency: data.suggestedCurrency || d.currency,
        pros: data.pros || "",
        cons: data.cons || "",
        faqs: faqsJsonToText(data.faqs || ""),
        features: data.features || "",
        useCases: data.useCases || "",
        status: "ready",
      });
    } catch {
      update(i, { status: "Network error." });
    }
  }

  async function generateFaqs(i: number) {
    const d = queue[i];
    update(i, { status: "generating FAQs..." });
    try {
      const res = await fetch("/api/admin/generate-faqs", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          name: d.name,
          websiteUrl: d.websiteUrl,
          roughPrice: d.roughPrice,
          hasFreeOption: d.hasFreeOption,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        update(i, { status: data.error || "Error generating FAQs." });
        return;
      }
      update(i, { faqs: faqsJsonToText(data.faqs || ""), status: "ready" });
    } catch {
      update(i, { status: "Network error." });
    }
  }
  async function save(i: number, mode: "draft" | "publish") {
    const d = queue[i];
    update(i, { status: mode === "publish" ? "publishing..." : "saving..." });
    try {
      const res = await fetch("/api/admin/save", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          name: d.name,
          slug: d.slug,
          tagline: d.tagline,
          verdict: d.verdict,
          description: d.description,
          websiteUrl: d.websiteUrl,
          logoUrl: d.logoUrl,
          affiliateUrl: d.affiliateUrl,
          startingPriceDollars: d.startingPriceDollars,
          hasFreeOption: d.hasFreeOption,
          pricingModel: d.pricingModel,
          currency: d.currency,
          categorySlugs: d.categories.split(",").map((s) => s.trim()).filter(Boolean),
          pros: d.pros,
          cons: d.cons,
          faqs: d.faqs,
          features: d.features,
          useCases: d.useCases,
          mode,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        update(i, { status: data.error || "Error saving." });
        return;
      }
      let msg = mode === "publish" ? "Published and live." : "Saved as draft.";
      if (data.wasUpdate) { msg = mode === "publish" ? "Updated and published live." : "Draft updated."; }
      if (data.unknownCategories && data.unknownCategories.length) {
        msg += " Unknown categories skipped: " + data.unknownCategories.join(", ");
      }
      update(i, { status: msg });
    } catch {
      update(i, { status: "Network error." });
    }
  }

  if (!unlocked) {
    return (
      <div style={S.gateWrap}>
        <div style={S.gateCard}>
          <h1 style={S.h1}>Pluckly Admin</h1>
          <p style={S.muted}>Enter the admin password to continue.</p>
          <input
            style={S.input}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            onKeyDown={(e) => e.key === "Enter" && doLogin()}
          />
          {loginError && <p style={S.muted}>{loginError}</p>}
          <button style={S.primary} onClick={() => doLogin()}>Enter</button>
        </div>
      </div>
    );
  }

  return (
    <div style={S.shell}>
      <div style={S.sidebar}>
        <div style={S.logo}>Pluckly</div>
        <NavItem label="Overview" active={section === "overview"} onClick={() => { setSection("overview"); loadStats(); }} />
        <NavItem label="Add content" active={section === "add"} onClick={() => setSection("add")} />
        <NavItem label="Drafts" active={section === "drafts"} onClick={() => { setSection("drafts"); loadTools(); }} />
        <NavItem label="All tools" active={section === "all"} onClick={() => { setSection("all"); loadTools(); }} />
        <NavItem label="Articles" active={section === "articles"} onClick={() => { setSection("articles"); loadArticles(); }} />
        <button style={S.linkBtn} onClick={() => doLogout()}>Log out</button>
      </div>

      <div style={S.main}>
        {loadingMsg && <p style={S.muted}>{loadingMsg}</p>}

        {section === "overview" && (
          <div>
            <h1 style={S.h1}>Overview</h1>
            {!stats && <button style={S.linkBtn} onClick={loadStats}>load stats</button>}
            {stats && (
              <div>
                <div style={S.statRow}>
                  <Stat label="Total tools" value={stats.total} />
                  <Stat label="Published" value={stats.published} />
                  <Stat label="Drafts" value={stats.drafts} />
                  <Stat label="Need price check" value={stats.stale} highlight={stats.stale > 0} />
                </div>
                <h2 style={S.h2}>Tools per category</h2>
                <p style={S.muted}>Categories with the fewest tools are listed first — those are your content gaps.</p>
                {stats.byCategory.map((c) => (
                  <div key={c.slug} style={S.priceRow}>
                    <span>{c.name}</span>
                    <span style={{ fontWeight: 600, color: c.count === 0 ? "var(--accent)" : "var(--foreground)" }}>{c.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {section === "add" && (
          <div>
            <h1 style={S.h1}>Add content</h1>
            <p style={S.muted}>
              Type the facts, generate the writing, review, then save as draft or publish.
              Always verify the price before publishing. Loading a tool from Drafts or All
              tools fills this form so you can edit it.
            </p>
            {queue.map((d, i) => (
              <div key={i} style={S.card}>
                <div style={S.rowTop}>
                  <strong>Tool {i + 1}</strong>
                  {queue.length > 1 && <button style={S.linkBtn} onClick={() => removeRow(i)}>remove</button>}
                </div>

                <label style={S.label}>Tool name</label>
                <input style={S.input} value={d.name} onChange={(e) => update(i, { name: e.target.value })} />

                <label style={S.label}>Website URL</label>
                <input style={S.input} value={d.websiteUrl} onChange={(e) => update(i, { websiteUrl: e.target.value })} />
                <label style={S.label}>Logo URL (optional, auto from domain if blank)</label>
                <input style={S.input} value={d.logoUrl} onChange={(e) => update(i, { logoUrl: e.target.value })} />
                <label style={S.label}>Affiliate URL (optional, used for Visit button)</label>
                <input style={S.input} value={d.affiliateUrl} onChange={(e) => update(i, { affiliateUrl: e.target.value })} />

                <label style={S.label}>Rough price (e.g. &quot;$15/mo&quot;)</label>
                <input style={S.input} value={d.roughPrice} onChange={(e) => update(i, { roughPrice: e.target.value })} />

                <label style={S.checkRow}>
                  <input type="checkbox" checked={d.hasFreeOption} onChange={(e) => update(i, { hasFreeOption: e.target.checked })} />
                  Has a free option
                </label>

                <label style={S.label}>Category slugs (comma separated). Claude suggests these; edit freely.</label>
                <input style={S.input} value={d.categories} onChange={(e) => update(i, { categories: e.target.value })} />

                <button style={S.primary} onClick={() => generate(i, false)} disabled={!d.name}>Generate writing</button>
                <button style={S.secondary} onClick={() => generate(i, true)} disabled={!d.name}>Generate with research</button>

                {d.status === "generating" && <p style={S.muted}>Generating...</p>}

                {(d.tagline || d.verdict || d.description) ? (
                  <div style={S.reviewBox}>
                    <label style={S.label}>Tagline (editable)</label>
                    <input style={S.input} value={d.tagline} onChange={(e) => update(i, { tagline: e.target.value })} />

                    <label style={S.label}>Verdict / bottom line (editable)</label>
                    <textarea style={S.textarea} value={d.verdict} onChange={(e) => update(i, { verdict: e.target.value })} />
                    <label style={S.label}>Description (editable)</label>
                    <textarea style={S.textarea} value={d.description} onChange={(e) => update(i, { description: e.target.value })} />

                    <label style={S.label}>Slug (editable)</label>
                    <input style={S.input} value={d.slug} onChange={(e) => update(i, { slug: e.target.value })} />

                    {d.priceNote && <p style={S.priceNote}>Price check: {d.priceNote}</p>}

                    <label style={S.label}>Starting price in dollars (e.g. 72 for $72 — leave blank if none)</label>
                    <input style={S.input} value={d.startingPriceDollars} onChange={(e) => update(i, { startingPriceDollars: e.target.value })} />

                    <label style={S.label}>Currency</label>
                    <select style={S.input} value={d.currency} onChange={(e) => update(i, { currency: e.target.value })}>
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                    </select>

                    <label style={S.label}>Pricing model</label>
                    <select style={S.input} value={d.pricingModel} onChange={(e) => update(i, { pricingModel: e.target.value })}>
                      <option value="">(none)</option>
                      <option value="freemium">Freemium</option>
                      <option value="subscription">Subscription</option>
                      <option value="free">Free</option>
                      <option value="one-time">One-time</option>
                      <option value="paid">Paid</option>
                    </select>

                    <label style={S.label}>Pros (one per line)</label>
                    <textarea style={S.textarea} value={d.pros} onChange={(e) => update(i, { pros: e.target.value })} />

                    <label style={S.label}>Cons (one per line)</label>
                    <textarea style={S.textarea} value={d.cons} onChange={(e) => update(i, { cons: e.target.value })} />

                    <label style={S.label}>Key features (one per line)</label>
                    <textarea style={S.textarea} value={d.features} onChange={(e) => update(i, { features: e.target.value })} />

                    <label style={S.label}>Use cases / who it's for (one per line)</label>
                    <textarea style={S.textarea} value={d.useCases} onChange={(e) => update(i, { useCases: e.target.value })} />
                    <label style={S.label}>FAQs (Q: question / A: answer, blank line between)</label>
                    <textarea style={S.textarea} value={d.faqs} onChange={(e) => update(i, { faqs: e.target.value })} />
                    <button style={S.secondary} onClick={() => generateFaqs(i)} disabled={!d.name}>Generate FAQs only</button>

                    <div style={S.btnRow}>
                      <button style={S.secondary} onClick={() => save(i, "draft")}>Save as draft</button>
                      <button style={S.primary} onClick={() => save(i, "publish")}>Publish now</button>
                    </div>
                  </div>
                ) : null}

                {d.status && d.status !== "generating" && d.status !== "ready" && <p style={S.status}>{d.status}</p>}
              </div>
            ))}

            <button style={S.addBtn} onClick={addRow}>+ Add another tool to the queue</button>
          </div>
        )}

        {(section === "drafts" || section === "all") && (
          <div>
            <h1 style={S.h1}>{section === "drafts" ? "Drafts" : "All tools"}</h1>
            <p style={S.muted}>
              {section === "drafts"
                ? "Tools not yet live. Click one to load it into the editor, then publish."
                : "Every tool. Click one to edit it or re-check its price."}
              {"  "}<button style={S.linkBtn} onClick={loadTools}>refresh</button>
            </p>
            {toolList &&
              toolList
                .filter((t) => (section === "drafts" ? !t.publishedAt : true))
                .map((t) => {
                  const dd = daysSince(t.priceCheckedAt);
                  const staleP = dd === null || dd >= 90;
                  return (
                    <button key={t.slug} style={S.toolRow} onClick={() => loadToolIntoEditor(t.slug)}>
                      <span>
                        {t.name}
                        {!t.publishedAt && <span style={S.draftTag}>DRAFT</span>}
                      </span>
                      <span style={{ color: staleP ? "var(--accent)" : "var(--muted)", fontSize: 13 }}>
                        {dd === null ? "never checked" : dd + " days ago"}{staleP ? "  re-check" : ""}
                      </span>
                    </button>
                  );
                })}
            {toolList && toolList.filter((t) => (section === "drafts" ? !t.publishedAt : true)).length === 0 && (
              <p style={S.muted}>{section === "drafts" ? "No drafts." : "No tools yet."}</p>
            )}
          </div>
        )}
        {section === "articles" && (
          <div>
            <h1 style={S.h1}>Articles</h1>
            <p style={S.muted}>
              Generate an article from the latest creator-tool news, or from your own topic.
              Review it, then save as draft or publish. Articles link to tools you cover.
            </p>

            <h2 style={S.h2}>1. Generate from latest news</h2>
            <p style={S.muted}>Pluckly researches recent news and suggests topics, ranked by SEO potential and cross-referenced against what you cover.</p>
            <button style={S.primary} onClick={suggestTopics}>Suggest topics</button>
            {artTopics && artTopics.length > 0 && (
              <div style={S.reviewBox}>
                {artTopics.map((t, idx) => (
                  <div key={idx} style={S.card}>
                    <div style={S.rowTop}>
                      <strong>{t.title}</strong>
                      <span style={S.draftTag}>{t.coverage}</span>
                    </div>
                    <p style={S.muted}>New: {t.recency}</p>
                    <p style={S.muted}>SEO: {t.seoRationale}</p>
                    <button style={S.secondary} onClick={() => writeArticle(t.title, true)}>Write this article</button>
                  </div>
                ))}
              </div>
            )}
            {artTopics && artTopics.length === 0 && <p style={S.muted}>No topics returned. Try again.</p>}

            <h2 style={S.h2}>2. Generate from my topic</h2>
            <label style={S.label}>Topic or brief (a tool name, or what to write about)</label>
            <input style={S.input} value={artTopicInput} onChange={(e) => setArtTopicInput(e.target.value)} placeholder="e.g. Best AI video tools for YouTubers in 2026" />
            <div style={S.btnRow}>
              <button style={S.secondary} onClick={() => writeArticle(artTopicInput, true)} disabled={!artTopicInput.trim()}>Write (with research)</button>
              <button style={S.secondary} onClick={() => writeArticle(artTopicInput, false)} disabled={!artTopicInput.trim()}>Write (no research)</button>
            </div>

            {artStatus && <div style={S.status}>{artStatus}</div>}

            {artDraft.title && (
              <div style={S.card}>
                <h2 style={S.h2}>Review article</h2>
                <label style={S.label}>Title</label>
                <input style={S.input} value={artDraft.title} onChange={(e) => updateArt({ title: e.target.value })} />
                <label style={S.label}>Slug (URL)</label>
                <input style={S.input} value={artDraft.slug} onChange={(e) => updateArt({ slug: e.target.value })} />
                <label style={S.label}>Subtitle</label>
                <input style={S.input} value={artDraft.subtitle} onChange={(e) => updateArt({ subtitle: e.target.value })} />
                <label style={S.label}>Excerpt (for listings)</label>
                <textarea style={S.textarea} value={artDraft.excerpt} onChange={(e) => updateArt({ excerpt: e.target.value })} />
                <label style={S.label}>Meta description (SEO, under 155 chars)</label>
                <textarea style={S.textarea} value={artDraft.metaDescription} onChange={(e) => updateArt({ metaDescription: e.target.value })} />
                <label style={S.label}>Related tool slugs (comma separated, must be tools you cover)</label>
                <input style={S.input} value={artDraft.relatedToolSlugs} onChange={(e) => updateArt({ relatedToolSlugs: e.target.value })} />
                <label style={S.label}>Body (Markdown)</label>
                <textarea style={{ ...S.textarea, minHeight: 320 }} value={artDraft.body} onChange={(e) => updateArt({ body: e.target.value })} />
                <div style={S.btnRow}>
                  <button style={S.primary} onClick={() => saveArticle("draft")}>Save as draft</button>
                  <button style={S.primary} onClick={() => saveArticle("publish")}>Publish</button>
                </div>
              </div>
            )}

            <h2 style={S.h2}>All articles <button style={S.linkBtn} onClick={loadArticles}>refresh</button></h2>
            {articleList && articleList.length === 0 && <p style={S.muted}>No articles yet.</p>}
            {articleList && articleList.map((a) => (
              <button key={a.slug} style={S.toolRow} onClick={() => loadArticleIntoEditor(a.slug)}>
                <span>{a.title}{!a.publishedAt && <span style={S.draftTag}>DRAFT</span>}</span>
                <span style={{ color: "var(--muted)", fontSize: 13 }}>{a.publishedAt ? "published" : "draft"}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function NavItem(props: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={props.onClick} style={{ ...S.navItem, ...(props.active ? S.navItemActive : {}) }}>
      {props.label}
    </button>
  );
}

function Stat(props: { label: string; value: number; highlight?: boolean }) {
  return (
    <div style={S.statCard}>
      <div style={{ ...S.statValue, color: props.highlight ? "var(--accent)" : "var(--foreground)" }}>{props.value}</div>
      <div style={S.statLabel}>{props.label}</div>
    </div>
  );
}

const amber = "#0D9488";
const S: Record<string, React.CSSProperties> = {
  shell: { display: "flex", minHeight: "100vh", fontFamily: "Inter, system-ui, sans-serif", color: "var(--foreground)", background: "var(--background)" },
  sidebar: { width: 200, borderRight: "1px solid var(--border)", padding: "24px 12px", background: "var(--card)" },
  logo: { fontSize: 20, fontWeight: 700, color: "var(--accent)", padding: "0 12px 20px" },
  navItem: { display: "block", width: "100%", textAlign: "left", background: "none", border: "none", padding: "10px 12px", fontSize: 14, cursor: "pointer", color: "var(--muted)", fontFamily: "inherit" },
  navItemActive: { background: "var(--border)", color: "var(--foreground)", fontWeight: 600 },
  main: { flex: 1, maxWidth: 720, padding: "32px 28px" },
  gateWrap: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, system-ui, sans-serif", background: "var(--background)", color: "var(--foreground)" },
  gateCard: { width: 360, padding: 28, background: "var(--card)", border: "1px solid var(--border)" },
  h1: { fontSize: 24, fontWeight: 700, marginBottom: 6 },
  h2: { fontSize: 17, fontWeight: 700, margin: "26px 0 6px" },
  muted: { color: "var(--muted)", fontSize: 14, marginBottom: 16, lineHeight: 1.5 },
  label: { display: "block", fontSize: 13, fontWeight: 600, margin: "14px 0 4px" },
  input: { width: "100%", padding: "9px 11px", border: "1px solid var(--border)", fontSize: 14, fontFamily: "inherit", boxSizing: "border-box", background: "var(--card)", color: "var(--foreground)" },
  textarea: { width: "100%", minHeight: 110, padding: "9px 11px", border: "1px solid var(--border)", fontSize: 14, fontFamily: "inherit", boxSizing: "border-box", lineHeight: 1.5, background: "var(--card)", color: "var(--foreground)" },
  checkRow: { display: "flex", alignItems: "center", gap: 8, fontSize: 14, margin: "14px 0 4px" },
  primary: { marginTop: 16, padding: "10px 16px", background: "var(--accent)", color: "#fff", border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer" },
  secondary: { marginTop: 16, padding: "10px 16px", background: "var(--card)", color: "var(--accent)", border: "1px solid var(--accent)", fontSize: 14, fontWeight: 600, cursor: "pointer" },
  card: { border: "1px solid var(--border)", padding: 20, marginTop: 20, background: "var(--card)" },
  rowTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  reviewBox: { marginTop: 18, paddingTop: 14, borderTop: "1px dashed var(--border)" },
  priceNote: { background: "var(--cons-bg)", border: "1px solid var(--cons-border)", color: "var(--cons-text)", padding: "8px 11px", fontSize: 13, marginTop: 12 },
  btnRow: { display: "flex", gap: 12 },
  addBtn: { marginTop: 22, padding: "10px 16px", background: "var(--border)", color: "var(--foreground)", border: "1px solid var(--border)", fontSize: 14, fontWeight: 600, cursor: "pointer" },
  linkBtn: { background: "none", border: "none", color: "var(--accent)", fontSize: 13, cursor: "pointer", textDecoration: "underline", padding: 0 },
  priceRow: { display: "flex", justifyContent: "space-between", fontSize: 14, padding: "7px 0", borderBottom: "1px solid var(--border)" },
  toolRow: { display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", fontSize: 14, padding: "11px 0", borderBottom: "1px solid var(--border)", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", textAlign: "left", color: "var(--foreground)" },
  draftTag: { marginLeft: 8, fontSize: 11, fontWeight: 700, color: "#fff", background: "var(--muted)", padding: "1px 6px", borderRadius: 2 },
  status: { marginTop: 14, fontSize: 14, fontWeight: 600, color: "var(--accent)" },
  statRow: { display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" },
  statCard: { flex: 1, minWidth: 120, border: "1px solid var(--border)", padding: "16px 18px", background: "var(--card)" },
  statValue: { fontSize: 28, fontWeight: 700, color: "var(--foreground)" },
  statLabel: { fontSize: 13, color: "var(--muted)", marginTop: 4 },
};
