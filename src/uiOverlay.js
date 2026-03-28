import * as THREE from "three";

const FONT_STACK = "\"Segoe UI\", sans-serif";
const MOBILE_UI_DEFAULTS = {
  movePadRadiusPx: 45,
  actionButtonSizePx: 96,
  jumpButtonSizePx: 78,
  cancelButtonSizePx: 56,
  edgeMarginPx: 18,
  controlBottomOffsetPx: 26,
  movePadVerticalOffsetPx: 104,
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


function drawElementalCubeIcon(ctx, x, y, size, palette = {}) {
  const frame = palette.frame || "rgba(82, 92, 106, 0.96)";
  const frameHi = palette.frameHi || "rgba(196, 214, 236, 0.92)";
  const glow = palette.glow || "rgba(255, 176, 80, 0.95)";
  const core = palette.core || "rgba(255, 226, 168, 0.95)";

  const left = x + size * 0.2;
  const top = y + size * 0.2;
  const width = size * 0.6;
  const height = size * 0.6;
  drawPanel(ctx, left, top, width, height, size * 0.08, frame, frameHi, Math.max(1.2, size * 0.04));

  const cx = x + size * 0.5;
  const cy = y + size * 0.5;
  const rays = [
    [cx, y + size * 0.2],
    [x + size * 0.8, cy],
    [cx, y + size * 0.8],
    [x + size * 0.2, cy],
  ];
  ctx.strokeStyle = glow;
  ctx.lineWidth = Math.max(1.2, size * 0.042);
  for (const [rx, ry] of rays) {
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(rx, ry);
    ctx.stroke();
  }

  const gradient = ctx.createRadialGradient(cx, cy, size * 0.05, cx, cy, size * 0.2);
  gradient.addColorStop(0, core);
  gradient.addColorStop(1, glow);
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.14, 0, Math.PI * 2);
  ctx.fill();
}

function traceBurstPath(ctx, cx, cy, outerRadius, innerRadius, points = 8) {
  if (points < 3) {
    return;
  }
  ctx.beginPath();
  for (let i = 0; i < points * 2; i += 1) {
    const angle = (-Math.PI * 0.5) + ((Math.PI * i) / points);
    const radius = (i % 2 === 0) ? outerRadius : innerRadius;
    const px = cx + (Math.cos(angle) * radius);
    const py = cy + (Math.sin(angle) * radius);
    if (i === 0) {
      ctx.moveTo(px, py);
    } else {
      ctx.lineTo(px, py);
    }
  }
  ctx.closePath();
}

function drawUpgradeBadge(
  ctx,
  x,
  y,
  size,
  renderer,
  {
    fill = "rgba(17, 24, 34, 0.88)",
    stroke = "rgba(220, 236, 255, 0.9)",
    offsetX = 0.56,
    offsetY = 0.56,
    scale = 0.3,
  } = {}
) {
  const badgeSize = size * scale;
  const badgeX = x + (size * offsetX);
  const badgeY = y + (size * offsetY);
  ctx.save();
  drawPanel(
    ctx,
    badgeX,
    badgeY,
    badgeSize,
    badgeSize,
    badgeSize * 0.28,
    fill,
    stroke,
    Math.max(1.1, badgeSize * 0.11)
  );
  renderer(ctx, badgeX, badgeY, badgeSize);
  ctx.restore();
}

function drawUpgradeDamageOverlay(ctx, x, y, size) {
  drawUpgradeBadge(ctx, x, y, size, (badgeCtx, badgeX, badgeY, badgeSize) => {
    const cx = badgeX + (badgeSize * 0.5);
    const cy = badgeY + (badgeSize * 0.5);
    traceBurstPath(badgeCtx, cx, cy, badgeSize * 0.28, badgeSize * 0.14, 7);
    badgeCtx.fillStyle = "rgba(255, 154, 109, 0.98)";
    badgeCtx.fill();
  }, {
    fill: "rgba(72, 28, 18, 0.9)",
    stroke: "rgba(255, 203, 170, 0.92)",
  });
}

function drawUpgradeFireRateOverlay(ctx, x, y, size) {
  drawUpgradeBadge(ctx, x, y, size, (badgeCtx, badgeX, badgeY, badgeSize) => {
    const cx = badgeX + (badgeSize * 0.5);
    const cy = badgeY + (badgeSize * 0.52);
    const radius = badgeSize * 0.24;
    badgeCtx.strokeStyle = "rgba(153, 255, 214, 0.98)";
    badgeCtx.lineWidth = Math.max(1.1, badgeSize * 0.11);
    badgeCtx.beginPath();
    badgeCtx.arc(cx, cy, radius, Math.PI * 0.22, Math.PI * 1.28);
    badgeCtx.stroke();
    badgeCtx.beginPath();
    badgeCtx.arc(cx, cy, radius * 0.68, Math.PI * 1.35, Math.PI * 2.08);
    badgeCtx.stroke();
    badgeCtx.fillStyle = "rgba(153, 255, 214, 0.98)";
    fillPath(badgeCtx, [
      [cx + (radius * 0.98), cy - (radius * 0.1)],
      [cx + (radius * 0.68), cy - (radius * 0.18)],
      [cx + (radius * 0.78), cy + (radius * 0.08)],
    ], "rgba(153, 255, 214, 0.98)");
    fillPath(badgeCtx, [
      [cx - (radius * 0.45), cy + (radius * 0.74)],
      [cx - (radius * 0.36), cy + (radius * 0.44)],
      [cx - (radius * 0.65), cy + (radius * 0.55)],
    ], "rgba(153, 255, 214, 0.98)");
  }, {
    fill: "rgba(15, 52, 43, 0.9)",
    stroke: "rgba(184, 255, 233, 0.92)",
  });
}

