import * as THREE from "three";
import { createDecorationVisual, isKenneyAssetManagedResource } from "./kenneyModels.js";
import {
  DECORATIVE_MODEL_SPECS,
  EDITOR_DOODAD_PAGE_COLUMNS,
  EDITOR_DOODAD_PAGE_ROWS,
  EDITOR_DOODAD_PAGE_SIZE,
  getDecorativeModelSpec,
  isDecorativeObjectType,
} from "./modelCatalog.js";

const TOOL_BY_DIGIT = {
  1: "eraser",
  2: "wall",
  3: "spawn",
  4: "end",
  5: "ramp",
  6: "playerSpawn",
  7: "doodads",
};

const TOOL_ORDER = ["eraser", "wall", "spawn", "end", "ramp", "playerSpawn", "doodads"];
const TOOL_COLORS = {
  eraser: 0xff8b8b,
  wall: 0x7db9ff,
  spawn: 0x66f6a9,
  end: 0xffa884,
  ramp: 0xa0d8ff,
  playerSpawn: 0x60ff7f,
  doodads: 0xc7bb8a,
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
  return isDecorativeObjectType(type);
}

function isGridSnappedDecorationType(type) {
  return getDecorativeModelSpec(type)?.placement === "grid";
}

function getDecorationRotationStepDegrees(type) {
  const configuredStep = Number(getDecorativeModelSpec(type)?.rotationStepDegrees);
  return Number.isFinite(configuredStep) && configuredStep > 0
    ? configuredStep
    : DECORATION_ROTATION_STEP_DEGREES;
}

function normalizeDecorationRotation(type, rawRotation = 0) {
  const normalized = normalizeFreeRotation(rawRotation);
  const configuredStep = Number(getDecorativeModelSpec(type)?.rotationStepDegrees);
  if (!Number.isFinite(configuredStep) || configuredStep <= 0 || configuredStep >= 360) {
    return normalized;
  }
  const quantized = Math.round(normalized / configuredStep) * configuredStep;
  return ((quantized % 360) + 360) % 360;
}

function normalizeRotationForType(type, rawRotation = 0) {
  return isDecorationTool(type)
    ? normalizeDecorationRotation(type, rawRotation)
    : normalizeCardinalRotation(rawRotation);
}

