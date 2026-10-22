# Alpha.5 release evidence — bounded CI diagnostics

## Scope and preserved gates

This change adds release evidence, not gameplay changes or release qualification. It does not change `package.json`, prepare/build code, existing suite implementations, historical fixtures, acceptance timeouts or rollback experiments. Existing commands remain required and ordered; no `continue-on-error`, retries or relaxed assertions were added.

- CI still runs for pushes to `main` and pull requests with read-only contents permission.
- Pages remains manually dispatched, its verify job remains restricted to `refs/heads/main`, concurrency remains noncancelling, and deployment still needs successful verification.
- Pages still uploads **only `dist`** using the existing pinned Pages action. Diagnostics are separate, outside the publish directory.
- The existing required browser choice is Google Chrome (`google-chrome` / `google-chrome-stable`), not a silently substituted optional Chromium installation.

## Files and paths

`scripts/release-evidence.mjs` is a dependency-free Node module/CLI. It reads existing `loadDist` validation without invoking the builder itself. Existing `npm run build` remains the only workflow build command.

Both workflows set isolated absolute paths under the runner's ephemeral `/tmp` (outside the checkout). This avoids invalid job-level context use and the artifact action's refusal of `..` paths while retaining separation from source and `dist`:

| Directory | Purpose | Uploaded? |
| --- | --- | --- |
| `emberwake-release-state` | Atomically written private per-gate state | No |
| `emberwake-release-raw` | Existing suites' raw output paths, including any screenshots | No |
| `emberwake-release-evidence` | Generated `index.json` and `reports.json` only | Yes, exact two-file allowlist |

Initialization refuses nonempty directories, symlinks or overlaps between these directories and `dist`. It cannot silently reuse committed `qa/` reports or an earlier run's state. Output filenames and raw report input filenames are fixed; no recursive upload, arbitrary path argument or raw log capture exists.

Artifact names include workflow (`ci` / `pages`), run ID and attempt. Retention is 14 days; hidden files are explicitly excluded, missing files are an upload error, and compression level is 9. The two generated JSON files are each capped at 64 KiB (128 KiB total maximum before compression); input state is capped at 32 KiB and each of six optional raw JSON report inputs at 2 MiB. Existing build-validator limits still apply to runtime inventory.

## Artifact/source binding

At initialization, a bounded, **local read-only** `git rev-parse --verify HEAD` must equal `GITHUB_SHA`. A pull-request run therefore records the actual tested checkout/merge commit, not an assumed contributor-branch tip. No authentication or network is needed for this observation.

Immediately after successful build, `artifact-bind` records:

- Exact observed/declared Git source commit, workflow kind, numeric run ID and attempt.
- Package version and SHA-256 of the exact `package.json` bytes.
- SHA-256 of the exact `dist/integrity.json` bytes.
- Generated worker cache identity (`emberwake-…`) and SHA-256 of `dist/sw.js`.
- Validated runtime file count and byte count.

The existing strict `loadDist` contract validates the publish directory, canonical manifest and every manifest-listed runtime file. Every source runtime file must also hash to the built manifest's hash: the suites that use root fixtures and the suites that use `dist` must inspect matching bytes. This permits the existing prepare step's intentional generated output; it does not assert a clean working tree after prepare.

Before Pages uploads `dist`, the always-run finalizer independently repeats checkout/package/dist/source checks and compares the complete binding with the captured post-build binding. Changed source fixtures, package, manifest, worker/runtime bytes, unknown `dist` entries or checkout SHA cause a failing finalizer and prevent deployment. It does not rebuild or repair mismatches.

`browser-identity` records the required Chrome product/version from a bounded `--version` probe. Each browser command receives that observed executable through both `CHROME_BIN` and `CHROME_PATH`; its version must still match. Finalization rechecks the version. No browser profile path, user agent, arbitrary executable path or browser output text is serialized into public diagnostics. Browser version is not a reproducible browser-binary digest or cross-browser qualification.

