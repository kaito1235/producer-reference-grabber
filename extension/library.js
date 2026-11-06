const { el } = RG;
const $ = (s) => document.querySelector(s);

const state = {
  refs: [],
  selectedTags: new Set(),

};

// ---------- data ----------
async function persist() {

  await RG.save(state.refs);
}

function filteredMoments() {
  const terms = RG.terms($("#search").value);
  const site = $("#site").value;
  return state.refs.filter(
    (r) =>
      (!site || r.site === site) &&
      [...state.selectedTags].every((t) => r.tags.includes(t)) &&
      RG.matchesText(r, terms)
  );
}

function groupTracks(moments) {
  const groups = new Map();
  for (const r of moments) {
    const k = RG.trackKey(r);
    if (!groups.has(k)) groups.set(k, { key: k, site: r.site, title: r.title, url: RG.trackUrl(r), moments: [] });
    groups.get(k).moments.push(r);
  }
  const list = [...groups.values()];
  for (const g of list) {
    g.moments.sort((a, b) => a.seconds - b.seconds);
    g.latest = g.moments.reduce((m, r) => (r.createdAt > m ? r.createdAt : m), "");
    g.earliest = g.moments.reduce((m, r) => (r.createdAt < m ? r.createdAt : m), "￿");
    g.total = state.refs.filter((r) => RG.trackKey(r) === g.key).length;
  }
  const sort = $("#sort").value;
  const by = {
    recent: (a, b) => b.latest.localeCompare(a.latest),
    oldest: (a, b) => a.earliest.localeCompare(b.earliest),
    title: (a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }),
    count: (a, b) => b.total - a.total || b.latest.localeCompare(a.latest),
  }[sort];
  return list.sort(by);
}

// ---------- players ----------
function loadPlayer(box, group, seconds, autoplay = true) {
  box.textContent = "";
  let iframe;
  if (group.site === "youtube") {
    const id = RG.ytId(group.url);
    const params = new URLSearchParams({ start: String(seconds), rel: "0", modestbranding: "1" });
    if (autoplay) params.set("autoplay", "1");
    iframe = el("iframe", {
      src: `https://www.youtube.com/embed/${id}?${params}`,
      allow: "autoplay; encrypted-media; picture-in-picture; fullscreen",
      allowFullscreen: true,
      title: group.title,
    });
    iframe.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
  } else {
    const params = new URLSearchParams({
      url: group.url,
      auto_play: String(autoplay),
      color: "#ff5a1f",
      visual: "false",
      show_comments: "false",
      hide_related: "true",
    });
    iframe = el("iframe", { src: `https://w.soundcloud.com/player/?${params}`, allow: "autoplay", title: group.title });
    if (seconds > 0) {
      // The widget ignores commands until it's ready, so retry the seek a few times after load.
      iframe.addEventListener("load", () => {
        for (const delay of [700, 1500, 2600]) setTimeout(() => scSeek(iframe, seconds), delay);
      }, { once: true });
    }
  }
  box.append(iframe);
  box.dataset.loaded = "1";
}

function scSeek(iframe, seconds) {
  const send = (msg) => iframe.contentWindow?.postMessage(JSON.stringify(msg), "https://w.soundcloud.com");
  send({ method: "seekTo", value: seconds * 1000 });
  send({ method: "play" });
}

function jumpTo(box, group, seconds) {
  const iframe = box.querySelector("iframe");
  if (group.site === "soundcloud" && iframe) scSeek(iframe, seconds);
  else loadPlayer(box, group, seconds); // YouTube: reload the embed at the new start time (reliable, no API script)
}

function poster(group) {
  const first = group.moments[0];
  if (group.site === "youtube") {
    const id = RG.ytId(group.url);
    const b = el("button", { class: "poster", title: `Play from ${first.timestamp}` }, el("span", { class: "play" }));
    b.style.backgroundImage = `url("https://i.ytimg.com/vi/${id}/hqdefault.jpg")`;
    return b;
  }
  return el(
    "button",
    { class: "poster sc-poster", title: `Play from ${first.timestamp}` },
    el("span", { class: "play" }),
    el("span", { class: "sc-label" }, group.title)
  );
}

