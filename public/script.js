(function () {
  /*--------------------------------------------------------------------------*\
  |* Constants                                                                *|
  \*--------------------------------------------------------------------------*/

  const STORAGE_KEY = "seesaw-physics-state-v1";

  const plankContainer = document.getElementById("plank-container");
  const plankEl = document.getElementById("plank");
  const leftWeightEl = document.getElementById("left-weight");
  const rightWeightEl = document.getElementById("right-weight");
  const nextWeightEl = document.getElementById("next-weight");
  const angleEl = document.getElementById("angle");
  const resetButton = document.getElementById("reset-button");
  const logsElement = document.getElementById("logs");

  /*--------------------------------------------------------------------------*\
  |* State                                                                    *|
  \*--------------------------------------------------------------------------*/

  let objects = []; // { position: number, weight: number, color: string }
  let currentAngle = 0; // in degrees
  let nextWeight = getRandomWeight();
  let nextColor = getRandomColor();
  let lastTorques = { left: 0, right: 0 };

  let previewEl = null;

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

  function showPreview(parallelDistance, pivotX) {
    if (!previewEl) {
      console.error("No preview element");
      return;
    }

    const normalizedPos = parallelDistance / pivotX;
    const clampedPos = Math.max(-1, Math.min(1, normalizedPos));
    const position = pivotX + clampedPos * pivotX;

    previewEl.style.display = "flex";
    previewEl.style.left = `${position}px`;
    previewEl.style.backgroundColor = nextColor;
    previewEl.querySelector(".object-label").textContent = `${nextWeight} kg`;
  }

  /*--------------------------------------------------------------------------*\
  |* Interactions                                                             *|
  \*--------------------------------------------------------------------------*/

  plankContainer.addEventListener("mousemove", (e) => {
    ensurePreview();

    const localRect = plankContainer.getBoundingClientRect();
    const localX = e.clientX - localRect.left;
    const localY = e.clientY - localRect.top;

    const pivotX = localRect.width / 2;
    const pivotY = localRect.height / 2;

    const vecX = localX - pivotX;
    const vecY = localY - pivotY;

    const angleRad = (currentAngle * Math.PI) / 180;
    const uVecX = Math.cos(angleRad);
    const uVecY = Math.sin(angleRad);

    const parallelDistance = vecX * uVecX + vecY * uVecY;
    const perpendicularDistance = Math.abs(vecX * uVecY - vecY * uVecX);

    if (Math.abs(parallelDistance) > pivotX) {
      hidePreview();
      return;
    }

    const tolerance = 10;
    if (perpendicularDistance > tolerance) {
      hidePreview();
      return;
    }

    showPreview(parallelDistance, pivotX);
  });

  plankContainer.addEventListener("mouseleave", () => {
    hidePreview();
  });

  plankContainer.addEventListener("click", (e) => {
    console.error("Not implemented!");
  });

  resetButton.addEventListener("click", () => {
    console.error("Not implemented!");
  });

  /*--------------------------------------------------------------------------*\
  |* Initialization                                                           *|
  \*--------------------------------------------------------------------------*/

  function init() {
    loadState();
    prepareNextWeight();
    renderObjects();
    recalculatePhysics();
    updateUI();
    addLogEntry();
    requestAnimationFrame(animate);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
