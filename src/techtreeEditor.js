import { GAME_CONFIG } from "./config.js";
import { drawIconById } from "./uiOverlay.js";

const EMPTY_GRANTS_JSON = "{}";

function deepClone(value) {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

const techTree = deepClone(GAME_CONFIG.techTree ?? {});
if (!Array.isArray(techTree.nodes)) {
  techTree.nodes = [];
}
if (typeof techTree.rootNodeId !== "string") {
  techTree.rootNodeId = techTree.nodes[0]?.id ?? "";
}
const WORLD_TO_SCREEN_SCALE = Number.isFinite(Number(techTree.worldToScreenScale))
  ? Math.max(0.05, Number(techTree.worldToScreenScale))
  : 0.56;
const NODE_DISPLAY_SIZE = Number.isFinite(Number(techTree.nodeDisplaySize))
  ? Math.max(24, Number(techTree.nodeDisplaySize))
  : 64;
const EDGE_JOINT_HIT_RADIUS_PX = 10;
const EDGE_SEGMENT_HIT_DISTANCE_PX = 8;

const workspaceWrap = document.getElementById("workspace-wrap");
const workspace = document.getElementById("workspace");
const connections = document.getElementById("connections");
const statusEl = document.getElementById("status");
const exportOutputEl = document.getElementById("export-output");
const pillRootEl = document.getElementById("pill-root");
const pillCountEl = document.getElementById("pill-count");
const nodeTooltipEl = document.getElementById("node-tooltip");
const nodeTooltipTitleEl = document.getElementById("node-tooltip-title");
const nodeTooltipMetaEl = document.getElementById("node-tooltip-meta");
const nodeTooltipDescEl = document.getElementById("node-tooltip-desc");

const fieldIdEl = document.getElementById("field-id");
const fieldLabelEl = document.getElementById("field-label");
const fieldDescriptionEl = document.getElementById("field-description");
const fieldIconEl = document.getElementById("field-icon");
const fieldCostEl = document.getElementById("field-cost");
const fieldStartsUnlockedEl = document.getElementById("field-starts-unlocked");
const fieldPosXEl = document.getElementById("field-pos-x");
const fieldPosYEl = document.getElementById("field-pos-y");
const fieldGrantsEl = document.getElementById("field-grants");
const parentsListEl = document.getElementById("parents-list");

const btnResetPanEl = document.getElementById("btn-reset-pan");
const btnCopyEl = document.getElementById("btn-copy");
const btnDownloadEl = document.getElementById("btn-download");

let selectedNodeId = techTree.rootNodeId || (techTree.nodes[0]?.id ?? null);
let panX = 0;
let panY = 0;

let dragState = {
  mode: null,
  pointerId: null,
  nodeId: null,
  edgeKey: null,
  jointIndex: -1,
  lastX: 0,
  lastY: 0,
};
let edgeJointHitPoints = [];
let edgeSegmentHitZones = [];

function hideNodeTooltip() {
  nodeTooltipEl?.classList.add("hidden");
}

function positionNodeTooltip(clientX, clientY) {
  if (!nodeTooltipEl || nodeTooltipEl.classList.contains("hidden")) {
    return;
  }
  const wrapRect = workspaceWrap.getBoundingClientRect();
  const tooltipWidth = nodeTooltipEl.offsetWidth || 220;
  const tooltipHeight = nodeTooltipEl.offsetHeight || 80;
  let left = (clientX - wrapRect.left) + 14;
  let top = (clientY - wrapRect.top) + 14;
  left = clamp(left, 8, Math.max(8, wrapRect.width - tooltipWidth - 8));
  top = clamp(top, 8, Math.max(8, wrapRect.height - tooltipHeight - 8));
  nodeTooltipEl.style.left = `${left}px`;
  nodeTooltipEl.style.top = `${top}px`;
}

function showNodeTooltip(node, clientX, clientY) {
  if (!nodeTooltipEl || !node) {
    return;
  }
  const label = typeof node.label === "string" && node.label.length > 0 ? node.label : node.id;
  const description = typeof node.description === "string" ? node.description : "";
  const startsUnlocked = node.startsUnlocked === true ? "yes" : "no";
  nodeTooltipTitleEl.textContent = label || "(untitled)";
  nodeTooltipMetaEl.textContent = `${node.id} | cost ${Math.max(0, Number(node.cost) || 0)} | starts unlocked: ${startsUnlocked}`;
  nodeTooltipDescEl.textContent = description || "No description";
  nodeTooltipEl.classList.remove("hidden");
  positionNodeTooltip(clientX, clientY);
}

function setStatus(text, kind = "info") {
  statusEl.textContent = text;
  if (kind === "error") {
    statusEl.style.color = "#ffb1b1";
  } else if (kind === "ok") {
    statusEl.style.color = "#9df3c2";
  } else {
    statusEl.style.color = "#9db7d1";
  }
}

function getNodeById(nodeId) {
  return techTree.nodes.find((node) => node?.id === nodeId) ?? null;
}

function getEdgeKey(fromNodeId, toNodeId) {
  return `${fromNodeId}->${toNodeId}`;
}

function ensureEdgeJointsObject() {
  if (!techTree.edgeJoints || typeof techTree.edgeJoints !== "object" || Array.isArray(techTree.edgeJoints)) {
    techTree.edgeJoints = {};
  }
}

function getEdgeJointList(edgeKey, createIfMissing = false) {
  ensureEdgeJointsObject();
  const existing = techTree.edgeJoints[edgeKey];
  if (!Array.isArray(existing)) {
    if (!createIfMissing) {
      return [];
    }
    techTree.edgeJoints[edgeKey] = [];
    return techTree.edgeJoints[edgeKey];
  }
  return existing;
}

function normalizeEdgeJointEntry(entry) {
  const x = Number(entry?.x);
  const y = Number(entry?.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    return null;
  }
  return { x, y };
}

function pruneAndNormalizeEdgeJoints() {
  ensureEdgeJointsObject();
  const validEdgeKeys = new Set();
  for (const node of techTree.nodes) {
    if (!node || !Array.isArray(node.parents)) {
      continue;
    }
    for (const parentId of node.parents) {
      if (!getNodeById(parentId)) {
        continue;
      }
      validEdgeKeys.add(getEdgeKey(parentId, node.id));
    }
  }

  for (const [edgeKey, rawJointList] of Object.entries(techTree.edgeJoints)) {
    if (!validEdgeKeys.has(edgeKey) || !Array.isArray(rawJointList)) {
      delete techTree.edgeJoints[edgeKey];
      continue;
    }
    const normalizedList = rawJointList
      .map((entry) => normalizeEdgeJointEntry(entry))
      .filter((entry) => !!entry);
    if (normalizedList.length > 0) {
      techTree.edgeJoints[edgeKey] = normalizedList;
    } else {
      delete techTree.edgeJoints[edgeKey];
    }
  }
}

function ensureSelectedNode() {
  if (selectedNodeId && getNodeById(selectedNodeId)) {
    return;
  }
  selectedNodeId = techTree.nodes[0]?.id ?? null;
}

function clientToWorld(clientX, clientY) {
  const rect = workspaceWrap.getBoundingClientRect();
  return {
    x: (clientX - rect.left - (rect.width * 0.5) - panX) / WORLD_TO_SCREEN_SCALE,
    y: (clientY - rect.top - (rect.height * 0.5) - panY) / WORLD_TO_SCREEN_SCALE,
  };
}

function worldToScreen(position) {
  const rect = workspaceWrap.getBoundingClientRect();
  return {
    x: (rect.width * 0.5) + panX + ((Number(position?.x) || 0) * WORLD_TO_SCREEN_SCALE),
    y: (rect.height * 0.5) + panY + ((Number(position?.y) || 0) * WORLD_TO_SCREEN_SCALE),
  };
}

function screenToWorldDelta(dx, dy) {
  return {
    x: dx / WORLD_TO_SCREEN_SCALE,
    y: dy / WORLD_TO_SCREEN_SCALE,
  };
}

function createNodeIconCanvas(iconId) {
  const canvas = document.createElement("canvas");
  canvas.className = "node-icon";
  const pixelRatio = clamp(window.devicePixelRatio || 1, 1, 2);
  const drawSize = Math.max(8, NODE_DISPLAY_SIZE - 12);
  canvas.width = Math.max(1, Math.floor(drawSize * pixelRatio));
  canvas.height = Math.max(1, Math.floor(drawSize * pixelRatio));
  canvas.style.width = `${drawSize}px`;
  canvas.style.height = `${drawSize}px`;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, drawSize, drawSize);
    drawIconById(ctx, iconId, 0, 0, drawSize);
  }
  return canvas;
}

