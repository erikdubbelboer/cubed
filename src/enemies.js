import * as THREE from "three";
import { GAME_CONFIG } from "./config.js";

const ENEMY_CONFIG = GAME_CONFIG.enemies;
const GRID_CONFIG = GAME_CONFIG.grid;
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
  return { x: cell.x, z: cell.z };
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

  const activeEnemies = [];
  let scheduledSpawns = [];
  let spawnEventCursor = 0;
  let waveElapsedTime = 0;
  let enemySpeedMultiplier = 1;
  let enemySpawnSerial = 0;
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
  const tempSegmentStart = new THREE.Vector3();
  const tempSegmentEnd = new THREE.Vector3();
  const tempFrontRampContact = new THREE.Vector3();
  const tempBackRampContact = new THREE.Vector3();
  const hasPerformanceNow = typeof globalThis.performance?.now === "function";

  function getNowMs() {
    return hasPerformanceNow ? globalThis.performance.now() : Date.now();
  }

  const endCellSurfaceY = typeof grid?.getCellSurfaceY === "function"
    ? grid.getCellSurfaceY(endCell.x, endCell.z)
    : 0;
  const endCellCenter = typeof grid?.cellToWorldCenter === "function"
    ? grid.cellToWorldCenter(endCell.x, endCell.z, endCellSurfaceY)
    : new THREE.Vector3();
  const endHalfSize = (Number(grid?.cellSize) || 0) * 0.5;

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

  function canBlockCell(cellX, cellZ) {
    const startMs = getNowMs();
    pathPerfStats.canBlockCalls += 1;

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

    const cached = canBlockCacheByNode.get(candidateNodeId);
    if (typeof cached === "boolean") {
      pathPerfStats.canBlockCacheHits += 1;
      pathPerfStats.canBlockLastMs = getNowMs() - startMs;
      pathPerfStats.canBlockTotalMs += pathPerfStats.canBlockLastMs;
      return cached;
    }

    const rebuilt = rebuildDistanceField(scratchDistanceToEnd, candidateNodeId);
    const canBlock = rebuilt && areAllSpawnsReachable(scratchDistanceToEnd);
    canBlockCacheByNode.set(candidateNodeId, canBlock);
    pathPerfStats.canBlockLastMs = getNowMs() - startMs;
    pathPerfStats.canBlockTotalMs += pathPerfStats.canBlockLastMs;
    return canBlock;
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

    const bodyHalfSize = Number(enemy.mesh.userData?.bodyHalfSize);
    const pathForwardLengthSq = enemy.pathForward?.lengthSq?.() ?? 0;
    if (!Number.isFinite(bodyHalfSize) || bodyHalfSize <= 0 || pathForwardLengthSq < ENEMY_CONFIG.directionEpsilon) {
      enemy.pathSlopePitch = 0;
      enemy.visualRoot.rotation.x = 0;
      enemy.visualRoot.position.y = ENEMY_SURFACE_HOVER_HEIGHT;
      return;
    }

    const scaleY = Math.max(0.001, Math.abs(enemy.visualRoot.scale?.y ?? 1));
    const scaleZ = Math.max(0.001, Math.abs(enemy.visualRoot.scale?.z ?? 1));
    const halfHeight = bodyHalfSize * scaleY;
    const halfDepth = bodyHalfSize * scaleZ;
    if (halfDepth <= ENEMY_CONFIG.directionEpsilon) {
      enemy.pathSlopePitch = 0;
      enemy.visualRoot.rotation.x = 0;
      enemy.visualRoot.position.y = ENEMY_SURFACE_HOVER_HEIGHT;
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

    const bodyCenterOffsetY = Number(enemy.mesh.userData?.bodyCenterOffsetY) || 0;
    const localBottomY = bodyCenterOffsetY - halfHeight;
    const cosPitch = Math.cos(visualPitch);
    const targetAverageY = hasRampContact
      ? ((frontSurfaceY + backSurfaceY) * 0.5)
      : centerSurfaceY;
    const predictedAverageY = enemy.mesh.position.y + (localBottomY * cosPitch);
    enemy.visualRoot.position.y = (targetAverageY - predictedAverageY) + ENEMY_SURFACE_HOVER_HEIGHT;
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

    tempLocalPointA.copy(point).sub(enemy.mesh.position);
    tempQuatA.copy(enemy.mesh.quaternion).invert();
    tempLocalPointA.applyQuaternion(tempQuatA);

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

  function isEnemyFullyInsideEndCube(enemy) {
    if (!enemy?.mesh || endHalfSize <= 0) {
      return false;
    }

    const containmentRadius = getEnemyContainmentRadius(enemy);
    const center = getEnemyCollisionCenter(enemy, tempCollisionCenterA);

    const minX = endCellCenter.x - endHalfSize;
    const maxX = endCellCenter.x + endHalfSize;
    const minZ = endCellCenter.z - endHalfSize;
    const maxZ = endCellCenter.z + endHalfSize;
    const minY = endCellSurfaceY;
    const maxY = endCellSurfaceY + (Number(grid?.cellSize) || 0);

    return (
      center.x - containmentRadius >= minX
      && center.x + containmentRadius <= maxX
      && center.z - containmentRadius >= minZ
      && center.z + containmentRadius <= maxZ
      && center.y - containmentRadius >= minY
      && center.y + containmentRadius <= maxY
    );
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

  function createEnemyMesh(type, spawnIndex = 0) {
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

    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: enemyType.color,
      emissive: enemyType.emissive,
      emissiveIntensity: ENEMY_CONFIG.bodyEmissiveIntensity,
      roughness: ENEMY_CONFIG.bodyRoughness,
      metalness: ENEMY_CONFIG.bodyMetalness,
    });
    const bodyMesh = new THREE.Mesh(
      new THREE.BoxGeometry(enemyType.size, enemyType.size, enemyType.size),
      bodyMaterial
    );
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    bodyMesh.position.y = enemyType.size * 0.5 + ENEMY_CONFIG.bodyYOffset;
    visualRoot.add(bodyMesh);

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
    healthBarRoot.position.set(
      0,
      bodyMesh.position.y
      + enemyType.size * ENEMY_CONFIG.healthBarYOffsetFromEnemySize
      + ENEMY_CONFIG.healthBarYOffset,
      0
    );
    enemyMesh.add(healthBarRoot);

    scene.add(enemyMesh);

    const initialForward = travelWaypoints.length >= 2
      ? getDirectionOnPlane(travelWaypoints[0], travelWaypoints[1])
      : new THREE.Vector3(0, 0, 1);

    const enemy = {
      mesh: enemyMesh,
      bodyMesh,
      bodyMaterial,
      baseBodyColor: bodyMaterial.color.clone(),
      baseEmissiveIntensity: bodyMaterial.emissiveIntensity,
      hitPulseTimer: 0,
      hitPulseClock: 0,
      healthBarRoot,
      healthBarFg,
      healthBarBgWidth,
      healthBarFgWidth,
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
    };

    setEnemyWorldPosition(enemy, enemy.pathCenter, enemy.pathForward);
    applyEnemyOrientation(enemy);

    enemyMesh.userData.bodyCenterOffsetY = bodyMesh.position.y;
    enemyMesh.userData.bodyHalfSize = enemyType.size * 0.5;
    enemyMesh.userData.hitSphereRadius = enemyType.radius;

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
    if (!enemy.bodyMaterial || !enemy.visualRoot) {
      return;
    }
    enemy.bodyMaterial.emissiveIntensity = enemy.baseEmissiveIntensity;
    enemy.bodyMaterial.color.copy(enemy.baseBodyColor);
    enemy.visualRoot.scale.set(1, 1, 1);
    enemy.hitPulseTimer = 0;
    enemy.hitPulseClock = 0;
  }

  function triggerHitPulse(enemy) {
    if (!enemy.bodyMaterial) {
      return;
    }
    enemy.hitPulseTimer = Math.min(
      HIT_PULSE_DURATION,
      enemy.hitPulseTimer + (HIT_PULSE_DURATION * HIT_PULSE_STACK_ADD)
    );
  }

  function updateHitPulse(enemy, deltaSeconds) {
    if (!enemy.bodyMaterial || !enemy.visualRoot || enemy.hitPulseTimer <= 0) {
      return;
    }

    enemy.hitPulseTimer = Math.max(0, enemy.hitPulseTimer - deltaSeconds);
    enemy.hitPulseClock += deltaSeconds;

    const t = Math.max(0, enemy.hitPulseTimer / HIT_PULSE_DURATION);
    const envelope = Math.pow(t, HIT_PULSE_EXPONENT);
    const oscillation = 0.65 + (0.35 * Math.sin(enemy.hitPulseClock * HIT_PULSE_FREQUENCY));
    const pulse = envelope * oscillation;

    enemy.bodyMaterial.emissiveIntensity = enemy.baseEmissiveIntensity + (pulse * HIT_PULSE_EMISSIVE_BOOST);
    enemy.bodyMaterial.color.copy(enemy.baseBodyColor);

    const scaleXZ = 1 + (pulse * HIT_PULSE_SCALE_BOOST);
    const scaleY = 1 + (pulse * HIT_PULSE_SCALE_BOOST * 0.55);
    enemy.visualRoot.scale.set(scaleXZ, scaleY, scaleXZ);

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

    if (!enemy.visualRoot) return;

    enemy.visualRoot.traverse((child) => {
      if (!child.isMesh || !child.material) {
        return;
      }
      const hadArrayMaterial = Array.isArray(child.material);
      const sourceMaterials = hadArrayMaterial ? child.material : [child.material];
      const dissolveMaterials = sourceMaterials.map((sourceMaterial) => {
        const { material, dissolveUniform } = createDissolveMaterial(sourceMaterial);
        enemy.dissolveMaterials.push(material);
        enemy.dissolveUniforms.push(dissolveUniform);
        return material;
      });
      child.material = hadArrayMaterial ? dissolveMaterials : dissolveMaterials[0];
    });
  }

  function applyDamage(enemy, amount) {
    if (!enemy.alive || enemy.dying) return;
    enemy.health = Math.max(0, enemy.health - amount);
    triggerHitPulse(enemy);
    updateHealthBar(enemy);
    if (enemy.health <= 0) {
      if (onEnemyDefeated) {
        const configuredReward = Number(ENEMY_TYPES[enemy.type]?.cashReward);
        const cashReward = Number.isFinite(configuredReward)
          ? Math.max(0, Math.floor(configuredReward))
          : Math.max(1, Math.floor(enemy.maxHealth || 1));
        if (cashReward > 0) {
          onEnemyDefeated(cashReward, enemy.type);
        }
      }
      startEnemyDissolve(enemy);
    }
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

  function update(deltaSeconds, camera) {
    runVariantBuildStep();

    if (spawnEventCursor < scheduledSpawns.length) {
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
          activeEnemies.push(enemy);
        }
        spawnEventCursor += 1;
      }
    }

    for (let i = activeEnemies.length - 1; i >= 0; i -= 1) {
      const enemy = activeEnemies[i];

      if (!enemy.alive && !enemy.dying) {
        activeEnemies.splice(i, 1);
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
          scene.remove(enemy.mesh);
          for (const dissolveMaterial of enemy.dissolveMaterials) {
            dissolveMaterial.dispose();
          }
          activeEnemies.splice(i, 1);
        }
        continue;
      }

      updateEnemyTravel(enemy, deltaSeconds);

      if (isEnemyFullyInsideEndCube(enemy)) {
        enemy.alive = false;
        scene.remove(enemy.mesh);
        activeEnemies.splice(i, 1);
        continue;
      }

      updateHitPulse(enemy, deltaSeconds);

      if (enemy.alive && camera && enemy.healthBarRoot) {
        enemy.healthBarRoot.lookAt(camera.position);
      }
    }
  }

  function applyDamageAtPoint(point, hitRadius, damage) {
    const safeHitRadius = Math.max(0, Number(hitRadius) || 0);
    let hitAny = false;
    for (const enemy of activeEnemies) {
      if (!enemy.alive || enemy.dying) continue;
      if (isPointNearEnemyBody(enemy, point, safeHitRadius)) {
        applyDamage(enemy, damage);
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

      applyDamage(enemy, damage);
      return true;
    }

    return false;
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

  function spawnEnemyByIndex(type, spawnIndex = 0) {
    const safeIndex = ((Math.floor(spawnIndex) % spawnCells.length) + spawnCells.length) % spawnCells.length;
    const enemy = createEnemyMesh(normalizeEnemyType(type), safeIndex);
    if (!enemy) {
      return false;
    }
    activeEnemies.push(enemy);
    return true;
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
    getTargetInRange,
    isEnemyMeshSlowed,
    applyTemporarySlowToEnemyMesh,
    applyTemporarySlowInAabb,
    applyDamageAtPoint,
    applyDamageToEnemyMesh,
    isPointNearEnemyMesh,
    startWave,
    isWaveClear,
    upgradeSlowEnemies,
    canBlockCell,
    setBlockedCells,
    getBlockedCells,
    getBlockedRevision,
    getPathfindingPerfStats,
    getRoutePreviewPaths,
    forceSpawnEnemy: (type, spawnIndex = 0) => spawnEnemyByIndex(type, spawnIndex),
  };
}
