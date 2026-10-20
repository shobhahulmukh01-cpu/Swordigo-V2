# Alpha.4 retained screenshot inspection — independent read-only review

## Scope and disposition

Individually opened and visually inspected **all 13 upgrade-browser PNGs and all three baseline-browser PNGs** in `qa/correction/next2-final/`. No contact-sheet substitution. The baseline landscape image transfer initially failed; a second read succeeded, and that actual image was inspected. No browser, test execution, source edit, Git, build or reliability workload was launched. Only this inspection document was written.

**Not a blanket visual pass:** five screens show concrete defects/concerns below. The other eleven pass their visible layout check, with stated limits. The parent-reported 13+54 functional passes and earned/replay matrices are separate evidence, not screenshot acceptance. Product version/source-image equality were supplied by parent, not independently verified here.

## Findings requiring parent disposition (no source fixes made)

**D1 — Important: portrait loses the persistent contextual objective.** Both portrait gameplay screens show vitality, realm title, interaction prompt and touch controls, but no persistent original-adventure next-action text. `game-mobile.png` has neither a rune direction nor equivalent contextual card. `portrait-game.png` has a temporary welcome toast with the rune action, not a persistent replacement. This weakens the milestone's fresh/returning direction precisely on portrait. A still cannot establish the objective appears later; parent should verify intentional policy or restore a compact persistent cue in a separately authorized change.

**D2 — Medium: returning landscape toast obscures interaction prompt; mixed input wording.** In baseline `landscape-game.png`, the welcome toast covers the lower part of “Tap INTERACT · Speak to Mara…” at the upper center. The same toast ends in keyboard `K`, while the persistent objective correctly says `Tap LUMEN`. Baseline portrait also has `K` in the toast next to touch wording elsewhere. These are visible stale/mixed labels, not proof that touch input fails. Reserve separate regions or shorten/defer the toast; derive its action label from active input mode.

**D3 — Low/medium: desktop minimap/help-card collision.** Upgrade `game-desktop.png` draws pale minimap platform/marker lines behind the bottom-right “THE PATH AHEAD / SPACE · DOUBLE-JUMP / J chains strikes…” help card. Two information layers share the same area, reducing both map and tutorial clarity. They should not be shown in the same rectangle.

**D4 — Low: landscape title utilities have weak local separation.** Upgrade `title-landscape.png` places the pale sound/fullscreen/Settings controls over bright palace/cloud detail; Settings in particular blends into the backdrop. Main Begin journey remains clear. No numerical contrast ratio was measured; this is a visual separation finding, not an AA certification/failure calculation.

**Cosmetic observation:** all three desktop guardian frames have the right edge of the Q/GUARD button slightly intersecting the left/bottom region of the boss HUD border. Neither guardian instructions nor Q label is obscured; this is not the earlier hero/floor-warning occlusion.

## Per-image inspection

