# Persistence replacement boundary and input quarantine

## Scope / ownership

Changes are confined to `assets/scripts/journey-v11.js`, `assets/scripts/controls-v11.js`, this document, and the new `tests/emberwake-persistence-browser.mjs`. No build/server/Git/credential operations are owned by this slice. Save format and `EW_STORY_V3` / `EW_RUSH_V3` namespaces remain unchanged. Native file input capture, confirmation actions, import cancellation, rolling-backup restore, export and milestones remain in place.

**Parent dependencies:** `App.save()` must return its `{ok,error}` outcome, update its cached durable journey only on success, and `EW.Save.write` must not rotate `.backup` when the previous normalized journey equals the new one. The replacement boundary fails closed if `App.save()` returns no explicit success. Parent owns those client/core changes and rebuilding the served artifact.

## Replacement ordering

For an existing journey's confirmed import/new-run replacement:

1. Validate/load the candidate into an isolated `EW.Game`, never the live simulation. New runs are likewise staged, with existing difficulty/mode rules and intro events.
2. If a live in-memory journey exists (including menu/dead states), call `App.save()` and require explicit success. Do not assume the old persisted primary includes recent in-memory discoveries.
3. Write the validated target via `EW.Save.write`, requiring success before committing.
4. Only after both succeed, assign the prepared Game, synchronize durable cached story/rush snapshots, reset the App presentation through `enterGame`, and process its normal realm/save/intro events.

A failure preserves the existing live Game object and fight state, retains the confirmation/candidate where applicable, and directs the user to **export the current journey before retrying or closing**. Import confirmation now includes an Export current journey action. No attempt to force an unsupported storage rollback is made; localStorage's primary and backup writes are not a multi-key transaction. If a backup write succeeds but the next primary write fails, the primary remains valid/older and the backup may already have changed. Current unsaved progress remains in memory for export. A successful preservation write followed by target-write failure may persist that current progress, but never commits the replacement to live gameplay.

After success, the prepared Game replaces the previous runtime object deliberately: importing/new-run replacement already discards the in-progress fight and resumes at a beacon. Renderer/input/audio objects continue to belong to App and consult its current Game. This staging prevents a validated target write followed by an unexpectedly failed live resume from discarding the old runtime prematurely.

The first-ever fresh start with neither a live journey nor an existing target save preserves baseline **session-only play** when storage is denied. It is not an existing-journey replacement. Imports and replacement attempts remain strict. Rolling backup text is conditional: it is one prior valid write, not a permanent slot/archive, and later changed saves may replace it. Identical follow-up save events rely on the parent's normalization check to retain the newly useful backup.

## Delayed-read ownership

The common invalidator increments file-read generation and modal epoch and clears candidate/owner. It now runs at `title`, `enterGame`, `start`, `continue` and `death`, in addition to modal open/close/cancel. These are important because title/continue/enter can change journey ownership without another modal being opened.

Capture-phase file selection still suppresses the older base import listener. Each native selection gets a unique generation and the current epoch. Both must match after `await file.text()`; otherwise the result and its error are ignored. Overlapping selections therefore cannot resurrect an older candidate. Accepted restores invalidate pending reads before entering the staged game. `EWClient.persistenceSafety === 'transactional-v1'` lets the new test reject a stale served build instead of pretending it tested current sources.

## Keyboard repeat safety

`controls-v11` tracks physically depressed action/default/alias keys independently from held gameplay actions. Modal/blur clears stop gameplay actions but do not erase that physical ownership. Repeated keydown (`event.repeat` or another down for the same physical key) is consumed before the original listener; it cannot re-enter a remapped held action after pause/resume. Keyup releases the tracked key and its binding source. Ordinary hold-to-attack/move is still driven by App sampling, not OS repeats. Inputs/selects/textareas retain normal typing behavior; keyboard-remap capture still validates allowed/unique keys.

## New browser fixture suite — parent runs after rebuild

```sh
EW_URL=http://127.0.0.1:4173/Swordigo-V2/ \
CHROME_BIN=/path/to/chromium \
node tests/emberwake-persistence-browser.mjs
```

Use `EW_NO_SANDBOX=1` only in an explicitly isolated container that cannot launch Chromium's normal sandbox. The suite imports the existing `@playwright/test` tooling, launches a local headless Chromium and contacts the supplied local URL. It does **not** build, serve, restart the parent's server, install packages or alter repository QA artifacts. Results/counts print to stdout; any scenario failure produces a nonzero exit.

Coverage authored:

- Native file-input selection + import confirmation with denied reads, backup quota, primary-after-backup failure, and target-primary failure after successful current preservation.
- Failed native new-journey confirmation, successful restore/reload, current snapshot preserved in rolling backup, identical-save nonrotation, native cancellation and export download.
- Native delayed-file selection followed by title/Continue, explicit isolated lifecycle-boundary fixtures for all five methods, and overlapping delayed selections with latest-read ownership.
- Native keyboard remapping and repeated held-key behavior across pause/close/release.

Storage failures are injected into App's storage adapter while actual localStorage bytes remain inspectable. Some fixtures deliberately set gold, death state or invoke lifecycle methods to isolate regressions. Those are labeled **fixtures**, not input-earned campaign evidence. Native file selection, button confirmation, download and repeat key input exercise actual browser interfaces. This suite is not physical-device, cross-browser, performance, accessibility or production certification.

## Evidence status

Owned JavaScript files pass `node --check` syntax checks. **The new browser suite has not been executed by this worker**: the parent owns the build/server and will run it against the rebuilt artifact. No browser pass count or rollout clearance is claimed here. Re-run existing browser/import/backup/input suites too; game-object commit and hold quarantine are behavior-sensitive integration seams.