## Per-gate contract

`index.json` has schema version 1 and a fixed ordered gate list. Every gate has `status` exactly `pass`, `fail` or `unrun`; timestamp fields, exit code, allowed signal and fixed reason enum are recorded where available. Checkout and Node setup outcomes are separately mapped to the same three statuses. They are GitHub-reported setup outcomes, not inferred test results.

| Gate ID | Required command / assertion |
| --- | --- |
| `install` | `npm ci` |
| `unit` | `npm test` |
| `secrets` | `npm run check:secrets` |
| `build` | `npm run build` |
| `artifact-bind` | Validate and capture source/package/built artifact identity |
| `campaign` | `npm run test:campaign` |
| `chapter-earned` | `npm run test:chapter:earned` |
| `browser-identity` | Required Google Chrome product/version observation |
| `browser-harness` | `npm run test:browser`, with isolated output destination |
| `http-ready` | Explicit bounded HTTP 200 readiness assertion |
| `http-smoke` | Existing `browser-smoke.py` HTTP project-prefix command |
| `firstload` | `npm run test:firstload:browser` |
| `chapter-browser` | `npm run test:chapter:browser` |
| `upgrade` | `npm run test:upgrade:browser` |
| `hud` | `npm run test:hud:browser` |
| `persistence` | `npm run test:persistence:browser` |
| `update` | Existing `npm run test:update:browser`, unchanged parameters |
| `evidence-finalize` | Assemble bounded diagnostics and recheck captured artifact/browser binding |

The wrapper marks a gate started before executing it, inherits stdout/stderr directly into the existing job console, and records the ordinary exit code exactly before returning it. Child signal termination is recorded with an allowed signal and conventional nonzero code. A failed/unfinished gate cannot be retried or bypassed to label subsequent gates pass. Bash's existing fail-fast behavior still stops the step; unexecuted subsequent gates remain `unrun`. An observed started-but-unfinished gate becomes `fail` with reason `interrupted` and no invented exit code.

`evidence-finalize: pass` is fail-closed release eligibility, not merely successful JSON assembly. The finalizer computes `eligible = consistent && allPassed && setupPass && requiredReportsPass`; that one result drives the final gate status/exit, CLI exit and `localGateSetPassed`. Every successful report-producing gate must have a projected, schema-valid and internally passing report. Earlier failed/unrun gates, failed setup, missing/malformed/contradictory required reports, corrupt state or binding drift therefore make finalization fail rather than being masked by a safely assembled diagnostic file. Missing/corrupt state produces a failing recovery index with test gates unrun rather than inventing completed outcomes.

## Explicit HTTP readiness

The server is started as before on port 4173 under `/Swordigo-V2/`; it is killed by the existing step exit trap, now safely handling an already-exited server. No server log is added to the artifact.

`http-ready` performs GET requests only to `http://127.0.0.1:4173/Swordigo-V2/`, accepts **exactly HTTP 200**, does not follow redirects or retain response bodies, and fails explicitly on exhaustion. Limits are 30 attempts, one second per request, at most one second between attempts, and a 30-second total monotonic-clock budget. Each request has a hard timer rather than an idle-only socket timeout; a response arriving after the total deadline is not accepted. No browser HTTP suite can run until readiness passes.

This is a readiness predicate, not a public-byte check. Existing suites continue to provide their actual first-load/frozen-dist checks. Timeout assertions in the update/rollback suites were not widened or re-run as development experiments.

## Privacy-first report projection

`reports.json` reads only these six isolated optional raw reports:

- Browser harness `browser-results.json`.
- HTTP smoke `browser-results.json`.
- Chapter browser `report.json`.
- Upgrade browser `report.json`.
- HUD browser `report.json`.
- Update browser `report.json`.

