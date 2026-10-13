# Emberwake alpha deployment handoff

## Product and scope

`package.json` identifies `emberwake-sequel-upgrade` **1.2.0-alpha.1**. Root `index.html` hosts Emberwake's original Canvas campaign plus the in-place presentation extension. Lumenblade is archived at `assets/lumen-preview.html`; it is not the release target. This is a bounded corrective alpha, not a complete new sequel chapter or production certification. Preservation and deferred expansion decisions are in `docs/correction/DECISIONS.md`.

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

**Shipping inventory:** the builder gathers `assets/`, which contains archived prototype material. A primary-entry correction does not prove an Emberwake-only artifact. The 28-file integrity manifest records retained archive HTML/bundle/icons/notices. Archive retention is deliberate for traceability; it is not referenced by the primary entry or its offline cache. Distinguish unreferenced archived files from required runtime dependencies. Do not delete archived work merely to simplify documentation.

## HTTP and offline/update gates

Verify real HTTP root and `/Swordigo-V2/` boot exactly one Emberwake App, load all scripts/styles/images without 404/CSP failures and preserve old-entry compatibility. Test with the final built bytes, not only source HTML or CDP fulfillment. GitHub Pages does not inherit local preview security headers.

Preparation derives a scope-specific Emberwake cache from root HTML, ten scripts, presentation CSS and the four original images. Install and cache-miss network responses must match generated SHA-256 digests. Failed installation waits for every fetch to settle before deleting its partial cache. Activation removes only obsolete caches with this scope's new prefix, never arbitrary same-origin deployments; legacy global Lumen caches are intentionally retained rather than guessing ownership. LocalStorage is never cleared. No skipWaiting: close old game tabs to activate a complete update. Cache-miss mismatch returns an explicit 503 instead of mixing releases. Local historical-worker, offline, corruption, failed-install, ownership and rollback tests passed; see QA. These digests are consistency checks, not authenticated release signatures.

Required: successful complete install; failed/partial install; old Lumenblade worker transition; open old tabs; changed asset release; offline reload; fallback; rollback and missing-image behavior. Confirm old/new bytes cannot form a mixed release. Cache operations and V3 localStorage journeys are separate; never clear saves to fix an update. A first offline visit without an installed shell is not supported merely by having `sw.js`.

## CI and Pages status

Workflows now require Emberwake's unit/contract, campaign/replay, retained browser, upgrade browser, persistence and worker/update gates. Checkout fetches history for the real historical-worker fixture. The manual Pages workflow remains main-only and uploads the integrity-verified `dist`. Local passes are recorded in `qa/correction/validation.json`; confirm remote CI for the exact PR/merge before publication. Public deployment is an explicitly limited playable alpha, not a production-certification claim.

## Release hold and rollback

Hold release until fresh regression, V3 save/recovery, authority/death, root/prefix/browser, offline/update, artifact/notice and rollback checks pass; see `docs/QA.md`. Retain prior artifact and exported journeys; rehearse recovery without destructive storage clearing. Device performance, physical controllers, Safari/Firefox, human pacing and accessibility require separate evidence. Do not advertise certification, measured phone FPS or campaign duration from bot runs.

Credentials/signing tokens stay outside repository and artifacts. This documentation task did not access them. Use the owner's normal authorized publication process; never include private credentials or saves in evidence. REA and Lore are not deployment dependencies; see `docs/correction/TOOL-EVIDENCE.md`.
