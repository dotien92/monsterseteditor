import { state } from "../state.js";
import { draw } from "../render.js";
import { CONFIG } from "../config.js";
import { renderMonsterList as refreshMonsterListUI } from "../ui.js";

let tooltipEl = null;

/* ========== INIT UI PANEL ========== */
export function initAddMonsterUI() {
  const panel = document.getElementById("monsterAddPanel");
  if (!panel) return;

  const options = Object.entries(state.classes)
    .map(([id, c]) => `<option value="${id}">${id} - ${c.name}</option>`)
    .join("");

  panel.innerHTML = `
    <h3>Thêm Quái</h3>
    <label>Loại block:
      <select class="blockType">
        <option value="0">Type 0: NPC & Decoration (trap, light..)</option>
        <option value="1">Typr 1: Monster</option>
        <option value="3">Type 3: Invasion (Golden dragon...)</option>
        <option value="4">Type 4: Event (Devil, BloodCastle)</option>
      </select>
    </label>
    <label>Kiểu thêm:
      <select class="addMode">
        <option value="single">Single</option>
        <option value="spot">Spot</option>
      </select>
    </label>
    <label>Monster:
      <select class="monsterId">${options}</select>
    </label>
    <div class="params"></div>
    <button class="addBtn primary">➕ Thêm Quái</button>
  `;

  const blockSelect = panel.querySelector(".blockType");
  const modeSelect = panel.querySelector(".addMode");
  const paramsDiv = panel.querySelector(".params");

  function renderParams(blockType) {
    if (blockType === 0 || blockType === 4) {
      modeSelect.value = "single";
      modeSelect.disabled = true;
    } else {
      modeSelect.disabled = false;
    }

    let html = "";
    if (blockType === 0) {
      html += `
        <label>Range: <input class="range" type="number" min="0" max="255" value="0"/> <small>(phạm vi)</small></label>
        <label>Dir: <input class="dir" type="number" min="0" max="360" value="0"/> <small>(hướng xoay)</small></label>
      `;
    } else if (blockType === 1) {
      html += `
        <label>Range: <input class="range" type="number" min="0" max="255" value="0"/> <small>(phạm vi)</small></label>
        <label>Dir: <input class="dir" type="number" min="0" max="360" value="0"/> <small>(hướng xoay)</small></label>
        <label>Count: <input class="count" type="number" min="1" max="500" value="1"/> <small>(số lượng)</small></label>
      `;
    } else if (blockType === 3) {
      html += `
        <label>Range: <input class="range" type="number" min="0" max="255" value="0"/> <small>(phạm vi)</small></label>
        <label>Dir: <input class="dir" type="number" min="0" max="360" value="0"/> <small>(hướng xoay)</small></label>
        <label>Count: <input class="count" type="number" min="1" max="500" value="1"/> <small>(số lượng)</small></label>
        <label>Value: <input class="value" type="number" min="0" max="999" value="0"/> <small>(giá trị)</small></label>
      `;
    } else if (blockType === 4) {
      html += `
        <label>Range: <input class="range" type="number" min="0" max="255" value="0"/> <small>(phạm vi)</small></label>
        <label>Dir: <input class="dir" type="number" min="0" max="360" value="0"/> <small>(hướng xoay)</small></label>
      `;
    }
    paramsDiv.innerHTML = html;
  }

  renderParams(parseInt(blockSelect.value, 10));

  // 🟢 Đổi block → render lại params + huỷ chế độ thêm
  blockSelect.addEventListener("change", () => {
    const newBlockType = parseInt(blockSelect.value, 10);
    renderParams(newBlockType);

    if (state.addingMonster) {
      console.log("⚠️ Đổi block type → huỷ chế độ thêm");
      state.addingMonster = null;
      state.dragData = null;
      hideTooltip();
      draw(document.getElementById("view"));
    }
  });

  // 🟢 Đổi monster → update trong state
  const monsterSelect = panel.querySelector(".monsterId");
  monsterSelect.addEventListener("change", () => {
    const newMonsterId = parseInt(monsterSelect.value, 10);
    if (state.addingMonster) {
      state.addingMonster.id = newMonsterId;
      console.log("🔄 Đổi monster khi đang thêm:", state.addingMonster);
      if (state.lastMouse) {
        updateTooltip({ clientX: state.lastMouse.x, clientY: state.lastMouse.y });
      }
    }
  });

  panel.querySelector(".addBtn").onclick = () => {
    const blockType = parseInt(blockSelect.value, 10);
    const addMode = modeSelect.value; // 🟢 lấy kiểu thêm
    const monsterId = parseInt(panel.querySelector(".monsterId").value, 10);
    const range = panel.querySelector(".range") ? parseInt(panel.querySelector(".range").value, 10) : 0;
    const count = panel.querySelector(".count") ? parseInt(panel.querySelector(".count").value, 10) : 1;
    const value = panel.querySelector(".value") ? parseInt(panel.querySelector(".value").value, 10) : 0;
    const dir = panel.querySelector(".dir") ? parseInt(panel.querySelector(".dir").value, 10) : 0;

    state.addingMonster = { blockType, addMode, id: monsterId, range, count, value, dir };
    console.log("👉 Ready to add monster:", state.addingMonster);

    showTooltip();
  };
}

