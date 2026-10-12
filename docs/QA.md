# Lumenblade release-candidate QA

## Measured evidence
- 48 passing Node tests: movement/collision, buffered/variable/double jumps, spell energy/gates, dash cooldown, combo/reflection, guardian progression, recovery, travel restrictions, final phases/ending choice, save slots/backup/import validation, denied storage, deterministic replay and inherited release-builder/server security contracts.
- Input-only new-game campaign: 22 rooms, six shards and final guardian reached through ordinary movement/combat/spell inputs, with only earned point allocation; both ending choices accepted. See `qa/lumen/campaign.json`. This optimized bot is not a human play-time estimate and does not cover every secret.
- Preserved Emberwake campaign/difficulty/replay proofs run without modifying its game source. Original browser suite passes 53 checks. HTTP/project-prefix compatibility is verified separately.
- New Chromium browser suite covers full-viewport WebGL2, keyboard movement/jump/combat/magic, pause/focus, slots/reload/export/import, settings, locked portals, both ending UI branches, resource disposal, offline shell, 390px multi-touch, landscape layout and synthetic standard gamepad movement/menu confirmation. Exact passing count and scope: `qa/lumen/browser/report.json`.
- Screenshots cover desktop/mobile title, HUD, map, pause, settings, character, endings, combat and all seven biome fixtures, plus dialogue/shop/journal/guardian/death menus. Fixtures never count as campaign progression proof.
- New-game JS/CSS are approximately 610 KB uncompressed combined; runtime has no external downloads/CDN. Legacy image assets are separately retained, not requested by the new game.
- `npm audit` reports no known dependency vulnerabilities at the tested lockfile versions. Custom repository/runtime secret scans pass. This is not a full penetration test or exhaustive secret-scanner certification.

## Validation loops and fixes
1. Added real traversal obstacles after the first flat-route campaign proof; reran the entire campaign.
2. Differentiated guardian patterns: vines, ground waves, mist, ice volleys, furnace bombs, telegraphed storm strikes and the final shadow duel.
3. Fixed renderer disposal during repeated travel.
4. Added gamepad menu navigation and reset disconnected stick state.
5. Locked death/guardian/ending-confirmation dialogs against menu-hotkey bypasses.
6. Fixed local server CSP to permit same-origin service workers and the legacy base path; hashes cover trusted inline scripts in shipped HTML only.
7. Reduced menu rendering to lower idle GPU work; separated browser contexts during software rendering.
8. Improved HUD contrast over snow, fixed missing touch-cycle glyph with a plain label, made touch onboarding device-appropriate, and restricted flashing to actual damage rather than newly spawned invulnerability.
9. Browser-test failures from hidden/behind-overlay duplicate selectors were corrected by selecting the visible dialog controls and awaiting actual state changes rather than fixed sleeps.

## Scope adjustments from the plan
- Compact 22-room campaign, not the brainstorm's 26+ rooms.
- Four shared regular enemy behavior archetypes with biome variants, plus seven distinct guardian patterns; not 14 fully independent enemy species.
- Armor/sword upgrades implemented; extra charm inventory and optional gauntlet remain in the legacy game, not the new campaign.
- Frost lowers/freezes blue seals into stepping stones and freezes foes; arbitrary water-surface freezing is deferred.
- Emissive effects, fog, dynamic hero light and high-quality shadows implemented; post-process bloom and custom character asset production are deferred.
- Hand-defined platform data replaces the proposed ASCII map authoring format.
- Original procedural geometry/audio are appropriate for this compact candidate; they do not establish AAA or commercial 2026 visual-quality parity.

## Still required before commercial-production certification
- Real Android/iOS GPU, battery/thermal, touch ergonomics, memory and stable-FPS profiling (60 fps is a target, not a measured phone result).
- Safari/Firefox compatibility and offline update behavior across real browsers.
- Physical controllers and controller remapping/alternate layouts.
- Human difficulty, pacing, content-variety and long-session playtests. The input bot optimizes encounters; its short completion time is not an advertised campaign duration.
- Independent accessibility review (canvas gameplay is not screen-reader playable), font/HUD preferences and additional assist options.
- Trademark/name and inherited-asset rights clearance by the owner.
- Optional independent security/code review and automated CodeQL/gitleaks scans.

Parallel-agent unavailability and canceled Lore installation are disclosed rather than presented as completed multi-agent work. No quantified "100x better" claim is made.