function getToolColor(type) {
  return TOOL_COLORS[isDecorationTool(type) ? "doodads" : type] ?? TOOL_COLORS.wall;
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
  let selectedDoodadType = DECORATIVE_MODEL_SPECS[0]?.type ?? "chest";
  let doodadMenuOpen = false;
  let doodadMenuIndex = Math.max(
    0,
    DECORATIVE_MODEL_SPECS.findIndex((entry) => entry.type === selectedDoodadType)
  );
  const decorationRotationByType = Object.fromEntries(
    DECORATIVE_MODEL_SPECS.map((entry) => [entry.type, 0])
  );
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
  const previewFacingArrowGeometry = new THREE.ConeGeometry(0.14, 0.36, 12);
  previewFacingArrowGeometry.rotateX(Math.PI * 0.5);
  const previewFacingArrow = new THREE.Mesh(previewFacingArrowGeometry, previewMaterial);
  const previewDecorationRoot = new THREE.Group();
  let previewDecorationVisual = null;
  let previewDecorationVisualKey = "";
  previewCube.visible = false;
  previewRamp.visible = false;
  previewDecorationRoot.visible = false;
  previewFacingArrow.visible = false;
  previewRoot.add(previewCube);
  previewRoot.add(previewRamp);
  previewRoot.add(previewDecorationRoot);
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

  function disposePreviewVisualResources(root) {
    if (!root) {
      return;
    }
    const disposedMaterials = new Set();
    root.traverse((child) => {
      if (!child?.material) {
        return;
      }
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of materials) {
        if (
          !material
          || disposedMaterials.has(material)
          || typeof material.dispose !== "function"
          || isKenneyAssetManagedResource(material)
        ) {
          continue;
        }
        disposedMaterials.add(material);
        material.dispose();
      }
    });
  }

  function clearPreviewDecorationVisual() {
    if (previewDecorationVisual?.parent) {
      previewDecorationVisual.parent.remove(previewDecorationVisual);
    }
    disposePreviewVisualResources(previewDecorationVisual);
    previewDecorationVisual = null;
    previewDecorationVisualKey = "";
  }

  function ensurePreviewDecorationVisual(type, previewColor, previewOpacity) {
    const normalizedType = typeof type === "string" ? type.trim().toLowerCase() : "";
    if (!isDecorationTool(normalizedType)) {
      clearPreviewDecorationVisual();
      return null;
    }
    const colorHex = Number(previewColor) || 0xffffff;
    const opacity = THREE.MathUtils.clamp(Number(previewOpacity) || 1, 0.05, 1);
    const nextKey = `${normalizedType}:${colorHex}:${opacity.toFixed(3)}`;
    if (previewDecorationVisual && previewDecorationVisualKey === nextKey) {
      return previewDecorationVisual;
    }
    clearPreviewDecorationVisual();
    previewDecorationVisual = createDecorationVisual(normalizedType, {
      instanceMaterialStyle: {
        color: colorHex,
        emissive: colorHex,
        emissiveIntensity: 0.18,
        roughness: 0.82,
        metalness: 0.02,
        opacity,
        transparent: true,
        useMap: false,
      },
    });
    previewDecorationVisualKey = nextKey;
    if (previewDecorationVisual) {
      previewDecorationRoot.add(previewDecorationVisual);
    }
    return previewDecorationVisual;
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

  function getDecorationPlacementPosition(type, worldPoint) {
    if (!worldPoint) {
      return null;
    }
    const supportY = typeof grid?.getSupportSurfaceYBelowWorld === "function"
      ? Number(grid.getSupportSurfaceYBelowWorld(worldPoint.x, worldPoint.y, worldPoint.z))
      : Number(worldPoint.y);
    if (!isGridSnappedDecorationType(type)) {
      return {
        x: Number(worldPoint.x) || 0,
        y: Number.isFinite(supportY) ? supportY : (Number(worldPoint.y) || 0),
        z: Number(worldPoint.z) || 0,
      };
    }
    const cell = typeof grid?.worldToCell === "function"
      ? grid.worldToCell(worldPoint.x, worldPoint.z)
      : null;
    if (!cell || !Number.isInteger(cell.x) || !Number.isInteger(cell.z)) {
      return null;
    }
    const snappedCenter = typeof grid?.cellToWorldCenter === "function"
      ? grid.cellToWorldCenter(cell.x, cell.z, 0)
      : null;
    if (!snappedCenter) {
      return null;
    }
    const snappedSupportY = typeof grid?.getSupportSurfaceYBelowWorld === "function"
      ? Number(grid.getSupportSurfaceYBelowWorld(snappedCenter.x, worldPoint.y, snappedCenter.z))
      : supportY;
    return {
      x: snappedCenter.x,
      y: Number.isFinite(snappedSupportY) ? snappedSupportY : (Number(worldPoint.y) || 0),
      z: snappedCenter.z,
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
    if (doodadMenuOpen) {
      return { valid: false, mode: "doodad_menu", target: null };
    }
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
      const position = getDecorationPlacementPosition(selectedTool, floorHitPoint);
      if (!position) {
        return { valid: false, mode: selectedTool, target: null };
      }
      const rotation = normalizeDecorationRotation(selectedTool, decorationRotationByType[selectedTool] ?? 0);
      const target = {
        type: selectedTool,
        position,
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
      previewDecorationRoot.visible = false;
      previewFacingArrow.visible = false;
      return;
    }

    const isValid = !!candidate.valid;
    const previewColor = candidate.mode === "eraser"
      ? 0xff6c6c
      : (isValid ? getToolColor(selectedTool) : 0xff6c6c);
    previewMaterial.color.setHex(previewColor);
    previewMaterial.opacity = candidate.mode === "eraser"
      ? 0.28
      : (isValid ? 0.38 : 0.23);

    if (candidate.mode === "eraser") {
      previewFacingArrow.visible = false;
      const target = candidate.target;
      if (target?.type === "ramp") {
        previewCube.visible = false;
        previewDecorationRoot.visible = false;
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
        previewDecorationRoot.visible = true;
        const previewVisual = ensurePreviewDecorationVisual(target.type, previewColor, previewMaterial.opacity);
        if (previewVisual) {
          previewDecorationRoot.position.set(
            Number(target.position?.x) || 0,
            Number(target.position?.y) || 0,
            Number(target.position?.z) || 0
          );
          previewDecorationRoot.rotation.set(0, THREE.MathUtils.degToRad(Number(target.rotation) || 0), 0);
        }
        return;
      }
    }

    if (candidate.mode === "ramp") {
      previewCube.visible = false;
      previewRamp.visible = true;
      previewDecorationRoot.visible = false;
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
      previewDecorationRoot.visible = true;
      previewFacingArrow.visible = false;
      const target = candidate.target?.position ?? candidate.target;
      const previewVisual = ensurePreviewDecorationVisual(candidate.mode, previewColor, previewMaterial.opacity);
      if (previewVisual) {
        previewDecorationRoot.position.set(
          Number(target?.x) || 0,
          Number(target?.y) || 0,
          Number(target?.z) || 0
        );
        previewDecorationRoot.rotation.set(0, THREE.MathUtils.degToRad(Number(candidate.target?.rotation) || 0), 0);
      }
      return;
    }

    previewRamp.visible = false;
    previewDecorationRoot.visible = false;
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

  function getDoodadCount() {
    return DECORATIVE_MODEL_SPECS.length;
  }

  function getDoodadPageCount() {
    return Math.max(1, Math.ceil(getDoodadCount() / EDITOR_DOODAD_PAGE_SIZE));
  }

  function getSelectedInventoryTool() {
    return doodadMenuOpen
      ? "doodads"
      : (isDecorationTool(selectedTool) ? "doodads" : selectedTool);
  }

  function syncDoodadMenuIndexToType(type) {
    const normalizedType = typeof type === "string" ? type.trim().toLowerCase() : "";
    const nextIndex = DECORATIVE_MODEL_SPECS.findIndex((entry) => entry.type === normalizedType);
    if (nextIndex >= 0) {
      doodadMenuIndex = nextIndex;
    }
    return doodadMenuIndex;
  }

  function openDoodadMenu() {
    doodadMenuOpen = true;
    syncDoodadMenuIndexToType(selectedDoodadType);
    return true;
  }

  function closeDoodadMenu() {
    const wasOpen = doodadMenuOpen;
    doodadMenuOpen = false;
    return wasOpen;
  }

  function toggleDoodadMenu() {
    if (doodadMenuOpen) {
      doodadMenuOpen = false;
      return false;
    }
    openDoodadMenu();
    return true;
  }

  function chooseDoodadType(type, { closeMenu = true, selectTool = true } = {}) {
    const decorativeSpec = getDecorativeModelSpec(type);
    if (!decorativeSpec) {
      return false;
    }
    selectedDoodadType = decorativeSpec.type;
    syncDoodadMenuIndexToType(selectedDoodadType);
    if (selectTool) {
      selectedTool = selectedDoodadType;
    }
    if (closeMenu) {
      doodadMenuOpen = false;
    }
    return true;
  }

  function moveDoodadMenuSelection(dx = 0, dy = 0) {
    if (!doodadMenuOpen || getDoodadCount() === 0) {
      return false;
    }
    const doodadCount = getDoodadCount();
    const pageCount = getDoodadPageCount();
    const currentPage = Math.floor(doodadMenuIndex / EDITOR_DOODAD_PAGE_SIZE);
    const currentPageStart = currentPage * EDITOR_DOODAD_PAGE_SIZE;
    const currentPageEnd = Math.min(doodadCount, currentPageStart + EDITOR_DOODAD_PAGE_SIZE) - 1;
    const currentOffset = doodadMenuIndex - currentPageStart;
    const currentRow = Math.floor(currentOffset / EDITOR_DOODAD_PAGE_COLUMNS);
    const currentColumn = currentOffset % EDITOR_DOODAD_PAGE_COLUMNS;
    const currentPageRowCount = Math.floor((currentPageEnd - currentPageStart) / EDITOR_DOODAD_PAGE_COLUMNS) + 1;

    function resolvePageCellIndex(pageIndex, row, column) {
      const pageStart = pageIndex * EDITOR_DOODAD_PAGE_SIZE;
      const pageEnd = Math.min(doodadCount, pageStart + EDITOR_DOODAD_PAGE_SIZE) - 1;
      const pageRowCount = Math.floor((pageEnd - pageStart) / EDITOR_DOODAD_PAGE_COLUMNS) + 1;
      let nextRow = clamp(row, 0, pageRowCount - 1);
      let nextColumn = clamp(column, 0, EDITOR_DOODAD_PAGE_COLUMNS - 1);
      let nextIndex = pageStart + (nextRow * EDITOR_DOODAD_PAGE_COLUMNS) + nextColumn;
      while (nextIndex > pageEnd && nextColumn > 0) {
        nextColumn -= 1;
        nextIndex = pageStart + (nextRow * EDITOR_DOODAD_PAGE_COLUMNS) + nextColumn;
      }
      while (nextIndex > pageEnd && nextRow > 0) {
        nextRow -= 1;
        nextIndex = pageStart + (nextRow * EDITOR_DOODAD_PAGE_COLUMNS) + nextColumn;
        while (nextIndex > pageEnd && nextColumn > 0) {
          nextColumn -= 1;
          nextIndex = pageStart + (nextRow * EDITOR_DOODAD_PAGE_COLUMNS) + nextColumn;
        }
      }
      return clamp(nextIndex, pageStart, pageEnd);
    }

    let targetPage = currentPage;
    let targetRow = currentRow;
    if (Math.sign(Number(dy) || 0) < 0) {
      if (currentRow <= 0) {
        targetPage = (currentPage + pageCount - 1) % pageCount;
        targetRow = EDITOR_DOODAD_PAGE_ROWS - 1;
      } else {
        targetRow = currentRow - 1;
      }
    } else if (Math.sign(Number(dy) || 0) > 0) {
      if (currentRow >= currentPageRowCount - 1) {
        targetPage = (currentPage + 1) % pageCount;
        targetRow = 0;
      } else {
        targetRow = currentRow + 1;
      }
    }

    let nextColumn = clamp(
      currentColumn + Math.sign(Number(dx) || 0),
      0,
      EDITOR_DOODAD_PAGE_COLUMNS - 1
    );
    const nextIndex = resolvePageCellIndex(targetPage, targetRow, nextColumn);
    if (nextIndex === doodadMenuIndex) {
      return false;
    }
    doodadMenuIndex = nextIndex;
    return true;
  }

  function pageDoodadMenu(step = 1) {
    if (!doodadMenuOpen || getDoodadCount() === 0) {
      return false;
    }
    const direction = Math.sign(Number(step) || 0);
    if (direction === 0) {
      return false;
    }
    const currentPage = Math.floor(doodadMenuIndex / EDITOR_DOODAD_PAGE_SIZE);
    const nextPage = clamp(currentPage + direction, 0, getDoodadPageCount() - 1);
    if (nextPage === currentPage) {
      return false;
    }
    const pageOffset = doodadMenuIndex % EDITOR_DOODAD_PAGE_SIZE;
    doodadMenuIndex = Math.min(
      getDoodadCount() - 1,
      (nextPage * EDITOR_DOODAD_PAGE_SIZE) + pageOffset
    );
    return true;
  }

  function confirmDoodadMenuSelection() {
    if (!doodadMenuOpen) {
      return false;
    }
    const selectedEntry = DECORATIVE_MODEL_SPECS[doodadMenuIndex] ?? null;
    return selectedEntry ? chooseDoodadType(selectedEntry.type) : false;
  }

  function getDoodadMenuState() {
    if (!doodadMenuOpen) {
      return null;
    }
    const pageIndex = Math.floor(doodadMenuIndex / EDITOR_DOODAD_PAGE_SIZE);
    const pageStart = pageIndex * EDITOR_DOODAD_PAGE_SIZE;
    const pageItems = DECORATIVE_MODEL_SPECS.slice(pageStart, pageStart + EDITOR_DOODAD_PAGE_SIZE);
    return {
      visible: true,
      title: "Doodads",
      pageIndex,
      pageCount: getDoodadPageCount(),
      columns: EDITOR_DOODAD_PAGE_COLUMNS,
      rows: EDITOR_DOODAD_PAGE_ROWS,
      items: pageItems.map((entry, index) => {
        const globalIndex = pageStart + index;
        return {
          type: entry.type,
          label: entry.label,
          focused: globalIndex === doodadMenuIndex,
          selected: entry.type === selectedDoodadType,
        };
      }),
    };
  }

  function setSelectedTool(nextTool) {
    if (nextTool === "doodads") {
      openDoodadMenu();
      return true;
    }
    if (!TOOL_ORDER.includes(nextTool) && !isDecorationTool(nextTool)) {
      return false;
    }
    if (isDecorationTool(nextTool)) {
      chooseDoodadType(nextTool, { closeMenu: true, selectTool: true });
    } else {
      selectedTool = nextTool;
      doodadMenuOpen = false;
    }
    if (selectedTool === "playerSpawn" && playerSpawnMarker) {
      playerSpawnRotation = normalizeCardinalRotation(playerSpawnMarker.rotation);
    }
    return true;
  }

  function rotateDecoration(step = 1) {
    const normalizedStep = Math.sign(Number(step) || 0);
    if (normalizedStep === 0 || !isDecorationTool(selectedTool)) {
      return isDecorationTool(selectedTool)
        ? normalizeDecorationRotation(selectedTool, decorationRotationByType[selectedTool] ?? 0)
        : null;
    }
    const currentRotation = normalizeDecorationRotation(selectedTool, decorationRotationByType[selectedTool] ?? 0);
    const nextRotation = normalizeDecorationRotation(
      selectedTool,
      currentRotation + (normalizedStep * getDecorationRotationStepDegrees(selectedTool))
    );
    decorationRotationByType[selectedTool] = nextRotation;
    return nextRotation;
  }

  function selectToolByDigit(rawDigit) {
    const digit = Number(rawDigit);
    const nextTool = TOOL_BY_DIGIT[digit];
    if (!nextTool) {
      return false;
    }
    if (nextTool === "doodads") {
      toggleDoodadMenu();
      return true;
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
    if (doodadMenuOpen) {
      return false;
    }
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
    clearPreviewDecorationVisual();
    scene.remove(previewRoot);
    previewRoot.traverse((child) => {
      if (
        child?.geometry
        && typeof child.geometry.dispose === "function"
        && !isKenneyAssetManagedResource(child.geometry)
      ) {
        child.geometry.dispose();
      }
      if (!child?.material) {
        return;
      }
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of materials) {
        if (!isKenneyAssetManagedResource(material)) {
          material?.dispose?.();
        }
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
    getSelectedInventoryTool,
    getSelectedDoodadType: () => selectedDoodadType,
    getRampRotation: () => rampRotation,
    getPlayerSpawnRotation: () => playerSpawnRotation,
    isDoodadMenuOpen: () => doodadMenuOpen,
    openDoodadMenu,
    closeDoodadMenu,
    toggleDoodadMenu,
    moveDoodadMenuSelection,
    pageDoodadMenu,
    confirmDoodadMenuSelection,
    chooseDoodadType,
    getDoodadMenuState,
  };
}
