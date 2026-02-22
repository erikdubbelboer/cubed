import * as THREE from "https://esm.sh/three@0.161.0";

const GRID_SIZE = 12;
const CELL_SIZE = 4;
const PLATFORM_HEIGHT = 1.0;
const TILE_HEIGHT = 0.4;

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
  return new THREE.Vector3(x, TILE_HEIGHT + 0.65, z);
}

export function createGrid(scene) {
  const platform = new THREE.Mesh(
    new THREE.BoxGeometry(GRID_SIZE * CELL_SIZE + 2, PLATFORM_HEIGHT, GRID_SIZE * CELL_SIZE + 2),
    new THREE.MeshStandardMaterial({ color: 0x1c2438, roughness: 0.9, metalness: 0.05 })
  );
  platform.position.y = -PLATFORM_HEIGHT / 2;
  scene.add(platform);

  const pathSet = new Set(PATH_CELLS.map(([x, z]) => `${x},${z}`));
  const tileGeo = new THREE.BoxGeometry(CELL_SIZE * 0.94, TILE_HEIGHT, CELL_SIZE * 0.94);
  const baseTileMat = new THREE.MeshStandardMaterial({
    color: 0x5d739b,
    roughness: 0.8,
    metalness: 0.2,
  });
  const pathTileMat = new THREE.MeshStandardMaterial({
    color: 0xe1b463,
    roughness: 0.5,
    metalness: 0.4,
  });

  const half = (GRID_SIZE * CELL_SIZE) / 2;
  const tiles = [];

  for (let cellZ = 0; cellZ < GRID_SIZE; cellZ += 1) {
    for (let cellX = 0; cellX < GRID_SIZE; cellX += 1) {
      const isPath = pathSet.has(`${cellX},${cellZ}`);
      const tile = new THREE.Mesh(
        tileGeo,
        isPath ? pathTileMat : baseTileMat
      );

      tile.position.set(
        -half + cellX * CELL_SIZE + CELL_SIZE / 2,
        TILE_HEIGHT / 2,
        -half + cellZ * CELL_SIZE + CELL_SIZE / 2
      );
      tile.userData.cellX = cellX;
      tile.userData.cellZ = cellZ;
      tile.userData.isPath = isPath;
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

  function cellToWorldCenter(cellX, cellZ, y = TILE_HEIGHT) {
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
    tileTopY: TILE_HEIGHT,
    cellSize: CELL_SIZE,
    gridSize: GRID_SIZE,
    tiles,
    worldToCell,
    cellToWorldCenter,
    isPathCell,
  };
}