function hitTestEdgeJoint(clientX, clientY) {
  const rect = workspaceWrap.getBoundingClientRect();
  const screenX = clientX - rect.left;
  const screenY = clientY - rect.top;
  let bestHit = null;
  let bestDistanceSq = Number.POSITIVE_INFINITY;
  const maxDistanceSq = EDGE_JOINT_HIT_RADIUS_PX * EDGE_JOINT_HIT_RADIUS_PX;

  for (const jointHit of edgeJointHitPoints) {
    const dx = screenX - jointHit.x;
    const dy = screenY - jointHit.y;
    const distanceSq = (dx * dx) + (dy * dy);
    if (distanceSq > maxDistanceSq || distanceSq >= bestDistanceSq) {
      continue;
    }
    bestDistanceSq = distanceSq;
    bestHit = jointHit;
  }
  return bestHit;
}

function getPointToSegmentDistanceSq(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;
  const abLenSq = (abx * abx) + (aby * aby);
  if (abLenSq <= 1e-8) {
    return (apx * apx) + (apy * apy);
  }
  const t = clamp(((apx * abx) + (apy * aby)) / abLenSq, 0, 1);
  const cx = ax + (abx * t);
  const cy = ay + (aby * t);
  const dx = px - cx;
  const dy = py - cy;
  return (dx * dx) + (dy * dy);
}

