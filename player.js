import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import * as THREE from "three";

const MAX_PITCH = Math.PI * 0.5 - 0.05;
const PLAYER_COLLISION_RADIUS = 0.55;
const MIN_COLLISION_DISTANCE_SQ = 1e-6;
const PLAYER_HEAD_CLEARANCE = 0.2;
const TOWER_TOP_SNAP_DOWN = 0.9;
const TOWER_TOP_SNAP_UP = 0.22;

export function createPlayer({ scene, camera, domElement, moveBounds, eyeHeight, ui, getMovementObstacles }) {
  const isTouchDevice = window.matchMedia("(hover: none), (pointer: coarse)").matches;
  const controls = new PointerLockControls(camera, domElement);
  controls.pointerSpeed = 0.75;
  let lockRequestPending = false;
  let lockRetryPending = false;
  let lastUnlockTime = -Infinity;

  camera.rotation.order = "YXZ";

  // Hand-held cube weapon
  const gunGroup = new THREE.Group();
  const gunBodyMaterial = new THREE.MeshStandardMaterial({
    color: 0x2f3d4c,
    emissive: 0x06121c,
    emissiveIntensity: 0.35,
    roughness: 0.35,
    metalness: 0.65,
  });
  const gunCoreMaterial = new THREE.MeshStandardMaterial({
    color: 0x74ffd2,
    emissive: 0x1abf93,
    emissiveIntensity: 0.65,
    roughness: 0.22,
    metalness: 0.25,
    transparent: true,
    opacity: 0.8,
  });

  const gunBody = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.24), gunBodyMaterial);
  gunBody.castShadow = true;
  gunBody.receiveShadow = true;
  gunGroup.add(gunBody);

  const gunCore = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), gunCoreMaterial);
  gunCore.position.set(0, 0, -0.1);
  gunGroup.add(gunCore);

  const gunFlashMaterial = new THREE.MeshBasicMaterial({
    color: 0x8efff6,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  gunFlashMaterial.toneMapped = false;
  const gunFlashMesh = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22), gunFlashMaterial);
  gunFlashMesh.position.copy(gunCore.position);
  gunGroup.add(gunFlashMesh);

  const gunEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(0.25, 0.25, 0.25)),
    new THREE.LineBasicMaterial({ color: 0xa6f8ff, transparent: true, opacity: 0.8 })
  );
  gunGroup.add(gunEdges);

  const gunBarrel = new THREE.Object3D();
  gunBarrel.position.set(0, 0, -0.17);
  gunGroup.add(gunBarrel);

  const gunLight = new THREE.PointLight(0x8efff6, 0, 1.8);
  gunLight.position.set(0, 0, -0.14);
  gunGroup.add(gunLight);

  const gunFlashDuration = 0.4;
  let gunFlashTimer = 0;

  // Attach to camera
  gunGroup.position.set(0.35, -0.3, -0.42);
  camera.add(gunGroup);
  scene.add(camera);

  const lookNoiseThreshold = 1;
  const touchLookSensitivity = 0.0022;
  let yaw = camera.rotation.y;
  let pitch = camera.rotation.x;
  let lookDeltaX = 0;
  let lookDeltaY = 0;

  const moveState = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    sprint: false,
  };
  const virtualState = {
    strafe: 0,
    forward: 0,
  };

  const moveSpeed = 6;
  const sprintMultiplier = 1.6;
  const gravity = 24;
  const jumpVelocity = 10.8;
  let verticalVelocity = 0;
  let jumpQueued = false;
  let jumpHeld = false;

  const jetpackMaxFuel = 4.5;
  const jetpackBurnRate = 1;
  const jetpackGroundRechargeRate = 0.42;
  const jetpackAirRechargeRate = 0.14;
  const jetpackAcceleration = 32;
  const jetpackMaxRiseSpeed = 8.2;
  let jetpackFuel = jetpackMaxFuel;

  const projectileGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.1);
  const projectileMaterial = new THREE.MeshStandardMaterial({
    color: 0x74ffd2,
    emissive: 0x13a479,
    emissiveIntensity: 0.9,
    roughness: 0.2,
    metalness: 0.12,
  });
  const projectileVelocity = new THREE.Vector3();
  const projectileDirection = new THREE.Vector3();
  const projectiles = [];
  const projectileImpacts = [];
  const projectileSpeed = 45;
  const projectileLifetime = 2.4;
  const projectileDamage = 34;
  const projectileHitRadius = 0.36;
  const projectileGravity = 0;
  const projectileImpactDuration = 0.16;
  const projectileImpactFlashGeometry = new THREE.SphereGeometry(0.06, 8, 8);
  const projectileImpactRingGeometry = new THREE.RingGeometry(0.02, 0.08, 16);
  const despawnMargin = 4;
  const baseFireCooldown = 0.28;

  let fireCooldownRemaining = 0;

  let playerDamageMultiplier = 1;
  let playerFireRateMultiplier = 1;

  function upgradePlayerDamage() { playerDamageMultiplier += 0.5; }
  function upgradePlayerFireRate() { playerFireRateMultiplier *= 0.75; }

  function setMovementKey(code, isDown) {
    switch (code) {
      case "KeyW":
        moveState.forward = isDown;
        break;
      case "KeyS":
        moveState.backward = isDown;
        break;
      case "KeyA":
        moveState.left = isDown;
        break;
      case "KeyD":
        moveState.right = isDown;
        break;
      case "ShiftLeft":
      case "ShiftRight":
        moveState.sprint = isDown;
        break;
      default:
        break;
    }
  }

  window.addEventListener("keydown", (event) => {
    setMovementKey(event.code, true);
    if (event.code === "Space") {
      event.preventDefault();
      jumpHeld = true;
      if (!event.repeat) {
        jump();
      }
    }
  });

  window.addEventListener("keyup", (event) => {
    setMovementKey(event.code, false);
    if (event.code === "Space") {
      jumpHeld = false;
    }
  });

  controls.addEventListener("lock", () => {
    lockRequestPending = false;
    lockRetryPending = false;
    yaw = camera.rotation.y;
    pitch = camera.rotation.x;
    lookDeltaX = 0;
    lookDeltaY = 0;
    ui.overlayEl.classList.add("hidden");
  });

  controls.addEventListener("unlock", () => {
    lockRequestPending = false;
    lockRetryPending = false;
    lastUnlockTime = performance.now();
    yaw = camera.rotation.y;
    pitch = camera.rotation.x;
    jumpHeld = false;
  });

  function requestPointerLock(attempt = 0) {
    let maybePromise;
    try {
      maybePromise = controls.domElement.requestPointerLock?.();
    } catch (error) {
      lockRequestPending = false;
      if (error?.name !== "SecurityError") {
        console.warn("Pointer lock request failed:", error);
      }
      return;
    }

    if (!maybePromise || typeof maybePromise.then !== "function") {
      return;
    }

    maybePromise.catch((error) => {
      const recentlyUnlocked = performance.now() - lastUnlockTime < 250;
      const shouldRetry = error?.name === "SecurityError" && attempt === 0 && recentlyUnlocked;
      if (shouldRetry) {
        lockRetryPending = true;
        requestAnimationFrame(() => {
          lockRetryPending = false;
          if (!lockRequestPending || controls.isLocked) {
            return;
          }
          requestPointerLock(attempt + 1);
        });
        return;
      }

      lockRequestPending = false;
      if (error?.name !== "SecurityError") {
        console.warn("Pointer lock request failed:", error);
      }
    });
  }

  document.addEventListener(
    "pointerlockerror",
    (event) => {
      if (!lockRequestPending) {
        return;
      }

      // Suppress Three.js default console.error for transient relock races;
      // promise rejection handling above already manages retries/failures.
      event.stopImmediatePropagation();
    },
    true
  );

  domElement.addEventListener("click", () => {
    if (isTouchDevice || controls.isLocked || lockRequestPending) {
      return;
    }
    if (document.pointerLockElement === controls.domElement) {
      return;
    }

    lockRequestPending = true;
    lockRetryPending = false;
    requestPointerLock(0);
  });

  let isMenuMode = false;
  function setMenuMode(mode) {
    isMenuMode = mode;
  }

  // Filter tiny pointer-lock movement noise that can cause idle camera drift.
  document.addEventListener(
    "mousemove",
    (event) => {
      if (!controls.isLocked) {
        return;
      }
      if (isMenuMode) {
        event.stopImmediatePropagation();
        return;
      }
      if (
        Math.abs(event.movementX) < lookNoiseThreshold &&
        Math.abs(event.movementY) < lookNoiseThreshold
      ) {
        event.stopImmediatePropagation();
      }
    },
    true
  );

  camera.position.y = eyeHeight;

  function addLookInput(deltaX, deltaY) {
    lookDeltaX += deltaX;
    lookDeltaY += deltaY;
  }

  function setVirtualMove(strafe, forward) {
    virtualState.strafe = Math.max(-1, Math.min(1, strafe));
    virtualState.forward = Math.max(-1, Math.min(1, forward));
  }

  function jump() {
    jumpQueued = true;
  }

  function updateJetpackUi() {
    const fuelRatio = Math.max(0, Math.min(1, jetpackFuel / jetpackMaxFuel));
    if (ui?.jetpackFuelFillEl) {
      ui.jetpackFuelFillEl.style.width = `${Math.round(fuelRatio * 100)}%`;
    }
    if (ui?.jetpackFuelPercentEl) {
      ui.jetpackFuelPercentEl.textContent = `${Math.round(fuelRatio * 100)}%`;
    }
  }

  function updateGunVisuals(deltaSeconds) {
    gunFlashTimer = Math.max(0, gunFlashTimer - deltaSeconds);
    const flash = gunFlashTimer > 0 ? (gunFlashTimer / gunFlashDuration) : 0;
    const flashBoost = flash > 0 ? Math.pow(flash, 0.3) : 0;

    gunBodyMaterial.emissiveIntensity = 0.35 + flashBoost * 2.2;
    gunCoreMaterial.emissiveIntensity = 0.65 + flashBoost * 5.8;
    gunCoreMaterial.opacity = 0.8 + flashBoost * 0.2;
    gunCore.scale.setScalar(1 + flashBoost * 0.34);
    gunFlashMaterial.opacity = flashBoost * 0.26;
    gunFlashMesh.scale.setScalar(1 + flashBoost * 0.22);
    gunLight.intensity = flashBoost * 6.8;
  }

  function tryShoot() {
    if (fireCooldownRemaining > 0) {
      return false;
    }

    camera.getWorldDirection(projectileDirection).normalize();
    const spawnWorldPos = new THREE.Vector3();
    gunBarrel.getWorldPosition(spawnWorldPos);

    // Slight offset forward from the visual tip
    spawnWorldPos.addScaledVector(projectileDirection, 0.2);

    const projectileMesh = new THREE.Mesh(projectileGeometry, projectileMaterial);
    projectileMesh.position.copy(spawnWorldPos);
    scene.add(projectileMesh);

    projectileVelocity.copy(projectileDirection).multiplyScalar(projectileSpeed);
    projectiles.push({
      mesh: projectileMesh,
      velocity: projectileVelocity.clone(),
      life: projectileLifetime,
      damage: projectileDamage * playerDamageMultiplier,
    });

    gunFlashTimer = gunFlashDuration;
    fireCooldownRemaining = baseFireCooldown * playerFireRateMultiplier;
    return true;
  }

  function removeProjectile(index) {
    scene.remove(projectiles[index].mesh);
    projectiles.splice(index, 1);
  }

  function spawnProjectileImpact(position) {
    const root = new THREE.Group();
    root.position.copy(position);

    const flashMaterial = new THREE.MeshBasicMaterial({
      color: 0x9bffe0,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    flashMaterial.toneMapped = false;
    const flash = new THREE.Mesh(projectileImpactFlashGeometry, flashMaterial);
    root.add(flash);

    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xb8fff2,
      transparent: true,
      opacity: 0.82,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    ringMaterial.toneMapped = false;
    const ring = new THREE.Mesh(projectileImpactRingGeometry, ringMaterial);
    ring.rotation.x = -Math.PI * 0.5;
    ring.position.y = 0.01;
    root.add(ring);

    scene.add(root);
    projectileImpacts.push({
      root,
      flash,
      ring,
      life: projectileImpactDuration,
      maxLife: projectileImpactDuration,
    });
  }

  function updateProjectileImpacts(deltaSeconds) {
    for (let i = projectileImpacts.length - 1; i >= 0; i -= 1) {
      const impact = projectileImpacts[i];
      impact.life -= deltaSeconds;
      const t = Math.max(0, impact.life / impact.maxLife);
      const invT = 1 - t;

      impact.flash.material.opacity = 0.9 * t;
      impact.ring.material.opacity = 0.82 * t;
      impact.flash.scale.setScalar(1 + invT * 1.2);
      impact.ring.scale.setScalar(1 + invT * 2.0);

      if (impact.life <= 0) {
        scene.remove(impact.root);
        impact.flash.material.dispose();
        impact.ring.material.dispose();
        projectileImpacts.splice(i, 1);
      }
    }
  }

  function updateProjectiles(deltaSeconds, enemySystem) {
    const obstacles = typeof getMovementObstacles === "function"
      ? (Array.isArray(getMovementObstacles()) ? getMovementObstacles() : [])
      : [];

    function projectileHitsTower(position) {
      const towerHitPadding = 0.06;
      for (const obstacle of obstacles) {
        const obstaclePos = obstacle?.mesh?.position ?? obstacle?.position;
        const halfSize = obstacle?.halfSize;
        const height = obstacle?.height;
        const baseY = obstacle?.baseY ?? 0;
        if (!obstaclePos || typeof halfSize !== "number" || typeof height !== "number") {
          continue;
        }

        const minX = obstaclePos.x - halfSize - towerHitPadding;
        const maxX = obstaclePos.x + halfSize + towerHitPadding;
        const minY = baseY - towerHitPadding;
        const maxY = baseY + height + towerHitPadding;
        const minZ = obstaclePos.z - halfSize - towerHitPadding;
        const maxZ = obstaclePos.z + halfSize + towerHitPadding;

        if (
          position.x >= minX &&
          position.x <= maxX &&
          position.y >= minY &&
          position.y <= maxY &&
          position.z >= minZ &&
          position.z <= maxZ
        ) {
          return true;
        }
      }
      return false;
    }

    for (let i = projectiles.length - 1; i >= 0; i -= 1) {
      const projectile = projectiles[i];
      projectile.velocity.y -= projectileGravity * deltaSeconds;
      projectile.mesh.position.addScaledVector(projectile.velocity, deltaSeconds);
      projectile.life -= deltaSeconds;

      const hit = enemySystem.applyDamageAtPoint(
        projectile.mesh.position,
        projectileHitRadius,
        projectile.damage
      );

      const outOfBounds =
        projectile.mesh.position.x < moveBounds.minX - despawnMargin ||
        projectile.mesh.position.x > moveBounds.maxX + despawnMargin ||
        projectile.mesh.position.z < moveBounds.minZ - despawnMargin ||
        projectile.mesh.position.z > moveBounds.maxZ + despawnMargin ||
        projectile.mesh.position.y < -3 ||
        projectile.mesh.position.y > 22;

      const hitTower = projectileHitsTower(projectile.mesh.position);

      if (hit || hitTower || projectile.life <= 0 || outOfBounds) {
        if (hit || hitTower) {
          spawnProjectileImpact(projectile.mesh.position);
        }
        removeProjectile(i);
      }
    }
  }

  function updateLook() {
    if (controls.isLocked) {
      yaw = camera.rotation.y;
      pitch = camera.rotation.x;
      return;
    }

    if (lookDeltaX === 0 && lookDeltaY === 0) {
      return;
    }

    yaw -= lookDeltaX * touchLookSensitivity;
    pitch -= lookDeltaY * touchLookSensitivity;
    pitch = Math.min(MAX_PITCH, Math.max(-MAX_PITCH, pitch));
    camera.rotation.set(pitch, yaw, 0);
    lookDeltaX = 0;
    lookDeltaY = 0;
  }

  function updateMovement(deltaSeconds) {
    const obstacles = typeof getMovementObstacles === "function"
      ? (Array.isArray(getMovementObstacles()) ? getMovementObstacles() : [])
      : [];

    function getSupportCameraYAtPosition(x, z, currentCameraY) {
      let supportY = eyeHeight;
      const feetY = currentCameraY - eyeHeight;

      for (const obstacle of obstacles) {
        const obstaclePos = obstacle?.mesh?.position ?? obstacle?.position;
        const obstacleHalfSize = obstacle?.halfSize;
        const obstacleHeight = obstacle?.height;
        const obstacleBaseY = obstacle?.baseY ?? 0;
        if (!obstaclePos || typeof obstacleHalfSize !== "number" || typeof obstacleHeight !== "number") {
          continue;
        }

        const topY = obstacleBaseY + obstacleHeight;
        const withinTopX = Math.abs(x - obstaclePos.x) <= (obstacleHalfSize - PLAYER_COLLISION_RADIUS * 0.1);
        const withinTopZ = Math.abs(z - obstaclePos.z) <= (obstacleHalfSize - PLAYER_COLLISION_RADIUS * 0.1);
        const nearTop = feetY >= (topY - TOWER_TOP_SNAP_DOWN) && feetY <= (topY + TOWER_TOP_SNAP_UP);
        if (withinTopX && withinTopZ && nearTop) {
          supportY = Math.max(supportY, topY + eyeHeight);
        }
      }

      return supportY;
    }

    const keyboardForward = Number(moveState.forward) - Number(moveState.backward);
    const keyboardStrafe = Number(moveState.right) - Number(moveState.left);
    const usingVirtual =
      Math.abs(virtualState.forward) > 0.01 || Math.abs(virtualState.strafe) > 0.01;
    const canMove = controls.isLocked || usingVirtual;

    if (canMove) {
      const forwardAxis = (controls.isLocked ? keyboardForward : 0) + virtualState.forward;
      const strafeAxis = (controls.isLocked ? keyboardStrafe : 0) + virtualState.strafe;
      const length = Math.hypot(forwardAxis, strafeAxis);
      const activeMoveSpeed = moveSpeed * (controls.isLocked && moveState.sprint ? sprintMultiplier : 1);

      if (length > 0) {
        controls.moveForward((forwardAxis / length) * activeMoveSpeed * deltaSeconds);
        controls.moveRight((strafeAxis / length) * activeMoveSpeed * deltaSeconds);
      }
    }

    const currentSupportY = getSupportCameraYAtPosition(camera.position.x, camera.position.z, camera.position.y);
    const isGrounded = camera.position.y <= currentSupportY + 0.001;
    if (jumpQueued && isGrounded) {
      verticalVelocity = jumpVelocity;
    }
    jumpQueued = false;

    const isTryingJetpack = jumpHeld && !isGrounded;
    const usingJetpack = isTryingJetpack && jetpackFuel > 0;
    if (usingJetpack) {
      jetpackFuel = Math.max(0, jetpackFuel - jetpackBurnRate * deltaSeconds);
      verticalVelocity = Math.min(
        jetpackMaxRiseSpeed,
        verticalVelocity + jetpackAcceleration * deltaSeconds
      );
    } else if (!isTryingJetpack) {
      const rechargeRate = isGrounded ? jetpackGroundRechargeRate : jetpackAirRechargeRate;
      jetpackFuel = Math.min(jetpackMaxFuel, jetpackFuel + rechargeRate * deltaSeconds);
    }

    verticalVelocity -= gravity * deltaSeconds;
    camera.position.y += verticalVelocity * deltaSeconds;

    const supportAfterVertical = getSupportCameraYAtPosition(camera.position.x, camera.position.z, camera.position.y);
    if (camera.position.y < supportAfterVertical) {
      camera.position.y = supportAfterVertical;
      verticalVelocity = 0;
    }

    camera.position.x = Math.min(moveBounds.maxX, Math.max(moveBounds.minX, camera.position.x));
    camera.position.z = Math.min(moveBounds.maxZ, Math.max(moveBounds.minZ, camera.position.z));

    if (obstacles.length > 0) {
      for (let pass = 0; pass < 2; pass += 1) {
        for (const obstacle of obstacles) {
          const obstaclePos = obstacle?.mesh?.position ?? obstacle?.position;
          const obstacleHalfSize = obstacle?.halfSize;
          const obstacleHeight = obstacle?.height;
          const obstacleBaseY = obstacle?.baseY ?? 0;

          if (obstaclePos && typeof obstacleHalfSize === "number" && typeof obstacleHeight === "number") {
            const playerFeetY = camera.position.y - eyeHeight;
            const playerHeadY = camera.position.y + PLAYER_HEAD_CLEARANCE;
            const obstacleTopY = obstacleBaseY + obstacleHeight;
            const verticalOverlap = playerHeadY > obstacleBaseY && playerFeetY < obstacleTopY;
            if (!verticalOverlap) {
              continue;
            }

            const expandedHalf = obstacleHalfSize + PLAYER_COLLISION_RADIUS;
            const localX = camera.position.x - obstaclePos.x;
            const localZ = camera.position.z - obstaclePos.z;
            if (Math.abs(localX) >= expandedHalf || Math.abs(localZ) >= expandedHalf) {
              continue;
            }

            const penetrationX = expandedHalf - Math.abs(localX);
            const penetrationZ = expandedHalf - Math.abs(localZ);
            if (penetrationX < penetrationZ) {
              const dirX = localX >= 0 ? 1 : -1;
              camera.position.x += dirX * penetrationX;
            } else {
              const dirZ = localZ >= 0 ? 1 : -1;
              camera.position.z += dirZ * penetrationZ;
            }
            continue;
          }

          const obstacleRadius = obstacle?.radius;
          if (!obstaclePos || typeof obstacleRadius !== "number") {
            continue;
          }

          const dx = camera.position.x - obstaclePos.x;
          const dz = camera.position.z - obstaclePos.z;
          const minDistance = PLAYER_COLLISION_RADIUS + obstacleRadius;
          const distSq = (dx * dx) + (dz * dz);
          if (distSq >= minDistance * minDistance) {
            continue;
          }

          if (distSq <= MIN_COLLISION_DISTANCE_SQ) {
            camera.position.x += minDistance;
            continue;
          }

          const dist = Math.sqrt(distSq);
          const push = (minDistance - dist) / dist;
          camera.position.x += dx * push;
          camera.position.z += dz * push;
        }
      }

      camera.position.x = Math.min(moveBounds.maxX, Math.max(moveBounds.minX, camera.position.x));
      camera.position.z = Math.min(moveBounds.maxZ, Math.max(moveBounds.minZ, camera.position.z));

      const supportAfterCollision = getSupportCameraYAtPosition(camera.position.x, camera.position.z, camera.position.y);
      if (camera.position.y < supportAfterCollision) {
        camera.position.y = supportAfterCollision;
        verticalVelocity = 0;
      }
    }
  }

  function update(deltaSeconds, enemySystem) {
    fireCooldownRemaining = Math.max(0, fireCooldownRemaining - deltaSeconds);
    updateLook();
    updateMovement(deltaSeconds);
    updateGunVisuals(deltaSeconds);
    updateJetpackUi();
    updateProjectiles(deltaSeconds, enemySystem);
    updateProjectileImpacts(deltaSeconds);
  }

  function resetMovement() {
    moveState.forward = false;
    moveState.backward = false;
    moveState.left = false;
    moveState.right = false;
    moveState.sprint = false;
    virtualState.forward = 0;
    virtualState.strafe = 0;
    jumpQueued = false;
    jumpHeld = false;
  }

  function getPosition() {
    return camera.position;
  }

  return {
    controls,
    update,
    jump,
    tryShoot,
    addLookInput,
    setVirtualMove,
    resetMovement,
    getPosition,
    upgradePlayerDamage,
    upgradePlayerFireRate,
    setMenuMode,
  };
}