Only allowlisted aggregate integers, booleans and nulls are projected: pass/fail totals, array lengths, selected feature assertion booleans and counts of diagnostic event categories. Chapter journey facts, observations, fixture/save bytes, names, URLs, request headers, errors/stacks, console output, screenshot bytes, profiles, downloads and arbitrary report fields are never copied. Even unknown private-state fields are projected away and typed state strings are constrained. This uses omission/schema projection rather than claiming a regex can redact every possible secret.

Availability is explicit: `projected`, `missing`, `over-cap`, `invalid-or-unsafe` or `unrun`. Reports never replace the original command gate outcome: failed and unrun commands stay failed/unrun even if a stale report looks successful. Conversely, a successful report-producing command is release-ineligible unless its report is present, schema-valid and internally passing; contradictory counts/booleans fail final eligibility. The projected report and command state are therefore independent required evidence. A suite that prints only to stdout (notably first-load and persistence) still has an exact gate outcome but no fabricated persisted report. `index.json` includes the SHA-256 of the exact generated `reports.json` bytes.

The finalizer uses `if: always()`; the diagnostic upload uses `always()` plus a safety marker emitted only after the finalizer freshly assembled both allowlisted files. Ordinary failed gates and binding failures still produce safe diagnostics and reach upload, but an unsafe/stale/symlinked output cannot be uploaded just because finalization failed. A successful job cannot deploy after an evidence/binding failure. As with all GitHub workflows, runner loss, force cancellation, unavailable checkout script/Node runtime or artifact-service failure can prevent retention; no claim of guaranteed upload in those infrastructure cases is made. A missing script cannot generate a trustworthy gate history. There is no broad fallback upload.

## Action pin provenance

New action: `actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02` (`v4.6.2`).

The parent retrieved the official HTTPS GitHub API tag reference; this implementation task inspected the saved response at `/data/work/plan/next3/upload-artifact-v4.6.2-ref.json`. It identifies `refs/tags/v4.6.2`, object type `commit`, and the exact SHA above. No network request, authentication, credential read or downloaded action execution was performed by this child task. Existing action pins were preserved, not newly reverified here.

Official sources:

- https://api.github.com/repos/actions/upload-artifact/git/ref/tags/v4.6.2
- https://github.com/actions/upload-artifact/releases/tag/v4.6.2

This establishes the new pin's tag-to-commit provenance, not a fresh audit of action internals or a security certification.

## Local validation and remaining acceptance

Focused command: `node --test tests/emberwake-release-evidence.test.cjs`.

Observed in this implementation task: **42 tests passed, zero failed/skipped**, using hand-authored inert runtime bytes, synthetic metadata and mocked command/browser/source probes. No project build, browser launch, Git command, dependency install, network/authentication or historical timeout/rollback experiment ran. `node --check scripts/release-evidence.mjs` passed, and both workflow YAML files parsed successfully with locally available PyYAML; this is syntax/shape checking, not an Actions service run or actionlint certification.

The `.test.cjs` name is deliberately covered by the existing `tests/emberwake-*.test.cjs` npm-test glob without changing package scripts. Focused coverage includes nonzero exit preservation, later-unrun gates, interrupted/corrupt/missing state, unsafe state projection, missing/changed Chrome, readiness exhaustion/late response/budget caps, Git/package/source/dist drift, malicious raw fields, schema-specific passing/failing reports, missing/malformed/contradictory/stale reports, over-cap/symlink refusal, upload allowlist and main-only Pages behavior.

Parent-owned integration acceptance remains required: whole-project test/build/browser validation and an actual source-bound CI/Pages run. Actual GitHub artifact retention on a deliberately failing gate and actual Pages artifact-byte identity are **not observed by these mocked tests**. Authorized production byte verification remains a separate observation and is always `publicByteVerification: unrun` in this local predeploy index. Retain the unexplained historical rollback timeout and the stopped-first-failure record; no retry or reinterpretation here clears them. Hardware, human pacing/discovery, screen-reader/accessibility, security and rights checks remain outside these CI claims.