function hitTestEdgeSegment(clientX, clientY) {
  const rect = workspaceWrap.getBoundingClientRect();
  const screenX = clientX - rect.left;
  const screenY = clientY - rect.top;
  let bestHit = null;
  let bestDistanceSq = Number.POSITIVE_INFINITY;
  const maxDistanceSq = EDGE_SEGMENT_HIT_DISTANCE_PX * EDGE_SEGMENT_HIT_DISTANCE_PX;

  for (const segment of edgeSegmentHitZones) {
    const distanceSq = getPointToSegmentDistanceSq(
      screenX,
      screenY,
      segment.x1,
      segment.y1,
      segment.x2,
      segment.y2
    );
    if (distanceSq > maxDistanceSq || distanceSq >= bestDistanceSq) {
      continue;
    }
    bestDistanceSq = distanceSq;
    bestHit = segment;
  }
  return bestHit;
}

function removeEdgeJoint(edgeKey, jointIndex) {
  const jointList = getEdgeJointList(edgeKey, false);
  if (jointIndex < 0 || jointIndex >= jointList.length) {
    return false;
  }
  jointList.splice(jointIndex, 1);
  if (jointList.length <= 0) {
    ensureEdgeJointsObject();
    delete techTree.edgeJoints[edgeKey];
  }
  return true;
}

function addEdgeJointAtSegment(edgeKey, segmentIndex, clientX, clientY) {
  const worldPoint = clientToWorld(clientX, clientY);
  const jointList = getEdgeJointList(edgeKey, true);
  const insertIndex = clamp(Math.floor(Number(segmentIndex) || 0), 0, jointList.length);
  jointList.splice(insertIndex, 0, {
    x: worldPoint.x,
    y: worldPoint.y,
  });
  return true;
}

