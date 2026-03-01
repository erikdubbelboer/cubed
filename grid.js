import * as THREE from "three";
import { GAME_CONFIG } from "./config.js";

const GRID_CONFIG = GAME_CONFIG.grid;

const GRID_SIZE = GRID_CONFIG.size;
const CELL_SIZE = GRID_CONFIG.cellSize;
const PLATFORM_HEIGHT = GRID_CONFIG.platformHeight;
const TILE_HEIGHT = GRID_CONFIG.tileHeight;
const FLOOR_Y = GRID_CONFIG.floorY;
const PATH_TILE_TOP_Y = FLOOR_Y + TILE_HEIGHT;
const ENEMY_PATH_Y_OFFSET = GRID_CONFIG.enemyPathYOffset;
const ALTITUDE_CUBE_SIZE = CELL_SIZE;
const WALL_PATH_TILE_SIZE = CELL_SIZE * GRID_CONFIG.wallPathTileSizeScale;
const WALL_PATH_TILE_THICKNESS = TILE_HEIGHT * GRID_CONFIG.wallPathTileThicknessScale;
const TERRAIN_OBSTACLE_HALF_SIZE = CELL_SIZE * 0.5;
const OUTER_EMPTY_SPACE_RINGS = Math.max(
  0,
  Math.floor(Number(GRID_CONFIG.outerEmptySpaceRings ?? GRID_CONFIG.outerEmptyTerrainRings) || 0)
);
const WALL_CLIMB_PATH_OFFSET = GRID_CONFIG.wallClimbPathOffset;
const WALL_PATH_TILE_VISUAL_OFFSET = WALL_PATH_TILE_THICKNESS * GRID_CONFIG.wallPathVisualOffsetScale;
const LEVEL_PATH_MARKERS = new Set(["P", "S", "E"]);
const LEVEL_MARKERS = new Set([".", "P", "S", "E"]);
const CELL_TOKEN_WIDTH = 2;

function cellKey(cellX, cellZ) {
  return `${cellX},${cellZ}`;
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
  const pathSet = new Set();
  let startCell = null;
  let endCell = null;

  for (let cellZ = 0; cellZ < GRID_SIZE; cellZ += 1) {
    const rowTokens = parseRowTokens(lines[cellZ], cellZ);
    const rowHeights = [];
    for (let cellX = 0; cellX < GRID_SIZE; cellX += 1) {
      const { heightChar, markerChar } = rowTokens[cellX];
      if (!LEVEL_MARKERS.has(markerChar)) {
        throw new Error(`Invalid cell marker '${markerChar}' at (${cellX}, ${cellZ}).`);
      }

      rowHeights.push(parseCellHeight(heightChar));
      if (LEVEL_PATH_MARKERS.has(markerChar)) {
        pathSet.add(cellKey(cellX, cellZ));
      }
      if (markerChar === "S") {
        if (startCell) {
          throw new Error("grid.levelLayoutAscii must contain exactly one start marker 'S'.");
        }
        startCell = { x: cellX, z: cellZ };
      }
      if (markerChar === "E") {
        if (endCell) {
          throw new Error("grid.levelLayoutAscii must contain exactly one end marker 'E'.");
        }
        endCell = { x: cellX, z: cellZ };
      }
    }
    heights.push(rowHeights);
  }

  if (!startCell || !endCell) {
    throw new Error("grid.levelLayoutAscii must contain both one 'S' and one 'E'.");
  }

  return {
    heights,
    pathSet,
    startCell,
    endCell,
  };
}

function getPathNeighborCells(pathSet, cellX, cellZ) {
  const neighbors = [];
  const offsets = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  for (const [dx, dz] of offsets) {
    const nx = cellX + dx;
    const nz = cellZ + dz;
    if (nx < 0 || nx >= GRID_SIZE || nz < 0 || nz >= GRID_SIZE) {
      continue;
    }
    if (pathSet.has(cellKey(nx, nz))) {
      neighbors.push({ x: nx, z: nz });
    }
  }
  return neighbors;
}

