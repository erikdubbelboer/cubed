import { Network } from "@poki/netlib";

const CHANNEL_RELIABLE = "reliable";
const CHANNEL_UNRELIABLE = "unreliable";

function noop() {}

function encodeMessage(type, payload = {}) {
  return JSON.stringify({
    t: String(type || ""),
    p: payload && typeof payload === "object" ? payload : {},
  });
}

function decodeMessage(raw) {
  if (typeof raw === "string") {
    try {
      return decodeMessage(JSON.parse(raw));
    } catch {
      return null;
    }
  }

  if (raw instanceof ArrayBuffer || ArrayBuffer.isView(raw)) {
    try {
      const bytes = raw instanceof ArrayBuffer
        ? new Uint8Array(raw)
        : new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength);
      const text = new TextDecoder().decode(bytes);
      return decodeMessage(text);
    } catch {
      return null;
    }
  }

  if (!raw || typeof raw !== "object") {
    return null;
  }
  const type = typeof raw.t === "string" ? raw.t : "";
  if (!type) {
    return null;
  }
  return {
    type,
    payload: raw.p && typeof raw.p === "object" ? raw.p : {},
  };
}

function summarizePayload(payload) {
  if (!payload || typeof payload !== "object") {
    return payload;
  }
  const summary = {
    keys: Object.keys(payload),
  };
  if (typeof payload.request === "boolean") {
    summary.request = payload.request;
  }
  if (typeof payload.action === "string") {
    summary.action = payload.action;
  }
  if (typeof payload.requestId === "string") {
    summary.requestId = payload.requestId;
  }
  if (payload.snapshot && typeof payload.snapshot === "object") {
    summary.snapshotTowers = Array.isArray(payload.snapshot.towers) ? payload.snapshot.towers.length : 0;
    summary.snapshotEnemies = Array.isArray(payload.snapshot.enemies) ? payload.snapshot.enemies.length : 0;
  }
  return summary;
}

