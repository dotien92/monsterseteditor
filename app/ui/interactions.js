// Bind toàn bộ tương tác UI (canvas + panel) và ghép các module con

import { state } from '../state.js';
import { updateTooltip, hideTooltip, draw } from '../render.js';
import { CONFIG } from '../config.js';

import { byId, setCursor, resizeCursorFor } from './dom.js';
import { renderMonsterList, bindListInteractions, updateListHover, updateListSelection } from './list.js';
import { renderInfoPanel } from './info.js';
import { gridFromMouse, rawFromCalibrated, hitTest } from './hit.js';
import { loadCalibFromStorage, attachCalibrateUI } from './calibrate.js';
import { attachScaleUI } from './scale.js';
import { renderMapStats } from './stats.js';  


const gclamp = (v)=> Math.max(0, Math.min(CONFIG.GRID_SIZE - 1, Math.round(v)));
function saveHistory() {
  const snapshot = JSON.stringify(state.monstersByMap);
  state.history.push(snapshot);
  state.future = [];
}

function isVisibleByFilter(hit) {
  if (!hit) return false;
  const f = state.filters || {
    npc:false, decoration:false, monster:true, invasion:false, battle:true
  };
  const mapId = state.currentMapId;
  const data = state.monstersByMap[mapId];
  if (!data) return false;

  if (hit.kind === 'point') {
    const p = data.points[hit.idx];
    if (!p) return false;
    if (p.type === 'npc'        && !f.npc) return false;
    if (p.type === 'decoration' && !f.decoration) return false;
    if (p.type === 'battle'     && !f.battle) return false;
  } else if (hit.kind === 'spot') {
    const s = data.spots[hit.idx];
    if (!s) return false;
    if (s.type === 'spot'     && !f.monster) return false;
    if (s.type === 'invasion' && !f.invasion) return false;
  }
  return true;
}

function refreshMobList(mobList) {
  if (mobList) renderMonsterList(mobList);
}

