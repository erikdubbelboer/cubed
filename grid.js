import * as THREE from "three";

const GRID_SIZE = 12;
const CELL_SIZE = 4;
const PLATFORM_HEIGHT = 1.0;
const TILE_HEIGHT = 0.4;
const FLOOR_Y = 0;
const PATH_TILE_TOP_Y = FLOOR_Y + TILE_HEIGHT;

const PATH_CELLS = [
  [0, 1],
  [1, 1],
  [2, 1],
  [3, 1],
  [3, 2],
  [3, 3],
  [2, 3],
  [1, 3],
  [1, 4],
  [1, 5],
  [2, 5],
  [3, 5],
  [4, 5],
  [5, 5],
  [6, 5],
  [6, 6],
  [6, 7],
  [5, 7],
  [4, 7],
  [3, 7],
  [2, 7],
  [2, 8],
  [2, 9],
  [3, 9],
  [4, 9],
  [5, 9],
  [6, 9],
  [7, 9],
  [8, 9],
  [9, 9],
  [10, 9],
];

function cellToWorld(cellX, cellZ) {
  const half = (GRID_SIZE * CELL_SIZE) / 2;
  const x = -half + cellX * CELL_SIZE + CELL_SIZE / 2;
  const z = -half + cellZ * CELL_SIZE + CELL_SIZE / 2;
  return new THREE.Vector3(x, PATH_TILE_TOP_Y + 0.65, z);
}

export function createGrid(scene) {
  const farFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(2400, 2400),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.24,
      roughness: 1.0,
      metalness: 0.0,
    })
  );
  farFloor.rotation.x = -Math.PI * 0.5;
  farFloor.position.y = FLOOR_Y;
  farFloor.receiveShadow = true;
  scene.add(farFloor);

  const platform = new THREE.Mesh(
    new THREE.BoxGeometry(GRID_SIZE * CELL_SIZE + 2, PLATFORM_HEIGHT, GRID_SIZE * CELL_SIZE + 2),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.2,
      roughness: 0.98,
      metalness: 0.0,
    })
  );
  platform.position.y = FLOOR_Y - (PLATFORM_HEIGHT / 2) - 0.08;
  platform.receiveShadow = true;
  scene.add(platform);

  const pathSet = new Set(PATH_CELLS.map(([x, z]) => `${x},${z}`));
  const tileGeo = new THREE.BoxGeometry(CELL_SIZE * 0.94, TILE_HEIGHT, CELL_SIZE * 0.94);
  const pathTileMat = new THREE.MeshStandardMaterial({
    color: 0xe9d5ab,
    roughness: 0.64,
    metalness: 0.08,
  });

  const half = (GRID_SIZE * CELL_SIZE) / 2;
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
        FLOOR_Y + (TILE_HEIGHT / 2),
        -half + cellZ * CELL_SIZE + CELL_SIZE / 2
      );
      tile.userData.cellX = cellX;
      tile.userData.cellZ = cellZ;
      tile.userData.isPath = isPath;
      tile.receiveShadow = true;
      tiles.push(tile);
      scene.add(tile);
    }
  }

  const pathWaypoints = PATH_CELLS.map(([x, z]) => cellToWorld(x, z));
  const moveInset = CELL_SIZE * 0.5;
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
    eyeHeight: 1.7,
    tileTopY: FLOOR_Y,
    pathTileTopY: PATH_TILE_TOP_Y,
    cellSize: CELL_SIZE,
    gridSize: GRID_SIZE,
    tiles,
    worldToCell,
    cellToWorldCenter,
    isPathCell,
  };
}