export function createMultiplayerController({
  gameId,
  onReady = noop,
  onLobby = noop,
  onLeft = noop,
  onPeerConnected = noop,
  onPeerDisconnected = noop,
  onReliableMessage = noop,
  onUnreliableMessage = noop,
  onError = noop,
  debug = false,
} = {}) {
  if (typeof gameId !== "string" || gameId.length === 0) {
    throw new Error("createMultiplayerController requires a non-empty gameId.");
  }

  const network = new Network(gameId);
  const peersById = new Map();
  const log = (message, details) => {
    if (!debug) {
      return;
    }
    if (details === undefined) {
      console.log(`[MultiplayerNet] ${message}`);
      return;
    }
    console.log(`[MultiplayerNet] ${message}`, details);
  };
  const warn = (message, details) => {
    if (details === undefined) {
      console.warn(`[MultiplayerNet] ${message}`);
      return;
    }
    console.warn(`[MultiplayerNet] ${message}`, details);
  };

  let ready = false;
  let inLobby = false;
  let isHost = false;
  let localPeerId = null;
  let lobbyCode = null;

  function summarizeState() {
    return {
      ready,
      inLobby,
      isHost,
      localPeerId,
      lobbyCode,
      peerCount: peersById.size,
      peerIds: Array.from(peersById.keys()),
    };
  }

  log("Controller created", { gameId });

  function refreshFromNetwork() {
    localPeerId = typeof network.id === "string" && network.id.length > 0
      ? network.id
      : localPeerId;
    const currentLobby = network.currentLobby;
    if (currentLobby && typeof currentLobby === "object") {
      inLobby = true;
      if (typeof currentLobby.code === "string" && currentLobby.code.length > 0) {
        lobbyCode = currentLobby.code;
      }
      if (typeof currentLobby.creator === "string" && typeof localPeerId === "string") {
        isHost = currentLobby.creator === localPeerId;
      }
    }
  }

  network.on("ready", () => {
    ready = true;
    refreshFromNetwork();
    log("Network ready", summarizeState());
    onReady();
  });

  network.on("lobby", (code) => {
    inLobby = true;
    lobbyCode = typeof code === "string" ? code : lobbyCode;
    refreshFromNetwork();
    log("Joined/created lobby event", summarizeState());
    onLobby(lobbyCode);
  });

  network.on("left", () => {
    inLobby = false;
    isHost = false;
    lobbyCode = null;
    peersById.clear();
    log("Left lobby event", summarizeState());
    onLeft();
  });

  network.on("connected", (peer) => {
    if (peer?.id) {
      peersById.set(peer.id, peer);
    }
    refreshFromNetwork();
    log("Peer connected event", { peerId: peer?.id || null, state: summarizeState() });
    onPeerConnected(peer);
  });

  network.on("disconnected", (peer) => {
    if (peer?.id) {
      peersById.delete(peer.id);
    }
    refreshFromNetwork();
    warn("Peer disconnected event", { peerId: peer?.id || null, state: summarizeState() });
    onPeerDisconnected(peer);
  });

  network.on("update", () => {
    refreshFromNetwork();
    log("Lobby update event", summarizeState());
  });

  network.on("message", (peer, channel, data) => {
    const decoded = decodeMessage(data);
    if (!decoded) {
      warn("Received undecodable message", { peerId: peer?.id || null, channel, rawType: typeof data });
      return;
    }
    if (channel === CHANNEL_RELIABLE) {
      log("Reliable message received", {
        peerId: peer?.id || null,
        type: decoded.type,
        payload: summarizePayload(decoded.payload),
      });
      onReliableMessage(peer, decoded.type, decoded.payload);
      return;
    }
    if (channel === CHANNEL_UNRELIABLE) {
      onUnreliableMessage(peer, decoded.type, decoded.payload);
      return;
    }
    warn("Unknown message channel", { channel, peerId: peer?.id || null });
  });

  network.on("error", (error) => {
    warn("Network error event", error);
    onError(error);
  });

  network.on("signalingerror", (error) => {
    warn("Signaling error event", error);
    onError(error);
  });

  network.on("rtcerror", (error) => {
    warn("RTC error event", error);
    onError(error);
  });

  async function createLobby(options = {}) {
    if (!ready || inLobby) {
      warn("createLobby skipped", { ready, inLobby });
      return false;
    }
    const createOptions = {
      public: false,
      maxPlayers: 2,
      ...(options && typeof options === "object" ? options : {}),
    };
    log("Creating lobby", createOptions);
    await network.create(createOptions);
    isHost = true;
    refreshFromNetwork();
    log("Created lobby", summarizeState());
    return true;
  }

  async function joinLobby(code) {
    if (!ready || inLobby) {
      warn("joinLobby skipped", { ready, inLobby, code });
      return false;
    }
    const safeCode = typeof code === "string" ? code.trim() : "";
    if (!safeCode) {
      warn("joinLobby skipped (empty code)");
      return false;
    }
    log("Joining lobby", { code: safeCode });
    await network.join(safeCode);
    isHost = false;
    refreshFromNetwork();
    log("Joined lobby", summarizeState());
    return true;
  }

  async function leaveLobby() {
    if (!inLobby) {
      warn("leaveLobby skipped (not in lobby)");
      return false;
    }
    log("Leaving lobby", summarizeState());
    await network.leave();
    return true;
  }

  function sendReliable(peerId, type, payload = {}) {
    if (!peerId || !inLobby) {
      warn("sendReliable skipped", { peerId, inLobby, type });
      return false;
    }
    network.send(CHANNEL_RELIABLE, peerId, encodeMessage(type, payload));
    log("Reliable message sent", { peerId, type, payload: summarizePayload(payload) });
    return true;
  }

  function broadcastReliable(type, payload = {}) {
    if (!inLobby) {
      warn("broadcastReliable skipped (not in lobby)", { type });
      return false;
    }
    network.broadcast(CHANNEL_RELIABLE, encodeMessage(type, payload));
    log("Reliable message broadcast", { type, payload: summarizePayload(payload) });
    return true;
  }

  function sendUnreliable(peerId, type, payload = {}) {
    if (!peerId || !inLobby) {
      warn("sendUnreliable skipped", { peerId, inLobby, type });
      return false;
    }
    network.send(CHANNEL_UNRELIABLE, peerId, encodeMessage(type, payload));
    return true;
  }

  function broadcastUnreliable(type, payload = {}) {
    if (!inLobby) {
      warn("broadcastUnreliable skipped (not in lobby)", { type });
      return false;
    }
    network.broadcast(CHANNEL_UNRELIABLE, encodeMessage(type, payload));
    return true;
  }

  function getPeerIds() {
    return Array.from(peersById.keys());
  }

  function getState() {
    refreshFromNetwork();
    return {
      ready,
      inLobby,
      isHost,
      lobbyCode,
      localPeerId,
      peerCount: peersById.size,
      peerIds: getPeerIds(),
    };
  }

  function close() {
    peersById.clear();
    log("Controller close called");
    network.close();
  }

  return {
    createLobby,
    joinLobby,
    leaveLobby,
    sendReliable,
    broadcastReliable,
    sendUnreliable,
    broadcastUnreliable,
    getPeerIds,
    getState,
    close,
  };
}