// ---------- "Get audio" ----------
// The converter link only appears when audioforges.js is in the manifest. The Chrome Web Store
// build (build.mjs) removes it, because store policy doesn't allow YouTube download helpers.
const HAS_CONVERTER = (chrome.runtime.getManifest?.().content_scripts || []).some((c) =>
  c.js.includes("audioforges.js")
);
function cleanTitle(t) {
  return t
    .replace(/[([](official|lyric|lyrics|audio|video|music video|visualizer|hd|4k|free download)[^)\]]*[)\]]/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getAudioMenu(group) {
  const q = encodeURIComponent(cleanTitle(group.title));
  const links = [
    ["Bandcamp", `https://bandcamp.com/search?q=${q}`, "WAV/FLAC, artist gets paid"],
    ["Beatport", `https://www.beatport.com/search?q=${q}`, "WAV/AIFF, electronic music"],
  ];
  if (group.site === "youtube" && HAS_CONVERTER) {
    // sendUrl: hand the video link to audioforges.js (via storage), which fills it into the converter's box.
    links.push(["AudioForges YouTube → WAV", "https://www.audioforges.com/youtube-to-wav", "link is filled in for you", true]);
  }
  if (group.site === "soundcloud") {
    links.unshift(["SoundCloud track page", group.url, "use Download if the artist enabled it"]);
  }
  return el(
    "details",
    { class: "get" },
    el("summary", {}, "Get audio ▾"),
    el(
      "div",
      { class: "menu" },
      links.map(([name, href, sub, sendUrl]) =>
        el(
          "a",
          {
            href,
            target: "_blank",
            rel: "noopener noreferrer",
            onclick: sendUrl
              ? (e) => {
                  // Store the link before the tab opens, so the page's script finds it.
                  e.preventDefault();
                  navigator.clipboard.writeText(group.url).catch(() => {}); // fallback if autofill fails
                  chrome.storage.local
                    .set({ pendingConvert: { url: group.url, at: Date.now() } })
                    .then(() => chrome.tabs.create({ url: href }));
                }
              : null,
          },
          `${name} `,
          el("span", { class: "more" }, `· ${sub}`)
        )
      ),
      el("small", {}, "Store links search for this track by title.")
    )
  );
}

// ---------- rendering ----------
function tagChip(tag, { onRemove } = {}) {
  const chip = el("span", { class: "chip", title: `Filter by #${tag}` }, `#${tag}`);
  chip.addEventListener("click", () => toggleTag(tag));
  if (onRemove) {
    chip.append(
      el("button", {
        class: "x",
        title: `Remove #${tag}`,
        textContent: "×",
        onclick: (e) => {
          e.stopPropagation();
          onRemove();
        },
      })
    );
  }
  return chip;
}

function renderMomentTags(wrap, r) {
  wrap.textContent = "";
  for (const t of r.tags) {
    wrap.append(
      tagChip(t, {
        onRemove: async () => {
          r.tags = r.tags.filter((x) => x !== t);
          await persist();
          renderMomentTags(wrap, r);
          renderSidebar();
        },
      })
    );
  }
  const input = el("input", { class: "tag-input", placeholder: "+ tag", maxLength: 30 });
  const add = async () => {
    const tags = input.value.split(/[,\s]+/).map(RG.normTag).filter(Boolean);
    if (!tags.length) return;
    r.tags = [...new Set([...r.tags, ...tags])];
    await persist();
    renderMomentTags(wrap, r);
    renderSidebar();
    wrap.querySelector(".tag-input").focus();
  };
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      add();
    }
  });
  input.addEventListener("blur", () => input.value.trim() && add());
  wrap.append(input);
}

function renderMoment(r, box, group) {
  const tagsWrap = el("div", { class: "moment-tags" });
  renderMomentTags(tagsWrap, r);

  const note = el("input", { class: "note", value: r.note, placeholder: "add a note…" });
  note.addEventListener("keydown", (e) => e.key === "Enter" && note.blur());
  note.addEventListener("change", async () => {
    r.note = note.value.trim();
    await persist();
  });

  const li = el(
    "li",
    { class: "moment" },
    el("button", {
      class: "ts",
      title: "Play from here",
      textContent: r.timestamp,
      onclick: () => {
        box.closest(".card").querySelectorAll(".moment.playing").forEach((m) => m.classList.remove("playing"));
        li.classList.add("playing");
        jumpTo(box, group, r.seconds);
      },
    }),
    el(
      "div",
      { class: "moment-main" },
      note,
      tagsWrap,
      el("span", { class: "moment-date" }, `saved ${new Date(r.createdAt).toLocaleString()}`)
    ),
    el("button", { class: "del", title: "Delete this moment", textContent: "✕", onclick: () => removeMoment(r) })
  );
  return li;
}

