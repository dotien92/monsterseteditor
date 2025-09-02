// Danh sách quái + tương tác list

import { state } from '../state.js';
import { draw } from '../render.js';
import { byId } from './dom.js';
import { renderInfoPanel } from './info.js';

function nameOf(cid){
  return state.classes[cid]?.name || ('Class ' + cid);
}

/* ========== FILTER UI ========== */
export function renderMonsterFilters(container){
  // Nếu state.filters chưa có thì khởi tạo mặc định
  if(!state.filters){
    state.filters = {
      npc: false,
      decoration: false,
      monster: true,
      invasion: false,
      battle: true
    };
  }

  container.innerHTML = `
    <label><input type="checkbox" data-ft="npc" ${state.filters.npc?'checked':''}/> NPC</label>
    <label><input type="checkbox" data-ft="decoration" ${state.filters.decoration?'checked':''}/> Decoration</label>
    <label><input type="checkbox" data-ft="monster" ${state.filters.monster?'checked':''}/> Monster</label>
    <label><input type="checkbox" data-ft="invasion" ${state.filters.invasion?'checked':''}/> Invasion</label>
    <label><input type="checkbox" data-ft="battle" ${state.filters.battle?'checked':''}/> Battle</label>
  `;

  container.querySelectorAll('input[type=checkbox]').forEach(chk=>{
    chk.addEventListener('change', ()=>{
      const key = chk.dataset.ft;
      state.filters[key] = chk.checked;

      // refresh list + canvas
      const mobList = document.getElementById('mobList');
      if(mobList) renderMonsterList(mobList);
      draw(document.getElementById('view'));
    });
  });
}

/* ========== HOVER & SELECTION ========== */
export function updateListHover(container){
  if(!container) return;
  container.querySelectorAll('.list-row.hovered').forEach(el=>el.classList.remove('hovered'));
  if(!state.hover) return;
  const sel = `.list-row[data-kind="${state.hover.kind}"][data-idx="${state.hover.idx}"]`;
  const row = container.querySelector(sel);
  if(row) row.classList.add('hovered');
}

export function updateListSelection(container){
  if(!container) return;
  container.querySelectorAll('.list-row.selected').forEach(el=>el.classList.remove('selected'));
  if(!state.selection) return;
  const sel = `.list-row[data-kind="${state.selection.kind}"][data-idx="${state.selection.idx}"]`;
  const row = container.querySelector(sel);
  if(row) row.classList.add('selected');
  if(row && typeof row.scrollIntoView==='function'){
    row.scrollIntoView({block:'nearest'});
  }
}

/* ========== RENDER GROUP ========== */
function renderGroup(title, singles, spots, kind){
  // nếu cả singles và spots đều trống thì không render gì
  if ((!singles || !singles.length) && (!spots || !spots.length)) {
    return '';
  }

  let html = `<div class="group"><div class="group-title">${title}</div>`;

  if (singles && singles.length){
    html += `<div class="subgroup"><div class="sub-title">Single (${singles.length})</div>`;
    html += '<ul style="list-style:none; margin:0; padding:0 8px 6px 8px">';
    singles.forEach((m)=>{
      const lineLabel =
        (m.sourceLine && m.sourceLine > 0)
          ? `<span class="tag">L${m.sourceLine}</span>`
          : `<span class="tag new">NEW</span>`;
      html += `<li class="list-row" data-kind="${kind}" data-idx="${m.idx}" style="padding:4px 0">
        ${lineLabel} ${nameOf(m.classId)} — (x:${m.x ?? m.x1}, y:${m.y ?? m.y1})
      </li>`;
    });
    html += '</ul></div>';
  }

  if (spots && spots.length){
    html += `<div class="subgroup"><div class="sub-title">Spot (${spots.length})</div>`;
    html += '<ul style="list-style:none; margin:0; padding:0 8px 6px 8px">';
    spots.forEach((m)=>{
      const lineLabel =
        (m.sourceLine && m.sourceLine > 0)
          ? `<span class="tag">L${m.sourceLine}</span>`
          : `<span class="tag new">NEW</span>`;
      html += `<li class="list-row" data-kind="spot" data-idx="${m.idx}" style="padding:4px 0">
        ${lineLabel} ${nameOf(m.classId)} — (x1:${m.x1}, y1:${m.y1}) → (x2:${m.x2}, y2:${m.y2})
      </li>`;
    });
    html += '</ul></div>';
  }

  html += '</div>';
  return html;
}

