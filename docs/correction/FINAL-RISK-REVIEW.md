# Final independent source risk review — 1.2.0-alpha.1

## Decision and boundary

**Conditionally acceptable for an explicitly limited alpha after the parent resolves the P1 evidence gaps below; not independently cleared for public release by this review.** The default now evolves Emberwake rather than substituting Lumenblade. Optional routes, deterministic guardian encounters and a journal derived from existing V3 flags are integrated. Do not describe this as the proposed persistent sequel chapter or a certified production release.

Read current engine/core/client/controls/journey, encounters/journal/presentation extensions, worker preparation, builder, browser harness, workflows and recent stored logs/reports. Calculated file hashes with Python only. No game/downloaded code, build, tests, browser, Git or credentials were executed/accessed here. Only this document was written. Line references identify the inspected snapshot; minified lines may shift.

## What the available evidence actually supports

- `upgrade-unit.log` reports 157 tests passing, zero failed/skipped; `upgrade-build.log` reports 28 runtime files; `upgrade-secrets.log` reports no recognized findings. These are parent-run records, not my executions or exhaustive security clearance.
- Current `qa/emberwake-qa-results.json` reports 116/116 regressions, four ordinary-input completions and replays. Its engine/world/core/encounters hashes match the four current source files I independently hashed. Its `version` remains 1.1.0-rc.3: treat this as the retained engine label, not the alpha package release identity.
- `qa/extended-difficulty-results.json` has 16 passing cases with passing replay records, including 12 optional-route cases across three difficulties, two endings and two rates. The four original-route cases are not a full cross-product. Neither simulation proof is human pacing/device evidence.
- Correction HTTP/browser report records 13 checks, no runtime errors/missing responses; retained HTTP harness records 53 passed/zero failed. Guardian render scenarios explicitly mutate fixture state and are not browser campaign proof. Earlier `upgrade-browser-original.log` records 13 passes/one failure; retain its history and explain supersession rather than erase it.
- All 17 worker-declared response hashes match current source bytes, and all 28 `dist/integrity.json` entries match current source files. This is present-byte consistency, not authenticated release provenance. Browser/unit logs lack a complete source/artifact hash ledger; a later edit still requires revalidation.
- Workflows now target Emberwake unit/campaign/browser checks, not Lumenblade campaign acceptance. Configuration does not prove remote CI ran. Pages remains main-only. No push/merge/public deployment is established here.

## P1 — acceptance gaps to close before public alpha rollout

### 1. Offline update assertion overstates its test

`scripts/prepare-emberwake.mjs:6–8` verifies hashes on install but uses `cached || fetch(request)` without digest checking on a cache miss. A selectively deleted/evicted cache entry can therefore fetch newer network bytes while other assets remain pinned to the old release. This is a **possible mixed-version path**, not a witnessed failure. Failed installs also leave partial named caches; successful activation is prevented by rejection, but leftover-cache recovery needs a test.

`tests/emberwake-upgrade-browser.mjs`, “V3 journey continuity and coherent offline release,” creates `lumen-correction-fixture` after the new worker is ready, reloads and tests offline. It neither installs an actual older worker nor asserts that the fixture cache is removed. Thus the current pass proves fresh shell/cache/reload functionality, **not** old-Lumen-worker transition or atomic update safety.

**Required:** exercise old installed worker + existing tabs, new release, failed install/digest mismatch, missing single cached asset with changed network content, offline and rollback. Enforce coherent fallback (digest verification or explicit reload/update refusal), or disclose/restrict unsupported recovery behavior with owner acceptance. Never clear localStorage.

### 2. Lifecycle ownership can outlive the import UI

`journey-v11.js:7–10` correctly increments generation/epoch on `modal` and normal `close`, and its capture handler stops the less-safe base import handler (`client.js:115`). Do not flag that dormant base handler as an active bypass while load order is intact.

