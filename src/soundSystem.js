import * as THREE from "three";

const DEFAULT_MASTER_GAIN = 0.18;
const DEFAULT_MAX_VOICES = 28;
const NOISE_BUFFER_DURATION_SECONDS = 2;
const CLEANUP_PADDING_SECONDS = 0.08;
const MIN_GAIN = 0.0001;
const DEFAULT_LOW_PASS_HZ = 20000;
const MIN_LOW_PASS_HZ = 1700;
const DEFAULT_DISTANCE_FALLOFF = 0.016;
const DEFAULT_PAN_DISTANCE = 12;
const EVENT_RATE_LIMIT_MS = {
  machineGun: 32,
  towerGunFire: 26,
  towerAoePulse: 95,
  towerSlowProc: 90,
  towerLaserSniper: 75,
  towerMortarLaunch: 85,
  towerMortarImpact: 72,
  towerTeslaChain: 65,
  towerSpikesProc: 95,
  towerPlasmaBurst: 120,
  playerJump: 60,
  playerLand: 45,
  playerJetpackStart: 80,
  playerJetpackStop: 80,
  enemySpawn: 42,
  enemyDeath: 24,
  enemyDeathExplosion: 32,
  moneyDropSpawn: 85,
  moneyPickup: 55,
  moneyMerge: 36,
  towerPlaceInvalid: 70,
  unaffordable: 80,
  pause: 60,
  speedToggle: 60,
  buildPhaseStart: 160,
  waveStart: 160,
  techMenuOpen: 110,
  techConfirm: 70,
  weaponConfirm: 70,
};
const EVENT_MAX_VOICES = {
  machineGun: 4,
  towerGunFire: 5,
  towerAoePulse: 3,
  towerSlowProc: 3,
  towerLaserSniper: 3,
  towerMortarLaunch: 3,
  towerMortarImpact: 4,
  towerTeslaChain: 3,
  towerSpikesProc: 2,
  towerPlasmaBurst: 2,
  playerJump: 1,
  playerLand: 2,
  playerJetpackStart: 1,
  playerJetpackStop: 1,
  sniper: 2,
  bazooka: 2,
  towerPlace: 4,
  towerPlaceInvalid: 2,
  unaffordable: 2,
  towerSell: 3,
  moneyDropSpawn: 2,
  moneyMerge: 3,
  moneyPickup: 3,
  buildPhaseStart: 1,
  waveStart: 1,
  techMenuOpen: 1,
  techConfirm: 2,
  weaponConfirm: 1,
  pause: 1,
  speedToggle: 1,
  enemySpawn: 4,
  enemyDeath: 4,
  enemyDeathExplosion: 3,
};
const EVENT_PRIORITY = {
  machineGun: 0,
  towerGunFire: 0,
  moneyDropSpawn: 0,
  enemySpawn: 0,
  enemyDeath: 0,
  towerAoePulse: 1,
  towerSlowProc: 1,
  towerSpikesProc: 1,
  towerPlasmaBurst: 1,
  towerMortarLaunch: 1,
  towerPlace: 1,
  towerPlaceInvalid: 1,
  unaffordable: 1,
  towerSell: 1,
  moneyMerge: 1,
  moneyPickup: 1,
  towerLaserSniper: 2,
  towerMortarImpact: 2,
  towerTeslaChain: 2,
  playerJump: 2,
  playerLand: 2,
  playerJetpackStart: 2,
  playerJetpackStop: 2,
  pause: 2,
  speedToggle: 2,
  buildPhaseStart: 2,
  waveStart: 2,
  techMenuOpen: 2,
  techConfirm: 2,
  weaponConfirm: 2,
  enemyDeathExplosion: 2,
  bazooka: 2,
  sniper: 2,
};

const tempSoundWorldPosition = new THREE.Vector3();
const tempSoundCameraPosition = new THREE.Vector3();
const tempSoundCameraRight = new THREE.Vector3();

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function nowMs() {
  return typeof globalThis.performance?.now === "function"
    ? globalThis.performance.now()
    : Date.now();
}

function finiteOr(value, fallback) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function randomBetween(min, max) {
  return min + (Math.random() * (max - min));
}

function safeSetValue(param, value, time) {
  if (!param) {
    return;
  }
  param.cancelScheduledValues(time);
  param.setValueAtTime(value, time);
}

function setAttackReleaseEnvelope(param, startTime, {
  attack = 0.004,
  peak = 1,
  hold = 0,
  release = 0.08,
} = {}) {
  if (!param) {
    return startTime;
  }
  const safeAttack = Math.max(0.001, attack);
  const safeRelease = Math.max(0.005, release);
  const peakGain = Math.max(MIN_GAIN, peak);
  safeSetValue(param, MIN_GAIN, Math.max(0, startTime - 0.001));
  param.linearRampToValueAtTime(peakGain, startTime + safeAttack);
  const releaseStart = startTime + safeAttack + Math.max(0, hold);
  param.exponentialRampToValueAtTime(MIN_GAIN, releaseStart + safeRelease);
  return releaseStart + safeRelease;
}

function toWorldPosition(source, outVector) {
  if (!source || !outVector) {
    return false;
  }
  const x = Number(source.x);
  const y = Number(source.y);
  const z = Number(source.z);
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
    return false;
  }
  outVector.set(x, y, z);
  return true;
}

