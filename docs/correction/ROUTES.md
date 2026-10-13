# Optional three-realm route slice

## Implemented scope

Changed only `assets/scripts/worlds.js`, `tests/emberwake-routes.test.cjs`, and this document. The original world definitions are retained; an additive static extension appends **12 one-way platforms** and one descriptive `routes` entry per realm. No client, engine, Git, credentials, dependencies, or installation changes are part of this slice.

All original IDs and original object values remain unchanged relative to `/data/work/provided-emberwake/assets/scripts/worlds.js`: ground/platform rectangles, hazards, width, palette, NPC/lore/dialogue, enemies/rewards, two required runes per realm, caches, checkpoints, shrines, boss arena and exit. New solid/route/landmark IDs are descriptive geometry, not flags or collectible rewards. No new gates, abilities or serialized fields.

## Playable routes

Coordinates are logical world units. All new terrain uses current one-way-platform physics and renderer. These are optional aerial alternatives to the existing lower routes, not claims of globally faster speedrun routes.

### Moonroot: The Springward Canopy

Approach: `m-g2 → m-b0 → m-b1` (existing second-rune shelves).

Upper connection: `m-b1 → m-route-bough → m-route-crown → m-route-nest → m-c1`.

| Added solid | x | y | width × height | Landmark |
|---|---:|---:|---:|---|
| m-route-bough | 2480 | 300 | 160 × 18 | Bent Lantern Bough |
| m-route-crown | 2700 | 260 | 160 × 18 | Springward Crown |
| m-route-nest | 2910 | 290 | 170 × 18 | Letterkeeper's Nest |

Crest-and-descent rhythm crosses the thorn hollow above the ground enemies to the unchanged `m-ch1` letter at (3250,370). Return down existing `m-c0` to `m-g3`. Lower alternative remains `m-g2 → m-g3 → m-c0 → m-c1`.

### Cinderworks: The Cold Service Gantry

Approach: `c-g2 → c-b0 → c-b1`.

Upper connection: `c-b1 → c-route-chain → c-route-service → c-route-span → c-route-anvil → c-c0 → c-c1`.

| Added solid | x | y | width × height | Purpose |
|---|---:|---:|---:|---|
| c-route-chain | 2910 | 320 | 150 × 20 | Entry work span |
| c-route-service | 3110 | 420 | 160 × 20 | Low Maintenance Deck: deliberate dip |
| c-route-span | 3330 | 300 | 170 × 20 | Cold Chain Span above the molten gap |
| c-route-anvil | 3540 | 320 | 150 × 20 | Anvil Lookout to existing cache stairs |

The low-to-high service-deck jump distinguishes this route from the canopy. Existing `c-ch1` remains at (4000,370); drop through its shelf onto `c-g3` to rejoin the road. Lower alternative retains `c-g2 → c-gap1 → c-g3 → c-c0 → c-c1`. No moving chains or lava immunity.

### Hollow Spire: The Unwritten Observatory

Approach: `h-g2 → h-b0 → h-b1`.

Upper connection: `h-b1 → h-route-chart → h-route-lens → h-route-arch → h-route-meridian → h-route-balcony → h-c1`.

| Added solid | x | y | width × height | Purpose |
|---|---:|---:|---:|---|
| h-route-chart | 2830 | 300 | 160 × 18 | Chart terrace |
| h-route-lens | 3060 | 235 | 160 × 18 | The Empty Lens: first crest |
| h-route-arch | 3290 | 290 | 180 × 18 | Unwritten Arch above the void |
| h-route-meridian | 3540 | 240 | 170 × 18 | Tomorrow's Meridian: second crest |
| h-route-balcony | 3760 | 300 | 170 × 18 | Cache approach balcony |

Two crests remain inside the existing fixed-height scene. Existing `h-ch1` remains at (4090,370); descend by `h-c0` to `h-g3`. Lower alternative remains `h-g2 → h-g3 → h-c0 → h-c1`.

## Metadata contract and presentation boundary

