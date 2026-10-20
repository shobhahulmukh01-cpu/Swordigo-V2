# Emberwake — validation ledger and limits

## Alpha.4 — current player-journey milestone

Current source-bound results live in `qa/correction/next2-final/validation.json` (evidence locations and external capture digests are indexed in `EVIDENCE.md`); runtime/build/served equality and all first-load/offline asset digests are recorded in `runtime-integrity.json`. This milestone extends the existing engine/campaign, not the archived Lumenblade prototype. Product identity is **1.2.0-alpha.4**; retained engine/save compatibility identifiers are intentionally unchanged. The game footer reads the product-version meta field.

Four councils and their implementation handoffs are retained under `docs/plan/alpha4-council/`; decisions and premortem are in `docs/plan/ALPHA4-PLAYER-JOURNEY.md`. The new native journey test separately exercises campaign-first advice, optional following, a paid delivery, real shrine preview/purchase and both ending-import title continuations. It does not claim a full browser-earned original campaign. The ordinary-input simulation proof earns both endings and the whole optional chapter at 60/120 steps/sec, including the new post-Engine return, and exactly replays each trace.

Visual captures are synthetic render fixtures. Individual review and native interaction are separate evidence; neither certifies real device performance or human discovery. All four new optional-room paintings are members of the digest-verified offline shell. All four inherited/main image files remain byte-identical to published alpha.3/main. Original failed observations and initial native test-route errors are preserved, not counted as passes. The four-cell causal screen is distinct from the old incomplete twelve-trial experiment and cannot establish historical root cause or production repeatability even if it passes.

Final retained-image review found and corrected portrait direction suppression, transient prompt/toast overlap and stale key wording, a minimap/helper collision and weak landscape title utility separation. The native HUD suite now runs in both PR CI and the manual Pages release. See `qa/correction/next2-final/post-hud/CORRECTIONS.md`. The four-cell screen predates these presentation corrections: it remains historical bounded non-reproduction, not final-byte repeatability certification.

The earlier sections below are historical release ledgers, not current-runtime counts. Remote CI/public bytes must be checked for the eventual publication commit. Production certification, physical hardware/controller/browser matrix, independent accessibility/security, concurrent-write durability and owner rights/license reviews remain open until separately qualified.

## Historical alpha.1 local acceptance evidence

`qa/correction/validation.json` binds the tested runtime to exact source/build hashes, environment, original-image equality, commands' result totals and limitations. Its base commit identifies the branch ancestor; the pre-commit runtime hashes identify the actual tested changes. `EW.version` remains the retained 1.1.0-rc.3 engine label; package/release identity is 1.2.0-alpha.1. Save format remains V3.

| Gate | Actual local result | Scope |
| --- | --- | --- |
| Unit / contract / route / encounter / journal | 159 passed, 0 failed/skipped | Node 24; release contracts, authority, save fixtures, route physics and encounter timing fixtures |
| Retained simulation regressions | 116 passed, 0 failed | Existing regression assertions retained |
| Campaign completion / exact replay | 20 completed and exactly replayed; zero deaths | Ordinary input controller receives cloned observations; three difficulties, 60/120 Hz, both endings and rush cases; 12 cases use optional routes. Not every possible cross-product or a human/browser playthrough |
| Retained browser over real HTTP | 53 passed, 0 failed | Native keys/multitouch/remaps/audio/file/download, confirmation/backup/races, synthetic controller; earned completed-save restoration |
| Upgrade browser | 13 passed, 0 failed | Canonical prefix, viewport/touch/pause/journal/map/quality/offline; guardian screenshots use valid explicitly positioned encounter fixtures |
| Persistence browser | 17 passed, 0 failed | Injected denied/quota/backup/primary failures, native confirmations/downloads, delayed-read ownership, lifecycle fixtures and held-remapped-key quarantine |
| Historical-worker/update browser | 5 passed, 0 failed | Actual historical worker, old open tabs/waiting, V3 byte retention, mismatched cache-miss 503, failed-install cleanup, offline, rollback and cache ownership |
| Forced install-retry stress | 5 passed, 0 failed | Two failed attempts; wait for bounded quiescence, then exact no-residue assertion |
| Build / source integrity | 28 runtime files verified | All four supplied painted images byte-identical to the isolated supplied ZIP extraction |
| Secret pattern scan | No recognized findings | Limited scan, not exhaustive security clearance |

