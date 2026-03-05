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
const ROUTE_CANDIDATE_POOL_SIZE = Math.max(
  ROUTE_VARIANT_COUNT,
  Math.floor(Number(ENEMY_CONFIG.pathCandidatePoolSize) || 24)
);
const ROUTE_OVERLAP_PENALTY = Math.max(0, Number(ENEMY_CONFIG.pathOverlapPenalty) || 0.45);
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

function makeDirectedEdgeKey(aKey, bKey) {
  return `${aKey}>${bKey}`;
}

function samePathPrefix(pathA, pathB, prefixLength) {
  if (!pathA || !pathB || prefixLength <= 0) {
    return false;
  }
  if (pathA.length < prefixLength || pathB.length < prefixLength) {
    return false;
  }
  for (let i = 0; i < prefixLength; i += 1) {
    if (pathA[i].x !== pathB[i].x || pathA[i].z !== pathB[i].z) {
      return false;
    }
  }
  return true;
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

  const blockedCells = new Set();
  const spawnCellSet = new Set(spawnCells.map((cell) => cellKey(cell.x, cell.z)));
  const endCellKey = cellKey(endCell.x, endCell.z);
  const routePoolsBySpawnIndex = new Map();

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

  function isBlocked(cellX, cellZ, extraBlockedSet = null) {
    const key = cellKey(cellX, cellZ);
    return blockedCells.has(key) || (!!extraBlockedSet && extraBlockedSet.has(key));
  }

  function isReservedEndpoint(cellX, cellZ) {
    const key = cellKey(cellX, cellZ);
    return key === endCellKey || spawnCellSet.has(key);
  }

  function getNeighborCells(cellX, cellZ, extraBlockedSet = null, bannedNodes = null, bannedEdges = null) {
    const neighbors = [];
    const currentHeight = getCellHeight(cellX, cellZ);
    if (!Number.isFinite(currentHeight)) {
      return neighbors;
    }

    const currentCell = { x: cellX, z: cellZ };
    const currentRampCell = getRampCellData(cellX, cellZ);
    const offsets = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];

    const fromKey = cellKey(cellX, cellZ);
    for (const [dx, dz] of offsets) {
      const nx = cellX + dx;
      const nz = cellZ + dz;
      const nextKey = cellKey(nx, nz);
      if (!isCellInsideLevel(nx, nz)) {
        continue;
      }
      if (bannedNodes?.has(nextKey)) {
        continue;
      }
      if (bannedEdges?.has(makeDirectedEdgeKey(fromKey, nextKey))) {
        continue;
      }

      const neighborHeight = getCellHeight(nx, nz);
      if (!Number.isFinite(neighborHeight)) {
        continue;
      }

      const nextCell = { x: nx, z: nz };
      const nextRampCell = getRampCellData(nx, nz);
      let isValidNeighbor = false;

      if (currentRampCell) {
        if (currentRampCell.role === RAMP_ROLE_LOW) {
          const toHighRampCell = areCellsEqual(nextCell, currentRampCell.highCell)
            && neighborHeight === currentRampCell.highLevel;
          const toLowOuterCell = areCellsEqual(nextCell, currentRampCell.lowOuterCell)
            && neighborHeight === currentRampCell.lowLevel;
          isValidNeighbor = toHighRampCell || toLowOuterCell;
        } else if (currentRampCell.role === RAMP_ROLE_HIGH) {
          const toLowRampCell = areCellsEqual(nextCell, currentRampCell.lowCell)
            && neighborHeight === currentRampCell.lowLevel;
          const toHighOuterCell = areCellsEqual(nextCell, currentRampCell.highOuterCell)
            && neighborHeight === currentRampCell.highLevel;
          isValidNeighbor = toLowRampCell || toHighOuterCell;
        }
      } else if (nextRampCell) {
        if (nextRampCell.role === RAMP_ROLE_LOW) {
          const fromLowEntry = areCellsEqual(currentCell, nextRampCell.lowOuterCell)
            && currentHeight === nextRampCell.lowLevel
            && neighborHeight === nextRampCell.lowLevel;
          isValidNeighbor = fromLowEntry;
        } else if (nextRampCell.role === RAMP_ROLE_HIGH) {
          const fromHighEntry = areCellsEqual(currentCell, nextRampCell.highOuterCell)
            && currentHeight === nextRampCell.highLevel
            && neighborHeight === nextRampCell.highLevel;
          isValidNeighbor = fromHighEntry;
        }
      } else {
        isValidNeighbor = neighborHeight === currentHeight;
      }

      if (!isValidNeighbor) {
        continue;
      }

      if (isBlocked(nx, nz, extraBlockedSet) && nextKey !== endCellKey) {
        continue;
      }
      neighbors.push({ x: nx, z: nz });
    }

    return neighbors;
  }

  function findShortestPathCells(startCell, targetCell, options = {}) {
    if (!startCell || !targetCell) {
      return null;
    }

    const extraBlockedSet = options.extraBlockedSet ?? null;
    const bannedNodes = options.bannedNodes ?? null;
    const bannedEdges = options.bannedEdges ?? null;
    const allowStartBlocked = !!options.allowStartBlocked;

    if (!isCellInsideLevel(startCell.x, startCell.z) || !isCellInsideLevel(targetCell.x, targetCell.z)) {
      return null;
    }

    const startKey = cellKey(startCell.x, startCell.z);
    const targetKey = cellKey(targetCell.x, targetCell.z);

    const startHeight = getCellHeight(startCell.x, startCell.z);
    const targetHeight = getCellHeight(targetCell.x, targetCell.z);
    if (!Number.isFinite(startHeight) || !Number.isFinite(targetHeight)) {
      return null;
    }

    if (!allowStartBlocked && isBlocked(startCell.x, startCell.z, extraBlockedSet) && startKey !== targetKey) {
      return null;
    }
    if (isBlocked(targetCell.x, targetCell.z, extraBlockedSet) && targetKey !== startKey) {
      return null;
    }
    if (bannedNodes?.has(startKey) || bannedNodes?.has(targetKey)) {
      return null;
    }

    const queue = [startKey];
    const visited = new Set([startKey]);
    const previousByKey = new Map();

    let queueCursor = 0;
    while (queueCursor < queue.length) {
      const currentKey = queue[queueCursor];
      queueCursor += 1;

      if (currentKey === targetKey) {
        break;
      }

      const currentCell = parseCellKey(currentKey);
      const neighbors = getNeighborCells(
        currentCell.x,
        currentCell.z,
        extraBlockedSet,
        bannedNodes,
        bannedEdges
      );

      for (const neighbor of neighbors) {
        const neighborKey = cellKey(neighbor.x, neighbor.z);
        if (visited.has(neighborKey)) {
          continue;
        }
        visited.add(neighborKey);
        previousByKey.set(neighborKey, currentKey);
        queue.push(neighborKey);
      }
    }

    if (!visited.has(targetKey)) {
      return null;
    }

    const cells = [];
    let walkKey = targetKey;
    while (walkKey) {
      const cell = parseCellKey(walkKey);
      cells.push(cell);
      walkKey = previousByKey.get(walkKey) ?? null;
    }
    cells.reverse();
    return cells;
  }

  function buildPathCandidates(startCell, maxCandidates, options = {}) {
    const candidates = [];
    const firstPathCells = findShortestPathCells(startCell, endCell, options);
    if (!firstPathCells || firstPathCells.length === 0) {
      return candidates;
    }

    const acceptedPaths = [createPathObject(firstPathCells)];
    const pendingByKey = new Map();

    for (let k = 1; k < maxCandidates; k += 1) {
      const previous = acceptedPaths[k - 1];
      const previousCells = previous.cells;
      if (previousCells.length <= 1) {
        break;
      }

      for (let i = 0; i < previousCells.length - 1; i += 1) {
        const rootPath = previousCells.slice(0, i + 1);
        const spurNode = rootPath[rootPath.length - 1];
        const bannedEdges = new Set();

        for (const accepted of acceptedPaths) {
          if (samePathPrefix(accepted.cells, rootPath, rootPath.length) && accepted.cells.length > i + 1) {
            const fromKey = cellKey(accepted.cells[i].x, accepted.cells[i].z);
            const toKey = cellKey(accepted.cells[i + 1].x, accepted.cells[i + 1].z);
            bannedEdges.add(makeDirectedEdgeKey(fromKey, toKey));
          }
        }

        const bannedNodes = new Set(
          rootPath
            .slice(0, -1)
            .map((cell) => cellKey(cell.x, cell.z))
        );

        const spurPath = findShortestPathCells(spurNode, endCell, {
          ...options,
          bannedNodes,
          bannedEdges,
          allowStartBlocked: true,
        });

        if (!spurPath || spurPath.length === 0) {
          continue;
        }

        const fullCells = [...rootPath.slice(0, -1), ...spurPath];
        const pathObj = createPathObject(fullCells);
        if (!pendingByKey.has(pathObj.key) && !acceptedPaths.some((accepted) => accepted.key === pathObj.key)) {
          pendingByKey.set(pathObj.key, pathObj);
        }
      }

      if (pendingByKey.size === 0) {
        break;
      }

      const pending = Array.from(pendingByKey.values()).sort(comparePathObjects);
      const best = pending[0];
      pendingByKey.delete(best.key);
      acceptedPaths.push(best);
    }

    candidates.push(...acceptedPaths.sort(comparePathObjects));
    return candidates;
  }

  function countSharedEdges(pathA, pathB) {
    if (!pathA || !pathB) {
      return 0;
    }
    let shared = 0;
    for (const edge of pathA.edgeSet) {
      if (pathB.edgeSet.has(edge)) {
        shared += 1;
      }
    }
    return shared;
  }

  function selectDiverseRoutes(candidates, count, overlapPenalty) {
    if (!Array.isArray(candidates) || candidates.length === 0) {
      return [];
    }
    if (candidates.length <= count) {
      return candidates.slice();
    }

    const selected = [candidates[0]];
    const remaining = candidates.slice(1);

    while (selected.length < count && remaining.length > 0) {
      let bestIndex = 0;
      let bestScore = Number.POSITIVE_INFINITY;
      let bestTieKey = "";

      for (let i = 0; i < remaining.length; i += 1) {
        const candidate = remaining[i];
        let overlap = 0;
        for (const picked of selected) {
          overlap += countSharedEdges(candidate, picked);
        }

        const score = candidate.cost + overlap * overlapPenalty;
        const tieKey = `${candidate.cost}|${candidate.key}`;
        if (score < bestScore || (score === bestScore && tieKey < bestTieKey)) {
          bestScore = score;
          bestTieKey = tieKey;
          bestIndex = i;
        }
      }

      selected.push(remaining[bestIndex]);
      remaining.splice(bestIndex, 1);
    }

    return selected;
  }

  function buildRoutePoolForStartCell(startCell, options = {}) {
    const candidates = buildPathCandidates(startCell, ROUTE_CANDIDATE_POOL_SIZE, options);
    if (candidates.length === 0) {
      return [];
    }
    return selectDiverseRoutes(candidates, ROUTE_VARIANT_COUNT, ROUTE_OVERLAP_PENALTY);
  }

  function cloneRoutePoolMap(routePoolMap) {
    const cloned = new Map();
    for (const [spawnIndex, pool] of routePoolMap.entries()) {
      cloned.set(spawnIndex, pool.slice());
    }
    return cloned;
  }

  function rebuildSpawnRoutePools() {
    routePoolsBySpawnIndex.clear();
    let allReachable = true;

    for (let i = 0; i < spawnCells.length; i += 1) {
      const spawnCell = spawnCells[i];
      const pool = buildRoutePoolForStartCell(spawnCell);
      routePoolsBySpawnIndex.set(i, pool);
      if (pool.length === 0) {
        allReachable = false;
      }
    }

    return allReachable;
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

  function rerouteEnemy(enemy) {
    if (!enemy || !enemy.alive || enemy.dying) {
      return false;
    }

    const currentCell = getEnemyCurrentCell(enemy);
    if (!currentCell) {
      return false;
    }

    const reroutePool = buildRoutePoolForStartCell(currentCell, { allowStartBlocked: true });
    const pathObj = reroutePool.length > 0
      ? reroutePool[Math.floor(Math.random() * reroutePool.length)]
      : null;

    if (!pathObj) {
      return false;
    }

    return applyRouteToEnemy(enemy, pathObj.cells, {
      fromCurrentPosition: true,
      currentCell,
    });
  }

  function rerouteActiveEnemies() {
    for (const enemy of activeEnemies) {
      rerouteEnemy(enemy);
    }
  }

  function canBlockCell(cellX, cellZ) {
    if (!isCellInsideLevel(cellX, cellZ)) {
      return false;
    }
    if (isReservedEndpoint(cellX, cellZ)) {
      return false;
    }

    const candidateKey = cellKey(cellX, cellZ);
    if (blockedCells.has(candidateKey)) {
      return false;
    }

    const simulatedBlocked = new Set(blockedCells);
    simulatedBlocked.add(candidateKey);

    for (const spawnCell of spawnCells) {
      const path = findShortestPathCells(spawnCell, endCell, {
        extraBlockedSet: simulatedBlocked,
      });
      if (!path || path.length === 0) {
        return false;
      }
    }

    return true;
  }

  function sanitizeBlockedCellList(cells) {
    const sanitized = new Set();
    if (!Array.isArray(cells)) {
      return sanitized;
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
      sanitized.add(cellKey(x, z));
    }

    return sanitized;
  }

  function blockedCellSetsEqual(a, b) {
    if (a.size !== b.size) {
      return false;
    }
    for (const key of a) {
      if (!b.has(key)) {
        return false;
      }
    }
    return true;
  }

  function setBlockedCells(cells) {
    const nextBlocked = sanitizeBlockedCellList(cells);
    if (blockedCellSetsEqual(blockedCells, nextBlocked)) {
      return true;
    }

    const previousBlocked = new Set(blockedCells);
    const previousPools = cloneRoutePoolMap(routePoolsBySpawnIndex);

    blockedCells.clear();
    for (const key of nextBlocked) {
      blockedCells.add(key);
    }

    if (!rebuildSpawnRoutePools()) {
      blockedCells.clear();
      for (const key of previousBlocked) {
        blockedCells.add(key);
      }
      routePoolsBySpawnIndex.clear();
      for (const [spawnIndex, pool] of previousPools.entries()) {
        routePoolsBySpawnIndex.set(spawnIndex, pool);
      }
      return false;
    }

    rerouteActiveEnemies();
    return true;
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
    for (const key of blockedCells) {
      const parsed = parseCellKey(key);
      if (Number.isInteger(parsed.x) && Number.isInteger(parsed.z)) {
        cells.push(parsed);
      }
    }
    return cells;
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

  if (!rebuildSpawnRoutePools()) {
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
    getRoutePreviewPaths,
    forceSpawnEnemy: (type, spawnIndex = 0) => spawnEnemyByIndex(type, spawnIndex),
  };
}