function buildOrderedPathCells(pathSet, startCell, endCell) {
  const startKey = cellKey(startCell.x, startCell.z);
  const endKey = cellKey(endCell.x, endCell.z);
  if (!pathSet.has(startKey) || !pathSet.has(endKey)) {
    throw new Error("Start/end cells must be path cells in grid.levelLayoutAscii.");
  }

  for (const key of pathSet) {
    const [xText, zText] = key.split(",");
    const cellX = Number.parseInt(xText, 10);
    const cellZ = Number.parseInt(zText, 10);
    const degree = getPathNeighborCells(pathSet, cellX, cellZ).length;
    const expectedDegree = key === startKey || key === endKey ? 1 : 2;
    if (degree !== expectedDegree) {
      throw new Error(
        `Path degree mismatch at (${cellX}, ${cellZ}); expected ${expectedDegree}, got ${degree}.`
      );
    }
  }

  const orderedPathCells = [[startCell.x, startCell.z]];
  const visited = new Set([startKey]);
  let previousKey = null;
  let current = { ...startCell };

  while (cellKey(current.x, current.z) !== endKey) {
    const nextCandidates = getPathNeighborCells(pathSet, current.x, current.z)
      .filter((neighbor) => cellKey(neighbor.x, neighbor.z) !== previousKey);
    if (nextCandidates.length !== 1) {
      throw new Error(`Could not continue path walk at (${current.x}, ${current.z}).`);
    }
    const next = nextCandidates[0];
    const nextKey = cellKey(next.x, next.z);
    if (visited.has(nextKey)) {
      throw new Error(`Path loop detected at (${next.x}, ${next.z}).`);
    }

    orderedPathCells.push([next.x, next.z]);
    visited.add(nextKey);
    previousKey = cellKey(current.x, current.z);
    current = next;
  }

  if (visited.size !== pathSet.size) {
    throw new Error("Path cells must form one continuous non-branching path from S to E.");
  }

  return orderedPathCells;
}

const LEVEL_LAYOUT = parseLevelLayout(GRID_CONFIG.levelLayoutAscii);
const PATH_CELLS = buildOrderedPathCells(
  LEVEL_LAYOUT.pathSet,
  LEVEL_LAYOUT.startCell,
  LEVEL_LAYOUT.endCell
);

function getCellHeightLevels(cellX, cellZ) {
  const row = LEVEL_LAYOUT.heights[cellZ];
  if (!row) {
    return 0;
  }
  return row[cellX] ?? 0;
}

function getPathSupportHeight(cellX, cellZ) {
  return getCellHeightLevels(cellX, cellZ) * ALTITUDE_CUBE_SIZE;
}

function getPathSurfaceY(cellX, cellZ) {
  return FLOOR_Y + getPathSupportHeight(cellX, cellZ) + TILE_HEIGHT;
}

