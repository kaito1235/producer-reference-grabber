// Producer's Reference Grabber — content script (YouTube + SoundCloud)
(() => {
  if (window.__refGrabberLoaded) return;
  window.__refGrabberLoaded = true;

  const SITE = location.hostname.includes("soundcloud.com") ? "soundcloud" : "youtube";

  // ---------- time helpers ----------
  const fmt = (secs) => {
    secs = Math.max(0, Math.floor(secs || 0));
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = String(secs % 60).padStart(2, "0");
    return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
  };
  const parseTime = (str) => {
    const parts = (str || "").trim().split(":").map(Number);
    if (!parts.length || parts.some(isNaN)) return null;
    return parts.reduce((acc, n) => acc * 60 + n, 0);
  };

  // ---------- player readers ----------
  function readYouTube() {
    const video = document.querySelector("video.html5-main-video") || document.querySelector("video");
    const url = new URL(location.href);
    let id = url.searchParams.get("v");
    if (!id) {
      const m = url.pathname.match(/^\/(?:shorts|live)\/([\w-]+)/);
      if (m) id = m[1];
    }
    if (!video || !id) return null;
    const titleEl =
      document.querySelector("h1.ytd-watch-metadata yt-formatted-string") ||
      document.querySelector("h1.ytd-watch-metadata");
    const title =
      titleEl?.textContent.trim() || document.title.replace(/^\(\d+\)\s*/, "").replace(/\s*-\s*YouTube$/, "");
    const seconds = Math.floor(video.currentTime);
    return {
      title,
      seconds,
      url: `https://www.youtube.com/watch?v=${id}&t=${seconds}s`,
    };
  }

  function readSoundCloud() {
    const timeEl =
      document.querySelector('.playbackTimeline__timePassed span[aria-hidden="true"]') ||
      document.querySelector(".playbackTimeline__timePassed span:last-child");
    const link = document.querySelector("a.playbackSoundBadge__titleLink");
    if (!timeEl || !link) return null;
    const seconds = parseTime(timeEl.textContent) ?? 0;
    const title =
      link.getAttribute("title") ||
      link.textContent.trim() ||
      document.title.replace(/\s*\|.*$/, "");
    const artist = document.querySelector(".playbackSoundBadge__lightLink")?.getAttribute("title");
    const base = new URL(link.getAttribute("href"), location.origin);
    base.search = "";
    base.hash = "";
    return {
      title: artist && !title.includes(artist) ? `${artist} – ${title}` : title,
      seconds,
      url: `${base.href}#t=${fmt(seconds)}`,
    };
  }

  const readPlayer = () => (SITE === "youtube" ? readYouTube() : readSoundCloud());

  // ---------- storage ----------
  async function saveRef(info, note) {
    const { refs = [] } = await chrome.storage.local.get("refs");
    refs.push({
      id: crypto.randomUUID(),
      site: SITE,
      title: info.title || "(untitled)",
      url: info.url,
      seconds: info.seconds,
      timestamp: fmt(info.seconds),
      // "#drums #mix" in the note become tags; the rest stays as the note text.
      tags: [...new Set((note.match(/#[\w-]+/g) || []).map((t) => t.slice(1).toLowerCase()))],
      note: note.replace(/#[\w-]+/g, "").replace(/\s{2,}/g, " ").trim(),
      createdAt: new Date().toISOString(),
    });
    await chrome.storage.local.set({ refs });
  }

  // ---------- UI (Shadow DOM) ----------
  let host, root, overlay, toastTimer;

  function ensureUI() {
    if (host && document.documentElement.contains(host)) return;
    host = document.createElement("div");
    host.id = "ref-grabber-host";
    host.style.cssText = "all:initial;position:fixed;z-index:2147483647;top:0;left:0;";
    root = host.attachShadow({ mode: "open" });
    root.innerHTML = `
      <style>
        * { box-sizing: border-box; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }
        .fab {
          position: fixed; right: 20px; bottom: 90px;
          background: #ff5a1f; color: #fff; border: none; border-radius: 999px;
          padding: 8px 14px; font-size: 13px; font-weight: 600; cursor: pointer;
          box-shadow: 0 4px 14px rgba(0,0,0,.35); opacity: .85;
        }
        .fab:hover { opacity: 1; }
        .overlay {
          position: fixed; right: 20px; bottom: 140px; width: 340px;
          background: #1b1b1f; color: #eee; border: 1px solid #333; border-radius: 12px;
          padding: 14px; box-shadow: 0 10px 30px rgba(0,0,0,.5); display: none;
        }
        .overlay.open { display: block; }
        .meta { font-size: 12px; color: #aaa; margin-bottom: 8px; display: flex; gap: 8px; align-items: baseline; }
        .ts { font-family: ui-monospace, Consolas, monospace; color: #ff8a5c; font-size: 15px; font-weight: 700; }
        .title { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; }
        input {
          width: 100%; padding: 9px 10px; font-size: 14px; border-radius: 8px;
          border: 1px solid #444; background: #111; color: #fff; outline: none;
        }
        input:focus { border-color: #ff5a1f; }
        .hint { font-size: 11px; color: #777; margin-top: 6px; }
        .warn { color: #ffb347; }
        .toast {
          position: fixed; right: 20px; bottom: 140px; background: #1f8f4e; color: #fff;
          padding: 8px 14px; border-radius: 8px; font-size: 13px; display: none;
          box-shadow: 0 4px 14px rgba(0,0,0,.35);
        }
        .toast.show { display: block; }
      </style>
      <button class="fab" title="Save reference (Alt+S)">★ Ref</button>
      <div class="overlay">
        <div class="meta"><span class="ts">0:00</span><span class="title"></span></div>
        <input type="text" placeholder="Note… e.g. drum bus sidechain #drums #mix" maxlength="500" />
        <div class="hint">Enter to save · Esc to cancel · #word adds a tag</div>
      </div>
      <div class="toast">Saved ✓</div>
    `;
    (document.body || document.documentElement).appendChild(host);

    overlay = root.querySelector(".overlay");
    const fab = root.querySelector(".fab");
    // Don't let the button take keyboard focus on click, or typed keys go to it instead of the note box.
    fab.addEventListener("mousedown", (e) => e.preventDefault());
    fab.addEventListener("click", (e) => {
      e.stopPropagation();
      overlay.classList.contains("open") ? closeOverlay() : openOverlay();
    });
  }

  // Focus the note box, retrying briefly in case the site moves focus back (SoundCloud does).
  function focusInput(input) {
    let tries = 0;
    const attempt = () => {
      if (!overlay.classList.contains("open")) return;
      if (root.activeElement !== input) input.focus({ preventScroll: true });
      if (++tries < 5) setTimeout(attempt, 40 * tries);
    };
    attempt();
  }

  async function handleInputKey(e, input) {
    if (e.key === "Escape") {
      e.preventDefault();
      closeOverlay();
    } else if (e.key === "Enter" && !e.isComposing) {
      e.preventDefault();
      const info = overlay._info;
      closeOverlay();
      try {
        await saveRef(info, input.value);
        showToast("Saved ✓");
      } catch (err) {
        showToast("Save failed — reload the page", true);
        console.error("[RefGrabber]", err);
      }
    }
  }

  // Keep site hotkeys (YouTube k/j/l/t/f, SoundCloud space, etc.) from seeing keys typed in our
  // note box. From outside the shadow root the event target looks like a plain <div>, so sites treat
  // it as a hotkey and preventDefault() it, which swallows the typed characters. This script runs at
  // document_start, so this window capture listener runs before any of the page's listeners.
  // stopImmediatePropagation still lets the default action (inserting the text) happen.
  for (const type of ["keydown", "keyup", "keypress"]) {
    window.addEventListener(
      type,
      (e) => {
        const input = root?.querySelector("input");
        if (!input || e.composedPath()[0] !== input) return;
        e.stopImmediatePropagation();
        if (type === "keydown") handleInputKey(e, input);
      },
      true
    );
  }

  function openOverlay() {
    ensureUI();
    const info =
      readPlayer() || {
        title: document.title,
        seconds: 0,
        url: location.href,
        missing: true,
      };
    overlay._info = info;
    root.querySelector(".ts").textContent = fmt(info.seconds);
    const titleEl = root.querySelector(".title");
    titleEl.textContent = info.missing ? "No player found" : info.title;
    titleEl.classList.toggle("warn", !!info.missing);
    titleEl.title = info.title;
    const input = root.querySelector("input");
    input.value = "";
    overlay.classList.add("open");
    focusInput(input);
  }

  function closeOverlay() {
    overlay?.classList.remove("open");
  }

  function showToast(text, isError) {
    const t = root.querySelector(".toast");
    t.textContent = text;
    t.style.background = isError ? "#b3261e" : "#1f8f4e";
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 1600);
  }

  // Close when clicking elsewhere on the page.
  document.addEventListener("mousedown", (e) => {
    if (overlay?.classList.contains("open") && !e.composedPath().includes(host)) closeOverlay();
  });

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type === "open-save") {
      if (overlay?.classList.contains("open")) focusInput(root.querySelector("input"));
      else openOverlay();
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ensureUI, { once: true });
  } else {
    ensureUI();
  }
})();
