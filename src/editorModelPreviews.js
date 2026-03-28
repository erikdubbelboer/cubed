import * as THREE from "three";
import { GAME_CONFIG } from "./config.js";
import {
  createDecorationVisual,
  createRampVisual,
  createTerrainWallVisual,
} from "./kenneyModels.js";
import { DECORATIVE_MODEL_SPECS } from "./modelCatalog.js";

const GRID_CELL_SIZE = Number.isFinite(Number(GAME_CONFIG.grid?.cellSize))
  ? Math.max(0.1, Number(GAME_CONFIG.grid.cellSize))
  : 1;
const PREVIEW_RENDER_SIZE = 128;
const PREVIEW_UPDATE_INTERVAL_SECONDS = 1 / 12;
const PREVIEW_ROTATION_SPEED = Math.PI * 0.18;
const CAMERA_VIEW_DIRECTION = new THREE.Vector3(1.08, 0.8, 1.14).normalize();
const EDITOR_TOOL_PREVIEW_PREFIX = "editor-tool:";
const EDITOR_DOODAD_PREVIEW_PREFIX = "editor-doodad:";
const EDITOR_TOOL_TYPES = ["eraser", "wall", "spawn", "end", "ramp", "playerSpawn", "doodads"];
const EMPTY_PREVIEW_IDS = Object.freeze([]);

function normalizePreviewType(value) {
  return String(value ?? "").trim();
}

function createCanvasElement(width, height) {
  if (typeof document !== "undefined" && typeof document.createElement === "function") {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }
  if (typeof OffscreenCanvas !== "undefined") {
    return new OffscreenCanvas(width, height);
  }
  return null;
}

function createPreviewMarker({
  color,
  emissive,
  emissiveIntensity = 0.5,
  opacity = 1,
  addArrow = false,
} = {}) {
  const root = new THREE.Group();
  const transparent = opacity < 0.999;
  const cube = new THREE.Mesh(
    new THREE.BoxGeometry(GRID_CELL_SIZE, GRID_CELL_SIZE, GRID_CELL_SIZE),
    new THREE.MeshStandardMaterial({
      color,
      emissive,
      emissiveIntensity,
      roughness: 0.5,
      metalness: 0.15,
      transparent,
      opacity,
      depthWrite: !transparent,
    })
  );
  cube.castShadow = true;
  cube.receiveShadow = true;
  root.add(cube);

  if (addArrow) {
    const arrowGeometry = new THREE.ConeGeometry(GRID_CELL_SIZE * 0.12, GRID_CELL_SIZE * 0.34, 12);
    arrowGeometry.rotateX(Math.PI * 0.5);
    const arrow = new THREE.Mesh(
      arrowGeometry,
      new THREE.MeshStandardMaterial({
        color: 0xa4ffbb,
        emissive: 0x2c8744,
        emissiveIntensity: 0.7,
        roughness: 0.4,
        metalness: 0.08,
      })
    );
    arrow.position.set(0, GRID_CELL_SIZE * 0.64, 0);
    root.add(arrow);
  }

  return root;
}

function createEraserPreview() {
  const root = new THREE.Group();
  const wallVisual = createTerrainWallVisual({ addBottomCap: true });
  if (wallVisual) {
    root.add(wallVisual);
  } else {
    root.add(createPreviewMarker({
      color: 0x7db9ff,
      emissive: 0x2c5885,
      emissiveIntensity: 0.2,
    }));
  }
  const slash = new THREE.Mesh(
    new THREE.BoxGeometry(GRID_CELL_SIZE * 0.2, GRID_CELL_SIZE * 1.72, GRID_CELL_SIZE * 0.16),
    new THREE.MeshStandardMaterial({
      color: 0xff8b8b,
      emissive: 0x7c1b1b,
      emissiveIntensity: 0.52,
      roughness: 0.34,
      metalness: 0.08,
    })
  );
  slash.position.set(0, GRID_CELL_SIZE * 0.2, GRID_CELL_SIZE * 0.82);
  slash.rotation.z = Math.PI * -0.24;
  slash.rotation.x = Math.PI * 0.08;
  root.add(slash);
  return root;
}

function createGenericDoodadPreview() {
  const fallbackType = DECORATIVE_MODEL_SPECS[0]?.type ?? "chest";
  return createDecorationVisual(fallbackType);
}

