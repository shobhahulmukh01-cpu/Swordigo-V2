# Chapter precheck — first load and failed Save & return

## Current decision

**Focused local integrated precheck passes: 41 passed / 0 failed, exit 0.** Source/dist first-load bytes and the restarted existing preview HTML match. The corrected first-load gate, SRI/cache-key behavior and native failed-title/live-export paths pass on the identified integrated artifact, including the three chapter modules now present in HTML.

This is **not production or full chapter acceptance**. `/data/work/plan/chapter-risk-council.md` still requires chapter migration/reward/completion coverage, competing-tab ownership, physical-device performance, accessibility, rights and deployment gates. Chapter modules were checked for presence, missing-resource fail-closed behavior and their participation in story persistence/export; chapter traversal, deliveries and reward correctness were not exercised here.

Only `tests/emberwake-firstload-browser.mjs` and this report were changed by this precheck. No production source or existing test was changed.

## Latest completed run

- Command: `node tests/emberwake-firstload-browser.mjs` from `/data/work/Swordigo-V2`.
- Completed: **2026-10-13T21:53:08.031Z** (UTC).
- Evidence: `/data/emberwake-firstload-integrated.txt` outside the repo, terminal output plus per-check JSON. `node --check tests/emberwake-firstload-browser.mjs` also passed.
- Runtime: installed Playwright and sandbox-local headless Google Chrome for Testing `153.0.8010.12`, `--no-sandbox`; no shared browser, Git, installs, credentials, build or preparation execution.
- Local HTTP fixtures freeze existing dist bytes in memory. Cache tests use genuinely cacheable responses and CDP cache-hit observations, **not Playwright routing/interception**. HTML/worker revalidate; scripts/styles have immutable/max-age fixture headers.
- Root and `/Swordigo-V2/` uncontrolled/failure cases block workers. Separate fixtures explicitly refuse registration. An allowed-worker fixture tests cold claim and first reload at the prefix.
- Existing preview `http://127.0.0.1:4173/Swordigo-V2/` responded with `Cache-Control: no-store`; its HTML matched frozen dist and included the chapter runtime and corrected gate. All four native failed-title/export cases used this restarted preview. The parent owned build/server restart; this agent did not rebuild or restart it.

### Final artifact byte identities

| Item | SHA-256 |
| --- | --- |
| Frozen dist/index.html; source index; existing preview HTML | `959c81e3e136abc78a454d7e3eb6b53067ab1460000c8b67333e43c57515da68` |
| Frozen dist/sw.js; source worker | `4da42b47ac8ccf5748986a7368b7d69dc1db69858ca84bc49a622fc14bdb9a01` |
| Frozen dist/assets/scripts/engine.js | `b3bffa7d71a8425aca5cc9d19968da58fdcc1a0f145107e9f128de0d602946a6` |
| Frozen dist/assets/scripts/client.js | `e0e3025eabcda4a9425ba31f9016455e83e334c49f33d82150e0f7d05a3ffdb9` |
| chapter-data.js | `f6e321855859c71a5babe14a2d01d76800c1b24c92b9590a3d304c7805dca158` |
| chapter-save.js | `35e6099582e3a55b219adc369b5e108596f5d1a0b19ab5f175b8efb4cf9f357b` |
| chapter-runtime.js | `dcf3c059695cc3e90d1f728749ab169061b7e85514041d30a3409c69f6ff297b` |
| Inspected prepare-emberwake.mjs | `a825c28074b27930c1fde5fcc98ad6e66936c9b50b304a9b3049b01e108e256a` |
| Harness at completed run | `54f0d363b0f5ce65bb254a0ad5dc293e2b12d5cd992cd7bbe185e8083ade5c88` |

Source/dist equality passed for HTML, worker and every script/style referenced by HTML. These fingerprints describe this run only. No commit identity was checked; later builds need fresh evidence.

## Results

| Check | Passed | Failed | Interpretation |
| --- | ---: | ---: | --- |
| All 14 script/style digest URLs match frozen bytes | 1 | 0 | SHA-256 prefixes match |
| All 14 SHA-384 SRI values match frozen bytes | 1 | 0 | Preparation supplied matching integrity attributes |
| Current source equals frozen dist first-load runtime | 1 | 0 | Source/build freshness gate closed for this run |
| Wrong same-key HTTP-200 script/CSS bytes, root + prefix | 4 | 0 | SRI blocked execution/application; recovery, no App, storage unchanged |
| Complete uncontrolled cold boot, root + prefix | 2 | 0 | Core/encounters/journal/persistence/presentation/chapter identities present |
| Actual stale HTTP-cache bypass, root + prefix | 2 | 0 | 22 observed cache hits per case; all 14 new addresses fetched |
| Explicit registration refusal, root + prefix | 2 | 0 | Complete boot works without registration |
| Individual extension/style 404, root + prefix | 22 | 0 | All eleven tested resources fail closed |
| Cold worker claim + first claimed reload, prefix | 1 | 0 | Complete integrated artifact boots under worker control |
| Existing preview HTML equals frozen dist | 1 | 0 | Restarted preview freshness gate closed |
| Native failed Save & return then export, four V4 faults | 4 | 0 | Live journey exported; authoritative and frozen legacy bytes retained |
| **Total** | **41** | **0** | **Exit 0; focused local gate only** |

### Same-key SRI rejection

For `client.js` and `sequel-v12.css`, at both base paths, the HTTP fixture returns **200 at the actual current digest address** but substitutes deliberately wrong executable/script or CSS bytes while retaining the real HTML's integrity attribute. Assertions require the corresponding server request, a Chromium integrity/digest-block diagnostic, `EW_BOOT_FAILED=true`, no App, explicit recovery text, no wrong-script execution marker or wrong-CSS computed marker, and unchanged V3 primary/backup plus V4 sentinel bytes. Thus failure is not inferred only from a missing global and is not caused by a 404 or route abort.

