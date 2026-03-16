function setStyles(element, styles) {
  Object.assign(element.style, styles);
  return element;
}

function createButton(label, styles = {}) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  setStyles(button, {
    appearance: "none",
    border: "1px solid rgba(255,255,255,0.18)",
    borderRadius: "14px",
    background: "rgba(20, 31, 50, 0.94)",
    color: "#f4f8ff",
    cursor: "pointer",
    font: "700 15px \"Segoe UI\", sans-serif",
    padding: "14px 18px",
    transition: "background 120ms ease, border-color 120ms ease, opacity 120ms ease",
    ...styles,
  });
  return button;
}

function createLabel(text, styles = {}) {
  const label = document.createElement("div");
  label.textContent = text;
  setStyles(label, {
    color: "rgba(226, 236, 255, 0.86)",
    font: "500 14px \"Segoe UI\", sans-serif",
    ...styles,
  });
  return label;
}

function createPanel() {
  const panel = document.createElement("div");
  setStyles(panel, {
    width: "min(92vw, 540px)",
    maxHeight: "calc(100vh - 32px)",
    overflowY: "auto",
    borderRadius: "20px",
    border: "1px solid rgba(162, 203, 255, 0.2)",
    background: "linear-gradient(180deg, rgba(12,18,31,0.98), rgba(18,28,45,0.96))",
    boxShadow: "0 28px 64px rgba(0,0,0,0.34)",
    padding: "24px",
    display: "none",
    flexDirection: "column",
    gap: "16px",
    pointerEvents: "auto",
  });
  return panel;
}

function formatPercent(value) {
  const percent = Math.round(Math.max(0, Math.min(1, Number(value) || 0)) * 100);
  return `${percent}%`;
}

function syncVolumeControls(slider, label, value) {
  const safeValue = Math.max(0, Math.min(1, Number(value) || 0));
  slider.value = String(Math.round(safeValue * 100));
  label.textContent = formatPercent(safeValue);
}

