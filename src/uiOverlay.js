import * as THREE from "three";

const FONT_STACK = "\"Segoe UI\", sans-serif";
const MOBILE_UI_DEFAULTS = {
  movePadRadiusPx: 45,
  actionButtonSizePx: 96,
  jumpButtonSizePx: 78,
  cancelButtonSizePx: 56,
  edgeMarginPx: 18,
  controlBottomOffsetPx: 26,
  moveStickActivationScale: 1.45,
  lookZoneTopPaddingPx: 108,
};

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

function fitLabelText(ctx, text, maxWidth, maxFontSize, minFontSize, fontWeight = 600) {
  let fontSize = Math.max(minFontSize, maxFontSize);
  let displayText = String(text ?? "");
  ctx.font = `${fontWeight} ${fontSize}px ${FONT_STACK}`;

  while (fontSize > minFontSize && ctx.measureText(displayText).width > maxWidth) {
    fontSize -= 1;
    ctx.font = `${fontWeight} ${fontSize}px ${FONT_STACK}`;
  }

  if (ctx.measureText(displayText).width <= maxWidth) {
    return { text: displayText, fontSize };
  }

  let trimmed = displayText;
  while (trimmed.length > 0) {
    const candidate = `${trimmed}\u2026`;
    if (ctx.measureText(candidate).width <= maxWidth) {
      displayText = candidate;
      break;
    }
    trimmed = trimmed.slice(0, -1);
  }
  if (trimmed.length === 0) {
    displayText = "\u2026";
  }

  return { text: displayText, fontSize };
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

function drawIconTowerAoe(ctx, x, y, size) {
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

  const spikeCount = 10;
  const spikeOuter = r * 1.78;
  const spikeInner = r * 1.2;
  ctx.strokeStyle = "rgba(125, 238, 255, 0.92)";
  ctx.lineWidth = Math.max(1.2, size * 0.046);
  for (let i = 0; i < spikeCount; i += 1) {
    const angle = (Math.PI * 2 * i) / spikeCount;
    const x0 = cx + Math.cos(angle) * spikeInner;
    const y0 = cy + Math.sin(angle) * spikeInner;
    const x1 = cx + Math.cos(angle) * spikeOuter;
    const y1 = cy + Math.sin(angle) * spikeOuter;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }
}

function drawIconTowerSlow(ctx, x, y, size) {
  const cx = x + size * 0.5;
  const cy = y + size * 0.5;
  const rx = size * 0.2;
  const ry = size * 0.29;

  const gradient = ctx.createLinearGradient(cx, cy - ry, cx, cy + ry);
  gradient.addColorStop(0, "rgba(205, 235, 255, 0.98)");
  gradient.addColorStop(1, "rgba(106, 180, 239, 0.95)");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "rgba(161, 235, 255, 0.95)";
  ctx.lineWidth = Math.max(1.2, size * 0.043);
  ctx.beginPath();
  ctx.ellipse(cx, cy + size * 0.02, rx * 1.15, ry * 0.5, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = "rgba(120, 210, 255, 0.35)";
  ctx.fillRect(
    cx - size * 0.22,
    cy + size * 0.2,
    size * 0.44,
    size * 0.24
  );
  ctx.strokeStyle = "rgba(143, 225, 255, 0.82)";
  ctx.lineWidth = Math.max(1, size * 0.03);
  ctx.strokeRect(
    cx - size * 0.22,
    cy + size * 0.2,
    size * 0.44,
    size * 0.24
  );
}

function drawIconTowerLaserSniper(ctx, x, y, size) {
  drawIconTowerLaser(ctx, x, y, size);
  ctx.strokeStyle = "rgba(210, 236, 255, 0.95)";
  ctx.lineWidth = Math.max(1.2, size * 0.04);
  ctx.beginPath();
  ctx.moveTo(x + size * 0.15, y + size * 0.2);
  ctx.lineTo(x + size * 0.85, y + size * 0.8);
  ctx.stroke();

  ctx.fillStyle = "rgba(175, 226, 255, 0.95)";
  ctx.beginPath();
  ctx.arc(x + size * 0.72, y + size * 0.35, size * 0.08, 0, Math.PI * 2);
  ctx.fill();
}

function drawIconTowerMortar(ctx, x, y, size) {
  drawPanel(
    ctx,
    x + size * 0.2,
    y + size * 0.62,
    size * 0.6,
    size * 0.18,
    size * 0.06,
    "rgba(136, 154, 180, 0.95)",
    "rgba(192, 209, 230, 0.95)",
    Math.max(1.2, size * 0.04)
  );
  ctx.strokeStyle = "rgba(198, 224, 255, 0.95)";
  ctx.lineWidth = Math.max(1.3, size * 0.045);
  ctx.beginPath();
  ctx.moveTo(x + size * 0.4, y + size * 0.64);
  ctx.lineTo(x + size * 0.72, y + size * 0.38);
  ctx.stroke();

  ctx.fillStyle = "rgba(224, 236, 248, 0.95)";
  ctx.beginPath();
  ctx.arc(x + size * 0.72, y + size * 0.36, size * 0.07, 0, Math.PI * 2);
  ctx.fill();
}

function drawIconTowerTesla(ctx, x, y, size) {
  drawTowerBaseIcon(ctx, x, y, size);
  ctx.strokeStyle = "rgba(174, 200, 255, 0.98)";
  ctx.lineWidth = Math.max(1.3, size * 0.05);
  ctx.beginPath();
  ctx.moveTo(x + size * 0.28, y + size * 0.2);
  ctx.lineTo(x + size * 0.5, y + size * 0.45);
  ctx.lineTo(x + size * 0.42, y + size * 0.45);
  ctx.lineTo(x + size * 0.7, y + size * 0.8);
  ctx.stroke();
}

function drawIconTowerSpikes(ctx, x, y, size) {
  drawPanel(
    ctx,
    x + size * 0.16,
    y + size * 0.62,
    size * 0.68,
    size * 0.2,
    size * 0.07,
    "rgba(131, 151, 162, 0.95)",
    "rgba(186, 205, 218, 0.92)",
    Math.max(1.2, size * 0.04)
  );
  const spikeCount = 5;
  ctx.fillStyle = "rgba(198, 226, 222, 0.96)";
  for (let i = 0; i < spikeCount; i += 1) {
    const t = i / Math.max(1, spikeCount - 1);
    const spikeX = x + size * (0.22 + t * 0.56);
    fillPath(
      ctx,
      [
        [spikeX - size * 0.04, y + size * 0.64],
        [spikeX + size * 0.04, y + size * 0.64],
        [spikeX, y + size * 0.34],
      ],
      "rgba(199, 227, 223, 0.96)",
      "rgba(225, 244, 240, 0.95)",
      Math.max(1, size * 0.03)
    );
  }
}

function drawIconTowerPlasma(ctx, x, y, size) {
  drawPanel(
    ctx,
    x + size * 0.18,
    y + size * 0.28,
    size * 0.34,
    size * 0.46,
    size * 0.08,
    "rgba(110, 210, 230, 0.9)",
    "rgba(163, 241, 255, 0.95)",
    Math.max(1.2, size * 0.04)
  );
  ctx.fillStyle = "rgba(140, 255, 242, 0.95)";
  ctx.fillRect(
    x + size * 0.5,
    y + size * 0.46,
    size * 0.3,
    size * 0.08
  );
  ctx.strokeStyle = "rgba(176, 255, 247, 0.95)";
  ctx.lineWidth = Math.max(1.2, size * 0.04);
  ctx.strokeRect(
    x + size * 0.5,
    y + size * 0.46,
    size * 0.3,
    size * 0.08
  );
}

function drawIconTowerBuff(ctx, x, y, size) {
  drawTowerBaseIcon(ctx, x, y, size);
  ctx.strokeStyle = "rgba(255, 214, 128, 0.98)";
  ctx.lineWidth = Math.max(1.3, size * 0.045);
  ctx.beginPath();
  ctx.arc(x + size * 0.5, y + size * 0.5, size * 0.28, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x + size * 0.5, y + size * 0.5, size * 0.16, 0, Math.PI * 2);
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

function drawIconJetpackEfficiency(ctx, x, y, size) {
  const cx = x + (size * 0.5);
  const cy = y + (size * 0.52);
  const bodyW = size * 0.4;
  const bodyH = size * 0.42;
  const top = cy - (bodyH * 0.5);

  ctx.fillStyle = "rgba(139, 255, 229, 0.95)";
  ctx.fillRect(cx - (bodyW * 0.5), top, bodyW, bodyH);

  ctx.fillStyle = "rgba(94, 214, 255, 0.9)";
  ctx.beginPath();
  ctx.moveTo(cx - (bodyW * 0.25), cy + (bodyH * 0.5));
  ctx.lineTo(cx - (bodyW * 0.05), y + size * 0.9);
  ctx.lineTo(cx - (bodyW * 0.42), y + size * 0.9);
  ctx.closePath();
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(cx + (bodyW * 0.25), cy + (bodyH * 0.5));
  ctx.lineTo(cx + (bodyW * 0.42), y + size * 0.9);
  ctx.lineTo(cx + (bodyW * 0.05), y + size * 0.9);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "rgba(186, 255, 239, 0.92)";
  ctx.lineWidth = Math.max(1.5, size * 0.055);
  ctx.beginPath();
  ctx.moveTo(cx + (bodyW * 0.6), cy - (bodyH * 0.05));
  ctx.lineTo(cx + (bodyW * 0.9), cy - (bodyH * 0.05));
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx + (bodyW * 0.9), cy - (bodyH * 0.05));
  ctx.lineTo(cx + (bodyW * 0.78), cy - (bodyH * 0.18));
  ctx.moveTo(cx + (bodyW * 0.9), cy - (bodyH * 0.05));
  ctx.lineTo(cx + (bodyW * 0.78), cy + (bodyH * 0.08));
  ctx.stroke();
}

function drawIconWeaponChargeCapacity(ctx, x, y, size) {
  const rows = 2;
  const cols = 3;
  const gap = size * 0.08;
  const cellSize = (size * 0.68 - (gap * (cols - 1))) / cols;
  const startX = x + (size * 0.16);
  const startY = y + (size * 0.22);

  ctx.fillStyle = "rgba(122, 255, 219, 0.92)";
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const cellX = startX + (col * (cellSize + gap));
      const cellY = startY + (row * (cellSize + gap));
      ctx.fillRect(cellX, cellY, cellSize, cellSize);
    }
  }

  ctx.strokeStyle = "rgba(198, 244, 255, 0.9)";
  ctx.lineWidth = Math.max(1.5, size * 0.05);
  ctx.beginPath();
  ctx.moveTo(x + size * 0.2, y + size * 0.82);
  ctx.lineTo(x + size * 0.8, y + size * 0.82);
  ctx.stroke();
}

