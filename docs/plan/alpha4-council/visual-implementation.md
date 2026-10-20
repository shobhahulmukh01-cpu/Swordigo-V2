# Next2 visual implementation — handoff, visual gate pending

## Cross-council reconciliation

Read the experience, gameplay and reliability councils before editing. Preserve their single next-action selector and existing optional-room authorization; this work introduces no competing guidance, saves, discoveries, rewards, dialogue or travel. No client/CSS change is requested. Keep injected render fixtures distinct from earned discovery, delivery/persistence and device-performance evidence. The future return lamp remains owned by gameplay; ordinary ability rendering still delegates unchanged.

## Owned changes

- `assets/scripts/realm-v11.js`: lazy per-room authored-plate mapping for `chapter-millpond.webp`, `chapter-cooling.webp`, `chapter-rootcellar.webp`, `chapter-archive.webp`. Success requires actual `Image.decode()` resolution (or loaded-image support fallback), complete image and positive natural dimensions. Pending/loading/error retains the original alpha.3 backdrop including original plate and room architecture. Decoded art replaces the primitive room-architecture overlay, not collision, terrain, hazards, live mechanisms, actors or labels. Three main plate paths/loading/drawing behavior remain untouched. Aspect ratio preserved, no source-pixel enlargement, restrained camera-relative drift ≤12 world units each side, zero drift with reduced motion. Opaque matching matte prevents outdoor edges in ultrawide views. No retry loops or per-frame asset creation/pixel processing.
- `assets/scripts/presentation-v12.js`: read-only courier phase classifier and restrained rear-cloth fold; delegates the original hero object and sword path/timers unchanged, adds no attack arc, hit-stop, zoom or shake. Reduced motion fixes the new fold and decorative renderer clock, retaining the state-based existing sword cue. Engine's inner drum raises in warning, lowers with staggered bands during recovery; yoke/supports, warnings, entity coordinates and simulation stay fixed. Idle drift suppressed under reduced motion. Committed recipient props receive a static, faint localized warm pool and 14% horizontal composition expansion, with original vertical bounds/labels retained. No consequence or warmth exists before a committed delivery fact; no new cache/state.
- `tests/emberwake-next2-presentation.test.cjs`: six small non-browser contracts covering four asset paths, pending/error/decode rejection, decoded replacement, source-size cap/ultrawide matte, no reduced-motion drift, exact hero delegation/state purity, Engine phase staging/delegation, committed-only repair/journey replacement.
- `tests/emberwake-chapter-visual.mjs`: strict decoded-art gates, actual request-abort fallback fixtures, actual encounter initialization for warning/attack/recovery, explicit landscape coverage, hero phases and reduced-motion captures. Remains isolated synthetic rendering, never earned evidence.

Parent alone owns generated files, provenance, asset conversion, build/SRI/service worker/inventory and publication. No other game files were edited by this agent.

## Small checks actually run

Passed `node --check` on both changed render scripts and the visual harness. Passed original `emberwake-chapter-presentation.test.cjs` (6 checks), and new next2 suite (6 checks). Initial new repair contract failed because its fixture retained the previous Engine camera (x1300), culling the recipient. Corrected test-only camera to x0 and reran; no production acceptance predicate was weakened. These are contracts, not screenshot/performance qualification.

## Parent capture plan

For the two available authored plates first:

`EW_VISUAL_PANEL=first2 EW_VISUAL_OUTPUT=<fresh-output-directory> node tests/emberwake-chapter-visual.mjs`

Run only after parent builds and starts its server. Supply `EW_URL` if not the existing default. Exactly **10 PNGs**: Rootcellar desk/Charter and Archive records/Engine-warning at 1440×1000 and 390×844; Rootcellar desk and Archive Engine-warning at 844×390. Strict art readiness is default; this panel does not request missing Millpond/Cooling art. No browser execution by this agent.

After first2 approval and all four generated plates, default full panel is **47 PNGs**, not 74:

- 28 retained desktop/portrait room and paired committed-delivery fixtures.
- 6 landscape fixtures (four room views, hero strike, Engine recovery).
- 7 portrait phases (Engine idle/attack/recovery; hero set/strike/followthrough/dash).
- 2 portrait reduced-motion pairs (strike and Engine recovery).
- 4 portrait real missing-asset fallbacks, one per room.

