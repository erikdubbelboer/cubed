# AGENTS.md

## Purpose
Capture project decisions that are easy to regress but not always obvious from local code context.

## Runtime Architecture
- Stack: npm + Vite + native ES modules.
- Entry flow: `index.html` -> `src/main.js`.
- `src/main.js` is the orchestrator and state owner for wave/menu/economy and system wiring (`grid`, `player`, `enemies`, `towers`, `uiOverlay`, `multiplayer`).
- Boot flow enters a canvas-rendered main menu (`sessionScreen` / `overlayScreen` in `main.js`); `src/uiOverlay.js` owns all player-facing runtime UI rendering.
- Very important: never introduce HTML runtime/player-facing UI again; every runtime UI surface must render on the canvas, except for the single readonly co-op share-link input.
- Menu settings persist in `localStorage` via `webgame.masterVolume` and `webgame.difficulty`.
- `GAME_CONFIG.audio.baseMasterVolume` defines the midpoint of the menu volume slider: `50%` maps to that configured gain and `100%` maps to `2x` that gain; stored `webgame.masterVolume` remains the actual applied master gain.
- Look sensitivity persists in `localStorage` via `webgame.mouseSensitivity` and applies to both desktop pointer-lock look and touch look; `PLAYER_CONFIG.controls.pointerSpeed` is the slider midpoint (`50%`), `100%` maps to `2x`, and the stored value remains the actual applied pointer speed.

## Kenney Visual Asset Contract
- `src/kenneyModels.js` owns the shared preloaded Kenney OBJ-based visual factories for enemies, remote co-op players, money drops, ramps, terrain wall voxels, and placed block towers.
- These imported models are visual-only. Gameplay/pathing/collision/hitboxes remain numeric in `grid`, `player`, `enemies`, and `towers`; do not move gameplay authority onto imported mesh geometry.
- Enemy visuals now map existing enemy tiers onto the Kenney `character-ghost`, `character-skeleton`, `character-vampire`, and `character-zombie` models; they still keep explicit hidden hit proxies for sniper/headshot raycasts and preserve the existing collision-box contract.
- Co-op uses the Kenney human model for the remote peer only; the local player remains first-person.
- Money drops use the Kenney coin model, ramp visuals use Kenney stairs attached to the existing ramp helper mesh, and both terrain wall voxels and placed block towers use the Kenney wall model.
- Terrain wall voxels must keep their hidden cube helper meshes authoritative for collision, build surfaces, LOS, and editor raycasts; the Kenney wall model is a visual child only.
- Decorative editor props use the Kenney OBJ doodad catalog (`chest`, `barrel`, `stones`, plus the graveyard/environment doodads in `src/modelCatalog.js`), are visual-only, and must never be added to collision/pathing/LOS obstacle sets.
- Decorative props are culled automatically when a placed tower's world bounds overlap them; they are dressing, not protected gameplay geometry.
- Block build preview stays procedural/abstract on purpose; do not replace the green/red preview validity mesh with the imported wall art unless the preview readability problem is solved first.

## Multiplayer Contracts (Co-op)
- Transport: `@poki/netlib` via `src/multiplayer.js`.
- Fixed game ID: `ed698dfc-1c2f-482e-a733-22339afeeb55`.
- Lobby size: 2 players max. Host is authoritative.
- Host authority includes wave progression, pause/speed, enemy spawn/damage/death outcomes.
- Reliable host state sync must include `sessionScreen`, `runId`, and `difficultyId` so guests and join-in-progress peers mirror menu/run staging.
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
  - Share controls render on the canvas main menu and are host-only while in a lobby.
  - The share URL itself may use the single readonly DOM input overlay, positioned to match the canvas slot.
  - Host share controls are hidden while any peer is connected (`peerCount > 0`) and reappear when solo.
  - Host receives subtle, non-blocking join/leave toasts (`Player joined` / `Player left`).
- If the host is waiting in the main menu and a peer joins, the host immediately starts a fresh run and both players open local weapon select.
- Returning to the main menu in co-op is a synchronized lobby-state change; it must not tear down the active lobby/share code.
- Ownership model:
  - Money, weapon choice, and tech progression are per-player.
  - Tower placements carry `ownerId`; owner-scoped tech applies only to that owner's towers.
  - Tower unlocks are also owner-scoped; each player may only build the tower types they personally unlocked.
  - Tower selling is allowed for either player on any tower; host validates and commits the sell.
  - Sell refunds are credited to the player that completed the sell hold; `block` refunds use the seller's current owner-scoped block cost, even for blocks placed before that seller researched cheaper block tech.
  - Money drops are host-authoritative in co-op; one confirmed pickup removes the drop for both clients and grants the full value to both players' local money totals.
  - Guest local player weapon hits are still trusted, but damage proposals are coalesced into short reliable batches before being sent to the host.
