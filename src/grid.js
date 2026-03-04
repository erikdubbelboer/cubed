import * as THREE from "three";
import { GAME_CONFIG } from "./config.js";

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
const LEVEL_MARKERS = new Set([".", "P", "S", "E", "X"]);
const LEGACY_PATH_MARKERS = new Set(["P"]);
const CELL_TOKEN_WIDTH = 2;

function cellKey(cellX, cellZ) {
  return `${cellX},${cellZ}`;
}

function cloneCell(cell) {
  if (!cell) {
    return null;
  }
  return { x: cell.x, z: cell.z };
}

function parseCellHeight(char) {
  const height = Number.parseInt(char, 36);
  if (!Number.isInteger(height) || height < 0) {
    throw new Error(`Invalid cell height '${char}' in grid.levelLayoutAscii.`);
  }
  return height;
}

function parseRowTokens(rawLine, cellZ) {
  const compactWidth = GRID_SIZE * CELL_TOKEN_WIDTH;
  const spacedWidth = compactWidth + (GRID_SIZE - 1);
  let mode = null;

  if (rawLine.length === compactWidth) {
    mode = "compact";
  } else if (rawLine.length === spacedWidth) {
    mode = "spaced";
  } else {
    throw new Error(
      `Invalid row width at z=${cellZ}; expected ${compactWidth} (compact) or ${spacedWidth} (space-separated) characters.`
    );
  }

  const tokens = [];
  for (let cellX = 0; cellX < GRID_SIZE; cellX += 1) {
    const tokenOffset = mode === "spaced" ? cellX * 3 : cellX * CELL_TOKEN_WIDTH;
    const heightChar = rawLine[tokenOffset];
    const markerChar = rawLine[tokenOffset + 1];

    if (mode === "spaced" && cellX < GRID_SIZE - 1 && rawLine[tokenOffset + 2] !== " ") {
      throw new Error(`Invalid token separator at (${cellX}, ${cellZ}); expected a single space.`);
    }

    const normalizedHeightChar = heightChar === " "
      ? "0"
      : heightChar.toUpperCase();
    const normalizedMarkerChar = markerChar === " "
      ? "."
      : markerChar.toUpperCase();

    tokens.push({
      heightChar: normalizedHeightChar,
      markerChar: normalizedMarkerChar,
    });
  }

  return tokens;
}

function parseLevelLayout(layoutAscii) {
  if (typeof layoutAscii !== "string" || layoutAscii.trim().length === 0) {
    throw new Error("grid.levelLayoutAscii must be a non-empty string.");
  }

  const lines = layoutAscii.replace(/\r/g, "").split("\n");
  if (lines.length > 0 && lines[lines.length - 1] === "") {
    lines.pop();
  }
  if (lines.length !== GRID_SIZE) {
    throw new Error(`grid.levelLayoutAscii must contain exactly ${GRID_SIZE} rows.`);
  }

  const heights = [];
  const markers = [];
  const spawnCells = [];
  let endCell = null;
  let playerSpawnCell = null;

  for (let cellZ = 0; cellZ < GRID_SIZE; cellZ += 1) {
    const rowTokens = parseRowTokens(lines[cellZ], cellZ);
    const rowHeights = [];
    const rowMarkers = [];

    for (let cellX = 0; cellX < GRID_SIZE; cellX += 1) {
      const { heightChar, markerChar } = rowTokens[cellX];
      if (!LEVEL_MARKERS.has(markerChar)) {
        throw new Error(`Invalid cell marker '${markerChar}' at (${cellX}, ${cellZ}).`);
      }

      rowHeights.push(parseCellHeight(heightChar));
      rowMarkers.push(markerChar);

      if (markerChar === "S") {
        spawnCells.push({ x: cellX, z: cellZ });
      }

      if (markerChar === "E") {
        if (endCell) {
          throw new Error("grid.levelLayoutAscii must contain exactly one end marker 'E'.");
        }
        endCell = { x: cellX, z: cellZ };
      }

      if (markerChar === "X") {
        if (playerSpawnCell) {
          throw new Error("grid.levelLayoutAscii must contain at most one player marker 'X'.");
        }
        playerSpawnCell = { x: cellX, z: cellZ };
      }
    }

    heights.push(rowHeights);
    markers.push(rowMarkers);
  }

  if (spawnCells.length === 0) {
    throw new Error("grid.levelLayoutAscii must contain at least one spawn marker 'S'.");
  }
  if (!endCell) {
    throw new Error("grid.levelLayoutAscii must contain exactly one end marker 'E'.");
  }

  return {
    heights,
    markers,
    spawnCells,
    endCell,
    playerSpawnCell,
  };
}

