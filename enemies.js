import * as THREE from "three";
import { GAME_CONFIG } from "./config.js";

const ENEMY_CONFIG = GAME_CONFIG.enemies;
const BASE_SPEED = ENEMY_CONFIG.baseSpeed;
const DISSOLVE_DEATH_DURATION = ENEMY_CONFIG.dissolveDuration;
const DISSOLVE_EDGE_WIDTH = ENEMY_CONFIG.dissolveEdgeWidth;
const DISSOLVE_NOISE_SCALE = ENEMY_CONFIG.dissolveNoiseScale;
const ENEMY_TYPES = ENEMY_CONFIG.types;
const FALLBACK_ENEMY_TYPE_KEY = Object.prototype.hasOwnProperty.call(ENEMY_TYPES, "red")
  ? "red"
  : (Object.keys(ENEMY_TYPES)[0] ?? null);
const HIT_PULSE_DURATION = ENEMY_CONFIG.hitPulseDuration ?? 0.2;
const HIT_PULSE_EXPONENT = ENEMY_CONFIG.hitPulseExponent ?? 0.4;
const HIT_PULSE_EMISSIVE_BOOST = ENEMY_CONFIG.hitPulseEmissiveBoost ?? 1.2;
const HIT_PULSE_SCALE_BOOST = ENEMY_CONFIG.hitPulseScaleBoost ?? 0.08;
const HIT_PULSE_FREQUENCY = ENEMY_CONFIG.hitPulseFrequency ?? 30;
const HIT_PULSE_STACK_ADD = ENEMY_CONFIG.hitPulseStackAdd ?? 0.75;

function getDirectionOnPlane(from, to) {
  const direction = to.clone().sub(from);
  direction.y = 0;
  if (direction.lengthSq() < ENEMY_CONFIG.directionEpsilon) {
    return new THREE.Vector3(0, 0, 1);
  }
  return direction.normalize();
}

function getLargestEnemyRadius() {
  return Object.values(ENEMY_TYPES).reduce((largest, enemyType) => {
    return Math.max(largest, enemyType.radius);
  }, 0);
}

export function getLargestEnemySize() {
  return Object.values(ENEMY_TYPES).reduce((largest, enemyType) => {
    return Math.max(largest, enemyType.size);
  }, 0);
}

function setClippingOnMaterial(materialOrMaterials, clippingPlane) {
  if (!materialOrMaterials) return;

  const materials = Array.isArray(materialOrMaterials)
    ? materialOrMaterials
    : [materialOrMaterials];

  for (const material of materials) {
    if (!material) continue;
    material.clippingPlanes = clippingPlane ? [clippingPlane] : null;
    material.clipShadows = !!clippingPlane;
    material.needsUpdate = true;
  }
}

function applyVisualClipping(root, clippingPlane) {
  if (!root) return;
  root.traverse((child) => {
    if (!child.isMesh || !child.material) return;
    setClippingOnMaterial(child.material, clippingPlane);
  });
}

function normalizeEnemyType(rawType) {
  if (!FALLBACK_ENEMY_TYPE_KEY) {
    return null;
  }
  if (typeof rawType !== "string") {
    return FALLBACK_ENEMY_TYPE_KEY;
  }

  let type = rawType.trim().toLowerCase();
  if (!type) {
    return FALLBACK_ENEMY_TYPE_KEY;
  }

  // Strip unsupported prefixes while preserving the underlying base type.
  const unsupportedPrefixes = ["regrow-", "camo-", "invisible-"];
  let changed = true;
  while (changed) {
    changed = false;
    for (const prefix of unsupportedPrefixes) {
      if (type.startsWith(prefix)) {
        type = type.slice(prefix.length);
        changed = true;
      }
    }
  }

  if (type.startsWith("r-")) {
    type = type.slice(2);
  }

  if (Object.prototype.hasOwnProperty.call(ENEMY_TYPES, type)) {
    return type;
  }
  return FALLBACK_ENEMY_TYPE_KEY;
}

