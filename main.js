import * as THREE from "three";
import { createGrid } from "./grid.js";
import { createPlayer } from "./player.js";
import { createEnemySystem, getLargestEnemySize } from "./enemies.js";
import { createTowerSystem } from "./towers.js";
import { createUiOverlay } from "./uiOverlay.js";
import { GAME_CONFIG } from "./config.js";

const SCENE_CONFIG = GAME_CONFIG.scene;
const LIGHT_CONFIG = GAME_CONFIG.lights;
const PORTAL_CONFIG = GAME_CONFIG.portal;
const UI_CONFIG = GAME_CONFIG.ui;
const WAVE_CONFIG = GAME_CONFIG.waves;
const ECONOMY_CONFIG = GAME_CONFIG.economy ?? {};
const CONFIGURED_ROUNDS = Array.isArray(WAVE_CONFIG.rounds) ? WAVE_CONFIG.rounds : [];

const app = document.getElementById("app");

const isTouchDevice = window.matchMedia("(hover: none), (pointer: coarse)").matches;

const scene = new THREE.Scene();
scene.background = new THREE.Color(SCENE_CONFIG.backgroundColor);
scene.fog = new THREE.Fog(
  SCENE_CONFIG.fogColor,
  SCENE_CONFIG.fogNear,
  SCENE_CONFIG.fogFar
);

let gameTime = 0;

const camera = new THREE.PerspectiveCamera(
  SCENE_CONFIG.cameraFov,
  window.innerWidth / window.innerHeight,
  SCENE_CONFIG.cameraNear,
  SCENE_CONFIG.cameraFar
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, SCENE_CONFIG.maxPixelRatio));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.localClippingEnabled = true;
renderer.toneMappingExposure = SCENE_CONFIG.toneMappingExposure;
renderer.autoClear = false;
app.appendChild(renderer.domElement);

const uiOverlay = createUiOverlay({
  width: window.innerWidth,
  height: window.innerHeight,
  maxPixelRatio: SCENE_CONFIG.maxPixelRatio,
});

const ambientLight = new THREE.AmbientLight(
  LIGHT_CONFIG.ambient.color,
  LIGHT_CONFIG.ambient.intensity
);
scene.add(ambientLight);

const hemisphereLight = new THREE.HemisphereLight(
  LIGHT_CONFIG.hemisphere.skyColor,
  LIGHT_CONFIG.hemisphere.groundColor,
  LIGHT_CONFIG.hemisphere.intensity
);
scene.add(hemisphereLight);

const directionalLight = new THREE.DirectionalLight(
  LIGHT_CONFIG.directional.color,
  LIGHT_CONFIG.directional.intensity
);
directionalLight.position.set(
  LIGHT_CONFIG.directional.positionX,
  LIGHT_CONFIG.directional.positionY,
  LIGHT_CONFIG.directional.positionZ
);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.set(
  LIGHT_CONFIG.directional.shadowMapSize,
  LIGHT_CONFIG.directional.shadowMapSize
);
directionalLight.shadow.camera.near = LIGHT_CONFIG.directional.shadowNear;
directionalLight.shadow.camera.far = LIGHT_CONFIG.directional.shadowFar;
directionalLight.shadow.camera.left = LIGHT_CONFIG.directional.shadowLeft;
directionalLight.shadow.camera.right = LIGHT_CONFIG.directional.shadowRight;
directionalLight.shadow.camera.top = LIGHT_CONFIG.directional.shadowTop;
directionalLight.shadow.camera.bottom = LIGHT_CONFIG.directional.shadowBottom;
directionalLight.shadow.normalBias = LIGHT_CONFIG.directional.shadowNormalBias;
scene.add(directionalLight);

const grid = createGrid(scene);
camera.position.set(0, grid.eyeHeight, grid.moveBounds.maxZ - SCENE_CONFIG.cameraStartOffsetZ);
camera.lookAt(0, grid.eyeHeight, 0);

let player;
let enemySystem;
let towerSystem;

const LARGEST_ENEMY_SIZE = getLargestEnemySize();
const PORTAL_FACE_SIZE = LARGEST_ENEMY_SIZE * PORTAL_CONFIG.faceSizeFromLargestEnemy;
const PORTAL_WIDTH = PORTAL_FACE_SIZE;
const PORTAL_HEIGHT = PORTAL_FACE_SIZE;
const PORTAL_THICKNESS = PORTAL_CONFIG.thickness;
const PORTAL_Y_OFFSET = PORTAL_CONFIG.yOffset;
const PORTAL_ENTRY_DISTANCE = PORTAL_FACE_SIZE * PORTAL_CONFIG.entryDistanceFromFaceSize;
const PORTAL_GEOMETRY = new THREE.BoxGeometry(PORTAL_WIDTH, PORTAL_HEIGHT, PORTAL_THICKNESS);