Delivery before/after fixtures run motion-off and all captures hide chapter/toast overlays after initialization; HUD and physical statuses remain. Portrait real warning/HUD clearance assertion retained. `EW_REQUIRE_CHAPTER_ART=0` is an explicitly degraded diagnostic mode, not authored-art acceptance. Full/default run remains strict.

## Art and visual QA state

Individually inspected parent-produced `chapter-rootcellar.webp` and `chapter-archive.webp`. Cellar has rooted masonry, paper/shelf context, daylight slit and a dark base. Archive has recessed record stacks, vaulted enclosure and a subdued mechanical alcove. They materially improve identity compared with the reused outdoor vistas; these source-asset observations are NOT integrated gameplay clearance. Both have horizontal rear masonry seams; confirm these do not look walkable against bright foreground platform edges. Portrait center crop may omit the cellar's off-center daylight slit; masonry still supplies identity, but inspect rather than assuming.

First2 integrated captures and all post-change individual visual inspection remain pending parent execution. Potential issues to resolve from those images: foreground/background material mismatch; matte edges on unusually wide displays; rear-wall seam ambiguity; Engine/hero posture clarity; aftermath halo subtly washing a nearby floor. If defective, fix assigned renderer only and require replacement captures. No claim of visual pass, accessibility/device clearance or release readiness yet.

No browser, build, Git, installation, authentication or credential handling was performed.

## Sample-filter addition / snapshot readiness

Renderer and harness declared stable for parent's isolated preview snapshot. Added `EW_VISUAL_FILTER` (comma-separated literal filename substrings, bare scene slugs, or exact scene IDs) and `EW_VISUAL_VIEWPORTS` (comma-separated `desktop,portrait,landscape`). Unknown viewport values fail, zero matched fixtures fail, selected count must match actual captures, and unfiltered default still asserts exactly47. Optional `first2` panel remains exactly10 unfiltered. Diagnostic art mode still waits for real image decode success/error; it does not capture a loading frame.

Requested six-frame sample command:

`EW_REQUIRE_CHAPTER_ART=0 EW_VISUAL_FILTER=rootcellar-desk,star-archive-records,star-archive-engine-warning EW_VISUAL_VIEWPORTS=desktop,portrait EW_VISUAL_OUTPUT=<preview-output> EW_URL=<isolated-snapshot-url> node tests/emberwake-chapter-visual.mjs`

Parent will copy/build preview outside the mutable repository. Those samples establish provisional composition only, not frozen-source release evidence. Syntax and both six-check contract suites passed after the filter addition. No browser invoked here.

## First2 integrated preview: all ten images individually inspected

Source: `/data/work/plan/next2/first-art-captures/`, isolated preview snapshot built outside repository by parent. Manifest lists ten captures and no page errors. Every listed PNG below was opened individually, not via montage. Frozen renderer at snapshot time; other gameplay/client work may have been mid-implementation. This review approves the two generated plates and their framing, NOT final source/release/UI acceptance.

| Exact PNG | Art/framing | Concrete observation / UI finding |
|---|---|---|
| `rootcellar-desk-desktop.png` | PASS | Rooted stone enclosure, shelves, bundled paper and daylight make a convincing cellar. Rear-wall base is dark, live shelves/floor have bright crisp edges. Letter, READY, courier and door remain readable. |
| `rootcellar-charter-desktop.png` | PASS | Charter desk/READY and return arch clearly separate from rear masonry. Painted shelf is visibly behind the bright playable platform. No clipping or label overlap. |
| `star-archive-records-desktop.png` | PASS | Recessed scroll stacks and mechanical alcove create a room, replacing the previous floating rack feel. Water/Engine/summer interaction silhouettes and status labels remain readable below dark wall base. |
| `star-archive-engine-warning-desktop.png` | PASS | Engine/yoke and gold warning marker separate from the cool archive wall. Both LIGHT labels, dotted stems and warning ellipses read on the dark foreground. Boss panel remains below gameplay. |
| `rootcellar-desk-portrait.png` | PASS | Center crop omits the off-center daylight slit, but mossy masonry and shelves still establish an interior. Quiet dark band keeps letter, READY and courier clear; touch controls below floor. No art change needed. |
| `rootcellar-charter-portrait.png` | PASS | Paper desk, Common Hearth Charter name and READY remain clear against the dark rear base. No overflow; foreground enemy/courier silhouettes remain distinct. |
| `star-archive-records-portrait.png` | PASS | Central mechanical alcove and vault retain identity even with most side stacks cropped. Challenge console/courier are unobstructed; bright service shelves distinguish walkable geometry from rear seam. Existing long objective panel occupies upper art only, not gameplay. |
| `star-archive-engine-warning-portrait.png` | PASS | Top combat readout stays above the action. Gold exclamation/core, both LIGHT labels and floor circles remain visible. Background gears do not compete with the live Engine outline. |
| `rootcellar-desk-landscape.png` | PASS art; UI ISSUE | Short view crops to the rear stone wall, still clearly enclosed. Letter/READY/player/floor remain visible. **Existing minimap is drawn underneath right-side touch buttons**, visible through/behind LUMEN/STRIKE/JUMP. Proposed minimal realm guard: suppress minimap when `viewH<720`; detailed Map remains available. Awaiting parent approval before editing. |
| `star-archive-engine-warning-landscape.png` | PASS art; UI FAIL | Archive shelves/alcove remain distinct; rear seam stays behind foreground. **Centered landscape boss panel overlaps Engine core, courier upper body and LIGHT text.** Ellipses remain visible but this is not combat presentation clearance. Parent CSS/client owner should move compact landscape combat readout into top objective lane, replacing redundant objective text, and re-capture. No renderer/asset change justified by this issue. |