function createPreviewObject(previewId) {
  if (previewId.startsWith(EDITOR_DOODAD_PREVIEW_PREFIX)) {
    return createDecorationVisual(previewId.slice(EDITOR_DOODAD_PREVIEW_PREFIX.length));
  }

  const toolType = previewId.startsWith(EDITOR_TOOL_PREVIEW_PREFIX)
    ? previewId.slice(EDITOR_TOOL_PREVIEW_PREFIX.length)
    : "";
  switch (toolType) {
    case "eraser":
      return createEraserPreview();
    case "wall":
      return createTerrainWallVisual({ addBottomCap: true });
    case "spawn":
      return createPreviewMarker({
        color: 0x55f2a3,
        emissive: 0x1e6d4a,
        emissiveIntensity: 0.5,
      });
    case "end":
      return createPreviewMarker({
        color: 0xff8f74,
        emissive: 0x6d2c1e,
        emissiveIntensity: 0.52,
      });
    case "ramp":
      return createRampVisual(0);
    case "playerSpawn":
      return createPreviewMarker({
        color: 0x60ff7f,
        emissive: 0x1d6231,
        emissiveIntensity: 0.45,
        opacity: 0.35,
        addArrow: true,
      });
    case "doodads":
      return createGenericDoodadPreview();
    default:
      return null;
  }
}

function wrapPreviewEntry(previewId, root) {
  if (!root) {
    return null;
  }

  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(root);
  if (bounds.isEmpty()) {
    return null;
  }

  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const sphere = bounds.getBoundingSphere(new THREE.Sphere());
  const thumbnailCanvas = createCanvasElement(PREVIEW_RENDER_SIZE, PREVIEW_RENDER_SIZE);
  const thumbnailContext = thumbnailCanvas?.getContext?.("2d") ?? null;
  if (!thumbnailCanvas || !thumbnailContext) {
    return null;
  }

  const orbitRoot = new THREE.Group();
  const contentRoot = new THREE.Group();
  contentRoot.add(root);
  contentRoot.position.set(
    -center.x,
    -center.y - (size.y * 0.08),
    -center.z
  );
  orbitRoot.add(contentRoot);

  return {
    previewId,
    orbitRoot,
    radius: Math.max(0.5, sphere.radius),
    thumbnailCanvas,
    thumbnailContext,
    rendered: false,
  };
}

function createPreviewEntryById(previewId) {
  return wrapPreviewEntry(previewId, createPreviewObject(previewId));
}

function clearGroup(group) {
  while (group.children.length > 0) {
    group.remove(group.children[group.children.length - 1]);
  }
}

function arePreviewIdListsEqual(previousIds, nextIds) {
  if (previousIds.length !== nextIds.length) {
    return false;
  }
  for (let index = 0; index < previousIds.length; index += 1) {
    if (previousIds[index] !== nextIds[index]) {
      return false;
    }
  }
  return true;
}

export function getEditorToolPreviewId(toolType) {
  const normalizedType = normalizePreviewType(toolType);
  return normalizedType.length > 0
    ? `${EDITOR_TOOL_PREVIEW_PREFIX}${normalizedType}`
    : "";
}

export function getEditorDoodadPreviewId(type) {
  const normalizedType = normalizePreviewType(type);
  return normalizedType.length > 0
    ? `${EDITOR_DOODAD_PREVIEW_PREFIX}${normalizedType}`
    : "";
}