Evidence: `qa/emberwake-qa-results.json`, `qa/extended-difficulty-results.json`, their replay/input proofs, and `qa/correction/{browser,retained-browser,persistence,update,update-debug-settled}/`. Source/runtime hash equality was independently recomputed before this ledger. Remote CI and public deployment are separate evidence: see the PR/workflow results rather than inferring them from local passes.

## Failures found and corrected

The first journal extension wrongly treated the inherited milestone entry as a fourth realm; repaired with a bounded lookup and browser rerun. Fullscreen UI exposed an inherited harness assumption that Settings remained in the gameplay topbar; it now navigates native Pause → Settings. The scanner correctly rejected old temporary-browser symlinks; profiles moved outside the repository and the harness now uses cleaned system temporary directories. A missing favicon was supplied inline.

The worker harness initially omitted observer scope arguments. A later fixed-500-ms sample caught a second install while it was still legitimately writing, not settled residue. Explicit per-attempt states, bounded quiescence and a controlled 1.5-second retry reproduce and resolve that timing premise without skipping cleanup assertions. Historical failed records are not passing acceptance; final current evidence supersedes them. See `docs/correction/UPDATE-TESTS.md`.

Independent risk findings led to digest-verified cache-miss fallback, failed-install cleanup after all requests settle, scope-specific cache ownership, lifecycle-wide import invalidation, staged save-verified replacement, conditional backup wording, keyboard repeat ownership and expiry-before-projectile-collision checks. The source review is not itself certification.

## Reproduce

```sh
npm ci
npm test
npm run check:secrets
npm run test:campaign
npm run build
npm start -- --port 4173 --base /Swordigo-V2/
# another terminal; select an installed Chrome/Chromium with CHROME_BIN
python3 tests/browser-smoke.py --base-url http://127.0.0.1:4173/Swordigo-V2/ --output /tmp/emberwake-http-qa
npm run test:upgrade:browser
npm run test:persistence:browser
npm run test:update:browser
```

Restart the preview after rebuilding; it serves a validated snapshot. Update harness reads historical Git commit `6c266e9` without mutation; CI fetches history. Chromium defaults to its sandbox in the retained/persistence/update harnesses. Isolated-container flags are test-only, never a recommendation for normal play. SwiftShader historical-WebGL rendering is not GPU qualification.

## Still unqualified

Physical Android/iOS/controller devices, Safari/Firefox, frame-time/memory/thermal/battery measurements, first-time/returning human pacing, independent accessibility and owner artwork/trademark/licensing review remain outstanding. Viewport simulation and simulation Hz are not phone FPS. Runtime hashes provide consistency, not authenticated release signatures. No numerical “100x,” official Swordigo sequel, completed deferred post-ending chapter, exhaustive security audit or broad production certification is claimed.

Remote PR CI initially failed because the route-comparison baseline was referenced outside the checkout. The original world data was copied byte-identically into a test-only repository fixture and the full 159-test local suite passed again. Remote acceptance requires the rerun for that follow-up commit; a prior failed run is not counted as a pass.


## Alpha.3 — consequence and earned chapter followthrough

See `docs/correction/ALPHA3-DECISIONS.md` for council decisions/premortem and `qa/correction/next-final/validation.json` for current exact-build results. Earlier chapter-final and correction reports remain historical. `npm run test:chapter:earned` writes portable, ordinary-input action traces/replay hashes; `npm run test:chapter:visual` creates explicitly seeded render fixtures, not earned gameplay. Current native chapter harness separately proves Water Remembers, optional advice and both ending-import UI continuity. V4 update lifecycle fixtures test storage behavior, not campaign completion. A discovered portrait boss-HUD occlusion was corrected in alpha.3; the visual harness asserts the actual boss panel clears Lyra and floor warnings.

Do not infer production readiness, rights clearance, human pacing, physical-device/browser-matrix qualification or public deployment from these local tests. Historical rollback timeout root cause remains unresolved; any bounded follow-up experiment has its own stated conditions and first-failure stop.

The retained smoke harness now validates portable V4 plus its canonical V3 base/current/previous, while retaining byte-exact legacy-primary/backup checks and the non-chapter V3 path. It also covers fresh denied-storage play; this does not authorize replacement of an existing journey without a successful save.