export default function bindUI(){
  const mapSelect    = document.querySelector('#mapSelect');
  const canvas       = byId('view');
  const coordReadout = byId('coordReadout');
  const mobList      = byId('mobList');
  const infoPanel    = byId('infoPanel');
  const statsPanel   = byId('mapStats');      // ✅ thêm
  const scaleInput   = byId('scale');
  const scaleVal     = byId('scaleVal');
  const scaleMinus   = byId('scaleMinus');
  const scalePlus    = byId('scalePlus');
  const calibToggle  = byId('calibToggle');
  const calibReset   = byId('calibReset');

  if(!mapSelect) throw new Error('UI missing element #mapSelect');

  // khôi phục calibration
  state.calibrationByMap = loadCalibFromStorage();

  // redraw với rAF
  let raf = 0;
  const redraw = ()=>{
    if(raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(()=> draw(canvas));
  };

  // chọn map
  mapSelect.onchange = ()=>{
    state.currentMapId = Number(mapSelect.value);
    renderMonsterList(mobList);
    renderInfoPanel(infoPanel);
    renderMapStats(statsPanel);   // ✅ cập nhật thống kê
    redraw();
  };

  // scale UI
  attachScaleUI({
    input: scaleInput, minus: scaleMinus, plus: scalePlus, label: scaleVal,
    onChange: redraw
  });

  // calibrate UI
  attachCalibrateUI({
    canvas, calibToggle, calibReset,
    getGridSize: ()=> CONFIG.GRID_SIZE,
    onChange: ()=>{
      renderInfoPanel(infoPanel);
      redraw();
    }
  });

  // readout tọa độ + hiển thị tên monster khi hover
  canvas.addEventListener('mousemove', (ev)=>{
    if(state.currentMapId == null) return;
    const rect = canvas.getBoundingClientRect();
    const x = ev.clientX - rect.left, y = ev.clientY - rect.top;
    const max = CONFIG.GRID_SIZE - 1;
    const fracX = x / rect.width, fracY = y / rect.height;
    const Xgrid = Math.max(0, Math.min(max, Math.round(fracY * CONFIG.GRID_SIZE)));
    const Ygrid = Math.max(0, Math.min(max, Math.round(fracX * CONFIG.GRID_SIZE)));
    const off = (state.calibrationByMap[state.currentMapId] || {dx:0,dy:0});
    let Xc = Math.round(Xgrid + off.dx);
    let Yc = Math.round(Ygrid + off.dy);
    Xc = Math.max(0, Math.min(max, Xc));
    Yc = Math.max(0, Math.min(max, Yc));

    // mặc định text là tọa độ
    let tooltipText = `(${Xc}, ${Yc})`;

    // nếu hover trúng point/spot -> thêm tên quái
    let hit = hitTest(ev, canvas);
    if (isVisibleByFilter(hit)) {
      const data = state.monstersByMap[state.currentMapId];
      if (hit.kind === "point") {
        const p = data.points[hit.idx];
        if (p) {
          const name = state.classes[p.classId]?.name || p.classId;
          tooltipText = `${name} (${Xc}, ${Yc})`;
        }
      } else if (hit.kind === "spot") {
        const s = data.spots[hit.idx];
        if (s) {
          const name = state.classes[s.classId]?.name || s.classId;
          tooltipText = `${name} (${Xc}, ${Yc})`;
        }
      }
    }

    coordReadout.textContent = `(x,y) = (${Xc}, ${Yc})`;
    updateTooltip(tooltipText, ev);
  });


  // hover/drag/resize & sync list
  canvas.addEventListener('mousedown', (ev)=>{
    if(state.currentMapId==null || state.calibrating) return;
    if(state.addingMonster) return;
    let hit = hitTest(ev, canvas);
    if (!isVisibleByFilter(hit)) hit = null;
    state.selection = hit ? { kind: hit.kind, idx: hit.idx } : null;
    updateListSelection(mobList);
    renderInfoPanel(infoPanel);

    if(hit){
      if(hit.kind==='spot' && hit.resize){
        const mapId = state.currentMapId;
        const s = state.monstersByMap[mapId]?.spots[hit.idx];
        saveHistory();
        if(s?.lockResize){
          console.log("🔒 Spot này bị khoá resize, chỉ cho phép move");
          // bỏ qua resize, xử lý move ở nhánh else
        } else {
          // xử lý resize bình thường
          if(s){
            const minX = Math.min(s.x1, s.x2), maxX = Math.max(s.x1, s.x2);
            const minY = Math.min(s.y1, s.y2), maxY = Math.max(s.y1, s.y2);
            let ax, ay;
            if(hit.resize==='tl'){ ax = maxX; ay = maxY; }
            if(hit.resize==='tr'){ ax = maxX; ay = minY; }
            if(hit.resize==='bl'){ ax = minX; ay = maxY; }
            if(hit.resize==='br'){ ax = minX; ay = minY; }
            state.dragging = { mode:'resize', corner: hit.resize, anchor:{ ax, ay } };
          }else{
            state.dragging = { mode:'resize', corner: hit.resize };
          }
          state.hover = null;
          setCursor(canvas, resizeCursorFor(hit.resize));
          redraw();
          return;
        }
      }

      // 🟢 Move (spot/point hoặc spot có lockResize)
      const mapId = state.currentMapId;
      const data = state.monstersByMap[mapId];
      const s = hit.kind==='spot' ? data?.spots?.[hit.idx] : null;
      saveHistory();
      if(s){
        const { Xc, Yc } = gridFromMouse(ev, canvas);
        const { xr, yr } = rawFromCalibrated(Xc, Yc);
        const minX = Math.min(s.x1, s.x2), minY = Math.min(s.y1, s.y2);
        const w = Math.abs(s.x2 - s.x1), h = Math.abs(s.y2 - s.y1);
        const ox = xr - minX, oy = yr - minY;
        state.dragging = { mode:'move', grab:{ ox, oy, w, h } };
      }else{
        state.dragging = { mode:'move' };
      }
      state.hover = null;
      setCursor(canvas, 'grabbing');
    }else{
      state.dragging = null;
      setCursor(canvas, 'crosshair');
    }
    redraw();
  });

  canvas.addEventListener('mousemove', (ev)=>{
    if(state.currentMapId==null) return;
    if(state.addingMonster) return;
    // không kéo: xử lý hover/cursor
    if(!state.dragging || !state.selection){
      let h = hitTest(ev, canvas);
      if (!isVisibleByFilter(h)) h = null;

      if(h && h.kind==='spot' && h.resize){
        const mapId = state.currentMapId;
        const s = state.monstersByMap[mapId]?.spots[h.idx];
        if(s?.lockResize){
          setCursor(canvas, 'crosshair'); // ❌ không cho resize
        } else {
          setCursor(canvas, resizeCursorFor(h.resize));
        }
      } else {
        setCursor(canvas, 'crosshair');
      }
      const newHover = h ? { kind: h.kind, idx: h.idx } : null;
      const prev = state.hover;
      const changed = (!prev && !!newHover) ||
                      (!!prev && !newHover) ||
                      (!!prev && !!newHover && (prev.kind!==newHover.kind || prev.idx!==newHover.idx));
      if(changed){
        state.hover = newHover;
        updateListHover(mobList);
        redraw();
      }
      return;
    }

    // đang kéo: cập nhật dữ liệu theo move/resize
    const mapId = state.currentMapId;
    const data = state.monstersByMap[mapId];
    const { Xc, Yc } = gridFromMouse(ev, canvas);
    const { xr, yr } = rawFromCalibrated(Xc, Yc);

    if(state.dragging.mode==='move') setCursor(canvas, 'grabbing');
    if(state.dragging.mode==='resize') setCursor(canvas, resizeCursorFor(state.dragging.corner));

    if(state.selection.kind==='point' && state.dragging.mode==='move'){
      const p = data.points[state.selection.idx];
      if(p){ p.x = xr; p.y = yr; }
    }else if(state.selection.kind==='spot'){
      const s = data.spots[state.selection.idx];
      if(!s) return;

      if(state.dragging.mode==='move'){
        const grab = state.dragging.grab;
        if(grab){
          const w = grab.w, h = grab.h;
          let minX = xr - grab.ox;
          let minY = yr - grab.oy;
          let maxX = minX + w;
          let maxY = minY + h;
          s.x1 = gclamp(minX); s.x2 = gclamp(maxX);
          s.y1 = gclamp(minY); s.y2 = gclamp(maxY);
        }else{
          let minX = Math.min(s.x1, s.x2), maxX = Math.max(s.x1, s.x2);
          let minY = Math.min(s.y1, s.y2), maxY = Math.max(s.y1, s.y2);
          const w = maxX - minX, h = maxY - minY;
          minX = xr; minY = yr; maxX = minX + w; maxY = minY + h;
          s.x1 = gclamp(minX); s.x2 = gclamp(maxX);
          s.y1 = gclamp(minY); s.y2 = gclamp(maxY);
        }
      }else if(state.dragging.mode==='resize'){
        if(s.lockResize){
          console.log("🔒 Không thể resize spot này");
          return;
        }
        const { ax, ay } = (state.dragging.anchor || {});
        if(ax==null || ay==null){
          const corner = state.dragging.corner;
          let minX = Math.min(s.x1, s.x2), maxX = Math.max(s.x1, s.x2);
          let minY = Math.min(s.y1, s.y2), maxY = Math.max(s.y1, s.y2);
          if(corner==='tl'){ minX = xr; minY = yr; }
          if(corner==='tr'){ maxX = xr; minY = yr; }
          if(corner==='bl'){ minX = xr; maxY = yr; }
          if(corner==='br'){ maxX = xr; maxY = yr; }
          if(maxX < minX) [minX, maxX] = [maxX, minX];
          if(maxY < minY) [minY, maxY] = [maxY, minY];
          s.x1 = gclamp(minX); s.x2 = gclamp(maxX);
          s.y1 = gclamp(minY); s.y2 = gclamp(maxY);
        }else{
          const minX = Math.min(ax, xr), maxX = Math.max(ax, xr);
          const minY = Math.min(ay, yr), maxY = Math.max(ay, yr);
          s.x1 = gclamp(minX); s.x2 = gclamp(maxX);
          s.y1 = gclamp(minY); s.y2 = gclamp(maxY);
        }
      }
    }

    // 🟢 refresh UI ngay khi kéo
    refreshMobList(mobList);
    renderInfoPanel(infoPanel);
    redraw();
  });

  window.addEventListener('mouseup', ()=>{
    if(state.addingMonster) return;
    state.dragging = null;
    setCursor(canvas, 'crosshair');
  });

  return { mapSelect, canvas, mobList };
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Alt" || e.key === "Option") {
    if (!state.showLabels) {
      state.showLabels = true;
      draw(document.getElementById("view"));
    }
  }
});
document.addEventListener("keyup", (e) => {
  if (e.key === "Alt" || e.key === "Option") {
    state.showLabels = false;
    draw(document.getElementById("view"));
  }
});