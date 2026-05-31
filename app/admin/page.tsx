"use client";

import { useState } from "react";

type Draft = {
  name: string;
  websiteUrl: string;
  logoUrl: string;
  affiliateUrl: string;
  roughPrice: string;
  hasFreeOption: boolean;
  categories: string;
  tagline: string;
  description: string;
  slug: string;
  priceNote: string;
  startingPriceDollars: string;
  pricingModel: string;
  currency: string;
  pros: string;
  cons: string;
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
  description: "",
  slug: "",
  priceNote: "",
  startingPriceDollars: "",
  pricingModel: "",
  currency: "USD",
  pros: "",
  cons: "",
  features: "",
  useCases: "",
  status: "",
};

type Section = "overview" | "add" | "drafts" | "all";

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [section, setSection] = useState<Section>("overview");

  const [queue, setQueue] = useState<Draft[]>([{ ...BLANK }]);
  const [toolList, setToolList] = useState<ToolListItem[] | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loadingMsg, setLoadingMsg] = useState("");

  function authHeaders() {
    return { "Content-Type": "application/json", "x-admin-password": password };
  }

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
          description: t.description,
          slug: t.slug,
          priceNote: "",
          startingPriceDollars: t.startingPriceDollars,
          pricingModel: t.pricingModel || "",
          currency: t.currency || "USD",
          pros: t.pros || "",
          cons: t.cons || "",
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

  async function generate(i: number) {
    const d = queue[i];
    update(i, { status: "generating" });
    try {
      const res = await fetch("/api/admin/generate", {
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
        update(i, { status: data.error || "Error generating." });
        return;
      }
      const suggested = Array.isArray(data.suggestedCategories) ? data.suggestedCategories.join(", ") : d.categories;
      update(i, {
        tagline: data.tagline || "",
        description: data.description || "",
        slug: data.suggestedSlug || "",
        priceNote: data.priceNote || "",
        categories: d.categories.trim() ? d.categories : suggested,
        pricingModel: data.suggestedPricingModel || d.pricingModel,
        currency: data.suggestedCurrency || d.currency,
        pros: data.pros || "",
        cons: data.cons || "",
        features: data.features || "",
        useCases: data.useCases || "",
        status: "ready",
      });
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
            onKeyDown={(e) => e.key === "Enter" && setUnlocked(true)}
          />
          <button style={S.primary} onClick={() => setUnlocked(true)}>Enter</button>
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
                    <span style={{ fontWeight: 600, color: c.count === 0 ? "#b45309" : "#1c1917" }}>{c.count}</span>
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

                <button style={S.primary} onClick={() => generate(i)} disabled={!d.name}>Generate writing</button>

                {d.status === "generating" && <p style={S.muted}>Generating...</p>}

                {(d.tagline || d.description) ? (
                  <div style={S.reviewBox}>
                    <label style={S.label}>Tagline (editable)</label>
                    <input style={S.input} value={d.tagline} onChange={(e) => update(i, { tagline: e.target.value })} />

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
                      <span style={{ color: staleP ? "#b45309" : "#78716c", fontSize: 13 }}>
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
      <div style={{ ...S.statValue, color: props.highlight ? "#b45309" : "#1c1917" }}>{props.value}</div>
      <div style={S.statLabel}>{props.label}</div>
    </div>
  );
}

const amber = "#b45309";
const S: Record<string, React.CSSProperties> = {
  shell: { display: "flex", minHeight: "100vh", fontFamily: "Inter, system-ui, sans-serif", color: "#1c1917" },
  sidebar: { width: 200, borderRight: "1px solid #e7e5e4", padding: "24px 12px", background: "#faf9f7" },
  logo: { fontSize: 20, fontWeight: 700, color: amber, padding: "0 12px 20px" },
  navItem: { display: "block", width: "100%", textAlign: "left", background: "none", border: "none", padding: "10px 12px", fontSize: 14, cursor: "pointer", color: "#57534e", fontFamily: "inherit" },
  navItemActive: { background: "#f5f5f4", color: "#1c1917", fontWeight: 600 },
  main: { flex: 1, maxWidth: 720, padding: "32px 28px" },
  gateWrap: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, system-ui, sans-serif", background: "#faf9f7" },
  gateCard: { width: 360, padding: 28, background: "#fff", border: "1px solid #e7e5e4" },
  h1: { fontSize: 24, fontWeight: 700, marginBottom: 6 },
  h2: { fontSize: 17, fontWeight: 700, margin: "26px 0 6px" },
  muted: { color: "#78716c", fontSize: 14, marginBottom: 16, lineHeight: 1.5 },
  label: { display: "block", fontSize: 13, fontWeight: 600, margin: "14px 0 4px" },
  input: { width: "100%", padding: "9px 11px", border: "1px solid #d6d3d1", fontSize: 14, fontFamily: "inherit", boxSizing: "border-box" },
  textarea: { width: "100%", minHeight: 110, padding: "9px 11px", border: "1px solid #d6d3d1", fontSize: 14, fontFamily: "inherit", boxSizing: "border-box", lineHeight: 1.5 },
  checkRow: { display: "flex", alignItems: "center", gap: 8, fontSize: 14, margin: "14px 0 4px" },
  primary: { marginTop: 16, padding: "10px 16px", background: amber, color: "#fff", border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer" },
  secondary: { marginTop: 16, padding: "10px 16px", background: "#fff", color: amber, border: "1px solid " + amber, fontSize: 14, fontWeight: 600, cursor: "pointer" },
  card: { border: "1px solid #e7e5e4", padding: 20, marginTop: 20, background: "#fff" },
  rowTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  reviewBox: { marginTop: 18, paddingTop: 14, borderTop: "1px dashed #d6d3d1" },
  priceNote: { background: "#fef3c7", border: "1px solid #fde68a", padding: "8px 11px", fontSize: 13, marginTop: 12 },
  btnRow: { display: "flex", gap: 12 },
  addBtn: { marginTop: 22, padding: "10px 16px", background: "#f5f5f4", border: "1px solid #d6d3d1", fontSize: 14, fontWeight: 600, cursor: "pointer" },
  linkBtn: { background: "none", border: "none", color: amber, fontSize: 13, cursor: "pointer", textDecoration: "underline", padding: 0 },
  priceRow: { display: "flex", justifyContent: "space-between", fontSize: 14, padding: "7px 0", borderBottom: "1px solid #f5f5f4" },
  toolRow: { display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", fontSize: 14, padding: "11px 0", borderBottom: "1px solid #f5f5f4", background: "none", border: "none", borderBottomColor: "#f5f5f4", cursor: "pointer", fontFamily: "inherit", textAlign: "left", color: "#1c1917" },
  draftTag: { marginLeft: 8, fontSize: 11, fontWeight: 700, color: "#fff", background: "#a8a29e", padding: "1px 6px", borderRadius: 2 },
  status: { marginTop: 14, fontSize: 14, fontWeight: 600, color: amber },
  statRow: { display: "flex", gap: 12, marginTop: 16, flexWrap: "wrap" },
  statCard: { flex: 1, minWidth: 120, border: "1px solid #e7e5e4", padding: "16px 18px", background: "#fff" },
  statValue: { fontSize: 28, fontWeight: 700 },
  statLabel: { fontSize: 13, color: "#78716c", marginTop: 4 },
};
