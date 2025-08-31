import { state } from "../state.js";
import { draw } from "../render.js";

let dialogEl;

export function initAddMonsterUI() {
  const btn = document.getElementById("addMonsterBtn");
  btn.addEventListener("click", () => openDialog());
}

function openDialog() {
  if (!dialogEl) {
    dialogEl = document.createElement("div");
    dialogEl.className = "monster-dialog";
    dialogEl.innerHTML = `
      <div class="dialog-content">
        <input id="monsterSearch" type="text" placeholder="Tìm quái..." />
        <div id="monsterList" class="scroll" style="max-height:300px"></div>
        <button id="monsterClose">Đóng</button>
      </div>
    `;
    document.body.appendChild(dialogEl);

    dialogEl.querySelector("#monsterClose").addEventListener("click", closeDialog);
    dialogEl.addEventListener("click", (e) => {
      if (e.target === dialogEl) closeDialog();
    });

    const input = dialogEl.querySelector("#monsterSearch");
    input.addEventListener("input", () => renderList(input.value));
    renderList("");
  }
  dialogEl.style.display = "flex";
}

function closeDialog() {
  if (dialogEl) dialogEl.style.display = "none";
}

function renderList(filter) {
  const listEl = dialogEl.querySelector("#monsterList");
  listEl.innerHTML = "";
  const monsters = Object.values(state.classes)  // ⚠️ state.monsters chưa có → dùng state.classes (Monster.txt)
    .filter(m => !filter || m.name.toLowerCase().includes(filter.toLowerCase()));
  monsters.forEach(m => {
    const row = document.createElement("div");
    row.className = "list-row";
    row.textContent = `[${m.id}] ${m.name}`;
    row.addEventListener("click", () => {
      state.addingMonster = m;
      closeDialog();
    });
    listEl.appendChild(row);
  });
}

export function bindCanvasForAddMonster(canvas) {
  canvas.addEventListener("click", (e) => {
    if (!state.addingMonster || state.currentMapId == null) return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / state.viewScale);
    const y = Math.floor((e.clientY - rect.top) / state.viewScale);

    const mapId = state.currentMapId;
    const data = state.monstersByMap[mapId] ||= { points: [], spots: [] };

    // Thêm 1 spot quái mới
    data.spots.push({
      classId: state.addingMonster.id,
      x1: x,
      y1: y,
      x2: x + 5,
      y2: y + 5,
      dir: 0,
      count: 5,
      type: "spot",   // để save.js phân loại block 1
      isNPC: false,
      sourceLine: -1  // đánh dấu là quái thêm mới
    });

    console.log("✅ Đã thêm monster:", state.addingMonster.name, "vào map", mapId, "tại", x, y);
    console.log("📦 monstersByMap[mapId] =", data);

    state.addingMonster = null;
    draw(canvas);
  });
}