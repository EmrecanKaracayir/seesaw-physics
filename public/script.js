(function () {
  /*--------------------------------------------------------------------------*\
  |* Constants                                                                *|
  \*--------------------------------------------------------------------------*/

  const PLANK_LENGTH = 400;
  const MAX_ANGLE = 30; // Degrees
  const STORAGE_KEY = "seesaw-physics-state-v1";

  const mainContainer = document.querySelector("main");
  const plankContainer = document.getElementById("plank-container");
  const plankEl = document.getElementById("plank");
  const leftWeightEl = document.getElementById("left-weight");
  const rightWeightEl = document.getElementById("right-weight");
  const nextWeightEl = document.getElementById("next-weight");
  const angleEl = document.getElementById("angle");
  const resetButton = document.getElementById("reset-button");
  const logsEl = document.getElementById("logs");

  /*--------------------------------------------------------------------------*\
  |* State                                                                    *|
  \*--------------------------------------------------------------------------*/

  let objects = []; // { position: number, weight: number, color: string }
  let currentAngle = 0;
  let nextWeight = getRandomWeight();
  let nextColor = getRandomColor();
  let lastTorques = { left: 0, right: 0 };

  let previewEl = null;

  /*--------------------------------------------------------------------------*\
  |* Persistence                                                              *|
  \*--------------------------------------------------------------------------*/

  function saveState() {
    try {
      const data = { objects, nextWeight, nextColor };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn("Could not save state:", e);
    }
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.objects)) return;

      objects = parsed.objects
        .filter(
          (o) =>
            typeof o.position === "number" &&
            typeof o.weight === "number" &&
            isFinite(o.position) &&
            isFinite(o.weight)
        )
        .map((o) => ({
          position: Math.max(-PLANK_LENGTH, Math.min(PLANK_LENGTH, o.position)),
          weight: Math.max(1, Math.min(10, Math.round(o.weight))),
          color: typeof o.color === "string" ? o.color : getRandomColor(),
        }));

      if (
        typeof parsed.nextWeight === "number" &&
        parsed.nextWeight >= 1 &&
        parsed.nextWeight <= 10
      ) {
        nextWeight = parsed.nextWeight;
      }
      if (typeof parsed.nextColor === "string") {
        nextColor = parsed.nextColor;
      }
    } catch (e) {
      console.warn("Could not load state:", e);
    }
  }

  /*--------------------------------------------------------------------------*\
  |* Listeners                                                                *|
  \*--------------------------------------------------------------------------*/

  window.addEventListener("resize", computeScale);
  computeScale();

  plankContainer.addEventListener("mousemove", (e) => {
    updatePreview(e.clientX, e.clientY);
  });

  plankContainer.addEventListener("mouseleave", () => {
    hidePreview();
  });

  plankContainer.addEventListener("click", (e) => {
    const { parallelDistance, perpendicularDistance, pivotX } =
      getMousePlankProjection(e.clientX, e.clientY);

    if (
      Math.abs(parallelDistance) > pivotX ||
      perpendicularDistance > plankEl.clientHeight
    ) {
      return;
    }

    const normalizedPos = parallelDistance / pivotX;
    const physicsPos = Math.max(
      -(PLANK_LENGTH / 2),
      Math.min(PLANK_LENGTH / 2, normalizedPos * (PLANK_LENGTH / 2))
    );

    const weight = nextWeight;
    const color = nextColor;

    objects.push({ position: physicsPos, weight, color });

    nextWeight = getRandomWeight();
    nextColor = getRandomColor();
    updateNextWeightLabel();

    renderObjects(objects.length - 1);
    calculatePhysics();
    saveState();
    playSound();

    const side = physicsPos < 0 ? "L" : physicsPos > 0 ? "R" : "C";
    addLogEntry(
      `Drop w=${weight}kg @ ${physicsPos.toFixed(
        0
      )}px (${side}) | τL=${lastTorques.left.toFixed(
        0
      )}, τR=${lastTorques.right.toFixed(0)}, θ=${targetAngle.toFixed(1)}°`
    );

    updatePreview();
  });

  resetButton.addEventListener("click", () => {
    objects = [];
    targetAngle = 0;
    renderObjects();
    recalcPhysics();
    nextWeight = getRandomWeight();
    nextColor = getRandomColor();
    updateNextWeightLabel();
    saveState();
    addLogEntry("Reset simulation");
  });

  /*--------------------------------------------------------------------------*\
  |* UI Updates                                                               *|
  \*--------------------------------------------------------------------------*/

  function computeScale() {
    const baseWidth = 680;

    const containerStyles = getComputedStyle(mainContainer);
    const availableWidth =
      mainContainer.clientWidth -
      parseFloat(containerStyles.paddingLeft) -
      parseFloat(containerStyles.paddingRight);

    let scale = Math.min(availableWidth / baseWidth, 1);
    document.documentElement.style.setProperty("--seesaw-scale", scale);
  }

  function updateNextWeightLabel() {
    nextWeightEl.textContent = `${nextWeight}`;
  }

  function updateAngleLabel() {
    angleEl.textContent = currentAngle.toFixed(1);
  }

  function animate() {
    const stiffness = 0.08;
    const angleDiff = targetAngle - currentAngle;
    currentAngle += angleDiff * stiffness;

    if (Math.abs(angleDiff) < 0.01) {
      currentAngle = targetAngle;
    }

    plankEl.style.transform = `rotate(${currentAngle}deg)`;
    updateAngleLabel();

    requestAnimationFrame(animate);
  }

  /*--------------------------------------------------------------------------*\
  |* Rendering                                                                *|
  \*--------------------------------------------------------------------------*/

  function clearObjectElements() {
    plankEl.querySelectorAll(".object-real").forEach((el) => el.remove());
  }

  function renderObjects(animateIndex = null) {
    clearObjectElements();

    const halfW = (plankContainer.clientWidth || PLANK_LENGTH) / 2;

    objects.forEach((obj, index) => {
      const objEl = document.createElement("div");
      objEl.className = "object object-real";
      if (index === animateIndex) {
        objEl.classList.add("animate");
      }
      objEl.style.backgroundColor = obj.color;

      const normalizedPos = obj.position / (PLANK_LENGTH / 2);
      const clampedPos = Math.max(-1, Math.min(1, normalizedPos));
      const position = halfW + clampedPos * halfW;
      objEl.style.left = `${position}px`;

      const label = document.createElement("span");
      label.className = "object-label";
      label.textContent = `${obj.weight} kg`;
      objEl.appendChild(label);

      plankEl.appendChild(objEl);
    });
  }

  /*--------------------------------------------------------------------------*\
  |* Sound                                                                    *|
  \*--------------------------------------------------------------------------*/

  let audioCtx = null;
  function playSound() {
    try {
      if (!audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        audioCtx = new AudioContext();
      }
      const ctx = audioCtx;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(240, now);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.18);
    } catch (e) {
      // ignore
    }
  }

  /*--------------------------------------------------------------------------*\
  |* Preview Functions                                                        *|
  \*--------------------------------------------------------------------------*/

  function ensurePreview() {
    if (previewEl) {
      return;
    }
    previewEl = document.createElement("div");
    previewEl.className = "object object-preview";

    const label = document.createElement("span");
    label.className = "object-label";
    previewEl.appendChild(label);
    previewEl.style.display = "none";

    plankEl.appendChild(previewEl);
  }

  function hidePreview() {
    if (!previewEl) {
      return;
    }
    previewEl.style.display = "none";
  }

  function showPreview(parallelDistance, halfW) {
    if (!previewEl) {
      console.error("No preview element");
      return;
    }

    const normalizedPos = parallelDistance / halfW;
    const clampedPos = Math.max(-1, Math.min(1, normalizedPos));
    const position = halfW + clampedPos * halfW;

    previewEl.style.display = "block";
    previewEl.style.left = `${position}px`;
    previewEl.style.backgroundColor = nextColor;
    previewEl.querySelector(".object-label").textContent = `${nextWeight} kg`;
  }

  function updatePreview(mouseX, mouseY) {
    ensurePreview();

    const { parallelDistance, perpendicularDistance, pivotX } =
      getMousePlankProjection(mouseX, mouseY);

    if (
      Math.abs(parallelDistance) > pivotX ||
      perpendicularDistance > plankEl.clientHeight
    ) {
      hidePreview();
      return;
    }

    showPreview(parallelDistance, pivotX);
  }

  /*--------------------------------------------------------------------------*\
  |* Calculations                                                             *|
  \*--------------------------------------------------------------------------*/

  function getMousePlankProjection(mouseX, mouseY) {
    const localRect = plankContainer.getBoundingClientRect();
    const localX = mouseX - localRect.left;
    const localY = mouseY - localRect.top;

    const pivotX = localRect.width / 2;
    const pivotY = localRect.height / 2;

    const vecX = localX - pivotX;
    const vecY = localY - pivotY;

    const angleRad = (currentAngle * Math.PI) / 180;
    const uVecX = Math.cos(angleRad);
    const uVecY = Math.sin(angleRad);

    const parallelDistance = vecX * uVecX + vecY * uVecY;
    const perpendicularDistance = Math.abs(vecX * uVecY - vecY * uVecX);

    return { parallelDistance, perpendicularDistance, pivotX, pivotY };
  }

  function calculatePhysics() {
    let leftTorque = 0;
    let rightTorque = 0;
    let leftWeight = 0;
    let rightWeight = 0;

    for (const obj of objects) {
      const distance = obj.position;
      const weight = obj.weight;
      if (distance < 0) {
        leftTorque += Math.abs(distance) * weight;
        leftWeight += weight;
      } else if (distance > 0) {
        rightTorque += distance * weight;
        rightWeight += weight;
      }
    }

    lastTorques.left = leftTorque;
    lastTorques.right = rightTorque;

    leftWeightEl.textContent = leftWeight.toFixed(1).replace(/\.0$/, "");
    rightWeightEl.textContent = rightWeight.toFixed(1).replace(/\.0$/, "");

    const diff = rightTorque - leftTorque;
    const rawAngle = diff / 10;
    targetAngle = Math.max(-MAX_ANGLE, Math.min(MAX_ANGLE, rawAngle));
  }

  /*--------------------------------------------------------------------------*\
  |* Utilities                                                                *|
  \*--------------------------------------------------------------------------*/

  function getRandomWeight() {
    return Math.floor(Math.random() * 10) + 1;
  }

  function getRandomColor() {
    const hue = Math.floor(Math.random() * 360);
    const sat = 65 + Math.random() * 15;
    const light = 55 + Math.random() * 10;
    return `hsl(${hue}, ${sat}%, ${light}%)`;
  }

  function addLogEntry(text) {
    const entry = document.createElement("div");
    entry.className = "log-entry";
    const now = new Date();
    const time = now.toLocaleTimeString("en-GB", { hour12: false });
    entry.textContent = `[${time}] ${text}`;
    logsEl.prepend(entry);
  }

  /*--------------------------------------------------------------------------*\
  |* Initialization                                                           *|
  \*--------------------------------------------------------------------------*/

  function init() {
    loadState();
    updateNextWeightLabel();
    renderObjects();
    calculatePhysics();
    updateAngleLabel();
    addLogEntry(`Loaded ${objects.length} object(s) from storage`);
    requestAnimationFrame(animate);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