function normalizeNode(node) {
  if (!node || typeof node !== "object") {
    return;
  }
  node.id = typeof node.id === "string" ? node.id : "";
  node.label = typeof node.label === "string" ? node.label : node.id;
  node.description = typeof node.description === "string" ? node.description : "";
  node.iconId = typeof node.iconId === "string" ? node.iconId : "tower_gun";
  node.cost = Math.max(0, Math.floor(Number(node.cost) || 0));
  node.startsUnlocked = node.startsUnlocked === true;
  if (!node.position || typeof node.position !== "object") {
    node.position = { x: 0, y: 0 };
  }
  node.position.x = Number.isFinite(Number(node.position.x)) ? Number(node.position.x) : 0;
  node.position.y = Number.isFinite(Number(node.position.y)) ? Number(node.position.y) : 0;
  if (!Array.isArray(node.parents)) {
    node.parents = [];
  }
  node.parents = node.parents.filter((parentId) => typeof parentId === "string" && parentId.length > 0);
  if (!node.grants || typeof node.grants !== "object") {
    node.grants = {};
  }
}

function dedupeNodeIds() {
  const seen = new Set();
  for (const node of techTree.nodes) {
    normalizeNode(node);
    if (!node.id) {
      continue;
    }
    if (seen.has(node.id)) {
      node.id = `${node.id}_${Math.floor(Math.random() * 100000)}`;
    }
    seen.add(node.id);
  }
}

function getExportPayload() {
  return JSON.stringify(techTree, null, 2);
}

function updateExportOutput() {
  exportOutputEl.value = getExportPayload();
}

function updateInspector() {
  ensureSelectedNode();
  const selected = getNodeById(selectedNodeId);
  if (!selected) {
    fieldIdEl.value = "";
    fieldLabelEl.value = "";
    fieldDescriptionEl.value = "";
    fieldIconEl.value = "";
    fieldCostEl.value = "0";
    fieldStartsUnlockedEl.value = "false";
    fieldPosXEl.value = "0";
    fieldPosYEl.value = "0";
    fieldGrantsEl.value = EMPTY_GRANTS_JSON;
    parentsListEl.innerHTML = "";
    return;
  }

  fieldIdEl.value = selected.id;
  fieldLabelEl.value = selected.label;
  fieldDescriptionEl.value = selected.description;
  fieldIconEl.value = selected.iconId;
  fieldCostEl.value = String(selected.cost);
  fieldStartsUnlockedEl.value = selected.startsUnlocked ? "true" : "false";
  fieldPosXEl.value = String(selected.position.x);
  fieldPosYEl.value = String(selected.position.y);
  fieldGrantsEl.value = JSON.stringify(selected.grants ?? {}, null, 2);

  parentsListEl.innerHTML = "";
  for (const node of techTree.nodes) {
    if (!node || node.id === selected.id || !node.id) {
      continue;
    }
    const row = document.createElement("label");
    row.className = "parent-item";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = selected.parents.includes(node.id);
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        if (!selected.parents.includes(node.id)) {
          selected.parents.push(node.id);
        }
      } else {
        selected.parents = selected.parents.filter((parentId) => parentId !== node.id);
      }
      render();
    });

    const labelText = document.createElement("span");
    labelText.textContent = `${node.label} (${node.id})`;

    row.appendChild(checkbox);
    row.appendChild(labelText);
    parentsListEl.appendChild(row);
  }
}