export function createEnemySystem(scene, pathWaypoints, options = {}) {
  if (!Array.isArray(pathWaypoints) || pathWaypoints.length < 2) {
    throw new Error("Enemy system requires at least two path waypoints.");
  }

  const spawnPathDirection = getDirectionOnPlane(pathWaypoints[0], pathWaypoints[1]);
  const spawnPortalConfig = options?.spawnPortal ?? null;
  const hasSpawnPortal = !!spawnPortalConfig;
  const spawnPortalForward = hasSpawnPortal && spawnPortalConfig.forward
    ? spawnPortalConfig.forward.clone().setY(0).normalize()
    : spawnPathDirection;
  const maxEnemyRadius = getLargestEnemyRadius();
  const onEnemyDefeated = typeof options?.onEnemyDefeated === "function"
    ? options.onEnemyDefeated
    : null;
  const spawnPortalPlane = hasSpawnPortal
    ? (spawnPortalConfig.plane?.clone() ?? null)
    : null;
  const spawnEntryDistance = hasSpawnPortal
    ? (spawnPortalConfig.entryDistance ?? (maxEnemyRadius * ENEMY_CONFIG.portalEntryDistanceFromRadius))
    : 0;

  const travelWaypoints = pathWaypoints.map((waypoint) => waypoint.clone());
  if (hasSpawnPortal) {
    const entryPoint = pathWaypoints[0].clone().addScaledVector(spawnPortalForward, -spawnEntryDistance);
    travelWaypoints.unshift(entryPoint);
  }

  const activeEnemies = [];
  let scheduledSpawns = [];
  let spawnEventCursor = 0;
  let waveElapsedTime = 0;
  let enemySpeedMultiplier = 1;

  function upgradeSlowEnemies() {
    enemySpeedMultiplier *= ENEMY_CONFIG.slowUpgradeMultiplier;
  }

  function buildSpawnEventsFromSegments(segments) {
    const events = [];
    let sequence = 0;

    for (const segment of segments) {
      if (!segment || typeof segment !== "object") {
        continue;
      }
      const type = normalizeEnemyType(segment.type);
      if (!type) {
        continue;
      }

      const count = Math.max(0, Math.floor(Number(segment.count) || 0));
      if (count <= 0) {
        continue;
      }

      let start = Number(segment.start);
      let end = Number(segment.end);
      if (!Number.isFinite(start)) {
        start = 0;
      }
      if (!Number.isFinite(end)) {
        end = start;
      }
      if (end < start) {
        const swap = start;
        start = end;
        end = swap;
      }

      const step = count <= 1 ? 0 : (end - start) / (count - 1);
      for (let i = 0; i < count; i += 1) {
        events.push({
          type,
          time: start + (step * i),
          order: sequence++,
        });
      }
    }

    events.sort((a, b) => {
      if (a.time !== b.time) {
        return a.time - b.time;
      }
      return a.order - b.order;
    });
    return events;
  }

  function buildSpawnEventsFromCounts(counts) {
    const events = [];
    if (!counts || typeof counts !== "object") {
      return events;
    }

    const startDelay = Math.max(0, Number(ENEMY_CONFIG.waveStartSpawnDelay) || 0);
    const interval = Math.max(0, Number(ENEMY_CONFIG.spawnInterval) || 0);
    let sequence = 0;
    let spawnTime = startDelay;

    for (const [rawType, rawCount] of Object.entries(counts)) {
      const type = normalizeEnemyType(rawType);
      if (!type) {
        continue;
      }
      const count = Math.max(0, Math.floor(Number(rawCount) || 0));
      for (let i = 0; i < count; i += 1) {
        events.push({
          type,
          time: spawnTime,
          order: sequence++,
        });
        spawnTime += interval;
      }
    }

    return events;
  }

  function startWave(waveDefinition) {
    if (Array.isArray(waveDefinition)) {
      scheduledSpawns = buildSpawnEventsFromSegments(waveDefinition);
    } else {
      // Legacy adapter for old count-based wave format.
      scheduledSpawns = buildSpawnEventsFromCounts(waveDefinition);
    }
    spawnEventCursor = 0;
    waveElapsedTime = 0;
  }

  function isWaveClear() {
    return activeEnemies.length === 0 && spawnEventCursor >= scheduledSpawns.length;
  }

  function createEnemyMesh(type) {
    const normalizedType = normalizeEnemyType(type);
    const enemyType = normalizedType ? ENEMY_TYPES[normalizedType] : null;
    if (!enemyType) {
      throw new Error("No enemy types are configured.");
    }

    const enemyMesh = new THREE.Group();
    const visualRoot = new THREE.Group();
    enemyMesh.add(visualRoot);

    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: enemyType.color,
      emissive: enemyType.emissive,
      emissiveIntensity: ENEMY_CONFIG.bodyEmissiveIntensity,
      roughness: ENEMY_CONFIG.bodyRoughness,
      metalness: ENEMY_CONFIG.bodyMetalness,
    });
    const bodyMesh = new THREE.Mesh(
      new THREE.BoxGeometry(enemyType.size, enemyType.size, enemyType.size),
      bodyMaterial
    );
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    bodyMesh.position.y = enemyType.size * 0.5 + ENEMY_CONFIG.bodyYOffset;
    visualRoot.add(bodyMesh);

    const healthBarBgWidth = Math.max(
      ENEMY_CONFIG.healthBarBgMinWidth,
      enemyType.size * ENEMY_CONFIG.healthBarWidthFromEnemySize
    );
    const healthBarFgWidth = Math.max(
      ENEMY_CONFIG.healthBarFgMinWidth,
      healthBarBgWidth - ENEMY_CONFIG.healthBarFgInset
    );

    const healthBarRoot = new THREE.Group();
    const healthBarBg = new THREE.Mesh(
      new THREE.PlaneGeometry(healthBarBgWidth, ENEMY_CONFIG.healthBarBgHeight),
      new THREE.MeshBasicMaterial({
        color: ENEMY_CONFIG.healthBarBgColor,
        transparent: true,
        opacity: ENEMY_CONFIG.healthBarBgOpacity,
        depthTest: false,
      })
    );
    const healthBarFg = new THREE.Mesh(
      new THREE.PlaneGeometry(healthBarFgWidth, ENEMY_CONFIG.healthBarFgHeight),
      new THREE.MeshBasicMaterial({
        color: ENEMY_CONFIG.healthBarFgColor,
        transparent: true,
        depthTest: false,
      })
    );
    healthBarBg.renderOrder = ENEMY_CONFIG.healthBarBgRenderOrder;
    healthBarFg.renderOrder = ENEMY_CONFIG.healthBarFgRenderOrder;
    healthBarFg.position.z = ENEMY_CONFIG.healthBarFgOffsetZ;
    healthBarRoot.add(healthBarBg);
    healthBarRoot.add(healthBarFg);
    healthBarRoot.position.set(
      0,
      bodyMesh.position.y
      + enemyType.size * ENEMY_CONFIG.healthBarYOffsetFromEnemySize
      + ENEMY_CONFIG.healthBarYOffset,
      0
    );
    enemyMesh.add(healthBarRoot);

    if (spawnPortalPlane) {
      applyVisualClipping(visualRoot, spawnPortalPlane);
    }

    scene.add(enemyMesh);
    enemyMesh.position.copy(travelWaypoints[0]);

    const initiallyBehindPortal = spawnPortalPlane
      ? spawnPortalPlane.distanceToPoint(enemyMesh.position) < enemyType.radius * ENEMY_CONFIG.portalRevealRadiusFactor
      : false;
    healthBarRoot.visible = !initiallyBehindPortal;
    enemyMesh.userData.bodyCenterOffsetY = bodyMesh.position.y;
    enemyMesh.userData.bodyHalfSize = enemyType.size * 0.5;
    enemyMesh.userData.hitSphereRadius = enemyType.radius;

    return {
      mesh: enemyMesh,
      bodyMesh,
      bodyMaterial,
      baseBodyColor: bodyMaterial.color.clone(),
      baseEmissiveIntensity: bodyMaterial.emissiveIntensity,
      hitPulseTimer: 0,
      hitPulseClock: 0,
      healthBarRoot,
      healthBarFg,
      healthBarBgWidth,
      healthBarFgWidth,
      health: enemyType.health,
      maxHealth: enemyType.health,
      speed: BASE_SPEED * enemyType.speedMultiplier,
      radius: enemyType.radius,
      segmentIndex: 0,
      segmentProgress: 0,
      visualRoot,
      portalPlane: spawnPortalPlane,
      portalClippingActive: !!spawnPortalPlane,
      alive: true,
      dying: false,
      deathTimer: 0,
      deathDuration: DISSOLVE_DEATH_DURATION,
      dissolveUniforms: [],
      dissolveMaterials: [],
      type: normalizedType,
      tempSlowMultiplier: 1,
      tempSlowRemaining: 0,
    };
  }

  function updateHealthBar(enemy) {
    const ratio = Math.max(0, Math.min(1, enemy.health / enemy.maxHealth));
    enemy.healthBarFg.scale.x = Math.max(ENEMY_CONFIG.healthBarMinScaleX, ratio);
    enemy.healthBarFg.position.x = -(1 - ratio) * (enemy.healthBarFgWidth / 2);
    enemy.healthBarFg.material.color.setHSL(
      ENEMY_CONFIG.healthBarHueAtFullHealth * ratio,
      ENEMY_CONFIG.healthBarSaturation,
      ENEMY_CONFIG.healthBarLightness
    );
  }

  function createDissolveMaterial(sourceMaterial) {
    const baseColor = sourceMaterial && sourceMaterial.color
      ? sourceMaterial.color.clone()
      : new THREE.Color(0xffffff);
    const emissiveColor = sourceMaterial && sourceMaterial.emissive
      ? sourceMaterial.emissive.clone()
      : new THREE.Color(0x000000);
    const opacity = sourceMaterial && sourceMaterial.opacity !== undefined
      ? sourceMaterial.opacity
      : 1;

    const uniforms = {
      uDissolve: { value: 0 },
      uNoiseScale: { value: DISSOLVE_NOISE_SCALE },
      uEdgeWidth: { value: DISSOLVE_EDGE_WIDTH },
      uBaseColor: { value: baseColor },
      uEmissiveColor: { value: emissiveColor },
      uEdgeColor: { value: new THREE.Color(ENEMY_CONFIG.dissolveEdgeColor) },
      uOpacity: { value: opacity },
    };

    const material = new THREE.ShaderMaterial({
      uniforms,
      transparent: true,
      depthWrite: false,
      depthTest: sourceMaterial ? sourceMaterial.depthTest : true,
      side: sourceMaterial ? sourceMaterial.side : THREE.FrontSide,
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPos = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform float uDissolve;
        uniform float uNoiseScale;
        uniform float uEdgeWidth;
        uniform vec3 uBaseColor;
        uniform vec3 uEmissiveColor;
        uniform vec3 uEdgeColor;
        uniform float uOpacity;
        varying vec3 vWorldPos;

        float hash31(vec3 p) {
          p = fract(p * 0.1031);
          p += dot(p, p.yzx + 33.33);
          return fract((p.x + p.y) * p.z);
        }

        void main() {
          float noise = hash31(floor(vWorldPos * uNoiseScale));
          if (noise < uDissolve) {
            discard;
          }

          float edgeMask = smoothstep(uDissolve, uDissolve + uEdgeWidth, noise);
          vec3 base = uBaseColor + (uEmissiveColor * ${ENEMY_CONFIG.dissolveEmissiveMix.toFixed(3)});
          vec3 finalColor = mix(uEdgeColor, base, edgeMask);
          float alpha = max(0.0, (1.0 - uDissolve) * uOpacity) * edgeMask;
          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
    });
    material.toneMapped = false;
    return { material, dissolveUniform: uniforms.uDissolve };
  }

  function resetHitPulse(enemy) {
    if (!enemy.bodyMaterial || !enemy.visualRoot) {
      return;
    }
    enemy.bodyMaterial.emissiveIntensity = enemy.baseEmissiveIntensity;
    enemy.bodyMaterial.color.copy(enemy.baseBodyColor);
    enemy.visualRoot.scale.set(1, 1, 1);
    enemy.hitPulseTimer = 0;
    enemy.hitPulseClock = 0;
  }

  function triggerHitPulse(enemy) {
    if (!enemy.bodyMaterial) {
      return;
    }
    enemy.hitPulseTimer = Math.min(
      HIT_PULSE_DURATION,
      enemy.hitPulseTimer + (HIT_PULSE_DURATION * HIT_PULSE_STACK_ADD)
    );
  }

  function updateHitPulse(enemy, deltaSeconds) {
    if (!enemy.bodyMaterial || !enemy.visualRoot || enemy.hitPulseTimer <= 0) {
      return;
    }

    enemy.hitPulseTimer = Math.max(0, enemy.hitPulseTimer - deltaSeconds);
    enemy.hitPulseClock += deltaSeconds;

    const t = Math.max(0, enemy.hitPulseTimer / HIT_PULSE_DURATION);
    const envelope = Math.pow(t, HIT_PULSE_EXPONENT);
    const oscillation = 0.65 + (0.35 * Math.sin(enemy.hitPulseClock * HIT_PULSE_FREQUENCY));
    const pulse = envelope * oscillation;

    enemy.bodyMaterial.emissiveIntensity = enemy.baseEmissiveIntensity + (pulse * HIT_PULSE_EMISSIVE_BOOST);
    enemy.bodyMaterial.color.copy(enemy.baseBodyColor);

    const scaleXZ = 1 + (pulse * HIT_PULSE_SCALE_BOOST);
    const scaleY = 1 + (pulse * HIT_PULSE_SCALE_BOOST * 0.55);
    enemy.visualRoot.scale.set(scaleXZ, scaleY, scaleXZ);

    if (enemy.hitPulseTimer <= 0) {
      resetHitPulse(enemy);
    }
  }

  function startEnemyDissolve(enemy) {
    if (enemy.dying) return;

    enemy.alive = false;
    enemy.dying = true;
    enemy.deathTimer = 0;
    enemy.dissolveUniforms.length = 0;
    enemy.dissolveMaterials.length = 0;
    if (enemy.healthBarRoot) {
      enemy.healthBarRoot.visible = false;
    }
    resetHitPulse(enemy);

    if (!enemy.visualRoot) return;

    enemy.visualRoot.traverse((child) => {
      if (!child.isMesh || !child.material) {
        return;
      }
      const hadArrayMaterial = Array.isArray(child.material);
      const sourceMaterials = hadArrayMaterial ? child.material : [child.material];
      const dissolveMaterials = sourceMaterials.map((sourceMaterial) => {
        const { material, dissolveUniform } = createDissolveMaterial(sourceMaterial);
        enemy.dissolveMaterials.push(material);
        enemy.dissolveUniforms.push(dissolveUniform);
        return material;
      });
      child.material = hadArrayMaterial ? dissolveMaterials : dissolveMaterials[0];
    });
  }

  function applyDamage(enemy, amount) {
    if (!enemy.alive || enemy.dying) return;
    enemy.health = Math.max(0, enemy.health - amount);
    triggerHitPulse(enemy);
    updateHealthBar(enemy);
    if (enemy.health <= 0) {
      if (onEnemyDefeated) {
        const configuredReward = Number(ENEMY_TYPES[enemy.type]?.cashReward);
        const cashReward = Number.isFinite(configuredReward)
          ? Math.max(0, Math.floor(configuredReward))
          : Math.max(1, Math.floor(enemy.maxHealth || 1));
        if (cashReward > 0) {
          onEnemyDefeated(cashReward, enemy.type);
        }
      }
      startEnemyDissolve(enemy);
    }
  }

  function findActiveEnemyByMesh(enemyMesh) {
    if (!enemyMesh) {
      return null;
    }

    for (const enemy of activeEnemies) {
      if (enemy.mesh === enemyMesh) {
        return enemy;
      }
    }
    return null;
  }

  function isEnemyMeshSlowed(enemyMesh) {
    const enemy = findActiveEnemyByMesh(enemyMesh);
    if (!enemy || !enemy.alive || enemy.dying || enemy.portalClippingActive) {
      return false;
    }
    return (enemy.tempSlowRemaining ?? 0) > 0;
  }

  function applyTemporarySlowToEnemyMesh(enemyMesh, multiplier, duration) {
    const enemy = findActiveEnemyByMesh(enemyMesh);
    if (!enemy || !enemy.alive || enemy.dying || enemy.portalClippingActive) {
      return false;
    }

    const safeMultiplier = THREE.MathUtils.clamp(Number(multiplier), 0, 1);
    const safeDuration = Math.max(0, Number(duration) || 0);
    if (!Number.isFinite(safeMultiplier) || safeDuration <= 0) {
      return false;
    }

    enemy.tempSlowMultiplier = Math.min(enemy.tempSlowMultiplier ?? 1, safeMultiplier);
    enemy.tempSlowRemaining = Math.max(enemy.tempSlowRemaining ?? 0, safeDuration);
    return true;
  }

  function sphereIntersectsAabb(center, radius, minPoint, maxPoint) {
    const clampedX = THREE.MathUtils.clamp(center.x, minPoint.x, maxPoint.x);
    const clampedY = THREE.MathUtils.clamp(center.y, minPoint.y, maxPoint.y);
    const clampedZ = THREE.MathUtils.clamp(center.z, minPoint.z, maxPoint.z);
    const dx = center.x - clampedX;
    const dy = center.y - clampedY;
    const dz = center.z - clampedZ;
    return (dx * dx) + (dy * dy) + (dz * dz) <= (radius * radius);
  }

  function applyTemporarySlowInAabb(center, halfExtentVec3, multiplier, duration) {
    if (!center || !halfExtentVec3) {
      return 0;
    }

    const halfX = Math.max(0, Number(halfExtentVec3.x) || 0);
    const halfY = Math.max(0, Number(halfExtentVec3.y) || 0);
    const halfZ = Math.max(0, Number(halfExtentVec3.z) || 0);
    if (halfX <= 0 || halfY <= 0 || halfZ <= 0) {
      return 0;
    }

    const minPoint = new THREE.Vector3(center.x - halfX, center.y - halfY, center.z - halfZ);
    const maxPoint = new THREE.Vector3(center.x + halfX, center.y + halfY, center.z + halfZ);
    let appliedCount = 0;

    for (const enemy of activeEnemies) {
      if (!enemy.alive || enemy.dying || enemy.portalClippingActive) {
        continue;
      }
      if (!sphereIntersectsAabb(enemy.mesh.position, enemy.radius, minPoint, maxPoint)) {
        continue;
      }
      if (applyTemporarySlowToEnemyMesh(enemy.mesh, multiplier, duration)) {
        appliedCount += 1;
      }
    }

    return appliedCount;
  }

  function update(deltaSeconds, camera) {
    // Spawn new enemies
    if (spawnEventCursor < scheduledSpawns.length) {
      waveElapsedTime += deltaSeconds;
      while (
        spawnEventCursor < scheduledSpawns.length &&
        scheduledSpawns[spawnEventCursor].time <= waveElapsedTime
      ) {
        const spawnEvent = scheduledSpawns[spawnEventCursor];
        activeEnemies.push(createEnemyMesh(spawnEvent.type));
        spawnEventCursor += 1;
      }
    }

    // Update existing enemies
    for (let i = activeEnemies.length - 1; i >= 0; i--) {
      const enemy = activeEnemies[i];

      if (!enemy.alive && !enemy.dying) {
        activeEnemies.splice(i, 1);
        continue;
      }

      if (enemy.dying) {
        enemy.deathTimer += deltaSeconds;
        const dissolveValue = Math.min(1, enemy.deathTimer / enemy.deathDuration);
        for (const dissolveUniform of enemy.dissolveUniforms) {
          dissolveUniform.value = dissolveValue;
        }
        if (enemy.visualRoot) {
          enemy.visualRoot.position.y -= deltaSeconds * ENEMY_CONFIG.dissolveSinkSpeed;
          enemy.visualRoot.rotation.x += deltaSeconds * ENEMY_CONFIG.dissolveRollSpeed;
        }

        if (dissolveValue >= 1) {
          scene.remove(enemy.mesh);
          for (const dissolveMaterial of enemy.dissolveMaterials) {
            dissolveMaterial.dispose();
          }
          activeEnemies.splice(i, 1);
        }
        continue;
      }

      // Move along path
      let activeSlowMultiplier = 1;
      const slowRemaining = Math.max(0, enemy.tempSlowRemaining ?? 0);
      if (slowRemaining > 0) {
        enemy.tempSlowRemaining = Math.max(0, slowRemaining - deltaSeconds);
        activeSlowMultiplier = THREE.MathUtils.clamp(enemy.tempSlowMultiplier ?? 1, 0, 1);
        if (enemy.tempSlowRemaining <= 0) {
          enemy.tempSlowMultiplier = 1;
          activeSlowMultiplier = 1;
        }
      } else {
        enemy.tempSlowMultiplier = 1;
        enemy.tempSlowRemaining = 0;
      }

      let remaining = enemy.speed * enemySpeedMultiplier * activeSlowMultiplier * deltaSeconds;
      while (remaining > 0 && enemy.alive) {
        const start = travelWaypoints[enemy.segmentIndex];
        const end = travelWaypoints[enemy.segmentIndex + 1];
        const segmentLength = start.distanceTo(end);
        const segmentRemaining = segmentLength - enemy.segmentProgress;

        if (remaining < segmentRemaining) {
          enemy.segmentProgress += remaining;
          remaining = 0;
        } else {
          remaining -= segmentRemaining;
          enemy.segmentIndex += 1;
          enemy.segmentProgress = 0;

          if (enemy.segmentIndex >= travelWaypoints.length - 1) {
            // Reached end, maybe damage core later, for now just kill it
            enemy.alive = false;
            scene.remove(enemy.mesh);
            break;
          }
        }

        if (enemy.alive) {
          const t = segmentLength === 0 ? 0 : enemy.segmentProgress / segmentLength;
          enemy.mesh.position.lerpVectors(start, end, t);

          const dx = end.x - enemy.mesh.position.x;
          const dz = end.z - enemy.mesh.position.z;
          if ((dx * dx + dz * dz) > ENEMY_CONFIG.lookAtEpsilon) {
            const lookTarget = end.clone();
            lookTarget.y = enemy.mesh.position.y;
            enemy.mesh.lookAt(lookTarget);
          }
        }
      }

      updateHitPulse(enemy, deltaSeconds);

      if (enemy.alive && enemy.portalClippingActive && enemy.portalPlane) {
        const portalDistance = enemy.portalPlane.distanceToPoint(enemy.mesh.position);
        if (portalDistance > enemy.radius * ENEMY_CONFIG.portalRevealRadiusFactor) {
          enemy.portalClippingActive = false;
          applyVisualClipping(enemy.visualRoot, null);
          if (enemy.healthBarRoot && !enemy.dying) {
            enemy.healthBarRoot.visible = true;
          }
        } else if (enemy.healthBarRoot) {
          enemy.healthBarRoot.visible = false;
        }
      }

      if (enemy.alive && camera && enemy.healthBarRoot) {
        enemy.healthBarRoot.lookAt(camera.position);
      }
    }
  }

  function applyDamageAtPoint(point, hitRadius, damage) {
    let hitAny = false;
    for (const enemy of activeEnemies) {
      if (!enemy.alive) continue;
      if (enemy.portalClippingActive) continue;
      const maxHitDistance = enemy.radius + hitRadius;
      if (enemy.mesh.position.distanceToSquared(point) <= maxHitDistance * maxHitDistance) {
        applyDamage(enemy, damage);
        hitAny = true;
      }
    }
    return hitAny;
  }

  function getDamageableEnemies() {
    return activeEnemies
      .filter((enemy) => enemy.alive && !enemy.dying && !enemy.portalClippingActive)
      .map((enemy) => enemy.mesh);
  }

  function applyDamageToEnemyMesh(enemyMesh, damage) {
    if (!enemyMesh || typeof damage !== "number" || damage <= 0) {
      return false;
    }

    for (const enemy of activeEnemies) {
      if (enemy.mesh !== enemyMesh) {
        continue;
      }
      if (!enemy.alive || enemy.dying || enemy.portalClippingActive) {
        return false;
      }

      applyDamage(enemy, damage);
      return true;
    }

    return false;
  }

  function getTargetInRange(origin, range) {
    let closest = null;
    let closestDistSq = range * range;

    for (const enemy of activeEnemies) {
      if (!enemy.alive) continue;
      if (enemy.portalClippingActive) continue;
      const distSq = origin.distanceToSquared(enemy.mesh.position);
      if (distSq <= closestDistSq) {
        closestDistSq = distSq;
        closest = enemy;
      }
    }

    if (closest) {
      return {
        mesh: closest.mesh,
        position: closest.mesh.position,
        distance: Math.sqrt(closestDistSq),
        health: closest.health,
        maxHealth: closest.maxHealth,
      };
    }
    return null;
  }

  function getEnemies() {
    return activeEnemies.map(e => e.mesh);
  }

  return {
    update,
    getEnemies,
    getDamageableEnemies,
    getTargetInRange,
    isEnemyMeshSlowed,
    applyTemporarySlowToEnemyMesh,
    applyTemporarySlowInAabb,
    applyDamageAtPoint,
    applyDamageToEnemyMesh,
    startWave,
    isWaveClear,
    upgradeSlowEnemies,
    forceSpawnEnemy: (type, spawnPos) => {
      const enemy = createEnemyMesh(normalizeEnemyType(type));
      enemy.mesh.position.copy(spawnPos || travelWaypoints[0]);
      activeEnemies.push(enemy);
    }
  };
}
