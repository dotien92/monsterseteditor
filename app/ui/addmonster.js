import state from "../state.js";
import { render } from "../render.js";

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
  const monsters = Object.values(state.monsters)
    .filter(m => !filter || m.name.toLowerCase().includes(filter.toLowerCase()));
  monsters.forEach(m => {
    const row = document.createElement("div");
    row.className = "list-row";
    row.textContent = `[${m.id}] ${m.name} (Lv ${m.level})`;
    row.addEventListener("click", () => {
      state.addingMonster = m;
      closeDialog();
    });
    listEl.appendChild(row);
  });
}

export function bindCanvasForAddMonster(canvas) {
  canvas.addEventListener("click", (e) => {
    if (!state.addingMonster) return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / state.scale);
    const y = Math.floor((e.clientY - rect.top) / state.scale);

    const spawn = {
      type: 1, // mặc định Monster block
      monsterId: state.addingMonster.id,
      mapId: state.currentMap.mapId,
      moveRange: 20,
      x1: x, y1: y,
      x2: x+5, y2: y+5,
      dir: 0,
      count: 5,
      value: 0
    };

    if (!state.spawns[state.currentMap.mapId]) {
      state.spawns[state.currentMap.mapId] = [];
    }
    state.spawns[state.currentMap.mapId].push(spawn);

    state.addingMonster = null;
    render();
  });
}