### Art gate decision

**Approve Rootcellar and Archive plates/framing; proceed with the remaining two original environment plates using the same quiet lower region and material specificity.** Do not regenerate the approved pair to solve UI layout. All ten art compositions are acceptable provisionally; two landscape UI issues prevent unconditional integrated visual acceptance. No source files changed during this review. Parent notified with exact affected filenames and proposed smallest ownership-respecting fixes. Require individually inspected replacement landscape PNGs, then the final frozen-source full matrix after remaining art/integration.

## Approved minimap correction and owned-file freeze

Implemented the parent-approved minimal correction in `realm-v11.js`: minimap skips only when `viewH < 720` **and** canvas width exceeds height **and** canvas height is below540. Does not change the minimap preference or detailed Map access. This prevents the observed short-landscape touch-control collision without blanketing every low `viewH` fixture.

Added seventh nonbrowser contract: short landscape omits minimap; ordinary desktop still draws it; `viewH=720` does not trigger this guard; a taller canvas is not treated as short landscape. Game bytes and minimap preference remain unchanged. All seven next2 contracts, six original presentation contracts and four owned-file syntax checks pass. No browser/build/Git/install/auth.

Owned-file hashes recorded at `/data/work/plan/next2-visual-freeze.json` (four source/test files with byte sizes and SHA-256). Renderer stable again for parent's integrated final build and47 captures. Parent owns the separately confirmed landscape boss CSS correction, all four generated assets, provenance and24-asset offline inventory. The two earlier landscape findings remain historical evidence until individually inspected replacement captures demonstrate clearance; this contract alone is not a screenshot pass.

## Subsequent authorized retained defect D3 — new freeze

Completed all47 individual final-visual PNG inspections first; full per-image notes are in `/data/work/plan/next2-visual-inspection.md`. Those captures are explicitly scoped to the earlier11943f254523 bytes, before this D3 change and subsequent parent CSS/welcome changes. Previous landscape Engine overlay and short-landscape minimap findings are visibly cleared in that set. No new chapter art blocker was found; this is not final-byte release clearance.

Read retained-review D3 and individually opened its `upgrade-browser/game-desktop.png`: live-map marks visibly sit beneath the keyboard tutorial. Parent approved the minimal correction. Edited **only** `realm-v11.js` and `tests/emberwake-next2-presentation.test.cjs`: minimap yields when actual `#guide` is not hidden, has a positive rendered rectangle, and computed display/visibility/opacity indicate visibility. Does not guess tutorial state from journey facts, alter the preference, disable detailed Map, or remove the previous short-landscape guard. Hidden/absent/zero-size/CSS-hidden/transparent guides do not suppress minimap.

Eighth focused contract covers these visibility variants and verifies unchanged journey/preference. Eight next2 contracts and six original presentation contracts pass; both changed files pass syntax. New freeze JSON contains realm SHA-256 `9d2544193e6867e448802653849fb651d36a41fd73bbb8b2b5242b906ebecd40`, own test `1e2a83ba38df548837f4d93a5025bd7462de8997c5dd8d4fa751da98fbe884c1`. Presentation and visual harness remain byte-unchanged from prior freeze. No further source edits planned until approved replacement-image defect; parent requires rebuilt replacement retained captures for current-byte D3 visual acceptance. No browser/build/Git/install/auth actions.
