import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { GAME_CONFIG } from "./config.js";
import {
  createDecorationVisual,
  getPreparedDecorationBatchParts,
  getPreparedRampBatchParts,
  getPreparedTerrainWallBatchParts,
  isKenneyAssetManagedResource,
} from "./kenneyModels.js";
import {
  DECORATIVE_MODEL_TYPES,
  getDecorativeModelSpec,
  isDecorativeObjectType as isCatalogDecorativeObjectType,
} from "./modelCatalog.js";

const GRID_CONFIG = GAME_CONFIG.grid;

const GRID_SIZE = GRID_CONFIG.size;
const CELL_SIZE = GRID_CONFIG.cellSize;
const PLATFORM_HEIGHT = GRID_CONFIG.platformHeight;
const TILE_HEIGHT = GRID_CONFIG.tileHeight;
const FLOOR_Y = GRID_CONFIG.floorY;
const PATH_TILE_TOP_Y = FLOOR_Y + TILE_HEIGHT;
const ALTITUDE_CUBE_SIZE = CELL_SIZE;
const TERRAIN_OBSTACLE_HALF_SIZE = CELL_SIZE * 0.5;
const OUTER_EMPTY_SPACE_RINGS = Math.max(
  0,
  Math.floor(Number(GRID_CONFIG.outerEmptySpaceRings ?? GRID_CONFIG.outerEmptyTerrainRings) || 0)
);
const LEGACY_PATH_MARKERS = new Set(["P"]);
const DECORATIVE_OBJECT_TYPES = new Set(DECORATIVE_MODEL_TYPES);
const LEVEL_OBJECT_TYPES = new Set(["wall", "spawn", "end", "playerspawn", "ramp", "path", ...DECORATIVE_OBJECT_TYPES]);
const LEVEL_MARKER_TYPES = new Set(["spawn", "end", "playerspawn", "path"]);
const RAMP_ROTATION_TO_DIRECTION = new Map([
  [0, { x: 0, z: 1 }],
  [90, { x: 1, z: 0 }],
  [180, { x: 0, z: -1 }],
  [270, { x: -1, z: 0 }],
]);
const RAMP_ROLE_LOW = "low";
const RAMP_ROLE_HIGH = "high";
const STATIC_VISUAL_CHUNK_SIZE = 6;
const RAMP_SURFACE_ALONG_MIN = -CELL_SIZE * 0.5;
const RAMP_SURFACE_ALONG_MAX = CELL_SIZE * 1.5;
const RAMP_TOP_LANDING_LENGTH = CELL_SIZE * 0.5;
const RAMP_SURFACE_SLOPE_END = Math.max(
  RAMP_SURFACE_ALONG_MIN + 0.0001,
  RAMP_SURFACE_ALONG_MAX - RAMP_TOP_LANDING_LENGTH
);

function shouldDisposeGridResource(resource) {
  return !isKenneyAssetManagedResource(resource);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function saturate(value) {
  return clamp(value, 0, 1);
}

function smoothstep01(value) {
  const t = saturate(value);
  return t * t * (3 - (2 * t));
}

function getRampSurfaceRatioForAlong(along) {
  const clampedAlong = clamp(along, RAMP_SURFACE_ALONG_MIN, RAMP_SURFACE_ALONG_MAX);
  if (clampedAlong >= RAMP_SURFACE_SLOPE_END) {
    return 1;
  }
  return saturate((clampedAlong - RAMP_SURFACE_ALONG_MIN) / (RAMP_SURFACE_SLOPE_END - RAMP_SURFACE_ALONG_MIN));
}

function getRampSurfaceYForAlong(lowY, highY, along) {
  return THREE.MathUtils.lerp(lowY, highY, getRampSurfaceRatioForAlong(along));
}

function disposeMeshGroupResources(root, shouldDisposeResource) {
  if (!root) {
    return;
  }
  const disposedGeometries = new Set();
  const disposedMaterials = new Set();
  root.traverse((child) => {
    if (
      child?.geometry
      && typeof child.geometry.dispose === "function"
      && !disposedGeometries.has(child.geometry)
      && shouldDisposeResource(child.geometry)
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
        || !shouldDisposeResource(material)
      ) {
        continue;
      }
      disposedMaterials.add(material);
      material.dispose();
    }
  });
}

function finiteOrFallback(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function cellKey(cellX, cellZ) {
  return `${cellX},${cellZ}`;
}

function rampSurfaceKey(cellX, cellZ, level) {
  return `${cellX},${cellZ},${level}`;
}

function cloneCell(cell) {
  if (!cell) {
    return null;
  }
  const cloned = { x: cell.x, z: cell.z };
  if (Number.isInteger(cell.y)) {
    cloned.y = cell.y;
  }
  return cloned;
}

function clonePosition(position) {
  if (!position) {
    return null;
  }
  return {
    x: position.x,
    y: position.y,
    z: position.z,
  };
}

function isIntegerCell(value) {
  return Number.isInteger(value) && Number.isFinite(value);
}

function parseGridPosition(rawPosition, entryIndex, type) {
  const position = rawPosition ?? {};
  const x = Number(position.x);
  const y = Number(position.y);
  const z = Number(position.z);
  if (isDecorativeObjectType(type)) {
    const worldHalfSpan = (GRID_SIZE * CELL_SIZE) * 0.5;
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
      throw new Error(`grid.levelObjects[${entryIndex}] decorative position must use numeric x/y/z.`);
    }
    if (x < -worldHalfSpan || x >= worldHalfSpan || z < -worldHalfSpan || z >= worldHalfSpan) {
      throw new Error(`grid.levelObjects[${entryIndex}] decorative position (${x},${z}) is outside the level bounds.`);
    }
    if (y < FLOOR_Y) {
      throw new Error(`grid.levelObjects[${entryIndex}] decorative y must be >= floorY.`);
    }
    return { x, y, z };
  }
  if (!isIntegerCell(x) || !isIntegerCell(y) || !isIntegerCell(z)) {
    throw new Error(`grid.levelObjects[${entryIndex}] position must use integer x/y/z.`);
  }
  if (x < 0 || x >= GRID_SIZE || z < 0 || z >= GRID_SIZE) {
    throw new Error(`grid.levelObjects[${entryIndex}] position (${x},${z}) is outside the grid.`);
  }
  if (y < 0) {
    throw new Error(`grid.levelObjects[${entryIndex}] y must be >= 0.`);
  }
  return { x, y, z };
}

function parseRotation(rawRotation, entryIndex, type) {
  const numericRotation = Number(rawRotation ?? 0);
  if (!Number.isFinite(numericRotation)) {
    throw new Error(`grid.levelObjects[${entryIndex}] rotation must be numeric.`);
  }
  if (isDecorativeObjectType(type)) {
    const normalized = ((numericRotation % 360) + 360) % 360;
    const rotationStepDegrees = Number(getDecorativeModelSpec(type)?.rotationStepDegrees);
    if (!Number.isFinite(rotationStepDegrees) || rotationStepDegrees <= 0 || rotationStepDegrees >= 360) {
      return normalized;
    }
    const quantized = Math.round(normalized / rotationStepDegrees) * rotationStepDegrees;
    return ((quantized % 360) + 360) % 360;
  }
  const quantized = Math.round(numericRotation / 90) * 90;
  if (Math.abs(numericRotation - quantized) > 1e-6) {
    throw new Error(`grid.levelObjects[${entryIndex}] rotation must be a multiple of 90.`);
  }
  const normalized = ((quantized % 360) + 360) % 360;
  if (!RAMP_ROTATION_TO_DIRECTION.has(normalized)) {
    throw new Error(`grid.levelObjects[${entryIndex}] rotation must be one of 0, 90, 180, 270.`);
  }
  return normalized;
}

function createHeightMatrix() {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));
}

function createMarkerMatrix() {
  return Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill("."));
}

function cloneDirection(direction) {
  return { x: direction.x, z: direction.z };
}

function isDecorativeObjectType(type) {
  return isCatalogDecorativeObjectType(type);
}

function decorativeObjectMatchesLevelEntry(entry, decoration) {
  if (!entry || !decoration) {
    return false;
  }
  if (entry.type !== decoration.type) {
    return false;
  }
  return Math.abs(Number(entry.position?.x) - Number(decoration.position?.x)) <= 1e-4
    && Math.abs(Number(entry.position?.y) - Number(decoration.position?.y)) <= 1e-4
    && Math.abs(Number(entry.position?.z) - Number(decoration.position?.z)) <= 1e-4
    && Math.abs(Number(entry.rotation) - Number(decoration.rotation)) <= 1e-4;
}

function createRampCellData({
  rampId,
  role,
  rotation,
  direction,
  lowCell,
  highCell,
  lowOuterCell,
  highOuterCell,
  lowLevel,
  highLevel,
}) {
  const sideDir = { x: -direction.z, z: direction.x };
  const lowSideA = { x: lowCell.x + sideDir.x, z: lowCell.z + sideDir.z };
  const lowSideB = { x: lowCell.x - sideDir.x, z: lowCell.z - sideDir.z };
  const highSideA = { x: highCell.x + sideDir.x, z: highCell.z + sideDir.z };
  const highSideB = { x: highCell.x - sideDir.x, z: highCell.z - sideDir.z };
  return {
    rampId,
    role,
    rotation,
    direction: cloneDirection(direction),
    lowCell: cloneCell(lowCell),
    highCell: cloneCell(highCell),
    lowOuterCell: cloneCell(lowOuterCell),
    highOuterCell: cloneCell(highOuterCell),
    lowLevel,
    highLevel,
    sideCells: {
      low: [lowSideA, lowSideB],
      high: [highSideA, highSideB],
    },
  };
}

function normalizeLevelObjectTypeForExport(type) {
  if (type === "playerspawn") {
    return "playerSpawn";
  }
  return type;
}

function isGridSnappedDecorativeType(type) {
  return getDecorativeModelSpec(type)?.placement === "grid";
}

function normalizeDecorativePosition(type, position) {
  if (!isGridSnappedDecorativeType(type)) {
    return clonePosition(position);
  }
  const worldX = Number(position?.x);
  const worldY = Number(position?.y);
  const worldZ = Number(position?.z);
  const half = (GRID_SIZE * CELL_SIZE) * 0.5;
  const cellX = Math.floor((worldX + half) / CELL_SIZE);
  const cellZ = Math.floor((worldZ + half) / CELL_SIZE);
  if (!isMainGridCell(cellX, cellZ)) {
    return clonePosition(position);
  }
  const center = cellToWorld(cellX, cellZ);
  return {
    x: center.x,
    y: worldY,
    z: center.z,
  };
}

