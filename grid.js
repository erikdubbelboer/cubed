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
const ALTITUDE_BLOCK = Object.freeze({ ...GRID_CONFIG.altitudeBlock });
const ALTITUDE_CUBE_SIZE = CELL_SIZE;
const WALL_PATH_TILE_SIZE = CELL_SIZE * GRID_CONFIG.wallPathTileSizeScale;
const WALL_PATH_TILE_THICKNESS = TILE_HEIGHT * GRID_CONFIG.wallPathTileThicknessScale;
const TERRAIN_OBSTACLE_HALF_SIZE = CELL_SIZE * 0.5;
const WALL_CLIMB_PATH_OFFSET = GRID_CONFIG.wallClimbPathOffset;
const WALL_PATH_TILE_VISUAL_OFFSET = WALL_PATH_TILE_THICKNESS * GRID_CONFIG.wallPathVisualOffsetScale;
const PATH_CELLS = GRID_CONFIG.pathCells;

function isInsideAltitudeBlock(cellX, cellZ) {
  return (
    cellX >= ALTITUDE_BLOCK.startX &&
    cellX < ALTITUDE_BLOCK.startX + ALTITUDE_BLOCK.width &&
    cellZ >= ALTITUDE_BLOCK.startZ &&
    cellZ < ALTITUDE_BLOCK.startZ + ALTITUDE_BLOCK.depth
  );
}

function getPathSupportHeight(cellX, cellZ) {
  if (!isInsideAltitudeBlock(cellX, cellZ)) {
    return 0;
  }
  return ALTITUDE_BLOCK.height * ALTITUDE_CUBE_SIZE;
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
      GRID_SIZE * CELL_SIZE + GRID_CONFIG.platformPadding,
      PLATFORM_HEIGHT,
      GRID_SIZE * CELL_SIZE + GRID_CONFIG.platformPadding
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

  const pathSet = new Set(PATH_CELLS.map(([x, z]) => `${x},${z}`));
  const half = (GRID_SIZE * CELL_SIZE) / 2;
  const altitudeObstacles = [];
  const altitudeSurfaceCells = [];

  const altitudeCubeGeo = new THREE.BoxGeometry(
    ALTITUDE_CUBE_SIZE,
    ALTITUDE_CUBE_SIZE,
    ALTITUDE_CUBE_SIZE
  );

  for (let dz = 0; dz < ALTITUDE_BLOCK.depth; dz += 1) {
    for (let dx = 0; dx < ALTITUDE_BLOCK.width; dx += 1) {
      const cellX = ALTITUDE_BLOCK.startX + dx;
      const cellZ = ALTITUDE_BLOCK.startZ + dz;
      const checkerOffset = ((dx + dz) & 1) === 0
        ? GRID_CONFIG.checkerLightnessOffset
        : -GRID_CONFIG.checkerLightnessOffset;
      const worldX = -half + cellX * CELL_SIZE + CELL_SIZE / 2;
      const worldZ = -half + cellZ * CELL_SIZE + CELL_SIZE / 2;
      const surfaceY = pathSet.has(`${cellX},${cellZ}`)
        ? getPathSurfaceY(cellX, cellZ)
        : FLOOR_Y + getPathSupportHeight(cellX, cellZ);

      altitudeObstacles.push({
        position: new THREE.Vector3(worldX, FLOOR_Y, worldZ),
        halfSize: TERRAIN_OBSTACLE_HALF_SIZE,
        height: surfaceY - FLOOR_Y,
        baseY: FLOOR_Y,
      });
      altitudeSurfaceCells.push({
        minX: worldX - CELL_SIZE * 0.5,
        maxX: worldX + CELL_SIZE * 0.5,
        minZ: worldZ - CELL_SIZE * 0.5,
        maxZ: worldZ + CELL_SIZE * 0.5,
        surfaceY,
      });

      for (let level = 0; level < ALTITUDE_BLOCK.height; level += 1) {
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
      const isPath = pathSet.has(`${cellX},${cellZ}`);
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
    minX: -half + moveInset,
    maxX: half - moveInset,
    minZ: -half + moveInset,
    maxZ: half - moveInset,
  };

  function worldToCell(worldX, worldZ) {
    const cx = Math.floor((worldX + half) / CELL_SIZE);
    const cz = Math.floor((worldZ + half) / CELL_SIZE);
    if (cx < 0 || cx >= GRID_SIZE || cz < 0 || cz >= GRID_SIZE) {
      return null;
    }
    return { x: cx, z: cz };
  }

  function isPathCell(cellX, cellZ) {
    return pathSet.has(`${cellX},${cellZ}`);
  }

  function getBuildSurfaceYAtWorld(worldX, worldZ) {
    const cell = worldToCell(worldX, worldZ);
    if (!cell || !isInsideAltitudeBlock(cell.x, cell.z)) {
      return FLOOR_Y;
    }
    if (isPathCell(cell.x, cell.z)) {
      return getPathSurfaceY(cell.x, cell.z);
    }
    return FLOOR_Y + getPathSupportHeight(cell.x, cell.z);
  }

  function raycastBuildSurface(ray, outPoint = new THREE.Vector3()) {
    if (!ray || !ray.origin || !ray.direction) {
      return false;
    }
    if (Math.abs(ray.direction.y) < GRID_CONFIG.rayParallelEpsilon) {
      return false;
    }

    let bestT = Infinity;
    const bestPoint = new THREE.Vector3();

    function testHorizontalSurface(surfaceY, inBounds) {
      const t = (surfaceY - ray.origin.y) / ray.direction.y;
      if (t < 0 || t >= bestT) {
        return;
      }
      const hitX = ray.origin.x + ray.direction.x * t;
      const hitZ = ray.origin.z + ray.direction.z * t;
      if (!inBounds(hitX, hitZ)) {
        return;
      }
      bestT = t;
      bestPoint.set(hitX, surfaceY, hitZ);
    }

    for (const surfaceCell of altitudeSurfaceCells) {
      testHorizontalSurface(
        surfaceCell.surfaceY,
        (x, z) => (
          x >= surfaceCell.minX &&
          x <= surfaceCell.maxX &&
          z >= surfaceCell.minZ &&
          z <= surfaceCell.maxZ
        )
      );
    }

    testHorizontalSurface(FLOOR_Y, (x, z) => worldToCell(x, z) !== null);

    if (!Number.isFinite(bestT)) {
      return false;
    }

    outPoint.copy(bestPoint);
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