| Image | Concrete result |
| --- | --- |
| upgrade-browser/forge-warning.png | **PASS, cosmetic note.** Hour-Eater, Lyra and the two WAVE corridors are visible above the ground. Boss name/bar/instruction are below the playable floor, not over the warning lanes. Upper objective gives clear warning→recovery advice. Q/boss-border intersection as noted. |
| upgrade-browser/game-desktop.png | **DEFECT D3.** Canopy-rune casting cue is readable upper-right, with K label; hero, Mara and Millpond doorway remain visible. Bottom-right live-map marks run beneath the keyboard-help card. |
| upgrade-browser/game-landscape.png | **PASS visible layout.** Left/right and six action buttons fit inside the viewport; hero and floor remain above controls. Contextual rune cue, title, vitals and centered rest prompt occupy separate regions. Screenshot has keyboard K/E wording despite visible touch buttons; actual touch-mode wording is demonstrated separately by baseline landscape. |
| upgrade-browser/game-mobile.png | **DEFECT D1.** Portrait vitals, title, rest prompt and two-row touch grid fit without hiding hero/floor. Persistent rune direction is absent. E-rest wording is visible alongside touch buttons; snapshot alone does not identify active input modality. |
| upgrade-browser/journal-desktop.png | **PASS visible region.** Existing per-realm letter counts/route prose remain legible. Original adventure guidance is visibly separated from the optional-delivery heading. Lower content extends below the scrollport; this still cannot qualify scroll reachability or every lower button. |
| upgrade-browser/map-desktop.png | **PASS visible region.** Diagram, original-adventure action, labeled nearby leads, lock explanations and “labels, not travel buttons” text are separated. Current-realm button has visible focus. Remaining realm rows extend below the scrollport; no reachability claim. |
| upgrade-browser/pause-desktop.png | **PASS.** Resume/map/journal/settings form a clean row; export/import/title controls and controller copy are separated. Nothing overflows or obscures the primary Resume action. |
| upgrade-browser/regent-warning.png | **PASS, cosmetic note.** Both LIGHT circles and labels are visible on/above floor; Lyra and Veyr remain distinguishable. Boss panel stays below the floor, upper-right recovery cue readable. Q/boss-border intersection only. |
| upgrade-browser/settings-desktop.png | **PASS visible region.** Labels align with volume/check boxes/quality control; Done/Controls/touch/remap actions are readable. Lower live-map explanation is cut by the scrollport; offscreen controls and scrolling are not inspected by this frame. |
| upgrade-browser/title-desktop.png | **PASS.** Begin journey, original-adventure positioning, locked Gauntlet and three realm tabs are distinct and contained; no title/body/button collision. This is a fresh title, not saved-journey menu coverage. |
| upgrade-browser/title-landscape.png | **DEFECT D4.** Main title and Begin journey fit the short viewport; utility controls at top-right blend into the bright palace detail. |
| upgrade-browser/title-mobile.png | **PASS.** Title, synopsis, Begin journey and secondary links fit the portrait width; no clipped main action. Footer saving note remains readable. |
| upgrade-browser/warden-warning.png | **PASS, cosmetic note.** ROOT circles/labels and hero's feet are visible; Warden silhouette and exclamation are clear. Boss HUD sits below floor, with readable “LEAVE THE MARKS” instruction. Q/boss-border intersection only. |
| baseline-browser/desktop-title.png | **PASS.** Taller desktop title keeps CTA, supporting text and realm strip separated and inside the frame. No visible clipped title or menu action. |
| baseline-browser/landscape-game.png | **DEFECT D2.** Touch grid and floor/hero are unobscured and persistent objective correctly says Tap LUMEN. Welcome toast overlaps the Mara interaction prompt and still says K. |
| baseline-browser/portrait-game.png | **DEFECT D1/D2.** Touch buttons/hero/floor are visible, and prompt fits its width. Rune direction exists only in a temporary welcome toast ending in K; no separate persistent objective is shown. Delivery label crowds Mara's faint name, but no critical control is covered. |

## Coverage boundary

Guardian clearance is visually supported **only for the three desktop guardian frames here**. There are no portrait/landscape guardian images in these sixteen, so they cannot certify mobile combat HUD clearance. None shows the completed-save continuation menu, shrine preview, letter coda or the chapter return lamp; acceptance of those requires other evidence.

These screenshots do not qualify physical touch targets, multitouch, controller use, focus order, screen-reader behavior, real-device rendering/performance, motion/reduced-motion behavior, human discovery/pacing or numerical contrast compliance. No all-clear claim follows from eleven frame-level passes. Parent retains active-source freeze and owns defect disposition/future captures.

## Inspected file inventory

Hashes identify the precise PNG bytes reviewed, not runtime provenance or authenticated release identity.