/* ========== RENDER MONSTER LIST ========== */
export function renderMonsterList(container){
  const mapId = state.currentMapId;
  if(mapId == null){
    container.innerHTML = '<div class="muted" style="padding:8px">Chưa chọn map.</div>';
    return;
  }
  const data = state.monstersByMap[mapId];
  if(!data){
    container.innerHTML = '<div class="muted" style="padding:8px">Không có dữ liệu.</div>';
    return;
  }

  const f = state.filters || { npc:true, decoration:true, monster:true, invasion:true, battle:true };

  // lọc theo filter
  const npcSingles  = f.npc        ? data.points.filter(p=>p.type==='npc').map((p,i)=>({...p, idx:i})) : [];
  const decoSingles = f.decoration ? data.points.filter(p=>p.type==='decoration').map((p,i)=>({...p, idx:i})) : [];
  const battleSingles = f.battle   ? data.points.filter(p=>p.type==='battle').map((p,i)=>({...p, idx:i})) : [];

  const monsterSingles = f.monster ? data.spots.filter(s=>(s.type==='spot' && (s.lockResize || (s.x1===s.x2 && s.y1===s.y2)))).map((s,i)=>({...s, idx:i})) : [];
  const monsterSpots   = f.monster ? data.spots.filter(s=>(s.type==='spot' && !(s.lockResize || (s.x1===s.x2 && s.y1===s.y2)))).map((s,i)=>({...s, idx:i})) : [];

  const invasionSingles = f.invasion ? data.spots.filter(s=>(s.type==='invasion' && (s.lockResize || (s.x1===s.x2 && s.y1===s.y2)))).map((s,i)=>({...s, idx:i})) : [];
  const invasionSpots   = f.invasion ? data.spots.filter(s=>(s.type==='invasion' && !(s.lockResize || (s.x1===s.x2 && s.y1===s.y2)))).map((s,i)=>({...s, idx:i})) : [];

  let html = '';
  html += renderGroup('NPC', npcSingles, [], 'point');
  html += renderGroup('Decoration', decoSingles, [], 'point');
  html += renderGroup('Monster', monsterSingles, monsterSpots, 'spot');
  html += renderGroup('Invasion', invasionSingles, invasionSpots, 'spot');
  html += renderGroup('Battle', battleSingles, [], 'point');

  container.innerHTML = html || '<div class="muted" style="padding:8px">Không có dữ liệu.</div>';

  updateListHover(container);
  updateListSelection(container);
}

/* ========== BIND INTERACTIONS ========== */
const _bound = Symbol('bound');
export function bindListInteractions(container){
  if(container[_bound]) return;
  container[_bound] = true;

  container.addEventListener('mousemove', (ev)=>{
    const row = ev.target.closest('.list-row');
    if(!row) return;
    const kind = row.getAttribute('data-kind');
    const idx  = Number(row.getAttribute('data-idx'));
    if(kind && Number.isFinite(idx)){
      const prev = state.hover;
      if(!prev || prev.kind!==kind || prev.idx!==idx){
        state.hover = { kind, idx };
        updateListHover(container);
        const canvas = byId('view');
        let raf = 0;
        if(raf) cancelAnimationFrame(raf);
        raf = requestAnimationFrame(()=> draw(canvas));
      }
    }
  });

  container.addEventListener('mouseleave', ()=>{
    state.hover = null;
    updateListHover(container);
    const canvas = byId('view');
    draw(canvas);
  });

  container.addEventListener('click', (ev)=>{
    const row = ev.target.closest('.list-row');
    if(!row) return;
    const kind = /** @type {'point'|'spot'} */ (row.getAttribute('data-kind'));
    const idx  = Number(row.getAttribute('data-idx'));
    if(kind && Number.isFinite(idx)){
      state.selection = { kind, idx };
      updateListSelection(container);
      const info = document.getElementById('infoPanel');
      if(info) renderInfoPanel(info);
      const canvas = document.getElementById('view');
      draw(canvas);
    }
  });
}