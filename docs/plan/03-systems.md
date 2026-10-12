# Systems contract

## Movement and combat
60 Hz simulation; render independent. Feet-based AABB collisions with solid floors and one-way platforms. Run 7.5 units/s, gravity 42, jump impulse 14.5 (~2.5 units), coyote 100 ms, input buffer 120 ms. Double jump unlocks in Glimmerdeep. Dash unlocks in Frostfang: 18 units/s for 180 ms, cooldown 700 ms. Variable jump height, landing recovery, death/checkpoint recovery and map-return portals.

Three-hit sword chain, directional attacks, aerial downward strike/pogo, attack cooldown and hit-stop. Sword reflects hostile projectiles. Enemies telegraph before striking. Guardian arenas temporarily block the east exit, but never lock the player into an unwinnable/no-resource state. Energy regenerates; shrines heal for free. Death never removes essential quest items.

## Magic and gates
Bolt available initially. Ember Bomb breaks amber seals. Frost Shard freezes blue barriers into temporary platforms. Dawnshift crosses violet barriers for a timed interval. Select spells with 1–4 / cycle button / gamepad shoulder. Each spell gate appears only after its granting guardian; backtracking is always available. Six shards open Hollowgate.

## Economy and growth
Glimmer currency from one-time caches and foes. Level XP threshold grows as 20*level^1.6+30. Pending points are allocated to Vitality (+max health), Might (+damage), Arcana (+max energy). Shop offers sword/armor tiers and healing flask charges; all progression remains possible without buying. Consumable charges replenish at shrines. No ads, online account, telemetry or paid progression.

## Persistence and usability
Three save slots with independent localStorage keys, versioned payloads, validation, backup-before-write and downloadable/importable saves. Refuse malformed/out-of-range/unknown content, do not silently reset corrupt saves. Save at shrines, transitions, purchases, level choices and endings. Browser storage failure displays a warning; play remains available. Pause stops simulation/audio. Blur/visibility changes pause and clear held keys. Desktop keys, independent multi-touch pointers and standard-layout gamepad. Every menu has labels, visible focus and 44px touch targets.

## Completion
All six guardians must be defeated to reach the final region. Final boss defeat yields an explicit two-option story choice, ending screen, return-to-title and continued exploration. Campaign evidence must come from ordinary simulation inputs, not injected inventory or boss damage. Browser ending-state fixtures are labeled fixtures, never campaign proof.
