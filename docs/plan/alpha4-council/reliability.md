# Next reliability council — plan only

## Baseline and decision

Keep playable alpha.3; **no repeatability or production-readiness clearance**. Publication evidence records source `716699068beb0a94023fd320f4256f5fd10382eb`, Pages/main `e5687c94a18d72d7df7dde2d1bd4088f13fad9d1`, worker `emberwake-8cf6212487b4`, successful corrected PR/main/manual release checks and matching public runtime bytes. These establish publication integrity, not rollback reliability.

Evidence inspected: `alpha3-fixture-correction.md`, `alpha3-publication.json` in this plan directory; repository `qa/correction/chapter-final/superseded-rollback-timeout.json`, `qa/correction/next-final/{REPEATABILITY-HOLD.md,update-experiment-summary.json,visual-inspection.md}`; update harness/helper, worker, client and chapter-save source. Historical rollback timed out waiting for `window.lumen`; cause remains unknown. Previous experiment passed four full and four isolated sequences, then stopped trial 9 on initial V4 visibility before V4 lifecycle actions; trials 10–12 never ran. Remote publication failure separately observed missing sentinels; its lifecycle stage was not established. Do not merge these failures into a save-loss diagnosis.

## 1. Investigate the actual rollback blocker causally

**Owner: Reliability investigator** — proposed changes restricted to `tests/emberwake-update-browser.mjs`, `tests/helpers/emberwake-update-reliability.mjs` and their helper tests. **Parent** alone approves experiments, owns CPU scheduling, historical fixture extraction, builds, Git and deployment. Nothing runs under this plan.

Prerequisites: freeze runtime/harness hashes, browser executable/version, flags and host resources; verify historical commit `6c266e9d0d8eaf8ceb73f298b9cf76174fe25290` and worker SHA `0dff1449b6dca02b90b3578cd3c6ef901cf8f583ea723ab100e1d5ce86246825`; retain original failures. Generated-worker integrity preflight must pass. Use synthetic disposable profiles/origins, never player storage. Check diagnostics with pure helper cases before browser authorization.

Proposed fixed experiment: **four serial trials**, fresh processes/output directories, order isolated/unloaded → full/unloaded → isolated/competing → full/competing. Use existing `rollback-only` and `full` arms; parent supplies one fixed, measured competing-canvas configuration identical across loaded arms, recording actual frames/draw time and host pressure. This screens sequence-history and contention effects; one observation per cell is not statistical attribution. Do not resume the old trial numbering or pool old and corrected-harness denominators.

Keep predicate ≤45s, internal trial ≤150s, external process bound ≤175s including cleanup; total experiment ≤12 minutes. Stop the entire experiment at first acceptance failure, setup/integrity mismatch, missing critical diagnostics or ineffective workload. Preserve completed cells and mark remaining cells unrun. No timeout widening, reseeding, post-action acceptance polling or automatic reruns. A subsequent discriminating experiment requires a new hypothesis and parent approval.

Interpret first divergence: wrong delivered root/script hash points toward serving/cache coherence; correct bytes plus script exception or fatal bootstrap points toward runtime startup; correct parsing plus context-loss/stall evidence suggests resource/render initialization, not proof; ready game with unequal save bytes is a persistence defect. Missing telemetry means inconclusive. Isolated pass/full fail implicates prior-sequence interaction only provisionally; unloaded pass/loaded fail does not alone prove CPU causation. Four passes mean non-reproduction under recorded conditions, **not historical root-cause closure**.

## 2. Make failure evidence survive setup and lifecycle stalls

**Owner: same Reliability investigator**, same files; parent reviews assertion-preservation diff.

Existing coverage already includes response/script hashes, CDP worker identities, lifecycle events, bounded failure probes and corrected `Client.url`. Add only missing evidence: persist fixture writer readback, observer initial values and barrier outcome **as each occurs**. Currently `seedFixture()` returns them only after success, and caller records afterward; a barrier failure loses those intermediate records. Capture page/frame URL, origin, context/target identity, storage-event timestamps and per-key hashes/presence at setup and each lifecycle boundary. Preserve original exception and six-second failure-probe ceiling; flush capped events/drop counts before shutdown. Never log private saves.

The corrected setup writes/reads in the historical tested page and completes bounded observer synchronization **before worker actions**. Preserve immediate byte-exact post-action assertions. Do not undo that correction for the rollback experiment. Any separate fixture-order comparison must change only setup ordering and stop before lifecycle actions; it cannot certify rollback.

Acceptance: helper tests demonstrate partial-evidence retention on writer/barrier failure and stalled probes; every authorized trial yields a stage-specific report, clean termination and immutable before/after source inventory. Missing evidence blocks interpretation, not acceptance relaxation.

## 3. Gate real player harm independently

**Owner: Player-safety reviewer** — evidence/checklist under `/data/work/plan/next2-player-safety/`; no runtime/test ownership. Parent assigns any later fixes explicitly.

Premortem → mitigation/acceptance:

- Two tabs overwrite progress despite revision checks: sequential stale-write rejection is not atomic cross-tab compare-and-swap. Later authorized tests synchronize competing writes, include background/foreground reload, storage-denied/quota failure, damaged V4 recovery and export/import cancellation. Require preserved valid journey, explicit conflict/failure feedback and no duplicate 60-ember reward; retain V3/rush bytes.
- Attractive screenshots conceal inaccessible dialogs or lost controls: real keyboard/screen-reader and touch review must cover modal entry/trap/return, hard confirmations, Escape, reduced motion, rotation and blur/background input release. Existing focus/ARIA code and injected visual captures are not interaction clearance. Record browser/device limits; unsupported coverage stays open.
- Local security headers are mistaken for Pages protection: later inspect actual deployed headers/offline error routes, malformed/oversized imports and text-injection surfaces. Worker digest checks are coherence, not authenticated provenance; do not claim security certification. Keep credentials out of artifacts.

Release acceptance remains scoped alpha evidence: no new publication without parent gates; unresolved rollback, concurrency or unsupported-device risks must remain explicitly disclosed.