However, `client.js:139` (`title`) and `:121` (`enterGame`) directly clear modal state without incrementing import ownership. A delayed `file.text()` followed by a lifecycle transition that bypasses `close/modal` can still pass the epoch check and reopen restoration confirmation on a different screen. This is a **source-level race candidate**; ordinary UI reachability must be reproduced, not presumed from console access.

**Required:** delayed file read versus title/start/continue/death, cancel, replacement and overlapping imports; verify stale candidates cannot reopen dialogs or replace another journey. Centralize invalidation on lifecycle transitions if reachable. Test the final script order so capture interception remains effective.

### 3. Save recovery promises remain stronger than write guarantees

`client.js:100` now updates `savedStory/savedRush` only after `Save.write` succeeds: a meaningful correction. But `journey-v11.js:6,11` still promises the current journey is kept as a backup; `accept` at `:5` ignores the return outcome of pre-restore `app.save()`. `core-v11.js:21` can fail writing backup or primary. Storage failure can leave the active in-memory journey replaced despite that unconditional promise. A single rolling backup is not permanent undo.

**Required:** actual UI tests for denied/quota storage, backup-write failure, primary failure after backup, import/replacement followed by reload and export. Either make preservation conditional and offer export/abort, or establish a deliberate recovery policy. This is local data-loss risk, not remote credential compromise.

## P2 — targeted regression candidates / residual risks

- **Held remapped keys:** `controls-v11.js:13–15` handles gameplay capture without rejecting repeat; modal close clears held state but quarantines controllers only. Holding a nondefault binding through pause/close can re-enter on repeat before keyup. Verify remapped and default physical keys; retain quarantine until release if confirmed.
- **Checkpoint authority:** `core-v11.js:25` checks that a specified checkpoint belongs to a seen realm, not that it was visited. Upgrade test explicitly accepts another existing checkpoint. This is the currently tested policy, not automatically a bug; do not claim discovered-beacon authorization. Future selected-beacon travel requires separate discovery state/validation.
- **Projectile expiry boundary:** `engine.js:187–197` checks life before decrement, then collision after decrement. A shot crossing zero can still damage on its final tick, potentially after an encounter mark is visually spent. Test ±one-step expiry/warning boundaries at both rates; align intended telegraph/damage lifetime if inconsistent.
- **Shared-origin cache ownership:** preparation `:7` deletes all `lumen-*`/`emberwake-*` caches, not scope-prefixed caches. Separate deployments on the same origin could delete each other's shells. Require scope namespacing or an explicit single-deployment assumption.
- **Archived payload:** builder `:13–16` includes all approved `assets/`; current 28-entry output ships legacy and Lumenblade HTML/bundle/icons/notices. This is not required-runtime substitution, but release inventory/notice/security review must include it. Prototype bundling can overwrite `sw.js`; final release must run Emberwake preparation last.

## Known unqualified targets, not fabricated failures

Physical Android/iOS/controller hardware, Safari/Firefox, thermal/battery/memory/frame-time performance, accessibility and human pacing remain unqualified. Headless Chromium viewports and simulation rates do not measure phone FPS. Distinguish a limited Chromium alpha with disclosed exclusions from broad device support. Owner asset/trademark/license review and deployment approval remain separate; REA is static evidence, Lore is unusable on this host and neither certifies the game.

## Parent acceptance order

1. Resolve/reproduce P1 worker, lifecycle-import and save-preservation gaps; record fixes or explicit supported-policy decisions.
2. Preserve V3 IDs/endings/gauntlet and rerun affected regression/input/browser cases; qualify P2 changes deliberately.
3. Bind all ten scripts, root/CSS/images, worker, artifact and commands/environment to one fresh evidence ledger; confirm original asset hashes and intended shipping inventory.
4. Verify CI and final built root/prefix/update/rollback behavior before authorized publication. Record remaining device/legal limitations; do not convert this source review into release certification or numerical effectiveness claims.
