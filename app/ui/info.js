// Info Panel — hiển thị chi tiết spot/single

import { state } from '../state.js';

function nameOf(cid){
  return state.classes[cid]?.name || ('Class ' + cid);
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
  let rows = [];

  if(sel.kind === 'point'){
    const p = data.points[sel.idx];
    if(!p){ infoEl.innerHTML = '<div class="muted">Không tìm thấy item.</div>'; return; }
    const tag = p.isNPC ? 'npc' : 'monster';
    const tagText = p.isNPC ? 'NPC' : 'Monster';
    rows.push(['Tên quái', nameOf(p.classId)]);
    rows.push(['Loại', `<span class="tag ${tag}">${tagText}</span>`]);
    rows.push(['Vị trí', `(x:${p.x}, y:${p.y})`]);
    rows.push(['Số lượng', '1']);
    rows.push(['Nguồn', `L${p.sourceLine ?? '?'}`]);
  } else {
    const s = data.spots[sel.idx];
    if(!s){ infoEl.innerHTML = '<div class="muted">Không tìm thấy item.</div>'; return; }
    const tagMap = { spot:'monster', invasion:'invasion', event:'battle' };
    const tagKey = tagMap[s.type] || 'monster';
    const tagText = s.type==='invasion' ? 'Invasion' : (s.type==='event' ? 'Battle' : 'Monster');
    rows.push(['Tên quái', nameOf(s.classId)]);
    rows.push(['Loại', `<span class="tag ${tagKey}">${tagText}</span>`]);
    rows.push(['Vị trí', `(x1:${s.x1}, y1:${s.y1}) → (x2:${s.x2}, y2:${s.y2})`]);
    rows.push(['Số lượng', Number.isFinite(s.count) ? String(s.count) : '—']);
    if(Number.isFinite(s.value)) rows.push(['Giá trị', String(s.value)]);
    rows.push(['Nguồn', `L${s.sourceLine ?? '?'}`]);
  }

  infoEl.innerHTML = `
    <div class="info-row"><div class="info-label">Tên quái</div><div class="info-value">${rows[0][1]}</div></div>
    ${rows.slice(1).map(([k,v])=>`
      <div class="info-row">
        <div class="info-label">${k}</div>
        <div class="info-value">${v}</div>
      </div>
    `).join('')}
  `;
}