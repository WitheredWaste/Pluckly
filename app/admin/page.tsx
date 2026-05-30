"use client";

import { useState } from "react";

type Draft = {
  name: string;
  websiteUrl: string;
  roughPrice: string;
  hasFreeOption: boolean;
  categories: string;
  tagline: string;
  description: string;
  slug: string;
  priceNote: string;
  startingPriceCents: string;
  status: string;
};

const BLANK: Draft = {
  name: "",
  websiteUrl: "",
  roughPrice: "",
  hasFreeOption: false,
  categories: "",
  tagline: "",
  description: "",
  slug: "",
  priceNote: "",
  startingPriceCents: "",
  status: "",
};

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [queue, setQueue] = useState<Draft[]>([{ ...BLANK }]);
  const [priceList, setPriceList] = useState<
    { name: string; slug: string; priceCheckedAt: string | null; publishedAt: string | null }[] | null
  >(null);

  async function loadPriceList() {
    try {
      const res = await fetch("/api/admin/list", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-password": password },
      });
      const data = await res.json();
      if (res.ok) setPriceList(data.tools || []);
    } catch {
    }
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
        headers: { "Content-Type": "application/json", "x-admin-password": password },
        body: JSON.stringify({
          name: d.name,
          websiteUrl: d.websiteUrl,
          roughPrice: d.roughPrice,
          hasFreeOption: d.hasFreeOption,
          categories: d.categories.split(",").map((s) => s.trim()).filter(Boolean),
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
        headers: { "Content-Type": "application/json", "x-admin-password": password },
        body: JSON.stringify({
          name: d.name,
          slug: d.slug,
          tagline: d.tagline,
          description: d.description,
          websiteUrl: d.websiteUrl,
          startingPriceCents: d.startingPriceCents,
          hasFreeOption: d.hasFreeOption,
          categorySlugs: d.categories.split(",").map((s) => s.trim()).filter(Boolean),
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
          <button style={S.primary} onClick={() => setUnlocked(true)}>
            Enter
          </button>
          <p style={S.tiny}>
            The password is only checked when you generate or save. A wrong password
            will simply return an error then.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <h1 style={S.h1}>Content tool</h1>
      <p style={S.muted}>
        Type the facts for each tool, generate the writing, review it, then save as
        draft or publish. Always verify the price before publishing.
      </p>

      <div style={S.card}>
        <div style={S.rowTop}>
          <strong>Price check list</strong>
          <button style={S.linkBtn} onClick={loadPriceList}>
            {priceList ? "refresh" : "load tools"}
          </button>
        </div>
        <p style={S.muted}>
          Shows when each tool&apos;s price was last verified. Anything 90+ days old
          (or never checked) is flagged for re-checking.
        </p>
        {priceList && priceList.length === 0 && <p style={S.muted}>No tools yet.</p>}
        {priceList &&
          priceList.map((t) => {
            const d = daysSince(t.priceCheckedAt);
            const stale = d === null || d >= 90;
            return (
              <div key={t.slug} style={S.priceRow}>
                <span>{t.name}{!t.publishedAt && <span style={{marginLeft:8,fontSize:11,fontWeight:700,color:"#fff",background:"#a8a29e",padding:"1px 6px",borderRadius:2}}>DRAFT</span>}</span>
                <span style={{ color: stale ? "#b45309" : "#78716c", fontWeight: stale ? 700 : 400 }}>
                  {d === null ? "never checked" : `${d} days ago`}
                  {stale ? "  \u26a0 re-check" : ""}
                </span>
              </div>
            );
          })}
      </div>

      {queue.map((d, i) => (
        <div key={i} style={S.card}>
          <div style={S.rowTop}>
            <strong>Tool {i + 1}</strong>
            {queue.length > 1 && (
              <button style={S.linkBtn} onClick={() => removeRow(i)}>
                remove
              </button>
            )}
          </div>

          <label style={S.label}>Tool name</label>
          <input style={S.input} value={d.name} onChange={(e) => update(i, { name: e.target.value })} />

          <label style={S.label}>Website URL</label>
          <input style={S.input} value={d.websiteUrl} onChange={(e) => update(i, { websiteUrl: e.target.value })} />

          <label style={S.label}>Rough price (e.g. "$15/mo")</label>
          <input style={S.input} value={d.roughPrice} onChange={(e) => update(i, { roughPrice: e.target.value })} />

          <label style={S.checkRow}>
            <input
              type="checkbox"
              checked={d.hasFreeOption}
              onChange={(e) => update(i, { hasFreeOption: e.target.checked })}
            />
            Has a free option
          </label>

          <label style={S.label}>Category slugs (comma separated, e.g. email-marketing, scheduling)</label>
          <input style={S.input} value={d.categories} onChange={(e) => update(i, { categories: e.target.value })} />

          <button style={S.primary} onClick={() => generate(i)} disabled={!d.name}>
            Generate writing
          </button>

          {d.status === "generating" && <p style={S.muted}>Generating...</p>}

          {d.tagline || d.description ? (
            <div style={S.reviewBox}>
              <label style={S.label}>Tagline (editable)</label>
              <input style={S.input} value={d.tagline} onChange={(e) => update(i, { tagline: e.target.value })} />

              <label style={S.label}>Description (editable)</label>
              <textarea
                style={S.textarea}
                value={d.description}
                onChange={(e) => update(i, { description: e.target.value })}
              />

              <label style={S.label}>Slug (editable)</label>
              <input style={S.input} value={d.slug} onChange={(e) => update(i, { slug: e.target.value })} />

              {d.priceNote && (
                <p style={S.priceNote}>Price check: {d.priceNote}</p>
              )}

              <label style={S.label}>
                Verified price in cents (e.g. 1500 for $15.00 — leave blank if none)
              </label>
              <input
                style={S.input}
                value={d.startingPriceCents}
                onChange={(e) => update(i, { startingPriceCents: e.target.value })}
              />

              <div style={S.btnRow}>
                <button style={S.secondary} onClick={() => save(i, "draft")}>
                  Save as draft
                </button>
                <button style={S.primary} onClick={() => save(i, "publish")}>
                  Publish now
                </button>
              </div>
            </div>
          ) : null}

          {d.status &&
            d.status !== "generating" &&
            d.status !== "ready" && <p style={S.status}>{d.status}</p>}
        </div>
      ))}

      <button style={S.addBtn} onClick={addRow}>
        + Add another tool to the queue
      </button>
    </div>
  );
}

const amber = "#b45309";
const S: Record<string, React.CSSProperties> = {
  page: { maxWidth: 720, margin: "0 auto", padding: "32px 20px", fontFamily: "Inter, system-ui, sans-serif", color: "#1c1917" },
  gateWrap: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, system-ui, sans-serif", background: "#faf9f7" },
  gateCard: { width: 360, padding: 28, background: "#fff", border: "1px solid #e7e5e4" },
  h1: { fontSize: 24, fontWeight: 700, marginBottom: 6 },
  muted: { color: "#78716c", fontSize: 14, marginBottom: 16, lineHeight: 1.5 },
  tiny: { color: "#a8a29e", fontSize: 12, marginTop: 12, lineHeight: 1.5 },
  label: { display: "block", fontSize: 13, fontWeight: 600, margin: "14px 0 4px" },
  input: { width: "100%", padding: "9px 11px", border: "1px solid #d6d3d1", fontSize: 14, fontFamily: "inherit", boxSizing: "border-box" },
  textarea: { width: "100%", minHeight: 110, padding: "9px 11px", border: "1px solid #d6d3d1", fontSize: 14, fontFamily: "inherit", boxSizing: "border-box", lineHeight: 1.5 },
  checkRow: { display: "flex", alignItems: "center", gap: 8, fontSize: 14, margin: "14px 0 4px" },
  primary: { marginTop: 16, padding: "10px 16px", background: amber, color: "#fff", border: "none", fontSize: 14, fontWeight: 600, cursor: "pointer" },
  secondary: { marginTop: 16, padding: "10px 16px", background: "#fff", color: amber, border: `1px solid ${amber}`, fontSize: 14, fontWeight: 600, cursor: "pointer" },
  card: { border: "1px solid #e7e5e4", padding: 20, marginTop: 20, background: "#fff" },
  rowTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  reviewBox: { marginTop: 18, paddingTop: 14, borderTop: "1px dashed #d6d3d1" },
  priceNote: { background: "#fef3c7", border: "1px solid #fde68a", padding: "8px 11px", fontSize: 13, marginTop: 12 },
  btnRow: { display: "flex", gap: 12 },
  addBtn: { marginTop: 22, padding: "10px 16px", background: "#f5f5f4", border: "1px solid #d6d3d1", fontSize: 14, fontWeight: 600, cursor: "pointer" },
  linkBtn: { background: "none", border: "none", color: "#a8a29e", fontSize: 13, cursor: "pointer", textDecoration: "underline" },
  priceRow: { display: "flex", justifyContent: "space-between", fontSize: 14, padding: "7px 0", borderBottom: "1px solid #f5f5f4" },
  status: { marginTop: 14, fontSize: 14, fontWeight: 600, color: amber },
};