- Enemy-global tech grants remain shared-global in co-op; either player may research them once, and the host applies the effect match-wide.
- Remote player is visual-only and must not be included in movement collision obstacles.
- Co-op tech selection is non-pausing (local modal while simulation continues).
- Co-op wave-end tech popups open locally on top of the shared build phase; each player can finish at a different time without pausing the match.
- Co-op weapon selection is also local, non-pausing, and non-blocking; either player may finish first and re-enter gameplay while the other is still choosing.
- Co-op pause/menu overlays are local-only; they block only local input and must not pause or broadcast shared simulation state.
- Co-op hidden-tab resilience:
  - Main loop runs with `requestAnimationFrame` while visible and a `setInterval(1000/60)` fallback while hidden and connected to a peer.
  - Hidden fallback is simulation/network only (no overlay or renderer passes).
  - Keepalive audio oscillators are gesture-gated and run only during active co-op sessions to reduce hidden-tab timer throttling.

## Economy + Upgrade Rules
- Money state lives in `main.js` (`playerMoney`) and starts from `GAME_CONFIG.economy.startingCash`.
- Difficulty presets scale only starting cash and base enemy health for now: `Easy 1.5x / 0.85x`, `Normal 1x / 1x`, `Hard 0.8x / 1.25x`. In co-op, the host-selected difficulty is authoritative.
- Tower spending/refunds are delegated through `createTowerSystem({ getCurrentMoney, spendMoney, refundMoney })` callbacks.
- Enemy rewards are emitted only on real death via `onEnemyDefeated(...)`; reaching path end gives no money.
- There is no experience system. Tech progression comes from research points only.
- Each cleared wave grants exactly `1` local research point.
- Rewards are paid through pickup drops, not immediate cash grant:
  - Drops start as `$1` cubes.
  - Settled merge: `10x $1 -> $10`, `10x $10 -> $100` (cap at `$100`).
  - Cash is granted on pickup arrival, not on range entry.
- `grants.pickupRangeAdd` increases the owner's 3D pickup radius from player feet to the drop.
- Tower availability is unlock-based (not stock). `gun` must always be unlocked as fallback.
- `tower.block.costSet` and `tower.block.opacitySet` are owner-scoped absolute overrides; block opacity upgrades must update existing owned blocks immediately and new sells refund the seller's current block cost rather than historical spend.
- Upgrade system is config-driven (`GAME_CONFIG.upgrades[]`) with:
  - `maxCount` gating,
  - unlock-collision filtering for unlock grants,
  - forced first pick `tower_aoe_unlock` while available,
  - graceful no-options exit via `finishUpgradeMenuChoice()`.
- Wave flow includes build phase:
  - Single-player: `PLAYING -> DELAY -> MENU -> BUILD -> PLAYING(next wave)`.
  - Co-op: `PLAYING -> DELAY -> BUILD (+ local tech popup) -> PLAYING(next wave)`.
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
- Tower combat audio follows the combat sim path: host/single-player only for now, emitted from tower fire/proc hooks rather than replicated as a separate network channel.
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
- Level source is sparse object data in [`src/level.json`](/Users/erik/Desktop/webgame/src/level.json), imported into `GAME_CONFIG.grid.levelObjects`; the file may be either `{ "levelObjects": [...] }` or a raw `[...]` array for paste-from-export convenience.
- Object schema: `{ type, position: { x, y, z }, rotation }`.
- Supported marker/object types: `wall`, `spawn`, `end`, `playerSpawn`, `ramp`, and every decorative doodad type listed in `src/modelCatalog.js` (`path` allowed as legacy visual marker).
- Ramp rotation mapping (low -> high): `0:+Z`, `90:+X`, `180:-Z`, `270:-X`; ramp anchor is low-end cell.
- Grid-snapped gameplay objects continue to use integer cell coordinates in `position`; decorative props use world-space `position` coordinates and arbitrary numeric yaw in `rotation`.
- Grid exposes marker-centric/runtime helpers (spawn/end/player spawn, buildability, ramp data, world<->cell mapping).
- Endpoint collision contract:
  - Spawn/end cubes are movement/projectile obstacles.
  - Keep them out of `heightObstacles` so tower LOS/build-surface behavior is unchanged.