function hashString(value) {
  const text = String(value ?? "");
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) - hash) + text.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function createSoundSystem({
  getAudioContext = null,
  camera = null,
  masterGain = DEFAULT_MASTER_GAIN,
  maxMasterGain = null,
  maxVoices = DEFAULT_MAX_VOICES,
} = {}) {
  const initialMasterGain = finiteOr(masterGain, DEFAULT_MASTER_GAIN);
  const resolvedMaxMasterGain = Math.max(
    Math.max(MIN_GAIN, initialMasterGain),
    finiteOr(maxMasterGain, Math.max(1, initialMasterGain))
  );
  let masterGainValue = clamp(initialMasterGain, 0, resolvedMaxMasterGain);
  let graphAudioContext = null;
  let effectBus = null;
  let compressorNode = null;
  let masterGainNode = null;
  let noiseBuffer = null;
  const activeVoices = new Set();
  const activeLoops = new Map();
  const voiceCountByEvent = new Map();
  const lastPlayAtMsByEvent = new Map();

  function ensureAudioGraph(audioContext) {
    if (!audioContext) {
      return false;
    }
    if (graphAudioContext === audioContext && effectBus && compressorNode && masterGainNode) {
      return true;
    }
    graphAudioContext = audioContext;
    effectBus = audioContext.createGain();
    effectBus.gain.setValueAtTime(1, audioContext.currentTime);

    compressorNode = audioContext.createDynamicsCompressor();
    compressorNode.threshold.setValueAtTime(-18, audioContext.currentTime);
    compressorNode.knee.setValueAtTime(12, audioContext.currentTime);
    compressorNode.ratio.setValueAtTime(10, audioContext.currentTime);
    compressorNode.attack.setValueAtTime(0.003, audioContext.currentTime);
    compressorNode.release.setValueAtTime(0.14, audioContext.currentTime);

    masterGainNode = audioContext.createGain();
    masterGainNode.gain.setValueAtTime(masterGainValue, audioContext.currentTime);

    effectBus.connect(compressorNode);
    compressorNode.connect(masterGainNode);
    masterGainNode.connect(audioContext.destination);
    return true;
  }

  function ensureNoiseBuffer(audioContext) {
    if (!audioContext) {
      return null;
    }
    if (graphAudioContext === audioContext && noiseBuffer) {
      return noiseBuffer;
    }
    const frameCount = Math.max(1, Math.floor(audioContext.sampleRate * NOISE_BUFFER_DURATION_SECONDS));
    const buffer = audioContext.createBuffer(1, frameCount, audioContext.sampleRate);
    const channelData = buffer.getChannelData(0);
    for (let index = 0; index < channelData.length; index += 1) {
      channelData[index] = (Math.random() * 2) - 1;
    }
    noiseBuffer = buffer;
    return noiseBuffer;
  }

  function cleanupVoice(entry) {
    if (!entry || entry.cleaned) {
      return;
    }
    entry.cleaned = true;
    if (entry.timerId != null) {
      window.clearTimeout(entry.timerId);
      entry.timerId = null;
    }
    activeVoices.delete(entry);
    const activeCount = Math.max(0, (voiceCountByEvent.get(entry.eventName) || 1) - 1);
    if (activeCount > 0) {
      voiceCountByEvent.set(entry.eventName, activeCount);
    } else {
      voiceCountByEvent.delete(entry.eventName);
    }
    for (const node of entry.nodes) {
      try {
        node.disconnect?.();
      } catch {
        // Ignore disconnect races during cleanup.
      }
    }
  }

  function cleanupLoop(entry) {
    if (!entry || entry.cleaned) {
      return;
    }
    entry.cleaned = true;
    if (entry.timerId != null) {
      window.clearTimeout(entry.timerId);
      entry.timerId = null;
    }
    if (typeof entry.eventName === "string") {
      activeLoops.delete(entry.eventName);
    }
    if (Array.isArray(entry.sources)) {
      for (const source of entry.sources) {
        try {
          source.stop?.();
        } catch {
          // Ignore stop races during cleanup.
        }
      }
    }
    for (const node of entry.nodes) {
      try {
        node.disconnect?.();
      } catch {
        // Ignore disconnect races during cleanup.
      }
    }
  }

  function resolveSpatialOptions(position, volumeScale = 1) {
    const baseVolume = Math.max(0, finiteOr(volumeScale, 1));
    if (!camera || !toWorldPosition(position, tempSoundWorldPosition)) {
      return {
        gain: baseVolume,
        pan: 0,
        lowPassHz: DEFAULT_LOW_PASS_HZ,
      };
    }

    camera.getWorldPosition(tempSoundCameraPosition);
    tempSoundCameraRight.setFromMatrixColumn(camera.matrixWorld, 0).normalize();
    const distance = tempSoundCameraPosition.distanceTo(tempSoundWorldPosition);
    const normalizedDistance = clamp(distance / 28, 0, 1);
    const side = tempSoundWorldPosition.clone().sub(tempSoundCameraPosition).dot(tempSoundCameraRight);
    const pan = clamp(side / DEFAULT_PAN_DISTANCE, -0.95, 0.95);
    const attenuation = 1 / (1 + (distance * distance * DEFAULT_DISTANCE_FALLOFF));
    const lowPassHz = Math.round(
      THREE.MathUtils.lerp(DEFAULT_LOW_PASS_HZ, MIN_LOW_PASS_HZ, normalizedDistance)
    );
    return {
      gain: baseVolume * attenuation,
      pan,
      lowPassHz,
    };
  }

  function createVoice(eventName, options = {}) {
    const audioContext = typeof getAudioContext === "function"
      ? getAudioContext()
      : null;
    if (!audioContext || audioContext.state !== "running" || !ensureAudioGraph(audioContext)) {
      return null;
    }

    const eventCount = voiceCountByEvent.get(eventName) || 0;
    const eventMax = EVENT_MAX_VOICES[eventName] ?? 3;
    if (eventCount >= eventMax) {
      return null;
    }

    const eventPriority = EVENT_PRIORITY[eventName] ?? 0;
    if (activeVoices.size >= Math.max(4, Math.floor(maxVoices))) {
      let candidateVoice = null;
      let candidatePriority = Number.POSITIVE_INFINITY;
      for (const activeVoice of activeVoices) {
        const activePriority = EVENT_PRIORITY[activeVoice.eventName] ?? 0;
        if (
          activePriority < candidatePriority
          || (
            activePriority === candidatePriority
            && (!candidateVoice || (activeVoice.createdAtMs || 0) < (candidateVoice.createdAtMs || 0))
          )
        ) {
          candidateVoice = activeVoice;
          candidatePriority = activePriority;
        }
      }
      if (!candidateVoice || eventPriority <= candidatePriority) {
        return null;
      }
      cleanupVoice(candidateVoice);
    }

    const lastPlayAtMs = lastPlayAtMsByEvent.get(eventName) || -Infinity;
    const rateLimitMs = EVENT_RATE_LIMIT_MS[eventName] ?? 0;
    const currentNowMs = nowMs();
    if ((currentNowMs - lastPlayAtMs) < rateLimitMs) {
      return null;
    }
    lastPlayAtMsByEvent.set(eventName, currentNowMs);

    const spatial = resolveSpatialOptions(options.position, options.volume);
    if (spatial.gain <= 0.0125) {
      return null;
    }

    const voiceInput = audioContext.createGain();
    const voiceLowPass = audioContext.createBiquadFilter();
    voiceLowPass.type = "lowpass";
    voiceLowPass.frequency.setValueAtTime(
      clamp(finiteOr(options.lowPassHz, spatial.lowPassHz), MIN_LOW_PASS_HZ, DEFAULT_LOW_PASS_HZ),
      audioContext.currentTime
    );
    voiceLowPass.Q.setValueAtTime(0.0001, audioContext.currentTime);

    const voiceOutput = audioContext.createGain();
    voiceOutput.gain.setValueAtTime(Math.max(MIN_GAIN, spatial.gain), audioContext.currentTime);

    const entry = {
      eventName,
      cleaned: false,
      createdAtMs: currentNowMs,
      timerId: null,
      nodes: [voiceInput, voiceLowPass, voiceOutput],
    };

    voiceInput.connect(voiceLowPass);
    if (typeof audioContext.createStereoPanner === "function") {
      const stereoPanner = audioContext.createStereoPanner();
      stereoPanner.pan.setValueAtTime(spatial.pan, audioContext.currentTime);
      voiceLowPass.connect(stereoPanner);
      stereoPanner.connect(voiceOutput);
      entry.nodes.push(stereoPanner);
    } else {
      voiceLowPass.connect(voiceOutput);
    }
    voiceOutput.connect(effectBus);

    activeVoices.add(entry);
    voiceCountByEvent.set(eventName, eventCount + 1);

    return {
      audioContext,
      now: audioContext.currentTime,
      input: voiceInput,
      addNode(node) {
        if (node) {
          entry.nodes.push(node);
        }
        return node;
      },
      addSource(source, stopTime) {
        if (!source) {
          return source;
        }
        entry.nodes.push(source);
        if (typeof source.stop === "function" && Number.isFinite(stopTime)) {
          try {
            source.stop(stopTime);
          } catch {
            // Ignore stop races if the node is already scheduled or stopped.
          }
        }
        return source;
      },
      finish(durationSeconds, tailSeconds = CLEANUP_PADDING_SECONDS) {
        const safeDuration = Math.max(0.01, finiteOr(durationSeconds, 0.1));
        const safeTail = Math.max(0.02, finiteOr(tailSeconds, CLEANUP_PADDING_SECONDS));
        const fadeStartTime = audioContext.currentTime + safeDuration;
        const cleanupTime = fadeStartTime + safeTail;
        voiceOutput.gain.cancelScheduledValues(audioContext.currentTime);
        voiceOutput.gain.setValueAtTime(Math.max(MIN_GAIN, spatial.gain), audioContext.currentTime);
        voiceOutput.gain.exponentialRampToValueAtTime(MIN_GAIN, cleanupTime);
        const cleanupDelayMs = Math.max(25, Math.ceil((cleanupTime - audioContext.currentTime + 0.05) * 1000));
        entry.timerId = window.setTimeout(() => {
          cleanupVoice(entry);
        }, cleanupDelayMs);
      },
    };
  }

  function createLoop(eventName, options = {}) {
    if (typeof eventName !== "string" || eventName.length === 0) {
      return null;
    }
    const existing = activeLoops.get(eventName);
    if (existing && !existing.cleaned) {
      return null;
    }

    const audioContext = typeof getAudioContext === "function"
      ? getAudioContext()
      : null;
    if (!audioContext || audioContext.state !== "running" || !ensureAudioGraph(audioContext)) {
      return null;
    }

    const spatial = resolveSpatialOptions(options.position, options.volume);
    const loopInput = audioContext.createGain();
    const loopLowPass = audioContext.createBiquadFilter();
    loopLowPass.type = "lowpass";
    loopLowPass.frequency.setValueAtTime(
      clamp(finiteOr(options.lowPassHz, spatial.lowPassHz), MIN_LOW_PASS_HZ, DEFAULT_LOW_PASS_HZ),
      audioContext.currentTime
    );
    loopLowPass.Q.setValueAtTime(0.0001, audioContext.currentTime);

    const loopOutput = audioContext.createGain();
    loopOutput.gain.setValueAtTime(MIN_GAIN, audioContext.currentTime);

    const entry = {
      eventName,
      cleaned: false,
      timerId: null,
      nodes: [loopInput, loopLowPass, loopOutput],
      sources: [],
      audioContext,
      targetGain: Math.max(MIN_GAIN, spatial.gain),
    };

    loopInput.connect(loopLowPass);
    if (typeof audioContext.createStereoPanner === "function") {
      const stereoPanner = audioContext.createStereoPanner();
      stereoPanner.pan.setValueAtTime(spatial.pan, audioContext.currentTime);
      loopLowPass.connect(stereoPanner);
      stereoPanner.connect(loopOutput);
      entry.nodes.push(stereoPanner);
    } else {
      loopLowPass.connect(loopOutput);
    }
    loopOutput.connect(effectBus);
    activeLoops.set(eventName, entry);

    return {
      audioContext,
      now: audioContext.currentTime,
      input: loopInput,
      targetGain: entry.targetGain,
      addNode(node) {
        if (node) {
          entry.nodes.push(node);
        }
        return node;
      },
      addSource(source) {
        if (!source) {
          return source;
        }
        entry.nodes.push(source);
        entry.sources.push(source);
        return source;
      },
      fadeIn(durationSeconds = 0.06, peak = entry.targetGain) {
        const fadeDuration = Math.max(0.01, finiteOr(durationSeconds, 0.06));
        const fadeTarget = Math.max(MIN_GAIN, finiteOr(peak, entry.targetGain));
        loopOutput.gain.cancelScheduledValues(audioContext.currentTime);
        loopOutput.gain.setValueAtTime(Math.max(MIN_GAIN, loopOutput.gain.value || MIN_GAIN), audioContext.currentTime);
        loopOutput.gain.linearRampToValueAtTime(fadeTarget, audioContext.currentTime + fadeDuration);
      },
    };
  }

  function noiseBurst(voice, {
    offset = 0,
    duration = 0.06,
    attack = 0.0015,
    hold = 0,
    release = 0.05,
    peak = 0.22,
    lowPassHz = DEFAULT_LOW_PASS_HZ,
    highPassHz = 20,
    bandPassHz = null,
    q = 0.8,
    playbackRate = 1,
  } = {}) {
    if (!voice) {
      return 0;
    }
    const audioContext = voice.audioContext;
    const startTime = voice.now + Math.max(0, finiteOr(offset, 0));
    const noiseSource = voice.addSource(audioContext.createBufferSource(), startTime + duration + release + 0.02);
    noiseSource.buffer = ensureNoiseBuffer(audioContext);
    noiseSource.playbackRate.setValueAtTime(Math.max(0.2, finiteOr(playbackRate, 1)), startTime);

    const envelope = voice.addNode(audioContext.createGain());
    const highPass = voice.addNode(audioContext.createBiquadFilter());
    highPass.type = "highpass";
    highPass.frequency.setValueAtTime(Math.max(20, finiteOr(highPassHz, 20)), startTime);
    highPass.Q.setValueAtTime(Math.max(0.0001, finiteOr(q, 0.8)), startTime);

    let currentNode = highPass;
    if (Number.isFinite(Number(bandPassHz)) && Number(bandPassHz) > 0) {
      const bandPass = voice.addNode(audioContext.createBiquadFilter());
      bandPass.type = "bandpass";
      bandPass.frequency.setValueAtTime(Math.max(60, Number(bandPassHz)), startTime);
      bandPass.Q.setValueAtTime(Math.max(0.25, finiteOr(q, 0.8)), startTime);
      currentNode.connect(bandPass);
      currentNode = bandPass;
    }

    const lowPass = voice.addNode(audioContext.createBiquadFilter());
    lowPass.type = "lowpass";
    lowPass.frequency.setValueAtTime(clamp(finiteOr(lowPassHz, DEFAULT_LOW_PASS_HZ), 120, DEFAULT_LOW_PASS_HZ), startTime);
    lowPass.Q.setValueAtTime(0.0001, startTime);
    currentNode.connect(lowPass);

    noiseSource.connect(highPass);
    lowPass.connect(envelope);
    envelope.connect(voice.input);

    setAttackReleaseEnvelope(envelope.gain, startTime, {
      attack,
      peak,
      hold: Math.max(0, hold + Math.max(0, duration - attack)),
      release,
    });
    try {
      noiseSource.start(startTime);
    } catch {
      return 0;
    }
    return (startTime + duration + release) - voice.now;
  }

  function pitchSweep(voice, {
    offset = 0,
    fromHz = 220,
    toHz = 80,
    duration = 0.08,
    type = "triangle",
    peak = 0.2,
    attack = 0.002,
    hold = 0,
    release = 0.06,
    lowPassHz = DEFAULT_LOW_PASS_HZ,
    highPassHz = 20,
  } = {}) {
    if (!voice) {
      return 0;
    }
    const audioContext = voice.audioContext;
    const startTime = voice.now + Math.max(0, finiteOr(offset, 0));
    const endTime = startTime + Math.max(0.01, finiteOr(duration, 0.08));
    const oscillator = voice.addSource(audioContext.createOscillator(), endTime + release + 0.02);
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(20, finiteOr(fromHz, 220)), startTime);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, finiteOr(toHz, 80)), endTime);

    const highPass = voice.addNode(audioContext.createBiquadFilter());
    highPass.type = "highpass";
    highPass.frequency.setValueAtTime(Math.max(20, finiteOr(highPassHz, 20)), startTime);
    highPass.Q.setValueAtTime(0.0001, startTime);

    const lowPass = voice.addNode(audioContext.createBiquadFilter());
    lowPass.type = "lowpass";
    lowPass.frequency.setValueAtTime(clamp(finiteOr(lowPassHz, DEFAULT_LOW_PASS_HZ), 80, DEFAULT_LOW_PASS_HZ), startTime);
    lowPass.Q.setValueAtTime(0.0001, startTime);

    const envelope = voice.addNode(audioContext.createGain());
    oscillator.connect(highPass);
    highPass.connect(lowPass);
    lowPass.connect(envelope);
    envelope.connect(voice.input);

    setAttackReleaseEnvelope(envelope.gain, startTime, {
      attack,
      peak,
      hold,
      release,
    });
    try {
      oscillator.start(startTime);
    } catch {
      return 0;
    }
    return (endTime + release) - voice.now;
  }

  function fmPing(voice, {
    offset = 0,
    carrierHz = 320,
    modHz = 720,
    modDepth = 180,
    duration = 0.12,
    attack = 0.003,
    hold = 0,
    release = 0.08,
    peak = 0.18,
    type = "triangle",
    lowPassHz = DEFAULT_LOW_PASS_HZ,
    highPassHz = 40,
    q = 0.8,
    detune = 0,
  } = {}) {
    if (!voice) {
      return 0;
    }
    const audioContext = voice.audioContext;
    const startTime = voice.now + Math.max(0, finiteOr(offset, 0));
    const endTime = startTime + Math.max(0.01, finiteOr(duration, 0.12));
    const carrierOsc = voice.addSource(audioContext.createOscillator(), endTime + release + 0.03);
    const modOsc = voice.addSource(audioContext.createOscillator(), endTime + release + 0.03);
    const modGain = voice.addNode(audioContext.createGain());
    const highPass = voice.addNode(audioContext.createBiquadFilter());
    const lowPass = voice.addNode(audioContext.createBiquadFilter());
    const envelope = voice.addNode(audioContext.createGain());

    carrierOsc.type = type;
    carrierOsc.frequency.setValueAtTime(Math.max(40, finiteOr(carrierHz, 320)), startTime);
    carrierOsc.detune.setValueAtTime(finiteOr(detune, 0), startTime);
    modOsc.type = "sine";
    modOsc.frequency.setValueAtTime(Math.max(20, finiteOr(modHz, 720)), startTime);
    modGain.gain.setValueAtTime(Math.max(0, finiteOr(modDepth, 180)), startTime);
    modGain.gain.exponentialRampToValueAtTime(MIN_GAIN, endTime);

    highPass.type = "highpass";
    highPass.frequency.setValueAtTime(Math.max(20, finiteOr(highPassHz, 40)), startTime);
    highPass.Q.setValueAtTime(Math.max(0.0001, finiteOr(q, 0.8)), startTime);
    lowPass.type = "lowpass";
    lowPass.frequency.setValueAtTime(clamp(finiteOr(lowPassHz, DEFAULT_LOW_PASS_HZ), 120, DEFAULT_LOW_PASS_HZ), startTime);
    lowPass.Q.setValueAtTime(Math.max(0.0001, finiteOr(q, 0.8)), startTime);

    modOsc.connect(modGain);
    modGain.connect(carrierOsc.frequency);
    carrierOsc.connect(highPass);
    highPass.connect(lowPass);
    lowPass.connect(envelope);
    envelope.connect(voice.input);

    setAttackReleaseEnvelope(envelope.gain, startTime, {
      attack,
      peak,
      hold,
      release,
    });

    try {
      modOsc.start(startTime);
      carrierOsc.start(startTime);
    } catch {
      return 0;
    }
    return (endTime + release) - voice.now;
  }

  function reverseEnvelope(voice, {
    offset = 0,
    fromHz = 180,
    toHz = 760,
    duration = 0.09,
    peak = 0.16,
    highPassHz = 120,
    lowPassHz = 4200,
  } = {}) {
    if (!voice) {
      return 0;
    }
    const audioContext = voice.audioContext;
    const startTime = voice.now + Math.max(0, finiteOr(offset, 0));
    const endTime = startTime + Math.max(0.02, finiteOr(duration, 0.09));
    const oscillator = voice.addSource(audioContext.createOscillator(), endTime + 0.05);
    const bandPass = voice.addNode(audioContext.createBiquadFilter());
    const lowPass = voice.addNode(audioContext.createBiquadFilter());
    const envelope = voice.addNode(audioContext.createGain());

    oscillator.type = "sawtooth";
    oscillator.frequency.setValueAtTime(Math.max(30, finiteOr(fromHz, 180)), startTime);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(60, finiteOr(toHz, 760)), endTime);

    bandPass.type = "highpass";
    bandPass.frequency.setValueAtTime(Math.max(40, finiteOr(highPassHz, 120)), startTime);
    bandPass.Q.setValueAtTime(0.0001, startTime);
    lowPass.type = "lowpass";
    lowPass.frequency.setValueAtTime(clamp(finiteOr(lowPassHz, 4200), 200, DEFAULT_LOW_PASS_HZ), startTime);
    lowPass.Q.setValueAtTime(0.0001, startTime);

    oscillator.connect(bandPass);
    bandPass.connect(lowPass);
    lowPass.connect(envelope);
    envelope.connect(voice.input);

    safeSetValue(envelope.gain, MIN_GAIN, startTime);
    envelope.gain.linearRampToValueAtTime(MIN_GAIN, startTime + (duration * 0.35));
    envelope.gain.linearRampToValueAtTime(Math.max(MIN_GAIN, peak), endTime);
    envelope.gain.exponentialRampToValueAtTime(MIN_GAIN, endTime + 0.045);

    try {
      oscillator.start(startTime);
    } catch {
      return 0;
    }
    return (endTime + 0.045) - voice.now;
  }

  function filteredThunk(voice, {
    offset = 0,
    bodyHz = 110,
    snapHz = null,
    duration = 0.085,
    peak = 0.24,
    release = 0.09,
    lowPassHz = 1600,
    highPassHz = 40,
    noisePeak = 0.08,
    noiseBandHz = 1400,
  } = {}) {
    if (!voice) {
      return 0;
    }
    const bodyEnd = pitchSweep(voice, {
      offset,
      fromHz: Math.max(35, finiteOr(bodyHz, 110) * 1.25),
      toHz: Math.max(25, finiteOr(bodyHz, 110) * 0.62),
      duration,
      type: "triangle",
      peak,
      attack: 0.0018,
      hold: 0,
      release,
      lowPassHz,
      highPassHz,
    });
    let snapEnd = 0;
    if (Number.isFinite(Number(snapHz)) && Number(snapHz) > 0) {
      snapEnd = pitchSweep(voice, {
        offset,
        fromHz: Number(snapHz) * 1.15,
        toHz: Number(snapHz) * 0.6,
        duration: duration * 0.48,
        type: "square",
        peak: peak * 0.26,
        attack: 0.001,
        hold: 0,
        release: release * 0.46,
        lowPassHz: Math.max(350, lowPassHz * 1.9),
        highPassHz: Math.max(90, highPassHz),
      });
    }
    const noiseEnd = noisePeak > 0
      ? noiseBurst(voice, {
        offset,
        duration: duration * 0.42,
        attack: 0.001,
        release: release * 0.72,
        peak: noisePeak,
        highPassHz: Math.max(140, highPassHz * 1.8),
        lowPassHz: Math.max(700, lowPassHz * 1.35),
        bandPassHz: Math.max(200, finiteOr(noiseBandHz, 1400)),
        q: 0.9,
      })
      : 0;
    return Math.max(bodyEnd, snapEnd, noiseEnd);
  }

  function playMachineGun(payload = {}) {
    const voice = createVoice("machineGun", {
      position: payload.origin,
      volume: 0.34,
      lowPassHz: 11000,
    });
    if (!voice) {
      return false;
    }
    const metallicHz = 170 + randomBetween(-18, 22);
    const bodyEnd = filteredThunk(voice, {
      bodyHz: metallicHz,
      snapHz: metallicHz * 2.8,
      duration: 0.034,
      peak: 0.18,
      release: 0.06,
      lowPassHz: 4200,
      highPassHz: 140,
      noisePeak: 0.055,
      noiseBandHz: 2400,
    });
    const tailEnd = noiseBurst(voice, {
      offset: 0.01,
      duration: 0.024,
      attack: 0.001,
      release: 0.045,
      peak: 0.065,
      highPassHz: 1500,
      lowPassHz: 6200,
      bandPassHz: 3200,
      q: 1.1,
      playbackRate: randomBetween(0.95, 1.08),
    });
    voice.finish(Math.max(bodyEnd, tailEnd), 0.08);
    return true;
  }

  function playSniper(payload = {}) {
    const voice = createVoice("sniper", {
      position: payload.start,
      volume: 0.56,
      lowPassHz: 13500,
    });
    if (!voice) {
      return false;
    }
    const chargeEnd = reverseEnvelope(voice, {
      fromHz: 190,
      toHz: 1100,
      duration: 0.055,
      peak: 0.1,
      highPassHz: 180,
      lowPassHz: 4800,
    });
    const crackEnd = fmPing(voice, {
      offset: 0.05,
      carrierHz: 1120 + randomBetween(-45, 70),
      modHz: 2680,
      modDepth: 420,
      duration: 0.08,
      attack: 0.001,
      hold: 0.004,
      release: 0.11,
      peak: 0.22,
      type: "square",
      highPassHz: 540,
      lowPassHz: 9600,
      q: 1.1,
    });
    const gritEnd = noiseBurst(voice, {
      offset: 0.054,
      duration: 0.03,
      attack: 0.001,
      release: 0.06,
      peak: 0.07,
      highPassHz: 1800,
      lowPassHz: 9800,
      bandPassHz: 4200,
      q: 1.3,
    });
    voice.finish(Math.max(chargeEnd, crackEnd, gritEnd), 0.12);
    return true;
  }

  function playBazooka(payload = {}) {
    const voice = createVoice("bazooka", {
      position: payload.origin,
      volume: 0.72,
      lowPassHz: 9400,
    });
    if (!voice) {
      return false;
    }
    const thunkEnd = filteredThunk(voice, {
      bodyHz: 76 + randomBetween(-8, 12),
      snapHz: 165,
      duration: 0.11,
      peak: 0.33,
      release: 0.16,
      lowPassHz: 1800,
      highPassHz: 28,
      noisePeak: 0.09,
      noiseBandHz: 820,
    });
    const hissEnd = noiseBurst(voice, {
      offset: 0.03,
      duration: 0.16,
      attack: 0.002,
      release: 0.14,
      peak: 0.12,
      highPassHz: 240,
      lowPassHz: 3200,
      bandPassHz: 760,
      q: 0.9,
      playbackRate: 0.9,
    });
    const popEnd = fmPing(voice, {
      offset: 0.06,
      carrierHz: 180,
      modHz: 420,
      modDepth: 70,
      duration: 0.09,
      attack: 0.001,
      hold: 0,
      release: 0.11,
      peak: 0.08,
      type: "triangle",
      highPassHz: 40,
      lowPassHz: 2200,
    });
    voice.finish(Math.max(thunkEnd, hissEnd, popEnd), 0.16);
    return true;
  }

  function playTowerPlace(payload = {}) {
    const voice = createVoice("towerPlace", {
      position: payload.position,
      volume: 0.46,
      lowPassHz: 15000,
    });
    if (!voice) {
      return false;
    }
    const clampEnd = filteredThunk(voice, {
      bodyHz: 104,
      snapHz: 290,
      duration: 0.055,
      peak: 0.2,
      release: 0.09,
      lowPassHz: 2400,
      highPassHz: 85,
      noisePeak: 0.04,
      noiseBandHz: 1400,
    });
    const shimmerA = fmPing(voice, {
      offset: 0.03,
      carrierHz: 420,
      modHz: 880,
      modDepth: 120,
      duration: 0.09,
      attack: 0.003,
      hold: 0.01,
      release: 0.08,
      peak: 0.09,
      type: "triangle",
      highPassHz: 260,
      lowPassHz: 7400,
    });
    const shimmerB = fmPing(voice, {
      offset: 0.065,
      carrierHz: 660,
      modHz: 1280,
      modDepth: 180,
      duration: 0.11,
      attack: 0.003,
      hold: 0,
      release: 0.08,
      peak: 0.08,
      type: "triangle",
      highPassHz: 380,
      lowPassHz: 9800,
    });
    voice.finish(Math.max(clampEnd, shimmerA, shimmerB), 0.12);
    return true;
  }

  function playTowerReject(eventName, payload = {}) {
    const voice = createVoice(eventName, {
      volume: eventName === "unaffordable" ? 0.34 : 0.3,
      lowPassHz: 9200,
    });
    if (!voice) {
      return false;
    }
    const clackEnd = filteredThunk(voice, {
      bodyHz: eventName === "unaffordable" ? 142 : 168,
      snapHz: 330,
      duration: 0.04,
      peak: 0.12,
      release: 0.07,
      lowPassHz: 2400,
      highPassHz: 140,
      noisePeak: 0.03,
      noiseBandHz: 1900,
    });
    const downEnd = pitchSweep(voice, {
      offset: 0.01,
      fromHz: eventName === "unaffordable" ? 280 : 240,
      toHz: eventName === "unaffordable" ? 120 : 105,
      duration: 0.085,
      type: "triangle",
      peak: 0.065,
      attack: 0.002,
      hold: 0,
      release: 0.08,
      lowPassHz: 3200,
      highPassHz: 140,
    });
    voice.finish(Math.max(clackEnd, downEnd), 0.11);
    return true;
  }

  function playTowerSell(payload = {}) {
    const voice = createVoice("towerSell", {
      position: payload.position,
      volume: 0.42,
      lowPassHz: 15000,
    });
    if (!voice) {
      return false;
    }
    const reverseEnd = reverseEnvelope(voice, {
      fromHz: 110,
      toHz: 360,
      duration: 0.055,
      peak: 0.09,
      highPassHz: 100,
      lowPassHz: 2600,
    });
    const chirpEnd = fmPing(voice, {
      offset: 0.04,
      carrierHz: 720,
      modHz: 1320,
      modDepth: 160,
      duration: 0.1,
      attack: 0.0015,
      hold: 0,
      release: 0.08,
      peak: 0.11,
      type: "triangle",
      highPassHz: 280,
      lowPassHz: 8600,
    });
    voice.finish(Math.max(reverseEnd, chirpEnd), 0.12);
    return true;
  }

  function playMoneyDropSpawn(payload = {}) {
    const voice = createVoice("moneyDropSpawn", {
      position: payload.position,
      volume: 0.18,
      lowPassHz: 9200,
    });
    if (!voice) {
      return false;
    }
    const value = Math.max(1, Math.floor(Number(payload.value) || 1));
    const tickCount = clamp(Math.ceil(Math.log10(value + 1) * 2), 1, 3);
    let endTime = 0;
    for (let index = 0; index < tickCount; index += 1) {
      const offset = index * 0.011;
      endTime = Math.max(endTime, filteredThunk(voice, {
        offset,
        bodyHz: 180 + (index * 40) + randomBetween(-15, 12),
        snapHz: 440 + (index * 70),
        duration: 0.022,
        peak: 0.05,
        release: 0.04,
        lowPassHz: 2800,
        highPassHz: 220,
        noisePeak: 0.025,
        noiseBandHz: 2600,
      }));
    }
    voice.finish(Math.max(0.06, endTime), 0.09);
    return true;
  }

  function playMoneyMerge(payload = {}) {
    const voice = createVoice("moneyMerge", {
      position: payload.position,
      volume: 0.36,
      lowPassHz: 15000,
    });
    if (!voice) {
      return false;
    }
    const targetValue = Math.max(1, Math.floor(Number(payload.targetValue) || 1));
    const sizeStep = clamp(Math.log10(targetValue), 0, 2);
    const baseHz = THREE.MathUtils.lerp(420, 660, sizeStep / 2);
    const intervals = targetValue >= 100
      ? [0, 7, 14]
      : (targetValue >= 10 ? [0, 5, 12] : [0, 4, 9]);
    let endTime = 0;
    for (let index = 0; index < intervals.length; index += 1) {
      const ratio = 2 ** (intervals[index] / 12);
      endTime = Math.max(endTime, fmPing(voice, {
        offset: index * 0.042,
        carrierHz: baseHz * ratio,
        modHz: baseHz * ratio * 2.1,
        modDepth: 160 + (index * 30),
        duration: 0.11,
        attack: 0.0025,
        hold: 0.008,
        release: 0.08,
        peak: 0.1,
        type: "triangle",
        highPassHz: 220,
        lowPassHz: 7800,
      }));
    }
    const sparkleEnd = noiseBurst(voice, {
      offset: 0.03,
      duration: 0.05,
      attack: 0.001,
      release: 0.06,
      peak: 0.038,
      highPassHz: 2200,
      lowPassHz: 8800,
      bandPassHz: 4000,
      q: 1.25,
    });
    voice.finish(Math.max(endTime, sparkleEnd), 0.1);
    return true;
  }

  function playMoneyPickup(payload = {}) {
    const value = Math.max(1, Math.floor(Number(payload.value) || 1));
    const sizeStep = clamp(Math.log10(value), 0, 2);
    const voice = createVoice("moneyPickup", {
      position: payload.position,
      volume: THREE.MathUtils.lerp(0.22, 0.42, sizeStep / 2),
      lowPassHz: 15500,
    });
    if (!voice) {
      return false;
    }
    const pingEnd = fmPing(voice, {
      carrierHz: THREE.MathUtils.lerp(580, 980, sizeStep / 2),
      modHz: THREE.MathUtils.lerp(1180, 1860, sizeStep / 2),
      modDepth: THREE.MathUtils.lerp(110, 220, sizeStep / 2),
      duration: 0.12,
      attack: 0.002,
      hold: 0.01,
      release: 0.08,
      peak: 0.11,
      type: "triangle",
      highPassHz: 260,
      lowPassHz: 9200,
    });
    const magnetEnd = reverseEnvelope(voice, {
      fromHz: 140,
      toHz: THREE.MathUtils.lerp(360, 780, sizeStep / 2),
      duration: 0.045,
      peak: 0.055,
      highPassHz: 180,
      lowPassHz: 5400,
    });
    voice.finish(Math.max(pingEnd, magnetEnd), 0.1);
    return true;
  }

  function playBuildPhaseStart() {
    const voice = createVoice("buildPhaseStart", {
      volume: 0.48,
      lowPassHz: 16000,
    });
    if (!voice) {
      return false;
    }
    const chord = [96, 144, 192];
    let endTime = 0;
    for (let index = 0; index < chord.length; index += 1) {
      endTime = Math.max(endTime, filteredThunk(voice, {
        offset: index * 0.025,
        bodyHz: chord[index],
        snapHz: chord[index] * 2.05,
        duration: 0.06,
        peak: index === 0 ? 0.2 : 0.12,
        release: 0.11,
        lowPassHz: 2400 + (index * 500),
        highPassHz: 50,
        noisePeak: 0.04,
        noiseBandHz: 1200 + (index * 250),
      }));
    }
    const bloomEnd = reverseEnvelope(voice, {
      fromHz: 120,
      toHz: 440,
      duration: 0.11,
      peak: 0.06,
      highPassHz: 120,
      lowPassHz: 3600,
    });
    voice.finish(Math.max(endTime, bloomEnd), 0.16);
    return true;
  }

  function playWaveStart() {
    const voice = createVoice("waveStart", {
      volume: 0.62,
      lowPassHz: 17500,
    });
    if (!voice) {
      return false;
    }
    const pulseA = fmPing(voice, {
      carrierHz: 340,
      modHz: 760,
      modDepth: 140,
      duration: 0.08,
      attack: 0.002,
      hold: 0.006,
      release: 0.07,
      peak: 0.1,
      type: "square",
      highPassHz: 140,
      lowPassHz: 6200,
    });
    const pulseB = fmPing(voice, {
      offset: 0.095,
      carrierHz: 420,
      modHz: 900,
      modDepth: 170,
      duration: 0.08,
      attack: 0.002,
      hold: 0.006,
      release: 0.07,
      peak: 0.1,
      type: "square",
      highPassHz: 160,
      lowPassHz: 6800,
    });
    const hitEnd = filteredThunk(voice, {
      offset: 0.18,
      bodyHz: 88,
      snapHz: 240,
      duration: 0.09,
      peak: 0.24,
      release: 0.12,
      lowPassHz: 2200,
      highPassHz: 36,
      noisePeak: 0.06,
      noiseBandHz: 900,
    });
    voice.finish(Math.max(pulseA, pulseB, hitEnd), 0.16);
    return true;
  }

  function playTechMenuOpen() {
    const voice = createVoice("techMenuOpen", {
      volume: 0.34,
      lowPassHz: 15500,
    });
    if (!voice) {
      return false;
    }
    const bloomEnd = reverseEnvelope(voice, {
      fromHz: 160,
      toHz: 520,
      duration: 0.085,
      peak: 0.07,
      highPassHz: 120,
      lowPassHz: 5400,
    });
    const pingEnd = fmPing(voice, {
      offset: 0.028,
      carrierHz: 560,
      modHz: 1180,
      modDepth: 130,
      duration: 0.12,
      attack: 0.003,
      hold: 0.01,
      release: 0.08,
      peak: 0.06,
      type: "triangle",
      highPassHz: 200,
      lowPassHz: 7600,
    });
    voice.finish(Math.max(bloomEnd, pingEnd), 0.12);
    return true;
  }

  function playTechConfirm() {
    const voice = createVoice("techConfirm", {
      volume: 0.35,
      lowPassHz: 16500,
    });
    if (!voice) {
      return false;
    }
    const hitA = fmPing(voice, {
      carrierHz: 520,
      modHz: 1020,
      modDepth: 140,
      duration: 0.09,
      attack: 0.0015,
      hold: 0.008,
      release: 0.08,
      peak: 0.085,
      type: "triangle",
      highPassHz: 220,
      lowPassHz: 7200,
    });
    const hitB = fmPing(voice, {
      offset: 0.016,
      carrierHz: 780,
      modHz: 1560,
      modDepth: 160,
      duration: 0.1,
      attack: 0.0015,
      hold: 0.006,
      release: 0.08,
      peak: 0.07,
      type: "triangle",
      highPassHz: 280,
      lowPassHz: 9000,
    });
    voice.finish(Math.max(hitA, hitB), 0.1);
    return true;
  }

  function playWeaponConfirm() {
    const voice = createVoice("weaponConfirm", {
      volume: 0.44,
      lowPassHz: 16500,
    });
    if (!voice) {
      return false;
    }
    const bodyEnd = filteredThunk(voice, {
      bodyHz: 126,
      snapHz: 310,
      duration: 0.055,
      peak: 0.14,
      release: 0.09,
      lowPassHz: 2400,
      highPassHz: 70,
      noisePeak: 0.04,
      noiseBandHz: 1300,
    });
    const pingEnd = fmPing(voice, {
      offset: 0.028,
      carrierHz: 620,
      modHz: 1240,
      modDepth: 150,
      duration: 0.11,
      attack: 0.0015,
      hold: 0.006,
      release: 0.09,
      peak: 0.08,
      type: "square",
      highPassHz: 220,
      lowPassHz: 7800,
    });
    voice.finish(Math.max(bodyEnd, pingEnd), 0.11);
    return true;
  }

  function playPause() {
    const voice = createVoice("pause", {
      volume: 0.24,
      lowPassHz: 7200,
    });
    if (!voice) {
      return false;
    }
    const clickEnd = filteredThunk(voice, {
      bodyHz: 132,
      snapHz: 280,
      duration: 0.028,
      peak: 0.09,
      release: 0.06,
      lowPassHz: 1800,
      highPassHz: 90,
      noisePeak: 0.018,
      noiseBandHz: 1600,
    });
    voice.finish(clickEnd, 0.07);
    return true;
  }

  function playSpeedToggle() {
    const voice = createVoice("speedToggle", {
      volume: 0.28,
      lowPassHz: 15500,
    });
    if (!voice) {
      return false;
    }
    const pingA = fmPing(voice, {
      carrierHz: 480,
      modHz: 980,
      modDepth: 120,
      duration: 0.06,
      attack: 0.001,
      hold: 0.003,
      release: 0.05,
      peak: 0.07,
      type: "square",
      highPassHz: 220,
      lowPassHz: 8200,
    });
    const pingB = fmPing(voice, {
      offset: 0.055,
      carrierHz: 720,
      modHz: 1420,
      modDepth: 160,
      duration: 0.06,
      attack: 0.001,
      hold: 0.003,
      release: 0.05,
      peak: 0.08,
      type: "square",
      highPassHz: 240,
      lowPassHz: 9200,
    });
    voice.finish(Math.max(pingA, pingB), 0.08);
    return true;
  }

  function playEnemySpawn(payload = {}) {
    const typeHash = hashString(payload.enemyType ?? payload.type);
    const pitchOffset = (typeHash % 7) * 22;
    const voice = createVoice("enemySpawn", {
      position: payload.position,
      volume: 0.22,
      lowPassHz: 11000,
    });
    if (!voice) {
      return false;
    }
    const sputterEnd = reverseEnvelope(voice, {
      fromHz: 120 + pitchOffset,
      toHz: 420 + pitchOffset,
      duration: 0.05,
      peak: 0.05,
      highPassHz: 180,
      lowPassHz: 3800,
    });
    const noiseEnd = noiseBurst(voice, {
      offset: 0.014,
      duration: 0.045,
      attack: 0.001,
      release: 0.06,
      peak: 0.055,
      highPassHz: 360,
      lowPassHz: 2800 + pitchOffset,
      bandPassHz: 740 + pitchOffset,
      q: 0.9,
      playbackRate: randomBetween(0.95, 1.08),
    });
    voice.finish(Math.max(sputterEnd, noiseEnd), 0.09);
    return true;
  }

  function playEnemyDeath(payload = {}) {
    const typeHash = hashString(payload.enemyType ?? payload.type);
    const pitchOffset = (typeHash % 5) * 18;
    const voice = createVoice("enemyDeath", {
      position: payload.position,
      volume: 0.28,
      lowPassHz: 11800,
    });
    if (!voice) {
      return false;
    }
    const popEnd = filteredThunk(voice, {
      bodyHz: 132 + pitchOffset,
      snapHz: 310 + pitchOffset,
      duration: 0.04,
      peak: 0.14,
      release: 0.08,
      lowPassHz: 2400,
      highPassHz: 130,
      noisePeak: 0.03,
      noiseBandHz: 1800 + pitchOffset,
    });
    const crumbleEnd = noiseBurst(voice, {
      offset: 0.014,
      duration: 0.05,
      attack: 0.001,
      release: 0.08,
      peak: 0.052,
      highPassHz: 520,
      lowPassHz: 4400,
      bandPassHz: 2500,
      q: 1.1,
      playbackRate: randomBetween(0.92, 1.06),
    });
    voice.finish(Math.max(popEnd, crumbleEnd), 0.1);
    return true;
  }

  function playEnemyDeathExplosion(payload = {}) {
    const voice = createVoice("enemyDeathExplosion", {
      position: payload.position,
      volume: 0.58,
      lowPassHz: 9800,
    });
    if (!voice) {
      return false;
    }
    const subEnd = filteredThunk(voice, {
      bodyHz: 58,
      snapHz: 138,
      duration: 0.12,
      peak: 0.28,
      release: 0.18,
      lowPassHz: 1300,
      highPassHz: 24,
      noisePeak: 0.07,
      noiseBandHz: 620,
    });
    const crackleEnd = noiseBurst(voice, {
      offset: 0.015,
      duration: 0.11,
      attack: 0.001,
      release: 0.12,
      peak: 0.09,
      highPassHz: 240,
      lowPassHz: 3200,
      bandPassHz: 980,
      q: 0.95,
      playbackRate: 0.84,
    });
    voice.finish(Math.max(subEnd, crackleEnd), 0.16);
    return true;
  }

  function playTowerGunFire(payload = {}) {
    const voice = createVoice("towerGunFire", {
      position: payload.position,
      volume: 0.26,
      lowPassHz: 9200,
    });
    if (!voice) {
      return false;
    }
    const snapHz = 150 + randomBetween(-10, 18);
    const clickEnd = filteredThunk(voice, {
      bodyHz: snapHz,
      snapHz: snapHz * 3.2,
      duration: 0.03,
      peak: 0.12,
      release: 0.055,
      lowPassHz: 3600,
      highPassHz: 130,
      noisePeak: 0.032,
      noiseBandHz: 2100,
    });
    const tailEnd = noiseBurst(voice, {
      offset: 0.006,
      duration: 0.03,
      attack: 0.001,
      release: 0.05,
      peak: 0.038,
      highPassHz: 1200,
      lowPassHz: 5200,
      bandPassHz: 2400,
      q: 1.05,
      playbackRate: randomBetween(0.92, 1.06),
    });
    voice.finish(Math.max(clickEnd, tailEnd), 0.07);
    return true;
  }

  function playTowerAoePulse(payload = {}) {
    const voice = createVoice("towerAoePulse", {
      position: payload.position,
      volume: 0.44,
      lowPassHz: 11600,
    });
    if (!voice) {
      return false;
    }
    const bodyEnd = filteredThunk(voice, {
      bodyHz: 92,
      snapHz: 240,
      duration: 0.09,
      peak: 0.2,
      release: 0.12,
      lowPassHz: 1700,
      highPassHz: 38,
      noisePeak: 0.042,
      noiseBandHz: 860,
    });
    const shimmerEnd = fmPing(voice, {
      offset: 0.02,
      carrierHz: 360,
      modHz: 760,
      modDepth: 140,
      duration: 0.12,
      attack: 0.002,
      hold: 0.012,
      release: 0.09,
      peak: 0.07,
      type: "triangle",
      highPassHz: 150,
      lowPassHz: 5400,
    });
    voice.finish(Math.max(bodyEnd, shimmerEnd), 0.12);
    return true;
  }

  function playTowerSlowProc(payload = {}) {
    const voice = createVoice("towerSlowProc", {
      position: payload.position,
      volume: 0.32,
      lowPassHz: 15200,
    });
    if (!voice) {
      return false;
    }
    const bloomEnd = reverseEnvelope(voice, {
      fromHz: 180,
      toHz: 620,
      duration: 0.07,
      peak: 0.06,
      highPassHz: 180,
      lowPassHz: 5200,
    });
    const crystalA = fmPing(voice, {
      offset: 0.018,
      carrierHz: 520,
      modHz: 1040,
      modDepth: 180,
      duration: 0.1,
      attack: 0.002,
      hold: 0.004,
      release: 0.08,
      peak: 0.075,
      type: "triangle",
      highPassHz: 260,
      lowPassHz: 7600,
    });
    const crystalB = fmPing(voice, {
      offset: 0.052,
      carrierHz: 720,
      modHz: 1440,
      modDepth: 210,
      duration: 0.08,
      attack: 0.0015,
      hold: 0,
      release: 0.07,
      peak: 0.055,
      type: "triangle",
      highPassHz: 340,
      lowPassHz: 9200,
    });
    voice.finish(Math.max(bloomEnd, crystalA, crystalB), 0.1);
    return true;
  }

  function playTowerLaserSniper(payload = {}) {
    const voice = createVoice("towerLaserSniper", {
      position: payload.position,
      volume: 0.52,
      lowPassHz: 14000,
    });
    if (!voice) {
      return false;
    }
    const chargeEnd = reverseEnvelope(voice, {
      fromHz: 220,
      toHz: 980,
      duration: 0.04,
      peak: 0.09,
      highPassHz: 200,
      lowPassHz: 4600,
    });
    const beamEnd = fmPing(voice, {
      offset: 0.038,
      carrierHz: 820 + randomBetween(-28, 36),
      modHz: 2120,
      modDepth: 360,
      duration: 0.08,
      attack: 0.001,
      hold: 0.006,
      release: 0.09,
      peak: 0.15,
      type: "square",
      highPassHz: 420,
      lowPassHz: 9800,
      q: 1.15,
    });
    const staticEnd = noiseBurst(voice, {
      offset: 0.04,
      duration: 0.028,
      attack: 0.001,
      release: 0.05,
      peak: 0.05,
      highPassHz: 2200,
      lowPassHz: 9600,
      bandPassHz: 4200,
      q: 1.2,
    });
    voice.finish(Math.max(chargeEnd, beamEnd, staticEnd), 0.1);
    return true;
  }

  function playTowerMortarLaunch(payload = {}) {
    const voice = createVoice("towerMortarLaunch", {
      position: payload.position,
      volume: 0.48,
      lowPassHz: 9800,
    });
    if (!voice) {
      return false;
    }
    const thunkEnd = filteredThunk(voice, {
      bodyHz: 74,
      snapHz: 154,
      duration: 0.08,
      peak: 0.24,
      release: 0.12,
      lowPassHz: 1500,
      highPassHz: 26,
      noisePeak: 0.055,
      noiseBandHz: 760,
    });
    const hissEnd = noiseBurst(voice, {
      offset: 0.016,
      duration: 0.1,
      attack: 0.002,
      release: 0.1,
      peak: 0.065,
      highPassHz: 240,
      lowPassHz: 3000,
      bandPassHz: 920,
      playbackRate: 0.88,
    });
    voice.finish(Math.max(thunkEnd, hissEnd), 0.12);
    return true;
  }

  function playTowerMortarImpact(payload = {}) {
    const voice = createVoice("towerMortarImpact", {
      position: payload.position,
      volume: 0.62,
      lowPassHz: 10400,
    });
    if (!voice) {
      return false;
    }
    const blastEnd = filteredThunk(voice, {
      bodyHz: 62,
      snapHz: 148,
      duration: 0.12,
      peak: 0.3,
      release: 0.16,
      lowPassHz: 1350,
      highPassHz: 24,
      noisePeak: 0.085,
      noiseBandHz: 640,
    });
    const debrisEnd = noiseBurst(voice, {
      offset: 0.012,
      duration: 0.14,
      attack: 0.001,
      release: 0.14,
      peak: 0.09,
      highPassHz: 260,
      lowPassHz: 3400,
      bandPassHz: 980,
      q: 0.9,
      playbackRate: 0.82,
    });
    voice.finish(Math.max(blastEnd, debrisEnd), 0.16);
    return true;
  }

  function playTowerTeslaChain(payload = {}) {
    const chainCount = Math.max(1, Math.floor(Number(payload.chainCount) || 1));
    const voice = createVoice("towerTeslaChain", {
      position: payload.position,
      volume: THREE.MathUtils.lerp(0.32, 0.5, Math.min(1, (chainCount - 1) / 4)),
      lowPassHz: 13200,
    });
    if (!voice) {
      return false;
    }
    let endTime = 0;
    for (let index = 0; index < Math.min(chainCount, 4); index += 1) {
      endTime = Math.max(endTime, fmPing(voice, {
        offset: index * 0.012,
        carrierHz: 620 + (index * 90),
        modHz: 2480,
        modDepth: 340,
        duration: 0.05,
        attack: 0.001,
        hold: 0,
        release: 0.045,
        peak: index === 0 ? 0.12 : 0.07,
        type: "square",
        highPassHz: 420,
        lowPassHz: 9600,
        q: 1.25,
      }));
    }
    const crackleEnd = noiseBurst(voice, {
      offset: 0.004,
      duration: 0.06 + (Math.min(chainCount, 4) * 0.01),
      attack: 0.001,
      release: 0.07,
      peak: 0.055 + (Math.min(chainCount, 4) * 0.008),
      highPassHz: 1800,
      lowPassHz: 7200,
      bandPassHz: 3200,
      q: 1.15,
      playbackRate: randomBetween(0.96, 1.08),
    });
    voice.finish(Math.max(endTime, crackleEnd), 0.08);
    return true;
  }

  function playTowerSpikesProc(payload = {}) {
    const voice = createVoice("towerSpikesProc", {
      position: payload.position,
      volume: 0.3,
      lowPassHz: 9200,
    });
    if (!voice) {
      return false;
    }
    const stabEnd = filteredThunk(voice, {
      bodyHz: 126,
      snapHz: 360,
      duration: 0.034,
      peak: 0.15,
      release: 0.065,
      lowPassHz: 2600,
      highPassHz: 120,
      noisePeak: 0.025,
      noiseBandHz: 2200,
    });
    const scrapeEnd = noiseBurst(voice, {
      offset: 0.006,
      duration: 0.028,
      attack: 0.001,
      release: 0.04,
      peak: 0.03,
      highPassHz: 1400,
      lowPassHz: 5200,
      bandPassHz: 2600,
      q: 1.1,
    });
    voice.finish(Math.max(stabEnd, scrapeEnd), 0.07);
    return true;
  }

  function playTowerPlasmaBurst(payload = {}) {
    const voice = createVoice("towerPlasmaBurst", {
      position: payload.position,
      volume: 0.3,
      lowPassHz: 12800,
    });
    if (!voice) {
      return false;
    }
    const ignitionEnd = reverseEnvelope(voice, {
      fromHz: 140,
      toHz: 440,
      duration: 0.05,
      peak: 0.05,
      highPassHz: 120,
      lowPassHz: 3200,
    });
    const hissEnd = noiseBurst(voice, {
      offset: 0.01,
      duration: 0.075,
      attack: 0.002,
      release: 0.08,
      peak: 0.06,
      highPassHz: 820,
      lowPassHz: 4200,
      bandPassHz: 1800,
      playbackRate: 0.9,
    });
    voice.finish(Math.max(ignitionEnd, hissEnd), 0.09);
    return true;
  }

  function playPlayerJump(payload = {}) {
    const voice = createVoice("playerJump", {
      position: payload.position,
      volume: 0.2,
      lowPassHz: 9200,
    });
    if (!voice) {
      return false;
    }
    const bodyEnd = filteredThunk(voice, {
      bodyHz: 138,
      snapHz: 280,
      duration: 0.04,
      peak: 0.08,
      release: 0.06,
      lowPassHz: 2100,
      highPassHz: 90,
      noisePeak: 0.026,
      noiseBandHz: 1200,
    });
    const liftEnd = pitchSweep(voice, {
      offset: 0.008,
      fromHz: 180,
      toHz: 280,
      duration: 0.05,
      type: "triangle",
      peak: 0.032,
      attack: 0.001,
      hold: 0,
      release: 0.04,
      lowPassHz: 2800,
      highPassHz: 150,
    });
    voice.finish(Math.max(bodyEnd, liftEnd), 0.08);
    return true;
  }

  function playPlayerLand(payload = {}) {
    const impactSpeed = Math.max(0, finiteOr(payload.impactSpeed, 0));
    const impactMix = Math.min(1, impactSpeed / 9);
    const voice = createVoice("playerLand", {
      position: payload.position,
      volume: THREE.MathUtils.lerp(0.18, 0.34, impactMix),
      lowPassHz: 7600,
    });
    if (!voice) {
      return false;
    }
    const thudEnd = filteredThunk(voice, {
      bodyHz: THREE.MathUtils.lerp(110, 84, impactMix),
      snapHz: THREE.MathUtils.lerp(220, 180, impactMix),
      duration: THREE.MathUtils.lerp(0.035, 0.06, impactMix),
      peak: THREE.MathUtils.lerp(0.09, 0.16, impactMix),
      release: THREE.MathUtils.lerp(0.07, 0.1, impactMix),
      lowPassHz: 1600,
      highPassHz: 55,
      noisePeak: THREE.MathUtils.lerp(0.02, 0.04, impactMix),
      noiseBandHz: 900,
    });
    voice.finish(thudEnd, 0.08);
    return true;
  }

  function playPlayerJetpackStart(payload = {}) {
    const voice = createVoice("playerJetpackStart", {
      position: payload.position,
      volume: 0.22,
      lowPassHz: 12400,
    });
    if (!voice) {
      return false;
    }
    const liftEnd = filteredThunk(voice, {
      bodyHz: 96,
      snapHz: 190,
      duration: 0.05,
      peak: 0.11,
      release: 0.08,
      lowPassHz: 1900,
      highPassHz: 55,
      noisePeak: 0.03,
      noiseBandHz: 980,
    });
    const flameEnd = noiseBurst(voice, {
      offset: 0.006,
      duration: 0.09,
      attack: 0.002,
      release: 0.08,
      peak: 0.05,
      highPassHz: 720,
      lowPassHz: 3600,
      bandPassHz: 1700,
      playbackRate: 0.92,
    });
    voice.finish(Math.max(liftEnd, flameEnd), 0.09);
    return true;
  }

  function playPlayerJetpackStop(payload = {}) {
    const voice = createVoice("playerJetpackStop", {
      position: payload.position,
      volume: 0.18,
      lowPassHz: 9000,
    });
    if (!voice) {
      return false;
    }
    const sputterEnd = noiseBurst(voice, {
      duration: 0.05,
      attack: 0.001,
      release: 0.06,
      peak: 0.04,
      highPassHz: 640,
      lowPassHz: 2800,
      bandPassHz: 1300,
      playbackRate: 0.84,
    });
    const fallEnd = pitchSweep(voice, {
      offset: 0.008,
      fromHz: 160,
      toHz: 84,
      duration: 0.05,
      type: "triangle",
      peak: 0.03,
      attack: 0.001,
      hold: 0,
      release: 0.05,
      lowPassHz: 1800,
      highPassHz: 70,
    });
    voice.finish(Math.max(sputterEnd, fallEnd), 0.08);
    return true;
  }

  function startPlayerJetpackLoop(payload = {}) {
    const loop = createLoop("playerJetpackLoop", {
      position: payload.position,
      volume: 0.11,
      lowPassHz: 5200,
    });
    if (!loop) {
      return false;
    }
    const audioContext = loop.audioContext;
    const startTime = loop.now;

    const noiseSource = loop.addSource(audioContext.createBufferSource());
    noiseSource.buffer = ensureNoiseBuffer(audioContext);
    noiseSource.loop = true;
    noiseSource.playbackRate.setValueAtTime(0.78, startTime);

    const noiseHighPass = loop.addNode(audioContext.createBiquadFilter());
    noiseHighPass.type = "highpass";
    noiseHighPass.frequency.setValueAtTime(220, startTime);
    noiseHighPass.Q.setValueAtTime(0.7, startTime);

    const noiseBandPass = loop.addNode(audioContext.createBiquadFilter());
    noiseBandPass.type = "bandpass";
    noiseBandPass.frequency.setValueAtTime(1280, startTime);
    noiseBandPass.Q.setValueAtTime(0.95, startTime);

    const noiseGain = loop.addNode(audioContext.createGain());
    noiseGain.gain.setValueAtTime(0.045, startTime);

    const toneOsc = loop.addSource(audioContext.createOscillator());
    toneOsc.type = "sawtooth";
    toneOsc.frequency.setValueAtTime(118, startTime);

    const toneFilter = loop.addNode(audioContext.createBiquadFilter());
    toneFilter.type = "lowpass";
    toneFilter.frequency.setValueAtTime(540, startTime);
    toneFilter.Q.setValueAtTime(0.8, startTime);

    const toneGain = loop.addNode(audioContext.createGain());
    toneGain.gain.setValueAtTime(0.025, startTime);

    const lfo = loop.addSource(audioContext.createOscillator());
    lfo.type = "sine";
    lfo.frequency.setValueAtTime(7.2, startTime);

    const lfoNoiseGain = loop.addNode(audioContext.createGain());
    lfoNoiseGain.gain.setValueAtTime(0.012, startTime);

    const lfoToneGain = loop.addNode(audioContext.createGain());
    lfoToneGain.gain.setValueAtTime(10, startTime);

    noiseSource.connect(noiseHighPass);
    noiseHighPass.connect(noiseBandPass);
    noiseBandPass.connect(noiseGain);
    noiseGain.connect(loop.input);

    toneOsc.connect(toneFilter);
    toneFilter.connect(toneGain);
    toneGain.connect(loop.input);

    lfo.connect(lfoNoiseGain);
    lfo.connect(lfoToneGain);
    lfoNoiseGain.connect(noiseGain.gain);
    lfoToneGain.connect(toneOsc.frequency);

    try {
      noiseSource.start(startTime);
      toneOsc.start(startTime);
      lfo.start(startTime);
    } catch {
      cleanupLoop(activeLoops.get("playerJetpackLoop"));
      return false;
    }
    loop.fadeIn(0.07, loop.targetGain);
    return true;
  }

  function startLoop(eventName, payload = {}) {
    if (eventName === "playerJetpackLoop") {
      return startPlayerJetpackLoop(payload);
    }
    return false;
  }

  function stopLoop(eventName, fadeSeconds = 0.12) {
    const activeLoop = activeLoops.get(eventName);
    if (!activeLoop || activeLoop.cleaned) {
      return false;
    }
    const audioContext = activeLoop.audioContext;
    const fadeDuration = Math.max(0.02, finiteOr(fadeSeconds, 0.12));
    const stopTime = audioContext.currentTime + fadeDuration;
    if (activeLoop.timerId != null) {
      window.clearTimeout(activeLoop.timerId);
      activeLoop.timerId = null;
    }
    for (const source of activeLoop.sources) {
      try {
        source.stop?.(stopTime + 0.02);
      } catch {
        // Ignore stop races during shutdown.
      }
    }
    const outputNode = activeLoop.nodes.find((node) => node?.gain === activeLoop.nodes[2]?.gain)
      || activeLoop.nodes[2];
    outputNode.gain.cancelScheduledValues(audioContext.currentTime);
    outputNode.gain.setValueAtTime(Math.max(MIN_GAIN, outputNode.gain.value || MIN_GAIN), audioContext.currentTime);
    outputNode.gain.exponentialRampToValueAtTime(MIN_GAIN, stopTime);
    activeLoop.timerId = window.setTimeout(() => {
      cleanupLoop(activeLoop);
    }, Math.max(50, Math.ceil((fadeDuration + 0.08) * 1000)));
    return true;
  }

  function play(eventName, payload = {}) {
    if (typeof eventName !== "string" || eventName.length === 0) {
      return false;
    }
    if (eventName === "machineGun") {
      return playMachineGun(payload);
    }
    if (eventName === "towerGunFire") {
      return playTowerGunFire(payload);
    }
    if (eventName === "towerAoePulse") {
      return playTowerAoePulse(payload);
    }
    if (eventName === "towerSlowProc") {
      return playTowerSlowProc(payload);
    }
    if (eventName === "towerLaserSniper") {
      return playTowerLaserSniper(payload);
    }
    if (eventName === "towerMortarLaunch") {
      return playTowerMortarLaunch(payload);
    }
    if (eventName === "towerMortarImpact") {
      return playTowerMortarImpact(payload);
    }
    if (eventName === "towerTeslaChain") {
      return playTowerTeslaChain(payload);
    }
    if (eventName === "towerSpikesProc") {
      return playTowerSpikesProc(payload);
    }
    if (eventName === "towerPlasmaBurst") {
      return playTowerPlasmaBurst(payload);
    }
    if (eventName === "playerJump") {
      return playPlayerJump(payload);
    }
    if (eventName === "playerLand") {
      return playPlayerLand(payload);
    }
    if (eventName === "playerJetpackStart") {
      return playPlayerJetpackStart(payload);
    }
    if (eventName === "playerJetpackStop") {
      return playPlayerJetpackStop(payload);
    }
    if (eventName === "sniper") {
      return playSniper(payload);
    }
    if (eventName === "bazooka") {
      return playBazooka(payload);
    }
    if (eventName === "towerPlace") {
      return playTowerPlace(payload);
    }
    if (eventName === "towerPlaceInvalid" || eventName === "unaffordable") {
      return playTowerReject(eventName, payload);
    }
    if (eventName === "towerSell") {
      return playTowerSell(payload);
    }
    if (eventName === "moneyDropSpawn") {
      return playMoneyDropSpawn(payload);
    }
    if (eventName === "moneyMerge") {
      return playMoneyMerge(payload);
    }
    if (eventName === "moneyPickup") {
      return playMoneyPickup(payload);
    }
    if (eventName === "buildPhaseStart") {
      return playBuildPhaseStart(payload);
    }
    if (eventName === "waveStart") {
      return playWaveStart(payload);
    }
    if (eventName === "techMenuOpen") {
      return playTechMenuOpen(payload);
    }
    if (eventName === "techConfirm") {
      return playTechConfirm(payload);
    }
    if (eventName === "weaponConfirm") {
      return playWeaponConfirm(payload);
    }
    if (eventName === "pause") {
      return playPause(payload);
    }
    if (eventName === "speedToggle") {
      return playSpeedToggle(payload);
    }
    if (eventName === "enemySpawn") {
      return playEnemySpawn(payload);
    }
    if (eventName === "enemyDeath") {
      return playEnemyDeath(payload);
    }
    if (eventName === "enemyDeathExplosion") {
      return playEnemyDeathExplosion(payload);
    }
    return false;
  }

  function setMasterVolume(nextValue) {
    masterGainValue = clamp(finiteOr(nextValue, masterGainValue), 0, resolvedMaxMasterGain);
    if (masterGainNode && graphAudioContext) {
      masterGainNode.gain.setValueAtTime(masterGainValue, graphAudioContext.currentTime);
    }
    return masterGainValue;
  }

  function getMasterVolume() {
    return masterGainValue;
  }

  function dispose() {
    for (const activeVoice of Array.from(activeVoices)) {
      cleanupVoice(activeVoice);
    }
    activeVoices.clear();
    for (const activeLoop of Array.from(activeLoops.values())) {
      cleanupLoop(activeLoop);
    }
    activeLoops.clear();
    voiceCountByEvent.clear();
    if (effectBus) {
      try {
        effectBus.disconnect();
      } catch {
        // Ignore disconnect races during teardown.
      }
    }
    if (compressorNode) {
      try {
        compressorNode.disconnect();
      } catch {
        // Ignore disconnect races during teardown.
      }
    }
    if (masterGainNode) {
      try {
        masterGainNode.disconnect();
      } catch {
        // Ignore disconnect races during teardown.
      }
    }
    graphAudioContext = null;
    effectBus = null;
    compressorNode = null;
    masterGainNode = null;
    noiseBuffer = null;
  }

  return {
    play,
    startLoop,
    stopLoop,
    setMasterVolume,
    getMasterVolume,
    dispose,
  };
}
