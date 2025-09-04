// Info Panel — hiển thị chi tiết spot/single

import { state } from '../state.js';
import { draw } from '../render.js';
import { renderMonsterList } from './list.js';

function nameOf(cid){
  return state.classes[cid]?.name || ('Class ' + cid);
}

function saveHistory() {
  const snapshot = JSON.stringify(state.monstersByMap);
  state.history.push(snapshot);
  state.future = [];
}

export function renderInfoPanel(infoEl){
  if(!infoEl) return;
  const mapId = state.currentMapId;
  const data = mapId!=null ? state.monstersByMap[mapId] : null;

  if(!data || !state.selection){
    infoEl.innerHTML = '<div class="muted">Chọn 1 spot hoặc single để xem chi tiết.</div>';
    return;
  }

  const sel = state.selection;
  let html = "";

  if(sel.kind === 'point'){
    const p = data.points[sel.idx];
    if(!p){ infoEl.innerHTML = '<div class="muted">Không tìm thấy item.</div>'; return; }
    let tag = 'monster', tagText = 'Monster';
    if(p.type==='npc'){ tag='npc'; tagText='NPC'; }
    else if(p.type==='decoration'){ tag='decoration'; tagText='Decoration'; }

    html = `
      <div class="info-row"><div class="info-label">Tên quái</div><div class="info-value">${nameOf(p.classId)}</div></div>
      <div class="info-row"><div class="info-label">Loại</div><div class="info-value"><span class="tag ${tag}">${tagText}</span></div></div>
      <div class="info-row"><div class="info-label">Kiểu</div><div class="info-value">Single</div></div>
      <div class="info-row"><div class="info-label">Vị trí</div><div class="info-value">(x:${p.x}, y:${p.y})</div></div>
      <div class="info-row"><div class="info-label">Số lượng</div><div class="info-value"><input type="number" class="info-count" value="${p.count||1}" min="1" max="500"/></div></div>
      <div class="info-row"><div class="info-label">Range</div><div class="info-value"><input type="number" class="info-range" value="${p.range||0}" min="0" max="255"/></div></div>
      <div class="info-row"><div class="info-label">Dir</div><div class="info-value"><input type="number" class="info-dir" value="${p.dir||0}" min="0" max="360"/></div></div>
      <div class="info-row"><div class="info-label">Nguồn</div><div class="info-value">L${p.sourceLine ?? '?'}</div></div>
    `;
  } else {
    const s = data.spots[sel.idx];
    if(!s){ infoEl.innerHTML = '<div class="muted">Không tìm thấy item.</div>'; return; }
    const tagMap = { spot:'monster', invasion:'invasion', event:'battle' };
    const tagKey = tagMap[s.type] || 'monster';
    const tagText = s.type==='invasion' ? 'Invasion' : (s.type==='event' ? 'Battle' : 'Monster');
    const isSingle = !!s.lockResize;

    html = `
      <div class="info-row"><div class="info-label">Tên quái</div><div class="info-value">${nameOf(s.classId)}</div></div>
      <div class="info-row"><div class="info-label">Loại</div><div class="info-value"><span class="tag ${tagKey}">${tagText}</span></div></div>
      <div class="info-row"><div class="info-label">Kiểu</div><div class="info-value">${isSingle ? 'Single' : 'Spot'}</div></div>
      <div class="info-row"><div class="info-label">Vị trí</div><div class="info-value">
        ${isSingle ? `(x:${s.x1}, y:${s.y1})` : `(x1:${s.x1}, y1:${s.y1}) → (x2:${s.x2}, y2:${s.y2})`}
      </div></div>
      <div class="info-row"><div class="info-label">Số lượng</div><div class="info-value"><input type="number" class="info-count" value="${s.count||1}" min="1" max="500"/></div></div>
      <div class="info-row"><div class="info-label">Range</div><div class="info-value"><input type="number" class="info-range" value="${s.range||0}" min="0" max="255"/></div></div>
      <div class="info-row"><div class="info-label">Dir</div><div class="info-value"><input type="number" class="info-dir" value="${s.dir||0}" min="0" max="360"/></div></div>
      ${Number.isFinite(s.value) ? `<div class="info-row"><div class="info-label">Giá trị</div><div class="info-value">${s.value}</div></div>` : ""}
      <div class="info-row"><div class="info-label">Nguồn</div><div class="info-value">L${s.sourceLine ?? '?'}</div></div>
    `;
  }

  infoEl.innerHTML = html;

  // 🟢 Gắn sự kiện chỉnh sửa
  const countInput = infoEl.querySelector(".info-count");
  const rangeInput = infoEl.querySelector(".info-range");
  const dirInput   = infoEl.querySelector(".info-dir");

  function applyChange(field, value){
    if(!Number.isFinite(value)) return;
    if(sel.kind === 'point'){
      const p = data.points[sel.idx];
      if(p){ p[field] = value; }
    } else {
      const s = data.spots[sel.idx];
      if(s){ s[field] = value; }
    }
    saveHistory();
    draw(document.getElementById("view"));
    renderMonsterList(document.getElementById("mobList"));
  }

  if(countInput) countInput.addEventListener("change", ()=> applyChange("count", parseInt(countInput.value,10)));
  if(rangeInput) rangeInput.addEventListener("change", ()=> applyChange("range", parseInt(rangeInput.value,10)));
  if(dirInput)   dirInput.addEventListener("change", ()=> applyChange("dir", parseInt(dirInput.value,10)));
}