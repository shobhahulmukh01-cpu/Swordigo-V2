# Independent worker/update acceptance harness

## Status and ownership

`tests/emberwake-update-browser.mjs` was initially authored without execution. After parent-reported failures, its author was explicitly authorized to execute only this harness for controlled diagnosis; results and scope are recorded below. Parent still prepares/builds final source and inspects acceptance output. This task owns only that harness and this document: no game/worker/build/workflow edits, Git mutations, credentials or installations. Harness author used read-only historical Git access; no acceptance pass is asserted.

At initial authorship the worker used unchecked cache-miss fallback/global-prefix cleanup. The current preparation source now verifies cache misses, cleans failed installs after `Promise.allSettled`, and cleans only its scope-specific prefix while intentionally retaining legacy global caches. These source fixes still require a passing rerun. The harness never repairs project source or invokes the build. It snapshots current root/worker/assets into memory, compares declared worker hashes against source, and fails early if the worker is stale. A literal `HASHES` object and standard Service Worker registration states are the explicit contract; if generation changes that contract, coordinate rather than guessing a new API.

## Run after parent fixes

From repository root, with the existing Playwright dependency and Chromium available:

```sh
CHROME_BIN=/path/to/chromium node tests/emberwake-update-browser.mjs
```

For an isolated container without working Chromium namespaces only:

```sh
EW_UPDATE_NO_SANDBOX=1 CHROME_BIN=/path/to/chromium node tests/emberwake-update-browser.mjs
```

Default is sandboxed. SwiftShader/ANGLE flags allow the historical WebGL2 Lumen fixture to boot; this is software-rendered test coverage, not GPU/device measurement. Defaults: historical commit `6c266e9`, 45-second condition timeout, output `qa/correction/update/report.json`. `EW_OLD_REF`, `EW_UPDATE_TIMEOUT_MS`, `EW_UPDATE_OUTPUT` can override these. An override must retain an actual historical Lumen worker/root/assets; no fake old-cache-only substitution.

At runtime the harness reads historical content with `git rev-parse`, `ls-tree`, `show` only; it does not checkout, commit, build, install or alter source. Two dynamic loopback HTTP origins serve in-memory snapshots; browser contexts/cache/storage are disposable. Only the report output is written by execution. Do not run against a user's actual browser profile or production saves.

## Five sequential acceptance scenarios

1. **Actual old worker, open clients and V3 continuity:** boot original Lumen root and activate its real worker. Seed a fresh Emberwake checkpoint save through its actual old legacy engine in the same origin/context. Stage the current generated worker, explicitly request update and assert it waits while two old clients remain, including after one closes. Close the last old client; observe old worker becoming redundant/new activation; boot current Emberwake and validate original save bytes unchanged. Other-path legacy-shaped cache sentinels on the same origin and a separate-origin sentinel must survive **new-worker activation**.
2. **Cache-miss digest refusal:** delete a current cached `client.js`, change network bytes and fetch through the controlling new worker. Require 503, incompatible bytes not returned and no poisoned cache entry. Restore server bytes and require a correct-digest 200 response. The harness does not fabricate worker implementation.
3. **Offline coherence:** use a separate fresh context with a complete current-worker install, seed the same checkpoint bytes, disable network and reload. Assert Emberwake boots and the fixture remains byte-identical/valid V3. This does not assume cache-miss fallback repopulates a deliberately deleted entry.
4. **Failed partial installation:** separate context with an actual old active worker; serve current shell with one corrupted asset. Await attempted worker becoming redundant; require no waiting/new active worker, original active retained, original save unchanged and no new-release cache residue. Track every updatefound/state transition and require bounded quiescence after all observed attempts become redundant; then recheck cache absence. A cache actively being populated by a second install is not settled residue. Timeout, activation or a waiting worker cannot pass. No skipped scenario counts as pass.
5. **Actual rollback:** in the previously upgraded context, stage the historical worker/root/assets again and force a fresh update. Require waiting/activation after client closure. Historical root boots Lumen by definition; then its actual legacy Emberwake entry must validate the still-unchanged V3 fixture. This demonstrates storage/worker rollback mechanics, **not a recommendation to restore Lumen as the shipped product** or proof of any V4 downgrade.