function render() {
  dedupeNodeIds();
  pruneAndNormalizeEdgeJoints();
  ensureSelectedNode();
  hideNodeTooltip();

  workspace.innerHTML = "";
  connections.innerHTML = "";
  edgeJointHitPoints = [];
  edgeSegmentHitZones = [];

  const rect = workspaceWrap.getBoundingClientRect();
  connections.setAttribute("viewBox", `0 0 ${Math.max(1, rect.width)} ${Math.max(1, rect.height)}`);
  connections.setAttribute("width", String(Math.max(1, rect.width)));
  connections.setAttribute("height", String(Math.max(1, rect.height)));

  const centersById = new Map();
  for (const node of techTree.nodes) {
    const center = worldToScreen(node.position);
    centersById.set(node.id, center);
  }

  for (const node of techTree.nodes) {
    if (!Array.isArray(node.parents)) {
      continue;
    }
    const toCenter = centersById.get(node.id);
    if (!toCenter) {
      continue;
    }
    for (const parentId of node.parents) {
      const fromCenter = centersById.get(parentId);
      if (!fromCenter) {
        continue;
      }
      const edgeKey = getEdgeKey(parentId, node.id);
      const jointList = getEdgeJointList(edgeKey, false);
      const jointScreenPoints = jointList.map((joint) => worldToScreen(joint));
      const pathPoints = [fromCenter, ...jointScreenPoints, toCenter];

      for (let i = 0; i < pathPoints.length - 1; i += 1) {
        const a = pathPoints[i];
        const b = pathPoints[i + 1];
        const segmentLine = document.createElementNS("http://www.w3.org/2000/svg", "line");
        segmentLine.setAttribute("x1", String(a.x));
        segmentLine.setAttribute("y1", String(a.y));
        segmentLine.setAttribute("x2", String(b.x));
        segmentLine.setAttribute("y2", String(b.y));
        segmentLine.setAttribute("stroke", "rgba(147, 191, 231, 0.62)");
        segmentLine.setAttribute("stroke-width", "2");
        connections.appendChild(segmentLine);
        edgeSegmentHitZones.push({
          edgeKey,
          segmentIndex: i,
          x1: a.x,
          y1: a.y,
          x2: b.x,
          y2: b.y,
        });
      }

      for (let jointIndex = 0; jointIndex < jointScreenPoints.length; jointIndex += 1) {
        const jointPoint = jointScreenPoints[jointIndex];
        const jointCircle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        jointCircle.setAttribute("cx", String(jointPoint.x));
        jointCircle.setAttribute("cy", String(jointPoint.y));
        jointCircle.setAttribute("r", "4.5");
        jointCircle.setAttribute("fill", "rgba(173, 224, 255, 0.95)");
        jointCircle.setAttribute("stroke", "rgba(58, 107, 152, 0.95)");
        jointCircle.setAttribute("stroke-width", "1.2");
        connections.appendChild(jointCircle);
        edgeJointHitPoints.push({
          edgeKey,
          jointIndex,
          x: jointPoint.x,
          y: jointPoint.y,
        });
      }
    }
  }

  for (const node of techTree.nodes) {
    const center = centersById.get(node.id) ?? { x: 0, y: 0 };
    const card = document.createElement("div");
    card.className = `node-card${node.id === selectedNodeId ? " selected" : ""}`;
    card.style.width = `${NODE_DISPLAY_SIZE}px`;
    card.style.height = `${NODE_DISPLAY_SIZE}px`;
    card.style.minHeight = `${NODE_DISPLAY_SIZE}px`;
    card.style.left = `${center.x}px`;
    card.style.top = `${center.y}px`;
    card.appendChild(createNodeIconCanvas(node.iconId));

    card.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      hideNodeTooltip();
      selectedNodeId = node.id;
      dragState = {
        mode: "node",
        pointerId: event.pointerId,
        nodeId: node.id,
        lastX: event.clientX,
        lastY: event.clientY,
      };
      card.setPointerCapture?.(event.pointerId);
      render();
    });
    card.addEventListener("pointerenter", (event) => {
      showNodeTooltip(node, event.clientX, event.clientY);
    });
    card.addEventListener("pointermove", (event) => {
      if (dragState.mode === "node" && dragState.nodeId === node.id) {
        hideNodeTooltip();
        return;
      }
      showNodeTooltip(node, event.clientX, event.clientY);
    });
    card.addEventListener("pointerleave", () => {
      hideNodeTooltip();
    });

    workspace.appendChild(card);
  }

  pillRootEl.textContent = `Root: ${techTree.rootNodeId || "-"}`;
  pillCountEl.textContent = `Nodes: ${techTree.nodes.length}`;
  updateInspector();
  updateExportOutput();
}

