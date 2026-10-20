# Emberwake alpha deployment handoff

## Product and scope

`package.json` identifies `emberwake-sequel-upgrade` **1.2.0-alpha.4**. Root `index.html` hosts Emberwake's original Canvas campaign, in-place presentation extension and bounded optional chapter. Lumenblade is archived at `assets/lumen-preview.html`; it is not the release target. This remains a playable chapter alpha, not production certification. Preservation and deferred expansion decisions are in `docs/correction/DECISIONS.md` and `docs/correction/CHAPTER-ACCEPTANCE.md`.

## Intended local validation/build contract

Use the reviewed lockfile and supported Node tooling; CI configuration selects Node 24. These are commands to execute during validation, not evidence of this documentation pass:

```sh
npm ci
npm test
npm run check:secrets
npm run test:campaign
npm run build
npm start -- --port 4173 --base /Swordigo-V2/
```

`build` runs `scripts/prepare-emberwake.mjs` then `scripts/build.mjs`. The primary Emberwake path does not run `scripts/bundle.mjs`. Keep the integrity inventory, input caps, symlink/path checks and secret-redaction safeguards. The preview snapshots validated `dist`; restart after rebuilding. Do not deploy source, QA fixtures, tool installations or private evidence logs.

**Shipping inventory:** the builder gathers `assets/`, which contains archived prototype material. A primary-entry correction does not prove an Emberwake-only artifact. Review the generated `dist/integrity.json` inventory for the exact built artifact, including retained archive HTML/bundle/icons/notices; do not reuse a historical file count. Archive retention is deliberate for traceability; it is not referenced by the primary entry or its offline cache. Distinguish unreferenced archived files from required runtime dependencies. Do not delete archived work merely to simplify documentation.

## HTTP and offline/update gates

Verify real HTTP root and `/Swordigo-V2/` boot exactly one Emberwake App, load all scripts/styles/images without 404/CSP failures and preserve old-entry compatibility. Test with the final built bytes, not only source HTML or CDP fulfillment. GitHub Pages does not inherit local preview security headers.

Preparation derives a scope-specific Emberwake cache from root HTML, every root script/style declared in `index.html` (including chapter data/save/runtime), the four original images, and all four authored optional-room images. Inspect generated `sw.js` HASHES rather than assuming an older script count. Install and cache-miss network responses must match generated SHA-256 digests. Failed installation waits for every fetch to settle before deleting its partial cache. Activation removes only obsolete caches with this scope's new prefix, never arbitrary same-origin deployments; legacy global Lumen caches are intentionally retained rather than guessing ownership. LocalStorage is never cleared. No skipWaiting: close old game tabs to activate a complete update. Cache-miss mismatch returns an explicit 503 instead of mixing releases. These digests are consistency checks, not authenticated release signatures.

Required: successful complete install; failed/partial install; old Lumenblade worker transition; open old tabs; changed asset release; offline reload; fallback; rollback and missing-image behavior. Confirm old/new bytes cannot form a mixed release. Cache operations and V3/V4 localStorage journeys are separate; never clear saves to fix an update. V3 story/backup are frozen fallback bytes, V4 holds current/previous/revision and chapter rewards, and rush remains V3. Historical legacy need only preserve V4 bytes, not understand them. A first offline visit without an installed shell is not supported merely by having `sw.js`.

### Bounded reliability harness (run only after coordinated final build)

`tests/emberwake-update-browser.mjs` reads immutable HTTP snapshots without building. It requires historical commit `6c266e9d0d8eaf8ceb73f298b9cf76174fe25290` and verifies historical worker SHA-256 `0dff1449b6dca02b90b3578cd3c6ef901cf8f583ea723ab100e1d5ce86246825`. Missing/unapproved history produces `status: setup-blocked`, `rollbackTested: false`; do not invent a fixture. Current generated worker digests must also match all source assets before launch. Use the installed browser via `CHROME_BIN` where necessary.

```sh
# One coordinated default run; unique output directory for each later trial.
EW_UPDATE_ARM=full EW_UPDATE_OUTPUT=qa/reliability/final node tests/emberwake-update-browser.mjs
```

`full` is the default: all five original assertions/checks remain, plus two synthetic V4 lifecycle checks (mercy/rekindle). V4 checks retain exact current/previous/revision, frozen story and rush keys across failed install, waiting/activation, offline reload, historical rollback/legacy entry and re-upgrade. The restored client must select V4 and resume its original ending; a paid delivery must return zero additional reward and stale revisions must fail closed. Synthetic completed fixtures are not earned campaigns.

`EW_UPDATE_ARM=rollback-only` isolates the original rollback without preceding cache faults/extra contexts (one check); `EW_UPDATE_ARM=v4` isolates the two V4 lifecycles. Selecting an arm is not clearance of unselected checks. Predicate waits default to 45 seconds and cannot be widened; `EW_UPDATE_TRIAL_MS` defaults to a 150-second wall-clock ceiling and may only be reduced. The parent runner must additionally enforce an external process/setup/cleanup deadline. No automatic retry. Preserve failed reports/screenshots before another experiment.

Diagnostics are bounded, best-effort observations, not substitutes for acceptance. Reports include request/response payload digests, delivered browser-response digests, parsed-script hashes, worker version IDs, lifecycle/context-loss events, page/client inventory and representative cache-content digests. Failure probes independently inspect the target and outside-scope observer without replacing the original error. Reports cap event arrays and expose dropped-event counts.

After the single final run, a separately coordinated experiment may run four `full`, four `rollback-only`, then four `full` trials with a fixed measured competing workload. Run trials serially, stop on first failure, use unique evidence directories and record workload/host/browser/runtime hashes. Do not rerun until green or loosen readiness assertions. Twelve passes mean only twelve trials passed under those conditions.

**Unresolved caveat:** `qa/correction/chapter-final/superseded-rollback-timeout.json` retains an earlier 45-second historical rollback `window.lumen` timeout. The later `worker-update.json` diagnostic run passed 5/5 on unchanged runtime bytes; the cause was not established. Neither that pass nor new instrumentation proves the issue cleared. Revalidate the newly integrated artifact; these historical reports are not alpha.3 clearance.

## CI and Pages status

Workflows require Emberwake's unit/contract, campaign/replay, retained browser, upgrade browser, native journey/HUD, persistence and worker/update gates. Checkout must fetch history for the real historical-worker fixture. The manual Pages workflow remains main-only and uploads the integrity-verified `dist`. Historical chapter passes are recorded in `qa/correction/chapter-final/validation.json`; confirm fresh integrated evidence and remote CI for the exact PR/merge before publication. Public deployment is an explicitly limited playable alpha, not a production-certification claim.

## Release hold and rollback

Hold release until fresh regression, V3 save/recovery, authority/death, root/prefix/browser, offline/update, artifact/notice and rollback checks pass; see `docs/QA.md`. Retain prior artifact and exported journeys; rehearse recovery without destructive storage clearing. Device performance, physical controllers, Safari/Firefox, human pacing and accessibility require separate evidence. Do not advertise certification, measured phone FPS or campaign duration from bot runs.

Credentials/signing tokens stay outside repository and artifacts. Keep local authorization state outside the worktree; never reuse credentials pasted into chat. Use the owner's normal authorized publication process; never include private credentials or saves in evidence. REA and Lore are not deployment dependencies; see `docs/correction/TOOL-EVIDENCE.md`.