| Image | Pixel dimensions | SHA-256 |
| --- | --- | --- |
| `upgrade-browser/forge-warning.png` | 1440×900 | `7f458caa95eb9f880fa3f039853b8280a18c3e7b50983b4dd836d4a5570af6a8` |
| `upgrade-browser/game-desktop.png` | 1440×900 | `d34647197032b44b5c5ffe79d1265c39d163e60d14786508d367d1f21feb8126` |
| `upgrade-browser/game-landscape.png` | 844×390 | `b2a3fc0eabc0b08621e64da2759f8a66c78ee83f027c4f4cc45c7efc3c7fed58` |
| `upgrade-browser/game-mobile.png` | 390×844 | `9876068be26917651b9e796729ba2d772e29495fdb34fe1387cc51d691a20474` |
| `upgrade-browser/journal-desktop.png` | 1440×900 | `2c54e48c4f42cf2cc8a268685a7adae3ec1bf5a457622d11e939c8e7bb082c47` |
| `upgrade-browser/map-desktop.png` | 1440×900 | `0fe6bea30aae8364426efbcb3f41e941cf693ace1499f1dc64234e9ad5612ab3` |
| `upgrade-browser/pause-desktop.png` | 1440×900 | `33ea593631670ba8fdf562ef68a906b83a3c0d6a89fc788531e25da6b4512ab2` |
| `upgrade-browser/regent-warning.png` | 1440×900 | `0631c57396a1356b9e7025cd52cb1727682fb96a6ada633d9596c852ea64e022` |
| `upgrade-browser/settings-desktop.png` | 1440×900 | `0b7e8fd1ee465a0169ed1d33fd9ef6b75f48658c4c6b84d327809ca11a7615ac` |
| `upgrade-browser/title-desktop.png` | 1440×900 | `78e17a7c4ae894f7ed7eb2b56ac17d5597c6d5e757e30e1938818550404d4e30` |
| `upgrade-browser/title-landscape.png` | 844×390 | `c69a2fe9bd456e847a043aaf30718add8177349cc74c73f49c77892cc2f105f5` |
| `upgrade-browser/title-mobile.png` | 390×844 | `fcec47e25503d55061352ff9368270de44ba37129f40567ffc2ec5571aeb6c24` |
| `upgrade-browser/warden-warning.png` | 1440×900 | `62f3d4eeb92abce4e703deb66068b5f9bd9ae9e04972215d34801280ded0cc66` |
| `baseline-browser/desktop-title.png` | 1440×980 | `50b483cddf83f3161bb65f68b4522eb54ead324fb23ceb8a2e42b072a87946fe` |
| `baseline-browser/landscape-game.png` | 844×390 | `bf4e6e49971f791efd3bdcdb002ad6a3356c089370d2a3ffd5f06afdf6ab753f` |
| `baseline-browser/portrait-game.png` | 780×1688 | `f194e2a2e0c37409677adf5f5cc8b43b29e20b4b3d84db98ffd67e5e1c04780c` |


## Replacement review — D1/D2/D4 HUD corrections

Individually opened all **nine** replacement PNGs under `/data/work/plan/next2/hud-fix-captures/`. Read the accompanying `report.json`; its objective/prompt/toast geometry checks are supporting evidence, not a substitute for the image inspection. One return-landscape image read failed to display; the successful second read was inspected. No new capture, browser, test, source or Git operation was performed.

**Disposition: D1, D2 and D4 are visually corrected in the relevant replacement states. D3 remains OPEN for these bytes**, which precede the separate renderer fix. This is not full-runtime visual clearance, nor a deletion of the original failure evidence above.

| Replacement | Exact visual finding |
| --- | --- |
| `title-desktop.png` | **PASS targeted review.** Title, Begin journey, secondary actions and realm tabs remain contained and separated; no regression from the earlier desktop title. |
| `title-portrait.png` | **PASS targeted review.** Title/synopsis/Begin journey/footer retain clear portrait layout; utilities remain distinguishable. |
| `title-landscape.png` | **PASS D4 corrected.** Sound/fullscreen/Settings now sit on a dark upper-right panel rather than bright palace detail. Settings and both icons are distinctly visible; main CTA remains unobscured. This is visual separation, not measured contrast certification. |
| `fresh-desktop.png` | **PASS D1/D2 scope; D3 still present.** Upper-right next-action text and lower-center rest prompt are readable and separate. Bottom-right minimap lines still share the keyboard-help-card region; no D3 clearance. |
| `fresh-portrait.png` | **PASS D1 corrected.** Persistent ORIGINAL ADVENTURE card is clearly visible below the realm subtitle, says “Climb toward the first canopy rune…” and ends in “Tap LUMEN.” Rest prompt has its own separate strip below; hero/floor and the touch grid remain clear. |
| `fresh-landscape.png` | **PASS targeted review.** Upper-right objective says Tap LUMEN, centered rest prompt wraps cleanly in its own panel, and neither intersects vitals or touch controls. No toast is present in this fresh state. |
| `return-desktop.png` | **PASS D2 prompt/input-label scope; D3 still present.** Welcome toast has no trailing K; it is near the top-center while rest prompt is below the floor and objective remains upper-right. Minor cosmetic caveat: toast partially masks the persistent top-center realm subtitle during this transition; a larger central realm title/subtitle is also visible unobscured. Bottom-right map/help overlap remains pre-D3. |
| `return-portrait.png` | **PASS D1/D2 corrected.** Objective, interaction prompt and welcome toast form three separate vertical regions. Persistent cue says Tap LUMEN; toast omits keyboard K. Hero, floor, delivery label and touch actions remain visible below. |
| `return-landscape.png` | **PASS D2 corrected.** Centered rest prompt ends above the welcome toast; objective sits separately to the right. Toast is a single unobstructed line with no K suffix. Hero/floor and complete touch row remain visible; unlike the original baseline landscape frame, the interaction prompt is not covered. |