function parseLevelLayout(levelObjects, options = {}) {
  const allowIncompleteMarkers = options.allowIncompleteMarkers === true;
  if (!Array.isArray(levelObjects)) {
    throw new Error("grid.levelObjects must be an array.");
  }
  if (levelObjects.length === 0 && !allowIncompleteMarkers) {
    throw new Error("grid.levelObjects must be a non-empty array.");
  }

  const parsedEntries = levelObjects.map((entry, index) => {
    if (!entry || typeof entry !== "object") {
      throw new Error(`grid.levelObjects[${index}] must be an object.`);
    }

    const normalizedType = String(entry.type ?? "").trim().toLowerCase();
    if (!LEVEL_OBJECT_TYPES.has(normalizedType)) {
      throw new Error(`Invalid grid.levelObjects[${index}].type '${entry.type}'.`);
    }

    return {
      type: normalizedType,
      position: parseGridPosition(entry.position, index, normalizedType),
      rotation: parseRotation(entry.rotation ?? 0, index, normalizedType),
      index,
    };
  });

  const wallHeights = createHeightMatrix();
  const wallVoxels = [];
  const wallVoxelKeySet = new Set();
  const markers = createMarkerMatrix();
  const spawnCells = [];
  const spawnCellKeySet = new Set();
  let endCell = null;
  let playerSpawnCell = null;
  let playerSpawnRotation = 0;
  const ramps = [];
  const decorativeObjects = [];
  const rawDecorativeEntries = [];
  const rampCellsByKey = new Map();
  const rampOccupiedSurfaceMap = new Map();
  const rampOuterSurfaceMap = new Map();

  for (const entry of parsedEntries) {
    if (entry.type !== "wall") {
      continue;
    }
    const { x, y, z } = entry.position;
    wallHeights[z][x] = Math.max(wallHeights[z][x], y + 1);
    const voxelKey = `${x},${y},${z}`;
    if (wallVoxelKeySet.has(voxelKey)) {
      continue;
    }
    wallVoxelKeySet.add(voxelKey);
    wallVoxels.push({ x, y, z });
  }

  for (const entry of parsedEntries) {
    if (isDecorativeObjectType(entry.type)) {
      rawDecorativeEntries.push(entry);
      continue;
    }
    if (!LEVEL_MARKER_TYPES.has(entry.type)) {
      continue;
    }
    const { x, y, z } = entry.position;
    const key = `${x},${y},${z}`;

    if (entry.type === "spawn") {
      if (!spawnCellKeySet.has(key)) {
        spawnCellKeySet.add(key);
        spawnCells.push({ x, y, z });
      }
      markers[z][x] = "S";
    } else if (entry.type === "end") {
      if (endCell && (
        endCell.x !== x
        || endCell.y !== y
        || endCell.z !== z
      )) {
        throw new Error("grid.levelObjects must contain at most one end marker.");
      }
      endCell = { x, y, z };
      markers[z][x] = "E";
    } else if (entry.type === "playerspawn") {
      if (playerSpawnCell && (
        playerSpawnCell.x !== x
        || playerSpawnCell.y !== y
        || playerSpawnCell.z !== z
      )) {
        throw new Error("grid.levelObjects must contain at most one playerSpawn marker.");
      }
      playerSpawnCell = { x, y, z };
      playerSpawnRotation = entry.rotation;
      markers[z][x] = "X";
    } else if (entry.type === "path") {
      markers[z][x] = "P";
    }
  }

  for (const entry of parsedEntries) {
    if (entry.type !== "ramp") {
      continue;
    }

    const lowCell = { x: entry.position.x, z: entry.position.z };
    const direction = RAMP_ROTATION_TO_DIRECTION.get(entry.rotation);
    const highCell = { x: lowCell.x + direction.x, z: lowCell.z + direction.z };
    const lowOuterCell = { x: lowCell.x - direction.x, z: lowCell.z - direction.z };
    const highOuterCell = { x: highCell.x + direction.x, z: highCell.z + direction.z };

    if (!isMainGridCell(highCell.x, highCell.z)) {
      throw new Error(
        `grid.levelObjects[${entry.index}] ramp exits the grid at (${highCell.x},${highCell.z}).`
      );
    }

    const lowCellKey = cellKey(lowCell.x, lowCell.z);
    const highCellKey = cellKey(highCell.x, highCell.z);
    if (rampCellsByKey.has(lowCellKey) || rampCellsByKey.has(highCellKey)) {
      throw new Error(`grid.levelObjects[${entry.index}] ramp overlaps another ramp.`);
    }

    const lowLevel = entry.position.y;
    const highLevel = lowLevel + 1;
    const lowSurfaceKey = rampSurfaceKey(lowCell.x, lowCell.z, lowLevel);
    const highSurfaceKey = rampSurfaceKey(highCell.x, highCell.z, highLevel);
    const lowOuterSurfaceKey = rampSurfaceKey(lowOuterCell.x, lowOuterCell.z, lowLevel);
    const highOuterSurfaceKey = rampSurfaceKey(highOuterCell.x, highOuterCell.z, highLevel);
    if (wallHeights[lowCell.z][lowCell.x] > lowLevel || wallHeights[highCell.z][highCell.x] > lowLevel) {
      throw new Error(`grid.levelObjects[${entry.index}] ramp intersects wall volume.`);
    }
    if (rampOuterSurfaceMap.has(lowSurfaceKey) || rampOuterSurfaceMap.has(highSurfaceKey)) {
      throw new Error(`grid.levelObjects[${entry.index}] ramp blocks another ramp end.`);
    }
    if (
      (isMainGridCell(lowOuterCell.x, lowOuterCell.z) && rampOccupiedSurfaceMap.has(lowOuterSurfaceKey))
      || (isMainGridCell(highOuterCell.x, highOuterCell.z) && rampOccupiedSurfaceMap.has(highOuterSurfaceKey))
    ) {
      throw new Error(`grid.levelObjects[${entry.index}] ramp end is blocked by another ramp.`);
    }
    const rampId = ramps.length;

    const lowCellData = createRampCellData({
      rampId,
      role: RAMP_ROLE_LOW,
      rotation: entry.rotation,
      direction,
      lowCell,
      highCell,
      lowOuterCell,
      highOuterCell,
      lowLevel,
      highLevel,
    });
    const highCellData = createRampCellData({
      rampId,
      role: RAMP_ROLE_HIGH,
      rotation: entry.rotation,
      direction,
      lowCell,
      highCell,
      lowOuterCell,
      highOuterCell,
      lowLevel,
      highLevel,
    });

    rampCellsByKey.set(lowCellKey, lowCellData);
    rampCellsByKey.set(highCellKey, highCellData);
    rampOccupiedSurfaceMap.set(lowSurfaceKey, rampId);
    rampOccupiedSurfaceMap.set(highSurfaceKey, rampId);
    if (isMainGridCell(lowOuterCell.x, lowOuterCell.z)) {
      rampOuterSurfaceMap.set(lowOuterSurfaceKey, rampId);
    }
    if (isMainGridCell(highOuterCell.x, highOuterCell.z)) {
      rampOuterSurfaceMap.set(highOuterSurfaceKey, rampId);
    }
    ramps.push({
      id: rampId,
      rotation: entry.rotation,
      direction: cloneDirection(direction),
      lowCell: cloneCell(lowCell),
      highCell: cloneCell(highCell),
      lowOuterCell: cloneCell(lowOuterCell),
      highOuterCell: cloneCell(highOuterCell),
      lowLevel,
      highLevel,
    });
  }

  for (const entry of rawDecorativeEntries) {
    entry.position = normalizeDecorativePosition(
      entry.type,
      entry.position
    );
    decorativeObjects.push({
      type: entry.type,
      position: clonePosition(entry.position),
      rotation: entry.rotation,
    });
  }

  if (!allowIncompleteMarkers && spawnCells.length === 0) {
    throw new Error("grid.levelObjects must contain at least one spawn marker.");
  }
  if (!allowIncompleteMarkers && !endCell) {
    throw new Error("grid.levelObjects must contain exactly one end marker.");
  }

  const heights = createHeightMatrix();
  for (let cellZ = 0; cellZ < GRID_SIZE; cellZ += 1) {
    for (let cellX = 0; cellX < GRID_SIZE; cellX += 1) {
      let supportedHeight = 0;
      while (wallVoxelKeySet.has(`${cellX},${supportedHeight},${cellZ}`)) {
        supportedHeight += 1;
      }
      heights[cellZ][cellX] = supportedHeight;
    }
  }
  for (const ramp of ramps) {
    heights[ramp.lowCell.z][ramp.lowCell.x] = Math.max(
      heights[ramp.lowCell.z][ramp.lowCell.x],
      ramp.lowLevel
    );
    heights[ramp.highCell.z][ramp.highCell.x] = Math.max(
      heights[ramp.highCell.z][ramp.highCell.x],
      ramp.highLevel
    );
  }

  return {
    heights,
    wallHeights,
    wallVoxels,
    markers,
    spawnCells,
    endCell,
    playerSpawnCell,
    playerSpawnRotation,
    ramps,
    decorativeObjects,
    rampCellsByKey,
    levelObjects: parsedEntries.map((entry) => ({
      type: normalizeLevelObjectTypeForExport(entry.type),
      position: clonePosition(entry.position),
      rotation: entry.rotation,
    })),
  };
}

function isMainGridCell(cellX, cellZ) {
  return cellX >= 0 && cellX < GRID_SIZE && cellZ >= 0 && cellZ < GRID_SIZE;
}

function cellToWorld(cellX, cellZ, y = FLOOR_Y) {
  const half = (GRID_SIZE * CELL_SIZE) / 2;
  return new THREE.Vector3(
    -half + cellX * CELL_SIZE + CELL_SIZE / 2,
    y,
    -half + cellZ * CELL_SIZE + CELL_SIZE / 2
  );
}

function isSameCell(a, b) {
  return !!a && !!b && a.x === b.x && a.z === b.z;
}