/* ========== CANVAS BINDING ========== */
export function bindCanvasForAddMonster(canvas) {
  if (!canvas) return;

  // ===== MOUSE DOWN =====
  canvas.addEventListener("mousedown", (e) => {
    // 🟢 Nếu đang paste → xử lý riêng
    if (state.pasting && e.button === 2) {
      state.pasting = false;
      hideTooltip();
      return;
    }
    if (state.pasting && state.clipboard && e.button === 0) {
      const { x, y } = pixelToLogic(e.offsetX, e.offsetY, canvas);
      pasteSelection(x, y);
      state.pasting = false;
      hideTooltip();
      return;
    }

    if (!state.addingMonster) return;

    const { x, y } = pixelToLogic(e.offsetX, e.offsetY, canvas);
    const m = state.addingMonster;

    // 🟢 Block 0 (NPC/Deco) và 4 (Event) → single point, không drag
    if (m.blockType === 0 || m.blockType === 4) {
      return;
    }

    // 🟢 Block 1 (Monster) hoặc 3 (Invasion) với mode single → cũng không drag
    if ((m.blockType === 1 || m.blockType === 3) && m.addMode === "single") {
      return;
    }

    // 🟢 Còn lại (block 1/3 với spot) → cho phép drag để vẽ khung
    state.dragData = { startX: x, startY: y, currentX: x, currentY: y };
  });

  // ===== MOUSE UP =====
  canvas.addEventListener("mouseup", (e) => {
    if (!state.addingMonster) return;

    if (e.button === 2) {
      state.addingMonster = null;
      state.dragData = null;
      hideTooltip();
      draw(canvas);
      return;
    }

    const { x, y } = pixelToLogic(e.offsetX, e.offsetY, canvas);
    const m = state.addingMonster;

    if (m.blockType === 0 || m.blockType === 4) {
      // NPC/Deco hoặc Event → point
      addPointMonster(m.blockType, m.id, x, y, m.range, m.count, m.value, m.dir);

    } else if (m.blockType === 1 || m.blockType === 3) {
      if (m.addMode === "single") {
        // Monster/Invasion single → tạo 1 spot lockResize
        addSpotMonster(m.blockType, m.id, x, y, x, y, m.range, m.count, m.value, m.dir, true);
      } else {
        // Monster/Invasion spot → dùng dragData nếu có
        if (state.dragData) {
          addSpotMonster(m.blockType, m.id,
            state.dragData.startX, state.dragData.startY,
            x, y, m.range, m.count, m.value, m.dir, false
          );
          state.dragData = null;
        } else {
          addSpotMonster(m.blockType, m.id, x, y, x, y, m.range, m.count, m.value, m.dir, false);
        }
      }
    }

    draw(canvas);
  });

  canvas.addEventListener("mousemove", (e) => {
    if (state.addingMonster && state.dragData) {
      const { x, y } = pixelToLogic(e.offsetX, e.offsetY, canvas);
      state.dragData.currentX = x;
      state.dragData.currentY = y;
      draw(canvas);
    }
    state.lastMouse = { x: e.clientX, y: e.clientY };
  });

  canvas.addEventListener("mouseleave", () => {
    if (tooltipEl) tooltipEl.style.display = "none";
  });
  canvas.addEventListener("mouseenter", () => {
    if (tooltipEl) tooltipEl.style.display = "block";
  });


}