function drawIconWeaponPierce(ctx, x, y, size) {
  ctx.fillStyle = "rgba(122, 255, 219, 0.95)";
  ctx.fillRect(x + size * 0.16, y + size * 0.3, size * 0.16, size * 0.4);
  ctx.fillRect(x + size * 0.64, y + size * 0.3, size * 0.16, size * 0.4);

  ctx.strokeStyle = "rgba(188, 239, 255, 0.96)";
  ctx.lineWidth = Math.max(1.5, size * 0.055);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x + size * 0.08, y + size * 0.5);
  ctx.lineTo(x + size * 0.86, y + size * 0.5);
  ctx.stroke();

  ctx.fillStyle = "rgba(188, 239, 255, 0.96)";
  ctx.beginPath();
  ctx.moveTo(x + size * 0.86, y + size * 0.42);
  ctx.lineTo(x + size * 0.96, y + size * 0.5);
  ctx.lineTo(x + size * 0.86, y + size * 0.58);
  ctx.closePath();
  ctx.fill();
}

function drawIconPickupRange(ctx, x, y, size) {
  const cubeSize = size * 0.28;
  const cubeX = x + (size * 0.5) - (cubeSize * 0.5);
  const cubeY = y + (size * 0.5) - (cubeSize * 0.5);
  drawPanel(
    ctx,
    cubeX,
    cubeY,
    cubeSize,
    cubeSize,
    size * 0.04,
    "rgba(123, 255, 162, 0.95)",
    "rgba(193, 255, 216, 0.95)",
    Math.max(1.2, size * 0.04)
  );

  const cx = x + size * 0.5;
  const cy = y + size * 0.5;
  ctx.strokeStyle = "rgba(118, 255, 171, 0.9)";
  ctx.lineWidth = Math.max(1.4, size * 0.045);
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.18, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "rgba(80, 210, 123, 0.88)";
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.33, 0, Math.PI * 2);
  ctx.stroke();
}

function drawIconEditorEraser(ctx, x, y, size) {
  ctx.save();
  ctx.translate(x + size * 0.55, y + size * 0.52);
  ctx.rotate(-0.32);
  drawPanel(
    ctx,
    -size * 0.24,
    -size * 0.18,
    size * 0.4,
    size * 0.28,
    size * 0.05,
    "rgba(255, 188, 164, 0.94)",
    "rgba(255, 222, 206, 0.95)",
    Math.max(1.2, size * 0.045)
  );
  drawPanel(
    ctx,
    -size * 0.24,
    -size * 0.03,
    size * 0.4,
    size * 0.12,
    size * 0.04,
    "rgba(255, 126, 126, 0.96)",
    "rgba(255, 208, 208, 0.8)",
    Math.max(1, size * 0.03)
  );
  ctx.restore();

  ctx.strokeStyle = "rgba(255, 104, 104, 0.95)";
  ctx.lineWidth = Math.max(1.5, size * 0.055);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x + size * 0.14, y + size * 0.72);
  ctx.lineTo(x + size * 0.84, y + size * 0.24);
  ctx.stroke();
}

function drawIconEditorWall(ctx, x, y, size) {
  drawPanel(
    ctx,
    x + size * 0.2,
    y + size * 0.2,
    size * 0.6,
    size * 0.6,
    size * 0.07,
    "rgba(150, 196, 245, 0.9)",
    "rgba(208, 232, 255, 0.95)",
    Math.max(1.4, size * 0.05)
  );
  ctx.strokeStyle = "rgba(110, 156, 212, 0.72)";
  ctx.lineWidth = Math.max(1.1, size * 0.035);
  ctx.beginPath();
  ctx.moveTo(x + size * 0.2, y + size * 0.5);
  ctx.lineTo(x + size * 0.8, y + size * 0.5);
  ctx.moveTo(x + size * 0.5, y + size * 0.2);
  ctx.lineTo(x + size * 0.5, y + size * 0.8);
  ctx.stroke();
}

function drawIconEditorSpawn(ctx, x, y, size) {
  drawIconEditorWall(ctx, x, y, size);
  ctx.fillStyle = "rgba(106, 255, 184, 0.98)";
  ctx.beginPath();
  ctx.moveTo(x + size * 0.12, y + size * 0.5);
  ctx.lineTo(x + size * 0.38, y + size * 0.36);
  ctx.lineTo(x + size * 0.38, y + size * 0.45);
  ctx.lineTo(x + size * 0.78, y + size * 0.45);
  ctx.lineTo(x + size * 0.78, y + size * 0.55);
  ctx.lineTo(x + size * 0.38, y + size * 0.55);
  ctx.lineTo(x + size * 0.38, y + size * 0.64);
  ctx.closePath();
  ctx.fill();
}

