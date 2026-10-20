# Next2 reliability implementation — prepared; awaiting parent GO

## Cross-review and scope

Read experience, gameplay and visual councils before editing, plus parent brief. Reconciled their shared guidance contract, active `assets/scripts/*` entry, immutable journey/reward authority, released-versus-collected rune distinction, early optional exploration and Archive gate. Kept visual fixture, earned controller, real-input/accessibility and human-pacing claims separate. No competing selector, runtime fixes or art changes introduced.

Only assigned repository files changed:
- `tests/emberwake-update-browser.mjs`
- `tests/helpers/emberwake-update-reliability.mjs`
- `tests/emberwake-update-reliability.test.mjs`
- `tests/emberwake-update-experiment.mjs`
- `tests/emberwake-update-experiment.test.mjs`

Also wrote scoped `next2-player-safety-checklist.md` beside this report and lightweight test log `next2/reliability-unit.log`. No production edits, build, Git, install, auth, browser, workload or experiment executed. Original failure reports and historical experiment artifacts were not modified.

## Progressive diagnostics

Fixture writer-start, immediate writer readback, observer initial values, barrier start/completion, synchronized readback, readiness and failure are emitted before proceeding, not returned only on success. New records contain key presence/UTF-8 length/SHA-256, never save values. Writer operation failure gets a read-only, <=250ms best-effort partial snapshot; a stalled read reports unavailable and the exact original exception is rethrown. Diagnostic sink failures cannot replace acceptance exceptions.

Harness atomically persists `fixture-stages.json` at each capped stage/storage event; final report includes persistence error counts and capped-event dropped counts. Per-stage context/page/frame URL/origin/parent identity, CDP target identity, document IDs, storage-event source URL/sequence/timestamp and old/new hashes distinguish writer, observer and renderer lifetimes. Storage-event hashing is bounded per document and reports truncation. Immediate post-action byte-equality reads/assertions remain; no post-action polling, reseeding or timeout widening. Existing six-second aggregate failure-probe call and independent probe bounds remain unchanged. Success-path setup still writes/reads the historical tested page and completes observer synchronization before worker actions.

## Explicit four-cell causal SCREEN

`--plan screen4 --freeze FILE` is opt-in. Default remains the original twelve-trial plan with its existing bounds/caveat; a screen is a new unique output run, never continuation or completion of that historical experiment.

Fixed order: (1) rollback-only/unloaded, (2) full/unloaded, (3) rollback-only/competing, (4) full/competing. Expected accepted checks: 1,7,1,7. Same measured two-context/two-page Canvas2D configuration in loaded cells; startup, heartbeat, per-page live frame advancement, end-to-end interval coverage and shutdown evidence must pass. Host load/memory before/after and browser/source identities are recorded. No randomized load or retries.

Screen limits: 720000ms whole experiment; 175000ms per whole cell including setup/workload startup/validation/cleanup; 150000ms internal harness; 45000ms predicate. Cell ceiling initiates process-tree teardown at 173500ms, reserving 1500ms within its external cap. Normal process cleanup has a <=1500ms wait. Parent must still supervise the process externally, including blocked synchronous I/O/host stalls that a JavaScript timer cannot preempt.

First failure, ineffective load, changed source/browser or missing/truncated critical diagnostics stops the schedule and explicitly lists unrun cells. Four passes yield `passed-screen4-non-reproduction`, `repeatabilityClearance:false`; this is not causal closure, production clearance or 12-trial completion. Source hashes checked before/after every cell; executable hash is also checked before/after every screen cell. First observed browser version must match the parent freeze.

## Lightweight verification and freeze handoff

Three `node --check` invocations passed (browser harness, reliability helper, experiment runner). Focused two-file Node suite: **19 passed, 0 failed**, approximately 1.42s. Includes partial writer failure, durable intermediate barrier evidence, stalled diagnostics, original exception identity, capped/redacted sink behavior, fixed screen order/bounds, legacy default, freeze rejection and stop/unrun-cell behavior. These are helper/syntax observations only, not orchestration/browser qualification. No rerun of an experiment occurred.

Owned implementation is frozen at these SHA-256 values:

| File under tests/ | SHA-256 |
|---|---|
| emberwake-update-browser.mjs | 2a2cb9705536e2653b8204c96346d1741f859affaf2906d205e268b14a630edc |
| helpers/emberwake-update-reliability.mjs | f55aa60840d1772faa1133f42301024b9bfb2993e495a12dbfa4da62b1076a23 |
| emberwake-update-reliability.test.mjs | 576bf7801b029c45e7293fcf433e8f206dc3b208df07d8c4bf30fa0225a1c910 |
| emberwake-update-experiment.mjs | 71439b17abd49fc94f148797eb500764d90573afa4670bd78c82e7111375c431 |
| emberwake-update-experiment.test.mjs | 2dac89d28e99899b4b1283d85115d0f93a6558ef2f5675fa93188b6bcbfcb528 |

**Not a final runtime/source freeze:** other owners are integrating. Parent must finalize/build the coherent generated worker, freeze all sources and approve GO. Required freeze JSON fields:

```json
{
  "sourceSHA256": "sourceSnapshot().sha256 from the exported runner helper after final build",
  "workerSHA256": "SHA-256 of that final sw.js",
  "browserExecutableSHA256": "SHA-256 of the actual CHROME_BIN executable file",
  "browserVersion": "parent-verified exact Chromium version string"
}
```

The source inventory excludes documentation/QA/node_modules/Git, includes runtime/assets/src/scripts/package manifests and all five owned harness/helper/test files. Freeze source JSON should be stored outside inventoried inputs. Browser executable hashing does not attest its complete installed dependency package.

After explicit parent GO only, exact invocation from repository root (parent first sets `CHROME_BIN` to the frozen executable, and any required `EW_UPDATE_NO_SANDBOX=1` consistently):

```sh
node tests/emberwake-update-experiment.mjs --plan screen4 --freeze /data/work/plan/next2/screen-freeze.json --output /data/work/plan/next2-causal-screen
```

Parent creates `screen-freeze.json`; it has deliberately NOT been generated from moving integration bytes. Runner verifies historical commit/worker and generated-worker digests through the existing harness. On first failure inspect the first divergent stage; do not rerun to fill cells. Historical rollback timeout, trial-9 initial visibility failure and separate publication failure stay preserved and causally unresolved. Player-safety checklist is prepared, all execution boxes open.
