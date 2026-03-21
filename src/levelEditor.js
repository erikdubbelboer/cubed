import * as THREE from "three";

const TOOL_BY_DIGIT = {
  1: "eraser",
  2: "wall",
  3: "spawn",
  4: "end",
  5: "ramp",
  6: "playerSpawn",
  7: "chest",
  8: "barrel",
  9: "stones",
};

const TOOL_ORDER = ["eraser", "wall", "spawn", "end", "ramp", "playerSpawn", "chest", "barrel", "stones"];
const TOOL_COLORS = {
  eraser: 0xff8b8b,
  wall: 0x7db9ff,
  spawn: 0x66f6a9,
  end: 0xffa884,
  ramp: 0xa0d8ff,
  playerSpawn: 0x60ff7f,
  chest: 0xf0c380,
  barrel: 0xc88356,
  stones: 0xaab6c5,
};
const DECORATION_TOOL_SET = new Set(["chest", "barrel", "stones"]);
const DECORATION_PREVIEW_SIZE = {
  chest: { width: 0.48, height: 0.34, depth: 0.36 },
  barrel: { width: 0.3, height: 0.34, depth: 0.3 },
  stones: { width: 0.46, height: 0.18, depth: 0.34 },
};
const DECORATION_MATCH_EPSILON = 0.08;
const DECORATION_ROTATION_STEP_DEGREES = 15;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeCardinalRotation(rawRotation = 0) {
  const numericRotation = Number(rawRotation);
  if (!Number.isFinite(numericRotation)) {
    return 0;
  }
  const quantized = Math.round(numericRotation / 90) * 90;
  return ((quantized % 360) + 360) % 360;
}

function normalizeFreeRotation(rawRotation = 0) {
  const numericRotation = Number(rawRotation);
  if (!Number.isFinite(numericRotation)) {
    return 0;
  }
  return ((numericRotation % 360) + 360) % 360;
}

function isDecorationTool(type) {
  return DECORATION_TOOL_SET.has(type);
}

function normalizeRotationForType(type, rawRotation = 0) {
  return isDecorationTool(type)
    ? normalizeFreeRotation(rawRotation)
    : normalizeCardinalRotation(rawRotation);
}

function cloneLevelObject(entry) {
  if (!entry || typeof entry !== "object") {
    return null;
  }
  const type = String(entry.type ?? "");
  return {
    type,
    position: {
      x: Number(entry.position?.x),
      y: Number(entry.position?.y),
      z: Number(entry.position?.z),
    },
    rotation: normalizeRotationForType(type, entry.rotation ?? 0),
  };
}

function isInteger3(position) {
  return Number.isInteger(position?.x) && Number.isInteger(position?.y) && Number.isInteger(position?.z);
}

function isFinite3(position) {
  return Number.isFinite(position?.x) && Number.isFinite(position?.y) && Number.isFinite(position?.z);
}

function key3(x, y, z) {
  return `${x},${y},${z}`;
}

function key2(x, z) {
  return `${x},${z}`;
}

function createToolObject(type, x, y, z, rotation = 0) {
  return {
    type,
    position: { x, y, z },
    rotation: normalizeRotationForType(type, rotation),
  };
}

function getRampDirectionFromRotation(rotation) {
  const normalized = normalizeCardinalRotation(rotation);
  if (normalized === 90) {
    return { x: 1, z: 0 };
  }
  if (normalized === 180) {
    return { x: 0, z: -1 };
  }
  if (normalized === 270) {
    return { x: -1, z: 0 };
  }
  return { x: 0, z: 1 };
}

function positionsMatch(a, b, epsilon = DECORATION_MATCH_EPSILON) {
  if (!a || !b) {
    return false;
  }
  return Math.abs(Number(a.x) - Number(b.x)) <= epsilon
    && Math.abs(Number(a.y) - Number(b.y)) <= epsilon
    && Math.abs(Number(a.z) - Number(b.z)) <= epsilon;
}

function createRampPreviewGeometry() {
  const halfLength = 1;
  const halfWidth = 0.5;
  const vertices = new Float32Array([
    -halfWidth, 0, -halfLength,
    halfWidth, 0, -halfLength,
    -halfWidth, 0, halfLength,
    halfWidth, 0, halfLength,
    -halfWidth, 1, halfLength,
    halfWidth, 1, halfLength,
  ]);
  const indices = [
    0, 5, 1,
    0, 4, 5,
    0, 2, 4,
    1, 5, 3,
    2, 3, 5,
    2, 5, 4,
  ];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  const flatGeometry = geometry.toNonIndexed();
  geometry.dispose();
  flatGeometry.computeVertexNormals();
  return flatGeometry;
}