function drawIconEditorEnd(ctx, x, y, size) {
  drawIconEditorWall(ctx, x, y, size);
  const cx = x + size * 0.5;
  const cy = y + size * 0.5;
  const rOuter = size * 0.22;
  const rInner = size * 0.09;
  ctx.strokeStyle = "rgba(255, 166, 132, 0.96)";
  ctx.lineWidth = Math.max(1.4, size * 0.05);
  ctx.beginPath();
  ctx.arc(cx, cy, rOuter, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "rgba(255, 220, 198, 0.96)";
  ctx.beginPath();
  ctx.arc(cx, cy, rInner, 0, Math.PI * 2);
  ctx.stroke();
}

function drawIconEditorRamp(ctx, x, y, size) {
  fillPath(
    ctx,
    [
      [x + size * 0.2, y + size * 0.76],
      [x + size * 0.8, y + size * 0.76],
      [x + size * 0.8, y + size * 0.28],
    ],
    "rgba(170, 218, 255, 0.92)",
    "rgba(224, 241, 255, 0.96)",
    Math.max(1.3, size * 0.045)
  );
  ctx.strokeStyle = "rgba(129, 185, 235, 0.9)";
  ctx.lineWidth = Math.max(1.2, size * 0.04);
  ctx.beginPath();
  ctx.moveTo(x + size * 0.2, y + size * 0.76);
  ctx.lineTo(x + size * 0.8, y + size * 0.28);
  ctx.stroke();
}

function drawIconEditorPlayerSpawn(ctx, x, y, size) {
  drawPanel(
    ctx,
    x + size * 0.2,
    y + size * 0.2,
    size * 0.6,
    size * 0.6,
    size * 0.07,
    "rgba(111, 255, 143, 0.34)",
    "rgba(140, 255, 166, 0.96)",
    Math.max(1.3, size * 0.048)
  );
  ctx.fillStyle = "rgba(132, 255, 160, 0.98)";
  ctx.beginPath();
  ctx.arc(x + size * 0.5, y + size * 0.44, size * 0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(x + size * 0.47, y + size * 0.53, size * 0.06, size * 0.17);
}

function drawIconWeaponMachineGun(ctx, x, y, size) {
  drawPanel(
    ctx,
    x + size * 0.2,
    y + size * 0.42,
    size * 0.52,
    size * 0.2,
    size * 0.06,
    "rgba(137, 230, 255, 0.92)",
    "rgba(198, 244, 255, 0.95)",
    Math.max(1.2, size * 0.04)
  );
  ctx.fillStyle = "rgba(104, 200, 255, 0.9)";
  ctx.fillRect(x + size * 0.69, y + size * 0.46, size * 0.16, size * 0.11);
  ctx.fillRect(x + size * 0.29, y + size * 0.6, size * 0.13, size * 0.2);
}

function drawIconWeaponSniper(ctx, x, y, size) {
  ctx.strokeStyle = "rgba(174, 223, 255, 0.96)";
  ctx.lineWidth = Math.max(1.4, size * 0.045);
  ctx.beginPath();
  ctx.moveTo(x + size * 0.16, y + size * 0.56);
  ctx.lineTo(x + size * 0.8, y + size * 0.42);
  ctx.stroke();
  drawPanel(
    ctx,
    x + size * 0.36,
    y + size * 0.35,
    size * 0.16,
    size * 0.1,
    size * 0.04,
    "rgba(144, 210, 255, 0.9)",
    "rgba(203, 241, 255, 0.95)",
    Math.max(1.1, size * 0.04)
  );
  ctx.strokeStyle = "rgba(139, 255, 234, 0.9)";
  ctx.lineWidth = Math.max(1.1, size * 0.035);
  ctx.beginPath();
  ctx.arc(x + size * 0.79, y + size * 0.43, size * 0.16, 0, Math.PI * 2);
  ctx.stroke();
}

function drawIconWeaponBazooka(ctx, x, y, size) {
  drawPanel(
    ctx,
    x + size * 0.17,
    y + size * 0.45,
    size * 0.5,
    size * 0.2,
    size * 0.06,
    "rgba(255, 192, 132, 0.92)",
    "rgba(255, 229, 194, 0.95)",
    Math.max(1.2, size * 0.04)
  );
  ctx.fillStyle = "rgba(255, 166, 111, 0.92)";
  ctx.fillRect(x + size * 0.65, y + size * 0.49, size * 0.18, size * 0.12);
  ctx.beginPath();
  ctx.arc(x + size * 0.8, y + size * 0.28, size * 0.08, 0, Math.PI * 2);
  ctx.fill();
}

function drawIconDefault(ctx, x, y, size) {
  drawTowerBaseIcon(ctx, x, y, size);
}

export function drawIconById(ctx, iconId, x, y, size) {
  switch (iconId) {
    case "tower_laser_add":
      drawIconTowerLaser(ctx, x, y, size);
      return;
    case "tower_laser":
      drawIconTowerLaser(ctx, x, y, size);
      return;
    case "tower_gun_add":
      drawIconTowerLaser(ctx, x, y, size);
      return;
    case "tower_gun":
      drawIconTowerLaser(ctx, x, y, size);
      return;
    case "tower_aoe_add":
      drawIconTowerAoe(ctx, x, y, size);
      return;
    case "tower_aoe":
      drawIconTowerAoe(ctx, x, y, size);
      return;
    case "tower_slow_add":
      drawIconTowerSlow(ctx, x, y, size);
      return;
    case "tower_slow":
      drawIconTowerSlow(ctx, x, y, size);
      return;
    case "tower_laser_sniper_add":
      drawIconTowerLaserSniper(ctx, x, y, size);
      return;
    case "tower_laser_sniper":
      drawIconTowerLaserSniper(ctx, x, y, size);
      return;
    case "tower_mortar_add":
      drawIconTowerMortar(ctx, x, y, size);
      return;
    case "tower_mortar":
      drawIconTowerMortar(ctx, x, y, size);
      return;
    case "tower_tesla_add":
      drawIconTowerTesla(ctx, x, y, size);
      return;
    case "tower_tesla":
      drawIconTowerTesla(ctx, x, y, size);
      return;
    case "tower_spikes_add":
      drawIconTowerSpikes(ctx, x, y, size);
      return;
    case "tower_spikes":
      drawIconTowerSpikes(ctx, x, y, size);
      return;
    case "tower_plasma_add":
      drawIconTowerPlasma(ctx, x, y, size);
      return;
    case "tower_plasma":
      drawIconTowerPlasma(ctx, x, y, size);
      return;
    case "tower_buff_add":
      drawIconTowerBuff(ctx, x, y, size);
      return;
    case "tower_buff":
      drawIconTowerBuff(ctx, x, y, size);
      return;
    case "tower_emp_add":
      drawIconTowerAoe(ctx, x, y, size);
      return;
    case "tower_emp":
      drawIconTowerAoe(ctx, x, y, size);
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
    case "player_jetpack_efficiency":
      drawIconJetpackEfficiency(ctx, x, y, size);
      return;
    case "player_weapon_charge_capacity":
      drawIconWeaponChargeCapacity(ctx, x, y, size);
      return;
    case "player_weapon_pierce":
      drawIconWeaponPierce(ctx, x, y, size);
      return;
    case "player_pickup_range":
      drawIconPickupRange(ctx, x, y, size);
      return;
    case "weapon_machine_gun":
      drawIconWeaponMachineGun(ctx, x, y, size);
      return;
    case "weapon_sniper":
      drawIconWeaponSniper(ctx, x, y, size);
      return;
    case "weapon_bazooka":
      drawIconWeaponBazooka(ctx, x, y, size);
      return;
    case "editor_eraser":
      drawIconEditorEraser(ctx, x, y, size);
      return;
    case "editor_wall":
      drawIconEditorWall(ctx, x, y, size);
      return;
    case "editor_spawn":
      drawIconEditorSpawn(ctx, x, y, size);
      return;
    case "editor_end":
      drawIconEditorEnd(ctx, x, y, size);
      return;
    case "editor_ramp":
      drawIconEditorRamp(ctx, x, y, size);
      return;
    case "editor_player_spawn":
      drawIconEditorPlayerSpawn(ctx, x, y, size);
      return;
    default:
      drawIconDefault(ctx, x, y, size);
  }
}

function normalizeTowerInventory(inputInventory) {
  if (!Array.isArray(inputInventory)) {
    return [];
  }

  return inputInventory.map((entry) => {
    const remaining = Math.max(0, Math.floor(entry?.remaining ?? 1));
    const affordable = typeof entry?.affordable === "boolean"
      ? entry.affordable
      : remaining > 0;
    return {
      type: entry?.type || "unknown",
      label: entry?.label || entry?.type || "Tower",
      iconId: entry?.iconId || "tower_gun",
      hotkey: entry?.hotkey || "",
      remaining,
      affordable,
      cost: Math.max(0, Math.floor(Number(entry?.cost) || 0)),
    };
  });
}

export function createUiOverlay({
  width,
  height,
  maxPixelRatio = 2,
  mobileConfig = {},
} = {}) {
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const drawCanvas = document.createElement("canvas");
  const drawCtx = drawCanvas.getContext("2d");
  const mobileUiConfig = {
    ...MOBILE_UI_DEFAULTS,
    ...(mobileConfig && typeof mobileConfig === "object" ? mobileConfig : {}),
  };

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
    menuMode: "tech_tree",
    menuOptions: [],
    menuTitle: "Research Tree",
    menuSubtitle: "",
    techTreeView: null,
    techTreeTooltip: null,
    hoveredMenuIndex: -1,
    menuCursorX: viewportWidth * 0.5,
    menuCursorY: viewportHeight * 0.5,
    menuCursorVisible: false,
    showCrosshair: true,
    jetpackFuelRatio: 1,
    money: 0,
    experienceRatio: 0,
    waveNumber: 1,
    towerInventory: [],
    selectedTowerType: null,
    buildMode: false,
    showKeyboardHints: true,
    showTouchControls: false,
    showPauseButton: false,
    showSpeedButton: false,
    buildPhaseActive: false,
    buildPhaseRemainingSeconds: 0,
    showNextWaveButton: false,
    paused: false,
    speedMultiplier: 1,
    fps: 0,
    touchPortrait: false,
    moveStickX: 0,
    moveStickY: 0,
    movePadCenterX: null,
    movePadCenterY: null,
    pressedActions: {
      primary: false,
      jump: false,
      cancel: false,
    },
  };

  let menuOptionRects = [];
  let techTreeNodeRects = [];
  let techTreePanelRect = null;
  let towerSlotRects = [];
  let hudButtonRects = [];
  let touchActionZones = [];
  let touchBlockedRects = [];
  const touchControlLayout = {
    movePad: {
      centerX: 0,
      centerY: 0,
      radius: mobileUiConfig.movePadRadiusPx,
      activationRadius: mobileUiConfig.movePadRadiusPx * mobileUiConfig.moveStickActivationScale,
    },
    lookZoneTop: mobileUiConfig.lookZoneTopPaddingPx,
    blockedRects: [],
  };

  function pushTouchBlockedRect(x, y, width, height) {
    if (!state.showTouchControls) {
      return;
    }
    if (width <= 0 || height <= 0) {
      return;
    }
    touchBlockedRects.push({ x, y, width, height });
  }

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
    if (typeof partialState.menuMode === "string") {
      state.menuMode = partialState.menuMode;
    }
    if (Array.isArray(partialState.menuOptions)) {
      state.menuOptions = partialState.menuOptions.slice(0, 3);
    }
    if (typeof partialState.menuTitle === "string") {
      state.menuTitle = partialState.menuTitle;
    }
    if (typeof partialState.menuSubtitle === "string") {
      state.menuSubtitle = partialState.menuSubtitle;
    }
    if (Object.prototype.hasOwnProperty.call(partialState, "techTreeView")) {
      state.techTreeView = partialState.techTreeView && typeof partialState.techTreeView === "object"
        ? partialState.techTreeView
        : null;
    }
    if (Object.prototype.hasOwnProperty.call(partialState, "techTreeTooltip")) {
      state.techTreeTooltip = partialState.techTreeTooltip && typeof partialState.techTreeTooltip === "object"
        ? partialState.techTreeTooltip
        : null;
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
    if (typeof partialState.money === "number") {
      state.money = Math.max(0, Math.floor(partialState.money));
    }
    if (typeof partialState.experienceRatio === "number" && Number.isFinite(partialState.experienceRatio)) {
      state.experienceRatio = clamp(partialState.experienceRatio, 0, 1);
    }
    if (typeof partialState.waveNumber === "number" && Number.isFinite(partialState.waveNumber)) {
      state.waveNumber = Math.max(1, Math.floor(partialState.waveNumber));
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
    if (typeof partialState.showTouchControls === "boolean") {
      state.showTouchControls = partialState.showTouchControls;
    }
    if (typeof partialState.showPauseButton === "boolean") {
      state.showPauseButton = partialState.showPauseButton;
    }
    if (typeof partialState.showSpeedButton === "boolean") {
      state.showSpeedButton = partialState.showSpeedButton;
    }
    if (typeof partialState.buildPhaseActive === "boolean") {
      state.buildPhaseActive = partialState.buildPhaseActive;
    }
    if (typeof partialState.buildPhaseRemainingSeconds === "number" && Number.isFinite(partialState.buildPhaseRemainingSeconds)) {
      state.buildPhaseRemainingSeconds = Math.max(0, partialState.buildPhaseRemainingSeconds);
    }
    if (typeof partialState.showNextWaveButton === "boolean") {
      state.showNextWaveButton = partialState.showNextWaveButton;
    }
    if (typeof partialState.paused === "boolean") {
      state.paused = partialState.paused;
    }
    if (typeof partialState.speedMultiplier === "number" && Number.isFinite(partialState.speedMultiplier)) {
      state.speedMultiplier = Math.max(0.1, partialState.speedMultiplier);
    }
    if (typeof partialState.fps === "number" && Number.isFinite(partialState.fps)) {
      state.fps = Math.max(0, partialState.fps);
    }
    if (typeof partialState.touchPortrait === "boolean") {
      state.touchPortrait = partialState.touchPortrait;
    }
    if (typeof partialState.moveStickX === "number") {
      state.moveStickX = clamp(partialState.moveStickX, -1, 1);
    }
    if (typeof partialState.moveStickY === "number") {
      state.moveStickY = clamp(partialState.moveStickY, -1, 1);
    }
    if (Object.prototype.hasOwnProperty.call(partialState, "movePadCenterX")) {
      state.movePadCenterX = typeof partialState.movePadCenterX === "number"
        && Number.isFinite(partialState.movePadCenterX)
        ? partialState.movePadCenterX
        : null;
    }
    if (Object.prototype.hasOwnProperty.call(partialState, "movePadCenterY")) {
      state.movePadCenterY = typeof partialState.movePadCenterY === "number"
        && Number.isFinite(partialState.movePadCenterY)
        ? partialState.movePadCenterY
        : null;
    }
    if (partialState.pressedActions && typeof partialState.pressedActions === "object") {
      state.pressedActions = {
        primary: !!partialState.pressedActions.primary,
        jump: !!partialState.pressedActions.jump,
        cancel: !!partialState.pressedActions.cancel,
      };
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

  function shouldUseVerticalJetpackHud() {
    return !state.showTouchControls || state.touchPortrait;
  }

  function drawJetpackHud() {
    const fuelRatio = clamp(state.jetpackFuelRatio, 0, 1);
    if (fuelRatio >= 0.999) {
      return;
    }

    const useVerticalLayout = shouldUseVerticalJetpackHud();
    if (useVerticalLayout) {
      const trackWidth = clamp(viewportWidth * 0.03, 10, 16);
      const trackHeight = clamp(viewportHeight * 0.26, 120, 230);
      const trackX = clamp(viewportWidth * 0.02, 10, 18);
      const trackY = clamp(
        viewportHeight * 0.38,
        84,
        Math.max(84, viewportHeight - trackHeight - 24)
      );
      const radius = trackWidth * 0.5;

      drawPanel(
        drawCtx,
        trackX,
        trackY,
        trackWidth,
        trackHeight,
        radius,
        "rgba(10, 20, 34, 0.56)",
        "rgba(152, 212, 255, 0.5)",
        1.1
      );

      const innerPadding = 2;
      const innerX = trackX + innerPadding;
      const innerY = trackY + innerPadding;
      const innerWidth = Math.max(2, trackWidth - innerPadding * 2);
      const innerHeight = Math.max(2, trackHeight - innerPadding * 2);
      const fillHeight = Math.max(0, innerHeight * fuelRatio);
      if (fillHeight > 0.5) {
        const fillY = innerY + (innerHeight - fillHeight);
        const gradient = drawCtx.createLinearGradient(innerX, innerY + innerHeight, innerX, innerY);
        gradient.addColorStop(0, fuelRatio < 0.22 ? "#ff8a5b" : "#5cbcff");
        gradient.addColorStop(1, fuelRatio < 0.22 ? "#ffc59a" : "#66fff2");
        drawPanel(
          drawCtx,
          innerX,
          fillY,
          innerWidth,
          fillHeight,
          innerWidth * 0.5,
          gradient,
          null
        );
      }

      pushTouchBlockedRect(trackX - 6, trackY - 6, trackWidth + 12, trackHeight + 12);
      return;
    }

    const trackWidth = clamp(viewportWidth * 0.16, 92, 168);
    const trackHeight = clamp(viewportHeight * 0.015, 8, 12);
    const trackX = clamp(viewportWidth * 0.02, 12, 22);
    const trackY = clamp(viewportHeight * 0.02, 12, 20);
    drawPanel(
      drawCtx,
      trackX,
      trackY,
      trackWidth,
      trackHeight,
      999,
      "rgba(10, 16, 28, 0.72)",
      "rgba(170, 220, 255, 0.45)",
      1
    );

    const fillWidth = Math.max(0, (trackWidth - 2) * fuelRatio);
    if (fillWidth > 0.5) {
      const gradient = drawCtx.createLinearGradient(trackX, trackY, trackX + trackWidth, trackY);
      gradient.addColorStop(0, fuelRatio < 0.22 ? "#ff8a5b" : "#58f3ff");
      gradient.addColorStop(1, fuelRatio < 0.22 ? "#ffc59a" : "#5fb6ff");
      drawPanel(
        drawCtx,
        trackX + 1,
        trackY + 1,
        fillWidth,
        Math.max(1, trackHeight - 2),
        999,
        gradient,
        null
      );
    }

    pushTouchBlockedRect(trackX, trackY, trackWidth, trackHeight);
  }

  function getMoneyPanelRect() {
    const panelWidth = state.showTouchControls
      ? clamp(viewportWidth * 0.14, 108, 170)
      : clamp(viewportWidth * 0.13, 112, 176);
    const panelHeight = state.showTouchControls
      ? clamp(viewportHeight * 0.062, 42, 60)
      : clamp(viewportHeight * 0.058, 40, 56);
    const panelX = viewportWidth - panelWidth - clamp(viewportWidth * 0.02, 12, 22);
    const panelY = clamp(viewportHeight * 0.02, 12, 20);
    return {
      panelX,
      panelY,
      panelWidth,
      panelHeight,
    };
  }

  function drawMoneyHud() {
    const {
      panelX,
      panelY,
      panelWidth,
      panelHeight,
    } = getMoneyPanelRect();
    const moneyText = `$${Math.max(0, Math.floor(state.money))}`;

    drawPanel(
      drawCtx,
      panelX,
      panelY,
      panelWidth,
      panelHeight,
      11,
      "rgba(12, 28, 18, 0.78)",
      "rgba(132, 232, 158, 0.52)",
      1.2
    );

    drawCtx.fillStyle = "rgba(169, 255, 184, 0.98)";
    drawCtx.textAlign = "center";
    drawCtx.textBaseline = "middle";
    const fittedMoney = fitLabelText(
      drawCtx,
      moneyText,
      Math.max(26, panelWidth - 14),
      clamp(panelHeight * 0.58, 17, 30),
      13,
      700
    );
    drawCtx.font = `700 ${fittedMoney.fontSize}px ${FONT_STACK}`;
    drawCtx.fillText(
      fittedMoney.text,
      panelX + panelWidth * 0.5,
      panelY + panelHeight * 0.55
    );

    pushTouchBlockedRect(panelX, panelY, panelWidth, panelHeight);
  }

  function getWaveCounterRect() {
    if (state.menuOpen) {
      return null;
    }
    const {
      panelX: moneyPanelX,
      panelY: moneyPanelY,
      panelWidth: moneyPanelWidth,
      panelHeight: moneyPanelHeight,
    } = getMoneyPanelRect();
    const topGap = state.showTouchControls
      ? clamp(viewportHeight * 0.008, 4, 8)
      : clamp(viewportHeight * 0.008, 5, 10);
    const panelWidth = state.showTouchControls
      ? clamp(moneyPanelWidth * 0.74, 74, 128)
      : clamp(moneyPanelWidth * 0.72, 80, 134);
    const panelHeight = state.showTouchControls
      ? clamp(moneyPanelHeight * 0.62, 24, 38)
      : clamp(moneyPanelHeight * 0.6, 24, 36);
    const panelX = moneyPanelX + moneyPanelWidth - panelWidth;
    const panelY = moneyPanelY + moneyPanelHeight + topGap;
    return {
      panelX,
      panelY,
      panelWidth,
      panelHeight,
    };
  }

  function getTopRightHudStackBottom() {
    const {
      panelY: moneyPanelY,
      panelHeight: moneyPanelHeight,
    } = getMoneyPanelRect();
    let stackBottom = moneyPanelY + moneyPanelHeight;
    const waveRect = getWaveCounterRect();
    if (waveRect) {
      stackBottom = Math.max(stackBottom, waveRect.panelY + waveRect.panelHeight);
    }
    const experienceRect = getExperienceBarRect();
    if (experienceRect) {
      stackBottom = Math.max(stackBottom, experienceRect.panelY + experienceRect.panelHeight);
    }
    return stackBottom;
  }

  function drawWaveHud() {
    const waveRect = getWaveCounterRect();
    if (!waveRect) {
      return;
    }
    const {
      panelX,
      panelY,
      panelWidth,
      panelHeight,
    } = waveRect;

    const label = `Wave ${Math.max(1, Math.floor(state.waveNumber || 1))}`;

    drawPanel(
      drawCtx,
      panelX,
      panelY,
      panelWidth,
      panelHeight,
      clamp(panelHeight * 0.32, 7, 11),
      "rgba(12, 23, 37, 0.78)",
      "rgba(154, 214, 255, 0.54)",
      1.1
    );

    drawCtx.fillStyle = "rgba(228, 244, 255, 0.97)";
    drawCtx.textAlign = "center";
    drawCtx.textBaseline = "middle";
    const fittedText = fitLabelText(
      drawCtx,
      label,
      Math.max(24, panelWidth - 10),
      clamp(panelHeight * 0.56, 11, 18),
      10,
      700
    );
    drawCtx.font = `700 ${fittedText.fontSize}px ${FONT_STACK}`;
    drawCtx.fillText(
      fittedText.text,
      panelX + panelWidth * 0.5,
      panelY + panelHeight * 0.54
    );

    pushTouchBlockedRect(panelX, panelY, panelWidth, panelHeight);
  }

  function getExperienceBarRect() {
    if (state.menuOpen) {
      return null;
    }
    const {
      panelX: moneyPanelX,
      panelWidth: moneyPanelWidth,
      panelY: moneyPanelY,
      panelHeight: moneyPanelHeight,
    } = getMoneyPanelRect();
    const waveRect = getWaveCounterRect();
    const topGap = state.showTouchControls
      ? clamp(viewportHeight * 0.008, 4, 8)
      : clamp(viewportHeight * 0.008, 5, 10);
    const panelWidth = state.showTouchControls
      ? clamp(moneyPanelWidth * 0.96, 96, 162)
      : clamp(moneyPanelWidth * 0.92, 104, 178);
    const panelHeight = state.showTouchControls
      ? clamp(moneyPanelHeight * 0.46, 16, 24)
      : clamp(moneyPanelHeight * 0.44, 16, 24);
    const panelX = moneyPanelX + moneyPanelWidth - panelWidth;
    const anchorBottom = waveRect
      ? (waveRect.panelY + waveRect.panelHeight)
      : (moneyPanelY + moneyPanelHeight);
    const panelY = anchorBottom + topGap;
    return {
      panelX,
      panelY,
      panelWidth,
      panelHeight,
    };
  }

  function drawExperienceHud() {
    const expRect = getExperienceBarRect();
    if (!expRect) {
      return;
    }
    const {
      panelX,
      panelY,
      panelWidth,
      panelHeight,
    } = expRect;
    const expRatio = clamp(state.experienceRatio, 0, 1);

    drawPanel(
      drawCtx,
      panelX,
      panelY,
      panelWidth,
      panelHeight,
      clamp(panelHeight * 0.35, 4, 8),
      "rgba(11, 20, 34, 0.78)",
      "rgba(145, 205, 255, 0.48)",
      1.1
    );

    drawCtx.fillStyle = "rgba(220, 239, 255, 0.9)";
    drawCtx.textAlign = "left";
    drawCtx.textBaseline = "middle";
    drawCtx.font = `700 ${clamp(panelHeight * 0.5, 8, 11)}px ${FONT_STACK}`;
    const labelX = panelX + clamp(panelWidth * 0.05, 5, 8);
    const labelY = panelY + panelHeight * 0.52;
    drawCtx.fillText("XP", labelX, labelY);

    const labelReserve = clamp(panelWidth * 0.14, 14, 28);
    const trackPadding = clamp(panelHeight * 0.2, 2, 4);
    const trackX = panelX + labelReserve;
    const trackY = panelY + trackPadding;
    const trackWidth = Math.max(8, panelWidth - labelReserve - trackPadding);
    const trackHeight = Math.max(6, panelHeight - (trackPadding * 2));
    drawPanel(
      drawCtx,
      trackX,
      trackY,
      trackWidth,
      trackHeight,
      clamp(trackHeight * 0.5, 3, 7),
      "rgba(8, 16, 28, 0.86)",
      "rgba(130, 180, 228, 0.5)",
      1
    );

    const fillWidth = Math.max(0, (trackWidth - 2) * expRatio);
    if (fillWidth > 0.5) {
      const gradient = drawCtx.createLinearGradient(trackX, trackY, trackX + trackWidth, trackY);
      gradient.addColorStop(0, "#63bdff");
      gradient.addColorStop(1, "#7bf7ff");
      drawPanel(
        drawCtx,
        trackX + 1,
        trackY + 1,
        fillWidth,
        Math.max(1, trackHeight - 2),
        clamp((trackHeight - 2) * 0.5, 2, 6),
        gradient,
        null
      );
    }

    pushTouchBlockedRect(panelX, panelY, panelWidth, panelHeight);
    drawCtx.textAlign = "left";
    drawCtx.textBaseline = "alphabetic";
  }

  function formatTimerSeconds(totalSeconds) {
    const clamped = Math.max(0, Math.ceil(Number(totalSeconds) || 0));
    const minutes = Math.floor(clamped / 60);
    const seconds = clamped % 60;
    const minuteText = String(minutes).padStart(2, "0");
    const secondText = String(seconds).padStart(2, "0");
    return `${minuteText}:${secondText}`;
  }

  function getBuildPhaseTimerRect() {
    if (!state.buildPhaseActive || state.menuOpen) {
      return null;
    }
    const panelHeight = state.showTouchControls
      ? clamp(viewportHeight * 0.056, 34, 52)
      : clamp(viewportHeight * 0.052, 32, 48);
    const panelWidth = state.showTouchControls
      ? clamp(viewportWidth * 0.24, 126, 228)
      : clamp(viewportWidth * 0.2, 130, 246);
    const panelX = clamp(viewportWidth * 0.02, 12, 20);
    const panelY = clamp(viewportHeight * 0.02, 12, 20);
    return {
      panelX,
      panelY,
      panelWidth,
      panelHeight,
    };
  }

  function drawBuildPhaseTimer() {
    const timerRect = getBuildPhaseTimerRect();
    if (!timerRect) {
      return;
    }
    const {
      panelX,
      panelY,
      panelWidth,
      panelHeight,
    } = timerRect;

    const label = `Build: ${formatTimerSeconds(state.buildPhaseRemainingSeconds)}`;

    drawPanel(
      drawCtx,
      panelX,
      panelY,
      panelWidth,
      panelHeight,
      10,
      "rgba(18, 28, 42, 0.78)",
      "rgba(162, 210, 255, 0.55)",
      1.2
    );

    drawCtx.fillStyle = "rgba(224, 241, 255, 0.98)";
    drawCtx.textAlign = "center";
    drawCtx.textBaseline = "middle";
    const fittedText = fitLabelText(
      drawCtx,
      label,
      Math.max(24, panelWidth - 12),
      clamp(panelHeight * 0.56, 13, 24),
      11,
      700
    );
    drawCtx.font = `700 ${fittedText.fontSize}px ${FONT_STACK}`;
    drawCtx.fillText(
      fittedText.text,
      panelX + panelWidth * 0.5,
      panelY + panelHeight * 0.55
    );

    pushTouchBlockedRect(panelX, panelY, panelWidth, panelHeight);
  }

  function drawFpsHud() {
    if (state.menuOpen) {
      return;
    }

    const fpsValue = Number.isFinite(state.fps) ? state.fps : 0;
    const fpsText = fpsValue > 0 ? String(Math.round(fpsValue)) : "--";
    const label = `FPS ${fpsText}`;
    const fontSize = state.showTouchControls
      ? clamp(viewportHeight * 0.012, 6, 8)
      : clamp(viewportHeight * 0.011, 6, 8);
    const textX = 2;
    const textY = 1;

    drawCtx.fillStyle = "rgba(0, 0, 0, 0.9)";
    drawCtx.textAlign = "left";
    drawCtx.textBaseline = "top";
    drawCtx.font = `600 ${fontSize}px ${FONT_STACK}`;
    drawCtx.fillText(label, textX, textY);
    drawCtx.textAlign = "left";
    drawCtx.textBaseline = "alphabetic";
  }

  function drawHudUtilityButtons() {
    hudButtonRects = [];
    if (state.menuOpen) {
      return;
    }

    const showPause = !!state.showPauseButton;
    const showSpeed = !!state.showSpeedButton;
    const showNextWave = !!state.showNextWaveButton;
    if (!showPause && !showSpeed && !showNextWave) {
      return;
    }

    const {
      panelX,
      panelY,
      panelHeight,
    } = getMoneyPanelRect();
    const buttonHeight = clamp(panelHeight * 0.92, 30, 54);
    const buttonRadius = clamp(buttonHeight * 0.27, 7, 12);
    const buttonGap = clamp(buttonHeight * 0.18, 6, 12);
    const labelFontSize = clamp(buttonHeight * 0.42, 11, 18);

    const buttons = [];
    if (showPause) {
      buttons.push({
        id: "pause",
        label: state.paused ? "Resume" : "Pause",
        active: state.paused,
      });
    }
    if (showSpeed) {
      const fastMode = state.speedMultiplier >= 1.5;
      buttons.push({
        id: "speed",
        label: fastMode ? "1x" : "2x",
        active: fastMode,
      });
    }
    if (showNextWave) {
      buttons.push({
        id: "next_wave",
        label: "Start Wave",
        active: false,
      });
    }
    if (buttons.length === 0) {
      return;
    }

    drawCtx.font = `700 ${labelFontSize}px ${FONT_STACK}`;
    let nextRightX = panelX - buttonGap;
    for (const button of buttons) {
      const textWidth = drawCtx.measureText(button.label).width;
      const buttonWidth = clamp(textWidth + (buttonHeight * 0.86), 44, 126);
      const x = Math.max(6, nextRightX - buttonWidth);
      const y = panelY + (panelHeight - buttonHeight) * 0.5;
      const fillStyle = button.active
        ? "rgba(44, 92, 128, 0.9)"
        : "rgba(14, 30, 45, 0.76)";
      const strokeStyle = button.active
        ? "rgba(147, 228, 255, 0.92)"
        : "rgba(152, 214, 255, 0.48)";

      drawPanel(
        drawCtx,
        x,
        y,
        buttonWidth,
        buttonHeight,
        buttonRadius,
        fillStyle,
        strokeStyle,
        button.active ? 1.6 : 1.2
      );
      drawCtx.fillStyle = "rgba(233, 247, 255, 0.96)";
      drawCtx.textAlign = "center";
      drawCtx.textBaseline = "middle";
      drawCtx.font = `700 ${labelFontSize}px ${FONT_STACK}`;
      drawCtx.fillText(button.label, x + buttonWidth * 0.5, y + buttonHeight * 0.54);

      hudButtonRects.push({
        id: button.id,
        x,
        y,
        width: buttonWidth,
        height: buttonHeight,
      });
      if (state.showTouchControls) {
        pushTouchBlockedRect(x, y, buttonWidth, buttonHeight);
      }
      nextRightX = x - buttonGap;
    }

    drawCtx.textAlign = "left";
    drawCtx.textBaseline = "alphabetic";
  }

  function drawTowerTray() {
    const visibleInventory = state.towerInventory;
    towerSlotRects = [];
    if (visibleInventory.length === 0) {
      return;
    }

    const mobileTowerColumn = state.showTouchControls;
    let slotSize = mobileTowerColumn
      ? clamp(Math.min(viewportWidth * 0.14, viewportHeight * 0.09), 56, 84)
      : clamp(Math.min(viewportWidth * 0.18, viewportHeight * 0.16), 84, 116);
    let slotGap = mobileTowerColumn
      ? clamp(slotSize * 0.14, 7, 12)
      : clamp(slotSize * 0.14, 10, 18);
    let baseX = 0;
    let baseY = 0;

    if (mobileTowerColumn) {
      const {
        panelX: moneyPanelX,
        panelWidth: moneyPanelWidth,
      } = getMoneyPanelRect();
      const topGap = clamp(viewportHeight * 0.01, 6, 10);
      const bottomMargin = clamp(viewportHeight * 0.02, 12, 20);
      const topHudBottom = getTopRightHudStackBottom();
      const availableHeight = Math.max(
        52,
        viewportHeight - (topHudBottom + topGap) - bottomMargin
      );
      const neededHeight = (slotSize * visibleInventory.length) + (slotGap * (visibleInventory.length - 1));
      if (neededHeight > availableHeight) {
        const candidateSize = (
          availableHeight - (slotGap * Math.max(0, visibleInventory.length - 1))
        ) / Math.max(1, visibleInventory.length);
        slotSize = clamp(candidateSize, 48, slotSize);
        slotGap = clamp(slotSize * 0.12, 6, 10);
      }
      baseX = moneyPanelX + moneyPanelWidth - slotSize;
      baseY = topHudBottom + topGap;
    } else {
      const trayWidth = (slotSize * visibleInventory.length) + (slotGap * (visibleInventory.length - 1));
      baseX = (viewportWidth - trayWidth) * 0.5;
      baseY = viewportHeight - slotSize - clamp(viewportHeight * 0.03, 14, 24);
    }

    for (let i = 0; i < visibleInventory.length; i += 1) {
      const item = visibleInventory[i];
      const x = mobileTowerColumn ? baseX : baseX + (slotSize + slotGap) * i;
      const y = mobileTowerColumn ? baseY + (slotSize + slotGap) * i : baseY;
      const isSelected = item.type === state.selectedTowerType;
      const isDepleted = !item.affordable;
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

      const iconSize = slotSize * 0.9;
      const iconX = x + (slotSize - iconSize) * 0.5;
      const iconY = y + (slotSize - iconSize) * 0.5;
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

      if (item.cost > 0) {
        const costText = `$${item.cost}`;
        const badgeHeight = clamp(slotSize * 0.2, 18, 26);
        drawCtx.font = `700 ${clamp(slotSize * 0.13, 10, 14)}px ${FONT_STACK}`;
        const badgeWidth = clamp(drawCtx.measureText(costText).width + 12, 30, slotSize * 0.55);
        const badgeX = x + slotSize - badgeWidth - 6;
        const badgeY = y + 6;
        drawPanel(
          drawCtx,
          badgeX,
          badgeY,
          badgeWidth,
          badgeHeight,
          clamp(badgeHeight * 0.36, 4, 8),
          isDepleted ? "rgba(26, 34, 44, 0.9)" : "rgba(12, 28, 18, 0.9)",
          isDepleted ? "rgba(141, 153, 166, 0.6)" : "rgba(124, 255, 205, 0.82)",
          1.2
        );
        drawCtx.fillStyle = isDepleted ? "rgba(171, 182, 196, 0.92)" : "rgba(122, 255, 215, 0.98)";
        drawCtx.textAlign = "center";
        drawCtx.textBaseline = "middle";
        drawCtx.fillText(
          costText,
          badgeX + badgeWidth * 0.5,
          badgeY + badgeHeight * 0.54
        );
      }

      towerSlotRects.push({
        type: item.type,
        x,
        y,
        width: slotSize,
        height: slotSize,
        disabled: isDepleted,
      });
      pushTouchBlockedRect(x, y, slotSize, slotSize);
    }

    drawCtx.textAlign = "left";
    drawCtx.textBaseline = "alphabetic";
  }

  function drawBuildModeHint() {
    if (!state.buildMode || state.menuOpen || !state.showKeyboardHints) {
      return;
    }

    const hintText = "Q to cancel";
    const hintFontSize = clamp(viewportHeight * 0.022, 12, 19);
    drawCtx.font = `600 ${hintFontSize}px ${FONT_STACK}`;
    const textWidth = drawCtx.measureText(hintText).width;
    const horizontalPadding = clamp(hintFontSize * 0.72, 9, 16);
    const hintWidth = clamp(textWidth + (horizontalPadding * 2), 96, viewportWidth - 18);
    const hintHeight = clamp(hintFontSize * 1.75, 28, 42);

    let x = (viewportWidth - hintWidth) * 0.5;
    let y = viewportHeight - clamp(viewportHeight * 0.2, 112, 165);

    if (!state.showTouchControls && towerSlotRects.length > 0) {
      let trayTop = Number.POSITIVE_INFINITY;
      let trayMinX = Number.POSITIVE_INFINITY;
      let trayMaxX = Number.NEGATIVE_INFINITY;
      for (const rect of towerSlotRects) {
        trayTop = Math.min(trayTop, rect.y);
        trayMinX = Math.min(trayMinX, rect.x);
        trayMaxX = Math.max(trayMaxX, rect.x + rect.width);
      }
      const trayCenterX = (trayMinX + trayMaxX) * 0.5;
      x = clamp(trayCenterX - hintWidth * 0.5, 9, viewportWidth - hintWidth - 9);
      y = Math.max(10, trayTop - hintHeight - clamp(viewportHeight * 0.012, 7, 12));
    }

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
    drawCtx.font = `600 ${clamp(hintHeight * 0.45, 12, 18)}px ${FONT_STACK}`;
    drawCtx.fillText(hintText, x + hintWidth * 0.5, y + hintHeight * 0.54);
    drawCtx.textAlign = "left";
    drawCtx.textBaseline = "alphabetic";
  }

  function drawTouchControls() {
    touchActionZones = [];

    const movePadRadius = clamp(
      Number(mobileUiConfig.movePadRadiusPx) || MOBILE_UI_DEFAULTS.movePadRadiusPx,
      28,
      92
    );
    const movePadActivationScale = clamp(
      Number(mobileUiConfig.moveStickActivationScale) || MOBILE_UI_DEFAULTS.moveStickActivationScale,
      1,
      2.5
    );
    const movePadActivationRadius = movePadRadius * movePadActivationScale;
    const edgeMargin = clamp(
      Number(mobileUiConfig.edgeMarginPx) || MOBILE_UI_DEFAULTS.edgeMarginPx,
      8,
      52
    );
    const bottomOffset = clamp(
      Number(mobileUiConfig.controlBottomOffsetPx) || MOBILE_UI_DEFAULTS.controlBottomOffsetPx,
      0,
      84
    );

    const defaultMovePadCenterX = clamp(
      edgeMargin + movePadActivationRadius,
      movePadActivationRadius + 6,
      viewportWidth - movePadActivationRadius - 6
    );
    const defaultMovePadCenterY = clamp(
      viewportHeight - bottomOffset - movePadActivationRadius,
      movePadActivationRadius + 6,
      viewportHeight - movePadActivationRadius - 6
    );
    const movePadCenterX = Number.isFinite(Number(state.movePadCenterX))
      ? clamp(Number(state.movePadCenterX), movePadActivationRadius + 6, viewportWidth - movePadActivationRadius - 6)
      : defaultMovePadCenterX;
    const movePadCenterY = Number.isFinite(Number(state.movePadCenterY))
      ? clamp(Number(state.movePadCenterY), movePadActivationRadius + 6, viewportHeight - movePadActivationRadius - 6)
      : defaultMovePadCenterY;

    touchControlLayout.movePad = {
      centerX: movePadCenterX,
      centerY: movePadCenterY,
      radius: movePadRadius,
      activationRadius: movePadActivationRadius,
    };
    touchControlLayout.lookZoneTop = clamp(
      Number(mobileUiConfig.lookZoneTopPaddingPx) || MOBILE_UI_DEFAULTS.lookZoneTopPaddingPx,
      0,
      Math.max(0, viewportHeight * 0.65)
    );

    if (!state.showTouchControls || state.menuOpen) {
      return;
    }

    drawCtx.beginPath();
    drawCtx.arc(movePadCenterX, movePadCenterY, movePadActivationRadius, 0, Math.PI * 2);
    drawCtx.fillStyle = "rgba(6, 18, 30, 0.16)";
    drawCtx.fill();
    drawCtx.lineWidth = 1.4;
    drawCtx.strokeStyle = "rgba(155, 202, 255, 0.24)";
    drawCtx.stroke();

    drawCtx.beginPath();
    drawCtx.arc(movePadCenterX, movePadCenterY, movePadRadius, 0, Math.PI * 2);
    drawCtx.fillStyle = "rgba(11, 28, 44, 0.56)";
    drawCtx.fill();
    drawCtx.lineWidth = 1.8;
    drawCtx.strokeStyle = "rgba(155, 223, 255, 0.52)";
    drawCtx.stroke();

    const stickMagnitude = Math.hypot(state.moveStickX, state.moveStickY);
    const normalizedStickX = stickMagnitude > 1 ? state.moveStickX / stickMagnitude : state.moveStickX;
    const normalizedStickY = stickMagnitude > 1 ? state.moveStickY / stickMagnitude : state.moveStickY;
    const knobX = movePadCenterX + (normalizedStickX * movePadRadius);
    const knobY = movePadCenterY - (normalizedStickY * movePadRadius);
    const knobRadius = clamp(movePadRadius * 0.45, 14, 40);

    drawCtx.beginPath();
    drawCtx.arc(knobX, knobY, knobRadius, 0, Math.PI * 2);
    drawCtx.fillStyle = "rgba(130, 236, 255, 0.74)";
    drawCtx.fill();
    drawCtx.lineWidth = 1.4;
    drawCtx.strokeStyle = "rgba(214, 248, 255, 0.96)";
    drawCtx.stroke();

    pushTouchBlockedRect(
      movePadCenterX - movePadActivationRadius,
      movePadCenterY - movePadActivationRadius,
      movePadActivationRadius * 2,
      movePadActivationRadius * 2
    );

    const primaryRadius = clamp((Number(mobileUiConfig.actionButtonSizePx) || MOBILE_UI_DEFAULTS.actionButtonSizePx) * 0.5, 28, 78);
    const jumpRadius = clamp((Number(mobileUiConfig.jumpButtonSizePx) || MOBILE_UI_DEFAULTS.jumpButtonSizePx) * 0.5, 22, 62);
    const cancelRadius = clamp((Number(mobileUiConfig.cancelButtonSizePx) || MOBILE_UI_DEFAULTS.cancelButtonSizePx) * 0.5, 16, 44);

    const actionGap = clamp(primaryRadius * 0.18, 8, 22);
    const primaryCenterX = clamp(
      viewportWidth - edgeMargin - primaryRadius,
      primaryRadius + 6,
      viewportWidth - primaryRadius - 6
    );
    const primaryCenterY = clamp(
      viewportHeight - bottomOffset - primaryRadius,
      primaryRadius + 6,
      viewportHeight - primaryRadius - 6
    );
    const jumpCenterX = clamp(
      primaryCenterX - (primaryRadius + jumpRadius + actionGap),
      jumpRadius + 6,
      viewportWidth - jumpRadius - 6
    );
    const jumpCenterY = clamp(
      primaryCenterY - (jumpRadius * 0.42),
      jumpRadius + 6,
      viewportHeight - jumpRadius - 6
    );
    const cancelCenterX = clamp(
      primaryCenterX,
      cancelRadius + 6,
      viewportWidth - cancelRadius - 6
    );
    const cancelCenterY = clamp(
      primaryCenterY - (primaryRadius + cancelRadius + actionGap),
      cancelRadius + 6,
      viewportHeight - cancelRadius - 6
    );

    function drawActionButton(action, cx, cy, radius, label) {
      const isPressed = !!state.pressedActions?.[action];
      drawCtx.beginPath();
      drawCtx.arc(cx, cy, radius, 0, Math.PI * 2);
      drawCtx.fillStyle = isPressed ? "rgba(72, 196, 255, 0.72)" : "rgba(16, 36, 56, 0.64)";
      drawCtx.fill();
      drawCtx.lineWidth = isPressed ? 2.4 : 1.6;
      drawCtx.strokeStyle = isPressed ? "rgba(198, 244, 255, 0.98)" : "rgba(163, 218, 255, 0.54)";
      drawCtx.stroke();

      if (action === "primary") {
        if (state.buildMode) {
          drawCtx.strokeStyle = "rgba(220, 255, 236, 0.96)";
          drawCtx.lineWidth = Math.max(2, radius * 0.095);
          drawCtx.lineCap = "round";
          drawCtx.lineJoin = "round";
          drawCtx.beginPath();
          drawCtx.moveTo(cx - radius * 0.3, cy + radius * 0.02);
          drawCtx.lineTo(cx - radius * 0.08, cy + radius * 0.26);
          drawCtx.lineTo(cx + radius * 0.34, cy - radius * 0.2);
          drawCtx.stroke();
        } else {
          const arm = radius * 0.33;
          const gap = radius * 0.11;
          drawCtx.lineWidth = Math.max(2, radius * 0.09);
          drawCtx.lineCap = "round";
          drawCtx.strokeStyle = "rgba(226, 248, 255, 0.95)";
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
      } else if (action === "jump") {
        drawCtx.strokeStyle = "rgba(224, 246, 255, 0.96)";
        drawCtx.lineWidth = Math.max(2, radius * 0.11);
        drawCtx.lineCap = "round";
        drawCtx.lineJoin = "round";
        drawCtx.beginPath();
        drawCtx.moveTo(cx - radius * 0.32, cy + radius * 0.16);
        drawCtx.lineTo(cx, cy - radius * 0.2);
        drawCtx.lineTo(cx + radius * 0.32, cy + radius * 0.16);
        drawCtx.stroke();
      } else if (action === "cancel") {
        drawCtx.strokeStyle = "rgba(246, 222, 231, 0.96)";
        drawCtx.lineWidth = Math.max(2, radius * 0.14);
        drawCtx.lineCap = "round";
        drawCtx.beginPath();
        drawCtx.moveTo(cx - radius * 0.32, cy - radius * 0.32);
        drawCtx.lineTo(cx + radius * 0.32, cy + radius * 0.32);
        drawCtx.moveTo(cx + radius * 0.32, cy - radius * 0.32);
        drawCtx.lineTo(cx - radius * 0.32, cy + radius * 0.32);
        drawCtx.stroke();
      }

      drawCtx.fillStyle = "rgba(234, 246, 255, 0.92)";
      drawCtx.textAlign = "center";
      drawCtx.textBaseline = "middle";
      drawCtx.font = `700 ${clamp(radius * 0.25, 10, 16)}px ${FONT_STACK}`;
      drawCtx.fillText(label, cx, cy + radius * 0.63);

      touchActionZones.push({ action, cx, cy, radius });
      pushTouchBlockedRect(cx - radius, cy - radius, radius * 2, radius * 2);
    }

    drawActionButton(
      "primary",
      primaryCenterX,
      primaryCenterY,
      primaryRadius,
      state.buildMode ? "Place" : "Fire"
    );
    drawActionButton("jump", jumpCenterX, jumpCenterY, jumpRadius, "Jetpack");
    if (state.buildMode) {
      drawActionButton("cancel", cancelCenterX, cancelCenterY, cancelRadius, "Cancel");
    }

    drawCtx.textAlign = "left";
    drawCtx.textBaseline = "alphabetic";
  }

  function drawCardMenu() {
    menuOptionRects = [];
    if (!state.menuOpen) {
      return;
    }

    drawCtx.fillStyle = "rgba(4, 8, 20, 0.85)";
    drawCtx.fillRect(0, 0, viewportWidth, viewportHeight);

    const isMobileMenu = state.showTouchControls && state.touchPortrait;
    const panelWidth = isMobileMenu
      ? clamp(viewportWidth * 0.88, 286, 470)
      : clamp(viewportWidth * 0.82, 290, 470);
    const panelPadding = isMobileMenu
      ? clamp(panelWidth * 0.06, 14, 22)
      : clamp(panelWidth * 0.07, 16, 26);
    let cardHeight = isMobileMenu
      ? clamp(viewportHeight * 0.095, 56, 82)
      : clamp(viewportHeight * 0.11, 64, 92);
    let cardGap = isMobileMenu
      ? clamp(cardHeight * 0.16, 8, 13)
      : clamp(cardHeight * 0.2, 10, 18);
    const titleHeight = isMobileMenu
      ? clamp(viewportHeight * 0.11, 66, 94)
      : clamp(viewportHeight * 0.13, 78, 112);
    const cardCount = Math.min(3, state.menuOptions.length);
    let cardsHeight = cardCount > 0
      ? (cardCount * cardHeight) + ((cardCount - 1) * cardGap)
      : 0;
    let panelHeight = titleHeight + cardsHeight + panelPadding * 2;
    if (isMobileMenu) {
      const topInset = clamp(viewportHeight * 0.035, 14, 26);
      const bottomInset = clamp(viewportHeight * 0.02, 12, 20);
      const maxPanelHeight = viewportHeight - topInset - bottomInset;
      if (panelHeight > maxPanelHeight && cardCount > 0) {
        const maxCardsHeight = Math.max(
          cardCount * 46,
          maxPanelHeight - titleHeight - panelPadding * 2
        );
        const nextCardHeight = (
          maxCardsHeight - ((cardCount - 1) * cardGap)
        ) / cardCount;
        cardHeight = clamp(nextCardHeight, 46, cardHeight);
        cardGap = clamp(cardHeight * 0.14, 6, 11);
        cardsHeight = (cardCount * cardHeight) + ((cardCount - 1) * cardGap);
        panelHeight = titleHeight + cardsHeight + panelPadding * 2;
      }
    }
    const panelX = (viewportWidth - panelWidth) * 0.5;
    const panelY = isMobileMenu
      ? clamp(
        viewportHeight * 0.035,
        8,
        Math.max(8, viewportHeight - panelHeight - 8)
      )
      : (viewportHeight - panelHeight) * 0.5;

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
    drawCtx.fillText(state.menuTitle || "Upgrade Ready", panelX + panelWidth * 0.5, panelY + panelPadding);
    drawCtx.font = `500 ${clamp(panelWidth * 0.04, 12, 16)}px ${FONT_STACK}`;
    drawCtx.fillStyle = "rgba(228, 240, 255, 0.82)";
    drawCtx.fillText(
      state.menuSubtitle || "Select an upgrade",
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

      const iconSize = cardHeight * 0.9;
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
      const optionPrefix = state.showKeyboardHints ? `${i + 1}. ` : "";
      const optionText = `${optionPrefix}${option.label}`;
      const textMaxWidth = Math.max(
        24,
        cardWidth - (iconX + iconSize + clamp(cardWidth * 0.04, 12, 18) - cardX) - clamp(cardWidth * 0.04, 12, 18)
      );
      const fittedLabel = fitLabelText(
        drawCtx,
        optionText,
        textMaxWidth,
        clamp(cardHeight * 0.27, 13, 19),
        11,
        600
      );
      drawCtx.font = `600 ${fittedLabel.fontSize}px ${FONT_STACK}`;
      drawCtx.fillText(
        fittedLabel.text,
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

  function drawTechTreeMenu() {
    menuOptionRects = [];
    techTreeNodeRects = [];
    techTreePanelRect = null;
    if (!state.menuOpen) {
      return;
    }

    drawCtx.fillStyle = "rgba(4, 8, 20, 0.86)";
    drawCtx.fillRect(0, 0, viewportWidth, viewportHeight);

    const isPortrait = state.showTouchControls && state.touchPortrait;
    const panelWidth = isPortrait
      ? clamp(viewportWidth * 0.96, 300, 560)
      : clamp(viewportWidth * 0.9, 540, 1280);
    const panelHeight = isPortrait
      ? clamp(viewportHeight * 0.9, 420, 980)
      : clamp(viewportHeight * 0.84, 420, 980);
    const panelX = (viewportWidth - panelWidth) * 0.5;
    const panelY = isPortrait
      ? clamp(viewportHeight * 0.04, 8, Math.max(8, viewportHeight - panelHeight - 8))
      : (viewportHeight - panelHeight) * 0.5;
    const headerHeight = isPortrait
      ? clamp(panelHeight * 0.13, 62, 104)
      : clamp(panelHeight * 0.12, 58, 96);

    techTreePanelRect = {
      x: panelX,
      y: panelY,
      width: panelWidth,
      height: panelHeight,
    };

    drawPanel(
      drawCtx,
      panelX,
      panelY,
      panelWidth,
      panelHeight,
      clamp(panelWidth * 0.03, 10, 18),
      "rgba(12, 20, 33, 0.97)",
      "rgba(108, 168, 236, 0.9)",
      1.6
    );

    const viewX = panelX + 10;
    const viewY = panelY + headerHeight;
    const viewWidth = panelWidth - 20;
    const viewHeight = panelHeight - headerHeight - 10;

    drawCtx.fillStyle = "rgba(220, 238, 255, 0.98)";
    drawCtx.textAlign = "left";
    drawCtx.textBaseline = "middle";
    drawCtx.font = `700 ${clamp(panelHeight * 0.036, 16, 28)}px ${FONT_STACK}`;
    drawCtx.fillText(state.menuTitle || "Research Tree", panelX + 16, panelY + headerHeight * 0.36);

    drawCtx.fillStyle = "rgba(184, 214, 244, 0.95)";
    drawCtx.font = `600 ${clamp(panelHeight * 0.022, 11, 18)}px ${FONT_STACK}`;
    drawCtx.fillText(state.menuSubtitle || "", panelX + 16, panelY + headerHeight * 0.72);

    const points = Math.max(0, Math.floor(Number(state.techTreeView?.points) || 0));
    const pointsText = `${points} RP`;
    drawCtx.font = `700 ${clamp(panelHeight * 0.03, 13, 22)}px ${FONT_STACK}`;
    const pointsWidth = Math.max(56, drawCtx.measureText(pointsText).width + 22);
    const pointsHeight = clamp(headerHeight * 0.44, 24, 38);
    const pointsX = panelX + panelWidth - pointsWidth - 16;
    const pointsY = panelY + headerHeight * 0.24;
    drawPanel(
      drawCtx,
      pointsX,
      pointsY,
      pointsWidth,
      pointsHeight,
      clamp(pointsHeight * 0.3, 6, 10),
      "rgba(17, 43, 29, 0.88)",
      "rgba(124, 232, 168, 0.9)",
      1.2
    );
    drawCtx.fillStyle = "rgba(168, 255, 198, 0.98)";
    drawCtx.textAlign = "center";
    drawCtx.fillText(pointsText, pointsX + pointsWidth * 0.5, pointsY + pointsHeight * 0.53);

    const viewState = state.techTreeView && typeof state.techTreeView === "object"
      ? state.techTreeView
      : {};
    const nodes = Array.isArray(viewState.nodes) ? viewState.nodes : [];
    const edges = Array.isArray(viewState.edges) ? viewState.edges : [];
    const panX = Number(viewState.panX) || 0;
    const panY = Number(viewState.panY) || 0;
    const worldToScreenScale = Number.isFinite(Number(viewState.worldToScreenScale))
      ? Math.max(0.05, Number(viewState.worldToScreenScale))
      : 0.56;
    const nodeDisplaySize = Number.isFinite(Number(viewState.nodeDisplaySize))
      ? Math.max(24, Number(viewState.nodeDisplaySize))
      : 64;
    const nodeWidth = nodeDisplaySize;
    const nodeHeight = nodeDisplaySize;

    const nodeCenters = new Map();
    for (const node of nodes) {
      const centerX = viewX + (viewWidth * 0.5) + panX + ((Number(node.x) || 0) * worldToScreenScale);
      const centerY = viewY + (viewHeight * 0.5) + panY + ((Number(node.y) || 0) * worldToScreenScale);
      nodeCenters.set(node.id, { x: centerX, y: centerY, node });
    }

    drawCtx.save();
    drawCtx.beginPath();
    drawCtx.rect(viewX, viewY, viewWidth, viewHeight);
    drawCtx.clip();

    for (const edge of edges) {
      const from = nodeCenters.get(edge?.from);
      const to = nodeCenters.get(edge?.to);
      if (!from || !to) {
        continue;
      }
      const pathPoints = [from];
      if (Array.isArray(edge?.joints)) {
        for (const joint of edge.joints) {
          const worldX = Number(joint?.x);
          const worldY = Number(joint?.y);
          if (!Number.isFinite(worldX) || !Number.isFinite(worldY)) {
            continue;
          }
          pathPoints.push({
            x: viewX + (viewWidth * 0.5) + panX + (worldX * worldToScreenScale),
            y: viewY + (viewHeight * 0.5) + panY + (worldY * worldToScreenScale),
          });
        }
      }
      pathPoints.push(to);
      const childNode = to.node;
      const researched = !!childNode?.researched;
      const unlockable = !!childNode?.unlockable;
      drawCtx.strokeStyle = researched
        ? "rgba(132, 255, 185, 0.92)"
        : (unlockable ? "rgba(141, 214, 255, 0.9)" : "rgba(112, 132, 154, 0.52)");
      drawCtx.lineWidth = researched ? 2.3 : 1.4;
      drawCtx.beginPath();
      drawCtx.moveTo(pathPoints[0].x, pathPoints[0].y);
      for (let i = 1; i < pathPoints.length; i += 1) {
        drawCtx.lineTo(pathPoints[i].x, pathPoints[i].y);
      }
      drawCtx.stroke();

      if (pathPoints.length > 2) {
        const jointRadius = researched ? 3.5 : 3;
        const jointFill = researched
          ? "rgba(170, 255, 204, 0.95)"
          : (unlockable ? "rgba(183, 231, 255, 0.95)" : "rgba(142, 160, 180, 0.72)");
        const jointStroke = researched
          ? "rgba(68, 145, 102, 0.95)"
          : (unlockable ? "rgba(91, 142, 176, 0.92)" : "rgba(83, 98, 116, 0.86)");
        drawCtx.fillStyle = jointFill;
        drawCtx.strokeStyle = jointStroke;
        drawCtx.lineWidth = 1.15;
        for (let i = 1; i < pathPoints.length - 1; i += 1) {
          drawCtx.beginPath();
          drawCtx.arc(pathPoints[i].x, pathPoints[i].y, jointRadius, 0, Math.PI * 2);
          drawCtx.fill();
          drawCtx.stroke();
        }
      }
    }

    for (const node of nodes) {
      const center = nodeCenters.get(node.id);
      if (!center) {
        continue;
      }
      const x = center.x - (nodeWidth * 0.5);
      const y = center.y - (nodeHeight * 0.5);
      const researched = !!node.researched;
      const unlockable = !!node.unlockable;
      const revealed = researched || unlockable;
      const fill = researched
        ? "rgba(19, 64, 45, 0.96)"
        : (unlockable ? "rgba(31, 60, 95, 0.95)" : "rgba(36, 44, 56, 0.9)");
      const stroke = researched
        ? "rgba(133, 255, 186, 0.95)"
        : (unlockable ? "rgba(150, 220, 255, 0.92)" : "rgba(124, 139, 160, 0.5)");
      drawPanel(
        drawCtx,
        x,
        y,
        nodeWidth,
        nodeHeight,
        clamp(nodeHeight * 0.16, 7, 12),
        fill,
        stroke,
        researched || unlockable ? 1.5 : 1.1
      );

      if (!revealed) {
        drawCtx.fillStyle = "rgba(205, 215, 230, 0.9)";
        drawCtx.textAlign = "center";
        drawCtx.textBaseline = "middle";
        drawCtx.font = `700 ${clamp(nodeHeight * 0.46, 22, 34)}px ${FONT_STACK}`;
        drawCtx.fillText("?", center.x, center.y + 1);
      } else {
        const iconSize = Math.max(14, nodeHeight - 12);
        const iconX = x + ((nodeWidth - iconSize) * 0.5);
        const iconY = y + ((nodeHeight - iconSize) * 0.5);
        drawPanel(
          drawCtx,
          iconX,
          iconY,
          iconSize,
          iconSize,
          clamp(iconSize * 0.2, 6, 9),
          "rgba(7, 16, 27, 0.7)",
          "rgba(122, 182, 236, 0.8)",
          1
        );
        drawIconById(drawCtx, node.iconId, iconX + 2, iconY + 2, iconSize - 4);
      }

      techTreeNodeRects.push({
        id: node.id,
        unlockable,
        researched,
        revealed,
        label: typeof node.label === "string" ? node.label : "",
        description: typeof node.description === "string" ? node.description : "",
        cost: Math.max(0, Math.floor(Number(node.cost) || 0)),
        x,
        y,
        width: nodeWidth,
        height: nodeHeight,
      });
    }

    drawCtx.restore();

    const tooltip = state.techTreeTooltip;
    if (tooltip && typeof tooltip === "object" && typeof tooltip.title === "string") {
      const anchorX = clamp(Number(tooltip.x), viewX + 8, viewX + viewWidth - 8);
      const anchorY = clamp(Number(tooltip.y), viewY + 8, viewY + viewHeight - 8);
      const title = tooltip.title;
      const description = typeof tooltip.description === "string" ? tooltip.description : "";
      const status = typeof tooltip.status === "string" ? tooltip.status : "";

      const tooltipPaddingX = 10;
      const tooltipPaddingY = 9;
      const lineGap = 4;
      const titleFontSize = clamp(nodeHeight * 0.21, 12, 15);
      const bodyFontSize = clamp(nodeHeight * 0.18, 10, 13);
      const maxTooltipWidth = clamp(viewWidth * 0.55, 170, 320);

      drawCtx.textAlign = "left";
      drawCtx.textBaseline = "top";
      drawCtx.font = `700 ${titleFontSize}px ${FONT_STACK}`;
      const titleWidth = drawCtx.measureText(title).width;
      drawCtx.font = `500 ${bodyFontSize}px ${FONT_STACK}`;
      const descriptionWidth = description.length > 0 ? drawCtx.measureText(description).width : 0;
      const statusWidth = status.length > 0 ? drawCtx.measureText(status).width : 0;

      const contentWidth = Math.max(titleWidth, descriptionWidth, statusWidth);
      const tooltipWidth = Math.min(maxTooltipWidth, Math.max(140, contentWidth + (tooltipPaddingX * 2)));
      const tooltipHeight = Math.max(
        56,
        (tooltipPaddingY * 2)
          + titleFontSize
          + (description.length > 0 ? (lineGap + bodyFontSize) : 0)
          + (status.length > 0 ? (lineGap + bodyFontSize) : 0)
      );

      const prefersLeft = anchorX > (panelX + panelWidth * 0.58);
      let tooltipX = prefersLeft ? (anchorX - tooltipWidth - 14) : (anchorX + 14);
      let tooltipY = anchorY - (tooltipHeight * 0.5);
      tooltipX = clamp(tooltipX, viewX + 4, viewX + viewWidth - tooltipWidth - 4);
      tooltipY = clamp(tooltipY, viewY + 4, viewY + viewHeight - tooltipHeight - 4);

      drawPanel(
        drawCtx,
        tooltipX,
        tooltipY,
        tooltipWidth,
        tooltipHeight,
        8,
        "rgba(9, 15, 26, 0.97)",
        "rgba(139, 195, 244, 0.8)",
        1.3
      );

      let lineY = tooltipY + tooltipPaddingY;
      drawCtx.fillStyle = "rgba(238, 247, 255, 0.98)";
      drawCtx.font = `700 ${titleFontSize}px ${FONT_STACK}`;
      drawCtx.fillText(title, tooltipX + tooltipPaddingX, lineY);
      lineY += titleFontSize;

      if (description.length > 0) {
        lineY += lineGap;
        drawCtx.fillStyle = "rgba(182, 209, 233, 0.95)";
        drawCtx.font = `500 ${bodyFontSize}px ${FONT_STACK}`;
        const fittedDescription = fitLabelText(
          drawCtx,
          description,
          tooltipWidth - (tooltipPaddingX * 2),
          bodyFontSize,
          9,
          500
        );
        drawCtx.fillText(fittedDescription.text, tooltipX + tooltipPaddingX, lineY);
        lineY += fittedDescription.fontSize;
      }

      if (status.length > 0) {
        lineY += lineGap;
        drawCtx.fillStyle = "rgba(166, 255, 205, 0.98)";
        drawCtx.font = `600 ${bodyFontSize}px ${FONT_STACK}`;
        const fittedStatus = fitLabelText(
          drawCtx,
          status,
          tooltipWidth - (tooltipPaddingX * 2),
          bodyFontSize,
          9,
          600
        );
        drawCtx.fillText(fittedStatus.text, tooltipX + tooltipPaddingX, lineY);
      }
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

    pushTouchBlockedRect(panelX, panelY, panelWidth, panelHeight);
    drawCtx.textAlign = "left";
    drawCtx.textBaseline = "alphabetic";
  }

  function drawMenuOverlay() {
    menuOptionRects = [];
    techTreeNodeRects = [];
    techTreePanelRect = null;
    if (!state.menuOpen) {
      return;
    }
    if (state.menuMode === "weapon_select") {
      drawCardMenu();
      return;
    }
    drawTechTreeMenu();
  }

  function draw() {
    if (!drawCtx) {
      return;
    }

    drawCtx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    drawCtx.clearRect(0, 0, viewportWidth, viewportHeight);
    touchBlockedRects = [];

    drawJetpackHud();
    drawMoneyHud();
    drawWaveHud();
    drawExperienceHud();
    drawBuildPhaseTimer();
    drawFpsHud();
    drawHudUtilityButtons();
    drawTowerTray();
    drawBuildModeHint();
    drawCrosshair();
    drawTouchControls();
    drawMenuOverlay();
    touchControlLayout.blockedRects = touchBlockedRects.slice();

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
    if (!state.menuOpen || state.menuMode !== "weapon_select") {
      return -1;
    }
    const result = hitTestRectList(menuOptionRects, x, y, (rect) => rect.index);
    return result == null ? -1 : result;
  }

  function hitTestTechTreeNode(x, y) {
    if (!state.menuOpen || state.menuMode === "weapon_select") {
      return null;
    }
    const result = hitTestRectList(
      techTreeNodeRects,
      x,
      y,
      (rect) => (rect.unlockable ? rect.id : null)
    );
    return result == null ? null : result;
  }

  function hitTestTechTreeNodeInfo(x, y) {
    if (!state.menuOpen || state.menuMode === "weapon_select") {
      return null;
    }
    const result = hitTestRectList(
      techTreeNodeRects,
      x,
      y,
      (rect) => ({
        id: rect.id,
        unlockable: !!rect.unlockable,
        researched: !!rect.researched,
        revealed: !!rect.revealed,
        label: rect.label,
        description: rect.description,
        cost: Math.max(0, Math.floor(Number(rect.cost) || 0)),
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      })
    );
    return result == null ? null : result;
  }

  function hitTestTechTreePanel(x, y) {
    if (!state.menuOpen || state.menuMode === "weapon_select" || !techTreePanelRect) {
      return null;
    }
    if (
      x < techTreePanelRect.x
      || x > techTreePanelRect.x + techTreePanelRect.width
      || y < techTreePanelRect.y
      || y > techTreePanelRect.y + techTreePanelRect.height
    ) {
      return null;
    }
    return { ...techTreePanelRect };
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

  function hitTestTouchAction(x, y) {
    if (!state.showTouchControls || state.menuOpen) {
      return null;
    }
    for (let i = touchActionZones.length - 1; i >= 0; i -= 1) {
      const zone = touchActionZones[i];
      const dx = x - zone.cx;
      const dy = y - zone.cy;
      if ((dx * dx) + (dy * dy) <= zone.radius * zone.radius) {
        return zone.action;
      }
    }
    return null;
  }

  function hitTestHudButton(x, y) {
    if (state.menuOpen) {
      return null;
    }
    const result = hitTestRectList(hudButtonRects, x, y, (rect) => rect.id);
    return result == null ? null : result;
  }

  function getTouchControlLayout() {
    const blockedRects = touchBlockedRects.slice();
    for (const rect of towerSlotRects) {
      blockedRects.push({
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
      });
    }
    return {
      movePad: { ...touchControlLayout.movePad },
      lookZoneTop: touchControlLayout.lookZoneTop,
      blockedRects,
    };
  }

  resize(width, height);

  return {
    scene,
    camera,
    resize,
    setState,
    draw,
    hitTestMenuOption,
    hitTestTechTreeNode,
    hitTestTechTreeNodeInfo,
    hitTestTechTreePanel,
    hitTestTowerSlot,
    hitTestTouchAction,
    hitTestHudButton,
    getTouchControlLayout,
  };
}
