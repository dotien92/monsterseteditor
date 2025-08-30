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

  let html = '';
  html += '<div class="muted" style="padding:6px 8px">Điểm (single): ' + (data.points.length || 0) + '</div>';
  if(data.points.length){
    html += '<ul style="list-style:none; margin:0; padding:0 8px 6px 8px">';
    data.points.forEach((p,i)=>{
      const ln  = p.sourceLine ?? '?';
      const tag = p.type === 'npc' ? '<span style="margin-left:6px;font-size:11px;opacity:.85">[NPC]</span>' : '';
      html += `<li class="list-row" data-kind="point" data-idx="${i}" style="padding:4px 0">[L${ln}] ${nameOf(p.classId)} ${tag} — (x:${p.x}, y:${p.y})</li>`;
    });
    html += '</ul>';
  }
  html += '<div class="muted" style="padding:6px 8px">Vùng (spot/invasion/event): ' + (data.spots.length || 0) + '</div>';
  if(data.spots.length){
    html += '<ul style="list-style:none; margin:0; padding:0 8px 8px 8px">';
    data.spots.forEach((s,i)=>{
      const ln  = s.sourceLine ?? '?';
      let tag = '';
      if(s.type === 'invasion') tag = '[Invasion]';
      else if(s.type === 'event') tag = '[Event]';
      else if(s.type === 'spot') tag = '[Spot]';
      html += `<li class="list-row" data-kind="spot" data-idx="${i}" style="padding:4px 0">[L${ln}] ${nameOf(s.classId)} ${tag} — (x1:${s.x1}, y1:${s.y1}) → (x2:${s.x2}, y2:${s.y2})</li>`;
    });
    html += '</ul>';
  }
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
        state.hover = /** @type {any} */ ({ kind, idx });
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