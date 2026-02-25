import * as THREE from "three";
import { createGrid } from "./grid.js";
import { createPlayer } from "./player.js";
import { createEnemySystem } from "./enemies.js";
import { createTowerSystem } from "./towers.js";
import { loadModels, getModel } from "./models.js";

const app = document.getElementById("app");
const overlayEl = document.getElementById("overlay");
const buildStatusEl = document.getElementById("build-status");

const movePadEl = document.getElementById("move-pad");
const moveKnobEl = document.getElementById("move-knob");
const lookPadEl = document.getElementById("look-pad");
const jumpButtonEl = document.getElementById("btn-jump");
const shootButtonEl = document.getElementById("btn-shoot");
const buildButtonEl = document.getElementById("btn-build");
const buildMortarButtonEl = document.getElementById("btn-build-mortar");
const placeButtonEl = document.getElementById("btn-place");
const cancelButtonEl = document.getElementById("btn-cancel");
const waveCounterEl = document.getElementById("wave-counter");
const towersAvailableEl = document.getElementById("towers-available");
const upgradeMenuEl = document.getElementById("upgrade-menu");
const upgradeOptionsEl = document.getElementById("upgrade-options");
const virtualCursorEl = document.getElementById("virtual-cursor");
const crosshairEl = document.getElementById("crosshair");

const isTouchDevice = window.matchMedia("(hover: none), (pointer: coarse)").matches;
if (isTouchDevice) {
  overlayEl.classList.add("hidden");
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020205);

const starsGeometry = new THREE.BufferGeometry();
const starsCount = 2000;
const posArray = new Float32Array(starsCount * 3);
const STAR_FIELD_SIZE = 400;
const STAR_MIN_LEVEL_DISTANCE = 70;
for (let i = 0; i < starsCount; i++) {
  let x = 0;
  let y = 0;
  let z = 0;
  let attempts = 0;
  do {
    x = (Math.random() - 0.5) * STAR_FIELD_SIZE;
    y = (Math.random() - 0.5) * STAR_FIELD_SIZE;
    z = (Math.random() - 0.5) * STAR_FIELD_SIZE;
    attempts += 1;
  } while (
    x * x + y * y + z * z < STAR_MIN_LEVEL_DISTANCE * STAR_MIN_LEVEL_DISTANCE &&
    attempts < 20
  );
  const baseIndex = i * 3;
  posArray[baseIndex] = x;
  posArray[baseIndex + 1] = y;
  posArray[baseIndex + 2] = z;
}
starsGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
const starsMaterial = new THREE.PointsMaterial({
  size: 0.8,
  color: 0xffffff,
  transparent: true,
  opacity: 0.8
});
const starMesh = new THREE.Points(starsGeometry, starsMaterial);
scene.add(starMesh);

let gameTime = 0;

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  500
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
app.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0x7f8fbc, 0.75);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1.1);
directionalLight.position.set(10, 18, 8);
scene.add(directionalLight);

const grid = createGrid(scene);
camera.position.set(0, grid.eyeHeight, grid.moveBounds.maxZ - 3);
camera.lookAt(0, grid.eyeHeight, 0);

let player;
let enemySystem;
let towerSystem;

const GATE_MODEL_SCALE = 3.2;
const GATE_Y_OFFSET = 0.02;

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
  const gate = getModel("gate_complex");
  if (!gate) {
    return;
  }

  gate.scale.setScalar(GATE_MODEL_SCALE);
  gate.position.set(position.x, grid.tileTopY + GATE_Y_OFFSET, position.z);

  const lookTarget = gate.position.clone().add(facingDirection);
  gate.lookAt(lookTarget);
  scene.add(gate);
}

function placePathGates() {
  const points = grid.pathWaypoints;
  if (!Array.isArray(points) || points.length < 2) {
    return;
  }

  const spawnPoint = points[0];
  const spawnFacing = getPathDirection(points[0], points[1]);
  placePathEndpointGate(spawnPoint, spawnFacing);

  const endPoint = points[points.length - 1];
  const endFacing = getPathDirection(points[points.length - 2], points[points.length - 1]);
  placePathEndpointGate(endPoint, endFacing);
}

function refreshBuildStatus() {
  buildStatusEl.textContent = towerSystem.getStatusText();
}

