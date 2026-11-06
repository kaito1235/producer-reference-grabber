chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "save-reference") return;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  try {
    await chrome.tabs.sendMessage(tab.id, { type: "open-save" });
  } catch {
    // Not a YouTube/SoundCloud tab (no content script) — ignore.
  }
});