/* ========== MONSTER ADD HELPERS ========== */
function addPointMonster(blockType, id, x, y, range, count, value, dir) {
  const mapId = state.currentMapId;
  const data = state.monstersByMap[mapId] ||= { points: [], spots: [] };

  if (blockType === 0) {
    const isDeco = state.decorationIds?.has(id);
    data.points.push({
      classId: id,
      x, y, dir, range,
      isNPC: !isDeco,
      type: isDeco ? "decoration" : "npc",
      sourceLine: "New"
    });
  } else if (blockType === 4) {
    data.points.push({
      classId: id,
      x, y, dir, range,
      isNPC: false,
      type: "battle",
      sourceLine: "New"
    });
  }


  saveHistory();
  refreshUI();
}

function addSpotMonster(blockType, id, x1, y1, x2, y2, range, count, value, dir, lockResize=false) {
  const mapId = state.currentMapId;
  const data = state.monstersByMap[mapId] ||= { points: [], spots: [] };

  if (blockType === 1) {
    data.spots.push({
      classId: id, x1, y1, x2, y2, dir, range, count, value,
      type: "spot", isNPC: false, sourceLine: "New", lockResize
    });
  } else if (blockType === 3) {
    data.spots.push({
      classId: id, x1, y1, x2, y2, dir, range, count, value,
      type: "invasion", isNPC: false, sourceLine: "New", lockResize
    });
  }

  saveHistory();
  refreshUI();
}

/* ========== TOOLTIP ========== */
function showTooltip() {
  if (tooltipEl) tooltipEl.remove();
  tooltipEl = document.createElement("div");
  tooltipEl.style.position = "fixed";
  tooltipEl.style.pointerEvents = "none";
  tooltipEl.style.background = "#222";
  tooltipEl.style.color = "#fff";
  tooltipEl.style.fontSize = "13px";
  tooltipEl.style.padding = "4px 8px";
  tooltipEl.style.borderRadius = "6px";
  tooltipEl.style.zIndex = "9999";
  tooltipEl.style.display = "flex";
  tooltipEl.style.alignItems = "center";
  tooltipEl.style.gap = "6px";

  // 🟢 icon tròn có dấu cộng
  const icon = document.createElement("span");
  icon.textContent = "+";
  icon.style.display = "flex";
  icon.style.alignItems = "center";
  icon.style.justifyContent = "center";
  icon.style.width = "16px";
  icon.style.height = "16px";
  icon.style.borderRadius = "50%";
  icon.style.background = "#4caf50"; // nền xanh lá
  icon.style.color = "#fff";         // dấu cộng trắng
  icon.style.fontWeight = "bold";
  icon.style.fontSize = "12px";

  // chữ mô tả
  const text = document.createElement("span");
  text.textContent = "Đặt quái";

  tooltipEl.appendChild(icon);
  tooltipEl.appendChild(text);

  document.body.appendChild(tooltipEl);
  document.addEventListener("mousemove", updateTooltip);
}

function updateTooltip(e) {
  if (!tooltipEl) return;
  tooltipEl.style.left = e.clientX + 12 + "px";
  tooltipEl.style.top = e.clientY + 12 + "px";

  if (state.addingMonster) {
    const m = state.addingMonster;
    const monsterName = state.classes[m.id]?.name || m.id;
    const modeText = m.addMode === "single" ? "Single" : "Spot";

    // lấy màu theo block
    let color = "#fff";
    if (m.blockType === 0) {
      const isDeco = state.decorationIds?.has(m.id);
      color = isDeco ? getCSS("--deco") : getCSS("--npc");
    } else if (m.blockType === 1) {
      color = getCSS("--danger"); // Monster
    } else if (m.blockType === 3) {
      color = getCSS("--invasion"); // Invasion
    } else if (m.blockType === 4) {
      color = getCSS("--danger"); // Battle event
    }

    // icon tròn/vuông
    const shapeIcon = m.addMode === "single"
      ? `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${color};margin-left:6px"></span>`
      : `<span style="display:inline-block;width:10px;height:10px;background:${color};margin-left:6px"></span>`;

    tooltipEl.innerHTML = `
      <div style="color:${color}; font-weight:600">
        Add ${modeText} ${shapeIcon}
      </div>
      <div>${monsterName} (x${m.count || 1})</div>
    `;
  }
}

function hideTooltip() {
  if (tooltipEl) tooltipEl.remove();
  tooltipEl = null;
  document.removeEventListener("mousemove", updateTooltip);
}