The supplied report records portrait objective y220–327, prompt y360–404, toast y440–521; landscape objective y90–174.5, prompt y110–170, toast y190–231.59 (horizontal separation also visible); desktop prompt y756–800 and toast y100–137. These measurements match the relevant visual separation, but do not prove transient timing, device ergonomics or interaction behavior.

No new guardian frames occur in this replacement set. Earlier guardian conclusions remain desktop-only. Full runtime remains withheld pending the separate D3 renderer replacement and parent integration gates; all prior device/human/accessibility limits remain.

### Replacement byte inventory

| Replacement | Pixel dimensions | SHA-256 |
| --- | --- | --- |
| `fresh-desktop.png` | 1440×900 | `3e5ac5d538ee3a3fb0c1031b7a73002872e91dd505df8b4ad884c437b2128bd6` |
| `fresh-landscape.png` | 844×390 | `8fd04a7bf3ba8ef300136c840782f29fb223f964be8c904b3b82eb431c1be25d` |
| `fresh-portrait.png` | 390×844 | `4de36b3f86add91ccbb46b9be3f2a88089b95579491a03cf925838702b6a583e` |
| `return-desktop.png` | 1440×900 | `fdbf08c3b853bfe1208be421b5af00c9a822020225957815c28bf67abdc68099` |
| `return-landscape.png` | 844×390 | `3d379ae9b9884edd161a6cd70c639d11bdbc08852b1b531e82a416a8b2bf933c` |
| `return-portrait.png` | 390×844 | `63d49e570ad1d8d490e34eeec662d3e7f1870aee633234e37e90f75fd962b4b3` |
| `title-desktop.png` | 1440×900 | `f68b5bcb8d068163b1aea2e53d67a89de5ebeb4e0d558bffada87950208f018b` |
| `title-landscape.png` | 844×390 | `bc8fa80d973a605805c7c3800b9eed9f3af223647959262bb27a4aa41c2b8360` |
| `title-portrait.png` | 390×844 | `e28769a6488ae61377a7d719e8bad7d1d67f888b3d66c58e4152f92a3370a902` |


## FINAL integrated replacement review — supersedes pre-D3 disposition

**Nine of nine final images individually inspected; PASS for this scoped title/fresh/return HUD review.** Source identity supplied by parent: worker `emberwake-3f5eb6774739`, built snapshot served on 4188. I did not launch a browser or independently fetch runtime bytes. Read `/data/work/plan/next2/final-hud-captures/report.json`: status pass, captures 9, errors empty, with the recorded objective/prompt/toast geometry. Visual inspection below, not the report status alone, supports the disposition.

This section supersedes the previous section's **D3 OPEN** status for the final replacement bytes only. Original and pre-D3 findings remain historical evidence. **D1/D2/D3/D4 are corrected in the relevant final captures.** No full-game, mobile combat, device/human or production clearance is implied.