const PORTAL_UNIFORMS = {
  uTime: { value: 0 },
  uColorA: { value: new THREE.Color(PORTAL_CONFIG.colorA) },
  uColorB: { value: new THREE.Color(PORTAL_CONFIG.colorB) },
  uEdgeColor: { value: new THREE.Color(PORTAL_CONFIG.edgeColor) },
  uOpacity: { value: PORTAL_CONFIG.opacity },
};

const PORTAL_MATERIAL = new THREE.ShaderMaterial({
  uniforms: PORTAL_UNIFORMS,
  transparent: true,
  depthWrite: false,
  side: THREE.DoubleSide,
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec3 uColorA;
    uniform vec3 uColorB;
    uniform vec3 uEdgeColor;
    uniform float uOpacity;
    varying vec2 vUv;

    float hash21(vec2 p) {
      p = fract(p * vec2(123.34, 345.45));
      p += dot(p, p + 34.345);
      return fract(p.x * p.y);
    }

    float noise2(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);

      float a = hash21(i);
      float b = hash21(i + vec2(1.0, 0.0));
      float c = hash21(i + vec2(0.0, 1.0));
      float d = hash21(i + vec2(1.0, 1.0));

      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
    }

    float fbm(vec2 p) {
      float value = 0.0;
      float amplitude = 0.5;
      for (int i = 0; i < 5; i++) {
        value += noise2(p) * amplitude;
        p = p * 2.03 + vec2(13.7, 8.4);
        amplitude *= 0.5;
      }
      return value;
    }

    void main() {
      vec2 uv = vUv * 2.0 - 1.0;
      float radial = length(uv);

      vec2 flowUv = uv * 2.2;
      flowUv += vec2(
        sin(uTime * 0.9 + uv.y * 6.0),
        cos(uTime * 0.75 + uv.x * 7.0)
      ) * 0.22;

      float flowA = fbm(flowUv * 1.65 + vec2(uTime * 0.35, -uTime * 0.24));
      float flowB = fbm(flowUv * 3.2 + vec2(-uTime * 0.55, uTime * 0.43));
      float flow = mix(flowA, flowB, 0.5);

      float innerMask = smoothstep(1.18, 0.05, radial);
      float rimMask = smoothstep(0.63, 1.02, radial);
      float pulse = 0.55 + 0.45 * sin(uTime * 2.4 + radial * 14.0 + flow * 6.0);

      vec3 waterColor = mix(uColorA, uColorB, flow);
      vec3 color = waterColor + uEdgeColor * rimMask * pulse * 0.9;
      float alpha = uOpacity * innerMask * (0.6 + 0.4 * flow);
      alpha += rimMask * 0.2;
      alpha = clamp(alpha, 0.0, 0.92);

      gl_FragColor = vec4(color, alpha);
    }
  `,
});
PORTAL_MATERIAL.toneMapped = false;

const clock = new THREE.Clock();
let isPaused = false;

function getPathDirection(from, to) {
  const direction = to.clone().sub(from);
  direction.y = 0;
  if (direction.lengthSq() < 1e-6) {
    return new THREE.Vector3(0, 0, 1);
  }
  return direction.normalize();
}

function placePathEndpointGate(position, facingDirection) {
  const gate = new THREE.Mesh(PORTAL_GEOMETRY, PORTAL_MATERIAL);
  gate.castShadow = false;
  gate.receiveShadow = true;
  const portalForward = facingDirection.clone();
  portalForward.y = 0;
  if (portalForward.lengthSq() < 1e-6) {
    portalForward.set(0, 0, 1);
  } else {
    portalForward.normalize();
  }
  const derivedPathSurfaceY = Number.isFinite(position.y)
    ? position.y - GAME_CONFIG.grid.enemyPathYOffset
    : (grid.pathTileTopY ?? grid.tileTopY ?? 0);
  const pathSurfaceY = typeof grid.getBuildSurfaceYAtWorld === "function"
    ? grid.getBuildSurfaceYAtWorld(position.x, position.z)
    : derivedPathSurfaceY;
  gate.position.set(position.x, pathSurfaceY + PORTAL_HEIGHT * 0.5 + PORTAL_Y_OFFSET, position.z);
  const lookTarget = gate.position.clone().add(portalForward);
  gate.lookAt(lookTarget);
  scene.add(gate);

  const portalPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(
    portalForward,
    new THREE.Vector3(position.x, pathSurfaceY, position.z)
  );

  return {
    mesh: gate,
    position: gate.position.clone(),
    forward: portalForward.clone(),
    plane: portalPlane,
    entryDistance: PORTAL_ENTRY_DISTANCE,
  };
}

function placePathGates() {
  const points = grid.pathWaypoints;
  if (!Array.isArray(points) || points.length < 2) {
    return null;
  }

  const spawnPoint = points[0];
  const spawnFacing = getPathDirection(points[0], points[1]);
  const spawnPortal = placePathEndpointGate(spawnPoint, spawnFacing);

  const endPoint = points[points.length - 1];
  const endFacing = getPathDirection(points[points.length - 2], points[points.length - 1]);
  placePathEndpointGate(endPoint, endFacing);

  return spawnPortal;
}

function updatePauseState() {
  // Use a small timeout to ensure Three.js has updated the internal isLocked state
  // and browser has updated pointerLockElement.
  setTimeout(() => {
    const isLocked = !!document.pointerLockElement;
    const shouldPause = document.hidden || !document.hasFocus() || (!isTouchDevice && !isLocked);

    if (shouldPause !== isPaused) {
      isPaused = shouldPause;
      if (isPaused && player) {
        player.resetMovement();
      } else if (!isPaused) {
        clock.getDelta();
      }
    }
  }, 0);
}

// Listeners for player lock moved into initGame after player is created

const DEFAULT_STARTING_CASH = 650;
const startingCash = Number.isFinite(Number(ECONOMY_CONFIG.startingCash))
  ? Math.max(0, Math.floor(Number(ECONOMY_CONFIG.startingCash)))
  : DEFAULT_STARTING_CASH;
let playerMoney = startingCash;

function addMoney(amount) {
  const value = Math.max(0, Math.floor(Number(amount) || 0));
  if (value <= 0) {
    return 0;
  }
  playerMoney += value;
  return playerMoney;
}

function trySpendMoney(amount) {
  const value = Math.max(0, Math.floor(Number(amount) || 0));
  if (value <= 0) {
    return true;
  }
  if (playerMoney < value) {
    return false;
  }
  playerMoney -= value;
  return true;
}

function handlePrimaryAction() {
  if (towerSystem.isBuildMode()) {
    const didPlaceTower = towerSystem.placeSelectedTower();
    if (didPlaceTower) {
      isPrimaryDown = false;
    }
    return;
  }
  player.tryShoot();
}

document.addEventListener("visibilitychange", updatePauseState);
window.addEventListener("blur", updatePauseState);
window.addEventListener("focus", updatePauseState);
updatePauseState();

document.addEventListener("contextmenu", (event) => {
  event.preventDefault();
});

let isPrimaryDown = false;
let vCursorX = window.innerWidth / 2;
let vCursorY = window.innerHeight / 2;
let hoveredUpgradeIndex = -1;
let currentUpgradeOptions = [];
let lastTouchUiActionAt = -Infinity;
let menuAdvancesWaveOnChoice = true;
let menuResumeWaveState = "PLAYING";

function updateMenuHoverFromVirtualCursor() {
  if (waveState !== "MENU") {
    hoveredUpgradeIndex = -1;
    return;
  }
  hoveredUpgradeIndex = uiOverlay.hitTestMenuOption(vCursorX, vCursorY);
}

function applyUpgradeChoice(index) {
  if (index < 0 || index >= currentUpgradeOptions.length) {
    return false;
  }

  const selectedUpgrade = currentUpgradeOptions[index];
  if (!selectedUpgrade || typeof selectedUpgrade.apply !== "function") {
    return false;
  }

  selectedUpgrade.apply();
  currentUpgradeOptions = [];
  hoveredUpgradeIndex = -1;
  player.setMenuMode(false);
  if (menuAdvancesWaveOnChoice) {
    startWave(currentWave + 1);
  } else {
    waveState = menuResumeWaveState;
  }
  menuAdvancesWaveOnChoice = true;
  menuResumeWaveState = "PLAYING";
  return true;
}

function getCanvasPointerPosition(event) {
  const canvasRect = renderer.domElement.getBoundingClientRect();
  const x = clamp(event.clientX - canvasRect.left, 0, canvasRect.width);
  const y = clamp(event.clientY - canvasRect.top, 0, canvasRect.height);
  return { x, y };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

window.addEventListener("mousemove", (event) => {
  if (!player) return;
  if (waveState === "MENU" && player.controls.isLocked) {
    vCursorX += event.movementX;
    vCursorY += event.movementY;
    vCursorX = Math.max(0, Math.min(window.innerWidth, vCursorX));
    vCursorY = Math.max(0, Math.min(window.innerHeight, vCursorY));
    updateMenuHoverFromVirtualCursor();
  }
}, true);

window.addEventListener("mousedown", (event) => {
  if (performance.now() - lastTouchUiActionAt < 350) {
    return;
  }

  if (isPaused || !player || !towerSystem) {
    return;
  }

  if (waveState === "MENU") {
    if (event.button !== 0) {
      return;
    }
    if (player.controls.isLocked) {
      applyUpgradeChoice(uiOverlay.hitTestMenuOption(vCursorX, vCursorY));
      return;
    }
    const pointer = getCanvasPointerPosition(event);
    applyUpgradeChoice(uiOverlay.hitTestMenuOption(pointer.x, pointer.y));
    return;
  }

  if (event.button === 2) {
    towerSystem.selectTower("laser");
    return;
  }

  if (event.button !== 0) {
    return;
  }

  if (!player.controls.isLocked && !isTouchDevice) {
    return;
  }

  if (towerSystem.isBuildMode()) {
    towerSystem.placeSelectedTower();
    return;
  }

  isPrimaryDown = true;
}, true);

window.addEventListener("pointerdown", (event) => {
  if (!isTouchDevice || event.pointerType !== "touch" || !player || !towerSystem || isPaused) {
    return;
  }

  const pointer = getCanvasPointerPosition(event);

  if (waveState === "MENU") {
    const pickedIndex = uiOverlay.hitTestMenuOption(pointer.x, pointer.y);
    if (pickedIndex >= 0) {
      applyUpgradeChoice(pickedIndex);
      lastTouchUiActionAt = performance.now();
    }
    return;
  }

  const touchedTowerType = uiOverlay.hitTestTowerSlot(pointer.x, pointer.y);
  if (touchedTowerType) {
    towerSystem.selectTower(touchedTowerType);
    lastTouchUiActionAt = performance.now();
    event.preventDefault();
  }
}, true);

document.addEventListener("mouseup", (event) => {
  if (event.button === 0) {
    isPrimaryDown = false;
  }
});


window.addEventListener("keydown", (event) => {
  if (!player || !towerSystem) return;

  if (event.code === "KeyK" && !event.repeat) {
    if (waveState === "MENU") {
      showUpgradeMenu({
        advanceWaveOnChoice: menuAdvancesWaveOnChoice,
        resumeWaveState: menuResumeWaveState,
      });
      return;
    }
    const resumeWaveState = waveState === "DELAY" ? "DELAY" : "PLAYING";
    waveState = "MENU";
    showUpgradeMenu({
      advanceWaveOnChoice: false,
      resumeWaveState,
    });
    return;
  }

  if (event.code === "KeyL" && !event.repeat) {
    addMoney(1000);
    return;
  }

  if (event.code === "KeyM" && !event.repeat) {
    player.disableJetpackFuelConsumption();
    return;
  }

  if (waveState === "MENU") {
    if (event.code === "Digit1" || event.code === "Digit2" || event.code === "Digit3") {
      const optionIndex = Number(event.code.slice(-1)) - 1;
      applyUpgradeChoice(optionIndex);
    }
    return;
  }

  if (event.code === "Escape" && towerSystem.isBuildMode()) {
    towerSystem.cancelPlacement();
    return;
  }

  if (event.code.startsWith("Digit")) {
    const rawDigit = Number(event.code.slice(5));
    if (!Number.isNaN(rawDigit)) {
      const slotIndex = rawDigit === 0 ? 9 : rawDigit - 1;
      const towerInventory = towerSystem.getTowerInventory();
      if (slotIndex >= 0 && slotIndex < towerInventory.length) {
        towerSystem.selectTower(towerInventory[slotIndex].type);
        return;
      }
    }
  }

  if (event.code === "KeyQ") {
    towerSystem.cancelPlacement();
    return;
  }

  if (event.code === "Enter" && towerSystem.isBuildMode()) {
    towerSystem.placeSelectedTower();
  }
});

const TOWER_UNLOCK_UPGRADES = [
  { id: "tower_aoe_unlock", label: "Unlock AOE Tower", iconId: "tower_aoe_add", towerType: "aoe" },
  { id: "tower_slow_unlock", label: "Unlock Slow Tower", iconId: "tower_slow_add", towerType: "slow" },
];

const BASE_UPGRADES = [
  { id: "tower_damage", label: "Tower does more damage", iconId: "tower_damage", apply: () => towerSystem.upgradeTowerDamage() },
  { id: "player_damage", label: "I do more damage", iconId: "player_damage", apply: () => player.upgradePlayerDamage() },
  { id: "enemy_slow", label: "Enemies move slower", iconId: "enemy_slow", apply: () => enemySystem.upgradeSlowEnemies() },
  { id: "tower_fire_rate", label: "Tower shoots faster", iconId: "tower_fire_rate", apply: () => towerSystem.upgradeTowerFireRate() },
  { id: "player_fire_rate", label: "I shoot faster", iconId: "player_fire_rate", apply: () => player.upgradePlayerFireRate() },
];

function getUpgradePool() {
  const unlockUpgrades = TOWER_UNLOCK_UPGRADES
    .filter((upgrade) => towerSystem && !towerSystem.isTowerTypeUnlocked(upgrade.towerType))
    .map((upgrade) => ({
      id: upgrade.id,
      label: upgrade.label,
      iconId: upgrade.iconId,
      apply: () => towerSystem.unlockTowerType(upgrade.towerType),
    }));
  return [...unlockUpgrades, ...BASE_UPGRADES];
}

let waveState = "PLAYING";
let currentWave = WAVE_CONFIG.initialWave;
let waveDelay = 0;

function getEffectiveWaveNumber(wave) {
  if (CONFIGURED_ROUNDS.length === 0) {
    return wave;
  }
  if (wave <= CONFIGURED_ROUNDS.length) {
    return wave;
  }
  if (WAVE_CONFIG.afterLastRound === "stay_on_last") {
    return CONFIGURED_ROUNDS.length;
  }
  return wave;
}

function getWaveSegmentsForWave(wave) {
  if (CONFIGURED_ROUNDS.length === 0) {
    return null;
  }
  const effectiveWave = getEffectiveWaveNumber(wave);
  return CONFIGURED_ROUNDS[effectiveWave - 1] ?? [];
}

function startWave(wave) {
  currentWave = wave;
  waveState = "PLAYING";

  const waveSegments = getWaveSegmentsForWave(wave);
  if (Array.isArray(waveSegments)) {
    enemySystem.startWave(waveSegments);
    return;
  }

  // Legacy fallback if explicit rounds are not configured.
  const basicBase = Number(WAVE_CONFIG.basicBaseCount) || 0;
  const basicPerWave = Number(WAVE_CONFIG.basicPerWave) || 0;
  const fastUnlockWave = Number(WAVE_CONFIG.fastUnlockWave) || Number.POSITIVE_INFINITY;
  const fastPerWave = Number(WAVE_CONFIG.fastPerWave) || 0;
  const redCount = basicBase + Math.floor(wave * basicPerWave);
  const blueCount = wave >= fastUnlockWave
    ? Math.floor(wave * fastPerWave)
    : 0;
  enemySystem.startWave({ red: redCount, blue: blueCount });
}

function showUpgradeMenu(options = {}) {
  const {
    advanceWaveOnChoice = true,
    resumeWaveState = "PLAYING",
  } = options;
  menuAdvancesWaveOnChoice = advanceWaveOnChoice;
  menuResumeWaveState = resumeWaveState === "DELAY" ? "DELAY" : "PLAYING";

  player.setMenuMode(true);
  vCursorX = window.innerWidth * 0.5;
  vCursorY = window.innerHeight * 0.5;

  const optionCount = Math.max(1, UI_CONFIG.upgradesShown);
  const shuffled = getUpgradePool().sort(() => 0.5 - Math.random());
  currentUpgradeOptions = shuffled.slice(0, optionCount);
  hoveredUpgradeIndex = -1;
  updateMenuHoverFromVirtualCursor();
}

function animate() {
  const deltaSeconds = clock.getDelta();
  gameTime += deltaSeconds;
  PORTAL_UNIFORMS.uTime.value = gameTime;

  if (!isPaused) {
    if (waveState === "PLAYING") {
      if (enemySystem.isWaveClear()) {
        waveState = "DELAY";
        waveDelay = WAVE_CONFIG.upgradeDelaySeconds;
      }
    } else if (waveState === "DELAY") {
      waveDelay -= deltaSeconds;
      if (waveDelay <= 0) {
        waveState = "MENU";
        showUpgradeMenu();
      }
    }

    if (waveState === "PLAYING" || waveState === "DELAY") {
      if (isPrimaryDown) {
        handlePrimaryAction();
      }
      player.update(deltaSeconds, enemySystem);
      enemySystem.update(deltaSeconds, camera);
      towerSystem.update(deltaSeconds, enemySystem);
    }
  }

  const towerInventory = towerSystem
    ? towerSystem.getTowerInventory().map((entry, index) => ({
      ...entry,
      iconId: (
        {
          laser: "tower_laser",
          aoe: "tower_aoe",
          slow: "tower_slow",
        }[entry.type] || "tower_laser"
      ),
      hotkey: String((index + 1) % 10 || 0),
    }))
    : [];

  uiOverlay.setState({
    showCrosshair: waveState !== "MENU",
    menuOpen: waveState === "MENU",
    menuOptions: currentUpgradeOptions.map((upgrade) => ({
      label: upgrade.label,
      iconId: upgrade.iconId,
    })),
    hoveredMenuIndex: hoveredUpgradeIndex,
    menuCursorX: vCursorX,
    menuCursorY: vCursorY,
    menuCursorVisible: waveState === "MENU" && !!player?.controls?.isLocked,
    jetpackFuelRatio: player ? player.getJetpackFuelRatio() : 1,
    money: playerMoney,
    towerInventory,
    selectedTowerType: towerSystem ? towerSystem.getSelectedTowerType() : null,
    buildMode: towerSystem ? towerSystem.isBuildMode() : false,
    showKeyboardHints: !isTouchDevice,
  });
  uiOverlay.draw();

  renderer.clear();
  renderer.render(scene, camera);
  renderer.clearDepth();
  renderer.render(uiOverlay.scene, uiOverlay.camera);
  requestAnimationFrame(animate);
}

// Start game
function initGame() {
  const spawnPortal = placePathGates();

  player = createPlayer({
    scene,
    camera,
    domElement: renderer.domElement,
    eyeHeight: grid.eyeHeight,
    getMovementObstacles: () => {
      const terrainObstacles = Array.isArray(grid.heightObstacles) ? grid.heightObstacles : [];
      const towerObstacles = towerSystem ? towerSystem.getMovementObstacles() : [];
      if (terrainObstacles.length === 0) {
        return towerObstacles;
      }
      if (towerObstacles.length === 0) {
        return terrainObstacles;
      }
      return [...terrainObstacles, ...towerObstacles];
    },
  });

  enemySystem = createEnemySystem(scene, grid.pathWaypoints, {
    spawnPortal,
    onEnemyDefeated: (cashReward) => {
      addMoney(cashReward);
    },
  });
  towerSystem = createTowerSystem({
    scene,
    camera,
    grid,
    getCurrentMoney: () => playerMoney,
    spendMoney: (amount) => trySpendMoney(amount),
  });

  player.controls.addEventListener("unlock", () => {
    updatePauseState();
    isPrimaryDown = false;
    if (towerSystem && towerSystem.isBuildMode()) {
      towerSystem.cancelPlacement();
    }
  });
  player.controls.addEventListener("lock", updatePauseState);

  // Debug API to let browser scripts skip UI
  window.gameDebug = {
    setPlayerPos: (x, z) => {
      if (player) player.controls.getObject().position.set(x, player.eyeHeight, z);
    },
    placeBasicTower: (x, z) => {
      if (towerSystem) towerSystem.forcePlaceTower(x, z, "laser");
    },
    spawnEnemy: (type = "red") => {
      if (enemySystem) {
        const spawner = grid.pathWaypoints[0];
        enemySystem.forceSpawnEnemy(type, spawner);
      }
    },
    addMoney: (amount = 100) => {
      addMoney(amount);
    },
    getMoney: () => playerMoney,
    unlockTower: (type) => {
      if (towerSystem) {
        return towerSystem.unlockTowerType(type);
      }
      return false;
    },
    lockControls: () => {
      if (player && player.controls) {
        player.controls.lock();
      }
    },
  };

  startWave(WAVE_CONFIG.initialWave);
  animate();
}

initGame();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  uiOverlay.resize(window.innerWidth, window.innerHeight);
  vCursorX = clamp(vCursorX, 0, window.innerWidth);
  vCursorY = clamp(vCursorY, 0, window.innerHeight);
});