function toWorldCenterForVoxel(grid, x, y, z, out = new THREE.Vector3()) {
  const cellSize = Math.max(0.0001, Number(grid?.cellSize) || 1);
  const floorY = Number(grid?.tileTopY) || 0;
  const worldCenter = typeof grid?.cellToWorldCenter === "function"
    ? grid.cellToWorldCenter(x, z, floorY + ((y + 0.5) * cellSize))
    : new THREE.Vector3(0, floorY + ((y + 0.5) * cellSize), 0);
  out.copy(worldCenter);
  return out;
}

function getEditorHitFromIntersection(intersection) {
  if (!intersection || !intersection.object) {
    return null;
  }
  let object = intersection.object;
  while (object && !object.userData?.editorObjectType) {
    object = object.parent;
  }
  if (!object) {
    return null;
  }
  return {
    intersection,
    object,
    editorType: object.userData.editorObjectType,
    editorWall: object.userData.editorWall ?? null,
    editorRamp: object.userData.editorRamp ?? null,
    editorMarker: object.userData.editorMarker ?? null,
    editorDecoration: object.userData.editorDecoration ?? null,
  };
}

export function createLevelEditor({
  scene,
  camera,
  grid,
  initialLevelObjects = [],
} = {}) {
  const raycaster = new THREE.Raycaster();
  const aimPoint = new THREE.Vector2(0, 0);
  const tempWorldNormal = new THREE.Vector3();
  const tempNormalMatrix = new THREE.Matrix3();
  const tempWorldPoint = new THREE.Vector3();
  const tempPreviewPos = new THREE.Vector3();
  const tempRampLowCenter = new THREE.Vector3();
  const tempRampHighCenter = new THREE.Vector3();
  const floorPlaneNormal = new THREE.Vector3(0, 1, 0);
  const floorHitPoint = new THREE.Vector3();

  let floorPlane = new THREE.Plane(floorPlaneNormal, -(Number(grid?.tileTopY) || 0));
  let selectedTool = "wall";
  let rampRotation = 0;
  let playerSpawnRotation = 0;
  const decorationRotationByType = {
    chest: 0,
    barrel: 0,
    stones: 0,
  };
  let lastCandidate = null;

  const wallMap = new Map();
  const spawnMap = new Map();
  const rampMap = new Map();
  const decorationObjects = [];
  let endMarker = null;
  let playerSpawnMarker = null;

  const previewMaterial = new THREE.MeshBasicMaterial({
    color: TOOL_COLORS.wall,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
  });
  previewMaterial.toneMapped = false;

  const previewRoot = new THREE.Group();
  previewRoot.name = "LevelEditorPreview";
  previewRoot.visible = false;
  scene.add(previewRoot);

  const previewCube = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), previewMaterial);
  const previewRamp = new THREE.Mesh(createRampPreviewGeometry(), previewMaterial);
  const previewChest = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), previewMaterial);
  const previewBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1, 12), previewMaterial);
  const previewStones = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), previewMaterial);
  const previewFacingArrowGeometry = new THREE.ConeGeometry(0.14, 0.36, 12);
  previewFacingArrowGeometry.rotateX(Math.PI * 0.5);
  const previewFacingArrow = new THREE.Mesh(previewFacingArrowGeometry, previewMaterial);
  previewCube.visible = false;
  previewRamp.visible = false;
  previewChest.visible = false;
  previewBarrel.visible = false;
  previewStones.visible = false;
  previewFacingArrow.visible = false;
  previewRoot.add(previewCube);
  previewRoot.add(previewRamp);
  previewRoot.add(previewChest);
  previewRoot.add(previewBarrel);
  previewRoot.add(previewStones);
  previewRoot.add(previewFacingArrow);

  function getGridSize() {
    return Math.max(1, Math.floor(Number(grid?.gridSize) || 1));
  }

  function getCellSize() {
    return Math.max(0.0001, Number(grid?.cellSize) || 1);
  }

  function getFloorY() {
    return Number(grid?.tileTopY) || 0;
  }

  function isInsideBounds(x, z) {
    const size = getGridSize();
    return x >= 0 && x < size && z >= 0 && z < size;
  }

  function getRampOccupiedCellsFor(ramp) {
    return getRampLayout(ramp.position.x, ramp.position.y, ramp.position.z, ramp.rotation).occupiedCells;
  }

  function getRampSurfaceKey(cellX, cellZ, level) {
    return `${cellX},${cellZ},${level}`;
  }

  function getRampLayout(x, y, z, rotation) {
    const direction = getRampDirectionFromRotation(rotation);
    const lowCell = { x, z };
    const highCell = {
      x: lowCell.x + direction.x,
      z: lowCell.z + direction.z,
    };
    const lowLevel = y;
    const highLevel = y + 1;
    return {
      lowCell,
      highCell,
      lowOuterCell: {
        x: lowCell.x - direction.x,
        z: lowCell.z - direction.z,
      },
      highOuterCell: {
        x: highCell.x + direction.x,
        z: highCell.z + direction.z,
      },
      lowLevel,
      highLevel,
      occupiedCells: [lowCell, highCell],
      occupiedSurfaceKeys: [
        getRampSurfaceKey(lowCell.x, lowCell.z, lowLevel),
        getRampSurfaceKey(highCell.x, highCell.z, highLevel),
      ],
      outerSurfaceKeys: [
        getRampSurfaceKey(lowCell.x - direction.x, lowCell.z - direction.z, lowLevel),
        getRampSurfaceKey(highCell.x + direction.x, highCell.z + direction.z, highLevel),
      ],
    };
  }

  function getWallStackHeightAt(cellX, cellZ) {
    let maxHeight = 0;
    for (const wall of wallMap.values()) {
      if (wall.position.x !== cellX || wall.position.z !== cellZ) {
        continue;
      }
      maxHeight = Math.max(maxHeight, wall.position.y + 1);
    }
    return maxHeight;
  }

  function findRampOccupyingCell(cellX, cellZ, ignoreRampKey = null) {
    for (const [rampKey, ramp] of rampMap.entries()) {
      if (ignoreRampKey && rampKey === ignoreRampKey) {
        continue;
      }
      const cells = getRampOccupiedCellsFor(ramp);
      if (cells.some((cell) => cell.x === cellX && cell.z === cellZ)) {
        return ramp;
      }
    }
    return null;
  }

  function doesRampConflictWithExistingRampEnds(layout, ignoreRampKey = null) {
    for (const [rampKey, ramp] of rampMap.entries()) {
      if (ignoreRampKey && rampKey === ignoreRampKey) {
        continue;
      }
      const existingLayout = getRampLayout(
        ramp.position.x,
        ramp.position.y,
        ramp.position.z,
        ramp.rotation
      );
      if (layout.occupiedSurfaceKeys.some((key) => existingLayout.outerSurfaceKeys.includes(key))) {
        return true;
      }
      if (layout.outerSurfaceKeys.some((key) => existingLayout.occupiedSurfaceKeys.includes(key))) {
        return true;
      }
    }
    return false;
  }

  function rebuildFromLevelObjects(entries) {
    wallMap.clear();
    spawnMap.clear();
    rampMap.clear();
    decorationObjects.length = 0;
    endMarker = null;
    playerSpawnMarker = null;
    playerSpawnRotation = 0;

    const normalized = Array.isArray(entries) ? entries : [];
    for (const rawEntry of normalized) {
      const entry = cloneLevelObject(rawEntry);
      if (!entry) {
        continue;
      }
      const type = String(entry.type || "").trim();
      if (isDecorationTool(type)) {
        if (!isFinite3(entry.position)) {
          continue;
        }
        decorationObjects.push(createToolObject(
          type,
          entry.position.x,
          entry.position.y,
          entry.position.z,
          entry.rotation
        ));
      } else if (!isInteger3(entry.position)) {
        continue;
      } else if (type === "wall") {
        wallMap.set(key3(entry.position.x, entry.position.y, entry.position.z), createToolObject(
          "wall",
          entry.position.x,
          entry.position.y,
          entry.position.z,
          0
        ));
      } else if (type === "spawn") {
        spawnMap.set(key3(entry.position.x, entry.position.y, entry.position.z), createToolObject(
          "spawn",
          entry.position.x,
          entry.position.y,
          entry.position.z,
          0
        ));
      } else if (type === "end") {
        endMarker = createToolObject("end", entry.position.x, entry.position.y, entry.position.z, 0);
      } else if (type === "playerSpawn") {
        playerSpawnMarker = createToolObject(
          "playerSpawn",
          entry.position.x,
          entry.position.y,
          entry.position.z,
          entry.rotation
        );
        playerSpawnRotation = playerSpawnMarker.rotation;
      } else if (type.toLowerCase() === "ramp") {
        const rampObject = createToolObject(
          "ramp",
          entry.position.x,
          entry.position.y,
          entry.position.z,
          entry.rotation
        );
        rampMap.set(key3(rampObject.position.x, rampObject.position.y, rampObject.position.z), rampObject);
      }
    }
  }

  function getRampCellOccupancyMap(ignoreRampKey = null) {
    const occupied = new Map();
    for (const [rampKey, ramp] of rampMap.entries()) {
      if (ignoreRampKey && rampKey === ignoreRampKey) {
        continue;
      }
      const cells = getRampOccupiedCellsFor(ramp);
      for (const cell of cells) {
        occupied.set(key2(cell.x, cell.z), rampKey);
      }
    }
    return occupied;
  }

  function canPlaceWallAt(x, y, z) {
    if (!isInsideBounds(x, z) || y < 0) {
      return false;
    }
    if (wallMap.has(key3(x, y, z))) {
      return false;
    }
    const occupyingRamp = findRampOccupyingCell(x, z);
    if (!occupyingRamp) {
      return true;
    }
    return y < occupyingRamp.position.y;
  }

  function canPlaceRampAt(x, y, z, rotation, ignoreRampKey = null) {
    if (!isInsideBounds(x, z) || y < 0) {
      return false;
    }
    const layout = getRampLayout(x, y, z, rotation);
    const { lowCell, highCell } = layout;
    if (!isInsideBounds(highCell.x, highCell.z)) {
      return false;
    }

    const occupiedRampCells = getRampCellOccupancyMap(ignoreRampKey);
    if (occupiedRampCells.has(key2(lowCell.x, lowCell.z)) || occupiedRampCells.has(key2(highCell.x, highCell.z))) {
      return false;
    }

    const lowWallHeight = getWallStackHeightAt(lowCell.x, lowCell.z);
    const highWallHeight = getWallStackHeightAt(highCell.x, highCell.z);
    if (lowWallHeight > y || highWallHeight > y) {
      return false;
    }

    return !doesRampConflictWithExistingRampEnds(layout, ignoreRampKey);
  }

  function toCellAndLevelAtPoint(worldPoint) {
    if (!worldPoint || typeof grid?.worldToCell !== "function") {
      return null;
    }
    const cell = grid.worldToCell(worldPoint.x, worldPoint.z);
    if (!cell || !Number.isInteger(cell.x) || !Number.isInteger(cell.z)) {
      return null;
    }
    const yLevel = Math.floor((worldPoint.y - getFloorY()) / getCellSize());
    if (!Number.isFinite(yLevel)) {
      return null;
    }
    return {
      x: cell.x,
      y: Math.max(0, yLevel),
      z: cell.z,
    };
  }

  function findDecorationIndexMatchingTarget(target) {
    if (!target || !isDecorationTool(target.type)) {
      return -1;
    }
    return decorationObjects.findIndex((entry) => {
      return entry.type === target.type
        && positionsMatch(entry.position, target.position)
        && Math.abs(Number(entry.rotation) - Number(target.rotation)) <= 0.001;
    });
  }

  function getPlacementCandidate() {
    raycaster.setFromCamera(aimPoint, camera);

    const targets = typeof grid?.getEditorRaycastTargets === "function"
      ? grid.getEditorRaycastTargets()
      : [];
    const intersections = Array.isArray(targets) && targets.length > 0
      ? raycaster.intersectObjects(targets, true)
      : [];
    const firstHit = intersections.length > 0
      ? getEditorHitFromIntersection(intersections[0])
      : null;

    if (selectedTool === "eraser") {
      if (!firstHit) {
        return { valid: false, mode: "eraser", target: null };
      }
      if (isDecorationTool(firstHit.editorType) && firstHit.editorDecoration) {
        return {
          valid: true,
          mode: "eraser",
          target: { type: firstHit.editorType, ...cloneLevelObject(firstHit.editorDecoration) },
        };
      }
      if (firstHit.editorType === "wall" && firstHit.editorWall) {
        return {
          valid: true,
          mode: "eraser",
          target: { type: "wall", ...firstHit.editorWall },
        };
      }
      if (firstHit.editorType === "ramp" && firstHit.editorRamp) {
        return {
          valid: true,
          mode: "eraser",
          target: { type: "ramp", ...firstHit.editorRamp },
        };
      }
      if (
        (firstHit.editorType === "spawn" || firstHit.editorType === "end" || firstHit.editorType === "playerSpawn")
        && firstHit.editorMarker
      ) {
        return {
          valid: true,
          mode: "eraser",
          target: { type: firstHit.editorType, ...firstHit.editorMarker },
        };
      }
      return { valid: false, mode: "eraser", target: null };
    }

    if (isDecorationTool(selectedTool)) {
      const didHitSurface = typeof grid?.raycastBuildSurface === "function"
        ? grid.raycastBuildSurface(raycaster.ray, floorHitPoint)
        : false;
      if (!didHitSurface) {
        return { valid: false, mode: selectedTool, target: null };
      }
      const surfaceY = typeof grid?.getBuildSurfaceYAtWorld === "function"
        ? grid.getBuildSurfaceYAtWorld(floorHitPoint.x, floorHitPoint.z)
        : floorHitPoint.y;
      const rotation = normalizeFreeRotation(decorationRotationByType[selectedTool] ?? 0);
      const target = {
        type: selectedTool,
        position: {
          x: floorHitPoint.x,
          y: surfaceY,
          z: floorHitPoint.z,
        },
        rotation,
      };
      return {
        valid: findDecorationIndexMatchingTarget(target) === -1,
        mode: selectedTool,
        target,
      };
    }

    let placement = null;
    if (firstHit) {
      tempWorldPoint.copy(firstHit.intersection.point);
      if (firstHit.intersection.face) {
        tempNormalMatrix.getNormalMatrix(firstHit.object.matrixWorld);
        tempWorldNormal.copy(firstHit.intersection.face.normal).applyMatrix3(tempNormalMatrix).normalize();
      } else {
        tempWorldNormal.copy(raycaster.ray.direction).multiplyScalar(-1);
      }
      tempWorldPoint.addScaledVector(tempWorldNormal, getCellSize() * 0.501);
      placement = toCellAndLevelAtPoint(tempWorldPoint);
    } else if (raycaster.ray.intersectPlane(floorPlane, floorHitPoint)) {
      const floorCell = typeof grid?.worldToCell === "function"
        ? grid.worldToCell(floorHitPoint.x, floorHitPoint.z)
        : null;
      if (floorCell) {
        placement = {
          x: floorCell.x,
          y: 0,
          z: floorCell.z,
        };
      }
    }

    if (!placement) {
      return { valid: false, mode: selectedTool, target: null };
    }

    if (selectedTool === "wall") {
      return {
        valid: canPlaceWallAt(placement.x, placement.y, placement.z),
        mode: "wall",
        target: placement,
      };
    }

    if (selectedTool === "ramp") {
      const rampKey = key3(placement.x, placement.y, placement.z);
      const valid = canPlaceRampAt(placement.x, placement.y, placement.z, rampRotation, rampKey);
      return {
        valid,
        mode: "ramp",
        target: {
          ...placement,
          rotation: rampRotation,
        },
      };
    }

    if (selectedTool === "spawn") {
      const valid = isInsideBounds(placement.x, placement.z)
        && placement.y >= 0
        && !spawnMap.has(key3(placement.x, placement.y, placement.z));
      return {
        valid,
        mode: "spawn",
        target: placement,
      };
    }

    if (selectedTool === "end") {
      const valid = isInsideBounds(placement.x, placement.z)
        && placement.y >= 0
        && (!endMarker || key3(endMarker.position.x, endMarker.position.y, endMarker.position.z) !== key3(placement.x, placement.y, placement.z));
      return {
        valid,
        mode: "end",
        target: placement,
      };
    }

    if (selectedTool === "playerSpawn") {
      const nextRotation = normalizeCardinalRotation(playerSpawnRotation);
      const hasExisting = !!playerSpawnMarker;
      const samePosition = hasExisting
        && key3(playerSpawnMarker.position.x, playerSpawnMarker.position.y, playerSpawnMarker.position.z)
          === key3(placement.x, placement.y, placement.z);
      const sameRotation = samePosition && normalizeCardinalRotation(playerSpawnMarker.rotation) === nextRotation;
      const valid = isInsideBounds(placement.x, placement.z)
        && placement.y >= 0
        && (!samePosition || !sameRotation);
      return {
        valid,
        mode: "playerSpawn",
        target: {
          ...placement,
          rotation: nextRotation,
        },
      };
    }

    return {
      valid: isInsideBounds(placement.x, placement.z) && placement.y >= 0,
      mode: selectedTool,
      target: placement,
    };
  }

  function updatePreview(candidate) {
    previewRoot.visible = !!candidate?.target;
    if (!previewRoot.visible) {
      previewCube.visible = false;
      previewRamp.visible = false;
      previewChest.visible = false;
      previewBarrel.visible = false;
      previewStones.visible = false;
      previewFacingArrow.visible = false;
      return;
    }

    const isValid = !!candidate.valid;
    const previewColor = candidate.mode === "eraser"
      ? 0xff6c6c
      : (isValid ? (TOOL_COLORS[selectedTool] ?? TOOL_COLORS.wall) : 0xff6c6c);
    previewMaterial.color.setHex(previewColor);
    previewMaterial.opacity = candidate.mode === "eraser"
      ? 0.28
      : (isValid ? 0.38 : 0.23);

    if (candidate.mode === "eraser") {
      previewFacingArrow.visible = false;
      const target = candidate.target;
      if (target?.type === "ramp") {
        previewCube.visible = false;
        previewChest.visible = false;
        previewBarrel.visible = false;
        previewStones.visible = false;
        previewRamp.visible = true;
        const direction = getRampDirectionFromRotation(target.rotation);
        const high = {
          x: target.x + direction.x,
          y: target.y,
          z: target.z + direction.z,
        };
        const cellSize = getCellSize();
        const lowBaseY = getFloorY() + (target.y * cellSize);
        if (typeof grid?.cellToWorldCenter === "function") {
          tempRampLowCenter.copy(grid.cellToWorldCenter(target.x, target.z, lowBaseY));
          tempRampHighCenter.copy(grid.cellToWorldCenter(high.x, high.z, lowBaseY));
          tempPreviewPos.copy(tempRampLowCenter).add(tempRampHighCenter).multiplyScalar(0.5);
          tempPreviewPos.y = lowBaseY;
        } else {
          tempPreviewPos.set(0, lowBaseY, 0);
        }
        previewRamp.position.copy(tempPreviewPos);
        previewRamp.rotation.set(0, THREE.MathUtils.degToRad(target.rotation), 0);
        previewRamp.scale.set(cellSize, cellSize, cellSize);
        return;
      }
      if (isDecorationTool(target?.type)) {
        previewCube.visible = false;
        previewRamp.visible = false;
        previewChest.visible = target.type === "chest";
        previewBarrel.visible = target.type === "barrel";
        previewStones.visible = target.type === "stones";
        const previewConfig = DECORATION_PREVIEW_SIZE[target.type] ?? DECORATION_PREVIEW_SIZE.chest;
        const previewMesh = target.type === "chest"
          ? previewChest
          : (target.type === "barrel" ? previewBarrel : previewStones);
        const cellSize = getCellSize();
        previewMesh.position.set(
          Number(target.position?.x) || 0,
          (Number(target.position?.y) || 0) + (previewConfig.height * cellSize * 0.5),
          Number(target.position?.z) || 0
        );
        previewMesh.rotation.set(0, THREE.MathUtils.degToRad(Number(target.rotation) || 0), 0);
        previewMesh.scale.set(
          previewConfig.width * cellSize,
          previewConfig.height * cellSize,
          previewConfig.depth * cellSize
        );
        return;
      }
    }

    if (candidate.mode === "ramp") {
      previewCube.visible = false;
      previewRamp.visible = true;
      previewChest.visible = false;
      previewBarrel.visible = false;
      previewStones.visible = false;
      previewFacingArrow.visible = false;
      const direction = getRampDirectionFromRotation(candidate.target.rotation);
      const low = candidate.target;
      const high = {
        x: low.x + direction.x,
        y: low.y,
        z: low.z + direction.z,
      };
      const cellSize = getCellSize();
      const lowBaseY = getFloorY() + (low.y * cellSize);
      if (typeof grid?.cellToWorldCenter === "function") {
        tempRampLowCenter.copy(grid.cellToWorldCenter(low.x, low.z, lowBaseY));
        tempRampHighCenter.copy(grid.cellToWorldCenter(high.x, high.z, lowBaseY));
        tempPreviewPos.copy(tempRampLowCenter).add(tempRampHighCenter).multiplyScalar(0.5);
        tempPreviewPos.y = lowBaseY;
      } else {
        tempPreviewPos.set(0, lowBaseY, 0);
      }
      previewRamp.position.copy(tempPreviewPos);
      previewRamp.rotation.set(0, THREE.MathUtils.degToRad(candidate.target.rotation), 0);
      previewRamp.scale.set(cellSize, cellSize, cellSize);
      return;
    }

    if (isDecorationTool(candidate.mode)) {
      previewCube.visible = false;
      previewRamp.visible = false;
      previewFacingArrow.visible = false;
      previewChest.visible = candidate.mode === "chest";
      previewBarrel.visible = candidate.mode === "barrel";
      previewStones.visible = candidate.mode === "stones";
      const target = candidate.target?.position ?? candidate.target;
      const cellSize = getCellSize();
      const previewConfig = DECORATION_PREVIEW_SIZE[candidate.mode] ?? DECORATION_PREVIEW_SIZE.chest;
      const previewMesh = candidate.mode === "chest"
        ? previewChest
        : (candidate.mode === "barrel" ? previewBarrel : previewStones);
      previewMesh.position.set(
        Number(target?.x) || 0,
        (Number(target?.y) || 0) + (previewConfig.height * cellSize * 0.5),
        Number(target?.z) || 0
      );
      previewMesh.rotation.set(0, THREE.MathUtils.degToRad(Number(candidate.target?.rotation) || 0), 0);
      previewMesh.scale.set(
        previewConfig.width * cellSize,
        previewConfig.height * cellSize,
        previewConfig.depth * cellSize
      );
      return;
    }

    previewRamp.visible = false;
    previewChest.visible = false;
    previewBarrel.visible = false;
    previewStones.visible = false;
    previewCube.visible = true;
    previewFacingArrow.visible = candidate.mode === "playerSpawn";
    const target = candidate.target;
    toWorldCenterForVoxel(grid, target.x, target.y, target.z, tempPreviewPos);
    previewCube.position.copy(tempPreviewPos);
    const cellSize = getCellSize();
    const rotationY = candidate.mode === "playerSpawn"
      ? THREE.MathUtils.degToRad(target.rotation)
      : 0;
    previewCube.rotation.set(0, rotationY, 0);
    previewCube.scale.set(cellSize, cellSize, cellSize);
    if (previewFacingArrow.visible) {
      previewFacingArrow.position.copy(tempPreviewPos);
      previewFacingArrow.position.y += cellSize * 0.64;
      previewFacingArrow.rotation.set(0, rotationY, 0);
      previewFacingArrow.scale.set(cellSize, cellSize, cellSize);
    }
  }

  function removeTarget(target) {
    if (!target || typeof target !== "object") {
      return false;
    }
    if (isDecorationTool(target.type)) {
      const index = findDecorationIndexMatchingTarget(target);
      if (index < 0) {
        return false;
      }
      decorationObjects.splice(index, 1);
      return true;
    }
    if (target.type === "wall") {
      return wallMap.delete(key3(target.x, target.y, target.z));
    }
    if (target.type === "ramp") {
      return rampMap.delete(key3(target.x, target.y, target.z));
    }
    if (target.type === "spawn") {
      return spawnMap.delete(key3(target.x, target.y, target.z));
    }
    if (target.type === "end") {
      if (!endMarker) {
        return false;
      }
      if (
        endMarker.position.x !== target.x
        || endMarker.position.y !== target.y
        || endMarker.position.z !== target.z
      ) {
        return false;
      }
      endMarker = null;
      return true;
    }
    if (target.type === "playerSpawn") {
      if (!playerSpawnMarker) {
        return false;
      }
      if (
        playerSpawnMarker.position.x !== target.x
        || playerSpawnMarker.position.y !== target.y
        || playerSpawnMarker.position.z !== target.z
      ) {
        return false;
      }
      playerSpawnMarker = null;
      return true;
    }
    return false;
  }

  function addTarget(candidate) {
    if (!candidate?.target) {
      return false;
    }
    if (isDecorationTool(candidate.mode)) {
      const next = createToolObject(
        candidate.mode,
        Number(candidate.target.position?.x) || 0,
        Number(candidate.target.position?.y) || 0,
        Number(candidate.target.position?.z) || 0,
        candidate.target.rotation ?? 0
      );
      if (findDecorationIndexMatchingTarget(next) !== -1) {
        return false;
      }
      decorationObjects.push(next);
      return true;
    }
    const { x, y, z } = candidate.target;
    if (candidate.mode === "wall") {
      const key = key3(x, y, z);
      if (wallMap.has(key)) {
        return false;
      }
      wallMap.set(key, createToolObject("wall", x, y, z, 0));
      return true;
    }
    if (candidate.mode === "spawn") {
      const key = key3(x, y, z);
      if (spawnMap.has(key)) {
        return false;
      }
      spawnMap.set(key, createToolObject("spawn", x, y, z, 0));
      return true;
    }
    if (candidate.mode === "end") {
      const next = createToolObject("end", x, y, z, 0);
      if (endMarker && key3(endMarker.position.x, endMarker.position.y, endMarker.position.z) === key3(x, y, z)) {
        return false;
      }
      endMarker = next;
      return true;
    }
    if (candidate.mode === "playerSpawn") {
      const nextRotation = normalizeCardinalRotation(candidate.target.rotation);
      const next = createToolObject("playerSpawn", x, y, z, nextRotation);
      if (
        playerSpawnMarker
        && key3(playerSpawnMarker.position.x, playerSpawnMarker.position.y, playerSpawnMarker.position.z) === key3(x, y, z)
        && playerSpawnMarker.rotation === nextRotation
      ) {
        return false;
      }
      playerSpawnMarker = next;
      playerSpawnRotation = nextRotation;
      return true;
    }
    if (candidate.mode === "ramp") {
      const key = key3(x, y, z);
      const nextRotation = normalizeCardinalRotation(candidate.target.rotation);
      if (!canPlaceRampAt(x, y, z, nextRotation, key)) {
        return false;
      }
      const previous = rampMap.get(key);
      if (previous && previous.rotation === nextRotation) {
        return false;
      }
      rampMap.set(key, createToolObject("ramp", x, y, z, nextRotation));
      return true;
    }
    return false;
  }

  function getLevelObjects() {
    const objects = [];
    for (const wall of wallMap.values()) {
      objects.push(cloneLevelObject(wall));
    }
    if (playerSpawnMarker) {
      objects.push(cloneLevelObject(playerSpawnMarker));
    }
    if (endMarker) {
      objects.push(cloneLevelObject(endMarker));
    }
    for (const spawn of spawnMap.values()) {
      objects.push(cloneLevelObject(spawn));
    }
    for (const ramp of rampMap.values()) {
      objects.push(cloneLevelObject(ramp));
    }
    for (const decoration of decorationObjects) {
      objects.push(cloneLevelObject(decoration));
    }
    return objects;
  }

  function getExportPayload() {
    return {
      levelObjects: getLevelObjects(),
    };
  }

  function setSelectedTool(nextTool) {
    if (!TOOL_ORDER.includes(nextTool)) {
      return false;
    }
    selectedTool = nextTool;
    if (selectedTool === "playerSpawn" && playerSpawnMarker) {
      playerSpawnRotation = normalizeCardinalRotation(playerSpawnMarker.rotation);
    }
    return true;
  }

  function rotateDecoration(step = 1) {
    const normalizedStep = Math.sign(Number(step) || 0);
    if (normalizedStep === 0 || !isDecorationTool(selectedTool)) {
      return isDecorationTool(selectedTool) ? normalizeFreeRotation(decorationRotationByType[selectedTool] ?? 0) : null;
    }
    const currentRotation = normalizeFreeRotation(decorationRotationByType[selectedTool] ?? 0);
    const nextRotation = normalizeFreeRotation(currentRotation + (normalizedStep * DECORATION_ROTATION_STEP_DEGREES));
    decorationRotationByType[selectedTool] = nextRotation;
    return nextRotation;
  }

  function selectToolByDigit(rawDigit) {
    const digit = Number(rawDigit);
    const nextTool = TOOL_BY_DIGIT[digit];
    if (!nextTool) {
      return false;
    }
    return setSelectedTool(nextTool);
  }

  function rotateRamp(step = 1) {
    const normalizedStep = Math.sign(Number(step) || 0);
    if (normalizedStep === 0) {
      return rampRotation;
    }
    rampRotation = normalizeCardinalRotation(rampRotation + normalizedStep * 90);
    return rampRotation;
  }

  function rotatePlayerSpawn(step = 1) {
    const normalizedStep = Math.sign(Number(step) || 0);
    if (normalizedStep === 0) {
      return playerSpawnRotation;
    }
    playerSpawnRotation = normalizeCardinalRotation(playerSpawnRotation + normalizedStep * 90);
    return playerSpawnRotation;
  }

  function rotateSelectedTool(step = 1) {
    if (selectedTool === "ramp") {
      return rotateRamp(step);
    }
    if (selectedTool === "playerSpawn") {
      return rotatePlayerSpawn(step);
    }
    if (isDecorationTool(selectedTool)) {
      return rotateDecoration(step);
    }
    return null;
  }

  function setGrid(nextGrid) {
    grid = nextGrid;
    floorPlane = new THREE.Plane(floorPlaneNormal, -getFloorY());
  }

  function update() {
    lastCandidate = getPlacementCandidate();
    updatePreview(lastCandidate);
  }

  function applyPrimaryAction() {
    // Re-sample candidate at action time so recent wheel/tool/camera changes are never one-frame stale.
    lastCandidate = getPlacementCandidate();
    updatePreview(lastCandidate);
    if (!lastCandidate || !lastCandidate.valid) {
      return false;
    }
    if (lastCandidate.mode === "eraser") {
      return removeTarget(lastCandidate.target);
    }
    return addTarget(lastCandidate);
  }

  function dispose() {
    scene.remove(previewRoot);
    previewRoot.traverse((child) => {
      if (child?.geometry && typeof child.geometry.dispose === "function") {
        child.geometry.dispose();
      }
      if (!child?.material) {
        return;
      }
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of materials) {
        material?.dispose?.();
      }
    });
  }

  rebuildFromLevelObjects(initialLevelObjects);

  return {
    update,
    dispose,
    applyPrimaryAction,
    selectToolByDigit,
    setSelectedTool,
    rotateRamp,
    rotatePlayerSpawn,
    rotateSelectedTool,
    setGrid,
    getLevelObjects,
    getExportPayload,
    getSelectedTool: () => selectedTool,
    getRampRotation: () => rampRotation,
    getPlayerSpawnRotation: () => playerSpawnRotation,
  };
}
