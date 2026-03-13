# AGENTS.md

## Purpose
Capture project decisions that are easy to regress but not always obvious from local code context.

## Runtime Architecture
- Stack: npm + Vite + native ES modules.
- Entry flow: `index.html` -> `src/main.js`.
- `src/main.js` is the orchestrator and state owner for wave/menu/economy and system wiring (`grid`, `player`, `enemies`, `towers`, `uiOverlay`, `multiplayer`).

## Multiplayer Contracts (Co-op)
- Transport: `@poki/netlib` via `src/multiplayer.js`.
- Fixed game ID: `ed698dfc-1c2f-482e-a733-22339afeeb55`.
- Lobby size: 2 players max. Host is authoritative.
- Host authority includes wave progression, pause/speed, enemy spawn/damage/death outcomes.
- Channel split:
  - Reliable: `state_sync`, `wave_cmd`, `speed_pause_cmd`, `tower_place_commit`, `tower_sell_commit`, `tech_choice_commit`, `weapon_choice_commit`, `enemy_spawn`, batched guest-to-host `enemy_damage` requests, `enemy_death`, `host_ended`
  - Unreliable: `player_transform`, `tower_preview`, `enemy_state`
- Health scaling: solo `1x`, co-op `2x`; on join/leave, alive enemies rescale immediately while preserving health ratio.
- `GAME_CONFIG.enemies.healthMultiplier` is a global base scalar that multiplies all enemy health before solo/co-op scaling is applied.
- Join-in-progress snapshot must include: wave/speed/pause, placed towers (`ownerId`), and active enemies (stable `enemyId` + current state).
- Host streams active enemy state batches to guests at roughly `10Hz`; guests drop stale `enemy_state` packets by sequence and render enemies from host-provided position/health rather than autonomous local path travel.
- Guest enemy presentation may be approximate between `enemy_state` packets, but `enemy_death` remains the final authoritative removal event; enemies absent from host state batches are culled on the guest after a short stale timeout.
- Leave behavior:
  - Guest leaves: host continues solo and scaling returns to `1x`.
  - Host leaves: guest session terminates (`host_ended`/disconnect).
- Share UI contract:
  - Share controls are host-only while in a lobby.
  - Host share controls are hidden while any peer is connected (`peerCount > 0`) and reappear when solo.
  - Host receives subtle, non-blocking join/leave toasts (`Player joined` / `Player left`).
- Ownership model:
  - Money, weapon choice, and tech progression are per-player.
  - Tower placements carry `ownerId`; owner-scoped tech applies only to that owner's towers.
  - Tower selling is allowed for either player on any tower; host validates and commits the sell.
  - Sell refunds are credited to the player that completed the sell hold; `block` refunds use the seller's current owner-scoped block cost, even for blocks placed before that seller researched cheaper block tech.
  - Host death events spawn drops for both clients; each client collects into its own money total.
  - Guest local player weapon hits are still trusted, but damage proposals are coalesced into short reliable batches before being sent to the host.
- Remote player is visual-only and must not be included in movement collision obstacles.
- Co-op tech selection is non-pausing (local modal while simulation continues).
- Co-op hidden-tab resilience:
  - Main loop runs with `requestAnimationFrame` while visible and a `setInterval(1000/60)` fallback while hidden and connected to a peer.
  - Hidden fallback is simulation/network only (no overlay or renderer passes).
  - Keepalive audio oscillators are gesture-gated and run only during active co-op sessions to reduce hidden-tab timer throttling.

## Economy + Upgrade Rules
- Money state lives in `main.js` (`playerMoney`) and starts from `GAME_CONFIG.economy.startingCash`.
- Tower spending/refunds are delegated through `createTowerSystem({ getCurrentMoney, spendMoney, refundMoney })` callbacks.
- Enemy rewards are emitted only on real death via `onEnemyDefeated(...)`; reaching path end gives no money.
- Rewards are paid through pickup drops, not immediate cash grant:
  - Drops start as `$1` cubes.
  - Settled merge: `10x $1 -> $10`, `10x $10 -> $100` (cap at `$100`).
  - Cash is granted on pickup arrival, not on range entry.
- `grants.pickupRangeAdd` increases pickup radius.
- Tower availability is unlock-based (not stock). `gun` must always be unlocked as fallback.
- `tower.block.costSet` and `tower.block.opacitySet` are owner-scoped absolute overrides; block opacity upgrades must update existing owned blocks immediately and new sells refund the seller's current block cost rather than historical spend.
- Upgrade system is config-driven (`GAME_CONFIG.upgrades[]`) with:
  - `maxCount` gating,
  - unlock-collision filtering for unlock grants,
  - forced first pick `tower_aoe_unlock` while available,
  - graceful no-options exit via `finishUpgradeMenuChoice()`.
- Wave flow includes build phase:
  - `PLAYING -> DELAY -> MENU -> BUILD -> PLAYING(next wave)`.
  - Session starts in `BUILD` before wave 1.
  - `Start Wave` can skip remaining build timer.
- Grant wiring contract:
  - Define grant in config.
  - Handle in `main.js:applyUpgradeGrants()`.
  - Implement target method on `player`, `towerSystem`, or `enemySystem`.

