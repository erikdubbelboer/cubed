import * as THREE from "three";
import { GAME_CONFIG } from "./config.js";
import {
  createEnemyVisual,
  getPreparedEnemyBatchParts,
  isKenneyAssetManagedResource,
} from "./kenneyModels.js";

const ENEMY_CONFIG = GAME_CONFIG.enemies;
const GRID_CONFIG = GAME_CONFIG.grid;
const CONFIGURED_GLOBAL_ENEMY_HEALTH_MULTIPLIER = Number.isFinite(Number(ENEMY_CONFIG?.healthMultiplier))
  ? Math.max(0.01, Number(ENEMY_CONFIG.healthMultiplier))
  : 1;
const BASE_SPEED = ENEMY_CONFIG.baseSpeed;
const DISSOLVE_DEATH_DURATION = ENEMY_CONFIG.dissolveDuration;
const DISSOLVE_EDGE_WIDTH = ENEMY_CONFIG.dissolveEdgeWidth;
const DISSOLVE_NOISE_SCALE = ENEMY_CONFIG.dissolveNoiseScale;
const ENEMY_TYPES = ENEMY_CONFIG.types;
const FALLBACK_ENEMY_TYPE_KEY = Object.prototype.hasOwnProperty.call(ENEMY_TYPES, "red")
  ? "red"
  : (Object.keys(ENEMY_TYPES)[0] ?? null);
const HIT_PULSE_DURATION = ENEMY_CONFIG.hitPulseDuration ?? 0.2;
const HIT_PULSE_EXPONENT = ENEMY_CONFIG.hitPulseExponent ?? 0.4;
const HIT_PULSE_EMISSIVE_BOOST = ENEMY_CONFIG.hitPulseEmissiveBoost ?? 1.2;
const HIT_PULSE_SCALE_BOOST = ENEMY_CONFIG.hitPulseScaleBoost ?? 0.08;
const HIT_PULSE_FREQUENCY = ENEMY_CONFIG.hitPulseFrequency ?? 30;
const HIT_PULSE_STACK_ADD = ENEMY_CONFIG.hitPulseStackAdd ?? 0.75;
const ENEMY_STACK_OFFSET_MIN = Math.max(0, ENEMY_CONFIG.stackOffsetMin ?? 0.06);
const ENEMY_STACK_OFFSET_MAX = Math.max(
  ENEMY_STACK_OFFSET_MIN,
  ENEMY_CONFIG.stackOffsetMax ?? 0.18
);
const ENEMY_PATH_Y_OFFSET = GRID_CONFIG.enemyPathYOffset;
const ROUTE_VARIANT_COUNT = Math.max(1, Math.floor(Number(ENEMY_CONFIG.pathVariantCount) || 6));
const ROUTE_VARIANT_ATTEMPT_BUDGET = Math.max(
  ROUTE_VARIANT_COUNT,
  Math.floor(Number(ENEMY_CONFIG.pathCandidatePoolSize) || 24)
);
const ROUTE_OVERLAP_PENALTY = Math.max(0, Number(ENEMY_CONFIG.pathOverlapPenalty) || 0.45);
const ROUTE_VARIANT_BUILD_BUDGET_MS = Math.max(0, Number(ENEMY_CONFIG.pathVariantBuildBudgetMs) || 1);
const RAMP_ROLE_LOW = "low";
const RAMP_ROLE_HIGH = "high";
const ENEMY_SURFACE_HOVER_HEIGHT = Math.max(0, Number(ENEMY_CONFIG.hoverHeight) || 0);
const ENEMY_DEATH_EXPLOSION_BASE_RADIUS = Math.max(
  0,
  Number(ENEMY_CONFIG.deathExplosionBaseRadius) || 1
);
const ENEMY_DEATH_EXPLOSION_BASE_DAMAGE_SCALE = Math.max(
  0,
  Number(ENEMY_CONFIG.deathExplosionBaseDamageScale) || 0
);
const ENEMY_DEATH_EXPLOSION_VISUAL_DURATION = Math.max(
  0.05,
  Number(ENEMY_CONFIG.deathExplosionVisualDuration) || 0.2
);
const NETWORK_ENEMY_POSITION_DAMPING = Math.max(1, Number(ENEMY_CONFIG.networkPositionDamping) || 18);
const NETWORK_ENEMY_STALE_REMOVE_MS = Math.max(150, Number(ENEMY_CONFIG.networkStaleRemoveMs) || 350);
const ENEMY_WALK_CYCLE_RADIANS_PER_WORLD_UNIT = 2.7;
const ENEMY_WALK_MOTION_BLEND_DAMPING = 12;
const ENEMY_WALK_BOB_HEIGHT_FACTOR = 0.11;
const ENEMY_WALK_SWAY_OFFSET_FACTOR = 0.08;
const ENEMY_WALK_ROLL_RADIANS = 0.14;
const ENEMY_WALK_YAW_RADIANS = 0.08;
const ENEMY_MODEL_BASE_BODY_WIDTH = 1.693;
const ENEMY_MODEL_PARTS = [
  { name: "body", hitPart: "body", dimensions: { width: 1.693, height: 0.699, depth: 1.377 }, position: { x: 0, y: 0, z: 0 } },
  { name: "head", hitPart: "head", dimensions: { width: 1.101, height: 0.761, depth: 1.033 }, position: { x: 0, y: 0.73, z: 0 } },
  { name: "BL_leg_main", hitPart: "body", dimensions: { width: 0.348, height: 0.337, depth: 0.294 }, position: { x: -0.605, y: -0.518, z: -0.447 } },
  { name: "BL_leg_tip", hitPart: "body", dimensions: { width: 0.145, height: 0.219, depth: 0.121 }, position: { x: -0.605, y: -0.796, z: -0.447 } },
  { name: "BL_leg_sideX", hitPart: "body", dimensions: { width: 0.192, height: 0.248, depth: 0.106 }, position: { x: -0.706, y: -0.474, z: -0.447 } },
  { name: "BL_leg_sideZ", hitPart: "body", dimensions: { width: 0.147, height: 0.244, depth: 0.163 }, position: { x: -0.605, y: -0.471, z: -0.6 } },
  { name: "BR_leg_main", hitPart: "body", dimensions: { width: 0.348, height: 0.337, depth: 0.294 }, position: { x: 0.605, y: -0.518, z: -0.447 } },
  { name: "BR_leg_tip", hitPart: "body", dimensions: { width: 0.145, height: 0.219, depth: 0.121 }, position: { x: 0.605, y: -0.796, z: -0.447 } },
  { name: "BR_leg_sideX", hitPart: "body", dimensions: { width: 0.192, height: 0.248, depth: 0.106 }, position: { x: 0.706, y: -0.474, z: -0.447 } },
  { name: "BR_leg_sideZ", hitPart: "body", dimensions: { width: 0.147, height: 0.244, depth: 0.163 }, position: { x: 0.605, y: -0.471, z: -0.6 } },
  { name: "FL_leg_main", hitPart: "body", dimensions: { width: 0.348, height: 0.337, depth: 0.294 }, position: { x: -0.605, y: -0.518, z: 0.447 } },
  { name: "FL_leg_tip", hitPart: "body", dimensions: { width: 0.145, height: 0.219, depth: 0.121 }, position: { x: -0.605, y: -0.796, z: 0.447 } },
  { name: "FL_leg_sideX", hitPart: "body", dimensions: { width: 0.192, height: 0.248, depth: 0.106 }, position: { x: -0.706, y: -0.474, z: 0.447 } },
  { name: "FL_leg_sideZ", hitPart: "body", dimensions: { width: 0.147, height: 0.244, depth: 0.163 }, position: { x: -0.605, y: -0.471, z: 0.6 } },
  { name: "FR_leg_main", hitPart: "body", dimensions: { width: 0.348, height: 0.337, depth: 0.294 }, position: { x: 0.605, y: -0.518, z: 0.447 } },
  { name: "FR_leg_tip", hitPart: "body", dimensions: { width: 0.145, height: 0.219, depth: 0.121 }, position: { x: 0.605, y: -0.796, z: 0.447 } },
  { name: "FR_leg_sideX", hitPart: "body", dimensions: { width: 0.192, height: 0.248, depth: 0.106 }, position: { x: 0.706, y: -0.474, z: 0.447 } },
  { name: "FR_leg_sideZ", hitPart: "body", dimensions: { width: 0.147, height: 0.244, depth: 0.163 }, position: { x: 0.605, y: -0.471, z: 0.6 } },
];
const ENEMY_HEAD_COLOR = 0x66ccff;
const ENEMY_HEAD_EMISSIVE = 0x16384a;
const ENEMY_EYE_COLOR = 0x7a0a0a;
const ENEMY_EYE_SIZE = 0.24;
const ENEMY_EYE_INSET = 0.03;
const ENEMY_EYE_OFFSET_X = 0.26;
const ENEMY_EYE_OFFSET_Y = 0.12;
const ENEMY_EYE_SLANT_RADIANS = 0.42;
const ENEMY_BROW_COLOR = 0x2b0000;
const ENEMY_BROW_WIDTH = 0.4;
const ENEMY_BROW_HEIGHT = 0.1;
const ENEMY_BROW_DEPTH = 0.1;
const ENEMY_BROW_OFFSET_Y = 0.25;
const ENEMY_BROW_OFFSET_X = 0.29;
const ENEMY_BROW_SLANT_RADIANS = 0.68;
const ENEMY_COLLISION_BOXES = [
  { hitPart: "body", center: { x: 0, y: -0.06, z: 0 }, halfExtents: { x: 0.9, y: 0.6, z: 0.72 } },
  { hitPart: "head", center: { x: 0, y: 0.76, z: 0 }, halfExtents: { x: 0.58, y: 0.42, z: 0.55 } },
];
const ENEMY_RENDER_MAX_INSTANCES = 1024;
const ENEMY_RENDER_HIT_TINT = new THREE.Color(0xffb8b8);
const ENEMY_RENDER_BASE_TINT = new THREE.Color(0xffffff);
const ENEMY_RENDER_PART_BODY = "body-mesh";
const ENEMY_RENDER_PART_HEAD = "head-mesh";
export const ENEMY_RAYCAST_LAYER = 1;

function shouldDisposeEnemyResource(resource) {
  return !isKenneyAssetManagedResource(resource);
}

function getDirectionOnPlane(from, to) {
  const direction = to.clone().sub(from);
  direction.y = 0;
  if (direction.lengthSq() < ENEMY_CONFIG.directionEpsilon) {
    return new THREE.Vector3(0, 0, 1);
  }
  return direction.normalize();
}

export function getLargestEnemySize() {
  return Object.values(ENEMY_TYPES).reduce((largest, enemyType) => {
    return Math.max(largest, enemyType.size);
  }, 0);
}

function normalizeEnemyType(rawType) {
  if (!FALLBACK_ENEMY_TYPE_KEY) {
    return null;
  }
  if (typeof rawType !== "string") {
    return FALLBACK_ENEMY_TYPE_KEY;
  }

  let type = rawType.trim().toLowerCase();
  if (!type) {
    return FALLBACK_ENEMY_TYPE_KEY;
  }

  const unsupportedPrefixes = ["regrow-", "camo-", "invisible-"];
  let changed = true;
  while (changed) {
    changed = false;
    for (const prefix of unsupportedPrefixes) {
      if (type.startsWith(prefix)) {
        type = type.slice(prefix.length);
        changed = true;
      }
    }
  }

  if (type.startsWith("r-")) {
    type = type.slice(2);
  }

  if (Object.prototype.hasOwnProperty.call(ENEMY_TYPES, type)) {
    return type;
  }
  return FALLBACK_ENEMY_TYPE_KEY;
}

function cellKey(cellX, cellZ) {
  return `${cellX},${cellZ}`;
}

function parseCellKey(key) {
  const [xText, zText] = String(key).split(",");
  return {
    x: Number.parseInt(xText, 10),
    z: Number.parseInt(zText, 10),
  };
}

function cloneCell(cell) {
  const cloned = { x: cell.x, z: cell.z };
  if (Number.isInteger(cell?.y)) {
    cloned.y = cell.y;
  }
  return cloned;
}

function makeUndirectedEdgeKey(aKey, bKey) {
  return aKey < bKey ? `${aKey}|${bKey}` : `${bKey}|${aKey}`;
}

function createPathObject(cells) {
  const normalizedCells = cells.map((cell) => ({ x: cell.x, z: cell.z }));
  const keys = normalizedCells.map((cell) => cellKey(cell.x, cell.z));
  const edgeSet = new Set();
  for (let i = 0; i < keys.length - 1; i += 1) {
    edgeSet.add(makeUndirectedEdgeKey(keys[i], keys[i + 1]));
  }
  return {
    cells: normalizedCells,
    key: keys.join("->"),
    cost: Math.max(0, normalizedCells.length - 1),
    edgeSet,
  };
}

function comparePathObjects(a, b) {
  if (a.cost !== b.cost) {
    return a.cost - b.cost;
  }
  return a.key.localeCompare(b.key);
}