| Final replacement | Individual inspection result |
| --- | --- |
| `fresh-desktop.png` | **PASS; D3 corrected.** The bottom-right keyboard-help text is no longer drawn over live-map platform bars/markers; the map yields rather than competing for that region. Persistent canopy action remains upper-right, rest prompt lower-center, hero/floor clear. |
| `fresh-landscape.png` | **PASS.** Contextual action ends in Tap LUMEN; rest prompt is independently centered and wrapped. Vitals, scene title and complete touch row fit without covering hero/floor. |
| `fresh-portrait.png` | **PASS; D1 corrected.** The full-width contextual action remains visible below realm subtitle, including Tap LUMEN and rune icons. Separate interaction strip, lower hero and two-row touch grid are unobscured. |
| `return-desktop.png` | **PASS targeted scope; D2/D3 corrected.** Top welcome toast has no stale key suffix; objective and lower rest prompt are separate. No live-map lines behind keyboard-help text. The previously noted cosmetic toast/top subtitle overlap remains during the transition; redundant central realm subtitle is visible. This is disclosed, not a claim of zero overlap everywhere. |
| `return-landscape.png` | **PASS; D2 corrected.** Welcome toast is below the interaction panel, not covering it; objective remains separately upper-right with Tap LUMEN. Toast has no K suffix. Hero, floor and touch row stay clear. |
| `return-portrait.png` | **PASS; D1/D2 corrected.** Objective, interaction and welcome toast occupy three distinct bands; persistent cue uses Tap LUMEN and toast omits K. Delivery label, hero and touch controls remain visible. |
| `title-desktop.png` | **PASS.** Title/description/Begin journey/secondary links and realm tabs remain readable and separated; no clipping of the primary action. |
| `title-landscape.png` | **PASS; D4 corrected.** Dark utility panel separates sound/fullscreen/Settings from the bright palace background; main title, Begin journey and secondary links fit the short viewport. |
| `title-portrait.png` | **PASS.** Portrait title wraps cleanly, CTA is fully visible, synopsis/footer fit width and header utilities remain distinguishable. |

No new blocking defect was found in this nine-image replacement scope. Minor desktop transition-subtitle overlap is accepted here only as a disclosed cosmetic observation; parent retains disposition authority. These captures do not newly test menus below scrollports, saved-ending menu variants, shrines, optional rooms, guardians, controller ergonomics, timing or reduced motion. Parent serial browser suites, exact-runtime verification and other original release holds remain separate.

### Final replacement byte inventory

| Final replacement | Pixel dimensions | SHA-256 |
| --- | --- | --- |
| `fresh-desktop.png` | 1440×900 | `bb99f4874829644c8e3d1628d045d996d9703a963661e4b13dcf6cec3a345d11` |
| `fresh-landscape.png` | 844×390 | `00d48cf08418e56b8a2c2b6ca5fa4899163b4ee71b8046c47c429f1a71d15041` |
| `fresh-portrait.png` | 390×844 | `84765f7c79af22146ca67397160f811649a273c0df215dc282858826c2eb5e0b` |
| `return-desktop.png` | 1440×900 | `4e5b6149da6751eed978f9cab06fd87e7ca8e87ce338becb78b39d4cbaaaf867` |
| `return-landscape.png` | 844×390 | `969b0ae04aa00805a30b107305b35a509c59e8bd53ebfce390e9caa0384858e8` |
| `return-portrait.png` | 390×844 | `c426319b3d7c3fdb40a4903b9aaa9b8542d01cb4ef1be5b673f6ba7f4a19571c` |
| `title-desktop.png` | 1440×900 | `f68b5bcb8d068163b1aea2e53d67a89de5ebeb4e0d558bffada87950208f018b` |
| `title-landscape.png` | 844×390 | `ba21fd7b7d834361ca2206bca698870eb6a834f7083127416ee8228db7d2071f` |
| `title-portrait.png` | 390×844 | `d543d67d6740c173d46c3285e3b3050dc5c7f11b4f92d3a78a9ce40e30396599` |


## Additional mobile guardian fixtures — six images only

Individually inspected the six new `guardian-{1,2,3}-{portrait,landscape}.png` images in `/data/work/plan/next2/final-hud-plus-guardian/`. Did not reinspect the other nine images, run tests, launch a browser, inspect source or invoke Git. Parent reports six positive native-browser fixture tests and a passing 15-case suite; those are supplied test results, not newly executed/verified here.

