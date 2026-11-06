# Chrome Web Store listing: copy and paste

Upload: `dist/producer-reference-grabber-1.0.0.zip` (run `node build.mjs` first)

## Store listing tab

**Name** (from the manifest): Producer's Reference Grabber

**Summary** (from the manifest, 132 characters max):
> Save timestamped notes on YouTube & SoundCloud tracks. Tag, search, replay and export your mix references to CSV.

**Category:** Tools
**Language:** English

**Description:**
```
Hear a sidechain pump, a vocal chain or a drum sound you love in a reference track? Grab that exact moment before you forget it.

Producer's Reference Grabber saves the current timestamp, track title, link and your note from YouTube or SoundCloud in one keystroke, and keeps everything in a searchable library built for music producers.

HOW IT WORKS
• Press Alt+S (or click the ★ Ref button) while a track plays
• Type a note like "love the sidechain at the drop #drums #mix"
• Press Enter. Done. Your note is saved at that exact time

FIND IT AGAIN
• Search your notes, titles and #tags from the toolbar popup
• Open the Library: one card per track with all your saved moments
• Click any timestamp to replay that exact moment in an embedded player
• Filter by tag, site or text, and sort by date, title or most moments
• Edit notes and tags any time

EXPORT
• Export everything (or just your filtered results) to CSV for Excel or Google Sheets

PRIVATE BY DESIGN
• Everything is stored locally in your browser
• No accounts, no tracking, no analytics, no ads

Works on youtube.com and soundcloud.com. You can change the shortcut at chrome://extensions/shortcuts.
```

**Graphic assets:**
- Store icon (128×128): `extension/icons/icon128.png`
- Screenshots (1280×800): `store/screenshot-1-library.png`, `store/screenshot-2-save.png`, `store/screenshot-3-popup.png`
- Small promo tile (440×280): `store/promo-small.png`

**Additional fields:**
- Homepage URL: https://github.com/kaito1235/producer-reference-grabber
- Support URL: https://github.com/kaito1235/producer-reference-grabber/issues

## Privacy practices tab

**Single purpose:**
> Save timestamped notes about tracks playing on YouTube and SoundCloud, and let the user search, tag, replay and export those notes.

**Permission justifications:**
- **storage:** Stores the user's saved references (title, link, timestamp, note, tags) locally on their device so they can search and export them.
- **Host permissions (youtube.com, soundcloud.com):** The content script reads the current playback time and track title when the user presses the save shortcut or button, and shows the note box on those pages. It doesn't run anywhere else.

**Remote code:** No, I am not using remote code.

**Data usage:** tick **Website content** (track titles and links the user chooses to save). Tick nothing else.
Then tick all three certifications:
- I do not sell or transfer user data to third parties…
- I do not use or transfer user data for purposes unrelated to the item's single purpose…
- I do not use or transfer user data to determine creditworthiness…

**Privacy policy URL:**
https://github.com/kaito1235/producer-reference-grabber/blob/main/PRIVACY.md

## Distribution tab
- Visibility: **Public**
- Regions: All regions
- Pricing: Free