export function createEditorModelPreviewManager() {
  const renderCanvas = createCanvasElement(PREVIEW_RENDER_SIZE, PREVIEW_RENDER_SIZE);
  if (!renderCanvas) {
    return {
      setVisiblePreviewIds: () => {},
      update: () => {},
      drawPreview: () => false,
      dispose: () => {},
    };
  }

  let renderer = null;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas: renderCanvas,
      alpha: true,
      antialias: true,
      powerPreference: "low-power",
      premultipliedAlpha: true,
    });
  } catch (error) {
    console.warn("[EditorModelPreviews] Failed to create preview renderer; falling back to icons.", error);
  }

  if (!renderer) {
    return {
      setVisiblePreviewIds: () => {},
      update: () => {},
      drawPreview: () => false,
      dispose: () => {},
    };
  }

  renderer.setSize(PREVIEW_RENDER_SIZE, PREVIEW_RENDER_SIZE, false);
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = false;
  renderer.autoClear = true;

  const previewScene = new THREE.Scene();
  const previewCamera = new THREE.PerspectiveCamera(26, 1, 0.1, 100);
  const previewStage = new THREE.Group();
  previewScene.add(previewStage);
  previewScene.add(new THREE.AmbientLight(0xffffff, 1.1));
  previewScene.add(new THREE.HemisphereLight(0xdbeeff, 0x5a6882, 1.2));
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.3);
  keyLight.position.set(8, 10, 9);
  previewScene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0xbfdcff, 0.5);
  fillLight.position.set(-6, 5, 4);
  previewScene.add(fillLight);

  const previewEntries = new Map();
  for (const toolType of EDITOR_TOOL_TYPES) {
    const previewId = getEditorToolPreviewId(toolType);
    const entry = createPreviewEntryById(previewId);
    if (entry) {
      previewEntries.set(previewId, entry);
    }
  }
  for (const entry of DECORATIVE_MODEL_SPECS) {
    const previewId = getEditorDoodadPreviewId(entry.type);
    const previewEntry = createPreviewEntryById(previewId);
    if (previewEntry) {
      previewEntries.set(previewId, previewEntry);
    }
  }

  let visiblePreviewIds = EMPTY_PREVIEW_IDS;
  let rotationPhase = 0;
  let updateAccumulator = PREVIEW_UPDATE_INTERVAL_SECONDS;
  let forceRender = true;

  function renderPreviewEntry(entry) {
    if (!entry) {
      return;
    }
    clearGroup(previewStage);
    previewStage.add(entry.orbitRoot);
    entry.orbitRoot.rotation.set(0, rotationPhase, 0);

    const radius = entry.radius;
    const halfFovRadians = THREE.MathUtils.degToRad(previewCamera.fov * 0.5);
    const distance = Math.max(
      radius * 2.2,
      (radius / Math.sin(Math.max(0.05, halfFovRadians))) * 1.12
    );
    previewCamera.position.copy(CAMERA_VIEW_DIRECTION).multiplyScalar(distance);
    previewCamera.near = Math.max(0.01, distance - (radius * 2.8));
    previewCamera.far = distance + (radius * 2.8) + 12;
    previewCamera.lookAt(0, 0, 0);
    previewCamera.updateProjectionMatrix();

    renderer.clear();
    renderer.render(previewScene, previewCamera);
    renderer.getContext?.().flush?.();

    entry.thumbnailContext.clearRect(0, 0, PREVIEW_RENDER_SIZE, PREVIEW_RENDER_SIZE);
    entry.thumbnailContext.drawImage(
      renderCanvas,
      0,
      0,
      PREVIEW_RENDER_SIZE,
      PREVIEW_RENDER_SIZE
    );
    entry.rendered = true;
    previewStage.remove(entry.orbitRoot);
  }

  function setVisiblePreviewIds(previewIds = EMPTY_PREVIEW_IDS) {
    const nextPreviewIds = Array.isArray(previewIds)
      ? previewIds.filter((previewId, index) => (
        typeof previewId === "string"
        && previewId.length > 0
        && previewEntries.has(previewId)
        && previewIds.indexOf(previewId) === index
      ))
      : EMPTY_PREVIEW_IDS;
    if (arePreviewIdListsEqual(visiblePreviewIds, nextPreviewIds)) {
      return;
    }
    visiblePreviewIds = nextPreviewIds;
    updateAccumulator = PREVIEW_UPDATE_INTERVAL_SECONDS;
    forceRender = true;
  }

  function update(deltaSeconds = 0) {
    if (visiblePreviewIds.length === 0) {
      updateAccumulator = 0;
      return;
    }

    const safeDeltaSeconds = Number.isFinite(deltaSeconds)
      ? Math.max(0, deltaSeconds)
      : 0;
    rotationPhase = (rotationPhase + (safeDeltaSeconds * PREVIEW_ROTATION_SPEED)) % (Math.PI * 2);
    updateAccumulator += safeDeltaSeconds;
    if (!forceRender && updateAccumulator < PREVIEW_UPDATE_INTERVAL_SECONDS) {
      return;
    }

    updateAccumulator = 0;
    forceRender = false;
    for (const previewId of visiblePreviewIds) {
      renderPreviewEntry(previewEntries.get(previewId));
    }
  }

  function drawPreview(ctx, previewId, x, y, width, height) {
    const entry = previewEntries.get(previewId);
    if (!entry?.rendered || !entry.thumbnailCanvas || !ctx) {
      return false;
    }
    ctx.drawImage(entry.thumbnailCanvas, x, y, width, height);
    return true;
  }

  function dispose() {
    clearGroup(previewStage);
    previewEntries.clear();
    renderer.dispose();
  }

  return {
    setVisiblePreviewIds,
    update,
    drawPreview,
    dispose,
  };
}
