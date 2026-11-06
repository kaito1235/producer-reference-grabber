// Runs only on audioforges.com/youtube-to-wav. If the library just sent a video here,
// fill its link into the converter's URL box. It never clicks Convert; that's left to you.
(async () => {
  const { pendingConvert } = await chrome.storage.local.get("pendingConvert");
  if (!pendingConvert?.url) return;
  await chrome.storage.local.remove("pendingConvert");
  if (Date.now() - pendingConvert.at > 2 * 60 * 1000) return; // stale (more than 2 minutes old), ignore

  const fill = (input) => {
    // The site is a React app: set the value through the native setter, then fire input/change
    // so it registers the link (its button switches to "Convert to WAV").
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(input, pendingConvert.url);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    input.focus({ preventScroll: true });
    input.scrollIntoView({ block: "center", behavior: "smooth" });
  };

  const find = () => document.getElementById("youtube-url") || document.querySelector('input[type="url"]');
  const now = find();
  if (now) return fill(now);

  // The box may render a moment after load: watch for it for up to 15 seconds.
  const obs = new MutationObserver(() => {
    const input = find();
    if (input) {
      obs.disconnect();
      fill(input);
    }
  });
  obs.observe(document.documentElement, { childList: true, subtree: true });
  setTimeout(() => obs.disconnect(), 15000);
})();
