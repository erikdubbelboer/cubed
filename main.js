import * as THREE from "three";
import { createGrid } from "./grid.js";
import { createPlayer } from "./player.js";
import { createEnemySystem, getLargestEnemySize } from "./enemies.js";
import { createTowerSystem } from "./towers.js";

const app = document.getElementById("app");
const overlayEl = document.getElementById("overlay");
const buildStatusEl = document.getElementById("build-status");
const jetpackFuelFillEl = document.getElementById("jetpack-fuel-fill");
const jetpackFuelPercentEl = document.getElementById("jetpack-fuel-percent");

const movePadEl = document.getElementById("move-pad");
const moveKnobEl = document.getElementById("move-knob");
const lookPadEl = document.getElementById("look-pad");
const jumpButtonEl = document.getElementById("btn-jump");
const shootButtonEl = document.getElementById("btn-shoot");
const buildButtonEl = document.getElementById("btn-build");
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
scene.background = new THREE.Color(0xffffff);
scene.fog = new THREE.Fog(0xffffff, 20, 120);

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
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.localClippingEnabled = true;
renderer.toneMappingExposure = 1.15;
app.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.95);
scene.add(ambientLight);

const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.55);
scene.add(hemisphereLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.85);
directionalLight.position.set(18, 28, 14);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.set(2048, 2048);
directionalLight.shadow.camera.near = 1;
directionalLight.shadow.camera.far = 120;
directionalLight.shadow.camera.left = -46;
directionalLight.shadow.camera.right = 46;
directionalLight.shadow.camera.top = 46;
directionalLight.shadow.camera.bottom = -46;
directionalLight.shadow.normalBias = 0.015;
scene.add(directionalLight);

const grid = createGrid(scene);
camera.position.set(0, grid.eyeHeight, grid.moveBounds.maxZ - 3);
camera.lookAt(0, grid.eyeHeight, 0);

let player;
let enemySystem;
let towerSystem;

const LARGEST_ENEMY_SIZE = getLargestEnemySize();
const PORTAL_FACE_SIZE = LARGEST_ENEMY_SIZE * 1.5;
const PORTAL_WIDTH = PORTAL_FACE_SIZE;
const PORTAL_HEIGHT = PORTAL_FACE_SIZE;
const PORTAL_THICKNESS = 0.22;
const PORTAL_Y_OFFSET = 0.02;
const PORTAL_ENTRY_DISTANCE = PORTAL_FACE_SIZE * 0.8;
const PORTAL_GEOMETRY = new THREE.BoxGeometry(PORTAL_WIDTH, PORTAL_HEIGHT, PORTAL_THICKNESS);

const PORTAL_UNIFORMS = {
  uTime: { value: 0 },
  uColorA: { value: new THREE.Color(0x3dcfff) },
  uColorB: { value: new THREE.Color(0x2042ff) },
  uEdgeColor: { value: new THREE.Color(0x7bf7ff) },
  uOpacity: { value: 0.78 },
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
  const pathSurfaceY = grid.pathTileTopY ?? grid.tileTopY;
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
    towerSystem.selectTower("laser");
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
  if (event.code === "Escape" && towerSystem.isBuildMode()) {
    towerSystem.cancelPlacement();
    refreshBuildStatus();
    return;
  }

  if (event.code === "Digit1") {
    towerSystem.selectTower("laser");
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
    towerSystem.selectTower("laser");
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
  PORTAL_UNIFORMS.uTime.value = gameTime;

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
function initGame() {
  const spawnPortal = placePathGates();

  player = createPlayer({
    scene,
    camera,
    domElement: renderer.domElement,
    moveBounds: grid.moveBounds,
    eyeHeight: grid.eyeHeight,
    ui: {
      overlayEl,
      jetpackFuelFillEl,
      jetpackFuelPercentEl,
    },
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

  enemySystem = createEnemySystem(scene, grid.pathWaypoints, { spawnPortal });
  towerSystem = createTowerSystem({ scene, camera, grid });

  player.controls.addEventListener("unlock", () => {
    updatePauseState();
    isPrimaryDown = false;
    if (towerSystem && towerSystem.isBuildMode()) {
      towerSystem.cancelPlacement();
      refreshBuildStatus();
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