## Tower + Combat Contracts
- Starter/default tower is `gun` (legacy `laser` replaced).
- `block` is a buildable world-cube tower: it path-blocks, collides with the player, supports stacking by Y layer, contributes build surfaces from its top face, and keeps `topInsetFromRadius: 0` so standing/building on it matches terrain cubes.
- Gun tower placement is fixed non-rotatable 1x2 footprint (Z-axis), validated atomically across both occupied cells.
- Path blocking supports multi-cell placement (`canBlockCells`) and uses blocked-revision-aware preview caching.
- Layered placement may reuse a cell only when the new tower's vertical bounds do not overlap an existing occupant; path validation for layered placements only checks newly blocked cells, not cells already blocked by lower layers.
- A `block` that is currently supporting a higher tower/block in a shared cell is not sellable; support must be removed from the top down.
- Gun combat uses projectile cubes from muzzle node (not beam/hitscan).
- Plasma tower:
  - Wall-mounted only on terrain side faces via `grid.raycastWallAnchor(ray)`.
  - Anchor key: wall voxel + face normal.
  - Occupies no build cells and does not path-block.
  - Applies continuous DPS to exactly one adjacent outward cube.
- `spikes` and `plasma` do not block player movement; `spikes` also do not block enemy pathing.
- Buff towers stack additively per in-range buff source on non-buff towers only.
- Tower build FX exists: spending and path blocking are immediate, tower attacking starts only after build FX completes.
- In co-op, tower combat simulates on the host only; the guest tower system remains active for previews, build FX, selection, ownership visuals, and replicated placements, but must not spawn projectiles or apply damage.
- Tower targeting/damage must ignore enemies still intersecting spawn marker cubes.
- LOS checks include ramp wedge blocking (not only terrain cube AABBs).

## Weapon + Hit Geometry Contracts
- Player weapon is charge-based (not shot cooldown-based).
- Burst fire enforces per-shot delay while holding fire.
- Projectile contact is single-target and body-aware:
  - Prefer `enemySystem.isPointNearEnemyMesh(...)` and enemy body extents over center-distance assumptions.
  - Per-projectile duplicate-hit prevention is required (no double-hit on same enemy).
- Pierce is per-contact consumption; projectile despawns once allowance is exhausted.
- Projectile environment checks must use ramp wedge collision, not full ramp AABB prism.
- Enemy hit geometry assumptions must stay aligned across `player.js`, `towers.js`, and `enemies.js`.

## Grid, Pathfinding, and Blocking Contracts
- Level source is sparse object data: `GAME_CONFIG.grid.levelObjects`.
- Object schema: `{ type, position: { x, y, z }, rotation }`.
- Supported marker/object types: `wall`, `spawn`, `end`, `playerSpawn`, `ramp` (`path` allowed as legacy visual marker).
- Ramp rotation mapping (low -> high): `0:+Z`, `90:+X`, `180:-Z`, `270:-X`; ramp anchor is low-end cell.
- Grid exposes marker-centric/runtime helpers (spawn/end/player spawn, buildability, ramp data, world<->cell mapping).
- Endpoint collision contract:
  - Spawn/end cubes are movement/projectile obstacles.
  - Keep them out of `heightObstacles` so tower LOS/build-surface behavior is unchanged.
- Enemy navigation:
  - Cardinal-only neighbors.
  - Normal cells require equal height.
  - Ramp traversal allowed only through valid ramp ends (no side entry/exit).
- Blocking contract:
  - `canBlockCell`/`canBlockCells` must preserve at least one route from every spawn to `end`.
  - `setBlockedCells` commits blockers and reroutes active enemies immediately.
- Enemy completion at endpoint requires full body inside end volume.
- Tower placement is grid-snapped; spawn/end/ramp cells are not buildable.

## Input, Collision, and Viewport Invariants
- Desktop mouse input path is gated off on touch devices; touch gameplay uses pointer events.
- In build mode on touch, primary action confirms placement only; firing must stay suppressed until release.
- Tower sell input is hold-based on both platforms:
  - Desktop: hold `E` while close and aiming at a valid tower.
  - Mobile: hold floating on-tower sell button.
  - Hold must remain uninterrupted on the same target (`0.90s`) and resets on release/target invalidation/state transitions.
- `resetMobileInputState()` must clear active pointer/button/jump-hold state on pause/blur/focus transitions.
- Viewport sync is centralized in `main.js` and coalesced per animation frame.
- Touch resize resets should be orientation-bucket based to avoid minor viewport jitter resets.
- Top-support and horizontal side-collision are separate concerns; do not conflate fixes.
- Terrain obstacles use `topInsetFromRadius: 0`; terrain edge side-collision grace applies only to terrain-like obstacles.
- Ramps expose obstacle/surface helpers for movement support and side blocking.
- Player X/Z movement is clamped to level bounds; boundary wall visuals are visual-only and must not affect physics.

## Level Editor Contracts
- Editor mode toggles with `N` (`waveState === "EDITOR"`) and rebuilds grid in editor mode.
- Editor mutates level object model (`src/levelEditor.js`) and rebuilds preview/pathing after edits.
- `end` and `playerSpawn` are unique markers; `spawn` is multi-place.
- Marker `y` values are authoritative and must match traversable surface; invalid markers fail path system validation.
- Player spawn facing uses `playerSpawn.rotation` cardinal mapping (same mapping as ramp cardinal conventions).
- Exiting editor validates playability before returning to gameplay.
- Export API: `window.exportLevel()` returns current level objects (editor model while in editor, runtime grid otherwise).

## Debug + Validation
- Runtime debug helpers are exposed via `window.gameDebug` (economy/tower/enemy/path/touch-control helpers).
- Primary validation workflows: `npm run dev` and `npm run build`.

## Maintenance Rule
- Update this file when introducing cross-system contracts or design decisions that are not obvious from code/comments alone.
