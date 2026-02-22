import { PointerLockControls } from "https://esm.sh/three@0.161.0/examples/jsm/controls/PointerLockControls.js";
import * as THREE from "https://esm.sh/three@0.161.0";

const MAX_PITCH = Math.PI * 0.5 - 0.05;

export function createPlayer({ scene, camera, domElement, moveBounds, eyeHeight, ui }) {
  const isTouchDevice = window.matchMedia("(hover: none), (pointer: coarse)").matches;
  const controls = new PointerLockControls(camera, document.body);
  controls.pointerSpeed = 0.75;

  camera.rotation.order = "YXZ";

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
  };
  const virtualState = {
    strafe: 0,
    forward: 0,
  };

  const moveSpeed = 6;
  const gravity = 24;
  const jumpVelocity = 9;
  let verticalVelocity = 0;
  let jumpQueued = false;

  const projectileGeometry = new THREE.SphereGeometry(0.12, 10, 10);
  const projectileMaterial = new THREE.MeshStandardMaterial({
    color: 0xff965a,
    emissive: 0x531f0b,
    roughness: 0.5,
    metalness: 0.05,
  });
  const projectileVelocity = new THREE.Vector3();
  const projectileSpawnOffset = new THREE.Vector3();
  const projectileDirection = new THREE.Vector3();
  const projectiles = [];
  const projectileSpeed = 15;
  const projectileLifetime = 2.4;
  const projectileDamage = 34;
  const projectileHitRadius = 0.18;
  const projectileGravity = 9;
  const despawnMargin = 4;
  const fireCooldown = 0.28;
  let fireCooldownRemaining = 0;

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
      default:
        break;
    }
  }

  window.addEventListener("keydown", (event) => {
    setMovementKey(event.code, true);
    if (event.code === "Space") {
      event.preventDefault();
      jump();
    }
  });

  window.addEventListener("keyup", (event) => setMovementKey(event.code, false));

  controls.addEventListener("lock", () => {
    yaw = camera.rotation.y;
    pitch = camera.rotation.x;
    lookDeltaX = 0;
    lookDeltaY = 0;
    ui.overlayEl.classList.add("hidden");
  });

  controls.addEventListener("unlock", () => {
    yaw = camera.rotation.y;
    pitch = camera.rotation.x;
    ui.overlayEl.classList.remove("hidden");
  });

  domElement.addEventListener("mousedown", (event) => {
    if (event.button === 0 && !controls.isLocked && !isTouchDevice) {
      controls.lock();
    }
  });

  // Filter tiny pointer-lock movement noise that can cause idle camera drift.
  document.addEventListener(
    "mousemove",
    (event) => {
      if (!controls.isLocked) {
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

  function tryShoot() {
    if (fireCooldownRemaining > 0) {
      return false;
    }

    camera.getWorldDirection(projectileDirection).normalize();
    projectileSpawnOffset.copy(projectileDirection).multiplyScalar(0.95);
    projectileSpawnOffset.y -= 0.1;

    const projectileMesh = new THREE.Mesh(projectileGeometry, projectileMaterial);
    projectileMesh.position.copy(camera.position).add(projectileSpawnOffset);
    scene.add(projectileMesh);

    projectileVelocity.copy(projectileDirection).multiplyScalar(projectileSpeed);
    projectiles.push({
      mesh: projectileMesh,
      velocity: projectileVelocity.clone(),
      life: projectileLifetime,
      damage: projectileDamage,
    });

    fireCooldownRemaining = fireCooldown;
    return true;
  }

  function removeProjectile(index) {
    scene.remove(projectiles[index].mesh);
    projectiles.splice(index, 1);
  }

  function updateProjectiles(deltaSeconds, enemySystem) {
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

      if (hit || projectile.life <= 0 || outOfBounds) {
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
    const keyboardForward = Number(moveState.forward) - Number(moveState.backward);
    const keyboardStrafe = Number(moveState.right) - Number(moveState.left);
    const usingVirtual =
      Math.abs(virtualState.forward) > 0.01 || Math.abs(virtualState.strafe) > 0.01;
    const canMove = controls.isLocked || usingVirtual;

    if (canMove) {
      const forwardAxis = (controls.isLocked ? keyboardForward : 0) + virtualState.forward;
      const strafeAxis = (controls.isLocked ? keyboardStrafe : 0) + virtualState.strafe;
      const length = Math.hypot(forwardAxis, strafeAxis);

      if (length > 0) {
        controls.moveForward((forwardAxis / length) * moveSpeed * deltaSeconds);
        controls.moveRight((strafeAxis / length) * moveSpeed * deltaSeconds);
      }
    }

    const isGrounded = camera.position.y <= eyeHeight + 0.001;
    if (jumpQueued && isGrounded) {
      verticalVelocity = jumpVelocity;
    }
    jumpQueued = false;

    verticalVelocity -= gravity * deltaSeconds;
    camera.position.y += verticalVelocity * deltaSeconds;

    if (camera.position.y < eyeHeight) {
      camera.position.y = eyeHeight;
      verticalVelocity = 0;
    }

    camera.position.x = Math.min(moveBounds.maxX, Math.max(moveBounds.minX, camera.position.x));
    camera.position.z = Math.min(moveBounds.maxZ, Math.max(moveBounds.minZ, camera.position.z));
  }

  function update(deltaSeconds, enemySystem) {
    fireCooldownRemaining = Math.max(0, fireCooldownRemaining - deltaSeconds);
    updateLook();
    updateMovement(deltaSeconds);
    updateProjectiles(deltaSeconds, enemySystem);
  }

  function resetMovement() {
    moveState.forward = false;
    moveState.backward = false;
    moveState.left = false;
    moveState.right = false;
    virtualState.forward = 0;
    virtualState.strafe = 0;
    jumpQueued = false;
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
  };
}