function updatePauseState() {
  // Use a small timeout to ensure Three.js has updated the internal isLocked state
  // and browser has updated pointerLockElement.
  setTimeout(() => {
    const isLocked = !!document.pointerLockElement;
    const shouldPause = document.hidden || !document.hasFocus() || !isLocked;

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

function handlePrimaryAction() {
  if (towerSystem.isBuildMode()) {
    const didPlaceTower = towerSystem.placeSelectedTower();
    refreshBuildStatus();
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

function updateVirtualCursor() {
  virtualCursorEl.style.left = `${vCursorX}px`;
  virtualCursorEl.style.top = `${vCursorY}px`;
}

let hoveredBtn = null;

window.addEventListener("mousemove", (event) => {
  if (!player) return;
  if (waveState === "MENU" && player.controls.isLocked) {
    vCursorX += event.movementX;
    vCursorY += event.movementY;
    vCursorX = Math.max(0, Math.min(window.innerWidth, vCursorX));
    vCursorY = Math.max(0, Math.min(window.innerHeight, vCursorY));
    updateVirtualCursor();

    virtualCursorEl.classList.remove("visible");
    const el = document.elementFromPoint(vCursorX, vCursorY);
    virtualCursorEl.classList.add("visible");

    if (hoveredBtn && hoveredBtn !== el) {
      hoveredBtn.classList.remove("hover");
      hoveredBtn = null;
    }

    if (el && el.classList.contains("upgrade-btn")) {
      el.classList.add("hover");
      hoveredBtn = el;
    }
  }
}, true);

window.addEventListener("mousedown", (event) => {
  if (isPaused || !player || !towerSystem) {
    return;
  }

  if (waveState === "MENU" && player.controls.isLocked) {
    virtualCursorEl.classList.remove("visible"); // temporarily hide to check what's underneath
    const hitEl = document.elementFromPoint(vCursorX, vCursorY);
    virtualCursorEl.classList.add("visible");

    if (hitEl && hitEl.classList.contains("upgrade-btn")) {
      hitEl.click();
    }
    return;
  }

  if (waveState === "MENU") {
    return;
  }

  if (event.button === 2) {
    towerSystem.selectTower("basic");
    refreshBuildStatus();
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
    refreshBuildStatus();
    return;
  }

  isPrimaryDown = true;
}, true);

document.addEventListener("mouseup", (event) => {
  if (event.button === 0) {
    isPrimaryDown = false;
  }
});


window.addEventListener("keydown", (event) => {
  if (!player || !towerSystem) return;
  if (event.code === "Digit1") {
    towerSystem.selectTower("basic");
    refreshBuildStatus();
    return;
  }

  if (event.code === "Digit2") {
    towerSystem.selectTower("mortar");
    refreshBuildStatus();
    return;
  }

  if (event.code === "KeyQ") {
    towerSystem.cancelPlacement();
    refreshBuildStatus();
    return;
  }

  if (event.code === "Enter" && towerSystem.isBuildMode()) {
    towerSystem.placeSelectedTower();
    refreshBuildStatus();
  }
});

function bindActionButton(buttonEl, callback, shouldRefreshStatus = false) {
  if (!buttonEl) {
    return;
  }

  buttonEl.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    callback();
    if (shouldRefreshStatus) {
      refreshBuildStatus();
    }
  });
}

function bindMovePad() {
  if (!movePadEl || !moveKnobEl) {
    return;
  }

  const radius = 45;
  let pointerId = null;
  let centerX = 0;
  let centerY = 0;

  function updateKnob(deltaX, deltaY) {
    moveKnobEl.style.transform = `translate(calc(-50% + ${deltaX}px), calc(-50% + ${deltaY}px))`;
  }

  function resetPad() {
    pointerId = null;
    updateKnob(0, 0);
    player.setVirtualMove(0, 0);
  }

  movePadEl.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    pointerId = event.pointerId;
    const rect = movePadEl.getBoundingClientRect();
    centerX = rect.left + rect.width * 0.5;
    centerY = rect.top + rect.height * 0.5;
    movePadEl.setPointerCapture(pointerId);
  });

  movePadEl.addEventListener("pointermove", (event) => {
    if (event.pointerId !== pointerId) {
      return;
    }
    event.preventDefault();

    const rawX = event.clientX - centerX;
    const rawY = event.clientY - centerY;
    const length = Math.hypot(rawX, rawY);
    const scale = length > radius ? radius / length : 1;
    const clampedX = rawX * scale;
    const clampedY = rawY * scale;

    updateKnob(clampedX, clampedY);
    player.setVirtualMove(clampedX / radius, -clampedY / radius);
  });

  movePadEl.addEventListener("pointerup", (event) => {
    if (event.pointerId === pointerId) {
      resetPad();
    }
  });

  movePadEl.addEventListener("pointercancel", (event) => {
    if (event.pointerId === pointerId) {
      resetPad();
    }
  });

  movePadEl.addEventListener("lostpointercapture", resetPad);
}

function bindLookPad() {
  if (!lookPadEl) {
    return;
  }

  let pointerId = null;
  let lastX = 0;
  let lastY = 0;

  lookPadEl.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    pointerId = event.pointerId;
    lastX = event.clientX;
    lastY = event.clientY;
    lookPadEl.setPointerCapture(pointerId);
  });

  lookPadEl.addEventListener("pointermove", (event) => {
    if (event.pointerId !== pointerId) {
      return;
    }
    event.preventDefault();
    const deltaX = event.clientX - lastX;
    const deltaY = event.clientY - lastY;
    lastX = event.clientX;
    lastY = event.clientY;
    player.addLookInput(deltaX, deltaY);
  });

  function clearLookPointer(event) {
    if (event.pointerId === pointerId) {
      pointerId = null;
    }
  }

  lookPadEl.addEventListener("pointerup", clearLookPointer);
  lookPadEl.addEventListener("pointercancel", clearLookPointer);
}