### Missing-resource gate

The corrected gate refuses boot at **both root and prefix** when any individually tested resource is 404: chapter-data, chapter-save, chapter-runtime, core, encounters, journal, controls, journey, realm, presentation, and sequel stylesheet. V3 primary/backup and V4 sentinel bytes remain unchanged. Sentinels are deliberate byte-preservation fixtures, not claims about valid journey contents. The header installs capture listeners before external resources; the DOMContentLoaded gate requires completed resource loads and no captured runtime/resource error. These cases establish missing-resource behavior, not a full independent runtime-exception matrix.

### Real-cache fixture boundary

The synthetic old release uses frozen script/style bodies with execution/CSS markers, its own old SHA-derived URLs and **matching old SHA-384 integrity values**. This is not a historical production release. The browser executes/applies those old bytes, primes unversioned paths, reloads and observes genuine HTTP-cache hits. After switching to current HTML without clearing the cache, all 14 new addresses are fetched, stale script/CSS markers are absent, and stale unversioned client bytes remain cache-readable. Old synthetic SRI is recomputed only in fixture HTML, never production files; wrong same-key tests retain the real integrity unchanged.

Query digest addressing plus SRI covers the tested wrong-response case. It does not prove atomic publication, real CDN query/cache/header behavior, handling of older cached HTML lacking SRI, old-HTML/new-image compatibility, protection of HTML itself, or deployed MIME/CSP correctness. Images remain unversioned. Worker passes do not remove those limits.

### Native V4 failed-title/export evidence

The integrated story writes **EW_STORY_V4**; a separate legacy `.backup` fault would not test its single-key envelope transaction. The harness now uses denied reads, denied authoritative writes, authoritative quota and revision conflict instead.

Seed V3 story gold 111 and backup 9 as frozen historical bytes, and seed a valid V4 envelope through ChapterSave with previous base gold 9, current base gold 111. Reload, click native Continue, pause with Escape, then explicitly inject unsaved live gold 333 and the failure adapter. For the conflict fixture, an external writer advances only the stored revision before the title attempt; the app keeps its stale expected revision. Browser storage is not filled to physical quota.

| Fault | Observed attempted writes | Native result |
| --- | --- | --- |
| Denied reads | None | Read fails before writes; authoritative and legacy bytes retained |
| Denied V4 writes | `EW_STORY_V4` | Write rejected; authoritative and legacy bytes retained |
| V4 quota | `EW_STORY_V4` | Write rejected; authoritative and legacy bytes retained |
| V4 revision conflict | None | Stale expected revision refused; externally advanced stored envelope retained |

Native **Save & return to title** retains the same live Game object, exact paused base snapshot, playing status, pause modal and hidden title screen. Cached savedStory stays 111, app revision does not advance, and authoritative bytes stay exactly equal to the pre-attempt envelope. Both V3 story and V3 backup remain byte-for-byte frozen in all four cases. Exact write-attempt lists are asserted.

The toast truthfully says saving failed and the live journey remains open. Native **Export journey** completes a real download; parsed JSON equals the **entire live portable payload**, including base gold 333 and chapter state, and passes ChapterSave payload normalization. It is compared against `portableJourney()` captured before the attempt, not against cached durable data or merely the gold field. Native Resume then retains 333. Title/Continue cannot be reached through the failed transition. No direct title/export call substitutes for user controls.

This validates the failure guard on the final integrated preview; it does not validate chapter delivery/reward semantics or a general competing-tab ownership policy. The revision-conflict case is one focused conflicting-save refusal fixture.

## Preserved history and remaining gates

- Initial completed run, `2026-10-13T21:44:52.549Z`, `/data/emberwake-firstload-final.txt`: **14 pass / 15 fail**, fourteen missing-extension/style fail-open failures plus engine/source-dist mismatch.
- SRI corrected-artifact rerun, `2026-10-13T21:47:00.500Z`, `/data/emberwake-firstload-sri-rerun.txt`: **32 pass / 2 fail**, source client/dist divergence plus old preview HTML. Native saves then ran on the old preview; not integrated evidence.
- Latest integrated run supersedes those first-load/freshness failures with **41 pass / 0 fail** on the fingerprinted artifact. Exploratory interrupted runs are excluded from totals.

No additional production fix is indicated by this focused completed run. Keep the `client.title()` save-result guard, matching SRI, early load/error capture and completed-resource gate intact. Rerun on later source/artifact changes. Actual deployed publication/cache/MIME/CSP behavior and all broader council/retained chapter gates remain separate requirements. Preserve journeys; do not recommend clearing storage as recovery.

## Reuse

The harness owns neither build nor existing preview. It reads dist, starts/stops only its disposable fixture server/browser, prints JSON and exits nonzero on failure. `EW_URL` selects an already-running preview. If none responds, it explicitly states a skip and tests failed-title behavior locally instead; that fallback is not existing-preview evidence. Native fixtures recognize V4 chapter integration and retain a legacy V3 branch for historical builds. No all-green local run constitutes production certification.


## Final connected chapter build

Parent rerun: 41 passed / 0 failed. Exact index SHA256: `bb0b35ed9ca8e275fd19ccca8c078a74caa5fca8d499c9dfcb6348540f2035ad`. Current final report and served/source hashes: `qa/correction/chapter-final/firstload.json` and `served-source-hashes.json`. This supersedes prior snapshot hashes, without erasing prior failures. Native delivery and both-ending route checks are separate in CHAPTER-ACCEPTANCE.md.
