import * as THREE from "three";
import { GAME_CONFIG } from "./config.js";

const ENEMY_CONFIG = GAME_CONFIG.enemies;
const BASE_SPEED = ENEMY_CONFIG.baseSpeed;
const DISSOLVE_DEATH_DURATION = ENEMY_CONFIG.dissolveDuration;
const DISSOLVE_EDGE_WIDTH = ENEMY_CONFIG.dissolveEdgeWidth;
const DISSOLVE_NOISE_SCALE = ENEMY_CONFIG.dissolveNoiseScale;
const ENEMY_TYPES = ENEMY_CONFIG.types;

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
  let enemiesToSpawn = [];
  let spawnTimer = 0;
  let enemySpeedMultiplier = 1;

  function upgradeSlowEnemies() {
    enemySpeedMultiplier *= ENEMY_CONFIG.slowUpgradeMultiplier;
  }

  function startWave(counts) {
    enemiesToSpawn = [];
    for (let type in counts) {
      for (let i = 0; i < counts[type]; i++) {
        enemiesToSpawn.push(type);
      }
    }
    // Shuffle slightly or keep in order. For now, order is fine or interleave them.
    spawnTimer = ENEMY_CONFIG.waveStartSpawnDelay;
  }

  function isWaveClear() {
    return activeEnemies.length === 0 && enemiesToSpawn.length === 0;
  }

  function createEnemyMesh(type) {
    const enemyType = ENEMY_TYPES[type] ?? ENEMY_TYPES.basic;

    const enemyMesh = new THREE.Group();
    const visualRoot = new THREE.Group();
    enemyMesh.add(visualRoot);

    const bodyMesh = new THREE.Mesh(
      new THREE.BoxGeometry(enemyType.size, enemyType.size, enemyType.size),
      new THREE.MeshStandardMaterial({
        color: enemyType.color,
        emissive: enemyType.emissive,
        emissiveIntensity: ENEMY_CONFIG.bodyEmissiveIntensity,
        roughness: ENEMY_CONFIG.bodyRoughness,
        metalness: ENEMY_CONFIG.bodyMetalness,
      })
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

    return {
      mesh: enemyMesh,
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
      type
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
    updateHealthBar(enemy);
    if (enemy.health <= 0) {
      startEnemyDissolve(enemy);
    }
  }

  function update(deltaSeconds, camera) {
    // Spawn new enemies
    if (enemiesToSpawn.length > 0) {
      spawnTimer -= deltaSeconds;
      if (spawnTimer <= 0) {
        const type = enemiesToSpawn.shift();
        activeEnemies.push(createEnemyMesh(type));
        spawnTimer = ENEMY_CONFIG.spawnInterval; // Delay between spawns
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
      let remaining = enemy.speed * enemySpeedMultiplier * deltaSeconds;
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
    getTargetInRange,
    applyDamageAtPoint,
    startWave,
    isWaveClear,
    upgradeSlowEnemies,
    forceSpawnEnemy: (type, spawnPos) => {
      const enemy = createEnemyMesh(type);
      enemy.mesh.position.copy(spawnPos || travelWaypoints[0]);
      activeEnemies.push(enemy);
    }
  };
}