bindMovePad();
bindLookPad();

bindActionButton(jumpButtonEl, () => player.jump());
bindActionButton(shootButtonEl, () => handlePrimaryAction());
bindActionButton(
  buildButtonEl,
  () => {
    towerSystem.selectTower("basic");
  },
  true
);
bindActionButton(
  buildMortarButtonEl,
  () => {
    towerSystem.selectTower("mortar");
  },
  true
);
bindActionButton(
  placeButtonEl,
  () => {
    towerSystem.placeSelectedTower();
  },
  true
);
bindActionButton(
  cancelButtonEl,
  () => {
    towerSystem.cancelPlacement();
  },
  true
);

const ALL_UPGRADES = [
  { label: "Extra tower to place", apply: () => towerSystem.upgradeMaxTowers() },
  { label: "Tower does more damage", apply: () => towerSystem.upgradeTowerDamage() },
  { label: "I do more damage", apply: () => player.upgradePlayerDamage() },
  { label: "Enemies move slower", apply: () => enemySystem.upgradeSlowEnemies() },
  { label: "Tower shoots faster", apply: () => towerSystem.upgradeTowerFireRate() },
  { label: "I shoot faster", apply: () => player.upgradePlayerFireRate() },
];

let waveState = "PLAYING";
let currentWave = 1;
let waveDelay = 0;

function startWave(wave) {
  currentWave = wave;
  waveState = "PLAYING";

  const enemyCount = 4 + Math.floor(wave * 1.5);
  const fastCount = wave > 2 ? Math.floor(wave * 1.2) : 0;

  enemySystem.startWave({ basic: enemyCount, fast: fastCount });
}

function showUpgradeMenu() {
  if (player.controls.isLocked) {
    player.setMenuMode(true);
    crosshairEl.style.display = "none";
    virtualCursorEl.classList.add("visible");
    vCursorX = window.innerWidth / 2;
    vCursorY = window.innerHeight / 2;
    updateVirtualCursor();
  }

  upgradeMenuEl.classList.remove("hidden");
  upgradeOptionsEl.innerHTML = "";

  const shuffled = [...ALL_UPGRADES].sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, 3);

  selected.forEach(upgrade => {
    const btn = document.createElement("button");
    btn.className = "upgrade-btn";
    btn.textContent = upgrade.label;
    btn.onclick = () => {
      upgrade.apply();
      upgradeMenuEl.classList.add("hidden");
      player.setMenuMode(false);
      crosshairEl.style.display = "";
      virtualCursorEl.classList.remove("visible");
      startWave(currentWave + 1);
    };
    upgradeOptionsEl.appendChild(btn);
  });
}

function animate() {
  const deltaSeconds = clock.getDelta();
  gameTime += deltaSeconds;

  if (!isPaused) {
    if (waveState === "PLAYING") {
      if (enemySystem.isWaveClear()) {
        waveState = "DELAY";
        waveDelay = 2.0;
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
  refreshBuildStatus();

  waveCounterEl.textContent = currentWave;
  towersAvailableEl.textContent = towerSystem.getAvailableTowers();

  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

// Start game
async function initGame() {
  await loadModels();
  placePathGates();

  player = createPlayer({
    scene,
    camera,
    domElement: renderer.domElement,
    moveBounds: grid.moveBounds,
    eyeHeight: grid.eyeHeight,
    ui: { overlayEl },
  });

  enemySystem = createEnemySystem(scene, grid.pathWaypoints);
  towerSystem = createTowerSystem({ scene, camera, grid });

  player.controls.addEventListener("unlock", updatePauseState);
  player.controls.addEventListener("lock", updatePauseState);

  // Debug API to let browser scripts skip UI
  window.gameDebug = {
    setPlayerPos: (x, z) => {
      if (player) player.controls.getObject().position.set(x, player.eyeHeight, z);
    },
    placeBasicTower: (x, z) => {
      if (towerSystem) towerSystem.forcePlaceTower(x, z, "basic");
    },
    placeMortarTower: (x, z) => {
      if (towerSystem) towerSystem.forcePlaceTower(x, z, "mortar");
    },
    spawnEnemy: (type = "basic") => {
      if (enemySystem) {
        const spawner = grid.pathWaypoints[0];
        enemySystem.forceSpawnEnemy(type, spawner);
      }
    },
    hideOverlay: () => {
      document.getElementById("overlay").style.display = "none";
      if (player && player.controls) player.controls.lock();
    }
  };

  startWave(1);
  animate();
}

initGame();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