function cellToWorld(cellX, cellZ, pathSurfaceY = getPathSurfaceY(cellX, cellZ)) {
  const half = (GRID_SIZE * CELL_SIZE) / 2;
  const x = -half + cellX * CELL_SIZE + CELL_SIZE / 2;
  const z = -half + cellZ * CELL_SIZE + CELL_SIZE / 2;
  return new THREE.Vector3(x, pathSurfaceY + ENEMY_PATH_Y_OFFSET, z);
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

  const pathSet = LEVEL_LAYOUT.pathSet;
  const half = (GRID_SIZE * CELL_SIZE) / 2;
  const extendedHalf = half + (OUTER_EMPTY_SPACE_RINGS * CELL_SIZE);
  const terrainMinCell = -OUTER_EMPTY_SPACE_RINGS;
  const terrainMaxCellExclusive = GRID_SIZE + OUTER_EMPTY_SPACE_RINGS;
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
        // Path tiles are visual overlays; keep collision at the support-cube top.
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
  const wallPathTileMat = new THREE.MeshStandardMaterial({
    color: GRID_CONFIG.wallPathTileColor,
    emissive: GRID_CONFIG.wallPathTileEmissive,
    emissiveIntensity: GRID_CONFIG.wallPathTileEmissiveIntensity,
    roughness: GRID_CONFIG.wallPathTileRoughness,
    metalness: GRID_CONFIG.wallPathTileMetalness,
  });
  const wallPathTileGeo = new THREE.BoxGeometry(
    WALL_PATH_TILE_SIZE,
    WALL_PATH_TILE_SIZE,
    WALL_PATH_TILE_THICKNESS
  );

  const tiles = [];

  for (let cellZ = 0; cellZ < GRID_SIZE; cellZ += 1) {
    for (let cellX = 0; cellX < GRID_SIZE; cellX += 1) {
      const isPath = pathSet.has(cellKey(cellX, cellZ));
      if (!isPath) {
        continue;
      }
      const tile = new THREE.Mesh(
        tileGeo,
        pathTileMat
      );

      tile.position.set(
        -half + cellX * CELL_SIZE + CELL_SIZE / 2,
        FLOOR_Y + getPathSupportHeight(cellX, cellZ) + (TILE_HEIGHT / 2),
        -half + cellZ * CELL_SIZE + CELL_SIZE / 2
      );
      tile.userData.cellX = cellX;
      tile.userData.cellZ = cellZ;
      tile.userData.isPath = isPath;
      tile.userData.pathSurfaceY = getPathSurfaceY(cellX, cellZ);
      tile.receiveShadow = true;
      tile.castShadow = true;
      tiles.push(tile);
      scene.add(tile);
    }
  }

  const cellWaypoints = PATH_CELLS.map(([x, z]) => {
    const surfaceY = getPathSurfaceY(x, z);
    return {
      cellX: x,
      cellZ: z,
      surfaceY,
      point: cellToWorld(x, z, surfaceY),
    };
  });
  const pathWaypoints = [];
  const wallClimbSections = [];
  for (let i = 0; i < cellWaypoints.length; i += 1) {
    const current = cellWaypoints[i];
    if (i === 0) {
      pathWaypoints.push(current.point.clone());
      continue;
    }

    const previous = cellWaypoints[i - 1];
    const dx = current.point.x - previous.point.x;
    const dz = current.point.z - previous.point.z;
    const dy = current.point.y - previous.point.y;

    if (
      Math.abs(dy) > GRID_CONFIG.pathHeightEpsilon
      && (
        Math.abs(dx) > GRID_CONFIG.pathHeightEpsilon
        || Math.abs(dz) > GRID_CONFIG.pathHeightEpsilon
      )
    ) {
      const wallX = previous.point.x + (dx * 0.5);
      const wallZ = previous.point.z + (dz * 0.5);
      const previousIsLower = previous.surfaceY <= current.surfaceY;
      const lowToHighX = previousIsLower ? dx : -dx;
      const lowToHighZ = previousIsLower ? dz : -dz;
      const dirLength = Math.hypot(lowToHighX, lowToHighZ) || 1;
      const normalX = -(lowToHighX / dirLength);
      const normalZ = -(lowToHighZ / dirLength);
      const climbX = wallX + (normalX * WALL_CLIMB_PATH_OFFSET);
      const climbZ = wallZ + (normalZ * WALL_CLIMB_PATH_OFFSET);

      pathWaypoints.push(new THREE.Vector3(climbX, previous.point.y, climbZ));
      pathWaypoints.push(new THREE.Vector3(climbX, current.point.y, climbZ));
      pathWaypoints.push(current.point.clone());

      wallClimbSections.push({
        wallX,
        wallZ,
        climbX,
        climbZ,
        tileX: wallX + (normalX * WALL_PATH_TILE_VISUAL_OFFSET),
        tileZ: wallZ + (normalZ * WALL_PATH_TILE_VISUAL_OFFSET),
        lowY: Math.min(previous.surfaceY, current.surfaceY),
        highY: Math.max(previous.surfaceY, current.surfaceY),
        normalX,
        normalZ,
      });
      continue;
    }

    if (Math.abs(dy) > GRID_CONFIG.pathHeightEpsilon) {
      pathWaypoints.push(new THREE.Vector3(previous.point.x, current.point.y, previous.point.z));
    }
    pathWaypoints.push(current.point.clone());
  }

  for (const climb of wallClimbSections) {
    const climbHeight = climb.highY - climb.lowY;
    if (climbHeight <= GRID_CONFIG.pathHeightEpsilon) {
      continue;
    }
    const squareCount = Math.max(1, Math.round(climbHeight / ALTITUDE_CUBE_SIZE));
    for (let step = 0; step < squareCount; step += 1) {
      const t = (step + 0.5) / squareCount;
      const wallTile = new THREE.Mesh(wallPathTileGeo, wallPathTileMat);
      const y = climb.lowY + (climbHeight * t);
      wallTile.position.set(
        climb.tileX,
        y,
        climb.tileZ
      );
      wallTile.lookAt(
        climb.tileX + climb.normalX,
        y,
        climb.tileZ + climb.normalZ
      );
      wallTile.userData.isPath = true;
      wallTile.receiveShadow = true;
      wallTile.castShadow = true;
      tiles.push(wallTile);
      scene.add(wallTile);
    }
  }
  const moveInset = CELL_SIZE * GRID_CONFIG.moveInsetCellScale;
  const moveBounds = {
    minX: -extendedHalf + moveInset,
    maxX: extendedHalf - moveInset,
    minZ: -extendedHalf + moveInset,
    maxZ: extendedHalf - moveInset,
  };

  function worldToCell(worldX, worldZ) {
    const cx = Math.floor((worldX + half) / CELL_SIZE);
    const cz = Math.floor((worldZ + half) / CELL_SIZE);
    if (
      cx < terrainMinCell ||
      cx >= terrainMaxCellExclusive ||
      cz < terrainMinCell ||
      cz >= terrainMaxCellExclusive
    ) {
      return null;
    }
    return { x: cx, z: cz };
  }

  function isPathCell(cellX, cellZ) {
    return pathSet.has(cellKey(cellX, cellZ));
  }

  function getBuildSurfaceYAtWorld(worldX, worldZ) {
    const cell = worldToCell(worldX, worldZ);
    if (!cell) {
      return FLOOR_Y;
    }
    const supportHeight = getPathSupportHeight(cell.x, cell.z);
    if (supportHeight <= 0) {
      return FLOOR_Y;
    }
    if (isPathCell(cell.x, cell.z)) {
      return getPathSurfaceY(cell.x, cell.z);
    }
    return FLOOR_Y + supportHeight;
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
    return new THREE.Vector3(
      -half + cellX * CELL_SIZE + CELL_SIZE / 2,
      y,
      -half + cellZ * CELL_SIZE + CELL_SIZE / 2
    );
  }

  return {
    pathWaypoints,
    moveBounds,
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
    getBuildSurfaceYAtWorld,
    raycastBuildSurface,
  };
}
