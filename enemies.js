import * as THREE from "https://esm.sh/three@0.161.0";
import { getModel } from "./models.js";

const ENEMY_RADIUS = 0.9;
const FAST_ENEMY_RADIUS = 0.6;
const BASE_SPEED = 2.5;
const ALIEN_MODEL_GROUND_OFFSET = -0.36;
const ALIEN_SWAY_AMPLITUDE = 0.34;
const ALIEN_SWAY_SPEED = 9.5;
const ALIEN_SWAY_ROLL = 0.2;
const ALIEN_BOB_HEIGHT = 0.1;
const DISSOLVE_DEATH_DURATION = 0.65;
const DISSOLVE_EDGE_WIDTH = 0.16;
const DISSOLVE_NOISE_SCALE = 5.4;
const ALIEN_MODEL_SCALE = 3.0;
const FAST_CRAFT_MODEL_SCALE = ALIEN_MODEL_SCALE * 0.6;

export function createEnemySystem(scene, pathWaypoints) {
  if (!Array.isArray(pathWaypoints) || pathWaypoints.length < 2) {
    throw new Error("Enemy system requires at least two path waypoints.");
  }

  const activeEnemies = [];
  let enemiesToSpawn = [];
  let spawnTimer = 0;
  let enemySpeedMultiplier = 1;

  function upgradeSlowEnemies() {
    enemySpeedMultiplier *= 0.8;
  }

  function startWave(counts) {
    enemiesToSpawn = [];
    for (let type in counts) {
      for (let i = 0; i < counts[type]; i++) {
        enemiesToSpawn.push(type);
      }
    }
    // Shuffle slightly or keep in order. For now, order is fine or interleave them.
    spawnTimer = 1.0;
  }

  function isWaveClear() {
    return activeEnemies.length === 0 && enemiesToSpawn.length === 0;
  }

  function createEnemyMesh(type) {
    const isFast = type === "fast";

    const enemyMesh = new THREE.Group();
    const visualRoot = new THREE.Group();
    enemyMesh.add(visualRoot);

    const model = getModel(isFast ? "craft_speederA" : "alien");
    let animationMixer = null;
    let alienWalkBob = null;

    if (model) {
      const modelScale = isFast ? FAST_CRAFT_MODEL_SCALE : ALIEN_MODEL_SCALE;
      model.scale.set(modelScale, modelScale, modelScale);
      // models usually face +X or -Z. Let's adjust to face the velocity direction correctly.
      // Usually +Z is implicitly forward when using lookAt.
      model.rotation.y = Math.PI; // often needed for Kenney

      const animationClips = Array.isArray(model.userData.animationClips)
        ? model.userData.animationClips
        : [];

      if (!isFast && animationClips.length > 0) {
        animationMixer = new THREE.AnimationMixer(model);
        animationMixer.clipAction(animationClips[0]).play();
      } else if (!isFast) {
        model.position.y = ALIEN_MODEL_GROUND_OFFSET;
        alienWalkBob = {
          phase: Math.random() * Math.PI * 2,
          amplitude: ALIEN_SWAY_AMPLITUDE,
          speed: ALIEN_SWAY_SPEED,
          rollAmplitude: ALIEN_SWAY_ROLL,
          bobHeight: ALIEN_BOB_HEIGHT,
        };
      }

      visualRoot.add(model);
    } else {
      // Fallback
      const bodySize = isFast ? 1.0 : 1.6;
      const bodyColor = isFast ? 0xc98282 : 0x82a5c9;
      const bodyMesh = new THREE.Mesh(
        new THREE.BoxGeometry(bodySize, bodySize, bodySize),
        new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.8, metalness: 0.2 })
      );

      const eyeW = isFast ? 0.6 : 1.0;
      const eyeH = isFast ? 0.2 : 0.3;
      const eyeColor = isFast ? 0xff4d4d : 0x6cd5ff;
      const eyeMesh = new THREE.Mesh(
        new THREE.BoxGeometry(eyeW, eyeH, 0.2),
        new THREE.MeshStandardMaterial({ color: eyeColor, emissive: eyeColor, emissiveIntensity: 2 })
      );
      eyeMesh.position.set(0, isFast ? 0.1 : 0.2, isFast ? 0.5 : 0.8);

      visualRoot.add(bodyMesh);
      visualRoot.add(eyeMesh);

      if (!isFast) {
        alienWalkBob = {
          phase: Math.random() * Math.PI * 2,
          amplitude: ALIEN_SWAY_AMPLITUDE,
          speed: ALIEN_SWAY_SPEED,
          rollAmplitude: ALIEN_SWAY_ROLL,
          bobHeight: ALIEN_BOB_HEIGHT,
        };
      }
    }

    const healthBarRoot = new THREE.Group();
    const healthBarBg = new THREE.Mesh(
      new THREE.PlaneGeometry(isFast ? 1.5 : 2.5, 0.28),
      new THREE.MeshBasicMaterial({ color: 0x1f2835, transparent: true, opacity: 0.9, depthTest: false })
    );
    const healthBarFg = new THREE.Mesh(
      new THREE.PlaneGeometry(isFast ? 1.3 : 2.3, 0.16),
      new THREE.MeshBasicMaterial({ color: 0x6bf4ad, transparent: true, depthTest: false })
    );
    healthBarBg.renderOrder = 20;
    healthBarFg.renderOrder = 21;
    healthBarFg.position.z = 0.01;
    healthBarRoot.add(healthBarBg);
    healthBarRoot.add(healthBarFg);
    healthBarRoot.position.set(0, isFast ? 1.2 : 1.8, 0);
    enemyMesh.add(healthBarRoot);

    scene.add(enemyMesh);
    enemyMesh.position.copy(pathWaypoints[0]);

    return {
      mesh: enemyMesh,
      healthBarRoot,
      healthBarFg,
      healthBarBgWidth: isFast ? 1.5 : 2.5,
      healthBarFgWidth: isFast ? 1.3 : 2.3,
      health: isFast ? 60 : 100,
      maxHealth: isFast ? 60 : 100,
      speed: isFast ? BASE_SPEED * 1.8 : BASE_SPEED,
      radius: isFast ? FAST_ENEMY_RADIUS : ENEMY_RADIUS,
      segmentIndex: 0,
      segmentProgress: 0,
      animationMixer,
      visualRoot,
      alienWalkBob,
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
    enemy.healthBarFg.scale.x = Math.max(0.001, ratio);
    enemy.healthBarFg.position.x = -(1 - ratio) * (enemy.healthBarFgWidth / 2);
    enemy.healthBarFg.material.color.setHSL(0.28 * ratio, 0.85, 0.55);
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
      uEdgeColor: { value: new THREE.Color(0xff7f2a) },
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
          vec3 base = uBaseColor + (uEmissiveColor * 0.6);
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
        spawnTimer = 1.2; // Delay between spawns
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
          enemy.visualRoot.position.y -= deltaSeconds * 0.35;
          enemy.visualRoot.rotation.x += deltaSeconds * 0.9;
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

      if (enemy.animationMixer) {
        enemy.animationMixer.update(deltaSeconds);
      }
      if (enemy.alienWalkBob && enemy.visualRoot) {
        enemy.alienWalkBob.phase += deltaSeconds * enemy.alienWalkBob.speed;
        const sway = Math.sin(enemy.alienWalkBob.phase);
        const lift = Math.max(0, Math.sin(enemy.alienWalkBob.phase * 2)) * enemy.alienWalkBob.bobHeight;
        enemy.visualRoot.position.set(sway * enemy.alienWalkBob.amplitude, lift, 0);
        enemy.visualRoot.rotation.z = sway * enemy.alienWalkBob.rollAmplitude;
      }

      // Move along path
      let remaining = enemy.speed * enemySpeedMultiplier * deltaSeconds;
      while (remaining > 0 && enemy.alive) {
        const start = pathWaypoints[enemy.segmentIndex];
        const end = pathWaypoints[enemy.segmentIndex + 1];
        const segmentLength = start.distanceTo(end);
        const segmentRemaining = segmentLength - enemy.segmentProgress;

        if (remaining < segmentRemaining) {
          enemy.segmentProgress += remaining;
          remaining = 0;
        } else {
          remaining -= segmentRemaining;
          enemy.segmentIndex += 1;
          enemy.segmentProgress = 0;

          if (enemy.segmentIndex >= pathWaypoints.length - 1) {
            // Reached end, maybe damage core later, for now just kill it
            enemy.alive = false;
            scene.remove(enemy.mesh);
            break;
          }
        }

        if (enemy.alive) {
          const t = segmentLength === 0 ? 0 : enemy.segmentProgress / segmentLength;
          enemy.mesh.position.lerpVectors(start, end, t);

          const lookTarget = end.clone();
          lookTarget.y = enemy.mesh.position.y;
          enemy.mesh.lookAt(lookTarget);
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
    isWaveClear,
    upgradeSlowEnemies,
    forceSpawnEnemy: (type, spawnPos) => {
      const enemy = createEnemyMesh(type);
      enemy.mesh.position.copy(spawnPos || new THREE.Vector3(0, 0, 0));
      activeEnemies.push(enemy);
    }
  };
}
