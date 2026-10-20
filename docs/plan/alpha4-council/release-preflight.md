# Final local release preflight — read-only

Scope: parent-supplied local implementation `ed1443f`, branch `feat/emberwake-player-journey-alpha4`. Commit/branch identity was supplied, not independently verified with Git. Inspected workflow/HUD source, current dist/source bytes, integrity inventories, post-HUD reports and release wording. No browser, test, experiment, build, Git, network or authentication action; no auth logs/credentials accessed. Only this report written.

## Disposition

**No confirmed local implementation or PR-workflow blocker found.** This is not remote CI clearance or permission to claim publication. Parent’s outstanding exact-head CI, final corrected-image disposition and authorized main-only Pages/public-byte gates remain necessary. No speculative runner/browser failure is promoted to a confirmed defect.

## Confirmed checks

- Both `ci.yml` and `pages.yml` fetch complete history (`fetch-depth: 0`), retaining the actual historical-worker fixture prerequisite. Both select Node 24, install via lockfile, run unit/secret/build/campaign/earned gates, discover Google Chrome, start the same `/Swordigo-V2/` preview and invoke the new `test:hud:browser` between upgrade and persistence/update checks. `package.json` defines that script correctly. The HUD harness honors `CHROME_BIN` and defaults to the running preview. No missing npm-script or obvious preview-path mismatch found.
- Pages verification is intentionally restricted to main and deployment requires verify success. Dispatching from the feature branch would skip verification; merge and dispatch main through the parent’s authorized process. Only `dist` is uploaded, not private QA/source files.
- Independently hashed all **35** `dist/integrity.json` entries and all **35** `runtime-integrity.json` entries: byte sizes/digests match current files, source equals dist, and dist has no unlisted runtime file. All **14** first-load script/style SHA-384 SRI values and SHA-256 URL keys match; all **24** generated worker entries match their files. Current cache: `emberwake-3f5eb6774739`; worker SHA-256: `46dd8414600955fc3d8613fd6b39a716a040bc6f587df6b5c3b28b53c1552bb4`. Historical served-byte equality is recorded evidence, not a new server observation here.
- Post-HUD report counts agree with the ledger: smoke 54, first-load 41, upgrade 13, persistence 19 and default update 7. Ordinary HUD nine-capture and guardian six-capture reports are separately retained; the combined fifteen-capture pass is present in `final-hud-guardian-r2.log`. The new harness distinguishes native fresh/Continue behavior from explicitly positioned guardian render fixtures. Its screen rectangles/warning counts are not physical-device, full accessibility or combat-playthrough qualification.

## Evidence wording and remaining gates

`validation.json` correctly says final corrected47 image review is pending and remote publication is unverified. `EVIDENCE.md` broadly locates “their individual review” in the council directory while that final review is still pending; synchronize that index/ledger after the parent’s parallel reviews, rather than treating pre-correction inspection as final clearance. This is an evidence-status wording item, not a demonstrated runtime/CI failure.

The ledger correctly sets causal-screen `currentRuntimeMatched:false`: screen4 used pre-HUD worker `11943f254523`, not current `3f5eb6774739`. Preserve its all-pass result only as bounded historical non-reproduction. Neither post-HUD default-update seven nor fresh remote green can retrospectively complete the stopped twelve-trial experiment or explain the older rollback timeout/separate CI fixture failure.

Do not announce alpha.4 publicly deployed until authorized main deployment and exact-byte public verification succeed. Real hardware/controller/browser coverage, human discovery/pacing, accessibility/security and rights/license clearance remain disclosed limitations, not newly confirmed CI blockers.