**Scoped result: all six PASS boss-HUD versus hero/floor/control separation. Rendered ground-warning visibility is NOT CLEARED by these six stills.** None contains clearly discernible ROOT/WAVE/LIGHT ground marks and labels comparable to the original three desktop warning screenshots. Positive simulation telegraph count does not alone establish that an in-viewport mark is visibly painted at screenshot time. This is a capture/coverage shortfall, not an established runtime rendering failure; cause (timing, camera, in-viewport placement or another condition) was not investigated under read-only image scope.

| Additional fixture | Individual visual finding |
| --- | --- |
| `guardian-1-landscape.png` | **PASS HUD clearance; warning visibility unproven.** Thorn Warden name/bar/ROOT LANES instruction is above Lyra and the floor; ordinary objective is hidden, full touch row visible. No distinct ROOT circle/label can be identified on the visible floor. Warden upper antler tips meet the HUD's lower edge, separate from the hero-clearance requirement. |
| `guardian-1-portrait.png` | **PASS HUD clearance; limited encounter framing.** HUD sits below realm subtitle and well above Lyra; touch grid and floor remain clear. Warden is offscreen, and no visible ROOT warning geometry/label appears. Thus this does not establish portrait actor-plus-warning readability. |
| `guardian-2-landscape.png` | **PASS HUD clearance; warning visibility unproven.** Hour-Eater body, Lyra, floor and all touch actions are distinguishable; boss panel remains high. STAGED WAVES instruction is readable, but no distinct WAVE corridor outline/arrows/labels are discernible on the floor. |
| `guardian-2-portrait.png` | **PASS HUD clearance; limited encounter framing.** High boss panel does not cover Lyra/floor/buttons. Most of Hour-Eater is beyond the right viewport; only a bottom-right foot fragment is visible. No visible WAVE corridor/label. |
| `guardian-3-landscape.png` | **PASS hero/floor clearance; warning visibility unproven.** Regent name/bar/MARKED LIGHT instruction is readable high-right, objective hidden and touch row clear. Panel masks the upper crown/head region of Veyr slightly; Lyra remains clear. No distinct LIGHT circle/dashed marker/label is discernible on the visible floor. |
| `guardian-3-portrait.png` | **PASS HUD clearance; limited encounter framing.** Regent panel sits above a large clear play region and Lyra; controls are unobscured. Veyr is offscreen, and no visible LIGHT circle/label appears. |

The previously open mobile **boss-panel clearance** gap is now narrowed by these synthetic captured layouts. Mobile **painted hazard-warning readability** remains a separate uncovered requirement. For a later parent-authorized replacement, capture an actual warning phase with a mark positively inside the camera viewport, then inspect both visible warning shape/text and separation from hero/controls. Do not relax assertions or substitute injected decoration. These are synthetic encounter/render fixtures, not input-earned campaigns, real-device testing, human combat pacing or controller qualification. Earlier final-nine title/fresh/return clearance remains unchanged.

### Additional guardian byte inventory

| Additional fixture | Pixel dimensions | SHA-256 |
| --- | --- | --- |
| `guardian-1-landscape.png` | 844×390 | `eca795fca21b005f35c3f4a552f3a1eff696915077814fc88432fd182276d3c2` |
| `guardian-1-portrait.png` | 390×844 | `d866ee3de3c7598414371e2065a4045a286481149f5e33b38ac6d65f545b298a` |
| `guardian-2-landscape.png` | 844×390 | `ceea236cf8b1a1e72b44743581b10a1e6ab7e49140a40fbaed2af8234e8dc774` |
| `guardian-2-portrait.png` | 390×844 | `5910f60c25114360eeba8dd4592e215db7ad8968c8e8ea36f3398cec920a43c2` |
| `guardian-3-landscape.png` | 844×390 | `a930067261617586cd98618514bc5fe602f1d52d969947b47052408e51bb19cf` |
| `guardian-3-portrait.png` | 390×844 | `ee0d8edd64c435c1a3cfe0bb7ec7c9ce53673de5df577a27306b6720d88215d9` |


## FINAL guardian R2 replacement review — rendered mobile warnings visible

