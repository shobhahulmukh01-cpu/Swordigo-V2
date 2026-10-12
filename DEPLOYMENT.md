# Release / deployment handoff

## Published source lineage
The supplied Emberwake baseline was imported to `main` before any sequel work. Planning was reviewed in GitHub PR #1. Lumenblade's implementation is developed in a separate feature PR, with the baseline preserved at `assets/legacy.html`. No force-push is required.

## Local / CI contract
Node 24, `npm ci`, `npm test`, secret scan, bundle/integrity build, both campaign suites and both browser suites. `npm start -- --base /Swordigo-V2/` serves an immutable validated dist snapshot: restart it after rebuilding. The browser scripts require Chromium; CI resolves the installed Chrome binary.

## GitHub Pages
Use Actions-based Pages from `main`. Run the **Manual Pages release** workflow after merge. It verifies both games, uploads only `dist`, then deploys through the GitHub Pages environment. All runtime URLs are project-prefix relative. The public URL is the owner's GitHub Pages project path, not a Notion artifact URL.

The new game's service worker is scoped to the project root and caches only the explicit shipped same-origin shell. No authenticated requests, user saves or arbitrary network responses are cached. Old version caches are removed on activation; close old tabs/reload to finish an update. Saves are localStorage, not the offline cache. A failed update must not clear saves.

## Production gates
This is a playable release candidate. Do not market commercial-production or device-performance certification before the real-device/human/accessibility/legal checks in `docs/QA.md`. A completed automated bot campaign is not a full browser campaign or human play-time guarantee.

## Credential handling
GitHub credentials are external to the repository and never part of the runtime/build export. The token previously supplied in chat should be revoked or replaced by the owner after publication. Prefer a short-lived fine-grained token scoped only to this repository for future work.
