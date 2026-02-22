import * as THREE from "https://esm.sh/three@0.161.0";
import { createGrid } from "./grid.js";
import { createPlayer } from "./player.js";
import { createEnemySystem } from "./enemies.js";
import { createTowerSystem } from "./towers.js";

const app = document.getElementById("app");
const overlayEl = document.getElementById("overlay");
const buildStatusEl = document.getElementById("build-status");

const movePadEl = document.getElementById("move-pad");
const moveKnobEl = document.getElementById("move-knob");
const lookPadEl = document.getElementById("look-pad");
const jumpButtonEl = document.getElementById("btn-jump");
const shootButtonEl = document.getElementById("btn-shoot");
const buildButtonEl = document.getElementById("btn-build");
const placeButtonEl = document.getElementById("btn-place");
const cancelButtonEl = document.getElementById("btn-cancel");

const isTouchDevice = window.matchMedia("(hover: none), (pointer: coarse)").matches;
if (isTouchDevice) {
  overlayEl.classList.add("hidden");
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05070f);

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

const player = createPlayer({
  scene,
  camera,
  domElement: renderer.domElement,
  moveBounds: grid.moveBounds,
  eyeHeight: grid.eyeHeight,
  ui: { overlayEl },
});

const enemySystem = createEnemySystem(scene, grid.pathWaypoints);
const towerSystem = createTowerSystem({ scene, camera, grid });

const clock = new THREE.Clock();
let isPaused = false;

function refreshBuildStatus() {
  buildStatusEl.textContent = towerSystem.getStatusText();
}

function updatePauseState() {
  const shouldPause = document.hidden || !document.hasFocus();
  if (shouldPause !== isPaused) {
    isPaused = shouldPause;
    if (isPaused) {
      player.resetMovement();
      if (player.controls.isLocked) {
        player.controls.unlock();
      }
    } else {
      clock.getDelta();
    }
  }
}

function handlePrimaryAction() {
  if (towerSystem.isBuildMode()) {
    towerSystem.placeSelectedTower();
    refreshBuildStatus();
    return;
  }
  player.tryShoot();
}

document.addEventListener("visibilitychange", updatePauseState);
window.addEventListener("blur", updatePauseState);
window.addEventListener("focus", updatePauseState);
updatePauseState();

renderer.domElement.addEventListener("contextmenu", (event) => {
  event.preventDefault();
});

renderer.domElement.addEventListener("mousedown", (event) => {
  if (isPaused) {
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

  handlePrimaryAction();
});

window.addEventListener("keydown", (event) => {
  if (event.code === "Digit1") {
    towerSystem.selectTower("basic");
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

function animate() {
  const deltaSeconds = clock.getDelta();
  if (!isPaused) {
    player.update(deltaSeconds, enemySystem);
    enemySystem.update(deltaSeconds, camera);
    towerSystem.update(deltaSeconds, enemySystem);
  }
  refreshBuildStatus();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