function showPasteTooltip() {
  if (tooltipEl) tooltipEl.remove();
  tooltipEl = document.createElement("div");
  tooltipEl.style.position = "fixed";
  tooltipEl.style.pointerEvents = "none";
  tooltipEl.style.background = "#222";
  tooltipEl.style.color = "#fff";
  tooltipEl.style.fontSize = "12px";
  tooltipEl.style.padding = "2px 6px";
  tooltipEl.style.borderRadius = "4px";
  tooltipEl.style.zIndex = "9999";
  tooltipEl.innerText = "Click để dán quái";
  document.body.appendChild(tooltipEl);
  document.addEventListener("mousemove", updateTooltip);
}

/* ========== UNDO/REDO ========== */
function saveHistory() {
  const snapshot = JSON.stringify(state.monstersByMap);
  state.history.push(snapshot);
  state.future = [];
}
function restoreFrom(snapshot) {
  state.monstersByMap = JSON.parse(snapshot);
  refreshUI();
}

/* ========== COPY/PASTE/DELETE ========== */
function copySelection() {
  if (!state.selection || state.currentMapId == null) return;
  const mapData = state.monstersByMap[state.currentMapId];
  if (!mapData) return;
  if (state.selection.kind === "point") {
    state.clipboard = { ...mapData.points[state.selection.idx], kind: "point" };
  } else if (state.selection.kind === "spot") {
    state.clipboard = { ...mapData.spots[state.selection.idx], kind: "spot" };
  }
}
function pasteSelection(x, y) {
  if (!state.clipboard || state.currentMapId == null) return;
  const data = state.monstersByMap[state.currentMapId] ||= { points: [], spots: [] };
  const c = { ...state.clipboard };
  if (c.kind === "point") {
    c.x = x; c.y = y; c.sourceLine = "New";
    data.points.push(c);
  } else if (c.kind === "spot") {
    const dx = x - c.x1, dy = y - c.y1;
    c.x1 += dx; c.y1 += dy;
    c.x2 += dx; c.y2 += dy;
    c.sourceLine = "New";
    data.spots.push(c);
  }
  saveHistory();
  refreshUI();
}
function deleteSelection() {
  if (!state.selection || state.currentMapId == null) return;
  const data = state.monstersByMap[state.currentMapId];
  if (!data) return;
  if (state.selection.kind === "point") {
    data.points.splice(state.selection.idx, 1);
  } else if (state.selection.kind === "spot") {
    data.spots.splice(state.selection.idx, 1);
  }
  state.selection = null;
  saveHistory();
  refreshUI();
}

/* ========== KEYBOARD SHORTCUTS ========== */
document.addEventListener("keydown", (e) => {
  const isMod = e.ctrlKey || e.metaKey;
  const key = e.key.toLowerCase();
  if (key === "escape") {
    if (state.addingMonster) {
      state.addingMonster = null;
      state.dragData = null;
      hideTooltip();
      draw(document.getElementById("view"));
      e.preventDefault();
      return;
    }
    if (state.pasting) {
      state.pasting = false;
      hideTooltip();
      e.preventDefault();
      return;
    }
  }
  if (isMod && key === "z" && !e.shiftKey) {
    const snap = state.history.pop();
    if (snap) {
      state.future.push(JSON.stringify(state.monstersByMap));
      restoreFrom(snap);
    }
    e.preventDefault();
  } else if (isMod && ((key === "y") || (key === "z" && e.shiftKey))) {
    const snap = state.future.pop();
    if (snap) {
      state.history.push(JSON.stringify(state.monstersByMap));
      restoreFrom(snap);
    }
    e.preventDefault();
  } else if (isMod && key === "c") {
    copySelection(); e.preventDefault();
  } else if (isMod && key === "v") {
    if (state.clipboard) {
      state.pasting = true;
      showPasteTooltip();
    }
    e.preventDefault();
  } else if (key === "delete" || key === "backspace") {
    deleteSelection(); e.preventDefault();
  }
});

document.addEventListener("contextmenu", (e) => {
  if (state.addingMonster) e.preventDefault();
});

/* ========== UTILS ========== */
function pixelToLogic(px, py, canvas) {
  const w = canvas.width, h = canvas.height, g = CONFIG.GRID_SIZE;
  return { x: Math.floor((py * g) / h), y: Math.floor((px * g) / w) };
}
function refreshUI() {
  state.selection = null;
  state.hover = null;
  const mobList = document.getElementById("mobList");
  if (mobList) refreshMonsterListUI(mobList);
  draw(document.getElementById("view"));
}

function getCSS(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}