**Six of six R2 guardian images individually inspected: PASS for synthetic mobile guardian framing, painted-warning visibility and HUD/hero/floor/control separation.** Only these six images were opened; the other nine fixtures were not reinspected. Read R2 `report.json` summary (status pass, captures 15, errors empty); no suite was rerun here. No browser/source/test/Git action was taken.

Parent's diagnosed fixture cause: the earlier capture used `a.paused=true`, suppressing the renderer's warning overlay. Parent corrected tests only to `a.running=false, a.paused=false`, adjusted encounter camera/hero framing and added visible-warning/onscreen-boss assertions. This diagnosis and unchanged-runtime statement are parent supplied. The visual difference is independently confirmed below. The earlier six remain evidence of a **fixture coverage gap, not a proven runtime failure**.

| R2 replacement | Exact individual inspection |
| --- | --- |
| `guardian-1-portrait.png` | **PASS.** Thorn Warden silhouette (antlers/head/body/feet) and Lyra are in frame. Two ROOT labels and two complete green marked circles with root strokes are visibly painted at floor level. High boss panel is separated from hero, rings and lower touch grid; ordinary objective is absent. |
| `guardian-1-landscape.png` | **PASS.** Complete Warden silhouette and Lyra are visible, with two ROOT labels/green circles on the floor between/around them. Boss panel stays upper-right; warning shapes and full touch row are unobscured. No prior bare-floor ambiguity remains. |
| `guardian-2-portrait.png` | **PASS to the stated at-least-one-complete-warning scope.** Full Hour-Eater silhouette and Lyra are visible. Right-hand amber WAVE corridor, arrow and WAVE label are complete and clear; the additional left corridor continues beyond the left viewport and its label is outside the frame. This is disclosed, not a claim that both corridors are fully visible in portrait. Boss HUD and touch grid do not hide the complete warning or actor. |
| `guardian-2-landscape.png` | **PASS.** Full Hour-Eater and Lyra are visible together with both complete amber WAVE corridors, directional arrows and both labels. High boss panel is separate from floor/warnings; touch buttons remain below the action. |
| `guardian-3-portrait.png` | **PASS.** Full Regent crown/head/staff/body/feet and Lyra are visible. Both LIGHT labels, dashed vertical markers and complete pale floor rings are visible. Boss panel is well above the actors/rings, not across them; controls remain below. |
| `guardian-3-landscape.png` | **PASS.** Full Regent and Lyra are visible, with both LIGHT labels, dashed markers and rings clear on the floor. Upper-right boss panel does not conceal Regent crown/head in this corrected framing. Full touch row remains distinct. |

**Final scoped disposition:** the previously unclosed mobile painted-warning visibility requirement is now supported for these six actual rendered synthetic warning frames (three campaign guardians × portrait/landscape), together with the already-cleared final-nine title/fresh/return states. This does not imply every possible camera position, warning phase, attack, cooldown/recovery state, optional Engine encounter or viewport is visually certified. It does not establish input-earned victory, phone/controller behavior, human combat pacing, numerical contrast, reduced-motion dynamics or production readiness. No new blocking defect found within this R2 screenshot scope.

### R2 final guardian byte inventory

| R2 replacement | Pixel dimensions | SHA-256 |
| --- | --- | --- |
| `guardian-1-landscape.png` | 844×390 | `17cf3113256819d8bf9951a0009e447199e419e83fcfb881d44d17b8a3cf1a8d` |
| `guardian-1-portrait.png` | 390×844 | `43871dac84744352b450e5e373b2236b0885afe1cba72bb6d889e939e69740fe` |
| `guardian-2-landscape.png` | 844×390 | `90feee288db7183e5fb2e5d060d280a3553a07338a548098aadb4330adb0b96f` |
| `guardian-2-portrait.png` | 390×844 | `a60e64e041e2b0f1dfb146557fd735170983aad46b396fe4c9abc4fed6902b5a` |
| `guardian-3-landscape.png` | 844×390 | `61189131198011530bd2545028ac2f23520f56ac50d2df0e0b317c2a030de384` |
| `guardian-3-portrait.png` | 390×844 | `39a179107c6d431c08783f9b22360d287aa0134cd8a19e35d60debd64434ae1f` |