const LEVEL_LAYOUT = parseLevelLayout(GRID_CONFIG.levelLayoutAscii);

function isMainGridCell(cellX, cellZ) {
  return cellX >= 0 && cellX < GRID_SIZE && cellZ >= 0 && cellZ < GRID_SIZE;
}

function getCellHeightLevels(cellX, cellZ) {
  if (!isMainGridCell(cellX, cellZ)) {
    return 0;
  }
  const row = LEVEL_LAYOUT.heights[cellZ];
  if (!row) {
    return 0;
  }
  return row[cellX] ?? 0;
}

function getCellMarker(cellX, cellZ) {
  if (!isMainGridCell(cellX, cellZ)) {
    return ".";
  }
  const row = LEVEL_LAYOUT.markers[cellZ];
  if (!row) {
    return ".";
  }
  return row[cellX] ?? ".";
}

function getCellSupportHeight(cellX, cellZ) {
  return getCellHeightLevels(cellX, cellZ) * ALTITUDE_CUBE_SIZE;
}

function getCellSurfaceY(cellX, cellZ) {
  return FLOOR_Y + getCellSupportHeight(cellX, cellZ);
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

export function createGrid(scene) {
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
  scene.add(farFloor);

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
  scene.add(platform);

  const half = (GRID_SIZE * CELL_SIZE) / 2;
  const altitudeObstacles = [];
  const buildRaycastObstacleBox = new THREE.Box3();
  const buildRaycastHitPoint = new THREE.Vector3();
  const buildRaycastBestPoint = new THREE.Vector3();

  const altitudeCubeGeo = new THREE.BoxGeometry(
    ALTITUDE_CUBE_SIZE,
    ALTITUDE_CUBE_SIZE,
    ALTITUDE_CUBE_SIZE
  );

  for (let cellZ = 0; cellZ < GRID_SIZE; cellZ += 1) {
    for (let cellX = 0; cellX < GRID_SIZE; cellX += 1) {
      const cellHeightLevels = getCellHeightLevels(cellX, cellZ);
      if (cellHeightLevels <= 0) {
        continue;
      }

      const checkerOffset = ((cellX + cellZ) & 1) === 0
        ? GRID_CONFIG.checkerLightnessOffset
        : -GRID_CONFIG.checkerLightnessOffset;
      const worldX = -half + cellX * CELL_SIZE + CELL_SIZE / 2;
      const worldZ = -half + cellZ * CELL_SIZE + CELL_SIZE / 2;
      const supportHeight = cellHeightLevels * ALTITUDE_CUBE_SIZE;

      altitudeObstacles.push({
        position: new THREE.Vector3(worldX, FLOOR_Y, worldZ),
        halfSize: TERRAIN_OBSTACLE_HALF_SIZE,
        height: supportHeight,
        baseY: FLOOR_Y,
        // Terrain tops should remain continuously walkable across adjacent cells.
        topInsetFromRadius: 0,
      });

      for (let level = 0; level < cellHeightLevels; level += 1) {
        const lightness = GRID_CONFIG.altitudeBaseLightness
          + checkerOffset
          + level * GRID_CONFIG.altitudePerLevelLightnessStep;
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
          FLOOR_Y + ALTITUDE_CUBE_SIZE * 0.5 + level * ALTITUDE_CUBE_SIZE,
          worldZ
        );
        cube.castShadow = true;
        cube.receiveShadow = true;
        scene.add(cube);
      }
    }
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
      scene.add(tile);
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

  const spawnCells = LEVEL_LAYOUT.spawnCells.map((cell) => cloneCell(cell));
  const endCell = cloneCell(LEVEL_LAYOUT.endCell);
  const playerSpawnCell = cloneCell(LEVEL_LAYOUT.playerSpawnCell);
  const spawnCellSet = new Set(spawnCells.map((cell) => cellKey(cell.x, cell.z)));
  const endCellKey = endCell ? cellKey(endCell.x, endCell.z) : null;

  const spawnMarkers = [];
  for (const spawnCell of spawnCells) {
    const marker = new THREE.Mesh(endpointGeo, spawnMat);
    const center = cellToWorld(spawnCell.x, spawnCell.z, getCellSurfaceY(spawnCell.x, spawnCell.z));
    marker.position.set(center.x, center.y + CELL_SIZE * 0.5, center.z);
    marker.castShadow = true;
    marker.receiveShadow = true;
    marker.userData.isEndpointMarker = true;
    marker.userData.endpointType = "spawn";
    marker.userData.cellX = spawnCell.x;
    marker.userData.cellZ = spawnCell.z;
    scene.add(marker);
    spawnMarkers.push(marker);
  }

  let endMarker = null;
  if (endCell) {
    endMarker = new THREE.Mesh(endpointGeo, endMat);
    const center = cellToWorld(endCell.x, endCell.z, getCellSurfaceY(endCell.x, endCell.z));
    endMarker.position.set(center.x, center.y + CELL_SIZE * 0.5, center.z);
    endMarker.castShadow = true;
    endMarker.receiveShadow = true;
    endMarker.userData.isEndpointMarker = true;
    endMarker.userData.endpointType = "end";
    endMarker.userData.cellX = endCell.x;
    endMarker.userData.cellZ = endCell.z;
    scene.add(endMarker);
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
    return getCellSurfaceY(cell.x, cell.z);
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
      const obstacleHalfSize = Number(obstacle?.halfSize);
      if (!Number.isFinite(obstacleHeight) || obstacleHeight <= 0 || !Number.isFinite(obstacleHalfSize)) {
        continue;
      }

      const obstacleBaseY = Number(obstacle?.baseY);
      const obstacleMinY = Number.isFinite(obstacleBaseY) ? obstacleBaseY : FLOOR_Y;
      const obstaclePos = obstacle.position;
      if (!obstaclePos) {
        continue;
      }

      buildRaycastObstacleBox.min.set(
        obstaclePos.x - obstacleHalfSize,
        obstacleMinY,
        obstaclePos.z - obstacleHalfSize
      );
      buildRaycastObstacleBox.max.set(
        obstaclePos.x + obstacleHalfSize,
        obstacleMinY + obstacleHeight,
        obstaclePos.z + obstacleHalfSize
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

    if (!Number.isFinite(bestDistanceSq)) {
      return false;
    }

    outPoint.copy(buildRaycastBestPoint);
    return true;
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

  return {
    spawnCells,
    endCell,
    playerSpawnCell,
    spawnMarkers,
    endMarker,
    moveBounds,
    levelBounds,
    eyeHeight: GRID_CONFIG.eyeHeight,
    tileTopY: FLOOR_Y,
    pathTileTopY: PATH_TILE_TOP_Y,
    cellSize: CELL_SIZE,
    gridSize: GRID_SIZE,
    tiles,
    heightObstacles: altitudeObstacles,
    worldToCell,
    cellToWorldCenter,
    isPathCell,
    isSpawnCell,
    isEndCell,
    isCellInsideLevel,
    getCellHeight: getCellHeightLevels,
    getCellMarker,
    getCellSurfaceY,
    getBuildSurfaceYAtWorld,
    raycastBuildSurface,
    isSameCell,
  };
}