## Evidence and limitations

JSON records each completed scenario, durations, failures, exact resolved historical commit, historical worker hash, current root/worker/scripts/styles hashes, declared asset count, browser version, local origins and diagnostics. Exit is nonzero on assertion failure. Parent must bind results to final built artifact/CI and inspect unexpected page/console errors; deliberately rejected network/installation responses may appear in diagnostics.

The old save is a synthetic **fresh checkpoint fixture**, not an earned campaign. Existing completed/midcampaign save suites remain required. These five scenarios do not cover quota/save-write failures, arbitrary malformed imports, human campaign play, physical phones/controllers, Safari/Firefox, public deployment, battery/FPS, cryptographic release authentication or certification. Separate-origin isolation is checked; same-origin cache ownership also matters because CacheStorage is origin-wide. Intentionally retained legacy global Lumen caches are not considered cleanup failure.

Current worker's no-`skipWaiting` policy is required: the harness does not force activation. Conditions use worker states/registrations, not a timeout treated as success. The historical worker's own legacy global cleanup during rollback is not asserted as cross-deployment safe; preservation assertions apply to the fixed new worker. Future scope/schema changes require explicit test-contract review.

## Harness correction after first parent run

The first parent execution recorded zero completed scenarios and one harness error in `qa/correction/update/report.json`: observer lookups of `registration.waiting` omitted the explicit scope URL. The observer is intentionally outside worker scope, so its default registration lookup returned undefined. Both affected lookups (remaining-client waiting and failed-install no-waiting checks) now pass `url` explicitly and fail clearly if registration is missing. Every parameterized `evaluate`/`waitForFunction` callback was reviewed for its argument. Assertions and scenario requirements are unchanged. This is a harness repair, not evidence of a worker defect or a passing rerun; parent must rerun.

## Controlled diagnosis of the late-residue failure

The parent rerun first passed three scenarios, then failed the fixed 500 ms cache comparison. Author added request timestamps/scenario/corruption flags/initiators, per-attempt worker state histories, and full cache-entry inventories at first redundancy, late sampling and quiescence. The controlled server continues serving corrupt `client.js` throughout failed-install testing.

A normal instrumented run passed all five scenarios. To distinguish a leaked settled cache from an in-flight retry, `EW_UPDATE_DEBUG_RETRY=1` deliberately starts a second update after the first attempt becomes redundant and delays the corrupt asset response by 1.5 seconds. Before the timing repair this reproduced the identical extra-cache assertion failure: attempt 1 was redundant with only the old eight-entry Lumen cache; at 500 ms attempt 2 was still **installing**, with 16 verified responses temporarily in the new cache. Therefore the fixed delay asserted an invalid premise: that observing one worker's redundancy meant no subsequent installation was writing. Parent's earlier duplicate worker requests are consistent with an automatic/navigation-triggered retry, but that earlier report did not record states and cannot uniquely establish its initiator.

The harness now tracks all attempts, waits within the configured deadline for no installing/waiting worker and all observed attempts redundant, requires a quiet state interval, and enforces the original exact cache-key equality. Any activation, waiting worker, unresolved attempt, settled residue or timeout still fails; no assertion was converted to a skip. This is synchronization correction, not a worker cleanup relaxation.

`qa/correction/update-debug-retry/report.json` retains the controlled pre-repair failure. `qa/correction/update-debug-settled/report.json` records **five passes, zero failures** after repair, including two failed installation attempts: late sample has 16 entries while attempt 2 installs, final quiescence has only the original eight-entry Lumen cache and both attempts redundant. The optional debug flag can repeat this stress condition; its use is recorded as `controlledRetryFixture`. A final normal (no forced-retry flag) execution also records five passes, zero failures in `qa/correction/update/report.json`. No settled cleanup defect was reproduced in the inspected Promise.allSettled/delete worker. These local controlled fixtures are not a production or device qualification.