function onPointerMove(event) {
  if (!dragState.mode || dragState.pointerId !== event.pointerId) {
    positionNodeTooltip(event.clientX, event.clientY);
    return;
  }
  const dx = event.clientX - dragState.lastX;
  const dy = event.clientY - dragState.lastY;
  dragState.lastX = event.clientX;
  dragState.lastY = event.clientY;

  if (dragState.mode === "pan") {
    hideNodeTooltip();
    panX += dx;
    panY += dy;
    render();
    return;
  }

  if (dragState.mode === "node") {
    hideNodeTooltip();
    const node = getNodeById(dragState.nodeId);
    if (!node) {
      return;
    }
    const worldDelta = screenToWorldDelta(dx, dy);
    node.position.x += worldDelta.x;
    node.position.y += worldDelta.y;
    if (node.id === selectedNodeId) {
      fieldPosXEl.value = String(Math.round(node.position.x));
      fieldPosYEl.value = String(Math.round(node.position.y));
    }
    render();
    return;
  }

  if (dragState.mode === "joint") {
    hideNodeTooltip();
    const jointList = getEdgeJointList(dragState.edgeKey, false);
    if (dragState.jointIndex < 0 || dragState.jointIndex >= jointList.length) {
      return;
    }
    const worldDelta = screenToWorldDelta(dx, dy);
    jointList[dragState.jointIndex].x += worldDelta.x;
    jointList[dragState.jointIndex].y += worldDelta.y;
    render();
  }
}

function onPointerUp(event) {
  if (!dragState.mode || dragState.pointerId !== event.pointerId) {
    return;
  }
  dragState = {
    mode: null,
    pointerId: null,
    nodeId: null,
    edgeKey: null,
    jointIndex: -1,
    lastX: 0,
    lastY: 0,
  };
  workspace.classList.remove("panning");
}

workspace.addEventListener("pointerdown", (event) => {
  if (event.target !== workspace) {
    return;
  }
  const jointHit = hitTestEdgeJoint(event.clientX, event.clientY);
  if (jointHit) {
    hideNodeTooltip();
    dragState = {
      mode: "joint",
      pointerId: event.pointerId,
      nodeId: null,
      edgeKey: jointHit.edgeKey,
      jointIndex: jointHit.jointIndex,
      lastX: event.clientX,
      lastY: event.clientY,
    };
    workspace.setPointerCapture?.(event.pointerId);
    return;
  }
  hideNodeTooltip();
  dragState = {
    mode: "pan",
    pointerId: event.pointerId,
    nodeId: null,
    edgeKey: null,
    jointIndex: -1,
    lastX: event.clientX,
    lastY: event.clientY,
  };
  workspace.classList.add("panning");
  workspace.setPointerCapture?.(event.pointerId);
});

workspace.addEventListener("dblclick", (event) => {
  if (event.target !== workspace) {
    return;
  }
  const jointHit = hitTestEdgeJoint(event.clientX, event.clientY);
  if (jointHit) {
    const removed = removeEdgeJoint(jointHit.edgeKey, jointHit.jointIndex);
    if (removed) {
      setStatus("Joint removed.", "ok");
      render();
    }
    event.preventDefault();
    return;
  }

  const segmentHit = hitTestEdgeSegment(event.clientX, event.clientY);
  if (!segmentHit) {
    return;
  }
  addEdgeJointAtSegment(
    segmentHit.edgeKey,
    segmentHit.segmentIndex,
    event.clientX,
    event.clientY
  );
  setStatus("Joint added.", "ok");
  render();
  event.preventDefault();
});

window.addEventListener("pointermove", onPointerMove, { passive: true });
window.addEventListener("pointerup", onPointerUp, { passive: true });
window.addEventListener("pointercancel", onPointerUp, { passive: true });
window.addEventListener("resize", () => {
  hideNodeTooltip();
  render();
});

