import * as THREE from "three";

const FONT_STACK = "\"Segoe UI\", sans-serif";

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function roundedRectPath(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width * 0.5, height * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function drawPanel(ctx, x, y, width, height, radius, fillStyle, strokeStyle, lineWidth = 1) {
  roundedRectPath(ctx, x, y, width, height, radius);
  ctx.fillStyle = fillStyle;
  ctx.fill();
  if (strokeStyle) {
    ctx.lineWidth = lineWidth;
    ctx.strokeStyle = strokeStyle;
    ctx.stroke();
  }
}

function fillPath(ctx, points, fillStyle, strokeStyle = null, lineWidth = 1) {
  if (!Array.isArray(points) || points.length < 3) {
    return;
  }

  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i += 1) {
    ctx.lineTo(points[i][0], points[i][1]);
  }
  ctx.closePath();
  ctx.fillStyle = fillStyle;
  ctx.fill();

  if (strokeStyle) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

function drawTowerBaseIcon(ctx, x, y, size) {
  const cx = x + size * 0.5;
  const top = [cx, y + size * 0.13];
  const leftTop = [x + size * 0.24, y + size * 0.29];
  const rightTop = [x + size * 0.76, y + size * 0.29];
  const center = [cx, y + size * 0.45];
  const leftBottom = [x + size * 0.24, y + size * 0.67];
  const rightBottom = [x + size * 0.76, y + size * 0.67];
  const bottom = [cx, y + size * 0.84];

  fillPath(
    ctx,
    [top, rightTop, center, leftTop],
    "rgba(163, 236, 255, 0.88)",
    "rgba(193, 246, 255, 0.95)",
    Math.max(1.2, size * 0.04)
  );
  fillPath(
    ctx,
    [leftTop, center, bottom, leftBottom],
    "rgba(72, 124, 164, 0.92)",
    "rgba(161, 220, 255, 0.86)",
    Math.max(1.1, size * 0.035)
  );
  fillPath(
    ctx,
    [center, rightTop, rightBottom, bottom],
    "rgba(56, 100, 137, 0.95)",
    "rgba(139, 208, 246, 0.84)",
    Math.max(1.1, size * 0.035)
  );

  const ringW = size * 0.32;
  const ringH = size * 0.2;
  ctx.strokeStyle = "rgba(120, 255, 236, 0.95)";
  ctx.lineWidth = Math.max(1.4, size * 0.045);
  ctx.beginPath();
  ctx.ellipse(cx, y + size * 0.48, ringW * 0.5, ringH * 0.5, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = "rgba(194, 247, 255, 0.65)";
  ctx.lineWidth = Math.max(1, size * 0.03);
  ctx.beginPath();
  ctx.moveTo(top[0], top[1]);
  ctx.lineTo(center[0], center[1]);
  ctx.lineTo(bottom[0], bottom[1]);
  ctx.moveTo(leftTop[0], leftTop[1]);
  ctx.lineTo(leftBottom[0], leftBottom[1]);
  ctx.moveTo(rightTop[0], rightTop[1]);
  ctx.lineTo(rightBottom[0], rightBottom[1]);
  ctx.stroke();
}

function drawIconTowerLaser(ctx, x, y, size) {
  drawTowerBaseIcon(ctx, x, y, size);
}

function drawIconTowerEmp(ctx, x, y, size) {
  const cx = x + size * 0.5;
  const cy = y + size * 0.5;
  const r = size * 0.25;

  const gradient = ctx.createRadialGradient(
    cx - r * 0.35, cy - r * 0.35, r * 0.2,
    cx, cy, r * 1.3
  );
  gradient.addColorStop(0, "rgba(186, 249, 255, 0.98)");
  gradient.addColorStop(1, "rgba(80, 150, 201, 0.92)");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(118, 255, 236, 0.95)";
  ctx.lineWidth = Math.max(1.3, size * 0.05);
  ctx.beginPath();
  ctx.ellipse(cx, cy, r * 1.58, r * 0.65, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = "rgba(130, 216, 255, 0.78)";
  ctx.lineWidth = Math.max(1, size * 0.035);
  ctx.beginPath();
  ctx.ellipse(cx, cy, r * 1.1, r * 0.42, Math.PI * 0.5, 0, Math.PI * 2);
  ctx.stroke();
}

function drawIconTowerDamage(ctx, x, y, size) {
  drawTowerBaseIcon(ctx, x, y, size);
  const burstCx = x + size * 0.78;
  const burstCy = y + size * 0.28;
  const r = size * 0.12;
  ctx.fillStyle = "rgba(255, 151, 118, 0.95)";
  ctx.beginPath();
  for (let i = 0; i < 8; i += 1) {
    const angle = (Math.PI * 2 * i) / 8;
    const radius = i % 2 === 0 ? r : r * 0.52;
    const px = burstCx + Math.cos(angle) * radius;
    const py = burstCy + Math.sin(angle) * radius;
    if (i === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }
  ctx.closePath();
  ctx.fill();
}

function drawIconPlayerDamage(ctx, x, y, size) {
  const cx = x + size * 0.5;
  const cy = y + size * 0.5;
  const r = size * 0.28;
  ctx.strokeStyle = "rgba(190, 240, 255, 0.92)";
  ctx.lineWidth = Math.max(1.5, size * 0.06);
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx - r * 1.35, cy);
  ctx.lineTo(cx + r * 1.35, cy);
  ctx.moveTo(cx, cy - r * 1.35);
  ctx.lineTo(cx, cy + r * 1.35);
  ctx.stroke();

  ctx.fillStyle = "rgba(255, 170, 88, 0.95)";
  ctx.beginPath();
  ctx.moveTo(x + size * 0.64, y + size * 0.08);
  ctx.lineTo(x + size * 0.52, y + size * 0.38);
  ctx.lineTo(x + size * 0.68, y + size * 0.38);
  ctx.lineTo(x + size * 0.44, y + size * 0.9);
  ctx.lineTo(x + size * 0.5, y + size * 0.55);
  ctx.lineTo(x + size * 0.34, y + size * 0.55);
  ctx.closePath();
  ctx.fill();
}

function drawIconEnemySlow(ctx, x, y, size) {
  const bodySize = size * 0.48;
  drawPanel(
    ctx,
    x + size * 0.08,
    y + size * 0.26,
    bodySize,
    bodySize,
    size * 0.08,
    "rgba(112, 155, 193, 0.4)",
    "rgba(177, 226, 255, 0.95)",
    Math.max(1.5, size * 0.06)
  );

  const cx = x + size * 0.74;
  const cy = y + size * 0.32;
  const arm = size * 0.14;
  ctx.strokeStyle = "rgba(191, 255, 249, 0.95)";
  ctx.lineWidth = Math.max(1.5, size * 0.05);
  for (let i = 0; i < 6; i += 1) {
    const angle = (Math.PI * i) / 3;
    const dx = Math.cos(angle) * arm;
    const dy = Math.sin(angle) * arm;
    ctx.beginPath();
    ctx.moveTo(cx - dx, cy - dy);
    ctx.lineTo(cx + dx, cy + dy);
    ctx.stroke();
  }
}

function drawIconTowerFireRate(ctx, x, y, size) {
  drawTowerBaseIcon(ctx, x, y, size);
  const cx = x + size * 0.5;
  const cy = y + size * 0.5;
  const r = size * 0.35;
  ctx.strokeStyle = "rgba(169, 255, 221, 0.98)";
  ctx.lineWidth = Math.max(1.5, size * 0.055);
  ctx.beginPath();
  ctx.arc(cx, cy, r, Math.PI * 0.2, Math.PI * 1.2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.74, Math.PI * 1.22, Math.PI * 2.15);
  ctx.stroke();

  ctx.fillStyle = "rgba(169, 255, 221, 0.98)";
  ctx.beginPath();
  ctx.moveTo(cx + r * 0.98, cy - r * 0.1);
  ctx.lineTo(cx + r * 0.74, cy - r * 0.16);
  ctx.lineTo(cx + r * 0.82, cy + r * 0.05);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx - r * 0.52, cy + r * 0.75);
  ctx.lineTo(cx - r * 0.42, cy + r * 0.48);
  ctx.lineTo(cx - r * 0.68, cy + r * 0.58);
  ctx.closePath();
  ctx.fill();
}

function drawIconPlayerFireRate(ctx, x, y, size) {
  ctx.strokeStyle = "rgba(189, 235, 255, 0.95)";
  ctx.lineWidth = Math.max(1.5, size * 0.07);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x + size * 0.14, y + size * 0.58);
  ctx.lineTo(x + size * 0.52, y + size * 0.58);
  ctx.moveTo(x + size * 0.52, y + size * 0.5);
  ctx.lineTo(x + size * 0.68, y + size * 0.5);
  ctx.stroke();

  ctx.fillStyle = "rgba(122, 255, 219, 0.95)";
  ctx.beginPath();
  ctx.moveTo(x + size * 0.68, y + size * 0.42);
  ctx.lineTo(x + size * 0.88, y + size * 0.5);
  ctx.lineTo(x + size * 0.68, y + size * 0.58);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(150, 255, 223, 0.92)";
  ctx.lineWidth = Math.max(1.5, size * 0.045);
  ctx.beginPath();
  ctx.moveTo(x + size * 0.16, y + size * 0.34);
  ctx.lineTo(x + size * 0.34, y + size * 0.34);
  ctx.moveTo(x + size * 0.1, y + size * 0.72);
  ctx.lineTo(x + size * 0.3, y + size * 0.72);
  ctx.stroke();
}

function drawIconDefault(ctx, x, y, size) {
  drawTowerBaseIcon(ctx, x, y, size);
}

function drawIconById(ctx, iconId, x, y, size) {
  switch (iconId) {
    case "tower_laser_add":
      drawIconTowerLaser(ctx, x, y, size);
      return;
    case "tower_laser":
      drawIconTowerLaser(ctx, x, y, size);
      return;
    case "tower_emp_add":
      drawIconTowerEmp(ctx, x, y, size);
      return;
    case "tower_emp":
      drawIconTowerEmp(ctx, x, y, size);
      return;
    case "tower_damage":
      drawIconTowerDamage(ctx, x, y, size);
      return;
    case "player_damage":
      drawIconPlayerDamage(ctx, x, y, size);
      return;
    case "enemy_slow":
      drawIconEnemySlow(ctx, x, y, size);
      return;
    case "tower_fire_rate":
      drawIconTowerFireRate(ctx, x, y, size);
      return;
    case "player_fire_rate":
      drawIconPlayerFireRate(ctx, x, y, size);
      return;
    default:
      drawIconDefault(ctx, x, y, size);
  }
}

function normalizeTowerInventory(inputInventory) {
  if (!Array.isArray(inputInventory)) {
    return [];
  }

  return inputInventory.map((entry) => ({
    type: entry?.type || "unknown",
    label: entry?.label || entry?.type || "Tower",
    iconId: entry?.iconId || "tower_laser",
    hotkey: entry?.hotkey || "",
    remaining: Math.max(0, Math.floor(entry?.remaining || 0)),
  }));
}

export function createUiOverlay({ width, height, maxPixelRatio = 2 }) {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const drawCanvas = document.createElement("canvas");
  const drawCtx = drawCanvas.getContext("2d");

  const texture = new THREE.CanvasTexture(drawCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;

  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  material.toneMapped = false;
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  quad.renderOrder = 9999;
  scene.add(quad);

  let viewportWidth = Math.max(1, Math.floor(width));
  let viewportHeight = Math.max(1, Math.floor(height));
  let pixelRatio = 1;

  const state = {
    menuOpen: false,
    menuOptions: [],
    hoveredMenuIndex: -1,
    menuCursorX: viewportWidth * 0.5,
    menuCursorY: viewportHeight * 0.5,
    menuCursorVisible: false,
    showCrosshair: true,
    jetpackFuelRatio: 1,
    towerInventory: [],
    selectedTowerType: null,
    buildMode: false,
    showKeyboardHints: true,
  };

  let menuOptionRects = [];
  let towerSlotRects = [];

  function resize(nextWidth, nextHeight) {
    viewportWidth = Math.max(1, Math.floor(nextWidth));
    viewportHeight = Math.max(1, Math.floor(nextHeight));
    pixelRatio = clamp(window.devicePixelRatio || 1, 1, maxPixelRatio);
    drawCanvas.width = Math.max(1, Math.floor(viewportWidth * pixelRatio));
    drawCanvas.height = Math.max(1, Math.floor(viewportHeight * pixelRatio));
    state.menuCursorX = clamp(state.menuCursorX, 0, viewportWidth);
    state.menuCursorY = clamp(state.menuCursorY, 0, viewportHeight);
    texture.needsUpdate = true;
  }

  function setState(partialState) {
    if (!partialState || typeof partialState !== "object") {
      return;
    }

    if (typeof partialState.menuOpen === "boolean") {
      state.menuOpen = partialState.menuOpen;
    }
    if (Array.isArray(partialState.menuOptions)) {
      state.menuOptions = partialState.menuOptions.slice(0, 3);
    }
    if (typeof partialState.hoveredMenuIndex === "number") {
      state.hoveredMenuIndex = partialState.hoveredMenuIndex;
    }
    if (typeof partialState.menuCursorX === "number") {
      state.menuCursorX = clamp(partialState.menuCursorX, 0, viewportWidth);
    }
    if (typeof partialState.menuCursorY === "number") {
      state.menuCursorY = clamp(partialState.menuCursorY, 0, viewportHeight);
    }
    if (typeof partialState.menuCursorVisible === "boolean") {
      state.menuCursorVisible = partialState.menuCursorVisible;
    }
    if (typeof partialState.showCrosshair === "boolean") {
      state.showCrosshair = partialState.showCrosshair;
    }
    if (typeof partialState.jetpackFuelRatio === "number") {
      state.jetpackFuelRatio = clamp(partialState.jetpackFuelRatio, 0, 1);
    }
    if (Array.isArray(partialState.towerInventory)) {
      state.towerInventory = normalizeTowerInventory(partialState.towerInventory);
    }
    if (Object.prototype.hasOwnProperty.call(partialState, "selectedTowerType")) {
      state.selectedTowerType = partialState.selectedTowerType || null;
    }
    if (typeof partialState.buildMode === "boolean") {
      state.buildMode = partialState.buildMode;
    }
    if (typeof partialState.showKeyboardHints === "boolean") {
      state.showKeyboardHints = partialState.showKeyboardHints;
    }
  }

  function drawCrosshair() {
    if (!state.showCrosshair) {
      return;
    }

    const cx = viewportWidth * 0.5;
    const cy = viewportHeight * 0.5;
    const arm = clamp(Math.min(viewportWidth, viewportHeight) * 0.012, 6, 11);
    const gap = clamp(arm * 0.45, 3, 5);

    drawCtx.strokeStyle = "rgba(24, 34, 48, 0.95)";
    drawCtx.lineWidth = 2;
    drawCtx.lineCap = "round";
    drawCtx.beginPath();
    drawCtx.moveTo(cx - arm, cy);
    drawCtx.lineTo(cx - gap, cy);
    drawCtx.moveTo(cx + gap, cy);
    drawCtx.lineTo(cx + arm, cy);
    drawCtx.moveTo(cx, cy - arm);
    drawCtx.lineTo(cx, cy - gap);
    drawCtx.moveTo(cx, cy + gap);
    drawCtx.lineTo(cx, cy + arm);
    drawCtx.stroke();
  }

  function drawJetpackHud() {
    const panelX = clamp(viewportWidth * 0.02, 12, 22);
    const panelY = clamp(viewportHeight * 0.02, 12, 20);
    const panelWidth = clamp(viewportWidth * 0.21, 190, 290);
    const panelHeight = clamp(viewportHeight * 0.095, 68, 92);
    const panelRadius = 11;

    drawPanel(
      drawCtx,
      panelX,
      panelY,
      panelWidth,
      panelHeight,
      panelRadius,
      "rgba(14, 23, 38, 0.68)",
      "rgba(155, 202, 255, 0.28)",
      1.2
    );

    drawCtx.fillStyle = "rgba(225, 239, 255, 0.92)";
    drawCtx.font = `700 ${clamp(panelHeight * 0.2, 12, 16)}px ${FONT_STACK}`;
    drawCtx.textBaseline = "top";
    drawCtx.fillText("Jetpack Fuel", panelX + 12, panelY + 10);

    const percentText = `${Math.round(state.jetpackFuelRatio * 100)}%`;
    drawCtx.font = `700 ${clamp(panelHeight * 0.24, 14, 20)}px ${FONT_STACK}`;
    const textWidth = drawCtx.measureText(percentText).width;
    drawCtx.fillText(
      percentText,
      panelX + panelWidth - textWidth - 12,
      panelY + 7
    );

    const barX = panelX + 12;
    const barY = panelY + panelHeight - 24;
    const barWidth = panelWidth - 24;
    const barHeight = 12;
    drawPanel(
      drawCtx,
      barX,
      barY,
      barWidth,
      barHeight,
      999,
      "rgba(10, 16, 28, 0.82)",
      "rgba(197, 228, 255, 0.45)",
      1
    );

    const fillWidth = Math.max(0, barWidth * state.jetpackFuelRatio);
    if (fillWidth > 0.5) {
      const gradient = drawCtx.createLinearGradient(barX, barY, barX + barWidth, barY);
      gradient.addColorStop(0, "#58f3ff");
      gradient.addColorStop(1, "#5fb6ff");
      drawPanel(
        drawCtx,
        barX + 1,
        barY + 1,
        Math.max(0, fillWidth - 2),
        barHeight - 2,
        999,
        gradient,
        null
      );
    }
  }

  function drawTowerTray() {
    const visibleInventory = state.towerInventory;
    towerSlotRects = [];
    if (visibleInventory.length === 0) {
      return;
    }

    const slotSize = clamp(Math.min(viewportWidth * 0.18, viewportHeight * 0.16), 84, 116);
    const slotGap = clamp(slotSize * 0.14, 10, 18);
    const trayWidth = (slotSize * visibleInventory.length) + (slotGap * (visibleInventory.length - 1));
    const startX = (viewportWidth - trayWidth) * 0.5;
    const y = viewportHeight - slotSize - clamp(viewportHeight * 0.03, 14, 24);

    for (let i = 0; i < visibleInventory.length; i += 1) {
      const item = visibleInventory[i];
      const x = startX + (slotSize + slotGap) * i;
      const isSelected = item.type === state.selectedTowerType;
      const isDepleted = item.remaining <= 0;
      const slotFill = isDepleted
        ? "rgba(28, 34, 44, 0.78)"
        : (isSelected ? "rgba(26, 55, 72, 0.92)" : "rgba(14, 23, 38, 0.82)");
      const slotStroke = isDepleted
        ? "rgba(128, 140, 156, 0.32)"
        : (isSelected ? "rgba(110, 244, 173, 0.9)" : "rgba(155, 202, 255, 0.26)");
      const slotLineWidth = isDepleted ? 1 : (isSelected ? 2 : 1.3);

      drawPanel(
        drawCtx,
        x,
        y,
        slotSize,
        slotSize,
        clamp(slotSize * 0.11, 8, 14),
        slotFill,
        slotStroke,
        slotLineWidth
      );

      const iconSize = slotSize * 0.52;
      const iconX = x + (slotSize - iconSize) * 0.5;
      const iconY = y + slotSize * 0.1;
      drawCtx.save();
      if (isDepleted) {
        drawCtx.globalAlpha = 0.42;
      }
      drawIconById(drawCtx, item.iconId, iconX, iconY, iconSize);
      drawCtx.restore();

      if (item.hotkey && state.showKeyboardHints) {
        const keyBoxW = clamp(slotSize * 0.24, 18, 30);
        const keyBoxH = clamp(slotSize * 0.2, 16, 24);
        const keyBoxX = x + 7;
        const keyBoxY = y + 6;
        drawPanel(
          drawCtx,
          keyBoxX,
          keyBoxY,
          keyBoxW,
          keyBoxH,
          clamp(keyBoxH * 0.28, 4, 8),
          isDepleted ? "rgba(28, 34, 42, 0.88)" : "rgba(7, 16, 26, 0.9)",
          isDepleted ? "rgba(160, 172, 188, 0.4)" : "rgba(191, 239, 255, 0.7)",
          1
        );
        drawCtx.fillStyle = isDepleted ? "rgba(173, 184, 198, 0.82)" : "rgba(233, 246, 255, 0.95)";
        drawCtx.textAlign = "center";
        drawCtx.textBaseline = "middle";
        drawCtx.font = `700 ${clamp(slotSize * 0.14, 10, 14)}px ${FONT_STACK}`;
        drawCtx.fillText(
          item.hotkey,
          keyBoxX + keyBoxW * 0.5,
          keyBoxY + keyBoxH * 0.54
        );
      }

      if (item.remaining > 1) {
        const badgeSize = clamp(slotSize * 0.28, 20, 34);
        const badgeX = x + slotSize - badgeSize - 6;
        const badgeY = y + 6;
        drawPanel(
          drawCtx,
          badgeX,
          badgeY,
          badgeSize,
          badgeSize,
          badgeSize * 0.35,
          "rgba(8, 19, 30, 0.92)",
          "rgba(124, 255, 205, 0.82)",
          1.2
        );
        drawCtx.fillStyle = "rgba(122, 255, 215, 0.98)";
        drawCtx.font = `700 ${clamp(slotSize * 0.19, 12, 18)}px ${FONT_STACK}`;
        drawCtx.textAlign = "center";
        drawCtx.textBaseline = "middle";
        drawCtx.fillText(
          String(item.remaining),
          badgeX + badgeSize * 0.5,
          badgeY + badgeSize * 0.53
        );
      }

      drawCtx.textAlign = "center";
      drawCtx.textBaseline = "alphabetic";
      drawCtx.fillStyle = isDepleted ? "rgba(155, 166, 180, 0.88)" : "rgba(230, 241, 255, 0.92)";
      drawCtx.font = `600 ${clamp(slotSize * 0.14, 10, 14)}px ${FONT_STACK}`;
      drawCtx.fillText(
        item.label,
        x + slotSize * 0.5,
        y + slotSize - 8
      );

      towerSlotRects.push({
        type: item.type,
        x,
        y,
        width: slotSize,
        height: slotSize,
        disabled: isDepleted,
      });
    }

    drawCtx.textAlign = "left";
    drawCtx.textBaseline = "alphabetic";
  }

  function drawBuildModeHint() {
    if (!state.buildMode || state.menuOpen || !state.showKeyboardHints) {
      return;
    }

    const hintWidth = clamp(viewportWidth * 0.24, 190, 320);
    const hintHeight = clamp(viewportHeight * 0.048, 30, 44);
    const x = (viewportWidth - hintWidth) * 0.5;
    const y = viewportHeight - clamp(viewportHeight * 0.2, 112, 165);

    drawPanel(
      drawCtx,
      x,
      y,
      hintWidth,
      hintHeight,
      clamp(hintHeight * 0.3, 8, 12),
      "rgba(10, 21, 33, 0.84)",
      "rgba(110, 244, 173, 0.62)",
      1.2
    );

    drawCtx.fillStyle = "rgba(229, 245, 255, 0.96)";
    drawCtx.textAlign = "center";
    drawCtx.textBaseline = "middle";
    drawCtx.font = `600 ${clamp(hintHeight * 0.44, 12, 18)}px ${FONT_STACK}`;
    drawCtx.fillText("Build mode active  |  Q to exit", x + hintWidth * 0.5, y + hintHeight * 0.56);
    drawCtx.textAlign = "left";
    drawCtx.textBaseline = "alphabetic";
  }

  function drawUpgradeMenu() {
    menuOptionRects = [];
    if (!state.menuOpen) {
      return;
    }

    drawCtx.fillStyle = "rgba(4, 8, 20, 0.85)";
    drawCtx.fillRect(0, 0, viewportWidth, viewportHeight);

    const panelWidth = clamp(viewportWidth * 0.82, 290, 470);
    const panelPadding = clamp(panelWidth * 0.07, 16, 26);
    const cardHeight = clamp(viewportHeight * 0.11, 64, 92);
    const cardGap = clamp(cardHeight * 0.2, 10, 18);
    const titleHeight = clamp(viewportHeight * 0.13, 78, 112);
    const cardCount = Math.min(3, state.menuOptions.length);
    const cardsHeight = cardCount > 0
      ? (cardCount * cardHeight) + ((cardCount - 1) * cardGap)
      : 0;
    const panelHeight = titleHeight + cardsHeight + panelPadding * 2;
    const panelX = (viewportWidth - panelWidth) * 0.5;
    const panelY = (viewportHeight - panelHeight) * 0.5;

    drawPanel(
      drawCtx,
      panelX,
      panelY,
      panelWidth,
      panelHeight,
      clamp(panelWidth * 0.04, 12, 18),
      "rgba(14, 23, 38, 0.96)",
      "rgba(80, 133, 200, 0.95)",
      1.5
    );

    drawCtx.fillStyle = "#ffffff";
    drawCtx.textAlign = "center";
    drawCtx.textBaseline = "top";
    drawCtx.font = `700 ${clamp(panelWidth * 0.08, 21, 30)}px ${FONT_STACK}`;
    drawCtx.fillText("Wave Completed!", panelX + panelWidth * 0.5, panelY + panelPadding);
    drawCtx.font = `500 ${clamp(panelWidth * 0.04, 12, 16)}px ${FONT_STACK}`;
    drawCtx.fillStyle = "rgba(228, 240, 255, 0.82)";
    drawCtx.fillText(
      "Select an upgrade for the next wave",
      panelX + panelWidth * 0.5,
      panelY + panelPadding + clamp(panelWidth * 0.1, 30, 40)
    );

    const cardX = panelX + panelPadding;
    const cardWidth = panelWidth - panelPadding * 2;
    let cardY = panelY + panelPadding + titleHeight;

    for (let i = 0; i < cardCount; i += 1) {
      const option = state.menuOptions[i];
      const hovered = i === state.hoveredMenuIndex;
      drawPanel(
        drawCtx,
        cardX,
        cardY,
        cardWidth,
        cardHeight,
        clamp(cardHeight * 0.15, 8, 14),
        hovered ? "rgba(44, 80, 120, 0.94)" : "rgba(24, 44, 70, 0.82)",
        hovered ? "rgba(121, 206, 255, 0.98)" : "rgba(93, 161, 245, 0.72)",
        hovered ? 1.8 : 1.2
      );

      const iconSize = cardHeight * 0.68;
      const iconX = cardX + clamp(cardWidth * 0.03, 10, 16);
      const iconY = cardY + (cardHeight - iconSize) * 0.5;
      drawPanel(
        drawCtx,
        iconX,
        iconY,
        iconSize,
        iconSize,
        clamp(iconSize * 0.17, 7, 12),
        "rgba(8, 18, 30, 0.64)",
        "rgba(148, 214, 255, 0.72)",
        1
      );
      drawIconById(drawCtx, option.iconId, iconX + 2, iconY + 2, iconSize - 4);

      drawCtx.textAlign = "left";
      drawCtx.textBaseline = "middle";
      drawCtx.fillStyle = "rgba(240, 247, 255, 0.98)";
      drawCtx.font = `600 ${clamp(cardHeight * 0.27, 13, 19)}px ${FONT_STACK}`;
      drawCtx.fillText(
        `${i + 1}. ${option.label}`,
        iconX + iconSize + clamp(cardWidth * 0.04, 12, 18),
        cardY + cardHeight * 0.52
      );

      menuOptionRects.push({
        index: i,
        x: cardX,
        y: cardY,
        width: cardWidth,
        height: cardHeight,
      });
      cardY += cardHeight + cardGap;
    }

    if (state.menuCursorVisible) {
      drawCtx.beginPath();
      drawCtx.arc(state.menuCursorX, state.menuCursorY, 8, 0, Math.PI * 2);
      drawCtx.fillStyle = "rgba(255, 255, 255, 0.95)";
      drawCtx.fill();
      drawCtx.lineWidth = 2;
      drawCtx.strokeStyle = "rgba(0, 0, 0, 0.9)";
      drawCtx.stroke();
    }

    drawCtx.textAlign = "left";
    drawCtx.textBaseline = "alphabetic";
  }

  function draw() {
    if (!drawCtx) {
      return;
    }

    drawCtx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawCtx.clearRect(0, 0, viewportWidth, viewportHeight);

    drawJetpackHud();
    drawTowerTray();
    drawBuildModeHint();
    drawCrosshair();
    drawUpgradeMenu();

    texture.needsUpdate = true;
  }

  function hitTestRectList(rects, x, y, mapResult) {
    for (let i = rects.length - 1; i >= 0; i -= 1) {
      const rect = rects[i];
      if (
        x >= rect.x &&
        x <= rect.x + rect.width &&
        y >= rect.y &&
        y <= rect.y + rect.height
      ) {
        return mapResult(rect);
      }
    }
    return null;
  }

  function hitTestMenuOption(x, y) {
    if (!state.menuOpen) {
      return -1;
    }
    const result = hitTestRectList(menuOptionRects, x, y, (rect) => rect.index);
    return result == null ? -1 : result;
  }

  function hitTestTowerSlot(x, y) {
    const result = hitTestRectList(
      towerSlotRects,
      x,
      y,
      (rect) => (rect.disabled ? null : rect.type)
    );
    return result == null ? null : result;
  }

  resize(width, height);

  return {
    scene,
    camera,
    resize,
    setState,
    draw,
    hitTestMenuOption,
    hitTestTowerSlot,
  };
}
