import { GAME_CONFIG } from "./config.js";

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const statusEl = document.getElementById("status");
const jsonBox = document.getElementById("jsonBox");
const inputs = {
  id: document.getElementById("nodeId"),
  label: document.getElementById("nodeLabel"),
  iconId: document.getElementById("nodeIcon"),
  maxCount: document.getElementById("nodeMaxCount"),
  prerequisites: document.getElementById("nodePrereq"),
  grants: document.getElementById("nodeGrants"),
};

let nodes = (GAME_CONFIG.techTree?.nodes || []).map((n) => ({ ...n, position: { x: n.position?.x ?? 0.5, y: n.position?.y ?? 0.5 } }));
let selectedId = nodes[0]?.id ?? null;
let dragId = null;

function resize() {
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
  draw();
}
window.addEventListener("resize", resize);

function getNodeById(id) {
  return nodes.find((n) => n.id === id) || null;
}

function writeSelected() {
  const node = getNodeById(selectedId);
  if (!node) return;
  inputs.id.value = node.id || "";
  inputs.label.value = node.label || "";
  inputs.iconId.value = node.iconId || "";
  inputs.maxCount.value = String(node.maxCount ?? "");
  inputs.prerequisites.value = (node.prerequisites || []).join(",");
  inputs.grants.value = JSON.stringify(node.grants || {}, null, 2);
}

function exportJson() {
  return JSON.stringify({ rootId: GAME_CONFIG.techTree?.rootId || "tower_gun_root", nodes }, null, 2);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  for (const node of nodes) {
    for (const pre of node.prerequisites || []) {
      const parent = byId.get(pre);
      if (!parent) continue;
      ctx.strokeStyle = "#476a90";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(parent.position.x * canvas.width, parent.position.y * canvas.height);
      ctx.lineTo(node.position.x * canvas.width, node.position.y * canvas.height);
      ctx.stroke();
    }
  }

  for (const node of nodes) {
    const x = node.position.x * canvas.width;
    const y = node.position.y * canvas.height;
    const selected = node.id === selectedId;
    ctx.fillStyle = selected ? "#2f8ee0" : "#27425f";
    ctx.strokeStyle = selected ? "#bde6ff" : "#7ea9cf";
    ctx.lineWidth = selected ? 3 : 1.5;
    ctx.beginPath();
    ctx.roundRect(x - 38, y - 22, 76, 44, 10);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#eaf3ff";
    ctx.font = "12px Segoe UI";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(node.label || node.id, x, y);
  }
}

function pickNode(px, py) {
  for (let i = nodes.length - 1; i >= 0; i -= 1) {
    const n = nodes[i];
    const x = n.position.x * canvas.width;
    const y = n.position.y * canvas.height;
    if (Math.abs(px - x) <= 38 && Math.abs(py - y) <= 22) return n;
  }
  return null;
}

canvas.addEventListener("pointerdown", (event) => {
  const node = pickNode(event.offsetX, event.offsetY);
  if (!node) return;
  selectedId = node.id;
  dragId = node.id;
  writeSelected();
  draw();
});
canvas.addEventListener("pointermove", (event) => {
  if (!dragId) return;
  const n = getNodeById(dragId);
  if (!n) return;
  n.position.x = Math.max(0, Math.min(1, event.offsetX / canvas.width));
  n.position.y = Math.max(0, Math.min(1, event.offsetY / canvas.height));
  draw();
});
window.addEventListener("pointerup", () => {
  dragId = null;
});

document.getElementById("addNode").addEventListener("click", () => {
  const id = `node_${Math.random().toString(36).slice(2, 8)}`;
  nodes.push({ id, label: "New Node", iconId: "tower_gun", maxCount: 1, prerequisites: [], grants: {}, position: { x: 0.5, y: 0.5 } });
  selectedId = id;
  writeSelected();
  draw();
});

document.getElementById("deleteNode").addEventListener("click", () => {
  nodes = nodes.filter((n) => n.id !== selectedId);
  for (const n of nodes) {
    n.prerequisites = (n.prerequisites || []).filter((id) => id !== selectedId);
  }
  selectedId = nodes[0]?.id ?? null;
  writeSelected();
  draw();
});

document.getElementById("saveNode").addEventListener("click", () => {
  const node = getNodeById(selectedId);
  if (!node) return;
  node.id = inputs.id.value.trim() || node.id;
  node.label = inputs.label.value.trim() || node.label;
  node.iconId = inputs.iconId.value.trim() || "tower_gun";
  node.maxCount = inputs.maxCount.value.trim() === "" ? null : Number(inputs.maxCount.value);
  node.prerequisites = inputs.prerequisites.value.split(",").map((s) => s.trim()).filter(Boolean);
  try {
    node.grants = JSON.parse(inputs.grants.value || "{}");
  } catch {
    statusEl.textContent = "Invalid grants JSON";
    return;
  }
  selectedId = node.id;
  statusEl.textContent = "Saved.";
  draw();
});

document.getElementById("exportJson").addEventListener("click", () => {
  jsonBox.value = exportJson();
  statusEl.textContent = "Exported.";
});

document.getElementById("importJson").addEventListener("click", () => {
  try {
    const parsed = JSON.parse(jsonBox.value || "{}");
    nodes = Array.isArray(parsed.nodes) ? parsed.nodes : [];
    selectedId = nodes[0]?.id ?? null;
    writeSelected();
    draw();
    statusEl.textContent = "Imported.";
  } catch {
    statusEl.textContent = "Invalid JSON.";
  }
});

writeSelected();
resize();