fieldIdEl.addEventListener("change", () => {
  const selected = getNodeById(selectedNodeId);
  if (!selected) {
    return;
  }
  const nextId = fieldIdEl.value.trim();
  if (!nextId) {
    setStatus("Node id cannot be empty.", "error");
    fieldIdEl.value = selected.id;
    return;
  }
  if (nextId !== selected.id && getNodeById(nextId)) {
    setStatus("Node id already exists.", "error");
    fieldIdEl.value = selected.id;
    return;
  }
  const previousId = selected.id;
  selected.id = nextId;
  if (techTree.rootNodeId === previousId) {
    techTree.rootNodeId = nextId;
  }
  for (const node of techTree.nodes) {
    if (!Array.isArray(node.parents)) {
      continue;
    }
    node.parents = node.parents.map((parentId) => (parentId === previousId ? nextId : parentId));
  }
  selectedNodeId = nextId;
  setStatus("Node id updated.", "ok");
  render();
});

fieldLabelEl.addEventListener("input", () => {
  const selected = getNodeById(selectedNodeId);
  if (!selected) {
    return;
  }
  selected.label = fieldLabelEl.value;
  render();
});

fieldDescriptionEl.addEventListener("input", () => {
  const selected = getNodeById(selectedNodeId);
  if (!selected) {
    return;
  }
  selected.description = fieldDescriptionEl.value;
  render();
});

fieldIconEl.addEventListener("input", () => {
  const selected = getNodeById(selectedNodeId);
  if (!selected) {
    return;
  }
  selected.iconId = fieldIconEl.value;
  render();
});

fieldCostEl.addEventListener("input", () => {
  const selected = getNodeById(selectedNodeId);
  if (!selected) {
    return;
  }
  selected.cost = Math.max(0, Math.floor(Number(fieldCostEl.value) || 0));
  render();
});

fieldStartsUnlockedEl.addEventListener("change", () => {
  const selected = getNodeById(selectedNodeId);
  if (!selected) {
    return;
  }
  selected.startsUnlocked = fieldStartsUnlockedEl.value === "true";
  render();
});

fieldPosXEl.addEventListener("input", () => {
  const selected = getNodeById(selectedNodeId);
  if (!selected) {
    return;
  }
  selected.position.x = Number.isFinite(Number(fieldPosXEl.value)) ? Number(fieldPosXEl.value) : 0;
  render();
});

fieldPosYEl.addEventListener("input", () => {
  const selected = getNodeById(selectedNodeId);
  if (!selected) {
    return;
  }
  selected.position.y = Number.isFinite(Number(fieldPosYEl.value)) ? Number(fieldPosYEl.value) : 0;
  render();
});

fieldGrantsEl.addEventListener("change", () => {
  const selected = getNodeById(selectedNodeId);
  if (!selected) {
    return;
  }
  try {
    const parsed = JSON.parse(fieldGrantsEl.value || EMPTY_GRANTS_JSON);
    if (!parsed || typeof parsed !== "object") {
      throw new Error("Grants must be a JSON object.");
    }
    selected.grants = parsed;
    setStatus("Grants JSON updated.", "ok");
    render();
  } catch (error) {
    setStatus(`Invalid grants JSON: ${error.message}`, "error");
    fieldGrantsEl.value = JSON.stringify(selected.grants ?? {}, null, 2);
  }
});

btnResetPanEl.addEventListener("click", () => {
  panX = 0;
  panY = 0;
  setStatus("View reset.", "ok");
  render();
});

btnCopyEl.addEventListener("click", async () => {
  const payload = getExportPayload();
  try {
    await navigator.clipboard.writeText(payload);
    setStatus("Copied tech tree JSON to clipboard.", "ok");
  } catch (error) {
    setStatus("Clipboard copy failed in this browser context.", "error");
  }
});

btnDownloadEl.addEventListener("click", () => {
  const blob = new Blob([getExportPayload()], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "techTree.json";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
  setStatus("Downloaded techTree.json.", "ok");
});

if (!techTree.rootNodeId && techTree.nodes.length > 0) {
  techTree.rootNodeId = techTree.nodes[0].id;
}

render();
setStatus("Tech tree ready.");
