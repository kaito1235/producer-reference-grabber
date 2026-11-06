const $ = (sel) => document.querySelector(sel);
const { el } = RG;
const listEl = $("#list");
const searchEl = $("#search");
const emptyEl = $("#empty");
const countEl = $("#count");

let refs = [];

async function load() {
  refs = await RG.load();
  render();
}

function filtered() {
  const terms = RG.terms(searchEl.value);
  return [...refs]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .filter((r) => RG.matchesText(r, terms));
}

function highlight(target, text, terms) {
  target.textContent = "";
  if (!terms.length) return void (target.textContent = text);
  const re = new RegExp(`(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
  for (const part of text.split(re)) {
    if (!part) continue;
    target.append(terms.includes(part.toLowerCase()) ? el("mark", {}, part) : part);
  }
}

function render() {
  const items = filtered();
  const terms = RG.terms(searchEl.value);
  listEl.textContent = "";
  countEl.textContent = searchEl.value ? `${items.length} / ${refs.length}` : `${refs.length} saved`;

  for (const r of items) {
    const title = el("div", { class: "title" });
    highlight(title, r.title, terms);

    const note = el("input", { class: "note", value: r.note, placeholder: "add a note…" });
    note.addEventListener("click", (e) => e.stopPropagation());
    note.addEventListener("keydown", (e) => e.key === "Enter" && note.blur());
    note.addEventListener("change", () => {
      r.note = note.value.trim();
      RG.save(refs);
    });

    const tags = r.tags.length
      ? el("div", { class: "tags" }, r.tags.map((t) => el("span", { class: "tag" }, `#${t}`)))
      : null;

    const li = el(
      "li",
      { title: r.url },
      el("div", { class: "ts" }, r.timestamp, el("span", { class: "site" }, r.site)),
      el("div", { class: "body" }, title, note, tags, el("div", { class: "date" }, new Date(r.createdAt).toLocaleString())),
      el("button", {
        class: "del",
        textContent: "✕",
        title: "Delete",
        onclick: (e) => {
          e.stopPropagation();
          refs = refs.filter((x) => x.id !== r.id);
          RG.save(refs);
          render();
        },
      })
    );
    li.addEventListener("click", () => chrome.tabs.create({ url: r.url }));
    listEl.appendChild(li);
  }

  emptyEl.hidden = items.length > 0;
  emptyEl.textContent = refs.length
    ? "No matches."
    : "Nothing saved yet. Play something on YouTube or SoundCloud and press Alt+S.";
}

searchEl.addEventListener("input", render);
$("#export").addEventListener("click", () => RG.downloadCsv(filtered()));
$("#library").addEventListener("click", () => {
  const q = searchEl.value.trim();
  chrome.tabs.create({ url: chrome.runtime.getURL("library.html") + (q ? `?q=${encodeURIComponent(q)}` : "") });
});
$("#shortcuts").addEventListener("click", (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: "chrome://extensions/shortcuts" });
});
chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area === "local" && changes.refs && document.activeElement?.className !== "note") {
    refs = await RG.load();
    render();
  }
});

load();