function drawUpgradeRangeOverlay(ctx, x, y, size) {
  ctx.save();
  const cx = x + (size * 0.5);
  const cy = y + (size * 0.5);
  ctx.strokeStyle = "rgba(122, 233, 255, 0.94)";
  ctx.lineWidth = Math.max(1.5, size * 0.045);
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.39, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = "rgba(178, 246, 255, 0.72)";
  ctx.lineWidth = Math.max(1.1, size * 0.028);
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.31, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "rgba(178, 246, 255, 0.96)";
  ctx.beginPath();
  ctx.arc(cx + (size * 0.22), cy - (size * 0.22), size * 0.04, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawUpgradePierceOverlay(ctx, x, y, size) {
  drawUpgradeBadge(ctx, x, y, size, (badgeCtx, badgeX, badgeY, badgeSize) => {
    badgeCtx.strokeStyle = "rgba(211, 243, 255, 0.96)";
    badgeCtx.lineWidth = Math.max(1, badgeSize * 0.1);
    badgeCtx.lineCap = "round";
    badgeCtx.beginPath();
    badgeCtx.moveTo(badgeX + (badgeSize * 0.18), badgeY + (badgeSize * 0.5));
    badgeCtx.lineTo(badgeX + (badgeSize * 0.78), badgeY + (badgeSize * 0.5));
    badgeCtx.stroke();
    badgeCtx.beginPath();
    badgeCtx.moveTo(badgeX + (badgeSize * 0.38), badgeY + (badgeSize * 0.26));
    badgeCtx.lineTo(badgeX + (badgeSize * 0.38), badgeY + (badgeSize * 0.74));
    badgeCtx.moveTo(badgeX + (badgeSize * 0.6), badgeY + (badgeSize * 0.22));
    badgeCtx.lineTo(badgeX + (badgeSize * 0.6), badgeY + (badgeSize * 0.78));
    badgeCtx.stroke();
    fillPath(badgeCtx, [
      [badgeX + (badgeSize * 0.82), badgeY + (badgeSize * 0.5)],
      [badgeX + (badgeSize * 0.67), badgeY + (badgeSize * 0.39)],
      [badgeX + (badgeSize * 0.67), badgeY + (badgeSize * 0.61)],
    ], "rgba(211, 243, 255, 0.96)");
  }, {
    fill: "rgba(22, 42, 63, 0.9)",
    stroke: "rgba(188, 236, 255, 0.92)",
  });
}

function drawUpgradeSlowStrengthOverlay(ctx, x, y, size) {
  drawUpgradeBadge(ctx, x, y, size, (badgeCtx, badgeX, badgeY, badgeSize) => {
    const cx = badgeX + (badgeSize * 0.5);
    const cy = badgeY + (badgeSize * 0.5);
    const arm = badgeSize * 0.24;
    badgeCtx.strokeStyle = "rgba(212, 238, 255, 0.96)";
    badgeCtx.lineWidth = Math.max(1, badgeSize * 0.09);
    badgeCtx.lineCap = "round";
    for (let i = 0; i < 3; i += 1) {
      const angle = (Math.PI * i) / 3;
      const dx = Math.cos(angle) * arm;
      const dy = Math.sin(angle) * arm;
      badgeCtx.beginPath();
      badgeCtx.moveTo(cx - dx, cy - dy);
      badgeCtx.lineTo(cx + dx, cy + dy);
      badgeCtx.stroke();
    }
  }, {
    fill: "rgba(42, 31, 74, 0.9)",
    stroke: "rgba(220, 210, 255, 0.92)",
  });
}

function drawUpgradeDurationOverlay(ctx, x, y, size) {
  drawUpgradeBadge(ctx, x, y, size, (badgeCtx, badgeX, badgeY, badgeSize) => {
    const cx = badgeX + (badgeSize * 0.5);
    const cy = badgeY + (badgeSize * 0.5);
    const radius = badgeSize * 0.26;
    badgeCtx.strokeStyle = "rgba(232, 245, 255, 0.96)";
    badgeCtx.lineWidth = Math.max(1, badgeSize * 0.09);
    badgeCtx.beginPath();
    badgeCtx.arc(cx, cy, radius, 0, Math.PI * 2);
    badgeCtx.stroke();
    badgeCtx.beginPath();
    badgeCtx.moveTo(cx, cy);
    badgeCtx.lineTo(cx, cy - (radius * 0.65));
    badgeCtx.lineTo(cx + (radius * 0.48), cy);
    badgeCtx.stroke();
  }, {
    fill: "rgba(40, 45, 70, 0.9)",
    stroke: "rgba(214, 229, 255, 0.9)",
  });
}

function drawUpgradeBlastRadiusOverlay(ctx, x, y, size) {
  drawUpgradeBadge(ctx, x, y, size, (badgeCtx, badgeX, badgeY, badgeSize) => {
    const cx = badgeX + (badgeSize * 0.5);
    const cy = badgeY + (badgeSize * 0.5);
    const radius = badgeSize * 0.18;
    badgeCtx.strokeStyle = "rgba(167, 245, 255, 0.98)";
    badgeCtx.lineWidth = Math.max(1, badgeSize * 0.09);
    badgeCtx.beginPath();
    badgeCtx.arc(cx, cy, radius, 0, Math.PI * 2);
    badgeCtx.stroke();
    for (let i = 0; i < 4; i += 1) {
      const angle = (Math.PI * 0.25) + ((Math.PI * 0.5) * i);
      const inner = radius + (badgeSize * 0.05);
      const outer = radius + (badgeSize * 0.15);
      badgeCtx.beginPath();
      badgeCtx.moveTo(cx + (Math.cos(angle) * inner), cy + (Math.sin(angle) * inner));
      badgeCtx.lineTo(cx + (Math.cos(angle) * outer), cy + (Math.sin(angle) * outer));
      badgeCtx.stroke();
    }
  }, {
    fill: "rgba(14, 58, 65, 0.9)",
    stroke: "rgba(168, 248, 255, 0.9)",
  });
}

function drawUpgradeChainOverlay(ctx, x, y, size) {
  drawUpgradeBadge(ctx, x, y, size, (badgeCtx, badgeX, badgeY, badgeSize) => {
    badgeCtx.strokeStyle = "rgba(255, 167, 219, 0.98)";
    badgeCtx.lineWidth = Math.max(1.1, badgeSize * 0.1);
    badgeCtx.lineJoin = "round";
    badgeCtx.lineCap = "round";
    badgeCtx.beginPath();
    badgeCtx.moveTo(badgeX + (badgeSize * 0.24), badgeY + (badgeSize * 0.28));
    badgeCtx.lineTo(badgeX + (badgeSize * 0.5), badgeY + (badgeSize * 0.48));
    badgeCtx.lineTo(badgeX + (badgeSize * 0.36), badgeY + (badgeSize * 0.74));
    badgeCtx.moveTo(badgeX + (badgeSize * 0.5), badgeY + (badgeSize * 0.48));
    badgeCtx.lineTo(badgeX + (badgeSize * 0.76), badgeY + (badgeSize * 0.26));
    badgeCtx.moveTo(badgeX + (badgeSize * 0.5), badgeY + (badgeSize * 0.48));
    badgeCtx.lineTo(badgeX + (badgeSize * 0.76), badgeY + (badgeSize * 0.7));
    badgeCtx.stroke();
  }, {
    fill: "rgba(68, 24, 60, 0.9)",
    stroke: "rgba(255, 192, 233, 0.92)",
  });
}

function drawUpgradeReachOverlay(ctx, x, y, size) {
  drawUpgradeBadge(ctx, x, y, size, (badgeCtx, badgeX, badgeY, badgeSize) => {
    badgeCtx.strokeStyle = "rgba(179, 250, 255, 0.98)";
    badgeCtx.lineWidth = Math.max(1.1, badgeSize * 0.09);
    badgeCtx.lineCap = "round";
    badgeCtx.beginPath();
    badgeCtx.moveTo(badgeX + (badgeSize * 0.22), badgeY + (badgeSize * 0.5));
    badgeCtx.lineTo(badgeX + (badgeSize * 0.76), badgeY + (badgeSize * 0.5));
    badgeCtx.stroke();
    fillPath(badgeCtx, [
      [badgeX + (badgeSize * 0.8), badgeY + (badgeSize * 0.5)],
      [badgeX + (badgeSize * 0.6), badgeY + (badgeSize * 0.34)],
      [badgeX + (badgeSize * 0.6), badgeY + (badgeSize * 0.66)],
    ], "rgba(179, 250, 255, 0.98)");
    badgeCtx.beginPath();
    badgeCtx.moveTo(badgeX + (badgeSize * 0.22), badgeY + (badgeSize * 0.34));
    badgeCtx.lineTo(badgeX + (badgeSize * 0.38), badgeY + (badgeSize * 0.34));
    badgeCtx.moveTo(badgeX + (badgeSize * 0.22), badgeY + (badgeSize * 0.66));
    badgeCtx.lineTo(badgeX + (badgeSize * 0.42), badgeY + (badgeSize * 0.66));
    badgeCtx.stroke();
  }, {
    fill: "rgba(14, 54, 62, 0.9)",
    stroke: "rgba(188, 248, 255, 0.92)",
  });
}

function drawUpgradeWidthOverlay(ctx, x, y, size) {
  drawUpgradeBadge(ctx, x, y, size, (badgeCtx, badgeX, badgeY, badgeSize) => {
    badgeCtx.strokeStyle = "rgba(179, 250, 255, 0.98)";
    badgeCtx.lineWidth = Math.max(1.1, badgeSize * 0.09);
    badgeCtx.lineCap = "round";
    badgeCtx.beginPath();
    badgeCtx.moveTo(badgeX + (badgeSize * 0.26), badgeY + (badgeSize * 0.5));
    badgeCtx.lineTo(badgeX + (badgeSize * 0.74), badgeY + (badgeSize * 0.5));
    badgeCtx.stroke();
    fillPath(badgeCtx, [
      [badgeX + (badgeSize * 0.18), badgeY + (badgeSize * 0.5)],
      [badgeX + (badgeSize * 0.34), badgeY + (badgeSize * 0.36)],
      [badgeX + (badgeSize * 0.34), badgeY + (badgeSize * 0.64)],
    ], "rgba(179, 250, 255, 0.98)");
    fillPath(badgeCtx, [
      [badgeX + (badgeSize * 0.82), badgeY + (badgeSize * 0.5)],
      [badgeX + (badgeSize * 0.66), badgeY + (badgeSize * 0.36)],
      [badgeX + (badgeSize * 0.66), badgeY + (badgeSize * 0.64)],
    ], "rgba(179, 250, 255, 0.98)");
  }, {
    fill: "rgba(14, 54, 62, 0.9)",
    stroke: "rgba(188, 248, 255, 0.92)",
  });
}

function drawUpgradePotencyOverlay(ctx, x, y, size) {
  drawUpgradeBadge(ctx, x, y, size, (badgeCtx, badgeX, badgeY, badgeSize) => {
    const cx = badgeX + (badgeSize * 0.44);
    const cy = badgeY + (badgeSize * 0.44);
    traceBurstPath(badgeCtx, cx, cy, badgeSize * 0.2, badgeSize * 0.1, 6);
    badgeCtx.fillStyle = "rgba(255, 213, 110, 0.98)";
    badgeCtx.fill();
    badgeCtx.strokeStyle = "rgba(255, 243, 190, 0.98)";
    badgeCtx.lineWidth = Math.max(1, badgeSize * 0.08);
    badgeCtx.beginPath();
    badgeCtx.moveTo(badgeX + (badgeSize * 0.7), badgeY + (badgeSize * 0.24));
    badgeCtx.lineTo(badgeX + (badgeSize * 0.7), badgeY + (badgeSize * 0.62));
    badgeCtx.moveTo(badgeX + (badgeSize * 0.52), badgeY + (badgeSize * 0.43));
    badgeCtx.lineTo(badgeX + (badgeSize * 0.88), badgeY + (badgeSize * 0.43));
    badgeCtx.stroke();
  }, {
    fill: "rgba(78, 58, 15, 0.9)",
    stroke: "rgba(255, 227, 148, 0.92)",
  });
}

function drawUpgradeNetworkOverlay(ctx, x, y, size) {
  drawUpgradeBadge(ctx, x, y, size, (badgeCtx, badgeX, badgeY, badgeSize) => {
    const nodes = [
      [badgeX + (badgeSize * 0.28), badgeY + (badgeSize * 0.64)],
      [badgeX + (badgeSize * 0.5), badgeY + (badgeSize * 0.3)],
      [badgeX + (badgeSize * 0.74), badgeY + (badgeSize * 0.62)],
    ];
    badgeCtx.strokeStyle = "rgba(255, 220, 128, 0.95)";
    badgeCtx.lineWidth = Math.max(1, badgeSize * 0.075);
    badgeCtx.beginPath();
    badgeCtx.moveTo(nodes[0][0], nodes[0][1]);
    badgeCtx.lineTo(nodes[1][0], nodes[1][1]);
    badgeCtx.lineTo(nodes[2][0], nodes[2][1]);
    badgeCtx.stroke();
    badgeCtx.fillStyle = "rgba(255, 220, 128, 0.98)";
    for (const [nodeX, nodeY] of nodes) {
      badgeCtx.beginPath();
      badgeCtx.arc(nodeX, nodeY, badgeSize * 0.08, 0, Math.PI * 2);
      badgeCtx.fill();
    }
  }, {
    fill: "rgba(82, 58, 14, 0.9)",
    stroke: "rgba(255, 227, 148, 0.92)",
  });
}

function drawUpgradeCostOverlay(ctx, x, y, size) {
  drawUpgradeBadge(ctx, x, y, size, (badgeCtx, badgeX, badgeY, badgeSize) => {
    const cx = badgeX + (badgeSize * 0.5);
    const cy = badgeY + (badgeSize * 0.5);
    badgeCtx.fillStyle = "rgba(255, 221, 132, 0.98)";
    badgeCtx.beginPath();
    badgeCtx.arc(cx, cy, badgeSize * 0.22, 0, Math.PI * 2);
    badgeCtx.fill();
    badgeCtx.fillStyle = "rgba(101, 67, 0, 0.92)";
    badgeCtx.font = `700 ${Math.max(8, badgeSize * 0.34)}px ${FONT_STACK}`;
    badgeCtx.textAlign = "center";
    badgeCtx.textBaseline = "middle";
    badgeCtx.fillText("$", cx, cy + (badgeSize * 0.02));
  }, {
    fill: "rgba(80, 58, 14, 0.9)",
    stroke: "rgba(255, 227, 148, 0.92)",
  });
}

function drawUpgradeTransparencyOverlay(ctx, x, y, size) {
  drawUpgradeBadge(ctx, x, y, size, (badgeCtx, badgeX, badgeY, badgeSize) => {
    drawPanel(
      badgeCtx,
      badgeX + (badgeSize * 0.24),
      badgeY + (badgeSize * 0.2),
      badgeSize * 0.36,
      badgeSize * 0.36,
      badgeSize * 0.08,
      "rgba(182, 221, 255, 0.28)",
      "rgba(208, 235, 255, 0.76)",
      Math.max(1, badgeSize * 0.08)
    );
    drawPanel(
      badgeCtx,
      badgeX + (badgeSize * 0.4),
      badgeY + (badgeSize * 0.36),
      badgeSize * 0.36,
      badgeSize * 0.36,
      badgeSize * 0.08,
      "rgba(182, 221, 255, 0.52)",
      "rgba(228, 245, 255, 0.94)",
      Math.max(1, badgeSize * 0.08)
    );
  }, {
    fill: "rgba(32, 42, 55, 0.9)",
    stroke: "rgba(198, 226, 255, 0.92)",
  });
}


function drawIconTowerLaser(ctx, x, y, size) {
  drawElementalCubeIcon(ctx, x, y, size, {
    frame: "rgba(88, 72, 64, 0.96)",
    frameHi: "rgba(236, 187, 123, 0.94)",
    glow: "rgba(255, 115, 54, 0.98)",
    core: "rgba(255, 227, 133, 0.96)",
  });
}


function drawIconTowerAoe(ctx, x, y, size) {
  drawElementalCubeIcon(ctx, x, y, size, {
    frame: "rgba(62, 84, 106, 0.96)",
    frameHi: "rgba(132, 207, 245, 0.94)",
    glow: "rgba(80, 196, 255, 0.98)",
    core: "rgba(184, 247, 255, 0.97)",
  });
}


function drawIconTowerSlow(ctx, x, y, size) {
  drawElementalCubeIcon(ctx, x, y, size, {
    frame: "rgba(72, 61, 101, 0.96)",
    frameHi: "rgba(191, 169, 255, 0.95)",
    glow: "rgba(169, 120, 255, 0.98)",
    core: "rgba(226, 214, 255, 0.97)",
  });
}


function drawIconTowerLaserSniper(ctx, x, y, size) {
  drawElementalCubeIcon(ctx, x, y, size, {
    frame: "rgba(64, 88, 52, 0.96)",
    frameHi: "rgba(177, 230, 136, 0.94)",
    glow: "rgba(126, 255, 96, 0.98)",
    core: "rgba(220, 255, 181, 0.97)",
  });
}


function drawIconTowerMortar(ctx, x, y, size) {
  drawElementalCubeIcon(ctx, x, y, size, {
    frame: "rgba(50, 94, 100, 0.96)",
    frameHi: "rgba(133, 230, 220, 0.94)",
    glow: "rgba(66, 245, 224, 0.98)",
    core: "rgba(196, 255, 248, 0.97)",
  });
}


function drawIconTowerTesla(ctx, x, y, size) {
  drawElementalCubeIcon(ctx, x, y, size, {
    frame: "rgba(88, 59, 90, 0.96)",
    frameHi: "rgba(245, 151, 220, 0.95)",
    glow: "rgba(255, 83, 192, 0.98)",
    core: "rgba(255, 209, 246, 0.97)",
  });
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

function drawIconTowerBlock(ctx, x, y, size) {
  const left = x + size * 0.22;
  const top = y + size * 0.22;
  const width = size * 0.56;
  const height = size * 0.56;
  drawPanel(
    ctx,
    left,
    top,
    width,
    height,
    size * 0.08,
    "rgba(93, 114, 125, 0.96)",
    "rgba(182, 222, 232, 0.94)",
    Math.max(1.2, size * 0.04)
  );
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
  drawElementalCubeIcon(ctx, x, y, size, {
    frame: "rgba(90, 76, 54, 0.96)",
    frameHi: "rgba(247, 212, 132, 0.95)",
    glow: "rgba(255, 199, 87, 0.98)",
    core: "rgba(255, 244, 194, 0.97)",
  });
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

function drawIconEditorChest(ctx, x, y, size) {
  drawPanel(
    ctx,
    x + size * 0.22,
    y + size * 0.34,
    size * 0.56,
    size * 0.32,
    size * 0.06,
    "rgba(190, 130, 72, 0.96)",
    "rgba(244, 209, 165, 0.96)",
    Math.max(1.2, size * 0.045)
  );
  drawPanel(
    ctx,
    x + size * 0.24,
    y + size * 0.22,
    size * 0.52,
    size * 0.18,
    size * 0.07,
    "rgba(156, 101, 56, 0.96)",
    "rgba(235, 196, 145, 0.92)",
    Math.max(1.1, size * 0.04)
  );
  ctx.fillStyle = "rgba(255, 226, 121, 0.98)";
  ctx.fillRect(x + size * 0.46, y + size * 0.38, size * 0.08, size * 0.16);
}

function drawIconEditorBarrel(ctx, x, y, size) {
  ctx.fillStyle = "rgba(176, 110, 74, 0.96)";
  ctx.strokeStyle = "rgba(241, 204, 180, 0.94)";
  ctx.lineWidth = Math.max(1.2, size * 0.042);
  ctx.beginPath();
  ctx.ellipse(x + size * 0.5, y + size * 0.3, size * 0.18, size * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  drawPanel(
    ctx,
    x + size * 0.32,
    y + size * 0.3,
    size * 0.36,
    size * 0.34,
    size * 0.12,
    "rgba(183, 119, 82, 0.96)",
    "rgba(241, 204, 180, 0.9)",
    Math.max(1.2, size * 0.042)
  );
  ctx.beginPath();
  ctx.ellipse(x + size * 0.5, y + size * 0.64, size * 0.18, size * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "rgba(112, 164, 216, 0.9)";
  ctx.beginPath();
  ctx.moveTo(x + size * 0.34, y + size * 0.41);
  ctx.lineTo(x + size * 0.66, y + size * 0.41);
  ctx.moveTo(x + size * 0.34, y + size * 0.54);
  ctx.lineTo(x + size * 0.66, y + size * 0.54);
  ctx.stroke();
}

function drawIconEditorStones(ctx, x, y, size) {
  const stones = [
    { x: 0.3, y: 0.58, w: 0.18, h: 0.16 },
    { x: 0.48, y: 0.48, w: 0.22, h: 0.2 },
    { x: 0.62, y: 0.6, w: 0.16, h: 0.14 },
  ];
  for (const stone of stones) {
    drawPanel(
      ctx,
      x + size * stone.x,
      y + size * stone.y,
      size * stone.w,
      size * stone.h,
      size * 0.08,
      "rgba(151, 166, 184, 0.95)",
      "rgba(220, 229, 240, 0.92)",
      Math.max(1.1, size * 0.038)
    );
  }
}

function drawIconEditorDoodad(ctx, x, y, size) {
  drawPanel(
    ctx,
    x + size * 0.2,
    y + size * 0.5,
    size * 0.6,
    size * 0.16,
    size * 0.05,
    "rgba(124, 104, 85, 0.92)",
    "rgba(229, 214, 191, 0.88)",
    Math.max(1.1, size * 0.04)
  );
  drawPanel(
    ctx,
    x + size * 0.32,
    y + size * 0.28,
    size * 0.14,
    size * 0.28,
    size * 0.06,
    "rgba(156, 163, 174, 0.94)",
    "rgba(243, 247, 252, 0.9)",
    Math.max(1.1, size * 0.04)
  );
  drawPanel(
    ctx,
    x + size * 0.52,
    y + size * 0.18,
    size * 0.12,
    size * 0.38,
    size * 0.06,
    "rgba(81, 128, 81, 0.92)",
    "rgba(213, 247, 213, 0.86)",
    Math.max(1, size * 0.035)
  );
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

const TOWER_UPGRADE_ICON_CONFIG = {
  tower_block_upgrade_cost: {
    base: drawIconTowerBlock,
    overlay: drawUpgradeCostOverlay,
  },
  tower_block_upgrade_transparency: {
    base: drawIconTowerBlock,
    overlay: drawUpgradeTransparencyOverlay,
  },
  tower_gun_upgrade_damage: {
    base: drawIconTowerLaser,
    overlay: drawUpgradeDamageOverlay,
  },
  tower_gun_upgrade_fire_rate: {
    base: drawIconTowerLaser,
    overlay: drawUpgradeFireRateOverlay,
  },
  tower_gun_upgrade_range: {
    base: drawIconTowerLaser,
    overlay: drawUpgradeRangeOverlay,
  },
  tower_gun_upgrade_pierce: {
    base: drawIconTowerLaser,
    overlay: drawUpgradePierceOverlay,
  },
  tower_aoe_upgrade_damage: {
    base: drawIconTowerAoe,
    overlay: drawUpgradeDamageOverlay,
  },
  tower_aoe_upgrade_fire_rate: {
    base: drawIconTowerAoe,
    overlay: drawUpgradeFireRateOverlay,
  },
  tower_aoe_upgrade_range: {
    base: drawIconTowerAoe,
    overlay: drawUpgradeRangeOverlay,
  },
  tower_slow_upgrade_slow_strength: {
    base: drawIconTowerSlow,
    overlay: drawUpgradeSlowStrengthOverlay,
  },
  tower_slow_upgrade_duration: {
    base: drawIconTowerSlow,
    overlay: drawUpgradeDurationOverlay,
  },
  tower_slow_upgrade_fire_rate: {
    base: drawIconTowerSlow,
    overlay: drawUpgradeFireRateOverlay,
  },
  tower_laser_sniper_upgrade_pierce: {
    base: drawIconTowerLaserSniper,
    overlay: drawUpgradePierceOverlay,
  },
  tower_laser_sniper_upgrade_damage: {
    base: drawIconTowerLaserSniper,
    overlay: drawUpgradeDamageOverlay,
  },
  tower_laser_sniper_upgrade_fire_rate: {
    base: drawIconTowerLaserSniper,
    overlay: drawUpgradeFireRateOverlay,
  },
  tower_mortar_upgrade_blast_radius: {
    base: drawIconTowerMortar,
    overlay: drawUpgradeBlastRadiusOverlay,
  },
  tower_mortar_upgrade_damage: {
    base: drawIconTowerMortar,
    overlay: drawUpgradeDamageOverlay,
  },
  tower_mortar_upgrade_fire_rate: {
    base: drawIconTowerMortar,
    overlay: drawUpgradeFireRateOverlay,
  },
  tower_tesla_upgrade_chain: {
    base: drawIconTowerTesla,
    overlay: drawUpgradeChainOverlay,
  },
  tower_tesla_upgrade_damage: {
    base: drawIconTowerTesla,
    overlay: drawUpgradeDamageOverlay,
  },
  tower_tesla_upgrade_fire_rate: {
    base: drawIconTowerTesla,
    overlay: drawUpgradeFireRateOverlay,
  },
  tower_spikes_upgrade_fire_rate: {
    base: drawIconTowerSpikes,
    overlay: drawUpgradeFireRateOverlay,
  },
  tower_spikes_upgrade_damage: {
    base: drawIconTowerSpikes,
    overlay: drawUpgradeDamageOverlay,
  },
  tower_spikes_upgrade_duration: {
    base: drawIconTowerSpikes,
    overlay: drawUpgradeDurationOverlay,
  },
  tower_plasma_upgrade_damage: {
    base: drawIconTowerPlasma,
    overlay: drawUpgradeDamageOverlay,
  },
  tower_plasma_upgrade_reach: {
    base: drawIconTowerPlasma,
    overlay: drawUpgradeReachOverlay,
  },
  tower_plasma_upgrade_width: {
    base: drawIconTowerPlasma,
    overlay: drawUpgradeWidthOverlay,
  },
  tower_buff_upgrade_range: {
    base: drawIconTowerBuff,
    overlay: drawUpgradeRangeOverlay,
  },
  tower_buff_upgrade_potency: {
    base: drawIconTowerBuff,
    overlay: drawUpgradePotencyOverlay,
  },
  tower_buff_upgrade_network: {
    base: drawIconTowerBuff,
    overlay: drawUpgradeNetworkOverlay,
  },
};

function drawTowerUpgradeCompositeIcon(ctx, iconId, x, y, size) {
  const spec = TOWER_UPGRADE_ICON_CONFIG[iconId];
  if (!spec) {
    return false;
  }
  spec.base(ctx, x, y, size);
  spec.overlay(ctx, x, y, size);
  return true;
}

export function drawIconById(ctx, iconId, x, y, size) {
  if (drawTowerUpgradeCompositeIcon(ctx, iconId, x, y, size)) {
    return;
  }
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
    case "tower_block_add":
      drawIconTowerBlock(ctx, x, y, size);
      return;
    case "tower_block":
      drawIconTowerBlock(ctx, x, y, size);
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
    case "editor_chest":
      drawIconEditorChest(ctx, x, y, size);
      return;
    case "editor_barrel":
      drawIconEditorBarrel(ctx, x, y, size);
      return;
    case "editor_stones":
      drawIconEditorStones(ctx, x, y, size);
      return;
    case "editor_doodad":
      drawIconEditorDoodad(ctx, x, y, size);
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

function normalizeEditorDoodadMenu(menuState) {
  if (!menuState || typeof menuState !== "object" || menuState.visible !== true) {
    return {
      visible: false,
      title: "Doodads",
      pageIndex: 0,
      pageCount: 1,
      columns: 5,
      rows: 3,
      items: [],
    };
  }
  const items = Array.isArray(menuState.items)
    ? menuState.items.map((item) => ({
      type: item?.type || "unknown",
      label: item?.label || item?.type || "Doodad",
      focused: item?.focused === true,
      selected: item?.selected === true,
    }))
    : [];
  return {
    visible: true,
    title: typeof menuState.title === "string" && menuState.title.length > 0
      ? menuState.title
      : "Doodads",
    pageIndex: Math.max(0, Math.floor(Number(menuState.pageIndex) || 0)),
    pageCount: Math.max(1, Math.floor(Number(menuState.pageCount) || 1)),
    columns: Math.max(1, Math.floor(Number(menuState.columns) || 5)),
    rows: Math.max(1, Math.floor(Number(menuState.rows) || 3)),
    items,
  };
}

export function createUiOverlay({
  width,
  height,
  maxPixelRatio = 2,
  maxTextureSize = Number.POSITIVE_INFINITY,
  maxCanvasPixels = 8388608,
  mobileConfig = {},
} = {}) {
  let drawCanvas = null;
  if (typeof OffscreenCanvas !== "undefined") {
    try {
      const candidateCanvas = new OffscreenCanvas(
        Math.max(1, Math.floor(width)),
        Math.max(1, Math.floor(height))
      );
      if (candidateCanvas.getContext("2d")) {
        drawCanvas = candidateCanvas;
      }
    } catch (error) {
      // Fall back to a DOM canvas when OffscreenCanvas is unavailable or partial.
    }
  }
  if (!drawCanvas) {
    drawCanvas = document.createElement("canvas");
  }
  const drawCtx = drawCanvas.getContext("2d");
  if (!drawCtx) {
    throw new Error("Failed to create 2D UI overlay context.");
  }
  const overlayTexture = new THREE.CanvasTexture(drawCanvas);
  overlayTexture.generateMipmaps = false;
  overlayTexture.minFilter = THREE.LinearFilter;
  overlayTexture.magFilter = THREE.LinearFilter;
  overlayTexture.colorSpace = THREE.SRGBColorSpace;
  overlayTexture.needsUpdate = true;

  const overlayScene = new THREE.Scene();
  const overlayCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
  overlayCamera.position.z = 1;

  const overlayQuad = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.MeshBasicMaterial({
      map: overlayTexture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    })
  );
  overlayQuad.frustumCulled = false;
  overlayScene.add(overlayQuad);
  const mobileUiConfig = {
    ...MOBILE_UI_DEFAULTS,
    ...(mobileConfig && typeof mobileConfig === "object" ? mobileConfig : {}),
  };

  let viewportWidth = Math.max(1, Math.floor(width));
  let viewportHeight = Math.max(1, Math.floor(height));
  let pixelRatio = 1;

  const state = {
    hudVisible: true,
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
    waveNumber: 1,
    towerInventory: [],
    selectedTowerType: null,
    editorDoodadMenu: normalizeEditorDoodadMenu(null),
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
      primaryAlt: false,
      jump: false,
      cancel: false,
      sell: false,
    },
    sellPrompt: {
      visible: false,
      x: 0,
      y: 0,
      progress: 0,
      refund: 0,
      keyHint: "",
    },
    runtimeUi: {
      sessionScreen: "in_run",
      overlayScreen: "none",
      masterVolume: 1,
      mouseSensitivity: 0.5,
      mouseSensitivityVisible: false,
      mainMenu: {
        title: "Cube Command",
        subtitle: "",
        status: "",
        startLabel: "Start",
        startDisabled: false,
        selectedDifficultyId: "normal",
        difficultyDisabled: false,
        difficultyHint: "",
        difficultyOptions: [],
        shareVisible: false,
        shareLabel: "Share Co-op",
        shareDisabled: false,
        shareStatus: "",
        shareUrl: "",
        nativeShareVisible: false,
        nativeShareDisabled: false,
        fullscreenLabel: "Enter Fullscreen",
        fullscreenDisabled: false,
      },
      pauseMenu: {
        title: "Paused",
        subtitle: "",
        resumeLabel: "Resume",
        resumeDisabled: false,
        fullscreenLabel: "Enter Fullscreen",
        fullscreenDisabled: false,
      },
      weaponMenu: {
        title: "Choose Your Weapon",
        subtitle: "",
        options: [],
      },
      hostToast: {
        visible: false,
        message: "",
        alpha: 0,
      },
    },
  };

  let menuOptionRects = [];
  let runtimeActionRects = [];
  let techTreeNodeRects = [];
  let techTreePanelRect = null;
  let towerSlotRects = [];
  let editorDoodadItemRects = [];
  let hudButtonRects = [];
  let touchActionZones = [];
  let touchBlockedRects = [];
  let shareLinkInputRect = null;
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
    const basePixelRatio = clamp(window.devicePixelRatio || 1, 1, maxPixelRatio);
    const textureRatioCap = Number.isFinite(maxTextureSize) && maxTextureSize > 0
      ? Math.min(
        maxTextureSize / viewportWidth,
        maxTextureSize / viewportHeight
      )
      : basePixelRatio;
    const areaRatioCap = Number.isFinite(maxCanvasPixels) && maxCanvasPixels > 0
      ? Math.sqrt(maxCanvasPixels / Math.max(1, viewportWidth * viewportHeight))
      : basePixelRatio;
    pixelRatio = Math.max(0.5, Math.min(basePixelRatio, textureRatioCap, areaRatioCap));
    const nextCanvasWidth = Math.max(1, Math.floor(viewportWidth * pixelRatio));
    const nextCanvasHeight = Math.max(1, Math.floor(viewportHeight * pixelRatio));
    if (nextCanvasWidth !== drawCanvas.width || nextCanvasHeight !== drawCanvas.height) {
      drawCanvas.width = nextCanvasWidth;
      drawCanvas.height = nextCanvasHeight;
      overlayTexture.dispose();
    }
    overlayTexture.needsUpdate = true;
    state.menuCursorX = clamp(state.menuCursorX, 0, viewportWidth);
    state.menuCursorY = clamp(state.menuCursorY, 0, viewportHeight);
  }

  function setState(partialState) {
    if (!partialState || typeof partialState !== "object") {
      return;
    }

    if (typeof partialState.hudVisible === "boolean") {
      state.hudVisible = partialState.hudVisible;
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
    if (typeof partialState.waveNumber === "number" && Number.isFinite(partialState.waveNumber)) {
      state.waveNumber = Math.max(1, Math.floor(partialState.waveNumber));
    }
    if (Array.isArray(partialState.towerInventory)) {
      state.towerInventory = normalizeTowerInventory(partialState.towerInventory);
    }
    if (Object.prototype.hasOwnProperty.call(partialState, "selectedTowerType")) {
      state.selectedTowerType = partialState.selectedTowerType || null;
    }
    if (Object.prototype.hasOwnProperty.call(partialState, "editorDoodadMenu")) {
      state.editorDoodadMenu = normalizeEditorDoodadMenu(partialState.editorDoodadMenu);
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
        primaryAlt: !!partialState.pressedActions.primaryAlt,
        jump: !!partialState.pressedActions.jump,
        cancel: !!partialState.pressedActions.cancel,
        sell: !!partialState.pressedActions.sell,
      };
    }
    if (partialState.sellPrompt && typeof partialState.sellPrompt === "object") {
      state.sellPrompt = {
        visible: partialState.sellPrompt.visible === true,
        x: Number.isFinite(Number(partialState.sellPrompt.x)) ? Number(partialState.sellPrompt.x) : 0,
        y: Number.isFinite(Number(partialState.sellPrompt.y)) ? Number(partialState.sellPrompt.y) : 0,
        progress: clamp(Number(partialState.sellPrompt.progress) || 0, 0, 1),
        refund: Math.max(0, Math.floor(Number(partialState.sellPrompt.refund) || 0)),
        keyHint: typeof partialState.sellPrompt.keyHint === "string" ? partialState.sellPrompt.keyHint : "",
      };
    }
    if (partialState.runtimeUi && typeof partialState.runtimeUi === "object") {
      const runtimeUi = partialState.runtimeUi;
      state.runtimeUi.sessionScreen = runtimeUi.sessionScreen === "main_menu" ? "main_menu" : "in_run";
      state.runtimeUi.overlayScreen = typeof runtimeUi.overlayScreen === "string"
        ? runtimeUi.overlayScreen
        : "none";
      if (typeof runtimeUi.masterVolume === "number" && Number.isFinite(runtimeUi.masterVolume)) {
        state.runtimeUi.masterVolume = clamp(runtimeUi.masterVolume, 0, 1);
      }
      if (typeof runtimeUi.mouseSensitivity === "number" && Number.isFinite(runtimeUi.mouseSensitivity)) {
        state.runtimeUi.mouseSensitivity = clamp(runtimeUi.mouseSensitivity, 0, 1);
      }
      if (typeof runtimeUi.mouseSensitivityVisible === "boolean") {
        state.runtimeUi.mouseSensitivityVisible = runtimeUi.mouseSensitivityVisible;
      }

      if (runtimeUi.mainMenu && typeof runtimeUi.mainMenu === "object") {
        const mainMenu = runtimeUi.mainMenu;
        state.runtimeUi.mainMenu = {
          ...state.runtimeUi.mainMenu,
          title: typeof mainMenu.title === "string" && mainMenu.title.length > 0
            ? mainMenu.title
            : state.runtimeUi.mainMenu.title,
          subtitle: typeof mainMenu.subtitle === "string" ? mainMenu.subtitle : "",
          status: typeof mainMenu.status === "string" ? mainMenu.status : "",
          startLabel: typeof mainMenu.startLabel === "string" && mainMenu.startLabel.length > 0
            ? mainMenu.startLabel
            : "Start",
          startDisabled: mainMenu.startDisabled === true,
          selectedDifficultyId: typeof mainMenu.selectedDifficultyId === "string" && mainMenu.selectedDifficultyId.length > 0
            ? mainMenu.selectedDifficultyId
            : state.runtimeUi.mainMenu.selectedDifficultyId,
          difficultyDisabled: mainMenu.difficultyDisabled === true,
          difficultyHint: typeof mainMenu.difficultyHint === "string" ? mainMenu.difficultyHint : "",
          difficultyOptions: Array.isArray(mainMenu.difficultyOptions)
            ? mainMenu.difficultyOptions
              .filter((option) => option && typeof option.id === "string" && option.id.length > 0)
              .map((option) => ({
                id: option.id,
                label: typeof option.label === "string" && option.label.length > 0
                  ? option.label
                  : option.id,
              }))
            : [],
          shareVisible: mainMenu.shareVisible === true,
          shareLabel: typeof mainMenu.shareLabel === "string" && mainMenu.shareLabel.length > 0
            ? mainMenu.shareLabel
            : "Share Co-op",
          shareDisabled: mainMenu.shareDisabled === true,
          shareStatus: typeof mainMenu.shareStatus === "string" ? mainMenu.shareStatus : "",
          shareUrl: typeof mainMenu.shareUrl === "string" ? mainMenu.shareUrl : "",
          nativeShareVisible: mainMenu.nativeShareVisible === true,
          nativeShareDisabled: mainMenu.nativeShareDisabled === true,
          fullscreenLabel: typeof mainMenu.fullscreenLabel === "string" && mainMenu.fullscreenLabel.length > 0
            ? mainMenu.fullscreenLabel
            : "Enter Fullscreen",
          fullscreenDisabled: mainMenu.fullscreenDisabled === true,
        };
      }

      if (runtimeUi.pauseMenu && typeof runtimeUi.pauseMenu === "object") {
        const pauseMenu = runtimeUi.pauseMenu;
        state.runtimeUi.pauseMenu = {
          ...state.runtimeUi.pauseMenu,
          title: typeof pauseMenu.title === "string" && pauseMenu.title.length > 0
            ? pauseMenu.title
            : "Paused",
          subtitle: typeof pauseMenu.subtitle === "string" ? pauseMenu.subtitle : "",
          resumeLabel: typeof pauseMenu.resumeLabel === "string" && pauseMenu.resumeLabel.length > 0
            ? pauseMenu.resumeLabel
            : "Resume",
          resumeDisabled: pauseMenu.resumeDisabled === true,
          fullscreenLabel: typeof pauseMenu.fullscreenLabel === "string" && pauseMenu.fullscreenLabel.length > 0
            ? pauseMenu.fullscreenLabel
            : "Enter Fullscreen",
          fullscreenDisabled: pauseMenu.fullscreenDisabled === true,
        };
      }

      if (runtimeUi.weaponMenu && typeof runtimeUi.weaponMenu === "object") {
        const weaponMenu = runtimeUi.weaponMenu;
        state.runtimeUi.weaponMenu = {
          title: typeof weaponMenu.title === "string" && weaponMenu.title.length > 0
            ? weaponMenu.title
            : "Choose Your Weapon",
          subtitle: typeof weaponMenu.subtitle === "string" ? weaponMenu.subtitle : "",
          options: Array.isArray(weaponMenu.options)
            ? weaponMenu.options
              .filter((option) => option && typeof option.type === "string" && option.type.length > 0)
              .map((option) => ({
                type: option.type,
                label: typeof option.label === "string" && option.label.length > 0
                  ? option.label
                  : option.type,
                iconId: typeof option.iconId === "string" && option.iconId.length > 0
                  ? option.iconId
                  : "weapon_machine_gun",
              }))
            : [],
        };
      }

      if (runtimeUi.hostToast && typeof runtimeUi.hostToast === "object") {
        const hostToast = runtimeUi.hostToast;
        state.runtimeUi.hostToast = {
          visible: hostToast.visible === true,
          message: typeof hostToast.message === "string" ? hostToast.message : "",
          alpha: clamp(Number(hostToast.alpha) || 0, 0, 1),
        };
      }
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
    return stackBottom;
  }

  function getMobileBuildPhaseStackAnchor() {
    if (!state.showTouchControls || state.menuOpen) {
      return null;
    }
    return {
      panelX: clamp(viewportWidth * 0.02, 12, 20),
      panelY: clamp(viewportHeight * 0.12, 96, 110),
    };
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
    const mobileBuildPhaseAnchor = getMobileBuildPhaseStackAnchor();
    const panelHeight = state.showTouchControls
      ? clamp(viewportHeight * 0.056, 34, 52)
      : clamp(viewportHeight * 0.052, 32, 48);
    const panelWidth = state.showTouchControls
      ? clamp(viewportWidth * 0.18, 128, 168)
      : clamp(viewportWidth * 0.2, 130, 246);
    const panelX = mobileBuildPhaseAnchor
      ? mobileBuildPhaseAnchor.panelX
      : clamp(viewportWidth * 0.02, 12, 20);
    const panelY = mobileBuildPhaseAnchor
      ? mobileBuildPhaseAnchor.panelY
      : clamp(viewportHeight * 0.02, 12, 20);
    return {
      panelX,
      panelY,
      panelWidth,
      panelHeight,
    };
  }

  function getMobileStartWaveButtonRect(buttonHeight) {
    if (!state.showTouchControls || !state.showNextWaveButton || state.menuOpen) {
      return null;
    }
    const buildPhaseTimerRect = getBuildPhaseTimerRect();
    if (!buildPhaseTimerRect) {
      return null;
    }
    const resolvedButtonHeight = Number.isFinite(buttonHeight)
      ? buttonHeight
      : clamp(buildPhaseTimerRect.panelHeight * 0.92, 30, 54);
    const verticalGap = clamp(viewportHeight * 0.012, 6, 10);
    return {
      x: buildPhaseTimerRect.panelX,
      y: buildPhaseTimerRect.panelY + buildPhaseTimerRect.panelHeight + verticalGap,
      width: clamp(Math.max(buildPhaseTimerRect.panelWidth, 132), 128, 176),
      height: resolvedButtonHeight,
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
    const showMobileStartWaveButton = state.showTouchControls && showNextWave;
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
    if (showNextWave && !showMobileStartWaveButton) {
      buttons.push({
        id: "next_wave",
        label: "Start Wave (F)",
        active: false,
      });
    }
    if (buttons.length === 0 && !showMobileStartWaveButton) {
      return;
    }

    drawCtx.font = `700 ${labelFontSize}px ${FONT_STACK}`;
    function drawHudButton(button, x, y, buttonWidth) {
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
    }

    let nextRightX = panelX - buttonGap;
    for (const button of buttons) {
      const textWidth = drawCtx.measureText(button.label).width;
      const buttonWidth = clamp(textWidth + (buttonHeight * 0.86), 44, 126);
      const x = Math.max(6, nextRightX - buttonWidth);
      const y = panelY + (panelHeight - buttonHeight) * 0.5;
      drawHudButton(button, x, y, buttonWidth);
      nextRightX = x - buttonGap;
    }

    if (showMobileStartWaveButton) {
      const button = {
        id: "next_wave",
        label: "Start Wave",
        active: false,
      };
      const mobileButtonRect = getMobileStartWaveButtonRect(buttonHeight);
      if (mobileButtonRect) {
        const textWidth = drawCtx.measureText(button.label).width;
        const buttonWidth = clamp(
          Math.max(mobileButtonRect.width, textWidth + (buttonHeight * 0.86)),
          44,
          176
        );
        drawHudButton(button, mobileButtonRect.x, mobileButtonRect.y, buttonWidth);
      }
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

  function drawEditorDoodadMenu() {
    editorDoodadItemRects = [];
    if (!state.editorDoodadMenu.visible) {
      return;
    }

    drawCtx.fillStyle = "rgba(3, 8, 15, 0.56)";
    drawCtx.fillRect(0, 0, viewportWidth, viewportHeight);

    const panelWidth = clamp(viewportWidth * 0.74, 400, 940);
    const panelHeight = clamp(viewportHeight * 0.68, 320, 640);
    const panelX = (viewportWidth - panelWidth) * 0.5;
    const panelY = (viewportHeight - panelHeight) * 0.5;
    const titleFontSize = clamp(panelHeight * 0.07, 22, 34);
    const subtitleFontSize = clamp(panelHeight * 0.035, 12, 16);
    const columns = Math.max(1, state.editorDoodadMenu.columns || 5);
    const rows = Math.max(1, state.editorDoodadMenu.rows || 3);
    const headerHeight = clamp(panelHeight * 0.2, 68, 108);
    const footerHeight = clamp(panelHeight * 0.14, 48, 72);
    const innerPaddingX = clamp(panelWidth * 0.045, 16, 26);
    const innerPaddingY = clamp(panelHeight * 0.04, 14, 24);
    const gridGap = clamp(Math.min(panelWidth, panelHeight) * 0.02, 8, 16);
    const gridX = panelX + innerPaddingX;
    const gridY = panelY + headerHeight;
    const gridWidth = panelWidth - (innerPaddingX * 2);
    const gridHeight = panelHeight - headerHeight - footerHeight - innerPaddingY;
    const cellWidth = Math.max(44, (gridWidth - (gridGap * (columns - 1))) / columns);
    const cellHeight = Math.max(56, (gridHeight - (gridGap * (rows - 1))) / rows);

    drawPanel(
      drawCtx,
      panelX,
      panelY,
      panelWidth,
      panelHeight,
      clamp(panelHeight * 0.05, 12, 18),
      "rgba(10, 18, 30, 0.96)",
      "rgba(182, 214, 240, 0.74)",
      1.6
    );

    drawCtx.textAlign = "left";
    drawCtx.textBaseline = "top";
    drawCtx.fillStyle = "rgba(239, 246, 255, 0.98)";
    drawCtx.font = `700 ${titleFontSize}px ${FONT_STACK}`;
    drawCtx.fillText(state.editorDoodadMenu.title, panelX + innerPaddingX, panelY + innerPaddingY);

    const pageLabel = `Page ${state.editorDoodadMenu.pageIndex + 1}/${state.editorDoodadMenu.pageCount}`;
    drawCtx.fillStyle = "rgba(163, 197, 226, 0.92)";
    drawCtx.font = `600 ${subtitleFontSize}px ${FONT_STACK}`;
    drawCtx.textAlign = "right";
    drawCtx.fillText(pageLabel, panelX + panelWidth - innerPaddingX, panelY + innerPaddingY + 4);

    for (let i = 0; i < state.editorDoodadMenu.items.length; i += 1) {
      const item = state.editorDoodadMenu.items[i];
      const col = i % columns;
      const row = Math.floor(i / columns);
      const x = gridX + (col * (cellWidth + gridGap));
      const y = gridY + (row * (cellHeight + gridGap));
      const fill = item.focused
        ? "rgba(29, 61, 86, 0.98)"
        : (item.selected ? "rgba(27, 52, 42, 0.94)" : "rgba(17, 28, 43, 0.88)");
      const stroke = item.focused
        ? "rgba(127, 224, 255, 0.94)"
        : (item.selected ? "rgba(137, 255, 186, 0.84)" : "rgba(137, 164, 193, 0.46)");

      drawPanel(
        drawCtx,
        x,
        y,
        cellWidth,
        cellHeight,
        clamp(cellHeight * 0.14, 8, 12),
        fill,
        stroke,
        item.focused ? 1.8 : 1.2
      );

      const iconSize = Math.min(cellWidth * 0.52, cellHeight * 0.46);
      const iconX = x + (cellWidth - iconSize) * 0.5;
      const iconY = y + clamp(cellHeight * 0.08, 6, 12);
      drawIconById(drawCtx, "editor_doodad", iconX, iconY, iconSize);

      const labelWidth = cellWidth - 12;
      const labelBaseSize = clamp(cellHeight * 0.16, 10, 15);
      const labelBoxY = y + cellHeight - clamp(cellHeight * 0.34, 22, 36);
      drawCtx.textAlign = "center";
      drawCtx.textBaseline = "middle";
      drawCtx.fillStyle = item.focused
        ? "rgba(243, 251, 255, 0.99)"
        : "rgba(220, 234, 247, 0.95)";
      const fittedLabel = fitLabelText(
        drawCtx,
        item.label,
        labelWidth,
        labelBaseSize,
        9,
        600
      );
      drawCtx.font = `600 ${fittedLabel.fontSize}px ${FONT_STACK}`;
      drawCtx.fillText(
        fittedLabel.text,
        x + cellWidth * 0.5,
        labelBoxY
      );

      editorDoodadItemRects.push({
        type: item.type,
        x,
        y,
        width: cellWidth,
        height: cellHeight,
      });
    }

    drawCtx.textAlign = "left";
    drawCtx.textBaseline = "middle";
    drawCtx.fillStyle = "rgba(182, 205, 226, 0.92)";
    drawCtx.font = `600 ${subtitleFontSize}px ${FONT_STACK}`;
    drawCtx.fillText(
      "Arrows move  Enter select  Wheel page  Esc close",
      panelX + innerPaddingX,
      panelY + panelHeight - (footerHeight * 0.5)
    );
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
    const movePadVerticalOffset = clamp(
      Number(mobileUiConfig.movePadVerticalOffsetPx) || MOBILE_UI_DEFAULTS.movePadVerticalOffsetPx,
      0,
      Math.max(0, viewportHeight * 0.45)
    );

    const defaultMovePadCenterY = clamp(
      viewportHeight - bottomOffset - movePadActivationRadius - movePadVerticalOffset,
      movePadActivationRadius + 6,
      viewportHeight - movePadActivationRadius - 6
    );
    const movePadCenterX = typeof state.movePadCenterX === "number"
      && Number.isFinite(state.movePadCenterX)
      ? clamp(state.movePadCenterX, movePadActivationRadius + 6, viewportWidth - movePadActivationRadius - 6)
      : defaultMovePadCenterX;
    const movePadCenterY = typeof state.movePadCenterY === "number"
      && Number.isFinite(state.movePadCenterY)
      ? clamp(state.movePadCenterY, movePadActivationRadius + 6, viewportHeight - movePadActivationRadius - 6)
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
    const leftPrimaryRadius = primaryRadius;
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
    const leftPrimaryCenterX = clamp(
      edgeMargin + leftPrimaryRadius,
      leftPrimaryRadius + 6,
      viewportWidth - leftPrimaryRadius - 6
    );
    const leftPrimaryCenterY = primaryCenterY;
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

      if (action === "primary" || action === "primaryAlt") {
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
    drawActionButton(
      "primaryAlt",
      leftPrimaryCenterX,
      leftPrimaryCenterY,
      leftPrimaryRadius,
      state.buildMode ? "Place" : "Fire"
    );
    drawActionButton("jump", jumpCenterX, jumpCenterY, jumpRadius, "Jetpack");
    if (state.buildMode) {
      drawActionButton("cancel", cancelCenterX, cancelCenterY, cancelRadius, "Cancel");
    }

    drawCtx.textAlign = "left";
    drawCtx.textBaseline = "alphabetic";
  }

  function drawSellPrompt() {
    const prompt = state.sellPrompt;
    if (!prompt?.visible || state.menuOpen) {
      return;
    }

    const minDim = Math.min(viewportWidth, viewportHeight);
    const radius = state.showTouchControls
      ? clamp(minDim * 0.06, 30, 50)
      : clamp(minDim * 0.043, 24, 38);
    const cx = clamp(prompt.x, radius + 6, viewportWidth - radius - 6);
    const cy = clamp(prompt.y, radius + 6, viewportHeight - radius - 6);
    const progress = clamp(prompt.progress, 0, 1);
    const pressed = !!state.pressedActions?.sell;

    drawCtx.beginPath();
    drawCtx.arc(cx, cy, radius, 0, Math.PI * 2);
    drawCtx.fillStyle = pressed ? "rgba(123, 76, 46, 0.88)" : "rgba(28, 38, 52, 0.8)";
    drawCtx.fill();
    drawCtx.lineWidth = pressed ? 2.8 : 1.8;
    drawCtx.strokeStyle = pressed ? "rgba(255, 204, 147, 0.96)" : "rgba(205, 222, 242, 0.72)";
    drawCtx.stroke();

    drawCtx.beginPath();
    drawCtx.arc(cx, cy, radius * 0.66, 0, Math.PI * 2);
    drawCtx.fillStyle = "rgba(8, 13, 21, 0.58)";
    drawCtx.fill();

    if (progress > 0) {
      const startAngle = -Math.PI * 0.5;
      const endAngle = startAngle + (Math.PI * 2 * progress);
      drawCtx.beginPath();
      drawCtx.arc(cx, cy, radius * 0.89, startAngle, endAngle, false);
      drawCtx.lineWidth = Math.max(3, radius * 0.16);
      drawCtx.strokeStyle = "rgba(120, 255, 176, 0.98)";
      drawCtx.lineCap = "round";
      drawCtx.stroke();
      drawCtx.lineCap = "butt";
    }

    drawCtx.fillStyle = "rgba(242, 255, 247, 0.98)";
    drawCtx.textAlign = "center";
    drawCtx.textBaseline = "middle";
    drawCtx.font = `800 ${clamp(radius * 0.72, 15, 26)}px ${FONT_STACK}`;
    drawCtx.fillText("$", cx, cy - (radius * 0.02));

    const labelText = prompt.refund > 0 ? `Sell $${prompt.refund}` : "Sell";
    const labelFont = clamp(radius * 0.34, 11, 16);
    drawCtx.font = `700 ${labelFont}px ${FONT_STACK}`;
    const labelWidth = clamp(drawCtx.measureText(labelText).width + 20, 56, radius * 4);
    const labelHeight = clamp(labelFont * 1.55, 20, 28);
    const labelX = clamp(cx - (labelWidth * 0.5), 6, viewportWidth - labelWidth - 6);
    const labelY = clamp(cy + radius + 6, 6, viewportHeight - labelHeight - 6);
    drawPanel(
      drawCtx,
      labelX,
      labelY,
      labelWidth,
      labelHeight,
      clamp(labelHeight * 0.36, 6, 10),
      "rgba(10, 21, 34, 0.86)",
      "rgba(174, 255, 213, 0.7)",
      1.2
    );
    drawCtx.fillStyle = "rgba(214, 255, 228, 0.98)";
    drawCtx.fillText(labelText, labelX + labelWidth * 0.5, labelY + labelHeight * 0.55);

    if (!state.showTouchControls && prompt.keyHint) {
      const keyFont = clamp(radius * 0.3, 10, 14);
      drawCtx.font = `700 ${keyFont}px ${FONT_STACK}`;
      const keyText = prompt.keyHint;
      const keyWidth = clamp(drawCtx.measureText(keyText).width + 16, 42, radius * 3);
      const keyHeight = clamp(keyFont * 1.5, 18, 24);
      const keyX = clamp(cx - (keyWidth * 0.5), 6, viewportWidth - keyWidth - 6);
      const keyY = clamp(cy - radius - keyHeight - 6, 6, viewportHeight - keyHeight - 6);
      drawPanel(
        drawCtx,
        keyX,
        keyY,
        keyWidth,
        keyHeight,
        clamp(keyHeight * 0.32, 5, 9),
        "rgba(9, 16, 28, 0.9)",
        "rgba(191, 232, 255, 0.72)",
        1.2
      );
      drawCtx.fillStyle = "rgba(227, 242, 255, 0.98)";
      drawCtx.fillText(keyText, keyX + keyWidth * 0.5, keyY + keyHeight * 0.55);
    }

    if (state.showTouchControls) {
      touchActionZones.push({ action: "sell", cx, cy, radius });
      pushTouchBlockedRect(cx - radius, cy - radius, radius * 2, radius * 2);
      pushTouchBlockedRect(labelX, labelY, labelWidth, labelHeight);
    }

    drawCtx.textAlign = "left";
    drawCtx.textBaseline = "alphabetic";
  }

  function formatPercentText(value) {
    return `${Math.round(clamp(Number(value) || 0, 0, 1) * 100)}%`;
  }

  function isRuntimeMainMenuVisible() {
    return state.runtimeUi.sessionScreen === "main_menu";
  }

  function isRuntimePauseMenuVisible() {
    return state.runtimeUi.sessionScreen === "in_run"
      && state.runtimeUi.overlayScreen === "pause_menu";
  }

  function isRuntimeWeaponMenuVisible() {
    return state.runtimeUi.sessionScreen === "in_run"
      && state.runtimeUi.overlayScreen === "weapon_select";
  }

  function isRuntimeUiVisible() {
    return isRuntimeMainMenuVisible()
      || isRuntimePauseMenuVisible()
      || isRuntimeWeaponMenuVisible();
  }

  function registerRuntimeActionRect(rect) {
    if (!rect || typeof rect.id !== "string" || rect.id.length === 0) {
      return;
    }
    runtimeActionRects.push({
      id: rect.id,
      kind: typeof rect.kind === "string" ? rect.kind : "button",
      x: Number(rect.x) || 0,
      y: Number(rect.y) || 0,
      width: Math.max(0, Number(rect.width) || 0),
      height: Math.max(0, Number(rect.height) || 0),
      trackX: Number(rect.trackX) || 0,
      trackWidth: Math.max(0, Number(rect.trackWidth) || 0),
    });
  }

  function drawRuntimeButton({
    x,
    y,
    width,
    height,
    label,
    actionId = "",
    disabled = false,
    selected = false,
    primary = false,
  }) {
    const fill = disabled
      ? "rgba(28, 38, 54, 0.68)"
      : (selected
        ? "rgba(39, 112, 202, 0.96)"
        : (primary ? "rgba(39, 112, 202, 0.96)" : "rgba(20, 31, 50, 0.94)"));
    const stroke = disabled
      ? "rgba(130, 156, 188, 0.28)"
      : (selected || primary
        ? "rgba(157, 214, 255, 0.58)"
        : "rgba(255, 255, 255, 0.18)");
    drawPanel(
      drawCtx,
      x,
      y,
      width,
      height,
      clamp(height * 0.28, 10, 16),
      fill,
      stroke,
      disabled ? 1 : 1.25
    );

    drawCtx.fillStyle = disabled ? "rgba(232, 241, 255, 0.58)" : "rgba(244, 248, 255, 0.98)";
    drawCtx.textAlign = "center";
    drawCtx.textBaseline = "middle";
    const fittedLabel = fitLabelText(
      drawCtx,
      label,
      Math.max(24, width - 18),
      clamp(height * 0.34, 13, 17),
      11,
      700
    );
    drawCtx.font = `700 ${fittedLabel.fontSize}px ${FONT_STACK}`;
    drawCtx.fillText(fittedLabel.text, x + width * 0.5, y + height * 0.54);

    if (actionId && !disabled) {
      registerRuntimeActionRect({
        id: actionId,
        x,
        y,
        width,
        height,
      });
    }
  }

  function drawRuntimeSlider({
    x,
    y,
    width,
    label,
    value,
    actionId,
    disabled = false,
  }) {
    const safeValue = clamp(value, 0, 1);
    const labelFont = clamp(width * 0.043, 12, 14);
    const trackHeight = clamp(viewportHeight * 0.012, 8, 11);
    const knobRadius = clamp(trackHeight * 1.2, 9, 12);
    const trackY = y + labelFont + 12;
    const percentText = formatPercentText(safeValue);

    drawCtx.textAlign = "left";
    drawCtx.textBaseline = "middle";
    drawCtx.fillStyle = "rgba(255, 255, 255, 0.96)";
    drawCtx.font = `700 ${labelFont}px ${FONT_STACK}`;
    drawCtx.fillText(label, x, y + (labelFont * 0.5));

    drawCtx.textAlign = "right";
    drawCtx.fillStyle = disabled ? "rgba(229, 239, 255, 0.54)" : "rgba(255, 255, 255, 0.9)";
    drawCtx.fillText(percentText, x + width, y + (labelFont * 0.5));

    drawPanel(
      drawCtx,
      x,
      trackY,
      width,
      trackHeight,
      999,
      "rgba(8, 15, 25, 0.84)",
      disabled ? "rgba(130, 156, 188, 0.25)" : "rgba(164, 213, 255, 0.4)",
      1
    );

    const fillWidth = Math.max(0, width * safeValue);
    if (fillWidth > 0.5) {
      const gradient = drawCtx.createLinearGradient(x, trackY, x + width, trackY);
      gradient.addColorStop(0, disabled ? "rgba(93, 128, 163, 0.46)" : "#58f3ff");
      gradient.addColorStop(1, disabled ? "rgba(112, 156, 194, 0.56)" : "#5fb6ff");
      drawPanel(
        drawCtx,
        x,
        trackY,
        fillWidth,
        trackHeight,
        999,
        gradient,
        null
      );
    }

    const knobX = x + (width * safeValue);
    drawCtx.beginPath();
    drawCtx.arc(knobX, trackY + (trackHeight * 0.5), knobRadius, 0, Math.PI * 2);
    drawCtx.fillStyle = disabled ? "rgba(208, 224, 241, 0.46)" : "rgba(237, 247, 255, 0.96)";
    drawCtx.fill();
    drawCtx.lineWidth = 1.6;
    drawCtx.strokeStyle = disabled ? "rgba(114, 147, 178, 0.3)" : "rgba(112, 186, 255, 0.9)";
    drawCtx.stroke();

    if (actionId && !disabled) {
      registerRuntimeActionRect({
        id: actionId,
        kind: "slider",
        x,
        y,
        width,
        height: (trackY - y) + Math.max(trackHeight, knobRadius * 2),
        trackX: x,
        trackWidth: width,
      });
    }

    drawCtx.textAlign = "left";
    drawCtx.textBaseline = "alphabetic";

    return {
      height: (trackY - y) + Math.max(trackHeight, knobRadius * 2),
    };
  }

  function drawShareInputSlot(x, y, width, height) {
    drawPanel(
      drawCtx,
      x,
      y,
      width,
      height,
      clamp(height * 0.26, 9, 12),
      "rgba(7, 12, 20, 0.9)",
      "rgba(255, 255, 255, 0.18)",
      1.1
    );
    shareLinkInputRect = { x, y, width, height };
  }

  function drawRuntimeMainMenu() {
    const mainMenu = state.runtimeUi.mainMenu;
    const compact = viewportHeight < 760 || viewportWidth < 900;
    const panelWidth = compact
      ? clamp(viewportWidth * 0.92, 300, 480)
      : clamp(viewportWidth * 0.56, 360, 540);
    const pad = compact ? 16 : 22;
    const sectionGap = compact ? 12 : 14;
    const buttonHeight = compact ? 44 : 50;
    const titleFontSize = compact ? 28 : 32;
    const shareInputHeight = compact ? 38 : 40;
    const sliderWidth = panelWidth - (pad * 2);
    const shareHasUrl = typeof mainMenu.shareUrl === "string" && mainMenu.shareUrl.length > 0;
    const showNativeShare = mainMenu.shareVisible && shareHasUrl && mainMenu.nativeShareVisible;
    const difficultyOptions = Array.isArray(mainMenu.difficultyOptions) && mainMenu.difficultyOptions.length > 0
      ? mainMenu.difficultyOptions
      : [
        { id: "easy", label: "Easy" },
        { id: "normal", label: "Normal" },
        { id: "hard", label: "Hard" },
      ];

    const titleBlockHeight = titleFontSize + 18;
    const difficultyBlockHeight = buttonHeight;
    const shareBlockHeight = mainMenu.shareVisible
      ? (
        buttonHeight
          + 14
          + (shareHasUrl ? shareInputHeight + 10 : 0)
          + (showNativeShare ? buttonHeight + 10 : 0)
      )
      : 0;
    const sliderBlockHeight = 52;
    const mouseSensitivityVisible = state.runtimeUi.mouseSensitivityVisible === true;
    const settingsBlockHeight = sliderBlockHeight
      + (mouseSensitivityVisible ? sliderBlockHeight + 10 : 0)
      + 10
      + buttonHeight;
    const panelHeight = (pad * 2)
      + titleBlockHeight
      + buttonHeight
      + difficultyBlockHeight
      + settingsBlockHeight
      + (mainMenu.shareVisible ? shareBlockHeight : 0)
      + (sectionGap * (mainMenu.shareVisible ? 3 : 2));
    const panelX = (viewportWidth - panelWidth) * 0.5;
    const panelY = clamp((viewportHeight - panelHeight) * 0.5, 8, Math.max(8, viewportHeight - panelHeight - 8));

    drawCtx.fillStyle = "rgba(3, 8, 17, 0.62)";
    drawCtx.fillRect(0, 0, viewportWidth, viewportHeight);
    drawPanel(
      drawCtx,
      panelX,
      panelY,
      panelWidth,
      panelHeight,
      20,
      "rgba(12, 18, 31, 0.98)",
      "rgba(162, 203, 255, 0.2)",
      1.2
    );

    let cursorY = panelY + pad;

    drawCtx.textAlign = "center";
    drawCtx.textBaseline = "top";
    drawCtx.fillStyle = "#ffffff";
    drawCtx.font = `800 ${titleFontSize}px ${FONT_STACK}`;
    drawCtx.fillText(mainMenu.title || "Cube Command", panelX + panelWidth * 0.5, cursorY);
    cursorY += titleBlockHeight;

    drawRuntimeButton({
      x: panelX + pad,
      y: cursorY,
      width: panelWidth - (pad * 2),
      height: buttonHeight,
      label: mainMenu.startLabel || "Start",
      actionId: "main_start",
      disabled: mainMenu.startDisabled === true,
      primary: true,
    });
    cursorY += buttonHeight + sectionGap;

    const difficultyGap = 8;
    const difficultyWidth = (
      panelWidth - (pad * 2) - (difficultyGap * Math.max(0, difficultyOptions.length - 1))
    ) / Math.max(1, difficultyOptions.length);
    for (let i = 0; i < difficultyOptions.length; i += 1) {
      const option = difficultyOptions[i];
      const buttonX = panelX + pad + (i * (difficultyWidth + difficultyGap));
      drawRuntimeButton({
        x: buttonX,
        y: cursorY,
        width: difficultyWidth,
        height: buttonHeight,
        label: option.label,
        actionId: `main_difficulty:${option.id}`,
        disabled: mainMenu.difficultyDisabled === true,
        selected: option.id === mainMenu.selectedDifficultyId,
      });
    }
    cursorY += buttonHeight + sectionGap;

    if (mainMenu.shareVisible) {
      drawRuntimeButton({
        x: panelX + pad,
        y: cursorY,
        width: panelWidth - (pad * 2),
        height: buttonHeight,
        label: mainMenu.shareLabel || "Share Co-op",
        actionId: "main_share",
        disabled: mainMenu.shareDisabled === true,
      });
      cursorY += buttonHeight + 10;

      if (shareHasUrl) {
        drawShareInputSlot(panelX + pad, cursorY, panelWidth - (pad * 2), shareInputHeight);
        cursorY += shareInputHeight + 10;
      }

      if (showNativeShare) {
        drawRuntimeButton({
          x: panelX + pad,
          y: cursorY,
          width: panelWidth - (pad * 2),
          height: buttonHeight,
          label: "Native Share",
          actionId: "main_native_share",
          disabled: mainMenu.nativeShareDisabled === true,
        });
        cursorY += buttonHeight + 10;
      }

      cursorY += Math.max(0, sectionGap - 10);
    }

    const sliderLayout = drawRuntimeSlider({
      x: panelX + pad,
      y: cursorY,
      width: sliderWidth,
      label: "Master Volume",
      value: state.runtimeUi.masterVolume,
      actionId: "main_volume",
      disabled: false,
    });
    cursorY += sliderLayout.height + 10;

    if (mouseSensitivityVisible) {
      const sensitivitySliderLayout = drawRuntimeSlider({
        x: panelX + pad,
        y: cursorY,
        width: sliderWidth,
        label: "Look Sensitivity",
        value: state.runtimeUi.mouseSensitivity,
        actionId: "main_mouse_sensitivity",
        disabled: false,
      });
      cursorY += sensitivitySliderLayout.height + 10;
    }

    drawRuntimeButton({
      x: panelX + pad,
      y: cursorY,
      width: panelWidth - (pad * 2),
      height: buttonHeight,
      label: mainMenu.fullscreenLabel || "Enter Fullscreen",
      actionId: "main_fullscreen",
      disabled: mainMenu.fullscreenDisabled === true,
    });

    drawCtx.textAlign = "left";
    drawCtx.textBaseline = "alphabetic";
  }

  function drawRuntimePauseMenu() {
    const pauseMenu = state.runtimeUi.pauseMenu;
    const compact = viewportHeight < 720 || viewportWidth < 860;
    const panelWidth = compact
      ? clamp(viewportWidth * 0.9, 280, 460)
      : clamp(viewportWidth * 0.46, 320, 520);
    const pad = compact ? 16 : 22;
    const buttonHeight = compact ? 44 : 48;
    const sectionGap = compact ? 12 : 14;
    const sliderBlockHeight = 52;
    const mouseSensitivityVisible = state.runtimeUi.mouseSensitivityVisible === true;
    const settingsBlockHeight = sliderBlockHeight + (mouseSensitivityVisible ? sliderBlockHeight + 10 : 0);
    const panelHeight = (pad * 2) + 6
      + buttonHeight
      + buttonHeight
      + settingsBlockHeight
      + buttonHeight
      + (sectionGap * 3);
    const panelX = (viewportWidth - panelWidth) * 0.5;
    const panelY = clamp((viewportHeight - panelHeight) * 0.5, 8, Math.max(8, viewportHeight - panelHeight - 8));

    drawCtx.fillStyle = "rgba(3, 8, 17, 0.62)";
    drawCtx.fillRect(0, 0, viewportWidth, viewportHeight);
    drawPanel(
      drawCtx,
      panelX,
      panelY,
      panelWidth,
      panelHeight,
      20,
      "rgba(12, 18, 31, 0.98)",
      "rgba(162, 203, 255, 0.2)",
      1.2
    );

    let cursorY = panelY + pad + 6;

    drawRuntimeButton({
      x: panelX + pad,
      y: cursorY,
      width: panelWidth - (pad * 2),
      height: buttonHeight,
      label: pauseMenu.resumeLabel || "Resume",
      actionId: "pause_resume",
      disabled: pauseMenu.resumeDisabled === true,
      primary: true,
    });
    cursorY += buttonHeight + sectionGap;

    drawRuntimeButton({
      x: panelX + pad,
      y: cursorY,
      width: panelWidth - (pad * 2),
      height: buttonHeight,
      label: "Back to Main Menu",
      actionId: "pause_back",
      disabled: false,
    });
    cursorY += buttonHeight + sectionGap;

    const sliderLayout = drawRuntimeSlider({
      x: panelX + pad,
      y: cursorY,
      width: panelWidth - (pad * 2),
      label: "Master Volume",
      value: state.runtimeUi.masterVolume,
      actionId: "pause_volume",
      disabled: false,
    });
    cursorY += sliderLayout.height + (mouseSensitivityVisible ? 10 : sectionGap);

    if (mouseSensitivityVisible) {
      const sensitivitySliderLayout = drawRuntimeSlider({
        x: panelX + pad,
        y: cursorY,
        width: panelWidth - (pad * 2),
        label: "Look Sensitivity",
        value: state.runtimeUi.mouseSensitivity,
        actionId: "pause_mouse_sensitivity",
        disabled: false,
      });
      cursorY += sensitivitySliderLayout.height + sectionGap;
    }

    drawRuntimeButton({
      x: panelX + pad,
      y: cursorY,
      width: panelWidth - (pad * 2),
      height: buttonHeight,
      label: pauseMenu.fullscreenLabel || "Enter Fullscreen",
      actionId: "pause_fullscreen",
      disabled: pauseMenu.fullscreenDisabled === true,
    });

    drawCtx.textAlign = "left";
    drawCtx.textBaseline = "alphabetic";
  }

  function drawRuntimeWeaponMenu() {
    const weaponMenu = state.runtimeUi.weaponMenu;
    const options = Array.isArray(weaponMenu.options) ? weaponMenu.options : [];
    const isMobileMenu = state.touchPortrait || viewportWidth < 780;
    const panelWidth = isMobileMenu
      ? clamp(viewportWidth * 0.88, 286, 470)
      : clamp(viewportWidth * 0.82, 290, 470);
    const panelPadding = isMobileMenu
      ? clamp(panelWidth * 0.06, 14, 22)
      : clamp(panelWidth * 0.07, 16, 26);
    const cardCount = Math.min(3, options.length);
    let cardHeight = isMobileMenu
      ? clamp(viewportHeight * 0.095, 56, 82)
      : clamp(viewportHeight * 0.11, 64, 92);
    let cardGap = isMobileMenu
      ? clamp(cardHeight * 0.16, 8, 13)
      : clamp(cardHeight * 0.2, 10, 18);
    let cardsHeight = cardCount > 0
      ? (cardCount * cardHeight) + ((cardCount - 1) * cardGap)
      : 0;
    let panelHeight = cardsHeight + panelPadding * 2;
    if (isMobileMenu) {
      const topInset = clamp(viewportHeight * 0.035, 14, 26);
      const bottomInset = clamp(viewportHeight * 0.02, 12, 20);
      const maxPanelHeight = viewportHeight - topInset - bottomInset;
      if (panelHeight > maxPanelHeight && cardCount > 0) {
        const maxCardsHeight = Math.max(cardCount * 46, maxPanelHeight - panelPadding * 2);
        const nextCardHeight = (maxCardsHeight - ((cardCount - 1) * cardGap)) / cardCount;
        cardHeight = clamp(nextCardHeight, 46, cardHeight);
        cardGap = clamp(cardHeight * 0.14, 6, 11);
        cardsHeight = (cardCount * cardHeight) + ((cardCount - 1) * cardGap);
        panelHeight = cardsHeight + panelPadding * 2;
      }
    }
    const panelX = (viewportWidth - panelWidth) * 0.5;
    const panelY = isMobileMenu
      ? clamp(viewportHeight * 0.035, 8, Math.max(8, viewportHeight - panelHeight - 8))
      : (viewportHeight - panelHeight) * 0.5;

    drawCtx.fillStyle = "rgba(4, 8, 20, 0.85)";
    drawCtx.fillRect(0, 0, viewportWidth, viewportHeight);
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

    const cardX = panelX + panelPadding;
    const cardWidth = panelWidth - panelPadding * 2;
    let cardY = panelY + panelPadding;

    for (let i = 0; i < cardCount; i += 1) {
      const option = options[i];
      drawPanel(
        drawCtx,
        cardX,
        cardY,
        cardWidth,
        cardHeight,
        clamp(cardHeight * 0.15, 8, 14),
        "rgba(24, 44, 70, 0.82)",
        "rgba(93, 161, 245, 0.72)",
        1.2
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

      registerRuntimeActionRect({
        id: `weapon_select:${option.type}`,
        x: cardX,
        y: cardY,
        width: cardWidth,
        height: cardHeight,
      });

      cardY += cardHeight + cardGap;
    }

    drawCtx.textAlign = "left";
    drawCtx.textBaseline = "alphabetic";
  }

  function drawHostToast() {
    const hostToast = state.runtimeUi.hostToast;
    const message = typeof hostToast.message === "string" ? hostToast.message.trim() : "";
    const alpha = clamp(Number(hostToast.alpha) || 0, 0, 1);
    if (hostToast.visible !== true || !message || alpha <= 0) {
      return;
    }

    const paddingX = 12;
    const paddingY = 8;
    const fontSize = 12;
    drawCtx.save();
    drawCtx.globalAlpha = alpha;
    drawCtx.font = `500 ${fontSize}px ${FONT_STACK}`;
    const width = clamp(drawCtx.measureText(message).width + (paddingX * 2), 90, viewportWidth - 32);
    const height = fontSize + (paddingY * 2);
    const x = 16;
    const y = 16;
    drawPanel(
      drawCtx,
      x,
      y,
      width,
      height,
      height * 0.5,
      "rgba(16, 16, 16, 0.82)",
      "rgba(255, 255, 255, 0.18)",
      1
    );
    drawCtx.fillStyle = "rgba(244, 244, 244, 0.95)";
    drawCtx.textAlign = "left";
    drawCtx.textBaseline = "top";
    drawCtx.fillText(message, x + paddingX, y + paddingY);
    drawCtx.restore();
    drawCtx.textAlign = "left";
    drawCtx.textBaseline = "alphabetic";
  }

  function drawRuntimeOverlay() {
    runtimeActionRects = [];
    shareLinkInputRect = null;

    if (isRuntimeMainMenuVisible()) {
      drawRuntimeMainMenu();
    } else if (isRuntimePauseMenuVisible()) {
      drawRuntimePauseMenu();
    } else if (isRuntimeWeaponMenuVisible()) {
      drawRuntimeWeaponMenu();
    }

    drawHostToast();
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

    drawCtx.setTransform(1, 0, 0, 1, 0, 0);
    drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
    drawCtx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    touchBlockedRects = [];
    runtimeActionRects = [];
    shareLinkInputRect = null;

    if (state.hudVisible) {
      const doodadMenuVisible = state.editorDoodadMenu.visible;
      drawJetpackHud();
      drawMoneyHud();
      drawWaveHud();
      drawBuildPhaseTimer();
      drawFpsHud();
      drawHudUtilityButtons();
      drawTowerTray();
      drawEditorDoodadMenu();
      if (!doodadMenuVisible) {
        drawBuildModeHint();
        drawCrosshair();
      }
      drawTouchControls();
      drawSellPrompt();
    }
    drawMenuOverlay();
    drawRuntimeOverlay();
    touchControlLayout.blockedRects = touchBlockedRects.slice();
    overlayTexture.needsUpdate = true;
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
    if (state.editorDoodadMenu.visible) {
      return null;
    }
    const result = hitTestRectList(
      towerSlotRects,
      x,
      y,
      (rect) => (rect.disabled ? null : rect.type)
    );
    return result == null ? null : result;
  }

  function hitTestEditorDoodadItem(x, y) {
    if (!state.editorDoodadMenu.visible) {
      return null;
    }
    const result = hitTestRectList(editorDoodadItemRects, x, y, (rect) => rect.type);
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
    if (state.menuOpen || state.editorDoodadMenu.visible) {
      return null;
    }
    const result = hitTestRectList(hudButtonRects, x, y, (rect) => rect.id);
    return result == null ? null : result;
  }

  function hitTestRuntimeUiAction(x, y) {
    const result = hitTestRectList(runtimeActionRects, x, y, (rect) => rect);
    if (!result) {
      return null;
    }
    if (result.kind === "slider") {
      const sliderWidth = Math.max(1, Number(result.trackWidth) || 0);
      return {
        id: result.id,
        kind: "slider",
        value: clamp((x - result.trackX) / sliderWidth, 0, 1),
      };
    }
    return {
      id: result.id,
      kind: result.kind || "button",
    };
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

  function getShareLinkInputRect() {
    return shareLinkInputRect ? { ...shareLinkInputRect } : null;
  }

  resize(width, height);

  return {
    scene: overlayScene,
    camera: overlayCamera,
    domElement: (
      typeof HTMLCanvasElement !== "undefined" && drawCanvas instanceof HTMLCanvasElement
    ) ? drawCanvas : null,
    usesOffscreenCanvas: typeof OffscreenCanvas !== "undefined" && drawCanvas instanceof OffscreenCanvas,
    resize,
    setState,
    draw,
    hitTestMenuOption,
    hitTestTechTreeNode,
    hitTestTechTreeNodeInfo,
    hitTestTechTreePanel,
    hitTestTowerSlot,
    hitTestEditorDoodadItem,
    hitTestTouchAction,
    hitTestHudButton,
    hitTestRuntimeUiAction,
    getTouchControlLayout,
    getShareLinkInputRect,
  };
}
