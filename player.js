import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";
import * as THREE from "three";
import { GAME_CONFIG } from "./config.js";

const PLAYER_CONFIG = GAME_CONFIG.player;
const MAX_PITCH = PLAYER_CONFIG.look.maxPitch;
const PLAYER_COLLISION_RADIUS = PLAYER_CONFIG.collision.radius;
const MIN_COLLISION_DISTANCE_SQ = PLAYER_CONFIG.collision.minDistanceSq;
const PLAYER_HEAD_CLEARANCE = PLAYER_CONFIG.collision.headClearance;
const TOWER_TOP_SNAP_DOWN = PLAYER_CONFIG.collision.towerTopSnapDown;
const TOWER_TOP_SNAP_UP = PLAYER_CONFIG.collision.towerTopSnapUp;

export function createPlayer({ scene, camera, domElement, moveBounds, eyeHeight, getMovementObstacles }) {
  const isTouchDevice = window.matchMedia("(hover: none), (pointer: coarse)").matches;
  const controls = new PointerLockControls(camera, domElement);
  controls.pointerSpeed = PLAYER_CONFIG.controls.pointerSpeed;
  let lockRequestPending = false;
  let lockRetryPending = false;
  let lastUnlockTime = -Infinity;

  camera.rotation.order = "YXZ";

  // Hand-held cube weapon
  const gunGroup = new THREE.Group();
  const gunBodyMaterial = new THREE.MeshStandardMaterial({
    color: PLAYER_CONFIG.gun.bodyColor,
    emissive: PLAYER_CONFIG.gun.bodyEmissive,
    emissiveIntensity: PLAYER_CONFIG.gun.bodyEmissiveIntensity,
    roughness: PLAYER_CONFIG.gun.bodyRoughness,
    metalness: PLAYER_CONFIG.gun.bodyMetalness,
  });
  const gunCoreMaterial = new THREE.MeshStandardMaterial({
    color: PLAYER_CONFIG.gun.coreColor,
    emissive: PLAYER_CONFIG.gun.coreEmissive,
    emissiveIntensity: PLAYER_CONFIG.gun.coreEmissiveIntensity,
    roughness: PLAYER_CONFIG.gun.coreRoughness,
    metalness: PLAYER_CONFIG.gun.coreMetalness,
    transparent: true,
    opacity: PLAYER_CONFIG.gun.coreOpacity,
  });

  const gunBody = new THREE.Mesh(
    new THREE.BoxGeometry(PLAYER_CONFIG.gun.bodySize, PLAYER_CONFIG.gun.bodySize, PLAYER_CONFIG.gun.bodySize),
    gunBodyMaterial
  );
  gunBody.castShadow = true;
  gunBody.receiveShadow = true;
  gunGroup.add(gunBody);

  const gunCore = new THREE.Mesh(
    new THREE.BoxGeometry(PLAYER_CONFIG.gun.coreSize, PLAYER_CONFIG.gun.coreSize, PLAYER_CONFIG.gun.coreSize),
    gunCoreMaterial
  );
  gunCore.position.set(0, 0, PLAYER_CONFIG.gun.coreOffsetZ);
  gunGroup.add(gunCore);

  const gunFlashMaterial = new THREE.MeshBasicMaterial({
    color: PLAYER_CONFIG.gun.flashColor,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  gunFlashMaterial.toneMapped = false;
  const gunFlashMesh = new THREE.Mesh(
    new THREE.BoxGeometry(PLAYER_CONFIG.gun.flashSize, PLAYER_CONFIG.gun.flashSize, PLAYER_CONFIG.gun.flashSize),
    gunFlashMaterial
  );
  gunFlashMesh.position.copy(gunCore.position);
  gunGroup.add(gunFlashMesh);

  const gunEdges = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(PLAYER_CONFIG.gun.edgeSize, PLAYER_CONFIG.gun.edgeSize, PLAYER_CONFIG.gun.edgeSize)),
    new THREE.LineBasicMaterial({
      color: PLAYER_CONFIG.gun.edgeColor,
      transparent: true,
      opacity: PLAYER_CONFIG.gun.edgeOpacity,
    })
  );
  gunGroup.add(gunEdges);

  const gunBarrel = new THREE.Object3D();
  gunBarrel.position.set(0, 0, PLAYER_CONFIG.gun.barrelOffsetZ);
  gunGroup.add(gunBarrel);

  const gunLight = new THREE.PointLight(PLAYER_CONFIG.gun.lightColor, 0, PLAYER_CONFIG.gun.lightDistance);
  gunLight.position.set(0, 0, PLAYER_CONFIG.gun.lightOffsetZ);
  gunGroup.add(gunLight);

  const gunFlashDuration = PLAYER_CONFIG.gun.flashDuration;
  let gunFlashTimer = 0;

  // Attach to camera
  gunGroup.position.set(
    PLAYER_CONFIG.gun.offsetX,
    PLAYER_CONFIG.gun.offsetY,
    PLAYER_CONFIG.gun.offsetZ
  );
  camera.add(gunGroup);
  scene.add(camera);

  const lookNoiseThreshold = PLAYER_CONFIG.look.lookNoiseThresholdPx;
  const touchLookSensitivity = PLAYER_CONFIG.look.touchSensitivity;
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

  const moveSpeed = PLAYER_CONFIG.movement.moveSpeed;
  const sprintMultiplier = PLAYER_CONFIG.movement.sprintMultiplier;
  const gravity = PLAYER_CONFIG.movement.gravity;
  const jumpVelocity = PLAYER_CONFIG.movement.jumpVelocity;
  let verticalVelocity = 0;
  let jumpQueued = false;
  let jumpHeld = false;

  const jetpackMaxFuel = PLAYER_CONFIG.jetpack.maxFuel;
  const jetpackBurnRate = PLAYER_CONFIG.jetpack.burnRate;
  const jetpackGroundRechargeRate = PLAYER_CONFIG.jetpack.groundRechargeRate;
  const jetpackAirRechargeRate = PLAYER_CONFIG.jetpack.airRechargeRate;
  const jetpackAcceleration = PLAYER_CONFIG.jetpack.acceleration;
  const jetpackMaxRiseSpeed = PLAYER_CONFIG.jetpack.maxRiseSpeed;
  let jetpackFuel = jetpackMaxFuel;

  const projectileGeometry = new THREE.BoxGeometry(
    PLAYER_CONFIG.weapon.projectileSize,
    PLAYER_CONFIG.weapon.projectileSize,
    PLAYER_CONFIG.weapon.projectileSize
  );
  const projectileMaterial = new THREE.MeshStandardMaterial({
    color: PLAYER_CONFIG.weapon.projectileColor,
    emissive: PLAYER_CONFIG.weapon.projectileEmissive,
    emissiveIntensity: PLAYER_CONFIG.weapon.projectileEmissiveIntensity,
    roughness: PLAYER_CONFIG.weapon.projectileRoughness,
    metalness: PLAYER_CONFIG.weapon.projectileMetalness,
  });
  const projectileVelocity = new THREE.Vector3();
  const projectileDirection = new THREE.Vector3();
  const projectiles = [];
  const projectileImpacts = [];
  const projectileSpeed = PLAYER_CONFIG.weapon.projectileSpeed;
  const projectileLifetime = PLAYER_CONFIG.weapon.projectileLifetime;
  const projectileDamage = PLAYER_CONFIG.weapon.projectileDamage;
  const projectileHitRadius = PLAYER_CONFIG.weapon.projectileHitRadius;
  const projectileGravity = PLAYER_CONFIG.weapon.projectileGravity;
  const projectileImpactDuration = PLAYER_CONFIG.projectileImpact.duration;
  const projectileImpactFlashGeometry = new THREE.SphereGeometry(
    PLAYER_CONFIG.projectileImpact.flashRadius,
    PLAYER_CONFIG.projectileImpact.flashSegments,
    PLAYER_CONFIG.projectileImpact.flashSegments
  );
  const projectileImpactRingGeometry = new THREE.RingGeometry(
    PLAYER_CONFIG.projectileImpact.ringInnerRadius,
    PLAYER_CONFIG.projectileImpact.ringOuterRadius,
    PLAYER_CONFIG.projectileImpact.ringSegments
  );
  const despawnMargin = PLAYER_CONFIG.weapon.despawnMargin;
  const baseFireCooldown = PLAYER_CONFIG.weapon.baseFireCooldown;

  let fireCooldownRemaining = 0;

  let playerDamageMultiplier = 1;
  let playerFireRateMultiplier = 1;

  function upgradePlayerDamage() { playerDamageMultiplier += PLAYER_CONFIG.upgrades.damageUpgradeAdd; }
  function upgradePlayerFireRate() { playerFireRateMultiplier *= PLAYER_CONFIG.upgrades.fireRateUpgradeMultiplier; }

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
      const recentlyUnlocked = performance.now() - lastUnlockTime < PLAYER_CONFIG.controls.lockRetryWindowMs;
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

  function getJetpackFuelRatio() {
    return Math.max(0, Math.min(1, jetpackFuel / jetpackMaxFuel));
  }

  function getJetpackFuelPercent() {
    return Math.round(getJetpackFuelRatio() * 100);
  }

  function updateGunVisuals(deltaSeconds) {
    gunFlashTimer = Math.max(0, gunFlashTimer - deltaSeconds);
    const flash = gunFlashTimer > 0 ? (gunFlashTimer / gunFlashDuration) : 0;
    const flashBoost = flash > 0 ? Math.pow(flash, PLAYER_CONFIG.gun.flashExponent) : 0;

    gunBodyMaterial.emissiveIntensity = PLAYER_CONFIG.gun.bodyEmissiveIntensity + flashBoost * PLAYER_CONFIG.gun.bodyFlashBoost;
    gunCoreMaterial.emissiveIntensity = PLAYER_CONFIG.gun.coreEmissiveIntensity + flashBoost * PLAYER_CONFIG.gun.coreFlashBoost;
    gunCoreMaterial.opacity = PLAYER_CONFIG.gun.coreOpacity + flashBoost * PLAYER_CONFIG.gun.coreOpacityBoost;
    gunCore.scale.setScalar(1 + flashBoost * PLAYER_CONFIG.gun.coreScaleBoost);
    gunFlashMaterial.opacity = flashBoost * PLAYER_CONFIG.gun.flashOpacityBoost;
    gunFlashMesh.scale.setScalar(1 + flashBoost * PLAYER_CONFIG.gun.flashScaleBoost);
    gunLight.intensity = flashBoost * PLAYER_CONFIG.gun.lightFlashBoost;
  }

  function tryShoot() {
    if (fireCooldownRemaining > 0) {
      return false;
    }

    camera.getWorldDirection(projectileDirection).normalize();
    const spawnWorldPos = new THREE.Vector3();
    gunBarrel.getWorldPosition(spawnWorldPos);

    // Slight offset forward from the visual tip
    spawnWorldPos.addScaledVector(projectileDirection, PLAYER_CONFIG.weapon.spawnForwardOffset);

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
      color: PLAYER_CONFIG.projectileImpact.flashColor,
      transparent: true,
      opacity: PLAYER_CONFIG.projectileImpact.flashOpacity,
      depthWrite: false,
    });
    flashMaterial.toneMapped = false;
    const flash = new THREE.Mesh(projectileImpactFlashGeometry, flashMaterial);
    root.add(flash);

    const ringMaterial = new THREE.MeshBasicMaterial({
      color: PLAYER_CONFIG.projectileImpact.ringColor,
      transparent: true,
      opacity: PLAYER_CONFIG.projectileImpact.ringOpacity,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    ringMaterial.toneMapped = false;
    const ring = new THREE.Mesh(projectileImpactRingGeometry, ringMaterial);
    ring.rotation.x = -Math.PI * 0.5;
    ring.position.y = PLAYER_CONFIG.projectileImpact.ringYOffset;
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

      impact.flash.material.opacity = PLAYER_CONFIG.projectileImpact.flashOpacity * t;
      impact.ring.material.opacity = PLAYER_CONFIG.projectileImpact.ringOpacity * t;
      impact.flash.scale.setScalar(1 + invT * PLAYER_CONFIG.projectileImpact.flashExpand);
      impact.ring.scale.setScalar(1 + invT * PLAYER_CONFIG.projectileImpact.ringExpand);

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
      const towerHitPadding = PLAYER_CONFIG.weapon.towerHitPadding;
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
        projectile.mesh.position.y < PLAYER_CONFIG.weapon.despawnMinY ||
        projectile.mesh.position.y > PLAYER_CONFIG.weapon.despawnMaxY;

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
        const withinTopX = Math.abs(x - obstaclePos.x)
          <= (obstacleHalfSize - PLAYER_COLLISION_RADIUS * PLAYER_CONFIG.collision.towerTopInsetFromRadius);
        const withinTopZ = Math.abs(z - obstaclePos.z)
          <= (obstacleHalfSize - PLAYER_COLLISION_RADIUS * PLAYER_CONFIG.collision.towerTopInsetFromRadius);
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
      Math.abs(virtualState.forward) > PLAYER_CONFIG.movement.virtualDeadzone
      || Math.abs(virtualState.strafe) > PLAYER_CONFIG.movement.virtualDeadzone;
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
    const isGrounded = camera.position.y <= currentSupportY + PLAYER_CONFIG.movement.groundedEpsilon;
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
      for (let pass = 0; pass < PLAYER_CONFIG.movement.collisionPasses; pass += 1) {
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
    getJetpackFuelRatio,
    getJetpackFuelPercent,
    upgradePlayerDamage,
    upgradePlayerFireRate,
    setMenuMode,
  };
}
