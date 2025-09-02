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
        <option value="0">NPC (0)</option>
        <option value="1">Monster (1)</option>
        <option value="3">Invasion (3)</option>
        <option value="4">Battle (4)</option>
      </select>
    </label>
    <label>Monster:
      <select class="monsterId">${options}</select>
    </label>
    <div class="params"></div>
    <button class="addBtn primary">➕ Thêm Quái</button>
  `;

  const blockSelect = panel.querySelector(".blockType");
  const paramsDiv = panel.querySelector(".params");

  function renderParams(blockType) {
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

   // 🟢 Đổi block type → render lại params + huỷ chế độ thêm nếu đang active
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

  // 🟢 Đổi monster → update id trong state.addingMonster nếu đang thêm
  const monsterSelect = panel.querySelector(".monsterId");
  monsterSelect.addEventListener("change", () => {
    const newMonsterId = parseInt(monsterSelect.value, 10);

    if (state.addingMonster) {
      state.addingMonster.id = newMonsterId;
      console.log("🔄 Đổi monster khi đang thêm:", state.addingMonster);

      // cập nhật tooltip ngay để thấy tên quái mới
      if (state.lastMouse) {
        updateTooltip({ clientX: state.lastMouse.x, clientY: state.lastMouse.y });
      }
    }
  });

  panel.querySelector(".addBtn").onclick = () => {
    const blockType = parseInt(blockSelect.value, 10);
    const monsterId = parseInt(panel.querySelector(".monsterId").value, 10);
    const range = panel.querySelector(".range") ? parseInt(panel.querySelector(".range").value, 10) : 0;
    const count = panel.querySelector(".count") ? parseInt(panel.querySelector(".count").value, 10) : 1;
    const value = panel.querySelector(".value") ? parseInt(panel.querySelector(".value").value, 10) : 0;
    const dir = panel.querySelector(".dir") ? parseInt(panel.querySelector(".dir").value, 10) : 0;

    state.addingMonster = { blockType, id: monsterId, range, count, value, dir };
    console.log("👉 Ready to add monster:", state.addingMonster);

    showTooltip();
  };
}

/* ========== CANVAS BINDING ========== */
export function bindCanvasForAddMonster(canvas) {
  if (!canvas) return;

  canvas.addEventListener("mousedown", (e) => {
    // Huỷ paste bằng chuột phải
    if (state.pasting && e.button === 2) {
      console.log("❌ Huỷ paste mode (right click)");
      state.pasting = false;
      hideTooltip();
      return;
    }

    // Thực hiện paste bằng chuột trái
    if (state.pasting && state.clipboard && e.button === 0) {
      const { x, y } = pixelToLogic(e.offsetX, e.offsetY, canvas);
      pasteSelection(x, y);
      state.pasting = false;
      hideTooltip();
      return;
    }

    if (!state.addingMonster) return;
    const { x, y } = pixelToLogic(e.offsetX, e.offsetY, canvas);

    // bắt đầu kéo
    state.dragData = { startX: x, startY: y, currentX: x, currentY: y };
    console.log("👉 mousedown event chạy", state.addingMonster);
  });

  canvas.addEventListener("mousemove", (e) => {
    // preview khi kéo spot
    if (state.addingMonster && state.dragData) {
      const { x, y } = pixelToLogic(e.offsetX, e.offsetY, canvas);
      state.dragData.currentX = x;
      state.dragData.currentY = y;
      draw(canvas);
    }

    // track mouse cho tooltip/paste
    state.lastMouse = { x: e.clientX, y: e.clientY };
  });

  // 🟢 Khi chuột rời canvas → ẩn tooltip
  canvas.addEventListener("mouseleave", () => {
    if (tooltipEl) tooltipEl.style.display = "none";
  });

  // 🟢 Khi chuột vào lại canvas → hiện tooltip (nếu đang thêm/paste)
  canvas.addEventListener("mouseenter", () => {
    if (tooltipEl) tooltipEl.style.display = "block";
  });

  canvas.addEventListener("mouseup", (e) => {
    if (!state.addingMonster) return;
    if (e.button === 2) { // Chuột phải hủy
      console.log("❌ Huỷ chế độ thêm quái (right click)");
      state.addingMonster = null;
      state.dragData = null;
      hideTooltip();
      draw(canvas);
      return;
    }

    const { x, y } = pixelToLogic(e.offsetX, e.offsetY, canvas);
    const m = state.addingMonster;

    if (m.blockType === 0 || m.blockType === 4) {
      addPointMonster(m.blockType, m.id, x, y, m.range, m.count, m.value, m.dir);
    } else {
      if (state.dragData) {
        addSpotMonster(m.blockType, m.id, state.dragData.startX, state.dragData.startY, x, y, m.range, m.count, m.value, m.dir);
        state.dragData = null;
      } else {
        addSpotMonster(m.blockType, m.id, x, y, x, y, m.range, m.count, m.value, m.dir);
      }
    }

    draw(canvas);
  });
}

/* ========== MONSTER ADD HELPERS ========== */
function addPointMonster(blockType, id, x, y, range, count, value, dir) {
  const mapId = state.currentMapId;
  const data = state.monstersByMap[mapId] ||= { points: [], spots: [] };

  if (blockType === 0) {
    data.points.push({ classId: id, x, y, dir, range, isNPC: true, type: "npc", sourceLine: "New" });
  } else if (blockType === 4) {
    data.points.push({ classId: id, x, y, dir, range, isNPC: false, type: "battle", sourceLine: "New" });
  }

  saveHistory();
  state.selection = null;
  state.hover = null;
  const mobList = document.getElementById("mobList");
  if (mobList) refreshMonsterListUI(mobList);
  draw(document.getElementById("view"));
}

function addSpotMonster(blockType, id, x1, y1, x2, y2, range, count, value, dir) {
  const mapId = state.currentMapId;
  const data = state.monstersByMap[mapId] ||= { points: [], spots: [] };

  if (blockType === 1) {
    data.spots.push({
      classId: id,
      x1, y1, x2, y2, dir, range, count, value,
      type: "spot",
      isNPC: false,
      sourceLine: "New"
    });
  } else if (blockType === 3) {
    data.spots.push({
      classId: id, x1, y1, x2, y2, dir, range, count, value,
      type: "invasion",
      isNPC: false,
      sourceLine: "New"
    });
  }

  saveHistory();
  state.selection = null;
  state.hover = null;
  const mobList = document.getElementById("mobList");
  if (mobList) refreshMonsterListUI(mobList);
  draw(document.getElementById("view"));
}

/* ========== TOOLTIP ========== */
function showTooltip() {
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
  tooltipEl.innerText = "Click để đặt quái";
  document.body.appendChild(tooltipEl);
  document.addEventListener("mousemove", updateTooltip);
}

function updateTooltip(e) {
  if (!tooltipEl) return;
  tooltipEl.style.left = e.clientX + 12 + "px";
  tooltipEl.style.top = e.clientY + 12 + "px";

  if (state.addingMonster) {
    tooltipEl.innerText = `Thêm: ${state.classes[state.addingMonster.id]?.name || state.addingMonster.id} (x${state.addingMonster.count || 1})`;
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
  const mobList = document.getElementById("mobList");
  if (mobList) refreshMonsterListUI(mobList);
  draw(document.getElementById("view"));
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
  console.log("📋 Copied:", state.clipboard);
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

  console.log("📋 Pasted:", c);
  saveHistory();
  const mobList = document.getElementById("mobList");
  if (mobList) refreshMonsterListUI(mobList);
  draw(document.getElementById("view"));
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
  const mobList = document.getElementById("mobList");
  if (mobList) refreshMonsterListUI(mobList);
  draw(document.getElementById("view"));
  console.log("🗑️ Deleted selection");
}

/* ========== KEYBOARD SHORTCUTS ========== */
document.addEventListener("keydown", (e) => {
  const isMod = e.ctrlKey || e.metaKey;
  const key = e.key.toLowerCase();

  if (key === "escape") {
    if (state.addingMonster) {
      console.log("❌ Huỷ chế độ thêm quái (ESC)");
      state.addingMonster = null;
      state.dragData = null;
      hideTooltip();
      draw(document.getElementById("view"));
      e.preventDefault();
      return;
    }
    if (state.pasting) {
      console.log("❌ Huỷ paste mode (ESC)");
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
      console.log("↩️ Undo");
    }
    e.preventDefault();
  } else if (isMod && ((key === "y") || (key === "z" && e.shiftKey))) {
    const snap = state.future.pop();
    if (snap) {
      state.history.push(JSON.stringify(state.monstersByMap));
      restoreFrom(snap);
      console.log("↪️ Redo");
    }
    e.preventDefault();
  } else if (isMod && key === "c") {
    copySelection();
    e.preventDefault();
  } else if (isMod && key === "v") {
    if (state.clipboard) {
      state.pasting = true;
      showPasteTooltip();
      console.log("📋 Paste mode: click lên map để dán");
    }
    e.preventDefault();
  } else if (key === "delete" || key === "backspace") {
    deleteSelection();
    e.preventDefault();
  }
});

document.addEventListener("contextmenu", (e) => {
  if (state.addingMonster) {
    e.preventDefault();
  }
});

/* ========== UTILS ========== */
function pixelToLogic(px, py, canvas) {
  const w = canvas.width, h = canvas.height, g = CONFIG.GRID_SIZE;
  return { x: Math.floor((py * g) / h), y: Math.floor((px * g) / w) };
}