export function createMenuUi({
  mount = null,
  weaponOptions = [],
  difficultyOptions = [],
} = {}) {
  const root = document.createElement("div");
  setStyles(root, {
    position: "fixed",
    inset: "0",
    display: "none",
    alignItems: "center",
    justifyContent: "center",
    padding: "16px",
    zIndex: "40",
    pointerEvents: "none",
  });

  const backdrop = document.createElement("div");
  setStyles(backdrop, {
    position: "absolute",
    inset: "0",
    background: "rgba(3, 8, 17, 0.62)",
    pointerEvents: "auto",
  });
  root.appendChild(backdrop);

  const stack = document.createElement("div");
  setStyles(stack, {
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: "100%",
    pointerEvents: "none",
  });
  root.appendChild(stack);

  const hostToast = document.createElement("div");
  setStyles(hostToast, {
    position: "fixed",
    left: "16px",
    top: "16px",
    zIndex: "41",
    display: "none",
    padding: "8px 12px",
    borderRadius: "999px",
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(16,16,16,0.82)",
    color: "rgba(244,244,244,0.95)",
    font: "500 12px \"Segoe UI\", sans-serif",
    opacity: "0",
    transition: "opacity 180ms ease",
    pointerEvents: "none",
    maxWidth: "min(420px, calc(100vw - 32px))",
  });

  const mainPanel = createPanel();
  const mainTitle = createLabel("Cube Command", {
    color: "#ffffff",
    font: "800 28px \"Segoe UI\", sans-serif",
  });
  const mainSubtitle = createLabel("Choose how to start the session.", {
    font: "500 15px \"Segoe UI\", sans-serif",
  });
  const mainStatus = createLabel("", {
    minHeight: "18px",
    font: "600 13px \"Segoe UI\", sans-serif",
    color: "rgba(170, 219, 255, 0.92)",
  });
  const startButton = createButton("Start", {
    width: "100%",
    background: "rgba(39, 112, 202, 0.96)",
    borderColor: "rgba(157, 214, 255, 0.5)",
    font: "800 16px \"Segoe UI\", sans-serif",
  });

  const difficultySection = document.createElement("div");
  setStyles(difficultySection, {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  });
  const difficultyHeader = createLabel("Difficulty", {
    color: "#ffffff",
    font: "700 14px \"Segoe UI\", sans-serif",
  });
  const difficultyHint = createLabel("", {
    minHeight: "18px",
    font: "500 12px \"Segoe UI\", sans-serif",
  });
  const difficultyRow = document.createElement("div");
  setStyles(difficultyRow, {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "8px",
  });
  const difficultyButtonsById = new Map();
  for (const option of difficultyOptions) {
    const button = createButton(option.label, {
      padding: "12px 10px",
      font: "700 14px \"Segoe UI\", sans-serif",
    });
    button.dataset.difficultyId = option.id;
    difficultyButtonsById.set(option.id, button);
    difficultyRow.appendChild(button);
  }
  difficultySection.appendChild(difficultyHeader);
  difficultySection.appendChild(difficultyRow);
  difficultySection.appendChild(difficultyHint);

  const shareSection = document.createElement("div");
  setStyles(shareSection, {
    display: "none",
    flexDirection: "column",
    gap: "10px",
  });
  const shareHeader = createLabel("Co-op", {
    color: "#ffffff",
    font: "700 14px \"Segoe UI\", sans-serif",
  });
  const shareStatus = createLabel("", {
    minHeight: "18px",
    font: "500 12px \"Segoe UI\", sans-serif",
  });
  const shareButton = createButton("Share Co-op", {
    width: "100%",
  });
  const sharePanel = document.createElement("div");
  setStyles(sharePanel, {
    display: "none",
    flexDirection: "column",
    gap: "8px",
    padding: "12px",
    borderRadius: "14px",
    border: "1px solid rgba(255,255,255,0.1)",
    background: "rgba(255,255,255,0.05)",
  });
  const linkInput = document.createElement("input");
  linkInput.type = "text";
  linkInput.readOnly = true;
  setStyles(linkInput, {
    width: "100%",
    boxSizing: "border-box",
    padding: "10px 12px",
    borderRadius: "10px",
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(7, 12, 20, 0.9)",
    color: "#eef5ff",
    font: "500 12px ui-monospace, SFMono-Regular, Menlo, monospace",
  });
  linkInput.addEventListener("focus", () => {
    linkInput.select();
  });
  const nativeShareButton = createButton("Native Share", {
    alignSelf: "flex-start",
    padding: "10px 14px",
    font: "700 13px \"Segoe UI\", sans-serif",
  });
  sharePanel.appendChild(linkInput);
  sharePanel.appendChild(nativeShareButton);
  shareSection.appendChild(shareHeader);
  shareSection.appendChild(shareStatus);
  shareSection.appendChild(shareButton);
  shareSection.appendChild(sharePanel);

  const mainVolumeSection = document.createElement("div");
  setStyles(mainVolumeSection, {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  });
  const mainVolumeHeader = createLabel("Volume", {
    color: "#ffffff",
    font: "700 14px \"Segoe UI\", sans-serif",
  });
  const mainVolumeRow = document.createElement("div");
  setStyles(mainVolumeRow, {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  });
  const mainVolumeSlider = document.createElement("input");
  mainVolumeSlider.type = "range";
  mainVolumeSlider.min = "0";
  mainVolumeSlider.max = "100";
  mainVolumeSlider.step = "1";
  setStyles(mainVolumeSlider, {
    flex: "1",
    accentColor: "#5db2ff",
  });
  const mainVolumeValue = createLabel("0%", {
    width: "52px",
    textAlign: "right",
    color: "#ffffff",
    font: "700 13px \"Segoe UI\", sans-serif",
  });
  const mainFullscreenButton = createButton("Enter Fullscreen", {
    width: "100%",
  });
  mainVolumeRow.appendChild(mainVolumeSlider);
  mainVolumeRow.appendChild(mainVolumeValue);
  mainVolumeSection.appendChild(mainVolumeHeader);
  mainVolumeSection.appendChild(mainVolumeRow);
  mainVolumeSection.appendChild(mainFullscreenButton);

  mainPanel.appendChild(mainTitle);
  mainPanel.appendChild(mainSubtitle);
  mainPanel.appendChild(mainStatus);
  mainPanel.appendChild(startButton);
  mainPanel.appendChild(difficultySection);
  mainPanel.appendChild(shareSection);
  mainPanel.appendChild(mainVolumeSection);
  stack.appendChild(mainPanel);

  const pausePanel = createPanel();
  const pauseTitle = createLabel("Paused", {
    color: "#ffffff",
    font: "800 26px \"Segoe UI\", sans-serif",
  });
  const pauseSubtitle = createLabel("", {
    minHeight: "18px",
    font: "500 14px \"Segoe UI\", sans-serif",
  });
  const pauseResumeButton = createButton("Resume", {
    width: "100%",
    background: "rgba(39, 112, 202, 0.96)",
    borderColor: "rgba(157, 214, 255, 0.5)",
  });
  const pauseBackButton = createButton("Back to Main Menu", {
    width: "100%",
  });
  const pauseVolumeSection = document.createElement("div");
  setStyles(pauseVolumeSection, {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  });
  const pauseVolumeHeader = createLabel("Volume", {
    color: "#ffffff",
    font: "700 14px \"Segoe UI\", sans-serif",
  });
  const pauseVolumeRow = document.createElement("div");
  setStyles(pauseVolumeRow, {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  });
  const pauseVolumeSlider = document.createElement("input");
  pauseVolumeSlider.type = "range";
  pauseVolumeSlider.min = "0";
  pauseVolumeSlider.max = "100";
  pauseVolumeSlider.step = "1";
  setStyles(pauseVolumeSlider, {
    flex: "1",
    accentColor: "#5db2ff",
  });
  const pauseVolumeValue = createLabel("0%", {
    width: "52px",
    textAlign: "right",
    color: "#ffffff",
    font: "700 13px \"Segoe UI\", sans-serif",
  });
  const pauseFullscreenButton = createButton("Enter Fullscreen", {
    width: "100%",
  });
  pauseVolumeRow.appendChild(pauseVolumeSlider);
  pauseVolumeRow.appendChild(pauseVolumeValue);
  pauseVolumeSection.appendChild(pauseVolumeHeader);
  pauseVolumeSection.appendChild(pauseVolumeRow);
  pauseVolumeSection.appendChild(pauseFullscreenButton);
  pausePanel.appendChild(pauseTitle);
  pausePanel.appendChild(pauseSubtitle);
  pausePanel.appendChild(pauseResumeButton);
  pausePanel.appendChild(pauseBackButton);
  pausePanel.appendChild(pauseVolumeSection);
  stack.appendChild(pausePanel);

  const weaponPanel = createPanel();
  const weaponTitle = createLabel("Choose Your Weapon", {
    color: "#ffffff",
    font: "800 26px \"Segoe UI\", sans-serif",
  });
  const weaponSubtitle = createLabel("Pick one to enter the run.", {
    minHeight: "18px",
    font: "500 14px \"Segoe UI\", sans-serif",
  });
  const weaponGrid = document.createElement("div");
  setStyles(weaponGrid, {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: "12px",
  });
  const weaponButtonsByType = new Map();
  for (const option of weaponOptions) {
    const button = createButton(option.label, {
      minHeight: "88px",
      font: "800 15px \"Segoe UI\", sans-serif",
      background: "rgba(24, 44, 70, 0.92)",
    });
    button.dataset.weaponType = option.type;
    weaponButtonsByType.set(option.type, button);
    weaponGrid.appendChild(button);
  }
  weaponPanel.appendChild(weaponTitle);
  weaponPanel.appendChild(weaponSubtitle);
  weaponPanel.appendChild(weaponGrid);
  stack.appendChild(weaponPanel);

  if (mount && typeof mount.appendChild === "function") {
    mount.appendChild(root);
    mount.appendChild(hostToast);
  }

  function setButtonEnabled(button, enabled) {
    button.disabled = !enabled;
    button.style.opacity = enabled ? "1" : "0.55";
    button.style.cursor = enabled ? "pointer" : "default";
  }

  function setState(state = {}) {
    const safeSessionScreen = state.sessionScreen === "main_menu" ? "main_menu" : "in_run";
    const safeOverlayScreen = typeof state.overlayScreen === "string" ? state.overlayScreen : "none";
    const mainVisible = safeSessionScreen === "main_menu";
    const pauseVisible = safeSessionScreen === "in_run" && safeOverlayScreen === "pause_menu";
    const weaponVisible = safeSessionScreen === "in_run" && safeOverlayScreen === "weapon_select";
    const anyVisible = mainVisible || pauseVisible || weaponVisible;

    root.style.display = anyVisible ? "flex" : "none";
    mainPanel.style.display = mainVisible ? "flex" : "none";
    pausePanel.style.display = pauseVisible ? "flex" : "none";
    weaponPanel.style.display = weaponVisible ? "flex" : "none";

    const mainState = state.mainMenu ?? {};
    mainTitle.textContent = typeof mainState.title === "string" && mainState.title.length > 0
      ? mainState.title
      : "Cube Command";
    mainSubtitle.textContent = typeof mainState.subtitle === "string" ? mainState.subtitle : "";
    mainStatus.textContent = typeof mainState.status === "string" ? mainState.status : "";
    startButton.textContent = typeof mainState.startLabel === "string" && mainState.startLabel.length > 0
      ? mainState.startLabel
      : "Start";
    setButtonEnabled(startButton, mainState.startDisabled !== true);

    const difficultyDisabled = mainState.difficultyDisabled === true;
    difficultyHint.textContent = typeof mainState.difficultyHint === "string" ? mainState.difficultyHint : "";
    for (const [difficultyId, button] of difficultyButtonsById.entries()) {
      const selected = difficultyId === mainState.selectedDifficultyId;
      button.style.background = selected
        ? "rgba(39, 112, 202, 0.96)"
        : "rgba(20, 31, 50, 0.94)";
      button.style.borderColor = selected
        ? "rgba(157, 214, 255, 0.5)"
        : "rgba(255,255,255,0.18)";
      setButtonEnabled(button, !difficultyDisabled);
    }

    const shareVisible = mainState.shareVisible === true;
    shareSection.style.display = shareVisible ? "flex" : "none";
    shareStatus.textContent = typeof mainState.shareStatus === "string" ? mainState.shareStatus : "";
    shareButton.textContent = typeof mainState.shareLabel === "string" && mainState.shareLabel.length > 0
      ? mainState.shareLabel
      : "Share Co-op";
    setButtonEnabled(shareButton, mainState.shareDisabled !== true);
    const shareUrl = typeof mainState.shareUrl === "string" ? mainState.shareUrl : "";
    linkInput.value = shareUrl;
    const showSharePanel = shareVisible && shareUrl.length > 0;
    sharePanel.style.display = showSharePanel ? "flex" : "none";
    nativeShareButton.style.display = mainState.nativeShareVisible === true ? "inline-flex" : "none";
    setButtonEnabled(nativeShareButton, showSharePanel && mainState.nativeShareDisabled !== true);

    const safeVolume = Math.max(0, Math.min(1, Number(state.masterVolume) || 0));
    syncVolumeControls(mainVolumeSlider, mainVolumeValue, safeVolume);
    syncVolumeControls(pauseVolumeSlider, pauseVolumeValue, safeVolume);
    mainFullscreenButton.textContent = typeof mainState.fullscreenLabel === "string" && mainState.fullscreenLabel.length > 0
      ? mainState.fullscreenLabel
      : "Enter Fullscreen";
    setButtonEnabled(mainFullscreenButton, mainState.fullscreenDisabled !== true);

    const pauseState = state.pauseMenu ?? {};
    pauseTitle.textContent = typeof pauseState.title === "string" && pauseState.title.length > 0
      ? pauseState.title
      : "Paused";
    pauseSubtitle.textContent = typeof pauseState.subtitle === "string" ? pauseState.subtitle : "";
    pauseResumeButton.textContent = typeof pauseState.resumeLabel === "string" && pauseState.resumeLabel.length > 0
      ? pauseState.resumeLabel
      : "Resume";
    setButtonEnabled(pauseResumeButton, pauseState.resumeDisabled !== true);
    pauseFullscreenButton.textContent = typeof pauseState.fullscreenLabel === "string" && pauseState.fullscreenLabel.length > 0
      ? pauseState.fullscreenLabel
      : "Enter Fullscreen";
    setButtonEnabled(pauseFullscreenButton, pauseState.fullscreenDisabled !== true);

    const weaponState = state.weaponMenu ?? {};
    weaponTitle.textContent = typeof weaponState.title === "string" && weaponState.title.length > 0
      ? weaponState.title
      : "Choose Your Weapon";
    weaponSubtitle.textContent = typeof weaponState.subtitle === "string" ? weaponState.subtitle : "";
  }

  return {
    hostToast,
    root,
    startButton,
    shareButton,
    linkInput,
    nativeShareButton,
    difficultyButtonsById,
    mainVolumeSlider,
    pauseVolumeSlider,
    mainFullscreenButton,
    pauseFullscreenButton,
    pauseResumeButton,
    pauseBackButton,
    weaponButtonsByType,
    setState,
    focusShareLink() {
      if (!linkInput.value) {
        return;
      }
      linkInput.focus();
      linkInput.select();
    },
  };
}