Each `level.routes[0]` includes `id`, `name`, `kind`, `optional`, `cacheId`, `approach`, `path`, `returnPath`, `lowerPath`, `instruction`, and three `landmarks` containing stable label/position/description data. Existing caches retain their exact rewards/lore. Metadata does **not** introduce progression state or generate visible signs by itself. The platforms render through the existing solids pipeline; parent can consume landmark labels in its presentation work. No renderer integration, new art or visual QA is claimed here.

## Targeted measured proofs

Only command executed as a test suite:

```sh
node --test tests/emberwake-routes.test.cjs
```

Tests use the current `EW.Physics.step` and shipped `core-v11` strict validator, comparing world contracts to the exact supplied extraction. Each itinerary places a player once on its initial departure platform; thereafter **only analog movement, jump/held-jump and drop inputs** change the body through physics. No coordinate correction, teleport, velocity injection, altered gravity, direct reward or completion writes occur during traversal. Every declared edge requires a real landing on its target; unintended shelf landings fail. Source platforms are walked to their departure point through physics, not repositioned.

The suite proves continuous upper approach/cache/return, original lower cache alternative, upper-route reversal, and both original required rune climbs at **60 and 120 Hz**. It asserts no hazard intersection, no pit entry, and the hero remains within the visible vertical scene. Twelve cache approaches reach the existing interaction footprint; this is not a claim of real-input browser chest interaction or combat victory.

| Realm | Upper/cache/return edges | 60 Hz frames / simulated seconds | 120 Hz frames / simulated seconds |
|---|---:|---:|---:|
| Moonroot | 8 | 655 / 10.917 | 1312 / 10.933 |
| Cinderworks | 9 | 749 / 12.483 | 1508 / 12.567 |
| Hollow Spire | 10 | 855 / 14.250 | 1715 / 14.292 |

Total: **27 tests passed, 0 failed; 30 input-driven itineraries, 130 edges, 19,654 physics frames, 12 cache interaction-footprint approaches**. Timings are controller-driven simulation duration, not human campaign duration or rendering FPS. Separate save checks cover 18 original checkpoint fixtures (story/rush × nine beacons) plus both completed story endings: strict normalization matches baseline, and resumed snapshots match baseline resume behavior. Rush legitimately normalizes some checkpoint destinations; no new interpretation was imposed.

## Remaining parent gates

This is a tested static route slice, not a full release claim. Enemies/bosses/projectiles are absent from the isolated physics traversal; no browser, touchscreen/controller, readability, human difficulty, full-campaign, storage interruption or performance certification was run. The baseline object-equivalence assertion deliberately fails if concurrent story/combat work changes old world values; review and scope those assertions rather than silently removing preservation coverage. Parent owns broader authority/death fixes, packaging and new visual/narrative work.

## Final proof provenance

Node v24.14.1. SHA-256 at final targeted run:

- `assets/scripts/worlds.js`: `32eb12c3920fc8c5ab00e6f9accd3e909fb504605573c880067232383fc4ca9a`
- `assets/scripts/engine.js`: `032a00c00f3b25640d79338230e3851463f8fbe0a7e253d08ba21d8d876a2b60`
- `assets/scripts/core-v11.js`: `c7cc221aff922f8f9159a0796e87db983a9e49cd71718ca0312d41e0eff8642b`
- `tests/emberwake-routes.test.cjs`: `0037dba0f6897f90c98a8ef1d996ce72e52f8c33b5b0a87484b5e84fdda22b1d`
- `/data/work/provided-emberwake/assets/scripts/worlds.js`: `11be3617782e2db4abb5d6efa996f667837374237d3956c1f4d9a90b68c4789f`

## Portable baseline fixture
The first remote CI run exposed a VM-only relative path to the isolated supplied extraction. The exact original `worlds.js` bytes now live in `tests/fixtures/emberwake-worlds-rc3.cjs`; the comparison suite imports that repository-local fixture. It is test-only and excluded from shipped assets. Assertions/route physics are unchanged; no test was skipped. The independent extraction remains useful provenance, not a runtime or CI dependency.