function createRampWedgeGeometry(length, height, width, options = {}) {
  const includeBottom = options.includeBottom !== false;
  const includeHighFace = options.includeHighFace !== false;
  const halfLength = length * 0.5;
  const halfWidth = width * 0.5;
  const vertices = new Float32Array([
    // 0 A: low-left-bottom
    -halfWidth, 0, -halfLength,
    // 1 B: low-right-bottom
    halfWidth, 0, -halfLength,
    // 2 C: high-left-bottom
    -halfWidth, 0, halfLength,
    // 3 D: high-right-bottom
    halfWidth, 0, halfLength,
    // 4 E: high-left-top
    -halfWidth, height, halfLength,
    // 5 F: high-right-top
    halfWidth, height, halfLength,
  ]);

  const indices = [];
  if (includeBottom) {
    // Bottom (outward normal = -Y).
    indices.push(
      0, 1, 3,
      0, 3, 2
    );
  }
  // Top slope (outward normal = +Y/-along).
  indices.push(
    0, 5, 1,
    0, 4, 5
  );
  // Side triangles.
  indices.push(
    0, 2, 4,
    1, 5, 3
  );
  // Optional high-end cap.
  if (includeHighFace) {
    indices.push(
      2, 3, 5,
      2, 5, 4
    );
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  const flatGeometry = geometry.toNonIndexed();
  geometry.dispose();
  flatGeometry.computeVertexNormals();
  return flatGeometry;
}

function getRampHighEdgeKey(ramp) {
  const highLevel = Number(ramp?.highLevel) || 0;
  const highCellX = Number(ramp?.highCell?.x) || 0;
  const highCellZ = Number(ramp?.highCell?.z) || 0;
  const dirX = Number(ramp?.direction?.x) || 0;
  const dirZ = Number(ramp?.direction?.z) || 0;
  if (Math.abs(dirX) > 0) {
    return `x|${(highCellX * 2) + dirX}|${highCellZ}|${highLevel}`;
  }
  return `z|${(highCellZ * 2) + dirZ}|${highCellX}|${highLevel}`;
}

export function createGrid(scene, options = {}) {
  const {
    levelObjects = GRID_CONFIG.levelObjects,
    allowIncompleteMarkers = false,
    editorMode = false,
  } = options;

  const levelLayout = parseLevelLayout(levelObjects, { allowIncompleteMarkers });
  const normalizedLevelObjects = Array.isArray(levelLayout.levelObjects)
    ? levelLayout.levelObjects.map((entry) => ({
      type: entry.type,
      position: clonePosition(entry.position),
      rotation: entry.rotation,
    }))
    : [];

  function getCellHeightLevels(cellX, cellZ) {
    if (!isMainGridCell(cellX, cellZ)) {
      return 0;
    }
    const row = levelLayout.heights[cellZ];
    if (!row) {
      return 0;
    }
    return row[cellX] ?? 0;
  }

  function getCellMarker(cellX, cellZ) {
    if (!isMainGridCell(cellX, cellZ)) {
      return ".";
    }
    const row = levelLayout.markers[cellZ];
    if (!row) {
      return ".";
    }
    return row[cellX] ?? ".";
  }

  function getRampCellData(cellX, cellZ) {
    return levelLayout.rampCellsByKey.get(cellKey(cellX, cellZ)) ?? null;
  }

  function isRampCell(cellX, cellZ) {
    return !!getRampCellData(cellX, cellZ);
  }

  function getCellSurfaceY(cellX, cellZ) {
    const rampCellData = getRampCellData(cellX, cellZ);
    if (rampCellData) {
      const lowSurfaceY = FLOOR_Y + (rampCellData.lowLevel * ALTITUDE_CUBE_SIZE);
      const highSurfaceY = FLOOR_Y + (rampCellData.highLevel * ALTITUDE_CUBE_SIZE);
      const alongAtCellCenter = rampCellData.role === RAMP_ROLE_LOW ? 0 : CELL_SIZE;
      return getRampSurfaceYForAlong(lowSurfaceY, highSurfaceY, alongAtCellCenter);
    }
    return FLOOR_Y + (getCellHeightLevels(cellX, cellZ) * ALTITUDE_CUBE_SIZE);
  }

  const gridRoot = new THREE.Group();
  gridRoot.name = "GridRoot";
  scene.add(gridRoot);

  const extendedGridCellSpan = GRID_SIZE + (OUTER_EMPTY_SPACE_RINGS * 2);
  const extendedGridWorldSize = extendedGridCellSpan * CELL_SIZE;

  const farFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(GRID_CONFIG.farFloorSize, GRID_CONFIG.farFloorSize),
    new THREE.MeshStandardMaterial({
      color: GRID_CONFIG.farFloorColor,
      emissive: GRID_CONFIG.farFloorEmissive,
      emissiveIntensity: GRID_CONFIG.farFloorEmissiveIntensity,
      roughness: GRID_CONFIG.farFloorRoughness,
      metalness: GRID_CONFIG.farFloorMetalness,
    })
  );
  farFloor.rotation.x = -Math.PI * 0.5;
  farFloor.position.y = FLOOR_Y;
  farFloor.receiveShadow = true;
  gridRoot.add(farFloor);

  const platform = new THREE.Mesh(
    new THREE.BoxGeometry(
      extendedGridWorldSize + GRID_CONFIG.platformPadding,
      PLATFORM_HEIGHT,
      extendedGridWorldSize + GRID_CONFIG.platformPadding
    ),
    new THREE.MeshStandardMaterial({
      color: GRID_CONFIG.platformColor,
      emissive: GRID_CONFIG.platformEmissive,
      emissiveIntensity: GRID_CONFIG.platformEmissiveIntensity,
      roughness: GRID_CONFIG.platformRoughness,
      metalness: GRID_CONFIG.platformMetalness,
    })
  );
  platform.position.y = FLOOR_Y - (PLATFORM_HEIGHT / 2) - GRID_CONFIG.platformSink;
  platform.receiveShadow = true;
  gridRoot.add(platform);

  const half = (GRID_SIZE * CELL_SIZE) / 2;
  const altitudeObstacles = [];
  const rampObstacles = [];
  const rampTopSurfaces = [];
  const editorRaycastTargets = [];
  const decorativeObstacles = [];
  const buildRaycastObstacleBox = new THREE.Box3();
  const buildRaycastHitPoint = new THREE.Vector3();
  const buildRaycastBestPoint = new THREE.Vector3();
  const buildRaycastRampHitPoint = new THREE.Vector3();
  const wallAnchorRaycastBestPoint = new THREE.Vector3();
  const wallAnchorRaycastBestNormal = new THREE.Vector3();
  const tempDecorationBounds = new THREE.Box3();
  const tempDecorationRemovalBounds = new THREE.Box3();
  const tempDecorativeObstacleSize = new THREE.Vector3();
  const tempDecorativeObstacleCenter = new THREE.Vector3();
  const staticBatchInstanceMatrix = new THREE.Matrix4();
  const staticBatchPartMatrix = new THREE.Matrix4();
  const staticBatchQuaternion = new THREE.Quaternion();
  const staticBatchScale = new THREE.Vector3(1, 1, 1);
  const staticBatchPosition = new THREE.Vector3();
  const staticVisualRoot = new THREE.Group();
  staticVisualRoot.name = "GridStaticVisualRoot";
  gridRoot.add(staticVisualRoot);

  const ramps = Array.isArray(levelLayout.ramps) ? levelLayout.ramps : [];
  const wallVoxels = Array.isArray(levelLayout.wallVoxels) ? levelLayout.wallVoxels : [];
  const wallVoxelKeySet = new Set(
    wallVoxels
      .map((voxel) => `${Number(voxel?.x)},${Number(voxel?.y)},${Number(voxel?.z)}`)
  );
  const decorativeObjects = Array.isArray(levelLayout.decorativeObjects) ? levelLayout.decorativeObjects : [];
  const decorativeEntries = [];
  const decorativeEntriesByChunk = new Map();
  const decorativeChunkGroups = new Map();
  const staticVisualChunkKeys = new Set();
  const staticBatchStats = {
    mergedMeshCount: 0,
    staticChunkCount: 0,
    decorativeChunkCount: 0,
  };

  function createDecorativeObstacleFromBounds(type, bounds) {
    const collision = getDecorativeModelSpec(type)?.collision;
    const blocksPlayer = collision?.blocksPlayer === true;
    const blocksProjectiles = collision?.blocksProjectiles === true;
    if (!bounds || (!blocksPlayer && !blocksProjectiles)) {
      return null;
    }
    bounds.getSize(tempDecorativeObstacleSize);
    if (
      tempDecorativeObstacleSize.x <= GRID_CONFIG.rayParallelEpsilon
      || tempDecorativeObstacleSize.y <= GRID_CONFIG.rayParallelEpsilon
      || tempDecorativeObstacleSize.z <= GRID_CONFIG.rayParallelEpsilon
    ) {
      return null;
    }
    bounds.getCenter(tempDecorativeObstacleCenter);
    return {
      kind: "decorative",
      decorativeType: type,
      position: new THREE.Vector3(
        tempDecorativeObstacleCenter.x,
        bounds.min.y,
        tempDecorativeObstacleCenter.z
      ),
      halfSizeX: tempDecorativeObstacleSize.x * 0.5,
      halfSizeZ: tempDecorativeObstacleSize.z * 0.5,
      height: tempDecorativeObstacleSize.y,
      baseY: bounds.min.y,
      collidesWithPlayer: blocksPlayer,
      supportsPlayer: collision?.supportsPlayer !== false,
      blocksProjectiles,
    };
  }

  function getChunkKeyFromWorld(worldX, worldZ) {
    const cellX = Math.max(0, Math.min(GRID_SIZE - 1, Math.floor((worldX + half) / CELL_SIZE)));
    const cellZ = Math.max(0, Math.min(GRID_SIZE - 1, Math.floor((worldZ + half) / CELL_SIZE)));
    const chunkX = Math.floor(cellX / STATIC_VISUAL_CHUNK_SIZE);
    const chunkZ = Math.floor(cellZ / STATIC_VISUAL_CHUNK_SIZE);
    return `${chunkX},${chunkZ}`;
  }

  function getOrCreateChunkBuckets(map, chunkKey) {
    let buckets = map.get(chunkKey);
    if (!buckets) {
      buckets = new Map();
      map.set(chunkKey, buckets);
    }
    staticVisualChunkKeys.add(chunkKey);
    return buckets;
  }

  function addPreparedVisualPartsToBuckets(bucketMap, preparedVisual, instanceMatrix, bucketPrefix) {
    if (!preparedVisual || !Array.isArray(preparedVisual.parts) || preparedVisual.parts.length === 0) {
      return;
    }
    for (const part of preparedVisual.parts) {
      if (!part?.geometry || !part?.material || !part?.matrix) {
        continue;
      }
      const bucketKey = `${bucketPrefix}:${part.key}:${part.material.uuid}`;
      let bucket = bucketMap.get(bucketKey);
      if (!bucket) {
        bucket = {
          material: part.material,
          castShadow: part.castShadow === true,
          receiveShadow: part.receiveShadow === true,
          geometries: [],
        };
        bucketMap.set(bucketKey, bucket);
      }
      const geometry = part.geometry.clone();
      staticBatchPartMatrix.multiplyMatrices(instanceMatrix, part.matrix);
      geometry.applyMatrix4(staticBatchPartMatrix);
      bucket.geometries.push(geometry);
    }
  }

  function createMergedMeshesFromBuckets(bucketMap, parentGroup) {
    let createdMeshes = 0;
    for (const bucket of bucketMap.values()) {
      if (!bucket || !Array.isArray(bucket.geometries) || bucket.geometries.length === 0) {
        continue;
      }
      const mergedGeometry = mergeGeometries(bucket.geometries, false);
      for (const geometry of bucket.geometries) {
        geometry.dispose();
      }
      bucket.geometries.length = 0;
      if (!mergedGeometry) {
        continue;
      }
      const mesh = new THREE.Mesh(mergedGeometry, bucket.material);
      mesh.castShadow = bucket.castShadow;
      mesh.receiveShadow = bucket.receiveShadow;
      parentGroup.add(mesh);
      createdMeshes += 1;
    }
    return createdMeshes;
  }

  function rebuildDecorativeChunk(chunkKey) {
    const existingGroup = decorativeChunkGroups.get(chunkKey);
    if (existingGroup) {
      disposeMeshGroupResources(existingGroup, shouldDisposeGridResource);
      if (existingGroup.parent) {
        existingGroup.parent.remove(existingGroup);
      }
      decorativeChunkGroups.delete(chunkKey);
    }
    const entries = decorativeEntriesByChunk.get(chunkKey) ?? [];
    if (editorMode || entries.length === 0) {
      return;
    }
    const bucketMap = new Map();
    for (const entry of entries) {
      if (!entry?.bounds || entry.removed === true) {
        continue;
      }
      const preparedVisual = getPreparedDecorationBatchParts(entry.type);
      if (!preparedVisual) {
        continue;
      }
      staticBatchQuaternion.setFromAxisAngle(
        new THREE.Vector3(0, 1, 0),
        THREE.MathUtils.degToRad(Number(entry.rotation) || 0)
      );
      staticBatchPosition.set(entry.position.x, entry.position.y, entry.position.z);
      staticBatchInstanceMatrix.compose(staticBatchPosition, staticBatchQuaternion, staticBatchScale);
      addPreparedVisualPartsToBuckets(bucketMap, preparedVisual, staticBatchInstanceMatrix, `decor:${entry.type}`);
    }
    if (bucketMap.size === 0) {
      staticBatchStats.mergedMeshCount = staticVisualRoot.children.reduce(
        (count, child) => count + (child?.isMesh ? 1 : 0),
        0
      );
      staticBatchStats.decorativeChunkCount = decorativeChunkGroups.size;
      staticBatchStats.staticChunkCount = staticVisualChunkKeys.size;
      return;
    }
    const chunkGroup = new THREE.Group();
    chunkGroup.name = `DecorationChunk:${chunkKey}`;
    createMergedMeshesFromBuckets(bucketMap, chunkGroup);
    staticVisualRoot.add(chunkGroup);
    decorativeChunkGroups.set(chunkKey, chunkGroup);
  }

  function refreshStaticBatchStats() {
    let mergedMeshCount = 0;
    const activeChunkKeys = new Set([
      ...terrainChunkBuckets.keys(),
      ...rampChunkBuckets.keys(),
      ...decorativeChunkGroups.keys(),
    ]);
    staticVisualRoot.traverse((child) => {
      if (child?.isMesh) {
        mergedMeshCount += 1;
      }
    });
    staticBatchStats.mergedMeshCount = mergedMeshCount;
    staticBatchStats.decorativeChunkCount = decorativeChunkGroups.size;
    staticBatchStats.staticChunkCount = activeChunkKeys.size;
  }

  const altitudeCubeGeo = new THREE.BoxGeometry(
    ALTITUDE_CUBE_SIZE,
    ALTITUDE_CUBE_SIZE,
    ALTITUDE_CUBE_SIZE
  );
  const terrainChunkBuckets = new Map();
  const rampChunkBuckets = new Map();

  for (const voxel of wallVoxels) {
    const cellX = Number(voxel?.x);
    const cellY = Number(voxel?.y);
    const cellZ = Number(voxel?.z);
    if (!Number.isInteger(cellX) || !Number.isInteger(cellY) || !Number.isInteger(cellZ)) {
      continue;
    }

    const checkerOffset = ((cellX + cellZ) & 1) === 0
      ? GRID_CONFIG.checkerLightnessOffset
      : -GRID_CONFIG.checkerLightnessOffset;
    const worldX = -half + cellX * CELL_SIZE + CELL_SIZE / 2;
    const worldZ = -half + cellZ * CELL_SIZE + CELL_SIZE / 2;
    const baseY = FLOOR_Y + (cellY * ALTITUDE_CUBE_SIZE);
    const rampCellData = getRampCellData(cellX, cellZ);
    const isUnderRampCell = !!rampCellData;

    altitudeObstacles.push({
      position: new THREE.Vector3(worldX, baseY, worldZ),
      halfSize: TERRAIN_OBSTACLE_HALF_SIZE,
      halfSizeX: TERRAIN_OBSTACLE_HALF_SIZE,
      halfSizeZ: TERRAIN_OBSTACLE_HALF_SIZE,
      height: ALTITUDE_CUBE_SIZE,
      baseY,
      cellX,
      cellY,
      cellZ,
      // Terrain tops should remain continuously walkable across adjacent cells.
      topInsetFromRadius: 0,
      // Support walls that live under ramp cells should stay solid, but the ramp
      // remains the only walkable top surface for traversal onto that cell.
      supportsPlayer: !isUnderRampCell,
    });

    const lightness = GRID_CONFIG.altitudeBaseLightness
      + checkerOffset
      + cellY * GRID_CONFIG.altitudePerLevelLightnessStep;
    const color = new THREE.Color().setHSL(
      GRID_CONFIG.altitudeHue,
      GRID_CONFIG.altitudeSaturation,
      lightness
    );
    const cube = new THREE.Mesh(
      altitudeCubeGeo,
      new THREE.MeshStandardMaterial({
        color,
        emissive: color.clone().multiplyScalar(GRID_CONFIG.altitudeEmissiveScale),
        emissiveIntensity: GRID_CONFIG.altitudeEmissiveIntensity,
        roughness: GRID_CONFIG.altitudeRoughness,
        metalness: GRID_CONFIG.altitudeMetalness,
      })
    );

    cube.position.set(
      worldX,
      baseY + (ALTITUDE_CUBE_SIZE * 0.5),
      worldZ
    );
    cube.castShadow = true;
    cube.receiveShadow = true;
    cube.userData.editorObjectType = "wall";
    cube.userData.editorWall = { x: cellX, y: cellY, z: cellZ };
    const addBottomCap = !wallVoxelKeySet.has(`${cellX},${cellY - 1},${cellZ}`);
    const terrainPreparedVisual = getPreparedTerrainWallBatchParts({ addBottomCap });
    if (terrainPreparedVisual) {
      cube.material.visible = false;
      cube.castShadow = false;
      cube.receiveShadow = false;
      staticBatchPosition.set(worldX, baseY, worldZ);
      staticBatchQuaternion.identity();
      staticBatchInstanceMatrix.compose(staticBatchPosition, staticBatchQuaternion, staticBatchScale);
      addPreparedVisualPartsToBuckets(
        getOrCreateChunkBuckets(terrainChunkBuckets, getChunkKeyFromWorld(worldX, worldZ)),
        terrainPreparedVisual,
        staticBatchInstanceMatrix,
        `terrain:${addBottomCap ? "cap" : "plain"}`
      );
    }
    editorRaycastTargets.push(cube);
    gridRoot.add(cube);
  }

  for (const decoration of decorativeObjects) {
    const worldX = Number(decoration?.position?.x);
    const worldY = Number(decoration?.position?.y);
    const worldZ = Number(decoration?.position?.z);
    if (!Number.isFinite(worldX) || !Number.isFinite(worldY) || !Number.isFinite(worldZ)) {
      continue;
    }
    const normalizedRotation = Number(decoration.rotation) || 0;
    if (editorMode) {
      const decorationVisual = createDecorationVisual(decoration.type);
      if (!decorationVisual) {
        continue;
      }
      decorationVisual.position.set(worldX, worldY, worldZ);
      decorationVisual.rotation.y = THREE.MathUtils.degToRad(normalizedRotation);
      decorationVisual.userData.editorObjectType = decoration.type;
      decorationVisual.userData.editorDecoration = {
        type: decoration.type,
        position: clonePosition(decoration.position),
        rotation: normalizedRotation,
      };
      tempDecorationBounds.setFromObject(decorationVisual);
      decorativeEntries.push({
        type: decoration.type,
        position: clonePosition(decoration.position),
        rotation: normalizedRotation,
        mesh: decorationVisual,
        bounds: tempDecorationBounds.clone(),
        collisionObstacle: createDecorativeObstacleFromBounds(decoration.type, tempDecorationBounds),
      });
      const collisionObstacle = decorativeEntries[decorativeEntries.length - 1]?.collisionObstacle ?? null;
      if (collisionObstacle) {
        decorativeObstacles.push(collisionObstacle);
      }
      editorRaycastTargets.push(decorationVisual);
      gridRoot.add(decorationVisual);
      continue;
    }
    const preparedDecoration = getPreparedDecorationBatchParts(decoration.type);
    if (!preparedDecoration) {
      continue;
    }
    staticBatchQuaternion.setFromAxisAngle(
      new THREE.Vector3(0, 1, 0),
      THREE.MathUtils.degToRad(normalizedRotation)
    );
    staticBatchPosition.set(worldX, worldY, worldZ);
    staticBatchInstanceMatrix.compose(staticBatchPosition, staticBatchQuaternion, staticBatchScale);
    tempDecorationBounds.copy(preparedDecoration.bounds).applyMatrix4(staticBatchInstanceMatrix);
    const chunkKey = getChunkKeyFromWorld(worldX, worldZ);
    const entry = {
      type: decoration.type,
      position: clonePosition(decoration.position),
      rotation: normalizedRotation,
      mesh: null,
      bounds: tempDecorationBounds.clone(),
      collisionObstacle: createDecorativeObstacleFromBounds(decoration.type, tempDecorationBounds),
      chunkKey,
      removed: false,
    };
    decorativeEntries.push(entry);
    if (entry.collisionObstacle) {
      decorativeObstacles.push(entry.collisionObstacle);
    }
    let chunkEntries = decorativeEntriesByChunk.get(chunkKey);
    if (!chunkEntries) {
      chunkEntries = [];
      decorativeEntriesByChunk.set(chunkKey, chunkEntries);
    }
    chunkEntries.push(entry);
    staticVisualChunkKeys.add(chunkKey);
  }

  const rampHighEdgeCounts = new Map();
  for (const ramp of ramps) {
    const edgeKey = getRampHighEdgeKey(ramp);
    rampHighEdgeCounts.set(edgeKey, (rampHighEdgeCounts.get(edgeKey) ?? 0) + 1);
  }

  const rampGeometryWithHighCap = createRampWedgeGeometry(
    CELL_SIZE * 2,
    ALTITUDE_CUBE_SIZE,
    CELL_SIZE,
    { includeBottom: false, includeHighFace: true }
  );
  const rampGeometryWithoutHighCap = createRampWedgeGeometry(
    CELL_SIZE * 2,
    ALTITUDE_CUBE_SIZE,
    CELL_SIZE,
    { includeBottom: false, includeHighFace: false }
  );
  const rampMaterial = new THREE.MeshStandardMaterial({
    color: 0x6b8ea6,
    emissive: 0x27465a,
    emissiveIntensity: 0.2,
    roughness: GRID_CONFIG.altitudeRoughness,
    metalness: GRID_CONFIG.altitudeMetalness,
  });

  for (const ramp of ramps) {
    const lowCellCenter = cellToWorld(ramp.lowCell.x, ramp.lowCell.z, FLOOR_Y);
    const highCellCenter = cellToWorld(ramp.highCell.x, ramp.highCell.z, FLOOR_Y);
    const lowY = FLOOR_Y + (ramp.lowLevel * ALTITUDE_CUBE_SIZE);
    const highY = FLOOR_Y + (ramp.highLevel * ALTITUDE_CUBE_SIZE);
    const centerX = (lowCellCenter.x + highCellCenter.x) * 0.5;
    const centerZ = (lowCellCenter.z + highCellCenter.z) * 0.5;

    const highEdgeKey = getRampHighEdgeKey(ramp);
    const hasSharedHighEdge = (rampHighEdgeCounts.get(highEdgeKey) ?? 0) > 1;
    const rampMesh = new THREE.Mesh(
      hasSharedHighEdge ? rampGeometryWithoutHighCap : rampGeometryWithHighCap,
      rampMaterial.clone()
    );
    rampMesh.position.set(centerX, lowY, centerZ);
    rampMesh.rotation.y = THREE.MathUtils.degToRad(ramp.rotation);
    rampMesh.castShadow = true;
    rampMesh.receiveShadow = true;
    rampMesh.userData.isRamp = true;
    rampMesh.userData.rampId = ramp.id;
    rampMesh.userData.editorObjectType = "ramp";
    rampMesh.userData.editorRamp = {
      x: ramp.lowCell.x,
      y: ramp.lowLevel,
      z: ramp.lowCell.z,
      rotation: ramp.rotation,
    };
    const rampPreparedVisual = getPreparedRampBatchParts();
    if (rampPreparedVisual) {
      rampMesh.material.visible = false;
      rampMesh.castShadow = false;
      rampMesh.receiveShadow = false;
      staticBatchPosition.set(centerX, lowY, centerZ);
      staticBatchQuaternion.setFromAxisAngle(
        new THREE.Vector3(0, 1, 0),
        THREE.MathUtils.degToRad(ramp.rotation)
      );
      staticBatchInstanceMatrix.compose(staticBatchPosition, staticBatchQuaternion, staticBatchScale);
      addPreparedVisualPartsToBuckets(
        getOrCreateChunkBuckets(rampChunkBuckets, getChunkKeyFromWorld(centerX, centerZ)),
        rampPreparedVisual,
        staticBatchInstanceMatrix,
        "ramp:base"
      );
    }
    editorRaycastTargets.push(rampMesh);
    gridRoot.add(rampMesh);

    const rampDirectionWorld = new THREE.Vector2(ramp.direction.x, ramp.direction.z).normalize();
    const rampRightWorld = new THREE.Vector2(-rampDirectionWorld.y, rampDirectionWorld.x);

    const lowEdgeCenterX = lowCellCenter.x - (rampDirectionWorld.x * CELL_SIZE * 0.5);
    const lowEdgeCenterZ = lowCellCenter.z - (rampDirectionWorld.y * CELL_SIZE * 0.5);
    const highEdgeCenterX = highCellCenter.x + (rampDirectionWorld.x * CELL_SIZE * 0.5);
    const highEdgeCenterZ = highCellCenter.z + (rampDirectionWorld.y * CELL_SIZE * 0.5);

    const topA = new THREE.Vector3(
      lowEdgeCenterX - (rampRightWorld.x * CELL_SIZE * 0.5),
      lowY,
      lowEdgeCenterZ - (rampRightWorld.y * CELL_SIZE * 0.5)
    );
    const topB = new THREE.Vector3(
      lowEdgeCenterX + (rampRightWorld.x * CELL_SIZE * 0.5),
      lowY,
      lowEdgeCenterZ + (rampRightWorld.y * CELL_SIZE * 0.5)
    );
    const landingStartCenterX = lowCellCenter.x + (rampDirectionWorld.x * CELL_SIZE);
    const landingStartCenterZ = lowCellCenter.z + (rampDirectionWorld.y * CELL_SIZE);
    const landingStartA = new THREE.Vector3(
      landingStartCenterX - (rampRightWorld.x * CELL_SIZE * 0.5),
      highY,
      landingStartCenterZ - (rampRightWorld.y * CELL_SIZE * 0.5)
    );
    const landingStartB = new THREE.Vector3(
      landingStartCenterX + (rampRightWorld.x * CELL_SIZE * 0.5),
      highY,
      landingStartCenterZ + (rampRightWorld.y * CELL_SIZE * 0.5)
    );
    const topC = new THREE.Vector3(
      highEdgeCenterX + (rampRightWorld.x * CELL_SIZE * 0.5),
      highY,
      highEdgeCenterZ + (rampRightWorld.y * CELL_SIZE * 0.5)
    );
    const topD = new THREE.Vector3(
      highEdgeCenterX - (rampRightWorld.x * CELL_SIZE * 0.5),
      highY,
      highEdgeCenterZ - (rampRightWorld.y * CELL_SIZE * 0.5)
    );

    const rampHalfSizeX = Math.abs(ramp.direction.x) > 0 ? CELL_SIZE : CELL_SIZE * 0.5;
    const rampHalfSizeZ = Math.abs(ramp.direction.z) > 0 ? CELL_SIZE : CELL_SIZE * 0.5;
    const rampAcrossMax = CELL_SIZE * 0.5;
    const rampSurfaceMinY = lowY;
    const rampSurfaceMaxY = highY;

    const getRampSurfaceYAtWorld = (worldX, worldZ) => {
      const deltaX = worldX - lowCellCenter.x;
      const deltaZ = worldZ - lowCellCenter.z;
      const along = (deltaX * rampDirectionWorld.x) + (deltaZ * rampDirectionWorld.y);
      const across = (deltaX * rampRightWorld.x) + (deltaZ * rampRightWorld.y);
      if (along < RAMP_SURFACE_ALONG_MIN || along > RAMP_SURFACE_ALONG_MAX || Math.abs(across) > rampAcrossMax) {
        return null;
      }
      return getRampSurfaceYForAlong(rampSurfaceMinY, rampSurfaceMaxY, along);
    };

    rampTopSurfaces.push({
      triangles: [
        [topA, topB, landingStartB],
        [topA, landingStartB, landingStartA],
        [landingStartA, landingStartB, topC],
        [landingStartA, topC, topD],
      ],
    });

    rampObstacles.push({
      kind: "ramp",
      mesh: rampMesh,
      position: new THREE.Vector3(centerX, lowY + (ALTITUDE_CUBE_SIZE * 0.5), centerZ),
      baseY: lowY,
      height: ALTITUDE_CUBE_SIZE,
      halfSize: Math.max(rampHalfSizeX, rampHalfSizeZ),
      halfSizeX: rampHalfSizeX,
      halfSizeZ: rampHalfSizeZ,
      rampId: ramp.id,
      lowCell: cloneCell(ramp.lowCell),
      highCell: cloneCell(ramp.highCell),
      direction: cloneDirection(ramp.direction),
      lowLevel: ramp.lowLevel,
      highLevel: ramp.highLevel,
      getSurfaceYAtWorld: getRampSurfaceYAtWorld,
    });
  }

  for (const bucketMap of terrainChunkBuckets.values()) {
    staticBatchStats.mergedMeshCount += createMergedMeshesFromBuckets(bucketMap, staticVisualRoot);
  }
  for (const bucketMap of rampChunkBuckets.values()) {
    staticBatchStats.mergedMeshCount += createMergedMeshesFromBuckets(bucketMap, staticVisualRoot);
  }
  for (const chunkKey of decorativeEntriesByChunk.keys()) {
    rebuildDecorativeChunk(chunkKey);
  }
  refreshStaticBatchStats();

  function getRampSurfaceYAtWorld(worldX, worldZ) {
    for (const rampObstacle of rampObstacles) {
      const rampSurfaceY = rampObstacle.getSurfaceYAtWorld(worldX, worldZ);
      if (Number.isFinite(rampSurfaceY)) {
        return rampSurfaceY;
      }
    }
    return null;
  }

  const tileGeo = new THREE.BoxGeometry(
    CELL_SIZE * GRID_CONFIG.pathTileScale,
    TILE_HEIGHT,
    CELL_SIZE * GRID_CONFIG.pathTileScale
  );
  const pathTileMat = new THREE.MeshStandardMaterial({
    color: GRID_CONFIG.pathTileColor,
    roughness: GRID_CONFIG.pathTileRoughness,
    metalness: GRID_CONFIG.pathTileMetalness,
  });

  const tiles = [];
  for (let cellZ = 0; cellZ < GRID_SIZE; cellZ += 1) {
    for (let cellX = 0; cellX < GRID_SIZE; cellX += 1) {
      const marker = getCellMarker(cellX, cellZ);
      if (!LEGACY_PATH_MARKERS.has(marker)) {
        continue;
      }

      const tile = new THREE.Mesh(tileGeo, pathTileMat);
      tile.position.set(
        -half + cellX * CELL_SIZE + CELL_SIZE / 2,
        getCellSurfaceY(cellX, cellZ) + (TILE_HEIGHT * 0.5),
        -half + cellZ * CELL_SIZE + CELL_SIZE / 2
      );
      tile.userData.cellX = cellX;
      tile.userData.cellZ = cellZ;
      tile.userData.isPath = true;
      tile.userData.pathSurfaceY = tile.position.y + (TILE_HEIGHT * 0.5);
      tile.receiveShadow = true;
      tile.castShadow = true;
      tiles.push(tile);
      gridRoot.add(tile);
    }
  }

  const endpointGeo = new THREE.BoxGeometry(CELL_SIZE, CELL_SIZE, CELL_SIZE);
  const spawnMat = new THREE.MeshStandardMaterial({
    color: 0x55f2a3,
    emissive: 0x1e6d4a,
    emissiveIntensity: 0.5,
    roughness: 0.5,
    metalness: 0.15,
  });
  const endMat = new THREE.MeshStandardMaterial({
    color: 0xff8f74,
    emissive: 0x6d2c1e,
    emissiveIntensity: 0.52,
    roughness: 0.5,
    metalness: 0.15,
  });

  const spawnCells = levelLayout.spawnCells.map((cell) => cloneCell(cell));
  const endCell = cloneCell(levelLayout.endCell);
  const playerSpawnCell = cloneCell(levelLayout.playerSpawnCell);
  const playerSpawnRotation = Number.isFinite(Number(levelLayout.playerSpawnRotation))
    ? Number(levelLayout.playerSpawnRotation)
    : 0;
  const spawnCellSet = new Set(spawnCells.map((cell) => cellKey(cell.x, cell.z)));
  const endCellKey = endCell ? cellKey(endCell.x, endCell.z) : null;
  const endpointObstacles = [];
  const endpointHalfSize = CELL_SIZE * 0.5;

  const spawnMarkers = [];
  for (const spawnCell of spawnCells) {
    const marker = new THREE.Mesh(endpointGeo, spawnMat);
    const spawnSurfaceY = FLOOR_Y + ((Number.isFinite(Number(spawnCell.y)) ? Number(spawnCell.y) : 0) * CELL_SIZE);
    const center = cellToWorld(spawnCell.x, spawnCell.z, spawnSurfaceY);
    marker.position.set(center.x, center.y + CELL_SIZE * 0.5, center.z);
    marker.castShadow = true;
    marker.receiveShadow = true;
    marker.userData.isEndpointMarker = true;
    marker.userData.endpointType = "spawn";
    marker.userData.cellX = spawnCell.x;
    marker.userData.cellY = spawnCell.y ?? 0;
    marker.userData.cellZ = spawnCell.z;
    marker.userData.editorObjectType = "spawn";
    marker.userData.editorMarker = {
      x: spawnCell.x,
      y: spawnCell.y ?? 0,
      z: spawnCell.z,
    };
    editorRaycastTargets.push(marker);
    gridRoot.add(marker);
    spawnMarkers.push(marker);
    endpointObstacles.push({
      mesh: marker,
      position: new THREE.Vector3(center.x, spawnSurfaceY, center.z),
      halfSize: endpointHalfSize,
      halfSizeX: endpointHalfSize,
      halfSizeZ: endpointHalfSize,
      height: CELL_SIZE,
      baseY: spawnSurfaceY,
      // Match terrain wall-block top-support behavior for player movement.
      topInsetFromRadius: 0,
    });
  }

  let endMarker = null;
  if (endCell) {
    endMarker = new THREE.Mesh(endpointGeo, endMat);
    const endSurfaceY = FLOOR_Y + ((Number.isFinite(Number(endCell.y)) ? Number(endCell.y) : 0) * CELL_SIZE);
    const center = cellToWorld(endCell.x, endCell.z, endSurfaceY);
    endMarker.position.set(center.x, center.y + CELL_SIZE * 0.5, center.z);
    endMarker.castShadow = true;
    endMarker.receiveShadow = true;
    endMarker.userData.isEndpointMarker = true;
    endMarker.userData.endpointType = "end";
    endMarker.userData.cellX = endCell.x;
    endMarker.userData.cellY = endCell.y ?? 0;
    endMarker.userData.cellZ = endCell.z;
    endMarker.userData.editorObjectType = "end";
    endMarker.userData.editorMarker = {
      x: endCell.x,
      y: endCell.y ?? 0,
      z: endCell.z,
    };
    editorRaycastTargets.push(endMarker);
    gridRoot.add(endMarker);
    endpointObstacles.push({
      mesh: endMarker,
      position: new THREE.Vector3(center.x, endSurfaceY, center.z),
      halfSize: endpointHalfSize,
      halfSizeX: endpointHalfSize,
      halfSizeZ: endpointHalfSize,
      height: CELL_SIZE,
      baseY: endSurfaceY,
      // Match terrain wall-block top-support behavior for player movement.
      topInsetFromRadius: 0,
    });
  }

  let playerSpawnMarker = null;
  if (playerSpawnCell && editorMode) {
    const playerSpawnArrowGeometry = new THREE.ConeGeometry(CELL_SIZE * 0.12, CELL_SIZE * 0.34, 12);
    playerSpawnArrowGeometry.rotateX(Math.PI * 0.5);
    const playerSpawnMat = new THREE.MeshStandardMaterial({
      color: 0x60ff7f,
      emissive: 0x1d6231,
      emissiveIntensity: 0.45,
      roughness: 0.5,
      metalness: 0.1,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    });
    playerSpawnMarker = new THREE.Mesh(endpointGeo, playerSpawnMat);
    const playerSpawnSurfaceY = FLOOR_Y
      + ((Number.isFinite(Number(playerSpawnCell.y)) ? Number(playerSpawnCell.y) : 0) * CELL_SIZE);
    const playerSpawnCenter = cellToWorld(playerSpawnCell.x, playerSpawnCell.z, playerSpawnSurfaceY);
    playerSpawnMarker.position.set(
      playerSpawnCenter.x,
      playerSpawnCenter.y + CELL_SIZE * 0.5,
      playerSpawnCenter.z
    );
    playerSpawnMarker.rotation.y = THREE.MathUtils.degToRad(playerSpawnRotation);
    playerSpawnMarker.castShadow = true;
    playerSpawnMarker.receiveShadow = true;
    const playerSpawnArrow = new THREE.Mesh(
      playerSpawnArrowGeometry,
      new THREE.MeshStandardMaterial({
        color: 0xa4ffbb,
        emissive: 0x2c8744,
        emissiveIntensity: 0.7,
        roughness: 0.4,
        metalness: 0.08,
      })
    );
    playerSpawnArrow.position.set(0, CELL_SIZE * 0.64, 0);
    playerSpawnArrow.castShadow = false;
    playerSpawnArrow.receiveShadow = false;
    playerSpawnMarker.add(playerSpawnArrow);
    playerSpawnMarker.userData.editorObjectType = "playerSpawn";
    playerSpawnMarker.userData.editorMarker = {
      x: playerSpawnCell.x,
      y: playerSpawnCell.y ?? 0,
      z: playerSpawnCell.z,
      rotation: playerSpawnRotation,
    };
    editorRaycastTargets.push(playerSpawnMarker);
    gridRoot.add(playerSpawnMarker);
  }

  const moveInset = CELL_SIZE * GRID_CONFIG.moveInsetCellScale;
  const levelBounds = {
    minX: -half,
    maxX: half,
    minZ: -half,
    maxZ: half,
  };
  const moveBounds = {
    minX: levelBounds.minX + moveInset,
    maxX: levelBounds.maxX - moveInset,
    minZ: levelBounds.minZ + moveInset,
    maxZ: levelBounds.maxZ - moveInset,
  };

  const boundaryWallConfigRaw = GRID_CONFIG.boundaryWall ?? {};
  const boundaryWallConfig = {
    enabled: boundaryWallConfigRaw.enabled !== false,
    color: Number.isFinite(Number(boundaryWallConfigRaw.color))
      ? Number(boundaryWallConfigRaw.color)
      : 0x7edbff,
    maxOpacity: saturate(finiteOrFallback(boundaryWallConfigRaw.maxOpacity, 0.22)),
    revealDistance: Math.max(0.001, finiteOrFallback(boundaryWallConfigRaw.revealDistance, CELL_SIZE * 1.5)),
    fullOpacityDistance: Math.max(0, finiteOrFallback(boundaryWallConfigRaw.fullOpacityDistance, CELL_SIZE * 0.375)),
    diameter: Math.max(
      CELL_SIZE * 0.5,
      finiteOrFallback(boundaryWallConfigRaw.diameter ?? boundaryWallConfigRaw.patchWidth, CELL_SIZE * 2.75)
    ),
    lineSpacing: Math.max(0.25, finiteOrFallback(boundaryWallConfigRaw.lineSpacing, CELL_SIZE * 0.225)),
    lineThickness: Math.max(0.01, finiteOrFallback(boundaryWallConfigRaw.lineThickness, 0.1)),
    inset: Math.max(0, finiteOrFallback(boundaryWallConfigRaw.inset, 0.02)),
    baseYOffset: finiteOrFallback(boundaryWallConfigRaw.baseYOffset, 0),
  };
  boundaryWallConfig.fullOpacityDistance = Math.min(
    boundaryWallConfig.fullOpacityDistance,
    boundaryWallConfig.revealDistance
  );
  boundaryWallConfig.patchFeather = Math.max(
    0.01,
    finiteOrFallback(boundaryWallConfigRaw.patchFeather, Math.max(0.1, boundaryWallConfig.lineSpacing))
  );

  const boundaryWallGroup = new THREE.Group();
  boundaryWallGroup.name = "BoundaryWallGroup";
  boundaryWallGroup.visible = false;
  gridRoot.add(boundaryWallGroup);

  const boundaryWallEntries = [];
  const boundaryWallColor = new THREE.Color(boundaryWallConfig.color);

  const BOUNDARY_WALL_VERTEX_SHADER = `
    varying vec3 vWorldPos;

    void main() {
      vec4 worldPos = modelMatrix * vec4(position, 1.0);
      vWorldPos = worldPos.xyz;
      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `;

  const BOUNDARY_WALL_FRAGMENT_SHADER = `
    uniform vec3 uColor;
    uniform float uOpacity;
    uniform float uRevealCenterAlong;
    uniform float uRevealCenterY;
    uniform float uRevealRadius;
    uniform float uRevealFeather;
    uniform float uAxisIsX;
    varying vec3 vWorldPos;

    void main() {
      float alongCoord = mix(vWorldPos.z, vWorldPos.x, uAxisIsX);
      float deltaAlong = alongCoord - uRevealCenterAlong;
      float deltaY = vWorldPos.y - uRevealCenterY;
      float distanceToCenter = length(vec2(deltaAlong, deltaY));
      float feather = max(0.0001, min(uRevealFeather, uRevealRadius));
      float innerRadius = max(0.0, uRevealRadius - feather);
      float revealMask = 1.0 - smoothstep(innerRadius, uRevealRadius, distanceToCenter);
      float alpha = uOpacity * revealMask;
      if (alpha <= 0.0005) {
        discard;
      }
      gl_FragColor = vec4(uColor, alpha);
    }
  `;

  function appendQuadTriangles(positionArray, a, b, c, d) {
    positionArray.push(
      a.x, a.y, a.z,
      b.x, b.y, b.z,
      d.x, d.y, d.z,
      b.x, b.y, b.z,
      c.x, c.y, c.z,
      d.x, d.y, d.z
    );
  }

  function createBoundaryGridGeometry(width, height, spacing, thickness) {
    const lineCountX = Math.max(1, Math.round(width / spacing));
    const lineCountY = Math.max(1, Math.round(height / spacing));
    const halfWidth = width * 0.5;
    const halfThickness = Math.max(0.001, thickness * 0.5);
    const positions = [];
    const pointA = new THREE.Vector3();
    const pointB = new THREE.Vector3();
    const pointC = new THREE.Vector3();
    const pointD = new THREE.Vector3();

    for (let xIndex = 0; xIndex <= lineCountX; xIndex += 1) {
      const t = xIndex / lineCountX;
      const x = -halfWidth + (t * width);
      const left = Math.max(-halfWidth, x - halfThickness);
      const right = Math.min(halfWidth, x + halfThickness);
      if (right <= left) {
        continue;
      }
      pointA.set(left, 0, 0);
      pointB.set(left, height, 0);
      pointC.set(right, height, 0);
      pointD.set(right, 0, 0);
      appendQuadTriangles(positions, pointA, pointB, pointC, pointD);
    }

    for (let yIndex = 0; yIndex <= lineCountY; yIndex += 1) {
      const t = yIndex / lineCountY;
      const y = t * height;
      const bottom = Math.max(0, y - halfThickness);
      const top = Math.min(height, y + halfThickness);
      if (top <= bottom) {
        continue;
      }
      pointA.set(-halfWidth, bottom, 0);
      pointB.set(-halfWidth, top, 0);
      pointC.set(halfWidth, top, 0);
      pointD.set(halfWidth, bottom, 0);
      appendQuadTriangles(positions, pointA, pointB, pointC, pointD);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    return geometry;
  }

  function createBoundaryWallMaterial({
    alongAxis,
    revealRadius,
    revealFeather,
    initialRevealCenterAlong,
    initialRevealCenterY,
  }) {
    const uniforms = {
      uColor: { value: boundaryWallColor },
      uOpacity: { value: 0 },
      uRevealCenterAlong: { value: initialRevealCenterAlong },
      uRevealCenterY: { value: initialRevealCenterY },
      uRevealRadius: { value: revealRadius },
      uRevealFeather: { value: revealFeather },
      uAxisIsX: { value: alongAxis === "x" ? 1 : 0 },
    };
    const material = new THREE.ShaderMaterial({
      uniforms,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      side: THREE.DoubleSide,
      fog: false,
      vertexShader: BOUNDARY_WALL_VERTEX_SHADER,
      fragmentShader: BOUNDARY_WALL_FRAGMENT_SHADER,
    });
    material.toneMapped = false;
    return { material, uniforms };
  }

  function hideBoundaryWallVisual() {
    boundaryWallGroup.visible = false;
    for (const wall of boundaryWallEntries) {
      wall.mesh.visible = false;
      wall.uniforms.uOpacity.value = 0;
    }
  }

  if (boundaryWallConfig.enabled && boundaryWallConfig.maxOpacity > 0 && boundaryWallConfig.revealDistance > 0) {
    const boundsWidth = levelBounds.maxX - levelBounds.minX;
    const boundsDepth = levelBounds.maxZ - levelBounds.minZ;
    const maxInsetBySpan = Math.max(0, (Math.min(boundsWidth, boundsDepth) * 0.5) - 0.001);
    const safeInset = Math.min(boundaryWallConfig.inset, maxInsetBySpan);
    const wallMinX = levelBounds.minX + safeInset;
    const wallMaxX = levelBounds.maxX - safeInset;
    const wallMinZ = levelBounds.minZ + safeInset;
    const wallMaxZ = levelBounds.maxZ - safeInset;
    const wallBaseY = FLOOR_Y + boundaryWallConfig.baseYOffset;
    const maxTerrainTopY = [...altitudeObstacles, ...rampObstacles].reduce((maxTopY, obstacle) => {
      const obstacleHeight = Number(obstacle?.height);
      const obstacleBaseY = Number.isFinite(Number(obstacle?.baseY))
        ? Number(obstacle.baseY)
        : FLOOR_Y;
      if (!Number.isFinite(obstacleHeight) || obstacleHeight <= 0) {
        return maxTopY;
      }
      return Math.max(maxTopY, obstacleBaseY + obstacleHeight);
    }, FLOOR_Y);
    const playerConfig = GAME_CONFIG.player ?? {};
    const movementConfig = playerConfig.movement ?? {};
    const jetpackConfig = playerConfig.jetpack ?? {};
    const eyeHeightEstimate = Math.max(0, finiteOrFallback(GRID_CONFIG.eyeHeight, 1.7));
    const jumpVelocity = Math.max(0, finiteOrFallback(movementConfig.jumpVelocity, 0));
    const gravity = Math.max(0.001, finiteOrFallback(movementConfig.gravity, 24));
    const jumpRiseEstimate = (jumpVelocity * jumpVelocity) / (2 * gravity);
    const jetpackRiseEstimate = Math.max(0, finiteOrFallback(jetpackConfig.maxRiseSpeed, 0))
      * Math.max(0, finiteOrFallback(jetpackConfig.maxFuel, 0));
    const estimatedReachAboveFloor = eyeHeightEstimate + jumpRiseEstimate + jetpackRiseEstimate;
    const terrainHeightAboveFloor = Math.max(0, maxTerrainTopY - FLOOR_Y);
    const wallHeight = Math.max(
      CELL_SIZE * 3,
      terrainHeightAboveFloor + estimatedReachAboveFloor + (CELL_SIZE * 2)
    );
    const wallTopY = wallBaseY + wallHeight;
    const revealRadius = Math.max(0.25, boundaryWallConfig.diameter * 0.5);
    const revealFeather = Math.min(revealRadius, boundaryWallConfig.patchFeather);

    function createWallEntry({
      planeAxis,
      planeCoord,
      alongAxis,
      spanMin,
      spanMax,
      rotationY,
    }) {
      const spanLength = Math.max(0.001, spanMax - spanMin);
      const spanCenter = (spanMin + spanMax) * 0.5;
      const geometry = createBoundaryGridGeometry(
        spanLength,
        wallHeight,
        boundaryWallConfig.lineSpacing,
        boundaryWallConfig.lineThickness
      );
      const { material, uniforms } = createBoundaryWallMaterial({
        alongAxis,
        revealRadius,
        revealFeather,
        initialRevealCenterAlong: spanCenter,
        initialRevealCenterY: (wallBaseY + wallTopY) * 0.5,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.visible = false;
      mesh.position.y = wallBaseY;
      mesh.rotation.y = rotationY;
      if (planeAxis === "x") {
        mesh.position.x = planeCoord;
        mesh.position.z = spanCenter;
      } else {
        mesh.position.z = planeCoord;
        mesh.position.x = spanCenter;
      }
      boundaryWallGroup.add(mesh);

      return {
        mesh,
        uniforms,
        planeAxis,
        planeCoord,
        alongAxis,
        spanMin,
        spanMax,
        revealRadius,
        baseY: wallBaseY,
        topY: wallTopY,
      };
    }

    boundaryWallEntries.push(
      createWallEntry({
        planeAxis: "x",
        planeCoord: wallMinX,
        alongAxis: "z",
        spanMin: wallMinZ,
        spanMax: wallMaxZ,
        rotationY: Math.PI * 0.5,
      }),
      createWallEntry({
        planeAxis: "x",
        planeCoord: wallMaxX,
        alongAxis: "z",
        spanMin: wallMinZ,
        spanMax: wallMaxZ,
        rotationY: -Math.PI * 0.5,
      }),
      createWallEntry({
        planeAxis: "z",
        planeCoord: wallMinZ,
        alongAxis: "x",
        spanMin: wallMinX,
        spanMax: wallMaxX,
        rotationY: 0,
      }),
      createWallEntry({
        planeAxis: "z",
        planeCoord: wallMaxZ,
        alongAxis: "x",
        spanMin: wallMinX,
        spanMax: wallMaxX,
        rotationY: Math.PI,
      })
    );
  }

  function computeBoundaryRevealAlpha(distanceToPlane) {
    if (!Number.isFinite(distanceToPlane) || distanceToPlane > boundaryWallConfig.revealDistance) {
      return 0;
    }
    if (distanceToPlane <= boundaryWallConfig.fullOpacityDistance) {
      return boundaryWallConfig.maxOpacity;
    }

    const fadeSpan = boundaryWallConfig.revealDistance - boundaryWallConfig.fullOpacityDistance;
    if (fadeSpan <= 1e-6) {
      return boundaryWallConfig.maxOpacity;
    }

    const linearFade = 1 - (
      (distanceToPlane - boundaryWallConfig.fullOpacityDistance)
      / fadeSpan
    );
    return boundaryWallConfig.maxOpacity * smoothstep01(linearFade);
  }

  function updateBoundaryWallVisual(playerPosition) {
    if (!boundaryWallConfig.enabled || boundaryWallEntries.length === 0 || !playerPosition) {
      hideBoundaryWallVisual();
      return;
    }

    let anyVisible = false;

    for (const wall of boundaryWallEntries) {
      const planeCoordinate = wall.planeAxis === "x" ? playerPosition.x : playerPosition.z;
      const distanceToPlane = Math.abs(planeCoordinate - wall.planeCoord);
      let alpha = computeBoundaryRevealAlpha(distanceToPlane);
      if (alpha <= 0.0001) {
        wall.mesh.visible = false;
        wall.uniforms.uOpacity.value = 0;
        continue;
      }

      const revealCenterAlong = wall.alongAxis === "x"
        ? playerPosition.x
        : playerPosition.z;
      const revealCenterY = playerPosition.y;

      alpha = clamp(Math.max(0, alpha), 0, boundaryWallConfig.maxOpacity);
      wall.uniforms.uOpacity.value = alpha;
      wall.uniforms.uRevealCenterAlong.value = revealCenterAlong;
      wall.uniforms.uRevealCenterY.value = revealCenterY;
      wall.mesh.visible = alpha > 0.0001;
      anyVisible = anyVisible || wall.mesh.visible;
    }

    boundaryWallGroup.visible = anyVisible;
  }

  function worldToCell(worldX, worldZ) {
    const cx = Math.floor((worldX + half) / CELL_SIZE);
    const cz = Math.floor((worldZ + half) / CELL_SIZE);
    if (!isMainGridCell(cx, cz)) {
      return null;
    }
    return { x: cx, z: cz };
  }

  function isPathCell(cellX, cellZ) {
    return LEGACY_PATH_MARKERS.has(getCellMarker(cellX, cellZ));
  }

  function getBuildSurfaceYAtWorld(worldX, worldZ) {
    const cell = worldToCell(worldX, worldZ);
    if (!cell) {
      return FLOOR_Y;
    }
    const rampSurfaceY = getRampSurfaceYAtWorld(worldX, worldZ);
    if (Number.isFinite(rampSurfaceY)) {
      return rampSurfaceY;
    }
    return getCellSurfaceY(cell.x, cell.z);
  }

  function getSupportSurfaceYBelowWorld(worldX, worldY, worldZ) {
    const cell = worldToCell(worldX, worldZ);
    if (!cell) {
      return null;
    }

    const ceilingY = Number(worldY);
    const maxSurfaceY = Number.isFinite(ceilingY)
      ? (ceilingY + 1e-4)
      : Number.POSITIVE_INFINITY;
    let bestY = FLOOR_Y;

    for (const obstacle of altitudeObstacles) {
      const obstaclePos = obstacle?.position;
      const obstacleHalfSizeX = Number.isFinite(Number(obstacle?.halfSizeX))
        ? Number(obstacle.halfSizeX)
        : Number(obstacle?.halfSize);
      const obstacleHalfSizeZ = Number.isFinite(Number(obstacle?.halfSizeZ))
        ? Number(obstacle.halfSizeZ)
        : Number(obstacle?.halfSize);
      const obstacleHeight = Number(obstacle?.height);
      const obstacleBaseY = Number(obstacle?.baseY ?? 0);
      if (
        !obstaclePos
        || obstacle?.supportsPlayer === false
        || !Number.isFinite(obstacleHalfSizeX)
        || !Number.isFinite(obstacleHalfSizeZ)
        || !Number.isFinite(obstacleHeight)
        || obstacleHeight <= 0
      ) {
        continue;
      }
      if (
        worldX < (obstaclePos.x - obstacleHalfSizeX)
        || worldX > (obstaclePos.x + obstacleHalfSizeX)
        || worldZ < (obstaclePos.z - obstacleHalfSizeZ)
        || worldZ > (obstaclePos.z + obstacleHalfSizeZ)
      ) {
        continue;
      }
      const topY = obstacleBaseY + obstacleHeight;
      if (topY <= maxSurfaceY) {
        bestY = Math.max(bestY, topY);
      }
    }

    for (const rampObstacle of rampObstacles) {
      const rampSurfaceY = rampObstacle?.getSurfaceYAtWorld?.(worldX, worldZ);
      if (Number.isFinite(rampSurfaceY) && rampSurfaceY <= maxSurfaceY) {
        bestY = Math.max(bestY, rampSurfaceY);
      }
    }

    return bestY;
  }

  function raycastBuildSurface(ray, outPoint = new THREE.Vector3()) {
    if (!ray || !ray.origin || !ray.direction) {
      return false;
    }
    const origin = ray.origin;
    const direction = ray.direction;
    let bestDistanceSq = Number.POSITIVE_INFINITY;

    if (Math.abs(direction.y) >= GRID_CONFIG.rayParallelEpsilon) {
      const floorT = (FLOOR_Y - origin.y) / direction.y;
      if (floorT >= 0) {
        const floorHitX = origin.x + direction.x * floorT;
        const floorHitZ = origin.z + direction.z * floorT;
        if (worldToCell(floorHitX, floorHitZ) !== null) {
          buildRaycastBestPoint.set(floorHitX, FLOOR_Y, floorHitZ);
          bestDistanceSq = buildRaycastBestPoint.distanceToSquared(origin);
        }
      }
    }

    for (const obstacle of altitudeObstacles) {
      const obstacleHeight = Number(obstacle?.height);
      const obstacleHalfSizeX = Number.isFinite(Number(obstacle?.halfSizeX))
        ? Number(obstacle.halfSizeX)
        : Number(obstacle?.halfSize);
      const obstacleHalfSizeZ = Number.isFinite(Number(obstacle?.halfSizeZ))
        ? Number(obstacle.halfSizeZ)
        : Number(obstacle?.halfSize);
      if (
        !Number.isFinite(obstacleHeight)
        || obstacleHeight <= 0
        || !Number.isFinite(obstacleHalfSizeX)
        || !Number.isFinite(obstacleHalfSizeZ)
      ) {
        continue;
      }

      const obstacleBaseY = Number(obstacle?.baseY);
      const obstacleMinY = Number.isFinite(obstacleBaseY) ? obstacleBaseY : FLOOR_Y;
      const obstaclePos = obstacle.position;
      if (!obstaclePos) {
        continue;
      }

      buildRaycastObstacleBox.min.set(
        obstaclePos.x - obstacleHalfSizeX,
        obstacleMinY,
        obstaclePos.z - obstacleHalfSizeZ
      );
      buildRaycastObstacleBox.max.set(
        obstaclePos.x + obstacleHalfSizeX,
        obstacleMinY + obstacleHeight,
        obstaclePos.z + obstacleHalfSizeZ
      );

      const obstacleHit = ray.intersectBox(buildRaycastObstacleBox, buildRaycastHitPoint);
      if (!obstacleHit) {
        continue;
      }

      const hitDistanceSq = obstacleHit.distanceToSquared(origin);
      if (hitDistanceSq >= bestDistanceSq) {
        continue;
      }
      bestDistanceSq = hitDistanceSq;
      buildRaycastBestPoint.copy(obstacleHit);
    }

    for (const rampSurface of rampTopSurfaces) {
      const triangles = Array.isArray(rampSurface?.triangles) ? rampSurface.triangles : [];
      for (const triangle of triangles) {
        if (!Array.isArray(triangle) || triangle.length !== 3) {
          continue;
        }
        const hitPoint = ray.intersectTriangle(
          triangle[0],
          triangle[1],
          triangle[2],
          false,
          buildRaycastRampHitPoint
        );
        if (!hitPoint) {
          continue;
        }
        const hitDistanceSq = hitPoint.distanceToSquared(origin);
        if (hitDistanceSq < bestDistanceSq) {
          bestDistanceSq = hitDistanceSq;
          buildRaycastBestPoint.copy(hitPoint);
        }
      }
    }

    if (!Number.isFinite(bestDistanceSq)) {
      return false;
    }

    outPoint.copy(buildRaycastBestPoint);
    return true;
  }

  function raycastWallAnchor(ray) {
    if (!ray || !ray.origin || !ray.direction) {
      return null;
    }

    const origin = ray.origin;
    let bestDistanceSq = Number.POSITIVE_INFINITY;
    let bestCellX = null;
    let bestCellY = null;
    let bestCellZ = null;

    for (const obstacle of altitudeObstacles) {
      const obstaclePos = obstacle?.position;
      const obstacleHeight = Number(obstacle?.height);
      const obstacleHalfSizeX = Number.isFinite(Number(obstacle?.halfSizeX))
        ? Number(obstacle.halfSizeX)
        : Number(obstacle?.halfSize);
      const obstacleHalfSizeZ = Number.isFinite(Number(obstacle?.halfSizeZ))
        ? Number(obstacle.halfSizeZ)
        : Number(obstacle?.halfSize);
      const obstacleBaseY = Number(obstacle?.baseY);
      if (
        !obstaclePos
        || !Number.isFinite(obstacleHalfSizeX)
        || !Number.isFinite(obstacleHalfSizeZ)
        || !Number.isFinite(obstacleHeight)
        || !Number.isFinite(obstacleBaseY)
      ) {
        continue;
      }

      buildRaycastObstacleBox.min.set(
        obstaclePos.x - obstacleHalfSizeX,
        obstacleBaseY,
        obstaclePos.z - obstacleHalfSizeZ
      );
      buildRaycastObstacleBox.max.set(
        obstaclePos.x + obstacleHalfSizeX,
        obstacleBaseY + obstacleHeight,
        obstaclePos.z + obstacleHalfSizeZ
      );

      const hitPoint = ray.intersectBox(buildRaycastObstacleBox, buildRaycastHitPoint);
      if (!hitPoint) {
        continue;
      }

      const minX = buildRaycastObstacleBox.min.x;
      const maxX = buildRaycastObstacleBox.max.x;
      const minY = buildRaycastObstacleBox.min.y;
      const maxY = buildRaycastObstacleBox.max.y;
      const minZ = buildRaycastObstacleBox.min.z;
      const maxZ = buildRaycastObstacleBox.max.z;
      const direction = ray.direction;
      const sidePlaneEpsilon = 1e-4;
      const sideRayParallelEpsilon = Math.max(1e-6, Number(GRID_CONFIG.rayParallelEpsilon) || 1e-6);
      let localBestDistanceSq = Number.POSITIVE_INFINITY;
      let localBestX = 0;
      let localBestY = 0;
      let localBestZ = 0;
      let localBestNormalX = 0;
      let localBestNormalZ = 0;

      if (Math.abs(direction.x) > sideRayParallelEpsilon) {
        const testXPlanes = [
          { value: minX, normalX: -1 },
          { value: maxX, normalX: 1 },
        ];
        for (const plane of testXPlanes) {
          const t = (plane.value - origin.x) / direction.x;
          if (t < 0) {
            continue;
          }
          const hitY = origin.y + (direction.y * t);
          const hitZ = origin.z + (direction.z * t);
          if (
            hitY < (minY - sidePlaneEpsilon)
            || hitY > (maxY + sidePlaneEpsilon)
            || hitZ < (minZ - sidePlaneEpsilon)
            || hitZ > (maxZ + sidePlaneEpsilon)
          ) {
            continue;
          }
          const hitX = plane.value;
          const distanceSq = ((hitX - origin.x) ** 2) + ((hitY - origin.y) ** 2) + ((hitZ - origin.z) ** 2);
          if (distanceSq >= localBestDistanceSq) {
            continue;
          }
          localBestDistanceSq = distanceSq;
          localBestX = hitX;
          localBestY = hitY;
          localBestZ = hitZ;
          localBestNormalX = plane.normalX;
          localBestNormalZ = 0;
        }
      }

      if (Math.abs(direction.z) > sideRayParallelEpsilon) {
        const testZPlanes = [
          { value: minZ, normalZ: -1 },
          { value: maxZ, normalZ: 1 },
        ];
        for (const plane of testZPlanes) {
          const t = (plane.value - origin.z) / direction.z;
          if (t < 0) {
            continue;
          }
          const hitX = origin.x + (direction.x * t);
          const hitY = origin.y + (direction.y * t);
          if (
            hitX < (minX - sidePlaneEpsilon)
            || hitX > (maxX + sidePlaneEpsilon)
            || hitY < (minY - sidePlaneEpsilon)
            || hitY > (maxY + sidePlaneEpsilon)
          ) {
            continue;
          }
          const hitZ = plane.value;
          const distanceSq = ((hitX - origin.x) ** 2) + ((hitY - origin.y) ** 2) + ((hitZ - origin.z) ** 2);
          if (distanceSq >= localBestDistanceSq) {
            continue;
          }
          localBestDistanceSq = distanceSq;
          localBestX = hitX;
          localBestY = hitY;
          localBestZ = hitZ;
          localBestNormalX = 0;
          localBestNormalZ = plane.normalZ;
        }
      }

      if (!Number.isFinite(localBestDistanceSq)) {
        continue;
      }

      if (localBestDistanceSq >= bestDistanceSq) {
        continue;
      }

      bestDistanceSq = localBestDistanceSq;
      wallAnchorRaycastBestPoint.set(localBestX, localBestY, localBestZ);
      wallAnchorRaycastBestNormal.set(localBestNormalX, 0, localBestNormalZ);
      bestCellX = Number.isInteger(obstacle?.cellX) ? obstacle.cellX : null;
      bestCellY = Number.isInteger(obstacle?.cellY) ? obstacle.cellY : null;
      bestCellZ = Number.isInteger(obstacle?.cellZ) ? obstacle.cellZ : null;
    }

    if (!Number.isFinite(bestDistanceSq)) {
      return null;
    }
    if (!Number.isInteger(bestCellX) || !Number.isInteger(bestCellY) || !Number.isInteger(bestCellZ)) {
      return null;
    }

    return {
      point: wallAnchorRaycastBestPoint.clone(),
      normal: wallAnchorRaycastBestNormal.clone(),
      cellX: bestCellX,
      cellY: bestCellY,
      cellZ: bestCellZ,
    };
  }

  function cellToWorldCenter(cellX, cellZ, y = FLOOR_Y) {
    return cellToWorld(cellX, cellZ, y);
  }

  function isSpawnCell(cellX, cellZ) {
    return spawnCellSet.has(cellKey(cellX, cellZ));
  }

  function isEndCell(cellX, cellZ) {
    return !!endCellKey && cellKey(cellX, cellZ) === endCellKey;
  }

  function isCellInsideLevel(cellX, cellZ) {
    return isMainGridCell(cellX, cellZ);
  }

  function isCellBuildable(cellX, cellZ) {
    if (!isMainGridCell(cellX, cellZ)) {
      return false;
    }
    return !isRampCell(cellX, cellZ);
  }

  let disposed = false;
  function dispose() {
    if (disposed) {
      return;
    }
    disposed = true;

    const disposedGeometries = new Set();
    const disposedMaterials = new Set();
    gridRoot.traverse((child) => {
      if (
        child?.geometry
        && typeof child.geometry.dispose === "function"
        && !disposedGeometries.has(child.geometry)
        && shouldDisposeGridResource(child.geometry)
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
          || !shouldDisposeGridResource(material)
        ) {
          continue;
        }
        disposedMaterials.add(material);
        material.dispose();
      }
    });
    if (gridRoot.parent) {
      gridRoot.parent.remove(gridRoot);
    }
  }

  function getLevelObjects() {
    return normalizedLevelObjects.map((entry) => ({
      type: entry.type,
      position: clonePosition(entry.position),
      rotation: entry.rotation,
    }));
  }

  function removeDecorationsOverlappingBounds(bounds = {}) {
    const minX = Number(bounds.minX);
    const minY = Number(bounds.minY);
    const minZ = Number(bounds.minZ);
    const maxX = Number(bounds.maxX);
    const maxY = Number(bounds.maxY);
    const maxZ = Number(bounds.maxZ);
    if (
      !Number.isFinite(minX)
      || !Number.isFinite(minY)
      || !Number.isFinite(minZ)
      || !Number.isFinite(maxX)
      || !Number.isFinite(maxY)
      || !Number.isFinite(maxZ)
    ) {
      return 0;
    }
    tempDecorationRemovalBounds.min.set(minX, minY, minZ);
    tempDecorationRemovalBounds.max.set(maxX, maxY, maxZ);
    let removedCount = 0;
    const affectedChunkKeys = new Set();
    for (let i = decorativeEntries.length - 1; i >= 0; i -= 1) {
      const entry = decorativeEntries[i];
      if (!entry?.bounds) {
        continue;
      }
      if (!entry.bounds.intersectsBox(tempDecorationRemovalBounds)) {
        continue;
      }
      if (entry.mesh?.parent) {
        entry.mesh.parent.remove(entry.mesh);
      }
      decorativeEntries.splice(i, 1);
      entry.removed = true;
      if (entry.collisionObstacle) {
        const collisionIndex = decorativeObstacles.indexOf(entry.collisionObstacle);
        if (collisionIndex >= 0) {
          decorativeObstacles.splice(collisionIndex, 1);
        }
      }
      if (typeof entry.chunkKey === "string" && entry.chunkKey.length > 0) {
        const chunkEntries = decorativeEntriesByChunk.get(entry.chunkKey);
        if (Array.isArray(chunkEntries)) {
          const chunkIndex = chunkEntries.indexOf(entry);
          if (chunkIndex >= 0) {
            chunkEntries.splice(chunkIndex, 1);
          }
          if (chunkEntries.length === 0) {
            decorativeEntriesByChunk.delete(entry.chunkKey);
          }
        }
        affectedChunkKeys.add(entry.chunkKey);
      }
      const levelObjectIndex = normalizedLevelObjects.findIndex((levelEntry) => (
        decorativeObjectMatchesLevelEntry(levelEntry, entry)
      ));
      if (levelObjectIndex >= 0) {
        normalizedLevelObjects.splice(levelObjectIndex, 1);
      }
      removedCount += 1;
    }
    for (const chunkKey of affectedChunkKeys) {
      rebuildDecorativeChunk(chunkKey);
    }
    if (affectedChunkKeys.size > 0) {
      refreshStaticBatchStats();
    }
    return removedCount;
  }

  function getEditorRaycastTargets() {
    return editorRaycastTargets.filter((target) => !!target?.parent);
  }

  function getRenderBatchStats() {
    refreshStaticBatchStats();
    return {
      mergedMeshCount: staticBatchStats.mergedMeshCount,
      staticChunkCount: staticBatchStats.staticChunkCount,
      decorativeChunkCount: staticBatchStats.decorativeChunkCount,
    };
  }

  return {
    spawnCells,
    endCell,
    playerSpawnCell,
    playerSpawnRotation,
    spawnMarkers,
    endMarker,
    playerSpawnMarker,
    moveBounds,
    levelBounds,
    eyeHeight: GRID_CONFIG.eyeHeight,
    tileTopY: FLOOR_Y,
    pathTileTopY: PATH_TILE_TOP_Y,
    cellSize: CELL_SIZE,
    gridSize: GRID_SIZE,
    tiles,
    heightObstacles: altitudeObstacles,
    rampObstacles,
    decorativeObstacles,
    endpointObstacles,
    worldToCell,
    cellToWorldCenter,
    isPathCell,
    isSpawnCell,
    isEndCell,
    isCellInsideLevel,
    isCellBuildable,
    isRampCell: (cellX, cellZ) => isRampCell(cellX, cellZ),
    getRampCellData: (cellX, cellZ) => getRampCellData(cellX, cellZ),
    getCellHeight: getCellHeightLevels,
    getCellMarker,
    getCellSurfaceY,
    getBuildSurfaceYAtWorld,
    getSupportSurfaceYBelowWorld,
    raycastBuildSurface,
    raycastWallAnchor,
    updateBoundaryWallVisual,
    getLevelObjects,
    getEditorRaycastTargets,
    getRenderBatchStats,
    removeDecorationsOverlappingBounds,
    dispose,
    isSameCell,
  };
}