function renderCard(group) {
  const box = el("div", { class: `player ${group.site === "youtube" ? "yt" : "sc"}` });
  const p = poster(group);
  p.addEventListener("click", () => loadPlayer(box, group, group.moments[0].seconds));
  box.append(p);

  const hidden = group.total - group.moments.length;
  return el(
    "article",
    { class: "card" },
    box,
    el(
      "div",
      { class: "card-body" },
      el(
        "div",
        { class: "card-title" },
        el("span", { class: `badge ${group.site}` }, group.site === "youtube" ? "YouTube" : "SoundCloud"),
        el("a", { href: group.url, target: "_blank", rel: "noopener", title: group.title }, group.title)
      ),
      el("ul", { class: "moments" }, group.moments.map((r) => renderMoment(r, box, group))),
      hidden > 0 ? el("span", { class: "more" }, `+ ${hidden} more moment${hidden > 1 ? "s" : ""} hidden by filters`) : null,
      el(
        "div",
        { class: "card-foot" },
        el(
          "a",
          { class: "btn", href: group.moments[0].url, target: "_blank", rel: "noopener" },
          `Open at ${group.moments[0].timestamp} ↗`
        ),
        getAudioMenu(group)
      )
    )
  );
}

function renderSidebar() {
  const counts = new Map();
  for (const r of state.refs) for (const t of r.tags) counts.set(t, (counts.get(t) || 0) + 1);
  for (const t of state.selectedTags) if (!counts.has(t)) state.selectedTags.delete(t);

  const wrap = $("#tags");
  wrap.textContent = "";
  const sorted = [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  if (!sorted.length) wrap.append(el("span", { class: "more" }, "No tags yet."));
  for (const [t, n] of sorted) {
    const chip = el("span", { class: "chip" + (state.selectedTags.has(t) ? " on" : "") }, `#${t} `, el("span", { class: "n" }, n));
    chip.addEventListener("click", () => toggleTag(t));
    wrap.append(chip);
  }
  $("#clear-tags").hidden = state.selectedTags.size === 0;

  const tracks = new Set(state.refs.map(RG.trackKey)).size;
  $("#stats").textContent = `${state.refs.length} moment${state.refs.length === 1 ? "" : "s"} across ${tracks} track${tracks === 1 ? "" : "s"}`;
}

function render() {
  renderSidebar();
  const moments = filteredMoments();
  const groups = groupTracks(moments);
  const cards = $("#cards");
  cards.textContent = "";
  for (const g of groups) cards.append(renderCard(g));

  const filtering = $("#search").value || $("#site").value || state.selectedTags.size;
  $("#summary").textContent = filtering
    ? `${moments.length} matching moment${moments.length === 1 ? "" : "s"} in ${groups.length} track${groups.length === 1 ? "" : "s"}`
    : "";
  const empty = $("#empty");
  empty.hidden = groups.length > 0;
  empty.textContent = state.refs.length
    ? "Nothing matches these filters."
    : "Nothing saved yet. Play something on YouTube or SoundCloud and press Alt+S.";
}

function toggleTag(t) {
  state.selectedTags.has(t) ? state.selectedTags.delete(t) : state.selectedTags.add(t);
  render();
}

// ---------- delete with undo ----------
let undoTimer;
async function removeMoment(r) {
  const index = state.refs.indexOf(r);
  state.refs.splice(index, 1);
  await persist();
  render();
  const toast = $("#toast");
  toast.querySelector("span").textContent = `Deleted ${r.timestamp} from "${r.title.slice(0, 40)}"`;
  toast.hidden = false;
  $("#undo").onclick = async () => {
    state.refs.splice(index, 0, r);
    await persist();
    toast.hidden = true;
    render();
  };
  clearTimeout(undoTimer);
  undoTimer = setTimeout(() => (toast.hidden = true), 6000);
}

// ---------- wiring ----------
let searchTimer;
$("#search").addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(render, 120);
});
$("#site").addEventListener("change", render);
$("#sort").addEventListener("change", render);
$("#clear-tags").addEventListener("click", () => {
  state.selectedTags.clear();
  render();
});
$("#export").addEventListener("click", () => RG.downloadCsv(filteredMoments().sort((a, b) => b.createdAt.localeCompare(a.createdAt))));
document.addEventListener("click", (e) => {
  // close any open "Get audio" menu when clicking elsewhere
  document.querySelectorAll("details.get[open]").forEach((d) => !d.contains(e.target) && d.removeAttribute("open"));
});

chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area !== "local" || !changes.refs) return;
  // Ignore echoes of our own writes; only re-render for saves made elsewhere (e.g. Alt+S in another tab).
  if (JSON.stringify(changes.refs.newValue || []) === JSON.stringify(state.refs)) return;
  state.refs = await RG.load();
  if (!document.activeElement?.matches("input:not(#search)")) render();
});

(async () => {
  const params = new URLSearchParams(location.search);
  if (params.get("q")) $("#search").value = params.get("q");
  state.refs = await RG.load();
  render();
})();
