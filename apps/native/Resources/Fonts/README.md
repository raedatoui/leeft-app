# Fonts

`Theme.swift` falls back to system faces when these files are absent, so the app builds and
runs with this folder empty — the layout is identical, the typography is not.

Drop these six files in here to match the web app. All three families are SIL Open Font
License, so bundling them in the app is fine.

| File | Family | Used for |
|---|---|---|
| `Anton-Regular.ttf` | [Anton](https://fonts.google.com/specimen/Anton) | Display — brand mark, screen titles, big buttons |
| `DMSans-Regular.ttf` | [DM Sans](https://fonts.google.com/specimen/DM+Sans) | Body copy |
| `DMSans-Medium.ttf` | DM Sans | Semibold labels |
| `DMSans-Bold.ttf` | DM Sans | List row names, bold labels |
| `JetBrainsMono-Regular.ttf` | [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono) | Numbers, tags, clocks |
| `JetBrainsMono-SemiBold.ttf` | JetBrains Mono | Set numbers, the live clock |

The filenames are load-bearing — they're listed in `UIAppFonts` in `Resources/Info.plist`
and matched by PostScript name in `Typeface`. Google Fonts ships variable TTFs whose static
instances are named like `DMSans-Regular.ttf` already; if you export from elsewhere, rename
to match.

After adding files, re-run `xcodegen` so they're picked up into the target.
