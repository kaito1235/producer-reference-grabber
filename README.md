# Producer's Reference Grabber

A Chrome extension for music producers. While a track plays on **YouTube** or **SoundCloud**, press **Alt+S** (or click the floating **★ Ref** button) and type a note like "drum bus" or "love the sidechain". The extension saves the timestamp, title and a deep link that opens at that moment. Later you can search your notes from the toolbar popup and export them to CSV.

## Install (unpacked)
1. Open `chrome://extensions`.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and pick the `extension/` folder from this repo.
4. Pin the extension so the popup is one click away.
5. Reload any YouTube/SoundCloud tabs that were already open.

## Use
- **Save:** press Alt+S, type a note, then press Enter. Esc cancels.
- **Find:** open the popup and type in the search box. It matches notes, titles and site, and every word must match.
- **Jump back:** click an entry to open the track at the saved time.
- **Edit/delete:** click a note to edit it, or click ✕ to delete the entry.
- **Tags:** put `#words` in a note (`drum bus #drums #mix`) and they're saved as tags.
- **Library:** click **Library** in the popup to open a full page. It shows one card per track with an embedded player and all your saved moments. Click a time to jump there, edit notes, add or remove tags, and filter by tag, site or text. **Get audio** searches Bandcamp and Beatport for the track. On YouTube cards it also links to the AudioForges YouTube-to-WAV page and fills the video link into its box automatically. You still press Convert yourself. For SoundCloud it also links to the track page, where the artist's own Download button is if they've enabled it.
- **Export:** "Export CSV" exports the list as currently filtered (everything when the search is empty). It opens cleanly in Excel and Google Sheets.

## Change the shortcut
Go to `chrome://extensions/shortcuts`, or use the link in the popup footer, and rebind "Save a reference". If Alt+S clashes with another extension, Chrome may leave the shortcut unassigned until you set one there.

## Data
Everything is stored locally in `chrome.storage.local`. Your notes and tags never leave your machine. The library page loads thumbnails from YouTube, and loads YouTube or SoundCloud players when you press play.
