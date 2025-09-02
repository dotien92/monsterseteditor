// Danh sách quái + tương tác list

import { state } from '../state.js';
import { draw } from '../render.js';
import { byId } from './dom.js';
import { renderInfoPanel } from './info.js';

function nameOf(cid){
  return state.classes[cid]?.name || ('Class ' + cid);
}

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

function renderGroup(title, singles, spots, kind){
  let html = `<div class="group"><div class="group-title">${title}</div>`;

  // Single
  if (singles && singles.length){
    html += `<div class="subgroup"><div class="sub-title">Single (${singles.length})</div>`;
    html += '<ul style="list-style:none; margin:0; padding:0 8px 6px 8px">';
    singles.forEach((m)=>{
      const lineLabel =
        (m.sourceLine && m.sourceLine > 0)
          ? `<span class="tag">L${m.sourceLine}</span>`
          : `<span class="tag new">NEW</span>`;
      html += `<li class="list-row" data-kind="${kind}" data-idx="${m.idx}" style="padding:4px 0">${lineLabel} ${nameOf(m.classId)} — (x:${m.x ?? m.x1}, y:${m.y ?? m.y1})</li>`;
    });
    html += '</ul></div>';
  }

  // Spot
  if (spots && spots.length){
    html += `<div class="subgroup"><div class="sub-title">Spot (${spots.length})</div>`;
    html += '<ul style="list-style:none; margin:0; padding:0 8px 6px 8px">';
    spots.forEach((m)=>{
      const lineLabel =
        (m.sourceLine && m.sourceLine > 0)
          ? `<span class="tag">L${m.sourceLine}</span>`
          : `<span class="tag new">NEW</span>`;
      html += `<li class="list-row" data-kind="spot" data-idx="${m.idx}" style="padding:4px 0">${lineLabel} ${nameOf(m.classId)} — (x1:${m.x1}, y1:${m.y1}) → (x2:${m.x2}, y2:${m.y2})</li>`;
    });
    html += '</ul></div>';
  }

  html += '</div>';
  return html;
}

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

  // Phân loại
  const npcSingles  = data.points.filter((p)=>p.type==='npc').map((p,i)=>({...p, idx:i}));
  const decoSingles = data.points.filter((p)=>p.type==='decoration').map((p,i)=>({...p, idx:i}));
  const battleSingles = data.points.filter((p)=>p.type==='battle').map((p,i)=>({...p, idx:i}));

  const monsterSingles = data.spots.filter((s)=>(s.type==='spot' && (s.lockResize || (s.x1===s.x2 && s.y1===s.y2)))).map((s,i)=>({...s, idx:i}));
  const monsterSpots   = data.spots.filter((s)=>(s.type==='spot' && !(s.lockResize || (s.x1===s.x2 && s.y1===s.y2)))).map((s,i)=>({...s, idx:i}));

  const invasionSingles = data.spots.filter((s)=>(s.type==='invasion' && (s.lockResize || (s.x1===s.x2 && s.y1===s.y2)))).map((s,i)=>({...s, idx:i}));
  const invasionSpots   = data.spots.filter((s)=>(s.type==='invasion' && !(s.lockResize || (s.x1===s.x2 && s.y1===s.y2)))).map((s,i)=>({...s, idx:i}));

  let html = '';
  html += renderGroup('NPC (0)', npcSingles, [], 'point');
  html += renderGroup('Decoration', decoSingles, [], 'point');
  html += renderGroup('Monster (1)', monsterSingles, monsterSpots, 'spot');
  html += renderGroup('Invasion (3)', invasionSingles, invasionSpots, 'spot');
  html += renderGroup('Battle (4)', battleSingles, [], 'point');

  container.innerHTML = html || '<div class="muted" style="padding:8px">Không có dữ liệu.</div>';

  updateListHover(container);
  updateListSelection(container);
}

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