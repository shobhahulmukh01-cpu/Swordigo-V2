# Next visual council — approval proposal only

## Evidence and diagnosis

Read `next2/PARENT-BRIEF.md` (baseline e5687c9). Read the artifact-design skill completely; inspected `index.html`, active Canvas scripts, asset provenance, alpha.3 reports and existing fixture code. Individually inspected these final PNGs under `qa/correction/next-final/visual/`: `rootcellar-desk-desktop`, `millpond-water-desk-portrait`, `star-archive-engine-warning-desktop`, `cooling-gallery-coal-desktop`.

The inherited plates are rich; nearby terrain, desks, pipes and actors remain comparatively flat. Rootcellar is enclosed but reads as repeated rectangular panels. Archive racks look suspended against an outdoor vista. Cooling's distant forge overwhelms its tiny functional vent. Portrait Millpond is readable but much of its canvas showcases the inherited vista rather than a newly authored place. The corrected nameplates and LIGHT warnings are legible in inspected frames; do not undo these fixes.

Alpha.3 has meaningful semantic improvements, not yet a convincing sequel-scale visual transformation. More labels, glowing rectangles or extra particles will not bridge that gap. This inspection does not qualify live gameplay.

## Coherent direction: “a lived-in world learning to repair itself”

Keep the three painted worlds, courier silhouette and working engine. Establish moss/aged brass/paper as a shared material language: cool, subdued depth; warm human-scale repair landmarks; highest local contrast reserved for actors, weapons and danger. New identity should come from composition, material integration and visible aftermath, not proprietary Swordigo motifs or a replacement renderer.

### 1. Make each room a composed place, not scenery plus floating props

**Independent recommendation: yes, the four optional rooms recycle the original vistas too visibly.** High-quality original environment layers would materially improve in-play identity; prioritize them over further title/HUD polish. Keep all three campaign plates unchanged. For optional rooms only, composite room-specific painted midgrounds over their inherited distant plate: terraced irrigation stonework (Millpond), enclosed cooling manifold (Gallery), root-bound civic cellar walls (Rootcellar), vaulted record stacks (Archive). Rootcellar exposes the original Vale only through its slit; Archive should read as an archive, not outdoor shelves.

**Polish now proposed:** manually reviewed existing-art crops, quieter distant contrast, material matching, and valve→trough / vent→pipe composition. Cache derivatives; no per-frame pixel processing. Crop reuse alone is unlikely to provide sequel-scale novelty.

**Separate authored-art approval required:** generate/commission four original painterly midground layers, each with transparent gameplay clearance, camera-edge overscan, and matching plate perspective/palette. Start with Rootcellar and Archive approval samples, then authorize the remaining pair. No scenery generation now. Reject baked text, actors, apparent walkable ledges, faux geometry, or borrowed proprietary designs. Draw layers behind existing terrain/hazards/actors; preserve the actual floor, silhouettes, LIGHT marks and collision. Evaluate at real play cameras, not promotional framing.

### 2. Give the courier and Engine intentional combat staging

Use existing `hero`, `boss` and event hooks. Improve visual-only weapon/forearm silhouette and cape follow-through around the simulation's existing strike phases; preserve weapon reach, timing and facing. Give Engine's drum a clear idle/warning/recovery posture through restrained mechanical articulation of its existing parts, not humanoid animation. Make recovery readable without depending on its HUD text.

Use tight contact shadows and short, directional impact accents; suppress decorative bloom near warning circles. No camera zoom, gameplay hit-stop, new screen shake or full-screen flash. Never enlarge painted attack arcs beyond the actual attack envelope.

**Polish:** existing articulated Canvas forms and event feedback. **Authored-art gate:** painterly Lyra/Engine skins require an approved original animation atlas with consistent pivots and silhouette review; no commercial-game sprite tracing. A new atlas is not necessary for the first staging pass.

### 3. Stage repair as a visible payoff, not a tiny completion prop

Keep committed delivery facts as the sole authority. Recompose the existing planter, banked hearth and posted Charter with adjacent existing scenery into readable human-scale vignettes. Warm only their immediate backdrop; keep live lava and hazard colors unchanged. Use matching crops/materials from improvement 1 rather than new procedural furnishings. Let established chapter/objective UI briefly announce the repair, then return to normal; no blocking cinematic, input capture or permanent extra HUD panel. Each aftermath must remain obvious with titles hidden and motion disabled.

**Polish:** placement, contrast and existing props. **Authored-art gate:** unique flourishing foliage/hearth/notice-board illustrations need original art approval, not a claim that lighting alone supplies authored content.

## Suggested ownership after approval

- Environment owner: `assets/scripts/realm-v11.js`, approved derivatives in `assets/images/next2/`.
- Presentation owner: `assets/scripts/presentation-v12.js` for staging and aftermath; sole owner to prevent wrapper-order conflicts.
- UI owner: `assets/styles/sequel-v12.css`; coordinate any `client.js` edit through parent, preserving collision-aware labels.
- QA owner: extend `tests/emberwake-chapter-visual.mjs`; new visual contracts in `tests/emberwake-next2-presentation.test.cjs`.
- Parent alone: integration/SRI/build inventory and `ASSETS.md` provenance. No simulation, saves, scene IDs, hitboxes or legacy/Lumen replacement work.

## Accessibility, motion, mobile

Keep READY/LOCKED/DONE words and shapes. Measure text contrast ≥4.5:1, meaningful UI/warnings ≥3:1; never color-only danger. Minimum 44px touch targets, safe-area clearances, readable 14px UI floor. Reduced motion disables decorative drift, recoil and pulses, retaining static attack/state cues. No strobing. Preserve portrait boss-HUD placement and available landing/attack space; verify landscape separately. Decode/cache derivatives once; reject effects exceeding parent-approved mobile frame/memory budgets.

## Precise visual QA fixtures

Capture after parent approval/build; inspect every PNG individually, never just contact sheets.

| Fixture set | Required captures |
|---|---|
| Room composition | Millpond x400/1600; Cooling x420/1770; Rootcellar x390/1440; Archive x790/1450, at 1440×1000, 390×844, 844×390: 24 |
| Combat | Engine idle/windup/attack/recover; hero strike-start/contact/recovery/dash, at all three sizes: 24 |
| Aftermath | Three recipients, absent/committed, at all sizes: 18; title-hidden, motion-off |
| Stress | Portrait adjacent labels; portrait Engine warning; landscape interaction modal; missing derivative fallback: normal/reduced-motion pairs, 8 |

Require zero HUD/label overlap, intact warning/landing boundaries, recognizable unlabeled rooms, unchanged attack envelopes. Synthetic fixtures prove rendering only; persistence, earned completion and device performance remain separate gates.

## Premortem

**Still looks like an overlay:** approve original room-layer samples in play before producing the set; reject incoherent crops, not more primitives. **Effects obscure attacks:** background-only grading, combat-state suppression, compare contact frames. **Wrapper conflicts/stale delivery:** single file owner, derive every frame from committed facts, test journey replacement. **Mobile degrades:** cached small derivatives, no dynamic blur, reject on measured regression.

Only this plan was written. No implementation, rendering, tests, build, Git, installation, authentication or browser actions were performed.
