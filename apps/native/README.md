# @leeft/native

Native iOS workout editor — the `/add` flow, rebuilt in SwiftUI.

Writes to the same `lifting-workouts/{YYYY-MM-DD}` Firestore collection the web app writes
and the data pipeline reads, so nothing downstream changes. Scoped to the **editor only**:
no PR trophies, no Last/Working-max stats, no history browsing (those live in the web app).

## One-time setup

### 1. Point the command line at Xcode

The repo's tooling assumes a full Xcode, not just Command Line Tools:

```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
```

### 2. Register the iOS app in Firebase

The web app's Firebase config doesn't carry over — iOS needs its own app registration for
the OAuth client that Google sign-in uses.

1. Firebase console → project **leeft-app** → Add app → iOS
2. Bundle ID: `app.web.leeft`
3. Download `GoogleService-Info.plist` into `apps/native/Resources/`
4. Open it, copy the `REVERSED_CLIENT_ID` value, and paste it over
   `REPLACE_WITH_REVERSED_CLIENT_ID` in `Resources/Info.plist`

The plist is gitignored — it carries the OAuth client id, same reasoning as
`apps/web/.env.local`.

No Firestore rules change is needed: `apps/web/firestore.rules` already gates on the owner
email, and this app signs in as the same account.

### 3. App icon

Already in place — `Resources/Assets.xcassets/AppIcon.appiconset/AppIcon.png`, the same 🏋️
mark the desktop app and PWA use. It was derived from the 1024px slice of
`apps/web-desktop/icons/icon.icns` and **flattened onto `--bg` (#0b0a08) with the alpha
channel dropped**, which iOS app icons require — a transparent icon renders its clear areas
black on the home screen and trips an App Store validation error.

Xcode generates every derived size from this one 1024×1024 file, so there's nothing else to
maintain. To regenerate after a brand change, extract the icns and flatten:

```bash
iconutil -c iconset apps/web-desktop/icons/icon.icns -o /tmp/icon.iconset
```

Then composite `/tmp/icon.iconset/icon_512x512@2x.png` onto #0b0a08 at 1024×1024 with no
alpha and save it over `AppIcon.png`.

### 4. Fonts (optional)

Drop the TTFs into `Resources/Fonts/` — see that folder's README. Without them the app
builds and runs on system fallbacks; the layout is identical, the faces are not.

## Build

```bash
cd apps/native && xcodegen && open Leeft.xcodeproj
```

`Leeft.xcodeproj` is generated from `project.yml` and gitignored — **never hand-edit it**.
Re-run `xcodegen` after adding, moving, or renaming source files.

Signing is already wired: `DEVELOPMENT_TEAM` in `project.yml` holds the paid Developer
Program team id, so profiles last a year and `xcodegen` regens don't blank the team.

The bundle id is `app.web.leeft` — reverse-DNS on the Firebase Hosting domain. `com.leeft.app`
was registered to another team and can't be reclaimed; don't try to switch back.

## Layout

```
Sources/
  LeeftApp.swift          @main — Firebase init, environment wiring
  Theme/Theme.swift       v2 design tokens, transcribed from apps/web/src/app/v2.css
  Models/                 Draft session, exercise catalog entry, Firestore doc shape
  Services/
    AuthService.swift     Google sign-in + owner-email gate
    WorkoutStore.swift    Firestore write, read-before-write uuid preservation
    ExerciseCatalog.swift CDN fetch of the exercise catalog, disk-cached
    DraftStore.swift      File-backed autosave of the in-progress session
  State/SessionModel.swift  The session reducer
  Views/                  Readiness → live → done, plus detail/picker sheets
```

## Contracts shared with the rest of the monorepo

These are duplicated by hand, not generated. When one side moves, move the other:

| Swift | Source of truth |
|---|---|
| `LiftingWorkoutDoc` | `apps/web/src/lib/firebase.ts`, decoded by `apps/data/src/firestore/download.ts` |
| `ExerciseMetadata` | `ExerciseMetadataSchema` in `packages/types/src/index.ts` |
| `Theme` colors | The `[data-theme="v2"]` token block in `apps/web/src/app/v2.css` |
| `AuthService.ownerEmail` | `isOwner()` in `apps/web/firestore.rules` |

## Deliberate differences from the web `/add`

- **No swipe pager.** The web splits the live phase across two pager pages because its
  fixed 800px phone frame couldn't hold a list and a CTA at once. A real phone scrolls.
- **Native sheets** for exercise detail and the picker, with real interruptible
  drag-to-dismiss instead of the motion-driven approximation.
- **Long-press to reorder, swipe to delete** instead of a drag handle and a delete button.
- **No persisted UI coordinates.** The web stores which page and which sheet were open
  because iOS cold-boots a backgrounded PWA; a native app isn't evicted mid-set.
