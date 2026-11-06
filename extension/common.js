// Shared helpers for popup.html and library.html
const RG = {
  async load() {
    const { refs = [] } = await chrome.storage.local.get("refs");
    return refs.map((r) => ({ tags: [], ...r }));
  },

  save(refs) {
    return chrome.storage.local.set({ refs });
  },

  normTag(t) {
    return String(t).trim().replace(/^#+/, "").toLowerCase().replace(/\s+/g, "-");
  },

  ytId(url) {
    try {
      const u = new URL(url);
      return u.searchParams.get("v") || (u.pathname.match(/^\/(?:shorts|live|embed)\/([\w-]+)/) || [])[1] || null;
    } catch {
      return null;
    }
  },

  // One key per track/video, so several saved moments group together.
  trackKey(r) {
    if (r.site === "youtube") return "yt:" + (RG.ytId(r.url) || r.url);
    return "sc:" + r.url.split("#")[0].split("?")[0];
  },

  trackUrl(r) {
    if (r.site === "youtube") return `https://www.youtube.com/watch?v=${RG.ytId(r.url)}`;
    return r.url.split("#")[0];
  },

  terms(query) {
    return query.toLowerCase().split(/\s+/).filter(Boolean);
  },

  matchesText(r, terms) {
    if (!terms.length) return true;
    const hay = `${r.note} ${r.title} ${r.site} ${(r.tags || []).map((t) => "#" + t).join(" ")}`.toLowerCase();
    return terms.every((t) => hay.includes(t));
  },

  toCsv(items) {
    const cell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const header = ["title", "timestamp", "seconds", "note", "tags", "site", "url", "saved_at"];
    const rows = items.map((r) =>
      [r.title, r.timestamp, r.seconds, r.note, (r.tags || []).join(" "), r.site, r.url, r.createdAt]
        .map(cell)
        .join(",")
    );
    return "﻿" + [header.join(","), ...rows].join("\r\n");
  },

  downloadCsv(items) {
    const blob = new Blob([RG.toCsv(items)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `producer-refs-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  },

  el(tag, props = {}, ...children) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(props)) {
      if (k === "class") e.className = v;
      else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
      else if (k in e) e[k] = v;
      else e.setAttribute(k, v);
    }
    for (const c of children.flat()) if (c != null) e.append(c);
    return e;
  },
};