export function createEnemySystem(scene, grid, options = {}) {
  const spawnCells = Array.isArray(grid?.spawnCells)
    ? grid.spawnCells.map((cell) => cloneCell(cell))
    : [];
  const endCell = grid?.endCell ? cloneCell(grid.endCell) : null;

  if (spawnCells.length === 0 || !endCell) {
    throw new Error("Enemy system requires at least one spawn cell and one end cell.");
  }

  const gridSize = Math.max(1, Math.floor(Number(grid?.gridSize) || 0));
  const onEnemyDefeated = typeof options?.onEnemyDefeated === "function"
    ? options.onEnemyDefeated
    : null;
  const onEnemySpawn = typeof options?.onEnemySpawn === "function"
    ? options.onEnemySpawn
    : null;
  const onEnemyDamaged = typeof options?.onEnemyDamaged === "function"
    ? options.onEnemyDamaged
    : null;
  const onDamageRequested = typeof options?.onDamageRequested === "function"
    ? options.onDamageRequested
    : null;
  let enemyHealthMultiplier = Number.isFinite(Number(options?.enemyHealthMultiplier))
    ? Math.max(0.01, Number(options.enemyHealthMultiplier))
    : CONFIGURED_GLOBAL_ENEMY_HEALTH_MULTIPLIER;
  let damageEnabled = options?.damageEnabled !== false;
  let networkViewMode = options?.networkViewMode === true;
  let lastAppliedNetworkStateSeq = -1;

  const activeEnemies = [];
  const enemyByNetworkId = new Map();
  let scheduledSpawns = [];
  let spawnEventCursor = 0;
  let waveElapsedTime = 0;
  let enemySpeedMultiplier = 1;
  let deathExplosionChance = 0;
  let deathExplosionRadiusAdd = 0;
  let deathExplosionDamageScaleAdd = 0;
  let enemySpawnSerial = 0;
  let nextEnemyNetworkId = 1;
  let spawnCellCursor = 0;

  const blockedCellKeys = new Set();
  const spawnCellSet = new Set(spawnCells.map((cell) => cellKey(cell.x, cell.z)));
  const endCellKey = cellKey(endCell.x, endCell.z);
  const routePoolsBySpawnIndex = new Map();

  const totalNodeCount = gridSize * gridSize;
  const blockedByNode = new Uint8Array(totalNodeCount);
  const distanceToEnd = new Int32Array(totalNodeCount);
  const scratchDistanceToEnd = new Int32Array(totalNodeCount);
  const bfsQueue = new Int32Array(totalNodeCount);
  const nodeExists = new Uint8Array(totalNodeCount);
  const nodeOutgoing = new Array(totalNodeCount);
  const nodeIncoming = new Array(totalNodeCount);
  const spawnNodeIds = [];
  const canBlockCacheByNode = new Map();
  const canBlockCacheByFootprint = new Map();
  let blockedRevision = 0;
  let variantBuildQueue = [];
  const pathPerfStats = {
    canBlockCalls: 0,
    canBlockCacheHits: 0,
    canBlockTotalMs: 0,
    canBlockLastMs: 0,
    setBlockedCalls: 0,
    setBlockedTotalMs: 0,
    setBlockedLastMs: 0,
    rerouteCalls: 0,
    rerouteTotalMs: 0,
    rerouteLastMs: 0,
    variantBuildFrames: 0,
    variantBuildTotalMs: 0,
    variantBuildLastMs: 0,
    variantRoutesAdded: 0,
  };

  const tempCenterPosition = new THREE.Vector3();
  const tempForwardDirection = new THREE.Vector3();
  const tempRightDirection = new THREE.Vector3();
  const tempLookTarget = new THREE.Vector3();
  const tempCollisionCenterA = new THREE.Vector3();
  const tempLocalPointA = new THREE.Vector3();
  const tempQuatA = new THREE.Quaternion();
  const tempQuatB = new THREE.Quaternion();
  const tempSegmentStart = new THREE.Vector3();
  const tempSegmentEnd = new THREE.Vector3();
  const tempFrontRampContact = new THREE.Vector3();
  const tempBackRampContact = new THREE.Vector3();
  const tempDefeatDropPosition = new THREE.Vector3();
  const tempCollisionLocalPoint = new THREE.Vector3();
  const tempRenderScale = new THREE.Vector3(1, 1, 1);
  const tempRenderPosition = new THREE.Vector3();
  const tempRenderMatrix = new THREE.Matrix4();
  const tempRenderParentMatrix = new THREE.Matrix4();
  const tempRenderColor = new THREE.Color();
  const deathExplosionEffects = [];
  const deathExplosionGeometry = new THREE.SphereGeometry(1, 14, 10);
  const deathExplosionMaterial = new THREE.MeshBasicMaterial({
    color: 0xffb58a,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  deathExplosionMaterial.toneMapped = false;
  const hasPerformanceNow = typeof globalThis.performance?.now === "function";

  function getNowMs() {
    return hasPerformanceNow ? globalThis.performance.now() : Date.now();
  }

  function parseEnemyNetworkId(rawId) {
    const parsed = Number.parseInt(rawId, 10);
    if (!Number.isInteger(parsed) || parsed < 1) {
      return null;
    }
    return parsed;
  }

  const gridCellSize = Math.max(0.0001, Number(grid?.cellSize) || 1);
  const endReachPoint = getEnemyCenterForCell(endCell.x, endCell.z, new THREE.Vector3());
  const endCenterReachRadius = Math.max(
    ENEMY_CONFIG.directionEpsilon,
    gridCellSize * 0.05
  );
  const networkSnapDistance = gridCellSize;
  const liveEnemyRenderBatches = {
    body: null,
    head: null,
    variantByKey: new Map(),
  };

  function findPreparedEnemyRenderPart(preparedVisual, partName) {
    if (!preparedVisual?.parts || !partName) {
      return null;
    }
    return preparedVisual.parts.find((part) => part?.name === partName) ?? null;
  }

  function getGeometryVertexCount(geometry) {
    const positionAttribute = geometry?.attributes?.position;
    return positionAttribute ? positionAttribute.count : 0;
  }

  function getGeometryIndexCount(geometry) {
    if (geometry?.index?.count) {
      return geometry.index.count;
    }
    return getGeometryVertexCount(geometry);
  }

function createEnemyBatchedMesh(material, maxVertexCount, maxIndexCount) {
    const batchMaterial = typeof material?.clone === "function"
      ? material.clone()
      : material;
    if (batchMaterial && "vertexColors" in batchMaterial) {
      batchMaterial.vertexColors = false;
      batchMaterial.needsUpdate = true;
    }
    const mesh = new THREE.BatchedMesh(
      ENEMY_RENDER_MAX_INSTANCES,
      Math.max(1, maxVertexCount),
      Math.max(1, maxIndexCount),
      batchMaterial
    );
    mesh.perObjectFrustumCulled = true;
    mesh.sortObjects = false;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    return mesh;
  }

  function initializeEnemyRenderBatches() {
    const preparedVariants = [];
    const seenVariantKeys = new Set();
    for (const [enemyTypeId, enemyType] of Object.entries(ENEMY_TYPES)) {
      const preparedVisual = getPreparedEnemyBatchParts(enemyType, enemyTypeId);
      if (!preparedVisual?.variantKey || seenVariantKeys.has(preparedVisual.variantKey)) {
        continue;
      }
      seenVariantKeys.add(preparedVisual.variantKey);
      preparedVariants.push(preparedVisual);
    }
    if (preparedVariants.length === 0) {
      return;
    }
    let bodyMaterial = null;
    let headMaterial = null;
    let bodyVertexCount = 0;
    let headVertexCount = 0;
    let bodyIndexCount = 0;
    let headIndexCount = 0;
    for (const preparedVisual of preparedVariants) {
      const bodyPart = findPreparedEnemyRenderPart(preparedVisual, ENEMY_RENDER_PART_BODY);
      const headPart = findPreparedEnemyRenderPart(preparedVisual, ENEMY_RENDER_PART_HEAD);
      if (bodyPart) {
        bodyMaterial ??= bodyPart.material;
        bodyVertexCount += getGeometryVertexCount(bodyPart.geometry);
        bodyIndexCount += getGeometryIndexCount(bodyPart.geometry);
      }
      if (headPart) {
        headMaterial ??= headPart.material;
        headVertexCount += getGeometryVertexCount(headPart.geometry);
        headIndexCount += getGeometryIndexCount(headPart.geometry);
      }
    }
    liveEnemyRenderBatches.body = bodyMaterial
      ? createEnemyBatchedMesh(bodyMaterial, bodyVertexCount, bodyIndexCount)
      : null;
    liveEnemyRenderBatches.head = headMaterial
      ? createEnemyBatchedMesh(headMaterial, headVertexCount, headIndexCount)
      : null;
    if (liveEnemyRenderBatches.body) {
      scene.add(liveEnemyRenderBatches.body);
    }
    if (liveEnemyRenderBatches.head) {
      scene.add(liveEnemyRenderBatches.head);
    }
    for (const preparedVisual of preparedVariants) {
      const bodyPart = findPreparedEnemyRenderPart(preparedVisual, ENEMY_RENDER_PART_BODY);
      const headPart = findPreparedEnemyRenderPart(preparedVisual, ENEMY_RENDER_PART_HEAD);
      liveEnemyRenderBatches.variantByKey.set(preparedVisual.variantKey, {
        bodyPart,
        headPart,
        bodyGeometryId: bodyPart && liveEnemyRenderBatches.body
          ? liveEnemyRenderBatches.body.addGeometry(bodyPart.geometry)
          : null,
        headGeometryId: headPart && liveEnemyRenderBatches.head
          ? liveEnemyRenderBatches.head.addGeometry(headPart.geometry)
          : null,
      });
    }
  }

  function isCellInsideLevel(cellX, cellZ) {
    if (typeof grid?.isCellInsideLevel === "function") {
      return !!grid.isCellInsideLevel(cellX, cellZ);
    }
    return cellX >= 0 && cellX < gridSize && cellZ >= 0 && cellZ < gridSize;
  }

  function getCellHeight(cellX, cellZ) {
    if (!isCellInsideLevel(cellX, cellZ)) {
      return null;
    }
    if (typeof grid?.getCellHeight === "function") {
      const height = Number(grid.getCellHeight(cellX, cellZ));
      return Number.isFinite(height) ? height : 0;
    }
    return 0;
  }

  function validateMarkerOnTraversableSurface(markerCell, label) {
    if (!markerCell) {
      throw new Error(`Enemy system requires a ${label} marker.`);
    }
    if (!Number.isInteger(markerCell.x) || !Number.isInteger(markerCell.z) || !Number.isInteger(markerCell.y)) {
      throw new Error(`Enemy ${label} marker must use integer x/y/z.`);
    }
    if (!isCellInsideLevel(markerCell.x, markerCell.z)) {
      throw new Error(`Enemy ${label} marker (${markerCell.x},${markerCell.z}) is outside the level.`);
    }
    const expectedSurfaceLevel = getCellHeight(markerCell.x, markerCell.z);
    if (!Number.isInteger(expectedSurfaceLevel)) {
      throw new Error(`Enemy ${label} marker (${markerCell.x},${markerCell.z}) has no traversable surface.`);
    }
    if (markerCell.y !== expectedSurfaceLevel) {
      throw new Error(
        `Enemy ${label} marker at (${markerCell.x},${markerCell.y},${markerCell.z}) must be on surface y=${expectedSurfaceLevel}.`
      );
    }
  }

  function getCellSurfaceY(cellX, cellZ) {
    if (typeof grid?.getCellSurfaceY === "function") {
      return Number(grid.getCellSurfaceY(cellX, cellZ)) || 0;
    }
    return 0;
  }

  function getSurfaceYAtWorld(worldX, worldZ) {
    if (typeof grid?.getBuildSurfaceYAtWorld === "function") {
      const surfaceY = Number(grid.getBuildSurfaceYAtWorld(worldX, worldZ));
      if (Number.isFinite(surfaceY)) {
        return surfaceY;
      }
    }
    if (typeof grid?.worldToCell === "function") {
      const cell = grid.worldToCell(worldX, worldZ);
      if (cell && isCellInsideLevel(cell.x, cell.z)) {
        return getCellSurfaceY(cell.x, cell.z);
      }
    }
    return 0;
  }

  function isRampAtWorld(worldX, worldZ) {
    if (typeof grid?.worldToCell !== "function") {
      return false;
    }
    const cell = grid.worldToCell(worldX, worldZ);
    if (!cell || !isCellInsideLevel(cell.x, cell.z)) {
      return false;
    }
    if (typeof grid?.isRampCell === "function") {
      return !!grid.isRampCell(cell.x, cell.z);
    }
    return !!getRampCellData(cell.x, cell.z);
  }

  function getRampCellData(cellX, cellZ) {
    if (typeof grid?.getRampCellData !== "function") {
      return null;
    }
    const rampCellData = grid.getRampCellData(cellX, cellZ);
    if (!rampCellData || typeof rampCellData !== "object") {
      return null;
    }
    return rampCellData;
  }

  function areCellsEqual(a, b) {
    return !!a && !!b && a.x === b.x && a.z === b.z;
  }

  function getEnemyCenterForCell(cellX, cellZ, out = new THREE.Vector3()) {
    const surfaceY = getCellSurfaceY(cellX, cellZ);
    if (typeof grid?.cellToWorldCenter === "function") {
      out.copy(grid.cellToWorldCenter(cellX, cellZ, surfaceY + ENEMY_PATH_Y_OFFSET));
      return out;
    }
    return out.set(0, surfaceY + ENEMY_PATH_Y_OFFSET, 0);
  }

  function nodeIdFromCell(cellX, cellZ) {
    if (!Number.isInteger(cellX) || !Number.isInteger(cellZ)) {
      return -1;
    }
    if (cellX < 0 || cellX >= gridSize || cellZ < 0 || cellZ >= gridSize) {
      return -1;
    }
    return (cellZ * gridSize) + cellX;
  }

  function cellFromNodeId(nodeId) {
    return {
      x: nodeId % gridSize,
      z: Math.floor(nodeId / gridSize),
    };
  }

  for (const spawnCell of spawnCells) {
    validateMarkerOnTraversableSurface(spawnCell, "spawn");
  }
  validateMarkerOnTraversableSurface(endCell, "end");

  const endNodeId = nodeIdFromCell(endCell.x, endCell.z);

  function isNodeBlocked(nodeId, extraBlockedNodeId = -1) {
    return (nodeId === extraBlockedNodeId) || blockedByNode[nodeId] === 1;
  }

  function isReservedEndpoint(cellX, cellZ) {
    const key = cellKey(cellX, cellZ);
    return key === endCellKey || spawnCellSet.has(key);
  }

  function isValidTransition(currentCell, nextCell, currentHeight, neighborHeight, currentRampCell, nextRampCell) {
    if (currentRampCell) {
      if (currentRampCell.role === RAMP_ROLE_LOW) {
        const toHighRampCell = areCellsEqual(nextCell, currentRampCell.highCell)
          && neighborHeight === currentRampCell.highLevel;
        const toLowOuterCell = areCellsEqual(nextCell, currentRampCell.lowOuterCell)
          && neighborHeight === currentRampCell.lowLevel;
        return toHighRampCell || toLowOuterCell;
      }
      if (currentRampCell.role === RAMP_ROLE_HIGH) {
        const toLowRampCell = areCellsEqual(nextCell, currentRampCell.lowCell)
          && neighborHeight === currentRampCell.lowLevel;
        const toHighOuterCell = areCellsEqual(nextCell, currentRampCell.highOuterCell)
          && neighborHeight === currentRampCell.highLevel;
        return toLowRampCell || toHighOuterCell;
      }
      return false;
    }

    if (nextRampCell) {
      if (nextRampCell.role === RAMP_ROLE_LOW) {
        return areCellsEqual(currentCell, nextRampCell.lowOuterCell)
          && currentHeight === nextRampCell.lowLevel
          && neighborHeight === nextRampCell.lowLevel;
      }
      if (nextRampCell.role === RAMP_ROLE_HIGH) {
        return areCellsEqual(currentCell, nextRampCell.highOuterCell)
          && currentHeight === nextRampCell.highLevel
          && neighborHeight === nextRampCell.highLevel;
      }
      return false;
    }

    return neighborHeight === currentHeight;
  }

  function buildNavigationGraph() {
    const offsets = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];

    for (let nodeId = 0; nodeId < totalNodeCount; nodeId += 1) {
      nodeExists[nodeId] = 0;
      nodeOutgoing[nodeId] = [];
      nodeIncoming[nodeId] = [];
    }

    for (let cellZ = 0; cellZ < gridSize; cellZ += 1) {
      for (let cellX = 0; cellX < gridSize; cellX += 1) {
        if (!isCellInsideLevel(cellX, cellZ)) {
          continue;
        }
        const height = getCellHeight(cellX, cellZ);
        if (!Number.isFinite(height)) {
          continue;
        }
        const nodeId = nodeIdFromCell(cellX, cellZ);
        if (nodeId >= 0) {
          nodeExists[nodeId] = 1;
        }
      }
    }

    for (let cellZ = 0; cellZ < gridSize; cellZ += 1) {
      for (let cellX = 0; cellX < gridSize; cellX += 1) {
        const nodeId = nodeIdFromCell(cellX, cellZ);
        if (nodeId < 0 || nodeExists[nodeId] !== 1) {
          continue;
        }

        const currentHeight = getCellHeight(cellX, cellZ);
        if (!Number.isFinite(currentHeight)) {
          continue;
        }
        const currentCell = { x: cellX, z: cellZ };
        const currentRampCell = getRampCellData(cellX, cellZ);
        const neighbors = [];

        for (const [dx, dz] of offsets) {
          const nextX = cellX + dx;
          const nextZ = cellZ + dz;
          const nextNodeId = nodeIdFromCell(nextX, nextZ);
          if (nextNodeId < 0 || nodeExists[nextNodeId] !== 1) {
            continue;
          }
          if (!isCellInsideLevel(nextX, nextZ)) {
            continue;
          }

          const neighborHeight = getCellHeight(nextX, nextZ);
          if (!Number.isFinite(neighborHeight)) {
            continue;
          }

          const nextCell = { x: nextX, z: nextZ };
          const nextRampCell = getRampCellData(nextX, nextZ);
          if (!isValidTransition(
            currentCell,
            nextCell,
            currentHeight,
            neighborHeight,
            currentRampCell,
            nextRampCell
          )) {
            continue;
          }

          neighbors.push(nextNodeId);
        }

        nodeOutgoing[nodeId] = neighbors;
      }
    }

    for (let nodeId = 0; nodeId < totalNodeCount; nodeId += 1) {
      if (nodeExists[nodeId] !== 1) {
        continue;
      }
      for (const neighborNodeId of nodeOutgoing[nodeId]) {
        nodeIncoming[neighborNodeId].push(nodeId);
      }
    }
  }

  function rebuildDistanceField(targetDistanceField, extraBlockedNodeId = -1) {
    targetDistanceField.fill(-1);
    if (endNodeId < 0 || nodeExists[endNodeId] !== 1 || isNodeBlocked(endNodeId, extraBlockedNodeId)) {
      return false;
    }

    let queueHead = 0;
    let queueTail = 0;
    bfsQueue[queueTail] = endNodeId;
    queueTail += 1;
    targetDistanceField[endNodeId] = 0;

    while (queueHead < queueTail) {
      const currentNodeId = bfsQueue[queueHead];
      queueHead += 1;
      const nextDistance = targetDistanceField[currentNodeId] + 1;
      const incoming = nodeIncoming[currentNodeId];
      for (let i = 0; i < incoming.length; i += 1) {
        const previousNodeId = incoming[i];
        if (targetDistanceField[previousNodeId] !== -1) {
          continue;
        }
        if (isNodeBlocked(previousNodeId, extraBlockedNodeId) && previousNodeId !== endNodeId) {
          continue;
        }
        targetDistanceField[previousNodeId] = nextDistance;
        bfsQueue[queueTail] = previousNodeId;
        queueTail += 1;
      }
    }

    return true;
  }

  function rebuildDistanceFieldWithExtraBlockedNodes(targetDistanceField, extraBlockedNodeIds = null) {
    const blockedSet = extraBlockedNodeIds instanceof Set
      ? extraBlockedNodeIds
      : new Set();
    targetDistanceField.fill(-1);
    if (
      endNodeId < 0
      || nodeExists[endNodeId] !== 1
      || blockedByNode[endNodeId] === 1
      || blockedSet.has(endNodeId)
    ) {
      return false;
    }

    let queueHead = 0;
    let queueTail = 0;
    bfsQueue[queueTail] = endNodeId;
    queueTail += 1;
    targetDistanceField[endNodeId] = 0;

    while (queueHead < queueTail) {
      const currentNodeId = bfsQueue[queueHead];
      queueHead += 1;
      const nextDistance = targetDistanceField[currentNodeId] + 1;
      const incoming = nodeIncoming[currentNodeId];
      for (let i = 0; i < incoming.length; i += 1) {
        const previousNodeId = incoming[i];
        if (targetDistanceField[previousNodeId] !== -1) {
          continue;
        }
        if ((blockedByNode[previousNodeId] === 1 || blockedSet.has(previousNodeId)) && previousNodeId !== endNodeId) {
          continue;
        }
        targetDistanceField[previousNodeId] = nextDistance;
        bfsQueue[queueTail] = previousNodeId;
        queueTail += 1;
      }
    }

    return true;
  }

  function areAllSpawnsReachable(distanceField) {
    for (const spawnNodeId of spawnNodeIds) {
      if (spawnNodeId < 0 || distanceField[spawnNodeId] < 0) {
        return false;
      }
    }
    return true;
  }

  function makeNodeEdgeKey(nodeA, nodeB) {
    const a = cellFromNodeId(nodeA);
    const b = cellFromNodeId(nodeB);
    return makeUndirectedEdgeKey(cellKey(a.x, a.z), cellKey(b.x, b.z));
  }

  function pickExitNeighborFromBlockedStart(startNodeId, distanceField, options = {}) {
    let bestNodeId = -1;
    let bestScore = Number.POSITIVE_INFINITY;
    let bestTieBreak = Number.POSITIVE_INFINITY;
    const candidates = nodeOutgoing[startNodeId] ?? [];
    const selectedRoutes = options.selectedRoutes ?? [];
    const spawnIndex = options.spawnIndex ?? 0;
    const attemptSeed = options.attemptSeed ?? 0;

    for (let i = 0; i < candidates.length; i += 1) {
      const neighborNodeId = candidates[i];
      if (isNodeBlocked(neighborNodeId) && neighborNodeId !== endNodeId) {
        continue;
      }
      const neighborDistance = distanceField[neighborNodeId];
      if (neighborDistance < 0) {
        continue;
      }

      let score = neighborDistance;
      if (options.preferDiversity) {
        const edgeKey = makeNodeEdgeKey(startNodeId, neighborNodeId);
        let overlapCount = 0;
        for (const route of selectedRoutes) {
          if (route?.edgeSet?.has(edgeKey)) {
            overlapCount += 1;
          }
        }
        const jitter = pseudoRandom01(
          ((spawnIndex + 1) * 1579)
          + ((attemptSeed + 1) * 211)
          + ((startNodeId + 1) * 61)
          + ((neighborNodeId + 1) * 103)
        );
        score += (overlapCount * ROUTE_OVERLAP_PENALTY) + (jitter * 0.5);
      }

      if (score < bestScore || (score === bestScore && neighborNodeId < bestTieBreak)) {
        bestScore = score;
        bestTieBreak = neighborNodeId;
        bestNodeId = neighborNodeId;
      }
    }

    return bestNodeId;
  }

  function pickForwardNeighbor(currentNodeId, currentDistance, distanceField, options = {}) {
    let bestNodeId = -1;
    let bestScore = Number.POSITIVE_INFINITY;
    let bestTieBreak = Number.POSITIVE_INFINITY;
    const candidates = nodeOutgoing[currentNodeId] ?? [];
    const selectedRoutes = options.selectedRoutes ?? [];
    const spawnIndex = options.spawnIndex ?? 0;
    const attemptSeed = options.attemptSeed ?? 0;

    for (let i = 0; i < candidates.length; i += 1) {
      const neighborNodeId = candidates[i];
      if (distanceField[neighborNodeId] !== currentDistance - 1) {
        continue;
      }
      if (isNodeBlocked(neighborNodeId) && neighborNodeId !== endNodeId) {
        continue;
      }

      let score = neighborNodeId;
      if (options.preferDiversity) {
        const edgeKey = makeNodeEdgeKey(currentNodeId, neighborNodeId);
        let overlapCount = 0;
        for (const route of selectedRoutes) {
          if (route?.edgeSet?.has(edgeKey)) {
            overlapCount += 1;
          }
        }
        const jitter = pseudoRandom01(
          ((spawnIndex + 1) * 1237)
          + ((attemptSeed + 1) * 337)
          + ((currentNodeId + 1) * 71)
          + ((neighborNodeId + 1) * 89)
        );
        score = (overlapCount * ROUTE_OVERLAP_PENALTY) + jitter;
      }

      if (score < bestScore || (score === bestScore && neighborNodeId < bestTieBreak)) {
        bestScore = score;
        bestTieBreak = neighborNodeId;
        bestNodeId = neighborNodeId;
      }
    }

    return bestNodeId;
  }

  function buildShortestRouteFromNode(startNodeId, options = {}) {
    if (!Number.isInteger(startNodeId) || startNodeId < 0 || startNodeId >= totalNodeCount) {
      return null;
    }
    if (nodeExists[startNodeId] !== 1) {
      return null;
    }

    const allowStartBlocked = !!options.allowStartBlocked;
    if (!allowStartBlocked && isNodeBlocked(startNodeId) && startNodeId !== endNodeId) {
      return null;
    }

    const distanceField = options.distanceField ?? distanceToEnd;
    if (!distanceField || distanceField.length !== totalNodeCount) {
      return null;
    }
    if (endNodeId < 0 || distanceField[endNodeId] !== 0) {
      return null;
    }

    const nodePath = [startNodeId];
    let currentNodeId = startNodeId;
    let currentDistance = distanceField[currentNodeId];

    if (currentNodeId !== endNodeId && currentDistance < 0) {
      if (!allowStartBlocked) {
        return null;
      }
      const exitNodeId = pickExitNeighborFromBlockedStart(currentNodeId, distanceField, options);
      if (exitNodeId < 0) {
        return null;
      }
      nodePath.push(exitNodeId);
      currentNodeId = exitNodeId;
      currentDistance = distanceField[currentNodeId];
      if (currentDistance < 0) {
        return null;
      }
    }

    let safety = totalNodeCount + 4;
    while (currentNodeId !== endNodeId && safety > 0) {
      safety -= 1;
      if (currentDistance <= 0) {
        return null;
      }
      const nextNodeId = pickForwardNeighbor(currentNodeId, currentDistance, distanceField, options);
      if (nextNodeId < 0) {
        return null;
      }
      nodePath.push(nextNodeId);
      currentNodeId = nextNodeId;
      currentDistance = distanceField[currentNodeId];
    }

    if (currentNodeId !== endNodeId) {
      return null;
    }

    return createPathObject(nodePath.map((nodeId) => cellFromNodeId(nodeId)));
  }

  function cloneRoutePoolMap(routePoolMap) {
    const cloned = new Map();
    for (const [spawnIndex, pool] of routePoolMap.entries()) {
      cloned.set(spawnIndex, pool.slice());
    }
    return cloned;
  }

  function initializeVariantBuildQueue() {
    variantBuildQueue = [];
    if (ROUTE_VARIANT_COUNT <= 1 || ROUTE_VARIANT_ATTEMPT_BUDGET <= 0) {
      return;
    }
    for (let spawnIndex = 0; spawnIndex < spawnNodeIds.length; spawnIndex += 1) {
      variantBuildQueue.push({
        spawnIndex,
        attempts: 0,
        seed: 0,
      });
    }
  }

  function rebuildSpawnRoutePools() {
    routePoolsBySpawnIndex.clear();
    let allReachable = true;

    for (let i = 0; i < spawnNodeIds.length; i += 1) {
      const baseRoute = buildShortestRouteFromNode(spawnNodeIds[i], {
        distanceField: distanceToEnd,
      });
      const pool = baseRoute ? [baseRoute] : [];
      routePoolsBySpawnIndex.set(i, pool);
      if (!baseRoute) {
        allReachable = false;
      }
    }

    if (allReachable) {
      initializeVariantBuildQueue();
    } else {
      variantBuildQueue = [];
    }
    return allReachable;
  }

  function runVariantBuildStep() {
    if (
      ROUTE_VARIANT_COUNT <= 1
      || ROUTE_VARIANT_ATTEMPT_BUDGET <= 0
      || ROUTE_VARIANT_BUILD_BUDGET_MS <= 0
      || variantBuildQueue.length === 0
    ) {
      return;
    }

    const startMs = getNowMs();
    let routesAdded = 0;
    let safety = 0;

    while (variantBuildQueue.length > 0) {
      if ((getNowMs() - startMs) >= ROUTE_VARIANT_BUILD_BUDGET_MS) {
        break;
      }

      const task = variantBuildQueue.shift();
      if (!task) {
        break;
      }

      const pool = routePoolsBySpawnIndex.get(task.spawnIndex) ?? [];
      if (pool.length >= ROUTE_VARIANT_COUNT || task.attempts >= ROUTE_VARIANT_ATTEMPT_BUDGET) {
        continue;
      }

      const candidateRoute = buildShortestRouteFromNode(spawnNodeIds[task.spawnIndex], {
        distanceField: distanceToEnd,
        preferDiversity: true,
        selectedRoutes: pool,
        spawnIndex: task.spawnIndex,
        attemptSeed: task.seed,
      });
      task.attempts += 1;
      task.seed += 1;

      if (candidateRoute && !pool.some((route) => route.key === candidateRoute.key)) {
        pool.push(candidateRoute);
        pool.sort(comparePathObjects);
        if (pool.length > ROUTE_VARIANT_COUNT) {
          pool.length = ROUTE_VARIANT_COUNT;
        }
        routePoolsBySpawnIndex.set(task.spawnIndex, pool);
        routesAdded += 1;
      }

      if (pool.length < ROUTE_VARIANT_COUNT && task.attempts < ROUTE_VARIANT_ATTEMPT_BUDGET) {
        variantBuildQueue.push(task);
      }

      safety += 1;
      if (safety > (spawnNodeIds.length * ROUTE_VARIANT_ATTEMPT_BUDGET * 2)) {
        break;
      }
    }

    const elapsedMs = getNowMs() - startMs;
    pathPerfStats.variantBuildFrames += 1;
    pathPerfStats.variantBuildLastMs = elapsedMs;
    pathPerfStats.variantBuildTotalMs += elapsedMs;
    pathPerfStats.variantRoutesAdded += routesAdded;
  }

  function sanitizeBlockedCellList(cells) {
    const mask = new Uint8Array(totalNodeCount);
    const keys = new Set();
    if (!Array.isArray(cells)) {
      return { mask, keys };
    }

    for (const cell of cells) {
      const x = Number.parseInt(cell?.x, 10);
      const z = Number.parseInt(cell?.z, 10);
      if (!Number.isInteger(x) || !Number.isInteger(z) || !isCellInsideLevel(x, z)) {
        continue;
      }
      if (isReservedEndpoint(x, z)) {
        continue;
      }
      const nodeId = nodeIdFromCell(x, z);
      if (nodeId < 0 || nodeExists[nodeId] !== 1) {
        continue;
      }
      mask[nodeId] = 1;
      keys.add(cellKey(x, z));
    }

    return { mask, keys };
  }

  function blockedCellMasksEqual(maskA, maskB) {
    if (!maskA || !maskB || maskA.length !== maskB.length) {
      return false;
    }
    for (let i = 0; i < maskA.length; i += 1) {
      if (maskA[i] !== maskB[i]) {
        return false;
      }
    }
    return true;
  }

  function applyBlockedState(mask, keys) {
    blockedByNode.set(mask);
    blockedCellKeys.clear();
    for (const key of keys) {
      blockedCellKeys.add(key);
    }
  }

  function canBlockCells(cells) {
    const startMs = getNowMs();
    pathPerfStats.canBlockCalls += 1;

    if (!Array.isArray(cells) || cells.length === 0) {
      pathPerfStats.canBlockLastMs = getNowMs() - startMs;
      pathPerfStats.canBlockTotalMs += pathPerfStats.canBlockLastMs;
      return false;
    }

    const nodeIds = [];
    const nodeIdSet = new Set();
    for (const cell of cells) {
      const cellX = Number.parseInt(cell?.x, 10);
      const cellZ = Number.parseInt(cell?.z, 10);
      if (!Number.isInteger(cellX) || !Number.isInteger(cellZ)) {
        pathPerfStats.canBlockLastMs = getNowMs() - startMs;
        pathPerfStats.canBlockTotalMs += pathPerfStats.canBlockLastMs;
        return false;
      }
      if (!isCellInsideLevel(cellX, cellZ) || isReservedEndpoint(cellX, cellZ)) {
        pathPerfStats.canBlockLastMs = getNowMs() - startMs;
        pathPerfStats.canBlockTotalMs += pathPerfStats.canBlockLastMs;
        return false;
      }
      const candidateNodeId = nodeIdFromCell(cellX, cellZ);
      if (candidateNodeId < 0 || nodeExists[candidateNodeId] !== 1 || blockedByNode[candidateNodeId] === 1) {
        pathPerfStats.canBlockLastMs = getNowMs() - startMs;
        pathPerfStats.canBlockTotalMs += pathPerfStats.canBlockLastMs;
        return false;
      }
      if (nodeIdSet.has(candidateNodeId)) {
        continue;
      }
      nodeIdSet.add(candidateNodeId);
      nodeIds.push(candidateNodeId);
    }

    if (nodeIds.length === 0) {
      pathPerfStats.canBlockLastMs = getNowMs() - startMs;
      pathPerfStats.canBlockTotalMs += pathPerfStats.canBlockLastMs;
      return false;
    }

    const cacheKey = nodeIds.length === 1
      ? String(nodeIds[0])
      : nodeIds.slice().sort((a, b) => a - b).join(",");
    const cached = nodeIds.length === 1
      ? canBlockCacheByNode.get(nodeIds[0])
      : canBlockCacheByFootprint.get(cacheKey);
    if (typeof cached === "boolean") {
      pathPerfStats.canBlockCacheHits += 1;
      pathPerfStats.canBlockLastMs = getNowMs() - startMs;
      pathPerfStats.canBlockTotalMs += pathPerfStats.canBlockLastMs;
      return cached;
    }

    const rebuilt = rebuildDistanceFieldWithExtraBlockedNodes(scratchDistanceToEnd, nodeIdSet);
    const canBlock = rebuilt && areAllSpawnsReachable(scratchDistanceToEnd);
    if (nodeIds.length === 1) {
      canBlockCacheByNode.set(nodeIds[0], canBlock);
    } else {
      canBlockCacheByFootprint.set(cacheKey, canBlock);
    }
    pathPerfStats.canBlockLastMs = getNowMs() - startMs;
    pathPerfStats.canBlockTotalMs += pathPerfStats.canBlockLastMs;
    return canBlock;
  }

  function canBlockCell(cellX, cellZ) {
    return canBlockCells([{ x: cellX, z: cellZ }]);
  }

  function rerouteEnemy(enemy) {
    if (!enemy || !enemy.alive || enemy.dying) {
      return false;
    }

    const currentCell = getEnemyCurrentCell(enemy);
    if (!currentCell) {
      return false;
    }

    const currentNodeId = nodeIdFromCell(currentCell.x, currentCell.z);
    if (currentNodeId < 0 || nodeExists[currentNodeId] !== 1) {
      return false;
    }

    const route = buildShortestRouteFromNode(currentNodeId, {
      distanceField: distanceToEnd,
      allowStartBlocked: true,
      preferDiversity: false,
    });
    if (!route) {
      return false;
    }

    return applyRouteToEnemy(enemy, route.cells, {
      fromCurrentPosition: true,
      currentCell,
    });
  }

  function rerouteActiveEnemies() {
    if (networkViewMode) {
      return;
    }
    const startMs = getNowMs();
    pathPerfStats.rerouteCalls += 1;
    for (const enemy of activeEnemies) {
      rerouteEnemy(enemy);
    }
    pathPerfStats.rerouteLastMs = getNowMs() - startMs;
    pathPerfStats.rerouteTotalMs += pathPerfStats.rerouteLastMs;
  }

  function setBlockedCells(cells) {
    const startMs = getNowMs();
    pathPerfStats.setBlockedCalls += 1;

    const nextBlocked = sanitizeBlockedCellList(cells);
    if (blockedCellMasksEqual(blockedByNode, nextBlocked.mask)) {
      pathPerfStats.setBlockedLastMs = getNowMs() - startMs;
      pathPerfStats.setBlockedTotalMs += pathPerfStats.setBlockedLastMs;
      return true;
    }

    const previousBlockedMask = blockedByNode.slice();
    const previousBlockedKeys = new Set(blockedCellKeys);
    const previousRoutePools = cloneRoutePoolMap(routePoolsBySpawnIndex);
    const previousDistanceField = distanceToEnd.slice();
    const previousVariantQueue = variantBuildQueue.map((task) => ({ ...task }));
    const previousRevision = blockedRevision;

    applyBlockedState(nextBlocked.mask, nextBlocked.keys);
    blockedRevision += 1;
    canBlockCacheByNode.clear();
    canBlockCacheByFootprint.clear();

    const rebuiltDistance = rebuildDistanceField(distanceToEnd);
    const reachable = rebuiltDistance && areAllSpawnsReachable(distanceToEnd);
    const rebuiltPools = reachable && rebuildSpawnRoutePools();
    if (!rebuiltPools) {
      applyBlockedState(previousBlockedMask, previousBlockedKeys);
      routePoolsBySpawnIndex.clear();
      for (const [spawnIndex, pool] of previousRoutePools.entries()) {
        routePoolsBySpawnIndex.set(spawnIndex, pool);
      }
      distanceToEnd.set(previousDistanceField);
      variantBuildQueue = previousVariantQueue;
      blockedRevision = previousRevision;
      canBlockCacheByNode.clear();
      canBlockCacheByFootprint.clear();
      pathPerfStats.setBlockedLastMs = getNowMs() - startMs;
      pathPerfStats.setBlockedTotalMs += pathPerfStats.setBlockedLastMs;
      return false;
    }

    rerouteActiveEnemies();
    pathPerfStats.setBlockedLastMs = getNowMs() - startMs;
    pathPerfStats.setBlockedTotalMs += pathPerfStats.setBlockedLastMs;
    return true;
  }

  function pseudoRandom01(seed) {
    const raw = Math.sin((seed * 127.1) + 311.7) * 43758.5453123;
    return raw - Math.floor(raw);
  }

  function getRandomLateralOffset() {
    if (ENEMY_STACK_OFFSET_MAX <= ENEMY_CONFIG.directionEpsilon) {
      enemySpawnSerial += 1;
      return 0;
    }
    const seed = enemySpawnSerial;
    enemySpawnSerial += 1;
    const magnitude = THREE.MathUtils.lerp(
      ENEMY_STACK_OFFSET_MIN,
      ENEMY_STACK_OFFSET_MAX,
      pseudoRandom01(seed + 1.357)
    );
    const sign = pseudoRandom01(seed + 9.913) < 0.5 ? -1 : 1;
    return magnitude * sign;
  }

  function setEnemyWorldPosition(enemy, centerPosition, forwardDirection = null) {
    if (!enemy || !enemy.mesh) {
      return;
    }

    if (centerPosition) {
      enemy.pathCenter.copy(centerPosition);
    }

    if (forwardDirection) {
      tempForwardDirection.copy(forwardDirection);
      tempForwardDirection.y = 0;
      if (tempForwardDirection.lengthSq() >= ENEMY_CONFIG.directionEpsilon) {
        tempForwardDirection.normalize();
        enemy.pathForward.copy(tempForwardDirection);
      }
    }

    enemy.mesh.position.copy(enemy.pathCenter);
    if (enemy.pathOffsetLateral !== 0) {
      tempRightDirection.set(-enemy.pathForward.z, 0, enemy.pathForward.x);
      enemy.mesh.position.addScaledVector(tempRightDirection, enemy.pathOffsetLateral);
    }
  }

  function updateEnemyNetworkPosition(enemy, position, { immediate = false } = {}) {
    if (!enemy?.mesh || !position) {
      return false;
    }
    const px = Number(position.x);
    const py = Number(position.y);
    const pz = Number(position.z);
    if (!Number.isFinite(px) || !Number.isFinite(py) || !Number.isFinite(pz)) {
      return false;
    }
    const currentCenter = enemy.pathCenter ?? enemy.networkTargetPosition ?? tempCenterPosition.set(0, 0, 0);
    tempCenterPosition.set(px, py, pz);
    enemy.networkTargetPosition.copy(tempCenterPosition);
    enemy.networkLastSeenAtMs = getNowMs();
    const deltaSq = currentCenter.distanceToSquared(tempCenterPosition);
    if (immediate || deltaSq >= (networkSnapDistance * networkSnapDistance)) {
      tempForwardDirection.copy(tempCenterPosition).sub(currentCenter);
      tempForwardDirection.y = 0;
      setEnemyWorldPosition(enemy, tempCenterPosition, tempForwardDirection);
      applyEnemyOrientation(enemy);
    }
    return true;
  }

  function updateEnemyFromNetworkSnapshot(enemy, snapshot = {}, options = {}) {
    if (!enemy) {
      return false;
    }
    const applyHealth = setEnemyHealthFromNetwork(enemy.networkId, snapshot?.health, snapshot?.maxHealth);
    const applyPosition = updateEnemyNetworkPosition(enemy, snapshot?.position, options);
    return applyHealth || applyPosition;
  }

  function updateEnemyNetworkView(enemy, deltaSeconds) {
    if (!enemy?.alive || enemy.dying || !enemy.networkTargetPosition || !enemy.pathCenter) {
      return;
    }
    const deltaSq = enemy.pathCenter.distanceToSquared(enemy.networkTargetPosition);
    if (deltaSq <= ENEMY_CONFIG.directionEpsilon) {
      setEnemyWorldPosition(enemy, enemy.pathCenter, enemy.pathForward);
      applyEnemyOrientation(enemy);
      return;
    }
    const lerpT = 1 - Math.exp(-NETWORK_ENEMY_POSITION_DAMPING * Math.max(0, deltaSeconds));
    tempCenterPosition.copy(enemy.pathCenter).lerp(enemy.networkTargetPosition, THREE.MathUtils.clamp(lerpT, 0, 1));
    tempForwardDirection.copy(tempCenterPosition).sub(enemy.pathCenter);
    tempForwardDirection.y = 0;
    setEnemyWorldPosition(enemy, tempCenterPosition, tempForwardDirection);
    applyEnemyOrientation(enemy);
  }

  function applyEnemyOrientation(enemy) {
    if (!enemy?.mesh) {
      return;
    }

    if (enemy.pathForward.lengthSq() >= ENEMY_CONFIG.directionEpsilon) {
      tempLookTarget.copy(enemy.mesh.position).add(enemy.pathForward);
      tempLookTarget.y = enemy.mesh.position.y;
      enemy.mesh.lookAt(tempLookTarget);
    }

    if (!enemy.visualRoot) {
      return;
    }

    const visualHoverHeight = Number.isFinite(Number(enemy.mesh.userData?.visualHoverHeight))
      ? Number(enemy.mesh.userData.visualHoverHeight)
      : ENEMY_SURFACE_HOVER_HEIGHT;

    const bodyHalfSize = Number(enemy.mesh.userData?.bodyHalfSize);
    const pathForwardLengthSq = enemy.pathForward?.lengthSq?.() ?? 0;
    if (!Number.isFinite(bodyHalfSize) || bodyHalfSize <= 0 || pathForwardLengthSq < ENEMY_CONFIG.directionEpsilon) {
      enemy.pathSlopePitch = 0;
      enemy.visualRoot.rotation.x = 0;
      enemy.visualRoot.rotation.y = 0;
      enemy.visualRoot.rotation.z = 0;
      enemy.visualRoot.position.x = 0;
      enemy.visualRoot.position.z = 0;
      enemy.visualRoot.position.y = visualHoverHeight;
      enemy.visualRootBaseOffsetY = enemy.visualRoot.position.y;
      enemy.mesh.userData.visualRootOffsetY = enemy.visualRoot.position.y;
      updateEnemyLiveRenderMatrices(enemy);
      return;
    }

    const scaleY = Math.max(0.001, Math.abs(enemy.visualRoot.scale?.y ?? 1));
    const scaleZ = Math.max(0.001, Math.abs(enemy.visualRoot.scale?.z ?? 1));
    const halfHeight = bodyHalfSize * scaleY;
    const halfDepth = bodyHalfSize * scaleZ;
    if (halfDepth <= ENEMY_CONFIG.directionEpsilon) {
      enemy.pathSlopePitch = 0;
      enemy.visualRoot.rotation.x = 0;
      enemy.visualRoot.rotation.y = 0;
      enemy.visualRoot.rotation.z = 0;
      enemy.visualRoot.position.x = 0;
      enemy.visualRoot.position.z = 0;
      enemy.visualRoot.position.y = visualHoverHeight;
      enemy.visualRootBaseOffsetY = enemy.visualRoot.position.y;
      enemy.mesh.userData.visualRootOffsetY = enemy.visualRoot.position.y;
      updateEnemyLiveRenderMatrices(enemy);
      return;
    }

    tempFrontRampContact.copy(enemy.pathCenter).addScaledVector(enemy.pathForward, halfDepth);
    tempBackRampContact.copy(enemy.pathCenter).addScaledVector(enemy.pathForward, -halfDepth);

    const centerSurfaceY = getSurfaceYAtWorld(enemy.pathCenter.x, enemy.pathCenter.z);
    const frontSurfaceY = getSurfaceYAtWorld(tempFrontRampContact.x, tempFrontRampContact.z);
    const backSurfaceY = getSurfaceYAtWorld(tempBackRampContact.x, tempBackRampContact.z);
    const frontOnRamp = isRampAtWorld(tempFrontRampContact.x, tempFrontRampContact.z);
    const backOnRamp = isRampAtWorld(tempBackRampContact.x, tempBackRampContact.z);
    const hasRampContact = frontOnRamp || backOnRamp;

    let visualPitch = 0;
    if (hasRampContact) {
      const desiredSurfaceDelta = frontSurfaceY - backSurfaceY;
      const clampedSinPitch = THREE.MathUtils.clamp(
        desiredSurfaceDelta / (halfDepth * 2),
        -1,
        1
      );
      visualPitch = -Math.asin(clampedSinPitch);
    }

    enemy.pathSlopePitch = -visualPitch;
    enemy.visualRoot.rotation.x = visualPitch;
    enemy.visualRoot.rotation.y = 0;
    enemy.visualRoot.rotation.z = 0;
    enemy.visualRoot.position.x = 0;
    enemy.visualRoot.position.z = 0;

    const bodyCenterOffsetY = Number(enemy.mesh.userData?.bodyCenterOffsetY) || 0;
    const visualBottomOffsetY = Number(enemy.mesh.userData?.visualBottomOffsetY);
    const localBottomY = Number.isFinite(visualBottomOffsetY)
      ? visualBottomOffsetY
      : (bodyCenterOffsetY - halfHeight);
    const cosPitch = Math.cos(visualPitch);
    const targetAverageY = hasRampContact
      ? ((frontSurfaceY + backSurfaceY) * 0.5)
      : centerSurfaceY;
    const predictedAverageY = enemy.mesh.position.y + (localBottomY * cosPitch);
    enemy.visualRoot.position.y = (targetAverageY - predictedAverageY) + visualHoverHeight;
    enemy.visualRootBaseOffsetY = enemy.visualRoot.position.y;
    enemy.mesh.userData.visualRootOffsetY = enemy.visualRoot.position.y;
    updateEnemyLiveRenderMatrices(enemy);
  }

  function updateEnemyWalkAnimation(enemy, deltaSeconds) {
    if (!enemy?.visualRoot || !enemy?.mesh) {
      return;
    }

    const currentX = Number.isFinite(enemy.pathCenter?.x) ? enemy.pathCenter.x : enemy.mesh.position.x;
    const currentZ = Number.isFinite(enemy.pathCenter?.z) ? enemy.pathCenter.z : enemy.mesh.position.z;
    const previousX = Number(enemy.walkCycleLastX);
    const previousZ = Number(enemy.walkCycleLastZ);
    let movedDistance = 0;
    if (Number.isFinite(previousX) && Number.isFinite(previousZ)) {
      const dx = currentX - previousX;
      const dz = currentZ - previousZ;
      movedDistance = Math.hypot(dx, dz);
    }
    enemy.walkCycleLastX = currentX;
    enemy.walkCycleLastZ = currentZ;

    const targetMotion = movedDistance > 0.0001 ? 1 : 0;
    const blendT = 1 - Math.exp(-ENEMY_WALK_MOTION_BLEND_DAMPING * Math.max(0, deltaSeconds));
    enemy.walkCycleMotion = THREE.MathUtils.lerp(
      Number(enemy.walkCycleMotion) || 0,
      targetMotion,
      blendT
    );

    if (movedDistance > 0) {
      enemy.walkCyclePhase = (Number(enemy.walkCyclePhase) || 0)
        + (movedDistance * ENEMY_WALK_CYCLE_RADIANS_PER_WORLD_UNIT);
    }

    const motion = THREE.MathUtils.clamp(Number(enemy.walkCycleMotion) || 0, 0, 1);
    const phase = Number(enemy.walkCyclePhase) || 0;
    const bodyHalfSize = Math.max(
      0.05,
      Number(enemy.mesh.userData?.bodyHalfSize) || Number(enemy.radius) || 0.5
    );
    const baseOffsetY = Number.isFinite(Number(enemy.visualRootBaseOffsetY))
      ? Number(enemy.visualRootBaseOffsetY)
      : enemy.visualRoot.position.y;
    const bobWave = (1 - Math.cos(phase * 2)) * 0.5;
    const swayWave = Math.sin(phase);

    enemy.visualRoot.position.x = swayWave * bodyHalfSize * ENEMY_WALK_SWAY_OFFSET_FACTOR * motion;
    enemy.visualRoot.position.y = baseOffsetY + (bobWave * bodyHalfSize * ENEMY_WALK_BOB_HEIGHT_FACTOR * motion);
    enemy.visualRoot.rotation.z = swayWave * ENEMY_WALK_ROLL_RADIANS * motion;
    enemy.visualRoot.rotation.y = swayWave * ENEMY_WALK_YAW_RADIANS * motion;
    enemy.mesh.userData.visualRootOffsetY = enemy.visualRoot.position.y;
    updateEnemyLiveRenderMatrices(enemy);
  }

  function getEnemyCollisionCenter(enemy, out) {
    if (!enemy?.mesh) {
      return out.set(0, 0, 0);
    }
    out.copy(enemy.mesh.position);
    const centerOffsetY = enemy.mesh.userData?.bodyCenterOffsetY;
    if (typeof centerOffsetY === "number") {
      out.y += centerOffsetY;
    }
    return out;
  }

  function getEnemyCollisionBoxes(enemyMesh) {
    if (!enemyMesh || !Array.isArray(enemyMesh.userData?.collisionBoxes)) {
      return [];
    }
    return enemyMesh.userData.collisionBoxes;
  }

  function worldPointToEnemyCollisionLocal(enemy, worldPoint, out) {
    if (!enemy?.visualRoot || !worldPoint) {
      return out.set(0, 0, 0);
    }
    enemy.visualRoot.updateWorldMatrix(true, false);
    out.copy(worldPoint);
    enemy.visualRoot.worldToLocal(out);
    return out;
  }

  function getEnemyHitPartAtPoint(enemyMesh, point, radius = 0) {
    const enemy = findActiveEnemyByMesh(enemyMesh);
    if (!enemy || !enemy.alive || enemy.dying || !point) {
      return null;
    }

    worldPointToEnemyCollisionLocal(enemy, point, tempCollisionLocalPoint);

    const hitRadius = Math.max(0, Number(radius) || 0);
    const hitThresholdSq = hitRadius * hitRadius;
    const collisionBoxes = getEnemyCollisionBoxes(enemyMesh);
    let bestHitPart = null;
    let bestDistanceSq = Number.POSITIVE_INFINITY;
    for (const box of collisionBoxes) {
      if (!box?.halfExtents || !box?.center) {
        continue;
      }
      const dx = Math.max(0, Math.abs(tempCollisionLocalPoint.x - box.center.x) - (box.halfExtents.x + hitRadius));
      const dy = Math.max(0, Math.abs(tempCollisionLocalPoint.y - box.center.y) - (box.halfExtents.y + hitRadius));
      const dz = Math.max(0, Math.abs(tempCollisionLocalPoint.z - box.center.z) - (box.halfExtents.z + hitRadius));
      const distanceSq = (dx * dx) + (dy * dy) + (dz * dz);
      if (distanceSq > hitThresholdSq) {
        continue;
      }
      const hitPart = box.hitPart === "head" ? "head" : "body";
      if (
        distanceSq < bestDistanceSq
        || (Math.abs(distanceSq - bestDistanceSq) < 1e-6 && hitPart === "head" && bestHitPart !== "head")
      ) {
        bestDistanceSq = distanceSq;
        bestHitPart = hitPart;
      }
    }
    return bestHitPart;
  }

  function getEnemyContainmentRadius(enemy) {
    if (!enemy?.mesh) {
      return 0;
    }
    const bodyHalfSize = enemy.mesh.userData?.bodyHalfSize;
    const baseHalfSize = (typeof bodyHalfSize === "number" && bodyHalfSize > 0)
      ? bodyHalfSize
      : Math.max(0, Number(enemy.radius) || 0);
    const visualScale = enemy.visualRoot?.scale;
    const scaleX = Math.max(0.001, Math.abs(visualScale?.x ?? 1));
    const scaleY = Math.max(0.001, Math.abs(visualScale?.y ?? 1));
    const scaleZ = Math.max(0.001, Math.abs(visualScale?.z ?? 1));
    return baseHalfSize * Math.max(scaleX, scaleY, scaleZ);
  }

  function pointDistanceSqToEnemyBody(enemy, point) {
    if (!enemy?.mesh || !point) {
      return Number.POSITIVE_INFINITY;
    }

    worldPointToEnemyCollisionLocal(enemy, point, tempLocalPointA);

    let minDistanceSq = Number.POSITIVE_INFINITY;
    const collisionBoxes = getEnemyCollisionBoxes(enemy.mesh);
    for (const box of collisionBoxes) {
      if (!box?.halfExtents || !box?.center) {
        continue;
      }
      const dx = Math.max(0, Math.abs(tempLocalPointA.x - box.center.x) - box.halfExtents.x);
      const dy = Math.max(0, Math.abs(tempLocalPointA.y - box.center.y) - box.halfExtents.y);
      const dz = Math.max(0, Math.abs(tempLocalPointA.z - box.center.z) - box.halfExtents.z);
      const distSq = (dx * dx) + (dy * dy) + (dz * dz);
      if (distSq < minDistanceSq) {
        minDistanceSq = distSq;
      }
    }
    if (Number.isFinite(minDistanceSq)) {
      return minDistanceSq;
    }

    const centerOffsetY = enemy.mesh.userData?.bodyCenterOffsetY;
    if (typeof centerOffsetY === "number") {
      tempLocalPointA.y -= centerOffsetY;
    }
    const bodyHalfSize = enemy.mesh.userData?.bodyHalfSize;
    const baseHalfSize = (typeof bodyHalfSize === "number" && bodyHalfSize > 0)
      ? bodyHalfSize
      : Math.max(0, Number(enemy.radius) || 0);
    const visualScale = enemy.visualRoot?.scale;
    const halfX = baseHalfSize * Math.max(0.001, Math.abs(visualScale?.x ?? 1));
    const halfY = baseHalfSize * Math.max(0.001, Math.abs(visualScale?.y ?? 1));
    const halfZ = baseHalfSize * Math.max(0.001, Math.abs(visualScale?.z ?? 1));
    const dx = Math.max(0, Math.abs(tempLocalPointA.x) - halfX);
    const dy = Math.max(0, Math.abs(tempLocalPointA.y) - halfY);
    const dz = Math.max(0, Math.abs(tempLocalPointA.z) - halfZ);
    return (dx * dx) + (dy * dy) + (dz * dz);
  }

  function isPointNearEnemyBody(enemy, point, extraRadius = 0) {
    const radius = Math.max(0, Number(extraRadius) || 0);
    return pointDistanceSqToEnemyBody(enemy, point) <= (radius * radius);
  }

  function routeCellsToEnemyPoints(routeCells) {
    const points = [];
    for (const cell of routeCells) {
      const point = getEnemyCenterForCell(cell.x, cell.z, new THREE.Vector3());
      points.push(point);
    }
    return points;
  }

  function updateEnemyTransformFromRoute(enemy) {
    const start = enemy.travelWaypoints[enemy.segmentIndex];
    const end = enemy.travelWaypoints[enemy.segmentIndex + 1];

    if (!start || !end) {
      const finalPoint = enemy.travelWaypoints[enemy.travelWaypoints.length - 1];
      if (finalPoint) {
        tempCenterPosition.copy(finalPoint);
        tempCenterPosition.y = getSurfaceYAtWorld(finalPoint.x, finalPoint.z) + ENEMY_PATH_Y_OFFSET;
        setEnemyWorldPosition(enemy, tempCenterPosition, enemy.pathForward);
        applyEnemyOrientation(enemy);
      }
      return;
    }

    const segmentLength = start.distanceTo(end);
    const t = segmentLength <= ENEMY_CONFIG.directionEpsilon
      ? 0
      : (enemy.segmentProgress / segmentLength);

    tempSegmentStart.copy(start);
    tempSegmentEnd.copy(end);
    tempSegmentStart.y = getSurfaceYAtWorld(start.x, start.z) + ENEMY_PATH_Y_OFFSET;
    tempSegmentEnd.y = getSurfaceYAtWorld(end.x, end.z) + ENEMY_PATH_Y_OFFSET;

    tempCenterPosition.lerpVectors(tempSegmentStart, tempSegmentEnd, t);
    tempCenterPosition.y = getSurfaceYAtWorld(tempCenterPosition.x, tempCenterPosition.z) + ENEMY_PATH_Y_OFFSET;

    tempForwardDirection.copy(tempSegmentEnd).sub(tempSegmentStart);
    const horizontalLengthSq = (tempForwardDirection.x * tempForwardDirection.x)
      + (tempForwardDirection.z * tempForwardDirection.z);

    tempForwardDirection.y = 0;
    if (horizontalLengthSq >= ENEMY_CONFIG.directionEpsilon) {
      tempForwardDirection.normalize();
      enemy.pathForward.copy(tempForwardDirection);
    } else if (enemy.pathForward.lengthSq() < ENEMY_CONFIG.directionEpsilon) {
      enemy.pathForward.set(0, 0, 1);
    }

    setEnemyWorldPosition(enemy, tempCenterPosition, enemy.pathForward);
    applyEnemyOrientation(enemy);
  }

  function hasEnemyReachedEndCenter(enemy) {
    if (!enemy?.pathCenter || endCenterReachRadius <= 0) {
      return false;
    }
    tempCollisionCenterA.copy(enemy.pathCenter);
    return tempCollisionCenterA.distanceToSquared(endReachPoint)
      <= (endCenterReachRadius * endCenterReachRadius);
  }

  function getEnemyCurrentCell(enemy) {
    if (!enemy?.pathCenter) {
      return null;
    }

    if (typeof grid?.worldToCell === "function") {
      const cell = grid.worldToCell(enemy.pathCenter.x, enemy.pathCenter.z);
      if (cell && isCellInsideLevel(cell.x, cell.z)) {
        return cell;
      }
    }

    if (enemy.routeCells && enemy.routeCells.length > 0) {
      const lastKnown = enemy.routeCells[Math.min(enemy.segmentIndex, enemy.routeCells.length - 1)];
      if (lastKnown) {
        return { x: lastKnown.x, z: lastKnown.z };
      }
    }

    return null;
  }

  function applyRouteToEnemy(enemy, routeCells, options = {}) {
    if (!enemy || !Array.isArray(routeCells) || routeCells.length === 0) {
      return false;
    }

    const fromCurrentPosition = !!options.fromCurrentPosition;
    const currentCell = options.currentCell ?? routeCells[0];

    const routePoints = routeCellsToEnemyPoints(routeCells);

    let travelWaypoints = routePoints;
    if (fromCurrentPosition) {
      travelWaypoints = [enemy.pathCenter.clone(), ...routePoints];
      if (routeCells.length > 0) {
        const firstRouteCell = routeCells[0];
        if (firstRouteCell.x === currentCell.x && firstRouteCell.z === currentCell.z) {
          travelWaypoints.splice(1, 1);
        }
      }
    }

    if (travelWaypoints.length === 0) {
      return false;
    }

    if (travelWaypoints.length === 1) {
      travelWaypoints.push(travelWaypoints[0].clone());
    }

    enemy.routeCells = routeCells.map((cell) => cloneCell(cell));
    enemy.travelWaypoints = travelWaypoints;
    enemy.segmentIndex = 0;
    enemy.segmentProgress = 0;

    const first = enemy.travelWaypoints[0];
    const second = enemy.travelWaypoints[1] ?? enemy.travelWaypoints[0];
    const direction = getDirectionOnPlane(first, second);
    setEnemyWorldPosition(enemy, first, direction);
    applyEnemyOrientation(enemy);

    return true;
  }

  function pickSpawnRoutePool(spawnIndex) {
    const pool = routePoolsBySpawnIndex.get(spawnIndex) ?? [];
    if (pool.length === 0) {
      return null;
    }
    const randomIndex = Math.floor(Math.random() * pool.length);
    return pool[randomIndex] ?? pool[0] ?? null;
  }

  function upgradeSlowEnemies(multiplier = ENEMY_CONFIG.slowUpgradeMultiplier) {
    const speedMultiplier = Number(multiplier);
    if (!Number.isFinite(speedMultiplier) || speedMultiplier <= 0) {
      return;
    }
    enemySpeedMultiplier *= speedMultiplier;
  }

  function applyTechGrants(grants = {}) {
    const enemyGrants = grants?.enemy && typeof grants.enemy === "object"
      ? grants.enemy
      : grants;
    if (!enemyGrants || typeof enemyGrants !== "object") {
      return false;
    }

    let appliedAny = false;
    const deathExplosionChanceAdd = Number(enemyGrants.deathExplosionChanceAdd);
    if (Number.isFinite(deathExplosionChanceAdd) && deathExplosionChanceAdd !== 0) {
      deathExplosionChance = THREE.MathUtils.clamp(
        deathExplosionChance + deathExplosionChanceAdd,
        0,
        1
      );
      appliedAny = true;
    }

    const deathExplosionRadiusAddGrant = Number(enemyGrants.deathExplosionRadiusAdd);
    if (Number.isFinite(deathExplosionRadiusAddGrant) && deathExplosionRadiusAddGrant !== 0) {
      deathExplosionRadiusAdd += deathExplosionRadiusAddGrant;
      appliedAny = true;
    }

    const deathExplosionDamageScaleAddGrant = Number(enemyGrants.deathExplosionDamageScaleAdd);
    if (Number.isFinite(deathExplosionDamageScaleAddGrant) && deathExplosionDamageScaleAddGrant !== 0) {
      deathExplosionDamageScaleAdd += deathExplosionDamageScaleAddGrant;
      appliedAny = true;
    }

    return appliedAny;
  }

  function spawnDeathExplosionEffect(position, radius) {
    const mesh = new THREE.Mesh(deathExplosionGeometry, deathExplosionMaterial.clone());
    mesh.material.toneMapped = false;
    mesh.position.copy(position);
    mesh.scale.setScalar(0.01);
    scene.add(mesh);
    deathExplosionEffects.push({
      mesh,
      life: ENEMY_DEATH_EXPLOSION_VISUAL_DURATION,
      maxLife: ENEMY_DEATH_EXPLOSION_VISUAL_DURATION,
      radius: Math.max(0.1, radius),
    });
  }

  function triggerEnemyDeathExplosion(enemy) {
    if (!enemy || enemy.deathExplosionProcessed) {
      return false;
    }
    enemy.deathExplosionProcessed = true;

    if (deathExplosionChance <= 0 || Math.random() > deathExplosionChance) {
      return false;
    }

    const explosionRadius = Math.max(0.1, ENEMY_DEATH_EXPLOSION_BASE_RADIUS + deathExplosionRadiusAdd);
    const damageScale = Math.max(0, ENEMY_DEATH_EXPLOSION_BASE_DAMAGE_SCALE + deathExplosionDamageScaleAdd);
    if (explosionRadius <= 0 || damageScale <= 0) {
      return false;
    }

    const explosionCenter = getEnemyCollisionCenter(enemy, tempDefeatDropPosition).clone();
    const explosionDamage = Math.max(0, Number(enemy.maxHealth) || 0) * damageScale;
    if (explosionDamage > 0) {
      applyDamageAtPoint(explosionCenter, explosionRadius, explosionDamage);
    }
    spawnDeathExplosionEffect(explosionCenter, explosionRadius);
    return true;
  }

  function buildSpawnEventsFromSegments(segments) {
    const events = [];
    let sequence = 0;

    for (const segment of segments) {
      if (!segment || typeof segment !== "object") {
        continue;
      }
      const type = normalizeEnemyType(segment.type);
      if (!type) {
        continue;
      }

      const count = Math.max(0, Math.floor(Number(segment.count) || 0));
      if (count <= 0) {
        continue;
      }

      let start = Number(segment.start);
      let end = Number(segment.end);
      if (!Number.isFinite(start)) {
        start = 0;
      }
      if (!Number.isFinite(end)) {
        end = start;
      }
      if (end < start) {
        const swap = start;
        start = end;
        end = swap;
      }

      const step = count <= 1 ? 0 : (end - start) / (count - 1);
      for (let i = 0; i < count; i += 1) {
        events.push({
          type,
          time: start + (step * i),
          order: sequence++,
        });
      }
    }

    events.sort((a, b) => {
      if (a.time !== b.time) {
        return a.time - b.time;
      }
      return a.order - b.order;
    });

    return events;
  }

  function buildSpawnEventsFromCounts(counts) {
    const events = [];
    if (!counts || typeof counts !== "object") {
      return events;
    }

    const startDelay = Math.max(0, Number(ENEMY_CONFIG.waveStartSpawnDelay) || 0);
    const interval = Math.max(0, Number(ENEMY_CONFIG.spawnInterval) || 0);
    let sequence = 0;
    let spawnTime = startDelay;

    for (const [rawType, rawCount] of Object.entries(counts)) {
      const type = normalizeEnemyType(rawType);
      if (!type) {
        continue;
      }
      const count = Math.max(0, Math.floor(Number(rawCount) || 0));
      for (let i = 0; i < count; i += 1) {
        events.push({
          type,
          time: spawnTime,
          order: sequence++,
        });
        spawnTime += interval;
      }
    }

    return events;
  }

  function startWave(waveDefinition) {
    if (Array.isArray(waveDefinition)) {
      scheduledSpawns = buildSpawnEventsFromSegments(waveDefinition);
    } else {
      scheduledSpawns = buildSpawnEventsFromCounts(waveDefinition);
    }
    spawnEventCursor = 0;
    waveElapsedTime = 0;
    spawnCellCursor = 0;
  }

  function isWaveClear() {
    return activeEnemies.length === 0 && spawnEventCursor >= scheduledSpawns.length;
  }

  function collectEnemyVisualMaterialStates(materials = []) {
    const states = [];
    const seen = new Set();
    for (const material of Array.isArray(materials) ? materials : []) {
      if (!material || seen.has(material)) {
        continue;
      }
      seen.add(material);
      states.push({
        material,
        color: material.color?.clone?.() ?? new THREE.Color(0xffffff),
        emissiveIntensity: Number.isFinite(Number(material.emissiveIntensity))
          ? Number(material.emissiveIntensity)
          : 0,
      });
    }
    return states;
  }

  function createEnemyRaycastProxyMesh(box) {
    const proxyGeometry = new THREE.BoxGeometry(
      Math.max(0.01, box.halfExtents.x * 2),
      Math.max(0.01, box.halfExtents.y * 2),
      Math.max(0.01, box.halfExtents.z * 2)
    );
    const proxyMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
      depthTest: false,
    });
    proxyMaterial.colorWrite = false;
    const proxyMesh = new THREE.Mesh(proxyGeometry, proxyMaterial);
    proxyMesh.position.set(
      box.center.x,
      box.center.y,
      box.center.z
    );
    proxyMesh.castShadow = false;
    proxyMesh.receiveShadow = false;
    proxyMesh.layers.set(ENEMY_RAYCAST_LAYER);
    proxyMesh.userData.enemyRaycastProxy = true;
    proxyMesh.userData.enemyHitPart = box.hitPart === "head" ? "head" : "body";
    proxyMesh.userData.enemyPartName = `hit_proxy_${proxyMesh.userData.enemyHitPart}`;
    return proxyMesh;
  }

  function buildPreparedEnemyCollisionBoxes(preparedVisual) {
    if (Array.isArray(preparedVisual?.enemyCollisionBoxes) && preparedVisual.enemyCollisionBoxes.length > 0) {
      return preparedVisual.enemyCollisionBoxes.map((box) => ({
        hitPart: box.hitPart,
        center: {
          x: box.center.x,
          y: box.center.y,
          z: box.center.z,
        },
        halfExtents: {
          x: box.halfExtents.x,
          y: box.halfExtents.y,
          z: box.halfExtents.z,
        },
      }));
    }
    if (!preparedVisual?.parts) {
      return null;
    }
    const partDefinitions = [
      { meshName: ENEMY_RENDER_PART_BODY, hitPart: "body" },
      { meshName: ENEMY_RENDER_PART_HEAD, hitPart: "head" },
    ];
    const boxes = [];
    for (const { meshName, hitPart } of partDefinitions) {
      const targetPart = findPreparedEnemyRenderPart(preparedVisual, meshName);
      if (!targetPart?.geometry) {
        continue;
      }
      if (targetPart.geometry.boundingBox == null && typeof targetPart.geometry.computeBoundingBox === "function") {
        targetPart.geometry.computeBoundingBox();
      }
      if (!targetPart.geometry.boundingBox) {
        continue;
      }
      const bounds = targetPart.geometry.boundingBox.clone().applyMatrix4(targetPart.matrix);
      const center = bounds.getCenter(new THREE.Vector3());
      const size = bounds.getSize(new THREE.Vector3());
      boxes.push({
        hitPart,
        center: {
          x: center.x,
          y: center.y,
          z: center.z,
        },
        halfExtents: {
          x: Math.max(0.01, size.x * 0.5),
          y: Math.max(0.01, size.y * 0.5),
          z: Math.max(0.01, size.z * 0.5),
        },
      });
    }
    return boxes.length > 0 ? boxes : null;
  }

  function buildImportedEnemyCollisionBoxes(importedVisual) {
    if (Array.isArray(importedVisual?.userData?.enemyCollisionBoxes) && importedVisual.userData.enemyCollisionBoxes.length > 0) {
      return importedVisual.userData.enemyCollisionBoxes.map((box) => ({
        hitPart: box.hitPart,
        center: {
          x: box.center.x,
          y: box.center.y,
          z: box.center.z,
        },
        halfExtents: {
          x: box.halfExtents.x,
          y: box.halfExtents.y,
          z: box.halfExtents.z,
        },
      }));
    }
    if (!importedVisual) {
      return null;
    }
    const partDefinitions = [
      { meshName: "body-mesh", hitPart: "body" },
      { meshName: "head-mesh", hitPart: "head" },
    ];
    importedVisual.updateMatrixWorld(true, true);
    const boxes = [];
    for (const { meshName, hitPart } of partDefinitions) {
      let targetMesh = null;
      importedVisual.traverse((child) => {
        if (targetMesh || !child?.isMesh || child.name !== meshName) {
          return;
        }
        targetMesh = child;
      });
      if (!targetMesh) {
        continue;
      }
      const bounds = new THREE.Box3().setFromObject(targetMesh);
      const center = bounds.getCenter(new THREE.Vector3());
      const size = bounds.getSize(new THREE.Vector3());
      boxes.push({
        hitPart,
        center: {
          x: center.x,
          y: center.y,
          z: center.z,
        },
        halfExtents: {
          x: Math.max(0.01, size.x * 0.5),
          y: Math.max(0.01, size.y * 0.5),
          z: Math.max(0.01, size.z * 0.5),
        },
      });
    }
    return boxes.length > 0 ? boxes : null;
  }

  function updateEnemyBatchColor(enemy) {
    void enemy;
  }

  function updateEnemyLiveRenderMatrices(enemy) {
    const liveRenderState = enemy?.liveRenderState;
    const variantState = liveRenderState?.variantKey
      ? liveEnemyRenderBatches.variantByKey.get(liveRenderState.variantKey)
      : null;
    if (!enemy?.visualRoot || !variantState || liveRenderState.active !== true) {
      return;
    }
    enemy.visualRoot.updateWorldMatrix(true, false);
    tempRenderScale.copy(enemy.visualRoot.scale);
    tempRenderParentMatrix.compose(
      enemy.visualRoot.getWorldPosition(tempRenderPosition),
      enemy.visualRoot.getWorldQuaternion(tempQuatA),
      tempRenderScale
    );
    if (
      liveEnemyRenderBatches.body
      && Number.isInteger(liveRenderState.bodyInstanceId)
      && Number.isInteger(variantState.bodyGeometryId)
      && variantState.bodyPart?.matrix
    ) {
      tempRenderMatrix.multiplyMatrices(tempRenderParentMatrix, variantState.bodyPart.matrix);
      liveEnemyRenderBatches.body.setMatrixAt(liveRenderState.bodyInstanceId, tempRenderMatrix);
    }
    if (
      liveEnemyRenderBatches.head
      && Number.isInteger(liveRenderState.headInstanceId)
      && Number.isInteger(variantState.headGeometryId)
      && variantState.headPart?.matrix
    ) {
      tempRenderMatrix.multiplyMatrices(tempRenderParentMatrix, variantState.headPart.matrix);
      liveEnemyRenderBatches.head.setMatrixAt(liveRenderState.headInstanceId, tempRenderMatrix);
    }
    updateEnemyBatchColor(enemy);
  }

  function detachEnemyFromLiveBatches(enemy) {
    const liveRenderState = enemy?.liveRenderState;
    if (!liveRenderState || liveRenderState.active !== true) {
      return;
    }
    if (liveEnemyRenderBatches.body && Number.isInteger(liveRenderState.bodyInstanceId)) {
      liveEnemyRenderBatches.body.deleteInstance(liveRenderState.bodyInstanceId);
      liveRenderState.bodyInstanceId = null;
    }
    if (liveEnemyRenderBatches.head && Number.isInteger(liveRenderState.headInstanceId)) {
      liveEnemyRenderBatches.head.deleteInstance(liveRenderState.headInstanceId);
      liveRenderState.headInstanceId = null;
    }
    liveRenderState.active = false;
  }

  function attachEnemyToLiveBatches(enemy, enemyType, preparedVisual) {
    if (!enemy || !preparedVisual?.variantKey) {
      return false;
    }
    const variantState = liveEnemyRenderBatches.variantByKey.get(preparedVisual.variantKey);
    if (!variantState) {
      return false;
    }
    const liveRenderState = {
      variantKey: preparedVisual.variantKey,
      bodyInstanceId: null,
      headInstanceId: null,
      active: true,
    };
    if (liveEnemyRenderBatches.body && Number.isInteger(variantState.bodyGeometryId)) {
      liveRenderState.bodyInstanceId = liveEnemyRenderBatches.body.addInstance(variantState.bodyGeometryId);
    }
    if (liveEnemyRenderBatches.head && Number.isInteger(variantState.headGeometryId)) {
      liveRenderState.headInstanceId = liveEnemyRenderBatches.head.addInstance(variantState.headGeometryId);
    }
    enemy.liveRenderState = liveRenderState;
    updateEnemyLiveRenderMatrices(enemy);
    return true;
  }

  function buildEnemyRenderStats() {
    let activeLiveEnemyCount = 0;
    let damagedHealthBarCount = 0;
    for (const enemy of activeEnemies) {
      if (enemy?.liveRenderState?.active === true) {
        activeLiveEnemyCount += 1;
      }
      if (enemy?.healthBarRoot?.visible === true) {
        damagedHealthBarCount += 1;
      }
    }
    return {
      activeEnemyCount: activeEnemies.length,
      activeLiveEnemyCount,
      damagedHealthBarCount,
      batchCount:
        (liveEnemyRenderBatches.body ? 1 : 0)
        + (liveEnemyRenderBatches.head ? 1 : 0),
    };
  }

  initializeEnemyRenderBatches();

  function createEnemyMesh(type, spawnIndex = 0, spawnOptions = {}) {
    const normalizedType = normalizeEnemyType(type);
    const enemyType = normalizedType ? ENEMY_TYPES[normalizedType] : null;
    if (!enemyType) {
      throw new Error("No enemy types are configured.");
    }

    const route = pickSpawnRoutePool(spawnIndex);
    if (!route || !Array.isArray(route.cells) || route.cells.length === 0) {
      return null;
    }

    const travelWaypoints = routeCellsToEnemyPoints(route.cells);
    if (travelWaypoints.length === 0) {
      return null;
    }

    const enemyMesh = new THREE.Group();
    const visualRoot = new THREE.Group();
    enemyMesh.add(visualRoot);

    const enemyScale = enemyType.size / ENEMY_MODEL_BASE_BODY_WIDTH;
    let bodyMaterial = null;
    let headMaterial = null;
    let eyeMaterial = null;
    let bodyMesh = null;
    let modelTopY = Number.NEGATIVE_INFINITY;
    let visualMaterials = [];
    let visualBottomOffsetY = null;
    let visualHoverHeight = ENEMY_SURFACE_HOVER_HEIGHT;
    let collisionBoxesData = null;
    const preparedEnemyVisual = getPreparedEnemyBatchParts(enemyType, normalizedType);

    if (preparedEnemyVisual && liveEnemyRenderBatches.variantByKey.has(preparedEnemyVisual.variantKey)) {
      const importedBounds = preparedEnemyVisual.bounds;
      modelTopY = importedBounds.max.y;
      visualBottomOffsetY = importedBounds.min.y;
      visualHoverHeight = 0;
      collisionBoxesData = buildPreparedEnemyCollisionBoxes(preparedEnemyVisual);
      for (const collisionBox of collisionBoxesData ?? []) {
        const proxyMesh = createEnemyRaycastProxyMesh(collisionBox);
        visualRoot.add(proxyMesh);
        if (collisionBox.hitPart === "body" && !bodyMesh) {
          bodyMesh = proxyMesh;
        }
      }
    } else {
      const importedVisual = createEnemyVisual(enemyType, normalizedType);
      if (importedVisual) {
        importedVisual.position.y = 0;
        visualRoot.add(importedVisual);
        visualMaterials = Array.isArray(importedVisual.userData?.materials)
          ? importedVisual.userData.materials.slice()
          : [];
        bodyMaterial = visualMaterials[0] ?? null;
        const importedBounds = new THREE.Box3().setFromObject(importedVisual);
        modelTopY = importedBounds.max.y;
        visualBottomOffsetY = importedBounds.min.y;
        visualHoverHeight = 0;
        collisionBoxesData = buildImportedEnemyCollisionBoxes(importedVisual);
        for (const collisionBox of collisionBoxesData ?? []) {
          const proxyMesh = createEnemyRaycastProxyMesh(collisionBox);
          visualRoot.add(proxyMesh);
          if (collisionBox.hitPart === "body" && !bodyMesh) {
            bodyMesh = proxyMesh;
          }
        }
      } else {
      bodyMaterial = new THREE.MeshStandardMaterial({
        color: enemyType.color,
        emissive: enemyType.emissive,
        emissiveIntensity: ENEMY_CONFIG.bodyEmissiveIntensity,
        roughness: ENEMY_CONFIG.bodyRoughness,
        metalness: ENEMY_CONFIG.bodyMetalness,
      });
      headMaterial = new THREE.MeshStandardMaterial({
        color: ENEMY_HEAD_COLOR,
        emissive: ENEMY_HEAD_EMISSIVE,
        emissiveIntensity: ENEMY_CONFIG.bodyEmissiveIntensity,
        roughness: ENEMY_CONFIG.bodyRoughness,
        metalness: ENEMY_CONFIG.bodyMetalness,
      });
      eyeMaterial = new THREE.MeshStandardMaterial({
        color: ENEMY_EYE_COLOR,
        emissive: ENEMY_EYE_COLOR,
        emissiveIntensity: 0.5,
        roughness: 0.25,
        metalness: 0.05,
      });
      const browMaterial = new THREE.MeshStandardMaterial({
        color: ENEMY_BROW_COLOR,
        emissive: ENEMY_BROW_COLOR,
        emissiveIntensity: 0.55,
        roughness: 0.25,
        metalness: 0.02,
      });
      for (const part of ENEMY_MODEL_PARTS) {
        const width = Math.max(0.01, part.dimensions.width * enemyScale);
        const height = Math.max(0.01, part.dimensions.height * enemyScale);
        const depth = Math.max(0.01, part.dimensions.depth * enemyScale);
        const partMesh = new THREE.Mesh(
          new THREE.BoxGeometry(width, height, depth),
          part.hitPart === "head" ? headMaterial : bodyMaterial
        );
        partMesh.castShadow = true;
        partMesh.receiveShadow = true;
        partMesh.position.set(
          part.position.x * enemyScale,
          (part.position.y * enemyScale) + ENEMY_CONFIG.bodyYOffset,
          part.position.z * enemyScale
        );
        const partTopY = partMesh.position.y + (height * 0.5);
        if (partTopY > modelTopY) {
          modelTopY = partTopY;
        }
        partMesh.userData.enemyHitPart = part.hitPart;
        partMesh.userData.enemyPartName = part.name;
        if (part.name === "head") {
          const eyeSize = Math.max(0.02, ENEMY_EYE_SIZE * enemyScale);
          const eyeOffsetX = ENEMY_EYE_OFFSET_X * enemyScale;
          const eyeOffsetY = ENEMY_EYE_OFFSET_Y * enemyScale;
          const eyeInset = ENEMY_EYE_INSET * enemyScale;
          const eyeDepth = Math.max(0.01, eyeSize * 0.45);
          const eyeZ = (depth * 0.5) - (eyeDepth * 0.5) - eyeInset + Math.max(0.01, enemyScale * 0.035);
          for (const eyeSide of [-1, 1]) {
            const eyeMesh = new THREE.Mesh(
              new THREE.BoxGeometry(eyeSize, eyeSize * 0.9, eyeDepth),
              eyeMaterial
            );
            eyeMesh.position.set(eyeOffsetX * eyeSide, eyeOffsetY, eyeZ);
            eyeMesh.rotation.z = eyeSide < 0 ? ENEMY_EYE_SLANT_RADIANS : -ENEMY_EYE_SLANT_RADIANS;
            const eyeTopY = partMesh.position.y + eyeMesh.position.y + (eyeSize * 0.45);
            if (eyeTopY > modelTopY) {
              modelTopY = eyeTopY;
            }
            eyeMesh.userData.enemyHitPart = "head";
            eyeMesh.userData.enemyPartName = `head_eye_${eyeSide < 0 ? "left" : "right"}`;
            eyeMesh.castShadow = true;
            eyeMesh.receiveShadow = true;
            partMesh.add(eyeMesh);

            const browWidth = Math.max(0.03, ENEMY_BROW_WIDTH * enemyScale);
            const browHeight = Math.max(0.02, ENEMY_BROW_HEIGHT * enemyScale);
            const browDepth = Math.max(0.02, ENEMY_BROW_DEPTH * enemyScale);
            const browMesh = new THREE.Mesh(
              new THREE.BoxGeometry(browWidth, browHeight, browDepth),
              browMaterial
            );
            browMesh.position.set(
              ENEMY_BROW_OFFSET_X * enemyScale * eyeSide,
              ENEMY_BROW_OFFSET_Y * enemyScale,
              eyeZ + Math.max(0.012, enemyScale * 0.04)
            );
            browMesh.rotation.z = eyeSide < 0 ? -ENEMY_BROW_SLANT_RADIANS : ENEMY_BROW_SLANT_RADIANS;
            const browTopY = partMesh.position.y + browMesh.position.y + (browHeight * 0.5);
            if (browTopY > modelTopY) {
              modelTopY = browTopY;
            }
            browMesh.userData.enemyHitPart = "head";
            browMesh.userData.enemyPartName = `head_brow_${eyeSide < 0 ? "left" : "right"}`;
            browMesh.castShadow = true;
            browMesh.receiveShadow = true;
            partMesh.add(browMesh);
          }
        }
        visualRoot.add(partMesh);
        if (part.name === "body") {
          bodyMesh = partMesh;
        }
      }
      visualMaterials = bodyMaterial ? [bodyMaterial] : [];
      collisionBoxesData = ENEMY_COLLISION_BOXES.map((box) => ({
        hitPart: box.hitPart,
        center: {
          x: box.center.x * enemyScale,
          y: (box.center.y * enemyScale) + ENEMY_CONFIG.bodyYOffset,
          z: box.center.z * enemyScale,
        },
        halfExtents: {
          x: box.halfExtents.x * enemyScale,
          y: box.halfExtents.y * enemyScale,
          z: box.halfExtents.z * enemyScale,
        },
      }));
      }
    }

    if (!bodyMesh) {
      return null;
    }

    const healthBarBgWidth = Math.max(
      ENEMY_CONFIG.healthBarBgMinWidth,
      enemyType.size * ENEMY_CONFIG.healthBarWidthFromEnemySize
    );
    const healthBarFgWidth = Math.max(
      ENEMY_CONFIG.healthBarFgMinWidth,
      healthBarBgWidth - ENEMY_CONFIG.healthBarFgInset
    );

    const healthBarRoot = new THREE.Group();
    const healthBarBg = new THREE.Mesh(
      new THREE.PlaneGeometry(healthBarBgWidth, ENEMY_CONFIG.healthBarBgHeight),
      new THREE.MeshBasicMaterial({
        color: ENEMY_CONFIG.healthBarBgColor,
        transparent: true,
        opacity: ENEMY_CONFIG.healthBarBgOpacity,
        depthTest: false,
      })
    );
    const healthBarFg = new THREE.Mesh(
      new THREE.PlaneGeometry(healthBarFgWidth, ENEMY_CONFIG.healthBarFgHeight),
      new THREE.MeshBasicMaterial({
        color: ENEMY_CONFIG.healthBarFgColor,
        transparent: true,
        depthTest: false,
      })
    );

    healthBarBg.renderOrder = ENEMY_CONFIG.healthBarBgRenderOrder;
    healthBarFg.renderOrder = ENEMY_CONFIG.healthBarFgRenderOrder;
    healthBarFg.position.z = ENEMY_CONFIG.healthBarFgOffsetZ;
    healthBarRoot.add(healthBarBg);
    healthBarRoot.add(healthBarFg);
    healthBarRoot.visible = false;
    const healthBarBaseOffsetY = (
      (Number.isFinite(modelTopY) ? modelTopY : bodyMesh.position.y)
      + enemyType.size * ENEMY_CONFIG.healthBarYOffsetFromEnemySize
      + ENEMY_CONFIG.healthBarYOffset
      - (enemyType.size * 0.27)
    );
    healthBarRoot.position.set(0, healthBarBaseOffsetY, 0);
    enemyMesh.add(healthBarRoot);

    scene.add(enemyMesh);

    const initialForward = travelWaypoints.length >= 2
      ? getDirectionOnPlane(travelWaypoints[0], travelWaypoints[1])
      : new THREE.Vector3(0, 0, 1);

    const enemy = {
      mesh: enemyMesh,
      bodyMesh,
      bodyMaterial,
      headMaterial,
      eyeMaterial,
      visualMaterials,
      visualMaterialStates: collectEnemyVisualMaterialStates(visualMaterials),
      baseBodyColor: bodyMaterial?.color?.clone?.() ?? new THREE.Color(0xffffff),
      baseEmissiveIntensity: Number.isFinite(Number(bodyMaterial?.emissiveIntensity))
        ? Number(bodyMaterial.emissiveIntensity)
        : 0,
      hitPulseTimer: 0,
      hitPulseClock: 0,
      healthBarRoot,
      healthBarFg,
      healthBarBgWidth,
      healthBarFgWidth,
      healthBarBaseOffsetY,
      health: enemyType.health,
      maxHealth: enemyType.health,
      speed: BASE_SPEED * enemyType.speedMultiplier,
      radius: enemyType.radius,
      segmentIndex: 0,
      segmentProgress: 0,
      visualRoot,
      alive: true,
      dying: false,
      deathTimer: 0,
      deathDuration: DISSOLVE_DEATH_DURATION,
      dissolveUniforms: [],
      dissolveMaterials: [],
      replacedVisualMaterials: [],
      type: normalizedType,
      tempSlowMultiplier: 1,
      tempSlowRemaining: 0,
      pathCenter: travelWaypoints[0].clone(),
      pathForward: initialForward,
      pathSlopePitch: 0,
      pathOffsetLateral: getRandomLateralOffset(),
      routeCells: route.cells.map((cell) => cloneCell(cell)),
      travelWaypoints,
      spawnIndex,
      deathExplosionProcessed: false,
      networkId: 0,
      networkLastSeenAtMs: 0,
      networkTargetPosition: travelWaypoints[0].clone(),
      visualRootBaseOffsetY: 0,
      walkCyclePhase: pseudoRandom01(spawnIndex + enemySpawnSerial + 17.31) * Math.PI * 2,
      walkCycleMotion: 0,
      walkCycleLastX: travelWaypoints[0].x,
      walkCycleLastZ: travelWaypoints[0].z,
      liveRenderState: null,
    };

    const baseHealth = Math.max(0.01, Number(enemyType.health) || 0.01);
    const configuredMaxHealth = Number(spawnOptions?.maxHealth);
    const resolvedMaxHealth = Number.isFinite(configuredMaxHealth) && configuredMaxHealth > 0
      ? configuredMaxHealth
      : (baseHealth * enemyHealthMultiplier);
    const configuredHealth = Number(spawnOptions?.health);
    const resolvedHealth = Number.isFinite(configuredHealth)
      ? THREE.MathUtils.clamp(configuredHealth, 0, resolvedMaxHealth)
      : resolvedMaxHealth;
    enemy.maxHealth = Math.max(0.01, resolvedMaxHealth);
    enemy.health = THREE.MathUtils.clamp(resolvedHealth, 0, enemy.maxHealth);

    const explicitNetworkId = parseEnemyNetworkId(spawnOptions?.networkId);
    if (explicitNetworkId != null) {
      enemy.networkId = explicitNetworkId;
      nextEnemyNetworkId = Math.max(nextEnemyNetworkId, explicitNetworkId + 1);
    } else {
      enemy.networkId = nextEnemyNetworkId;
      nextEnemyNetworkId += 1;
    }

    setEnemyWorldPosition(enemy, enemy.pathCenter, enemy.pathForward);
    applyEnemyOrientation(enemy);

    enemyMesh.userData.bodyCenterOffsetY = bodyMesh.position.y;
    enemyMesh.userData.visualRootOffsetY = visualRoot.position.y;
    enemyMesh.userData.bodyHalfSize = enemyType.size * 0.5;
    enemyMesh.userData.visualBottomOffsetY = Number.isFinite(Number(visualBottomOffsetY))
      ? Number(visualBottomOffsetY)
      : null;
    enemyMesh.userData.visualHoverHeight = visualHoverHeight;
    enemyMesh.userData.hitSphereRadius = enemyType.radius;
    enemyMesh.userData.collisionBoxes = Array.isArray(collisionBoxesData)
      ? collisionBoxesData.map((box) => ({
        hitPart: box.hitPart,
        center: { ...box.center },
        halfExtents: { ...box.halfExtents },
      }))
      : [];
    enemyMesh.userData.networkId = enemy.networkId;

    if (spawnOptions?.position && typeof spawnOptions.position === "object") {
      const px = Number(spawnOptions.position.x);
      const py = Number(spawnOptions.position.y);
      const pz = Number(spawnOptions.position.z);
      if (Number.isFinite(px) && Number.isFinite(py) && Number.isFinite(pz)) {
        tempCenterPosition.set(px, py, pz);
        setEnemyWorldPosition(enemy, tempCenterPosition, enemy.pathForward);
        applyEnemyOrientation(enemy);
      }
    }
    if (networkViewMode) {
      enemy.pathOffsetLateral = 0;
      enemy.networkTargetPosition.copy(enemy.pathCenter);
      enemy.networkLastSeenAtMs = getNowMs();
      setEnemyWorldPosition(enemy, enemy.pathCenter, enemy.pathForward);
      applyEnemyOrientation(enemy);
    }

    enemy.walkCycleLastX = enemy.pathCenter.x;
    enemy.walkCycleLastZ = enemy.pathCenter.z;
    updateEnemyWalkAnimation(enemy, 0);
    if (preparedEnemyVisual && visualMaterials.length === 0) {
      attachEnemyToLiveBatches(enemy, enemyType, preparedEnemyVisual);
    }
    updateHealthBar(enemy);

    return enemy;
  }

  function updateHealthBar(enemy) {
    const ratio = Math.max(0, Math.min(1, enemy.health / enemy.maxHealth));
    enemy.healthBarFg.scale.x = Math.max(ENEMY_CONFIG.healthBarMinScaleX, ratio);
    enemy.healthBarFg.position.x = -(1 - ratio) * (enemy.healthBarFgWidth / 2);
    enemy.healthBarFg.material.color.setHSL(
      ENEMY_CONFIG.healthBarHueAtFullHealth * ratio,
      ENEMY_CONFIG.healthBarSaturation,
      ENEMY_CONFIG.healthBarLightness
    );
    enemy.healthBarRoot.visible = ratio < (1 - 1e-4);
  }

  function addEnemyToActiveList(enemy, { emitSpawn = true } = {}) {
    if (!enemy) {
      return false;
    }
    activeEnemies.push(enemy);
    if (Number.isInteger(enemy.networkId) && enemy.networkId > 0) {
      enemyByNetworkId.set(enemy.networkId, enemy);
    }
    if (emitSpawn && onEnemySpawn) {
      onEnemySpawn({
        enemyId: enemy.networkId,
        type: enemy.type,
        spawnIndex: enemy.spawnIndex,
        health: enemy.health,
        maxHealth: enemy.maxHealth,
        position: {
          x: enemy.mesh.position.x,
          y: enemy.mesh.position.y,
          z: enemy.mesh.position.z,
        },
      });
    }
    return true;
  }

  function removeEnemyAtIndex(index) {
    if (index < 0 || index >= activeEnemies.length) {
      return;
    }
    const enemy = activeEnemies[index];
    disposeEnemyVisual(enemy);
    if (enemy && Number.isInteger(enemy.networkId)) {
      enemyByNetworkId.delete(enemy.networkId);
    }
    activeEnemies.splice(index, 1);
  }

  function createDissolveMaterial(sourceMaterial) {
    const baseColor = sourceMaterial && sourceMaterial.color
      ? sourceMaterial.color.clone()
      : new THREE.Color(0xffffff);
    const emissiveColor = sourceMaterial && sourceMaterial.emissive
      ? sourceMaterial.emissive.clone()
      : new THREE.Color(0x000000);
    const opacity = sourceMaterial && sourceMaterial.opacity !== undefined
      ? sourceMaterial.opacity
      : 1;

    const uniforms = {
      uDissolve: { value: 0 },
      uNoiseScale: { value: DISSOLVE_NOISE_SCALE },
      uEdgeWidth: { value: DISSOLVE_EDGE_WIDTH },
      uBaseColor: { value: baseColor },
      uEmissiveColor: { value: emissiveColor },
      uEdgeColor: { value: new THREE.Color(ENEMY_CONFIG.dissolveEdgeColor) },
      uOpacity: { value: opacity },
    };

    const material = new THREE.ShaderMaterial({
      uniforms,
      transparent: true,
      depthWrite: false,
      depthTest: sourceMaterial ? sourceMaterial.depthTest : true,
      side: sourceMaterial ? sourceMaterial.side : THREE.FrontSide,
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPos = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform float uDissolve;
        uniform float uNoiseScale;
        uniform float uEdgeWidth;
        uniform vec3 uBaseColor;
        uniform vec3 uEmissiveColor;
        uniform vec3 uEdgeColor;
        uniform float uOpacity;
        varying vec3 vWorldPos;

        float hash31(vec3 p) {
          p = fract(p * 0.1031);
          p += dot(p, p.yzx + 33.33);
          return fract((p.x + p.y) * p.z);
        }

        void main() {
          float noise = hash31(floor(vWorldPos * uNoiseScale));
          if (noise < uDissolve) {
            discard;
          }

          float edgeMask = smoothstep(uDissolve, uDissolve + uEdgeWidth, noise);
          vec3 base = uBaseColor + (uEmissiveColor * ${ENEMY_CONFIG.dissolveEmissiveMix.toFixed(3)});
          vec3 finalColor = mix(uEdgeColor, base, edgeMask);
          float alpha = max(0.0, (1.0 - uDissolve) * uOpacity) * edgeMask;
          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
    });
    material.toneMapped = false;
    return { material, dissolveUniform: uniforms.uDissolve };
  }

  function resetHitPulse(enemy) {
    if (!enemy.visualRoot) {
      return;
    }
    for (const state of Array.isArray(enemy.visualMaterialStates) ? enemy.visualMaterialStates : []) {
      if (!state?.material) {
        continue;
      }
      if ("emissiveIntensity" in state.material) {
        state.material.emissiveIntensity = state.emissiveIntensity;
      }
      if (state.material.color && state.color) {
        state.material.color.copy(state.color);
      }
    }
    enemy.visualRoot.scale.set(1, 1, 1);
    enemy.hitPulseTimer = 0;
    enemy.hitPulseClock = 0;
    updateEnemyLiveRenderMatrices(enemy);
  }

  function triggerHitPulse(enemy) {
    if (!enemy?.visualRoot) {
      return;
    }
    enemy.hitPulseTimer = Math.min(
      HIT_PULSE_DURATION,
      enemy.hitPulseTimer + (HIT_PULSE_DURATION * HIT_PULSE_STACK_ADD)
    );
  }

  function updateHitPulse(enemy, deltaSeconds) {
    if (!enemy.visualRoot || enemy.hitPulseTimer <= 0) {
      return;
    }

    enemy.hitPulseTimer = Math.max(0, enemy.hitPulseTimer - deltaSeconds);
    enemy.hitPulseClock += deltaSeconds;

    const t = Math.max(0, enemy.hitPulseTimer / HIT_PULSE_DURATION);
    const envelope = Math.pow(t, HIT_PULSE_EXPONENT);
    const oscillation = 0.65 + (0.35 * Math.sin(enemy.hitPulseClock * HIT_PULSE_FREQUENCY));
    const pulse = envelope * oscillation;

    for (const state of Array.isArray(enemy.visualMaterialStates) ? enemy.visualMaterialStates : []) {
      if (!state?.material) {
        continue;
      }
      if ("emissiveIntensity" in state.material) {
        state.material.emissiveIntensity = state.emissiveIntensity + (pulse * HIT_PULSE_EMISSIVE_BOOST);
      }
      if (state.material.color && state.color) {
        state.material.color.copy(state.color);
      }
    }

    const scaleXZ = 1 + (pulse * HIT_PULSE_SCALE_BOOST);
    const scaleY = 1 + (pulse * HIT_PULSE_SCALE_BOOST * 0.55);
    enemy.visualRoot.scale.set(scaleXZ, scaleY, scaleXZ);
    updateEnemyLiveRenderMatrices(enemy);

    if (enemy.hitPulseTimer <= 0) {
      resetHitPulse(enemy);
    }
  }

  function startEnemyDissolve(enemy) {
    if (enemy.dying) return;

    enemy.alive = false;
    enemy.dying = true;
    enemy.deathTimer = 0;
    enemy.dissolveUniforms.length = 0;
    enemy.dissolveMaterials.length = 0;
    if (enemy.healthBarRoot) {
      enemy.healthBarRoot.visible = false;
    }
    resetHitPulse(enemy);
    enemy.replacedVisualMaterials.length = 0;

    if (!enemy.visualRoot) return;

    if (enemy.liveRenderState?.active === true) {
      detachEnemyFromLiveBatches(enemy);
      const dissolveVisual = createEnemyVisual(ENEMY_TYPES[enemy.type] ?? null, enemy.type);
      if (dissolveVisual) {
        dissolveVisual.position.y = 0;
        enemy.visualRoot.add(dissolveVisual);
      }
    }

    const replacedSourceMaterials = new Set();
    enemy.visualRoot.traverse((child) => {
      if (!child.isMesh || !child.material || child.userData?.enemyRaycastProxy === true) {
        return;
      }
      const hadArrayMaterial = Array.isArray(child.material);
      const sourceMaterials = hadArrayMaterial ? child.material : [child.material];
      const dissolveMaterials = sourceMaterials.map((sourceMaterial) => {
        if (sourceMaterial && shouldDisposeEnemyResource(sourceMaterial)) {
          replacedSourceMaterials.add(sourceMaterial);
        }
        const { material, dissolveUniform } = createDissolveMaterial(sourceMaterial);
        enemy.dissolveMaterials.push(material);
        enemy.dissolveUniforms.push(dissolveUniform);
        return material;
      });
      child.material = hadArrayMaterial ? dissolveMaterials : dissolveMaterials[0];
    });
    enemy.replacedVisualMaterials.push(...replacedSourceMaterials);
  }

  function emitEnemyDamageEvent(enemy, damageAmount) {
    if (!onEnemyDamaged || !enemy) {
      return;
    }
    onEnemyDamaged({
      enemyId: enemy.networkId,
      health: enemy.health,
      maxHealth: enemy.maxHealth,
      damage: damageAmount,
      dead: enemy.health <= 0,
      position: {
        x: enemy.mesh.position.x,
        y: enemy.mesh.position.y,
        z: enemy.mesh.position.z,
      },
    });
  }

  function handleEnemyDefeat(enemy) {
    if (!enemy || !enemy.alive || enemy.dying) {
      return;
    }
    const didExplode = triggerEnemyDeathExplosion(enemy);
    if (onEnemyDefeated) {
      const configuredReward = Number(ENEMY_TYPES[enemy.type]?.cashReward);
      const cashReward = Number.isFinite(configuredReward)
        ? Math.max(0, Math.floor(configuredReward))
        : Math.max(1, Math.floor(enemy.maxHealth || 1));
      if (cashReward > 0) {
        const dropPosition = getEnemyCollisionCenter(enemy, tempDefeatDropPosition).clone();
        onEnemyDefeated(cashReward, enemy.type, dropPosition, enemy.networkId, {
          didExplode,
        });
      }
    }
    startEnemyDissolve(enemy);
  }

  function applyDamage(enemy, amount, options = {}) {
    if (!enemy || !enemy.alive || enemy.dying) {
      return false;
    }

    const safeAmount = Number(amount);
    if (!Number.isFinite(safeAmount) || safeAmount <= 0) {
      return false;
    }

    const force = options?.force === true;
    if (!damageEnabled && !force) {
      if (onDamageRequested && Number.isInteger(enemy.networkId)) {
        onDamageRequested({
          enemyId: enemy.networkId,
          damage: safeAmount,
        });
      }
      return false;
    }

    const previousHealth = enemy.health;
    enemy.health = Math.max(0, enemy.health - safeAmount);
    if (enemy.health >= previousHealth) {
      return false;
    }

    triggerHitPulse(enemy);
    updateHealthBar(enemy);
    if (options?.suppressDamageEvent !== true) {
      emitEnemyDamageEvent(enemy, previousHealth - enemy.health);
    }
    if (enemy.health <= 0) {
      handleEnemyDefeat(enemy);
    }
    return true;
  }

  function findActiveEnemyByMesh(enemyMesh) {
    if (!enemyMesh) {
      return null;
    }

    for (const enemy of activeEnemies) {
      if (enemy.mesh === enemyMesh) {
        return enemy;
      }
    }
    return null;
  }

  function findActiveEnemyById(enemyId) {
    const normalizedId = parseEnemyNetworkId(enemyId);
    if (normalizedId == null) {
      return null;
    }
    return enemyByNetworkId.get(normalizedId) ?? null;
  }

  function isEnemyMeshSlowed(enemyMesh) {
    const enemy = findActiveEnemyByMesh(enemyMesh);
    if (!enemy || !enemy.alive || enemy.dying) {
      return false;
    }
    return (enemy.tempSlowRemaining ?? 0) > 0;
  }

  function applyTemporarySlowToEnemyMesh(enemyMesh, multiplier, duration) {
    const enemy = findActiveEnemyByMesh(enemyMesh);
    if (!enemy || !enemy.alive || enemy.dying) {
      return false;
    }

    const safeMultiplier = THREE.MathUtils.clamp(Number(multiplier), 0, 1);
    const safeDuration = Math.max(0, Number(duration) || 0);
    if (!Number.isFinite(safeMultiplier) || safeDuration <= 0) {
      return false;
    }

    enemy.tempSlowMultiplier = Math.min(enemy.tempSlowMultiplier ?? 1, safeMultiplier);
    enemy.tempSlowRemaining = Math.max(enemy.tempSlowRemaining ?? 0, safeDuration);
    return true;
  }

  function sphereIntersectsAabb(center, radius, minPoint, maxPoint) {
    const clampedX = THREE.MathUtils.clamp(center.x, minPoint.x, maxPoint.x);
    const clampedY = THREE.MathUtils.clamp(center.y, minPoint.y, maxPoint.y);
    const clampedZ = THREE.MathUtils.clamp(center.z, minPoint.z, maxPoint.z);
    const dx = center.x - clampedX;
    const dy = center.y - clampedY;
    const dz = center.z - clampedZ;
    return (dx * dx) + (dy * dy) + (dz * dz) <= (radius * radius);
  }

  function applyTemporarySlowInAabb(center, halfExtentVec3, multiplier, duration) {
    if (!center || !halfExtentVec3) {
      return 0;
    }

    const halfX = Math.max(0, Number(halfExtentVec3.x) || 0);
    const halfY = Math.max(0, Number(halfExtentVec3.y) || 0);
    const halfZ = Math.max(0, Number(halfExtentVec3.z) || 0);
    if (halfX <= 0 || halfY <= 0 || halfZ <= 0) {
      return 0;
    }

    const minPoint = new THREE.Vector3(center.x - halfX, center.y - halfY, center.z - halfZ);
    const maxPoint = new THREE.Vector3(center.x + halfX, center.y + halfY, center.z + halfZ);
    let appliedCount = 0;

    for (const enemy of activeEnemies) {
      if (!enemy.alive || enemy.dying) {
        continue;
      }
      if (
        !sphereIntersectsAabb(
          getEnemyCollisionCenter(enemy, tempCollisionCenterA),
          enemy.radius,
          minPoint,
          maxPoint
        )
      ) {
        continue;
      }
      if (applyTemporarySlowToEnemyMesh(enemy.mesh, multiplier, duration)) {
        appliedCount += 1;
      }
    }

    return appliedCount;
  }

  function updateEnemyTravel(enemy, deltaSeconds) {
    let activeSlowMultiplier = 1;
    const slowRemaining = Math.max(0, enemy.tempSlowRemaining ?? 0);
    if (slowRemaining > 0) {
      enemy.tempSlowRemaining = Math.max(0, slowRemaining - deltaSeconds);
      activeSlowMultiplier = THREE.MathUtils.clamp(enemy.tempSlowMultiplier ?? 1, 0, 1);
      if (enemy.tempSlowRemaining <= 0) {
        enemy.tempSlowMultiplier = 1;
        activeSlowMultiplier = 1;
      }
    } else {
      enemy.tempSlowMultiplier = 1;
      enemy.tempSlowRemaining = 0;
    }

    let remaining = enemy.speed * enemySpeedMultiplier * activeSlowMultiplier * deltaSeconds;
    while (remaining > 0 && enemy.alive) {
      const start = enemy.travelWaypoints[enemy.segmentIndex];
      const end = enemy.travelWaypoints[enemy.segmentIndex + 1];
      if (!start || !end) {
        break;
      }

      const segmentLength = start.distanceTo(end);
      if (segmentLength <= ENEMY_CONFIG.directionEpsilon) {
        enemy.segmentIndex += 1;
        enemy.segmentProgress = 0;
        if (enemy.segmentIndex >= enemy.travelWaypoints.length - 1) {
          break;
        }
        continue;
      }

      const segmentRemaining = segmentLength - enemy.segmentProgress;
      if (remaining < segmentRemaining) {
        enemy.segmentProgress += remaining;
        remaining = 0;
      } else {
        remaining -= segmentRemaining;
        enemy.segmentIndex += 1;
        enemy.segmentProgress = 0;
        if (enemy.segmentIndex >= enemy.travelWaypoints.length - 1) {
          break;
        }
      }
    }

    updateEnemyTransformFromRoute(enemy);
  }

  function updateDeathExplosionEffects(deltaSeconds) {
    for (let i = deathExplosionEffects.length - 1; i >= 0; i -= 1) {
      const effect = deathExplosionEffects[i];
      effect.life -= deltaSeconds;
      if (effect.life <= 0) {
        if (effect.mesh?.parent) {
          effect.mesh.parent.remove(effect.mesh);
        }
        effect.mesh?.material?.dispose?.();
        deathExplosionEffects.splice(i, 1);
        continue;
      }

      const t = Math.max(0, effect.life / Math.max(0.01, effect.maxLife));
      const growthT = 1 - t;
      const scale = Math.max(0.01, effect.radius * (0.2 + (growthT * 0.8)));
      effect.mesh.scale.setScalar(scale);
      if (effect.mesh?.material) {
        effect.mesh.material.opacity = 0.72 * t;
      }
    }
  }

  function update(deltaSeconds, camera) {
    runVariantBuildStep();

    if (!networkViewMode && spawnEventCursor < scheduledSpawns.length) {
      waveElapsedTime += deltaSeconds;
      while (
        spawnEventCursor < scheduledSpawns.length
        && scheduledSpawns[spawnEventCursor].time <= waveElapsedTime
      ) {
        const spawnEvent = scheduledSpawns[spawnEventCursor];
        const spawnIndex = spawnCellCursor % spawnCells.length;
        spawnCellCursor += 1;

        const enemy = createEnemyMesh(spawnEvent.type, spawnIndex);
        if (enemy) {
          addEnemyToActiveList(enemy, { emitSpawn: true });
        }
        spawnEventCursor += 1;
      }
    }

    for (let i = activeEnemies.length - 1; i >= 0; i -= 1) {
      const enemy = activeEnemies[i];

      if (!enemy.alive && !enemy.dying) {
        removeEnemyAtIndex(i);
        continue;
      }

      if (enemy.dying) {
        enemy.deathTimer += deltaSeconds;
        const dissolveValue = Math.min(1, enemy.deathTimer / enemy.deathDuration);
        for (const dissolveUniform of enemy.dissolveUniforms) {
          dissolveUniform.value = dissolveValue;
        }
        if (enemy.visualRoot) {
          enemy.visualRoot.position.y -= deltaSeconds * ENEMY_CONFIG.dissolveSinkSpeed;
          enemy.visualRoot.rotation.x += deltaSeconds * ENEMY_CONFIG.dissolveRollSpeed;
        }

        if (dissolveValue >= 1) {
          removeEnemyAtIndex(i);
        }
        continue;
      }

      if (networkViewMode) {
        updateEnemyNetworkView(enemy, deltaSeconds);
      } else {
        updateEnemyTravel(enemy, deltaSeconds);
      }

      updateEnemyWalkAnimation(enemy, deltaSeconds);

      if (!networkViewMode && hasEnemyReachedEndCenter(enemy)) {
        enemy.alive = false;
        removeEnemyAtIndex(i);
        continue;
      }

      updateHitPulse(enemy, deltaSeconds);

      if (enemy.alive && camera && enemy.healthBarRoot) {
        enemy.healthBarRoot.position.y = (enemy.visualRoot?.position?.y ?? 0) + (enemy.healthBarBaseOffsetY ?? 0);
        enemy.healthBarRoot.lookAt(camera.position);
      }
    }

    if (networkViewMode) {
      const nowMs = getNowMs();
      for (let i = activeEnemies.length - 1; i >= 0; i -= 1) {
        const enemy = activeEnemies[i];
        if (!enemy?.alive || enemy.dying) {
          continue;
        }
        if ((nowMs - (enemy.networkLastSeenAtMs || 0)) < NETWORK_ENEMY_STALE_REMOVE_MS) {
          continue;
        }
        removeEnemyAtIndex(i);
      }
    }

    updateDeathExplosionEffects(deltaSeconds);
  }

  function applyDamageAtPoint(point, hitRadius, damage) {
    const safeHitRadius = Math.max(0, Number(hitRadius) || 0);
    const safeDamage = Number(damage);
    if (!Number.isFinite(safeDamage) || safeDamage <= 0) {
      return false;
    }
    let hitAny = false;
    for (const enemy of activeEnemies) {
      if (!enemy.alive || enemy.dying) continue;
      if (isPointNearEnemyBody(enemy, point, safeHitRadius)) {
        applyDamage(enemy, safeDamage);
        hitAny = true;
      }
    }
    return hitAny;
  }

  function getDamageableEnemies() {
    return activeEnemies
      .filter((enemy) => enemy.alive && !enemy.dying)
      .map((enemy) => enemy.mesh);
  }

  function applyDamageToEnemyMesh(enemyMesh, damage) {
    if (!enemyMesh || typeof damage !== "number" || damage <= 0) {
      return false;
    }

    for (const enemy of activeEnemies) {
      if (enemy.mesh !== enemyMesh) {
        continue;
      }
      if (!enemy.alive || enemy.dying) {
        return false;
      }

      return applyDamage(enemy, damage);
    }

    return false;
  }

  function applyDamageToEnemyId(enemyId, damage, options = {}) {
    const enemy = findActiveEnemyById(enemyId);
    if (!enemy) {
      return false;
    }
    return applyDamage(enemy, damage, options);
  }

  function setEnemyHealthFromNetwork(enemyId, health, maxHealth = null) {
    const enemy = findActiveEnemyById(enemyId);
    if (!enemy || !enemy.alive || enemy.dying) {
      return false;
    }

    const nextMax = Number(maxHealth);
    if (Number.isFinite(nextMax) && nextMax > 0) {
      enemy.maxHealth = Math.max(0.01, nextMax);
    }

    const nextHealthValue = Number(health);
    if (!Number.isFinite(nextHealthValue)) {
      return false;
    }

    const previousHealth = enemy.health;
    enemy.health = THREE.MathUtils.clamp(nextHealthValue, 0, enemy.maxHealth);
    if (enemy.health < previousHealth) {
      triggerHitPulse(enemy);
    }
    updateHealthBar(enemy);

    if (enemy.health <= 0) {
      handleEnemyDefeat(enemy);
    }

    return true;
  }

  function setEnemyHealthMultiplier(multiplier = 1) {
    const safeMultiplier = Number(multiplier);
    if (!Number.isFinite(safeMultiplier) || safeMultiplier <= 0) {
      return enemyHealthMultiplier;
    }
    enemyHealthMultiplier = safeMultiplier;
    for (const enemy of activeEnemies) {
      if (!enemy?.alive || enemy.dying) {
        continue;
      }
      const baseHealth = Math.max(0.01, Number(ENEMY_TYPES[enemy.type]?.health) || enemy.maxHealth || 1);
      const healthRatio = enemy.maxHealth > 0
        ? THREE.MathUtils.clamp(enemy.health / enemy.maxHealth, 0, 1)
        : 1;
      enemy.maxHealth = Math.max(0.01, baseHealth * enemyHealthMultiplier);
      enemy.health = THREE.MathUtils.clamp(enemy.maxHealth * healthRatio, 0, enemy.maxHealth);
      updateHealthBar(enemy);
    }
    return enemyHealthMultiplier;
  }

  function setDamageEnabled(nextEnabled) {
    damageEnabled = !!nextEnabled;
    return damageEnabled;
  }

  function getDamageEnabled() {
    return damageEnabled;
  }

  function applyNetworkEnemyStateBatch(payload = {}) {
    const seq = Number(payload?.seq);
    if (!Number.isFinite(seq) || seq < lastAppliedNetworkStateSeq) {
      return false;
    }
    lastAppliedNetworkStateSeq = seq;
    const snapshots = Array.isArray(payload?.enemies) ? payload.enemies : [];
    for (const snapshot of snapshots) {
      spawnNetworkEnemy(snapshot, { immediate: false });
    }
    return true;
  }

  function spawnNetworkEnemy(snapshot = {}, options = {}) {
    const existingEnemyId = parseEnemyNetworkId(snapshot?.enemyId);
    if (existingEnemyId != null && enemyByNetworkId.has(existingEnemyId)) {
      const existingEnemy = enemyByNetworkId.get(existingEnemyId);
      updateEnemyFromNetworkSnapshot(existingEnemy, snapshot, options);
      return true;
    }

    const spawnIndex = Number.isInteger(snapshot?.spawnIndex)
      ? snapshot.spawnIndex
      : 0;
    const safeSpawnIndex = ((Math.floor(spawnIndex) % spawnCells.length) + spawnCells.length) % spawnCells.length;
    const enemy = createEnemyMesh(
      normalizeEnemyType(snapshot?.type),
      safeSpawnIndex,
      {
        networkId: snapshot?.enemyId,
        health: snapshot?.health,
        maxHealth: snapshot?.maxHealth,
        position: snapshot?.position,
      }
    );
    if (!enemy) {
      return false;
    }
    if (networkViewMode) {
      updateEnemyFromNetworkSnapshot(enemy, snapshot, options);
    }
    return addEnemyToActiveList(enemy, { emitSpawn: false });
  }

  function getActiveEnemySnapshots() {
    return activeEnemies
      .filter((enemy) => enemy?.alive && !enemy.dying)
      .map((enemy) => ({
        enemyId: enemy.networkId,
        type: enemy.type,
        spawnIndex: enemy.spawnIndex,
        health: enemy.health,
        maxHealth: enemy.maxHealth,
        position: {
          x: enemy.mesh.position.x,
          y: enemy.mesh.position.y,
          z: enemy.mesh.position.z,
        },
      }));
  }

  function isPointNearEnemyMesh(enemyMesh, point, radius = 0) {
    const enemy = findActiveEnemyByMesh(enemyMesh);
    if (!enemy || !enemy.alive || enemy.dying) {
      return false;
    }
    return isPointNearEnemyBody(enemy, point, radius);
  }

  function getTargetInRange(origin, range) {
    let closest = null;
    let closestDistSq = range * range;

    for (const enemy of activeEnemies) {
      if (!enemy.alive || enemy.dying) continue;
      const distSq = origin.distanceToSquared(getEnemyCollisionCenter(enemy, tempCollisionCenterA));
      if (distSq <= closestDistSq) {
        closestDistSq = distSq;
        closest = enemy;
      }
    }

    if (closest) {
      return {
        mesh: closest.mesh,
        position: closest.mesh.position,
        distance: Math.sqrt(closestDistSq),
        health: closest.health,
        maxHealth: closest.maxHealth,
      };
    }
    return null;
  }

  function getEnemies() {
    return activeEnemies.map((enemy) => enemy.mesh);
  }

  function getBlockedCells() {
    const cells = [];
    for (const key of blockedCellKeys) {
      const parsed = parseCellKey(key);
      if (Number.isInteger(parsed.x) && Number.isInteger(parsed.z)) {
        cells.push(parsed);
      }
    }
    return cells;
  }

  function getBlockedRevision() {
    return blockedRevision;
  }

  function getPathfindingPerfStats() {
    const canBlockAvg = pathPerfStats.canBlockCalls > 0
      ? (pathPerfStats.canBlockTotalMs / pathPerfStats.canBlockCalls)
      : 0;
    const setBlockedAvg = pathPerfStats.setBlockedCalls > 0
      ? (pathPerfStats.setBlockedTotalMs / pathPerfStats.setBlockedCalls)
      : 0;
    const rerouteAvg = pathPerfStats.rerouteCalls > 0
      ? (pathPerfStats.rerouteTotalMs / pathPerfStats.rerouteCalls)
      : 0;
    const variantAvg = pathPerfStats.variantBuildFrames > 0
      ? (pathPerfStats.variantBuildTotalMs / pathPerfStats.variantBuildFrames)
      : 0;
    const routePoolSizes = {};
    for (const [spawnIndex, routePool] of routePoolsBySpawnIndex.entries()) {
      routePoolSizes[spawnIndex] = Array.isArray(routePool) ? routePool.length : 0;
    }
    return {
      blockedRevision,
      pendingVariantTasks: variantBuildQueue.length,
      routePoolSizes,
      canBlockCalls: pathPerfStats.canBlockCalls,
      canBlockCacheHits: pathPerfStats.canBlockCacheHits,
      canBlockLastMs: pathPerfStats.canBlockLastMs,
      canBlockAvgMs: canBlockAvg,
      setBlockedCalls: pathPerfStats.setBlockedCalls,
      setBlockedLastMs: pathPerfStats.setBlockedLastMs,
      setBlockedAvgMs: setBlockedAvg,
      rerouteCalls: pathPerfStats.rerouteCalls,
      rerouteLastMs: pathPerfStats.rerouteLastMs,
      rerouteAvgMs: rerouteAvg,
      variantBuildFrames: pathPerfStats.variantBuildFrames,
      variantBuildLastMs: pathPerfStats.variantBuildLastMs,
      variantBuildAvgMs: variantAvg,
      variantRoutesAdded: pathPerfStats.variantRoutesAdded,
    };
  }

  function getRoutePreviewPaths() {
    const previewPaths = [];
    const sortedEntries = Array.from(routePoolsBySpawnIndex.entries())
      .sort((a, b) => a[0] - b[0]);

    for (const [spawnIndex, routePool] of sortedEntries) {
      if (!Array.isArray(routePool)) {
        continue;
      }
      for (let routeIndex = 0; routeIndex < routePool.length; routeIndex += 1) {
        const route = routePool[routeIndex];
        if (!route || !Array.isArray(route.cells) || route.cells.length === 0) {
          continue;
        }
        previewPaths.push({
          spawnIndex,
          routeIndex,
          cells: route.cells.map((cell) => cloneCell(cell)),
        });
      }
    }

    return previewPaths;
  }

  function disposeEnemyVisual(enemy) {
    if (!enemy?.mesh) {
      return;
    }
    detachEnemyFromLiveBatches(enemy);
    scene.remove(enemy.mesh);
    const disposedGeometries = new Set();
    const disposedMaterials = new Set();
    enemy.mesh.traverse((child) => {
      if (
        child?.geometry
        && typeof child.geometry.dispose === "function"
        && !disposedGeometries.has(child.geometry)
        && shouldDisposeEnemyResource(child.geometry)
      ) {
        disposedGeometries.add(child.geometry);
        child.geometry.dispose();
      }
      if (!child?.material) {
        return;
      }
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of materials) {
        if (
          !material
          || disposedMaterials.has(material)
          || typeof material.dispose !== "function"
          || !shouldDisposeEnemyResource(material)
        ) {
          continue;
        }
        disposedMaterials.add(material);
        material.dispose();
      }
    });
    for (const dissolveMaterial of Array.isArray(enemy.dissolveMaterials) ? enemy.dissolveMaterials : []) {
      if (
        !dissolveMaterial
        || disposedMaterials.has(dissolveMaterial)
        || typeof dissolveMaterial.dispose !== "function"
      ) {
        continue;
      }
      disposedMaterials.add(dissolveMaterial);
      dissolveMaterial.dispose();
    }
    for (const material of Array.isArray(enemy.replacedVisualMaterials) ? enemy.replacedVisualMaterials : []) {
      if (
        !material
        || disposedMaterials.has(material)
        || typeof material.dispose !== "function"
        || !shouldDisposeEnemyResource(material)
      ) {
        continue;
      }
      disposedMaterials.add(material);
      material.dispose();
    }
    enemy.dissolveUniforms = [];
    enemy.dissolveMaterials = [];
    enemy.replacedVisualMaterials = [];
  }

  function clearAll() {
    for (const enemy of activeEnemies) {
      disposeEnemyVisual(enemy);
    }
    activeEnemies.length = 0;
    enemyByNetworkId.clear();
    for (let i = deathExplosionEffects.length - 1; i >= 0; i -= 1) {
      const effect = deathExplosionEffects[i];
      if (effect?.mesh?.parent) {
        effect.mesh.parent.remove(effect.mesh);
      }
      effect?.mesh?.material?.dispose?.();
    }
    deathExplosionEffects.length = 0;
    scheduledSpawns = [];
    spawnEventCursor = 0;
    waveElapsedTime = 0;
    spawnCellCursor = 0;
    nextEnemyNetworkId = 1;
    lastAppliedNetworkStateSeq = -1;
  }

  function setNetworkViewMode(nextEnabled) {
    networkViewMode = !!nextEnabled;
    if (networkViewMode) {
      scheduledSpawns = [];
      spawnEventCursor = 0;
      waveElapsedTime = 0;
      spawnCellCursor = 0;
      lastAppliedNetworkStateSeq = -1;
      for (const enemy of activeEnemies) {
        if (!enemy) {
          continue;
        }
        enemy.pathOffsetLateral = 0;
        enemy.networkTargetPosition.copy(enemy.pathCenter ?? enemy.mesh?.position ?? tempCenterPosition.set(0, 0, 0));
        enemy.networkLastSeenAtMs = getNowMs();
        setEnemyWorldPosition(enemy, enemy.networkTargetPosition, enemy.pathForward);
        applyEnemyOrientation(enemy);
      }
    }
    return networkViewMode;
  }

  function disposeEnemyBatchMesh(mesh) {
    if (!mesh) {
      return;
    }
    if (mesh.parent) {
      mesh.parent.remove(mesh);
    }
    mesh.geometry?.dispose?.();
    if (Array.isArray(mesh.material)) {
      for (const material of mesh.material) {
        material?.dispose?.();
      }
      return;
    }
    mesh.material?.dispose?.();
  }

  function dispose() {
    clearAll();
    disposeEnemyBatchMesh(liveEnemyRenderBatches.body);
    disposeEnemyBatchMesh(liveEnemyRenderBatches.head);
    deathExplosionGeometry.dispose();
    deathExplosionMaterial.dispose();
  }

  function spawnEnemyByIndex(type, spawnIndex = 0) {
    const safeIndex = ((Math.floor(spawnIndex) % spawnCells.length) + spawnCells.length) % spawnCells.length;
    const enemy = createEnemyMesh(normalizeEnemyType(type), safeIndex);
    if (!enemy) {
      return false;
    }
    return addEnemyToActiveList(enemy, { emitSpawn: true });
  }

  function initializePathfindingState() {
    buildNavigationGraph();
    spawnNodeIds.length = 0;
    for (const spawnCell of spawnCells) {
      const spawnNodeId = nodeIdFromCell(spawnCell.x, spawnCell.z);
      if (spawnNodeId < 0 || nodeExists[spawnNodeId] !== 1) {
        return false;
      }
      spawnNodeIds.push(spawnNodeId);
    }
    if (endNodeId < 0 || nodeExists[endNodeId] !== 1) {
      return false;
    }
    const rebuiltDistance = rebuildDistanceField(distanceToEnd);
    if (!rebuiltDistance || !areAllSpawnsReachable(distanceToEnd)) {
      return false;
    }
    return rebuildSpawnRoutePools();
  }

  if (!initializePathfindingState()) {
    throw new Error("Enemy system could not find a valid route from every spawn to the destination.");
  }

  return {
    update,
    getEnemies,
    getDamageableEnemies,
    getActiveEnemySnapshots,
    getTargetInRange,
    isEnemyMeshSlowed,
    applyTemporarySlowToEnemyMesh,
    applyTemporarySlowInAabb,
    applyDamageAtPoint,
    applyDamageToEnemyMesh,
    applyDamageToEnemyId,
    setEnemyHealthFromNetwork,
    isPointNearEnemyMesh,
    getEnemyHitPartAtPoint,
    startWave,
    isWaveClear,
    applyTechGrants,
    upgradeSlowEnemies,
    setEnemyHealthMultiplier,
    setDamageEnabled,
    getDamageEnabled,
    setNetworkViewMode,
    applyNetworkEnemyStateBatch,
    spawnNetworkEnemy,
    canBlockCells,
    canBlockCell,
    setBlockedCells,
    getBlockedCells,
    getBlockedRevision,
    getPathfindingPerfStats,
    getRenderBatchStats: buildEnemyRenderStats,
    getRoutePreviewPaths,
    clearAll,
    dispose,
    forceSpawnEnemy: (type, spawnIndex = 0) => spawnEnemyByIndex(type, spawnIndex),
  };
}