- Enemy navigation:
  - Cardinal-only neighbors.
  - Normal cells require equal height.
  - Ramp traversal allowed only through valid ramp ends (no side entry/exit).
  - A ramp's front/back outer entry cells must remain non-ramp surfaces at the matching level; a ramp cell cannot double as another ramp's entry/exit cell.
- Blocking contract:
  - `canBlockCell`/`canBlockCells` must preserve at least one route from every spawn to `end`.
  - `setBlockedCells` commits blockers and reroutes active enemies immediately.
- Enemy completion at endpoint currently despawns when the enemy route center reaches the end marker center; there is no lives/game-over handling yet.
- Tower placement is grid-snapped; spawn/end/ramp cells are not buildable.

## Input, Collision, and Viewport Invariants
- Desktop mouse input path is gated off on touch devices; touch gameplay uses pointer events.
- Desktop pointer lock must only come from explicit UI actions. Do not auto-lock from canvas clicks.
- Weapon selection click is the desktop pointer-lock gesture for entering a run; pause/menu screens must remain usable without pointer lock.
- In build mode on touch, primary action confirms placement only; firing must stay suppressed until release.
- Tower sell input is hold-based on both platforms:
  - Desktop: hold `E` while close and aiming at a valid tower.
  - Mobile: hold floating on-tower sell button.
  - Hold must remain uninterrupted on the same target (`0.90s`) and resets on release/target invalidation/state transitions.
- `resetMobileInputState()` must clear active pointer/button/jump-hold state on pause/blur/focus transitions.
- During active runs, `Escape`, mobile pause, blur/visibility loss, and unexpected desktop pointer-lock loss should open the pause menu. Only single-player pause menus actually pause simulation.
- Pause-menu Resume should request pointer lock only when desktop gameplay needs it and lock is currently missing.
- Viewport sync is centralized in `main.js` and coalesced per animation frame.
- Touch resize resets should be orientation-bucket based to avoid minor viewport jitter resets.
- Top-support and horizontal side-collision are separate concerns; do not conflate fixes.
- Terrain obstacles use `topInsetFromRadius: 0`; terrain edge side-collision grace applies only to terrain-like obstacles.
- Ramps expose obstacle/surface helpers for movement support and side blocking.
- Player X/Z movement is clamped to level bounds; boundary wall visuals are visual-only and must not affect physics.
- Player jump/landing/jetpack audio is local-only and should stop on menu/reset transitions so procedural loops do not hang.

## Level Editor Contracts
- Editor mode toggles with `N` (`waveState === "EDITOR"`) and rebuilds grid in editor mode.
- Editor camera movement is free-fly while in editor mode: gravity/collision walking are disabled there, and forward movement follows the current look direction instead of ground-plane walking.
- Editor mutates level object model (`src/levelEditor.js`) and rebuilds preview/pathing after edits.
- Editor ramps may share their occupied X/Z cells with lower wall voxels when each wall stack top is `<= ramp.position.y`; overlap becomes invalid only when a wall voxel extends into the ramp volume, and removing those lower walls later is still allowed.
- Wall voxels under ramp-occupied cells remain collision-only support geometry for the ramp; they must not act as independent walkable top surfaces, so ramp traversal still only enters/exits through the ramp's forward/back ends.
- `end` and `playerSpawn` are unique markers; `spawn` is multi-place.
- Decorative editor props place freely on world surfaces via editor raycasts rather than voxel snapping, but remain serialized into `levelObjects` alongside the snapped gameplay objects.
- Decorative editor props support arbitrary yaw rotation via the editor scroll-wheel tool rotation path rather than cardinal-only ramp/player-start rotation.
- Marker `y` values are authoritative and must match traversable surface; invalid markers fail path system validation.
- Player spawn facing uses `playerSpawn.rotation` cardinal mapping (same mapping as ramp cardinal conventions).
- Exiting editor validates playability before returning to gameplay.
- Export API: `window.exportLevel()` returns a paste-ready `{ levelObjects }` payload for the current level (editor model while in editor, runtime grid otherwise).

## Debug + Validation
- Runtime debug helpers are exposed via `window.gameDebug` (economy/tower/enemy/path/touch-control helpers).
- Primary validation workflows: `npm run dev` and `npm run build`.

## Maintenance Rule
- Update this file when introducing cross-system contracts or design decisions that are not obvious from code/comments alone.
